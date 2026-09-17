import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { calculateFairQueue } from "@/lib/dj/rotation";
import { handleApiError, AppError, NotFoundError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const queueActionSchema = z.object({
  action: z.enum(["PLAY", "NEXT", "ROTATE", "SKIP", "REORDER"]),
  eventId: z.string().optional(),
  queueEntryId: z.string().optional(),
  newOrder: z.array(z.string()).optional(), // Array de queueEntryId en nuevo orden
});

export async function POST(req: NextRequest) {
  try {
    await requireRole(["DJ", "MANAGER", "OWNER", "SUPER_ADMIN"]);
    const { tenantId, session } = await requireTenantContext();

    const body = await req.json();
    const data = queueActionSchema.parse(body);

    // 1. Acción: PLAY (reproducir un tema específico de la cola o poner en vivo)
    if (data.action === "PLAY") {
      if (!data.queueEntryId) throw new AppError("queueEntryId es obligatorio para la acción PLAY");

      const targetEntry = await prisma.queueEntry.findFirst({
        where: { id: data.queueEntryId, tenantId },
        include: { songRequest: true },
      });

      if (!targetEntry) throw new NotFoundError("Entrada de cola no encontrada");

      const now = new Date();

      // Transacción atómica: finalizar la que estaba sonando y arrancar la nueva
      await prisma.$transaction([
        // Finalizar la anterior si existía
        prisma.queueEntry.updateMany({
          where: {
            tenantId,
            eventId: targetEntry.eventId,
            status: "CURRENT",
            id: { not: targetEntry.id },
          },
          data: { status: "COMPLETED" },
        }),
        prisma.songRequest.updateMany({
          where: {
            tenantId,
            eventId: targetEntry.eventId,
            status: "PLAYING",
            id: { not: targetEntry.songRequestId },
          },
          data: {
            status: "PLAYED",
            playedAt: now,
          },
        }),

        // Marcar la nueva como CURRENT y PLAYING
        prisma.queueEntry.update({
          where: { id: targetEntry.id },
          data: { status: "CURRENT" },
        }),
        prisma.songRequest.update({
          where: { id: targetEntry.songRequestId },
          data: { status: "PLAYING", playedAt: now },
        }),

        prisma.auditLog.create({
          data: {
            tenantId,
            userId: session.sub,
            action: "DJ_TRACK_PLAYING",
            resource: "DECK",
            resourceId: targetEntry.id,
          },
        }),
      ]);

      // Notificar a Smart TV y móviles inmediatamente
      realtimeBus.broadcast(targetEntry.eventId, "TRACK_CHANGE", {
        currentEntryId: targetEntry.id,
      });

      return NextResponse.json({
        success: true,
        message: "Canción en reproducción activa",
      });
    }

    // 2. Acción: NEXT (pasar al siguiente tema en la cola)
    if (data.action === "NEXT") {
      if (!data.eventId) throw new AppError("eventId es obligatorio para NEXT");

      // Buscar el primer tema en cola
      const nextEntry = await prisma.queueEntry.findFirst({
        where: {
          tenantId,
          eventId: data.eventId,
          status: "QUEUED",
        },
        include: { songRequest: true },
        orderBy: { orderIndex: "asc" },
      });

      const now = new Date();

      if (!nextEntry) {
        // Si no hay más temas, simplemente finalizar la actual
        await prisma.$transaction([
          prisma.queueEntry.updateMany({
            where: { tenantId, eventId: data.eventId, status: "CURRENT" },
            data: { status: "COMPLETED" },
          }),
          prisma.songRequest.updateMany({
            where: { tenantId, eventId: data.eventId, status: "PLAYING" },
            data: { status: "PLAYED", playedAt: now },
          }),
        ]);

        realtimeBus.broadcast(data.eventId, "TRACK_CHANGE", {
          currentEntryId: null,
        });

        return NextResponse.json({
          success: true,
          message: "Cola vacía. Reproducción finalizada.",
        });
      }

      // Marcar anterior como completada y siguiente como CURRENT
      await prisma.$transaction([
        prisma.queueEntry.updateMany({
          where: {
            tenantId,
            eventId: data.eventId,
            status: "CURRENT",
            id: { not: nextEntry.id },
          },
          data: { status: "COMPLETED" },
        }),
        prisma.songRequest.updateMany({
          where: {
            tenantId,
            eventId: data.eventId,
            status: "PLAYING",
            id: { not: nextEntry.songRequestId },
          },
          data: { status: "PLAYED", playedAt: now },
        }),
        prisma.queueEntry.update({
          where: { id: nextEntry.id },
          data: { status: "CURRENT" },
        }),
        prisma.songRequest.update({
          where: { id: nextEntry.songRequestId },
          data: { status: "PLAYING", playedAt: now },
        }),
      ]);

      realtimeBus.broadcast(data.eventId, "TRACK_CHANGE", {
        currentEntryId: nextEntry.id,
      });

      return NextResponse.json({
        success: true,
        message: "Siguiente canción cargada en Deck A",
      });
    }

    // 3. Acción: ROTATE (aplicar algoritmo Fair-Share de rotación de mesas)
    if (data.action === "ROTATE") {
      if (!data.eventId) throw new AppError("eventId es obligatorio para ROTATE");

      // Consultar todos los temas QUEUED
      const queuedEntries = await prisma.queueEntry.findMany({
        where: {
          tenantId,
          eventId: data.eventId,
          status: "QUEUED",
        },
        include: {
          songRequest: {
            select: { tableId: true, createdAt: true },
          },
        },
        orderBy: { orderIndex: "asc" },
      });

      if (queuedEntries.length <= 1) {
        return NextResponse.json({
          success: true,
          message: "La cola tiene 1 o menos temas, no requiere reordenamiento",
        });
      }

      // Mapear al formato del algoritmo
      const rotatableItems = queuedEntries.map((e) => ({
        id: e.id,
        tableId: e.songRequest.tableId,
        orderIndex: e.orderIndex,
        createdAt: e.songRequest.createdAt,
      }));

      const fairItems = calculateFairQueue(rotatableItems);

      // Actualizar en base de datos los nuevos orderIndex
      await prisma.$transaction(
        fairItems.map((item) =>
          prisma.queueEntry.update({
            where: { id: item.id },
            data: { orderIndex: item.orderIndex },
          })
        )
      );

      realtimeBus.broadcast(data.eventId, "QUEUE_UPDATE", {
        action: "ROTATE",
      });

      return NextResponse.json({
        success: true,
        message: "Rotación justa de mesas aplicada exitosamente a la cola",
      });
    }

    // 4. Acción: SKIP / REMOVE (quitar de la cola)
    if (data.action === "SKIP") {
      if (!data.queueEntryId) throw new AppError("queueEntryId es obligatorio para SKIP");

      const entry = await prisma.queueEntry.findFirst({
        where: { id: data.queueEntryId, tenantId },
      });

      if (!entry) throw new NotFoundError("Entrada no encontrada");

      await prisma.$transaction([
        prisma.queueEntry.update({
          where: { id: entry.id },
          data: { status: "SKIPPED" },
        }),
        prisma.songRequest.update({
          where: { id: entry.songRequestId },
          data: { status: "CANCELLED" },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: "Canción salteada/removida de la cola",
      });
    }

    throw new AppError("Acción no soportada");
  } catch (error) {
    return handleApiError(error);
  }
}
