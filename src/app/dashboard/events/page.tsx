"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  Plus,
  Search,
  RefreshCw,
  Tv,
  Headphones,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Clock,
  QrCode,
  Music,
  Camera,
  Copy,
  Check,
  Play,
  Pause,
  Flag,
  Lock,
  Sparkles,
  X,
  Calendar,
  Layers,
  Eye,
  EyeOff,
} from "lucide-react";

interface VenueItem {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
}

interface EventItem {
  id: string;
  tenantId: string;
  venueId: string;
  name: string;
  description: string | null;
  code: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED";
  startsAt: string;
  endsAt: string | null;
  pin: string | null;
  settings: string | null;
  createdAt: string;
  venue: VenueItem;
  _count: {
    songRequests: number;
    queueEntries: number;
    guestSessions: number;
    photoPosts: number;
  };
}

export default function EventsManagementPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [venueFilter, setVenueFilter] = useState<string>("ALL");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Estados de formularios
  const [formData, setFormData] = useState({
    name: "",
    venueId: "",
    code: "",
    description: "",
    startsAt: "",
    endsAt: "",
    pin: "",
    status: "ACTIVE" as "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  // Cargar eventos y sedes
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/events");
      if (!res.ok) {
        throw new Error("No se pudo cargar la lista de eventos.");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setEvents(json.data.events || []);
        setVenues(json.data.venues || []);

        // Seleccionar sede por defecto si el formulario está vacío
        if (json.data.venues?.length > 0 && !formData.venueId) {
          setFormData((prev) => ({ ...prev, venueId: json.data.venues[0].id }));
        }
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((current) => (current?.text === text ? null : current));
    }, 5000);
  };

  // Copiar código de acceso al portapapeles
  const handleCopyCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  // Toggle visibilidad del PIN
  const togglePinVisibility = (eventId: string) => {
    setVisiblePins((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  // Autogenerar código a partir del nombre
  const handleAutoCode = (name: string) => {
    const clean = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 12);

    const suffix = Math.floor(100 + Math.random() * 900);
    return clean ? `${clean}-${suffix}` : `FIESTA-${suffix}`;
  };

  // Formato para input datetime-local (YYYY-MM-DDTHH:mm)
  const formatDatetimeForInput = (isoDateString?: string | null) => {
    if (!isoDateString) return "";
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yyyy = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
  };

  // Abrir modal de creación con valores por defecto
  const handleOpenCreateModal = () => {
    const now = new Date();
    const defaultStarts = formatDatetimeForInput(now.toISOString());
    const tomorrow = new Date(now.getTime() + 8 * 60 * 60 * 1000); // +8hs
    const defaultEnds = formatDatetimeForInput(tomorrow.toISOString());

    setFormData({
      name: "",
      venueId: venues.length > 0 ? venues[0].id : "",
      code: "",
      description: "",
      startsAt: defaultStarts,
      endsAt: defaultEnds,
      pin: "",
      status: "ACTIVE",
    });
    setIsCreateModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEditModal = (event: EventItem) => {
    setSelectedEvent(event);
    setFormData({
      name: event.name,
      venueId: event.venueId,
      code: event.code,
      description: event.description || "",
      startsAt: formatDatetimeForInput(event.startsAt),
      endsAt: formatDatetimeForInput(event.endsAt),
      pin: event.pin || "",
      status: event.status,
    });
    setIsEditModalOpen(true);
  };

  // Crear nuevo evento (POST)
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Error al crear el evento.");
      }
      showFeedback("success", json.message || "Evento creado exitosamente.");
      setIsCreateModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      showFeedback("error", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guardar edición de evento (PUT)
  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedEvent.id,
          ...formData,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Error al actualizar el evento.");
      }
      showFeedback("success", json.message || "Evento actualizado exitosamente.");
      setIsEditModalOpen(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (err: any) {
      showFeedback("error", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cambio rápido de estado (Pausar / Reanudar / Finalizar)
  const handleQuickStatusChange = async (event: EventItem, newStatus: EventItem["status"]) => {
    try {
      const res = await fetch("/api/v1/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: event.id,
          status: newStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Error al cambiar estado.");
      }
      showFeedback(
        "success",
        `Estado de '${event.name}' cambiado a ${newStatus === "ACTIVE" ? "ACTIVO" : newStatus}.`
      );
      fetchEvents();
    } catch (err: any) {
      showFeedback("error", err.message);
    }
  };

  // Confirmar eliminación de evento (DELETE)
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/events?id=${selectedEvent.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Error al eliminar el evento.");
      }
      showFeedback("success", json.message || "Evento eliminado exitosamente.");
      setIsDeleteModalOpen(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (err: any) {
      showFeedback("error", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrado de eventos
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesSearch =
        ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "ALL" || ev.status === statusFilter;
      const matchesVenue = venueFilter === "ALL" || ev.venueId === venueFilter;

      return matchesSearch && matchesStatus && matchesVenue;
    });
  }, [events, searchQuery, statusFilter, venueFilter]);

  // Formato amigable de fecha y hora
  const formatDateDisplay = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderStatusBadge = (status: EventItem["status"]) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-950/70 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>EN VIVO / ACTIVO</span>
          </span>
        );
      case "PAUSED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-950/60 text-amber-300 border border-amber-500/50">
            <Pause className="w-3 h-3" />
            <span>EN PAUSA</span>
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#0D1930] text-[#94A3B8] border border-[#263858]">
            <span>BORRADOR</span>
          </span>
        );
      case "FINISHED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-950/50 text-purple-300 border border-purple-800/60">
            <Flag className="w-3 h-3" />
            <span>FINALIZADO</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 select-none">
      {/* Toast de Notificaciones */}
      {feedback && (
        <div className="fixed top-6 right-6 z-50 animate-fadeIn">
          <div
            className={`px-4 py-3 rounded-2xl border text-sm font-semibold flex items-center gap-2.5 shadow-2xl backdrop-blur-md ${
              feedback.type === "success"
                ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : "bg-rose-950/90 text-rose-200 border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        </div>
      )}

      {/* Header Principal con estilo VIDJSPRO */}
      <div className="relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-[#111F38] via-[#0D1930] to-[#080F1F] border border-[#263858] shadow-xl">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              PROGRAMACIÓN NOCTURNA
            </span>
            <span className="text-xs text-[#94A3B8]">Total: {events.length} noches configuradas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight">
            Eventos & Noches de Fiesta
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8]">
            Añade, edita nombres, sedes, códigos QR y gestiona las noches activas de tu establecimiento
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0D1930] hover:bg-[#162644] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] text-xs sm:text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            title="Refrescar listado"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-400" : "text-[#94A3B8]"}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-600/25 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Evento / Noche</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#111F38] border border-[#263858]">
          <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">Total Eventos</span>
          <span className="text-2xl font-black text-[#F8FAFC] mt-1 block">{events.length}</span>
          <span className="text-[10px] text-[#94A3B8]">Historial completo</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">En Vivo / Activos</span>
          <span className="text-2xl font-black text-emerald-300 mt-1 block">
            {events.filter((e) => e.status === "ACTIVE").length}
          </span>
          <span className="text-[10px] text-emerald-400/80">Recibiendo pedidos</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">En Pausa</span>
          <span className="text-2xl font-black text-amber-300 mt-1 block">
            {events.filter((e) => e.status === "PAUSED").length}
          </span>
          <span className="text-[10px] text-amber-400/80">Pausa momentánea</span>
        </div>

        <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/40">
          <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">Finalizados</span>
          <span className="text-2xl font-black text-purple-300 mt-1 block">
            {events.filter((e) => e.status === "FINISHED").length}
          </span>
          <span className="text-[10px] text-purple-400/80">Sesiones cerradas</span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#111F38] border border-[#263858]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o sede..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0D1930] border border-[#263858] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {/* Selector de Sede */}
          {venues.length > 1 && (
            <select
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value)}
              className="bg-[#0D1930] border border-[#263858] rounded-xl px-3 py-2 text-xs text-[#94A3B8] hover:text-[#F8FAFC] focus:outline-none focus:border-purple-500 cursor-pointer shrink-0"
            >
              <option value="ALL">Todas las Sedes</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}

          {/* Filtro de Estado */}
          <div className="flex items-center gap-1 shrink-0">
            {[
              { id: "ALL", label: "Todos" },
              { id: "ACTIVE", label: "Activos" },
              { id: "PAUSED", label: "En Pausa" },
              { id: "DRAFT", label: "Borrador" },
              { id: "FINISHED", label: "Finalizados" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                  statusFilter === f.id
                    ? "bg-purple-600 text-white shadow-sm shadow-purple-600/30"
                    : "bg-[#0D1930] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263858]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de Tarjetas de Eventos */}
      {loading ? (
        <div className="p-16 text-center space-y-3 bg-[#111F38]/60 border border-[#263858] rounded-3xl">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
          <p className="text-xs text-[#94A3B8]">Cargando eventos y noches...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-16 text-center space-y-4 bg-[#111F38]/60 border border-[#263858] rounded-3xl">
          <CalendarCheck2 className="w-12 h-12 text-[#94A3B8] mx-auto opacity-50" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#F8FAFC]">No se encontraron eventos</h3>
            <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
              No hay eventos que coincidan con los filtros seleccionados o aún no has creado ninguna noche.
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Crear primer evento</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {filteredEvents.map((event) => {
            const isLive = event.status === "ACTIVE";

            return (
              <div
                key={event.id}
                className={`p-5 sm:p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-4 shadow-sm ${
                  isLive
                    ? "bg-gradient-to-br from-[#111F38] via-[#0D1930] to-[#1c1236] border-purple-500/60 shadow-[0_8px_32px_rgba(139,92,246,0.18)]"
                    : "bg-[#111F38] border-[#263858] hover:border-slate-500/50"
                }`}
              >
                {/* Parte Superior: Estado, Nombre y Sede */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {renderStatusBadge(event.status)}

                    <div className="flex items-center gap-2">
                      {/* Código de Acceso para el comensal */}
                      <button
                        onClick={() => handleCopyCode(event.code)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0D1930] hover:bg-[#162644] border border-[#263858] text-purple-300 font-mono text-xs font-black tracking-wider transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                        title="Hacer clic para copiar código"
                      >
                        <QrCode className="w-3.5 h-3.5 text-purple-400" />
                        <span>CÓDIGO: {event.code}</span>
                        {copiedCode === event.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#94A3B8]" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#F8FAFC] tracking-tight leading-snug">
                      {event.name}
                    </h2>
                    {event.description && (
                      <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Sede y Horarios */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-[#94A3B8]">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-[#0D1930] border border-[#263858]">
                      <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="truncate font-semibold text-[#F8FAFC]">{event.venue.name}</span>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-xl bg-[#0D1930] border border-[#263858]">
                      <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="truncate font-mono text-[11px] text-[#F8FAFC]">
                        {formatDateDisplay(event.startsAt)}
                      </span>
                    </div>
                  </div>

                  {/* PIN de seguridad si existe */}
                  {event.pin && (
                    <div className="flex items-center gap-2 text-xs text-[#94A3B8] pt-0.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>PIN de Pantalla/DJ:</span>
                      <span className="font-mono font-bold text-amber-300 bg-[#0D1930] px-2 py-0.5 rounded border border-[#263858]">
                        {visiblePins[event.id] ? event.pin : "••••"}
                      </span>
                      <button
                        onClick={() => togglePinVisibility(event.id)}
                        className="text-[#94A3B8] hover:text-[#F8FAFC] p-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                        title={visiblePins[event.id] ? "Ocultar PIN" : "Mostrar PIN"}
                      >
                        {visiblePins[event.id] ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Métricas del Evento */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#263858]">
                    <div className="text-center p-2 rounded-xl bg-[#0D1930] border border-[#263858]/60">
                      <span className="text-[10px] text-[#94A3B8] uppercase block font-bold">Pedidos</span>
                      <span className="text-base font-black text-purple-300 block">
                        {event._count.songRequests}
                      </span>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-[#0D1930] border border-[#263858]/60">
                      <span className="text-[10px] text-[#94A3B8] uppercase block font-bold">En Cola</span>
                      <span className="text-base font-black text-cyan-300 block">
                        {event._count.queueEntries}
                      </span>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-[#0D1930] border border-[#263858]/60">
                      <span className="text-[10px] text-[#94A3B8] uppercase block font-bold">Mesas</span>
                      <span className="text-base font-black text-emerald-300 block">
                        {event._count.guestSessions}
                      </span>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-[#0D1930] border border-[#263858]/60">
                      <span className="text-[10px] text-[#94A3B8] uppercase block font-bold">Fotos</span>
                      <span className="text-base font-black text-pink-300 block">
                        {event._count.photoPosts}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Barra Inferior de Acciones */}
                <div className="pt-3 border-t border-[#263858] flex items-center justify-between gap-2 flex-wrap">
                  {/* Accesos a Cabinas y Pantalla */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={`/display/${event.code}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0D1930] hover:bg-[#162644] border border-purple-500/40 text-purple-300 hover:text-white text-xs font-bold transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                      title="Abrir Smart TV en vivo"
                    >
                      <Tv className="w-3.5 h-3.5 text-purple-400" />
                      <span>Smart TV</span>
                    </Link>

                    <Link
                      href="/dashboard/dj"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0D1930] hover:bg-[#162644] border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-bold transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                      title="Ir a la Cabina DJ"
                    >
                      <Headphones className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Cabina DJ</span>
                    </Link>

                    {/* Botón rápido de Pausa / Reanudar */}
                    {event.status === "ACTIVE" ? (
                      <button
                        onClick={() => handleQuickStatusChange(event, "PAUSED")}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-950/70 hover:bg-amber-900 border border-amber-600/50 text-amber-300 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        title="Pausar pedidos momentáneamente"
                      >
                        <Pause className="w-3 h-3" />
                        <span>Pausar</span>
                      </button>
                    ) : event.status === "PAUSED" ? (
                      <button
                        onClick={() => handleQuickStatusChange(event, "ACTIVE")}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        title="Reanudar evento en vivo"
                      >
                        <Play className="w-3 h-3" />
                        <span>Reanudar</span>
                      </button>
                    ) : null}
                  </div>

                  {/* Acciones de Edición y Eliminación */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(event)}
                      className="p-2 rounded-xl bg-[#0D1930] hover:bg-[#162644] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                      title="Editar nombre, sede, código y detalles del evento"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedEvent(event);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-[#0D1930] hover:bg-rose-950/70 border border-[#263858] hover:border-rose-600/50 text-[#94A3B8] hover:text-rose-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      title="Eliminar evento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CREAR EVENTO / NOCHE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#080F1F]/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#111F38] border border-[#263858] rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#F8FAFC] p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600/20 text-purple-300 border border-purple-500/40 text-[11px] font-black uppercase">
                <CalendarCheck2 className="w-3.5 h-3.5" />
                <span>Nueva Noche</span>
              </div>
              <h2 className="text-xl font-black text-[#F8FAFC]">Crear Evento / Noche de Fiesta</h2>
              <p className="text-xs text-[#94A3B8]">
                Programa una nueva noche de música, karaoke o fiesta para tu local.
              </p>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              {/* Nombre del Evento */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#94A3B8]">Nombre de la Noche / Evento *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Viernes Retro & Karaoke Hits"
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      name: newName,
                      // Si el código está vacío o fue autogenerado, actualizar sugerencia
                      code: prev.code ? prev.code : handleAutoCode(newName),
                    }));
                  }}
                  className="w-full bg-[#0D1930] border border-[#263858] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-bold"
                />
              </div>

              {/* Sede / Local */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#94A3B8]">Sede / Local Físico *</label>
                <select
                  required
                  value={formData.venueId}
                  onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                  className="w-full bg-[#0D1930] border border-[#263858] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 cursor-pointer"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.address ? `(${v.address})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Código de Acceso */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#94A3B8]">Código de Acceso (Display & QR) *</label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, code: handleAutoCode(formData.name || "NOCHE") })
                    }
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                  >
                    ⚡ Generar sugerencia
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="ej. RETRO-VIERNES"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
                    })
                  }
                  className="w-full bg-[#0D1930] border border-[#263858] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] font-mono font-bold tracking-wider focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
                <span className="text-[10px] text-[#94A3B8] block">
                  Los clientes y la Smart TV usarán este código para conectarse: /display/{formData.code || "CODIGO"}
                </span>
              </div>

              {/* Fechas de Inicio y Fin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Fecha y Hora de Inicio *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startsAt}
                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                    className="w-full bg-[#0D1930] border border-[#263858] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Hora de Cierre Estimada (Opcional)</label>
                  <input
                    type="datetime-local"
                    value={formData.endsAt}
                    onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                    className="w-full bg-[#0D1930] border border-[#263858] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* PIN y Estado Inicial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">PIN de Seguridad (Opcional)</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="ej. 1234"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    className="w-full bg-[#0D1930] border border-[#263858] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Estado Inicial</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as any })
                    }
                    className="w-full bg-[#0D1930] border border-[#263858] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="ACTIVE">Activo / En Vivo</option>
                    <option value="DRAFT">Borrador (Planificado)</option>
                    <option value="PAUSED">En Pausa</option>
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#94A3B8]">Descripción / Temática (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Detalles de la noche, promociones especiales o temática musical..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#0D1930] border border-[#263858] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#263858]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#0D1930] hover:bg-[#162644] text-xs font-bold text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263858] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm cursor-pointer shadow-lg shadow-purple-600/25 transition-all"
                >
                  {isSubmitting ? "Creando..." : "Crear Noche"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR EVENTO (Añadir / Editar Nombres, Sedes, Fechas) */}
      {isEditModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 bg-[#080F1F]/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#111F38] border border-[#263858] rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#F8FAFC] p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600/20 text-purple-300 border border-purple-500/40 text-[11px] font-black uppercase">
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Evento</span>
              </div>
              <h2 className="text-xl font-black text-[#F8FAFC]">Modificar Datos de la Noche</h2>
              <p className="text-xs text-[#94A3B8]">
                Cambia el nombre del evento, sede, código de acceso, fechas o estado operativo.
              </p>
            </div>

            <form onSubmit={handleUpdateEvent} className="space-y-4">
              {/* Nombre del Evento */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#94A3B8]">Nombre del Evento *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#0D1930] border border-[#263858] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-bold"
                />
              </div>

              {/* Sede / Local */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#94A3B8]">Sede / Local Físico</label>
                <select
                  value={formData.venueId}
                  onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                  className="w-full bg-[#0D1930] border border-[#263858] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 cursor-pointer"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.address ? `(${v.address})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Código de Acceso */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#94A3B8]">Código de Acceso (Display & QR) *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
                    })
                  }
                  className="w-full bg-[#0D1930] border border-[#263858] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] font-mono font-bold tracking-wider focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Fechas de Inicio y Fin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Fecha y Hora de Inicio *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startsAt}
                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                    className="w-full bg-[#0D1930] border border-[#263858] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Fecha y Hora de Cierre</label>
                  <input
                    type="datetime-local"
                    value={formData.endsAt}
                    onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                    className="w-full bg-[#0D1930] border border-[#263858] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* PIN y Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">PIN de Seguridad</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Sin PIN de seguridad"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    className="w-full bg-[#0D1930] border border-[#263858] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Estado del Evento</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as any })
                    }
                    className="w-full bg-[#0D1930] border border-[#263858] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="ACTIVE">Activo / En Vivo</option>
                    <option value="PAUSED">En Pausa</option>
                    <option value="DRAFT">Borrador (Planificado)</option>
                    <option value="FINISHED">Finalizado (Cerrado)</option>
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#94A3B8]">Descripción / Temática</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#0D1930] border border-[#263858] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#263858]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#0D1930] hover:bg-[#162644] text-xs font-bold text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263858] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm cursor-pointer shadow-lg shadow-purple-600/25 transition-all"
                >
                  {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN DE EVENTO */}
      {isDeleteModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 bg-[#080F1F]/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#111F38] border border-rose-900/60 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative shadow-rose-950/40">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-[#F8FAFC]">¿Eliminar este Evento?</h3>
              <p className="text-xs text-[#94A3B8]">
                Estás a punto de eliminar definitivamente:
              </p>
              <div className="p-3 rounded-2xl bg-[#0D1930] border border-[#263858] text-left space-y-1 mt-2">
                <div className="font-bold text-[#F8FAFC] text-sm">{selectedEvent.name}</div>
                <div className="text-xs text-purple-300 font-mono">Código: {selectedEvent.code}</div>
                <div className="text-[11px] text-[#94A3B8]">
                  {selectedEvent._count.songRequests} pedidos &bull; {selectedEvent._count.photoPosts} fotos
                </div>
              </div>
              <p className="text-[11px] text-rose-400/90 pt-1 font-semibold">
                ⚠️ Esta acción no se puede deshacer. Se liberará el código y se eliminará el registro de la noche.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-[#0D1930] hover:bg-[#162644] text-xs font-bold text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263858] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer shadow-lg shadow-rose-600/30 transition-all"
              >
                {isSubmitting ? "Eliminando..." : "Sí, Eliminar Evento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
