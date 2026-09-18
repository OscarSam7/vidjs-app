"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Radio,
  Tv,
  Headphones,
  QrCode,
  Sparkles,
  Music2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Users,
  Palette,
  ShieldCheck,
  Building2,
  CalendarCheck2,
  CreditCard,
  CheckCircle2,
  Activity,
  Layers,
  BarChart3,
  TrendingUp,
  Trophy,
  Printer,
  Flame,
  Mic,
  Sliders,
} from "lucide-react";
import NightPulseBadge from "@/components/dashboard/NightPulseBadge";
import RoomMapMini, { RoomTableItem } from "@/components/dashboard/RoomMapMini";
import ModeSettingsModal from "@/components/dashboard/ModeSettingsModal";
import { NightPulseResult } from "@/lib/pulse/night-pulse";
import { NightReport } from "@/lib/analytics/night-report";
import { QueuePolicy } from "@/lib/dj/rotation";

interface NightControlData {
  hasActiveEvent: boolean;
  event?: {
    id: string;
    name: string;
    code: string;
    venueName: string;
    startsAt: string;
  };
  policy?: QueuePolicy;
  activeEvents?: Array<{
    id: string;
    name: string;
    code: string;
    venueName: string;
  }>;
  pulse?: NightPulseResult;
  currentPlaying?: {
    id: string;
    title: string;
    artist: string;
    genre: string | null;
    durationSeconds: number;
    tableLabel: string;
    guestName: string | null;
    notes: string | null;
  } | null;
  nextUp?: Array<{
    id: string;
    orderIndex: number;
    title: string;
    artist: string;
    tableLabel: string;
    guestName: string | null;
  }>;
  tables?: RoomTableItem[];
  activityFeed?: Array<{
    id: string;
    title: string;
    artist: string;
    tableLabel: string;
    status: string;
    createdAt: string;
  }>;
  stats?: {
    totalTables: number;
    activeTables: number;
    requestsLast15m: number;
    queuedWaiters: number;
  };
}

interface NightControlProps {
  tenantName: string;
  tenantSlug: string;
  userRole: string;
  userName: string;
  initialVenues: Array<{
    id: string;
    name: string;
    address: string | null;
    active: boolean;
    _count: { tables: number; events: number };
  }>;
  planName?: string;
  planPrice?: string;
  planStatus?: string;
  auditLogs: Array<{
    id: string;
    action: string;
    resource: string;
    createdAt: string;
    user?: { name: string; role: string } | null;
  }>;
}

