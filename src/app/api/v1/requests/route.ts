import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { calculateNightPulse } from "@/lib/pulse/night-pulse";
import { getActiveFlashDeal } from "@/lib/pulse/flash-deals";
import { getMergedBranding } from "@/lib/branding/config";
import { handleApiError, UnauthorizedError, AppError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { parseQueuePolicy } from "@/lib/dj/rotation";

const createRequestSchema = z
  .object({
    songId: z.string().optional(),
    customTitle: z.string().max(100).optional(),
    customArtist: z.string().max(100).optional(),
    guestName: z.string().max(60).optional(),
    notes: z.string().max(200).optional(),
    tipAmountCents: z.number().int().min(0).max(100000).optional(),
    isFastPass: z.boolean().optional(),
    mode: z.enum(["DJ", "KARAOKE"]).optional(),
  })
  .refine((data) => data.songId || (data.customTitle && data.customArtist), {
    message: "Debes seleccionar una canción del catálogo o ingresar título y artista manualmente",
  });

export async function POST(req: NextRequest) {
  try {
    // 1. Validar sesión del comensal
    const guestSession = await getCurrentGuestSession();
    if (!guestSession) {
      throw new UnauthorizedError("Tu sesión de mesa ha expirado. Por favor, vuelve a escanear el código QR.");
    }

    // 2. Validar que el evento siga activo
    if (guestSession.event.status !== "ACTIVE") {
      throw new AppError("El evento de esta noche ha finalizado. No se aceptan más solicitudes.", 400);
    }

    const body = await req.json();
    const data = createRequestSchema.parse(body);

    const policy = parseQueuePolicy(guestSession.event.settings);
    const tableZone = (guestSession.table as any).zone || policy.zone || "MAIN";
    const isDjZone =
      data.mode === "DJ"
        ? true
        : data.mode === "KARAOKE"
        ? false
        : tableZone === "DJ" || policy.nightMode === "DJ_ONLY";
    const effectiveLimit = isDjZone ? policy.dj.maxActivePerTable : policy.karaoke.maxActivePerTable;
    const isPaused = isDjZone ? policy.dj.queuePaused : policy.karaoke.queuePaused;

    // 2.1 Validar si la cola está pausada por la cabina
    if (isPaused) {
      throw new AppError(
        isDjZone
          ? "La cabina DJ ha pausado temporalmente la recepción de pedidos para la pista."
          : "El escenario de Karaoke ha pausado temporalmente la recepción de cantantes.",
        423,
        "QUEUE_PAUSED"
      );
    }

    // 3. Regla Fair-Play: Máximo de canciones activas simultáneas por mesa (PENDING, ACCEPTED o PLAYING)
    const activeCount = await prisma.songRequest.count({
      where: {
        tableId: guestSession.tableId,
        eventId: guestSession.eventId,
        status: { in: ["PENDING", "ACCEPTED", "PLAYING"] },
      },
    });

    if (activeCount >= effectiveLimit) {
      const unit = effectiveLimit === 1 ? "canción activa" : "canciones activas";
      throw new AppError(
        isDjZone
          ? `Tu mesa ya tiene su cupo completo (${activeCount}/${effectiveLimit} ${unit}). Podrán pedir su siguiente tema en cuanto el DJ reproduzca el actual.`
          : `Tu mesa ya tiene su cupo completo (${activeCount}/${effectiveLimit} ${unit}). Podrán pedir su siguiente tema en cuanto hayan cantado en el escenario.`,
        429,
        "MAX_ACTIVE_PER_TABLE_REACHED"
      );
    }

    // 4. Si se proporcionó un nombre de comensal, actualizar la sesión
    if (data.guestName && data.guestName.trim() !== guestSession.guestName) {
      await prisma.guestSession.update({
        where: { id: guestSession.id },
        data: { guestName: data.guestName.trim() },
      });
    }

    // 5. Crear la solicitud de canción (con auto-play si la opción está activada por el DJ)
    const isAutoPlay = Boolean(policy.autoPlayRequests);
    let initialStatus: "PENDING" | "ACCEPTED" | "PLAYING" = "PENDING";
    let queueEntryStatus: "CURRENT" | "QUEUED" | null = null;
    let playedAt: Date | null = null;

    if (isAutoPlay) {
      // Verificar si hay alguna canción sonando actualmente
      const currentActive = await prisma.queueEntry.findFirst({
        where: {
          tenantId: guestSession.tenantId,
          eventId: guestSession.eventId,
          status: "CURRENT",
        },
      });

      if (!currentActive) {
        // Nada sonando: entra directamente a reproducirse
        initialStatus = "PLAYING";
        queueEntryStatus = "CURRENT";
        playedAt = new Date();
      } else {
        // Ya hay un tema al aire: se encola automáticamente
        initialStatus = "ACCEPTED";
        queueEntryStatus = "QUEUED";
      }
    }

    const songRequest = await prisma.songRequest.create({
      data: {
        tenantId: guestSession.tenantId,
        eventId: guestSession.eventId,
        tableId: guestSession.tableId,
        guestSessionId: guestSession.id,
        songId: data.songId || null,
        customTitle: data.customTitle?.trim() || null,
        customArtist: data.customArtist?.trim() || null,
        notes: data.notes?.trim() || null,
        tipAmountCents: data.tipAmountCents ?? (data.isFastPass ? 500 : 0),
        status: initialStatus,
        playedAt,
      },
      include: {
        song: {
          include: { artist: true },
        },
        table: {
          select: { number: true, label: true },
        },
      },
    });

    let createdQueueEntry = null;
    if (queueEntryStatus) {
      const lastQueueEntry = await prisma.queueEntry.findFirst({
        where: { tenantId: guestSession.tenantId, eventId: guestSession.eventId },
        orderBy: { orderIndex: "desc" },
      });
      const nextOrderIndex = (lastQueueEntry?.orderIndex ?? 0) + 1;

      createdQueueEntry = await prisma.queueEntry.create({
        data: {
          tenantId: guestSession.tenantId,
          eventId: guestSession.eventId,
          songRequestId: songRequest.id,
          orderIndex: nextOrderIndex,
          status: queueEntryStatus,
        },
        include: {
          songRequest: {
            include: {
              song: { include: { artist: true } },
              table: true,
            },
          },
        },
      });
    }

    // Notificar inmediatamente a la cabina del DJ en tiempo real (con flag VIP Fast-Pass si aplica)
    realtimeBus.broadcast(guestSession.eventId, "REQUEST_NEW", songRequest);

    if (queueEntryStatus === "CURRENT") {
      realtimeBus.broadcast(guestSession.eventId, "TRACK_CHANGE", {
        currentEntryId: createdQueueEntry?.id,
      });
      realtimeBus.broadcast(guestSession.eventId, "QUEUE_UPDATE", {
        action: "PLAY",
        queueEntry: createdQueueEntry,
      });
    } else if (queueEntryStatus === "QUEUED") {
      realtimeBus.broadcast(guestSession.eventId, "QUEUE_UPDATE", {
        action: "ACCEPT",
        requestId: songRequest.id,
        queueEntry: createdQueueEntry,
      });
    }

    const responseMessage = isAutoPlay
      ? queueEntryStatus === "CURRENT"
        ? "¡Canción aprobada y reproduciéndose en vivo!"
        : "¡Canción aprobada automáticamente y agregada a la cola!"
      : "¡Canción enviada al DJ!";

    return NextResponse.json({
      success: true,
      message: responseMessage,
      data: songRequest,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const guestSession = await getCurrentGuestSession();
    if (!guestSession) {
      throw new UnauthorizedError("Sesión no encontrada");
    }

    // 1. Consultar solicitudes de la mesa y canción en vivo
    const [requests, currentPlayingEntry, queuedEntries] = await Promise.all([
      prisma.songRequest.findMany({
        where: {
          tableId: guestSession.tableId,
          eventId: guestSession.eventId,
        },
        include: {
          song: {
            include: { artist: true },
          },
          queueEntry: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.queueEntry.findFirst({
        where: {
          eventId: guestSession.eventId,
          status: "CURRENT",
        },
        include: {
          songRequest: {
            include: {
              song: { include: { artist: true } },
              table: { select: { label: true, number: true } },
            },
          },
        },
      }),
      prisma.queueEntry.findMany({
        where: {
          eventId: guestSession.eventId,
          status: "QUEUED",
        },
        select: { id: true, orderIndex: true, songRequestId: true },
        orderBy: { orderIndex: "asc" },
      }),
    ]);

    const policy = parseQueuePolicy(guestSession.event.settings);

    // 2. Calcular posición exacta y tiempo estimado para cada pedido
    const enrichedRequests = requests.map((req) => {
      let queuePosition: number | null = null;
      let estimatedWaitMinutes: number | null = null;

      if (req.queueEntry && req.queueEntry.status === "QUEUED") {
        const indexInQueue = queuedEntries.findIndex((q) => q.id === req.queueEntry?.id);
        if (indexInQueue !== -1) {
          queuePosition = indexInQueue + 1;
          estimatedWaitMinutes = Math.max(1, queuePosition * policy.avgSongDurationMinutes);
        }
      }

      return {
        ...req,
        queuePosition,
        estimatedWaitMinutes,
      };
    });

    // 2.1 Calcular estado de cupo activo de la mesa
    const activeRequestsCount = requests.filter((r) =>
      ["PENDING", "ACCEPTED", "PLAYING"].includes(r.status)
    ).length;

    const explicitTableZone = (guestSession.table as any).zone;
    const isDjZone = explicitTableZone === "DJ" || policy.nightMode === "DJ_ONLY";
    const isKaraokeZone = explicitTableZone === "KARAOKE" || policy.nightMode === "KARAOKE_ONLY";
    const computedZone: "DJ" | "KARAOKE" | "MAIN" = isDjZone
      ? "DJ"
      : isKaraokeZone
      ? "KARAOKE"
      : "MAIN";

    const effectiveMax = isDjZone ? policy.dj.maxActivePerTable : policy.karaoke.maxActivePerTable;
    const effectivePaused = isDjZone ? policy.dj.queuePaused : policy.karaoke.queuePaused;

    const tableAllowance = {
      usedSlots: activeRequestsCount,
      maxSlots: effectiveMax,
      isLocked: activeRequestsCount >= effectiveMax,
      queuePaused: effectivePaused,
      zone: computedZone,
      nightMode: policy.nightMode,
      djQueuePaused: policy.dj.queuePaused,
      karaokeQueuePaused: policy.karaoke.queuePaused,
      autoPlayRequests: Boolean(policy.autoPlayRequests),
    };

    // 3. Resolver branding del local y establecimiento
    const venueSettings = (guestSession.table as any).venue?.settings;
    const venueName = (guestSession.table as any).venue?.name;
    const branding = getMergedBranding(
      guestSession.tenant.settings,
      venueSettings,
      venueName || guestSession.tenant.name,
      guestSession.tenant.logoUrl
    );

    // 4. Calcular Flash Deals según Night Pulse de la noche
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentRequestsCount = await prisma.songRequest.count({
      where: {
        tenantId: guestSession.tenantId,
        eventId: guestSession.eventId,
        createdAt: { gte: fifteenMinutesAgo },
      },
    });

    const pulse = calculateNightPulse({
      activeTables: 1, // Mesa actual activa
      requestsLast15m: recentRequestsCount,
      queuedWaiters: queuedEntries.length,
    });
    const flashDeal = getActiveFlashDeal(pulse.level);

    return NextResponse.json({
      success: true,
      data: {
        session: {
          guestName: guestSession.guestName,
          table: guestSession.table,
          event: guestSession.event,
          tenant: guestSession.tenant,
        },
        currentPlaying: currentPlayingEntry
          ? {
              title:
                currentPlayingEntry.songRequest.song?.title ||
                currentPlayingEntry.songRequest.customTitle ||
                "Canción en Vivo",
              artist:
                currentPlayingEntry.songRequest.song?.artist?.name ||
                currentPlayingEntry.songRequest.customArtist ||
                "Artista",
              tableLabel: currentPlayingEntry.songRequest.table.label,
            }
          : null,
        branding,
        flashDeal,
        policy,
        tableAllowance,
        requests: enrichedRequests,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
