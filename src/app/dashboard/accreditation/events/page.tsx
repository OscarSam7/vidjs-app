"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAccreditation, AccreditationEventSummary } from "@/lib/accreditation/context";
import {
  CalendarCheck2,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  Users,
  IdCard,
  Building,
  CheckCircle2,
  Trash2,
  Edit,
  ExternalLink,
  Sparkles,
  ArrowRight,
  DoorOpen,
  ScanLine,
  X,
  Loader2,
  Clock,
  Globe,
  Lock,
  Eye,
  Pause,
  Play,
  BarChart3,
  Ticket,
} from "lucide-react";
import { BuyersListModal } from "@/components/accreditation/BuyersListModal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { VipSelectModal } from "@/components/ui/VipSelectModal";
import { cn } from "@/lib/utils";

const EVENT_TYPES = [
  { value: "ALL", label: "Todos los tipos" },
  { value: "CONGRESO", label: "Congreso" },
  { value: "CONFERENCIA", label: "Conferencia" },
  { value: "SEMINARIO", label: "Seminario" },
  { value: "FERIA", label: "Feria / Exposición" },
  { value: "FESTIVAL", label: "Festival" },
  { value: "CONCIERTO", label: "Concierto" },
  { value: "EMPRESARIAL", label: "Empresarial" },
  { value: "PRIVADO", label: "Evento Privado" },
  { value: "DEPORTIVO", label: "Deportivo" },
  { value: "FIESTA", label: "Fiesta / Discoteca" },
  { value: "GENERAL", label: "General" },
];

