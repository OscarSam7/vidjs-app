import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateQrDataUrl } from "@/lib/qr/generator";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { getMergedBranding } from "@/lib/branding/config";
import { calculateNightPulse } from "@/lib/pulse/night-pulse";
import { getActiveFlashDeal } from "@/lib/pulse/flash-deals";
import { parseQueuePolicy } from "@/lib/dj/rotation";

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
        currentPlaying: currentPlaying
          ? {
              id: currentPlaying.id,
              status: currentPlaying.status,
              updatedAt: currentPlaying.updatedAt,
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
          : null,
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
