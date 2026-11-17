"use client";

import React, { useState, useEffect, use, useRef, useCallback } from "react";
import Image from "next/image";
import { QRCodeImage } from "@/components/ui/QRCodeImage";
import {
  BellRing,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  CheckCircle2,
  Maximize2,
  Minimize2,
  QrCode,
  UtensilsCrossed,
} from "lucide-react";
import { useBeeperRealtime } from "@/hooks/use-beeper-realtime";
import { playBeeperSound } from "@/lib/beeper/beeper-audio";

interface TVTicket {
  id: string;
  shortCode: string;
  customerName?: string | null;
  tableOrOrderNumber?: string | null;
  status: "PREPARING" | "READY" | "ACKNOWLEDGED" | "DELIVERED" | "EXPIRED";
  ringCount: number;
  readyAt?: string | null;
  createdAt: string;
}

interface TVTenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  venueAddress?: string | null;
}

export default function SaloonTVDisplayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<TVTenant | null>(null);
  const [tickets, setTickets] = useState<TVTicket[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [soundType, setSoundType] = useState<"CHIME" | "BELL" | "DIGITAL" | "VIBRANT">("CHIME");

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const soundTypeRef = useRef(soundType);
  soundTypeRef.current = soundType;

  // Reloj en tiempo real
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cargar datos iniciales
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/beeper/public/${slug}`);
      const data = await res.json();

      if (data.success && data.data?.tenant) {
        setTenant(data.data.tenant);
        if (data.data.config?.soundType) {
          setSoundType(data.data.config.soundType);
        }

        // Consultar tickets activos del tenant
        const ticketsRes = await fetch(`/api/v1/beeper/tickets?tenantId=${data.data.tenant.id}`);
        const ticketsData = await ticketsRes.json();
        if (ticketsData.success && Array.isArray(ticketsData.data?.tickets)) {
          setTickets(ticketsData.data.tickets);
        }
      }
    } catch (err) {
      console.error("Error al cargar pantalla TV:", err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejador de eventos en tiempo real vía SSE para el TV
  const handleRealtimeEvent = useCallback((type: string, data: any) => {
    if (type === "BEEPER_TICKET_CREATED" && data?.ticket) {
      setTickets((prev) => [data.ticket, ...prev.filter((t) => t.id !== data.ticket.id)]);
    } else if (type === "BEEPER_TICKET_READY" && data?.ticket) {
      setTickets((prev) => [
        data.ticket,
        ...prev.filter((t) => t.id !== data.ticket.id),
      ]);
      // Sonar timbre en la TV si el sonido está habilitado
      if (soundEnabledRef.current) {
        playBeeperSound(soundTypeRef.current);
      }
    } else if (type === "BEEPER_TICKET_RING_AGAIN" && data?.ticket) {
      if (soundEnabledRef.current) {
        playBeeperSound(soundTypeRef.current);
      }
    } else if (type === "BEEPER_TICKET_ACKNOWLEDGED" && data?.ticket) {
      setTickets((prev) =>
        prev.map((t) => (t.id === data.ticket.id ? { ...t, status: "ACKNOWLEDGED" } : t))
      );
    } else if (type === "BEEPER_TICKET_DELIVERED" && data?.ticket) {
      setTickets((prev) => prev.filter((t) => t.id !== data.ticket.id));
    } else if (type === "BEEPER_TICKET_EXPIRED" && data?.ticket) {
      setTickets((prev) => prev.filter((t) => t.id !== data.ticket.id));
    }
  }, []);

  const { isConnected } = useBeeperRealtime({
    tenantId: tenant?.id || null,
    enabled: !!tenant?.id,
    onEvent: handleRealtimeEvent,
  });

  // Activar sonido con interacción
  const toggleSound = () => {
    if (!soundEnabled) {
      playBeeperSound(soundType);
      setSoundEnabled(true);
    } else {
      setSoundEnabled(false);
    }
  };

  // Alternar pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const preparingTickets = tickets.filter((t) => t.status === "PREPARING");
  const readyTickets = tickets.filter((t) => t.status === "READY" || t.status === "ACKNOWLEDGED");

  const counterQrUrl = typeof window !== "undefined" ? `${window.location.origin}/b/${slug}` : `https://vidjs.app/b/${slug}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050912] text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold tracking-wider uppercase text-slate-300">Iniciando Pantalla Kiosco TV...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050A14] text-white flex flex-col select-none overflow-hidden font-sans">
      {/* Top Header Bar de la Pantalla TV */}
      <header className="px-8 py-5 border-b border-slate-800 bg-[#091122]/90 backdrop-blur-md flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          {tenant?.logoUrl ? (
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-700/80 p-0.5 shadow-xl">
              <Image
                src={tenant.logoUrl}
                alt={tenant.name || "Local"}
                width={56}
                height={56}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-emerald-950/40">
              {tenant?.name?.substring(0, 1) || "V"}
            </div>
          )}

          <div>
            <h1 className="text-2xl 2xl:text-3xl font-black text-white tracking-tight">
              {tenant?.name || "Llamadores del Salón"}
            </h1>
            <div className="flex items-center gap-3 text-xs 2xl:text-sm font-semibold text-slate-400 mt-0.5">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider">
                <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {isConnected ? "Sincronizado en tiempo real" : "Reconectando..."}
              </span>
              <span>•</span>
              <span className="text-slate-400">Retiro por Mostrador</span>
            </div>
          </div>
        </div>

        {/* Reloj y Controles TV */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-3xl 2xl:text-4xl font-black tracking-widest text-emerald-400 font-mono">
              {currentTime || "--:--:--"}
            </div>
            <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Hora Oficial</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSound}
              className={`p-3 rounded-2xl border transition-all flex items-center gap-2 ${
                soundEnabled
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
              }`}
              title={soundEnabled ? "Sonido TV Activado" : "Click para Activar Sonido TV"}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              <span className="text-xs font-bold">{soundEnabled ? "Audio ON" : "Activar Audio"}</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all"
              title="Pantalla Completa"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Screen: EN PREPARACIÓN vs LISTOS PARA RETIRAR */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
        {/* Columna Izquierda: EN PREPARACIÓN (Amarillo / Ámbar) */}
        <section className="flex flex-col rounded-3xl bg-[#091122]/70 border-2 border-amber-500/30 overflow-hidden shadow-2xl">
          <div className="px-6 py-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: "6s" }} />
              </div>
              <h2 className="text-xl 2xl:text-2xl font-black text-amber-300 tracking-wider uppercase">
                En Preparación
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-sm border border-amber-500/40">
              {preparingTickets.length} Pedidos
            </span>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {preparingTickets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <UtensilsCrossed className="w-16 h-16 mb-3 stroke-[1.5] text-slate-700" />
                <p className="text-lg font-bold text-slate-400">Cocina al día</p>
                <p className="text-xs text-slate-600 mt-1">No hay pedidos pendientes en preparación</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {preparingTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-5 rounded-2xl bg-[#0C172E] border border-amber-500/30 flex flex-col items-center justify-center text-center shadow-lg transition-transform hover:scale-105"
                  >
                    <span className="text-3xl 2xl:text-4xl font-black text-amber-400 tracking-tight">
                      #{t.shortCode}
                    </span>
                    {(t.customerName || t.tableOrOrderNumber) && (
                      <span className="text-xs text-slate-400 mt-1 truncate max-w-[120px] font-medium">
                        {t.customerName || t.tableOrOrderNumber}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Columna Derecha: ¡LISTOS PARA RETIRAR! (Verde Esmeralda Pulsante) */}
        <section className="flex flex-col rounded-3xl bg-[#071816]/70 border-2 border-emerald-500/40 overflow-hidden shadow-2xl">
          <div className="px-6 py-4 bg-emerald-500/10 border-b border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>
              <h2 className="text-xl 2xl:text-2xl font-black text-emerald-300 tracking-wider uppercase">
                ¡Listos para Retirar!
              </h2>
            </div>
            <span className="px-3.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-sm shadow-lg shadow-emerald-950/60">
              {readyTickets.length} Listos
            </span>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {readyTickets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <CheckCircle2 className="w-16 h-16 mb-3 stroke-[1.5] text-slate-700" />
                <p className="text-lg font-bold text-slate-400">Todos los pedidos entregados</p>
                <p className="text-xs text-slate-600 mt-1">Los números listos aparecerán aquí de inmediato</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {readyTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-5 rounded-2xl bg-gradient-to-b from-[#0E2F26] to-[#0A1F1B] border-2 border-emerald-400 shadow-xl shadow-emerald-950/60 flex flex-col items-center justify-center text-center animate-pulse"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 mb-0.5">
                      {t.status === "ACKNOWLEDGED" ? "En Camino" : "¡Pasa a Retirar!"}
                    </span>
                    <span className="text-5xl 2xl:text-6xl font-black text-white tracking-tight my-1 drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]">
                      #{t.shortCode}
                    </span>
                    {(t.customerName || t.tableOrOrderNumber) && (
                      <span className="text-sm font-bold text-emerald-200 mt-1 truncate max-w-[160px]">
                        {t.customerName || t.tableOrOrderNumber}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer Banner con QR para Clientes en Salón */}
      <footer className="px-8 py-3.5 border-t border-slate-800 bg-[#070D1A] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white p-1 rounded-xl shrink-0 shadow-lg">
            <QRCodeImage value={counterQrUrl} size={50} />
          </div>
          <div>
            <p className="text-xs 2xl:text-sm font-extrabold text-white flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-400" />
              ¿Esperando tu pedido? Sigue el estado en tu celular
            </p>
            <p className="text-[11px] text-slate-400">
              Escanea el código QR o entra a <strong className="text-emerald-400 font-bold">{counterQrUrl.replace("https://", "")}</strong>
            </p>
          </div>
        </div>

        <div className="text-right text-[11px] text-slate-500 font-medium">
          Sistema de Llamadores Virtuales • <span className="text-slate-400 font-bold">Vidjs White-Label</span>
        </div>
      </footer>
    </div>
  );
}
