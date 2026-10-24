"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export type Theme = "dark" | "blue";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "dark" | "blue";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // Cargar preferencia guardada de localStorage al montar (migrando sistema/claro -> oscuro/azul)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vidjeis_theme");
      if (saved === "blue" || saved === "french-blue" || saved === "light") {
        setThemeState("blue");
      } else {
        setThemeState("dark");
      }
    } catch {}

    setMounted(true);
  }, []);

  const resolvedTheme: "dark" | "blue" = useMemo(() => {
    return theme === "blue" ? "blue" : "dark";
  }, [theme]);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("light");
    if (resolvedTheme === "blue") {
      root.classList.remove("dark");
      root.classList.add("blue");
    } else {
      root.classList.remove("blue");
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
