"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccreditation } from "@/lib/accreditation/context";
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  DoorOpen,
  Tags,
  FileSpreadsheet,
  Clock,
  Filter,
  Search,
  Loader2,
  TrendingUp,
  Printer,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { VipSelectModal } from "@/components/ui/VipSelectModal";
import { cn } from "@/lib/utils";

export default function AccreditationReportsPage() {
  const { activeEvent, activeEventId, setCreateEventModalOpen } = useAccreditation();

  const [reportsData, setReportsData] = useState<any | null>(null);
  const [activeReportTab, setActiveReportTab] = useState<"audit" | "hourly" | "organizations" | "categories">("audit");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    if (!activeEventId) {
      setReportsData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/accreditation/reports?eventId=${activeEventId}`);
      if (res.ok) {
        const json = await res.json();
        setReportsData(json);
      }
    } catch (err) {
      console.error("Error loading reports:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeEventId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Export Full Audit CSV
  const handleExportAuditCsv = () => {
    const list = reportsData?.checkIns || [];
    if (list.length === 0) {
      alert("No hay registros de asistencia para exportar.");
      return;
    }

    const headers = [
      "ID Registro",
      "Fecha y Hora",
      "Participante",
      "Documento",
      "Tipo Documento",
      "Empresa / Delegacion",
      "Cargo",
      "Email",
      "Categoria",
      "Puerta",
      "Sector",
      "Operador",
      "Resultado",
      "Motivo Rechazo",
    ];

    const rows = list.map((r: any) => [
      r.id,
      new Date(r.scannedAt).toISOString(),
      `"${r.participant?.firstName || ""} ${r.participant?.lastName || ""}"`,
      `"${r.participant?.documentNumber || ""}"`,
      r.participant?.documentType || "CI",
      `"${r.participant?.organization?.name || r.participant?.company || ""}"`,
      `"${r.participant?.jobTitle || ""}"`,
      `"${r.participant?.email || ""}"`,
      `"${r.accreditation?.accreditationType?.name || ""}"`,
      `"${r.accessPoint?.name || "Puerta Principal"}"`,
      `"${r.accessPoint?.sectorType || "MAIN"}"`,
      `"${r.operatorName || "Sistema"}"`,
      r.status,
      `"${r.rejectionReason || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `reporte_asistencia_${activeEvent?.code || "evento"}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (!activeEventId) {
    return (
      <div className="py-16 text-center bg-[#0F1E36] border border-[#263858] rounded-2xl p-8 max-w-xl mx-auto">
        <BarChart3 className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-2">Selecciona un Evento</h3>
        <p className="text-xs text-slate-400 mb-5">
          Debes seleccionar un evento activo para consultar estadísticas y registros de auditoría.
        </p>
        <Button
          variant="primary"
          onClick={() => setCreateEventModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
        >
          Crear Evento
        </Button>
      </div>
    );
  }

  const summary = reportsData?.summary;
  const categories = reportsData?.categoryStats || [];
  const orgs = reportsData?.organizationStats || [];
  const hourlyFlow = reportsData?.hourlyFlow || [];
  const logs = reportsData?.checkIns || [];

  const filteredLogs = logs.filter((l: any) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      (l.participant?.firstName || "").toLowerCase().includes(q) ||
      (l.participant?.lastName || "").toLowerCase().includes(q) ||
      (l.participant?.documentNumber || "").toLowerCase().includes(q) ||
      (l.participant?.company || "").toLowerCase().includes(q) ||
      (l.accessPoint?.name || "").toLowerCase().includes(q);

    const matchStatus = statusFilter === "ALL" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60">
              {activeEvent?.name}
            </span>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700/60">
              {reportsData?.event?.venueName || "Sede Centro"}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Reportes, Estadísticas & Libro de Auditoría
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Métricas de asistencia, aforo por sector, libro de auditoría y picos de ingreso
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintReport}
            className="border-[#263858] text-slate-300 hover:text-white flex items-center gap-1.5 text-xs"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Imprimir / PDF</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportAuditCsv}
            disabled={logs.length === 0}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-2 text-xs shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Asistencia (CSV)</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-400 block font-semibold mb-1">Total Registrados</span>
          <div className="text-2xl font-bold text-white font-mono">{summary?.totalParticipants ?? 0}</div>
          <span className="text-[10px] text-slate-500 mt-1">En padrón oficial</span>
        </div>

        <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-400 block font-semibold mb-1">Acreditaciones Listas</span>
          <div className="text-2xl font-bold text-blue-400 font-mono">{summary?.totalAccredited ?? 0}</div>
          <span className="text-[10px] text-blue-400/80 mt-1">Credenciales emitidas</span>
        </div>

        <div className="bg-[#0F1E36] border border-emerald-900/60 rounded-2xl p-4 bg-gradient-to-br from-[#0F1E36] to-emerald-950/20 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-emerald-300 block font-semibold mb-1">Ingresados / En Sala</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{summary?.totalCheckedIn ?? 0}</div>
          <div className="text-[11px] text-emerald-300/80 font-mono mt-0.5">
            {summary?.attendanceRate ?? 0}% Asistencia Real
          </div>
        </div>

        <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-400 block font-semibold mb-1">Pendientes de Ingreso</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {summary?.totalPending ?? 0}
          </div>
          <span className="text-[10px] text-amber-400/80 mt-1">Aún no ingresaron</span>
        </div>

        <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-4 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-xs text-slate-400 block font-semibold mb-1">Total Escaneos</span>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {summary?.totalCheckInRecords ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            {summary?.approvedCheckIns ?? 0} válidos • {summary?.rejectedCheckIns ?? 0} alertas
          </span>
        </div>
      </div>

      {/* Reports Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#263858] pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveReportTab("audit")}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            activeReportTab === "audit"
              ? "bg-purple-600 text-white shadow-md shadow-purple-950"
              : "text-slate-400 hover:text-white hover:bg-[#0F1E36]"
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Libro de Asistencia ({logs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab("hourly")}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            activeReportTab === "hourly"
              ? "bg-purple-600 text-white shadow-md shadow-purple-950"
              : "text-slate-400 hover:text-white hover:bg-[#0F1E36]"
          )}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Flujo Horario & Picos ({hourlyFlow.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab("organizations")}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            activeReportTab === "organizations"
              ? "bg-purple-600 text-white shadow-md shadow-purple-950"
              : "text-slate-400 hover:text-white hover:bg-[#0F1E36]"
          )}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Empresas & Delegaciones ({orgs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab("categories")}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            activeReportTab === "categories"
              ? "bg-purple-600 text-white shadow-md shadow-purple-950"
              : "text-slate-400 hover:text-white hover:bg-[#0F1E36]"
          )}
        >
          <Tags className="w-3.5 h-3.5" />
          <span>Categorías de Acreditación ({categories.length})</span>
        </button>
      </div>

      {/* TAB 1: LIBRO DE ASISTENCIA & AUDITORÍA COMPLETO */}
      {activeReportTab === "audit" && (
        <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#263858] pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Registro Detallado de Ingresos y Escaneos</h3>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Input
                type="text"
                placeholder="Buscar por nombre, documento, empresa o puerta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white text-xs w-full sm:w-72"
              />

              <div className="w-full sm:w-44">
                <VipSelectModal
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  options={[
                    { value: "ALL", label: "Todos los Estados", badge: "TODOS", badgeTone: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
                    { value: "APPROVED", label: "Autorizado", badge: "OK", badgeTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", icon: CheckCircle2 },
                    { value: "DUPLICATE", label: "Duplicado", badge: "ALERTA", badgeTone: "bg-amber-500/20 text-amber-300 border-amber-500/40", icon: AlertTriangle },
                    { value: "REJECTED", label: "Rechazado", badge: "DENEGADO", badgeTone: "bg-rose-500/20 text-rose-300 border-rose-500/40", icon: XCircle },
                  ]}
                  title="Filtrar por Resultado"
                  subtitle="Filtra los registros de ingreso al evento"
                  placeholder="Todos los Estados"
                  icon={CheckCircle2}
                />
              </div>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No se registran eventos de auditoría para este filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0A1322] text-slate-400 border-b border-[#263858] text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Fecha & Hora</th>
                    <th className="py-2.5 px-3">Participante</th>
                    <th className="py-2.5 px-3">Documento</th>
                    <th className="py-2.5 px-3">Empresa / Delegación</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3">Puerta</th>
                    <th className="py-2.5 px-3">Operador</th>
                    <th className="py-2.5 px-3 text-right">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#263858]/40">
                  {filteredLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                        {new Date(log.scannedAt).toLocaleDateString("es-PY")} •{" "}
                        {new Date(log.scannedAt).toLocaleTimeString("es-PY")}
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-white">
                        {log.participant?.firstName} {log.participant?.lastName}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {log.participant?.documentNumber}
                      </td>

                      <td className="py-2.5 px-3 text-slate-400">
                        {log.participant?.organization?.name || log.participant?.company || "-"}
                      </td>

                      <td className="py-2.5 px-3">
                        {log.accreditation?.accreditationType ? (
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: `${log.accreditation.accreditationType.colorHex}22`,
                              color: log.accreditation.accreditationType.colorHex,
                              border: `1px solid ${log.accreditation.accreditationType.colorHex}44`,
                            }}
                          >
                            {log.accreditation.accreditationType.name}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-300">
                        {log.accessPoint?.name || "Puerta Principal"}
                      </td>

                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {log.operatorName || "Sistema"}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {log.status === "APPROVED" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Autorizado
                          </span>
                        ) : log.status === "DUPLICATE" ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" /> Duplicado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" /> Rechazado
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
      )}

      {/* TAB 2: FLUJO HORARIO Y PICOS DE INGRESO */}
      {activeReportTab === "hourly" && (
        <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#263858] pb-3">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Flujo de Asistencia por Franja Horaria</h3>
              <p className="text-xs text-slate-400">Identifica los picos de afluencia para optimizar la dotación en puertas</p>
            </div>
          </div>

          {hourlyFlow.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Aún no se registran ingresos para calcular el flujo horario.
            </div>
          ) : (
            <div className="space-y-3">
              {hourlyFlow.map((h: any) => {
                const maxFlow = Math.max(...hourlyFlow.map((i: any) => i.count), 1);
                const percent = Math.round((h.count / maxFlow) * 100);

                return (
                  <div key={h.hour} className="p-3 bg-[#0A1322] border border-[#263858] rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-400" /> {h.hour} hs
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-bold">{h.approved} autorizados</span>
                        {h.rejected > 0 && <span className="text-rose-400 font-bold">{h.rejected} alertas</span>}
                        <strong className="text-white text-sm bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60">
                          {h.count} ingresos
                        </strong>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden flex">
                      <div
                        className="bg-purple-500 h-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RESUMEN POR DELEGACIÓN / EMPRESA */}
      {activeReportTab === "organizations" && (
        <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#263858] pb-3">
            <Building2 className="w-4 h-4 text-purple-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Consolidado por Empresa y Delegación</h3>
              <p className="text-xs text-slate-400">Seguimiento de cupos y porcentaje de asistencia institucional</p>
            </div>
          </div>

          {orgs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No hay delegaciones o empresas vinculadas a este evento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orgs.map((org: any) => (
                <div key={org.id} className="p-4 bg-[#0A1322] border border-[#263858] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{org.name}</h4>
                      {org.contactName && (
                        <p className="text-xs text-slate-400">Responsable: {org.contactName}</p>
                      )}
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      {org.attendanceRate}% Asistencia
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300 font-mono pt-1">
                    <span>Presentes en sala:</span>
                    <strong className="text-emerald-400">{org.totalCheckedIn} de {org.totalMembers} miembros</strong>
                  </div>

                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${org.attendanceRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CATEGORÍAS DE ACREDITACIÓN */}
      {activeReportTab === "categories" && (
        <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#263858] pb-3">
            <Tags className="w-4 h-4 text-purple-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Desglose por Categoría y Nivel de Acceso</h3>
              <p className="text-xs text-slate-400">Control de cupos asignados y asistentes en sala</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((c: any) => (
              <div key={c.id} className="p-4 bg-[#0A1322] border border-[#263858] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.colorHex }} />
                    <h4 className="text-sm font-bold text-white">{c.name}</h4>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {c.code}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                  <span>En Sala:</span>
                  <strong className="text-emerald-400">
                    {c.totalCheckedIn} / {c.totalParticipants}
                  </strong>
                </div>

                {c.maxAvailable && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Cupo Máx:</span>
                    <span>{c.maxAvailable}</span>
                  </div>
                )}

                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${c.attendanceRate}%`,
                      backgroundColor: c.colorHex || "#8b5cf6",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
