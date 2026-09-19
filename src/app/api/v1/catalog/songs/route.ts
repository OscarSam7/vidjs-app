import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";
import { searchYouTube } from "@/lib/youtube/search";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { parseQueuePolicy } from "@/lib/dj/rotation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const genre = searchParams.get("genre")?.trim() || "";
    const mood = searchParams.get("mood")?.trim().toLowerCase() || "";
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

    // Determinar modo de búsqueda (DJ vs KARAOKE)
    let mode = (searchParams.get("mode") || searchParams.get("zone"))?.toUpperCase();

    if (!mode || (mode !== "DJ" && mode !== "KARAOKE")) {
      // Intentar inferir de la sesión activa del comensal
      const guestSession = await getCurrentGuestSession().catch(() => null);
      if (guestSession) {
        const policy = parseQueuePolicy(guestSession.event.settings);
        const tableZone = (guestSession.table as any)?.zone?.toUpperCase();

        if (tableZone === "DJ" || policy.nightMode === "DJ_ONLY") {
          mode = "DJ";
        } else if (tableZone === "KARAOKE" || policy.nightMode === "KARAOKE_ONLY") {
          mode = "KARAOKE";
        } else {
          mode = "KARAOKE"; // Predeterminado en caso de híbrido general
        }
      } else {
        mode = "KARAOKE";
      }
    }

    const isKaraoke = mode !== "DJ";

    const whereClause: any = {};

    if (q) {
      whereClause.OR = [
        { title: { contains: q } },
        { artist: { name: { contains: q } } },
      ];
    }

    if (genre && genre !== "ALL") {
      whereClause.genre = genre;
    }

    // Filtros por Mood / Estado de ánimo
    if (mood) {
      switch (mood) {
        case "fiesta":
          whereClause.OR = [
            { genre: { contains: "Pop" } },
            { genre: { contains: "Dance" } },
            { genre: { contains: "Reggaeton" } },
            { genre: { contains: "Electronic" } },
            { bpm: { gte: 110 } },
          ];
          break;
        case "romantica":
          whereClause.OR = [
            { genre: { contains: "Balada" } },
            { genre: { contains: "Romantic" } },
            { genre: { contains: "Bolero" } },
            { genre: { contains: "Soul" } },
            { bpm: { lte: 100 } },
          ];
          break;
        case "rock":
          whereClause.OR = [
            { genre: { contains: "Rock" } },
            { genre: { contains: "Indie" } },
            { genre: { contains: "Metal" } },
          ];
          break;
        case "cumbia":
          whereClause.OR = [
            { genre: { contains: "Cumbia" } },
            { genre: { contains: "Tropical" } },
            { genre: { contains: "Cuarteto" } },
            { genre: { contains: "Latino" } },
          ];
          break;
        case "duo":
          whereClause.OR = [
            { title: { contains: "&" } },
            { title: { contains: "feat" } },
            { title: { contains: "Duet" } },
            { genre: { contains: "Pop" } },
          ];
          break;
      }
    }

    const [songs, allGenres, youtubeResults] = await Promise.all([
      prisma.song.findMany({
        where: whereClause,
        include: {
          artist: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ title: "asc" }],
        take: limit,
      }),
      prisma.song.findMany({
        select: { genre: true },
        distinct: ["genre"],
        where: { genre: { not: null } },
      }),
      // Estirar resultados complementarios de YouTube según modo:
      // Modo DJ -> Pistas originales de audio (${q} audio)
      // Modo Karaoke -> Pistas con letra/instrumental (${q} karaoke instrumental)
      q.length >= 2
        ? searchYouTube(q, { isKaraoke, limit: 6 }).catch(() => [])
        : Promise.resolve([]),
    ]);

    const genres = allGenres
      .map((g) => g.genre)
      .filter((g): g is string => Boolean(g));

    return NextResponse.json({
      success: true,
      data: {
        songs,
        youtubeResults,
        genres: ["ALL", ...genres],
        total: songs.length,
        catalogMode: mode,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
