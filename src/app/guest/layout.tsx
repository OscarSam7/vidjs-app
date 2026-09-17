import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Pide tu Canción | Vidjs Live",
  description: "Selecciona canciones y pistas de karaoke directamente desde tu mesa.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col items-center">
      <div className="w-full max-w-lg min-h-screen flex flex-col bg-zinc-950 shadow-2xl border-x border-zinc-800/50">
        {children}
      </div>
    </div>
  );
}
