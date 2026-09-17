/**
 * QUEUE INTELLIGENCE & EXPLAINABILITY ENGINE
 * 
 * Genera sugerencias y explicaciones en lenguaje natural para la cabina del DJ,
 * garantizando rotación justa, atención a mesas postergadas, y detección de
 * momentos de celebración (cumpleaños, aniversarios).
 */

export interface QueueSuggestion {
  id: string;
  type: "FAIR_SHARE" | "WAIT_TIME" | "CELEBRATION" | "ENERGY_FLOW";
  title: string;
  explanation: string;
  targetId?: string;
  recommendedAction: string;
  badge: {
    label: string;
    color: string;
  };
}

export function generateQueueIntelligence(params: {
  pendingRequests: Array<{
    id: string;
    table: { id: string; label: string };
    notes: string | null;
    createdAt: string;
    song?: { title: string; genre?: string | null; bpm?: number | null } | null;
    customTitle?: string | null;
  }>;
  queue: Array<{
    id: string;
    orderIndex: number;
    songRequest: {
      id: string;
      table: { id: string; label: string };
      notes: string | null;
      song?: { title: string; genre?: string | null; bpm?: number | null } | null;
      customTitle?: string | null;
    };
  }>;
  currentPlaying?: {
    songRequest: {
      table: { id: string; label: string };
      song?: { title: string; genre?: string | null; bpm?: number | null } | null;
    };
  } | null;
  recentHistory?: Array<{
    songRequest: {
      table?: { label?: string } | null;
    };
  }>;
}): QueueSuggestion[] {
  const { pendingRequests, queue, currentPlaying, recentHistory = [] } = params;
  const suggestions: QueueSuggestion[] = [];

  const now = Date.now();

  // 1. Detectar Dedicatorias de Cumpleaños o Aniversario
  for (const req of pendingRequests) {
    const noteLower = (req.notes || "").toLowerCase();
    if (noteLower.includes("cumple") || noteLower.includes("aniversario") || noteLower.includes("🎂") || noteLower.includes("💍")) {
      suggestions.push({
        id: `celeb-${req.id}`,
        type: "CELEBRATION",
        title: "Celebración en Sala",
        explanation: `${req.table.label} tiene dedicatoria especial: "${req.notes}"`,
        targetId: req.id,
        recommendedAction: "Aceptar a la cola con prioridad",
        badge: {
          label: "🎂 Festejo",
          color: "bg-fuchsia-950 text-fuchsia-300 border-fuchsia-700",
        },
      });
    }
  }

  // 2. Detectar Mesas con Espera Prolongada (> 15 min)
  for (const req of pendingRequests) {
    const waitMinutes = Math.round((now - new Date(req.createdAt).getTime()) / 60000);
    if (waitMinutes >= 15) {
      suggestions.push({
        id: `wait-${req.id}`,
        type: "WAIT_TIME",
        title: "Espera Prolongada",
        explanation: `${req.table.label} lleva esperando ${waitMinutes} minutos su turno musical`,
        targetId: req.id,
        recommendedAction: "Aceptar para no enfriar la mesa",
        badge: {
          label: "⏱ Demora",
          color: "bg-amber-950 text-amber-300 border-amber-700",
        },
      });
    }
  }

  // 3. Detectar Repetición de Misma Mesa en Turnos Consecutivos en la Cola
  if (queue.length >= 2) {
    for (let i = 0; i < queue.length - 1; i++) {
      const current = queue[i];
      const next = queue[i + 1];

      if (current.songRequest.table.id === next.songRequest.table.id) {
        suggestions.push({
          id: `repeat-${next.id}`,
          type: "FAIR_SHARE",
          title: "Consecutividad de Mesa",
          explanation: `${current.songRequest.table.label} tiene 2 canciones seguidas en los turnos #${i + 1} y #${i + 2}`,
          targetId: next.id,
          recommendedAction: "Intercalar otra mesa en medio para rotación justa",
          badge: {
            label: "⚖️ Balance",
            color: "bg-cyan-950 text-cyan-300 border-cyan-700",
          },
        });
      }
    }
  }

  // 4. Si la mesa que suena ahora es igual a la primera de la cola
  if (currentPlaying && queue.length > 0) {
    const firstInQueue = queue[0];
    if (currentPlaying.songRequest.table.id === firstInQueue.songRequest.table.id) {
      suggestions.push({
        id: `playing-repeat-${firstInQueue.id}`,
        type: "FAIR_SHARE",
        title: "Repetición Inmediata",
        explanation: `${firstInQueue.songRequest.table.label} está cantando ahora y es el próximo en lista`,
        targetId: firstInQueue.id,
        recommendedAction: "Posponer al turno siguiente para dar paso a otra mesa",
        badge: {
          label: "🔄 Rotar",
          color: "bg-purple-950 text-purple-300 border-purple-700",
        },
      });
    }
  }

  // 5. Sugerencia de Flujo de Energía (si hay cola disponible)
  if (queue.length > 0 && suggestions.length === 0) {
    suggestions.push({
      id: "flow-optimal",
      type: "ENERGY_FLOW",
      title: "Cola Equilibrada",
      explanation: "La rotación de mesas y géneros mantiene un flujo óptimo sin saturación",
      recommendedAction: "Mantener orden de reproducción actual",
      badge: {
        label: "✨ Óptimo",
        color: "bg-emerald-950 text-emerald-300 border-emerald-700",
      },
    });
  }

  return suggestions.slice(0, 3); // Top 3 sugerencias más relevantes
}
