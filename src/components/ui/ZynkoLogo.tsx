"use client";

import React from "react";

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

  // Icono SVG exacto de la "O" de Vinilo con Brazo de Tornamesa
  const VinylIcon = ({ pxSize }: { pxSize: number }) => (
    <svg
      width={pxSize}
      height={pxSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block shrink-0 transition-transform duration-300 hover:rotate-12"
      style={{
        filter: "drop-shadow(0 0 7px rgba(224, 36, 195, 0.85)) drop-shadow(0 0 14px rgba(224, 36, 195, 0.4))",
      }}
    >
      <defs>
        <radialGradient id="vinylGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff7bf2" />
          <stop offset="60%" stopColor="#e024c3" />
          <stop offset="100%" stopColor="#a2088b" />
        </radialGradient>
      </defs>

      {/* Disco Exterior */}
      <circle
        cx="48"
        cy="50"
        r="44"
        stroke="#ff6bf0"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Surcos Concéntricos del Vinilo */}
      <circle
        cx="48"
        cy="50"
        r="34"
        stroke="#ff6bf0"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle
        cx="48"
        cy="50"
        r="24"
        stroke="#ff6bf0"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle
        cx="48"
        cy="50"
        r="15"
        stroke="#ff6bf0"
        strokeWidth="2"
        opacity="0.75"
      />

      {/* Agujero Central Spindle */}
      <circle cx="48" cy="50" r="6" fill="#ffffff" />
      <circle cx="48" cy="50" r="3" fill="#070709" />

      {/* Brazo de Tornamesa (Tonearm con Aguja) */}
      {/* Base superior derecha del brazo */}
      <circle cx="86" cy="22" r="3.5" fill="#ff6bf0" />
      {/* Varilla del brazo que entra hacia el surco */}
      <path
        d="M86 22 L86 52 L68 70"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cabezal de la aguja / Cartridge */}
      <rect
        x="63"
        y="68"
        width="9"
        height="5"
        rx="2"
        transform="rotate(-40 63 68)"
        fill="#ff7bf2"
      />
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
        {/* Letras Z Y N K en Blanco Titanio Pulido */}
        <span
          className={`text-white font-sans ${sizeConfig.text} uppercase font-extrabold tracking-[0.14em] drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]`}
          style={{ letterSpacing: "0.14em" }}
        >
          ZYNK
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
