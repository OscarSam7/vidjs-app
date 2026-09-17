import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const genre = searchParams.get("genre")?.trim() || "";
    const mood = searchParams.get("mood")?.trim().toLowerCase() || "";
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

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

    const [songs, allGenres] = await Promise.all([
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
    ]);

    const genres = allGenres
      .map((g) => g.genre)
      .filter((g): g is string => Boolean(g));

    return NextResponse.json({
      success: true,
      data: {
        songs,
        genres: ["ALL", ...genres],
        total: songs.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
