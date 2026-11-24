"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home, LogIn } from "lucide-react";
import Link from "next/link";
import { CynkoLogo } from "@/components/ui/ZynkoLogo";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);

    // Recuperación automática si el navegador/PWA tenía un chunk antiguo en caché tras un despliegue
    const msg = error?.message || "";
    const isChunkError =
      error?.name === "ChunkLoadError" ||
      msg.includes("Loading chunk") ||
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed");

    if (isChunkError && typeof window !== "undefined") {
      const key = "cynko_chunk_reload_once";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  }, [error]);

  const handleRetry = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("cynko_chunk_reload_once");
      window.location.reload();
      return;
    }
    reset();
  };

  return (
    <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-5">
        <CynkoLogo size="lg" subtitle="VENUES & ENTERTAINMENT OS" />
      </div>

      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mb-4 shadow-lg">
        <AlertCircle className="w-7 h-7" />
      </div>

      <h1 className="text-xl font-black text-white tracking-tight mb-2">
        Ocurrió una eventualidad
      </h1>

      <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
        Se presentó un inconveniente momentáneo al cargar la pantalla (suele ocurrir tras una actualización reciente). Toca <strong>Reintentar</strong> para recargar la última versión.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-fuchsia-600 hover:from-amber-400 hover:to-fuchsia-500 text-white text-xs font-black shadow-lg transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reintentar</span>
        </button>

        <a
          href="/login"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold transition-all cursor-pointer"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Iniciar Sesión</span>
        </a>

        <Link
          href="/app"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-all"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Ir al Inicio</span>
        </Link>
      </div>

      {(error?.message || error?.digest) && (
        <p className="text-[11px] font-mono text-zinc-600 mt-6 max-w-md break-words">
          {error?.digest ? `Ref: ${error.digest}` : error?.message?.slice(0, 140)}
        </p>
      )}
    </div>
  );
}
