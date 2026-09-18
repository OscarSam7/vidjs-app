import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, requireTenantContext } from "@/lib/auth/session";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { handleApiError, NotFoundError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, session } = await requireTenantContext();
    await requireRole(["DJ", "MANAGER", "OWNER", "SUPER_ADMIN"]);

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

    // 1. Cancelar pedidos en cola pendientes o aceptados de esta mesa
    const cancelled = await prisma.songRequest.updateMany({
      where: {
        tableId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      data: {
        status: "CANCELLED",
        notes: `Mesa reseteada por ${session.name} (${session.role})`,
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

    // 3. Buscar evento activo para emitir realtime
    const activeEvent = await prisma.event.findFirst({
      where: { venueId: table.venueId, status: "ACTIVE" },
      select: { id: true },
    });

    if (activeEvent) {
      realtimeBus.broadcast(activeEvent.id, "TABLE_RELEASED", {
        tableId: table.id,
        tableLabel: table.label,
        zone: table.zone,
        byUser: session.name,
        cancelledCount: cancelled.count,
        releasedAt: new Date().toISOString(),
      });

      realtimeBus.broadcast(activeEvent.id, "QUEUE_UPDATE", {
        reason: "STAFF_TABLE_RESET",
        tableId: table.id,
      });

      realtimeBus.broadcast(activeEvent.id, "QUEUE_SLOT_UNLOCKED", {
        tableId: table.id,
        tableLabel: table.label,
        reason: "STAFF_RESET",
      });
    }

    return NextResponse.json({
      success: true,
      message: `Mesa ${table.label} reseteada. Se cancelaron ${cancelled.count} pedidos y se liberó el cupo para nuevos comensales.`,
      data: {
        tableId: table.id,
        tableLabel: table.label,
        cancelledCount: cancelled.count,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
