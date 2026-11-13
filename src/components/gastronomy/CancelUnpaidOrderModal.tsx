"use client";

import React, { useState } from "react";
import {
  XCircle,
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { formatGuaranies } from "@/lib/gastronomy/format";
import { VipSelectModal, VipSelectOption } from "@/components/ui/VipSelectModal";

export interface CancelUnpaidOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: any | null;
}

const COMMON_CANCEL_REASONS: VipSelectOption[] = [
  {
    value: "Cliente desistió del pedido",
    label: "Cliente desistió del pedido",
    subtitle: "El cliente cambió de opinión antes de recibir la comanda",
  },
  {
    value: "Error de digitación del mozo / comanda duplicada",
    label: "Error de digitación / Comanda duplicada",
    subtitle: "El mozo o cajero cargó el ítem dos veces o por error",
  },
  {
    value: "Demora en preparación / Cliente se retiró",
    label: "Demora en preparación / Cliente se retiró",
    subtitle: "Tiempo de espera prolongado en barra o cocina",
  },
  {
    value: "Falta de insumos en barra o cocina",
    label: "Falta de insumos en barra o cocina",
    subtitle: "No se cuenta con los ingredientes para elaborar el pedido",
  },
  {
    value: "Mesa se retiró sin consumir",
    label: "Mesa se retiró sin consumir",
    subtitle: "Los comensales abandonaron la mesa antes del despacho",
  },
  {
    value: "OTRO",
    label: "Otro motivo específico...",
    subtitle: "Escribir justificación personalizada",
  },
];

export function CancelUnpaidOrderModal({
  isOpen,
  onClose,
  onSuccess,
  order,
}: CancelUnpaidOrderModalProps) {
  const [selectedPreset, setSelectedPreset] = useState(COMMON_CANCEL_REASONS[0].value);
  const [customDetail, setCustomDetail] = useState("");
  const [permanentDelete, setPermanentDelete] = useState(false);
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
          operationType: "CANCEL_UNPAID",
          reason: finalReason,
          restoreStock,
          permanentDelete,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Error al cancelar el pedido");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error al procesar la cancelación");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0B132B] border border-amber-500/40 rounded-3xl max-w-xl w-full p-5 sm:p-7 space-y-5 my-auto shadow-2xl shadow-amber-950/40">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-950/90 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-950/30">
              {permanentDelete ? <Trash2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {permanentDelete ? "Borrar Pedido del Sistema" : "Cancelar Pedido No Pagado"}
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

        {/* Resumen del Pedido */}
        <div className="p-3.5 rounded-2xl bg-[#080F1F] border border-white/10 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Cliente / Mesa:</span>
            <span className="font-bold text-white">{order.customerName || "Cliente"} • {order.tableLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Saldo pendiente:</span>
            <span className="font-mono text-base font-black text-amber-300">
              {formatGuaranies(order.totalCents - (order.paidCents || 0))}
            </span>
          </div>
          {order.items && order.items.length > 0 && (
            <div className="pt-2 border-t border-white/5 text-[11px] text-slate-300 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                Productos a cancelar:
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
              Motivo de la cancelación *
            </label>
            <VipSelectModal
              value={selectedPreset}
              onChange={setSelectedPreset}
              options={COMMON_CANCEL_REASONS}
              title="Selecciona el Motivo de Cancelación"
              subtitle="Causa de la anulación o descarte del pedido"
              icon={AlertTriangle}
            />
          </div>

          {/* Detalle Adicional */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Observaciones / Detalle adicional {selectedPreset === "OTRO" ? "*" : "(Opcional)"}
            </label>
            <textarea
              rows={2}
              value={customDetail}
              onChange={(e) => setCustomDetail(e.target.value)}
              placeholder="Añade detalles para la auditoría de cocina y administración..."
              required={selectedPreset === "OTRO"}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Switch de Reintegro de Stock */}
          <div className="p-3 rounded-2xl bg-[#080F1F] border border-white/10">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={restoreStock}
                onChange={(e) => setRestoreStock(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="font-bold text-white block">
                  Revertir y reintegrar stock al inventario
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Regresa las cantidades reservadas a la existencia de productos e insumos.
                </span>
              </div>
            </label>
          </div>

          {/* Modalidad: Cancelar vs Borrar */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPermanentDelete(false)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                !permanentDelete
                  ? "bg-amber-950/60 border-amber-400 text-amber-200 shadow-md"
                  : "bg-zinc-900/60 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <span className="font-bold block text-xs">Marcar como Cancelado</span>
              <span className="text-[10px] opacity-80 block mt-0.5">
                Conserva el pedido en el historial con su motivo de auditoría.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPermanentDelete(true)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                permanentDelete
                  ? "bg-red-950/80 border-red-400 text-red-200 shadow-md"
                  : "bg-zinc-900/60 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <span className="font-bold block text-xs flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Borrar del Sistema
              </span>
              <span className="text-[10px] opacity-80 block mt-0.5">
                Elimina completamente la comanda de la base de datos.
              </span>
            </button>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 font-bold cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-white font-extrabold flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50 ${
                permanentDelete
                  ? "bg-red-600 hover:bg-red-500 shadow-red-600/30"
                  : "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : permanentDelete ? (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Confirmar Borrado</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>Confirmar Cancelación</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
