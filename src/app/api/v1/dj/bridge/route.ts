import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["DJ", "MANAGER", "OWNER", "SUPER_ADMIN"]);
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    const event = eventId
      ? await prisma.event.findFirst({ where: { id: eventId, tenantId } })
      : await prisma.event.findFirst({
          where: { tenantId, status: "ACTIVE" },
          orderBy: { startsAt: "desc" },
        });

    if (!event) {
      throw new NotFoundError("No se encontró ningún evento activo");
    }

    const origin = new URL(req.url).origin;
    const bridgeToken = `br_${event.code.toLowerCase()}_${event.pin || "live"}`;

    const [queueCount, pendingCount] = await Promise.all([
      prisma.queueEntry.count({
        where: { eventId: event.id, status: "QUEUED" },
      }),
      prisma.songRequest.count({
        where: { eventId: event.id, status: "PENDING" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          code: event.code,
        },
        bridge: {
          token: bridgeToken,
          protocolVersion: "1.0",
          playlistM3uUrl: `${origin}/api/v1/dj/bridge/playlist.m3u?code=${event.code}&token=${bridgeToken}`,
          syncWebhookUrl: `${origin}/api/v1/dj/bridge/sync`,
          status: "READY",
          stats: {
            queuedTracks: queueCount,
            pendingRequests: pendingCount,
          },
        },
        integrations: {
          virtualDj: {
            method: "Online M3U Playlist & History Logger",
            supported: true,
          },
          rekordbox: {
            method: "M3U Playlist Import & Auto-mix Watcher",
            supported: true,
          },
          serato: {
            method: "Live Crate Playlist Import",
            supported: true,
          },
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
