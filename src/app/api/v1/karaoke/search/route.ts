import { NextRequest, NextResponse } from "next/server";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { handleApiError } from "@/lib/errors";

export interface KaraokeSearchResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  embedUrl: string;
}

/**
 * Extrae videos de YouTube mediante scraping ligero de ytInitialData
 * cuando no se dispone de una API Key oficial (Costo $0).
 */
async function scrapeYouTubeSearch(query: string): Promise<KaraokeSearchResult[]> {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " karaoke instrumental")}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const results: KaraokeSearchResult[] = [];

    // Buscar bloques de videoRenderer con regex seguro
    const videoIdMatches = html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
    const seenIds = new Set<string>();

    for (const match of videoIdMatches) {
      const vid = match[1];
      if (!seenIds.has(vid)) {
        seenIds.add(vid);
        results.push({
          id: vid,
          title: `${query} (Karaoke Version)`,
          channelTitle: "YouTube Karaoke",
          thumbnail: `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`,
          embedUrl: `https://www.youtube.com/embed/${vid}?autoplay=1&enablejsapi=1`,
        });
      }
      if (results.length >= 6) break;
    }

    return results;
  } catch (err) {
    console.warn("Error scraping YouTube results:", err);
    return [];
  }
}

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

    const apiKey = process.env.YOUTUBE_API_KEY;
    let results: KaraokeSearchResult[] = [];

    // 1. Intentar con API Key oficial si existe
    if (apiKey) {
      try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=6&q=${encodeURIComponent(
          query + " karaoke"
        )}&key=${apiKey}`;
        const ytRes = await fetch(apiUrl);
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          results = (ytData.items || []).map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            thumbnail:
              item.snippet.thumbnails?.medium?.url ||
              item.snippet.thumbnails?.default?.url ||
              `https://i.ytimg.com/vi/${item.id.videoId}/mqdefault.jpg`,
            embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&enablejsapi=1`,
          }));
        }
      } catch (e) {
        console.warn("YouTube API call failed, falling back to scraper:", e);
      }
    }

    // 2. Fallback a búsqueda abierta gratuita ($0) si no hay API key o no devolvió resultados
    if (results.length === 0) {
      results = await scrapeYouTubeSearch(query);
    }

    // 3. Fallback garantizado mediante listType=search nativo de YouTube Embed
    if (results.length === 0) {
      results = [
        {
          id: "search_fallback",
          title: `${query} (Karaoke Automático)`,
          channelTitle: "YouTube Karaoke Match",
          thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80",
          embedUrl: `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(
            query + " karaoke"
          )}&autoplay=1`,
        },
      ];
    }

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
