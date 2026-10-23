import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const occupyTableSchema = z.object({
  action: z.enum(["OCCUPY", "RELEASE"]),
  staffName: z.string().max(100).optional(),
  staffRole: z.string().max(50).optional(),
  customerReference: z.string().max(120).optional(),
  notes: z.string().max(250).optional(),
});

/**
 * POST /api/v1/tables/[id]/occupy
 * Permite al DJ o a un miembro del staff marcar una mesa como ocupada
 * cuando los clientes están físicamente en el lugar pero no se registran en la app / QR,
 * o liberar la mesa cuando los clientes se retiran.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, session } = await requireTenantContext();
    await requireRole(["DJ", "MANAGER", "OWNER", "SUPER_ADMIN", "OPERATOR"]);

    const { id: tableId } = await params;
    const body = await req.json();
    const data = occupyTableSchema.parse(body);

    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        venue: { select: { id: true, name: true } },
      },
    });

    if (!table || (table.tenantId !== tenantId && session.role !== "SUPER_ADMIN")) {
      throw new NotFoundError("Mesa no encontrada en este establecimiento");
    }

    // Buscar evento activo para el local
    let activeEvent = await prisma.event.findFirst({
      where: {
        venueId: table.venueId,
        status: "ACTIVE",
      },
      orderBy: { startsAt: "desc" },
    });

    // Si no hay evento en estado ACTIVE, buscar el evento más reciente de la sede
    if (!activeEvent) {
      activeEvent = await prisma.event.findFirst({
        where: { venueId: table.venueId },
        orderBy: { startsAt: "desc" },
      });
    }

    if (data.action === "OCCUPY") {
      const assignedName = data.staffName?.trim() || session.name || "DJ / Staff";
      const assignedRole = data.staffRole?.trim() || session.role || "STAFF";
      const custRef = data.customerReference?.trim() || null;

      // 1. Expirar sesiones previas activas en esta mesa para evitar colisiones
      await prisma.guestSession.updateMany({
        where: {
          tableId,
          expiresAt: { gt: new Date() },
        },
        data: {
          expiresAt: new Date(),
        },
      });

      // 2. Crear nueva sesión oficial asignada al DJ / Staff
      const sessionToken = `staff_occ_${table.id}_${Date.now()}`;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 16); // 16 horas de validez

      const staffGuestName = custRef
        ? `${custRef} (Atendido por ${assignedName})`
        : `Atendido por ${assignedName} (${assignedRole})`;

      const deviceFingerprint = `STAFF_MANUAL:${assignedRole}:${assignedName}${
        custRef ? `:${custRef}` : ""
      }`;

      if (!activeEvent) {
        // Si por alguna razón la sede no tiene ningún evento, crear uno genérico automático
        activeEvent = await prisma.event.create({
          data: {
            tenantId,
            venueId: table.venueId,
            name: `Servicio en Sala - ${table.venue.name}`,
            code: `SALA-${Math.floor(1000 + Math.random() * 9000)}`,
            status: "ACTIVE",
            startsAt: new Date(),
          },
        });
      }

      const newSession = await prisma.guestSession.create({
        data: {
          tenantId,
          eventId: activeEvent.id,
          tableId: table.id,
          sessionToken,
          guestName: staffGuestName,
          deviceFingerprint,
          expiresAt,
        },
      });

      // 3. Emitir evento en tiempo real
      realtimeBus.broadcast(activeEvent.id, "TABLE_OCCUPANCY_CHANGED" as any, {
        tableId: table.id,
        tableLabel: table.label,
        status: "OCUPADA_STAFF",
        staffName: assignedName,
        staffRole: assignedRole,
        customerReference: custRef,
        assignedBy: session.name,
        assignedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `Mesa ${table.label} marcada como ocupada y asignada a ${assignedName}.`,
        data: {
          tableId: table.id,
          tableLabel: table.label,
          status: "OCUPADA_STAFF",
          staffName: assignedName,
          staffRole: assignedRole,
          customerReference: custRef,
          sessionId: newSession.id,
        },
      });
    }

    // ACCIÓN: RELEASE (Liberar mesa)
    // 1. Expirar sesiones activas
    await prisma.guestSession.updateMany({
      where: {
        tableId,
        expiresAt: { gt: new Date() },
      },
      data: {
        expiresAt: new Date(),
      },
    });

    // 2. Cancelar pedidos en cola pendientes
    const cancelled = await prisma.songRequest.updateMany({
      where: {
        tableId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      data: {
        status: "CANCELLED",
        notes: `Mesa desocupada por ${session.name} (${session.role})`,
      },
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
        reason: "STAFF_TABLE_RELEASED",
        tableId: table.id,
      });

      realtimeBus.broadcast(activeEvent.id, "QUEUE_SLOT_UNLOCKED", {
        tableId: table.id,
        tableLabel: table.label,
        reason: "STAFF_RELEASE",
      });
    }

    return NextResponse.json({
      success: true,
      message: `Mesa ${table.label} liberada. Ya se encuentra disponible para nuevos comensales.`,
      data: {
        tableId: table.id,
        tableLabel: table.label,
        status: "LIBRE",
        cancelledCount: cancelled.count,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
