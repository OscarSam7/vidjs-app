"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle2, MessageCircle, AlertCircle, RefreshCw, KeyRound } from "lucide-react";
import { CynkoLogo } from "@/components/ui/ZynkoLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo procesar la solicitud");
      }

      setIsSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Error inesperado al solicitar recuperación");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,50,220,0.25),rgba(255,255,255,0))] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-3">
            <CynkoLogo size="xl" subtitle="RECUPERACIÓN DE CUENTA" />
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Restablece tu contraseña de acceso para tu establecimiento
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/85 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {isSubmitted ? (
            /* Pantalla de confirmación */
            <div className="text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/60 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950/50">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h2 className="text-lg font-black text-white">¡Instrucciones Enviadas!</h2>
                <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                  Si la dirección <strong className="text-white font-mono">{email}</strong> está registrada en el sistema, recibirás un correo con el enlace seguro para crear tu nueva contraseña.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-left text-xs space-y-2 text-zinc-400">
                <p className="font-semibold text-zinc-200">Recomendaciones:</p>
                <p>&bull; Revisa tu bandeja de entrada y tu carpeta de <strong>Spam o Correo no deseado</strong>.</p>
                <p>&bull; El enlace tiene una validez de <strong>60 minutos</strong> por seguridad.</p>
              </div>

              {/* Botón Asistencia WhatsApp de Emergencia */}
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/40 text-center space-y-2">
                <p className="text-xs font-bold text-white">¿Eres dueño y necesitas asistencia inmediata?</p>
                <p className="text-[11px] text-zinc-400">
                  Si no tienes acceso a tu correo, el Super Administrador de CYNKO puede ayudarte a verificar tu cuenta.
                </p>
                <a
                  href={`https://wa.me/595982823616?text=${encodeURIComponent(
                    `Hola, soy dueño de un establecimiento en CYNKO OS y requiero asistencia para recuperar mi contraseña de la cuenta: ${email}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Contactar a Soporte por WhatsApp</span>
                </a>
              </div>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white font-semibold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver a Iniciar Sesión</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Formulario */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <KeyRound className="w-4 h-4 text-fuchsia-400" />
                  <span>¿Olvidaste tu contraseña?</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Ingresa el correo electrónico asociado a tu cuenta y te enviaremos un enlace seguro para restablecerla.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs space-y-2.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                  <a
                    href={`https://wa.me/595982823616?text=${encodeURIComponent(
                      `Hola, necesito asistencia para recuperar mi contraseña en CYNKO OS para la cuenta: ${email}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-current" />
                    <span>Solicitar recuperación por WhatsApp</span>
                  </a>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Correo Electrónico Registrado</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@establecimiento.com"
                  className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="w-full py-3 px-4 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-fuchsia-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enviando enlace...</span>
                  </>
                ) : (
                  <span>Enviar Enlace de Recuperación</span>
                )}
              </button>

              <div className="pt-3 border-t border-zinc-800 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Regresar al Inicio de Sesión</span>
                </Link>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-zinc-500">
          CYNKO OS &bull; Plataforma Segura Multi-Tenant
        </p>
      </div>
    </div>
  );
}
