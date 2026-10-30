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
    <div className="min-h-screen bg-[#080F1F] text-[#F8FAFC] flex flex-col items-center overflow-x-hidden w-full">
      <div className="w-full max-w-lg min-h-screen flex flex-col bg-[#080F1F] shadow-2xl border-x border-[#263858] overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
