/**
 * VIDJSPRO - Tokens Centralizados de Diseño
 * Fuente de verdad única para colores, tipografía, radios y elevación.
 * Sincronizado estrictamente con tailwind.config.ts y globals.css.
 */

export const DESIGN_TOKENS = {
  colors: {
    // Superficies y Canvas
    background: "#080F1F",     // Fondo general de la aplicación
    sidebar: "#0D1930",        // Fondo del menú lateral y topbar
    card: "#111F38",           // Paneles y tarjetas base
    cardHover: "#162644",      // Hover de paneles y filas
    elevated: "#1A2C4E",       // Modales, dropdowns y superficies elevadas

    // Bordes Estructurales
    border: "#263858",         // Borde estándar de separación (1px)
    borderSubtle: "#1D2E4D",   // Divisores de tabla y líneas secundarias
    borderFocus: "#3B537E",    // Borde iluminado en foco de input/botón

    // Acentos Funcionales y Cabina
    deckA: "#8B5CF6",          // Violeta: Deck A, acción primaria, confirmación
    deckAHover: "#7C3AED",
    deckB: "#06B6D4",          // Cian: Deck B, Karaoke, proyección TV
    deckBHover: "#0891B2",
    dj: "#F59E0B",             // Ámbar: DJ On-Air, avisos en vivo, Fair-Play
    djHover: "#D97706",
    success: "#22C55E",        // Verde esmeralda: Aprobado, activo, disponible
    successHover: "#16A34A",
    danger: "#EF4444",         // Rojo carmesí: Destructivo, rechazo, desconectado
    dangerHover: "#DC2626",

    // Tipografía y Jerarquía (WCAG AAA)
    textPrimary: "#F8FAFC",    // Títulos de alto contraste y datos clave
    textSecondary: "#E2E8F0",  // Textos de lectura, cuerpo y valores de tabla
    textMuted: "#94A3B8",      // Subtítulos, metadatos, etiquetas secundarias
    textSubtle: "#64748B",     // Placeholders, textos deshabilitados, fechas
  },

  typography: {
    fontFamily: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: 'ui-monospace, "SFMono-Regular", "JetBrains Mono", Menlo, monospace',
    },
    sizes: {
      micro: "text-[10px]",
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl",
      "2xl": "text-2xl",
      "3xl": "text-3xl",
      "4xl": "text-4xl",
    },
  },

  radii: {
    sm: "rounded-lg",    // 8px: Badges, mini botones
    md: "rounded-xl",    // 12px: Inputs, selects, botones base
    lg: "rounded-2xl",   // 16px: Tarjetas KPI, paneles
    full: "rounded-full",// 9999px: Píldoras, switches, avatares
  },

  shadows: {
    card: "shadow-sm shadow-black/40",
    elevated: "shadow-lg shadow-black/60",
    deckA: "shadow-sm shadow-purple-950/40",
    deckB: "shadow-sm shadow-cyan-950/40",
  },
} as const;

export type DesignColors = typeof DESIGN_TOKENS.colors;
export type DesignTokens = typeof DESIGN_TOKENS;
