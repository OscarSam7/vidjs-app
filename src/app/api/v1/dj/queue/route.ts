import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { calculateFairQueue, parseQueuePolicy } from "@/lib/dj/rotation";
import { handleApiError, AppError, NotFoundError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const queueActionSchema = z.object({
  action: z.enum([
    "PLAY",
    "NEXT",
    "ROTATE",
    "SKIP",
    "REORDER",
    "FINISH_CURRENT",
    "START_NEXT_TURN_COUNTDOWN",
    "TIMEOUT_NEXT_TURN",
    "CANCEL_NEXT_TURN_COUNTDOWN",
  ]),
  eventId: z.string().optional(),
  eventCode: z.string().optional(),
  queueEntryId: z.string().optional(),
  newOrder: z.array(z.string()).optional(), // Array de queueEntryId en nuevo orden
  timeoutAction: z.enum(["SKIP", "AUTOPLAY"]).optional(),
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
        include: {
          event: { select: { code: true } },
          songRequest: { include: { song: true, table: true } },
        },
      });

      if (!targetEntry) throw new NotFoundError("Entrada de cola no encontrada");

      const now = new Date();

      // Buscar canciones que estaban en PLAYING para notificar liberación de slot
      const prevPlaying = await prisma.songRequest.findMany({
        where: {
          tenantId,
          eventId: targetEntry.eventId,
          status: "PLAYING",
          id: { not: targetEntry.songRequestId },
        },
        include: {
          table: { select: { id: true, label: true } },
          song: { select: { title: true } },
        },
      });

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

      realtimeBus.broadcast(targetEntry.eventId, "QUEUE_UPDATE", {
        action: "PLAY",
      });

      // Cancelar cualquier cuenta regresiva pendiente de turno
      realtimeBus.broadcast(targetEntry.eventId, "NEXT_TURN_CANCELLED", {
        queueEntryId: targetEntry.id,
        reason: "PLAY_STARTED",
      });
      if (targetEntry.event?.code) {
        realtimeBus.broadcast(targetEntry.event.code, "NEXT_TURN_CANCELLED", {
          queueEntryId: targetEntry.id,
          reason: "PLAY_STARTED",
        });
      }

      // Desbloquear slots ("Canta y Libera") para las mesas que terminaron de sonar
      for (const p of prevPlaying) {
        realtimeBus.broadcast(targetEntry.eventId, "QUEUE_SLOT_UNLOCKED", {
          tableId: p.tableId,
          tableLabel: p.table.label,
          songTitle: p.song?.title || p.customTitle || "Canción",
        });
      }

      return NextResponse.json({
        success: true,
        message: "Canción en reproducción activa",
      });
    }

    // 2. Acción: NEXT (pasar al siguiente tema en la cola)
    if (data.action === "NEXT") {
      if (!data.eventId) throw new AppError("eventId es obligatorio para NEXT");

      // Buscar canciones que estaban en PLAYING para desbloquear slot
      const prevPlaying = await prisma.songRequest.findMany({
        where: { tenantId, eventId: data.eventId, status: "PLAYING" },
        include: {
          table: { select: { id: true, label: true } },
          song: { select: { title: true } },
        },
      });

      // Buscar el primer tema en cola
      const nextEntry = await prisma.queueEntry.findFirst({
        where: {
          tenantId,
          eventId: data.eventId,
          status: "QUEUED",
        },
        include: { songRequest: { include: { song: true, table: true } } },
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

        realtimeBus.broadcast(data.eventId, "QUEUE_UPDATE", {
          action: "NEXT",
        });

        for (const p of prevPlaying) {
          realtimeBus.broadcast(data.eventId, "QUEUE_SLOT_UNLOCKED", {
            tableId: p.tableId,
            tableLabel: p.table.label,
            songTitle: p.song?.title || p.customTitle || "Canción",
          });
        }

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

      realtimeBus.broadcast(data.eventId, "QUEUE_UPDATE", {
        action: "NEXT",
      });

      // Cancelar cualquier cuenta regresiva pendiente de turno
      realtimeBus.broadcast(data.eventId, "NEXT_TURN_CANCELLED", {
        queueEntryId: nextEntry.id,
        reason: "NEXT_PLAYED",
      });

      for (const p of prevPlaying) {
        realtimeBus.broadcast(data.eventId, "QUEUE_SLOT_UNLOCKED", {
          tableId: p.tableId,
          tableLabel: p.table.label,
          songTitle: p.song?.title || p.customTitle || "Canción",
        });
      }

      return NextResponse.json({
        success: true,
        message: "Siguiente canción cargada en Deck A",
      });
    }

    // 2.1 Acción: FINISH_CURRENT (marcar la pista que estaba al aire como finalizada, liberando turno)
    if (data.action === "FINISH_CURRENT") {
      const eventId = data.eventId;
      if (!eventId) throw new AppError("eventId es obligatorio para FINISH_CURRENT");

      const prevPlaying = await prisma.songRequest.findMany({
        where: { tenantId, eventId, status: "PLAYING" },
        include: {
          table: { select: { id: true, label: true } },
          song: { select: { title: true } },
        },
      });

      const now = new Date();
      await prisma.$transaction([
        prisma.queueEntry.updateMany({
          where: { tenantId, eventId, status: "CURRENT" },
          data: { status: "COMPLETED" },
        }),
        prisma.songRequest.updateMany({
          where: { tenantId, eventId, status: "PLAYING" },
          data: { status: "PLAYED", playedAt: now },
        }),
      ]);

      const eventObj = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, code: true, settings: true },
      });

      realtimeBus.broadcast(eventId, "TRACK_CHANGE", {
        currentEntryId: null,
      });

      realtimeBus.broadcast(eventId, "QUEUE_UPDATE", {
        action: "FINISH_CURRENT",
      });

      if (eventObj?.code) {
        realtimeBus.broadcast(eventObj.code, "TRACK_CHANGE", {
          currentEntryId: null,
        });
        realtimeBus.broadcast(eventObj.code, "QUEUE_UPDATE", {
          action: "FINISH_CURRENT",
        });
      }

      for (const p of prevPlaying) {
        realtimeBus.broadcast(eventId, "QUEUE_SLOT_UNLOCKED", {
          tableId: p.tableId,
          tableLabel: p.table.label,
          songTitle: p.song?.title || p.customTitle || "Canción",
        });
        if (eventObj?.code) {
          realtimeBus.broadcast(eventObj.code, "QUEUE_SLOT_UNLOCKED", {
            tableId: p.tableId,
            tableLabel: p.table.label,
            songTitle: p.song?.title || p.customTitle || "Canción",
          });
        }
      }

      realtimeBus.setPlaybackState(eventId, {
        action: "PAUSE",
        updatedAt: now.toISOString(),
      });
      if (eventObj?.code) {
        realtimeBus.setPlaybackState(eventObj.code, {
          action: "PAUSE",
          updatedAt: now.toISOString(),
        });
      }

      // Si el evento tiene activada la opción de otorgar 5s al siguiente turno para dar Play
      try {
        const policy = parseQueuePolicy(eventObj?.settings);

        if (policy.nextTurnMode && policy.nextTurnMode !== "DISABLED") {
          const nextInLine = await prisma.queueEntry.findFirst({
            where: { tenantId, eventId, status: "QUEUED" },
            orderBy: { orderIndex: "asc" },
            include: {
              songRequest: {
                include: {
                  song: { include: { artist: true } },
                  table: { select: { id: true, label: true } },
                  guestSession: { select: { guestName: true } },
                },
              },
            },
          });

          if (nextInLine) {
            const seconds = policy.nextTurnCountdownSeconds || 5;
            const startedAt = Date.now();
            const expiresAt = startedAt + seconds * 1000;
            const timeoutAction = policy.nextTurnMode === "SKIP_ON_TIMEOUT" ? "SKIP" : "AUTOPLAY";

            const countdownPayload = {
              queueEntryId: nextInLine.id,
              songRequestId: nextInLine.songRequestId,
              tableId: nextInLine.songRequest.tableId,
              tableLabel: nextInLine.songRequest.table.label,
              guestName: nextInLine.songRequest.guestSession?.guestName || null,
              songTitle: nextInLine.songRequest.song?.title || nextInLine.songRequest.customTitle || "Canción",
              artist: nextInLine.songRequest.song?.artist?.name || nextInLine.songRequest.customArtist || null,
              seconds,
              startedAt,
              expiresAt,
              timeoutAction,
            };

            realtimeBus.broadcast(eventId, "NEXT_TURN_COUNTDOWN", countdownPayload);
            if (eventObj?.code) {
              realtimeBus.broadcast(eventObj.code, "NEXT_TURN_COUNTDOWN", countdownPayload);
            }
          }
        }
      } catch (countdownErr) {
        console.warn("No se pudo iniciar cuenta regresiva de siguiente turno en FINISH_CURRENT:", countdownErr);
      }

      return NextResponse.json({
        success: true,
        message: "Pista marcada como finalizada y cupo liberado",
      });
    }

    // 2.2 Acción: START_NEXT_TURN_COUNTDOWN (otorgar 5 segundos para que el siguiente turno le dé al Play)
    if (data.action === "START_NEXT_TURN_COUNTDOWN") {
      const eventId = data.eventId;
      if (!eventId) throw new AppError("eventId es obligatorio para START_NEXT_TURN_COUNTDOWN");

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, code: true, settings: true },
      });
      if (!event) throw new NotFoundError("Evento no encontrado");
      const policy = parseQueuePolicy(event.settings);

      const targetEntry = data.queueEntryId
        ? await prisma.queueEntry.findFirst({
            where: { id: data.queueEntryId, tenantId },
            include: {
              songRequest: {
                include: {
                  song: { include: { artist: true } },
                  table: { select: { id: true, label: true } },
                  guestSession: { select: { guestName: true } },
                },
              },
            },
          })
        : await prisma.queueEntry.findFirst({
            where: { tenantId, eventId, status: "QUEUED" },
            orderBy: { orderIndex: "asc" },
            include: {
              songRequest: {
                include: {
                  song: { include: { artist: true } },
                  table: { select: { id: true, label: true } },
                  guestSession: { select: { guestName: true } },
                },
              },
            },
          });

      if (!targetEntry) throw new NotFoundError("No hay pedidos en cola disponibles para otorgar turno");

      const seconds = policy.nextTurnCountdownSeconds || 5;
      const startedAt = Date.now();
      const expiresAt = startedAt + seconds * 1000;
      const timeoutAction =
        data.timeoutAction || (policy.nextTurnMode === "SKIP_ON_TIMEOUT" ? "SKIP" : "AUTOPLAY");

      const countdownPayload = {
        queueEntryId: targetEntry.id,
        songRequestId: targetEntry.songRequestId,
        tableId: targetEntry.songRequest.tableId,
        tableLabel: targetEntry.songRequest.table.label,
        guestName: targetEntry.songRequest.guestSession?.guestName || null,
        songTitle: targetEntry.songRequest.song?.title || targetEntry.songRequest.customTitle || "Canción",
        artist: targetEntry.songRequest.song?.artist?.name || targetEntry.songRequest.customArtist || null,
        seconds,
        startedAt,
        expiresAt,
        timeoutAction,
      };

      realtimeBus.broadcast(eventId, "NEXT_TURN_COUNTDOWN", countdownPayload);
      if (event.code) {
        realtimeBus.broadcast(event.code, "NEXT_TURN_COUNTDOWN", countdownPayload);
      }

      return NextResponse.json({
        success: true,
        message: `⏱️ Otorgados ${seconds} segundos a ${countdownPayload.tableLabel} para darle al Play.`,
        data: countdownPayload,
      });
    }

    // 2.3 Acción: TIMEOUT_NEXT_TURN (cuando vencen los 5 segundos sin que el usuario le dé Play)
    if (data.action === "TIMEOUT_NEXT_TURN") {
      const eventId = data.eventId;
      if (!eventId) throw new AppError("eventId es obligatorio para TIMEOUT_NEXT_TURN");
      if (!data.queueEntryId) throw new AppError("queueEntryId es obligatorio para TIMEOUT_NEXT_TURN");

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, code: true, settings: true },
      });
      if (!event) throw new NotFoundError("Evento no encontrado");
      const policy = parseQueuePolicy(event.settings);

      const targetEntry = await prisma.queueEntry.findFirst({
        where: { id: data.queueEntryId, tenantId },
        include: {
          songRequest: {
            include: {
              song: { include: { artist: true } },
              table: { select: { id: true, label: true } },
            },
          },
        },
      });

      if (!targetEntry) throw new NotFoundError("Entrada de cola no encontrada");

      // Si la entrada ya no está en QUEUED (ej. ya le dieron al Play o ya fue completada), no hacer nada
      if (targetEntry.status !== "QUEUED") {
        return NextResponse.json({
          success: true,
          message: "La canción ya fue reproducida o modificada previamente",
        });
      }

      // Salvaguarda absoluta: Si ya hay una canción en reproducción activa (CURRENT) en el evento
      // o la cabina ya está sonando en vivo (PLAY), NUNCA interrumpir, cortar ni saltar. Abortar timeout de inmediato.
      const activeCurrent = await prisma.queueEntry.findFirst({
        where: { tenantId, eventId, status: "CURRENT" },
      });
      const activePlayback = realtimeBus.getPlaybackState(eventId);
      const isBoothPlaying = activePlayback?.action === "PLAY";

      if (activeCurrent || isBoothPlaying) {
        realtimeBus.broadcast(eventId, "NEXT_TURN_CANCELLED", {
          queueEntryId: targetEntry.id,
          reason: "BOOTH_PLAYING",
        });
        if (event.code) {
          realtimeBus.broadcast(event.code, "NEXT_TURN_CANCELLED", {
            queueEntryId: targetEntry.id,
            reason: "BOOTH_PLAYING",
          });
        }
        return NextResponse.json({
          success: true,
          message: "Cabina en reproducción activa. Conteo cancelado sin interrumpir la música.",
        });
      }

      const timeoutAction =
        data.timeoutAction || (policy.nextTurnMode === "SKIP_ON_TIMEOUT" ? "SKIP" : "AUTOPLAY");

      if (timeoutAction === "SKIP") {
        // Vencieron los 5 segundos sin dar Play: saltar al siguiente de la cola
        await prisma.$transaction([
          prisma.queueEntry.update({
            where: { id: targetEntry.id },
            data: { status: "SKIPPED" },
          }),
          prisma.songRequest.update({
            where: { id: targetEntry.songRequestId },
            data: { status: "CANCELLED" },
          }),
        ]);

        realtimeBus.broadcast(eventId, "NEXT_TURN_CANCELLED", {
          queueEntryId: targetEntry.id,
          reason: "TIMEOUT_SKIPPED",
        });
        if (event.code) {
          realtimeBus.broadcast(event.code, "NEXT_TURN_CANCELLED", {
            queueEntryId: targetEntry.id,
            reason: "TIMEOUT_SKIPPED",
          });
        }

        realtimeBus.broadcast(eventId, "QUEUE_UPDATE", { action: "SKIP" });
        if (event.code) {
          realtimeBus.broadcast(event.code, "QUEUE_UPDATE", { action: "SKIP" });
        }
        realtimeBus.broadcast(eventId, "QUEUE_SLOT_UNLOCKED", {
          tableId: targetEntry.songRequest.tableId,
          tableLabel: targetEntry.songRequest.table.label,
          songTitle: targetEntry.songRequest.song?.title || targetEntry.songRequest.customTitle || "Canción",
        });
        if (event.code) {
          realtimeBus.broadcast(event.code, "QUEUE_SLOT_UNLOCKED", {
            tableId: targetEntry.songRequest.tableId,
            tableLabel: targetEntry.songRequest.table.label,
            songTitle: targetEntry.songRequest.song?.title || targetEntry.songRequest.customTitle || "Canción",
          });
        }

        // Si la política sigue activa y hay más temas en cola, otorgar automáticamente 5s al siguiente en cola
        if (policy.nextTurnMode && policy.nextTurnMode !== "DISABLED") {
          const nextInLine = await prisma.queueEntry.findFirst({
            where: { tenantId, eventId, status: "QUEUED" },
            orderBy: { orderIndex: "asc" },
            include: {
              songRequest: {
                include: {
                  song: { include: { artist: true } },
                  table: { select: { id: true, label: true } },
                  guestSession: { select: { guestName: true } },
                },
              },
            },
          });

          if (nextInLine) {
            const seconds = policy.nextTurnCountdownSeconds || 5;
            const startedAt = Date.now();
            const expiresAt = startedAt + seconds * 1000;
            const nextTimeoutAction = policy.nextTurnMode === "SKIP_ON_TIMEOUT" ? "SKIP" : "AUTOPLAY";

            const nextPayload = {
              queueEntryId: nextInLine.id,
              songRequestId: nextInLine.songRequestId,
              tableId: nextInLine.songRequest.tableId,
              tableLabel: nextInLine.songRequest.table.label,
              guestName: nextInLine.songRequest.guestSession?.guestName || null,
              songTitle: nextInLine.songRequest.song?.title || nextInLine.songRequest.customTitle || "Canción",
              artist: nextInLine.songRequest.song?.artist?.name || nextInLine.songRequest.customArtist || null,
              seconds,
              startedAt,
              expiresAt,
              timeoutAction: nextTimeoutAction,
            };

            realtimeBus.broadcast(eventId, "NEXT_TURN_COUNTDOWN", nextPayload);
            if (event.code) {
              realtimeBus.broadcast(event.code, "NEXT_TURN_COUNTDOWN", nextPayload);
            }
          }
        }

        return NextResponse.json({
          success: true,
          message: "Tiempo de 5 segundos agotado: se avanzó al siguiente en la cola.",
          actionTaken: "SKIP",
        });
      } else {
        // timeoutAction === "AUTOPLAY": Reproducción automática desde cabina tanto para Karaoke o DJ
        const now = new Date();
        await prisma.$transaction([
          prisma.queueEntry.updateMany({
            where: { tenantId, eventId, status: "CURRENT", id: { not: targetEntry.id } },
            data: { status: "COMPLETED" },
          }),
          prisma.songRequest.updateMany({
            where: { tenantId, eventId, status: "PLAYING", id: { not: targetEntry.songRequestId } },
            data: { status: "PLAYED", playedAt: now },
          }),
          prisma.queueEntry.update({
            where: { id: targetEntry.id },
            data: { status: "CURRENT" },
          }),
          prisma.songRequest.update({
            where: { id: targetEntry.songRequestId },
            data: { status: "PLAYING", playedAt: now },
          }),
        ]);

        realtimeBus.broadcast(eventId, "NEXT_TURN_CANCELLED", {
          queueEntryId: targetEntry.id,
          reason: "TIMEOUT_AUTOPLAY",
        });
        if (event.code) {
          realtimeBus.broadcast(event.code, "NEXT_TURN_CANCELLED", {
            queueEntryId: targetEntry.id,
            reason: "TIMEOUT_AUTOPLAY",
          });
        }

        realtimeBus.broadcast(eventId, "TRACK_CHANGE", {
          currentEntryId: targetEntry.id,
        });
        realtimeBus.broadcast(eventId, "QUEUE_UPDATE", { action: "PLAY" });
        if (event.code) {
          realtimeBus.broadcast(event.code, "TRACK_CHANGE", {
            currentEntryId: targetEntry.id,
          });
          realtimeBus.broadcast(event.code, "QUEUE_UPDATE", { action: "PLAY" });
        }

        return NextResponse.json({
          success: true,
          message: "Tiempo de 5 segundos cumplido: reproducción automática iniciada desde cabina.",
          actionTaken: "AUTOPLAY",
        });
      }
    }

    // 2.4 Acción: CANCEL_NEXT_TURN_COUNTDOWN (cancelar cuenta regresiva por DJ)
    if (data.action === "CANCEL_NEXT_TURN_COUNTDOWN") {
      const eventId = data.eventId;
      if (!eventId) throw new AppError("eventId es obligatorio");
      realtimeBus.broadcast(eventId, "NEXT_TURN_CANCELLED", {
        queueEntryId: data.queueEntryId || null,
        reason: "DJ_CANCELLED",
      });
      if (data.eventCode) {
        realtimeBus.broadcast(data.eventCode, "NEXT_TURN_CANCELLED", {
          queueEntryId: data.queueEntryId || null,
          reason: "DJ_CANCELLED",
        });
      } else {
        const ev = await prisma.event.findUnique({
          where: { id: eventId },
          select: { code: true },
        });
        if (ev?.code) {
          realtimeBus.broadcast(ev.code, "NEXT_TURN_CANCELLED", {
            queueEntryId: data.queueEntryId || null,
            reason: "DJ_CANCELLED",
          });
        }
      }
      return NextResponse.json({
        success: true,
        message: "Cuenta regresiva de turno cancelada",
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
        include: {
          songRequest: {
            include: {
              table: { select: { id: true, label: true } },
              song: { select: { title: true } },
            },
          },
        },
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

      realtimeBus.broadcast(entry.eventId, "QUEUE_UPDATE", {
        action: "SKIP",
      });

      // Liberar slot de la mesa
      realtimeBus.broadcast(entry.eventId, "QUEUE_SLOT_UNLOCKED", {
        tableId: entry.songRequest.tableId,
        tableLabel: entry.songRequest.table.label,
        songTitle: entry.songRequest.song?.title || entry.songRequest.customTitle || "Canción",
      });

      return NextResponse.json({
        success: true,
        message: "Canción salteada/removida de la cola",
      });
    }

    // 5. Acción: REORDER (reordenamiento manual de la cola)
    if (data.action === "REORDER") {
      if (!data.newOrder || !Array.isArray(data.newOrder)) {
        throw new AppError("newOrder es obligatorio para REORDER");
      }
      await prisma.$transaction(
        data.newOrder.map((id, index) =>
          prisma.queueEntry.updateMany({
            where: { id, tenantId },
            data: { orderIndex: index + 1 },
          })
        )
      );
      if (data.eventId) {
        realtimeBus.broadcast(data.eventId, "QUEUE_UPDATE", { action: "REORDER" });
      }
      return NextResponse.json({
        success: true,
        message: "Cola reordenada correctamente",
      });
    }

    throw new AppError("Acción no soportada");
  } catch (error) {
    return handleApiError(error);
  }
}
