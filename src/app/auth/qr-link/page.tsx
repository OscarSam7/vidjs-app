"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { Laptop, Smartphone, CheckCircle2, XCircle, ShieldCheck, ArrowRight, AlertTriangle, RefreshCw, Eye, EyeOff } from "lucide-react";
import { CynkoLogo } from "@/components/ui/ZynkoLogo";

interface QrLinkPageProps {
  searchParams: Promise<{ code?: string; pin?: string }>;
}

export default function QrLinkPage(props: QrLinkPageProps) {
  const resolvedSearchParams = use(props.searchParams);
  const code = resolvedSearchParams?.code || "";
  const pin = resolvedSearchParams?.pin || "";

  const [sessionInfo, setSessionInfo] = useState<{
    valid: boolean;
    deviceInfo: string;
    ipAddress?: string;
    status: string;
    expiresAt: string;
  } | null>(null);

  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    role: string;
    tenantName?: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  // 1. Cargar info del QR y sesión del celular
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        // Cargar información de la solicitud QR
        const infoRes = await fetch(`/api/v1/auth/qr/info?code=${encodeURIComponent(code)}&pin=${encodeURIComponent(pin)}`);
        const infoData = await infoRes.json();

        if (!infoRes.ok || !infoData.valid) {
          if (isMounted) {
            setErrorMsg(infoData.error || "El código QR ha expirado o ya no es válido.");
            setSessionInfo(infoData);
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) setSessionInfo(infoData);

        // Verificar si este teléfono ya tiene sesión iniciada
        const meRes = await fetch("/api/v1/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData?.user && isMounted) {
            setCurrentUser({
              name: meData.user.name,
              email: meData.user.email,
              role: meData.user.role,
              tenantName: meData.tenant?.name || meData.user.tenantName,
            });
          }
        }
      } catch (err) {
        if (isMounted) setErrorMsg("Error de conexión al verificar el dispositivo.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (code || pin) {
      loadData();
    } else {
      setIsLoading(false);
      setErrorMsg("No se proporcionó ningún código de vinculación.");
    }

    return () => {
      isMounted = false;
    };
  }, [code, pin]);

  // 2. Autorizar o Rechazar
  const handleAuthorize = async (action: "APPROVE" | "REJECT") => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/auth/qr/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          pin,
          action,
          email: loginEmail || undefined,
          password: loginPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo autorizar el dispositivo");
      }

      if (action === "APPROVE") {
        setSuccessStatus("APPROVED");
      } else {
        setSuccessStatus("REJECTED");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Ocurrió un error inesperado al procesar la vinculación");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(139,92,246,0.2),rgba(255,255,255,0))] text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-2">
            <CynkoLogo size="lg" subtitle="VINCULACIÓN RÁPIDA DE DISPOSITIVOS" />
          </div>
          <p className="text-xs text-zinc-400">
            Conecta tu cuenta en PC, pantalla o laptop de forma segura
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Visual Linking Header */}
          <div className="flex items-center justify-center gap-6 py-4 mb-4 border-b border-zinc-800/80">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-2xl bg-fuchsia-950/60 border border-fuchsia-700/60 flex items-center justify-center shadow-lg shadow-fuchsia-950/50">
                <Smartphone className="w-7 h-7 text-fuchsia-400" />
              </div>
              <span className="text-[11px] font-bold text-zinc-300">Tu Celular</span>
            </div>

            <div className="flex items-center gap-1 text-cyan-400 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <div className="w-6 h-0.5 bg-gradient-to-r from-fuchsia-500 to-cyan-500" />
              <div className="w-2 h-2 rounded-full bg-fuchsia-400" />
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-700/60 flex items-center justify-center shadow-lg shadow-cyan-950/50">
                <Laptop className="w-7 h-7 text-cyan-400" />
              </div>
              <span className="text-[11px] font-bold text-zinc-300">PC / Dispositivo</span>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="py-8 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              <p className="text-sm text-zinc-300 font-medium">Verificando solicitud de vinculación...</p>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && !isLoading && (
            <div className="mb-4 p-4 rounded-2xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-300">Solicitud no válida o expirada</p>
                <p className="mt-0.5 text-zinc-300">{errorMsg}</p>
                <Link
                  href="/login"
                  className="inline-block mt-3 px-3 py-1.5 rounded-xl bg-red-900/60 hover:bg-red-800 text-white font-bold text-xs"
                >
                  Volver al Inicio de Sesión
                </Link>
              </div>
            </div>
          )}

          {/* Éxito - Aprobado */}
          {successStatus === "APPROVED" && (
            <div className="py-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/60 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950/50">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">¡Dispositivo Vinculado!</h3>
                <p className="text-xs text-zinc-300 mt-1 max-w-xs mx-auto">
                  Tu computadora ({sessionInfo?.deviceInfo || "PC"}) ha iniciado sesión correctamente y ya está lista para usarse.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-left text-xs space-y-1">
                <div className="text-[11px] text-zinc-500 uppercase font-mono">Dispositivo Conectado</div>
                <div className="font-bold text-emerald-400">{sessionInfo?.deviceInfo || "Navegador Web en PC"}</div>
                <div className="text-[11px] text-zinc-400">Estado: Sesión activa y sincronizada</div>
              </div>

              <Link
                href="/dashboard"
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                <span>Ir a mi Panel en este Celular</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Éxito - Rechazado */}
          {successStatus === "REJECTED" && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-red-500/20 border border-red-500/50 flex items-center justify-center mx-auto text-red-400">
                <XCircle className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Solicitud Rechazada</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  El acceso para el dispositivo fue bloqueado y no se inició ninguna sesión.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs inline-block text-center"
              >
                Cerrar
              </Link>
            </div>
          )}

          {/* Pantalla Normal de Confirmación */}
          {!isLoading && !successStatus && sessionInfo?.valid && (
            <div className="space-y-5">
              <div className="text-center">
                <h3 className="text-base font-bold text-white">
                  ¿Deseas iniciar sesión en tu PC?
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Confirma si eres tú quien solicitó ingresar desde la computadora
                </p>
              </div>

              {/* Tarjeta de Información del Dispositivo */}
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <span className="text-zinc-400">Dispositivo detectado:</span>
                  <span className="font-bold text-cyan-400">{sessionInfo.deviceInfo}</span>
                </div>
                {sessionInfo.ipAddress && (
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                    <span className="text-zinc-400">Dirección IP:</span>
                    <span className="font-mono text-zinc-300">{sessionInfo.ipAddress}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Código de solicitud:</span>
                  <span className="font-mono font-bold text-fuchsia-400">{sessionInfo.pin}</span>
                </div>
              </div>

              {/* Si el teléfono ya está autenticado */}
              {currentUser ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-800/40 text-xs space-y-1">
                    <div className="text-[10px] uppercase font-mono text-purple-300">Cuenta activa en este celular</div>
                    <div className="font-bold text-white">{currentUser.name}</div>
                    <div className="text-[11px] text-zinc-400">{currentUser.email} &bull; <span className="text-purple-300 font-mono font-bold">{currentUser.role}</span></div>
                    {currentUser.tenantName && (
                      <div className="text-[11px] text-emerald-400 font-medium">{currentUser.tenantName}</div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleAuthorize("APPROVE")}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 cursor-pointer hover:scale-[1.02] transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Autorizando PC...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-5 h-5" />
                          <span>Autorizar e Iniciar Sesión en PC</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleAuthorize("REJECT")}
                      className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-red-300 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      No reconozco este dispositivo (Rechazar)
                    </button>
                  </div>
                </div>
              ) : (
                /* Si el teléfono aún no está autenticado, ingresa sus credenciales */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAuthorize("APPROVE");
                  }}
                  className="space-y-4 pt-2"
                >
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-[11px] text-amber-200">
                    Ingresa con tu correo y contraseña para autorizar la conexión en tu PC y en este celular:
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="admin@cynko.app"
                      className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2.5 pr-11 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        aria-label={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1 rounded-lg cursor-pointer"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verificando y Conectando...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>Iniciar Sesión y Autorizar PC</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-zinc-500">
          CYNKO OS &bull; Protocolo Seguro de Vinculación Instantánea QR
        </p>
      </div>
    </div>
  );
}
