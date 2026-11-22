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
  Clock,
  ShieldCheck,
  MessageCircle,
  LogIn,
  Eye,
  EyeOff
} from "lucide-react";
import { ZynkoLogo } from "@/components/ui/ZynkoLogo";

export default function RegisterPage() {
  const [ownerName, setOwnerName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState<"FULL_VENUE" | "AUDIO_CABINA_PRO" | "KARAOKE_BAR">("FULL_VENUE");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredData, setRegisteredData] = useState<{
    venueName: string;
    ownerName: string;
    email: string;
    phone?: string;
  } | null>(null);

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

      // Si está pendiente de aprobación por el Super Admin (Opción A)
      if (data.pendingApproval) {
        setRegisteredData({
          venueName,
          ownerName,
          email,
          phone,
        });
        return;
      }

      // Redirección si se activase automáticamente
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
            Configura tu local y comienza a operar con pedidos, cabina de audio o control de acceso.
          </p>
        </div>

        {/* Tarjeta de Registro o Confirmación de Espera */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl">
          {registeredData ? (
            /* Pantalla de Confirmación de Solicitud Recibida (Opción A) */
            <div className="text-center space-y-6 py-4 animate-fade-in">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-fuchsia-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl relative z-10">
                  <Clock className="w-8 h-8 animate-spin-slow" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-[11px] font-mono font-black text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>SOLICITUD REGISTRADA CON ÉXITO</span>
                </div>
                <h2 className="text-2xl font-black text-white">
                  ¡Pendiente de Aprobación!
                </h2>
                <p className="text-sm text-zinc-300 max-w-sm mx-auto leading-relaxed">
                  Tu establecimiento <strong className="text-white font-bold">{registeredData.venueName}</strong> ha sido creado en el sistema.
                </p>
              </div>

              {/* Caja de Datos */}
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Dueño registrado:</span>
                  <span className="text-white font-bold">{registeredData.ownerName}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Correo:</span>
                  <span className="text-cyan-400 font-mono">{registeredData.email}</span>
                </div>
                {registeredData.phone && (
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Teléfono / WhatsApp:</span>
                    <span className="text-emerald-400 font-mono">{registeredData.phone}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
                  <span className="text-zinc-400">Estado de cuenta:</span>
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-black">
                    REVISIÓN SUPER ADMIN
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                Para garantizar la seguridad de la plataforma, el Super Administrador activará tu acceso en breve. Te notificaremos una vez habilitado.
              </p>

              {/* Botones de Acción */}
              <div className="pt-2 space-y-3">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `¡Hola! Acabo de registrar mi local "${registeredData.venueName}" en CYNKO OS con el correo ${registeredData.email} y solicito la activación de mi cuenta.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-xs rounded-xl shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Avisar al Administrador por WhatsApp</span>
                </a>

                <Link
                  href="/login"
                  className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ir a Iniciar Sesión</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Formulario Normal de Registro */
            <>
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
                          ? "bg-pink-950/40 border-pink-500/80 ring-1 ring-pink-500/40"
                          : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <Mic className={`w-4 h-4 mb-2 ${serviceType === "KARAOKE_BAR" ? "text-pink-400" : "text-zinc-500"}`} />
                      <div>
                        <p className="text-xs font-black text-white">Karaoke Bar</p>
                        <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">Rotación justa y dedicatorias</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Nombre del Establecimiento */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Nombre del Establecimiento / Marca *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      placeholder="Ej. Sky Lounge Bar, Discoteca Olimpo..."
                      className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Nombre del Propietario */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Nombre Completo del Responsable *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Ej. Carlos Mendoza"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Correo Electrónico */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Correo Electrónico (Tu usuario de acceso) *
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
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-11 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1 rounded-lg cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
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
                        <span>Enviando solicitud de registro...</span>
                      </>
                    ) : (
                      <>
                        <span>Solicitar Registro de Local</span>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
