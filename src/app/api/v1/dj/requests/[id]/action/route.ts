import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const actionSchema = z.object({
  action: z.enum(["ACCEPT", "REJECT"]),
  rejectReason: z.string().max(200).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["DJ", "MANAGER", "OWNER", "SUPER_ADMIN"]);
    const { tenantId, session } = await requireTenantContext();
    const { id } = await params;

    const body = await req.json();
    const { action, rejectReason } = actionSchema.parse(body);

    // Buscar solicitud verificando aislamiento multi-tenant
    const songRequest = await prisma.songRequest.findFirst({
      where: { id, tenantId },
      include: {
        song: true,
        table: true,
      },
    });

    if (!songRequest) {
      throw new NotFoundError("Solicitud no encontrada");
    }

    if (action === "ACCEPT") {
      // 1. Obtener el último orderIndex de la cola de este evento
      const lastQueueEntry = await prisma.queueEntry.findFirst({
        where: { tenantId, eventId: songRequest.eventId },
        orderBy: { orderIndex: "desc" },
      });

      const nextOrderIndex = (lastQueueEntry?.orderIndex ?? 0) + 1;

      // 2. Actualizar solicitud y crear entrada en la cola de forma transaccional
      const [updatedRequest, newQueueEntry] = await prisma.$transaction([
        prisma.songRequest.update({
          where: { id },
          data: { status: "ACCEPTED" },
        }),
        prisma.queueEntry.create({
          data: {
            tenantId,
            eventId: songRequest.eventId,
            songRequestId: songRequest.id,
            orderIndex: nextOrderIndex,
            status: "QUEUED",
          },
          include: {
            songRequest: {
              include: {
                song: { include: { artist: true } },
                table: true,
              },
            },
          },
        }),
        prisma.auditLog.create({
          data: {
            tenantId,
            userId: session.sub,
            action: "DJ_REQUEST_ACCEPTED",
            resource: "QUEUE",
            resourceId: songRequest.id,
            metadata: JSON.stringify({
              table: songRequest.table.label,
              song: songRequest.song?.title || songRequest.customTitle,
            }),
          },
        }),
      ]);

      // Broadcast en tiempo real a TV, cabina y móviles
      realtimeBus.broadcast(songRequest.eventId, "QUEUE_UPDATE", {
        action: "ACCEPT",
        requestId: id,
        queueEntry: newQueueEntry,
      });

      return NextResponse.json({
        success: true,
        message: "Canción aceptada y agregada a la cola",
        data: { updatedRequest, newQueueEntry },
      });
    }

    if (action === "REJECT") {
      const updatedRequest = await prisma.songRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          notes: rejectReason
            ? `${songRequest.notes ? songRequest.notes + " | " : ""}Motivo DJ: ${rejectReason}`
            : songRequest.notes,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: session.sub,
          action: "DJ_REQUEST_REJECTED",
          resource: "REQUEST",
          resourceId: songRequest.id,
          metadata: JSON.stringify({ reason: rejectReason }),
        },
      });

      // Broadcast en tiempo real
      realtimeBus.broadcast(songRequest.eventId, "QUEUE_UPDATE", {
        action: "REJECT",
        requestId: id,
      });

      return NextResponse.json({
        success: true,
        message: "Solicitud rechazada",
        data: { updatedRequest },
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
