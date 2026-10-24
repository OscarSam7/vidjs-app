"use client";

import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme, Theme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  variant?: "dropdown" | "segmented" | "cards";
  className?: string;
}

export function ThemeToggle({ variant = "dropdown", className = "" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options: { value: Theme; label: string; desc: string; icon: typeof Sun }[] = [
    {
      value: "system",
      label: "Sistema (Ajustes)",
      desc: "Sigue automáticamente el tema de tu dispositivo o sistema operativo",
      icon: Monitor,
    },
    {
      value: "light",
      label: "Modo Claro",
      desc: "Interfaz luminosa con fondo blanco de alta legibilidad para el día",
      icon: Sun,
    },
    {
      value: "dark",
      label: "Modo Oscuro",
      desc: "Interfaz nocturna con fondo oscuro ideal para cabinas de DJ y noche",
      icon: Moon,
    },
  ];

  if (variant === "segmented") {
    return (
      <div className={`inline-flex p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 ${className}`}>
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-zinc-800/60"
              }`}
              title={opt.desc}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{opt.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3.5 ${className}`}>
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group ${
                isActive
                  ? "bg-purple-50/70 dark:bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/10 ring-2 ring-purple-500/30"
                  : "bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`p-2.5 rounded-xl border ${
                    isActive
                      ? "bg-purple-600 text-white border-purple-400"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {isActive && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-300 dark:border-purple-500/20">
                    <Check className="w-3 h-3" />
                    Activo
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">{opt.label}</h3>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">{opt.desc}</p>
              </div>

              {/* Previsualización gráfica miniatura */}
              <div className="w-full h-12 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col p-1.5 gap-1 select-none pointer-events-none text-[8px]">
                {opt.value === "light" ? (
                  <div className="w-full h-full bg-slate-100 rounded-lg p-1.5 flex items-center justify-between border border-slate-200">
                    <div className="w-12 h-2.5 bg-slate-300 rounded" />
                    <div className="w-5 h-2.5 bg-purple-600 rounded" />
                  </div>
                ) : opt.value === "dark" ? (
                  <div className="w-full h-full bg-zinc-950 rounded-lg p-1.5 flex items-center justify-between border border-zinc-800">
                    <div className="w-12 h-2.5 bg-zinc-800 rounded" />
                    <div className="w-5 h-2.5 bg-purple-600 rounded" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-slate-100 via-zinc-900 to-zinc-950 rounded-lg p-1.5 flex items-center justify-between border border-slate-300 dark:border-zinc-700">
                    <div className="w-12 h-2.5 bg-slate-400 dark:bg-zinc-600 rounded" />
                    <div className="w-5 h-2.5 bg-purple-600 dark:bg-purple-500 rounded" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Variant Dropdown (para Topbar)
  const CurrentIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800 transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
        title={`Tema de aplicación: ${theme === "system" ? "Sistema (" + (resolvedTheme === "dark" ? "Oscuro" : "Claro") + ")" : theme === "light" ? "Claro" : "Oscuro"}`}
        aria-label="Cambiar tema de la aplicación"
      >
        <CurrentIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-zinc-900/95 border border-slate-200 dark:border-zinc-800 shadow-2xl backdrop-blur-xl p-1.5 z-50 animate-in fade-in zoom-in-95">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800/80 mb-1">
            Tema de la Aplicación
          </div>
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTheme(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-purple-100 dark:bg-purple-600/20 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 font-bold"
                    : "text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-purple-600 dark:text-purple-400" : "text-slate-500 dark:text-zinc-400"}`} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
