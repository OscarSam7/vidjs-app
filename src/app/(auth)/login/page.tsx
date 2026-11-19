"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  QrCode,
  Sparkles,
  Smartphone,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Laptop,
  Mail,
  KeyRound,
  X,
  ShieldCheck
} from "lucide-react";
import { ZynkoLogo } from "@/components/ui/ZynkoLogo";
import { QRCodeImage } from "@/components/ui/QRCodeImage";

interface QrSessionData {
  code: string;
  pin: string;
  qrUrl: string;
  expiresAt: string;
  expiresInSeconds: number;
}

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<"QR" | "PASSWORD">("QR");

  // Estados Formulario Password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Estados QR Login
  const [qrData, setQrData] = useState<QrSessionData | null>(null);
  const [qrStatus, setQrStatus] = useState<"LOADING" | "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED">("LOADING");
  const [qrSecondsLeft, setQrSecondsLeft] = useState(180);
  const [approvedUser, setApprovedUser] = useState<{ name: string; role: string } | null>(null);

  // Estados para Acceso con Google / Gmail
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
  const [gmailAddress, setGmailAddress] = useState("");
  const [gmailPin, setGmailPin] = useState("");
  const [gmailStep, setGmailStep] = useState<"EMAIL" | "PIN">("EMAIL");
  const [isGmailLoading, setIsGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Inicializar Google Identity Services si existe clientId configurado
  useEffect(() => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId || typeof window === "undefined") return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (response.credential) {
              handleGoogleCredential(response.credential);
            }
          },
        });
      }
    };
    document.body.appendChild(script);
    return () => {
      try {
        document.body.removeChild(script);
      } catch {}
    };
  }, []);

  const handleGoogleCredential = async (credential: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.notRegistered) {
          setError(`El correo ${data.email} no está registrado en CYNKO OS. Puedes registrar tu local con 30 días gratis.`);
        } else {
          throw new Error(data.error || "No se pudo autenticar con Google");
        }
        return;
      }
      window.location.href = data.redirectUrl || "/dashboard";
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Error al autenticar con Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleClick = () => {
    if (typeof window !== "undefined" && (window as any).google?.accounts?.id && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      (window as any).google.accounts.id.prompt();
    } else {
      setIsGmailModalOpen(true);
      setGmailStep("EMAIL");
      setGmailError(null);
    }
  };

  const handleRequestGmailPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailAddress.trim()) return;
    setIsGmailLoading(true);
    setGmailError(null);
    try {
      const res = await fetch("/api/v1/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: gmailAddress.trim(), requestPin: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.notRegistered) {
          setGmailError(`El correo ${data.email} no está registrado en CYNKO OS.`);
        } else {
          throw new Error(data.error || "Error al solicitar código");
        }
        return;
      }
      setGmailStep("PIN");
    } catch (err: unknown) {
      if (err instanceof Error) setGmailError(err.message);
      else setGmailError("Error al conectar con el servidor");
    } finally {
      setIsGmailLoading(false);
    }
  };

  const handleVerifyGmailPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailPin.trim()) return;
    setIsGmailLoading(true);
    setGmailError(null);
    try {
      const res = await fetch("/api/v1/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: gmailAddress.trim(), pin: gmailPin.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Código inválido o expirado");
      }
      window.location.href = data.redirectUrl || "/dashboard";
    } catch (err: unknown) {
      if (err instanceof Error) setGmailError(err.message);
      else setGmailError("Error al verificar código");
    } finally {
      setIsGmailLoading(false);
    }
  };

  // Función para generar una nueva sesión QR
  const generateQrSession = useCallback(async () => {
    setQrStatus("LOADING");
    setError(null);

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    try {
      const res = await fetch("/api/v1/auth/qr/generate", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.code) {
        throw new Error(data.error || "No se pudo generar el código QR");
      }

      setQrData(data);
      setQrStatus("PENDING");
      setQrSecondsLeft(data.expiresInSeconds || 180);

      // Iniciar cuenta regresiva visual
      timerIntervalRef.current = setInterval(() => {
        setQrSecondsLeft((prev) => {
          if (prev <= 1) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            setQrStatus("EXPIRED");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Iniciar sondeo activo (polling cada 1.5s)
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/v1/auth/qr/status?code=${encodeURIComponent(data.code)}`);
          const statusData = await statusRes.json();

          if (statusData.status === "APPROVED") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

            setQrStatus("APPROVED");
            if (statusData.user) {
              setApprovedUser({ name: statusData.user.name, role: statusData.user.role });
            }

            // Redirigir suavemente tras mostrar confirmación
            setTimeout(() => {
              window.location.href = statusData.redirectUrl || "/dashboard";
            }, 1200);
          } else if (statusData.status === "REJECTED") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            setQrStatus("REJECTED");
          } else if (statusData.status === "EXPIRED") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            setQrStatus("EXPIRED");
          }
        } catch {
          // Ignorar micro-errores temporales de red durante sondeo
        }
      }, 1500);
    } catch (err: unknown) {
      setQrStatus("EXPIRED");
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error de conexión al generar QR");
      }
    }
  }, []);

  // Generar QR al montar o al cambiar al modo QR
  useEffect(() => {
    if (authMode === "QR") {
      generateQrSession();
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [authMode, generateQrSession]);

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
        throw new Error(data.error?.message || data.error || "Error al iniciar sesión");
      }

      // Redirección inteligente respetando callbackUrl y rol de usuario
      const userRole = data.user?.role;
      const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const callback = searchParams?.get("callbackUrl");

      if (callback) {
        window.location.href = callback;
      } else if (userRole === "DJ" || userRole === "OPERATOR") {
        window.location.href = "/dashboard/dj/pro";
      } else if (userRole === "CAJERO") {
        window.location.href = "/dashboard/gastronomy/cashier";
      } else if (userRole === "MOZO") {
        window.location.href = "/dashboard/gastronomy/waiters";
      } else if (userRole === "ENCARGADO_COCINA" || userRole === "COCINERO") {
        window.location.href = "/dashboard/gastronomy/kitchen";
      } else if (userRole === "ENCARGADO_BARRA" || userRole === "OPERADOR_BARRA") {
        window.location.href = "/dashboard/gastronomy/bar";
      } else {
        window.location.href = "/dashboard";
      }
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

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#070709] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,50,220,0.25),rgba(255,255,255,0))] flex flex-col justify-center items-center px-4 py-12">
      {/* Glow decorative elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <ZynkoLogo size="xl" subtitle="VENUES & ENTERTAINMENT OS" />
          </div>
          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
            Plataforma Integral de Gestión, Entretenimiento y Asistencia para Locales
          </p>
        </div>

        {/* Banner Showcase Comercial */}
        <div className="mb-5">
          <Link
            href="/showcase"
            className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/80 via-zinc-900 to-cyan-950/80 border border-purple-500/40 hover:border-cyan-400/60 flex items-center justify-between gap-3 text-left transition-all group shadow-lg"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                  ¿Quieres conocer todo lo que CYNKO OS puede hacer?
                </div>
                <div className="text-[10px] text-zinc-400">
                  Explorar Showcase Comercial y Simulador en Vivo &rarr;
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900/85 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden relative">
          {/* BOTÓN OFICIAL GOOGLE / GMAIL */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-800 font-bold text-xs flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all border border-zinc-200 cursor-pointer active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar con Google / Gmail</span>
            </button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-zinc-800" />
              <span className="absolute px-3 bg-zinc-900 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                o ingresa con
              </span>
            </div>
          </div>

          {/* Selector de Modo: QR vs Contraseña */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode("QR");
                setError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === "QR"
                  ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-950/50"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <QrCode className="w-4 h-4 text-cyan-300" />
              <span>Acceso con QR</span>
              <span className="px-1.5 py-0.2 bg-white/20 text-[9px] font-mono rounded text-white">Rápido</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode("PASSWORD");
                setError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === "PASSWORD"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/50"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-purple-300" />
              <span>Contraseña</span>
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* MODO 1: ACCESO QR (ESTILO WHATSAPP WEB) */}
          {authMode === "QR" && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-base font-bold text-white flex items-center justify-center gap-2">
                  <Laptop className="w-4 h-4 text-cyan-400" />
                  <span>Abre tu cuenta escaneando con el celular</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  En tu celular toca <strong>"Escanear PC"</strong> o usa la cámara para entrar al instante
                </p>
              </div>

              {/* Contenedor del Código QR */}
              <div className="relative flex flex-col items-center justify-center p-4 bg-zinc-950/90 border border-cyan-500/30 rounded-2xl shadow-inner">
                {qrStatus === "LOADING" && (
                  <div className="w-[200px] h-[200px] flex flex-col items-center justify-center gap-2 text-zinc-400">
                    <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                    <span className="text-xs">Generando código seguro...</span>
                  </div>
                )}

                {qrStatus === "PENDING" && qrData && (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="p-3 bg-white rounded-2xl shadow-2xl relative group">
                      <QRCodeImage
                        value={qrData.qrUrl}
                        size={190}
                        darkColor="#090d16"
                        lightColor="#ffffff"
                      />
                      {/* Logo central sutil en el QR */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-cyan-500/80 flex items-center justify-center shadow-md">
                          <Smartphone className="w-5 h-5 text-cyan-400" />
                        </div>
                      </div>
                    </div>

                    {/* PIN manual alternativo */}
                    <div className="text-center space-y-1">
                      <div className="text-[11px] text-zinc-400">
                        O ingresa este PIN en tu celular:
                      </div>
                      <div className="inline-block px-3 py-1 bg-zinc-900 border border-cyan-500/40 rounded-xl font-mono text-sm font-black tracking-widest text-cyan-300 shadow-sm">
                        {qrData.pin}
                      </div>
                    </div>
                  </div>
                )}

                {qrStatus === "APPROVED" && (
                  <div className="w-[200px] h-[200px] flex flex-col items-center justify-center gap-2 text-emerald-400 animate-in zoom-in-95 duration-300">
                    <CheckCircle2 className="w-16 h-16 animate-bounce" />
                    <span className="font-bold text-white text-sm">¡Dispositivo Autorizado!</span>
                    {approvedUser && (
                      <span className="text-xs text-zinc-300">{approvedUser.name}</span>
                    )}
                    <span className="text-[11px] text-emerald-400">Ingresando al sistema...</span>
                  </div>
                )}

                {qrStatus === "REJECTED" && (
                  <div className="w-[200px] h-[200px] flex flex-col items-center justify-center gap-3 text-red-400 text-center p-3">
                    <AlertTriangle className="w-12 h-12 text-red-400" />
                    <span className="font-bold text-xs">Solicitud rechazada desde el teléfono</span>
                    <button
                      type="button"
                      onClick={generateQrSession}
                      className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold"
                    >
                      Intentar de nuevo
                    </button>
                  </div>
                )}

                {qrStatus === "EXPIRED" && (
                  <div className="w-[200px] h-[200px] flex flex-col items-center justify-center gap-3 text-zinc-400 text-center p-3">
                    <AlertTriangle className="w-10 h-10 text-amber-400" />
                    <span className="text-xs text-zinc-300">El código QR ha expirado por seguridad</span>
                    <button
                      type="button"
                      onClick={generateQrSession}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Generar Nuevo Código</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Status y Guía */}
              {qrStatus === "PENDING" && (
                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Esperando escaneo móvil...</span>
                    </span>
                    <span className="font-mono text-zinc-500">Expira en {formatSeconds(qrSecondsLeft)}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
                    <div className="font-bold text-cyan-300">Acceso ultrarrápido desde el celular:</div>
                    <p>1. Entra a tu app CYNKO en el teléfono.</p>
                    <p>2. Toca el botón <strong>"Escanear PC"</strong> en la barra superior.</p>
                    <p>3. Apunta tu cámara a este código y ¡entrarás de inmediato!</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODO 2: ACCESO TRADICIONAL CON CONTRASEÑA */}
          {authMode === "PASSWORD" && (
            <div>
              <div className="mb-5">
                <h2 className="text-base font-bold text-white">Ingreso con Contraseña</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Ingresa tus credenciales registradas
                </p>
              </div>

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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-zinc-300">
                      Contraseña
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-[11px] text-fuchsia-400 hover:text-fuchsia-300 transition-colors font-semibold"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
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
            </div>
          )}

          {/* Enlace a Registro de Nuevo Establecimiento */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center">
            <p className="text-xs text-zinc-400">
              ¿No tienes una cuenta aún?{" "}
              <Link
                href="/register"
                className="text-fuchsia-400 hover:text-fuchsia-300 font-bold underline transition-colors"
              >
                Registra tu local aquí
              </Link>
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
          Aislamiento multi-tenant seguro &bull; Vinculación con Cámara QR y Google &copy; {new Date().getFullYear()} CYNKO OS
        </p>
      </div>

      {/* MODAL ACCESO DIRECTO CON GMAIL */}
      {isGmailModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsGmailModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6 text-white space-y-5"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Acceso Rápido con Gmail</h3>
                  <p className="text-[11px] text-zinc-400">Ingresa sin contraseña verificando tu correo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGmailModalOpen(false)}
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {gmailError && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{gmailError}</span>
              </div>
            )}

            {gmailStep === "EMAIL" ? (
              <form onSubmit={handleRequestGmailPin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Tu dirección de correo Gmail:
                  </label>
                  <input
                    type="email"
                    required
                    value={gmailAddress}
                    onChange={(e) => setGmailAddress(e.target.value)}
                    placeholder="ejemplo@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Te enviaremos un código de seguridad de 6 dígitos para acceder al instante.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isGmailLoading || !gmailAddress.trim()}
                  className="w-full py-3 rounded-xl bg-white hover:bg-zinc-100 text-black font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isGmailLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verificando Gmail...</span>
                    </>
                  ) : (
                    <span>Enviar Código a mi Gmail</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyGmailPin} className="space-y-4">
                <div className="p-3 bg-zinc-900 rounded-xl text-xs text-zinc-300 space-y-1">
                  <p>Código enviado a: <strong className="text-white">{gmailAddress}</strong></p>
                  <p className="text-[11px] text-zinc-400">Revisa tu bandeja de entrada o spam.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Código de 6 dígitos recibido:
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={gmailPin}
                    onChange={(e) => setGmailPin(e.target.value)}
                    placeholder="123456"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-center text-2xl font-mono font-bold tracking-widest text-cyan-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isGmailLoading || gmailPin.length < 6}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isGmailLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Accediendo...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirmar y Entrar al Panel</span>
                    </>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setGmailStep("EMAIL")}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Cambiar de correo
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
