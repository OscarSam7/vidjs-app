import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegistrar from "@/components/pwa/PwaRegistrar";

export const viewport: Viewport = {
  themeColor: "#040406",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Vidjs - SaaS para Bares, DJs, Karaokes y Eventos",
  description:
    "Sistema Operativo Digital del Entretenimiento Nocturno: solicitudes por QR, duelos en vivo, muro de fotos y gestión en caliente para locales y DJs.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vidjs",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192x192.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#09090b] text-[#f4f4f5] antialiased selection:bg-purple-600 selection:text-white">
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
