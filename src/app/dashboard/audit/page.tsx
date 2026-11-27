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
import { VipSelectModal } from "@/components/ui/VipSelectModal";

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

  const ACTION_LABELS: Record<string, string> = {
    GASTRO_PRODUCT_CREATED: "Producto creado",
    GASTRO_PRODUCT_UPDATED: "Producto actualizado",
    GASTRO_PRODUCT_ARCHIVED: "Producto archivado",
    GASTRO_PRODUCT_DELETED: "Producto eliminado",
    GASTRO_CATEGORY_CREATED: "Categoría creada",
    GASTRO_CATEGORY_UPDATED: "Categoría actualizada",
    GASTRO_ORDER_CREATED: "Pedido registrado",
    GASTRO_ORDER_UPDATED: "Pedido actualizado",
    GASTRO_ORDER_CANCELLED: "Pedido cancelado",
    GASTRO_PAYMENT_CONFIRMED: "Pago confirmado",
    GASTRO_SHIFT_OPENED: "Apertura de caja",
    GASTRO_SHIFT_CLOSED: "Cierre de caja",
    AUTH_LOGIN: "Inicio de sesión",
    USER_LOGIN: "Inicio de sesión",
    AUTH_LOGOUT: "Cierre de sesión",
    USER_CREATED: "Usuario creado",
    USER_UPDATED: "Usuario actualizado",
    USER_DELETED: "Usuario eliminado",
    SETTINGS_UPDATED: "Configuración actualizada",
    RESERVATION_CREATED: "Reserva registrada",
    RESERVATION_APPROVED: "Reserva aprobada",
    RESERVATION_REJECTED: "Reserva rechazada",
    EVENT_CREATED: "Evento creado",
    EVENT_UPDATED: "Evento actualizado",
  };

  const RESOURCE_LABELS: Record<string, string> = {
    GASTRO_PRODUCT: "Producto de Gastronomía",
    GASTRO_CATEGORY: "Categoría de Menú",
    GASTRO_ORDER: "Pedido / Comanda",
    GASTRO_PAYMENT: "Pago / Cobro",
    GASTRO_SHIFT: "Turno de Caja",
    USER: "Usuario / Personal",
    AUTH: "Acceso al Sistema",
    TENANT: "Configuración del Local",
    EVENT: "Evento",
    RESERVATION: "Reserva VIP",
    TABLE: "Mesa",
    CLUB: "CYNKO Club VIP",
  };

  const FIELD_LABELS: Record<string, string> = {
    productName: "Producto",
    name: "Nombre",
    title: "Título",
    mode: "Acción realizada",
    performedBy: "Realizado por",
    role: "Rol",
    email: "Correo electrónico",
    orderNumber: "N° de Pedido",
    tableLabel: "Mesa",
    tableName: "Mesa",
    sectorName: "Sector",
    reason: "Motivo",
    cancelReason: "Motivo de cancelación",
    status: "Estado",
    previousStatus: "Estado anterior",
    newStatus: "Nuevo estado",
    paymentMethod: "Medio de pago",
    amountCents: "Monto",
    totalCents: "Total",
    priceCents: "Precio",
    discountCents: "Descuento",
    quantity: "Cantidad",
    stockQuantity: "Stock",
    categoryName: "Categoría",
    ip: "Dirección IP",
    ipAddress: "Dirección IP",
    userAgent: "Dispositivo / Navegador",
    eventName: "Evento",
    venueName: "Local",
    description: "Descripción",
  };

  const VALUE_LABELS: Record<string, string> = {
    archived: "Archivado",
    deleted: "Eliminado",
    created: "Creado",
    updated: "Actualizado",
    active: "Activo",
    inactive: "Inactivo",
    OWNER: "Propietario",
    MANAGER: "Gerente",
    SUPERVISOR: "Supervisor",
    DJ: "DJ / Cabina",
    CAJERO: "Cajero",
    ENCARGADO_BARRA: "Encargado de Barra",
    MOZO: "Mozo",
    OPERATOR: "Operador",
    SUPERADMIN: "Administrador General",
    CASH: "Efectivo",
    CARD: "Tarjeta",
    TRANSFER: "Transferencia",
    QR: "Pago QR",
  };

  const formatAuditAction = (action: string) => {
    if (ACTION_LABELS[action]) return ACTION_LABELS[action];
    return action
      .replace(/^GASTRO_/, "")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  const formatAuditResource = (resource: string) => {
    if (RESOURCE_LABELS[resource]) return RESOURCE_LABELS[resource];
    return resource
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  const formatMetadataKey = (key: string) => {
    if (FIELD_LABELS[key]) return FIELD_LABELS[key];
    return key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  const formatMetadataValue = (key: string, val: unknown): string => {
    if (val === null || val === undefined || val === "") return "—";
    if (typeof val === "boolean") return val ? "Sí" : "No";
    if (typeof val === "number") {
      if (key.toLowerCase().includes("cents") || key.toLowerCase().includes("price") || key.toLowerCase().includes("amount")) {
        return `Gs. ${Math.round(val).toLocaleString("es-PY")}`;
      }
      return val.toLocaleString("es-PY");
    }
    if (typeof val === "string") {
      if (VALUE_LABELS[val]) return VALUE_LABELS[val];
      if (VALUE_LABELS[val.toLowerCase()]) return VALUE_LABELS[val.toLowerCase()];
      return val;
    }
    if (Array.isArray(val)) {
      return val.map((item) => (typeof item === "object" ? Object.values(item || {}).join(" · ") : String(item))).join(", ");
    }
    if (typeof val === "object") {
      return Object.entries(val as Record<string, unknown>)
        .map(([k, v]) => `${formatMetadataKey(k)}: ${formatMetadataValue(k, v)}`)
        .join(" | ");
    }
    return String(val);
  };

  const parseMetadataEntries = (raw: unknown): Array<[string, unknown]> => {
    if (!raw) return [];
    let obj: unknown = raw;
    if (typeof raw === "string") {
      try {
        obj = JSON.parse(raw);
      } catch {
        return [["Detalle", raw]];
      }
    }
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      return Object.entries(obj as Record<string, unknown>).filter(
        ([, v]) => v !== null && v !== undefined && v !== ""
      );
    }
    return [["Detalle", obj]];
  };

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

        <div className="w-full sm:w-72">
          <VipSelectModal
            value={selectedAction}
            onChange={(val) => {
              setSelectedAction(val);
              setPage(1);
            }}
            options={[
              {
                value: "ALL",
                label: "Todas las acciones",
                subtitle: "Mostrar todos los eventos de auditoría del sistema",
                badge: "TODAS",
                badgeTone: "bg-purple-500/20 text-purple-300 border-purple-500/40",
                icon: ShieldCheck,
              },
              {
                value: "AUTH_LOGIN",
                label: "Inicios de sesión (AUTH_LOGIN)",
                subtitle: "Autenticación de personal y accesos administrativos",
                badge: "LOGIN",
                badgeTone: "bg-blue-500/20 text-blue-300 border-blue-500/40",
                icon: KeyRound,
              },
              {
                value: "DJ_QUEUE_POLICY_UPDATED",
                label: "Políticas de DJ & Cola",
                subtitle: "Cambios en reglas de reproducción y prioridades",
                badge: "DJ POLÍTICA",
                badgeTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
                icon: Sliders,
              },
              {
                value: "VENUE_BRANDING_UPDATED",
                label: "Personalización de Marca",
                subtitle: "Logos, colores y configuración visual del club",
                badge: "BRANDING",
                badgeTone: "bg-pink-500/20 text-pink-300 border-pink-500/40",
                icon: ShieldCheck,
              },
              {
                value: "SUBSCRIPTION_PLAN_CHANGED",
                label: "Cambios de Suscripción",
                subtitle: "Modificaciones al plan SaaS y módulos contratados",
                badge: "PLAN",
                badgeTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
                icon: Database,
              },
              {
                value: "TABLE_DELETE",
                label: "Eliminación de Mesas",
                subtitle: "Baja de ubicaciones o sectores del plano",
                badge: "MESAS",
                badgeTone: "bg-rose-500/20 text-rose-300 border-rose-500/40",
                icon: ShieldCheck,
              },
              {
                value: "PHOTO_DELETE",
                label: "Moderación de Fotos",
                subtitle: "Eliminación de imágenes en pantalla o muro social",
                badge: "FOTOS",
                badgeTone: "bg-rose-500/20 text-rose-300 border-rose-500/40",
                icon: ShieldCheck,
              },
            ]}
            title="Filtrar por Acción"
            subtitle="Selecciona el tipo de evento registrado en el log"
            placeholder="Todas las acciones..."
            icon={Filter}
            showSearch={true}
          />
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

      {/* 5. Modal de Detalle de Actividad (Vista Ejecutiva Amigable) */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-white truncate">
                    Detalle de Actividad
                  </h3>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {formatAuditAction(selectedLog.action)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                aria-label="Cerrar detalle"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Resumen Principal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">
                    Actividad
                  </span>
                  <span className="font-bold text-white text-sm mt-0.5 block">
                    {formatAuditAction(selectedLog.action)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">
                    Sección / Área
                  </span>
                  <span className="font-bold text-purple-300 mt-0.5 block">
                    {formatAuditResource(selectedLog.resource)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">
                    Responsable
                  </span>
                  <span className="text-zinc-200 font-semibold mt-0.5 block">
                    {selectedLog.user ? selectedLog.user.name : "Sistema automático"}
                  </span>
                  {selectedLog.user?.email && (
                    <span className="text-[11px] text-zinc-400 block">{selectedLog.user.email}</span>
                  )}
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">
                    Fecha y Hora
                  </span>
                  <span className="text-zinc-200 font-semibold mt-0.5 block">
                    {new Date(selectedLog.createdAt).toLocaleDateString("es-PY", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    {new Date(selectedLog.createdAt).toLocaleTimeString("es-PY", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}{" "}
                    hs
                  </span>
                </div>
              </div>

              {/* Detalles en Lenguaje Claro (sin JSON crudo) */}
              <div>
                <span className="text-zinc-400 block text-[11px] font-bold uppercase tracking-wider mb-2">
                  Resumen de lo ocurrido
                </span>
                {(() => {
                  const entries = parseMetadataEntries(selectedLog.metadata);
                  if (entries.length === 0) {
                    return (
                      <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-zinc-400 text-center">
                        No hay detalles adicionales registrados para este movimiento.
                      </div>
                    );
                  }
                  return (
                    <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 divide-y divide-zinc-800/80 overflow-hidden">
                      {entries.map(([key, val]) => (
                        <div
                          key={key}
                          className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                        >
                          <span className="text-[11px] font-semibold text-zinc-400">
                            {formatMetadataKey(key)}
                          </span>
                          <span className="text-xs font-bold text-white sm:text-right break-words">
                            {formatMetadataValue(key, val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Referencia técnica oculta (solo para soporte) */}
              <details className="pt-1">
                <summary className="text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer select-none font-medium">
                  Ver referencia técnica para soporte
                </summary>
                <div className="mt-2 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[10px] font-mono text-zinc-400 space-y-1">
                  <div>ID: {selectedLog.id}</div>
                  <div>Código: {selectedLog.action} ({selectedLog.resource})</div>
                  <div>Marca UTC: {new Date(selectedLog.createdAt).toISOString()}</div>
                </div>
              </details>
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white cursor-pointer transition-colors"
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
