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

  // Icono SVG Oficial CYNKO: Mitad Izquierda Digital QR (Ecosistema OS) + Mitad Derecha Vinilo Neón con Tornamesa
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
          "drop-shadow(0 0 6px rgba(34, 211, 238, 0.45)) drop-shadow(0 0 9px rgba(224, 36, 195, 0.55))",
      }}
    >
      <defs>
        <clipPath id={`${uid}_clipL`}>
          <rect x="0" y="0" width="50" height="100" />
        </clipPath>
        <clipPath id={`${uid}_clipR`}>
          <rect x="50" y="0" width="50" height="100" />
        </clipPath>
        <linearGradient id={`${uid}_cya`} x1="10" y1="10" x2="50" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="55%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id={`${uid}_mag`} x1="50" y1="10" x2="92" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff7bf2" />
          <stop offset="60%" stopColor="#e024c3" />
          <stop offset="100%" stopColor="#a2088b" />
        </linearGradient>
        <linearGradient id={`${uid}_div`} x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ff6bf0" />
        </linearGradient>
      </defs>

      {/* Mitad Izquierda: Digital QR / Ecosistema Integral OS */}
      <g clipPath={`url(#${uid}_clipL)`}>
        <circle cx="50" cy="50" r="42" stroke={`url(#${uid}_cya)`} strokeWidth="4.2" fill="none" />
        <rect x="24" y="23" width="11" height="11" rx="2.8" stroke="#22d3ee" strokeWidth="2.6" fill="none" />
        <rect x="27.8" y="26.8" width="3.4" height="3.4" rx="0.8" fill="#ffffff" />
        <rect x="16" y="44.5" width="11" height="11" rx="2.8" fill="#38bdf8" />
        <rect x="31.5" y="44.5" width="9.5" height="11" rx="2.5" fill="#22d3ee" opacity="0.45" />
        <rect x="24" y="66" width="11" height="11" rx="2.8" stroke="#818cf8" strokeWidth="2.6" fill="none" />
        <rect x="27.8" y="69.8" width="3.4" height="3.4" rx="0.8" fill="#818cf8" />
      </g>

      {/* Mitad Derecha: Vinilo Neón */}
      <g clipPath={`url(#${uid}_clipR)`}>
        <circle cx="50" cy="50" r="42" stroke={`url(#${uid}_mag)`} strokeWidth="4.2" fill="none" />
        <circle cx="50" cy="50" r="32" stroke="#ff6bf0" strokeWidth="2.3" opacity="0.9" fill="none" />
        <circle cx="50" cy="50" r="22.5" stroke="#ff6bf0" strokeWidth="2.3" opacity="0.95" fill="none" />
        <circle cx="50" cy="50" r="13.5" stroke="#ff7bf2" strokeWidth="2" opacity="0.8" fill="none" />
      </g>

      {/* Brazo de Tornamesa (Tonearm con Aguja) */}
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
        opacity="0.6"
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

