"use client";

import React, { useState } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Download, Check, X, Smartphone, Share, MoreVertical } from "lucide-react";
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
  const { isInstalled, hasNativePrompt, isIOS, promptInstall } = usePwaInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // REGLA CLAVE: Si ya está instalado en el celular, NO MOSTRAR NUNCA
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (hasNativePrompt) {
      const accepted = await promptInstall();
      if (!accepted) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const defaultLabel =
    variant === "dj"
      ? "📲 Instalar en Tablet/iPad"
      : variant === "banner"
      ? "Instalar App en Celular"
      : "Descargar App";

  return (
    <>
      {variant === "banner" ? (
        <div
          className={`w-full p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-fuchsia-950/60 via-purple-950/40 to-slate-900 border border-fuchsia-500/40 flex items-center justify-between gap-3 shadow-xl ${className}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-950 border border-fuchsia-500/50 flex items-center justify-center shrink-0 shadow-md">
              <ZynkoLogo variant="icon" size="xs" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate leading-tight">
                Instala ZYNKO en tu Celular
              </p>
              <p className="text-[10px] text-fuchsia-300/80 truncate">
                Acceso más rápido y notificaciones directas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-fuchsia-950/60 transition-all shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            variant === "dj"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white shadow-lg shadow-purple-900/30 border border-purple-400/40"
              : "bg-fuchsia-950/80 hover:bg-fuchsia-900 border border-fuchsia-500/50 text-fuchsia-200 shadow-md shadow-fuchsia-950/40"
          } ${className}`}
          title="Descargar e instalar App ZYNKO en tu pantalla de inicio"
        >
          <Download className="w-3.5 h-3.5 text-fuchsia-400" />
          <span>{label || defaultLabel}</span>
        </button>
      )}

      {/* Modal Guía de Instalación cuando el navegador suprime el diálogo automático */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-[#0C101A] border-2 border-fuchsia-500/50 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ZynkoLogo variant="icon" size="xs" />
                <span className="text-sm font-black text-white">Instalar App ZYNKO</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed text-left">
              Para agregar la app a la pantalla de inicio de tu celular sin usar Play Store ni App Store:
            </p>

            {isIOS ? (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-left space-y-2.5 text-xs text-slate-200">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-fuchsia-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>
                    Toca el botón <strong>Compartir</strong> en la barra inferior de Safari{" "}
                    <Share className="w-4 h-4 inline-block text-fuchsia-400 ml-1" />.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-fuchsia-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>
                    Desliza hacia abajo y selecciona <strong>"Agregar a pantalla principal"</strong> (o "Add to Home Screen").
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-left space-y-2.5 text-xs text-slate-200">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-fuchsia-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>
                    Toca el menú de opciones de tu navegador (los <strong>tres puntos ⋮</strong> en la esquina superior{" "}
                    <MoreVertical className="w-4 h-4 inline-block text-fuchsia-400" />).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-fuchsia-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>
                    Toca en <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
