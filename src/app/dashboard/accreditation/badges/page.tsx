"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAccreditation } from "@/lib/accreditation/context";
import {
  IdCard,
  Printer,
  Sparkles,
  Layers,
  Settings2,
  CheckCircle2,
  Users,
  QrCode,
  Download,
  Eye,
  Check,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

type BadgeFormat = "VERTICAL_A6" | "HORIZONTAL_CARD" | "PVC_CR80" | "THERMAL_LABEL" | "WRISTBAND";

export default function BadgeDesignerPage() {
  const { activeEvent, activeEventId, setCreateEventModalOpen } = useAccreditation();

  const [categories, setCategories] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<BadgeFormat>("VERTICAL_A6");

  // Customization options
  const [showPhoto, setShowPhoto] = useState(true);
  const [showCompany, setShowCompany] = useState(true);
  const [showJobTitle, setShowJobTitle] = useState(true);
  const [showLogo, setShowLogo] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");

  const [isLoading, setIsLoading] = useState(true);

  // Selected participants for bulk print
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Load Categories & Participants
  useEffect(() => {
    if (!activeEventId) return;

    setIsLoading(true);
    Promise.all([
      fetch(`/api/v1/accreditation/types?eventId=${activeEventId}`).then((r) => r.json()),
      fetch(`/api/v1/accreditation/participants?eventId=${activeEventId}&limit=100`).then((r) =>
        r.json()
      ),
    ])
      .then(([typesData, partsData]) => {
        setCategories(typesData.types || []);
        const parts = partsData.participants || [];
        setParticipants(parts);
        // Pre-select all participants by default
        setSelectedIds(new Set(parts.map((p: any) => p.id)));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [activeEventId]);

  const filteredParticipants = useMemo(() => {
    if (selectedCategoryId === "ALL") return participants;
    return participants.filter((p) => p.accreditationTypeId === selectedCategoryId);
  }, [participants, selectedCategoryId]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredParticipants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredParticipants.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!activeEventId) {
    return (
      <div className="py-16 text-center bg-[#0F1E36] border border-[#263858] rounded-2xl p-8 max-w-xl mx-auto">
        <IdCard className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-2">Selecciona un Evento</h3>
        <p className="text-xs text-slate-400 mb-5">
          Debes seleccionar un evento activo para diseñar e imprimir credenciales.
        </p>
        <Button
          variant="primary"
          onClick={() => setCreateEventModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
        >
          Crear Evento
        </Button>
      </div>
    );
  }

  // Preview participant (the first selected or first filtered)
  const sampleParticipant =
    filteredParticipants.find((p) => selectedIds.has(p.id)) ||
    filteredParticipants[0] || {
      firstName: "Nombre",
      lastName: "Apellido",
      documentNumber: "1234567",
      documentType: "CI",
      company: "Empresa de Ejemplo",
      jobTitle: "Cargo / Rol",
      accreditationType: {
        name: "VIP",
        code: "VIP",
        colorHex: "#8B5CF6",
        textColorHex: "#FFFFFF",
      },
      accreditation: {
        codeNumber: "EVT-VIP-0001",
        qrCodeUrl: "",
      },
    };

  return (
    <div className="space-y-6">
      {/* Hide controls when printing */}
      <div className="print:hidden space-y-6">
        {/* Top Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60">
                {activeEvent?.name}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <IdCard className="w-5 h-5 text-purple-400" />
              Diseñador & Generador de Credenciales
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Plantillas personalizadas para A6, PVC CR80, etiquetas térmicas y pulseras con impresión masiva
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              onClick={handlePrint}
              disabled={selectedIds.size === 0}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-2 shadow-md text-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Seleccionados ({selectedIds.size})</span>
            </Button>
          </div>
        </div>

        {/* Two-Column Editor Layout: Settings on Left, Live Preview on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Column (1/3) */}
          <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-sm space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Settings2 className="w-4 h-4 text-purple-400" />
                Formato de Credencial
              </h3>

              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: "VERTICAL_A6", name: "Credencial Vertical A6", desc: "105 x 148 mm (Conferencias y Congresos)" },
                  { id: "HORIZONTAL_CARD", name: "Credencial Horizontal", desc: "90 x 60 mm (Bolsillo / Lanyard)" },
                  { id: "PVC_CR80", name: "Tarjeta PVC CR80", desc: "85.6 x 54 mm (Formato Tarjeta de Crédito)" },
                  { id: "THERMAL_LABEL", name: "Etiqueta Térmica", desc: "50 x 25 mm (Impresora Zebra / Brother)" },
                  { id: "WRISTBAND", name: "Pulsera de Acceso", desc: "254 x 19 mm (Festivales y Fiestas)" },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setSelectedFormat(fmt.id as BadgeFormat)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      selectedFormat === fmt.id
                        ? "bg-[#0A1322] border-purple-500 text-white shadow-sm ring-1 ring-purple-500"
                        : "bg-[#0A1322]/50 border-[#263858] text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <strong className="text-xs block text-white">{fmt.name}</strong>
                    <span className="text-[11px] text-slate-400">{fmt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Elements Visibility */}
            <div className="pt-4 border-t border-[#263858]/60 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Elementos Visibles
              </h4>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLogo}
                  onChange={(e) => setShowLogo(e.target.checked)}
                  className="rounded border-[#263858] text-purple-600 focus:ring-purple-500"
                />
                Mostrar Logo / Nombre del Evento
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCompany}
                  onChange={(e) => setShowCompany(e.target.checked)}
                  className="rounded border-[#263858] text-purple-600 focus:ring-purple-500"
                />
                Mostrar Empresa / Institución
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showJobTitle}
                  onChange={(e) => setShowJobTitle(e.target.checked)}
                  className="rounded border-[#263858] text-purple-600 focus:ring-purple-500"
                />
                Mostrar Cargo / Rol
              </label>
            </div>

            {/* Category Filter for batch selection */}
            <div className="pt-4 border-t border-[#263858]/60 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Filtrar por Categoría
              </h4>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full bg-[#0A1322] border border-[#263858] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="ALL">Todas las Categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Preview Column (2/3) */}
          <div className="lg:col-span-2 bg-[#0F1E36] border border-[#263858] rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[480px]">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-400" />
              Vista Previa en Tiempo Real ({selectedFormat})
            </span>

            {/* Render Preview according to selected format */}
            <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 shadow-inner flex items-center justify-center">
              <BadgeCard
                format={selectedFormat}
                participant={sampleParticipant}
                eventName={activeEvent?.name || "CONGRESO VIDJEIS 2026"}
                showLogo={showLogo}
                showCompany={showCompany}
                showJobTitle={showJobTitle}
              />
            </div>
          </div>
        </div>

        {/* Selection List for Bulk Printing */}
        <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Participantes para Impresión Masiva</h3>
              <span className="text-xs text-slate-400">
                ({selectedIds.size} de {filteredParticipants.length} seleccionados)
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="border-[#263858] text-xs text-purple-300"
            >
              {selectedIds.size === filteredParticipants.length ? "Deseleccionar Todos" : "Seleccionar Todos"}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {filteredParticipants.map((p) => {
              const isSelected = selectedIds.has(p.id);
              const cat = p.accreditationType;

              return (
                <div
                  key={p.id}
                  onClick={() => toggleSelectOne(p.id)}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all",
                    isSelected
                      ? "bg-[#0A1322] border-purple-500 text-white"
                      : "bg-[#0A1322]/40 border-[#263858] text-slate-400 hover:text-slate-200"
                  )}
                >
                  <div className="truncate mr-2">
                    <span className="font-semibold block truncate">
                      {p.firstName} {p.lastName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {p.accreditation?.codeNumber || p.documentNumber}
                    </span>
                  </div>

                  {cat && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.colorHex }}
                      title={cat.name}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PRINT-ONLY CONTAINER (Rendered exclusively when window.print() is triggered) */}
      <div className="hidden print:block print:w-full print:m-0 print:p-0">
        <div className="grid grid-cols-2 gap-4">
          {filteredParticipants
            .filter((p) => selectedIds.has(p.id))
            .map((p) => (
              <div key={p.id} className="break-inside-avoid p-2">
                <BadgeCard
                  format={selectedFormat}
                  participant={p}
                  eventName={activeEvent?.name || "EVENTO"}
                  showLogo={showLogo}
                  showCompany={showCompany}
                  showJobTitle={showJobTitle}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Badge Card Visual Components
// ----------------------------------------------------

function BadgeCard({
  format,
  participant,
  eventName,
  showLogo,
  showCompany,
  showJobTitle,
}: {
  format: BadgeFormat;
  participant: any;
  eventName: string;
  showLogo: boolean;
  showCompany: boolean;
  showJobTitle: boolean;
}) {
  const cat = participant.accreditationType || {
    name: "GENERAL",
    code: "GEN",
    colorHex: "#3B82F6",
    textColorHex: "#FFFFFF",
  };
  const acc = participant.accreditation;

  if (format === "HORIZONTAL_CARD" || format === "PVC_CR80") {
    // Horizontal format
    return (
      <div className="w-[340px] h-[216px] bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-300 flex flex-col justify-between relative font-sans">
        {/* Top Header Ribbon with Event Name */}
        <div className="p-3 pb-2 border-b border-slate-200 flex items-center justify-between">
          <span className="font-extrabold text-xs uppercase tracking-tight line-clamp-1 text-slate-800">
            {showLogo ? eventName : ""}
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-500">
            {acc?.codeNumber}
          </span>
        </div>

        {/* Content Body: Name + Company on left, QR on right */}
        <div className="px-4 py-2 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-extrabold text-slate-900 leading-tight">
              {participant.firstName} {participant.lastName}
            </h3>
            {showCompany && participant.company && (
              <p className="text-xs font-semibold text-slate-700">{participant.company}</p>
            )}
            {showJobTitle && participant.jobTitle && (
              <p className="text-[11px] text-slate-500">{participant.jobTitle}</p>
            )}
            <p className="text-[10px] font-mono text-slate-400 pt-1">
              Doc: {participant.documentType} {participant.documentNumber}
            </p>
          </div>

          <div className="shrink-0 p-1 bg-white border border-slate-300 rounded-lg shadow-sm">
            {acc?.qrCodeUrl ? (
              <img src={acc.qrCodeUrl} alt="QR" className="w-16 h-16 object-contain" />
            ) : (
              <div className="w-16 h-16 flex items-center justify-center text-[9px] text-slate-400">
                QR CODE
              </div>
            )}
          </div>
        </div>

        {/* Bottom Category Bar */}
        <div
          className="py-1.5 px-4 font-mono font-black text-center text-xs tracking-widest uppercase shadow-md"
          style={{ backgroundColor: cat.colorHex, color: cat.textColorHex || "#FFFFFF" }}
        >
          {cat.name}
        </div>
      </div>
    );
  }

  if (format === "THERMAL_LABEL") {
    // Thermal Sticker (compact)
    return (
      <div className="w-[220px] h-[130px] bg-white text-black p-2.5 rounded border border-black flex flex-col justify-between font-mono">
        <div className="flex items-center justify-between border-b border-black pb-1">
          <span className="text-[9px] font-bold truncate max-w-[130px]">{eventName}</span>
          <span className="text-[9px] font-black uppercase">[{cat.code}]</span>
        </div>

        <div className="flex items-center justify-between gap-1">
          <div>
            <div className="text-xs font-black leading-tight">
              {participant.firstName} {participant.lastName}
            </div>
            {participant.company && (
              <div className="text-[9px] font-bold text-gray-700 truncate max-w-[120px]">
                {participant.company}
              </div>
            )}
            <div className="text-[8px] text-gray-600">{participant.documentNumber}</div>
          </div>
          {acc?.qrCodeUrl && (
            <img src={acc.qrCodeUrl} alt="QR" className="w-12 h-12 object-contain" />
          )}
        </div>

        <div className="text-[8px] text-center font-bold tracking-wider pt-0.5 border-t border-black">
          {acc?.codeNumber}
        </div>
      </div>
    );
  }

  if (format === "WRISTBAND") {
    // Wristband Pulsera
    return (
      <div className="w-[360px] h-[48px] bg-white text-black rounded border border-slate-300 flex items-center justify-between px-3 font-mono">
        <div
          className="h-full w-3 -ml-3"
          style={{ backgroundColor: cat.colorHex }}
        />
        <div className="truncate px-2">
          <div className="text-[10px] font-extrabold uppercase leading-none truncate">
            {participant.firstName} {participant.lastName}
          </div>
          <div className="text-[8px] text-slate-500 font-bold">{eventName}</div>
        </div>
        <div
          className="px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0"
          style={{ backgroundColor: cat.colorHex, color: "#FFFFFF" }}
        >
          {cat.name}
        </div>
        {acc?.qrCodeUrl && (
          <img src={acc.qrCodeUrl} alt="QR" className="w-8 h-8 ml-2 object-contain" />
        )}
      </div>
    );
  }

  // Default: VERTICAL_A6 (Standard Conference Badge)
  return (
    <div className="w-[280px] h-[390px] bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-300 flex flex-col justify-between font-sans relative">
      {/* Top Header */}
      <div className="p-4 pb-2 text-center border-b border-slate-200">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">
          CREDENTIAL ID
        </span>
        <h4 className="font-extrabold text-sm uppercase tracking-tight text-slate-800 line-clamp-1">
          {showLogo ? eventName : ""}
        </h4>
      </div>

      {/* Center: Photo / QR / Name */}
      <div className="px-5 py-2 text-center space-y-2 flex-1 flex flex-col items-center justify-center">
        {/* Large Centered QR Code */}
        <div className="p-2 bg-white border-2 border-slate-200 rounded-xl shadow-md inline-block">
          {acc?.qrCodeUrl ? (
            <img src={acc.qrCodeUrl} alt="QR Code" className="w-28 h-28 object-contain" />
          ) : (
            <div className="w-28 h-28 flex items-center justify-center text-xs text-slate-400">
              QR CODE
            </div>
          )}
        </div>

        <div className="space-y-0.5">
          <h3 className="text-lg font-black text-slate-900 leading-tight">
            {participant.firstName} {participant.lastName}
          </h3>
          {showCompany && participant.company && (
            <p className="text-xs font-semibold text-slate-700">{participant.company}</p>
          )}
          {showJobTitle && participant.jobTitle && (
            <p className="text-[11px] text-slate-500">{participant.jobTitle}</p>
          )}
        </div>

        <div className="text-[10px] font-mono text-slate-400">
          Doc: {participant.documentType} {participant.documentNumber}
        </div>
      </div>

      {/* Bottom Sequential Code & Color Banner */}
      <div>
        <div className="text-center font-mono text-[10px] font-bold text-slate-500 pb-1">
          {acc?.codeNumber}
        </div>
        <div
          className="py-2.5 px-4 font-mono font-black text-center text-sm tracking-widest uppercase shadow-md"
          style={{ backgroundColor: cat.colorHex, color: cat.textColorHex || "#FFFFFF" }}
        >
          {cat.name}
        </div>
      </div>
    </div>
  );
}
