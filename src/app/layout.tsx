import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegistrar from "@/components/pwa/PwaRegistrar";
import { ThemeProvider } from "@/context/ThemeContext";

export const viewport: Viewport = {
  themeColor: "#040406",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://cynko.app"),
  title: {
    default: "CYNKO OS - Venues & Entertainment Operating System",
    template: "%s | CYNKO OS",
  },
  description:
    "CYNKO OS es la Super App y sistema operativo integral en la nube para bares, discotecas, restaurantes y eventos: Cabina DJ, Entradas QR, CYNKO Club VIP, Restaurante POS & KDS, Beeper Digital y Reservas.",
  keywords: [
    "CYNKO",
    "CYNKO OS",
    "cynko.app",
    "VIDJS",
    "VIDJSPRO",
    "VIDJSPRO ECOSYSTEM",
    "NIGHTLIFE OPERATING SYSTEM",
    "software para discotecas",
    "sistema para bares",
    "pos restaurantes",
    "beeper digital qr",
    "auto dj discotecas",
    "control de asistencia staff qr",
    "reservas vip boliches",
    "software eventos asuncion",
    "nightlife os",
  ],
  authors: [{ name: "CYNKO Team", url: "https://cynko.app" }],
  creator: "CYNKO OS",
  alternates: {
    canonical: "https://cynko.app",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_LA",
    url: "https://cynko.app",
    title: "CYNKO OS - Venues & Entertainment Operating System",
    description:
      "Plataforma Integral de Gestión, Entretenimiento, Gastronomía y Asistencia para Locales y Eventos.",
    siteName: "CYNKO OS",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "CYNKO OS Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CYNKO OS - Venues & Entertainment Operating System",
    description: "Plataforma Integral para Locales, Bares, Discotecas y Restaurantes.",
    images: ["/icons/icon-512x512.png"],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CYNKO",
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
    <html lang="es" className="dark notranslate" translate="no" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__PWA_DEFERRED_PROMPT__ = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__PWA_DEFERRED_PROMPT__ = e;
                window.dispatchEvent(new Event('pwa-prompt-ready'));
              });
              window.addEventListener('appinstalled', function() {
                window.__PWA_DEFERRED_PROMPT__ = null;
                window.dispatchEvent(new Event('pwa-installed'));
              });
              try {
                const storedTheme = localStorage.getItem('vidjeis_theme') || 'dark';
                if (storedTheme === 'light') {
                  document.documentElement.classList.remove('dark', 'blue');
                  document.documentElement.classList.add('light');
                } else if (storedTheme === 'blue' || storedTheme === 'french-blue') {
                  document.documentElement.classList.remove('dark', 'light');
                  document.documentElement.classList.add('blue');
                } else {
                  document.documentElement.classList.remove('blue', 'light');
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="bg-[var(--background)] text-[var(--foreground)] antialiased selection:bg-purple-600 selection:text-white transition-colors duration-200">
        <ThemeProvider>
          <PwaRegistrar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
