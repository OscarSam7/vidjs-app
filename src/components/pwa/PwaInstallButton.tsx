"use client";

import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Download, Check } from "lucide-react";

interface PwaInstallButtonProps {
  label?: string;
  variant?: "dj" | "guest";
  className?: string;
}

export default function PwaInstallButton({
  label,
  variant = "guest",
  className = "",
}: PwaInstallButtonProps) {
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();

  if (isInstalled) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-medium ${className}`}
        title="App instalada en este dispositivo"
      >
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[11px]">App Instalada</span>
      </div>
    );
  }

  if (!isInstallable) {
    return null;
  }

  const defaultLabel =
    variant === "dj" ? "📲 Instalar en Tablet/iPad" : "📲 Instalar Vidjs";

  return (
    <button
      type="button"
      onClick={promptInstall}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
        variant === "dj"
          ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/30 border border-purple-400/40"
          : "bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 shadow-md"
      } ${className}`}
    >
      <Download className="w-3.5 h-3.5" />
      <span>{label || defaultLabel}</span>
    </button>
  );
}
