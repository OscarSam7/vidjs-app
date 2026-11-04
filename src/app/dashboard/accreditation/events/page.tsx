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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            options={EVENT_TYPES}
            className="bg-[#0A1322] border-[#263858] text-white text-xs min-w-[160px]"
          />

          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={[
              { value: "ALL", label: "Todos los estados" },
              { value: "ACTIVE", label: "Activo" },
              { value: "DRAFT", label: "Borrador" },
              { value: "FINISHED", label: "Finalizado" },
              { value: "CANCELLED", label: "Cancelado" },
            ]}
            className="bg-[#0A1322] border-[#263858] text-white text-xs min-w-[140px]"
          />
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

            return (
              <div
                key={evt.id}
                className={cn(
                  "bg-[#0F1E36] border rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between relative group",
                  isActiveSelection
                    ? "border-purple-500/80 shadow-purple-950/20 bg-gradient-to-b from-[#0F1E36] to-purple-950/10"
                    : "border-[#263858] hover:border-slate-600"
                )}
              >
                {/* Active Selection Badge */}
                {isActiveSelection && (
                  <div className="absolute -top-2.5 right-4 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Evento Activo
                  </div>
                )}

                <div>
                  {/* Category & Status badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60">
                      {evt.eventType || "GENERAL"}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold",
                        evt.status === "ACTIVE"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : evt.status === "DRAFT"
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : "bg-slate-800 text-slate-300"
                      )}
                    >
                      {evt.status}
                    </span>
                  </div>

                  {/* Title & Code */}
                  <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                    {evt.name}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    Código: <strong className="text-slate-200">{evt.code}</strong>
                  </div>

                  {/* Location & Dates */}
                  <div className="space-y-1 mt-3 pt-3 border-t border-[#263858]/60 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>
                        {new Date(evt.startsAt).toLocaleDateString("es-PY", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {evt.daysCount && evt.daysCount > 1 ? ` (${evt.daysCount} días)` : ""}
                      </span>
                    </div>

                    {evt.locationName && (
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">{evt.locationName}</span>
                      </div>
                    )}

                    {evt.organizerName && (
                      <div className="flex items-center gap-2 truncate text-slate-400 text-[11px]">
                        <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{evt.organizerName}</span>
                      </div>
                    )}
                  </div>

                  {/* Metrics Strip */}
                  {evt.metrics && (
                    <div className="grid grid-cols-3 gap-2 mt-4 p-2.5 bg-[#0A1322] border border-[#263858] rounded-xl text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Registrados</span>
                        <strong className="text-xs font-mono text-purple-300">
                          {evt.metrics.totalParticipants}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Acreditados</span>
                        <strong className="text-xs font-mono text-blue-300">
                          {evt.metrics.totalAccredited}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Ingresados</span>
                        <strong className="text-xs font-mono text-emerald-300">
                          {evt.metrics.totalCheckedIn}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions bar */}
                <div className="mt-5 pt-3 border-t border-[#263858] flex items-center justify-between gap-2">
                  {!isActiveSelection ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveEventId(evt.id)}
                      className="border-[#263858] hover:border-purple-500 text-xs text-purple-300"
                    >
                      Activar
                    </Button>
                  ) : (
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> En uso
                    </span>
                  )}

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(evt)}
                      className="p-1.5 text-slate-400 hover:text-white"
                      title="Editar evento"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEvent(evt.id, evt.name)}
                      disabled={isDeleting === evt.id}
                      className="p-1.5 text-slate-400 hover:text-red-400"
                      title="Eliminar evento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
