"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Heart,
  Star,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MessageSquare,
  Phone,
  Send,
  Trash2,
  RefreshCw,
  Building2,
  UtensilsCrossed,
  Wine,
  Music,
  Receipt,
  User,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Lock,
} from "lucide-react";

interface InternalNote {
  id: string;
  text: string;
  authorRole: string;
  authorName: string;
  createdAt: string;
}

interface QsrTicket {
  id: string;
  tenantId: string;
  venueId?: string | null;
  tableId?: string | null;
  tableNumber?: string | null;
  tableName?: string | null;
  guestSessionId?: string | null;
  type: "COMPLAINT" | "CLAIM" | "SUGGESTION" | "COMPLIMENT";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  rating?: number | null;
  category: string;
  subject?: string | null;
  comment: string;
  isAnonymous: boolean;
  customerName?: string | null;
  customerPhone?: string | null;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "ARCHIVED";
  internalNotes?: InternalNote[];
  resolutionSummary?: string | null;
  resolvedByRole?: string | null;
  resolvedByName?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

interface QsrStats {
  totalTickets: number;
  pendingCount: number;
  urgentCount: number;
  resolvedCount: number;
  resolutionRate: number;
  avgRating: number;
  totalRatings: number;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: any }> = {
  SERVICE: { label: "Atención / Mozos", icon: UtensilsCrossed },
  BAR: { label: "Barra & Tragos", icon: Wine },
  KITCHEN: { label: "Cocina & Comida", icon: UtensilsCrossed },
  MUSIC: { label: "Música & DJ / Karaoke", icon: Music },
  BILLING: { label: "Caja & Cuenta", icon: Receipt },
  FACILITIES: { label: "Baños & Instalaciones", icon: Building2 },
  OTHER: { label: "Otro", icon: Sparkles },
};

export default function QsrDashboardPage() {
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    role: string;
    tenant?: { id: string };
  } | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  const [tickets, setTickets] = useState<QsrTicket[]>([]);
  const [stats, setStats] = useState<QsrStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [selectedTypeTab, setSelectedTypeTab] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Estado para redactar nota interna
  const [activeNoteTicketId, setActiveNoteTicketId] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  // Cargar usuario autenticado desde /api/v1/auth/me
  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setCurrentUser(data?.user || null);
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setUserLoading(false));
  }, []);

  // Verificación estricta de rol
  const isAuthorizedRole =
    currentUser && ["OWNER", "MANAGER", "SUPER_ADMIN"].includes(currentUser.role);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/qsr/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn("Error cargando stats QSR:", e);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (selectedTypeTab !== "ALL" && selectedTypeTab !== "URGENT") {
        params.set("type", selectedTypeTab);
      }
      if (selectedTypeTab === "URGENT") {
        params.set("priority", "URGENT");
      } else if (priorityFilter !== "ALL") {
        params.set("priority", priorityFilter);
      }
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      if (categoryFilter !== "ALL") {
        params.set("category", categoryFilter);
      }
      if (searchTerm.trim()) {
        params.set("search", searchTerm.trim());
      }
      params.set("limit", "50");

      const res = await fetch(`/api/v1/qsr?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Acceso confidencial restringido a Gerente y Dueño.");
        }
        throw new Error("Error al obtener los tickets.");
      }
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar buzón.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedTypeTab, priorityFilter, statusFilter, categoryFilter, searchTerm]);

  useEffect(() => {
    if (!userLoading && isAuthorizedRole) {
      fetchTickets();
      fetchStats();
    }
  }, [userLoading, isAuthorizedRole, fetchTickets, fetchStats]);

  // Actualización periódica en vivo del buzón (cada 12s)
  useEffect(() => {
    if (!isAuthorizedRole) return;
    const interval = setInterval(() => {
      fetchTickets();
      fetchStats();
    }, 12000);
    return () => clearInterval(interval);
  }, [isAuthorizedRole, fetchTickets, fetchStats]);

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/qsr/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar el estado.");
      const data = await res.json();
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: data.ticket.status } : t))
      );
      fetchStats();
    } catch (e: any) {
      alert(e.message || "Error al actualizar estado.");
    }
  };

  const handleAddInternalNote = async (ticketId: string) => {
    if (!newNoteText.trim()) return;
    setSavingNoteId(ticketId);
    try {
      const res = await fetch(`/api/v1/qsr/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newInternalNote: newNoteText.trim() }),
      });
      if (!res.ok) throw new Error("No se pudo guardar la nota interna.");
      const data = await res.json();
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, internalNotes: data.ticket.internalNotes } : t))
      );
      setNewNoteText("");
      setActiveNoteTicketId(null);
    } catch (e: any) {
      alert(e.message || "Error al guardar nota.");
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm("¿Seguro que deseas eliminar definitivamente este ticket del buzón?")) return;
    try {
      const res = await fetch(`/api/v1/qsr/${ticketId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "No se pudo eliminar.");
      }
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      fetchStats();
    } catch (e: any) {
      alert(e.message || "Error al eliminar.");
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthorizedRole) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-2xl bg-[#0F172A] border border-red-500/30 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Acceso Confidencial Restringido</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          El Buzón QSR contiene opiniones, quejas y reclamos privados de los clientes y está
          reservado exclusivamente para el <strong>Gerente General</strong> y el{" "}
          <strong>Dueño del Establecimiento</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-950/40">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Buzón QSR VIP
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  Privado Gerencia & Dueño
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Quejas en vivo, Sugerencias, Reclamos y Reconocimientos recibidos de los clientes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchTickets();
              fetchStats();
            }}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Urgentes en Vivo */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-900 border border-red-500/30 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-red-300 font-semibold">
            <span>Urgentes en Vivo</span>
            <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {stats?.urgentCount ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">
            {stats?.urgentCount ? "🚨 Requieren atención en mesa" : "Cero quejas críticas activas"}
          </p>
        </div>

        {/* Total Tickets */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Total Recibidos</span>
            <MessageSquare className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {stats?.totalTickets ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">
            {stats?.pendingCount ?? 0} pendientes de revisión
          </p>
        </div>

        {/* Calificación Promedio CSAT */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
            <span>Calificación Promedio</span>
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-1.5">
            <span>{stats?.avgRating ?? "5.0"}</span>
            <span className="text-xs text-slate-500 font-normal">/ 5.0</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Basado en {stats?.totalRatings ?? 0} opiniones
          </p>
        </div>

        {/* Tasa de Resolución */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>Tasa de Resolución</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {stats?.resolutionRate ?? 100}%
          </div>
          <p className="text-[11px] text-slate-400">
            {stats?.resolvedCount ?? 0} casos resueltos
          </p>
        </div>
      </div>

      {/* Tabs de Filtro Rápido */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "ALL", label: "Todos", count: stats?.totalTickets },
          { id: "URGENT", label: "🚨 Urgentes en Vivo", count: stats?.urgentCount },
          { id: "COMPLAINT", label: "🔴 Quejas", count: null },
          { id: "CLAIM", label: "⚠️ Reclamos", count: null },
          { id: "SUGGESTION", label: "💡 Sugerencias", count: null },
          { id: "COMPLIMENT", label: "⭐ Felicitaciones", count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTypeTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedTypeTab === tab.id
                ? tab.id === "URGENT"
                  ? "bg-red-500 text-white border-red-400 shadow-md shadow-red-950/40"
                  : "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-950/40"
                : "bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-black/30 font-mono">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Barra de Búsqueda y Filtros Secundarios */}
      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Buscador */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por texto, mesa, cliente, WhatsApp..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filtro Estado */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="IN_PROGRESS">En Gestión</option>
            <option value="RESOLVED">Resueltos / Compensados</option>
            <option value="ARCHIVED">Archivados</option>
          </select>
        </div>

        {/* Filtro Categoría */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todas las Áreas</option>
            <option value="SERVICE">Atención / Mozos</option>
            <option value="BAR">Barra & Tragos</option>
            <option value="KITCHEN">Cocina & Comida</option>
            <option value="MUSIC">Música & DJ</option>
            <option value="BILLING">Caja & Cobro</option>
            <option value="FACILITIES">Baños & Instalaciones</option>
            <option value="OTHER">Otro motivo</option>
          </select>
        </div>
      </div>

      {/* Lista de Tickets */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
            <p className="text-xs">Cargando buzón de gerencia...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No hay tickets registrados</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No hay mensajes que coincidan con los filtros actuales. Tu buzón está al día.
            </p>
          </div>
        ) : (
          tickets.map((ticket) => {
            const catInfo = CATEGORY_LABELS[ticket.category] || CATEGORY_LABELS.OTHER;
            const CatIcon = catInfo.icon;
            const isUrgent = ticket.priority === "URGENT";

            return (
              <div
                key={ticket.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 ${
                  isUrgent && ticket.status === "PENDING"
                    ? "bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border-red-500/60 shadow-lg shadow-red-950/30"
                    : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Cabecera del Ticket */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge Prioridad */}
                    {isUrgent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse">
                        🚨 URGENTE EN VIVO
                      </span>
                    )}

                    {/* Badge Tipo */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        ticket.type === "COMPLAINT"
                          ? "bg-red-500/20 text-red-300 border border-red-500/40"
                          : ticket.type === "CLAIM"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : ticket.type === "SUGGESTION"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      }`}
                    >
                      {ticket.type === "COMPLAINT" && "Queja"}
                      {ticket.type === "CLAIM" && "Reclamo"}
                      {ticket.type === "SUGGESTION" && "Sugerencia"}
                      {ticket.type === "COMPLIMENT" && "Felicitación"}
                    </span>

                    {/* Área / Categoría */}
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-300 flex items-center gap-1">
                      <CatIcon className="w-3 h-3 text-purple-400" />
                      <span>{catInfo.label}</span>
                    </span>

                    {/* Mesa */}
                    {ticket.tableNumber && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        Mesa {ticket.tableNumber}
                      </span>
                    )}

                    {/* Estrellas */}
                    {ticket.rating && (
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: ticket.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Estado Selector y Fecha */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ticket.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      • {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>

                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        ticket.status === "PENDING"
                          ? "bg-red-500/20 text-red-300 border-red-500/40"
                          : ticket.status === "IN_PROGRESS"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : ticket.status === "RESOLVED"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      <option value="PENDING">🔴 Pendiente</option>
                      <option value="IN_PROGRESS">🟡 En Gestión</option>
                      <option value="RESOLVED">🟢 Resuelto</option>
                      <option value="ARCHIVED">⚪ Archivado</option>
                    </select>
                  </div>
                </div>

                {/* Comentario Principal */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs sm:text-sm text-slate-100 leading-relaxed">
                  {ticket.comment}
                </div>

                {/* Identidad / Contacto del Comensal */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    {ticket.isAnonymous ? (
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Comensal Anónimo (Privacidad Protegida)</span>
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-purple-400" />
                          <span>{ticket.customerName || "Cliente"}</span>
                        </span>
                        {ticket.customerPhone && (
                          <a
                            href={`https://wa.me/${ticket.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Hola ${ticket.customerName || ""}, te escribe la gerencia del local. Agradecemos tu mensaje sobre ${catInfo.label}...`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-colors"
                            title="Responder por WhatsApp"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>{ticket.customerPhone}</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveNoteTicketId(activeNoteTicketId === ticket.id ? null : ticket.id)
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3 text-amber-400" />
                      <span>
                        Notas Internas (
                        {ticket.internalNotes && Array.isArray(ticket.internalNotes)
                          ? ticket.internalNotes.length
                          : 0}
                        )
                      </span>
                    </button>

                    {(currentUser?.role === "OWNER" || currentUser?.role === "SUPER_ADMIN") && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTicket(ticket.id)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Eliminar ticket (Solo Dueño)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sección de Notas Internas Confidenciales (Dueño ↔ Gerente) */}
                {activeNoteTicketId === ticket.id && (
                  <div className="pt-3 border-t border-slate-800 space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Muro Confidencial de Notas (Visible solo Dueño y Gerente)</span>
                    </div>

                    {/* Lista de notas previas */}
                    {ticket.internalNotes && ticket.internalNotes.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {ticket.internalNotes.map((note) => (
                          <div
                            key={note.id}
                            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-bold text-purple-300">
                                {note.authorRole === "OWNER" ? "👑 DUEÑO" : "👔 GERENTE"} (
                                {note.authorName})
                              </span>
                              <span>
                                {new Date(note.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                • {new Date(note.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-slate-200">{note.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        No hay notas internas registradas en este caso todavía.
                      </p>
                    )}

                    {/* Redactar nueva nota */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        placeholder="Escribe una nota interna para coordinar con el dueño o gerente..."
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddInternalNote(ticket.id);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddInternalNote(ticket.id)}
                        disabled={savingNoteId === ticket.id || !newNoteText.trim()}
                        className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        <span>Guardar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
