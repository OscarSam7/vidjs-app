"use client";

import React, { useState } from "react";
import {
  Info,
  Image as ImageIcon,
  Users,
  Calendar,
  Ticket,
  ShieldCheck,
  X,
  Plus,
  Trash2,
  Upload,
  Check,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Clock,
  MapPin,
  Building,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

export interface EventWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (event: any) => void;
  activeVenueId?: string | null;
  activeVenueName?: string | null;
}

type WizardTab = "general" | "multimedia" | "artists" | "dates" | "tickets" | "staff";

export function EventWizardModal({
  isOpen,
  onClose,
  onCreated,
  activeVenueId,
  activeVenueName = "Sede Centro",
}: EventWizardModalProps) {
  const [activeTab, setActiveTab] = useState<WizardTab>("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab 1: Info General
  const [producer, setProducer] = useState("Rumba Stage");
  const [customProducer, setCustomProducer] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("FIESTA");
  const [locationName, setLocationName] = useState(activeVenueName || "Sede Centro");
  const [maxCapacity, setMaxCapacity] = useState("500");

  // Tab 2: Multimedia
  const [bannerUrl, setBannerUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Tab 3: Artistas
  const [artists, setArtists] = useState<Array<{ name: string; role: string; time: string }>>([
    { name: "DJ Residente", role: "DJ Principal", time: "23:00 - 02:00" },
    { name: "DJ Invitado Special", role: "Set Estelar", time: "02:00 - 04:30" },
  ]);

  // Tab 4: Fechas
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [startsAt, setStartsAt] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );
  const [endsAt, setEndsAt] = useState(
    new Date(Date.now() + 86400000 + 21600000).toISOString().slice(0, 16)
  );
  const [eventDays, setEventDays] = useState<Array<{ dayNumber: number; name: string; date: string }>>([
    { dayNumber: 1, name: "Día 1 - Apertura", date: new Date().toISOString().slice(0, 10) },
    { dayNumber: 2, name: "Día 2 - Gran Cierre", date: new Date(Date.now() + 86400000).toISOString().slice(0, 10) },
  ]);

  // Tab 5: Entradas / Acreditaciones
  const [categories, setCategories] = useState<
    Array<{ name: string; code: string; colorHex: string; maxAvailable: number; allowReentry: boolean }>
  >([
    { name: "VIP All Access", code: "VIP", colorHex: "#8B5CF6", maxAvailable: 100, allowReentry: true },
    { name: "General / Campo", code: "GEN", colorHex: "#3B82F6", maxAvailable: 350, allowReentry: true },
    { name: "Staff & Operaciones", code: "STAFF", colorHex: "#10B981", maxAvailable: 30, allowReentry: true },
    { name: "Prensa & Media", code: "PRENSA", colorHex: "#EC4899", maxAvailable: 20, allowReentry: true },
  ]);

  // Tab 6: Staff & Puertas
  const [pin, setPin] = useState("1234");
  const [staffMembers, setStaffMembers] = useState<Array<{ name: string; role: string; phone: string }>>([
    { name: "Jefe de Puerta Principal", role: "Control de Acceso", phone: "+595 981 123456" },
    { name: "Operador Sector VIP", role: "Validador QR", phone: "+595 982 654321" },
  ]);

  if (!isOpen) return null;

  const tabs: Array<{ id: WizardTab; label: string; icon: any }> = [
    { id: "general", label: "Info General", icon: Info },
    { id: "multimedia", label: "Multimedia", icon: ImageIcon },
    { id: "artists", label: "Artistas", icon: Users },
    { id: "dates", label: "Fechas", icon: Calendar },
    { id: "tickets", label: "Entradas", icon: Ticket },
    { id: "staff", label: "Staff", icon: ShieldCheck },
  ];

  const handleNext = () => {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].id);
    }
  };

  const handlePrev = () => {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].id);
    }
  };

  const handleAddArtist = () => {
    setArtists((prev) => [...prev, { name: "", role: "DJ / Show", time: "00:00" }]);
  };

  const handleRemoveArtist = (index: number) => {
    setArtists((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCategory = () => {
    const nextNum = categories.length + 1;
    setCategories((prev) => [
      ...prev,
      {
        name: `Acceso Especial ${nextNum}`,
        code: `ACC-${nextNum}`,
        colorHex: "#F59E0B",
        maxAvailable: 50,
        allowReentry: true,
      },
    ]);
  };

  const handleRemoveCategory = (index: number) => {
    setCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddStaff = () => {
    setStaffMembers((prev) => [...prev, { name: "", role: "Operador de Puerta", phone: "" }]);
  };

  const handleRemoveStaff = (index: number) => {
    setStaffMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setActiveTab("general");
      setError("El nombre del evento es obligatorio");
      return;
    }
    if (!startsAt) {
      setActiveTab("dates");
      setError("La fecha y hora de inicio es obligatoria");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const effectiveProducer = producer === "OTHER" ? customProducer.trim() || "Productora Independiente" : producer;

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        eventType,
        organizerName: effectiveProducer,
        responsibleCompany: effectiveProducer,
        locationName: locationName.trim() || activeVenueName || "Sede Centro",
        venueId: activeVenueId || undefined,
        maxCapacity: maxCapacity ? parseInt(maxCapacity, 10) : 500,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        daysCount: isMultiDay ? eventDays.length : 1,
        bannerUrl: bannerUrl.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        pin: pin.trim() || undefined,
        createDefaultCategories: categories.length === 0,
        customCategories: categories.map((c) => ({
          name: c.name.trim(),
          code: c.code.trim().toUpperCase(),
          colorHex: c.colorHex,
          maxAvailable: c.maxAvailable,
          allowReentry: c.allowReentry,
        })),
        artists: artists.filter((a) => a.name.trim()).map((a) => ({
          name: a.name.trim(),
          role: a.role.trim(),
          time: a.time.trim(),
        })),
        eventDaysList: isMultiDay
          ? eventDays.map((d) => ({
              dayNumber: d.dayNumber,
              name: d.name,
              date: d.date,
            }))
          : undefined,
        staff: staffMembers.filter((s) => s.name.trim()).map((s) => ({
          name: s.name.trim(),
          role: s.role.trim(),
          phone: s.phone.trim(),
        })),
      };

      const res = await fetch("/api/v1/accreditation/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al crear el evento");
      }

      onCreated(data.event);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error inesperado al guardar el evento");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-[#0F1E36] border border-[#263858] rounded-3xl shadow-2xl flex flex-col text-[#F8FAFC] overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-5 sm:p-6 pb-3 border-b border-[#263858] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Crear Nuevo Evento
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configuración completa: producción, artistas, jornadas, entradas y accesos
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Strip (Exact to screenshot) */}
        <div className="px-5 sm:px-6 border-b border-[#263858] bg-[#0A1322] flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "py-3.5 px-3.5 text-xs font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer",
                  isActive
                    ? "border-purple-500 text-purple-400 font-extrabold"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-purple-400" : "text-slate-400")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs shrink-0 flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* Form Body Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: INFO GENERAL */}
          {activeTab === "general" && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-white">Información General del Evento</h3>
                <p className="text-xs text-slate-400 mt-0.5">Los campos marcados con * son obligatorios</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Seleccionar productora <span className="text-red-400">*</span>
                </label>
                <Select
                  value={producer}
                  onChange={(e) => setProducer(e.target.value)}
                  options={[
                    { value: "Rumba Stage", label: "Rumba Stage" },
                    { value: "Vidjeis Producciones", label: "Vidjeis Producciones" },
                    { value: "Stage Master Eventos", label: "Stage Master Eventos" },
                    { value: "Electro Fest Paraguay", label: "Electro Fest Paraguay" },
                    { value: "OTHER", label: "+ Otra productora..." },
                  ]}
                  className="bg-[#0A1322] border-[#263858] text-white"
                />
              </div>

              {producer === "OTHER" && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Nombre de la Productora <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej: Velvet Entertainment"
                    value={customProducer}
                    onChange={(e) => setCustomProducer(e.target.value)}
                    required
                    className="bg-[#0A1322] border-[#263858] text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nombre del Evento <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Nombre del Evento"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-[#0A1322] border-[#263858] text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Describe tu evento... <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe tu evento..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0A1322] border border-[#263858] rounded-xl p-3 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Categoría de Evento
                  </label>
                  <Select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    options={[
                      { value: "FIESTA", label: "Fiesta / Boliche" },
                      { value: "CONCIERTO", label: "Concierto en Vivo" },
                      { value: "FESTIVAL", label: "Festival" },
                      { value: "CONGRESO", label: "Congreso" },
                      { value: "EMPRESARIAL", label: "Empresarial" },
                      { value: "PRIVADO", label: "Evento Privado" },
                      { value: "GENERAL", label: "General" },
                    ]}
                    className="bg-[#0A1322] border-[#263858] text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Lugar / Sede
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej: Sede Centro"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="bg-[#0A1322] border-[#263858] text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Aforo Máximo
                  </label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Ej: 500"
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                    className="bg-[#0A1322] border-[#263858] text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MULTIMEDIA */}
          {activeTab === "multimedia" && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-white">Material Visual & Multimedia</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Afiches, banners y logotipos que se proyectarán en pantallas y credenciales
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  URL del Banner Horizontal (16:9)
                </label>
                <Input
                  type="url"
                  placeholder="https://ejemplo.com/banner-evento.jpg"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="bg-[#0A1322] border-[#263858] text-white text-xs"
                />
                {bannerUrl && (
                  <div className="mt-2 h-32 rounded-xl overflow-hidden border border-[#263858] relative">
                    <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  URL del Logotipo / Isotipo Oficial
                </label>
                <Input
                  type="url"
                  placeholder="https://ejemplo.com/logo-evento.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="bg-[#0A1322] border-[#263858] text-white text-xs"
                />
                {logoUrl && (
                  <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-[#263858] p-2 bg-[#0A1322] flex items-center justify-center">
                    <img src={logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ARTISTAS */}
          {activeTab === "artists" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Line-up, DJs y Artistas Invitados</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cronograma de shows y presentaciones durante la noche
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddArtist}
                  className="border-purple-600/40 text-purple-300 hover:text-white hover:bg-purple-950/60 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Agregar Artista</span>
                </Button>
              </div>

              <div className="space-y-2.5">
                {artists.map((artist, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#0A1322] border border-[#263858] rounded-xl flex items-center gap-3"
                  >
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Nombre del Artista / DJ"
                        value={artist.name}
                        onChange={(e) => {
                          const updated = [...artists];
                          updated[idx].name = e.target.value;
                          setArtists(updated);
                        }}
                        className="bg-[#0F1E36] border-[#263858] text-white text-xs"
                      />
                    </div>

                    <div className="w-40">
                      <Input
                        type="text"
                        placeholder="Rol (ej: DJ Principal)"
                        value={artist.role}
                        onChange={(e) => {
                          const updated = [...artists];
                          updated[idx].role = e.target.value;
                          setArtists(updated);
                        }}
                        className="bg-[#0F1E36] border-[#263858] text-white text-xs"
                      />
                    </div>

                    <div className="w-36">
                      <Input
                        type="text"
                        placeholder="Horario (23:00 - 02:00)"
                        value={artist.time}
                        onChange={(e) => {
                          const updated = [...artists];
                          updated[idx].time = e.target.value;
                          setArtists(updated);
                        }}
                        className="bg-[#0F1E36] border-[#263858] text-white text-xs"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveArtist(idx)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      title="Quitar artista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: FECHAS */}
          {activeTab === "dates" && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-white">Fechas & Programación del Evento</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Establece la fecha de inicio, duración y modalidad de jornadas
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Fecha & Hora de Inicio <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    required
                    className="bg-[#0A1322] border-[#263858] text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Fecha & Hora de Finalización
                  </label>
                  <Input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="bg-[#0A1322] border-[#263858] text-white text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#263858]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMultiDay}
                    onChange={(e) => setIsMultiDay(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs font-bold text-white">Evento Multidía (Varias Jornadas)</span>
                </label>
              </div>

              {isMultiDay && (
                <div className="space-y-2.5 pt-1">
                  <span className="text-xs font-bold text-slate-300 block">Jornadas del Evento:</span>
                  {eventDays.map((day, idx) => (
                    <div key={idx} className="p-3 bg-[#0A1322] border border-[#263858] rounded-xl flex items-center gap-3 text-xs">
                      <span className="w-7 h-7 rounded-lg bg-purple-950 text-purple-300 border border-purple-800 flex items-center justify-center font-bold">
                        {day.dayNumber}
                      </span>
                      <Input
                        type="text"
                        value={day.name}
                        onChange={(e) => {
                          const updated = [...eventDays];
                          updated[idx].name = e.target.value;
                          setEventDays(updated);
                        }}
                        className="bg-[#0F1E36] border-[#263858] text-white text-xs flex-1"
                      />
                      <Input
                        type="date"
                        value={day.date}
                        onChange={(e) => {
                          const updated = [...eventDays];
                          updated[idx].date = e.target.value;
                          setEventDays(updated);
                        }}
                        className="bg-[#0F1E36] border-[#263858] text-white text-xs w-40"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ENTRADAS */}
          {activeTab === "tickets" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Entradas & Tipos de Acreditación</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Niveles de acceso con cupos y credenciales QR independientes
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCategory}
                  className="border-purple-600/40 text-purple-300 hover:text-white hover:bg-purple-950/60 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Agregar Tipo de Entrada</span>
                </Button>
              </div>

              <div className="space-y-2.5">
                {categories.map((cat, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#0A1322] border border-[#263858] rounded-xl flex items-center gap-3"
                  >
                    <input
                      type="color"
                      value={cat.colorHex}
                      onChange={(e) => {
                        const updated = [...categories];
                        updated[idx].colorHex = e.target.value;
                        setCategories(updated);
                      }}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      title="Color de credencial"
                    />

                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Nombre de Entrada"
                        value={cat.name}
                        onChange={(e) => {
                          const updated = [...categories];
                          updated[idx].name = e.target.value;
                          setCategories(updated);
                        }}
                        className="bg-[#0F1E36] border-[#263858] text-white text-xs font-bold"
                      />
                    </div>

                    <div className="w-28">
                      <Input
                        type="text"
                        placeholder="Código (VIP)"
                        value={cat.code}
                        onChange={(e) => {
                          const updated = [...categories];
                          updated[idx].code = e.target.value.toUpperCase();
                          setCategories(updated);
                        }}
                        className="bg-[#0F1E36] border-[#263858] text-white text-xs font-mono uppercase"
                      />
                    </div>

                    <div className="w-28">
                      <Input
                        type="number"
                        placeholder="Cupo (100)"
                        value={cat.maxAvailable || ""}
                        onChange={(e) => {
                          const updated = [...categories];
                          updated[idx].maxAvailable = parseInt(e.target.value, 10) || 0;
                          setCategories(updated);
                        }}
                        className="bg-[#0F1E36] border-[#263858] text-white text-xs font-mono"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(idx)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      title="Quitar categoría"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: STAFF */}
          {activeTab === "staff" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Staff & Control de Acceso</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Personal de escaneo en puertas y PIN de seguridad para operarios
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddStaff}
                  className="border-purple-600/40 text-purple-300 hover:text-white hover:bg-purple-950/60 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Agregar Staff</span>
                </Button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  PIN de Acceso Rápido para Escáner Móvil en Puerta
                </label>
                <div className="flex items-center gap-2 max-w-xs">
                  <Key className="w-4 h-4 text-purple-400" />
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="bg-[#0A1322] border-[#263858] text-white font-mono tracking-widest text-center text-sm font-bold"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Permite a los guardias acceder a la cámara escáner desde sus teléfonos sin usuario ni contraseña.
                </span>
              </div>

              <div className="space-y-2.5 pt-2">
                <span className="text-xs font-bold text-slate-300 block">Personal Operativo Asignado:</span>
                {staffMembers.map((st, idx) => (
                  <div key={idx} className="p-3 bg-[#0A1322] border border-[#263858] rounded-xl flex items-center gap-3">
                    <Input
                      type="text"
                      placeholder="Nombre del Operador"
                      value={st.name}
                      onChange={(e) => {
                        const updated = [...staffMembers];
                        updated[idx].name = e.target.value;
                        setStaffMembers(updated);
                      }}
                      className="bg-[#0F1E36] border-[#263858] text-white text-xs flex-1"
                    />
                    <Input
                      type="text"
                      placeholder="Rol (ej: Portero)"
                      value={st.role}
                      onChange={(e) => {
                        const updated = [...staffMembers];
                        updated[idx].role = e.target.value;
                        setStaffMembers(updated);
                      }}
                      className="bg-[#0F1E36] border-[#263858] text-white text-xs w-44"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveStaff(idx)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      title="Quitar operador"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-[#263858] bg-[#0A1322] flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 font-medium">
            Paso {tabs.findIndex((t) => t.id === activeTab) + 1} de {tabs.length}:{" "}
            <strong className="text-white">{tabs.find((t) => t.id === activeTab)?.label}</strong>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-[#263858] text-slate-300 hover:text-white text-xs"
            >
              Cancelar
            </Button>

            {activeTab !== "general" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={isSubmitting}
                className="border-[#263858] text-slate-300 hover:text-white text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </Button>
            )}

            {activeTab !== "staff" ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleNext}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-950"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Crear Evento Oficial</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
