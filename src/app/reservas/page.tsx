"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Calendar,
  Clock,
  Users,
  PartyPopper,
  Tv,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  UploadCloud,
  X,
  Eye,
  Copy,
  Check,
  MessageSquare,
  Share2,
  ShieldCheck,
  Gift,
  ArrowRight,
  Loader2,
  CreditCard,
  Building,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface Decoration {
  id: string;
  name: string;
  description?: string | null;
  imageUrl: string;
  extraPriceCents: number;
}

interface PackageItem {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  itemsIncluded: string[];
  pricingType: "CLEAN_FEE" | "CREDIT_CONSUMPTION" | "FIXED_COMBO";
  priceCents: number;
  creditAmountCents: number;
  maxGuests: number;
  isBirthdayPackage: boolean;
  allowScreenShoutout: boolean;
  colorHex: string;
  decorations: Decoration[];
}

interface VenueInfo {
  id: string;
  name: string;
  tenantName: string;
  tenantSlug: string;
  logoUrl?: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  bankTaxId: string | null;
  bankAlias: string | null;
  whatsappNumber: string | null;
  tables: Array<{ id: string; number: number; label: string; capacity: number; zone: string }>;
}

function ReservasClientContent() {
  const searchParams = useSearchParams();
  const venueParam = searchParams.get("venue");

  // Data Loading
  const [isLoading, setIsLoading] = useState(true);
  const [venue, setVenue] = useState<VenueInfo | null>(null);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [activeEvent, setActiveEvent] = useState<any>(null);

  // Booking Flow Steps: 1: Package & Date, 2: Decoration & Addons, 3: Customer Details, 4: Payment & Confirmation
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 12);
    return d.toISOString().split("T")[0];
  });
  const [occasion, setOccasion] = useState<string>("CUMPLEAÑOS");
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedDecorationId, setSelectedDecorationId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Customer Details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerDoc, setCustomerDoc] = useState("");
  const [birthdayPersonName, setBirthdayPersonName] = useState("");
  const [birthdayPhotoUrl, setBirthdayPhotoUrl] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<"TRANSFER" | "CASH_DOOR" | "WHATSAPP">("TRANSFER");
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Upload States
  const [isUploadingBirthdayPhoto, setIsUploadingBirthdayPhoto] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lightbox Modal for Decoration Photos
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  // Created Reservation State (Success Screen)
  const [confirmedReservation, setConfirmedReservation] = useState<any>(null);

  // Format currency
  const formatMoney = (cents: number) => {
    return `Gs. ${(cents || 0).toLocaleString("es-PY")}`;
  };

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Fetch Public Data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const url = venueParam
          ? `/api/v1/reservations/public?venue=${encodeURIComponent(venueParam)}`
          : `/api/v1/reservations/public`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          setVenue(data.venue);
          setPackages(data.packages || []);
          setActiveEvent(data.activeEvent);

          // Auto-select first birthday package or first package
          if (data.packages?.length > 0) {
            const bday = data.packages.find((p: PackageItem) => p.isBirthdayPackage) || data.packages[0];
            setSelectedPackageId(bday.id);
            if (bday.decorations?.length > 0) {
              setSelectedDecorationId(bday.decorations[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching reservation options:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [venueParam]);

  // Selected Package Object
  const selectedPackage = useMemo(() => {
    return packages.find((p) => p.id === selectedPackageId) || null;
  }, [packages, selectedPackageId]);

  // Selected Decoration Object
  const selectedDecoration = useMemo(() => {
    if (!selectedPackage || !selectedDecorationId) return null;
    return selectedPackage.decorations.find((d) => d.id === selectedDecorationId) || null;
  }, [selectedPackage, selectedDecorationId]);

  // Calculate Total
  const totalAmount = useMemo(() => {
    let base = selectedPackage ? selectedPackage.priceCents : 0;
    if (selectedDecoration && selectedDecoration.extraPriceCents > 0) {
      base += selectedDecoration.extraPriceCents;
    }
    return base;
  }, [selectedPackage, selectedDecoration]);

  // File Upload Handlers
  const handleUploadFile = async (
    file: File,
    type: "birthday_photo" | "payment_proof"
  ): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    try {
      const res = await fetch("/api/v1/reservations/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.url) {
        return json.data.url;
      } else {
        alert(json.error?.message || "Error al subir la imagen");
        return null;
      }
    } catch (err: any) {
      alert("Error al subir archivo: " + (err.message || ""));
      return null;
    }
  };

  const onBirthdayPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBirthdayPhoto(true);
    try {
      const url = await handleUploadFile(file, "birthday_photo");
      if (url) setBirthdayPhotoUrl(url);
    } finally {
      setIsUploadingBirthdayPhoto(false);
    }
  };

  const onProofFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingProof(true);
    try {
      const url = await handleUploadFile(file, "payment_proof");
      if (url) setPaymentProofUrl(url);
    } finally {
      setIsUploadingProof(false);
    }
  };

  // Submit Reservation
  const handleSubmitReservation = async () => {
    if (!venue) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      alert("Por favor completa tu Nombre y WhatsApp");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        venueId: venue.id,
        tableId: selectedTableId || undefined,
        packageId: selectedPackageId || undefined,
        decorationId: selectedDecorationId || undefined,
        reservationDate: selectedDate,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerDoc: customerDoc.trim() || undefined,
        birthdayPersonName: birthdayPersonName.trim() || undefined,
        birthdayPhotoUrl: birthdayPhotoUrl || undefined,
        specialNotes: specialNotes.trim() || undefined,
        paymentMethod,
        paymentProofUrl: paymentProofUrl || undefined,
      };

      const res = await fetch("/api/v1/reservations/public/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setConfirmedReservation(json.reservation);
      } else {
        alert(json.error?.message || "No se pudo registrar la reserva");
      }
    } catch (err: any) {
      alert("Error al procesar la reserva: " + (err.message || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pre-filled WhatsApp message for support or sharing
  const getWhatsAppShareUrl = (res: any) => {
    const text = encodeURIComponent(
      `🎉 ¡Estás invitado/a a mi mesa VIP en ${venue?.name || "Vidjeis"}!\n` +
        `📅 Fecha: ${new Date(res.reservationDate).toLocaleDateString("es-PY")}\n` +
        `🍾 Paquete: ${res.package?.name || "VIP"}\n` +
        `🎟️ Obtén tu pase de acceso sin fila aquí: ${window.location.origin}/r/${res.inviteToken}`
    );
    return `https://wa.me/?text=${text}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060D17] text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
        <p className="text-sm text-slate-400 font-medium">Cargando opciones de reserva & paquetes VIP...</p>
      </div>
    );
  }

  // SUCCESS CONFIRMATION SCREEN
  if (confirmedReservation) {
    return (
      <div className="min-h-screen bg-[#060D17] text-white flex flex-col items-center justify-center p-4 py-12">
        <div className="max-w-md w-full bg-[#0F1E36] border border-[#263858] rounded-3xl p-6 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400">
              {venue?.tenantName || "VIDJEIS VIP"} &bull; {venue?.name}
            </span>
            <h1 className="text-2xl font-black text-white mt-1">¡Reserva Registrada!</h1>
            <p className="text-xs text-slate-400 mt-1">
              Tu mesa está reservada. Hemos generado tus pases de acceso exclusivos.
            </p>
          </div>

          {/* Ticket Card */}
          <div className="bg-[#0A1322] border border-[#263858] rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-[#263858] pb-2.5">
              <div>
                <span className="text-[10px] text-slate-400 block">Titular de la Reserva</span>
                <span className="text-xs font-bold text-white">{confirmedReservation.customerName}</span>
              </div>
              <Badge
                variant={confirmedReservation.paymentStatus === "APPROVED" ? "success" : "warning"}
                className="text-[10px] uppercase"
              >
                {confirmedReservation.paymentStatus === "APPROVED"
                  ? "Pago Aprobado"
                  : confirmedReservation.paymentStatus === "PENDING_REVIEW"
                  ? "Comprobante en Revisión"
                  : "Pendiente de Pago"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Fecha del Evento</span>
                <span className="font-bold text-slate-200">
                  {new Date(confirmedReservation.reservationDate).toLocaleDateString("es-PY", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Mesa / Ubicación</span>
                <span className="font-bold text-purple-300">
                  Mesa #{confirmedReservation.table?.number} ({confirmedReservation.table?.label})
                </span>
              </div>
            </div>

            {/* Package & Chosen Decoration with Photo */}
            <div className="bg-[#14233C] border border-[#263858] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{confirmedReservation.package?.name || "VIP"}</span>
                <span className="text-xs font-black text-emerald-400">
                  {formatMoney(confirmedReservation.totalAmountCents)}
                </span>
              </div>

              {confirmedReservation.decoration && (
                <div className="flex items-center gap-2.5 pt-2 border-t border-[#263858]">
                  <img
                    src={confirmedReservation.decoration.imageUrl}
                    alt={confirmedReservation.decoration.name}
                    className="w-12 h-10 object-cover rounded-md border border-pink-700/50"
                  />
                  <div>
                    <span className="text-[10px] text-pink-400 font-bold block">Decoración Seleccionada:</span>
                    <span className="text-xs text-white font-medium">{confirmedReservation.decoration.name}</span>
                  </div>
                </div>
              )}

              {confirmedReservation.birthdayPersonName && (
                <div className="text-[11px] text-purple-300 pt-1 flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <span>Homenajeado/a: {confirmedReservation.birthdayPersonName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <a
              href={getWhatsAppShareUrl(confirmedReservation)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs p-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/30"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir Pases con Amigos por WhatsApp</span>
            </a>

            {venue?.whatsappNumber && (
              <a
                href={`https://wa.me/${venue.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                  `Hola, acabo de registrar la reserva para ${confirmedReservation.customerName} (Fecha: ${new Date(
                    confirmedReservation.reservationDate
                  ).toLocaleDateString("es-PY")}).`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#14233C] hover:bg-[#1E355B] border border-[#263858] text-slate-200 text-xs p-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Contactar al Encargado VIP</span>
              </a>
            )}

            <button
              onClick={() => {
                setConfirmedReservation(null);
                setStep(1);
              }}
              className="text-xs text-slate-400 hover:text-white pt-2 block mx-auto"
            >
              Realizar otra reserva
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060D17] text-white">
      {/* Header Banner */}
      <header className="bg-[#0A1322] border-b border-[#263858] sticky top-0 z-30 px-4 py-3 shadow-md backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {venue?.logoUrl ? (
              <img src={venue.logoUrl} alt={venue.name} className="w-9 h-9 rounded-xl object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center font-black text-sm">
                VIP
              </div>
            )}
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block">
                {venue?.tenantName || "SISTEMA DE RESERVAS"}
              </span>
              <h1 className="text-sm font-black text-white">{venue?.name || "Reserva de Mesas & Camarotes"}</h1>
            </div>
          </div>

          {venue?.whatsappNumber && (
            <a
              href={`https://wa.me/${venue.whatsappNumber.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors font-bold"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Concierge VIP</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto p-4 py-6 space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between bg-[#0A1322] border border-[#263858] p-2.5 rounded-2xl">
          {[
            { num: 1, label: "Paquete & Fecha" },
            { num: 2, label: "Decoración con Foto" },
            { num: 3, label: "Tus Datos" },
            { num: 4, label: "Pago & Confirmación" },
          ].map((s) => (
            <div
              key={s.num}
              onClick={() => {
                if (step > s.num) setStep(s.num as any);
              }}
              className={`flex-1 text-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                step === s.num
                  ? "bg-purple-600 text-white font-bold shadow"
                  : step > s.num
                  ? "text-emerald-400 font-semibold"
                  : "text-slate-500"
              }`}
            >
              <div className="text-[10px] sm:text-xs flex items-center justify-center gap-1">
                <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">
                  {step > s.num ? "✓" : s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* STEP 1: FECHA, OCASIÓN & SELECCIÓN DE PAQUETE */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Occasion & Date Selector */}
            <div className="bg-[#0F1E36] border border-[#263858] p-4 sm:p-5 rounded-2xl space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>¿Para qué fecha y ocasión reservas?</span>
              </h2>

              {/* Occasion Pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "CUMPLEAÑOS", label: "🎂 Cumpleaños", desc: "Champagne, torta y foto en TV" },
                  { id: "VIP_NIGHT", label: "🍾 Noche VIP / Pista", desc: "Camarotes con vista al escenario" },
                  { id: "AFTER_OFFICE", label: "🍻 After Office / Amigos", desc: "Mesas cómodas y combos" },
                  { id: "DESPEDIDA", label: "🎉 Despedida / Festejo", desc: "Atención personalizada" },
                ].map((occ) => (
                  <button
                    key={occ.id}
                    type="button"
                    onClick={() => {
                      setOccasion(occ.id);
                      // If user selects Cumpleaños, prioritize birthday package
                      if (occ.id === "CUMPLEAÑOS") {
                        const bdayPkg = packages.find((p) => p.isBirthdayPackage);
                        if (bdayPkg) setSelectedPackageId(bdayPkg.id);
                      }
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      occasion === occ.id
                        ? "bg-pink-950/60 border-pink-500 text-pink-200 shadow-md shadow-pink-500/20"
                        : "bg-[#0A1322] border-[#263858] text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <span>{occ.label}</span>
                  </button>
                ))}
              </div>

              {/* Date Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#263858]">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Fecha de la Reserva</label>
                  <Input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-[#0A1322] border-[#263858] text-white text-xs"
                  />
                </div>
                {activeEvent && (
                  <div className="bg-[#0A1322] border border-purple-900/40 p-2.5 rounded-xl flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                    <div className="text-[11px] text-slate-300">
                      <span className="text-purple-300 font-bold block truncate">Evento Activo: {activeEvent.name}</span>
                      <span className="text-[10px] text-slate-400">Código de pantalla: #{activeEvent.code}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Packages Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-pink-400" />
                    <span>Selecciona tu Paquete o Camarote</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Opciones con consumo acreditable, combos con botellas o alquiler limpio.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map((pkg) => {
                  const isSelected = selectedPackageId === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => {
                        setSelectedPackageId(pkg.id);
                        if (pkg.decorations && pkg.decorations.length > 0) {
                          setSelectedDecorationId(pkg.decorations[0].id);
                        } else {
                          setSelectedDecorationId(null);
                        }
                      }}
                      className={`relative bg-[#0F1E36] border rounded-2xl overflow-hidden cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-pink-500 ring-2 ring-pink-500/30 shadow-xl shadow-pink-500/10"
                          : "border-[#263858] hover:border-slate-500"
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="p-4 pb-2 flex items-start justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {pkg.isBirthdayPackage && (
                            <span className="bg-pink-950/80 border border-pink-500 text-pink-200 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                              🎂 Especial Cumpleaños
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              pkg.pricingType === "CREDIT_CONSUMPTION"
                                ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300"
                                : pkg.pricingType === "CLEAN_FEE"
                                ? "bg-blue-950/80 border-blue-500/60 text-blue-300"
                                : "bg-purple-950/80 border-purple-500/60 text-purple-300"
                            }`}
                          >
                            {pkg.pricingType === "CREDIT_CONSUMPTION"
                              ? "100% Saldo a Favor en Barra"
                              : pkg.pricingType === "CLEAN_FEE"
                              ? "Reserva Limpia (Alquiler VIP)"
                              : "Combo Cerrado (Bebidas Incluidas)"}
                          </span>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected ? "bg-pink-500 border-pink-400 text-white" : "border-slate-600 bg-black/40"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      {/* Header Info */}
                      <div className="px-4 py-2 space-y-1">
                        <h3 className="text-base font-black text-white">{pkg.name}</h3>
                        {pkg.description && (
                          <p className="text-xs text-slate-400 line-clamp-2">{pkg.description}</p>
                        )}
                      </div>

                      {/* Financial Card */}
                      <div className="mx-4 my-2 p-3 bg-[#0A1322] border border-[#263858] rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total a Pagar</span>
                          <span className="text-lg font-black text-white">{formatMoney(pkg.priceCents)}</span>
                          {pkg.pricingType === "CREDIT_CONSUMPTION" && (
                            <span className="text-[10px] font-bold text-emerald-400 block">
                              Recibes {formatMoney(pkg.creditAmountCents)} de saldo en mesa
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Capacidad</span>
                          <span className="text-xs font-bold text-purple-300 flex items-center justify-end gap-1">
                            <Users className="w-3.5 h-3.5" />
                            Hasta {pkg.maxGuests} pers.
                          </span>
                        </div>
                      </div>

                      {/* Perks included */}
                      {pkg.itemsIncluded.length > 0 && (
                        <div className="px-4 py-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Incluye:
                          </span>
                          <div className="space-y-1">
                            {pkg.itemsIncluded.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="text-xs text-slate-300 flex items-center gap-1.5">
                                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span className="truncate">{item}</span>
                              </div>
                            ))}
                            {pkg.itemsIncluded.length > 3 && (
                              <span className="text-[10px] text-purple-300 font-bold block">
                                + {pkg.itemsIncluded.length - 3} beneficios más incluidos
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Decorations preview count */}
                      <div className="p-3 bg-[#0A1322] border-t border-[#263858] flex items-center justify-between text-xs">
                        <span className="text-[11px] text-pink-300 font-bold flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                          <span>{pkg.decorations?.length || 0} estilos de decoración con fotos</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                          <span>Elegir estilo</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Button */}
            <div className="flex justify-end pt-4">
              <Button
                type="button"
                variant="primary"
                onClick={() => setStep(2)}
                disabled={!selectedPackageId}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/30"
              >
                <span>Continuar a Decoración & Fotos</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: SELECTOR VISUAL DE DECORACIONES CON FOTOS */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-[#0F1E36] border border-[#263858] p-5 rounded-2xl space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-pink-400 tracking-wider block">
                  Paso 2 &bull; Personalización Visual
                </span>
                <h2 className="text-xl font-black text-white flex items-center gap-2 mt-1">
                  <PartyPopper className="w-6 h-6 text-pink-400" />
                  <span>Elige la Decoración para tu Mesa / Camarote</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Haz clic en la temática que más te guste para que nuestro equipo prepare la ambientación ideal antes de tu llegada.
                </p>
              </div>

              {selectedPackage?.decorations && selectedPackage.decorations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                  {selectedPackage.decorations.map((deco) => {
                    const isSelected = selectedDecorationId === deco.id;
                    return (
                      <div
                        key={deco.id}
                        onClick={() => setSelectedDecorationId(deco.id)}
                        className={`group relative bg-[#0A1322] border rounded-2xl overflow-hidden cursor-pointer transition-all flex flex-col justify-between shadow-md ${
                          isSelected
                            ? "border-pink-500 ring-2 ring-pink-500/40 shadow-xl shadow-pink-500/20"
                            : "border-[#263858] hover:border-slate-500"
                        }`}
                      >
                        {/* Image Container with Zoom Button */}
                        <div className="relative h-44 w-full overflow-hidden bg-black/40">
                          <img
                            src={deco.imageUrl}
                            alt={deco.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1322] via-transparent to-black/40" />

                          {/* Zoom Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPhoto({ url: deco.imageUrl, title: deco.name });
                            }}
                            className="absolute top-2.5 left-2.5 bg-black/70 hover:bg-black text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-md flex items-center gap-1 transition-all"
                            title="Ver foto en tamaño completo"
                          >
                            <Eye className="w-3 h-3 text-pink-400" />
                            <span>Ver Foto</span>
                          </button>

                          {/* Checkbox indicator */}
                          <div
                            className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                              isSelected
                                ? "bg-pink-500 border-pink-400 text-white shadow-lg"
                                : "bg-black/60 border-slate-600 text-transparent"
                            }`}
                          >
                            <Check className="w-4 h-4 text-white" />
                          </div>

                          {/* Price Tag badge */}
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                            <span
                              className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${
                                deco.extraPriceCents > 0
                                  ? "bg-pink-950/90 border-pink-500/80 text-pink-200"
                                  : "bg-emerald-950/90 border-emerald-500/80 text-emerald-300"
                              }`}
                            >
                              {deco.extraPriceCents > 0
                                ? `+ ${formatMoney(deco.extraPriceCents)}`
                                : "✓ Incluido en el Combo"}
                            </span>
                          </div>
                        </div>

                        {/* Title and Description */}
                        <div className="p-3.5 space-y-1">
                          <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                            {deco.name}
                          </h4>
                          {deco.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-2">{deco.description}</p>
                          )}
                        </div>

                        {/* Selected Indicator Bar */}
                        <div
                          className={`p-2 text-center text-xs font-bold border-t transition-colors ${
                            isSelected
                              ? "bg-pink-600 text-white border-pink-500"
                              : "bg-[#060D17] text-slate-400 border-[#263858] group-hover:text-slate-200"
                          }`}
                        >
                          {isSelected ? "✓ Estilo Seleccionado" : "Seleccionar Esta Decoración"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-[#0A1322] border border-[#263858] rounded-xl text-center text-slate-400 text-xs">
                  Este paquete no tiene opciones de decoración adicionales cargadas. Puedes continuar al siguiente paso.
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="border-[#263858] text-slate-300 text-xs px-4"
              >
                Volver
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setStep(3)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/30"
              >
                <span>Continuar a Mis Datos</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: DATOS DEL TITULAR & CUMPLEAÑERO */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-[#0F1E36] border border-[#263858] p-5 rounded-2xl space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block">
                  Paso 3 &bull; Registro del Titular
                </span>
                <h2 className="text-xl font-black text-white mt-1">¿A nombre de quién registramos la mesa?</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Te enviaremos los pases QR y el link de invitaciones por WhatsApp.
                </p>
              </div>

              {/* Main Contact Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nombre y Apellido <span className="text-pink-400">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej: Laura Benítez"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="bg-[#0A1322] border-[#263858] text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Número de WhatsApp <span className="text-pink-400">*</span>
                  </label>
                  <Input
                    type="tel"
                    placeholder="Ej: 0981 123 456"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    className="bg-[#0A1322] border-[#263858] text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Correo Electrónico (Opcional)</label>
                  <Input
                    type="email"
                    placeholder="laura@ejemplo.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="bg-[#0A1322] border-[#263858] text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Cédula o Pasaporte (Opcional)</label>
                  <Input
                    type="text"
                    placeholder="Nro de documento para acceso VIP"
                    value={customerDoc}
                    onChange={(e) => setCustomerDoc(e.target.value)}
                    className="bg-[#0A1322] border-[#263858] text-white text-xs"
                  />
                </div>
              </div>

              {/* SPECIAL BIRTHDAY SECTION IF APPLICABLE */}
              {(selectedPackage?.isBirthdayPackage || occasion === "CUMPLEAÑOS") && (
                <div className="mt-4 p-4 bg-pink-950/20 border border-pink-800/40 rounded-2xl space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-pink-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Datos Especiales del Cumpleañero/a</h3>
                      <p className="text-[11px] text-pink-200/80">
                        Proyectaremos su nombre y foto en las pantallas gigantes del local durante el brindis.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Nombre del Cumpleañero/a
                      </label>
                      <Input
                        type="text"
                        placeholder="Ej: Carlos Gómez"
                        value={birthdayPersonName}
                        onChange={(e) => setBirthdayPersonName(e.target.value)}
                        className="bg-[#0A1322] border-[#263858] text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Foto para la Pantalla Gigante (TV / DJ)
                      </label>
                      <label className="cursor-pointer bg-[#0A1322] hover:bg-[#14233C] border border-dashed border-pink-700/60 text-pink-200 text-xs p-2.5 rounded-xl flex items-center justify-center gap-2 transition-all">
                        {isUploadingBirthdayPhoto ? (
                          <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
                        ) : (
                          <UploadCloud className="w-4 h-4 text-pink-400" />
                        )}
                        <span>{isUploadingBirthdayPhoto ? "Subiendo foto..." : "Subir Foto del Cumpleañero"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={onBirthdayPhotoSelected}
                          disabled={isUploadingBirthdayPhoto}
                        />
                      </label>
                    </div>
                  </div>

                  {birthdayPhotoUrl && (
                    <div className="flex items-center gap-3 bg-[#0A1322] border border-pink-800/40 p-2.5 rounded-xl">
                      <img
                        src={birthdayPhotoUrl}
                        alt="Foto cumpleañero"
                        className="w-12 h-12 object-cover rounded-lg border border-pink-500/50 cursor-pointer"
                        onClick={() =>
                          setPreviewPhoto({ url: birthdayPhotoUrl, title: "Foto para Pantalla Gigante" })
                        }
                      />
                      <div className="text-[11px] text-slate-300 flex-1 truncate">
                        <span className="text-pink-300 font-bold block flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" /> Foto cargada para pantalla gigante
                        </span>
                        <span className="text-slate-400 font-mono text-[10px] truncate block">{birthdayPhotoUrl}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBirthdayPhotoUrl("")}
                        className="text-slate-400 hover:text-red-400 text-xs p-1"
                        title="Quitar foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Special Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Notas o Solicitudes Especiales (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Preferimos camarote cerca de la cabina del DJ, llevamos torta..."
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  className="w-full bg-[#0A1322] border border-[#263858] rounded-xl p-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="border-[#263858] text-slate-300 text-xs px-4"
              >
                Volver
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  if (!customerName.trim() || !customerPhone.trim()) {
                    alert("Completa tu Nombre y WhatsApp para continuar");
                    return;
                  }
                  setStep(4);
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/30"
              >
                <span>Continuar a Pago & Confirmación</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: PAGO & CONFIRMACIÓN */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Booking Summary Box */}
            <div className="bg-[#0F1E36] border border-[#263858] p-5 rounded-2xl space-y-4">
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block">
                Paso 4 &bull; Confirmación Final
              </span>
              <h2 className="text-xl font-black text-white">Resumen de tu Reserva</h2>

              <div className="bg-[#0A1322] border border-[#263858] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-base font-black text-white">{selectedPackage?.name}</span>
                    <span className="text-xs text-slate-400 block">
                      Fecha: {new Date(selectedDate).toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long" })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Total a Abonar</span>
                    <span className="text-xl font-black text-emerald-400">{formatMoney(totalAmount)}</span>
                  </div>
                </div>

                {/* Decoration Details */}
                {selectedDecoration && (
                  <div className="p-3 bg-[#14233C] border border-pink-900/40 rounded-xl flex items-center gap-3">
                    <img
                      src={selectedDecoration.imageUrl}
                      alt={selectedDecoration.name}
                      className="w-14 h-12 object-cover rounded-lg border border-pink-600/50"
                    />
                    <div className="flex-1 truncate">
                      <span className="text-[10px] font-bold text-pink-300 block">Ambientación Elegida:</span>
                      <span className="text-xs font-bold text-white block truncate">{selectedDecoration.name}</span>
                      <span className="text-[10px] text-slate-400 block">
                        {selectedDecoration.extraPriceCents > 0
                          ? `+ ${formatMoney(selectedDecoration.extraPriceCents)}`
                          : "Incluida en el combo sin costo extra"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Methods */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-white block">Selecciona la Modalidad de Pago:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("TRANSFER")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      paymentMethod === "TRANSFER"
                        ? "bg-purple-950/60 border-purple-500 text-white shadow-md shadow-purple-500/20"
                        : "bg-[#0A1322] border-[#263858] text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-purple-400 mb-1" />
                    <span className="text-xs font-bold block">Transferencia Bancaria</span>
                    <span className="text-[10px] text-slate-400 block">SIPAP / PIX / Banco</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("WHATSAPP")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      paymentMethod === "WHATSAPP"
                        ? "bg-emerald-950/60 border-emerald-500 text-white shadow-md shadow-emerald-500/20"
                        : "bg-[#0A1322] border-[#263858] text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-400 mb-1" />
                    <span className="text-xs font-bold block">Coordinar por WhatsApp</span>
                    <span className="text-[10px] text-slate-400 block">Pago en Puerta / Efectivo</span>
                  </button>
                </div>
              </div>

              {/* BANK TRANSFER CARD WITH 1-CLICK COPY & PROOF UPLOAD */}
              {paymentMethod === "TRANSFER" && (
                <div className="bg-[#0A1322] border border-[#263858] p-4 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-purple-400" />
                      <span>Datos para Transferencia Bancaria</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                      Habilitado SIPAP & PIX
                    </span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { label: "Banco", val: venue?.bankName || "Banco Familiar / Ueno Bank" },
                      { label: "Nro. de Cuenta", val: venue?.bankAccount || "01-2345678-9" },
                      { label: "Titular", val: venue?.bankHolder || "Vidjeis Entretenimiento S.A." },
                      { label: "RUC / Cédula", val: venue?.bankTaxId || "80012345-6" },
                      { label: "Alias SIPAP / PIX", val: venue?.bankAlias || "pagos@vidjeis.com" },
                    ].map((row, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#0F1E36] border border-[#263858] text-xs"
                      >
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">{row.label}</span>
                          <span className="font-mono text-white text-xs font-semibold">{row.val}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(row.val, row.label)}
                          className="p-1.5 rounded-md hover:bg-slate-700 text-purple-400 transition-colors flex items-center gap-1 text-[10px]"
                          title="Copiar dato"
                        >
                          {copiedKey === row.label ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === row.label ? "Copiado" : "Copiar"}</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* PROOF UPLOAD */}
                  <div className="pt-2 border-t border-[#263858] space-y-2">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Subir Comprobante de Transferencia (Recomendado para confirmación inmediata)
                    </label>
                    <label className="cursor-pointer bg-[#0F1E36] hover:bg-[#14233C] border border-dashed border-purple-500/50 text-purple-200 text-xs p-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                      {isUploadingProof ? (
                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      ) : (
                        <UploadCloud className="w-4 h-4 text-purple-400" />
                      )}
                      <span>{isUploadingProof ? "Subiendo comprobante..." : "Seleccionar Comprobante / Foto"}</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={onProofFileSelected}
                        disabled={isUploadingProof}
                      />
                    </label>

                    {paymentProofUrl && (
                      <div className="flex items-center gap-3 bg-[#0F1E36] border border-emerald-800/40 p-2.5 rounded-xl">
                        <img
                          src={paymentProofUrl}
                          alt="Comprobante"
                          className="w-10 h-10 object-cover rounded-lg border border-emerald-500/50"
                        />
                        <div className="text-[11px] text-slate-300 flex-1 truncate">
                          <span className="text-emerald-400 font-bold block flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" /> Comprobante adjuntado con éxito
                          </span>
                          <span className="text-slate-400 font-mono text-[10px] truncate block">{paymentProofUrl}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPaymentProofUrl("")}
                          className="text-slate-400 hover:text-red-400 text-xs p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation and Submit Button */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(3)}
                className="border-[#263858] text-slate-300 text-xs px-4"
              >
                Volver
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmitReservation}
                disabled={isSubmitting || isUploadingProof}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm px-8 py-3.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/30"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registrando tu Mesa...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirmar y Reservar Mesa</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* LIGHTBOX MODAL FOR FULL-SIZE DECORATION PHOTOS */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-[#0F1E36] border border-[#263858] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-[#0A1322] border-b border-[#263858] flex items-center justify-between">
              <span className="text-xs font-bold text-white truncate">{previewPhoto.title}</span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 bg-black/60 flex items-center justify-center">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReservasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060D17] text-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <ReservasClientContent />
    </Suspense>
  );
}
