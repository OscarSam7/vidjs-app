import { z } from "zod";

export interface ThemePreset {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  gradient: string;
  description: string;
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  "cyber-purple": {
    id: "cyber-purple",
    name: "Cyber Purple & Cyan",
    primaryColor: "#8B5CF6",
    accentColor: "#06B6D4",
    gradient: "from-purple-600 to-cyan-500",
    description: "Estilo futurista de club con neón violeta y destellos cian",
  },
  "golden-lounge": {
    id: "golden-lounge",
    name: "Golden Luxury Lounge",
    primaryColor: "#EAB308",
    accentColor: "#F97316",
    gradient: "from-amber-500 to-yellow-400",
    description: "Elegancia nocturna con tonos dorados y ámbar champán",
  },
  "retro-wave": {
    id: "retro-wave",
    name: "Retro Synthwave 80s",
    primaryColor: "#EC4899",
    accentColor: "#8B5CF6",
    gradient: "from-pink-500 to-purple-600",
    description: "Vibras ochenteras con rosa flúor y púrpura arcade",
  },
  "emerald-bar": {
    id: "emerald-bar",
    name: "Emerald Speakeasy",
    primaryColor: "#10B981",
    accentColor: "#06B6D4",
    gradient: "from-emerald-500 to-teal-400",
    description: "Ambiente sofisticado botánico con esmeralda y menta",
  },
  "midnight-velvet": {
    id: "midnight-velvet",
    name: "Midnight Velvet Club",
    primaryColor: "#3B82F6",
    accentColor: "#A855F7",
    gradient: "from-blue-600 to-indigo-500",
    description: "Intensidad electrónica con azul cobalto y ultra índigo",
  },
};

export const brandingSchema = z.object({
  logoUrl: z.string().url("URL de logo inválida").or(z.string().length(0)).optional().nullable(),
  bannerUrl: z.string().url("URL de banner inválida").or(z.string().length(0)).optional().nullable(),
  primaryColor: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Color hexadecimal inválido").default("#8B5CF6"),
  accentColor: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Color hexadecimal inválido").default("#06B6D4"),
  themePreset: z.string().default("cyber-purple"),
  welcomeTitle: z.string().max(100, "Máximo 100 caracteres").optional().nullable(),
  welcomeSubtitle: z.string().max(200, "Máximo 200 caracteres").optional().nullable(),
  marqueeText: z.string().max(300, "Máximo 300 caracteres").optional().nullable(),
  wifiSsid: z.string().max(50, "Máximo 50 caracteres").optional().nullable(),
  wifiPassword: z.string().max(50, "Máximo 50 caracteres").optional().nullable(),
  instagramHandle: z.string().max(50, "Máximo 50 caracteres").optional().nullable(),
  tiktokHandle: z.string().max(50, "Máximo 50 caracteres").optional().nullable(),
  whatsappNumber: z.string().max(30, "Máximo 30 caracteres").optional().nullable(),
  googleMapsReviewUrl: z.string().url("URL de Google Maps inválida").or(z.string().length(0)).optional().nullable(),
});

export type BrandingConfig = z.infer<typeof brandingSchema>;

export const DEFAULT_BRANDING: BrandingConfig = {
  logoUrl: null,
  bannerUrl: null,
  primaryColor: "#8B5CF6",
  accentColor: "#06B6D4",
  themePreset: "cyber-purple",
  welcomeTitle: "¡Bienvenidos a la Fiesta!",
  welcomeSubtitle: "Pide tus temas favoritos desde la mesa y cántalos en vivo",
  marqueeText: "🍹 2x1 en Tragos seleccionados | 🎤 Karaoke en vivo en la Pantalla Gigante | 🎂 Festeja tu cumpleaños",
  wifiSsid: null,
  wifiPassword: null,
  instagramHandle: null,
  tiktokHandle: null,
  whatsappNumber: null,
  googleMapsReviewUrl: null,
};

/**
 * Resuelve la cascada de personalización de marca:
 * DEFAULT_BRANDING -> Tenant Settings (Marca General) -> Venue Settings (Sobreescritura Local)
 */
export function getMergedBranding(
  tenantSettingsRaw?: string | null,
  venueSettingsRaw?: string | null,
  tenantFallbackName?: string,
  tenantLogoFallback?: string | null
): BrandingConfig {
  let tenantConfig: Partial<BrandingConfig> = {};
  let venueConfig: Partial<BrandingConfig> = {};

  if (tenantSettingsRaw) {
    try {
      const parsed = JSON.parse(tenantSettingsRaw);
      if (parsed && typeof parsed === "object") {
        tenantConfig = parsed.branding || parsed;
      }
    } catch {
      // Ignorar error de parsing
    }
  }

  if (venueSettingsRaw) {
    try {
      const parsed = JSON.parse(venueSettingsRaw);
      if (parsed && typeof parsed === "object") {
        venueConfig = parsed.branding || parsed;
      }
    } catch {
      // Ignorar error de parsing
    }
  }

  // Filtrar campos vacíos o nulos para que no tapen al fallback
  const cleanTenant: Partial<BrandingConfig> = {};
  for (const [k, v] of Object.entries(tenantConfig)) {
    if (v !== undefined && v !== null && v !== "") {
      (cleanTenant as any)[k] = v;
    }
  }

  const cleanVenue: Partial<BrandingConfig> = {};
  for (const [k, v] of Object.entries(venueConfig)) {
    if (v !== undefined && v !== null && v !== "") {
      (cleanVenue as any)[k] = v;
    }
  }

  const merged: BrandingConfig = {
    ...DEFAULT_BRANDING,
    ...cleanTenant,
    ...cleanVenue,
  };

  // Si no hay logo definido en settings, usar el logoUrl nativo de Tenant si existe
  if (!merged.logoUrl && tenantLogoFallback) {
    merged.logoUrl = tenantLogoFallback;
  }

  // Si no hay welcomeTitle definido, personalizarlo con el nombre del local
  if (!merged.welcomeTitle && tenantFallbackName) {
    merged.welcomeTitle = `¡Bienvenidos a ${tenantFallbackName}!`;
  }

  return merged;
}
