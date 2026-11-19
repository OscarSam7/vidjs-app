"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Lock, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from "lucide-react";
import { CynkoLogo } from "@/components/ui/ZynkoLogo";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default function ResetPasswordPage(props: ResetPasswordPageProps) {
  const resolvedParams = use(props.searchParams);
  const token = resolvedParams?.token || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isValidating, setIsValidating] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<{
    valid: boolean;
    email?: string;
    name?: string;
    establishment?: string;
    error?: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // 1. Validar el token al montar
  useEffect(() => {
    let isMounted = true;

    async function checkToken() {
      if (!token) {
        if (isMounted) {
          setTokenInfo({ valid: false, error: "No se proporcionó ningún token de recuperación." });
          setIsValidating(false);
        }
        return;
      }

      try {
        const res = await fetch(`/api/v1/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (isMounted) {
          if (!res.ok || !data.valid) {
            setTokenInfo({ valid: false, error: data.error || "El enlace ha expirado o no es válido." });
          } else {
            setTokenInfo(data);
          }
        }
      } catch {
        if (isMounted) {
          setTokenInfo({ valid: false, error: "Error de conexión al validar el enlace." });
        }
      } finally {
        if (isMounted) setIsValidating(false);
      }
    }

    checkToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // 2. Enviar nueva contraseña
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;

    if (password.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden. Por favor verifícalas.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo actualizar la contraseña");
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Error inesperado al restablecer la contraseña");
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
            <CynkoLogo size="xl" subtitle="RESTABLECER CONTRASEÑA" />
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Crea una nueva contraseña segura para acceder a CYNKO OS
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/85 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Validando Token */}
          {isValidating && (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              <p className="text-xs text-zinc-300">Validando enlace de seguridad...</p>
            </div>
          )}

          {/* Token Inválido o Expirado */}
          {!isValidating && tokenInfo && !tokenInfo.valid && (
            <div className="text-center space-y-5 py-4">
              <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-800/60 flex items-center justify-center mx-auto text-red-400">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Enlace no válido o expirado</h3>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  {tokenInfo.error || "El enlace ya fue utilizado o superó el tiempo límite de validez (60 minutos)."}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/forgot-password"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-xs inline-block text-center shadow-lg"
                >
                  Solicitar un Nuevo Enlace
                </Link>
              </div>
            </div>
          )}

          {/* Éxito: Contraseña Actualizada */}
          {!isValidating && isSuccess && (
            <div className="text-center space-y-5 py-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/60 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950/50">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">¡Contraseña Actualizada!</h3>
                <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                  Tu contraseña ha sido modificada correctamente. Ya puedes acceder con tus nuevas credenciales.
                </p>
              </div>

              <Link
                href="/login"
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/40 cursor-pointer"
              >
                <span>Iniciar Sesión Ahora</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Formulario de Cambio de Contraseña */}
          {!isValidating && tokenInfo && tokenInfo.valid && !isSuccess && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span>Definir Nueva Contraseña</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Para la cuenta: <strong className="text-white">{tokenInfo.email}</strong>
                  {tokenInfo.establishment && (
                    <span className="block text-[11px] text-emerald-400 mt-0.5">Local: {tokenInfo.establishment}</span>
                  )}
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Nueva Contraseña (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !password || !confirmPassword}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-black font-black text-xs rounded-xl transition-all shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando nueva contraseña...</span>
                  </>
                ) : (
                  <span>Guardar Contraseña e Ingresar</span>
                )}
              </button>
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