export default function NightControlDashboard({
  tenantName,
  tenantSlug,
  userRole,
  userName,
  initialVenues,
  planName,
  planPrice,
  planStatus,
  auditLogs,
}: NightControlProps) {
  const [data, setData] = useState<NightControlData | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "night-control" | "analytics" | "administration"
  >("night-control");
  const [report, setReport] = useState<NightReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchNightReport = async (eventId?: string) => {
    const idToUse = eventId || selectedEventId || data?.event?.id;
    if (!idToUse) return;
    setReportLoading(true);
    try {
      const res = await fetch(`/api/v1/analytics/night-report?eventId=${idToUse}`);
      if (res.ok) {
        const json = await res.json();
        setReport(json.data);
      }
    } catch (err) {
      console.error("Error cargando reporte de la noche:", err);
    } finally {
      setReportLoading(false);
    }
  };

  const fetchNightControlState = async (eventId?: string) => {
    try {
      const url = eventId
        ? `/api/v1/night-control/state?eventId=${eventId}`
        : selectedEventId
        ? `/api/v1/night-control/state?eventId=${selectedEventId}`
        : "/api/v1/night-control/state";

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
        if (!selectedEventId && json.data.event) {
          setSelectedEventId(json.data.event.id);
        }
      }
    } catch (err) {
      console.error("Error cargando estado de Night Control:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNightControlState();
    const timer = setInterval(() => {
      fetchNightControlState();
    }, 3500);
    return () => clearInterval(timer);
  }, [selectedEventId]);

  return (
    <div className="space-y-6">
      {/* 1. Header Nocturno & Contexto Operativo */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-purple-950/60 via-zinc-900/90 to-zinc-950 border border-purple-500/20 backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                NIGHT OS &bull; CENTRO DE OPERACIONES
              </span>
              <span className="text-xs text-zinc-400 font-mono">@{tenantSlug}</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="truncate">{tenantName}</span>
              {data?.hasActiveEvent && (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 animate-pulse shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Noche en Vivo
                </span>
              )}
              {data?.policy?.nightMode === "DJ_ONLY" && (
                <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40 shrink-0">
                  <Headphones className="w-3.5 h-3.5 text-amber-400" />
                  Solo Modo DJ
                </span>
              )}
              {data?.policy?.nightMode === "KARAOKE_ONLY" && (
                <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shrink-0">
                  <Mic className="w-3.5 h-3.5 text-cyan-400" />
                  Solo Karaoke
                </span>
              )}
              {(data?.policy?.nightMode === "HYBRID" || !data?.policy?.nightMode) && data?.hasActiveEvent && (
                <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40 shrink-0">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Modo Híbrido (DJ + Karaoke)
                </span>
              )}
            </h1>
            <p className="text-xs text-zinc-400">
              Operando como <strong className="text-purple-300">{userRole}</strong> ({userName})
            </p>
          </div>

          {/* Quick Actions Operativas */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full lg:w-auto flex-wrap">
            {/* Cabina DJ */}
            <Link
              href="/dashboard/dj"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/30 group"
              title="Abrir Consola Virtual DJ Dual-Deck"
            >
              <Headphones className="w-4 h-4 group-hover:rotate-12 transition-transform shrink-0" />
              <span>Cabina DJ</span>
            </Link>

            {/* Cabina Karaoke */}
            <Link
              href="/dashboard/karaoke"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-black text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/30 group"
              title="Abrir Consola de Escenario KJ Karaoke"
            >
              <Mic className="w-4 h-4 group-hover:scale-110 transition-transform shrink-0" />
              <span>Cabina Karaoke</span>
            </Link>

            {/* Configurar Modos */}
            {data?.event && (
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                title="Configurar parámetros independientes de DJ y Karaoke"
              >
                <Sliders className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Configurar Modos</span>
              </button>
            )}

            {data?.event?.code && (
              <a
                href={`/display/${data.event.code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-cyan-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Tv className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Pantalla TV</span>
                <ArrowUpRight className="w-3 h-3 opacity-60" />
              </a>
            )}

            <Link
              href="/dashboard/tables"
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>Mesas & QR</span>
            </Link>

            <Link
              href="/dashboard/branding"
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
            >
              <Palette className="w-4 h-4 text-fuchsia-400 shrink-0" />
              <span>Branding</span>
            </Link>
          </div>
        </div>

        {/* Selector de Evento si hay varios */}
        {data?.activeEvents && data.activeEvents.length > 1 && (
          <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-2 text-xs flex-wrap">
            <span className="text-zinc-400">Evento Activo:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-medium focus:outline-none focus:border-purple-500 max-w-full"
            >
              {data.activeEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name} ({evt.venueName})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Selector de Vistas: Night Control (3s Rule) vs Analytics vs Administración */}
      <div className="flex border-b border-zinc-800 gap-4 sm:gap-6 text-xs sm:text-sm font-bold overflow-x-auto scrollbar-none whitespace-nowrap pb-px">
        <button
          onClick={() => setActiveTab("night-control")}
          className={`pb-3 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "night-control"
              ? "text-purple-400 border-b-2 border-purple-500"
              : "text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent"
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Night Control en Vivo</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("analytics");
            fetchNightReport();
          }}
          className={`pb-3 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "analytics"
              ? "text-purple-400 border-b-2 border-purple-500"
              : "text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Night Analytics & Reporte</span>
        </button>

        <button
          onClick={() => setActiveTab("administration")}
          className={`pb-3 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "administration"
              ? "text-purple-400 border-b-2 border-purple-500"
              : "text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Administración & Auditoría</span>
        </button>
      </div>

      {/* 3. VISTA PRINCIPAL: NIGHT CONTROL */}
      {activeTab === "night-control" && (
        <div className="space-y-6">
          {/* Night Pulse Indicator */}
          {data?.pulse && <NightPulseBadge pulse={data.pulse} />}

          {/* Foco de la Noche: Sonando Ahora + Próximo Turno */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Sonando Ahora (Spotlight) */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-gradient-to-br from-zinc-900/90 to-purple-950/20 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-purple-400 tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                  <span>Sonando Ahora en Vivo</span>
                </div>
                {data?.currentPlaying && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-600/50 font-bold">
                    {data.currentPlaying.tableLabel}
                  </span>
                )}
              </div>

              {data?.currentPlaying ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-black/50 border border-purple-500/20 space-y-1.5">
                    <div className="text-lg sm:text-xl font-black text-white truncate">
                      {data.currentPlaying.title}
                    </div>
                    <div className="text-sm font-semibold text-purple-300 truncate">
                      {data.currentPlaying.artist}
                    </div>
                    {data.currentPlaying.notes && (
                      <div className="text-xs text-zinc-400 italic bg-purple-950/30 p-2 rounded-lg mt-2 border border-purple-900/40">
                        &ldquo;{data.currentPlaying.notes}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Visualizer animado minimalista */}
                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                    <div className="flex items-center gap-1">
                      {[40, 75, 100, 60, 85, 45, 90, 70, 95, 50].map((h, i) => (
                        <div
                          key={i}
                          className="w-1 bg-purple-500/70 rounded-full animate-pulse"
                          style={{
                            height: `${h * 0.2}px`,
                            animationDelay: `${i * 120}ms`,
                          }}
                        />
                      ))}
                      <span className="ml-2 text-[11px]">En reproducción pública</span>
                    </div>

                    <Link
                      href="/dashboard/dj"
                      className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
                    >
                      <span>Controlar cabina</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center space-y-2">
                  <Music2 className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400">
                    No hay canciones sonando en este momento.
                  </p>
                  <Link
                    href="/dashboard/dj"
                    className="inline-block text-xs font-bold text-purple-400 hover:underline"
                  >
                    Ir a cabina y activar cola &rarr;
                  </Link>
                </div>
              )}
            </div>

            {/* Próximos en Cola */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-400 tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Próximos en Línea</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {data?.nextUp?.length || 0} turnos
                  </span>
                </div>

                <div className="space-y-2">
                  {data?.nextUp && data.nextUp.length > 0 ? (
                    data.nextUp.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-lg bg-zinc-900 text-zinc-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">{item.title}</div>
                            <div className="text-[11px] text-zinc-400 truncate">{item.artist}</div>
                          </div>
                        </div>

                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-purple-300 font-bold shrink-0">
                          {item.tableLabel}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      Cola libre. Las mesas pueden pedir sin espera.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                <span>{data?.stats?.queuedWaiters || 0} canciones esperando</span>
                <Link
                  href="/dashboard/dj"
                  className="text-purple-400 hover:text-purple-300 font-semibold"
                >
                  Ver cola completa
                </Link>
              </div>
            </div>
          </div>

          {/* 4. Mini Mapa Operativo de Sala */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            {data?.tables && (
              <RoomMapMini
                tables={data.tables}
                venueName={data.event?.venueName}
              />
            )}
          </div>

          {/* 5. Live Activity Feed */}
          {data?.activityFeed && data.activityFeed.length > 0 && (
            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span>Flujo de Actividad en Vivo</span>
                </h4>
                <span className="text-[10px] text-zinc-500 font-mono">Feed en directo</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {data.activityFeed.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/60 text-xs flex items-center justify-between"
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold text-white truncate">{item.title}</div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        {item.artist} &bull; {item.tableLabel}
                      </div>
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                        item.status === "PLAYING"
                          ? "bg-purple-950 text-purple-300 border border-purple-800"
                          : item.status === "ACCEPTED"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. VISTA: NIGHT ANALYTICS & REPORTE POST-NOCHE */}
      {activeTab === "analytics" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header de Analítica con selector y exportación */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-purple-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Reporte Ejecutivo de la Noche</h2>
                <p className="text-xs text-zinc-400">
                  {report ? `${report.eventName} • ${report.venueName}` : "Métricas y rendimiento de entretenimiento nocturno"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchNightReport()}
                disabled={reportLoading}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reportLoading ? "animate-spin" : ""}`} />
                <span>Actualizar</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20 transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Exportar / Imprimir</span>
              </button>
            </div>
          </div>

          {reportLoading && !report ? (
            <div className="p-16 text-center text-zinc-500 text-xs space-y-2">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-purple-400" />
              <p>Generando analítica post-noche y calculando curva horaria...</p>
            </div>
          ) : report ? (
            <div className="space-y-6">
              {/* Tarjetas de Métricas Clave */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Hora Pico del Local */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-950 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between text-amber-400">
                    <span className="text-[10px] font-black uppercase tracking-wider">Hora Pico del Local</span>
                    <Flame className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">{report.peakHour.label}</div>
                  <p className="text-xs text-amber-300/80 font-medium">
                    {report.peakHour.requestCount} peticiones simultáneas • {report.peakHour.energyScore}% de energía
                  </p>
                </div>

                {/* VIP Fast-Pass Monetizado */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-emerald-400">
                    <span className="text-[10px] font-black uppercase tracking-wider">Fast-Pass VIP (Propinas)</span>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {report.totalVipFastPasses} pedidos
                  </div>
                  <p className="text-xs text-emerald-300/80 font-medium">
                    ~${(report.totalVipFastPasses * 5).toFixed(2)} USD generados para cabina y barra
                  </p>
                </div>

                {/* Canciones Tocadas vs Pedidas */}
                <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-purple-400">
                    <span className="text-[10px] font-black uppercase tracking-wider">Efectividad de Cabina</span>
                    <Music2 className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {report.totalPlayed} / {report.totalRequests}
                  </div>
                  <p className="text-xs text-zinc-400">
                    {report.totalRequests > 0
                      ? `${Math.round((report.totalPlayed / report.totalRequests) * 100)}% de solicitudes complacidas`
                      : "Sin solicitudes registradas"}
                  </p>
                </div>

                {/* Mesas y Clientes Activos */}
                <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-cyan-400">
                    <span className="text-[10px] font-black uppercase tracking-wider">Interacción en Mesas</span>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {report.totalGuestSessions} sesiones
                  </div>
                  <p className="text-xs text-zinc-400">Comensales que abrieron el menú QR en su móvil</p>
                </div>
              </div>

              {/* Curva Horaria de Energía y Volumen */}
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                      <span>Curva Horaria de Energía del Local</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Volumen de solicitudes y nivel de vibración de la sala hora por hora
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-purple-500" />
                      <span className="text-zinc-400">Nivel de Energía (%)</span>
                    </div>
                  </div>
                </div>

                {report.hourlyCurve.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">
                    Aún no hay suficientes datos horarios registrados en este evento.
                  </p>
                ) : (
                  <div className="pt-6 pb-2">
                    <div className="flex items-end justify-between gap-3 h-48 px-2 border-b border-zinc-800">
                      {report.hourlyCurve.map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                          <div className="text-[10px] font-mono text-purple-300 font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {h.requestCount} reqs ({h.energyScore}%)
                          </div>
                          <div
                            className="w-full max-w-[42px] rounded-t-lg bg-gradient-to-t from-purple-600 via-fuchsia-500 to-cyan-400 group-hover:brightness-125 transition-all shadow-md"
                            style={{ height: `${Math.max(h.energyScore, 10)}%` }}
                          />
                          <span className="text-[10px] font-mono text-zinc-400 mt-2 whitespace-nowrap">
                            {h.hourLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dos Columnas: Top Mesas Fiesteras & Top Géneros Musicales */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ranking de Mesas */}
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Ranking de Mesas Más Activas
                    </h3>
                  </div>

                  {report.topTables.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-4 text-center">Sin actividad de mesas.</p>
                  ) : (
                    <div className="space-y-2">
                      {report.topTables.map((t, idx) => (
                        <div
                          key={t.tableLabel}
                          className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-zinc-900 text-amber-400 font-mono text-xs font-black flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-white">{t.tableLabel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-zinc-400">{t.requestCount} pedidos</span>
                            {t.vipCount > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                                {t.vipCount} ⭐ VIP
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Géneros de la Noche */}
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                  <div className="flex items-center gap-2">
                    <Music2 className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Géneros Más Pedidos de la Noche
                    </h3>
                  </div>

                  {report.topGenres.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-4 text-center">Sin datos de géneros.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {report.topGenres.map((g) => {
                        const maxCount = Math.max(...report.topGenres.map((x) => x.count), 1);
                        const percent = Math.round((g.count / maxCount) * 100);
                        return (
                          <div key={g.genre} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-white">{g.genre}</span>
                              <span className="text-zinc-400 font-mono">{g.count} pedidos</span>
                            </div>
                            <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-500 text-xs">
              Selecciona un evento para ver su reporte analítico.
            </div>
          )}
        </div>
      )}

      {/* 5. VISTA SECUNDARIA: ADMINISTRACIÓN & AUDITORÍA */}
      {activeTab === "administration" && (
        <div className="space-y-6">
          {/* Métricas del Plan & Establecimiento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-bold uppercase">Sedes / Locales</span>
                <Building2 className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-white">{initialVenues.length}</div>
              <div className="text-xs text-zinc-400 mt-1">Locales dados de alta en la cuenta</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-bold uppercase">Plan SaaS Activo</span>
                <CreditCard className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white">{planName || "Plan Base"}</div>
              <div className="text-xs text-emerald-400 mt-1">
                {planPrice} / mes &bull; {planStatus}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-bold uppercase">Seguridad</span>
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white">RBAC 100%</div>
              <div className="text-xs text-cyan-400 mt-1">Aislamiento por tenant garantizado</div>
            </div>
          </div>

          {/* Listado de Locales */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              <span>Locales Registrados</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {initialVenues.map((venue) => (
                <div
                  key={venue.id}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{venue.name}</div>
                    <div className="text-[11px] text-zinc-400">{venue.address || "Sin dirección"}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-bold text-purple-300">{venue._count.tables} mesas</div>
                    <div className="text-[10px] text-zinc-500">{venue._count.events} eventos</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Registro de Auditoría Inmutable */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Auditoría de Seguridad Inmutable</span>
              </h3>
              <span className="text-[10px] text-zinc-500">Últimos eventos registrados</span>
            </div>

            <div className="divide-y divide-zinc-800">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300">
                      {log.action}
                    </span>
                    <span className="text-zinc-300">
                      Recurso: <strong className="text-white">{log.resource}</strong>
                    </span>
                    <span className="text-zinc-500 hidden sm:inline">
                      por {log.user?.name || "Sistema"} ({log.user?.role || "SYSTEM"})
                    </span>
                  </div>
                  <span className="text-zinc-500 text-[10px]">
                    {new Date(log.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración Independiente de Modos (Owner) */}
      {data?.event && (
        <ModeSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          eventId={data.event.id}
          eventName={data.event.name}
          initialPolicy={data.policy}
          onPolicyUpdated={(newPolicy) => {
            setData((prev) => (prev ? { ...prev, policy: newPolicy } : null));
          }}
        />
      )}
    </div>
  );
}
