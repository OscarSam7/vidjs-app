import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { parseQueuePolicy } from "@/lib/dj/rotation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim().toUpperCase();
    const tableId = searchParams.get("tableId")?.trim() || null;
    const modeFilter = searchParams.get("mode")?.trim().toUpperCase(); // "DJ" | "KARAOKE" | "ALL"

    // 1. Resolver el evento activo
    let event = null;
    if (code) {
      event = await prisma.event.findFirst({
        where: {
          OR: [
            { code: code },
            { code: code.replace(/-DJ$|-KJ$|-KARAOKE$/, "") },
          ],
        },
      });
    }

    if (!event) {
      // Buscar evento activo más reciente
      event = await prisma.event.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
      });
    }

    if (!event) {
      // Tomar el último evento creado como fallback
      event = await prisma.event.findFirst({
        orderBy: { createdAt: "desc" },
      });
    }

    if (!event) {
      return NextResponse.json({
        currentPlaying: null,
        queue: [],
        counts: { total: 0, dj: 0, karaoke: 0 },
        policy: { nightMode: "NORMAL", queuePaused: false },
      });
    }

    const policy = parseQueuePolicy(event.settings);

    // 2. Canción actual sonando (status: CURRENT)
    const currentEntry = await prisma.queueEntry.findFirst({
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

    let currentPlaying = null;
    if (currentEntry) {
      const sr = currentEntry.songRequest;
      const title = sr.song?.title || sr.customTitle || "Pista en Reproducción";
      const artist = sr.song?.artist?.name || sr.customArtist || "Artista en Vivo";
      const isMyTable = Boolean(tableId && sr.table?.id === tableId);

      currentPlaying = {
        id: currentEntry.id,
        songTitle: title,
        artistName: artist,
        mode: sr.mode || "DJ",
        tableLabel: sr.table?.label || `Mesa ${sr.table?.number || ""}`.trim() || "Mesa",
        guestName: sr.guestSession?.guestName || null,
        coverUrl: sr.song?.coverUrl || null,
        youtubeId: sr.song?.youtubeId || null,
        duration: sr.song?.duration || 210,
        isMyTable,
        startedAt: currentEntry.startedAt || currentEntry.createdAt,
      };
    }

    // 3. Obtener cola de espera (QUEUED) ordenada por orderIndex
    const rawQueue = await prisma.queueEntry.findMany({
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
            guestSession: {
              select: { id: true, guestName: true },
            },
          },
        },
      },
      orderBy: { orderIndex: "asc" },
      take: 50,
    });

    let djCount = 0;
    let karaokeCount = 0;

    const formattedQueue = rawQueue.map((entry, index) => {
      const sr = entry.songRequest;
      const title = sr.song?.title || sr.customTitle || "Tema Solicitado";
      const artist = sr.song?.artist?.name || sr.customArtist || "Artista";
      const mode = (sr.mode as "DJ" | "KARAOKE") || "DJ";
      const isMyTable = Boolean(tableId && sr.table?.id === tableId);

      if (mode === "KARAOKE") {
        karaokeCount++;
      } else {
        djCount++;
      }

      // Estimación de tiempo de espera: ~3.5 min por canción previa
      const estimatedMinutes = Math.max(2, (index + 1) * 3.5);

      return {
        id: entry.id,
        turnNumber: index + 1,
        songTitle: title,
        artistName: artist,
        mode,
        tableLabel: sr.table?.label || `Mesa ${sr.table?.number || ""}`.trim() || "Mesa",
        guestName: sr.guestSession?.guestName || null,
        coverUrl: sr.song?.coverUrl || null,
        youtubeId: sr.song?.youtubeId || null,
        isMyTable,
        estimatedMinutes: Math.round(estimatedMinutes),
        createdAt: entry.createdAt.toISOString(),
      };
    });

    // Filtro opcional por modo
    const filteredQueue =
      modeFilter === "DJ"
        ? formattedQueue.filter((item) => item.mode === "DJ")
        : modeFilter === "KARAOKE"
        ? formattedQueue.filter((item) => item.mode === "KARAOKE")
        : formattedQueue;

    return NextResponse.json({
      currentPlaying,
      queue: filteredQueue,
      counts: {
        total: formattedQueue.length,
        dj: djCount,
        karaoke: karaokeCount,
      },
      policy: {
        nightMode: policy.nightMode,
        queuePaused: policy.isPaused,
        djQueuePaused: (policy as any).djQueuePaused ?? false,
        karaokeQueuePaused: (policy as any).karaokeQueuePaused ?? false,
      },
    });
  } catch (error: any) {
    console.error("[Guest Queue API] Error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Error al consultar la cola de canciones" } },
      { status: 500 }
    );
  }
}
