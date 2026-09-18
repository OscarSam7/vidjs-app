"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, LogIn, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error caught by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-5 shadow-lg shadow-amber-500/5">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-black text-white tracking-tight mb-2">
        Atención con la sesión del panel
      </h2>

      <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
        No se pudo cargar la vista del panel debido a una expiración de credenciales o un microcorte de sincronización.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reintentar</span>
        </button>

        <a
          href="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Iniciar Sesión de nuevo</span>
        </a>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-all"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Inicio</span>
        </Link>
      </div>

      {error?.digest && (
        <p className="text-[11px] font-mono text-zinc-600 mt-6">
          Ref: {error.digest}
        </p>
      )}
    </div>
  );
}
