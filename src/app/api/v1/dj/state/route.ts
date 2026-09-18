import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    // 1. Autorización: DJ, MANAGER, OWNER o SUPER_ADMIN
    await requireRole(["DJ", "MANAGER", "OWNER", "SUPER_ADMIN"]);
    const { tenantId } = await requireTenantContext();

    const { searchParams } = new URL(req.url);
    const requestedEventId = searchParams.get("eventId");

    // 2. Obtener eventos activos de este tenant
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

    // 3. Seleccionar evento actual
    const currentEvent =
      (requestedEventId && activeEvents.find((e) => e.id === requestedEventId)) ||
      activeEvents[0];

    const eventId = currentEvent.id;

    // 4. Consultar estado en paralelo
    const [pendingRequests, queue, currentPlaying, recentHistory, statsCounts, tables] =
      await Promise.all([
        // Solicitudes pendientes de moderación
        prisma.songRequest.findMany({
          where: {
            tenantId,
            eventId,
            status: "PENDING",
          },
          include: {
            song: { include: { artist: true } },
            table: { select: { id: true, number: true, label: true } },
            guestSession: { select: { id: true, guestName: true } },
          },
          orderBy: { createdAt: "asc" },
        }),

        // Cola de reproducción en vivo (QUEUED)
        prisma.queueEntry.findMany({
          where: {
            tenantId,
            eventId,
            status: "QUEUED",
          },
          include: {
            songRequest: {
              include: {
                song: { include: { artist: true } },
                table: { select: { id: true, number: true, label: true } },
                guestSession: { select: { id: true, guestName: true } },
              },
            },
          },
          orderBy: { orderIndex: "asc" },
        }),

        // Canción actualmente en reproducción (CURRENT)
        prisma.queueEntry.findFirst({
          where: {
            tenantId,
            eventId,
            status: "CURRENT",
          },
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

        // Historial reciente
        prisma.queueEntry.findMany({
          where: {
            tenantId,
            eventId,
            status: { in: ["COMPLETED", "SKIPPED"] },
          },
          include: {
            songRequest: {
              include: {
                song: { include: { artist: true } },
                table: { select: { label: true } },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 5,
        }),

        // Conteos estadísticos
        prisma.songRequest.groupBy({
          by: ["status"],
          where: { tenantId, eventId },
          _count: true,
        }),

        // Mesas y tokens de acceso QR del local / fiesta
        prisma.table.findMany({
          where: { venueId: currentEvent.venueId, active: true },
          select: { id: true, number: true, label: true, qrToken: true, zone: true },
          orderBy: { number: "asc" },
        }),
      ]);

    const statsMap = Object.fromEntries(
      statsCounts.map((s) => [s.status, s._count])
    );

    return NextResponse.json({
      success: true,
      data: {
        hasActiveEvent: true,
        event: {
          id: currentEvent.id,
          name: currentEvent.name,
          code: currentEvent.code,
          venueName: currentEvent.venue.name,
          settings: currentEvent.settings ? JSON.parse(currentEvent.settings) : {},
        },
        tables,
        activeEvents: activeEvents.map((e) => ({
          id: e.id,
          name: e.name,
          code: e.code,
          venueName: e.venue.name,
        })),
        pendingRequests,
        queue,
        currentPlaying,
        recentHistory,
        stats: {
          pending: statsMap["PENDING"] || 0,
          queued: queue.length,
          playing: currentPlaying ? 1 : 0,
          played: statsMap["PLAYED"] || 0,
          rejected: statsMap["REJECTED"] || 0,
          totalRequests: statsCounts.reduce((acc, curr) => acc + curr._count, 0),
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
