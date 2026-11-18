"use client";

import React, { useState, useEffect, use, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BellRing,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Clock,
  Star,
  ExternalLink,
  AlertCircle,
  Footprints,
  Smartphone,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import PwaInstallButton from "@/components/pwa/PwaInstallButton";
import { useBeeperRealtime } from "@/hooks/use-beeper-realtime";
import {
  startBeeperAlertLoop,
  stopBeeperAlertLoop,
  playBeeperSound,
  enableScreenWakeLock,
  releaseScreenWakeLock,
  triggerBeeperVibrate,
} from "@/lib/beeper/beeper-audio";

interface TicketData {
  id: string;
  shortCode: string;
  qrToken: string;
  customerName?: string | null;
  tableOrOrderNumber?: string | null;
  status: "PREPARING" | "READY" | "ACKNOWLEDGED" | "DELIVERED" | "EXPIRED";
  ringCount: number;
  lastRingAt?: string | null;
  estimatedReadyAt?: string | null;
  readyAt?: string | null;
  deliveredAt?: string | null;
  rating?: number | null;
  createdAt: string;
}

interface TenantData {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  branding?: any;
}

interface BeeperConfig {
  enabled: boolean;
  soundType: "CHIME" | "BELL" | "DIGITAL" | "VIBRANT";
  defaultPrepMinutes: number;
  googleReviewUrl?: string | null;
  promoBannersJson?: string | null;
}

export default function PublicBeeperTicketPage({
  params,
}: {
  params: Promise<{ qrToken: string }>;
}) {
  const { qrToken } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [config, setConfig] = useState<BeeperConfig | null>(null);

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [ratingSent, setRatingSent] = useState(false);
  const [promoBanners, setPromoBanners] = useState<any[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);

  // Cargar estado inicial del llamador
  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/beeper/public/t/${qrToken}`);
      const data = await res.json();

      if (!data.success || !data.data?.ticket) {
        setError(data.error || "Llamador no encontrado o expirado.");
        return;
      }

      setTicket(data.data.ticket);
      setTenant(data.data.tenant);
      setConfig(data.data.config);
      if (data.data.ticket.rating) {
        setRating(data.data.ticket.rating);
        setRatingSent(true);
      }

      if (data.data.config?.promoBannersJson) {
        try {
          const parsed = JSON.parse(data.data.config.promoBannersJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPromoBanners(parsed);
          }
        } catch {}
      }

      // Guardar token en localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("vidjs_beeper_active_token", qrToken);
      }
    } catch (err: any) {
      setError("Error de conexión al cargar tu llamador.");
    } finally {
      setLoading(false);
    }
  }, [qrToken]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // Manejo de eventos en tiempo real vía SSE
  const handleRealtimeEvent = useCallback(
    (type: string, data: any) => {
      if (data?.ticket && data.ticket.qrToken === qrToken) {
        setTicket((prev) => ({
          ...(prev || {}),
          ...data.ticket,
        }));
      }

      if (type === "BEEPER_TICKET_READY" || type === "BEEPER_TICKET_RING_AGAIN") {
        setTicket((prev) => (prev ? { ...prev, status: "READY", ringCount: (prev.ringCount || 0) + 1 } : null));
        // Disparar loop de alarma sonora y vibración continua
        startBeeperAlertLoop(config?.soundType || "CHIME");
        enableScreenWakeLock();
      } else if (type === "BEEPER_TICKET_ACKNOWLEDGED") {
        setTicket((prev) => (prev ? { ...prev, status: "ACKNOWLEDGED" } : null));
        stopBeeperAlertLoop();
      } else if (type === "BEEPER_TICKET_DELIVERED") {
        setTicket((prev) => (prev ? { ...prev, status: "DELIVERED" } : null));
        stopBeeperAlertLoop();
        releaseScreenWakeLock();
      } else if (type === "BEEPER_TICKET_EXPIRED") {
        setTicket((prev) => (prev ? { ...prev, status: "EXPIRED" } : null));
        stopBeeperAlertLoop();
        releaseScreenWakeLock();
      }
    },
    [qrToken, config?.soundType]
  );

  const { isConnected } = useBeeperRealtime({
    qrToken,
    enabled: !!ticket && ticket.status !== "DELIVERED" && ticket.status !== "EXPIRED",
    onEvent: handleRealtimeEvent,
  });

  // Limpiar loop al desmontar
  useEffect(() => {
    return () => {
      stopBeeperAlertLoop();
      releaseScreenWakeLock();
    };
  }, []);

  // Rotación de banners promocionales
  useEffect(() => {
    if (promoBanners.length <= 1) return;
    const interval = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % promoBanners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [promoBanners.length]);

  // Botón para desbloquear Web Audio & Wake Lock con gesto del usuario
  const unlockAudioAndWakeLock = async () => {
    try {
      playBeeperSound(config?.soundType || "CHIME");
      triggerBeeperVibrate();
      await enableScreenWakeLock();
      setAudioUnlocked(true);
    } catch (e) {
      setAudioUnlocked(true);
    }
  };

  // Acción "Voy en camino"
  const handleAcknowledge = async () => {
    if (!ticket) return;
    try {
      setAcknowledging(true);
      stopBeeperAlertLoop();

      await fetch(`/api/v1/beeper/tickets/${ticket.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACKNOWLEDGE" }),
      });

      setTicket((prev) => (prev ? { ...prev, status: "ACKNOWLEDGED" } : null));
    } catch (err) {
      console.error("Error al confirmar que va en camino:", err);
    } finally {
      setAcknowledging(false);
    }
  };

  // Enviar calificación
  const handleSendRating = async (stars: number) => {
    if (!ticket || ratingSent) return;
    try {
      setRating(stars);
      setRatingSent(true);

      await fetch(`/api/v1/beeper/tickets/${ticket.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: stars }),
      });
    } catch (err) {
      console.error("Error al registrar calificación:", err);
    }
  };

  const handleClearSession = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("vidjs_beeper_active_token");
    }
    stopBeeperAlertLoop();
    releaseScreenWakeLock();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060B14] text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-medium tracking-wide">Cargando estado de tu pedido...</p>
      </div>
    );
  }

  if (error || !ticket || !tenant) {
    return (
      <div className="min-h-screen bg-[#060B14] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Llamador no encontrado</h1>
        <p className="text-sm text-slate-400 max-w-sm mb-6">
          {error || "El llamador solicitado no existe o ya ha sido finalizado."}
        </p>
        <Link
          href={`/b/${tenant?.slug || ""}`}
          onClick={handleClearSession}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold uppercase tracking-wider"
        >
          Ir al Mostrador
        </Link>
      </div>
    );
  }

  const isReady = ticket.status === "READY";
  const isAcknowledged = ticket.status === "ACKNOWLEDGED";
  const isDelivered = ticket.status === "DELIVERED";
  const isPreparing = ticket.status === "PREPARING";

  return (
    <div
      className={`min-h-screen text-white flex flex-col justify-between transition-colors duration-500 ${
        isReady
          ? "bg-[#032014] animate-pulse selection:bg-emerald-400"
          : isDelivered
          ? "bg-[#060B14]"
          : "bg-[#060B14]"
      }`}
    >
      {/* Header White-Label con logo e indicador SSE */}
      <header className="px-5 pt-6 pb-4 border-b border-slate-800/80 bg-[#091120]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/60 p-0.5 shrink-0 shadow-lg">
                <Image
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-emerald-950/40">
                {tenant.name.substring(0, 1)}
              </div>
            )}
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                {isConnected ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    En vivo
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Conectando...
                  </>
                )}
              </span>
              <h1 className="text-sm font-extrabold text-white leading-tight truncate max-w-[200px]">
                {tenant.name}
              </h1>
            </div>
          </div>

          {/* Botón de Sonido / Desbloquear Audio */}
          <button
            type="button"
            onClick={unlockAudioAndWakeLock}
            className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
              audioUnlocked
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-amber-500/20 border-amber-500/40 text-amber-300 animate-bounce"
            }`}
            title={audioUnlocked ? "Sonido y vibración activos" : "Toca para activar timbre"}
          >
            {audioUnlocked ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="text-[11px]">{audioUnlocked ? "Sonido ON" : "Activar"}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 px-5 py-6 max-w-md mx-auto w-full flex flex-col justify-center">
        {/* Banner de Descarga / Instalación PWA (Desaparece automáticamente al instalar) */}
        {!isDelivered && (
          <div className="mb-4">
            <PwaInstallButton variant="banner" />
          </div>
        )}

        {/* Banner de Permiso Sonoro inicial si no lo ha tocado */}
        {!audioUnlocked && !isDelivered && (
          <div
            onClick={unlockAudioAndWakeLock}
            className="cursor-pointer mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-slate-900 border border-amber-500/40 flex items-center justify-between shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-200">Activar aviso sonoro y pantalla activa</p>
                <p className="text-[11px] text-amber-300/70">Evita que la pantalla se apague mientras esperas</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[11px] shrink-0">
              Activar
            </span>
          </div>
        )}

        {/* ===================== ESTADO: PREPARING ===================== */}
        {isPreparing && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4 animate-pulse">
              <Clock className="w-3.5 h-3.5" />
              <span>En Preparación</span>
            </div>

            {/* Número Gigante de Ticket */}
            <div className="relative inline-block mb-3">
              <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-b from-[#0F1E36] to-[#0A1322] border-4 border-amber-500/40 shadow-2xl shadow-amber-950/40 flex flex-col items-center justify-center p-4 mx-auto">
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Tu Turno</span>
                <span className="text-6xl sm:text-7xl font-black text-amber-400 tracking-tight my-1 drop-shadow-md">
                  #{ticket.shortCode}
                </span>
                <span className="text-[11px] text-slate-400">Cocina / Barra</span>
              </div>
            </div>

            {/* Datos opcionales: Cliente / Mesa */}
            {(ticket.customerName || ticket.tableOrOrderNumber) && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 mb-4">
                {ticket.customerName && <span className="font-semibold text-white">{ticket.customerName}</span>}
                {ticket.customerName && ticket.tableOrOrderNumber && <span>•</span>}
                {ticket.tableOrOrderNumber && <span>{ticket.tableOrOrderNumber}</span>}
              </div>
            )}

            <p className="text-sm font-medium text-slate-300 max-w-xs mx-auto leading-relaxed">
              Estamos preparando tu pedido. Tu celular sonará y vibrará cuando esté listo.
            </p>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Puedes tener esta pestaña abierta o en segundo plano</span>
            </div>
          </div>
        )}

        {/* ===================== ESTADO: READY (¡LISTO! LLAMANDO) ===================== */}
        {isReady && (
          <div className="text-center py-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest mb-4 shadow-xl shadow-emerald-950/80 animate-bounce">
              <BellRing className="w-4 h-4" />
              <span>¡TU PEDIDO ESTÁ LISTO!</span>
            </div>

            {/* Número en Verde Brillante Gigante */}
            <div className="relative inline-block mb-6">
              <div className="w-52 h-52 sm:w-60 sm:h-60 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600 border-4 border-white/60 shadow-2xl shadow-emerald-500/50 flex flex-col items-center justify-center p-4 mx-auto animate-pulse">
                <span className="text-xs font-black uppercase tracking-widest text-slate-950/80">Turno</span>
                <span className="text-7xl sm:text-8xl font-black text-slate-950 tracking-tight my-1 drop-shadow-lg">
                  #{ticket.shortCode}
                </span>
                <span className="text-xs font-bold text-slate-950/90 uppercase tracking-wider">¡Retirar Ahora!</span>
              </div>
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight mb-2">¡Acércate al Mostrador!</h2>
            <p className="text-sm text-emerald-200/90 max-w-xs mx-auto mb-6">
              Presenta tu número <strong className="text-white font-bold">#{ticket.shortCode}</strong> para retirar tu
              pedido.
            </p>

            {/* Botón Principal: VOY EN CAMINO */}
            <button
              type="button"
              onClick={handleAcknowledge}
              disabled={acknowledging}
              className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-slate-100 active:scale-95 text-slate-950 font-black text-base shadow-2xl shadow-emerald-950/80 flex items-center justify-center gap-2 transition-all"
            >
              <Footprints className="w-5 h-5 text-emerald-600" />
              <span>{acknowledging ? "Avisando al mostrador..." : "Voy en camino 🏃‍♂️"}</span>
            </button>
          </div>
        )}

        {/* ===================== ESTADO: ACKNOWLEDGED (EN CAMINO) ===================== */}
        {isAcknowledged && (
          <div className="text-center py-6">
            <div className="w-20 h-20 rounded-3xl bg-teal-500/20 border-2 border-teal-500/40 text-teal-400 flex items-center justify-center mx-auto mb-4">
              <Footprints className="w-10 h-10 animate-bounce" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold uppercase tracking-wider mb-3">
              <span>Aviso Enviado</span>
            </div>

            <h2 className="text-3xl font-black text-white tracking-tight">Turno #{ticket.shortCode}</h2>
            <p className="text-sm text-slate-300 max-w-xs mx-auto mt-2 leading-relaxed">
              Le avisamos al personal que vas en camino a retirar. ¡Buen provecho!
            </p>
          </div>
        )}

        {/* ===================== ESTADO: DELIVERED (ENCUESTA EXPRESS) ===================== */}
        {isDelivered && (
          <div className="text-center py-6">
            <div className="w-18 h-18 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">¡Pedido Entregado!</h2>
            <p className="text-xs text-slate-400 mt-1 mb-6">Gracias por tu compra en {tenant.name}</p>

            {/* Widget Encuesta Express de 1 a 5 estrellas */}
            <div className="p-5 rounded-2xl bg-[#0B1526] border border-slate-800 shadow-xl mb-6">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                {ratingSent ? "¡Gracias por tu opinión!" : "¿Cómo fue tu experiencia hoy?"}
              </p>

              <div className="flex items-center justify-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleSendRating(star)}
                    disabled={ratingSent}
                    className="p-1.5 transition-transform hover:scale-125 active:scale-95 disabled:pointer-events-none"
                    aria-label={`Calificar con ${star} estrellas`}
                  >
                    <Star
                      className={`w-8 h-8 ${
                        (rating || 0) >= star
                          ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                          : "text-slate-600 hover:text-amber-400"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {ratingSent && (
                <p className="text-xs text-emerald-400 font-semibold mt-1">
                  Tu puntuación ({rating} / 5) ha sido registrada.
                </p>
              )}
            </div>

            {/* Botón de Google Reviews opcional si el local lo configuró */}
            {config?.googleReviewUrl && (
              <a
                href={config.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 transition-all"
              >
                <span>Dejar reseña en Google Maps</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <Link
              href={`/b/${tenant.slug}`}
              onClick={handleClearSession}
              className="text-xs text-slate-400 hover:text-slate-300 underline"
            >
              Cerrar y volver al mostrador
            </Link>
          </div>
        )}

        {/* Promo Banners Rotativos del Locatario */}
        {!isDelivered && promoBanners.length > 0 && (
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/20 p-4 relative overflow-hidden shadow-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                Sugerencia del Chef / Bar
              </span>
            </div>
            <h3 className="text-sm font-bold text-white leading-tight">
              {promoBanners[bannerIdx]?.title || "Promoción Especial"}
            </h3>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2">
              {promoBanners[bannerIdx]?.description ||
                "Consulta en mostrador por nuestros tragos y postres especiales de hoy."}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-5 py-4 border-t border-slate-800/60 text-center bg-[#070D18]">
        <div className="max-w-md mx-auto flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Sin apps requeridas
          </span>
          <span className="font-extrabold text-slate-400">VIDJS BEEPER</span>
        </div>
      </footer>
    </div>
  );
}
