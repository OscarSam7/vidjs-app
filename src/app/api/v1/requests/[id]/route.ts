import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError, AppError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { parseQueuePolicy } from "@/lib/dj/rotation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const guestSession = await getCurrentGuestSession();
    if (!guestSession) {
      throw new UnauthorizedError("Tu sesión de mesa ha expirado. Por favor, vuelve a escanear el código QR.");
    }

    const songRequest = await prisma.songRequest.findUnique({
      where: { id },
      include: {
        song: { include: { artist: true } },
        table: true,
      },
    });

    if (!songRequest) {
      throw new NotFoundError("Solicitud no encontrada");
    }

    // Verificar pertenencia de mesa y evento
    if (
      songRequest.tableId !== guestSession.tableId ||
      songRequest.eventId !== guestSession.eventId
    ) {
      throw new ForbiddenError("No puedes reproducir canciones de otra mesa");
    }

    // Verificar si el modo Auto-Play está activo en la política del evento
    const event = await prisma.event.findUnique({
      where: { id: guestSession.eventId },
    });
    const policy = parseQueuePolicy(event?.settings);

    if (!policy.autoPlayRequests) {
      throw new AppError(
        "El modo Auto-Play debe estar activado por el DJ para poder darle al Play directamente.",
        403,
        "AUTO_PLAY_NOT_ACTIVE"
      );
    }

    if (songRequest.status === "PLAYING") {
      return NextResponse.json({
        success: true,
        message: "Tu canción ya está sonando en vivo al aire.",
      });
    }

    if (songRequest.status === "CANCELLED" || songRequest.status === "REJECTED") {
      throw new AppError("No se puede reproducir una canción cancelada o rechazada", 400);
    }

    const now = new Date();

    // 1. Verificar si hay alguna canción ejecutándose en la bandeja actualmente
    const prevPlaying = await prisma.songRequest.findMany({
      where: {
        tenantId: guestSession.tenantId,
        eventId: guestSession.eventId,
        status: "PLAYING",
        id: { not: songRequest.id },
      },
      include: { table: true, song: true },
    });

    if (prevPlaying.length > 0) {
      throw new AppError(
        "Hay una canción ejecutándose actualmente en la bandeja. Espera a que termine para poder darle al Play.",
        400,
        "DECK_CURRENTLY_PLAYING"
      );
    }

    // 2. Finalizar temas anteriores y marcar este tema como PLAYING y CURRENT
    await prisma.$transaction([
      prisma.queueEntry.updateMany({
        where: {
          tenantId: guestSession.tenantId,
          eventId: guestSession.eventId,
          status: "CURRENT",
        },
        data: { status: "COMPLETED" },
      }),
      prisma.songRequest.updateMany({
        where: {
          tenantId: guestSession.tenantId,
          eventId: guestSession.eventId,
          status: "PLAYING",
          id: { not: songRequest.id },
        },
        data: { status: "PLAYED", playedAt: now },
      }),
    ]);

    // 3. Buscar o crear la entrada en la cola (queueEntry)
    let queueEntry = await prisma.queueEntry.findFirst({
      where: {
        tenantId: guestSession.tenantId,
        eventId: guestSession.eventId,
        songRequestId: songRequest.id,
      },
    });

    if (queueEntry) {
      queueEntry = await prisma.queueEntry.update({
        where: { id: queueEntry.id },
        data: { status: "CURRENT" },
      });
    } else {
      const lastEntry = await prisma.queueEntry.findFirst({
        where: { tenantId: guestSession.tenantId, eventId: guestSession.eventId },
        orderBy: { orderIndex: "desc" },
      });
      const nextOrder = (lastEntry?.orderIndex ?? 0) + 1;
      queueEntry = await prisma.queueEntry.create({
        data: {
          tenantId: guestSession.tenantId,
          eventId: guestSession.eventId,
          songRequestId: songRequest.id,
          orderIndex: nextOrder,
          status: "CURRENT",
        },
      });
    }

    // 4. Actualizar estado del pedido a PLAYING
    await prisma.songRequest.update({
      where: { id: songRequest.id },
      data: { status: "PLAYING", playedAt: now },
    });

    // 5. Emitir eventos SSE a la cabina del DJ y pantallas en tiempo real
    realtimeBus.broadcast(guestSession.eventId, "TRACK_CHANGE", {
      currentEntryId: queueEntry.id,
    });
    realtimeBus.broadcast(guestSession.eventId, "QUEUE_UPDATE", {
      action: "PLAY",
    });

    // Desbloquear slots ("Canta y Libera") para las mesas que terminaron de sonar
    for (const p of prevPlaying) {
      realtimeBus.broadcast(guestSession.eventId, "QUEUE_SLOT_UNLOCKED", {
        tableId: p.tableId,
        tableLabel: p.table.label,
        songTitle: p.song?.title || p.customTitle || "Canción",
      });
    }

    const title = songRequest.song?.title || songRequest.customTitle || "Canción";
    return NextResponse.json({
      success: true,
      message: `🎉 ¡"${title}" está sonando al aire ahora mismo!`,
      data: { queueEntryId: queueEntry.id },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const guestSession = await getCurrentGuestSession();
    if (!guestSession) {
      throw new UnauthorizedError("Sesión expirada");
    }

    const songRequest = await prisma.songRequest.findUnique({
      where: { id },
    });

    if (!songRequest) {
      throw new NotFoundError("Solicitud no encontrada");
    }

    // Verificar que la solicitud pertenezca a la misma mesa y evento
    if (
      songRequest.tableId !== guestSession.tableId ||
      songRequest.eventId !== guestSession.eventId
    ) {
      throw new ForbiddenError("No puedes cancelar solicitudes de otra mesa");
    }

    // Solo se puede cancelar si sigue en estado PENDING
    if (songRequest.status !== "PENDING") {
      return NextResponse.json(
        {
          error: {
            code: "CANNOT_CANCEL",
            message: "La canción ya fue aceptada o reproducida por el DJ y no se puede cancelar",
          },
        },
        { status: 400 }
      );
    }

    await prisma.songRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({
      success: true,
      message: "Solicitud cancelada exitosamente",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
