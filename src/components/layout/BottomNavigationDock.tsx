"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Disc3,
  ListMusic,
  Tv,
  Flame,
  Smartphone,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export function BottomNavigationDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isBlue = resolvedTheme === "blue";

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeToast, setActiveToast] = useState<string | null>(null);
  const [currentEventCode, setCurrentEventCode] = useState<string | null>(null);

  // Cargar estado de colapso y código de evento activo
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem("vidjs_dock_collapsed");
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === "true");
      }
      const savedCode = localStorage.getItem("vidjs_current_event_code");
      if (savedCode) {
        setCurrentEventCode(savedCode);
      }
    } catch {}

    // Escuchar si se actualiza el código de evento en la sesión
    const handleStorageChange = () => {
      try {
        const code = localStorage.getItem("vidjs_current_event_code");
        if (code) setCurrentEventCode(code);
      } catch {}
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Manejar desplazamiento automático si se llega con hash (#deck-a, #deck-b, etc.)
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const targetId = window.location.hash.replace("#", "");
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: targetId.includes("cola") ? "start" : "center" });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("vidjs_dock_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const showToast = (message: string) => {
    setActiveToast(message);
    setTimeout(() => {
      setActiveToast((curr) => (curr === message ? null : curr));
    }, 2800);
  };

  const triggerHighlight = (el: HTMLElement, ringClass: string, shadowClass: string) => {
    el.classList.add("ring-4", ringClass, shadowClass);
    setTimeout(() => {
      el.classList.remove("ring-4", ringClass, shadowClass);
    }, 1800);
  };

  const getSavedEventCode = (): string | null => {
    if (currentEventCode) return currentEventCode;
    try {
      return localStorage.getItem("vidjs_current_event_code");
    } catch {
      return null;
    }
  };

  // 1. Abrir Pantalla TV (Proyección en Smart TV / Proyector)
  const handleOpenTv = () => {
    const code = getSavedEventCode();
    const url = code ? `/display/${code}` : "/display";
    window.open(url, "vidjs_tv_display");
    showToast(code ? `📺 Pantalla TV abierta (Evento ${code})` : "📺 Abriendo lanzador de Pantalla TV...");
  };

  // 2. Desplazar / Abrir Biblioteca
  const handleOpenLibrary = () => {
    if (pathname === "/dashboard/dj") {
      window.dispatchEvent(new CustomEvent("open-dj-library"));
      setTimeout(() => {
        const el = document.getElementById("dj-library-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          triggerHighlight(el, "ring-amber-500", "shadow-[0_0_35px_rgba(245,158,11,0.6)]");
        }
      }, 150);
    } else {
      router.push("/dashboard/library");
    }
  };

  // 3. Desplazar a Solicitudes / Cola
  const handleScrollToQueue = () => {
    const el = document.getElementById("solicitudes-cola-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      triggerHighlight(el, "ring-amber-500", "shadow-[0_0_30px_rgba(245,158,11,0.5)]");
    } else if (pathname === "/dashboard/karaoke") {
      const karaokeQueue = document.getElementById("solicitudes-cola-section");
      if (karaokeQueue) {
        karaokeQueue.scrollIntoView({ behavior: "smooth", block: "start" });
        triggerHighlight(karaokeQueue, "ring-cyan-500", "shadow-[0_0_30px_rgba(6,182,212,0.5)]");
      }
    } else {
      router.push("/dashboard/dj#solicitudes-cola-section");
    }
  };

  // 4. Desplazar a Bandeja A
  const handleScrollToDeckA = () => {
    const el = document.getElementById("deck-a");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      triggerHighlight(el, "ring-purple-500", "shadow-[0_0_35px_rgba(168,85,247,0.7)]");
    } else {
      router.push("/dashboard/dj#deck-a");
    }
  };

  // 5. Desplazar a Bandeja B
  const handleScrollToDeckB = () => {
    const el = document.getElementById("deck-b");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      triggerHighlight(el, "ring-cyan-500", "shadow-[0_0_35px_rgba(6,182,212,0.7)]");
    } else {
      router.push("/dashboard/dj#deck-b");
    }
  };

  // 6. Abrir Pantalla Modo Cliente (Portal de Invitados / Mesas)
  const handleOpenClientMode = () => {
    const code = getSavedEventCode();
    const url = code ? `/guest?code=${code}` : "/guest";
    window.open(url, "vidjs_guest_preview");
    showToast(code ? `📱 Modo Cliente abierto en ventana de prueba (Mesa / QR: ${code})` : "📱 Abriendo Modo Cliente (Portal de Invitados)...");
  };

  return (
    <>
      {/* Toast flotante de confirmación de acción rápida */}
      {activeToast && (
        <div
          id="bottom-navigation-dock-toast"
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-2xl backdrop-blur-md border ${
            isBlue
              ? "bg-[#0f224a]/95 text-blue-50 border-blue-500/60 shadow-blue-950/80"
              : "bg-zinc-950/95 text-white border-purple-500/40 shadow-black/80"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>{activeToast}</span>
        </div>
      )}

      {/* Dock Estático en el pie del app */}
      <nav
        aria-label="Navegación rápida de cabina"
        data-dock="navigation"
        className="fixed bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[calc(100%-1rem)] sm:w-auto transition-all duration-300"
      >
        <div
          id="bottom-navigation-dock"
          className={`backdrop-blur-xl border rounded-2xl p-1.5 sm:p-2 flex items-center justify-between sm:justify-center gap-1 sm:gap-1.5 transition-colors duration-200 ${
            isBlue
              ? "bg-[#0b1c3d]/95 border-[#1e428a] text-blue-100 shadow-[0_12px_40px_rgba(4,10,24,0.95)]"
              : "bg-zinc-950/95 border-zinc-800/80 text-zinc-200 shadow-[0_12px_40px_rgba(0,0,0,0.85)]"
          }`}
        >
          {/* Si está colapsado: muestra solo una barra ultra delgada con botón para expandir */}
          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer select-none border ${
                isBlue
                  ? "bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 border-blue-500/40"
                  : "bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 border-purple-500/30"
              }`}
              title="Expandir barra de acceso rápido"
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Navegación Rápida</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              {/* 1. PANTALLA TV */}
              <button
                type="button"
                onClick={handleOpenTv}
                className={`flex-1 sm:flex-none flex flex-col items-center justify-center py-1 px-1.5 sm:px-3 rounded-xl border border-transparent transition-all cursor-pointer select-none group min-w-[50px] sm:min-w-[74px] ${
                  isBlue
                    ? "hover:bg-blue-600/20 hover:border-blue-500/40 text-blue-100 hover:text-white"
                    : "hover:bg-emerald-500/10 hover:border-emerald-500/30 text-zinc-300 hover:text-white"
                }`}
                title="Abrir Pantalla TV en ventana de proyección para Smart TV o proyector"
              >
                <div className="relative">
                  <Tv className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <ExternalLink className="w-2.5 h-2.5 text-emerald-300 absolute -top-1 -right-2" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black tracking-tight mt-1 leading-none truncate max-w-full text-zinc-100 group-hover:text-white">
                  Pantalla TV
                </span>
                <span
                  className={`text-[7px] sm:text-[8px] font-mono font-bold uppercase leading-none hidden sm:inline mt-0.5 ${
                    isBlue ? "text-blue-300" : "text-emerald-400"
                  }`}
                >
                  Proyección
                </span>
              </button>

              {/* 2. BIBLIOTECA */}
              <button
                type="button"
                onClick={handleOpenLibrary}
                className={`flex-1 sm:flex-none flex flex-col items-center justify-center py-1 px-1.5 sm:px-3 rounded-xl border border-transparent transition-all cursor-pointer select-none group min-w-[50px] sm:min-w-[74px] ${
                  isBlue
                    ? "hover:bg-blue-600/20 hover:border-blue-500/40 text-blue-100 hover:text-white"
                    : "hover:bg-amber-500/10 hover:border-amber-500/30 text-zinc-300 hover:text-white"
                }`}
                title="Abrir o desplazar a la Biblioteca Musical"
              >
                <ListMusic className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] sm:text-[10px] font-black tracking-tight mt-1 leading-none truncate max-w-full text-zinc-100 group-hover:text-white">
                  Biblioteca
                </span>
                <span
                  className={`text-[7px] sm:text-[8px] font-mono font-bold uppercase leading-none hidden sm:inline mt-0.5 ${
                    isBlue ? "text-blue-300" : "text-amber-400"
                  }`}
                >
                  Pistas
                </span>
              </button>

              {/* 3. SOLICITUDES / COLA */}
              <button
                type="button"
                onClick={handleScrollToQueue}
                className={`flex-1 sm:flex-none flex flex-col items-center justify-center py-1 px-1.5 sm:px-3 rounded-xl border border-transparent transition-all cursor-pointer select-none group min-w-[50px] sm:min-w-[74px] ${
                  isBlue
                    ? "hover:bg-blue-600/20 hover:border-blue-500/40 text-blue-100 hover:text-white"
                    : "hover:bg-rose-500/10 hover:border-rose-500/30 text-zinc-300 hover:text-white"
                }`}
                title="Desplazar a Solicitudes de Mesas y Cola de Reproducción"
              >
                <Flame className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-rose-400 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] sm:text-[10px] font-black tracking-tight mt-1 leading-none truncate max-w-full text-zinc-100 group-hover:text-white">
                  Solicitudes/Cola
                </span>
                <span
                  className={`text-[7px] sm:text-[8px] font-mono font-bold uppercase leading-none hidden sm:inline mt-0.5 ${
                    isBlue ? "text-blue-300" : "text-rose-400"
                  }`}
                >
                  En Vivo
                </span>
              </button>

              {/* Separador sutil */}
              <div
                className={`w-[1px] h-6 shrink-0 hidden sm:block ${
                  isBlue ? "bg-[#1e428a]" : "bg-zinc-800"
                }`}
              />

              {/* 4. BANDEJA A */}
              <button
                type="button"
                onClick={handleScrollToDeckA}
                className={`flex-1 sm:flex-none flex flex-col items-center justify-center py-1 px-1.5 sm:px-3 rounded-xl border border-transparent transition-all cursor-pointer select-none group min-w-[50px] sm:min-w-[74px] ${
                  isBlue
                    ? "hover:bg-blue-600/20 hover:border-blue-500/40 text-blue-100 hover:text-white"
                    : "hover:bg-purple-500/10 hover:border-purple-500/30 text-zinc-300 hover:text-white"
                }`}
                title="Desplazar a Bandeja A (Canal 1)"
              >
                <div className="relative">
                  <Disc3 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-purple-400 group-hover:scale-110 transition-transform" />
                  <span className="absolute -top-1 -right-1.5 px-1 py-0.2 rounded-full bg-purple-600 text-white text-[7px] font-black leading-none">
                    A
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-black tracking-tight mt-1 leading-none truncate max-w-full text-zinc-100 group-hover:text-white">
                  Bandeja A
                </span>
                <span
                  className={`text-[7px] sm:text-[8px] font-mono font-bold uppercase leading-none hidden sm:inline mt-0.5 ${
                    isBlue ? "text-blue-300" : "text-purple-400"
                  }`}
                >
                  Canal 1
                </span>
              </button>

              {/* 5. BANDEJA B */}
              <button
                type="button"
                onClick={handleScrollToDeckB}
                className={`flex-1 sm:flex-none flex flex-col items-center justify-center py-1 px-1.5 sm:px-3 rounded-xl border border-transparent transition-all cursor-pointer select-none group min-w-[50px] sm:min-w-[74px] ${
                  isBlue
                    ? "hover:bg-blue-600/20 hover:border-blue-500/40 text-blue-100 hover:text-white"
                    : "hover:bg-cyan-500/10 hover:border-cyan-500/30 text-zinc-300 hover:text-white"
                }`}
                title="Desplazar a Bandeja B (Canal 2)"
              >
                <div className="relative">
                  <Disc3 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="absolute -top-1 -right-1.5 px-1 py-0.2 rounded-full bg-cyan-600 text-white text-[7px] font-black leading-none">
                    B
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-black tracking-tight mt-1 leading-none truncate max-w-full text-zinc-100 group-hover:text-white">
                  Bandeja B
                </span>
                <span
                  className={`text-[7px] sm:text-[8px] font-mono font-bold uppercase leading-none hidden sm:inline mt-0.5 ${
                    isBlue ? "text-blue-300" : "text-cyan-400"
                  }`}
                >
                  Canal 2
                </span>
              </button>

              {/* Separador sutil */}
              <div
                className={`w-[1px] h-6 shrink-0 hidden sm:block ${
                  isBlue ? "bg-[#1e428a]" : "bg-zinc-800"
                }`}
              />

              {/* 6. PANTALLA MODO CLIENTE */}
              <button
                type="button"
                onClick={handleOpenClientMode}
                className={`flex-1 sm:flex-none flex flex-col items-center justify-center py-1 px-1.5 sm:px-3 rounded-xl border border-transparent transition-all cursor-pointer select-none group min-w-[50px] sm:min-w-[74px] ${
                  isBlue
                    ? "hover:bg-blue-600/20 hover:border-blue-500/40 text-blue-100 hover:text-white"
                    : "hover:bg-blue-500/10 hover:border-blue-500/30 text-zinc-300 hover:text-white"
                }`}
                title="Abrir Portal Modo Cliente (Vista de mesas & pedidos por QR)"
              >
                <div className="relative">
                  <Smartphone className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-blue-400 group-hover:scale-110 transition-transform" />
                  <ExternalLink className="w-2.5 h-2.5 text-blue-300 absolute -top-1 -right-2" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black tracking-tight mt-1 leading-none truncate max-w-full text-zinc-100 group-hover:text-white">
                  Modo Cliente
                </span>
                <span
                  className={`text-[7px] sm:text-[8px] font-mono font-bold uppercase leading-none hidden sm:inline mt-0.5 ${
                    isBlue ? "text-blue-300" : "text-blue-400"
                  }`}
                >
                  Mesas QR
                </span>
              </button>

              {/* Botón para minimizar dock */}
              <button
                type="button"
                onClick={toggleCollapsed}
                className={`p-1 rounded-lg transition-colors cursor-pointer shrink-0 ml-0.5 ${
                  isBlue
                    ? "text-blue-300 hover:text-white hover:bg-blue-900/40"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
                title="Minimizar barra inferior"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
