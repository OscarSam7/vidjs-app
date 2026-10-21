import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError, UnauthorizedError, BadRequestError } from "@/lib/errors";
import { sanitizeText } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

// Playlists Curadas Predeterminadas del Sistema
const DEFAULT_PLAYLISTS = [
  {
    id: "pl-boliche-2026",
    name: "Boliche & Warm-Up DJ",
    description: "Tracks energéticos, dance, electrónica y ritmos para prender la pista.",
    coverColor: "from-purple-600 to-indigo-700",
    icon: "disc",
    type: "DJ",
    tags: ["Dance", "House", "Electro", "Pista"],
    songFilter: { genres: ["Electrónica / House", "Electrónica / Dance", "Pop / Disco"], minBpm: 115 },
  },
  {
    id: "pl-karaoke-inmortales",
    name: "Karaoke Hits Inmortales",
    description: "Los himnos más cantados de todos los tiempos en español e inglés.",
    coverColor: "from-pink-600 to-rose-700",
    icon: "mic",
    type: "KARAOKE",
    tags: ["Karaoke", "Clásicos", "Coro", "Popular"],
    songFilter: { genres: ["Classic Rock / Karaoke", "Pop Latino / Balada", "Pop Latino"] },
  },
  {
    id: "pl-cumbia-cuarteto",
    name: "Cumbia, Cuarteto & Pachanga",
    description: "Puro ritmo bailable para cantar y bailar con amigos en las mesas.",
    coverColor: "from-amber-500 to-orange-600",
    icon: "party",
    type: "BOTH",
    tags: ["Cumbia", "Fiesta", "Latino", "Popular"],
    songFilter: { genres: ["Cumbia", "Tropical", "Latino"] },
  },
  {
    id: "pl-rock-nacional",
    name: "Rock Nacional & Clásicos",
    description: "Guitarras legendarias, Soda Stereo, Enanitos Verdes, Queen y más.",
    coverColor: "from-cyan-600 to-blue-700",
    icon: "guitar",
    type: "BOTH",
    tags: ["Rock", "Español", "80s", "90s"],
    songFilter: { genres: ["Rock en Español", "Classic Rock / Karaoke"] },
  },
  {
    id: "pl-reggaeton-urban",
    name: "Reggaeton 2000s & Urbano",
    description: "Perreo clásico y los temas que nunca pasan de moda.",
    coverColor: "from-fuchsia-600 to-pink-700",
    icon: "flame",
    type: "DJ",
    tags: ["Reggaeton", "Urbano", "Perreo"],
    songFilter: { genres: ["Reggaeton / Urbano"] },
  },
  {
    id: "pl-chill-sunset",
    name: "Chill, Lounge & Cóctel",
    description: "Ambiente relajado para la previa, cena y charlas en barra.",
    coverColor: "from-emerald-600 to-teal-700",
    icon: "coffee",
    type: "DJ",
    tags: ["Lounge", "Chill", "Acústico"],
    songFilter: { genres: ["Pop Latino / Balada", "Electrónica / House"], maxBpm: 110 },
  },
];

const newSongSchema = z.object({
  title: z.string().min(1, "El título es requerido").max(120),
  artistName: z.string().min(1, "El artista es requerido").max(100),
  genre: z.string().max(60).optional().nullable(),
  bpm: z.number().int().min(40).max(250).optional().nullable(),
  key: z.string().max(10).optional().nullable(),
  durationSeconds: z.number().int().min(10).max(1200).optional().nullable(),
  fileUrl: z.string().max(500).optional().nullable(),
  type: z.enum(["DJ", "KARAOKE", "BOTH"]).optional().default("BOTH"),
});

const savePlaylistSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "El nombre de la playlist es requerido").max(80),
  description: z.string().max(250).optional().nullable(),
  coverColor: z.string().max(60).optional(),
  icon: z.string().max(30).optional(),
  type: z.enum(["DJ", "KARAOKE", "BOTH"]).default("BOTH"),
  songIds: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      throw new UnauthorizedError("Debes iniciar sesión para consultar la biblioteca.");
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const genreFilter = searchParams.get("genre")?.trim() || "ALL";
    const typeFilter = searchParams.get("type")?.trim().toUpperCase() || "ALL"; // DJ, KARAOKE, ALL
    const artistIdFilter = searchParams.get("artistId")?.trim() || "ALL";
    const playlistIdFilter = searchParams.get("playlistId")?.trim() || "";

    // 1. Consultar Artistas con conteo de canciones
    const artists = await prisma.artist.findMany({
      include: {
        _count: {
          select: { songs: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // 2. Consultar Canciones
    const songs = await prisma.song.findMany({
      include: {
        artist: {
          select: { id: true, name: true, imageUrl: true },
        },
      },
      orderBy: [{ title: "asc" }],
    });

    // 3. Extraer y estructurar géneros únicos
    const genreMap = new Map<string, number>();
    songs.forEach((song) => {
      const g = song.genre?.trim();
      if (g) {
        genreMap.set(g, (genreMap.get(g) || 0) + 1);
      }
    });

    const genresList = Array.from(genreMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 4. Cargar Playlists del Tenant guardadas en settings + Playlists del sistema
    let customPlaylists: any[] = [];
    if (session.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { settings: true },
      });
      if (tenant?.settings) {
        try {
          const parsed = JSON.parse(tenant.settings);
          if (Array.isArray(parsed.customPlaylists)) {
            customPlaylists = parsed.customPlaylists;
          }
        } catch {}
      }
    }

    // Resolver canciones para las playlists predeterminadas
    const enrichedDefaultPlaylists = DEFAULT_PLAYLISTS.map((pl) => {
      const matchingSongs = songs.filter((s) => {
        if (pl.songFilter.genres && !pl.songFilter.genres.includes(s.genre || "")) {
          return false;
        }
        if (pl.songFilter.minBpm && (s.bpm || 0) < pl.songFilter.minBpm) {
          return false;
        }
        if (pl.songFilter.maxBpm && (s.bpm || 0) > pl.songFilter.maxBpm) {
          return false;
        }
        return true;
      });

      return {
        ...pl,
        songCount: matchingSongs.length,
        songIds: matchingSongs.map((s) => s.id),
      };
    });

    const allPlaylists = [...enrichedDefaultPlaylists, ...customPlaylists];

    // 5. Filtrar canciones si se solicitaron filtros específicos
    let filteredSongs = songs;

    // Filtro por búsqueda de texto
    if (q) {
      const lower = q.toLowerCase();
      filteredSongs = filteredSongs.filter(
        (s) =>
          s.title.toLowerCase().includes(lower) ||
          s.artist?.name.toLowerCase().includes(lower) ||
          s.genre?.toLowerCase().includes(lower) ||
          (s.key && s.key.toLowerCase().includes(lower))
      );
    }

    // Filtro por género
    if (genreFilter && genreFilter !== "ALL") {
      filteredSongs = filteredSongs.filter((s) => s.genre === genreFilter);
    }

    // Filtro por artista
    if (artistIdFilter && artistIdFilter !== "ALL") {
      filteredSongs = filteredSongs.filter((s) => s.artistId === artistIdFilter);
    }

    // Filtro por Playlist seleccionada
    if (playlistIdFilter) {
      const targetPl = allPlaylists.find((p) => p.id === playlistIdFilter);
      if (targetPl && Array.isArray(targetPl.songIds)) {
        filteredSongs = filteredSongs.filter((s) => targetPl.songIds.includes(s.id));
      }
    }

    // Enriquecer cada canción con indicador de si es pista DJ o Karaoke
    const enrichedSongs = filteredSongs.map((song) => {
      const genreLower = (song.genre || "").toLowerCase();
      const isKaraokeEligible =
        genreLower.includes("karaoke") ||
        genreLower.includes("balada") ||
        genreLower.includes("pop") ||
        genreLower.includes("rock") ||
        genreLower.includes("cumbia");
      const isDjEligible =
        Boolean(song.bpm) ||
        genreLower.includes("house") ||
        genreLower.includes("dance") ||
        genreLower.includes("disco") ||
        genreLower.includes("electro") ||
        genreLower.includes("reggaeton") ||
        genreLower.includes("cumbia");

      return {
        ...song,
        isKaraoke: isKaraokeEligible,
        isDjTrack: isDjEligible,
      };
    });

    // Aplicar filtro DJ vs Karaoke
    let finalSongs = enrichedSongs;
    if (typeFilter === "DJ") {
      finalSongs = finalSongs.filter((s) => s.isDjTrack);
    } else if (typeFilter === "KARAOKE") {
      finalSongs = finalSongs.filter((s) => s.isKaraoke);
    }

    return NextResponse.json({
      success: true,
      data: {
        songs: finalSongs,
        totalSongs: songs.length,
        filteredCount: finalSongs.length,
        artists,
        totalArtists: artists.length,
        genres: genresList,
        totalGenres: genresList.length,
        playlists: allPlaylists,
        totalPlaylists: allPlaylists.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      throw new UnauthorizedError("Debes iniciar sesión con rol de DJ, Staff o Administrador.");
    }

    const body = await req.json();
    const action = body.action || "CREATE_SONG";

    if (action === "CREATE_PLAYLIST") {
      // Guardar playlist personalizada en el tenant
      if (!session.tenantId) {
        throw new BadRequestError("Se requiere un establecimiento para crear playlists personalizadas.");
      }

      const plData = savePlaylistSchema.parse(body.playlist);
      const tenant = await prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { settings: true },
      });

      let currentSettings: any = {};
      try {
        if (tenant?.settings) currentSettings = JSON.parse(tenant.settings);
      } catch {}

      const existingPlaylists: any[] = Array.isArray(currentSettings.customPlaylists)
        ? currentSettings.customPlaylists
        : [];

      const newPlaylist = {
        id: plData.id || `pl-custom-${Date.now()}`,
        name: sanitizeText(plData.name),
        description: plData.description ? sanitizeText(plData.description) : null,
        coverColor: plData.coverColor || "from-purple-600 to-indigo-700",
        icon: plData.icon || "disc",
        type: plData.type,
        tags: ["Personalizada", plData.type],
        songIds: plData.songIds,
        songCount: plData.songIds.length,
        createdAt: new Date().toISOString(),
      };

      // Si ya existe (edición), actualizar; si no, agregar
      const updatedList = existingPlaylists.filter((p) => p.id !== newPlaylist.id);
      updatedList.unshift(newPlaylist);

      currentSettings.customPlaylists = updatedList;

      await prisma.tenant.update({
        where: { id: session.tenantId },
        data: { settings: JSON.stringify(currentSettings) },
      });

      return NextResponse.json({
        success: true,
        message: "¡Playlist guardada exitosamente!",
        data: newPlaylist,
      });
    }

    // Acción por defecto: CREAR CANCIÓN / PISTA
    const data = newSongSchema.parse(body);
    const cleanTitle = sanitizeText(data.title);
    const cleanArtistName = sanitizeText(data.artistName);
    const cleanGenre = data.genre ? sanitizeText(data.genre) : "Varios";

    // 1. Buscar o crear el artista
    let artist = await prisma.artist.findFirst({
      where: {
        name: { equals: cleanArtistName, mode: "insensitive" },
      },
    });

    if (!artist) {
      artist = await prisma.artist.create({
        data: {
          name: cleanArtistName,
          tenantId: session.tenantId,
        },
      });
    }

    // 2. Crear la canción en la base de datos
    const newSong = await prisma.song.create({
      data: {
        title: cleanTitle,
        artistId: artist.id,
        tenantId: session.tenantId,
        genre: cleanGenre,
        bpm: data.bpm || null,
        key: data.key?.trim() || null,
        durationSeconds: data.durationSeconds || 210,
        fileUrl: data.fileUrl?.trim() || null,
      },
      include: {
        artist: { select: { id: true, name: true, imageUrl: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: `¡Pista "${cleanTitle}" agregada a la biblioteca con éxito!`,
      data: newSong,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
