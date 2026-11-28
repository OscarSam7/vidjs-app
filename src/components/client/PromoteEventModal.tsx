"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  AlertCircle,
  Loader2,
  Megaphone,
  Check,
  Music,
  Mic2,
  Flame,
  Utensils,
  Ticket,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
} from "lucide-react";

interface PromoteEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOrganizerName?: string;
  defaultOrganizerEmail?: string;
  defaultOrganizerPhone?: string;
}

const PROMO_PLANS = [
  {
    code: "STANDARD" as const,
    name: "Cartelera Estándar",
    priceLabel: "Gs. 150.000",
    badge: "7 días",
    desc: "Publicación en cartelera de eventos y búsquedas por categoría.",
  },
  {
    code: "CAROUSEL_7D" as const,
    name: "Carrusel Portada VIP",
    priceLabel: "Gs. 350.000",
    badge: "MÁS POPULAR • 7 días",
    popular: true,
    desc: "Aparece destacado en el Carrusel Principal de la Super App CYNKO.",
  },
  {
    code: "FULL_PROMO_15D" as const,
    name: "Full Promo Festival",
    priceLabel: "Gs. 650.000",
    badge: "15 días + Taquilla QR",
    desc: "Carrusel Principal prioritario 15 días + venta de entradas QR Cynko Pass.",
  },
];

const EVENT_CATEGORIES = [
  { id: "FIESTA", label: "Fiesta / Discoteca", icon: Flame, accent: "from-fuchsia-600 to-amber-500" },
  { id: "CONCIERTO", label: "Concierto / Show", icon: Music, accent: "from-purple-600 to-indigo-500" },
  { id: "FESTIVAL", label: "Festival", icon: Sparkles, accent: "from-amber-500 to-orange-500" },
  { id: "KARAOKE", label: "Karaoke / Concurso", icon: Mic2, accent: "from-pink-600 to-purple-600" },
  { id: "FERIA", label: "Feria / Gastronomía", icon: Utensils, accent: "from-emerald-600 to-teal-500" },
  { id: "OTRO", label: "Otro Evento", icon: Ticket, accent: "from-cyan-600 to-blue-600" },
];

