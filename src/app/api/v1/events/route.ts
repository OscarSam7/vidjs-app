import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError, BadRequestError, NotFoundError } from "@/lib/errors";

/**
 * Función auxiliar para generar un código limpio a partir del nombre del evento
 */
function generateEventCode(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 14);

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return clean ? `${clean}-${randomSuffix}` : `EVENT-${randomSuffix}`;
}

/**
 * GET /api/v1/events
 * Retorna todos los eventos y noches del establecimiento con estadísticas y sedes asociadas.
 */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN", "DJ", "OPERATOR"]);

    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get("venueId");
    const status = searchParams.get("status");

    const whereClause: any = { tenantId };

    if (venueId && venueId !== "ALL") {
      whereClause.venueId = venueId;
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    // 1. Consultar eventos del establecimiento
    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
          },
        },
        _count: {
          select: {
            songRequests: true,
            queueEntries: true,
            guestSessions: true,
            photoPosts: true,
          },
        },
      },
      orderBy: [
        { startsAt: "desc" },
        { createdAt: "desc" },
      ],
    });

    // 2. Consultar sedes activas para el selector de sedes al crear/editar
    const venues = await prisma.venue.findMany({
      where: { tenantId, active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        events,
        venues,
        total: events.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/events
 * Crea un nuevo evento o noche de fiesta en el establecimiento.
 */
export async function POST(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);

    const body = await req.json();
    const {
      name,
      venueId,
      code,
      description,
      startsAt,
      endsAt,
      pin,
      status,
      settings,
    } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      throw new BadRequestError("El nombre del evento es requerido (mínimo 2 caracteres).");
    }

    if (!venueId || typeof venueId !== "string") {
      throw new BadRequestError("Debes seleccionar una sede / local para el evento.");
    }

    // Verificar que la sede pertenezca al mismo tenant
    const venue = await prisma.venue.findFirst({
      where: { id: venueId, tenantId },
    });

    if (!venue) {
      throw new BadRequestError("La sede seleccionada no es válida para este establecimiento.");
    }

    // Validar o generar código único
    let finalCode = (code || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (!finalCode) {
      finalCode = generateEventCode(name);
    }

    // Verificar unicidad de código
    const existingCode = await prisma.event.findUnique({
      where: { code: finalCode },
    });

    if (existingCode) {
      throw new BadRequestError(`El código '${finalCode}' ya está en uso por otro evento. Elige otro código único.`);
    }

    // Fecha de inicio
    const parsedStartsAt = startsAt ? new Date(startsAt) : new Date();
    if (isNaN(parsedStartsAt.getTime())) {
      throw new BadRequestError("La fecha de inicio no tiene un formato válido.");
    }

    let parsedEndsAt: Date | null = null;
    if (endsAt) {
      parsedEndsAt = new Date(endsAt);
      if (isNaN(parsedEndsAt.getTime())) {
        throw new BadRequestError("La fecha de finalización no tiene un formato válido.");
      }
    }

    const validStatus = ["DRAFT", "ACTIVE", "PAUSED", "FINISHED"];
    const finalStatus = validStatus.includes(status) ? status : "ACTIVE";

    const defaultSettings = {
      zone: "KARAOKE",
      maxActivePerTable: 2,
      queuePaused: false,
      rotationMode: "ROUND_ROBIN",
      avgSongDurationMinutes: 4,
      photosAllowed: true,
      photoRotationSeconds: 15,
      photoFitMode: "CONTAIN",
      nightMode: "HYBRID",
    };

    const mergedSettings = typeof settings === "object" ? JSON.stringify({ ...defaultSettings, ...settings }) : JSON.stringify(defaultSettings);

    const newEvent = await prisma.event.create({
      data: {
        tenantId,
        venueId,
        name: name.trim(),
        description: description ? String(description).trim() : null,
        code: finalCode,
        startsAt: parsedStartsAt,
        endsAt: parsedEndsAt,
        pin: pin ? String(pin).trim() : null,
        status: finalStatus,
        settings: mergedSettings,
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
          },
        },
        _count: {
          select: {
            songRequests: true,
            queueEntries: true,
            guestSessions: true,
            photoPosts: true,
          },
        },
      },
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: "EVENT_CREATED",
        resource: `EVENT:${newEvent.id}`,
        metadata: JSON.stringify({
          eventName: newEvent.name,
          code: newEvent.code,
          venueName: venue.name,
          createdBy: session.email,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Evento '${newEvent.name}' creado exitosamente con código ${newEvent.code}.`,
      data: newEvent,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/v1/events
 * Edita un evento existente: nombre, sede, código, descripción, fechas, PIN y estado.
 */
export async function PUT(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);

    const body = await req.json();
    const {
      id,
      name,
      venueId,
      code,
      description,
      startsAt,
      endsAt,
      pin,
      status,
      settings,
    } = body;

    if (!id || typeof id !== "string") {
      throw new BadRequestError("El ID del evento es requerido para editarlo.");
    }

    // Verificar que el evento exista y pertenezca al tenant
    const existingEvent = await prisma.event.findFirst({
      where: { id, tenantId },
      include: { venue: true },
    });

    if (!existingEvent) {
      throw new NotFoundError("Evento no encontrado en este establecimiento.");
    }

    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        throw new BadRequestError("El nombre del evento debe tener al menos 2 caracteres.");
      }
      updateData.name = name.trim();
    }

    if (venueId !== undefined && venueId !== existingEvent.venueId) {
      const venue = await prisma.venue.findFirst({
        where: { id: venueId, tenantId },
      });
      if (!venue) {
        throw new BadRequestError("La sede especificada no pertenece a este establecimiento.");
      }
      updateData.venueId = venueId;
    }

    if (code !== undefined) {
      const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
      if (cleanCode.length < 3) {
        throw new BadRequestError("El código de acceso debe tener al menos 3 caracteres.");
      }

      if (cleanCode !== existingEvent.code) {
        const duplicate = await prisma.event.findUnique({
          where: { code: cleanCode },
        });
        if (duplicate && duplicate.id !== id) {
          throw new BadRequestError(`El código '${cleanCode}' ya está en uso por otro evento.`);
        }
        updateData.code = cleanCode;
      }
    }

    if (description !== undefined) {
      updateData.description = description ? String(description).trim() : null;
    }

    if (startsAt !== undefined) {
      const parsedStarts = new Date(startsAt);
      if (isNaN(parsedStarts.getTime())) {
        throw new BadRequestError("Fecha de inicio no válida.");
      }
      updateData.startsAt = parsedStarts;
    }

    if (endsAt !== undefined) {
      if (endsAt) {
        const parsedEnds = new Date(endsAt);
        if (isNaN(parsedEnds.getTime())) {
          throw new BadRequestError("Fecha de finalización no válida.");
        }
        updateData.endsAt = parsedEnds;
      } else {
        updateData.endsAt = null;
      }
    }

    if (pin !== undefined) {
      updateData.pin = pin ? String(pin).trim() : null;
    }

    if (status !== undefined) {
      const validStatus = ["DRAFT", "ACTIVE", "PAUSED", "FINISHED"];
      if (!validStatus.includes(status)) {
        throw new BadRequestError("Estado no válido. Opciones: DRAFT, ACTIVE, PAUSED, FINISHED.");
      }
      updateData.status = status;
    }

    if (settings !== undefined) {
      if (typeof settings === "string") {
        updateData.settings = settings;
      } else if (typeof settings === "object") {
        updateData.settings = JSON.stringify(settings);
      }
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
          },
        },
        _count: {
          select: {
            songRequests: true,
            queueEntries: true,
            guestSessions: true,
            photoPosts: true,
          },
        },
      },
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: "EVENT_UPDATED",
        resource: `EVENT:${updatedEvent.id}`,
        metadata: JSON.stringify({
          previousName: existingEvent.name,
          newName: updatedEvent.name,
          previousStatus: existingEvent.status,
          newStatus: updatedEvent.status,
          updatedBy: session.email,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Evento '${updatedEvent.name}' actualizado exitosamente.`,
      data: updatedEvent,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/v1/events
 * Elimina permanentemente un evento del establecimiento.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      throw new BadRequestError("El ID del evento es requerido.");
    }

    const targetEvent = await prisma.event.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            songRequests: true,
            queueEntries: true,
            photoPosts: true,
          },
        },
      },
    });

    if (!targetEvent) {
      throw new NotFoundError("Evento no encontrado en este establecimiento.");
    }

    await prisma.event.delete({
      where: { id },
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: "EVENT_DELETED",
        resource: `EVENT:${id}`,
        metadata: JSON.stringify({
          deletedEventName: targetEvent.name,
          deletedCode: targetEvent.code,
          requestsCount: targetEvent._count.songRequests,
          deletedBy: session.email,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `El evento '${targetEvent.name}' (Código: ${targetEvent.code}) ha sido eliminado exitosamente.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
