/**
 * NIGHT ANALYTICS & POST-NIGHT REPORT ENGINE
 * 
 * Calcula la curva horaria de energía, detecta la hora pico del local,
 * ranquea las mesas más activas y los géneros más consumidos.
 */

import { prisma } from "@/lib/db/prisma";

export interface HourlyStat {
  hourLabel: string;
  requestCount: number;
  tableCount: number;
  energyScore: number;
}

export interface TopTableStat {
  tableLabel: string;
  requestCount: number;
  vipCount: number;
}

export interface TopSongStat {
  title: string;
  artist: string;
  requestCount: number;
}

export interface NightReport {
  eventId: string;
  eventName: string;
  venueName: string;
  startsAt: string;
  totalRequests: number;
  totalPlayed: number;
  totalGuestSessions: number;
  totalVipFastPasses: number;
  peakHour: {
    label: string;
    requestCount: number;
    energyScore: number;
  };
  hourlyCurve: HourlyStat[];
  topTables: TopTableStat[];
  topSongs: TopSongStat[];
  topGenres: Array<{ genre: string; count: number }>;
}

export async function generateNightReport(params: {
  tenantId: string;
  eventId: string;
}): Promise<NightReport | null> {
  const { tenantId, eventId } = params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    include: {
      venue: { select: { name: true } },
    },
  });

  if (!event) return null;

  // 1. Obtener todas las solicitudes y sesiones del evento
  const [requests, guestSessions] = await Promise.all([
    prisma.songRequest.findMany({
      where: { tenantId, eventId },
      include: {
        table: { select: { id: true, label: true } },
        song: { select: { title: true, genre: true, artist: { select: { name: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.guestSession.findMany({
      where: { tenantId, eventId },
      select: { id: true, tableId: true, createdAt: true },
    }),
  ]);

  const totalRequests = requests.length;
  const totalPlayed = requests.filter((r) => ["PLAYED", "PLAYING"].includes(r.status)).length;
  const totalVipFastPasses = requests.filter((r) => r.tipAmountCents > 0).length;
  const totalGuestSessions = guestSessions.length;

  // 2. Agrupación por Franja Horaria (Horas de la noche: 20:00 a 06:00)
  const hourlyMap = new Map<string, { requests: number; tables: Set<string> }>();

  // Pre-poblar horas habituales de evento nocturno
  const standardHours = ["21:00", "22:00", "23:00", "00:00", "01:00", "02:00", "03:00", "04:00"];
  for (const h of standardHours) {
    hourlyMap.set(h, { requests: 0, tables: new Set() });
  }

  for (const req of requests) {
    const d = new Date(req.createdAt);
    const hour = `${d.getHours().toString().padStart(2, "0")}:00`;
    const entry = hourlyMap.get(hour) || { requests: 0, tables: new Set() };
    entry.requests += 1;
    entry.tables.add(req.tableId);
    hourlyMap.set(hour, entry);
  }

  let peakHour = {
    label: "23:00",
    requestCount: 0,
    energyScore: 0,
  };

  const hourlyCurve: HourlyStat[] = [];
  for (const [hourLabel, data] of hourlyMap.entries()) {
    const tableCount = data.tables.size;
    // Score estimado de energía para esa hora: base por mesas + velocidad de pedidos
    const energyScore = Math.min(100, Math.round(tableCount * 12 + data.requests * 8));
    hourlyCurve.push({
      hourLabel,
      requestCount: data.requests,
      tableCount,
      energyScore,
    });

    if (data.requests > peakHour.requestCount || (data.requests === peakHour.requestCount && energyScore > peakHour.energyScore)) {
      peakHour = {
        label: hourLabel,
        requestCount: data.requests,
        energyScore,
      };
    }
  }

  // 3. Top Mesas
  const tableStatsMap = new Map<string, { label: string; requests: number; vip: number }>();
  for (const req of requests) {
    const item = tableStatsMap.get(req.tableId) || { label: req.table.label, requests: 0, vip: 0 };
    item.requests += 1;
    if (req.tipAmountCents > 0) item.vip += 1;
    tableStatsMap.set(req.tableId, item);
  }
  const topTables: TopTableStat[] = Array.from(tableStatsMap.values())
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 5)
    .map((t) => ({
      tableLabel: t.label,
      requestCount: t.requests,
      vipCount: t.vip,
    }));

  // 4. Top Canciones y Géneros
  const songCountMap = new Map<string, { title: string; artist: string; count: number }>();
  const genreCountMap = new Map<string, number>();

  for (const req of requests) {
    const title = req.song?.title || req.customTitle || "Canción";
    const artist = req.song?.artist?.name || req.customArtist || "Artista";
    const genre = req.song?.genre || "Pop / Fiesta";

    const sKey = `${title}_${artist}`;
    const sItem = songCountMap.get(sKey) || { title, artist, count: 0 };
    sItem.count += 1;
    songCountMap.set(sKey, sItem);

    genreCountMap.set(genre, (genreCountMap.get(genre) || 0) + 1);
  }

  const topSongs: TopSongStat[] = Array.from(songCountMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((s) => ({
      title: s.title,
      artist: s.artist,
      requestCount: s.count,
    }));

  const topGenres = Array.from(genreCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));

  return {
    eventId: event.id,
    eventName: event.name,
    venueName: event.venue.name,
    startsAt: event.startsAt.toISOString(),
    totalRequests,
    totalPlayed,
    totalGuestSessions,
    totalVipFastPasses,
    peakHour,
    hourlyCurve,
    topTables,
    topSongs,
    topGenres,
  };
}
