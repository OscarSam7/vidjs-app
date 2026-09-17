import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim().toUpperCase();

    if (!code) {
      return new NextResponse("#EXTM3U\n#ERROR: Se requiere el parametro ?code=CODIGO_EVENTO\n", {
        status: 400,
        headers: { "Content-Type": "audio/x-mpegurl; charset=utf-8" },
      });
    }

    // Buscar evento
    const event = await prisma.event.findUnique({
      where: { code },
      include: {
        venue: { select: { name: true } },
        tenant: { select: { name: true } },
      },
    });

    if (!event) {
      return new NextResponse("#EXTM3U\n#ERROR: Evento no encontrado\n", {
        status: 404,
        headers: { "Content-Type": "audio/x-mpegurl; charset=utf-8" },
      });
    }

    // Consultar canciones aprobadas en cola ordenadas
    const queueEntries = await prisma.queueEntry.findMany({
      where: {
        eventId: event.id,
        status: { in: ["CURRENT", "QUEUED"] },
      },
      include: {
        songRequest: {
          include: {
            song: { include: { artist: true } },
            table: { select: { label: true } },
            guestSession: { select: { guestName: true } },
          },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    const origin = new URL(req.url).origin;

    // Construir contenido estándar M3U8
    let m3uContent = `#EXTM3U\n`;
    m3uContent += `#PLAYLIST:Vidjs Live Queue - ${event.name} (${event.venue.name})\n`;
    m3uContent += `#EVENT_CODE:${event.code}\n\n`;

    for (const entry of queueEntries) {
      const title = entry.songRequest.song?.title || entry.songRequest.customTitle || "Cancion";
      const artist = entry.songRequest.song?.artist?.name || entry.songRequest.customArtist || "Artista";
      const duration = entry.songRequest.song?.durationSeconds || 210;
      const table = entry.songRequest.table.label;
      const guest = entry.songRequest.guestSession?.guestName || "";
      const notes = entry.songRequest.notes || "";

      // Metadatos estándar M3U para software de DJ
      m3uContent += `#EXTINF:${duration},${artist} - ${title} [${table}${guest ? ` - ${guest}` : ""}]\n`;
      if (notes) {
        m3uContent += `#EXTREM:Dedicatoria: ${notes}\n`;
      }
      // Enlace simulado de audio o metadatos
      m3uContent += `${origin}/api/v1/dj/bridge/stream?requestId=${entry.songRequestId}&entry=${entry.id}\n\n`;
    }

    return new NextResponse(m3uContent, {
      status: 200,
      headers: {
        "Content-Type": "audio/x-mpegurl; charset=utf-8",
        "Content-Disposition": `inline; filename="vidjs-queue-${event.code.toLowerCase()}.m3u8"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generando M3U:", error);
    return new NextResponse("#EXTM3U\n#ERROR: Error interno al generar playlist\n", {
      status: 500,
      headers: { "Content-Type": "audio/x-mpegurl; charset=utf-8" },
    });
  }
}
