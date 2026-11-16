"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Ticket,
  Printer,
  Sparkles,
  QrCode,
  Edit,
  Eye,
  CheckCircle2,
  Copy,
  Plus,
  Settings,
  Layers,
  FileText,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export default function TicketTemplatesPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "designer">("templates");
  const [selectedFormat, setSelectedFormat] = useState<"100x200" | "80mm_thermal" | "a4_3up">("100x200");
  const [showFlyer, setShowFlyer] = useState(true);
  const [showQr, setShowQr] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [ticketFont, setTicketFont] = useState("Concierto Bold");

  const [previewData, setPreviewData] = useState({
    eventName: "TARDEZINHA DA CROCCO",
    date: "14 nov. 2026",
    time: "21:00 hs",
    clientName: "Juan Pérez",
    ticketCode: "TKT-20261114-001",
    organizer: "Rumba Stage",
    tierName: "VIP",
    price: "Gs 150.000",
    flyerUrl:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80",
  });

  const handlePrintTest = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#263858]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Plantillas de Ticket
            </h1>
            <Badge variant="primary" className="text-[10px] font-mono px-2 py-0.5">
              RedTicket Print Engine
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Diseña y personaliza tus boletos para cada evento (Impresión térmica, gafetes y boletas PDF)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintTest}
            className="border-[#263858] hover:border-purple-500 text-xs text-purple-300 gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Muestra</span>
          </Button>
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs gap-1.5 shadow-md shadow-purple-900/40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nueva Plantilla</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Templates gallery & Customizer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Template Card 1 (Active as in user screenshot) */}
            <div className="bg-[#0A1322] border-2 border-purple-500/80 rounded-2xl p-4 shadow-xl relative overflow-hidden group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Flyer + Datos</h3>
                    <span className="text-[11px] text-slate-400">100x200mm • Concierto Bold</span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Por Defecto
                </span>
              </div>

              {/* Mini Preview inside card */}
              <div className="w-full h-48 bg-zinc-900/90 rounded-xl border border-zinc-800 flex items-center justify-center p-3 overflow-hidden relative">
                <div className="w-28 bg-white rounded-lg shadow-md p-1.5 text-[8px] text-black font-sans flex flex-col justify-between h-40">
                  {/* Mock flyer */}
                  <div className="w-full h-12 bg-amber-500 rounded flex items-center justify-center text-white text-[7px] font-bold uppercase overflow-hidden relative">
                    <img
                      src={previewData.flyerUrl}
                      alt="Flyer preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                  </div>
                  <div className="space-y-0.5 text-[6px] py-1 border-b border-dashed border-gray-300">
                    <div className="font-bold truncate">{previewData.eventName}</div>
                    <div className="text-gray-500">{previewData.date} • {previewData.time}</div>
                    <div className="font-medium text-gray-700 truncate">{previewData.clientName}</div>
                    <div className="font-mono text-purple-800 font-bold">{previewData.ticketCode}</div>
                  </div>
                  <div className="flex items-center justify-between text-[7px] font-bold">
                    <span className="text-purple-700">{previewData.tierName}</span>
                    <span className="text-emerald-700 font-mono">{previewData.price}</span>
                  </div>
                  {/* Mock QR */}
                  <div className="w-10 h-10 mx-auto bg-gray-100 rounded border border-gray-300 flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-black" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-[#263858] flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Compatible con Epson / Zebra</span>
                <button
                  type="button"
                  className="text-xs text-purple-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>
            </div>

            {/* Template Card 2: Formato Térmico 80mm */}
            <div className="bg-[#0A1322] border border-[#263858] rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-[#38517c] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-300">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Térmico Directo 80mm</h3>
                    <span className="text-[11px] text-slate-400">80mm Rollo • Rápido</span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  Activa
                </span>
              </div>

              <div className="w-full h-48 bg-zinc-900/90 rounded-xl border border-zinc-800 flex items-center justify-center p-3 overflow-hidden">
                <div className="w-24 bg-white rounded-lg shadow-md p-1.5 text-[8px] text-black font-mono flex flex-col justify-between h-40 border border-gray-300">
                  <div className="text-center font-bold border-b pb-1 text-[7px]">
                    *** REDTICKET ***
                    <div className="text-[6px] text-gray-500">{previewData.organizer}</div>
                  </div>
                  <div className="text-[6px] space-y-0.5">
                    <div className="font-bold">{previewData.eventName}</div>
                    <div>{previewData.date}</div>
                    <div className="font-bold text-purple-700">{previewData.tierName}</div>
                    <div className="text-emerald-700">{previewData.price}</div>
                  </div>
                  <div className="w-8 h-8 mx-auto bg-gray-100 rounded border border-gray-300 flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-black" />
                  </div>
                  <div className="text-center text-[5px] text-gray-400">VALIDO 1 INGRESO</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#263858] flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Ideal boletería y taquilla</span>
                <button
                  type="button"
                  className="text-xs text-blue-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Configurar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Configuration Controls */}
          <div className="bg-[#0A1322] border border-[#263858] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-400" />
              <span>Ajustes de Impresión y Elementos Visibles</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="flex items-center gap-2 p-3 rounded-xl bg-[#080F1F] border border-[#263858] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFlyer}
                  onChange={(e) => setShowFlyer(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Incluir Flyer en Cabecera</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-[#080F1F] border border-[#263858] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showQr}
                  onChange={(e) => setShowQr(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Código QR Criptográfico</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-[#080F1F] border border-[#263858] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Mostrar Importe / Precio</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right column: High-fidelity Live Ticket Preview (Image 5 replica) */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>Vista Previa en Tiempo Real (100x200mm)</span>
          </h3>

          <div className="bg-zinc-800/80 p-5 rounded-3xl border border-zinc-700/80 flex items-center justify-center shadow-2xl">
            {/* The physical ticket simulation */}
            <div className="w-[260px] bg-white rounded-2xl shadow-2xl overflow-hidden font-sans text-black border border-gray-200 flex flex-col">
              {/* Header Flyer */}
              {showFlyer && (
                <div className="h-32 w-full relative bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center overflow-hidden">
                  <img
                    src={previewData.flyerUrl}
                    alt="Flyer oficial"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <span className="absolute bottom-2 left-3 text-white font-black text-xs drop-shadow-md">
                    {previewData.eventName}
                  </span>
                </div>
              )}

              {/* Body Info */}
              <div className="p-4 space-y-3 text-xs">
                {/* Date and Time */}
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 text-[11px] font-bold text-gray-700">
                  <span>{previewData.date}</span>
                  <span>{previewData.time}</span>
                </div>

                {/* Client & Ticket Code */}
                <div className="space-y-1">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Cliente</div>
                  <div className="font-extrabold text-sm text-gray-900">{previewData.clientName}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Boleta</div>
                  <div className="font-mono font-bold text-purple-700">{previewData.ticketCode}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Organizador</div>
                  <div className="text-gray-800 font-semibold">{previewData.organizer}</div>
                </div>

                {/* Tier & Price */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-xs font-black text-red-600 uppercase tracking-wide">
                    {previewData.tierName}
                  </span>
                  {showPrice && (
                    <span className="text-xs font-black text-red-600 font-mono">
                      {previewData.price}
                    </span>
                  )}
                </div>

                {/* QR Code */}
                {showQr && (
                  <div className="pt-2 text-center flex flex-col items-center">
                    <div className="p-2 bg-white rounded-xl border-2 border-gray-800 shadow-inner">
                      <QrCode className="w-24 h-24 text-black" />
                    </div>
                    <span className="text-[9px] font-mono text-gray-400 mt-1 uppercase tracking-widest">
                      Escanear al Ingreso
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
