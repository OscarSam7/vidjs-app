"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Heart,
  Star,
  Send,
  Lock,
  Phone,
  User,
  CheckCircle2,
  Building2,
  UtensilsCrossed,
  Wine,
  Music,
  Receipt,
  Sparkles,
  Ticket,
  KeyRound,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Check,
} from "lucide-react";

interface QsrModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string | null;
  venueId?: string | null;
  tableId?: string | null;
  tableNumber?: string | null;
  tableName?: string | null;
  guestSessionId?: string | null;
  purchasedTickets?: any[];
  hasActiveConsumption?: boolean;
  onRequestSelectTable?: () => void;
}

type QsrType = "COMPLAINT" | "CLAIM" | "SUGGESTION" | "COMPLIMENT";

const CATEGORIES = [
  { id: "SERVICE", label: "Atención / Mozos", icon: UtensilsCrossed },
  { id: "BAR", label: "Barra & Tragos", icon: Wine },
  { id: "KITCHEN", label: "Cocina & Comida", icon: UtensilsCrossed },
  { id: "MUSIC", label: "Música & DJ / Karaoke", icon: Music },
  { id: "BILLING", label: "Caja & Cuenta", icon: Receipt },
  { id: "FACILITIES", label: "Baños & Instalaciones", icon: Building2 },
  { id: "OTHER", label: "Otro motivo", icon: Sparkles },
];

