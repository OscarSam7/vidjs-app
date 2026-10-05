import { NextRequest, NextResponse } from "next/server";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { handleApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/karaoke/playback
 * Sincroniza en tiempo real los controles de Play/Pausa/Seek entre la consola DJ/KJ
 * y la pantalla de TV (/display/[code]) a través del bus de eventos SSE.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, action, seconds, deckId } = body;

    if (!eventId || !action) {
      return NextResponse.json(
        { success: false, error: { message: "eventId y action ('PLAY' | 'PAUSE' | 'SEEK') son requeridos" } },
        { status: 400 }
      );
    }

    const payload = {
      action: action as "PLAY" | "PAUSE" | "SEEK",
      seconds: typeof seconds === "number" ? seconds : undefined,
      deckId: deckId || null,
      timestamp: new Date().toISOString(),
    };

    realtimeBus.broadcast(eventId, "KARAOKE_PLAYBACK_CONTROL", payload);

    return NextResponse.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
