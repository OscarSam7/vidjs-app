import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateQrDataUrl } from "@/lib/qr/generator";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { getMergedBranding } from "@/lib/branding/config";
import { calculateNightPulse } from "@/lib/pulse/night-pulse";
import { getActiveFlashDeal } from "@/lib/pulse/flash-deals";
import { parseQueuePolicy } from "@/lib/dj/rotation";
import { searchYouTube } from "@/lib/youtube/search";
import { realtimeBus } from "@/lib/realtime/event-bus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Código de evento requerido" } },
        { status: 400 }
      );
    }

    // 1. Buscar evento por código único
    const event = await prisma.event.findUnique({
      where: { code },
      include: {
        venue: {
          select: { id: true, name: true, address: true, settings: true },
        },
        tenant: {
          select: { id: true, name: true, slug: true, logoUrl: true, settings: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundError(`No se encontró ningún evento con el código '${code}'`);
    }

    // 2. Consultar canción actual en reproducción (CURRENT)
    const currentPlaying = await prisma.queueEntry.findFirst({
      where: {
        eventId: event.id,
        status: "CURRENT",
      },
      include: {
        songRequest: {
          include: {
            song: {
              include: { artist: true },
            },
            table: {
              select: { id: true, number: true, label: true },
            },
            guestSession: {
              select: { id: true, guestName: true },
            },
          },
        },
      },
    });

    // 3. Consultar próximos 4 temas en cola (QUEUED)
    const upcomingQueue = await prisma.queueEntry.findMany({
      where: {
        eventId: event.id,
        status: "QUEUED",
      },
      include: {
        songRequest: {
          include: {
            song: {
              include: { artist: true },
            },
            table: {
              select: { id: true, number: true, label: true },
            },
          },
        },
      },
      orderBy: { orderIndex: "asc" },
      take: 4,
    });

    // 4. Generar código QR para proyectar en pantalla
    const origin = new URL(req.url).origin;
    // URL amigable para escanear desde la TV
    const scanUrl = `${origin}/display/${code}/scan`;
    const qrDataUrl = await generateQrDataUrl(scanUrl);

    // 5. Resolver personalización de marca (Tenant -> Venue)
    const branding = getMergedBranding(
      event.tenant.settings,
      event.venue.settings,
      event.venue.name || event.tenant.name,
      event.tenant.logoUrl
    );

    // 6. Política de cola (Modo Karaoke / DJ, Pausa)
    const policy = parseQueuePolicy(event.settings);

    // 7. Resolver ID de video de YouTube para el tema al aire (Karaoke TV)
    let youtubeVideoId: string | null = null;
    if (currentPlaying) {
      const songTitle =
        currentPlaying.songRequest.song?.title ||
        currentPlaying.songRequest.customTitle ||
        "";
      const songArtist =
        currentPlaying.songRequest.song?.artist?.name ||
        currentPlaying.songRequest.customArtist ||
        "";
      const q = `${songTitle} ${songArtist}`.trim();
      if (q) {
        try {
          const ytResults = await searchYouTube(q, { isKaraoke: true, limit: 1 });
          if (ytResults.length > 0) {
            youtubeVideoId = ytResults[0].id;
          }
        } catch (e) {
          console.warn("No se pudo pre-resolver video de YouTube para display state:", e);
        }
      }
    }

    const livePlayback =
      realtimeBus.getPlaybackState(event.code) ||
      realtimeBus.getPlaybackState(event.id) ||
      (code ? realtimeBus.getPlaybackState(code) : null);

    const effectiveCurrentPlaying = currentPlaying
      ? {
          id: currentPlaying.id,
          status: currentPlaying.status,
          updatedAt: currentPlaying.updatedAt,
          youtubeVideoId,
          song: {
            title:
              currentPlaying.songRequest.song?.title ||
              currentPlaying.songRequest.customTitle,
            artist:
              currentPlaying.songRequest.song?.artist?.name ||
              currentPlaying.songRequest.customArtist,
            genre: currentPlaying.songRequest.song?.genre || "Fiesta / Pop",
            durationSeconds:
              currentPlaying.songRequest.song?.durationSeconds || 210,
            bpm: currentPlaying.songRequest.song?.bpm,
            key: currentPlaying.songRequest.song?.key,
            youtubeSearchQuery: `${
              currentPlaying.songRequest.song?.title ||
              currentPlaying.songRequest.customTitle ||
              ""
            } ${
              currentPlaying.songRequest.song?.artist?.name ||
              currentPlaying.songRequest.customArtist ||
              ""
            } karaoke`.trim(),
          },
          table: currentPlaying.songRequest.table,
          guestName: currentPlaying.songRequest.guestSession?.guestName,
          notes: currentPlaying.songRequest.notes,
          tipAmountCents: currentPlaying.songRequest.tipAmountCents || 0,
          isFastPass: (currentPlaying.songRequest.tipAmountCents || 0) > 0,
        }
      : livePlayback && (livePlayback.action === "PLAY" || livePlayback.action === "PAUSE") && livePlayback.trackTitle
      ? {
          id: "live_dj_active",
          status: livePlayback.action === "PLAY" ? "PLAYING" : "PAUSED",
          updatedAt: livePlayback.updatedAt || new Date().toISOString(),
          youtubeVideoId: livePlayback.videoId || null,
          song: {
            title: livePlayback.trackTitle,
            artist: livePlayback.trackArtist || "DJ Mix",
            genre: "General",
            durationSeconds: livePlayback.duration || 210,
            bpm: null,
            key: null,
            youtubeSearchQuery: `${livePlayback.trackTitle} ${livePlayback.trackArtist || ""} karaoke`.trim(),
          },
          table: { id: "booth", number: 0, label: "Cabina DJ" },
          guestName: null,
          notes: null,
          tipAmountCents: 0,
          isFastPass: false,
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          code: event.code,
          status: event.status,
          venueName: event.venue.name,
          tenantName: event.tenant.name,
          logoUrl: branding.logoUrl || event.tenant.logoUrl,
        },
        policy,
        branding,
        currentPlaying: effectiveCurrentPlaying,
        upcomingQueue: upcomingQueue.map((item, idx) => ({
          id: item.id,
          order: idx + 1,
          title: item.songRequest.song?.title || item.songRequest.customTitle,
          artist:
            item.songRequest.song?.artist?.name ||
            item.songRequest.customArtist,
          table: item.songRequest.table.label,
          tipAmountCents: item.songRequest.tipAmountCents || 0,
          isFastPass: (item.songRequest.tipAmountCents || 0) > 0,
        })),
        flashDeal: getActiveFlashDeal(
          calculateNightPulse({
            activeTables: 5,
            requestsLast15m: 3,
            queuedWaiters: upcomingQueue.length,
          }).level
        ),
        qr: {
          scanUrl,
          dataUrl: qrDataUrl,
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/display/state
 * Limpia y resetea la pantalla TV cuando un tema queda trabado o desfasado,
 * completando la pista actual en la base de datos y notificando a la cabina DJ
 * para permitir la entrada inmediata del siguiente pedido.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = (body.code || "").trim().toUpperCase();
    const action = body.action || "RESET"; // "RESET" | "CLEAR" | "NEXT"

    if (!code) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Código de evento requerido" } },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { code },
      select: { id: true, code: true, tenantId: true },
    });

    if (!event) {
      throw new NotFoundError(`No se encontró ningún evento con el código '${code}'`);
    }

    const now = new Date();

    if (action === "RESET" || action === "CLEAR") {
      // Finalizar cualquier tema en CURRENT o PLAYING para este evento
      await prisma.$transaction([
        prisma.queueEntry.updateMany({
          where: {
            eventId: event.id,
            status: "CURRENT",
          },
          data: { status: "COMPLETED" },
        }),
        prisma.songRequest.updateMany({
          where: {
            eventId: event.id,
            status: "PLAYING",
          },
          data: {
            status: "PLAYED",
            playedAt: now,
          },
        }),
      ]);

      const resetPayload = {
        action: "RESET",
        timestamp: now.toISOString(),
      };

      // Limpiar estado en memoria de la pista activa
      realtimeBus.clearPlaybackState(event.id);
      realtimeBus.clearPlaybackState(event.code);

      // Emitir eventos de limpieza por SSE a la pantalla de TV y a la cabina DJ
      realtimeBus.broadcast(event.id, "TRACK_CHANGE", { currentEntryId: null });
      realtimeBus.broadcast(event.code, "TRACK_CHANGE", { currentEntryId: null });
      realtimeBus.broadcast(event.id, "KARAOKE_PLAYBACK_CONTROL", resetPayload);
      realtimeBus.broadcast(event.code, "KARAOKE_PLAYBACK_CONTROL", resetPayload);

      return NextResponse.json({
        success: true,
        message: "Pantalla y pista activa reseteadas correctamente",
      });
    }

    if (action === "NEXT") {
      // Avanzar al siguiente pedido en cola si existe
      const nextQueueEntry = await prisma.queueEntry.findFirst({
        where: {
          eventId: event.id,
          status: "QUEUED",
        },
        orderBy: { orderIndex: "asc" },
        include: { songRequest: { include: { song: true, table: true } } },
      });

      await prisma.$transaction([
        prisma.queueEntry.updateMany({
          where: {
            eventId: event.id,
            status: "CURRENT",
          },
          data: { status: "COMPLETED" },
        }),
        prisma.songRequest.updateMany({
          where: {
            eventId: event.id,
            status: "PLAYING",
          },
          data: {
            status: "PLAYED",
            playedAt: now,
          },
        }),
        ...(nextQueueEntry
          ? [
              prisma.queueEntry.update({
                where: { id: nextQueueEntry.id },
                data: { status: "CURRENT" },
              }),
              prisma.songRequest.update({
                where: { id: nextQueueEntry.songRequestId },
                data: { status: "PLAYING", playedAt: now },
              }),
            ]
          : []),
      ]);

      realtimeBus.broadcast(event.id, "TRACK_CHANGE", {
        currentEntryId: nextQueueEntry?.id || null,
      });
      realtimeBus.broadcast(event.code, "TRACK_CHANGE", {
        currentEntryId: nextQueueEntry?.id || null,
      });

      return NextResponse.json({
        success: true,
        data: {
          nextEntry: nextQueueEntry ? { id: nextQueueEntry.id } : null,
        },
      });
    }

    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: `Acción '${action}' no reconocida` } },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
