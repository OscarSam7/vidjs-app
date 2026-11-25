"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  Locale,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  isValidLocale,
  getDateLocale,
} from "@/lib/i18n/types";
import { UI_DICTIONARY } from "@/lib/i18n/dictionaries";
import { applyDomTranslation, translatePhrase } from "@/lib/i18n/dom-translator";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string, fallback?: string) => string;
  dateLocale: string;
  formatDate: (date: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key, fallback) => fallback || key,
  dateLocale: "es-PY",
  formatDate: (date) => String(date),
});

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isValidLocale(stored)) return stored;

    // Detección automática del idioma del navegador en primera visita
    const navLang = (navigator.language || "").toLowerCase();
    if (navLang.startsWith("pt")) return "pt";
    if (navLang.startsWith("en")) return "en";
  } catch {}
  return DEFAULT_LOCALE;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const initial = detectInitialLocale();
    setLocaleState(initial);
    setHydrated(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, next);
        document.cookie = `${LOCALE_STORAGE_KEY}=${next}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {}
    }
  }, []);

  // Sincronizar lang del HTML + traducción segura del DOM para todo el sistema
  useEffect(() => {
    if (!hydrated || typeof document === "undefined") return;

    document.documentElement.lang = locale;
    applyDomTranslation(document.body, locale);

    if (locale === "es") {
      return;
    }

    const pendingNodes = new Set<Node>();
    const flush = () => {
      rafRef.current = null;
      pendingNodes.forEach((node) => {
        if (document.body.contains(node)) {
          applyDomTranslation(node, locale);
        }
      });
      pendingNodes.clear();
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "childList") {
          m.addedNodes.forEach((n) => pendingNodes.add(n));
        } else if (m.type === "characterData" && m.target) {
          pendingNodes.add(m.target);
        }
      }
      if (pendingNodes.size > 0 && rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(flush);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [locale, hydrated]);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const entry = UI_DICTIONARY[key];
      if (entry) return entry[locale];
      if (fallback) return translatePhrase(fallback, locale);
      return key;
    },
    [locale]
  );

  const dateLocale = getDateLocale(locale);

  const formatDate = useCallback(
    (date: string | number | Date, options?: Intl.DateTimeFormatOptions) => {
      try {
        return new Date(date).toLocaleDateString(dateLocale, options);
      } catch {
        return String(date);
      }
    },
    [dateLocale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, dateLocale, formatDate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
