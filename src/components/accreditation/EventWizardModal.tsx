"use client";

import React, { useState, useEffect } from "react";
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
  Store,
  Copy,
  DollarSign,
  Percent,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

export interface PuntoDeVenta {
  id: string;
  name: string;
  type: "BOLETERIA_FIJA" | "PROMOTOR_RRPP" | "CAJA_PUERTA";
  operatorName: string;
  operatorPhone: string;
  accessPin: string;
  commissionPercent: number;
}

export interface EventWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (event: any) => void;
  onUpdated?: (event: any) => void;
  activeVenueId?: string | null;
  activeVenueName?: string | null;
  mode?: "create" | "edit";
  initialEvent?: any;
}

type WizardTab = "general" | "multimedia" | "artists" | "dates" | "tickets" | "staff";

export function EventWizardModal({
  isOpen,
  onClose,
  onCreated,
  onUpdated,
  activeVenueId,
  activeVenueName = "Sede Centro",
  mode = "create",
  initialEvent = null,
}: EventWizardModalProps) {
  const isEditMode = mode === "edit" && Boolean(initialEvent);

  const [activeTab, setActiveTab] = useState<WizardTab>("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPosId, setCopiedPosId] = useState<string | null>(null);
  const [staffSubTab, setStaffSubTab] = useState<"pos" | "gates">("pos");

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

  // Tab 5: Entradas / Acreditaciones & Comisión Vidticket
  const [commissionPerTicket, setCommissionPerTicket] = useState<number>(1200);
  const [categories, setCategories] = useState<
    Array<{ name: string; code: string; colorHex: string; price: number; maxAvailable: number; allowReentry: boolean }>
  >([
    { name: "VIP All Access", code: "VIP", colorHex: "#8B5CF6", price: 120000, maxAvailable: 100, allowReentry: true },
    { name: "General / Campo", code: "GEN", colorHex: "#3B82F6", price: 60000, maxAvailable: 350, allowReentry: true },
    { name: "Staff & Operaciones", code: "STAFF", colorHex: "#10B981", price: 0, maxAvailable: 30, allowReentry: true },
    { name: "Prensa & Media", code: "PRENSA", colorHex: "#EC4899", price: 0, maxAvailable: 20, allowReentry: true },
  ]);

  // Tab 6: Staff & Puntos de Venta (POS)
  const [pin, setPin] = useState("1234");
  const [staffMembers, setStaffMembers] = useState<Array<{ name: string; role: string; phone: string }>>([
    { name: "Jefe de Puerta Principal", role: "Control de Acceso", phone: "+595 981 123456" },
    { name: "Operador Sector VIP", role: "Validador QR", phone: "+595 982 654321" },
  ]);

  const [puntosDeVenta, setPuntosDeVenta] = useState<PuntoDeVenta[]>([
    {
      id: "pos_central",
      name: "Boletería Central Rumba Stage",
      type: "BOLETERIA_FIJA",
      operatorName: "Cajero 1 - Boletería",
      operatorPhone: "0981 123456",
      accessPin: "1122",
      commissionPercent: 0,
    },
    {
      id: "pos_rrpp_1",
      name: "RRPP Juan Pérez (Promotor)",
      type: "PROMOTOR_RRPP",
      operatorName: "Juan Pérez",
      operatorPhone: "0982 987654",
      accessPin: "3344",
      commissionPercent: 10,
    },
    {
      id: "pos_puerta_norte",
      name: "Caja Taquilla Puerta Norte",
      type: "CAJA_PUERTA",
      operatorName: "Operador Puerta Norte",
      operatorPhone: "0983 555666",
      accessPin: "5566",
      commissionPercent: 0,
    },
  ]);

  // Carga de datos existentes si está en modo Edición
  useEffect(() => {
    if (!initialEvent) return;

    if (initialEvent.name) setName(initialEvent.name);
    if (initialEvent.description) setDescription(initialEvent.description);
    if (initialEvent.eventType) setEventType(initialEvent.eventType);
    if (initialEvent.organizerName) setProducer(initialEvent.organizerName);
    if (initialEvent.locationName) setLocationName(initialEvent.locationName);
    if (initialEvent.maxCapacity) setMaxCapacity(String(initialEvent.maxCapacity));
    if (initialEvent.bannerUrl) setBannerUrl(initialEvent.bannerUrl);
    if (initialEvent.logoUrl) setLogoUrl(initialEvent.logoUrl);

    if (initialEvent.startsAt) {
      setStartsAt(new Date(initialEvent.startsAt).toISOString().slice(0, 16));
    }
    if (initialEvent.endsAt) {
      setEndsAt(new Date(initialEvent.endsAt).toISOString().slice(0, 16));
    }

    // Parsear Settings extendidos (comisión Vidticket, artistas, posList, etc.)
    let parsedSettings: any = {};
    try {
      if (typeof initialEvent.settings === "string") {
        parsedSettings = JSON.parse(initialEvent.settings);
      } else if (initialEvent.settings) {
        parsedSettings = initialEvent.settings;
      }
    } catch {}

    if (parsedSettings.commissionPerTicket !== undefined) {
      setCommissionPerTicket(Number(parsedSettings.commissionPerTicket));
    } else if (initialEvent.financials?.commissionPerTicket !== undefined) {
      setCommissionPerTicket(Number(initialEvent.financials.commissionPerTicket));
    }

    if (Array.isArray(parsedSettings.posList) && parsedSettings.posList.length > 0) {
      setPuntosDeVenta(parsedSettings.posList);
    } else if (Array.isArray(initialEvent.financials?.posList) && initialEvent.financials.posList.length > 0) {
      setPuntosDeVenta(initialEvent.financials.posList);
    }

    if (Array.isArray(parsedSettings.artists) && parsedSettings.artists.length > 0) {
      setArtists(parsedSettings.artists);
    }

    if (Array.isArray(parsedSettings.staff) && parsedSettings.staff.length > 0) {
      setStaffMembers(parsedSettings.staff);
    }

    if (parsedSettings.pin) setPin(parsedSettings.pin);

    // Si tiene categorías en financials o accreditationTypes
    if (initialEvent.financials?.tiers && initialEvent.financials.tiers.length > 0) {
      setCategories(
        initialEvent.financials.tiers.map((t: any) => ({
          name: t.name,
          code: t.code || t.name.slice(0, 4).toUpperCase(),
          colorHex: t.colorHex || "#8B5CF6",
          price: t.price || 50000,
          maxAvailable: t.max || 100,
          allowReentry: true,
        }))
      );
    } else if (initialEvent.accreditationTypes && initialEvent.accreditationTypes.length > 0) {
      setCategories(
        initialEvent.accreditationTypes.map((t: any) => ({
          name: t.name,
          code: t.code || t.name.slice(0, 4).toUpperCase(),
          colorHex: t.colorHex || "#8B5CF6",
          price: 50000,
          maxAvailable: t.maxAvailable || 100,
          allowReentry: t.allowReentry ?? true,
        }))
      );
    }
  }, [initialEvent]);

  if (!isOpen) return null;

  const tabs: Array<{ id: WizardTab; label: string; icon: any }> = [
    { id: "general", label: "Info General", icon: Info },
    { id: "multimedia", label: "Multimedia", icon: ImageIcon },
    { id: "artists", label: "Artistas", icon: Users },
    { id: "dates", label: "Fechas", icon: Calendar },
    { id: "tickets", label: "Entradas", icon: Ticket },
    { id: "staff", label: "Staff & POS", icon: ShieldCheck },
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
        price: 50000,
        maxAvailable: 50,
        allowReentry: true,
      },
    ]);
  };

  const handleRemoveCategory = (index: number) => {
    setCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPos = () => {
    const id = `pos_${Date.now().toString().slice(-4)}`;
    setPuntosDeVenta((prev) => [
      ...prev,
      {
        id,
        name: `Punto de Venta ${prev.length + 1}`,
        type: "PROMOTOR_RRPP",
        operatorName: "Promotor Asignado",
        operatorPhone: "",
        accessPin: String(Math.floor(1000 + Math.random() * 9000)),
        commissionPercent: 10,
      },
    ]);
  };

  const handleRemovePos = (idx: number) => {
    setPuntosDeVenta((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCopyPosLink = (pos: PuntoDeVenta) => {
    const eventCode = initialEvent?.code || "EVENTO";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/eventos/${eventCode}?pos=${pos.id}`;
    navigator.clipboard.writeText(url);
    setCopiedPosId(pos.id);
    setTimeout(() => setCopiedPosId(null), 2000);
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

      const settingsObj = {
        commissionPerTicket: Number(commissionPerTicket) || 1200,
        posList: puntosDeVenta,
        artists: artists.filter((a) => a.name.trim()),
        staff: staffMembers.filter((s) => s.name.trim()),
        pin: pin.trim() || undefined,
        responsibleProducer: effectiveProducer,
      };

      const payload: any = {
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
        settings: JSON.stringify(settingsObj),
        commissionPerTicket: Number(commissionPerTicket) || 1200,
        posList: puntosDeVenta,
        createDefaultCategories: categories.length === 0,
        customCategories: categories.map((c) => ({
          name: c.name.trim(),
          code: c.code.trim().toUpperCase(),
          colorHex: c.colorHex,
          price: c.price || 0,
          maxAvailable: c.maxAvailable,
          allowReentry: c.allowReentry,
        })),
        artists: artists.filter((a) => a.name.trim()).map((a) => ({
          name: a.name.trim(),
          role: a.role.trim(),
          time: a.time.trim(),
        })),
        staff: staffMembers.filter((s) => s.name.trim()).map((s) => ({
          name: s.name.trim(),
          role: s.role.trim(),
          phone: s.phone.trim(),
        })),
      };

      if (isEditMode) {
        // ACTUALIZAR EVENTO EXISTENTE
        const res = await fetch(`/api/v1/accreditation/events/${initialEvent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload.name,
            description: payload.description,
            eventType: payload.eventType,
            organizerName: payload.organizerName,
            responsibleCompany: payload.responsibleCompany,
            locationName: payload.locationName,
            maxCapacity: payload.maxCapacity,
            startsAt: payload.startsAt,
            endsAt: payload.endsAt,
            bannerUrl: payload.bannerUrl,
            logoUrl: payload.logoUrl,
            settings: payload.settings,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Error al actualizar el evento");
        }

        if (onUpdated) {
          onUpdated(data.event || { ...initialEvent, ...payload, settings: payload.settings });
        } else if (onCreated) {
          onCreated(data.event);
        }
      } else {
        // CREAR NUEVO EVENTO
        const res = await fetch("/api/v1/accreditation/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Error al crear el evento");
        }

        if (onCreated) onCreated(data.event);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Error inesperado al guardar el evento");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-[#0F1E36] border border-[#263858] rounded-3xl shadow-2xl flex flex-col text-[#F8FAFC] overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-5 sm:p-6 pb-3 border-b border-[#263858] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>{isEditMode ? `Editar Evento: ${name || initialEvent.name}` : "Crear Nuevo Evento"}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEditMode
                ? "Configuración completa: producción, artistas, jornadas, comisiones Vidticket y puntos de venta"
                : "Configuración completa: producción, artistas, jornadas, entradas y accesos"}
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

        {/* Wizard Navigation Tabs */}
        <div className="px-5 sm:px-6 pt-3 pb-2 border-b border-[#263858] bg-[#0A1322] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                  isActive
                    ? "bg-purple-600 text-white shadow-md shadow-purple-950"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error notification */}
        {error && (
          <div className="m-5 mb-0 p-3 bg-red-950/70 border border-red-800 rounded-2xl text-red-200 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Wizard Step Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: INFO GENERAL */}
          {activeTab === "general" && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Seleccionar Productora / Organizador *
                </label>
                <Select
                  value={producer}
                  onChange={(e) => setProducer(e.target.value)}
                  options={[
                    { value: "Rumba Stage", label: "Rumba Stage (Organizador Principal)" },
                    { value: "Crocodilo Medicina", label: "Atlética Medicina Crocodilo" },
                    { value: "Live Sessions PY", label: "Live Sessions PY" },
                    { value: "OTHER", label: "+ Otra productora..." },
                  ]}
                  className="bg-[#0A1322] border-[#263858] text-white"
                />
              </div>

              {producer === "OTHER" && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Nombre de la Productora Personalizada *
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej: Velvet Entertainment"
                    value={customProducer}
                    onChange={(e) => setCustomProducer(e.target.value)}
                    className="bg-[#0A1322] border-[#263858] text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nombre del Evento *
                </label>
                <Input
                  type="text"
                  placeholder="Ej: TARDEZINHA DA CROCCO o Sábado DJ Live Sessions"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-[#0A1322] border-[#263858] text-white font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Describe tu Evento (Información pública y propuesta)
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe las atracciones, temática, barra libre, horarios y experiencia para los asistentes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A1322] border border-[#263858] text-white text-xs outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Categoría / Tipo de Evento
                  </label>
                  <Select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    options={[
                      { value: "FIESTA", label: "Fiesta / Boliche" },
                      { value: "CONCIERTO", label: "Concierto / Festival" },
                      { value: "GASTRONOMIA", label: "Gastronomía & Show" },
                      { value: "CONGRESO", label: "Congreso / Simposio" },
                      { value: "EMPRESARIAL", label: "Empresarial & Networking" },
                      { value: "GENERAL", label: "General" },
                    ]}
                    className="bg-[#0A1322] border-[#263858] text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Aforo / Capacidad Máxima (Personas)
                  </label>
                  <Input
                    type="number"
                    placeholder="500"
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
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  URL del Flyer / Banner Principal (Portada)
                </label>
                <Input
                  type="url"
                  placeholder="https://images.unsplash.com/... o enlace de tu imagen"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="bg-[#0A1322] border-[#263858] text-white text-xs font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Recomendado: 1200x600px en formato JPG, PNG o WEBP.
                </span>
              </div>

              {bannerUrl && (
                <div className="p-3 bg-[#0A1322] border border-[#263858] rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold text-purple-300 block">Vista Previa de Flyer:</span>
                  <div className="h-40 w-full rounded-xl overflow-hidden bg-black/60 border border-slate-700">
                    <img src={bannerUrl} alt="Flyer" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  URL del Logo o Insignia del Evento / Productora (Opcional)
                </label>
                <Input
                  type="url"
                  placeholder="https://ejemplo.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="bg-[#0A1322] border-[#263858] text-white text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* TAB 3: ARTISTAS */}
          {activeTab === "artists" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Line-up de Artistas & DJs</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Define la grilla de shows, horarios y roles musicales del evento
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

              <div className="space-y-3">
                {artists.map((art, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#0A1322] border border-[#263858] rounded-2xl flex flex-col sm:flex-row items-center gap-2.5"
                  >
                    <div className="flex-1 w-full sm:w-auto">
                      <Input
                        type="text"
                        placeholder="Nombre del Artista / DJ"
                        value={art.name}
                        onChange={(e) => {
                          const updated = [...artists];
                          updated[idx].name = e.target.value;
                          setArtists(updated);
                        }}
                        className="bg-[#0F1E36] border-[#263858] text-white text-xs font-bold"
                      />
                    </div>
                    <div className="w-full sm:w-44">
                      <Input
                        type="text"
                        placeholder="Rol (ej: Set Estelar)"
                        value={art.role}
                        onChange={(e) => {
                          const updated = [...artists];
                          updated[idx].role = e.target.value;
                          setArtists(updated);
                        }}
                        className="bg-[#0F1E36] border-[#263858] text-white text-xs"
                      />
                    </div>
                    <div className="w-full sm:w-36">
                      <Input
                        type="text"
                        placeholder="Horario (02:00 hs)"
                        value={art.time}
                        onChange={(e) => {
                          const updated = [...artists];
                          updated[idx].time = e.target.value;
                          setArtists(updated);
                        }}
                        className="bg-[#0F1E36] border-[#263858] text-white text-xs font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveArtist(idx)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Fecha y Hora de Inicio *
                  </label>
                  <Input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    required
                    className="bg-[#0A1322] border-[#263858] text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Fecha y Hora de Finalización
                  </label>
                  <Input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="bg-[#0A1322] border-[#263858] text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Ubicación / Lugar Físico
                </label>
                <Input
                  type="text"
                  placeholder="Ej: Rumba Stage — Mcal. Estigarribia 1001"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="bg-[#0A1322] border-[#263858] text-white"
                />
              </div>
            </div>
          )}

          {/* TAB 5: ENTRADAS & COMISIÓN VIDTICKET */}
          {activeTab === "tickets" && (
            <div className="space-y-4 animate-fade-in">
              {/* Sección Comisión Vidticket Editable */}
              <div className="p-4 rounded-2xl bg-[#0A1322] border border-purple-500/40 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Comisión Vidticket por Boleta
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Monto unitario en Guaraníes retenido automáticamente por la plataforma
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-purple-300">Gs.</span>
                    <Input
                      type="number"
                      value={commissionPerTicket}
                      onChange={(e) => setCommissionPerTicket(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-28 bg-[#0F1E36] border-purple-500/50 text-white font-mono font-bold text-xs"
                      placeholder="1200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <h3 className="text-base font-bold text-white">Lotes & Categorías de Entrada</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Precios, aforo por lote y margen neto para la productora
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
                  <span>Agregar Lote</span>
                </Button>
              </div>

              <div className="space-y-3">
                {categories.map((cat, idx) => {
                  const netRevenue = Math.max(0, (cat.price || 0) - commissionPerTicket);
                  return (
                    <div
                      key={idx}
                      className="p-3.5 bg-[#0A1322] border border-[#263858] rounded-2xl space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row items-center gap-2.5">
                        <div className="flex-1 w-full sm:w-auto">
                          <label className="text-[10px] text-slate-400 block mb-1">Nombre Lote / Nivel</label>
                          <Input
                            type="text"
                            placeholder="Nombre del Lote (VIP, General, etc.)"
                            value={cat.name}
                            onChange={(e) => {
                              const updated = [...categories];
                              updated[idx].name = e.target.value;
                              setCategories(updated);
                            }}
                            className="bg-[#0F1E36] border-[#263858] text-white text-xs font-bold"
                          />
                        </div>

                        <div className="w-full sm:w-36">
                          <label className="text-[10px] text-slate-400 block mb-1">Precio Venta (Gs)</label>
                          <Input
                            type="number"
                            placeholder="60000"
                            value={cat.price || ""}
                            onChange={(e) => {
                              const updated = [...categories];
                              updated[idx].price = parseInt(e.target.value, 10) || 0;
                              setCategories(updated);
                            }}
                            className="bg-[#0F1E36] border-[#263858] text-white text-xs font-mono font-bold"
                          />
                        </div>

                        <div className="w-full sm:w-28">
                          <label className="text-[10px] text-slate-400 block mb-1">Cupo Máx</label>
                          <Input
                            type="number"
                            placeholder="100"
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
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors sm:self-end"
                          title="Quitar categoría"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-[#1D2B44]">
                        <span>
                          Comisión Vidticket: <strong className="font-mono text-purple-300">Gs. {commissionPerTicket.toLocaleString("es-PY")}</strong>
                        </span>
                        <span>
                          Neto Productora: <strong className="font-mono text-emerald-400 font-bold">Gs. {netRevenue.toLocaleString("es-PY")}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: STAFF & PUNTOS DE VENTA (POS) */}
          {activeTab === "staff" && (
            <div className="space-y-4 animate-fade-in">
              {/* Sub-selector de Puntos de Venta vs Escaneo en Puertas */}
              <div className="flex items-center gap-2 p-1 bg-[#0A1322] border border-[#263858] rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setStaffSubTab("pos")}
                  className={cn(
                    "flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    staffSubTab === "pos"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-950"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Store className="w-4 h-4" />
                  <span>Puntos de Venta Separados ({puntosDeVenta.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStaffSubTab("gates")}
                  className={cn(
                    "flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    staffSubTab === "gates"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-950"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Control de Puertas & Escáner</span>
                </button>
              </div>

              {/* VISTA 1: PUNTOS DE VENTA SEPARADOS */}
              {staffSubTab === "pos" && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Puntos de Venta, Promotores & RRPP</h4>
                      <p className="text-[11px] text-slate-400">
                        Cada punto de venta tiene accesos, PIN y reportes individualizados
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddPos}
                      className="border-purple-600/40 text-purple-300 hover:text-white hover:bg-purple-950/60 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Agregar Punto de Venta</span>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {puntosDeVenta.map((pos, idx) => (
                      <div
                        key={pos.id || idx}
                        className="p-3.5 bg-[#0A1322] border border-[#263858] rounded-2xl space-y-3"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Nombre Punto de Venta</label>
                            <Input
                              type="text"
                              value={pos.name}
                              onChange={(e) => {
                                const updated = [...puntosDeVenta];
                                updated[idx].name = e.target.value;
                                setPuntosDeVenta(updated);
                              }}
                              placeholder="Ej: Boletería Central"
                              className="bg-[#0F1E36] border-[#263858] text-white text-xs font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Tipo de Canal</label>
                            <Select
                              value={pos.type}
                              onChange={(e) => {
                                const updated = [...puntosDeVenta];
                                updated[idx].type = e.target.value as any;
                                setPuntosDeVenta(updated);
                              }}
                              options={[
                                { value: "BOLETERIA_FIJA", label: "Boletería Fija / Taquilla" },
                                { value: "PROMOTOR_RRPP", label: "Promotor / RRPP Móvil" },
                                { value: "CAJA_PUERTA", label: "Caja en Puerta" },
                              ]}
                              className="bg-[#0F1E36] border-[#263858] text-white text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Responsable / Operador</label>
                            <Input
                              type="text"
                              value={pos.operatorName}
                              onChange={(e) => {
                                const updated = [...puntosDeVenta];
                                updated[idx].operatorName = e.target.value;
                                setPuntosDeVenta(updated);
                              }}
                              placeholder="Ej: Juan Pérez"
                              className="bg-[#0F1E36] border-[#263858] text-white text-xs"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1D2B44] text-xs">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <Key className="w-3.5 h-3.5 text-purple-400" />
                              <span className="text-[11px] text-slate-400">PIN:</span>
                              <input
                                type="text"
                                maxLength={6}
                                value={pos.accessPin}
                                onChange={(e) => {
                                  const updated = [...puntosDeVenta];
                                  updated[idx].accessPin = e.target.value;
                                  setPuntosDeVenta(updated);
                                }}
                                className="w-16 px-1.5 py-0.5 rounded bg-black/60 border border-slate-700 text-white font-mono text-center text-xs"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyPosLink(pos)}
                              className="px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              {copiedPosId === pos.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>¡Enlace Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar Enlace POS</span>
                                </>
                              )}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemovePos(idx)}
                            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                            title="Eliminar punto de venta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VISTA 2: CONTROL DE PUERTAS & ESCÁNER */}
              {staffSubTab === "gates" && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      PIN de Acceso Rápido para Escáner en Puertas
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
                      Permite a los guardias en puerta acceder a la cámara lectora sin contraseñas.
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Guardias & Operadores Asignados:</span>
                      <button
                        type="button"
                        onClick={handleAddStaff}
                        className="text-xs text-purple-400 hover:text-purple-300 font-bold"
                      >
                        + Agregar Guardia
                      </button>
                    </div>
                    {staffMembers.map((st, idx) => (
                      <div key={idx} className="p-3 bg-[#0A1322] border border-[#263858] rounded-xl flex items-center gap-3">
                        <Input
                          type="text"
                          placeholder="Nombre del Guardia / Operador"
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
                          placeholder="Punto (ej: Puerta Principal)"
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
                    <span>{isEditMode ? "Guardar Cambios del Evento" : "Crear Evento Oficial"}</span>
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
