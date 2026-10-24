"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export type Theme = "system" | "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);
  const [systemIsDark, setSystemIsDark] = useState<boolean>(true);

  // Cargar preferencia guardada de localStorage al montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vidjeis_theme") as Theme | null;
      if (saved && (saved === "system" || saved === "light" || saved === "dark")) {
        setThemeState(saved);
      }
    } catch {}

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemIsDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    setMounted(true);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const resolvedTheme: "light" | "dark" = useMemo(() => {
    if (theme === "system") {
      return systemIsDark ? "dark" : "light";
    }
    return theme;
  }, [theme, systemIsDark]);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (resolvedTheme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  }, [resolvedTheme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("vidjeis_theme", newTheme);
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de un ThemeProvider");
  }
  return context;
}
