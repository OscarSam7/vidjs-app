import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { generateQrDataUrl, generateQrSvg } from "@/lib/qr/generator";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const updateTableSchema = z.object({
  venueId: z.string().min(1, "El local es obligatorio").optional(),
  number: z.coerce.number().int().positive("El número de mesa debe ser positivo").optional(),
  label: z.string().min(1, "La etiqueta es obligatoria").optional(),
  capacity: z.coerce.number().int().positive("La capacidad debe ser positiva").optional(),
  zone: z.string().min(1, "La zona no puede estar vacía").optional(),
  active: z.boolean().optional(),
  regenerateQr: z.boolean().optional(),
});

// GET: Obtener detalle de una mesa individual con sus datos QR
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, session } = await requireTenantContext();
    const { id: tableId } = await params;

    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        venue: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!table || (table.tenantId !== tenantId && session.role !== "SUPER_ADMIN")) {
      throw new NotFoundError("Mesa no encontrada en este establecimiento");
    }

    const origin = new URL(req.url).origin;
    const qrUrl = `${origin}/qr/${table.qrToken}`;
    const [qrDataUrl, qrSvg] = await Promise.all([
      generateQrDataUrl(qrUrl),
      generateQrSvg(qrUrl),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...table,
        scanUrl: qrUrl,
        qrDataUrl,
        qrSvg,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH: Editar mesa (número, etiqueta, capacidad, zona, estado y regeneración opcional de QR)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);
    const { tenantId, session } = await requireTenantContext();
    const { id: tableId } = await params;

    const body = await req.json();
    const data = updateTableSchema.parse(body);

    const existingTable = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        venue: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!existingTable || (existingTable.tenantId !== tenantId && session.role !== "SUPER_ADMIN")) {
      throw new NotFoundError("Mesa no encontrada en este establecimiento");
    }

    // Si cambia de venue, verificar que pertenezca al mismo tenant
    let targetVenue = existingTable.venue;
    if (data.venueId && data.venueId !== existingTable.venueId) {
      const venue = await prisma.venue.findFirst({
        where: { id: data.venueId, tenantId },
      });
      if (!venue) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "El local especificado no pertenece a tu establecimiento" } },
          { status: 403 }
        );
      }
      targetVenue = { id: venue.id, name: venue.name, slug: venue.slug };
    }

    // Si cambia de número o de venue, verificar unicidad [venueId, number]
    const targetNumber = data.number !== undefined ? data.number : existingTable.number;
    const targetVenueId = data.venueId || existingTable.venueId;

    if (targetNumber !== existingTable.number || targetVenueId !== existingTable.venueId) {
      const duplicate = await prisma.table.findFirst({
        where: {
          venueId: targetVenueId,
          number: targetNumber,
          id: { not: tableId },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            error: {
              code: "CONFLICT",
              message: `Ya existe la Mesa #${targetNumber} en el local ${targetVenue.name}. Escoge otro número.`,
            },
          },
          { status: 409 }
        );
      }
    }

    // Manejo de Regeneración de QR
    let newQrToken: string | undefined = undefined;
    if (data.regenerateQr) {
      // Generar nuevo token único criptográfico/aleatorio
      newQrToken = `qr_${targetVenue.slug}_m${targetNumber}_${Math.random().toString(36).substring(2, 7)}_${Date.now().toString(36).slice(-4)}`;

      // Expirar sesiones de invitados previas que estuvieran vinculadas a esta mesa
      await prisma.guestSession.updateMany({
        where: {
          tableId,
          expiresAt: { gt: new Date() },
        },
        data: {
          expiresAt: new Date(),
        },
      });
    }

    const updateData: {
      venueId?: string;
      number?: number;
      label?: string;
      capacity?: number;
      zone?: string;
      active?: boolean;
      qrToken?: string;
    } = {};

    if (data.venueId) updateData.venueId = data.venueId;
    if (data.number !== undefined) updateData.number = data.number;
    if (data.label !== undefined) updateData.label = data.label;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.zone !== undefined) updateData.zone = data.zone;
    if (data.active !== undefined) updateData.active = data.active;
    if (newQrToken) updateData.qrToken = newQrToken;

    const updatedTable = await prisma.table.update({
      where: { id: tableId },
      data: updateData,
      include: {
        venue: { select: { id: true, name: true } },
      },
    });

    const origin = new URL(req.url).origin;
    const qrUrl = `${origin}/qr/${updatedTable.qrToken}`;
    const [qrDataUrl, qrSvg] = await Promise.all([
      generateQrDataUrl(qrUrl),
      generateQrSvg(qrUrl),
    ]);

    // Notificar en realtime al evento activo
    const activeEvent = await prisma.event.findFirst({
      where: { venueId: updatedTable.venueId, status: "ACTIVE" },
      select: { id: true },
    });

    if (activeEvent) {
      realtimeBus.broadcast(activeEvent.id, "TABLE_UPDATED", {
        tableId: updatedTable.id,
        tableLabel: updatedTable.label,
        number: updatedTable.number,
        capacity: updatedTable.capacity,
        zone: updatedTable.zone,
        active: updatedTable.active,
        regeneratedQr: !!data.regenerateQr,
        byUser: session.name,
      });
    }

    return NextResponse.json({
      success: true,
      message: data.regenerateQr
        ? `Mesa ${updatedTable.label} actualizada y nuevo código QR generado con éxito.`
        : `Mesa ${updatedTable.label} actualizada con éxito.`,
      data: {
        ...updatedTable,
        scanUrl: qrUrl,
        qrDataUrl,
        qrSvg,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE: Eliminar mesa y revocar permanentemente su código QR
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);
    const { tenantId, session } = await requireTenantContext();
    const { id: tableId } = await params;

    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        venue: { select: { id: true, name: true } },
      },
    });

    if (!table || (table.tenantId !== tenantId && session.role !== "SUPER_ADMIN")) {
      throw new NotFoundError("Mesa no encontrada en este establecimiento");
    }

    // 1. Cancelar pedidos en cola pendientes o aceptados vinculados a esta mesa
    const cancelled = await prisma.songRequest.updateMany({
      where: {
        tableId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      data: {
        status: "CANCELLED",
        notes: `Mesa eliminada por ${session.name} (${session.role})`,
      },
    });

    // 2. Expirar las sesiones de invitados activas en esta mesa
    await prisma.guestSession.updateMany({
      where: {
        tableId,
        expiresAt: { gt: new Date() },
      },
      data: {
        expiresAt: new Date(),
      },
    });

    // 3. Buscar evento activo para emitir notificación en tiempo real
    const activeEvent = await prisma.event.findFirst({
      where: { venueId: table.venueId, status: "ACTIVE" },
      select: { id: true },
    });

    if (activeEvent) {
      realtimeBus.broadcast(activeEvent.id, "TABLE_DELETED", {
        tableId: table.id,
        tableLabel: table.label,
        number: table.number,
        cancelledCount: cancelled.count,
        byUser: session.name,
      });

      realtimeBus.broadcast(activeEvent.id, "QUEUE_UPDATE", {
        reason: "TABLE_DELETED",
        tableId: table.id,
      });
    }

    // 4. Eliminar la mesa (las relaciones con onDelete: Cascade se limpiarán limpiamente)
    await prisma.table.delete({
      where: { id: tableId },
    });

    return NextResponse.json({
      success: true,
      message: `La mesa "${table.label}" (#${table.number}) y su código QR han sido eliminados permanentemente.`,
      data: {
        deletedTableId: table.id,
        deletedTableLabel: table.label,
        cancelledRequestsCount: cancelled.count,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
