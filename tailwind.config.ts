import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#fdf2f8",
          100: "#fce7f3",
          200: "#fbcfe8",
          300: "#f472b6",
          400: "#e879f9",
          500: "#c084fc",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
        },
        surface: {
          50: "#18181b",
          100: "#27272a",
          200: "#3f3f46",
          300: "#52525b",
          800: "#09090b",
          900: "#040406",
        },
        navy: {
          950: "#080F1F", // Fondo principal
          900: "#0D1930", // Sidebar
          850: "#111F38", // Tarjetas
          800: "#162644", // Hover tarjeta
          750: "#1A2C4E", // Superficie elevada
          700: "#263858", // Borde estándar
          650: "#1D2E4D", // Borde sutil
          600: "#3B537E", // Borde focus
        },
        saas: {
          bg: "#080F1F",
          sidebar: "#0D1930",
          card: "#111F38",
          "card-hover": "#162644",
          elevated: "#1A2C4E",
          border: "#263858",
          "border-subtle": "#1D2E4D",
          primary: "#8B5CF6",
          "primary-hover": "#7C3AED",
          success: "#22C55E",
          karaoke: "#06B6D4",
          dj: "#F59E0B",
          "text-primary": "#F8FAFC",
          "text-secondary": "#94A3B8",
          "text-muted": "#64748B",
        }
      },
    },
  },
  plugins: [],
};
export default config;
