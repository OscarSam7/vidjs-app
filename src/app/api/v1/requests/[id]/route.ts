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

    const isAutoPlay = Boolean(policy.autoPlayRequests);
    const isNextTurnAllowed = policy.nextTurnMode && policy.nextTurnMode !== "DISABLED";

    if (!isAutoPlay && !isNextTurnAllowed) {
      throw new AppError(
        "El modo Auto-Play o Turno con Play debe estar activado por el DJ para poder darle al Play directamente.",
        403,
        "AUTO_PLAY_NOT_ACTIVE"
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "PLAY";
    const isForce = Boolean(body.force);

    if (action === "FINISH") {
      // El solicitante decide terminar su reproducción activa para dar lugar al siguiente
      if (songRequest.status !== "PLAYING") {
        if (songRequest.status === "PLAYED") {
          return NextResponse.json({
            success: true,
            message: "Esta canción ya ha finalizado su reproducción.",
          });
        }
        throw new AppError("Esta canción no está actualmente en reproducción.", 400);
      }

      const now = new Date();

      // Buscar si hay un siguiente tema en la cola en estado QUEUED
      const nextEntry = await prisma.queueEntry.findFirst({
        where: {
          tenantId: guestSession.tenantId,
          eventId: guestSession.eventId,
          status: "QUEUED",
        },
        include: { songRequest: { include: { song: true, table: true } } },
        orderBy: { orderIndex: "asc" },
      });

      const shouldAutoAdvance = Boolean(policy.autoPlayRequests && nextEntry);

      if (shouldAutoAdvance && nextEntry) {
        await prisma.$transaction([
          prisma.queueEntry.updateMany({
            where: {
              tenantId: guestSession.tenantId,
              eventId: guestSession.eventId,
              status: "CURRENT",
            },
            data: { status: "COMPLETED" },
          }),
          prisma.songRequest.update({
            where: { id: songRequest.id },
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

        realtimeBus.broadcast(guestSession.eventId, "TRACK_CHANGE", {
          currentEntryId: nextEntry.id,
        });
        realtimeBus.broadcast(guestSession.eventId, "QUEUE_UPDATE", {
          action: "NEXT",
        });
      } else {
        await prisma.$transaction([
          prisma.queueEntry.updateMany({
            where: {
              tenantId: guestSession.tenantId,
              eventId: guestSession.eventId,
              status: "CURRENT",
            },
            data: { status: "COMPLETED" },
          }),
          prisma.songRequest.update({
            where: { id: songRequest.id },
            data: { status: "PLAYED", playedAt: now },
          }),
        ]);

        realtimeBus.broadcast(guestSession.eventId, "TRACK_CHANGE", {
          currentEntryId: null,
        });
        realtimeBus.broadcast(guestSession.eventId, "QUEUE_UPDATE", {
          action: "STOP",
        });
      }

      // Desbloquear cupo para la mesa ("Canta y Libera")
      realtimeBus.broadcast(guestSession.eventId, "QUEUE_SLOT_UNLOCKED", {
        tableId: songRequest.tableId,
        tableLabel: songRequest.table.label,
        songTitle: songRequest.song?.title || songRequest.customTitle || "Canción",
      });

      return NextResponse.json({
        success: true,
        message: shouldAutoAdvance
          ? "🎉 ¡Turno finalizado! Dando lugar al siguiente pedido."
          : "🎉 ¡Turno finalizado con éxito! Cupo liberado para tu mesa.",
      });
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

    const activePlayback = realtimeBus.getPlaybackState(guestSession.eventId);
    const isBoothPlaying = activePlayback?.action === "PLAY";

    if (prevPlaying.length > 0 && isBoothPlaying && !isForce) {
      const playingTitle =
        prevPlaying[0].song?.title || prevPlaying[0].customTitle || "Canción anterior";
      throw new AppError(
        `Actualmente está sonando "${playingTitle}" en cabina. Espera a que termine o confirma darle al Play para sonar ahora.`,
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
    realtimeBus.broadcast(guestSession.eventId, "NEXT_TURN_CANCELLED", {
      songRequestId: songRequest.id,
      queueEntryId: queueEntry.id,
      reason: "GUEST_PLAYED",
    });
    if (event?.code) {
      realtimeBus.broadcast(event.code, "NEXT_TURN_CANCELLED", {
        songRequestId: songRequest.id,
        queueEntryId: queueEntry.id,
        reason: "GUEST_PLAYED",
      });
    }

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
      include: {
        table: true,
        song: true,
        queueEntry: true,
      },
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

    // Si ya terminó o fue cancelada anteriormente
    if (
      songRequest.status === "PLAYED" ||
      songRequest.status === "REJECTED" ||
      songRequest.status === "CANCELLED"
    ) {
      return NextResponse.json(
        {
          error: {
            code: "ALREADY_FINISHED",
            message: "Esta canción ya fue reproducida o cancelada anteriormente.",
          },
        },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: guestSession.eventId },
    });
    const policy = parseQueuePolicy(event?.settings);
    const isAutoPlay = Boolean(policy.autoPlayRequests);
    const eventCode = event?.code || null;
    const title = songRequest.song?.title || songRequest.customTitle || "Canción";
    const tableLabel = songRequest.table?.label || "Mesa";

    // 1. Caso CANCELACIÓN EN ESTADO PENDING (Aún no aceptada por el DJ)
    if (songRequest.status === "PENDING") {
      await prisma.$transaction([
        prisma.songRequest.update({
          where: { id },
          data: { status: "CANCELLED" },
        }),
        ...(songRequest.queueEntry
          ? [
              prisma.queueEntry.update({
                where: { id: songRequest.queueEntry.id },
                data: { status: "SKIPPED" },
              }),
            ]
          : []),
      ]);

      realtimeBus.broadcast(guestSession.eventId, "QUEUE_UPDATE", { action: "CANCEL" });
      realtimeBus.broadcast(guestSession.eventId, "QUEUE_SLOT_UNLOCKED", {
        tableId: songRequest.tableId,
        tableLabel,
        songTitle: title,
      });

      if (eventCode) {
        realtimeBus.broadcast(eventCode, "QUEUE_UPDATE", { action: "CANCEL" });
        realtimeBus.broadcast(eventCode, "QUEUE_SLOT_UNLOCKED", {
          tableId: songRequest.tableId,
          tableLabel,
          songTitle: title,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Solicitud cancelada exitosamente y cupo de mesa liberado.",
      });
    }

    // 2. Caso CANCELACIÓN EN ESTADO ACCEPTED (En cola de espera para sonar)
    if (songRequest.status === "ACCEPTED") {
      await prisma.$transaction([
        prisma.songRequest.update({
          where: { id },
          data: { status: "CANCELLED" },
        }),
        ...(songRequest.queueEntry
          ? [
              prisma.queueEntry.update({
                where: { id: songRequest.queueEntry.id },
                data: { status: "SKIPPED" },
              }),
            ]
          : []),
      ]);

      if (songRequest.queueEntry) {
        realtimeBus.broadcast(guestSession.eventId, "NEXT_TURN_CANCELLED", {
          queueEntryId: songRequest.queueEntry.id,
          reason: "GUEST_CANCELLED",
        });
        if (eventCode) {
          realtimeBus.broadcast(eventCode, "NEXT_TURN_CANCELLED", {
            queueEntryId: songRequest.queueEntry.id,
            reason: "GUEST_CANCELLED",
          });
        }
      }

      realtimeBus.broadcast(guestSession.eventId, "QUEUE_UPDATE", { action: "SKIP" });
      realtimeBus.broadcast(guestSession.eventId, "QUEUE_SLOT_UNLOCKED", {
        tableId: songRequest.tableId,
        tableLabel,
        songTitle: title,
      });

      if (eventCode) {
        realtimeBus.broadcast(eventCode, "QUEUE_UPDATE", { action: "SKIP" });
        realtimeBus.broadcast(eventCode, "QUEUE_SLOT_UNLOCKED", {
          tableId: songRequest.tableId,
          tableLabel,
          songTitle: title,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Turno cancelado y retirado de la cola. Tu mesa ya puede pedir otra canción.",
      });
    }

    // 3. Caso CANCELACIÓN EN ESTADO PLAYING (Al aire: video de YouTube fallido, sin sonido o cancelado por comensal)
    if (songRequest.status === "PLAYING") {
      const now = new Date();
      const nextEntry = await prisma.queueEntry.findFirst({
        where: {
          tenantId: guestSession.tenantId,
          eventId: guestSession.eventId,
          status: "QUEUED",
        },
        include: { songRequest: { include: { song: true, table: true } } },
        orderBy: { orderIndex: "asc" },
      });

      const shouldAdvance = Boolean(isAutoPlay && nextEntry);

      if (shouldAdvance && nextEntry) {
        await prisma.$transaction([
          prisma.songRequest.update({
            where: { id },
            data: { status: "CANCELLED" },
          }),
          prisma.queueEntry.updateMany({
            where: {
              tenantId: guestSession.tenantId,
              eventId: guestSession.eventId,
              status: "CURRENT",
            },
            data: { status: "COMPLETED" },
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

        realtimeBus.broadcast(guestSession.eventId, "TRACK_CHANGE", {
          currentEntryId: nextEntry.id,
        });
        realtimeBus.broadcast(guestSession.eventId, "QUEUE_UPDATE", { action: "NEXT" });

        if (eventCode) {
          realtimeBus.broadcast(eventCode, "TRACK_CHANGE", {
            currentEntryId: nextEntry.id,
          });
          realtimeBus.broadcast(eventCode, "QUEUE_UPDATE", { action: "NEXT" });
        }
      } else {
        await prisma.$transaction([
          prisma.songRequest.update({
            where: { id },
            data: { status: "CANCELLED" },
          }),
          prisma.queueEntry.updateMany({
            where: {
              tenantId: guestSession.tenantId,
              eventId: guestSession.eventId,
              status: "CURRENT",
            },
            data: { status: "COMPLETED" },
          }),
        ]);

        realtimeBus.broadcast(guestSession.eventId, "TRACK_CHANGE", {
          currentEntryId: null,
        });
        realtimeBus.broadcast(guestSession.eventId, "QUEUE_UPDATE", { action: "STOP" });

        if (eventCode) {
          realtimeBus.broadcast(eventCode, "TRACK_CHANGE", {
            currentEntryId: null,
          });
          realtimeBus.broadcast(eventCode, "QUEUE_UPDATE", { action: "STOP" });
        }
      }

      // Cancelar cuenta regresiva si estaba activa y desbloquear mesa
      realtimeBus.broadcast(guestSession.eventId, "NEXT_TURN_CANCELLED", {
        queueEntryId: songRequest.queueEntry?.id || null,
        reason: "GUEST_CANCELLED",
      });
      realtimeBus.broadcast(guestSession.eventId, "QUEUE_SLOT_UNLOCKED", {
        tableId: songRequest.tableId,
        tableLabel,
        songTitle: title,
      });

      if (eventCode) {
        realtimeBus.broadcast(eventCode, "NEXT_TURN_CANCELLED", {
          queueEntryId: songRequest.queueEntry?.id || null,
          reason: "GUEST_CANCELLED",
        });
        realtimeBus.broadcast(eventCode, "QUEUE_SLOT_UNLOCKED", {
          tableId: songRequest.tableId,
          tableLabel,
          songTitle: title,
        });
      }

      return NextResponse.json({
        success: true,
        message: shouldAdvance
          ? "Turno cancelado. Avanzando automáticamente a la siguiente canción y cupo liberado."
          : "Turno cancelado y finalizado. Tu mesa ya puede pedir otra canción.",
      });
    }

    // Por defecto si no coincide con los estados cancelables
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
