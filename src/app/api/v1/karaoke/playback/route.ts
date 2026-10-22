import { NextRequest, NextResponse } from "next/server";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { handleApiError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/karaoke/playback
 * Sincroniza en tiempo real los controles de Play/Pausa/Seek entre la consola DJ/KJ
 * y la pantalla de TV (/display/[code]) a través del bus de eventos SSE.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, code, action, seconds, deckId, duration, trackTitle, trackArtist, videoId } = body;
    const targetKey = eventId || code;

    if (!targetKey || !action) {
      return NextResponse.json(
        { success: false, error: { message: "eventId o code y action ('PLAY' | 'PAUSE' | 'SEEK' | 'RESET') son requeridos" } },
        { status: 400 }
      );
    }

    const payload = {
      action: action as "PLAY" | "PAUSE" | "SEEK" | "RESET",
      seconds: typeof seconds === "number" ? seconds : undefined,
      duration: typeof duration === "number" ? duration : undefined,
      trackTitle: typeof trackTitle === "string" ? trackTitle : undefined,
      trackArtist: typeof trackArtist === "string" ? trackArtist : undefined,
      videoId: typeof videoId === "string" ? videoId : undefined,
      deckId: deckId || null,
      timestamp: new Date().toISOString(),
    };

    // 1. Difusión inmediata a las claves directas conocidas (0ms de latencia)
    const broadcastKeys = new Set<string>();
    if (eventId) broadcastKeys.add(eventId);
    if (code) {
      broadcastKeys.add(code);
      broadcastKeys.add(code.toUpperCase());
    }
    if (targetKey) {
      broadcastKeys.add(targetKey);
      broadcastKeys.add(targetKey.toUpperCase());
    }

    broadcastKeys.forEach((key) => {
      try {
        realtimeBus.broadcast(key, "KARAOKE_PLAYBACK_CONTROL", payload);
      } catch {}
    });

    // 2. Resolver evento en DB para asegurar que tanto el UUID como el código alfanumérico queden cubiertos
    try {
      const event = await prisma.event.findFirst({
        where: {
          OR: [{ id: targetKey }, { code: (code || targetKey).toUpperCase() }],
        },
        select: { id: true, code: true },
      });

      if (event) {
        if (!broadcastKeys.has(event.id)) {
          realtimeBus.broadcast(event.id, "KARAOKE_PLAYBACK_CONTROL", payload);
        }
        if (!broadcastKeys.has(event.code)) {
          realtimeBus.broadcast(event.code, "KARAOKE_PLAYBACK_CONTROL", payload);
        }
      }
    } catch (dbErr) {
      console.warn("Error resolviendo evento en DB para sincronización playback:", dbErr);
    }

    return NextResponse.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
