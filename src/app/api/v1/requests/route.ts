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

    const policy = parseQueuePolicy(guestSession.event.settings);

    // 2.1 Validar si la cola está pausada por la cabina
    if (policy.queuePaused) {
      throw new AppError(
        "La recepción de canciones está pausada temporalmente por la cabina. Volveremos a abrir pedidos en breve.",
        423,
        "QUEUE_PAUSED"
      );
    }

    const body = await req.json();
    const data = createRequestSchema.parse(body);

    // 3. Regla Fair-Play: Máximo de canciones activas simultáneas por mesa (PENDING, ACCEPTED o PLAYING)
    const activeCount = await prisma.songRequest.count({
      where: {
        tableId: guestSession.tableId,
        eventId: guestSession.eventId,
        status: { in: ["PENDING", "ACCEPTED", "PLAYING"] },
      },
    });

    if (activeCount >= policy.maxActivePerTable) {
      const unit = policy.maxActivePerTable === 1 ? "canción activa" : "canciones activas";
      throw new AppError(
        `Tu mesa ya tiene su cupo completo (${activeCount}/${policy.maxActivePerTable} ${unit}). Podrán pedir su siguiente tema en cuanto hayan cantado en el escenario.`,
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

    // 5. Crear la solicitud de canción
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
        status: "PENDING",
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

    // Notificar inmediatamente a la cabina del DJ en tiempo real (con flag VIP Fast-Pass si aplica)
    realtimeBus.broadcast(guestSession.eventId, "REQUEST_NEW", songRequest);

    return NextResponse.json({
      success: true,
      message: "¡Canción enviada al DJ!",
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

    const tableAllowance = {
      usedSlots: activeRequestsCount,
      maxSlots: policy.maxActivePerTable,
      isLocked: activeRequestsCount >= policy.maxActivePerTable,
      queuePaused: policy.queuePaused,
      zone: (guestSession.table as any).zone || policy.zone || "MAIN",
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
