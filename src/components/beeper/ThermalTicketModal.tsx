"use client";

import React, { useRef } from "react";
import { X, Printer, QrCode } from "lucide-react";
import { QRCodeImage } from "@/components/ui/QRCodeImage";

interface ThermalTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: {
    shortCode: string;
    qrToken: string;
    customerName?: string | null;
    tableOrOrderNumber?: string | null;
    createdAt: string | Date;
  };
  tenant: {
    name: string;
    slug: string;
    logoUrl?: string | null;
  };
}

export function ThermalTicketModal({
  isOpen,
  onClose,
  ticket,
  tenant,
}: ThermalTicketModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/b/t/${ticket.qrToken}`
    : `https://vidjs.app/b/t/${ticket.qrToken}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Estilos para impresión térmica (58mm / 80mm) */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-print-area,
          #thermal-print-area * {
            visibility: visible !important;
          }
          #thermal-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 78mm !important;
            padding: 4mm !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-[#0A1322] border border-[#263858] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
        {/* Cabecera modal */}
        <div className="flex items-center justify-between border-b border-[#263858] pb-3 no-print">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-none">
                Ticket Térmico & QR
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Turno #{ticket.shortCode} para el cliente
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

        {/* Vista previa Ticket Térmico en pantalla */}
        <div className="flex justify-center">
          <div
            id="thermal-print-area"
            ref={printAreaRef}
            className="w-full max-w-[280px] bg-white text-black p-4 rounded-xl shadow-lg border border-slate-300 font-mono text-center space-y-2.5"
          >
            {/* Logo o Nombre del Local */}
            <div className="border-b border-black pb-2">
              {tenant.logoUrl ? (
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  className="max-h-10 mx-auto object-contain mb-1"
                />
              ) : null}
              <h2 className="text-base font-black uppercase tracking-tight leading-tight">
                {tenant.name}
              </h2>
              <p className="text-[10px] text-zinc-600">Llamador Virtual de Pedidos</p>
            </div>

            {/* Número de Turno Gigante */}
            <div className="py-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                TU NÚMERO DE RETIRO
              </div>
              <div className="text-5xl font-black tracking-tight leading-none my-1">
                #{ticket.shortCode}
              </div>
              {ticket.tableOrOrderNumber && (
                <div className="text-xs font-bold text-zinc-800">
                  Ref: {ticket.tableOrOrderNumber}
                </div>
              )}
              {ticket.customerName && (
                <div className="text-xs font-medium text-zinc-700">
                  Cliente: {ticket.customerName}
                </div>
              )}
            </div>

            {/* Código QR para escanear */}
            <div className="flex flex-col items-center justify-center p-2 bg-zinc-100 rounded-lg border border-zinc-300">
              <QRCodeImage
                value={publicUrl}
                size={140}
              />
              <p className="text-[10px] font-bold text-zinc-700 mt-1.5 leading-tight">
                Escanea con la cámara de tu celular
              </p>
              <p className="text-[9px] text-zinc-500">
                Te avisará con vibración y timbre cuando esté listo
              </p>
            </div>

            {/* Pie de ticket */}
            <div className="pt-2 border-t border-dashed border-zinc-400 text-[9px] text-zinc-600 space-y-0.5">
              <p>Fecha: {new Date(ticket.createdAt).toLocaleString("es-PY")}</p>
              <p className="font-bold">¡Sin descargar apps!</p>
              <p className="text-[8px] text-zinc-500">Tecnología Vidjs Beeper OS</p>
            </div>
          </div>
        </div>

        {/* Botones de acción modal */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#263858] no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/30 cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ticket (58/80mm)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
