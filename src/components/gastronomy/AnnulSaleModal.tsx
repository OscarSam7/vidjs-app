"use client";

import React, { useState } from "react";
import {
  RotateCcw,
  AlertTriangle,
  X,
  Loader2,
  CheckCircle2,
  DollarSign,
  Package,
  Layers,
} from "lucide-react";
import { formatGuaranies } from "@/lib/gastronomy/format";
import { VipSelectModal, VipSelectOption } from "@/components/ui/VipSelectModal";

export interface AnnulSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: any | null;
}

const COMMON_REASONS: VipSelectOption[] = [
  {
    value: "Error de cobro / cobro duplicado en caja",
    label: "Error de cobro / Duplicado en Caja",
    subtitle: "Se cobró por error o hubo doble transacción en terminal",
  },
  {
    value: "Cliente solicitó devolución / canceló consumición",
    label: "Cliente solicitó devolución",
    subtitle: "El cliente canceló la consumición antes o durante el despacho",
  },
  {
    value: "Mesa equivocada / cambio no registrado",
    label: "Mesa equivocada / Cambio de mesa",
    subtitle: "La cuenta fue asignada y cobrada a una mesa errónea",
  },
  {
    value: "Producto / plato defectuoso o frío",
    label: "Producto o plato defectuoso",
    subtitle: "Plato devuelto por inconformidad o preparación incorrecta",
  },
  {
    value: "Demora excesiva en despacho",
    label: "Demora excesiva en barra o cocina",
    subtitle: "El cliente se retiró por tiempo de espera prolongado",
  },
  {
    value: "OTRO",
    label: "Otro motivo específico...",
    subtitle: "Escribir justificación detallada personalizada",
  },
];

export function AnnulSaleModal({
  isOpen,
  onClose,
  onSuccess,
  order,
}: AnnulSaleModalProps) {
  const [selectedPreset, setSelectedPreset] = useState(COMMON_REASONS[0].value);
  const [customDetail, setCustomDetail] = useState("");
  const [restoreStock, setRestoreStock] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const finalReason =
      selectedPreset === "OTRO"
        ? customDetail.trim()
        : customDetail.trim()
        ? `${selectedPreset}: ${customDetail.trim()}`
        : selectedPreset;

    if (!finalReason || finalReason.length < 3) {
      setErrorMsg("Debes especificar un motivo válido de al menos 3 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/gastronomy/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          operationType: "ANNUL_PAID_SALE",
          reason: finalReason,
          restoreStock,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Error al anular la venta");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error al procesar la anulación");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0B132B] border border-red-500/40 rounded-3xl max-w-xl w-full p-5 sm:p-7 space-y-5 my-auto shadow-2xl shadow-red-950/50">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-950/90 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0 shadow-lg shadow-red-950/40">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Anular Venta Cobrada en Caja
              </h2>
              <p className="text-xs text-slate-300">
                Pedido <span className="font-mono font-bold text-purple-300">{order.orderNumber}</span> • {order.tableLabel} ({order.sectorName || "Salón"})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen del Pedido Cobrado */}
        <div className="p-3.5 rounded-2xl bg-[#080F1F] border border-white/10 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Cliente registrado:</span>
            <span className="font-bold text-white">{order.customerName || "Consumidor Final"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Monto total cobrado:</span>
            <span className="font-mono text-base font-black text-emerald-400">
              {formatGuaranies(order.paidCents || order.totalCents)}
            </span>
          </div>
          {order.items && order.items.length > 0 && (
            <div className="pt-2 border-t border-white/5 text-[11px] text-slate-300 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                Ítems de la comanda:
              </span>
              {order.items.map((it: any) => (
                <div key={it.id} className="flex justify-between">
                  <span className="truncate">
                    <strong>{it.quantity}x</strong> {it.productName}
                  </span>
                  <span className="font-mono text-slate-400 ml-2">
                    {formatGuaranies(it.subtotalCents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Selector de Motivo */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Motivo principal de anulación *
            </label>
            <VipSelectModal
              value={selectedPreset}
              onChange={setSelectedPreset}
              options={COMMON_REASONS}
              title="Selecciona el Motivo de Anulación"
              subtitle="Indica la razón administrativa o comercial"
              icon={AlertTriangle}
            />
          </div>

          {/* Detalle o Justificación Adicional */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Detalle / Justificación adicional {selectedPreset === "OTRO" ? "*" : "(Opcional)"}
            </label>
            <textarea
              rows={2}
              value={customDetail}
              onChange={(e) => setCustomDetail(e.target.value)}
              placeholder="Escribe detalles adicionales para el informe de auditoría..."
              required={selectedPreset === "OTRO"}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-400"
            />
          </div>

          {/* Switch de Reintegro de Stock */}
          <div className="p-3.5 rounded-2xl bg-[#080F1F] border border-white/10">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={restoreStock}
                onChange={(e) => setRestoreStock(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-white block">
                  Reintegrar productos al stock de inventario (Kardex)
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Marca esta opción si los productos no fueron consumidos y regresan al stock vendible. Si fueron desechados o mermados, desmárcalo.
                </span>
              </div>
            </label>
          </div>

          {/* Aviso Contable */}
          <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/20 text-[11px] text-red-300/90 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-red-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Consecuencias operativas:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[10px]">
              <li>Se marcará el pago como <strong>REEMBOLSADO</strong> en Caja.</li>
              <li>Si el turno de caja sigue abierto, se ajustará el arqueo de efectivo automáticamente.</li>
              <li>La venta pendiente de facturación comercial será anulada en el módulo de facturación.</li>
            </ul>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold flex items-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Anulando venta...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Confirmar Anulación de Venta</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
