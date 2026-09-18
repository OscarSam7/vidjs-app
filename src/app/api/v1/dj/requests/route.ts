import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError, NotFoundError, AppError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const createManualRequestSchema = z.object({
  eventId: z.string().min(1, "eventId es obligatorio"),
  tableId: z.string().optional(),
  guestName: z.string().max(80).optional(),
  title: z.string().min(1, "Título de la canción es obligatorio").max(120),
  artist: z.string().min(1, "Nombre del artista es obligatorio").max(100),
  notes: z.string().max(250).optional(),
  songId: z.string().optional(),
  directToQueue: z.boolean().default(true),
  isFastPass: z.boolean().optional(),
  tipAmountCents: z.number().int().min(0).max(100000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Autorización para operadores de cabina
    await requireRole(["DJ", "MANAGER", "OWNER", "SUPER_ADMIN"]);
    const { tenantId, session } = await requireTenantContext();

    const body = await req.json();
    const data = createManualRequestSchema.parse(body);

    // 2. Validar que el evento pertenezca al tenant
    const event = await prisma.event.findFirst({
      where: { id: data.eventId, tenantId },
      include: {
        venue: {
          include: {
            tables: {
              where: { active: true },
              select: { id: true, number: true, label: true, zone: true },
              orderBy: { number: "asc" },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundError("Evento no encontrado o no pertenece a tu cuenta");
    }

    // 3. Determinar o crear la mesa asignada para este pedido manual
    let targetTable = data.tableId
      ? event.venue.tables.find((t) => t.id === data.tableId)
      : null;

    if (!targetTable) {
      // Buscar si ya existe una mesa "Cabina DJ / Barra"
      const existingCabina = await prisma.table.findFirst({
        where: {
          venueId: event.venueId,
          label: { in: ["Cabina DJ", "Barra", "Cabina DJ / Barra", "Pedido Verbal"] },
        },
      });

      if (existingCabina) {
        targetTable = existingCabina;
      } else if (event.venue.tables.length > 0) {
        // Asignar a la primera mesa del local si existe
        targetTable = event.venue.tables[0];
      } else {
        // Crear una mesa de cabina por defecto si el local no tiene mesas creadas
        targetTable = await prisma.table.create({
          data: {
            tenantId,
            venueId: event.venueId,
            number: 99,
            label: "Cabina DJ / Barra",
            zone: "MAIN",
            qrToken: `cabina_${Date.now()}`,
            active: true,
          },
        });
      }
    }

    // 4. Crear sesión de comensal ligera si se ingresó un nombre de persona
    let guestSessionId: string | null = null;
    const cleanGuestName = data.guestName?.trim();
    if (cleanGuestName) {
      const gSession = await prisma.guestSession.create({
        data: {
          tenantId,
          eventId: event.id,
          tableId: targetTable.id,
          sessionToken: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          guestName: cleanGuestName,
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
        },
      });
      guestSessionId = gSession.id;
    }

    // 5. Vincular con canción del catálogo si existe o si vino songId
    let resolvedSongId = data.songId || null;
    if (!resolvedSongId) {
      const match = await prisma.song.findFirst({
        where: {
          title: { equals: data.title.trim(), mode: "insensitive" },
        },
        select: { id: true },
      });
      if (match) resolvedSongId = match.id;
    }

    const tipCents = data.tipAmountCents ?? (data.isFastPass ? 500 : 0);

    // 6. Transacción: Crear la solicitud y opcionalmente encolar directo
    const result = await prisma.$transaction(async (tx) => {
      const songRequest = await tx.songRequest.create({
        data: {
          tenantId,
          eventId: event.id,
          tableId: targetTable.id,
          guestSessionId,
          songId: resolvedSongId,
          customTitle: data.title.trim(),
          customArtist: data.artist.trim(),
          notes: data.notes?.trim() || null,
          tipAmountCents: tipCents,
          status: data.directToQueue ? "ACCEPTED" : "PENDING",
        },
        include: {
          song: { include: { artist: true } },
          table: { select: { id: true, number: true, label: true } },
          guestSession: { select: { id: true, guestName: true } },
        },
      });

      let queueEntry = null;

      if (data.directToQueue) {
        const lastEntry = await tx.queueEntry.findFirst({
          where: { tenantId, eventId: event.id, status: "QUEUED" },
          orderBy: { orderIndex: "desc" },
          select: { orderIndex: true },
        });

        const nextOrderIndex = (lastEntry?.orderIndex ?? 0) + 1;

        queueEntry = await tx.queueEntry.create({
          data: {
            tenantId,
            eventId: event.id,
            songRequestId: songRequest.id,
            orderIndex: nextOrderIndex,
            status: "QUEUED",
          },
          include: {
            songRequest: {
              include: {
                song: { include: { artist: true } },
                table: { select: { id: true, number: true, label: true } },
                guestSession: { select: { id: true, guestName: true } },
              },
            },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: session.sub,
          action: "DJ_MANUAL_REQUEST_CREATED",
          resource: "SONG_REQUEST",
          resourceId: songRequest.id,
          metadata: JSON.stringify({
            title: data.title,
            artist: data.artist,
            tableLabel: targetTable.label,
            guestName: cleanGuestName,
            directToQueue: data.directToQueue,
          }),
        },
      });

      return { songRequest, queueEntry };
    });

    // 7. Notificar en tiempo real por SSE
    if (data.directToQueue) {
      realtimeBus.broadcast(event.id, "QUEUE_UPDATE", {
        eventId: event.id,
        action: "ADD_MANUAL",
        queueEntry: result.queueEntry,
      });
    } else {
      realtimeBus.broadcast(event.id, "REQUEST_NEW", {
        ...result.songRequest,
      });
    }

    return NextResponse.json({
      success: true,
      message: data.directToQueue
        ? `🎶 "${data.title}" agregada directamente a la cola de reproducción`
        : `📥 "${data.title}" agregada a solicitudes pendientes`,
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
