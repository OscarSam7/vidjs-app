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
  title: "Vidjeis - SaaS para Bares, DJs, Karaokes y Eventos",
  description:
    "Sistema Operativo Digital del Entretenimiento Nocturno: solicitudes por QR, duelos en vivo, muro de fotos y gestión en caliente para locales y DJs.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vidjeis",
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
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storedTheme = localStorage.getItem('vidjeis_theme') || 'dark';
                if (storedTheme === 'blue' || storedTheme === 'french-blue' || storedTheme === 'light') {
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
