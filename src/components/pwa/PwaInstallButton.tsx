"use client";

import React from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Download } from "lucide-react";
import { ZynkoLogo } from "@/components/ui/ZynkoLogo";

interface PwaInstallButtonProps {
  label?: string;
  variant?: "dj" | "guest" | "floating" | "banner";
  className?: string;
}

export default function PwaInstallButton({
  label,
  variant = "guest",
  className = "",
}: PwaInstallButtonProps) {
  const { isInstalled, triggerDirectInstall } = usePwaInstall();

  // Si ya está instalado en el celular, desaparece por completo
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Dispara automáticamente la descarga e instalación nativa directa
    await triggerDirectInstall();
  };

  const defaultLabel =
    variant === "dj"
      ? "📲 Descargar en Tablet"
      : variant === "banner"
      ? "Descargar App"
      : "Descargar App";

  if (variant === "banner") {
    return (
      <div
        className={`w-full p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-fuchsia-950/70 via-purple-950/50 to-slate-900 border border-fuchsia-500/50 flex items-center justify-between gap-3 shadow-xl ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-950 border border-fuchsia-500/50 flex items-center justify-center shrink-0 shadow-md">
            <ZynkoLogo variant="icon" size="xs" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-white truncate leading-tight">
              Descargar App ZYNKO
            </p>
            <p className="text-[10px] text-fuchsia-300/80 truncate">
              Instalación automática y directa en tu pantalla
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInstallClick}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-fuchsia-950/80 transition-all shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{label || defaultLabel}</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
        variant === "dj"
          ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white shadow-lg shadow-purple-900/30 border border-purple-400/40"
          : "bg-fuchsia-950/80 hover:bg-fuchsia-900 border border-fuchsia-500/50 text-fuchsia-200 shadow-md shadow-fuchsia-950/40"
      } ${className}`}
      title="Descargar automáticamente la aplicación"
    >
      <Download className="w-3.5 h-3.5 text-fuchsia-400 stroke-[2.5]" />
      <span>{label || defaultLabel}</span>
    </button>
  );
}
