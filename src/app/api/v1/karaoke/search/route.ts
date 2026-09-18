import { NextRequest, NextResponse } from "next/server";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { handleApiError } from "@/lib/errors";
import { searchYouTube, YouTubeVideoResult } from "@/lib/youtube/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({
        success: true,
        data: {
          results: [],
          defaultQuery: "",
        },
      });
    }

    const results = await searchYouTube(query, { isKaraoke: true, limit: 6 });

    return NextResponse.json({
      success: true,
      data: {
        query,
        results,
        recommended: results[0] || null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST: Permite al DJ cambiar o sincronizar en tiempo real el video de Karaoke
 * proyectado en la pantalla de TV (/display/[code]).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, videoId, videoTitle, isVideoEnabled } = body;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: { message: "eventId es requerido" } },
        { status: 400 }
      );
    }

    // Broadcast en tiempo real (0ms) a todas las pantallas de TV suscritas
    realtimeBus.broadcast(eventId, "KARAOKE_VIDEO_UPDATE", {
      videoId: videoId || null,
      videoTitle: videoTitle || null,
      isVideoEnabled: isVideoEnabled !== false,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        eventId,
        videoId,
        isVideoEnabled: isVideoEnabled !== false,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
