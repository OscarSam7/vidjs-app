"use client";

import React, { useState, useRef } from "react";
import {
  Ticket,
  X,
  Building,
  CreditCard,
  QrCode,
  DollarSign,
  Smartphone,
  Copy,
  Check,
  UploadCloud,
  FileCheck,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Download,
  Share2,
  Wallet,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethodType = "TRANSFER" | "PIX" | "CASH" | "OTHER";

export interface TicketPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id?: string;
    code: string;
    name: string;
    locationName?: string;
    timeSchedule?: string;
    bannerUrl?: string;
  };
  selectedTiers: {
    id: string;
    name: string;
    price: number;
    count: number;
    formattedPrice?: string;
  }[];
  totalAmount: number;
  initialBuyerName?: string;
  initialBuyerDoc?: string;
  onTicketPurchased?: (tickets: any[]) => void;
}

export function TicketPaymentModal({
  isOpen,
  onClose,
  event,
  selectedTiers,
  totalAmount,
  initialBuyerName = "",
  initialBuyerDoc = "",
  onTicketPurchased,
}: TicketPaymentModalProps) {
  // Step 1: Form & Payment, Step 2: Issued Tickets
  const [step, setStep] = useState<"PAYMENT" | "ISSUED">("PAYMENT");

  // Buyer Info
  const [buyerName, setBuyerName] = useState(initialBuyerName);
  const [buyerDoc, setBuyerDoc] = useState(initialBuyerDoc);
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("TRANSFER");

  // Proof / Comprobante
  const [receiptReference, setReceiptReference] = useState("");
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptImageName, setReceiptImageName] = useState<string | null>(null);
  const [paymentNotes, setPaymentNotes] = useState("");

  // State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [issuedTickets, setIssuedTickets] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Conversion aproximada a Reales (1 BRL ~ 1.450 PYG)
  const amountBRL = (totalAmount / 1450).toFixed(2);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona una imagen válida del comprobante (JPG, PNG o WEBP).");
      return;
    }

    setReceiptImageName(file.name);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setReceiptImage(uploadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeReceiptImage = () => {
    setReceiptImage(null);
    setReceiptImageName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSubmit = Boolean(
    buyerName.trim() &&
    buyerDoc.trim() &&
    (receiptReference.trim().length >= 3 || receiptImage || paymentMethod === "CASH")
  );

  const handleSubmitProofAndIssue = async () => {
    if (!buyerName.trim() || !buyerDoc.trim()) {
      setErrorMessage("Por favor completa tu Nombre y Documento (CI/DNI).");
      return;
    }

    if (!receiptReference.trim() && !receiptImage && paymentMethod !== "CASH") {
      setErrorMessage(
        "Debes adjuntar la foto del comprobante o escribir el número de transacción/referencia para emitir tu boleta."
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        eventId: event.id || null,
        eventCode: event.code,
        eventName: event.name,
        buyerName: buyerName.trim(),
        buyerDoc: buyerDoc.trim(),
        buyerEmail: buyerEmail.trim(),
        buyerPhone: buyerPhone.trim(),
        tiers: selectedTiers,
        paymentMethod,
        receiptReference: receiptReference.trim() || (paymentMethod === "CASH" ? "PAGO_EN_PUERTA" : ""),
        receiptImage: receiptImage || null,
        notes: paymentNotes.trim() || null,
      };

      const res = await fetch("/api/v1/events/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo emitir la boleta. Verifica los datos.");
      }

      const tickets = data.tickets || [];
      setIssuedTickets(tickets);

      // Guardar inmediatamente en localStorage para sincronizar con la Billetera Móvil
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("vidjs_purchased_tickets");
          const existing = stored ? JSON.parse(stored) : [];
          localStorage.setItem("vidjs_purchased_tickets", JSON.stringify([...tickets, ...existing]));
        } catch (e) {
          console.warn("Storage warning:", e);
        }
      }

      if (onTicketPurchased) {
        onTicketPurchased(tickets);
      }

      setStep("ISSUED");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Error al procesar el comprobante.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintOrDownload = (tkt: any) => {
    window.print();
  };

  const handleShareTicket = (tkt: any) => {
    const text = `¡Tengo mi entrada para ${tkt.eventName}! Titular: ${tkt.buyerName} | Código: ${tkt.id}`;
    if (navigator.share) {
      navigator.share({ title: tkt.eventName, text });
    } else {
      navigator.clipboard.writeText(text);
      alert("Enlace copiado para compartir por WhatsApp.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-[#0A1322] border border-[#263858] rounded-3xl w-full max-w-xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#263858] pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-purple-400" />
              <span>
                {step === "PAYMENT" ? "Pago y Emisión de Entradas" : "¡Boletas Oficiales Emitidas!"}
              </span>
            </h3>
            <p className="text-xs text-slate-400 truncate max-w-[320px] sm:max-w-md">
              {event.name} — {event.locationName || "Rumba Stage"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: PAGO & ENVÍO DE COMPROBANTE */}
        {step === "PAYMENT" && (
          <div className="space-y-4">
            {/* Resumen del Pedido */}
            <div className="p-3.5 rounded-2xl bg-[#080F1F] border border-[#263858] space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-300">
                <span>Resumen de Entradas:</span>
                <span className="text-purple-400">
                  {selectedTiers.reduce((acc, t) => acc + t.count, 0)} boletos
                </span>
              </div>
              <div className="divide-y divide-[#1D2B44]">
                {selectedTiers.map((t) => (
                  <div key={t.id} className="py-1 flex justify-between text-slate-400">
                    <span>
                      {t.count}x {t.name}
                    </span>
                    <span className="font-mono text-white">
                      Gs. {(t.price * t.count).toLocaleString("es-PY")}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-[#263858] flex justify-between items-center">
                <span className="font-bold text-slate-300">Total a Abonar:</span>
                <div className="text-right">
                  <div className="font-mono text-base font-black text-emerald-400">
                    Gs. {totalAmount.toLocaleString("es-PY")}
                  </div>
                  {paymentMethod === "PIX" && (
                    <div className="text-[10px] text-zinc-400 font-mono">
                      ≈ R$ {amountBRL} BRL
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Datos del Titular */}
            <div className="space-y-2.5 text-xs">
              <span className="font-bold text-slate-300 block">1. Datos del Titular del Boleto:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Ej: Juan Pérez González"
                    className="w-full px-3 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-white text-xs outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Cédula (CI / DNI) *</label>
                  <input
                    type="text"
                    value={buyerDoc}
                    onChange={(e) => setBuyerDoc(e.target.value)}
                    placeholder="Ej: 4.512.890"
                    className="w-full px-3 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-white text-xs outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">WhatsApp / Teléfono</label>
                  <input
                    type="text"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="Ej: 0981 123456"
                    className="w-full px-3 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-white text-xs outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-white text-xs outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Selector de Método de Pago */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-300 block">2. Selecciona Método de Pago:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("TRANSFER")}
                  className={cn(
                    "p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5",
                    paymentMethod === "TRANSFER"
                      ? "border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-md shadow-emerald-950/50"
                      : "border-[#263858] bg-[#080F1F] text-slate-400 hover:text-white"
                  )}
                >
                  <Building className="w-5 h-5 text-emerald-400" />
                  <span className="font-black text-[11px]">Transferencias</span>
                  <span className="text-[9px] text-slate-400">SIPAP / Bancos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("PIX")}
                  className={cn(
                    "p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5",
                    paymentMethod === "PIX"
                      ? "border-teal-500 bg-teal-950/40 text-teal-300 shadow-md shadow-teal-950/50"
                      : "border-[#263858] bg-[#080F1F] text-slate-400 hover:text-white"
                  )}
                >
                  <QrCode className="w-5 h-5 text-teal-400" />
                  <span className="font-black text-[11px]">Pix Instant</span>
                  <span className="text-[9px] text-slate-400">Brasil / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={cn(
                    "p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5",
                    paymentMethod === "CASH"
                      ? "border-amber-500 bg-amber-950/40 text-amber-300 shadow-md shadow-amber-950/50"
                      : "border-[#263858] bg-[#080F1F] text-slate-400 hover:text-white"
                  )}
                >
                  <DollarSign className="w-5 h-5 text-amber-400" />
                  <span className="font-black text-[11px]">Dinero Efectivo</span>
                  <span className="text-[9px] text-slate-400">Boletería / Puerta</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("OTHER")}
                  className={cn(
                    "p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5",
                    paymentMethod === "OTHER"
                      ? "border-purple-500 bg-purple-950/40 text-purple-300 shadow-md shadow-purple-950/50"
                      : "border-[#263858] bg-[#080F1F] text-slate-400 hover:text-white"
                  )}
                >
                  <Smartphone className="w-5 h-5 text-purple-400" />
                  <span className="font-black text-[11px]">Otros / Giros</span>
                  <span className="text-[9px] text-slate-400">Tigo / Billeteras</span>
                </button>
              </div>

              {/* Caja de Datos Bancarios / Pix / Efectivo según selección */}
              <div className="p-3.5 rounded-2xl bg-[#080F1F]/90 border border-[#263858] space-y-2.5 animate-fadeIn">
                {paymentMethod === "TRANSFER" && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide">
                        Datos para Transferencia Bancaria (SIPAP):
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            "Banco Continental | Cta: 01-24-00982341-01 | Titular: Rumba Stage S.A. | RUC: 80092341-2",
                            "transfer"
                          )
                        }
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-bold"
                      >
                        {copiedKey === "transfer" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === "transfer" ? "¡Copiado!" : "Copiar todo"}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Banco:</span>
                        <strong className="text-white">Banco Continental S.A.E.C.A.</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Titular:</span>
                        <strong className="text-white">Rumba Stage / CYNKO Suite</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">RUC:</span>
                        <strong className="font-mono text-white">80092341-2</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Cuenta Corriente:</span>
                        <strong className="font-mono text-white">01-24-00982341-01</strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 block">Alias SIPAP / Email:</span>
                        <strong className="font-mono text-emerald-300">pagos@cynko.app</strong>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === "PIX" && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wide">
                        Chave PIX Oficial (Brasil / Mercosur):
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy("pix@cynko.app", "pix")}
                        className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer font-bold"
                      >
                        {copiedKey === "pix" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === "pix" ? "¡Chave Copiada!" : "Copiar Chave"}</span>
                      </button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/60 border border-teal-500/30 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Chave Aleatória / Email:</span>
                        <span className="font-mono font-bold text-teal-300 text-xs">pix@cynko.app</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-teal-500/20 text-teal-300 text-[10px] font-mono font-bold">
                        R$ {amountBRL}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Beneficiário: <strong>CYNKO Entertainment - Rumba Stage</strong>. Paga a través de tu app bancaria (Nubank, Itaú, Bradesco, Inter, etc.).
                    </p>
                  </div>
                )}

                {paymentMethod === "CASH" && (
                  <div className="space-y-1.5 text-xs">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide block">
                      Pago en Efectivo (Boletería o Acceso al Evento):
                    </span>
                    <p className="text-slate-300 text-[11px]">
                      Puedes abonar en efectivo en la <strong>Boletería Central de Rumba Stage</strong> o al llegar al control de acceso presentando tu código de reserva.
                    </p>
                    <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[10px] text-amber-200">
                      ℹ️ Tu lugar queda pre-reservado. Al enviar este formulario se emite tu boleto oficial con QR y aviso de cobro en puerta.
                    </div>
                  </div>
                )}

                {paymentMethod === "OTHER" && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wide">
                        Billeteras Digitales & Giros:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy("0981123456", "other")}
                        className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-bold"
                      >
                        {copiedKey === "other" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === "other" ? "¡Número Copiado!" : "Copiar Número"}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                      <div>
                        <span className="text-slate-500 block">Giros Tigo / Billetera:</span>
                        <strong className="font-mono text-white">0981 123 456</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Titular:</span>
                        <strong className="text-white">Operaciones CYNKO</strong>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Nota: Envíe el giro con el costo de retiro incluido para acreditar el monto total.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN OBLIGATORIA: Envío del Comprobante */}
            <div className="space-y-2.5 text-xs pt-1 border-t border-[#263858]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>3. Adjuntar Comprobante de Pago *</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  Requisito para emitir QR
                </span>
              </div>

              {/* Botón o zona de carga de comprobante */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {!receiptImage ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-[#263858] hover:border-purple-500/70 bg-[#080F1F] hover:bg-[#0D1930] transition-all flex flex-col items-center justify-center gap-2 text-center cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Subir foto o captura del comprobante
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Formatos soportados: JPG, PNG, WEBP (Comprobante bancario o recibo Pix)
                    </span>
                  </div>
                </button>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-black border border-emerald-500/40 shrink-0">
                      <img
                        src={receiptImage}
                        alt="Comprobante"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-black text-emerald-300 block truncate">
                        ✓ Comprobante cargado
                      </span>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {receiptImageName || "captura_de_pago.png"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeReceiptImage}
                    className="p-1.5 rounded-lg bg-red-950/60 border border-red-500/30 text-red-400 hover:text-white hover:bg-red-900 transition-colors shrink-0"
                    title="Eliminar comprobante"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Número de comprobante / Referencia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">
                    Nro. de Comprobante / Transacción *
                  </label>
                  <input
                    type="text"
                    value={receiptReference}
                    onChange={(e) => setReceiptReference(e.target.value)}
                    placeholder="Ej: Op #894212 / ID Transacción"
                    className="w-full px-3 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-white text-xs outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">
                    Nota o Comentario (Opcional)
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Ej: Transferencia hecha desde cuenta de..."
                    className="w-full px-3 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-white text-xs outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Mensaje de Error */}
              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-[11px] text-purple-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-purple-400" />
                <span>
                  Al enviar el comprobante, el sistema valida la transacción e inmediatamente emite tu boleto oficial con código QR criptográfico.
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[#263858] flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting || !canSubmit}
                onClick={handleSubmitProofAndIssue}
                className={cn(
                  "px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg transition-all",
                  canSubmit && !isSubmitting
                    ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-900/40 cursor-pointer active:scale-95"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-60"
                )}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verificando y Generando QR...</span>
                  </>
                ) : (
                  <>
                    <span>Enviar Comprobante y Emitir QR</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: BOLETAS EMITIDAS CON QR OFICIAL */}
        {step === "ISSUED" && (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            <div className="text-center space-y-1.5 pb-3 border-b border-[#263858]">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white">
                ¡Comprobante Recibido & Boleta Emitida!
              </h3>
              <p className="text-xs text-slate-400">
                Tu boleto oficial ha sido emitido con firma criptográfica y guardado en tu Billetera Móvil CYNKO.
              </p>
            </div>

            {/* Listado de Boletas con QR */}
            <div className="space-y-3">
              {issuedTickets.map((tkt, idx) => (
                <div
                  key={idx}
                  className="bg-white text-zinc-900 rounded-2xl p-4 shadow-xl border-2 border-dashed border-gray-300 relative overflow-hidden"
                >
                  {/* Badge superior */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200 text-[10px]">
                    <span className="font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      {tkt.tierName}
                    </span>
                    <span className="text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Comprobante Registrado</span>
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <h4 className="text-base font-black text-black leading-tight">
                        {tkt.eventName}
                      </h4>
                      <p className="text-xs text-gray-700">
                        Titular: <strong>{tkt.buyerName}</strong> • CI: <span className="font-mono">{tkt.buyerDoc}</span>
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Lugar: {tkt.venueName} • {tkt.eventDate}
                      </p>
                      <div className="pt-1.5 flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-purple-950 bg-purple-50 px-2 py-1 rounded-md border border-purple-200">
                          {tkt.id}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          Ref: {tkt.receiptReference}
                        </span>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="w-24 h-24 bg-white border border-gray-300 rounded-xl p-1 flex flex-col items-center justify-center shrink-0 shadow-sm">
                      {tkt.qrDataUrl ? (
                        <img
                          src={tkt.qrDataUrl}
                          alt="QR Acceso"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <QrCode className="w-full h-full text-zinc-900" />
                      )}
                      <span className="text-[7px] text-purple-800 font-mono font-bold">
                        CYNKO PASS QR OFICIAL
                      </span>
                    </div>
                  </div>

                  {/* Botones de acción del ticket */}
                  <div className="mt-3 pt-2.5 border-t border-gray-200 flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleShareTicket(tkt)}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Compartir</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintOrDownload(tkt)}
                      className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Imprimir / PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer de éxito */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2 border-t border-[#263858]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>Ver en mi Billetera de Entradas</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
