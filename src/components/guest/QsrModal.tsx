"use client";

import React, { useState } from "react";
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || comment.trim().length < 3) {
      setErrorMsg("Por favor escribe tu comentario o detalle.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0F172A] border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-950/40 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera VIP */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-950/70 via-slate-900 to-purple-950/60 border-b border-amber-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">
                  Línea Directa Gerencia & Dueño
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  Privado
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {tableNumber ? `Mesa ${tableNumber} • ` : ""}Buzón Confidencial QSR
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
                <h3 className="text-lg font-bold text-white">¡Mensaje Entregado con Éxito!</h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Tu mensaje fue enviado con la más estricta confidencialidad directamente al
                  teléfono y panel del Gerente General y el Dueño del local.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 max-w-sm mx-auto">
                🔒 Ningún mozo o personal operativo tiene acceso a esta comunicación. Agradecemos
                mucho tu sinceridad para ayudarnos a mejorar.
              </div>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20"
              >
                Cerrar y Continuar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Aviso de Confidencialidad */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-xs">
                <Lock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  Este buzón llega <strong>exclusivamente al Gerente y Dueño</strong>. Tu personal de
                  atención nunca verá lo que escribas aquí.
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
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
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
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
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
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
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
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
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
                      className="p-1 text-slate-600 hover:text-amber-400 transition-colors"
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
                        className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
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
                  <span>Detalle de lo ocurrido o sugerencia</span>
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
                      ? "Ej: Llevamos más de 40 minutos esperando los tragos en la mesa..."
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
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
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
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                  type === "COMPLAINT"
                    ? "bg-red-600 hover:bg-red-500 text-white shadow-red-950/40"
                    : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/40"
                } disabled:opacity-50`}
              >
                {isSubmitting ? (
                  <span>Enviando de forma confidencial...</span>
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
