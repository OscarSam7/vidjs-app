"use client";

import React, { useId } from "react";

interface ZynkoLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon";
  subtitle?: string;
  module?: "MUSIC" | "GASTRO" | "BEEPER" | "STAFF" | "PASS" | "CAST";
  className?: string;
}

export function ZynkoLogo({
  size = "md",
  variant = "full",
  subtitle,
  module,
  className = "",
}: ZynkoLogoProps) {
  // Dimensiones según tamaño
  const sizeConfig = {
    xs: { text: "text-base tracking-wider", oSize: 18, containerH: "h-5" },
    sm: { text: "text-lg tracking-wider", oSize: 22, containerH: "h-6" },
    md: { text: "text-2xl tracking-widest", oSize: 28, containerH: "h-8" },
    lg: { text: "text-4xl tracking-widest", oSize: 42, containerH: "h-12" },
    xl: { text: "text-5xl tracking-[0.2em]", oSize: 56, containerH: "h-16" },
  }[size];

  // Configuración de módulos multicolor
  const moduleConfig = module
    ? {
        MUSIC: { name: "MUSIC", color: "text-fuchsia-400 border-fuchsia-500/40 bg-fuchsia-500/10" },
        GASTRO: { name: "GASTRO", color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
        BEEPER: { name: "BEEPER", color: "text-amber-400 border-amber-500/40 bg-amber-500/10" },
        STAFF: { name: "STAFF GPS", color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10" },
        PASS: { name: "TICKETS", color: "text-violet-400 border-violet-500/40 bg-violet-500/10" },
        CAST: { name: "CAST TV", color: "text-rose-400 border-rose-500/40 bg-rose-500/10" },
      }[module]
    : null;

  const rawId = useId();
  const uid = rawId.replace(/:/g, "");

  // Icono SVG Oficial CYNKO: Mitad Izquierda QR + Nodos (Oro VIP) + Mitad Derecha Vinilo Titanium con acento Magenta
  const VinylIcon = ({ pxSize }: { pxSize: number }) => (
    <svg
      width={pxSize}
      height={pxSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block shrink-0 transition-transform duration-300 hover:rotate-12"
      style={{
        filter:
          "drop-shadow(0 0 6px rgba(251, 191, 36, 0.45)) drop-shadow(0 0 8px rgba(224, 36, 195, 0.45))",
      }}
    >
      <defs>
        <clipPath id={`${uid}_clipL`}>
          <rect x="0" y="0" width="50" height="100" />
        </clipPath>
        <clipPath id={`${uid}_clipR`}>
          <rect x="50" y="0" width="50" height="100" />
        </clipPath>
        {/* Oro VIP (Mitad Izquierda) */}
        <linearGradient id={`${uid}_gold`} x1="10" y1="10" x2="50" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="55%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        {/* Titanium Metálico (Disco Vinilo Derecho) */}
        <linearGradient id={`${uid}_tit`} x1="50" y1="10" x2="92" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        {/* División Central Oro -> Blanco -> Magenta */}
        <linearGradient id={`${uid}_div`} x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ff6bf0" />
        </linearGradient>
      </defs>

      {/* Mitad Izquierda: QR + Nodos en Oro VIP */}
      <g clipPath={`url(#${uid}_clipL)`}>
        <circle cx="50" cy="50" r="42" stroke={`url(#${uid}_gold)`} strokeWidth="4.2" fill="none" />
        <path
          d="M35 28.5 L42 35 L50 50 M27 50 L50 50 M35 71.5 L42 65 L50 50"
          stroke="#fbbf24"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.78"
          fill="none"
        />
        <rect x="22" y="22" width="12" height="12" rx="3" stroke="#fde047" strokeWidth="2.6" fill="#07070c" />
        <rect x="26" y="26" width="4" height="4" rx="1" fill="#ffffff" />
        <rect x="15" y="44" width="12" height="12" rx="3" fill="#fbbf24" />
        <rect x="22" y="66" width="12" height="12" rx="3" stroke="#f59e0b" strokeWidth="2.6" fill="#07070c" />
        <rect x="26" y="70" width="4" height="4" rx="1" fill="#f59e0b" />
      </g>

      {/* Mitad Derecha: Disco Vinilo Titanium */}
      <g clipPath={`url(#${uid}_clipR)`}>
        <circle cx="50" cy="50" r="42" stroke={`url(#${uid}_tit)`} strokeWidth="4.2" fill="none" />
        <circle cx="50" cy="50" r="32" stroke="#e2e8f0" strokeWidth="2.3" opacity="0.9" fill="none" />
        <circle cx="50" cy="50" r="22.5" stroke="#cbd5e1" strokeWidth="2.3" opacity="0.92" fill="none" />
        <circle cx="50" cy="50" r="13.5" stroke="#94a3b8" strokeWidth="2" opacity="0.85" fill="none" />
      </g>

      {/* Brazo de Tornamesa con acento Magenta Neón */}
      <circle cx="87" cy="21" r="3.8" fill="#ff6bf0" />
      <path
        d="M87 21 L87 51 L70 68"
        stroke="#ffffff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect
        x="64"
        y="66"
        width="9.5"
        height="5.2"
        rx="2"
        transform="rotate(-42 64 66)"
        fill="#ff7bf2"
      />

      {/* División Central Neón + Eje Spindle */}
      <line
        x1="50"
        y1="8"
        x2="50"
        y2="92"
        stroke={`url(#${uid}_div)`}
        strokeWidth="1.6"
        strokeDasharray="2.5 3"
        opacity="0.65"
      />
      <circle cx="50" cy="50" r="6.8" fill="#ffffff" />
      <circle cx="50" cy="50" r="3.2" fill="#07070c" />
    </svg>
  );

  if (variant === "icon") {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <VinylIcon pxSize={sizeConfig.oSize * 1.25} />
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div className={`flex items-center gap-1.5 leading-none select-none font-black ${sizeConfig.containerH}`}>
        {/* Letras C Y N K en Blanco Titanio Pulido */}
        <span
          className={`text-white font-sans ${sizeConfig.text} uppercase font-extrabold tracking-[0.14em] drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]`}
          style={{ letterSpacing: "0.14em" }}
        >
          CYNK
        </span>

        {/* La "O" de Vinilo Neón con Brazo de Tornamesa */}
        <div className="relative flex items-center justify-center -ml-0.5">
          <VinylIcon pxSize={sizeConfig.oSize} />
        </div>

        {/* Badge de Módulo Opcional */}
        {moduleConfig && (
          <span
            className={`ml-2 text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${moduleConfig.color}`}
          >
            {moduleConfig.name}
          </span>
        )}
      </div>

      {/* Subtítulo o Tagline si se requiere */}
      {subtitle && (
        <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400 mt-1 block">
          {subtitle}
        </span>
      )}
    </div>
  );
}

export const CynkoLogo = ZynkoLogo;

