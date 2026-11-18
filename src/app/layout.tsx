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
  title: "CYNKO - Venues & Entertainment OS",
  description:
    "Plataforma Integral de Gestión, Entretenimiento, Gastronomía y Asistencia para Locales.",
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
