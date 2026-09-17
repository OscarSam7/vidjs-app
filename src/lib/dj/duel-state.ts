/**
 * LIVE DUEL / MUSICAL BATTLE ENGINE
 * 
 * Gestiona duelos musicales interactivos en tiempo real (Track A vs Track B).
 * Los comensales votan desde sus mesas y los porcentajes se proyectan en la TV.
 */

export interface DuelOption {
  id: "A" | "B";
  title: string;
  artist: string;
  tableLabel?: string;
  votes: number;
}

export interface LiveDuel {
  id: string;
  eventId: string;
  optionA: DuelOption;
  optionB: DuelOption;
  status: "ACTIVE" | "FINISHED";
  startedAt: string;
  endsAt: string;
  totalVotes: number;
  winner?: "A" | "B" | "TIE";
}

// Almacén en memoria de duelos activos por evento
const activeDuels = new Map<string, LiveDuel>();
// Registro de votos emitidos: `${duelId}_${guestSessionToken}`
const votedSessions = new Set<string>();

export function createDuel(params: {
  eventId: string;
  trackA: { title: string; artist: string; tableLabel?: string };
  trackB: { title: string; artist: string; tableLabel?: string };
  durationSeconds?: number;
}): LiveDuel {
  const { eventId, trackA, trackB, durationSeconds = 45 } = params;

  const duelId = `duel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const endsAt = new Date(now.getTime() + durationSeconds * 1000);

  const duel: LiveDuel = {
    id: duelId,
    eventId,
    optionA: {
      id: "A",
      title: trackA.title,
      artist: trackA.artist,
      tableLabel: trackA.tableLabel,
      votes: 0,
    },
    optionB: {
      id: "B",
      title: trackB.title,
      artist: trackB.artist,
      tableLabel: trackB.tableLabel,
      votes: 0,
    },
    status: "ACTIVE",
    startedAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
    totalVotes: 0,
  };

  activeDuels.set(eventId, duel);
  return duel;
}

export function getActiveDuel(eventId: string): LiveDuel | null {
  const duel = activeDuels.get(eventId);
  if (!duel) return null;

  // Si ya venció el tiempo, marcar como finalizado y definir ganador
  if (duel.status === "ACTIVE" && new Date() > new Date(duel.endsAt)) {
    duel.status = "FINISHED";
    if (duel.optionA.votes > duel.optionB.votes) {
      duel.winner = "A";
    } else if (duel.optionB.votes > duel.optionA.votes) {
      duel.winner = "B";
    } else {
      duel.winner = "TIE";
    }
  }

  return duel;
}

export function voteInDuel(params: {
  eventId: string;
  duelId: string;
  sessionToken: string;
  option: "A" | "B";
}): { success: boolean; message: string; duel: LiveDuel } {
  const { eventId, duelId, sessionToken, option } = params;

  const duel = getActiveDuel(eventId);
  if (!duel || duel.id !== duelId) {
    throw new Error("No hay un duelo activo con ese identificador.");
  }

  if (duel.status !== "ACTIVE" || new Date() > new Date(duel.endsAt)) {
    duel.status = "FINISHED";
    throw new Error("El tiempo de votación para este duelo ha finalizado.");
  }

  const voteKey = `${duelId}_${sessionToken}`;
  if (votedSessions.has(voteKey)) {
    throw new Error("Tu mesa ya emitió su voto para este duelo.");
  }

  if (option === "A") {
    duel.optionA.votes += 1;
  } else if (option === "B") {
    duel.optionB.votes += 1;
  } else {
    throw new Error("Opción de voto inválida.");
  }

  duel.totalVotes += 1;
  votedSessions.add(voteKey);

  return {
    success: true,
    message: "¡Voto registrado exitosamente!",
    duel,
  };
}

export function cancelDuel(eventId: string): boolean {
  return activeDuels.delete(eventId);
}
