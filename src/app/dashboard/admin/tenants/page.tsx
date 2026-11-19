"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  CreditCard,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Disc3,
  UtensilsCrossed,
  Mic,
  CalendarClock,
  Lock,
  X,
  Sliders,
  AlertCircle
} from "lucide-react";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "PENDING_APPROVAL" | "SUSPENDED" | string;
  logoUrl: string | null;
  serviceType: string;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    createdAt: string;
  } | null;
  counts: {
    venues: number;
    users: number;
    tables: number;
    events: number;
  };
  subscription: {
    id: string;
    status: string;
    planCode: string;
    planName: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    daysRemaining: number;
    isExpired?: boolean;
  } | null;
}

interface StatsData {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  expired: number;
}

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [stats, setStats] = useState<StatsData>({ total: 0, active: 0, pending: 0, suspended: 0, expired: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Estado del Modal de Asignación Manual de Días
  const [selectedTenantForDays, setSelectedTenantForDays] = useState<TenantData | null>(null);
  const [customDays, setCustomDays] = useState<number>(7);
  const [daysMode, setDaysMode] = useState<"fromNow" | "add" | "date">("fromNow");
  const [customDate, setCustomDate] = useState<string>("");

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/tenants?status=${statusFilter}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setTenants(data.data || []);
        setStats(data.stats || { total: 0, active: 0, pending: 0, suspended: 0, expired: 0 });
      } else {
        setMessage({ text: data.error || "Error al cargar establecimientos", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Error de conexión con el servidor", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [statusFilter]);

  const handleUpdateStatus = async (tenantId: string, newStatus: string) => {
    setActionLoadingId(tenantId);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: `Estado actualizado a ${newStatus}`, type: "success" });
        await fetchTenants();
      } else {
        setMessage({ text: data.error || "No se pudo actualizar el estado", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Error de conexión", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApplyDays = async () => {
    if (!selectedTenantForDays) return;
    setActionLoadingId(selectedTenantForDays.id);
    setMessage(null);

    const payload: any = { status: "ACTIVE" };

    if (daysMode === "fromNow") {
      payload.exactDays = Number(customDays);
    } else if (daysMode === "add") {
      payload.addDays = Number(customDays);
    } else if (daysMode === "date") {
      payload.targetDate = customDate;
    }

    try {
      const res = await fetch(`/api/v1/admin/tenants/${selectedTenantForDays.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          text: `Días actualizados con éxito para "${selectedTenantForDays.name}". El sistema bloqueará el acceso automáticamente al expirar.`,
          type: "success",
        });
        setSelectedTenantForDays(null);
        await fetchTenants();
      } else {
        setMessage({ text: data.error || "No se pudo actualizar los días", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Error de conexión", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExpireNow = async (tenantId: string) => {
    setActionLoadingId(tenantId);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expireNow: true }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: "Acceso bloqueado inmediatamente para el establecimiento.", type: "success" });
        setSelectedTenantForDays(null);
        await fetchTenants();
      } else {
        setMessage({ text: data.error || "No se pudo bloquear", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Error de conexión", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const openDaysModal = (tenant: TenantData) => {
    setSelectedTenantForDays(tenant);
    setCustomDays(tenant.subscription?.daysRemaining && tenant.subscription.daysRemaining > 0 ? tenant.subscription.daysRemaining : 7);
    setDaysMode("fromNow");
    if (tenant.subscription?.currentPeriodEnd) {
      setCustomDate(new Date(tenant.subscription.currentPeriodEnd).toISOString().split("T")[0]);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setCustomDate(d.toISOString().split("T")[0]);
    }
  };

  const getServiceTypeBadge = (type: string) => {
    switch (type) {
      case "AUDIO_CABINA_PRO":
        return { label: "Cabina Audio Pro", icon: Disc3, color: "text-fuchsia-400 bg-fuchsia-950/60 border-fuchsia-800" };
      case "KARAOKE_BAR":
        return { label: "Karaoke Bar", icon: Mic, color: "text-cyan-400 bg-cyan-950/60 border-cyan-800" };
      default:
        return { label: "Ecosistema Completo", icon: UtensilsCrossed, color: "text-emerald-400 bg-emerald-950/60 border-emerald-800" };
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* HEADER SUPER ADMIN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-950/60 border border-fuchsia-500/30 text-xs font-mono font-bold text-fuchsia-300 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>SUPER ADMINISTRADOR CENTRAL &bull; CYNKO OS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Gestión Global de Empresas & Control de Vencimientos
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Activa locales nuevos, asigna cantidad exacta de días de servicio y bloquea accesos automáticamente al vencer el plazo.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTenants}
          disabled={isLoading}
          className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          <span>Actualizar Lista</span>
        </button>
      </div>

      {/* MENSAJES DE ALERTA */}
      {message && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm animate-fade-in ${
            message.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/40 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <span>{message.text}</span>
          </div>
          <button type="button" onClick={() => setMessage(null)} className="text-xs underline cursor-pointer">
            Cerrar
          </button>
        </div>
      )}

      {/* TARJETAS DE MÉTRICAS GLOBALES */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Total Locales</span>
            <div className="text-2xl font-black text-white mt-0.5">{stats.total}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Activos con Días</span>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">{stats.active}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Pendientes Aprobación</span>
            <div className="text-2xl font-black text-amber-400 mt-0.5">{stats.pending}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Días Vencidos</span>
            <div className="text-2xl font-black text-orange-400 mt-0.5">{stats.expired}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Suspendidos</span>
            <div className="text-2xl font-black text-rose-400 mt-0.5">{stats.suspended}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por local, slug o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchTenants()}
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: `Todos (${stats.total})` },
            { id: "PENDING_APPROVAL", label: `Pendientes (${stats.pending})` },
            { id: "ACTIVE", label: `Activos (${stats.active})` },
            { id: "EXPIRED", label: `Vencidos (${stats.expired})` },
            { id: "SUSPENDED", label: `Suspendidos (${stats.suspended})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-fuchsia-600 text-white shadow-md shadow-fuchsia-950"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE EMPRESAS */}
      {isLoading ? (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
          <p className="text-xs text-zinc-400 font-mono">Cargando empresas clientes...</p>
        </div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-16 bg-zinc-950/60 rounded-3xl border border-zinc-800 space-y-3">
          <Building2 className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No se encontraron establecimientos</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            No hay locales que coincidan con el filtro actual.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tenants.map((tenant) => {
            const serviceBadge = getServiceTypeBadge(tenant.serviceType);
            const ServiceIcon = serviceBadge.icon;
            const isPending = tenant.status === "PENDING_APPROVAL";
            const isSuspended = tenant.status === "SUSPENDED";
            const daysRemaining = tenant.subscription?.daysRemaining || 0;
            const isExpired = !isPending && !isSuspended && (tenant.subscription?.isExpired || daysRemaining <= 0);
            const isActiveWithDays = tenant.status === "ACTIVE" && !isExpired;
            const isActionLoading = actionLoadingId === tenant.id;

            return (
              <div
                key={tenant.id}
                className={`p-6 rounded-3xl border transition-all ${
                  isPending
                    ? "bg-amber-950/15 border-amber-500/40 shadow-lg shadow-amber-950/20"
                    : isExpired
                    ? "bg-orange-950/15 border-orange-500/40"
                    : isSuspended
                    ? "bg-rose-950/15 border-rose-500/30 opacity-75"
                    : "bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Info Principal */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xl font-black text-white">{tenant.name}</span>
                      
                      <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-[11px] font-mono text-zinc-300 border border-zinc-700">
                        cynko.app/r/{tenant.slug}
                      </span>

                      {/* Badge de Estado Dinámico */}
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-mono font-black border flex items-center gap-1.5 ${
                          isPending
                            ? "bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse"
                            : isExpired
                            ? "bg-orange-950 text-orange-300 border-orange-500/40"
                            : isSuspended
                            ? "bg-rose-950 text-rose-300 border-rose-500/40"
                            : "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isPending ? "bg-amber-400" : isExpired ? "bg-orange-400" : isSuspended ? "bg-rose-400" : "bg-emerald-400"
                          }`}
                        />
                        <span>
                          {isPending
                            ? "PENDIENTE DE APROBACIÓN"
                            : isExpired
                            ? "VENCIDO (BLOQUEADO)"
                            : isSuspended
                            ? "SUSPENDIDO MANUAL"
                            : "ACTIVO"}
                        </span>
                      </span>

                      {/* Tipo de Servicio */}
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${serviceBadge.color}`}>
                        <ServiceIcon className="w-3.5 h-3.5" />
                        <span>{serviceBadge.label}</span>
                      </span>
                    </div>

                    {/* Datos del Dueño */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-400">
                      {tenant.owner ? (
                        <>
                          <div className="flex items-center gap-1.5 text-zinc-200 font-semibold">
                            <Users className="w-4 h-4 text-zinc-500" />
                            <span>{tenant.owner.name} (Dueño)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-cyan-400 font-mono">
                            <Mail className="w-4 h-4 text-zinc-500" />
                            <a href={`mailto:${tenant.owner.email}`} className="hover:underline">{tenant.owner.email}</a>
                          </div>
                          {tenant.owner.phone && (
                            <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
                              <Phone className="w-4 h-4 text-zinc-500" />
                              <a href={`https://wa.me/${tenant.owner.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                {tenant.owner.phone}
                              </a>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-zinc-500 italic">Sin usuario OWNER asociado</span>
                      )}
                      <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Alta: {new Date(tenant.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Suscripción y Botones de Control */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-zinc-800">
                    {/* Caja de Días / Vencimiento */}
                    <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-left min-w-[190px]">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold flex justify-between items-center">
                        <span>{tenant.subscription?.planName || "Plan Pro"}</span>
                        {isExpired && <span className="text-orange-400 font-black">BLOQUEADO</span>}
                      </div>

                      <div className={`text-base font-black mt-0.5 ${isExpired ? "text-orange-400" : isPending ? "text-amber-400" : "text-emerald-400"}`}>
                        {isPending
                          ? "Sin activar aún"
                          : isExpired
                          ? "0 días (Tiempo agotado)"
                          : `${daysRemaining} días restantes`}
                      </div>

                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {tenant.subscription?.currentPeriodEnd
                          ? `Corte: ${new Date(tenant.subscription.currentPeriodEnd).toLocaleDateString()}`
                          : "Sin fecha definida"}
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isPending && (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleUpdateStatus(tenant.id, "ACTIVE")}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-xs shadow-md shadow-emerald-950 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Aprobar y Activar Local</span>
                        </button>
                      )}

                      {/* Botón Asignar / Editar Días Manualmente */}
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => openDaysModal(tenant)}
                        className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 hover:border-cyan-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                      >
                        <CalendarClock className="w-4 h-4 text-cyan-400" />
                        <span>Editar Días</span>
                      </button>

                      {isActiveWithDays && (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleUpdateStatus(tenant.id, "SUSPENDED")}
                          className="px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 border border-zinc-700 hover:border-rose-500/50 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Suspender</span>
                        </button>
                      )}

                      {(isSuspended || isExpired) && (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => openDaysModal(tenant)}
                          className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Reactivar con Días</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PARA ASIGNAR DÍAS MANUALMENTE */}
      {selectedTenantForDays && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden p-6 space-y-6">
            <button
              type="button"
              onClick={() => setSelectedTenantForDays(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-300 mb-2">
                <CalendarClock className="w-3.5 h-3.5" />
                <span>CONTROL DE TIEMPO & VENCIMIENTO</span>
              </div>
              <h3 className="text-xl font-black text-white">
                Asignar Días de Acceso
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Establecimiento: <strong className="text-white">{selectedTenantForDays.name}</strong>
              </p>
            </div>

            {/* Accesos Rápidos de Días */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Opciones Rápidas (Desde hoy)
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { days: 3, label: "3 d" },
                  { days: 7, label: "7 d" },
                  { days: 15, label: "15 d" },
                  { days: 30, label: "30 d" },
                  { days: 60, label: "60 d" },
                ].map((item) => (
                  <button
                    key={item.days}
                    type="button"
                    onClick={() => {
                      setCustomDays(item.days);
                      setDaysMode("fromNow");
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      daysMode === "fromNow" && customDays === item.days
                        ? "bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-950"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modos de Asignación */}
            <div className="space-y-3 pt-2 border-t border-zinc-800/80">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Cantidad Manual Editable
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={customDays}
                  onChange={(e) => {
                    setCustomDays(Math.max(1, parseInt(e.target.value) || 1));
                    if (daysMode === "date") setDaysMode("fromNow");
                  }}
                  className="w-24 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-center text-sm font-black text-white focus:outline-none focus:border-cyan-400"
                />
                <span className="text-xs text-zinc-300 font-bold">días</span>

                <div className="flex items-center gap-2 ml-auto text-xs">
                  <button
                    type="button"
                    onClick={() => setDaysMode("fromNow")}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-colors ${
                      daysMode === "fromNow"
                        ? "bg-cyan-950 text-cyan-300 border-cyan-500/50"
                        : "bg-zinc-900 text-zinc-500 border-zinc-800"
                    }`}
                  >
                    A partir de hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => setDaysMode("add")}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-colors ${
                      daysMode === "add"
                        ? "bg-purple-950 text-purple-300 border-purple-500/50"
                        : "bg-zinc-900 text-zinc-500 border-zinc-800"
                    }`}
                  >
                    Sumar al actual
                  </button>
                </div>
              </div>

              {/* Selector de Fecha Calendario */}
              <div className="pt-2">
                <label className="block text-[11px] text-zinc-500 mb-1">
                  O fijar fecha exacta de vencimiento:
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setDaysMode("date");
                  }}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Aviso de Bloqueo Automático */}
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 flex items-start gap-2">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                Al cumplirse el plazo seleccionado, el sistema bloqueará automáticamente el inicio de sesión y el panel del cliente hasta que le asignes más días.
              </span>
            </div>

            {/* Botones del Modal */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleApplyDays}
                disabled={actionLoadingId === selectedTenantForDays.id}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white font-black text-xs shadow-lg shadow-cyan-950 cursor-pointer transition-all hover:scale-[1.02]"
              >
                {actionLoadingId === selectedTenantForDays.id ? "Guardando..." : "Guardar y Habilitar Días"}
              </button>

              <button
                type="button"
                onClick={() => handleExpireNow(selectedTenantForDays.id)}
                disabled={actionLoadingId === selectedTenantForDays.id}
                className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-rose-950/50 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-800 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Bloquear Acceso Inmediatamente (0 días)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
