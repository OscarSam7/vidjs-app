import { Suspense } from "react";
import ClientSuperApp from "@/components/client/ClientSuperApp";

export const metadata = {
  title: "CYNKO App — Eventos, Entradas, Cabina DJ & Club VIP",
  description:
    "Descubre eventos y fiestas, compra entradas, usa tu Cabina DJ (Bandeja A & B) y acumula puntos CYNKO Club en tus locales favoritos.",
};

export default function ClientAppPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#06060b] text-zinc-400 flex items-center justify-center text-xs">
          Cargando CYNKO Super App...
        </div>
      }
    >
      <ClientSuperApp />
    </Suspense>
  );
}
