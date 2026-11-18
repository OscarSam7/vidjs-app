import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ZYNKO - Hospitality & Entertainment OS",
    short_name: "ZYNKO",
    description:
      "Plataforma Integral de Gestión, Entretenimiento, Gastronomía y Asistencia para Locales",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#08080d",
    theme_color: "#e024c3",
    categories: ["entertainment", "music", "nightlife"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    shortcuts: [
      {
        name: "Cabina del DJ",
        short_name: "DJ Booth",
        description: "Comandos en vivo, crossfader y cola de reproducción",
        url: "/dashboard/dj",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Mi Noche (Mesas)",
        short_name: "Mesas",
        description: "Catálogo musical, duelos y dedicatorias",
        url: "/guest",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Pantalla Smart TV",
        short_name: "TV Display",
        description: "Visualizador público del escenario",
        url: "/display/RETRO-POP",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
