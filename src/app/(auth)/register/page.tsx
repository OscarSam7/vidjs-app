"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Sparkles,
  Headphones,
  CheckCircle2,
  Mic,
  Disc3,
  UtensilsCrossed,
} from "lucide-react";
import { ZynkoLogo } from "@/components/ui/ZynkoLogo";

export default function RegisterPage() {
  const [ownerName, setOwnerName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState<"FULL_VENUE" | "AUDIO_CABINA_PRO" | "KARAOKE_BAR">("FULL_VENUE");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName,
          venueName,
          email,
          password,
          phone,
          serviceType,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo completar el registro.");
      }

      // Redirección según el tipo de servicio seleccionado
      if (serviceType === "AUDIO_CABINA_PRO") {
        window.location.href = "/dashboard/dj/pro";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado al registrar el establecimiento.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,50,220,0.25),rgba(255,255,255,0))] flex flex-col justify-center items-center px-4 py-12">
      {/* Glow decorativo de fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Cabecera de Marca CYNKO */}
        <div className="text-center mb-8">
          <Link href="/login" className="inline-flex items-center justify-center mb-3 hover:opacity-90 transition-opacity">
            <ZynkoLogo size="xl" subtitle="VENUES & ENTERTAINMENT OS" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-2">
            Registra tu Establecimiento
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Configura tu local en 1 minuto y empieza a operar con pedidos, cabina DJ o control de asistencia.
          </p>
        </div>

        {/* Tarjeta de Registro */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-xs flex items-start gap-2.5">
              <span className="font-bold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de Servicio / Enfoque */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                ¿Cuál es tu enfoque principal?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setServiceType("FULL_VENUE")}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    serviceType === "FULL_VENUE"
                      ? "bg-fuchsia-950/40 border-fuchsia-500/80 ring-1 ring-fuchsia-500/40"
                      : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <UtensilsCrossed className={`w-4 h-4 mb-2 ${serviceType === "FULL_VENUE" ? "text-fuchsia-400" : "text-zinc-500"}`} />
                  <div>
                    <p className="text-xs font-black text-white">Local Completo</p>
                    <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">Mesas, QR, Mozos, Cocina y Música</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setServiceType("AUDIO_CABINA_PRO")}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    serviceType === "AUDIO_CABINA_PRO"
                      ? "bg-cyan-950/40 border-cyan-500/80 ring-1 ring-cyan-500/40"
                      : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <Disc3 className={`w-4 h-4 mb-2 ${serviceType === "AUDIO_CABINA_PRO" ? "text-cyan-400" : "text-zinc-500"}`} />
                  <div>
                    <p className="text-xs font-black text-white">Audio Cabina Pro</p>
                    <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">Doble Deck Fijo y Auto-DJ continuo</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setServiceType("KARAOKE_BAR")}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    serviceType === "KARAOKE_BAR"
                      ? "bg-amber-950/40 border-amber-500/80 ring-1 ring-amber-500/40"
                      : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <Mic className={`w-4 h-4 mb-2 ${serviceType === "KARAOKE_BAR" ? "text-amber-400" : "text-zinc-500"}`} />
                  <div>
                    <p className="text-xs font-black text-white">Bar Karaoke</p>
                    <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">Pista de canto, votos y pantalla TV</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Nombre del Negocio y Nombre del Dueño */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre del Local *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="Ej: Retro Bar Lounge"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tu Nombre y Apellido *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Ej: Carlos Silva"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Correo Electrónico */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Correo Electrónico (Acceso Maestro) *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tulocal.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 transition-colors"
                />
              </div>
            </div>

            {/* Contraseña y Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Contraseña (Mín. 8 caracteres) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  WhatsApp / Celular (Opcional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+595 9..."
                    className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Botón de Envío */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-fuchsia-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creando tu cuenta y local...</span>
                  </>
                ) : (
                  <>
                    <span>Comenzar Ahora con CYNKO</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Enlace a Iniciar Sesión */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center">
            <p className="text-xs text-zinc-400">
              ¿Ya tienes una cuenta registrada?{" "}
              <Link href="/login" className="text-fuchsia-400 hover:text-fuchsia-300 font-bold underline transition-colors">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
