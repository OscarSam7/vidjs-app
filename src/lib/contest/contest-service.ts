import { prisma } from "@/lib/db/prisma";
import { eventBus } from "@/lib/realtime/event-bus";

export const DEFAULT_CONTEST_CRITERIA = [
  {
    name: "Afinación y Entonación",
    description: "Precisión en las notas, control tonal y afinación a lo largo de la canción.",
    maxScore: 10,
    weight: 1.0,
    orderIndex: 0,
  },
  {
    name: "Ritmo, Métrica y Tempo",
    description: "Sincronización con la música, compás y entrada a tiempo en cada verso.",
    maxScore: 10,
    weight: 1.0,
    orderIndex: 1,
  },
  {
    name: "Interpretación y Sentimiento",
    description: "Expresión emocional, modulación, entrega y conexión con el tema.",
    maxScore: 10,
    weight: 1.0,
    orderIndex: 2,
  },
  {
    name: "Presencia Escénica y Carisma",
    description: "Dominio del escenario, contacto visual, actitud y respuesta del público.",
    maxScore: 10,
    weight: 1.0,
    orderIndex: 3,
  },
  {
    name: "Dificultad Vocal y Técnica",
    description: "Complejidad de la canción, rango vocal, potencia y control de la respiración.",
    maxScore: 10,
    weight: 1.0,
    orderIndex: 4,
  },
];

/**
 * Genera un código único alfanumérico legible para un concurso
 */
export function generateContestCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "CONCURSO-";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Genera un PIN numérico de 4 dígitos para acceso de jueces
 */
export function generateJudgePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Calcula la puntuación de una actuación según el modo configurado
 */
export function calculatePerformanceScore(params: {
  judgeScores: Array<{ totalScore: number; isGoldenBuzzer?: boolean }>;
  publicVotes: Array<{ stars: number }>;
  scoringMode: string;
  publicVoteWeight: number; // 0 a 50 (%)
}): {
  judgeScore: number;
  publicScore: number;
  totalScore: number;
  hasGoldenBuzzer: boolean;
} {
  const { judgeScores, publicVotes, scoringMode, publicVoteWeight } = params;

  const hasGoldenBuzzer = judgeScores.some((s) => s.isGoldenBuzzer);

  // 1. Cálculo de puntuación de jueces
  let judgeScore = 0;
  if (judgeScores.length > 0) {
    const rawScores = judgeScores.map((s) => s.totalScore);

    if (scoringMode === "SUM") {
      judgeScore = rawScores.reduce((acc, curr) => acc + curr, 0);
    } else if (scoringMode === "OLYMPIC" && rawScores.length >= 3) {
      // Descartar la nota más alta y la más baja
      const sorted = [...rawScores].sort((a, b) => a - b);
      const trimmed = sorted.slice(1, -1);
      judgeScore = trimmed.reduce((acc, curr) => acc + curr, 0) / trimmed.length;
    } else {
      // AVERAGE (por defecto)
      judgeScore = rawScores.reduce((acc, curr) => acc + curr, 0) / rawScores.length;
    }
  }

  // Redondear a 2 decimales
  judgeScore = Number(judgeScore.toFixed(2));

  // 2. Cálculo de puntuación del público (escala de 1 a 10 basada en 1 a 5 estrellas)
  let publicScore = 0;
  if (publicVotes.length > 0) {
    const avgStars =
      publicVotes.reduce((acc, curr) => acc + curr.stars, 0) / publicVotes.length;
    publicScore = Number((avgStars * 2).toFixed(2)); // escala 1-10
  }

  // 3. Puntuación Total Ponderada
  let totalScore = judgeScore;
  const pubWeightFraction = Math.max(0, Math.min(50, publicVoteWeight)) / 100;

  if (pubWeightFraction > 0 && publicVotes.length > 0) {
    const judgeWeightFraction = 1 - pubWeightFraction;
    totalScore = Number(
      (judgeScore * judgeWeightFraction + publicScore * pubWeightFraction).toFixed(2)
    );
  }

  return {
    judgeScore,
    publicScore,
    totalScore,
    hasGoldenBuzzer,
  };
}

/**
 * Emite una actualización en tiempo real sobre el certamen
 */
export function broadcastContestEvent(
  contestId: string,
  eventId: string | null,
  type: any,
  data: any
) {
  // Emitir al canal del concurso
  eventBus.broadcast(`contest:${contestId}`, type, data);
  eventBus.broadcast(contestId, type, data);
  // Si está vinculado a una noche/evento de Vidjs, emitir también al evento para la pantalla TV
  if (eventId) {
    eventBus.broadcast(eventId, type, { ...data, contestId });
  }
}
