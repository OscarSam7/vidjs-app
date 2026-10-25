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

export function BottomNavigationDock() {
  const pathname = usePathname();
  const router = useRouter();
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

  // 1. Desplazar a Bandeja A
  const handleScrollToDeckA = () => {
    const el = document.getElementById("deck-a");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      triggerHighlight(el, "ring-purple-500", "shadow-[0_0_35px_rgba(168,85,247,0.7)]");
    } else {
      router.push("/dashboard/dj#deck-a");
    }
  };

  // 2. Desplazar a Bandeja B
  const handleScrollToDeckB = () => {
    const el = document.getElementById("deck-b");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      triggerHighlight(el, "ring-cyan-500", "shadow-[0_0_35px_rgba(6,182,212,0.7)]");
    } else {
      router.push("/dashboard/dj#deck-b");
    }
  };

  // 3. Desplazar / Abrir Biblioteca
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

  // 4. Abrir Pantalla TV (Proyección en Smart TV / Proyector)
  const handleOpenTv = () => {
    const code = getSavedEventCode();
    const url = code ? `/display/${code}` : "/display";
    window.open(url, "vidjs_tv_display");
    showToast(code ? `📺 Pantalla TV abierta (Evento ${code})` : "📺 Abriendo lanzador de Pantalla TV...");
  };

  // 5. Desplazar a Solicitudes / Cola
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
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-zinc-900/95 dark:bg-zinc-950/95 text-white border border-purple-500/40 shadow-2xl backdrop-blur-md text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>{activeToast}</span>
        </div>
      )}

      {/* Dock Estático en el pie del app */}
      <nav
        aria-label="Navegación rápida de cabina"
        className="fixed bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[calc(100%-1rem)] sm:w-auto transition-all duration-300"
      >
        <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-slate-200 dark:border-zinc-800/80 shadow-[0_10px_35px_rgba(0,0,0,0.5)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.85)] rounded-2xl p-1.5 sm:p-2 flex items-center justify-between sm:justify-center gap-1 sm:gap-1.5">
          {/* Si está colapsado: muestra solo una barra ultra delgada con botón para expandir */}
          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="px-3 py-1.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer select-none"
              title="Expandir barra de acceso rápido"
            >
              <Layers className="w-3.5 h-3.5 text-purple-500" />
              <span>Navegación Rápida</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              {/* 1. BANDEJA A */}
              <button
                type="button"
                onClick={handleScrollToDeckA}
                className="flex-1 sm:flex-none flex flex-col items-center justify-center py-1 px-1.5 sm:px-3 rounded-xl hover:bg-purple-500/10 dark:hover:bg-purple-950/40 text-slate-700 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-300 border border-transparent hover:border-purple-500/30 transition-all cursor-pointer select-none group min-w-[50px] sm:min-w-[74px]"
                title="Desplazar a Bandeja A (Canal 1)"
              >
                <div className="relative">
                  <Disc3 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-purple-500 group-hover:scale-110 transition-transform" />
                  <span className="absolute -top-1 -right-1.5 px-1 py-0.2 rounded-full bg-purple-600 text-white text-[7px] font-black leading-none">
                    A
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-black tracking-tight mt-1 leading-none truncate max-w-full">
                  Bandeja A
                </span>
                <span className="text-[7px] sm:text-[8px] font-mono text-purple-600 dark:text-purple-400 font-bold uppercase leading-none hidden sm:inline mt-0.5">
                  Canal 1
                </span>
              </button>

              {/* 2. BANDEJA B */}
              <button
                type="button"
                onClick={handleScrollToDeckB}
                className="flex-1 sm:flex-none flex flex-col items-center justify-center py-1 px-1.5 sm:px-3 rounded-xl hover:bg-cyan-500/10 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-300 border border-transparent hover:border-cyan-500/30 transition-all cursor-pointer select-none group min-w-[50px] sm:min-w-[74px]"
                title="Desplazar a Bandeja B (Canal 2)"
              >
                <div className="relative">
                  <Disc3 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-cyan-500 group-hover:scale-110 transition-transform" />
                  <span className="absolute -top-1 -right-1.5 px-1 py-0.2 rounded-full bg-cyan-600 text-white text-[7px] font-black leading-none">
                    B
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-black tracking-tight mt-1 leading-none truncate max-w-full">
                  Bandeja B
                </span>
                <span className="text-[7px] sm:text-[8px] font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase leading-none hidden sm:inline mt-0.5">
                  Canal 2
                </span>
              </button>

              {/* Separador sutil */}
              <div className="w-[1px] h-6 bg-slate-200 dark:bg-zinc-800 shrink-0 hidden sm:block" />

              {/* 3. BIBLIOTECA */}
              <button
                type="button"
                onClick={handleOpenLibrary}
                className="flex-1 sm:flex-none flex flex-col items-center justify-center py-1 px-1.5 sm:px-3 rounded-xl hover:bg-amber-500/10 dark:hover:bg-amber-950/40 text-slate-700 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-300 border border-transparent hover:border-amber-500/30 transition-all cursor-pointer select-none group min-w-[50px] sm:min-w-[74px]"
                title="Abrir o desplazar a la Biblioteca Musical"
              >
                <ListMusic className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] sm:text-[10px] font-black tracking-tight mt-1 leading-none truncate max-w-full">
                  Biblioteca
                </span>
                <span className="text-[7px] sm:text-[8px] font-mono text-amber-600 dark:text-amber-400 font-bold uppercase leading-none hidden sm:inline mt-0.5">
                  Pistas
                </span>
              </button>

              {/* 4. PANTALLA TV */}
              <button
                type="button"
                onClick={handleOpenTv}
                className="flex-1 sm:flex-none flex flex-col items-center justify-center py-1 px-1.5 sm:px-3 rounded-xl hover:bg-emerald-500/10 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-300 border border-transparent hover:border-emerald-500/30 transition-all cursor-pointer select-none group min-w-[50px] sm:min-w-[74px]"
                title="Abrir Pantalla TV en ventana de proyección para Smart TV o proyector"
              >
                <div className="relative">
                  <Tv className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <ExternalLink className="w-2.5 h-2.5 text-emerald-400 absolute -top-1 -right-2" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black tracking-tight mt-1 leading-none truncate max-w-full">
                  Pantalla TV
                </span>
                <span className="text-[7px] sm:text-[8px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase leading-none hidden sm:inline mt-0.5">
                  Proyección
                </span>
              </button>

              {/* 5. SOLICITUDES / COLA */}
              <button
                type="button"
                onClick={handleScrollToQueue}
                className="flex-1 sm:flex-none flex flex-col items-center justify-center py-1 px-1.5 sm:px-3 rounded-xl hover:bg-rose-500/10 dark:hover:bg-rose-950/40 text-slate-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-300 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer select-none group min-w-[50px] sm:min-w-[74px]"
                title="Desplazar a Solicitudes de Mesas y Cola de Reproducción"
              >
                <Flame className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-rose-500 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] sm:text-[10px] font-black tracking-tight mt-1 leading-none truncate max-w-full">
                  Solicitudes/Cola
                </span>
                <span className="text-[7px] sm:text-[8px] font-mono text-rose-600 dark:text-rose-400 font-bold uppercase leading-none hidden sm:inline mt-0.5">
                  En Vivo
                </span>
              </button>

              {/* 6. PANTALLA MODO CLIENTE */}
              <button
                type="button"
                onClick={handleOpenClientMode}
                className="flex-1 sm:flex-none flex flex-col items-center justify-center py-1 px-1.5 sm:px-3 rounded-xl hover:bg-blue-500/10 dark:hover:bg-blue-950/40 text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-300 border border-transparent hover:border-blue-500/30 transition-all cursor-pointer select-none group min-w-[50px] sm:min-w-[74px]"
                title="Abrir Portal Modo Cliente (Vista de mesas & pedidos por QR)"
              >
                <div className="relative">
                  <Smartphone className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-blue-500 group-hover:scale-110 transition-transform" />
                  <ExternalLink className="w-2.5 h-2.5 text-blue-400 absolute -top-1 -right-2" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black tracking-tight mt-1 leading-none truncate max-w-full">
                  Modo Cliente
                </span>
                <span className="text-[7px] sm:text-[8px] font-mono text-blue-600 dark:text-blue-400 font-bold uppercase leading-none hidden sm:inline mt-0.5">
                  Mesas QR
                </span>
              </button>

              {/* Botón para minimizar dock */}
              <button
                type="button"
                onClick={toggleCollapsed}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer shrink-0 ml-0.5"
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
