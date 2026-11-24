import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CYNKO - Venues & Entertainment OS",
    short_name: "CYNKO",
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
        name: "Explorar Eventos & Club VIP",
        short_name: "Explorar",
        description: "Eventos, entradas, Flash Deals y puntos CYNKO Club",
        url: "/app",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Cabina DJ (Bandeja A & B)",
        short_name: "Cabina DJ",
        description: "Escucha y mezcla tus canciones en Bandeja A y B",
        url: "/app?tab=dj",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Mi Mesa (QR)",
        short_name: "Mi Mesa",
        description: "Escanea tu mesa, pide música, karaoke y menú",
        url: "/guest",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
