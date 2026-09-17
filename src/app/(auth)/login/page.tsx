"use client";

import { useState } from "react";
import { Music, Disc3, ShieldCheck, ArrowRight, Sparkles, Building2, UserCircle2, QrCode } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Error al iniciar sesión");
      }

      // Redirección inmediata al dashboard
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword("Password123!");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#070709] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,50,220,0.25),rgba(255,255,255,0))] flex flex-col justify-center items-center px-4 py-12">
      {/* Glow decorative elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-4 glow-purple">
            <Disc3 className="w-8 h-8 animate-spin text-purple-400 [animation-duration:12s]" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            VIDJS <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300 font-semibold border border-purple-500/30">ENTERTAINMENT</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Plataforma SaaS para Bares, Karaokes, Clubes y DJs
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Acceso Administrativo</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Ingresa tus credenciales para administrar tu establecimiento
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@establecimiento.com"
                className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Contraseña
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Panel</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Access Demo Accounts */}
          <div className="mt-8 pt-6 border-t border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Accesos rápidos de prueba (Demo):</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("owner@retrobar.com")}
                className="p-2.5 bg-zinc-950/80 hover:bg-purple-950/30 border border-zinc-800/80 hover:border-purple-600/50 rounded-xl text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white group-hover:text-purple-300">Owner</span>
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">Carlos (Retro Bar)</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("manager@retrobar.com")}
                className="p-2.5 bg-zinc-950/80 hover:bg-purple-950/30 border border-zinc-800/80 hover:border-purple-600/50 rounded-xl text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white group-hover:text-purple-300">Manager</span>
                  <UserCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">Valeria (Locales)</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("dj@retrobar.com")}
                className="p-2.5 bg-zinc-950/80 hover:bg-purple-950/30 border border-zinc-800/80 hover:border-purple-600/50 rounded-xl text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white group-hover:text-purple-300">DJ</span>
                  <Music className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">Alex Beat (Cabina)</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("admin@vidjs.com")}
                className="p-2.5 bg-zinc-950/80 hover:bg-purple-950/30 border border-zinc-800/80 hover:border-purple-600/50 rounded-xl text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white group-hover:text-purple-300">Super Admin</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">Plataforma Global</p>
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 text-center mt-3">
              Contraseña precargada: <code className="text-zinc-400">Password123!</code>
            </p>
          </div>
        </div>

        {/* Link directo para clientes comensales */}
        <div className="mt-5 text-center">
          <a
            href="/guest"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/50 text-purple-300 hover:text-white text-xs font-bold transition-all shadow-lg"
          >
            <QrCode className="w-4 h-4 text-purple-400" />
            <span>¿Eres cliente en una mesa? Entrar a pedir canciones &rarr;</span>
          </a>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-zinc-500 mt-6">
          Aislamiento seguro multi-tenant a nivel de base de datos &copy; 2026 Vidjs
        </p>
      </div>
    </div>
  );
}