export default function EventsManagementPage() {
  const {
    events,
    activeEventId,
    setActiveEventId,
    isLoading,
    refreshEvents,
    setCreateEventModalOpen,
  } = useAccreditation();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [editEventModalOpen, setEditEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [buyersModalEvent, setBuyersModalEvent] = useState<any | null>(null);
  const [statsModalEvent, setStatsModalEvent] = useState<any | null>(null);
  const [presaleModalEvent, setPresaleModalEvent] = useState<any | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleTogglePublic = async (evt: any) => {
    try {
      setActionLoadingId(evt.id);
      const res = await fetch(`/api/v1/accreditation/events/${evt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublicRegistration: evt.isPublicRegistration === false ? true : false }),
      });
      if (res.ok) {
        await refreshEvents();
      }
    } catch (e) {
      console.error("Error toggling public state:", e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (evt: any) => {
    try {
      setActionLoadingId(evt.id);
      const newStatus = evt.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      const res = await fetch(`/api/v1/accreditation/events/${evt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await refreshEvents();
      }
    } catch (e) {
      console.error("Error toggling event status:", e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchSearch =
        evt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evt.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (evt.locationName && evt.locationName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType =
        selectedType === "ALL" || (evt.eventType && evt.eventType === selectedType);

      const matchStatus =
        selectedStatus === "ALL" || evt.status === selectedStatus;

      return matchSearch && matchType && matchStatus;
    });
  }, [events, searchTerm, selectedType, selectedStatus]);

  const handleDeleteEvent = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el evento "${name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setIsDeleting(id);
      const res = await fetch(`/api/v1/accreditation/events/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Error al eliminar el evento");
        return;
      }
      await refreshEvents();
      if (activeEventId === id) {
        setActiveEventId(null);
      }
    } catch (err) {
      alert("Error al comunicarse con el servidor");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditClick = (evt: any) => {
    setEditingEvent({
      ...evt,
      startsAt: evt.startsAt ? new Date(evt.startsAt).toISOString().slice(0, 16) : "",
      endsAt: evt.endsAt ? new Date(evt.endsAt).toISOString().slice(0, 16) : "",
    });
    setEditEventModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-purple-400" />
            Catálogo & Administración de Eventos
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configura y administra múltiples eventos, credenciales, aforos y cronogramas
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setCreateEventModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nuevo Evento</span>
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-[#0F1E36] border border-[#263858] rounded-xl p-3 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por nombre, código o lugar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-[#0A1322] border-[#263858] text-white text-xs"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
          <div className="w-full sm:w-48">
            <VipSelectModal
              value={selectedType}
              onChange={(val) => setSelectedType(val)}
              options={EVENT_TYPES.map((t) => ({
                value: t.value,
                label: t.label,
                badge: t.value === "ALL" ? "TODOS" : t.value,
                icon: Calendar,
              }))}
              title="Filtrar por Tipo de Evento"
              subtitle="Selecciona la modalidad para refinar la lista"
              placeholder="Todos los tipos"
              icon={Calendar}
            />
          </div>

          <div className="w-full sm:w-44">
            <VipSelectModal
              value={selectedStatus}
              onChange={(val) => setSelectedStatus(val)}
              options={[
                { value: "ALL", label: "Todos los estados", badge: "TODOS", badgeTone: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
                { value: "ACTIVE", label: "Activo", badge: "EN VIVO", badgeTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
                { value: "DRAFT", label: "Borrador", badge: "EDICIÓN", badgeTone: "bg-zinc-800 text-zinc-300 border-zinc-700" },
                { value: "FINISHED", label: "Finalizado", badge: "CERRADO", badgeTone: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
                { value: "CANCELLED", label: "Cancelado", badge: "ANULADO", badgeTone: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
              ]}
              title="Filtrar por Estado"
              subtitle="Filtra eventos según su ciclo de vida"
              placeholder="Todos los estados"
              icon={CheckCircle2}
            />
          </div>
        </div>
      </div>

      {/* Events List Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
          Cargando eventos...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="py-16 text-center bg-[#0F1E36] border border-[#263858] rounded-2xl p-8">
          <CalendarCheck2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No se encontraron eventos</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
            {searchTerm || selectedType !== "ALL" || selectedStatus !== "ALL"
              ? "No hay eventos que coincidan con los filtros seleccionados."
              : "Aún no has creado ningún evento. ¡Comienza creando el primero!"}
          </p>
          <Button
            variant="primary"
            onClick={() => setCreateEventModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Crear Primer Evento
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((evt) => {
            const isActiveSelection = evt.id === activeEventId;
            const gross = evt.financials?.grossRevenue || 0;
            const commission = evt.financials?.commission || Math.round(gross * 0.02);
            const totalSold = evt.financials?.totalSold || evt.metrics?.totalParticipants || 0;
            const totalCapacity = evt.financials?.totalCapacity || evt.maxCapacity || 400;

            return (
              <div
                key={evt.id}
                className={cn(
                  "bg-[#0F1E36] border rounded-2xl shadow-md transition-all flex flex-col justify-between overflow-hidden relative group",
                  isActiveSelection
                    ? "border-purple-500/80 shadow-purple-950/20 ring-1 ring-purple-500/30"
                    : "border-[#263858] hover:border-slate-500"
                )}
              >
                {/* Flyer Banner Header */}
                <div className="h-32 w-full relative bg-gradient-to-r from-amber-600/30 via-purple-900/40 to-slate-900 border-b border-[#263858] overflow-hidden flex items-center justify-center">
                  {evt.bannerUrl ? (
                    <img
                      src={evt.bannerUrl}
                      alt={evt.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      <Sparkles className="w-6 h-6 text-purple-400 mb-1" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-purple-300 font-mono">
                        {evt.eventType || "CONCIERTO"}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F1E36] via-transparent to-transparent opacity-90" />

                  {/* Active Selection Badge */}
                  {isActiveSelection && (
                    <div className="absolute top-2.5 right-3 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 z-10">
                      <CheckCircle2 className="w-3 h-3" />
                      Evento Activo
                    </div>
                  )}
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Title */}
                    <h3 className="text-lg font-black text-white tracking-tight uppercase line-clamp-1">
                      {evt.name}
                    </h3>

                    {/* Status Badges Row (Publicado / Borrador & Público / Privado) */}
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1",
                          evt.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : evt.status === "PAUSED"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-slate-800 text-slate-300 border-slate-700"
                        )}
                      >
                        {evt.status === "ACTIVE"
                          ? "Publicado"
                          : evt.status === "PAUSED"
                          ? "Suspendido"
                          : "Borrador"}
                      </span>

                      <span
                        className={cn(
                          "text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1",
                          evt.isPublicRegistration !== false
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        )}
                      >
                        {evt.isPublicRegistration !== false ? (
                          <>
                            <Globe className="w-3 h-3" />
                            Público
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" />
                            Privado
                          </>
                        )}
                      </span>
                    </div>

                    {/* Event Details: Date & Location */}
                    <div className="space-y-1.5 mt-3 pt-3 border-t border-[#263858]/60 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>
                          {new Date(evt.startsAt).toLocaleDateString("es-PY", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Financials Box (Vendidos, Ingresos Brutos, Comisión Redticket) */}
                      <div className="space-y-1 pt-2 font-sans text-xs">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Ticket className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            Vendidos:{" "}
                            <strong className="text-white font-mono">{totalSold}</strong> /{" "}
                            {totalCapacity}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="text-slate-400 font-mono shrink-0">Gs</span>
                          <span>
                            Ingresos Brutos:{" "}
                            <strong className="text-emerald-400 font-mono font-bold">
                              Gs {gross.toLocaleString("es-PY")}
                            </strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>
                            Comisión Redticket:{" "}
                            <span className="font-mono text-slate-300">
                              Gs {commission.toLocaleString("es-PY")}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Tiers / Lotes Breakdown List */}
                      <div className="mt-3 pt-2 border-t border-[#263858]/40 space-y-1">
                        {evt.financials?.tiers && evt.financials.tiers.length > 0 ? (
                          evt.financials.tiers.slice(0, 4).map((tier: any) => (
                            <div
                              key={tier.id}
                              className="flex items-center justify-between text-[11px] text-slate-300"
                            >
                              <span className="truncate max-w-[170px] uppercase font-semibold text-slate-400">
                                {tier.name}
                              </span>
                              <span className="font-mono font-bold text-white shrink-0">
                                {tier.sold} / {tier.max}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="uppercase font-semibold">GENERAL</span>
                            <span className="font-mono font-bold text-white">
                              {evt.metrics?.totalParticipants || 0} / {evt.maxCapacity || 400}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar (Image 1 replica) */}
                  <div className="mt-5 pt-3 border-t border-[#263858] space-y-2">
                    {/* Primary Links: Ver, Lista de Compradores */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <Link
                        href={`/accreditation/${evt.code}/register`}
                        target="_blank"
                        className="text-purple-300 hover:text-white font-bold flex items-center gap-1 hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => setBuyersModalEvent(evt)}
                        className="text-slate-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer hover:underline"
                      >
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                        <span>Lista de Compradores</span>
                      </button>
                    </div>

                    {/* Secondary Links: Estadísticas, Preventa */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400 pt-1">
                      <button
                        type="button"
                        onClick={() => setStatsModalEvent(evt)}
                        className="hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Estadísticas</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPresaleModalEvent(evt)}
                        className="hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Ticket className="w-3.5 h-3.5 text-amber-400" />
                        <span>Preventa</span>
                      </button>
                    </div>

                    {/* Control Buttons: Editar, Hacer Privado, Suspender, Eliminar */}
                    <div className="flex items-center justify-between gap-1 pt-2 border-t border-[#263858]/50 text-xs">
                      <button
                        type="button"
                        onClick={() => handleEditClick(evt)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#0A1322] flex items-center gap-1 cursor-pointer"
                        title="Editar evento"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePublic(evt)}
                        disabled={actionLoadingId === evt.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#0A1322] flex items-center gap-1 cursor-pointer"
                        title={
                          evt.isPublicRegistration !== false ? "Hacer privado" : "Hacer público"
                        }
                      >
                        {evt.isPublicRegistration !== false ? (
                          <>
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[11px]">Hacer privado</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[11px]">Hacer público</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(evt)}
                        disabled={actionLoadingId === evt.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-[#0A1322] flex items-center gap-1 cursor-pointer"
                        title={evt.status === "ACTIVE" ? "Suspender evento" : "Reactivar evento"}
                      >
                        {evt.status === "ACTIVE" ? (
                          <>
                            <Pause className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[11px]">Suspender</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[11px]">Reactivar</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(evt.id, evt.name)}
                        disabled={isDeleting === evt.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-[#0A1322] flex items-center gap-1 cursor-pointer"
                        title="Eliminar evento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Event Modal */}
      {editEventModalOpen && editingEvent && (
        <EditEventModal
          event={editingEvent}
          isOpen={editEventModalOpen}
          onClose={() => setEditEventModalOpen(false)}
          onUpdated={async () => {
            await refreshEvents();
            setEditEventModalOpen(false);
          }}
        />
      )}

      {/* Buyers List Modal */}
      {buyersModalEvent && (
        <BuyersListModal
          isOpen={Boolean(buyersModalEvent)}
          onClose={() => setBuyersModalEvent(null)}
          eventId={buyersModalEvent.id}
          eventName={buyersModalEvent.name}
          eventCode={buyersModalEvent.code}
        />
      )}

      {/* Stats Modal */}
      {statsModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0A1322] border border-[#263858] rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#263858] pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Estadísticas de Venta</h3>
              </div>
              <button
                onClick={() => setStatsModalEvent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#0F1E36] border border-[#263858] flex justify-between items-center">
                <span className="text-slate-400">Evento:</span>
                <strong className="text-white font-bold">{statsModalEvent.name}</strong>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#0F1E36] border border-[#263858]">
                  <span className="text-slate-400 block text-[11px]">Total Boletos</span>
                  <strong className="text-base font-mono text-purple-300">
                    {statsModalEvent.financials?.totalSold ||
                      statsModalEvent.metrics?.totalParticipants ||
                      0}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-[#0F1E36] border border-[#263858]">
                  <span className="text-slate-400 block text-[11px]">Recaudación Bruta</span>
                  <strong className="text-base font-mono text-emerald-400">
                    Gs {(statsModalEvent.financials?.grossRevenue || 0).toLocaleString("es-PY")}
                  </strong>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#0F1E36] border border-[#263858] space-y-2">
                <span className="text-slate-400 block text-[11px] font-bold uppercase">
                  Desglose por Categoría
                </span>
                {statsModalEvent.financials?.tiers?.map((t: any) => (
                  <div key={t.id} className="flex justify-between items-center">
                    <span className="text-slate-300">{t.name}</span>
                    <span className="font-mono text-white font-bold">
                      {t.sold} / {t.max} (Gs {(t.sold * t.price).toLocaleString("es-PY")})
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-2 text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatsModalEvent(null)}
                className="border-[#263858] text-xs text-slate-300"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Presale Modal */}
      {presaleModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0A1322] border border-[#263858] rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#263858] pb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Lotes de Preventa & Cupos</h3>
              </div>
              <button
                onClick={() => setPresaleModalEvent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-slate-400">
                Lotes y categorías de entradas configuradas para{" "}
                <strong className="text-white">{presaleModalEvent.name}</strong>.
              </p>
              <div className="space-y-2">
                {presaleModalEvent.financials?.tiers?.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-[#0F1E36] border border-[#263858] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white uppercase">{t.name}</div>
                      <div className="text-[11px] text-slate-400">
                        Precio:{" "}
                        <span className="font-mono text-emerald-400 font-bold">
                          Gs {t.price.toLocaleString("es-PY")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {t.sold} vendidos de {t.max}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <Link
                href="/dashboard/accreditation/types"
                className="text-xs text-purple-300 hover:underline font-bold"
              >
                Gestionar todos los tipos &gt;
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresaleModalEvent(null)}
                className="border-[#263858] text-xs text-slate-300"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditEventModal({
  event,
  isOpen,
  onClose,
  onUpdated,
}: {
  event: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [name, setName] = useState(event.name || "");
  const [eventType, setEventType] = useState(event.eventType || "CONGRESO");
  const [status, setStatus] = useState(event.status || "ACTIVE");
  const [startsAt, setStartsAt] = useState(event.startsAt || "");
  const [endsAt, setEndsAt] = useState(event.endsAt || "");
  const [locationName, setLocationName] = useState(event.locationName || "");
  const [address, setAddress] = useState(event.address || "");
  const [organizerName, setOrganizerName] = useState(event.organizerName || "");
  const [responsibleCompany, setResponsibleCompany] = useState(event.responsibleCompany || "");
  const [companyRuc, setCompanyRuc] = useState(event.companyRuc || "");
  const [maxCapacity, setMaxCapacity] = useState(
    event.maxCapacity ? String(event.maxCapacity) : ""
  );
  const [daysCount, setDaysCount] = useState(event.daysCount ? String(event.daysCount) : "1");
  const [description, setDescription] = useState(event.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch(`/api/v1/accreditation/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          eventType,
          status,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          locationName: locationName.trim() || null,
          address: address.trim() || null,
          organizerName: organizerName.trim() || null,
          responsibleCompany: responsibleCompany.trim() || null,
          companyRuc: companyRuc.trim() || null,
          maxCapacity: maxCapacity ? parseInt(maxCapacity, 10) : null,
          daysCount: parseInt(daysCount, 10) || 1,
          description: description.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al actualizar evento");
      }

      onUpdated();
    } catch (err: any) {
      setError(err.message || "Error al actualizar");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0F1E36] border border-[#263858] rounded-2xl p-6 shadow-2xl text-[#F8FAFC] my-8">
        <div className="flex items-center justify-between pb-4 border-b border-[#263858]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-600/50 flex items-center justify-center text-purple-300">
              <Edit className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Editar Evento</h3>
              <p className="text-xs text-slate-400">
                Modificar detalles, aforo y estado del evento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre del Evento *
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Estado
              </label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: "ACTIVE", label: "Activo" },
                  { value: "DRAFT", label: "Borrador" },
                  { value: "FINISHED", label: "Finalizado" },
                  { value: "CANCELLED", label: "Cancelado" },
                ]}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tipo de Evento
              </label>
              <Select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                options={[
                  { value: "CONGRESO", label: "Congreso" },
                  { value: "CONFERENCIA", label: "Conferencia" },
                  { value: "SEMINARIO", label: "Seminario" },
                  { value: "FERIA", label: "Feria / Expo" },
                  { value: "FESTIVAL", label: "Festival" },
                  { value: "CONCIERTO", label: "Concierto" },
                  { value: "EMPRESARIAL", label: "Empresarial" },
                  { value: "PRIVADO", label: "Evento Privado" },
                  { value: "DEPORTIVO", label: "Deportivo" },
                  { value: "FIESTA", label: "Fiesta / Discoteca" },
                  { value: "GENERAL", label: "General" },
                ]}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Fecha Inicio *
              </label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Fecha Fin
              </label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Lugar / Sede
              </label>
              <Input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Dirección
              </label>
              <Input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Aforo Máximo
              </label>
              <Input
                type="number"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cantidad de Días
              </label>
              <Input
                type="number"
                min="1"
                max="30"
                value={daysCount}
                onChange={(e) => setDaysCount(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                RUC de Empresa
              </label>
              <Input
                type="text"
                value={companyRuc}
                onChange={(e) => setCompanyRuc(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-[#263858] text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
