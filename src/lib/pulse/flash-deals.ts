/**
 * FLASH DEALS & PULSE PROMOTIONS ENGINE
 * 
 * Genera promociones dinámicas y ofertas relámpago de barra
 * sincronizadas en tiempo real con el nivel de energía del local (Night Pulse).
 */

import { PulseLevel } from "./night-pulse";

export interface FlashDeal {
  id: string;
  title: string;
  subtitle: string;
  discount: string;
  badgeText: string;
  color: string;
  bannerBg: string;
  expiresInMinutes: number;
  callToAction: string;
  targetPulse: PulseLevel;
}

export function getActiveFlashDeal(level: PulseLevel): FlashDeal | null {
  switch (level) {
    case "LOW":
      return {
        id: "deal-calentamiento",
        title: "⚡ Promo Calentamiento de Pista",
        subtitle: "Aprovecha la barra antes de que se llene la pista de baile",
        discount: "2x1 en Cerveza & Gin Tonic",
        badgeText: "HORA VALLE &bull; 15 MIN",
        color: "text-cyan-300 border-cyan-500/60",
        bannerBg: "from-cyan-950/80 via-zinc-950 to-purple-950/80",
        expiresInMinutes: 15,
        callToAction: "Pedir en Barra",
        targetPulse: "LOW",
      };

    case "WARM":
      return {
        id: "deal-happy-hour",
        title: "🍸 Happy Hour Relámpago",
        subtitle: "Pide tu trago favorito y prepárate para cantar",
        discount: "2x1 en Cócteles Clásicos",
        badgeText: "PROMO ACTIVA",
        color: "text-amber-300 border-amber-500/60",
        bannerBg: "from-amber-950/80 via-zinc-950 to-purple-950/80",
        expiresInMinutes: 15,
        callToAction: "Ver Carta en Barra",
        targetPulse: "WARM",
      };

    case "ACTIVE":
    case "HOT":
      return {
        id: "deal-trago-noche",
        title: "🍹 Trago Especial de la Noche",
        subtitle: "La pista está en su mejor momento",
        discount: "25% OFF en Tragos de Autor",
        badgeText: "EN TENDENCIA",
        color: "text-purple-300 border-purple-500/60",
        bannerBg: "from-purple-950/80 via-zinc-950 to-fuchsia-950/80",
        expiresInMinutes: 20,
        callToAction: "Pedir Cóctel de Autor",
        targetPulse: level,
      };

    case "PEAK":
      return {
        id: "deal-brindis-colectivo",
        title: "🎉 ¡Pico de la Noche & Brindis!",
        subtitle: "Energía al 100%. ¡Celebremos juntos con toda la sala!",
        discount: "Ronda de Chupitos de la Casa",
        badgeText: "MOMENTO CUMBRE",
        color: "text-fuchsia-300 border-fuchsia-500/60",
        bannerBg: "from-fuchsia-950/90 via-purple-950 to-pink-950/90",
        expiresInMinutes: 10,
        callToAction: "¡A brindar!",
        targetPulse: "PEAK",
      };

    default:
      return null;
  }
}
