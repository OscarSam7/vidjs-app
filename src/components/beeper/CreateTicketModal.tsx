"use client";

import React, { useState } from "react";
import { X, Plus, Clock, User, Hash, Utensils, Sparkles } from "lucide-react";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPrepMinutes?: number;
  onCreated: (createdTicket: any) => void;
}

export function CreateTicketModal({
  isOpen,
  onClose,
  defaultPrepMinutes = 15,
  onCreated,
}: CreateTicketModalProps) {
  const [shortCode, setShortCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableOrOrderNumber, setTableOrOrderNumber] = useState("");
  const [prepMinutes, setPrepMinutes] = useState<number>(defaultPrepMinutes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/beeper/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shortCode: shortCode.trim() || undefined,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          tableOrOrderNumber: tableOrOrderNumber.trim() || undefined,
          prepMinutes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al emitir llamador");
      }

      onCreated(json.data);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al crear el llamador");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0A1322] border border-[#263858] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden space-y-4 p-6">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-[#263858] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-none">
                Nuevo Llamador de Pedido
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Generación rápida de turno y código QR
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/60 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Número de Turno / ShortCode (Automático si se deja vacío) */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <Hash className="w-3.5 h-3.5 text-purple-400" />
              <span>Número de Turno (Opcional - Automático por defecto):</span>
            </label>
            <input
              type="text"
              placeholder="Automático (ej: 101, 102...)"
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F1E36] border border-[#263858] text-sm text-white placeholder-slate-500 font-mono font-bold focus:outline-none focus:border-purple-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Si lo dejas en blanco, el sistema calculará automáticamente el siguiente número correlativo.
            </p>
          </div>

          {/* Mesa o Comanda referencial */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <Utensils className="w-3.5 h-3.5 text-purple-400" />
              <span>Número de Mesa o Comanda / Ticket de Caja:</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Mesa 4, Comanda #48, Barra 2"
              value={tableOrOrderNumber}
              onChange={(e) => setTableOrOrderNumber(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0F1E36] border border-[#263858] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Nombre opcional del cliente */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span>Nombre del Cliente (Opcional):</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Marcos Pérez"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0F1E36] border border-[#263858] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Tiempo estimado de preparación */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>Tiempo de Espera Estimado:</span>
              </label>
              <span className="font-mono font-black text-purple-400 text-xs">
                {prepMinutes} minutos
              </span>
            </div>
            <div className="flex gap-2">
              {[10, 15, 20, 30].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPrepMinutes(m)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    prepMinutes === m
                      ? "bg-purple-950/80 border-purple-500 text-white shadow-md shadow-purple-950/40"
                      : "bg-[#0F1E36] border-[#263858] text-slate-400 hover:text-white"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#263858]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? "Emitiendo..." : "Generar Llamador QR"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