const QUICK_TIMES = ["18:00", "20:00", "21:00", "22:00", "23:00", "00:00"];
const WEEKDAYS_SHORT = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getNextWeekday(targetDay: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const diff = (targetDay - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export function PromoteEventModal({
  isOpen,
  onClose,
  defaultOrganizerName = "",
  defaultOrganizerEmail = "",
  defaultOrganizerPhone = "",
}: PromoteEventModalProps) {
  const todayKey = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return toDateKey(t);
  }, []);

  const defaultDateKey = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return toDateKey(t);
  }, []);

  const [planCode, setPlanCode] = useState<"STANDARD" | "CAROUSEL_7D" | "FULL_PROMO_15D">("CAROUSEL_7D");
  const [organizerName, setOrganizerName] = useState(defaultOrganizerName);
  const [organizerPhone, setOrganizerPhone] = useState(defaultOrganizerPhone);
  const [organizerEmail, setOrganizerEmail] = useState(defaultOrganizerEmail);
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("FIESTA");

  // Modern Date & Time Picker state
  const [selectedDateKey, setSelectedDateKey] = useState(defaultDateKey);
  const [selectedHour, setSelectedHour] = useState(22);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [locationName, setLocationName] = useState("");
  const [city, setCity] = useState("Asunción");
  const [ticketPriceLabel, setTicketPriceLabel] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"TRANSFER" | "QR_PAGOS" | "PIX">("TRANSFER");
  const [paymentReference, setPaymentReference] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInfo, setCreatedInfo] = useState<{
    id: string;
    eventName: string;
    planName: string;
    amountGs: number;
  } | null>(null);

  const quickDateOptions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextFri = getNextWeekday(5);
    const nextSat = getNextWeekday(6);

    const list = [
      { label: "Hoy", key: toDateKey(today), sub: `${today.getDate()}/${today.getMonth() + 1}` },
      { label: "Mañana", key: toDateKey(tomorrow), sub: `${tomorrow.getDate()}/${tomorrow.getMonth() + 1}` },
      { label: "Viernes", key: toDateKey(nextFri), sub: `${nextFri.getDate()}/${nextFri.getMonth() + 1}` },
      { label: "Sábado", key: toDateKey(nextSat), sub: `${nextSat.getDate()}/${nextSat.getMonth() + 1}` },
    ];
    // Deduplicate by date key
    const seen = new Set<string>();
    return list.filter((item) => {
      if (seen.has(item.key)) return false;
      seen.add(item.key);
      return true;
    });
  }, []);

  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Monday = 0 ... Sunday = 6
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells: Array<{ key: string; day: number; disabled: boolean } | null> = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const key = toDateKey(dateObj);
      cells.push({ key, day: d, disabled: key < todayKey });
    }
    return cells;
  }, [calendarMonth, todayKey]);

  const formattedEventDate = useMemo(() => {
    const [y, m, d] = selectedDateKey.split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1, selectedHour, selectedMinute);
    const datePart = dt.toLocaleDateString("es-PY", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const hh = String(selectedHour).padStart(2, "0");
    const mm = String(selectedMinute).padStart(2, "0");
    return `${datePart} · ${hh}:${mm} hs`;
  }, [selectedDateKey, selectedHour, selectedMinute]);

  if (!isOpen) return null;

  const selectedPlan = PROMO_PLANS.find((p) => p.code === planCode) || PROMO_PLANS[1];
  const composedIsoDate = `${selectedDateKey}T${String(selectedHour).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`;

  const shiftMonth = (delta: number) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const adjustHour = (delta: number) => {
    setSelectedHour((prev) => (prev + delta + 24) % 24);
  };

  const adjustMinute = (delta: number) => {
    setSelectedMinute((prev) => (prev + delta + 60) % 60);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/client/promote-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizerName,
          organizerPhone,
          organizerEmail,
          eventName,
          eventType,
          eventDate: composedIsoDate,
          locationName,
          city,
          ticketPriceLabel,
          bannerUrl,
          description,
          planCode,
          paymentMethod,
          paymentReference,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "No se pudo registrar tu solicitud.");
        return;
      }
      setCreatedInfo(json.submission);
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-zinc-950 border border-amber-400/40 shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-fuchsia-500 to-purple-600" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-fuchsia-600 flex items-center justify-center text-white shrink-0 shadow-lg">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                Lanza tu Evento en el Carrusel CYNKO
              </h3>
              <p className="text-[11px] text-zinc-400 truncate">
                Promociona tu fiesta, concierto o festival frente a miles de usuarios activos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[82vh] overflow-y-auto">
          {createdInfo ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-white">¡Solicitud de Publicación Recibida!</h4>
                <p className="text-xs text-zinc-300 max-w-md mx-auto">
                  Tu evento <strong className="text-amber-300">{createdInfo.eventName}</strong> con el plan{" "}
                  <strong>{createdInfo.planName}</strong> fue registrado correctamente. Verificaremos tu pago y lo activaremos en el Carrusel Principal a la brevedad.
                </p>
              </div>
              <div className="inline-block px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
                Código de seguimiento: <strong className="text-amber-300">{createdInfo.id.slice(-8).toUpperCase()}</strong>
              </div>
              <div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 1. Selector de Plan Pago */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>1. Elige tu Plan de Publicación</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PROMO_PLANS.map((plan) => {
                    const active = planCode === plan.code;
                    return (
                      <button
                        key={plan.code}
                        type="button"
                        onClick={() => setPlanCode(plan.code)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          active
                            ? "bg-purple-950/50 border-amber-400 ring-1 ring-amber-400/50 shadow-lg"
                            : "bg-zinc-900/70 border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                              {plan.badge}
                            </span>
                            {active && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          </div>
                          <div className="text-xs font-black text-white">{plan.name}</div>
                          <div className="text-sm font-black text-amber-300 font-mono">{plan.priceLabel}</div>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-snug">{plan.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Datos del Evento */}
              <div className="space-y-4 pt-3 border-t border-zinc-800">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1.5">Nombre del Evento *</label>
                  <input
                    type="text"
                    required
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Ej: Sunset Rooftop Electronic Party"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Categoría Moderna en Tarjetas Interactivas (sin select nativo) */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-zinc-300">Categoría del Evento</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {EVENT_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const active = eventType === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setEventType(cat.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                            active
                              ? "bg-purple-950/60 border-amber-400 ring-1 ring-amber-400/40 shadow-md"
                              : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700"
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              active
                                ? `bg-gradient-to-tr ${cat.accent} text-white shadow`
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className={`text-[11px] font-bold leading-tight ${active ? "text-white" : "text-zinc-300"}`}>
                            {cat.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selector Moderno de Fecha y Hora */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/75 border border-zinc-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Fecha y Hora *</span>
                    </label>
                    <span className="px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-[11px] font-black text-amber-300 capitalize">
                      {formattedEventDate}
                    </span>
                  </div>

                  {/* Accesos Rápidos de Fecha + Botón Calendario */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {quickDateOptions.map((opt) => {
                      const active = selectedDateKey === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            setSelectedDateKey(opt.key);
                            setShowCalendar(false);
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            active
                              ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 border-purple-400 text-white shadow"
                              : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                          }`}
                        >
                          <span>{opt.label}</span>
                          <span className={`text-[10px] font-mono ${active ? "text-white/80" : "text-zinc-500"}`}>
                            {opt.sub}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setShowCalendar((v) => !v)}
                      className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        showCalendar
                          ? "bg-amber-400/20 border-amber-400 text-amber-300"
                          : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-amber-400/50"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{showCalendar ? "Ocultar calendario" : "Elegir otra fecha"}</span>
                    </button>
                  </div>

                  {/* Mini Calendario Mensual Interactivo */}
                  {showCalendar && (
                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => shiftMonth(-1)}
                          aria-label="Mes anterior"
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-black text-white">
                          {MONTHS_ES[calendarMonth.month]} {calendarMonth.year}
                        </span>
                        <button
                          type="button"
                          onClick={() => shiftMonth(1)}
                          aria-label="Mes siguiente"
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center">
                        {WEEKDAYS_SHORT.map((wd) => (
                          <div key={wd} className="text-[10px] font-bold text-zinc-500 py-1">
                            {wd}
                          </div>
                        ))}
                        {calendarDays.map((cell, i) =>
                          cell ? (
                            <button
                              key={cell.key}
                              type="button"
                              disabled={cell.disabled}
                              onClick={() => {
                                setSelectedDateKey(cell.key);
                                setShowCalendar(false);
                              }}
                              className={`h-8 rounded-lg text-xs font-bold transition-all ${
                                cell.disabled
                                  ? "text-zinc-700 cursor-not-allowed"
                                  : cell.key === selectedDateKey
                                  ? "bg-gradient-to-tr from-amber-500 to-fuchsia-600 text-white shadow cursor-pointer"
                                  : "text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                              }`}
                            >
                              {cell.day}
                            </button>
                          ) : (
                            <div key={`empty-${i}`} />
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Selector de Hora Moderno: Píldoras + Ajuste Fino */}
                  <div className="pt-2 border-t border-zinc-800/80 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span>Horario de inicio</span>
                      </span>
                      {/* Ajuste fino Hora : Minutos */}
                      <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-800">
                        <button
                          type="button"
                          onClick={() => adjustHour(-1)}
                          aria-label="Restar hora"
                          className="w-6 h-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-mono font-black text-white">
                          {String(selectedHour).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustHour(1)}
                          aria-label="Sumar hora"
                          className="w-6 h-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>

                        <span className="text-xs font-black text-amber-400 px-0.5">:</span>

                        <button
                          type="button"
                          onClick={() => adjustMinute(-15)}
                          aria-label="Restar 15 minutos"
                          className="w-6 h-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-mono font-black text-white">
                          {String(selectedMinute).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustMinute(15)}
                          aria-label="Sumar 15 minutos"
                          className="w-6 h-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {QUICK_TIMES.map((t) => {
                        const [h, m] = t.split(":").map(Number);
                        const active = selectedHour === h && selectedMinute === m;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setSelectedHour(h);
                              setSelectedMinute(m);
                            }}
                            className={`py-1.5 rounded-xl border text-[11px] font-mono font-black transition-all cursor-pointer ${
                              active
                                ? "bg-amber-400 text-black border-amber-300 shadow"
                                : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Ubicación y Detalles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      Lugar / Local *
                    </label>
                    <input
                      type="text"
                      required
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="Ej: Terraza Costanera"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">Ciudad</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ej: Asunción"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">Precio Entrada (Opcional)</label>
                    <input
                      type="text"
                      value={ticketPriceLabel}
                      onChange={(e) => setTicketPriceLabel(e.target.value)}
                      placeholder="Ej: Desde Gs. 50.000 o Entrada Libre"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">URL del Flyer / Banner (Opcional)</label>
                    <input
                      type="url"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">Descripción breve</label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Line-up, DJs invitados, promociones o detalles del evento..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Datos de Contacto y Pago */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1">Organizador / Productora *</label>
                  <input
                    type="text"
                    required
                    value={organizerName}
                    onChange={(e) => setOrganizerName(e.target.value)}
                    placeholder="Tu nombre o productora"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1">WhatsApp de contacto *</label>
                  <input
                    type="tel"
                    required
                    value={organizerPhone}
                    onChange={(e) => setOrganizerPhone(e.target.value)}
                    placeholder="+595 981 000 000"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1">Correo (Opcional)</label>
                  <input
                    type="email"
                    value={organizerEmail}
                    onChange={(e) => setOrganizerEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Caja de Pago */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-amber-500/30 space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-black text-amber-300 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    <span>Pago de Publicación ({selectedPlan.priceLabel})</span>
                  </span>
                  <div className="flex gap-1">
                    {(["TRANSFER", "QR_PAGOS", "PIX"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer border ${
                          paymentMethod === m
                            ? "bg-purple-600 text-white border-purple-400"
                            : "bg-zinc-950 text-zinc-400 border-zinc-800"
                        }`}
                      >
                        {m === "TRANSFER" ? "Transferencia" : m === "QR_PAGOS" ? "QR SIPAP" : "PIX"}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Realiza el pago a <strong className="text-white font-mono">pagos@cynko.app</strong> (Alias SIPAP / PIX) por{" "}
                  <strong className="text-amber-300">{selectedPlan.priceLabel}</strong> e ingresa el número de comprobante abajo para activar tu evento en el Carrusel.
                </p>
                <input
                  type="text"
                  required
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="N° de comprobante / referencia de transferencia *"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-fuchsia-600 hover:from-amber-400 hover:to-fuchsia-500 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{submitting ? "Enviando..." : `Solicitar Publicación (${selectedPlan.priceLabel})`}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
