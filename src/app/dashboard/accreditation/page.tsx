"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAccreditation } from "@/lib/accreditation/context";
import {
  Users,
  IdCard,
  UserCheck,
  Clock,
  DoorOpen,
  ScanLine,
  Tags,
  Printer,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  Calendar,
  MapPin,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface DashboardData {
  hasEvents: boolean;
  event: any;
  metrics: {
    totalParticipants: number;
    totalAccredited: number;
    totalCheckedIn: number;
    totalPending: number;
    attendanceRate: number;
    totalGates: number;
  };
  categories: Array<{
    id: string;
    name: string;
    code: string;
    colorHex: string;
    totalParticipants: number;
    totalCheckedIn: number;
    maxAvailable: number | null;
    percent: number;
  }>;
  gates: Array<{
    id: string;
    name: string;
    code: string;
    sectorType: string;
    checkInsCount: number;
  }>;
  recentCheckIns: Array<{
    id: string;
    status: string;
    scannedAt: string;
    operatorName: string | null;
    participant: {
      id: string;
      firstName: string;
      lastName: string;
      documentNumber: string;
      company: string | null;
      jobTitle: string | null;
      photoUrl: string | null;
    };
    accessPoint: {
      id: string;
      name: string;
      code: string;
    } | null;
    accreditationType: {
      id: string;
      name: string;
      colorHex: string;
    } | null;
  }>;
  hourlyCheckIns: Array<{
    hour: string;
    count: number;
  }>;
}

export default function AccreditationDashboardPage() {
  const { activeEventId, setCreateEventModalOpen, isOnline } = useAccreditation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const url = activeEventId
        ? `/api/v1/accreditation/dashboard?eventId=${activeEventId}`
        : "/api/v1/accreditation/dashboard";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeEventId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Periodic refresh every 15 seconds for live ingress monitoring
  useEffect(() => {
    const timer = setInterval(() => {
      fetchDashboardData(true);
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchDashboardData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mb-3" />
        <p className="text-sm">Cargando panel de control de acreditación...</p>
      </div>
    );
  }

  if (!data?.hasEvents) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-950/60 border border-purple-700/60 flex items-center justify-center text-purple-400 shadow-xl mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Bienvenido al Módulo de Acreditaciones
        </h2>
        <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
          Gestiona acreditaciones para congresos, conferencias, ferias y festivales con emisión de códigos QR antifraude, credenciales personalizadas y escáner de alta velocidad.
        </p>
        <Button
          variant="primary"
          onClick={() => setCreateEventModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-2.5 shadow-lg"
        >
          Crear Primer Evento
        </Button>
      </div>
    );
  }

  const { metrics, categories, gates, recentCheckIns, event } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner / Event Quick Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60">
              {event?.eventType || "EVENTO"}
            </span>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full font-bold",
                event?.status === "ACTIVE"
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  : "bg-slate-800 text-slate-300"
              )}
            >
              {event?.status || "ACTIVO"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {event?.name}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              {new Date(event?.startsAt).toLocaleDateString("es-PY", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            {event?.locationName && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-400" />
                {event.locationName}
              </span>
            )}
            {event?.maxCapacity && (
              <span className="text-slate-300 font-mono">
                Aforo máx: <strong>{event.maxCapacity}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing}
            className="border-[#263858] text-slate-300 hover:text-white"
            title="Refrescar métricas"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isRefreshing && "animate-spin")} />
            <span>{isRefreshing ? "Actualizando..." : "Actualizar"}</span>
          </Button>

          <Link href="/dashboard/accreditation/scanner">
            <Button
              variant="primary"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <ScanLine className="w-4 h-4" />
              <span>Abrir Escáner</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid (Fase 9) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Registrados */}
        <div className="bg-[#0F1E36] border border-[#263858] rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Registrados</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {metrics?.totalParticipants ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>En base de datos</span>
            <Link
              href="/dashboard/accreditation/participants"
              className="text-purple-400 hover:underline flex items-center"
            >
              Ver <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: Acreditaciones Emitidas */}
        <div className="bg-[#0F1E36] border border-[#263858] rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Acreditados</span>
            <IdCard className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400 tracking-tight">
            {metrics?.totalAccredited ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Credencial lista / entregada</span>
            <Link
              href="/dashboard/accreditation/badges"
              className="text-blue-400 hover:underline flex items-center"
            >
              Imprimir <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Ingresados / Presentes */}
        <div className="bg-[#0F1E36] border border-emerald-900/60 rounded-xl p-4 shadow-sm relative overflow-hidden bg-gradient-to-br from-[#0F1E36] to-emerald-950/20">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-emerald-300">Ingresados / En Sala</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {metrics?.totalCheckedIn ?? 0}
          </div>
          <div className="text-[11px] text-emerald-300/80 mt-1 flex items-center justify-between">
            <span>{metrics?.attendanceRate ?? 0}% Asistencia real</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Card 4: Pendientes */}
        <div className="bg-[#0F1E36] border border-[#263858] rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Pendientes</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">
            {metrics?.totalPending ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Por acreditar o validar</div>
        </div>

        {/* Card 5: Puertas Activas */}
        <div className="bg-[#0F1E36] border border-[#263858] rounded-xl p-4 shadow-sm relative overflow-hidden col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Puertas Activas</span>
            <DoorOpen className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 tracking-tight">
            {metrics?.totalGates ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Puntos de control</span>
            <Link
              href="/dashboard/accreditation/access-points"
              className="text-cyan-400 hover:underline flex items-center"
            >
              Configurar <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Global Ingress Progress Bar */}
      <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Progreso de Acreditación e Ingreso al Evento
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-purple-300">
            {metrics?.totalCheckedIn ?? 0} de {metrics?.totalParticipants ?? 0} participantes ({metrics?.attendanceRate ?? 0}%)
          </span>
        </div>
        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${metrics?.attendanceRate ?? 0}%` }}
            title={`Ingresados: ${metrics?.totalCheckedIn ?? 0}`}
          />
        </div>
      </div>

      {/* Quick Action Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Link
          href="/dashboard/accreditation/participants"
          className="group block p-4 bg-[#0F1E36] hover:bg-[#13233F] border border-[#263858] hover:border-purple-600/50 rounded-xl transition-all shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-950/70 border border-purple-700/50 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
          </div>
          <h4 className="text-sm font-bold text-white">Registro de Participantes</h4>
          <p className="text-xs text-slate-400 mt-1">
            Carga manual, importación masiva Excel/CSV y asignación de credenciales.
          </p>
        </Link>

        <Link
          href="/dashboard/accreditation/types"
          className="group block p-4 bg-[#0F1E36] hover:bg-[#13233F] border border-[#263858] hover:border-blue-600/50 rounded-xl transition-all shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-950/70 border border-blue-700/50 flex items-center justify-center text-blue-300 group-hover:scale-110 transition-transform">
              <Tags className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <h4 className="text-sm font-bold text-white">Tipos de Acreditación</h4>
          <p className="text-xs text-slate-400 mt-1">
            Configurar VIP, Prensa, Staff, colores, cupos máximos y permisos de acceso.
          </p>
        </Link>

        <Link
          href="/dashboard/accreditation/badges"
          className="group block p-4 bg-[#0F1E36] hover:bg-[#13233F] border border-[#263858] hover:border-cyan-600/50 rounded-xl transition-all shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/70 border border-cyan-700/50 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform">
              <Printer className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          </div>
          <h4 className="text-sm font-bold text-white">Diseño & Impresión</h4>
          <p className="text-xs text-slate-400 mt-1">
            Plantillas para credencial vertical, etiqueta térmica, pulsera o PVC.
          </p>
        </Link>

        <Link
          href="/dashboard/accreditation/scanner"
          className="group block p-4 bg-[#0F1E36] hover:bg-[#13233F] border border-emerald-900/60 hover:border-emerald-600/60 rounded-xl transition-all shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-700/50 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform">
              <ScanLine className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h4 className="text-sm font-bold text-white">Control de Acceso QR</h4>
          <p className="text-xs text-slate-400 mt-1">
            Escáner rápido con cámara o pistola láser, audio feedback y antifraude.
          </p>
        </Link>
      </div>

      {/* Two Column Layout: Categories Breakdown & Recent Ingress Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (1/3): Category Breakdown */}
        <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#263858] pb-3">
            <div className="flex items-center gap-2">
              <Tags className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Categorías de Acceso</h3>
            </div>
            <Link
              href="/dashboard/accreditation/types"
              className="text-xs text-purple-400 hover:underline"
            >
              Gestionar
            </Link>
          </div>

          <div className="space-y-3">
            {categories.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Sin categorías configuradas
              </p>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3 bg-[#0A1322] border border-[#263858] rounded-xl space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: cat.colorHex }}
                      />
                      <span className="font-semibold text-white">{cat.name}</span>
                    </div>
                    <span className="font-mono text-slate-300">
                      {cat.totalCheckedIn} / {cat.totalParticipants}
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${cat.percent}%`,
                        backgroundColor: cat.colorHex,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Código: {cat.code}</span>
                    <span>{cat.percent}% presente</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (2/3): Live Recent Ingress Feed */}
        <div className="lg:col-span-2 bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#263858] pb-3">
            <div className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Últimos Ingresos en Vivo</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 animate-pulse">
                Live Feed
              </span>
            </div>
            <Link
              href="/dashboard/accreditation/reports"
              className="text-xs text-purple-400 hover:underline"
            >
              Ver Auditoría Completa
            </Link>
          </div>

          {recentCheckIns.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <ScanLine className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              No se registran ingresos recientes para este evento todavía.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-[#263858]/60 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="pb-2.5">Participante</th>
                    <th className="pb-2.5">Categoría</th>
                    <th className="pb-2.5">Puerta / Acceso</th>
                    <th className="pb-2.5">Hora</th>
                    <th className="pb-2.5 text-right">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#263858]/40">
                  {recentCheckIns.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs shrink-0 overflow-hidden">
                            {item.participant.photoUrl ? (
                              <img
                                src={item.participant.photoUrl}
                                alt={item.participant.firstName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              item.participant.firstName[0]
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-white block">
                              {item.participant.firstName} {item.participant.lastName}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Doc: {item.participant.documentNumber}
                              {item.participant.company ? ` • ${item.participant.company}` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5">
                        {item.accreditationType ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: `${item.accreditationType.colorHex}22`,
                              color: item.accreditationType.colorHex,
                              border: `1px solid ${item.accreditationType.colorHex}44`,
                            }}
                          >
                            {item.accreditationType.name}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      <td className="py-2.5 text-slate-300">
                        {item.accessPoint?.name || "Puerta Principal"}
                      </td>

                      <td className="py-2.5 text-slate-400 font-mono text-[11px]">
                        {new Date(item.scannedAt).toLocaleTimeString("es-PY", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>

                      <td className="py-2.5 text-right">
                        {item.status === "APPROVED" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ingreso OK
                          </span>
                        ) : item.status === "DUPLICATE" ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Ya ingresó
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            Rechazado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
