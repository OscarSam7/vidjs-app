export type Locale = "es" | "pt" | "en";

export const SUPPORTED_LOCALES: Array<{
  code: Locale;
  shortLabel: string;
  label: string;
  flag: string;
  dateLocale: string;
}> = [
  {
    code: "es",
    shortLabel: "ES",
    label: "Español",
    flag: "🇪🇸",
    dateLocale: "es-PY",
  },
  {
    code: "pt",
    shortLabel: "PT",
    label: "Português",
    flag: "🇧🇷",
    dateLocale: "pt-BR",
  },
  {
    code: "en",
    shortLabel: "EN",
    label: "English",
    flag: "🇺🇸",
    dateLocale: "en-US",
  },
];

export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_STORAGE_KEY = "cynko_locale";

export function isValidLocale(value: string | null | undefined): value is Locale {
  return value === "es" || value === "pt" || value === "en";
}

export function getDateLocale(locale: Locale): string {
  return SUPPORTED_LOCALES.find((l) => l.code === locale)?.dateLocale || "es-PY";
}
