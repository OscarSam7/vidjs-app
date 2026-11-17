"use client";

import { useState, useRef, useEffect } from "react";
import { Moon, Sparkles, Sun, Check } from "lucide-react";
import { useTheme, Theme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  variant?: "dropdown" | "segmented" | "cards";
  className?: string;
}

export function ThemeToggle({ variant = "dropdown", className = "" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
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

  const options: { value: Theme; label: string; desc: string; icon: any }[] = [
    {
      value: "dark",
      label: "Modo Oscuro",
      desc: "Interfaz nocturna con fondo negro azabache para cabinas de DJ y noche",
      icon: Moon,
    },
    {
      value: "blue",
      label: "Azul Francia",
      desc: "Estilo sofisticado en azul francia real de alto contraste",
      icon: Sparkles,
    },
    {
      value: "light",
      label: "Modo Claro",
      desc: "Interfaz diurna limpia con fondo blanco y alta luminosidad",
      icon: Sun,
    },
  ];

  if (variant === "segmented") {
    return (
      <div className={`inline-flex p-1 rounded-xl bg-zinc-900 border border-zinc-800 ${className}`}>
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? opt.value === "light"
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/30 font-bold"
                    : "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
              title={opt.desc}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{opt.label}</span>
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
                  ? "bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/30"
                  : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`p-2.5 rounded-xl border ${
                    isActive
                      ? opt.value === "light"
                        ? "bg-amber-500 text-black border-amber-400"
                        : "bg-blue-600 text-white border-blue-400"
                      : "bg-zinc-800 text-zinc-300 border-zinc-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {isActive && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    <Check className="w-3 h-3" />
                    Activo
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-0.5">{opt.label}</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{opt.desc}</p>
              </div>

              {/* Previsualización gráfica miniatura */}
              <div className="w-full h-12 rounded-xl border border-zinc-800 overflow-hidden flex flex-col p-1.5 gap-1 select-none pointer-events-none text-[8px]">
                {opt.value === "blue" ? (
                  <div className="w-full h-full bg-[#081226] rounded-lg p-1.5 flex items-center justify-between border border-[#1e428a]">
                    <div className="w-12 h-2.5 bg-[#1d4ed8] rounded" />
                    <div className="w-5 h-2.5 bg-[#3b82f6] rounded" />
                  </div>
                ) : opt.value === "light" ? (
                  <div className="w-full h-full bg-[#f8fafc] rounded-lg p-1.5 flex items-center justify-between border border-[#cbd5e1]">
                    <div className="w-12 h-2.5 bg-[#ffffff] border border-[#e2e8f0] rounded" />
                    <div className="w-5 h-2.5 bg-[#3b82f6] rounded" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-zinc-950 rounded-lg p-1.5 flex items-center justify-between border border-zinc-800">
                    <div className="w-12 h-2.5 bg-zinc-800 rounded" />
                    <div className="w-5 h-2.5 bg-purple-600 rounded" />
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
  const CurrentIcon = theme === "light" ? Sun : theme === "blue" ? Sparkles : Moon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--card-bg-elevated)] border border-[var(--card-border)] transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 shadow-sm"
        title={`Tema de aplicación: ${
          theme === "light" ? "Modo Claro" : theme === "blue" ? "Azul Francia" : "Modo Oscuro"
        }`}
        aria-label="Cambiar tema de la aplicación"
      >
        <CurrentIcon
          className={`w-4 h-4 ${
            theme === "light"
              ? "text-amber-500"
              : theme === "blue"
              ? "text-blue-500"
              : "text-purple-400"
          }`}
        />
        <span className="hidden sm:inline text-xs font-semibold text-[var(--text-body)]">
          {theme === "light" ? "Claro" : theme === "blue" ? "Azul Francia" : "Oscuro"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-2xl backdrop-blur-xl p-1.5 z-50 animate-in fade-in zoom-in-95">
          <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--card-border)] mb-1">
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
                    ? "bg-purple-600/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-bold"
                    : "text-[var(--text-body)] hover:text-[var(--text-heading)] hover:bg-[var(--card-bg-elevated)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isSelected
                        ? opt.value === "light"
                          ? "text-amber-500"
                          : "text-blue-500"
                        : "text-[var(--text-muted)]"
                    }`}
                  />
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
