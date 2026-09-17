import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { calculateNightPulse } from "@/lib/pulse/night-pulse";
import { RoomTableItem, TableRoomStatus } from "@/components/dashboard/RoomMapMini";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN", "DJ", "OPERATOR"]);
    const { tenantId } = await requireTenantContext();

    const { searchParams } = new URL(req.url);
    const requestedEventId = searchParams.get("eventId");

    // 1. Obtener eventos activos
    const activeEvents = await prisma.event.findMany({
      where: { tenantId, status: "ACTIVE" },
      include: {
        venue: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: "desc" },
    });

    if (activeEvents.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          hasActiveEvent: false,
          activeEvents: [],
          message: "No hay eventos activos en este momento",
        },
      });
    }

    const currentEvent =
      (requestedEventId && activeEvents.find((e) => e.id === requestedEventId)) ||
      activeEvents[0];
    const eventId = currentEvent.id;
    const venueId = currentEvent.venueId;

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const now = new Date();

    // 2. Consultas en paralelo para sala, cola y métricas
    const [
      tablesWithData,
      requestsLast15mCount,
      queuedWaitersCount,
      currentPlayingEntry,
      nextUpEntries,
      recentRequests,
    ] = await Promise.all([
      // Mesas del local con sus sesiones y solicitudes activas
      prisma.table.findMany({
        where: { tenantId, venueId, active: true },
        include: {
          guestSessions: {
            where: { expiresAt: { gt: now } },
            select: { id: true },
          },
          songRequests: {
            where: { eventId, status: { in: ["PENDING", "ACCEPTED", "PLAYING"] } },
            include: {
              song: { include: { artist: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { number: "asc" },
      }),

      // Pedidos en los últimos 15 min
      prisma.songRequest.count({
        where: {
          tenantId,
          eventId,
          createdAt: { gte: fifteenMinutesAgo },
        },
      }),

      // Esperando en cola o por moderación
      prisma.songRequest.count({
        where: {
          tenantId,
          eventId,
          status: { in: ["PENDING", "ACCEPTED"] },
        },
      }),

      // Canción actual en vivo
      prisma.queueEntry.findFirst({
        where: { tenantId, eventId, status: "CURRENT" },
        include: {
          songRequest: {
            include: {
              song: { include: { artist: true } },
              table: { select: { id: true, number: true, label: true } },
              guestSession: { select: { id: true, guestName: true } },
            },
          },
        },
      }),

      // Próximas 3 canciones en cola
      prisma.queueEntry.findMany({
        where: { tenantId, eventId, status: "QUEUED" },
        include: {
          songRequest: {
            include: {
              song: { include: { artist: true } },
              table: { select: { label: true, number: true } },
              guestSession: { select: { guestName: true } },
            },
          },
        },
        orderBy: { orderIndex: "asc" },
        take: 3,
      }),

      // Actividad reciente (últimas 6 solicitudes)
      prisma.songRequest.findMany({
        where: { tenantId, eventId },
        include: {
          song: { include: { artist: true } },
          table: { select: { label: true, number: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    // 3. Procesar mapa de mesas
    let activeTablesCount = 0;
    const roomTables: RoomTableItem[] = tablesWithData.map((t) => {
      const guestCount = t.guestSessions.length;
      if (guestCount > 0) {
        activeTablesCount++;
      }

      const playingReq = t.songRequests.find((r) => r.status === "PLAYING");
      const waitingReq = t.songRequests.find((r) => ["PENDING", "ACCEPTED"].includes(r.status));

      let status: TableRoomStatus = "IDLE";
      if (playingReq) {
        status = "SINGING";
      } else if (waitingReq) {
        status = "WAITING";
      } else if (guestCount > 0) {
        status = "CONNECTED";
      }

      return {
        id: t.id,
        number: t.number,
        label: t.label,
        capacity: t.capacity,
        status,
        guestCount,
        currentSong: playingReq
          ? {
              title: playingReq.song?.title || playingReq.customTitle || "Canción",
              artist: playingReq.song?.artist?.name || playingReq.customArtist || undefined,
            }
          : null,
        pendingSong: waitingReq
          ? {
              title: waitingReq.song?.title || waitingReq.customTitle || "En espera",
              artist: waitingReq.song?.artist?.name || waitingReq.customArtist || undefined,
            }
          : null,
      };
    });

    // 4. Calcular Night Pulse
    const pulse = calculateNightPulse({
      activeTables: activeTablesCount,
      totalTables: tablesWithData.length,
      requestsLast15m: requestsLast15mCount,
      queuedWaiters: queuedWaitersCount,
    });

    return NextResponse.json({
      success: true,
      data: {
        hasActiveEvent: true,
        event: {
          id: currentEvent.id,
          name: currentEvent.name,
          code: currentEvent.code,
          venueName: currentEvent.venue.name,
          startsAt: currentEvent.startsAt,
        },
        activeEvents: activeEvents.map((e) => ({
          id: e.id,
          name: e.name,
          code: e.code,
          venueName: e.venue.name,
        })),
        pulse,
        currentPlaying: currentPlayingEntry
          ? {
              id: currentPlayingEntry.id,
              title:
                currentPlayingEntry.songRequest.song?.title ||
                currentPlayingEntry.songRequest.customTitle ||
                "Canción",
              artist:
                currentPlayingEntry.songRequest.song?.artist?.name ||
                currentPlayingEntry.songRequest.customArtist ||
                "Artista",
              genre: currentPlayingEntry.songRequest.song?.genre || null,
              durationSeconds: currentPlayingEntry.songRequest.song?.durationSeconds || 210,
              tableLabel: currentPlayingEntry.songRequest.table.label,
              guestName: currentPlayingEntry.songRequest.guestSession?.guestName || null,
              notes: currentPlayingEntry.songRequest.notes || null,
            }
          : null,
        nextUp: nextUpEntries.map((n) => ({
          id: n.id,
          orderIndex: n.orderIndex,
          title: n.songRequest.song?.title || n.songRequest.customTitle || "Canción",
          artist: n.songRequest.song?.artist?.name || n.songRequest.customArtist || "Artista",
          tableLabel: n.songRequest.table.label,
          guestName: n.songRequest.guestSession?.guestName || null,
        })),
        tables: roomTables,
        activityFeed: recentRequests.map((r) => ({
          id: r.id,
          title: r.song?.title || r.customTitle || "Tema",
          artist: r.song?.artist?.name || r.customArtist || "Artista",
          tableLabel: r.table.label,
          status: r.status,
          createdAt: r.createdAt,
        })),
        stats: {
          totalTables: tablesWithData.length,
          activeTables: activeTablesCount,
          requestsLast15m: requestsLast15mCount,
          queuedWaiters: queuedWaitersCount,
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
