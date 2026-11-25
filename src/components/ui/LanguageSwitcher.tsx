"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { SUPPORTED_LOCALES, Locale } from "@/lib/i18n/types";

interface LanguageSwitcherProps {
  variant?: "compact" | "pills";
  className?: string;
}

export function LanguageSwitcher({
  variant = "compact",
  className = "",
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const current = SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0];

  if (variant === "pills") {
    return (
      <div
        data-no-translate="true"
        className={`inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 ${className}`}
        role="group"
        aria-label="Selector de idioma"
      >
        {SUPPORTED_LOCALES.map((item) => {
          const active = item.code === locale;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => setLocale(item.code as Locale)}
              className={`px-2 py-1 rounded-lg text-[10px] font-black tracking-wide transition-all cursor-pointer flex items-center gap-1 ${
                active
                  ? "bg-gradient-to-r from-amber-500/25 to-fuchsia-600/30 text-amber-200 border border-amber-400/50 shadow-sm"
                  : "text-zinc-400 hover:text-white border border-transparent"
              }`}
              title={item.label}
            >
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={containerRef} data-no-translate="true" className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 hover:border-purple-400/60 text-zinc-200 hover:text-white text-[11px] font-bold transition-all cursor-pointer shadow-sm"
        title={`Idioma: ${current.label}`}
        aria-expanded={open}
      >
        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="font-mono tracking-wider">{current.shortLabel}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl shadow-black/70 p-1.5 z-50 space-y-0.5">
          {SUPPORTED_LOCALES.map((item) => {
            const active = item.code === locale;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setLocale(item.code as Locale);
                  setOpen(false);
                }}
                className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  active
                    ? "bg-purple-600/20 text-purple-200 border border-purple-500/40"
                    : "text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm leading-none">{item.flag}</span>
                  <span>{item.label}</span>
                </span>
                {active && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
