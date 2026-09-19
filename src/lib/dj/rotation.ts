export interface RotatableQueueItem {
  id: string;
  tableId: string;
  orderIndex: number;
  createdAt: Date | string;
}

export type NightMode = "KARAOKE_ONLY" | "DJ_ONLY" | "HYBRID";

export interface DjSettings {
  enabled: boolean;
  queueMode: "FIFO" | "TIPS_PRIORITY";
  maxActivePerTable: number;
  queuePaused: boolean;
  tippingEnabled: boolean;
  autoTransitionBeats: number;
}

export interface KaraokeSettings {
  enabled: boolean;
  fairPlayMode: "ROUND_ROBIN" | "FIFO";
  maxActivePerTable: number;
  queuePaused: boolean;
  avgSongDurationMinutes: number;
  tvLyricsVideoEnabled: boolean;
  applauseMeterEnabled: boolean;
}

export interface QueuePolicy {
  // Configuración de arquitectura dual
  nightMode: NightMode;
  dj: DjSettings;
  karaoke: KaraokeSettings;

  // Parámetros de proyección visual y fotos
  photosAllowed: boolean;
  photoRotationSeconds: number;
  photoFitMode: "BLUR_FILL" | "CONTAIN" | "COVER";

  // Campos heredados / de compatibilidad plana
  zone: "DJ" | "KARAOKE" | "MAIN";
  maxActivePerTable: number; // 1, 2, 99
  queuePaused: boolean;
  rotationMode: "ROUND_ROBIN" | "FIFO";
  avgSongDurationMinutes: number;
}

const DEFAULT_DJ_SETTINGS: DjSettings = {
  enabled: true,
  queueMode: "FIFO",
  maxActivePerTable: 2,
  queuePaused: false,
  tippingEnabled: true,
  autoTransitionBeats: 8,
};

const DEFAULT_KARAOKE_SETTINGS: KaraokeSettings = {
  enabled: true,
  fairPlayMode: "ROUND_ROBIN",
  maxActivePerTable: 1,
  queuePaused: false,
  avgSongDurationMinutes: 4,
  tvLyricsVideoEnabled: true,
  applauseMeterEnabled: true,
};

export function parseQueuePolicy(settingsJson?: string | null): QueuePolicy {
  const fallbackPolicy: QueuePolicy = {
    nightMode: "HYBRID",
    dj: { ...DEFAULT_DJ_SETTINGS },
    karaoke: { ...DEFAULT_KARAOKE_SETTINGS },
    photosAllowed: true,
    photoRotationSeconds: 8,
    photoFitMode: "BLUR_FILL",
    zone: "KARAOKE",
    maxActivePerTable: 1,
    queuePaused: false,
    rotationMode: "ROUND_ROBIN",
    avgSongDurationMinutes: 4,
  };

  if (!settingsJson) {
    return fallbackPolicy;
  }

  try {
    const parsed = typeof settingsJson === "string" ? JSON.parse(settingsJson) : settingsJson;

    // Determinar Modo de Noche
    let nightMode: NightMode = "HYBRID";
    if (parsed.nightMode === "KARAOKE_ONLY" || parsed.nightMode === "DJ_ONLY" || parsed.nightMode === "HYBRID") {
      // Si la zona fue explícitamente configurada en modo opuesto a un bloqueo exclusivo, flexibilizar a HYBRID
      if (parsed.nightMode === "DJ_ONLY" && parsed.zone === "KARAOKE") {
        nightMode = "HYBRID";
      } else if (parsed.nightMode === "KARAOKE_ONLY" && parsed.zone === "DJ") {
        nightMode = "HYBRID";
      } else {
        nightMode = parsed.nightMode;
      }
    } else if (parsed.zone === "DJ") {
      nightMode = "DJ_ONLY";
    } else if (parsed.zone === "KARAOKE") {
      nightMode = "KARAOKE_ONLY";
    }

    // Configuración DJ
    const djRaw = parsed.dj || {};
    const dj: DjSettings = {
      enabled: typeof djRaw.enabled === "boolean" ? djRaw.enabled : nightMode !== "KARAOKE_ONLY",
      queueMode: djRaw.queueMode === "TIPS_PRIORITY" ? "TIPS_PRIORITY" : "FIFO",
      maxActivePerTable: typeof djRaw.maxActivePerTable === "number" ? Math.max(1, Math.min(99, djRaw.maxActivePerTable)) : 2,
      queuePaused: typeof djRaw.queuePaused === "boolean" ? djRaw.queuePaused : false,
      tippingEnabled: typeof djRaw.tippingEnabled === "boolean" ? djRaw.tippingEnabled : true,
      autoTransitionBeats: typeof djRaw.autoTransitionBeats === "number" ? djRaw.autoTransitionBeats : 8,
    };

    // Configuración Karaoke
    const karaokeRaw = parsed.karaoke || {};
    const karaoke: KaraokeSettings = {
      enabled: typeof karaokeRaw.enabled === "boolean" ? karaokeRaw.enabled : nightMode !== "DJ_ONLY",
      fairPlayMode: karaokeRaw.fairPlayMode === "FIFO" ? "FIFO" : "ROUND_ROBIN",
      maxActivePerTable: typeof karaokeRaw.maxActivePerTable === "number" ? Math.max(1, Math.min(99, karaokeRaw.maxActivePerTable)) : 1,
      queuePaused: typeof karaokeRaw.queuePaused === "boolean" ? karaokeRaw.queuePaused : false,
      avgSongDurationMinutes: typeof karaokeRaw.avgSongDurationMinutes === "number" ? Math.max(1, Math.min(15, karaokeRaw.avgSongDurationMinutes)) : 4,
      tvLyricsVideoEnabled: typeof karaokeRaw.tvLyricsVideoEnabled === "boolean" ? karaokeRaw.tvLyricsVideoEnabled : true,
      applauseMeterEnabled: typeof karaokeRaw.applauseMeterEnabled === "boolean" ? karaokeRaw.applauseMeterEnabled : true,
    };

    // Visuales y Fotos
    const validModes = ["BLUR_FILL", "CONTAIN", "COVER"];
    const photoFitMode = typeof parsed.photoFitMode === "string" && validModes.includes(parsed.photoFitMode)
      ? (parsed.photoFitMode as "BLUR_FILL" | "CONTAIN" | "COVER")
      : "BLUR_FILL";
    const photosAllowed = parsed.photosAllowed !== undefined ? Boolean(parsed.photosAllowed) : true;
    const photoRotationSeconds = typeof parsed.photoRotationSeconds === "number" ? Math.max(3, Math.min(60, parsed.photoRotationSeconds)) : 8;

    // Compatibilidad Plana (Flat Compatibility)
    let effectiveZone: "DJ" | "KARAOKE" | "MAIN" = "MAIN";
    if (parsed.zone === "DJ" || parsed.zone === "KARAOKE") {
      effectiveZone = parsed.zone;
    } else if (nightMode === "DJ_ONLY") {
      effectiveZone = "DJ";
    } else if (nightMode === "KARAOKE_ONLY") {
      effectiveZone = "KARAOKE";
    } else {
      effectiveZone = "KARAOKE";
    }

    const effectiveMaxActive = effectiveZone === "DJ" ? dj.maxActivePerTable : karaoke.maxActivePerTable;
    const effectivePaused = effectiveZone === "DJ" ? dj.queuePaused : karaoke.queuePaused;
    const effectiveRotation = effectiveZone === "DJ" ? (dj.queueMode === "TIPS_PRIORITY" ? "FIFO" : "FIFO") : karaoke.fairPlayMode;

    return {
      nightMode,
      dj,
      karaoke,
      photosAllowed,
      photoRotationSeconds,
      photoFitMode,
      zone: effectiveZone,
      maxActivePerTable: typeof parsed.maxActivePerTable === "number" ? parsed.maxActivePerTable : effectiveMaxActive,
      queuePaused: typeof parsed.queuePaused === "boolean" ? parsed.queuePaused : effectivePaused,
      rotationMode: parsed.rotationMode || effectiveRotation,
      avgSongDurationMinutes: karaoke.avgSongDurationMinutes,
    };
  } catch {
    return fallbackPolicy;
  }
}

