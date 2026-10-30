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
  Copy,
  Check,
  ChevronRight,
  Wifi,
  Disc3,
  Play,
} from "lucide-react";
import NightPulseBadge from "@/components/dashboard/NightPulseBadge";
import RoomMapMini, { RoomTableItem } from "@/components/dashboard/RoomMapMini";
import ModeSettingsModal from "@/components/dashboard/ModeSettingsModal";
import TvDisplayConnectModal from "@/components/dashboard/TvDisplayConnectModal";
import { Card, CardHeader, CardTitle, CardContent, KpiCard, Badge, Button } from "@/components/ui";
import { NightPulseResult } from "@/lib/pulse/night-pulse";
import { NightReport } from "@/lib/analytics/night-report";
import { QueuePolicy } from "@/lib/dj/rotation";
import { cn } from "@/lib/utils";

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
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "night-control" | "analytics" | "administration"
  >("night-control");
  const [report, setReport] = useState<NightReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (codeToCopy: string, label: string) => {
    navigator.clipboard.writeText(codeToCopy);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2500);
  };

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
      {/* 1-6. HEADER PRINCIPAL: Centro de Operaciones, Evento Activo, Establecimiento, Estado de Conexión y Accesos Rápidos */}
      <div className="rounded-2xl bg-[#111F38] border border-[#263858] p-4 sm:p-6 transition-colors shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            {/* Meta tags: operations title, tenant slug, connection status */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="primary" size="xs">
                CENTRO DE OPERACIONES &bull; NIGHT OS
              </Badge>
              <span className="text-xs text-[#94A3B8] font-mono">@{tenantSlug}</span>
              <Badge variant="success" size="xs" pulse icon={<Wifi className="w-3 h-3" />}>
                Conexión en Vivo
              </Badge>
            </div>

            {/* Title & Active Event Status */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="truncate">{tenantName}</span>

              {data?.hasActiveEvent && (
                <Badge variant="success" size="sm" pulse>
                  Noche Activa
                </Badge>
              )}

              {data?.policy?.nightMode === "DJ_ONLY" && (
                <Badge variant="dj" size="sm" icon={<Headphones className="w-3.5 h-3.5" />}>
                  Solo Modo DJ
                </Badge>
              )}

              {data?.policy?.nightMode === "KARAOKE_ONLY" && (
                <Badge variant="karaoke" size="sm" icon={<Mic className="w-3.5 h-3.5" />}>
                  Solo Karaoke
                </Badge>
              )}

              {(data?.policy?.nightMode === "HYBRID" || !data?.policy?.nightMode) &&
                data?.hasActiveEvent && (
                  <Badge variant="primary" size="sm" icon={<Layers className="w-3.5 h-3.5" />}>
                    Modo Híbrido (DJ + KJ)
                  </Badge>
                )}
            </h1>

            <p className="text-xs text-[#94A3B8]">
              Sesión activa de <strong className="text-purple-300 font-semibold">{userName}</strong> con rol{" "}
              <span className="text-[#F8FAFC] font-semibold">{userRole}</span>
              {data?.event && (
                <span>
                  {" "}
                  &bull; Evento actual:{" "}
                  <strong className="text-[#F8FAFC] font-medium">{data.event.name}</strong> ({data.event.venueName})
                </span>
              )}
            </p>
          </div>

          {/* 12. Accesos Rápidos Principales */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full lg:w-auto flex-wrap">
            {/* Cabina DJ */}
            <Link href="/dashboard/dj">
              <Button
                variant="dj"
                size="sm"
                leftIcon={<Headphones className="w-4 h-4" />}
                className="w-full sm:w-auto font-semibold"
              >
                Cabina DJ
              </Button>
            </Link>

            {/* Cabina Karaoke */}
            <Link href="/dashboard/karaoke">
              <Button
                variant="karaoke"
                size="sm"
                leftIcon={<Mic className="w-4 h-4" />}
                className="w-full sm:w-auto font-semibold"
              >
                Cabina Karaoke
              </Button>
            </Link>

            {/* Configurar Modos */}
            {data?.event && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Sliders className="w-3.5 h-3.5 text-purple-400" />}
                onClick={() => setIsSettingsModalOpen(true)}
                className="w-full sm:w-auto"
              >
                Configurar Modos
              </Button>
            )}

            {/* Smart TV Modal */}
            {data?.event?.code && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Tv className="w-3.5 h-3.5 text-cyan-400" />}
                onClick={() => setIsTvModalOpen(true)}
                className="w-full sm:w-auto"
              >
                Pantalla TV
              </Button>
            )}

            {/* Mesas & QR */}
            <Link href="/dashboard/tables">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<QrCode className="w-3.5 h-3.5 text-slate-400" />}
                className="w-full sm:w-auto"
              >
                Mesas & QR
              </Button>
            </Link>
          </div>
        </div>

        {/* Selector de Evento si hay varios */}
        {data?.activeEvents && data.activeEvents.length > 1 && (
          <div className="mt-4 pt-3 border-t border-[#263858] flex items-center gap-2 text-xs flex-wrap">
            <span className="text-[#94A3B8] font-medium">Evento Activo:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-3 py-1 bg-navy-900 border border-navy-700 rounded-lg text-white font-medium focus:outline-none focus:border-purple-500 max-w-full cursor-pointer"
            >
              {data.activeEvents.map((evt) => (
                <option key={evt.id} value={evt.id} className="bg-navy-900">
                  {evt.name} ({evt.venueName})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Códigos Directos de Acceso para Clientes */}
        {(() => {
          const currentEventCode = data?.event?.code;
          if (!currentEventCode) return null;

          return (
            <div className="mt-4 pt-3 border-t border-[#263858] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-purple-400" />
                  <span>Códigos de Acceso Rápido para Clientes (Filtrado Automático)</span>
                </span>
                {copiedCode && (
                  <span className="text-[10px] text-emerald-300 font-mono font-semibold bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                    ¡Copiado: {copiedCode}!
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Código Modo DJ */}
                <div className="p-2.5 rounded-xl bg-navy-900 border border-amber-900/40 hover:border-amber-700/60 flex items-center justify-between gap-2 transition-colors">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Headphones className="w-3 h-3 text-amber-400" />
                      <span>Modo DJ (Pista)</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-[#F8FAFC] truncate mt-0.5">
                      {currentEventCode}-DJ
                    </div>
                    <div className="text-[10px] text-[#94A3B8] truncate">Filtra solo temas para bailar</div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyCode(`${currentEventCode}-DJ`, `${currentEventCode}-DJ`)
                    }
                    className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-750 text-amber-300 border border-navy-700 transition-colors cursor-pointer shrink-0"
                    title="Copiar código Modo DJ"
                  >
                    {copiedCode === `${currentEventCode}-DJ` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Código Modo Karaoke */}
                <div className="p-2.5 rounded-xl bg-navy-900 border border-cyan-900/40 hover:border-cyan-700/60 flex items-center justify-between gap-2 transition-colors">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                      <Mic className="w-3 h-3 text-cyan-400" />
                      <span>Modo Karaoke</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-[#F8FAFC] truncate mt-0.5">
                      {currentEventCode}-KJ
                    </div>
                    <div className="text-[10px] text-[#94A3B8] truncate">Filtra solo pistas con letra</div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyCode(`${currentEventCode}-KJ`, `${currentEventCode}-KJ`)
                    }
                    className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-750 text-cyan-300 border border-navy-700 transition-colors cursor-pointer shrink-0"
                    title="Copiar código Modo Karaoke"
                  >
                    {copiedCode === `${currentEventCode}-KJ` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Código General */}
                <div className="p-2.5 rounded-xl bg-navy-900 border border-navy-700 flex items-center justify-between gap-2 transition-colors">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <QrCode className="w-3 h-3 text-slate-400" />
                      <span>Código General</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-[#F8FAFC] truncate mt-0.5">
                      {currentEventCode}
                    </div>
                    <div className="text-[10px] text-[#94A3B8] truncate">Acceso estándar al local</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(currentEventCode, currentEventCode)}
                    className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-750 text-slate-300 border border-navy-700 transition-colors cursor-pointer shrink-0"
                    title="Copiar código general"
                  >
                    {copiedCode === currentEventCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 7. INDICADORES OPERATIVOS (4 KPI CARDS CON DATOS REALES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Mesas Activas */}
        <KpiCard
          title="Mesas en Sala"
          value={data?.stats?.activeTables || 0}
          subtext={`de ${data?.stats?.totalTables || initialVenues.reduce((acc, v) => acc + v._count.tables, 0)} mesas conectadas`}
          icon={<Users className="w-4 h-4" />}
          accent="primary"
          badge="QR Vivo"
          trend={{
            value: `${Math.round(((data?.stats?.activeTables || 0) / Math.max(data?.stats?.totalTables || 1, 1)) * 100)}%`,
            direction: "neutral",
            label: "Ocupación",
          }}
        />

        {/* KPI 2: Peticiones Últimos 15m */}
        <KpiCard
          title="Peticiones (15 min)"
          value={data?.stats?.requestsLast15m || 0}
          subtext="Canciones pedidas recientemente"
          icon={<Activity className="w-4 h-4" />}
          accent="success"
          trend={{
            value: data?.stats?.requestsLast15m && data.stats.requestsLast15m > 0 ? "Activo" : "En espera",
            direction: data?.stats?.requestsLast15m && data.stats.requestsLast15m > 0 ? "up" : "neutral",
            label: "Flujo de pedidos",
          }}
        />

        {/* KPI 3: En Cola de Reproducción */}
        <KpiCard
          title="Turnos en Espera"
          value={data?.stats?.queuedWaiters || 0}
          subtext="Canciones en fila de espera"
          icon={<Clock className="w-4 h-4" />}
          accent="dj"
          badge={data?.stats?.queuedWaiters ? "Pendientes" : "Libre"}
        />

        {/* KPI 4: Tiempo Estimado de Espera */}
        <KpiCard
          title="Tiempo Estimado de Espera"
          value={
            data?.stats?.queuedWaiters
              ? `${Math.round(data.stats.queuedWaiters * 3.5)}m`
              : "0m"
          }
          subtext={`Ambiente: ${data?.pulse?.label || "Estable"}`}
          icon={<Flame className="w-4 h-4" />}
          accent="karaoke"
          trend={{
            value: data?.pulse?.level || "NORMAL",
            direction: data?.pulse?.level === "PEAK" || data?.pulse?.level === "HOT" ? "up" : "neutral",
            label: "Nivel de energía",
          }}
        />
      </div>

      {/* 8. ESTADO DE LAS CABINAS (DJ + KARAOKE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cabina DJ Status */}
        <div className="rounded-2xl bg-[#111F38] border border-amber-900/40 p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-700/50 flex items-center justify-center text-amber-300 shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-[#F8FAFC] truncate">Cabina VirtualDJ</h4>
                <Badge
                  variant="dj"
                  size="xs"
                  pulse={data?.policy?.dj?.enabled !== false && !data?.policy?.dj?.queuePaused}
                >
                  {data?.policy?.dj?.enabled !== false && !data?.policy?.dj?.queuePaused
                    ? "Operativo"
                    : "Pausado"}
                </Badge>
              </div>
              <p className="text-xs text-[#94A3B8] truncate mt-0.5">
                Deck A & B con sync BPM &bull; Rotación:{" "}
                <span className="font-mono text-slate-300">{data?.policy?.nightMode || "HYBRID"}</span>
              </p>
            </div>
          </div>
          <Link href="/dashboard/dj" className="shrink-0">
            <Button variant="dj" size="xs" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
              Abrir
            </Button>
          </Link>
        </div>

        {/* Cabina Karaoke Status */}
        <div className="rounded-2xl bg-[#111F38] border border-cyan-900/40 p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-700/50 flex items-center justify-center text-cyan-300 shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-[#F8FAFC] truncate">Cabina Karaoke (KJ)</h4>
                <Badge
                  variant="karaoke"
                  size="xs"
                  pulse={data?.policy?.karaoke?.enabled !== false && !data?.policy?.karaoke?.queuePaused}
                >
                  {data?.policy?.karaoke?.enabled !== false && !data?.policy?.karaoke?.queuePaused
                    ? "En Escenario"
                    : "Pausado"}
                </Badge>
              </div>
              <p className="text-xs text-[#94A3B8] truncate mt-0.5">
                Letras sincronizadas &bull; Estado:{" "}
                <span className="font-medium text-slate-300">
                  {data?.currentPlaying?.guestName
                    ? `Cantando: ${data.currentPlaying.guestName}`
                    : data?.currentPlaying
                    ? `En vivo: ${data.currentPlaying.title}`
                    : "Escenario disponible"}
                </span>
              </p>
            </div>
          </div>
          <Link href="/dashboard/karaoke" className="shrink-0">
            <Button variant="karaoke" size="xs" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
              Abrir
            </Button>
          </Link>
        </div>
      </div>

      {/* Pestañas de Vista Operativa: Night Control vs Analytics vs Administración */}
      <div className="flex border-b border-[#263858] gap-4 sm:gap-6 text-xs sm:text-sm font-semibold overflow-x-auto scrollbar-none whitespace-nowrap pb-px">
        <button
          onClick={() => setActiveTab("night-control")}
          className={cn(
            "pb-3 transition-all flex items-center gap-2 cursor-pointer shrink-0 border-b-2",
            activeTab === "night-control"
              ? "text-purple-400 border-purple-500 font-bold"
              : "text-[#94A3B8] hover:text-[#F8FAFC] border-transparent"
          )}
        >
          <Radio className="w-4 h-4" />
          <span>Night Control en Vivo</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("analytics");
            fetchNightReport();
          }}
          className={cn(
            "pb-3 transition-all flex items-center gap-2 cursor-pointer shrink-0 border-b-2",
            activeTab === "analytics"
              ? "text-purple-400 border-purple-500 font-bold"
              : "text-[#94A3B8] hover:text-[#F8FAFC] border-transparent"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Night Analytics & Reporte</span>
        </button>

        <button
          onClick={() => setActiveTab("administration")}
          className={cn(
            "pb-3 transition-all flex items-center gap-2 cursor-pointer shrink-0 border-b-2",
            activeTab === "administration"
              ? "text-purple-400 border-purple-500 font-bold"
              : "text-[#94A3B8] hover:text-[#F8FAFC] border-transparent"
          )}
        >
          <Layers className="w-4 h-4" />
          <span>Administración & Auditoría</span>
        </button>
      </div>

      {/* VISTA 1: NIGHT CONTROL EN VIVO */}
      {activeTab === "night-control" && (
        <div className="space-y-6">
          {/* Night Pulse Indicator */}
          {data?.pulse && <NightPulseBadge pulse={data.pulse} />}

          {/* 9 & 10. REPRODUCCIÓN ACTUAL + SOLICITUDES PENDIENTES */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* 9. Reproducción Actual (Spotlight) */}
            <div className="lg:col-span-7 rounded-2xl bg-[#111F38] border border-[#263858] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-purple-400 tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                  <span>Sonando Ahora en Vivo</span>
                </div>
                {data?.currentPlaying && (
                  <Badge variant="primary" size="xs">
                    {data.currentPlaying.tableLabel}
                  </Badge>
                )}
              </div>

              {data?.currentPlaying ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-navy-950 border border-purple-500/20 space-y-1.5">
                    <div className="text-lg sm:text-xl font-bold text-[#F8FAFC] truncate">
                      {data.currentPlaying.title}
                    </div>
                    <div className="text-sm font-semibold text-purple-300 truncate">
                      {data.currentPlaying.artist}
                    </div>
                    {data.currentPlaying.notes && (
                      <div className="text-xs text-[#94A3B8] italic bg-navy-900/60 p-2 rounded-lg mt-2 border border-navy-700">
                        &ldquo;{data.currentPlaying.notes}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Visualizer animado minimalista */}
                  <div className="flex items-center justify-between text-xs text-[#94A3B8] pt-1">
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
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                    >
                      <span>Controlar cabina</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center space-y-2">
                  <Music2 className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-xs text-[#94A3B8]">
                    No hay canciones sonando en este momento.
                  </p>
                  <Link
                    href="/dashboard/dj"
                    className="inline-block text-xs font-semibold text-purple-400 hover:underline"
                  >
                    Ir a cabina y activar cola &rarr;
                  </Link>
                </div>
              )}
            </div>

            {/* 10. Solicitudes Pendientes (Next Up / Cola) */}
            <div className="lg:col-span-5 rounded-2xl bg-[#111F38] border border-[#263858] p-5 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#94A3B8] tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Próximos en Línea</span>
                  </div>
                  <Badge variant="neutral" size="xs">
                    {data?.nextUp?.length || 0} turnos
                  </Badge>
                </div>

                <div className="space-y-2">
                  {data?.nextUp && data.nextUp.length > 0 ? (
                    data.nextUp.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-navy-900 border border-navy-700 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-lg bg-navy-800 text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-[#F8FAFC] truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-[#94A3B8] truncate">{item.artist}</div>
                          </div>
                        </div>

                        <Badge variant="primary" size="xs">
                          {item.tableLabel}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-[#94A3B8]">
                      Cola libre. Las mesas pueden pedir sin tiempo de espera.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#263858] flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span>{data?.stats?.queuedWaiters || 0} canciones esperando</span>
                <Link
                  href="/dashboard/dj"
                  className="text-purple-400 hover:text-purple-300 font-semibold"
                >
                  Ver cola completa &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Mini Mapa Operativo de Sala */}
          <div className="p-5 rounded-2xl bg-[#111F38] border border-[#263858]">
            {data?.tables && (
              <RoomMapMini tables={data.tables} venueName={data.event?.venueName} />
            )}
          </div>

          {/* 11. ACTIVIDAD RECIENTE (FEED EN DIRECTO) */}
          {data?.activityFeed && data.activityFeed.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#111F38] border border-[#263858] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span>Flujo de Actividad en Vivo</span>
                </h4>
                <Badge variant="neutral" size="xs">
                  Feed en directo
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {data.activityFeed.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-navy-900 border border-navy-700 text-xs flex items-center justify-between"
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold text-[#F8FAFC] truncate">{item.title}</div>
                      <div className="text-[10px] text-[#94A3B8] truncate">
                        {item.artist} &bull; {item.tableLabel}
                      </div>
                    </div>
                    <Badge
                      variant={
                        item.status === "PLAYING"
                          ? "primary"
                          : item.status === "ACCEPTED"
                          ? "success"
                          : "neutral"
                      }
                      size="xs"
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: NIGHT ANALYTICS & REPORTE POST-NOCHE */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#111F38] border border-purple-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-950/70 text-purple-400 border border-purple-700/50">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#F8FAFC]">Reporte Ejecutivo de la Noche</h2>
                <p className="text-xs text-[#94A3B8]">
                  {report
                    ? `${report.eventName} • ${report.venueName}`
                    : "Métricas y rendimiento de entretenimiento nocturno"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fetchNightReport()}
                isLoading={reportLoading}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Actualizar
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                leftIcon={<Printer className="w-3.5 h-3.5" />}
              >
                Exportar / Imprimir
              </Button>
            </div>
          </div>

          {reportLoading && !report ? (
            <div className="p-16 text-center text-[#94A3B8] text-xs space-y-2">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-purple-400" />
              <p>Generando analítica post-noche y calculando curva horaria...</p>
            </div>
          ) : report ? (
            <div className="space-y-6">
              {/* Tarjetas de Métricas Clave */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  title="Hora Pico del Local"
                  value={report.peakHour.label}
                  subtext={`${report.peakHour.requestCount} peticiones simultáneas • ${report.peakHour.energyScore}% de energía`}
                  icon={<Flame className="w-4 h-4" />}
                  accent="dj"
                />

                <KpiCard
                  title="Fast-Pass VIP (Propinas)"
                  value={`${report.totalVipFastPasses} pedidos`}
                  subtext={`~$${(report.totalVipFastPasses * 5).toFixed(2)} USD generados para cabina`}
                  icon={<CreditCard className="w-4 h-4" />}
                  accent="success"
                />

                <KpiCard
                  title="Efectividad de Cabina"
                  value={`${report.totalPlayed} / ${report.totalRequests}`}
                  subtext={
                    report.totalRequests > 0
                      ? `${Math.round((report.totalPlayed / report.totalRequests) * 100)}% solicitudes complacidas`
                      : "Sin solicitudes registradas"
                  }
                  icon={<Music2 className="w-4 h-4" />}
                  accent="primary"
                />

                <KpiCard
                  title="Interacción en Mesas"
                  value={`${report.totalGuestSessions} sesiones`}
                  subtext="Comensales que abrieron el menú QR en su móvil"
                  icon={<Users className="w-4 h-4" />}
                  accent="karaoke"
                />
              </div>

              {/* Curva Horaria de Energía y Volumen */}
              <div className="p-6 rounded-2xl bg-[#111F38] border border-[#263858] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                      <span>Curva Horaria de Energía del Local</span>
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Volumen de solicitudes y nivel de vibración de la sala hora por hora
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-purple-500" />
                      <span className="text-[#94A3B8]">Nivel de Energía (%)</span>
                    </div>
                  </div>
                </div>

                {report.hourlyCurve.length === 0 ? (
                  <p className="text-xs text-[#94A3B8] py-6 text-center">
                    Aún no hay suficientes datos horarios registrados en este evento.
                  </p>
                ) : (
                  <div className="pt-6 pb-2">
                    <div className="flex items-end justify-between gap-3 h-48 px-2 border-b border-[#263858]">
                      {report.hourlyCurve.map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-2 group h-full justify-end"
                        >
                          <div className="text-[10px] font-mono text-purple-300 font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {h.requestCount} reqs ({h.energyScore}%)
                          </div>
                          <div
                            className="w-full max-w-[42px] rounded-t-lg bg-gradient-to-t from-purple-600 via-fuchsia-500 to-cyan-400 group-hover:brightness-125 transition-all shadow-md"
                            style={{ height: `${Math.max(h.energyScore, 10)}%` }}
                          />
                          <span className="text-[10px] font-mono text-[#94A3B8] mt-2 whitespace-nowrap">
                            {h.hourLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Ranking de Mesas y Géneros */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-[#111F38] border border-[#263858] space-y-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">
                      Ranking de Mesas Más Activas
                    </h3>
                  </div>

                  {report.topTables.length === 0 ? (
                    <p className="text-xs text-[#94A3B8] py-4 text-center">Sin actividad de mesas.</p>
                  ) : (
                    <div className="space-y-2">
                      {report.topTables.map((t, idx) => (
                        <div
                          key={t.tableLabel}
                          className="p-3 rounded-xl bg-navy-900 border border-navy-700 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-navy-800 text-amber-400 font-mono text-xs font-bold flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-[#F8FAFC]">
                              {t.tableLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-[#94A3B8]">
                              {t.requestCount} pedidos
                            </span>
                            {t.vipCount > 0 && (
                              <Badge variant="dj" size="xs">
                                {t.vipCount} ⭐ VIP
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-[#111F38] border border-[#263858] space-y-4">
                  <div className="flex items-center gap-2">
                    <Music2 className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">
                      Géneros Más Pedidos de la Noche
                    </h3>
                  </div>

                  {report.topGenres.length === 0 ? (
                    <p className="text-xs text-[#94A3B8] py-4 text-center">Sin datos de géneros.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {report.topGenres.map((g) => {
                        const maxCount = Math.max(...report.topGenres.map((x) => x.count), 1);
                        const percent = Math.round((g.count / maxCount) * 100);
                        return (
                          <div key={g.genre} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-[#F8FAFC]">{g.genre}</span>
                              <span className="text-[#94A3B8] font-mono">{g.count} pedidos</span>
                            </div>
                            <div className="w-full h-2 bg-navy-900 rounded-full overflow-hidden border border-navy-700">
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
            <div className="p-12 text-center text-[#94A3B8] text-xs">
              Selecciona un evento para ver su reporte analítico.
            </div>
          )}
        </div>
      )}

      {/* VISTA 3: ADMINISTRACIÓN & AUDITORÍA */}
      {activeTab === "administration" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              title="Sedes / Locales"
              value={initialVenues.length}
              subtext="Locales dados de alta en la cuenta"
              icon={<Building2 className="w-4 h-4" />}
              accent="primary"
            />

            <KpiCard
              title="Plan SaaS Activo"
              value={planName || "Plan Base"}
              subtext={`${planPrice} / mes • ${planStatus}`}
              icon={<CreditCard className="w-4 h-4" />}
              accent="success"
            />

            <KpiCard
              title="Seguridad & Acceso"
              value="RBAC 100%"
              subtext="Aislamiento por tenant garantizado"
              icon={<ShieldCheck className="w-4 h-4" />}
              accent="karaoke"
            />
          </div>

          {/* Listado de Locales */}
          <div className="p-5 rounded-2xl bg-[#111F38] border border-[#263858] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>Locales Registrados</span>
              </h3>
              <Link
                href="/dashboard/events"
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
              >
                <span>Administrar Eventos &rarr;</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {initialVenues.map((venue) => (
                <div
                  key={venue.id}
                  className="p-3.5 rounded-xl bg-navy-900 border border-navy-700 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-[#F8FAFC]">{venue.name}</div>
                    <div className="text-[11px] text-[#94A3B8]">
                      {venue.address || "Sin dirección"}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-semibold text-purple-300">{venue._count.tables} mesas</div>
                    <div className="text-[10px] text-[#94A3B8]">{venue._count.events} eventos</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Registro de Auditoría Inmutable */}
          <div className="p-5 rounded-2xl bg-[#111F38] border border-[#263858] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Auditoría de Seguridad Inmutable</span>
              </h3>
              <span className="text-[10px] text-[#94A3B8]">Últimos eventos registrados</span>
            </div>

            <div className="divide-y divide-[#263858]">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Badge variant="neutral" size="xs">
                      {log.action}
                    </Badge>
                    <span className="text-slate-300">
                      Recurso: <strong className="text-[#F8FAFC]">{log.resource}</strong>
                    </span>
                    <span className="text-[#94A3B8] hidden sm:inline">
                      por {log.user?.name || "Sistema"} ({log.user?.role || "SYSTEM"})
                    </span>
                  </div>
                  <span className="text-[#94A3B8] text-[10px] font-mono">
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

      {/* Modales Existentes Preservados */}
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

      {data?.event && (
        <TvDisplayConnectModal
          isOpen={isTvModalOpen}
          onClose={() => setIsTvModalOpen(false)}
          eventCode={data.event.code}
          eventName={data.event.name}
          venueName={data.event.venueName}
        />
      )}
    </div>
  );
}
