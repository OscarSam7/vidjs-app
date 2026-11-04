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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export default function AccreditationReportsPage() {
  const { activeEvent, activeEventId, setCreateEventModalOpen } = useAccreditation();

  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    if (!activeEventId) {
      setDashboardData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/accreditation/dashboard?eventId=${activeEventId}`);
      if (res.ok) {
        const json = await res.json();
        setDashboardData(json);
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

  // Export Audit CSV
  const handleExportAuditCsv = () => {
    if (!dashboardData?.recentCheckIns || dashboardData.recentCheckIns.length === 0) return;

    const headers = [
      "ID Registro",
      "Fecha y Hora",
      "Participante",
      "Documento",
      "Empresa",
      "Categoria",
      "Puerta",
      "Operador",
      "Resultado",
      "Motivo Rechazo",
    ];

    const rows = dashboardData.recentCheckIns.map((r: any) => [
      r.id,
      new Date(r.scannedAt).toISOString(),
      `"${r.participant.firstName} ${r.participant.lastName}"`,
      `"${r.participant.documentNumber}"`,
      `"${r.participant.company || ""}"`,
      `"${r.accreditationType?.name || ""}"`,
      `"${r.accessPoint?.name || ""}"`,
      `"${r.operatorName || ""}"`,
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
      `auditoria_accesos_${activeEvent?.code || "evento"}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const metrics = dashboardData?.metrics;
  const categories = dashboardData?.categories || [];
  const gates = dashboardData?.gates || [];
  const logs = dashboardData?.recentCheckIns || [];

  const filteredLogs = logs.filter((l: any) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      l.participant.firstName.toLowerCase().includes(q) ||
      l.participant.lastName.toLowerCase().includes(q) ||
      l.participant.documentNumber.toLowerCase().includes(q) ||
      (l.accessPoint?.name && l.accessPoint.name.toLowerCase().includes(q));

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
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Reportes, Estadísticas & Libro de Auditoría
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Métricas de asistencia, aforo por sector y registro de cada intento de acceso
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleExportAuditCsv}
          disabled={logs.length === 0}
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-2 text-xs shadow-md"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Libro de Auditoría (CSV)</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#0F1E36] border border-[#263858] rounded-xl p-4">
          <span className="text-xs text-slate-400 block font-semibold mb-1">Total Registrados</span>
          <div className="text-2xl font-bold text-white">{metrics?.totalParticipants ?? 0}</div>
        </div>

        <div className="bg-[#0F1E36] border border-[#263858] rounded-xl p-4">
          <span className="text-xs text-slate-400 block font-semibold mb-1">Acreditaciones Listas</span>
          <div className="text-2xl font-bold text-blue-400">{metrics?.totalAccredited ?? 0}</div>
        </div>

        <div className="bg-[#0F1E36] border border-emerald-900/60 rounded-xl p-4 bg-gradient-to-br from-[#0F1E36] to-emerald-950/20">
          <span className="text-xs text-emerald-300 block font-semibold mb-1">Participantes Presentes</span>
          <div className="text-2xl font-bold text-emerald-400">{metrics?.totalCheckedIn ?? 0}</div>
          <div className="text-[11px] text-emerald-300/80 font-mono mt-0.5">
            {metrics?.attendanceRate ?? 0}% Asistencia Real
          </div>
        </div>

        <div className="bg-[#0F1E36] border border-[#263858] rounded-xl p-4">
          <span className="text-xs text-slate-400 block font-semibold mb-1">Participantes Ausentes</span>
          <div className="text-2xl font-bold text-amber-400">
            {Math.max(0, (metrics?.totalParticipants ?? 0) - (metrics?.totalCheckedIn ?? 0))}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Categories & Gates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories Breakdown */}
        <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-[#263858] pb-3">
            <Tags className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Asistencia por Categoría</h3>
          </div>

          <div className="space-y-2">
            {categories.map((c: any) => (
              <div
                key={c.id}
                className="p-3 bg-[#0A1322] border border-[#263858] rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.colorHex }} />
                  <span className="font-semibold text-white">{c.name}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-400">
                    {c.totalCheckedIn} / {c.totalParticipants}
                  </span>
                  <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                    {c.percent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Access Points Breakdown */}
        <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-[#263858] pb-3">
            <DoorOpen className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Ingresos por Puerta / Acceso</h3>
          </div>

          <div className="space-y-2">
            {gates.map((g: any) => (
              <div
                key={g.id}
                className="p-3 bg-[#0A1322] border border-[#263858] rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-white block">{g.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono uppercase">
                    Sector: {g.sectorType}
                  </span>
                </div>
                <div className="text-right font-mono">
                  <strong className="text-cyan-400 text-sm">{g.checkInsCount}</strong>
                  <span className="text-slate-400 text-[10px] block">ingresos</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Audit Log Table (Fase 9 & 10) */}
      <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#263858] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Libro de Asistencia & Auditoría en Vivo</h3>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Buscar por participante, documento o puerta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0A1322] border-[#263858] text-white text-xs w-64"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0A1322] border border-[#263858] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="APPROVED">Autorizado</option>
              <option value="DUPLICATE">Duplicado</option>
              <option value="REJECTED">Rechazado</option>
            </select>
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
                      {log.participant.firstName} {log.participant.lastName}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {log.participant.documentNumber}
                    </td>

                    <td className="py-2.5 px-3">
                      {log.accreditationType ? (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: `${log.accreditationType.colorHex}22`,
                            color: log.accreditationType.colorHex,
                            border: `1px solid ${log.accreditationType.colorHex}44`,
                          }}
                        >
                          {log.accreditationType.name}
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
    </div>
  );
}
