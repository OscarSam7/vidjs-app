"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export type Theme = "dark" | "blue" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "dark" | "blue" | "light";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // Cargar preferencia guardada de localStorage al montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vidjeis_theme");
      if (saved === "light") {
        setThemeState("light");
      } else if (saved === "blue" || saved === "french-blue") {
        setThemeState("blue");
      } else {
        setThemeState("dark");
      }
    } catch {}

    setMounted(true);
  }, []);

  const resolvedTheme: "dark" | "blue" | "light" = useMemo(() => {
    if (theme === "light") return "light";
    if (theme === "blue") return "blue";
    return "dark";
  }, [theme]);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("dark", "blue", "light");
    root.classList.add(resolvedTheme);
  }, [resolvedTheme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("vidjeis_theme", newTheme);
      // Notificar a otras ventanas o pestañas si es necesario
      window.dispatchEvent(new CustomEvent("vidjeis-theme-changed", { detail: { theme: newTheme } }));
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
