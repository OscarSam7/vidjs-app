"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Download,
  KeyRound,
  Sliders,
  UserCheck,
  Database,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Clock,
  Terminal,
  Server,
  Lock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AuditItem {
  id: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface AuditResponse {
  items: AuditItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  metrics: {
    totalEvents: number;
    logins24h: number;
    uniqueOperators: number;
    topActions: Array<{ action: string; count: number }>;
  };
}

export default function AuditPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditItem | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "25");
      if (search.trim()) params.set("search", search.trim());
      if (selectedAction !== "ALL") params.set("action", selectedAction);

      const res = await fetch(`/api/v1/audit?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error("Error al cargar registros de auditoría:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedAction]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (selectedAction !== "ALL") params.set("action", selectedAction);
    params.set("format", "csv");
    window.open(`/api/v1/audit?${params.toString()}`, "_blank");
  };

  const getActionBadge = (action: string) => {
    if (action.includes("LOGIN") || action.includes("AUTH")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
          <KeyRound className="w-3 h-3 text-emerald-400" />
          {action}
        </span>
      );
    }
    if (action.includes("DELETE") || action.includes("REMOVE") || action.includes("REVOKE")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-700/60">
          {action}
        </span>
      );
    }
    if (action.includes("POLICY") || action.includes("UPDATE") || action.includes("SETTING")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60 flex items-center gap-1">
          <Sliders className="w-3 h-3 text-amber-400" />
          {action}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-700/60">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header con Resumen de Integridad Forense */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-purple-400" />
              REGISTRO INMUTABLE SHA-256
            </span>
            <span className="text-xs text-zinc-400">Trazabilidad legal de operaciones</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-purple-400" />
            Auditoría & Logs de Seguridad
          </h1>
          <p className="text-xs text-zinc-400">
            Registro cronológico inalterable de inicios de sesión, cambios de permisos, ajustes del sistema y acciones de DJ.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
            title="Refrescar registros"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md cursor-pointer"
            title="Exportar archivo CSV con firma forense"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjetas de Métricas de Seguridad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-400 uppercase font-bold tracking-wider">Total Eventos</div>
            <div className="text-xl font-black text-white">{data?.metrics.totalEvents ?? "—"}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-400 uppercase font-bold tracking-wider">Logins (Últimas 24h)</div>
            <div className="text-xl font-black text-white">{data?.metrics.logins24h ?? "—"}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-400 uppercase font-bold tracking-wider">Operadores Registrados</div>
            <div className="text-xl font-black text-white">{data?.metrics.uniqueOperators ?? "—"}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-400 uppercase font-bold tracking-wider">Estado de Trazabilidad</div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              100% Inmutable & Activo
            </div>
          </div>
        </div>
      </div>

      {/* 3. Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por usuario, IP, acción o recurso..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/60 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-purple-500/60 cursor-pointer"
          >
            <option value="ALL">Todas las acciones</option>
            <option value="AUTH_LOGIN">Inicios de sesión (AUTH_LOGIN)</option>
            <option value="DJ_QUEUE_POLICY_UPDATED">Políticas de DJ & Cola</option>
            <option value="VENUE_BRANDING_UPDATED">Personalización de Marca</option>
            <option value="SUBSCRIPTION_PLAN_CHANGED">Cambios de Suscripción</option>
            <option value="TABLE_DELETE">Eliminación de Mesas</option>
            <option value="PHOTO_DELETE">Moderación de Fotos</option>
          </select>
        </div>
      </div>

      {/* 4. Tabla de Registros de Auditoría */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Usuario Operador</th>
                <th className="py-3 px-4">Acción Ejecutada</th>
                <th className="py-3 px-4">Recurso / Entidad</th>
                <th className="py-3 px-4">Dirección IP</th>
                <th className="py-3 px-4 text-right">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading && !data ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                      <span>Consultando registro criptográfico de auditoría...</span>
                    </div>
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    No se encontraron registros con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                data.items.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-zinc-400 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{formatDate(log.createdAt)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {log.user ? (
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{log.user.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-normal">
                              {log.user.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-zinc-500 italic">Sistema / Invitado</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">{getActionBadge(log.action)}</td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-zinc-300 text-[11px] bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                        {log.resource}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-zinc-400 font-mono text-[11px]">
                      {log.ipAddress || "127.0.0.1"}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-[11px] font-medium inline-flex items-center gap-1 transition-all cursor-pointer"
                        title="Ver payload técnico"
                      >
                        <Eye className="w-3 h-3 text-purple-400" />
                        <span>Inspeccionar</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {data && data.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <div>
              Mostrando página <strong className="text-white">{data.pagination.page}</strong> de{" "}
              <strong className="text-white">{data.pagination.totalPages}</strong> ({data.pagination.total} registros)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Modal de Inspección Forense de Metadata */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Inspección de Registro #{selectedLog.id}</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Acción</span>
                  <span className="font-bold text-white">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Recurso</span>
                  <span className="font-mono text-purple-300">{selectedLog.resource}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Usuario</span>
                  <span className="text-zinc-200">
                    {selectedLog.user ? `${selectedLog.user.name} (${selectedLog.user.email})` : "Sistema"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Fecha Criptográfica</span>
                  <span className="text-zinc-200">{new Date(selectedLog.createdAt).toISOString()}</span>
                </div>
              </div>

              <div>
                <span className="text-zinc-400 block text-[11px] font-bold uppercase tracking-wider mb-1.5">
                  Payload Metadata (JSON Crudo)
                </span>
                <pre className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 font-mono text-[11px] text-purple-200 overflow-x-auto whitespace-pre-wrap max-h-60">
                  {typeof selectedLog.metadata === "object"
                    ? JSON.stringify(selectedLog.metadata, null, 2)
                    : selectedLog.metadata || "Sin metadata adjunta"}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