export function calculateEstimatedWait(
  position: number | null | undefined,
  avgSongDurationMinutes = 4
): { minutes: number; text: string } | null {
  if (position === null || position === undefined) return null;
  if (position <= 0) return { minutes: 0, text: "¡Al aire ahora!" };
  const minutes = position * avgSongDurationMinutes;
  return {
    minutes,
    text:
      position === 1
        ? `Próximo turno (~${minutes} min)`
        : `En ~${minutes} min (turno #${position})`,
  };
}

/**
 * Algoritmo de Rotación Justa de Mesas (Fair-Share Round-Robin).
 *
 * Agrupa las canciones pendientes de la cola por mesa (tableId) y las intercala
 * en rondas sucesivas respetando el orden de llegada dentro de cada mesa.
 * Esto evita que una mesa que envió múltiples temas monopolice la pista de baile.
 *
 * @param items Lista de elementos en cola
 * @returns Lista reordenada con nuevos índices consecutivos (1, 2, 3...)
 */
export function calculateFairQueue<T extends RotatableQueueItem>(items: T[]): T[] {
  if (items.length <= 1) return items;

  // 1. Agrupar por mesa, preservando el orden cronológico original dentro de cada grupo
  const tableBuckets = new Map<string, T[]>();

  for (const item of items) {
    const bucket = tableBuckets.get(item.tableId) || [];
    bucket.push(item);
    tableBuckets.set(item.tableId, bucket);
  }

  // 2. Ordenar los buckets por la fecha de la primera canción que pidió cada mesa
  // (la mesa que llegó primero tiene prioridad en la primera ronda)
  const sortedTables = Array.from(tableBuckets.keys()).sort((a, b) => {
    const firstA = new Date(tableBuckets.get(a)![0].createdAt).getTime();
    const firstB = new Date(tableBuckets.get(b)![0].createdAt).getTime();
    return firstA - firstB;
  });

  // 3. Intercalar ronda por ronda (Round-Robin)
  const fairResult: T[] = [];
  let hasMore = true;
  let round = 0;

  while (hasMore) {
    hasMore = false;
    for (const tableId of sortedTables) {
      const bucket = tableBuckets.get(tableId)!;
      if (round < bucket.length) {
        fairResult.push(bucket[round]);
        if (round + 1 < bucket.length) {
          hasMore = true;
        }
      }
    }
    round++;
  }

  // 4. Asignar los nuevos orderIndex normalizados a partir de 1
  return fairResult.map((item, index) => ({
    ...item,
    orderIndex: index + 1,
  }));
}