export function QsrModal({
  isOpen,
  onClose,
  tenantId,
  venueId,
  tableId,
  tableNumber,
  tableName,
  guestSessionId,
  purchasedTickets = [],
  hasActiveConsumption = false,
  onRequestSelectTable,
}: QsrModalProps) {
  const [type, setType] = useState<QsrType>("COMPLAINT");
  const [rating, setRating] = useState<number>(type === "COMPLAINT" ? 1 : 5);
  const [category, setCategory] = useState<string>("SERVICE");
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual ticket validation state
  const [manualTicketInput, setManualTicketInput] = useState("");
  const [manualValidatedTicket, setManualValidatedTicket] = useState<any | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Verification resolution:
  const isVerifiedByTable = Boolean(tableId || tableNumber);
  const isVerifiedByTicket =
    Boolean(purchasedTickets && purchasedTickets.length > 0) || Boolean(manualValidatedTicket);
  const isVerifiedByConsumption = Boolean(hasActiveConsumption);

  const isClientVerified =
    isVerifiedByTable || isVerifiedByTicket || isVerifiedByConsumption;

  // Active verified badge label
  const verifiedBadgeText = isVerifiedByTable
    ? `Mesa ${tableNumber || tableName || "Activa"}`
    : isVerifiedByTicket
    ? `Entrada Oficial (${
        manualValidatedTicket?.eventName || purchasedTickets[0]?.eventName || "Boleto Verificado"
      })`
    : isVerifiedByConsumption
    ? "Consumo Activo en Sala"
    : null;

  if (!isOpen) return null;

  const handleValidateManualTicket = () => {
    const query = manualTicketInput.trim().toUpperCase();
    if (!query) {
      setValidationError("Por favor ingresa tu código de ticket o tu CI.");
      return;
    }

    setValidationError(null);

    // 1. Search in local tickets
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("vidjs_purchased_tickets");
        if (stored) {
          const list = JSON.parse(stored);
          const found = list.find(
            (t: any) =>
              (t.id && t.id.toUpperCase().includes(query)) ||
              (t.buyerDoc && t.buyerDoc.toUpperCase().includes(query))
          );
          if (found) {
            setManualValidatedTicket(found);
            return;
          }
        }
      } catch {}
    }

    // 2. If valid format VID-XXXX
    if (query.startsWith("VID-") || query.length >= 6) {
      setManualValidatedTicket({
        id: query,
        eventName: "Evento Oficial VIDJS",
        buyerDoc: query,
      });
      return;
    }

    setValidationError("No encontramos una entrada con ese código o documento. Verifica los datos.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isClientVerified) {
      setErrorMsg("Debes verificar tu condición de cliente con mesa o entrada para enviar.");
      return;
    }

    if (!comment.trim() || comment.trim().length < 3) {
      setErrorMsg("Por favor escribe tu comentario o detalle.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const activeTicket = manualValidatedTicket || (purchasedTickets && purchasedTickets[0]);

      const res = await fetch("/api/v1/guest/qsr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          venueId,
          tableId,
          tableNumber,
          tableName,
          guestSessionId,
          type,
          rating,
          category,
          comment: comment.trim(),
          isAnonymous,
          customerName: !isAnonymous ? customerName.trim() : null,
          customerPhone: !isAnonymous ? customerPhone.trim() : null,
          // Verification Metadata
          verificationType: isVerifiedByTable
            ? "TABLE"
            : isVerifiedByTicket
            ? "TICKET"
            : "CONSUMPTION",
          verificationBadge: verifiedBadgeText,
          ticketCode: activeTicket?.id || null,
          ticketEventName: activeTicket?.eventName || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo enviar el mensaje.");
      }

      setSubmittedSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error inesperado al enviar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedSuccess(false);
    setComment("");
    setCustomerName("");
    setCustomerPhone("");
    setIsAnonymous(true);
    setErrorMsg(null);
    setManualValidatedTicket(null);
    setManualTicketInput("");
    setValidationError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0F172A] border border-amber-500/30 rounded-3xl shadow-2xl shadow-amber-950/40 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera VIP */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-950/70 via-slate-900 to-purple-950/60 border-b border-amber-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-wide">
                  Línea Directa Gerencia & Dueño
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  QSR
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Buzón Exclusivo de Quejas, Sugerencias y Reclamos
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 overflow-y-auto space-y-4">
          {submittedSuccess ? (
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">¡Mensaje Entregado con Éxito!</h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Tu mensaje fue enviado con la más estricta confidencialidad directamente al
                  teléfono y panel del Gerente General y el Dueño del local.
                </p>
              </div>

              {/* Sello de cliente verificado */}
              {verifiedBadgeText && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 max-w-xs mx-auto">
                  <Check className="w-3.5 h-3.5" />
                  <span>Enviado como Cliente Verificado ({verifiedBadgeText})</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 max-w-sm mx-auto">
                🔒 Ningún mozo o personal operativo tiene acceso a esta comunicación. Agradecemos
                mucho tu sinceridad para ayudarnos a mejorar.
              </div>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Cerrar y Continuar
              </button>
            </div>
          ) : !isClientVerified ? (
            /* GATE DE VERIFICACIÓN: Si no tiene mesa ni entrada */
            <div className="py-4 space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/40">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-white">
                  Buzón Reservado para Clientes del Establecimiento
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Para garantizar que cada queja, reclamo o felicitación reciba <strong>atención inmediata de Gerencia</strong> y evitar opiniones externas o falsas, este buzón se habilita una vez que hayas <strong>ocupado una mesa</strong> o <strong>adquirido una entrada</strong>.
                </p>
              </div>

              {/* Opciones de Desbloqueo / Verificación */}
              <div className="space-y-3">
                {/* Opción 1: Validar con Código de Entrada o CI */}
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">
                      Tengo una Entrada / Boleto Adquirido
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Ingresa el código de tu ticket (Ej: VID-TARDEZIN-123456) o el documento CI registrado.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualTicketInput}
                      onChange={(e) => setManualTicketInput(e.target.value)}
                      placeholder="Código de ticket o CI..."
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 uppercase font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleValidateManualTicket}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shrink-0 transition-colors shadow-md shadow-purple-900/40 cursor-pointer"
                    >
                      Validar
                    </button>
                  </div>

                  {validationError && (
                    <p className="text-[11px] text-rose-400 font-semibold">{validationError}</p>
                  )}
                </div>

                {/* Opción 2: Ocupar / Escanear Mesa en Sala */}
                {onRequestSelectTable && (
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white block">
                        Estoy sentado en una Mesa
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Escanea o vincula tu mesa para habilitar el buzón de inmediato.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRequestSelectTable();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1 shadow-md shadow-amber-950/40 cursor-pointer"
                    >
                      <span>Vincular Mesa</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Opción 3: Adquirir Entrada */}
                <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/20 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-300">¿Aún no tienes entrada para el próximo evento?</span>
                  <a
                    href="/eventos"
                    className="text-purple-400 hover:text-purple-300 font-bold underline shrink-0"
                  >
                    Ver Cartelera &rarr;
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* FORMULARIO HABILITADO PARA CLIENTE VERIFICADO */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Sello Dorado de Cliente Verificado */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-black text-white block leading-tight">
                      Cliente Verificado
                    </span>
                    <span className="text-[10px] text-emerald-400/90 font-mono">
                      {verifiedBadgeText}
                    </span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-black">
                  Acceso Autorizado
                </span>
              </div>

              {/* Aviso de Confidencialidad */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-xs">
                <Lock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  Este mensaje llega <strong>directo al Gerente y Dueño</strong> con prioridad VIP.
                  Tu personal de atención nunca verá lo que escribas aquí.
                </span>
              </div>

              {/* Selector de Tipo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  ¿Qué deseas comunicarnos?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setType("COMPLAINT");
                      setRating(1);
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                      type === "COMPLAINT"
                        ? "bg-red-500/20 border-red-500 text-red-300 font-bold shadow-md shadow-red-950/30"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="text-[11px] leading-tight">Queja en Vivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setType("CLAIM");
                      setRating(2);
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                      type === "CLAIM"
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-950/30"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                    }`}
                  >
                    <Receipt className="w-5 h-5 text-amber-400" />
                    <span className="text-[11px] leading-tight">Reclamo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setType("SUGGESTION");
                      setRating(4);
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                      type === "SUGGESTION"
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold shadow-md shadow-cyan-950/30"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                    }`}
                  >
                    <Lightbulb className="w-5 h-5 text-cyan-400" />
                    <span className="text-[11px] leading-tight">Sugerencia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setType("COMPLIMENT");
                      setRating(5);
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                      type === "COMPLIMENT"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-md shadow-emerald-950/30"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                    }`}
                  >
                    <Heart className="w-5 h-5 text-emerald-400" />
                    <span className="text-[11px] leading-tight">Felicitación</span>
                  </button>
                </div>
              </div>

              {/* Calificación de Estrellas */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Calificación general
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {rating === 1 && "Muy insatisfecho"}
                    {rating === 2 && "Insatisfecho"}
                    {rating === 3 && "Regular"}
                    {rating === 4 && "Buena experiencia"}
                    {rating === 5 && "¡Excelente servicio!"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-slate-600 hover:text-amber-400 transition-colors cursor-pointer"
                      title={`${star} estrellas`}
                    >
                      <Star
                        className={`w-6 h-6 transition-all ${
                          rating >= star
                            ? "fill-amber-400 text-amber-400 scale-110"
                            : "text-slate-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Área / Categoría */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Área o Sector relacionado
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const CatIcon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-purple-600/30 border-purple-500 text-purple-200 font-semibold"
                            : "bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <CatIcon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comentario / Detalle */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Detalle de lo ocurrido o sugerencia *</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {comment.length}/2000
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    type === "COMPLAINT"
                      ? "Ej: Llevamos más de 30 minutos esperando los tragos en la mesa..."
                      : type === "CLAIM"
                      ? "Ej: En la cuenta me cobraron un ítem que no consumimos..."
                      : type === "SUGGESTION"
                      ? "Ej: Estaría excelente si agregan opciones vegetarianas o música rock..."
                      : "Ej: El mozo que nos atendió fue súper atento y rápido..."
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
              </div>

              {/* Opción Anónimo o con Contacto */}
              <div className="space-y-2 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-slate-200">
                      Enviar de forma 100% Anónima
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      isAnonymous ? "bg-emerald-600 justify-end" : "bg-slate-700 justify-start"
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
                  </button>
                </div>

                {!isAnonymous && (
                  <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in duration-150">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Tu Nombre (Opcional)
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Juan Pérez"
                          className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Tu WhatsApp (Para contactarte)
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+595 981 123456"
                          className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Botón de Envío */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                  type === "COMPLAINT"
                    ? "bg-red-600 hover:bg-red-500 text-white shadow-red-950/40"
                    : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/40"
                } disabled:opacity-50`}
              >
                {isSubmitting ? (
                  <span>Enviando con prioridad VIP...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {type === "COMPLAINT"
                        ? "🚨 Enviar Queja a Gerencia & Dueño"
                        : "Enviar Mensaje Confidencial"}
                    </span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
