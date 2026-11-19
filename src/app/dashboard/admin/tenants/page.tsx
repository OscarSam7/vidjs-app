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
  MoreVertical
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
  } | null;
}

interface StatsData {
  total: number;
  active: number;
  pending: number;
  suspended: number;
}

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [stats, setStats] = useState<StatsData>({ total: 0, active: 0, pending: 0, suspended: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/tenants?status=${statusFilter}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setTenants(data.data || []);
        setStats(data.stats || { total: 0, active: 0, pending: 0, suspended: 0 });
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

  const handleExtendTrial = async (tenantId: string, days: number = 30) => {
    setActionLoadingId(tenantId);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extendDays: days, status: "ACTIVE" }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: `Prueba extendida +${days} días con éxito`, type: "success" });
        await fetchTenants();
      } else {
        setMessage({ text: data.error || "No se pudo extender", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Error de conexión", type: "error" });
    } finally {
      setActionLoadingId(null);
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
            Gestión Global de Empresas & Locales Clientes
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Supervisa, activa, suspende y gestiona las suscripciones de todos los locales registrados en la plataforma.
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase text-zinc-500 font-bold">Total Establecimientos</span>
            <div className="text-3xl font-black text-white mt-1">{stats.total}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase text-zinc-500 font-bold">Locales Activos</span>
            <div className="text-3xl font-black text-emerald-400 mt-1">{stats.active}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase text-zinc-500 font-bold">Pendientes de Aprobación</span>
            <div className="text-3xl font-black text-amber-400 mt-1">{stats.pending}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase text-zinc-500 font-bold">Suspendidos / Pausados</span>
            <div className="text-3xl font-black text-rose-400 mt-1">{stats.suspended}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800">
        {/* Buscador */}
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

        {/* Pestañas de Filtro */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: `Todos (${stats.total})` },
            { id: "ACTIVE", label: `Activos (${stats.active})` },
            { id: "PENDING_APPROVAL", label: `Pendientes (${stats.pending})` },
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

      {/* LISTA / TABLA DE EMPRESAS */}
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
            No hay locales que coincidan con el filtro o la búsqueda actual.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tenants.map((tenant) => {
            const serviceBadge = getServiceTypeBadge(tenant.serviceType);
            const ServiceIcon = serviceBadge.icon;
            const isPending = tenant.status === "PENDING_APPROVAL";
            const isActive = tenant.status === "ACTIVE";
            const isSuspended = tenant.status === "SUSPENDED";
            const isActionLoading = actionLoadingId === tenant.id;

            return (
              <div
                key={tenant.id}
                className={`p-6 rounded-3xl border transition-all ${
                  isPending
                    ? "bg-amber-950/15 border-amber-500/40 shadow-lg shadow-amber-950/20"
                    : isSuspended
                    ? "bg-rose-950/15 border-rose-500/30 opacity-75"
                    : "bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Info Principal del Local */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xl font-black text-white">{tenant.name}</span>
                      
                      <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-[11px] font-mono text-zinc-300 border border-zinc-700">
                        cynko.app/r/{tenant.slug}
                      </span>

                      {/* Badge de Estado */}
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-mono font-black border flex items-center gap-1.5 ${
                          isActive
                            ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                            : isPending
                            ? "bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse"
                            : "bg-rose-950 text-rose-300 border-rose-500/40"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-400" : isPending ? "bg-amber-400" : "bg-rose-400"}`} />
                        <span>{isActive ? "ACTIVO" : isPending ? "PENDIENTE APROBACIÓN" : "SUSPENDIDO"}</span>
                      </span>

                      {/* Tipo de Servicio */}
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${serviceBadge.color}`}>
                        <ServiceIcon className="w-3.5 h-3.5" />
                        <span>{serviceBadge.label}</span>
                      </span>
                    </div>

                    {/* Datos del Dueño / Contacto */}
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
                        <span>Registrado: {new Date(tenant.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Estado de Suscripción & Botones de Acción */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-zinc-800">
                    {/* Caja de Plan */}
                    <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-left min-w-[160px]">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold">
                        {tenant.subscription?.planName || "Plan Inicial"}
                      </div>
                      <div className="text-base font-black text-white mt-0.5">
                        {tenant.subscription ? `${tenant.subscription.daysRemaining} días restantes` : "Sin suscripción"}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {tenant.subscription?.status === "ACTIVE" ? "🟢 En período activo" : "🔴 Estado inactivo"}
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

                      {isActive && (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleUpdateStatus(tenant.id, "SUSPENDED")}
                          className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 border border-zinc-700 hover:border-rose-500/50 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Suspender Acceso</span>
                        </button>
                      )}

                      {isSuspended && (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleUpdateStatus(tenant.id, "ACTIVE")}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Reactivar Local</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleExtendTrial(tenant.id, 30)}
                        className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>+30 Días</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
