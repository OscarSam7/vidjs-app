/**
 * NIGHT PULSE ENGINE
 * 
 * Calcula en tiempo real el pulso y nivel de energía del local (0 - 100)
 * basándose en:
 * 1. Ocupación activa de mesas con QR escaneado (35%)
 * 2. Velocidad de solicitudes en los últimos 15 minutos (40%)
 * 3. Presión y demanda en cola de reproducción (25%)
 */

export type PulseLevel = "LOW" | "WARM" | "ACTIVE" | "HOT" | "PEAK";

export interface NightPulseResult {
  score: number;
  level: PulseLevel;
  label: string;
  description: string;
  color: string; // Tailwind text/bg color class reference
  glowClass: string;
  metrics: {
    activeTables: number;
    totalTables: number;
    requestsLast15m: number;
    queuedWaiters: number;
  };
}

export function calculateNightPulse(params: {
  activeTables: number;
  totalTables?: number;
  requestsLast15m: number;
  queuedWaiters: number;
}): NightPulseResult {
  const { activeTables, totalTables = 20, requestsLast15m, queuedWaiters } = params;

  // 1. Ratio de ocupación de mesas (0 a 35 pts)
  const safeTotal = Math.max(1, totalTables);
  const occupancyRatio = Math.min(1, Math.max(0, activeTables / safeTotal));
  const occupancyScore = occupancyRatio * 35;

  // 2. Velocidad de pedidos en 15 min (0 a 40 pts)
  // 10 pedidos en 15 minutos representa una pista encendida
  const velocityRatio = Math.min(1, Math.max(0, requestsLast15m / 10));
  const velocityScore = velocityRatio * 40;

  // 3. Presión de cola (0 a 25 pts)
  // 8 pedidos en cola representa cola llena y alta expectativa
  const queueRatio = Math.min(1, Math.max(0, queuedWaiters / 8));
  const queueScore = queueRatio * 25;

  const rawScore = Math.round(occupancyScore + velocityScore + queueScore);
  const score = Math.max(0, Math.min(100, rawScore));

  let level: PulseLevel = "LOW";
  let label = "Tranquilo";
  let description = "Ambiente relajado. Mesas recién acomodándose.";
  let color = "text-zinc-400 bg-zinc-800/80 border-zinc-700";
  let glowClass = "shadow-zinc-800/20";

  if (score >= 89) {
    level = "PEAK";
    label = "Pico de la Noche";
    description = "¡Energía al máximo! Máxima interacción en mesas y pista.";
    color = "text-fuchsia-300 bg-fuchsia-950/80 border-fuchsia-500";
    glowClass = "shadow-[0_0_20px_rgba(217,70,239,0.35)]";
  } else if (score >= 71) {
    level = "HOT";
    label = "Encendido";
    description = "Pista activa y constante flujo de pedidos de mesas.";
    color = "text-amber-300 bg-amber-950/80 border-amber-500";
    glowClass = "shadow-[0_0_15px_rgba(245,158,11,0.3)]";
  } else if (score >= 46) {
    level = "ACTIVE";
    label = "Buen Ritmo";
    description = "Ritmo constante. Mesas participando activamente.";
    color = "text-purple-300 bg-purple-950/80 border-purple-500";
    glowClass = "shadow-[0_0_15px_rgba(168,85,247,0.25)]";
  } else if (score >= 21) {
    level = "WARM";
    label = "Calentando";
    description = "Las primeras mesas se activan y empiezan las peticiones.";
    color = "text-cyan-300 bg-cyan-950/80 border-cyan-600";
    glowClass = "shadow-[0_0_12px_rgba(6,182,212,0.2)]";
  }

  return {
    score,
    level,
    label,
    description,
    color,
    glowClass,
    metrics: {
      activeTables,
      totalTables: safeTotal,
      requestsLast15m,
      queuedWaiters,
    },
  };
}
