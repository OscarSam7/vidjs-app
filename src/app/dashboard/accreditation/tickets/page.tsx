"use client";

import React, { useState, useEffect } from "react";
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
  X,
  Check,
  RotateCcw,
  Sliders,
  Type,
  Palette,
  Barcode,
  Image as ImageIcon,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export interface TicketTemplate {
  id: string;
  name: string;
  format: "100x200" | "80mm_thermal" | "pvc_cr80" | "wristband";
  font: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  isDefault: boolean;
  widthMm: number;
  heightMm: number;
  showFlyer: boolean;
  showQr: boolean;
  showBarcode: boolean;
  showPrice: boolean;
  showDocument: boolean;
  showOrganizer: boolean;
  showTerms: boolean;
  termsText: string;
  flyerUrl: string;
}

const DEFAULT_TEMPLATES: TicketTemplate[] = [
  {
    id: "tpl_flyer_default",
    name: "Flyer + Datos (Estándar RedTicket)",
    format: "100x200",
    font: "Concierto Bold",
    accentColor: "#DC2626", // Red-600
    backgroundColor: "#FFFFFF",
    textColor: "#111827",
    isDefault: true,
    widthMm: 100,
    heightMm: 200,
    showFlyer: true,
    showQr: true,
    showBarcode: false,
    showPrice: true,
    showDocument: true,
    showOrganizer: true,
    showTerms: true,
    termsText: "Válido para 1 solo ingreso. No se aceptan cambios ni devoluciones. Prohibido el reingreso.",
    flyerUrl:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "tpl_thermal_80mm",
    name: "Térmico Directo 80mm (Rollo Taquilla)",
    format: "80mm_thermal",
    font: "Cyber Mono",
    accentColor: "#7C3AED", // Purple-600
    backgroundColor: "#FFFFFF",
    textColor: "#000000",
    isDefault: false,
    widthMm: 80,
    heightMm: 140,
    showFlyer: false,
    showQr: true,
    showBarcode: true,
    showPrice: true,
    showDocument: true,
    showOrganizer: true,
    showTerms: true,
    termsText: "ENTRADA OFICIAL REDTICKET - CONSERVE ESTE COMPROBANTE AL INGRESAR",
    flyerUrl: "",
  },
  {
    id: "tpl_vip_pvc",
    name: "Gafete VIP & Backstage (PVC CR80)",
    format: "pvc_cr80",
    font: "Modern Sans",
    accentColor: "#F59E0B", // Amber VIP
    backgroundColor: "#0A1322",
    textColor: "#FFFFFF",
    isDefault: false,
    widthMm: 85,
    heightMm: 54,
    showFlyer: true,
    showQr: true,
    showBarcode: false,
    showPrice: false,
    showDocument: true,
    showOrganizer: true,
    showTerms: false,
    termsText: "ACCESO TOTAL EXCLUSIVO - VÁLIDO CON DOCUMENTO DE IDENTIDAD",
    flyerUrl:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80",
  },
];

export default function TicketTemplatesPage() {
  const [templates, setTemplates] = useState<TicketTemplate[]>(DEFAULT_TEMPLATES);
  const [activeTemplateId, setActiveTemplateId] = useState<string>("tpl_flyer_default");
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TicketTemplate | null>(null);
  const [activeEditTab, setActiveEditTab] = useState<"design" | "elements" | "format" | "preview_data">("design");
  const [savedToastMessage, setSavedToastMessage] = useState<string | null>(null);
  const [isInsertOptionModalOpen, setIsInsertOptionModalOpen] = useState(false);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionValue, setNewOptionValue] = useState("");
  const [customFields, setCustomFields] = useState<Array<{ id: string; label: string; value: string }>>([
    { id: "opt_sector", label: "Sector / Puerta", value: "VIP Deck - Puerta 1" },
    { id: "opt_mesa", label: "Mesa / Camarota", value: "Mesa VIP #07" },
  ]);

  // Sample data for real-time ticket preview
  const [sampleData, setSampleData] = useState({
    eventName: "TARDEZINHA DA CROCCO",
    date: "14 nov. 2026",
    time: "21:00 hs",
    clientName: "Juan Pérez",
    documentType: "CI",
    documentNumber: "4.512.890",
    ticketCode: "TKT-20261114-001",
    organizer: "Rumba Stage",
    tierName: "VIP",
    price: "Gs 150.000",
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vidjs_ticket_templates");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTemplates(parsed);
          setActiveTemplateId(parsed[0].id);
        }
      }
    } catch {}
  }, []);

  const saveTemplatesToStorage = (newTemplates: TicketTemplate[]) => {
    setTemplates(newTemplates);
    try {
      localStorage.setItem("vidjs_ticket_templates", JSON.stringify(newTemplates));
    } catch {}
  };

  const activeTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0];

  const handleUpdateActiveTemplate = (updates: Partial<TicketTemplate>) => {
    const updated = templates.map((t) =>
      t.id === activeTemplate.id ? { ...t, ...updates } : t
    );
    setTemplates(updated);
  };

  const handleSaveCurrentLiveTemplate = () => {
    saveTemplatesToStorage(templates);
    setSavedToastMessage(`¡Plantilla "${activeTemplate.name}" guardada y actualizada exitosamente!`);
    setTimeout(() => setSavedToastMessage(null), 3500);
  };

  const handleInsertNewOption = () => {
    if (!newOptionName.trim()) return;
    const newField = {
      id: `opt_${Date.now()}`,
      label: newOptionName.trim(),
      value: newOptionValue.trim() || "Configurado",
    };
    setCustomFields((prev) => [...prev, newField]);
    setNewOptionName("");
    setNewOptionValue("");
    setIsInsertOptionModalOpen(false);
    setSavedToastMessage(`¡Nueva opción "${newField.label}" agregada a la plantilla!`);
    setTimeout(() => setSavedToastMessage(null), 3500);
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleOpenEdit = (template: TicketTemplate) => {
    setEditingTemplate({ ...template });
    setActiveEditTab("design");
    setIsEditingModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingTemplate) return;
    const updated = templates.map((t) => (t.id === editingTemplate.id ? editingTemplate : t));
    saveTemplatesToStorage(updated);
    setIsEditingModalOpen(false);
  };

  const handleSetDefault = (id: string) => {
    const updated = templates.map((t) => ({
      ...t,
      isDefault: t.id === id,
    }));
    saveTemplatesToStorage(updated);
  };

  const handleCreateNewTemplate = (name: string, format: TicketTemplate["format"]) => {
    const newTpl: TicketTemplate = {
      id: `tpl_${Date.now()}`,
      name,
      format,
      font: "Concierto Bold",
      accentColor: "#7C3AED",
      backgroundColor: "#FFFFFF",
      textColor: "#111827",
      isDefault: false,
      widthMm: format === "80mm_thermal" ? 80 : format === "pvc_cr80" ? 85 : 100,
      heightMm: format === "80mm_thermal" ? 140 : format === "pvc_cr80" ? 54 : 200,
      showFlyer: format !== "80mm_thermal",
      showQr: true,
      showBarcode: format === "80mm_thermal",
      showPrice: true,
      showDocument: true,
      showOrganizer: true,
      showTerms: true,
      termsText: "Boleto emitido por RedTicket Suite. Entrada intransferible.",
      flyerUrl:
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    };

    const updated = [...templates, newTpl];
    saveTemplatesToStorage(updated);
    setActiveTemplateId(newTpl.id);
    setIsNewTemplateModalOpen(false);
    handleOpenEdit(newTpl);
  };

  const handleDeleteTemplate = (id: string) => {
    if (templates.length <= 1) {
      alert("Debes conservar al menos una plantilla.");
      return;
    }
    if (!confirm("¿Deseas eliminar esta plantilla de ticket?")) return;
    const updated = templates.filter((t) => t.id !== id);
    saveTemplatesToStorage(updated);
    setActiveTemplateId(updated[0].id);
    setIsEditingModalOpen(false);
  };

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
            Diseña, personaliza y configura opciones para tus boletos oficiales (Térmicos, PVC y PDF)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrinterModalOpen(true)}
            className="border-[#263858] hover:border-slate-500 text-xs text-slate-300 gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Impresoras</span>
          </Button>

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
            onClick={() => setIsNewTemplateModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs gap-1.5 shadow-md shadow-purple-900/40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nueva Plantilla</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column (Cards gallery + Quick options) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Plantillas Disponibles ({templates.length})</span>
            </h2>
            <span className="text-xs text-slate-400">Selecciona una para previsualizar o editar</span>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {templates.map((tpl) => {
              const isSelected = tpl.id === activeTemplateId;

              return (
                <div
                  key={tpl.id}
                  onClick={() => setActiveTemplateId(tpl.id)}
                  className={cn(
                    "bg-[#0A1322] border-2 rounded-2xl p-4 shadow-xl relative overflow-hidden cursor-pointer transition-all flex flex-col justify-between group",
                    isSelected
                      ? "border-purple-500 shadow-purple-950/30 ring-1 ring-purple-500/40"
                      : "border-[#263858] hover:border-slate-500"
                  )}
                >
                  <div>
                    {/* Header of card */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                          style={{
                            backgroundColor: `${tpl.accentColor}20`,
                            color: tpl.accentColor,
                            borderColor: `${tpl.accentColor}40`,
                          }}
                        >
                          <Ticket className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white truncate">{tpl.name}</h3>
                          <span className="text-[10px] text-slate-400 block truncate font-mono">
                            {tpl.widthMm}x{tpl.heightMm}mm • {tpl.font}
                          </span>
                        </div>
                      </div>

                      {tpl.isDefault ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                          Por Defecto
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(tpl.id);
                          }}
                          className="text-[10px] text-slate-500 hover:text-slate-300 underline shrink-0"
                        >
                          Fijar defecto
                        </button>
                      )}
                    </div>

                    {/* Mini Ticket Miniature */}
                    <div className="w-full h-44 bg-zinc-950/80 rounded-xl border border-zinc-800 flex items-center justify-center p-2.5 overflow-hidden relative">
                      <div
                        className="rounded-lg shadow-lg p-2 text-[7px] font-sans flex flex-col justify-between border"
                        style={{
                          width: tpl.format === "pvc_cr80" ? "140px" : "110px",
                          height: tpl.format === "pvc_cr80" ? "90px" : "145px",
                          backgroundColor: tpl.backgroundColor,
                          color: tpl.textColor,
                          borderColor: `${tpl.accentColor}40`,
                        }}
                      >
                        {tpl.showFlyer && tpl.flyerUrl ? (
                          <div className="w-full h-10 rounded overflow-hidden relative shrink-0">
                            <img src={tpl.flyerUrl} alt="Flyer" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 flex items-end p-1">
                              <span className="text-[6px] font-bold text-white truncate drop-shadow">
                                {sampleData.eventName}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center font-bold border-b pb-0.5 text-[7px]">
                            {sampleData.organizer}
                          </div>
                        )}

                        <div className="space-y-0.5 py-1 text-[6px]">
                          <div className="font-extrabold truncate">{sampleData.eventName}</div>
                          <div className="text-gray-500 text-[5.5px]">
                            {sampleData.date} • {sampleData.time}
                          </div>
                          <div className="font-semibold truncate">{sampleData.clientName}</div>
                          <div className="font-mono font-bold" style={{ color: tpl.accentColor }}>
                            {sampleData.ticketCode}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-gray-200 text-[6.5px] font-black">
                          <span style={{ color: tpl.accentColor }}>{sampleData.tierName}</span>
                          {tpl.showPrice && <span className="font-mono">{sampleData.price}</span>}
                        </div>

                        {tpl.showQr && (
                          <div className="w-7 h-7 mx-auto bg-white rounded border border-gray-300 flex items-center justify-center p-0.5 mt-0.5">
                            <QrCode className="w-full h-full text-black" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-4 pt-3 border-t border-[#263858] flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {tpl.format === "80mm_thermal" ? "Térmico Rollo" : "Formato Tarjeta"}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(tpl);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(tpl);
                          setActiveEditTab("elements");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#0F1E36] hover:bg-[#162947] text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Sliders className="w-3.5 h-3.5 text-blue-400" />
                        <span>Configurar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Options Bar for Selected Template */}
          <div className="bg-[#0A1322] border border-[#263858] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Opciones Rápidas: {activeTemplate.name}</span>
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsInsertOptionModalOpen(true)}
                  className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 hover:text-white border border-purple-500/40 text-xs gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insertar Opción</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEdit(activeTemplate)}
                  className="border-[#263858] text-xs text-slate-300 hover:text-white"
                >
                  Abrir Editor Completo
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeTemplate.showFlyer}
                  onChange={(e) => {
                    handleUpdateActiveTemplate({ showFlyer: e.target.checked });
                  }}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Mostrar Flyer</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeTemplate.showQr}
                  onChange={(e) => {
                    handleUpdateActiveTemplate({ showQr: e.target.checked });
                  }}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Código QR</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeTemplate.showPrice}
                  onChange={(e) => {
                    handleUpdateActiveTemplate({ showPrice: e.target.checked });
                  }}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Mostrar Precio</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeTemplate.showDocument}
                  onChange={(e) => {
                    handleUpdateActiveTemplate({ showDocument: e.target.checked });
                  }}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Cédula / DNI</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right column: High-fidelity Live Ticket Preview (WYSIWYG) & Real-time Editor */}
        <div className="lg:col-span-5 space-y-4">
          {/* Header de Vista Previa con Botón de Guardado Prominente */}
          <div className="bg-[#0A1322] border border-[#263858] rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Vista Previa & Edición en Vivo
                </h3>
              </div>

              <Button
                size="sm"
                onClick={handleSaveCurrentLiveTemplate}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Modificación</span>
              </Button>
            </div>

            {/* Alerta de guardado exitoso */}
            {savedToastMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{savedToastMessage}</span>
              </div>
            )}

            {/* Controles rápidos de edición en vivo */}
            <div className="space-y-3 pt-2 border-t border-[#263858] text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Nombre Plantilla</label>
                  <Input
                    value={activeTemplate.name}
                    onChange={(e) => handleUpdateActiveTemplate({ name: e.target.value })}
                    className="bg-[#080F1F] border-[#263858] text-xs h-8 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Tipografía</label>
                  <select
                    value={activeTemplate.font}
                    onChange={(e) => handleUpdateActiveTemplate({ font: e.target.value })}
                    className="w-full bg-[#080F1F] border border-[#263858] rounded-xl px-2.5 py-1.5 text-white text-xs h-8"
                  >
                    <option value="Concierto Bold">Concierto Bold</option>
                    <option value="Modern Sans">Modern Sans</option>
                    <option value="Cyber Mono">Cyber Mono</option>
                  </select>
                </div>
              </div>

              {/* Colores en vivo */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Color de Acento</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeTemplate.accentColor}
                      onChange={(e) => handleUpdateActiveTemplate({ accentColor: e.target.value })}
                      className="w-8 h-8 rounded-lg bg-transparent border border-[#263858] cursor-pointer"
                    />
                    <Input
                      value={activeTemplate.accentColor}
                      onChange={(e) => handleUpdateActiveTemplate({ accentColor: e.target.value })}
                      className="bg-[#080F1F] border-[#263858] text-white text-xs h-8 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Fondo del Boleto</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeTemplate.backgroundColor}
                      onChange={(e) => handleUpdateActiveTemplate({ backgroundColor: e.target.value })}
                      className="w-8 h-8 rounded-lg bg-transparent border border-[#263858] cursor-pointer"
                    />
                    <Input
                      value={activeTemplate.backgroundColor}
                      onChange={(e) => handleUpdateActiveTemplate({ backgroundColor: e.target.value })}
                      className="bg-[#080F1F] border-[#263858] text-white text-xs h-8 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Flyer URL */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">URL Flyer Oficial</label>
                <Input
                  value={activeTemplate.flyerUrl}
                  onChange={(e) => handleUpdateActiveTemplate({ flyerUrl: e.target.value })}
                  placeholder="https://..."
                  className="bg-[#080F1F] border-[#263858] text-xs h-8 text-white"
                />
              </div>

              {/* Términos y Cláusulas */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Términos al Pie del Boleto</label>
                <textarea
                  rows={2}
                  value={activeTemplate.termsText}
                  onChange={(e) => handleUpdateActiveTemplate({ termsText: e.target.value })}
                  placeholder="Válido para 1 solo ingreso..."
                  className="w-full bg-[#080F1F] border border-[#263858] rounded-xl p-2 text-white text-[11px]"
                />
              </div>

              {/* Botón Insertar Opción */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  {customFields.length} opciones / campos extras
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsInsertOptionModalOpen(true)}
                  className="border-[#263858] text-purple-300 hover:text-white text-xs gap-1 h-7"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Agregar Opción al Ticket</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Ticket Canvas Container */}
          <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-800 flex items-center justify-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* The Ticket Simulation */}
            <div
              className="rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all border"
              style={{
                width: activeTemplate.format === "pvc_cr80" ? "320px" : "280px",
                backgroundColor: activeTemplate.backgroundColor,
                color: activeTemplate.textColor,
                fontFamily:
                  activeTemplate.font === "Cyber Mono"
                    ? "monospace"
                    : activeTemplate.font === "Modern Sans"
                    ? "system-ui, sans-serif"
                    : "inherit",
                borderColor: `${activeTemplate.accentColor}60`,
              }}
            >
              {/* Header Flyer */}
              {activeTemplate.showFlyer && activeTemplate.flyerUrl && (
                <div className="h-36 w-full relative overflow-hidden bg-zinc-900 shrink-0">
                  <img
                    src={activeTemplate.flyerUrl}
                    alt="Flyer Oficial"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3 text-white">
                    <span className="text-xs font-black uppercase tracking-wide block drop-shadow-md truncate">
                      {sampleData.eventName}
                    </span>
                    <span className="text-[10px] text-zinc-300 font-medium">
                      {sampleData.organizer}
                    </span>
                  </div>
                </div>
              )}

              {/* Ticket Body Info */}
              <div className="p-4 space-y-3 text-xs flex-1 flex flex-col justify-between">
                {/* Date & Schedule */}
                <div className="flex items-center justify-between pb-2 border-b border-gray-200/80 text-[11px] font-bold">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    {sampleData.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    {sampleData.time}
                  </span>
                </div>

                {/* Client info */}
                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase font-bold text-gray-400">Titular de la Entrada</div>
                  <div className="font-extrabold text-sm">{sampleData.clientName}</div>
                  {activeTemplate.showDocument && (
                    <div className="text-[10px] font-mono text-gray-500">
                      {sampleData.documentType}: {sampleData.documentNumber}
                    </div>
                  )}
                </div>

                {/* Campos Extras Insertados */}
                {customFields.length > 0 && (
                  <div className="space-y-1 py-1.5 border-y border-dashed border-gray-300/60">
                    {customFields.map((field) => (
                      <div key={field.id} className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-400 font-bold uppercase text-[8px]">{field.label}:</span>
                        <span className="font-extrabold" style={{ color: activeTemplate.accentColor }}>
                          {field.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ticket code & Organizer */}
                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase font-bold text-gray-400">Código de Boleta</div>
                  <div
                    className="font-mono font-black text-sm tracking-wider"
                    style={{ color: activeTemplate.accentColor }}
                  >
                    {sampleData.ticketCode}
                  </div>
                  {activeTemplate.showOrganizer && (
                    <div className="text-[10px] text-gray-500">
                      Organiza: <strong className="font-bold">{sampleData.organizer}</strong>
                    </div>
                  )}
                </div>

                {/* Category & Price */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200/80">
                  <span
                    className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: `${activeTemplate.accentColor}20`,
                      color: activeTemplate.accentColor,
                    }}
                  >
                    {sampleData.tierName}
                  </span>
                  {activeTemplate.showPrice && (
                    <span className="text-sm font-black font-mono" style={{ color: activeTemplate.accentColor }}>
                      {sampleData.price}
                    </span>
                  )}
                </div>

                {/* QR Code / Barcode */}
                {activeTemplate.showQr && (
                  <div className="pt-2 text-center flex flex-col items-center">
                    <div className="p-2 bg-white rounded-xl border-2 border-gray-800 shadow-inner">
                      <QrCode className="w-24 h-24 text-black" />
                    </div>
                    <span className="text-[9px] font-mono text-gray-400 mt-1 uppercase tracking-widest">
                      Validación en Puerta
                    </span>
                  </div>
                )}

                {activeTemplate.showBarcode && (
                  <div className="pt-2 text-center flex flex-col items-center">
                    <div className="p-1 bg-white rounded border border-gray-400 flex items-center justify-center">
                      <Barcode className="w-40 h-8 text-black" />
                    </div>
                    <span className="text-[8px] font-mono text-gray-500 mt-0.5">
                      {sampleData.ticketCode}
                    </span>
                  </div>
                )}

                {/* Terms text */}
                {activeTemplate.showTerms && activeTemplate.termsText && (
                  <div className="pt-2 border-t border-gray-200/60 text-[8px] text-gray-400 leading-tight text-center">
                    {activeTemplate.termsText}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customize Sample Data Accordion */}
          <div className="bg-[#0A1322] border border-[#263858] rounded-2xl p-4 text-xs space-y-3">
            <div className="font-bold text-slate-300 flex items-center gap-2">
              <Type className="w-4 h-4 text-purple-400" />
              <span>Probar con Datos Personalizados</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Nombre Evento</label>
                <Input
                  value={sampleData.eventName}
                  onChange={(e) => setSampleData({ ...sampleData, eventName: e.target.value })}
                  className="bg-[#080F1F] border-[#263858] text-xs h-8 text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Comprador</label>
                <Input
                  value={sampleData.clientName}
                  onChange={(e) => setSampleData({ ...sampleData, clientName: e.target.value })}
                  className="bg-[#080F1F] border-[#263858] text-xs h-8 text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Categoría / Tipo</label>
                <Input
                  value={sampleData.tierName}
                  onChange={(e) => setSampleData({ ...sampleData, tierName: e.target.value })}
                  className="bg-[#080F1F] border-[#263858] text-xs h-8 text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Precio</label>
                <Input
                  value={sampleData.price}
                  onChange={(e) => setSampleData({ ...sampleData, price: e.target.value })}
                  className="bg-[#080F1F] border-[#263858] text-xs h-8 text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL EXTRA: INSERTAR NUEVA OPCIÓN / CAMPO AL TICKET */}
      {isInsertOptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0A1322] border border-[#263858] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#263858] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Insertar Opción en Plantilla</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsInsertOptionModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Agrega campos específicos al boleto como sector de acceso, número de mesa, promotor o patrocinador.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Nombre del Campo / Opción</label>
                <Input
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  placeholder="Ej: Sector, Mesa, Sponsor Oficial, Puerta..."
                  className="bg-[#080F1F] border-[#263858] text-white text-xs h-9"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Valor por Defecto / Muestra</label>
                <Input
                  value={newOptionValue}
                  onChange={(e) => setNewOptionValue(e.target.value)}
                  placeholder="Ej: Camarotes VIP #12"
                  className="bg-[#080F1F] border-[#263858] text-white text-xs h-9"
                />
              </div>

              {customFields.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] text-slate-400 block mb-1.5 font-bold">Opciones Actuales:</span>
                  <div className="space-y-1.5">
                    {customFields.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#080F1F] border border-[#263858]"
                      >
                        <div>
                          <span className="font-bold text-white">{f.label}: </span>
                          <span className="text-slate-400">{f.value}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(f.id)}
                          className="text-red-400 hover:text-red-300 p-1 text-xs"
                          title="Eliminar campo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#263858]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsInsertOptionModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cerrar
              </Button>
              <Button
                size="sm"
                onClick={handleInsertNewOption}
                disabled={!newOptionName.trim()}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold gap-1 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar al Ticket</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: EDITAR PLANTILLA COMPLETA */}
      {isEditingModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0A1322] border border-[#263858] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#263858] flex items-center justify-between bg-[#0F1E36]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Editar Plantilla: {editingTemplate.name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Ajusta el diseño, tipografías, dimensiones y campos visibles
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditingModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs inside editor */}
            <div className="flex border-b border-[#263858] bg-[#080F1F] px-4 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveEditTab("design")}
                className={cn(
                  "py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors",
                  activeEditTab === "design"
                    ? "border-purple-500 text-purple-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                )}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Diseño & Flyer</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveEditTab("elements")}
                className={cn(
                  "py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors",
                  activeEditTab === "elements"
                    ? "border-purple-500 text-purple-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                )}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Campos & Opciones</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveEditTab("format")}
                className={cn(
                  "py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors",
                  activeEditTab === "format"
                    ? "border-purple-500 text-purple-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                )}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Dimensiones & Impresión</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* TAB 1: DISEÑO & FLYER */}
              {activeEditTab === "design" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1.5">
                      Nombre de la Plantilla
                    </label>
                    <Input
                      value={editingTemplate.name}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, name: e.target.value })
                      }
                      className="bg-[#080F1F] border-[#263858] text-white text-xs h-9"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1.5">
                      URL del Flyer / Imagen de Cabecera
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={editingTemplate.flyerUrl}
                        onChange={(e) =>
                          setEditingTemplate({ ...editingTemplate, flyerUrl: e.target.value })
                        }
                        placeholder="https://ejemplo.com/poster.jpg"
                        className="bg-[#080F1F] border-[#263858] text-white text-xs h-9 flex-1"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Recomendado: proporción 16:9 o 4:3 en formato JPG o PNG de alta resolución.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-300 font-bold block mb-1.5">
                        Tipografía / Estilo de Fuente
                      </label>
                      <select
                        value={editingTemplate.font}
                        onChange={(e) =>
                          setEditingTemplate({ ...editingTemplate, font: e.target.value })
                        }
                        className="w-full bg-[#080F1F] border border-[#263858] rounded-xl px-3 py-2 text-white text-xs h-9"
                      >
                        <option value="Concierto Bold">Concierto Bold (Impacto / Show)</option>
                        <option value="Modern Sans">Modern Sans (Limpia / Minimalista)</option>
                        <option value="Cyber Mono">Cyber Mono (Ticket Máquina / Tech)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-300 font-bold block mb-1.5">
                        Color de Acento / Resalte
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editingTemplate.accentColor}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              accentColor: e.target.value,
                            })
                          }
                          className="w-9 h-9 rounded-lg bg-transparent border border-[#263858] cursor-pointer"
                        />
                        <Input
                          value={editingTemplate.accentColor}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              accentColor: e.target.value,
                            })
                          }
                          className="bg-[#080F1F] border-[#263858] text-white text-xs h-9 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-300 font-bold block mb-1.5">
                        Color de Fondo del Boleto
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editingTemplate.backgroundColor}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              backgroundColor: e.target.value,
                            })
                          }
                          className="w-9 h-9 rounded-lg bg-transparent border border-[#263858] cursor-pointer"
                        />
                        <Input
                          value={editingTemplate.backgroundColor}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              backgroundColor: e.target.value,
                            })
                          }
                          className="bg-[#080F1F] border-[#263858] text-white text-xs h-9 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-300 font-bold block mb-1.5">
                        Color del Texto
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editingTemplate.textColor}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              textColor: e.target.value,
                            })
                          }
                          className="w-9 h-9 rounded-lg bg-transparent border border-[#263858] cursor-pointer"
                        />
                        <Input
                          value={editingTemplate.textColor}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              textColor: e.target.value,
                            })
                          }
                          className="bg-[#080F1F] border-[#263858] text-white text-xs h-9 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CAMPOS & OPCIONES VISIBLES */}
              {activeEditTab === "elements" && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-[#080F1F] border border-[#263858] text-slate-300">
                    <span className="font-bold text-white block mb-1">
                      Elementos a Imprimir en el Boleto
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Activa o desactiva qué secciones saldrán impresas en cada ticket emitido.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between p-3 rounded-xl bg-[#080F1F] border border-[#263858] cursor-pointer">
                      <div>
                        <strong className="text-white block">Flyer / Banner Superior</strong>
                        <span className="text-[11px] text-slate-400">Póster del evento</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={editingTemplate.showFlyer}
                        onChange={(e) =>
                          setEditingTemplate({ ...editingTemplate, showFlyer: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-purple-600"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-[#080F1F] border border-[#263858] cursor-pointer">
                      <div>
                        <strong className="text-white block">Código QR Criptográfico</strong>
                        <span className="text-[11px] text-slate-400">Para escáner en puerta</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={editingTemplate.showQr}
                        onChange={(e) =>
                          setEditingTemplate({ ...editingTemplate, showQr: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-purple-600"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-[#080F1F] border border-[#263858] cursor-pointer">
                      <div>
                        <strong className="text-white block">Código de Barras 1D</strong>
                        <span className="text-[11px] text-slate-400">Para lectores láser USB</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={editingTemplate.showBarcode}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            showBarcode: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded text-purple-600"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-[#080F1F] border border-[#263858] cursor-pointer">
                      <div>
                        <strong className="text-white block">Importe / Precio</strong>
                        <span className="text-[11px] text-slate-400">Monto pagado en Gs</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={editingTemplate.showPrice}
                        onChange={(e) =>
                          setEditingTemplate({ ...editingTemplate, showPrice: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-purple-600"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-[#080F1F] border border-[#263858] cursor-pointer">
                      <div>
                        <strong className="text-white block">Cédula CI / Pasaporte</strong>
                        <span className="text-[11px] text-slate-400">Titular de la entrada</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={editingTemplate.showDocument}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            showDocument: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded text-purple-600"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-[#080F1F] border border-[#263858] cursor-pointer">
                      <div>
                        <strong className="text-white block">Nombre de la Productora</strong>
                        <span className="text-[11px] text-slate-400">Organizador oficial</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={editingTemplate.showOrganizer}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            showOrganizer: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded text-purple-600"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1.5">
                      Términos, Condiciones & Cláusulas
                    </label>
                    <textarea
                      rows={3}
                      value={editingTemplate.termsText}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, termsText: e.target.value })
                      }
                      className="w-full bg-[#080F1F] border border-[#263858] rounded-xl p-3 text-white text-xs"
                      placeholder="Texto legal al pie del ticket..."
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: DIMENSIONES & IMPRESIÓN */}
              {activeEditTab === "format" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-300 font-bold block mb-1.5">
                        Tipo de Formato Base
                      </label>
                      <select
                        value={editingTemplate.format}
                        onChange={(e) => {
                          const val = e.target.value as TicketTemplate["format"];
                          let w = 100;
                          let h = 200;
                          if (val === "80mm_thermal") {
                            w = 80;
                            h = 140;
                          } else if (val === "pvc_cr80") {
                            w = 85;
                            h = 54;
                          } else if (val === "wristband") {
                            w = 25;
                            h = 250;
                          }
                          setEditingTemplate({
                            ...editingTemplate,
                            format: val,
                            widthMm: w,
                            heightMm: h,
                          });
                        }}
                        className="w-full bg-[#080F1F] border border-[#263858] rounded-xl px-3 py-2 text-white text-xs h-9"
                      >
                        <option value="100x200">100 x 200 mm (Boleto Oficial Largo)</option>
                        <option value="80mm_thermal">80 mm Rollo Térmico Directo (Boletería)</option>
                        <option value="pvc_cr80">85 x 54 mm PVC / Gafete Rígido</option>
                        <option value="wristband">25 x 250 mm Pulsera Térmica</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-300 font-bold block mb-1.5">Ancho (mm)</label>
                        <Input
                          type="number"
                          value={editingTemplate.widthMm}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              widthMm: Number(e.target.value) || 80,
                            })
                          }
                          className="bg-[#080F1F] border-[#263858] text-white text-xs h-9"
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 font-bold block mb-1.5">Alto (mm)</label>
                        <Input
                          type="number"
                          value={editingTemplate.heightMm}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              heightMm: Number(e.target.value) || 140,
                            })
                          }
                          className="bg-[#080F1F] border-[#263858] text-white text-xs h-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200">
                    <strong className="block mb-1">Compatibilidad Directa de Hardware</strong>
                    <p className="text-[11px] text-purple-300">
                      Esta plantilla es compatible con el comando de impresión del navegador,
                      impresoras térmicas ESC/POS (Epson, Bixolon, Xprinter) e impresoras de credenciales Zebra/Fargo.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#263858] bg-[#0F1E36] flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteTemplate(editingTemplate.id)}
                className="border-red-900/60 text-red-400 hover:bg-red-950 text-xs gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs gap-1.5 shadow-md shadow-purple-900/40 font-bold"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Cambios</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREAR NUEVA PLANTILLA */}
      {isNewTemplateModalOpen && (
        <CreateNewTemplateModal
          isOpen={isNewTemplateModalOpen}
          onClose={() => setIsNewTemplateModalOpen(false)}
          onCreate={handleCreateNewTemplate}
        />
      )}

      {/* MODAL 3: AJUSTES DE IMPRESORA */}
      {isPrinterModalOpen && (
        <PrinterSettingsModal
          isOpen={isPrinterModalOpen}
          onClose={() => setIsPrinterModalOpen(false)}
          onPrintTest={handlePrintTest}
        />
      )}
    </div>
  );
}

function CreateNewTemplateModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, format: TicketTemplate["format"]) => void;
}) {
  const [name, setName] = useState("");
  const [format, setFormat] = useState<TicketTemplate["format"]>("100x200");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0A1322] border border-[#263858] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#263858] pb-3">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Nueva Plantilla de Ticket</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-bold block mb-1">Nombre de la Plantilla *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Boleto General Preventa 2026"
              className="bg-[#080F1F] border-[#263858] text-white text-xs h-9"
            />
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1">Formato Físico</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as TicketTemplate["format"])}
              className="w-full bg-[#080F1F] border border-[#263858] rounded-xl px-3 py-2 text-white text-xs h-9"
            >
              <option value="100x200">100 x 200 mm (Boleto Largo con Flyer)</option>
              <option value="80mm_thermal">80 mm Rollo Térmico (Boletería Rápida)</option>
              <option value="pvc_cr80">85 x 54 mm PVC / Gafete VIP</option>
              <option value="wristband">25 x 250 mm Pulsera Térmica</option>
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-[#263858]">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!name.trim()}
            onClick={() => onCreate(name.trim(), format)}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
          >
            Crear y Configurar
          </Button>
        </div>
      </div>
    </div>
  );
}

function PrinterSettingsModal({
  isOpen,
  onClose,
  onPrintTest,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPrintTest: () => void;
}) {
  const [driver, setDriver] = useState("browser_dialog");
  const [density, setDensity] = useState("203dpi");
  const [autoCut, setAutoCut] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0A1322] border border-[#263858] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#263858] pb-3">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">Configuración de Impresora</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-bold block mb-1">Controlador / Método</label>
            <select
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              className="w-full bg-[#080F1F] border border-[#263858] rounded-xl px-3 py-2 text-white text-xs h-9"
            >
              <option value="browser_dialog">Diálogo Estándar del Sistema (Cualquier Impresora)</option>
              <option value="esc_pos">Comando Directo ESC/POS (Epson / Zebra)</option>
              <option value="pdf_bulk">Generador PDF para Impresión Masiva</option>
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1">Resolución / Densidad</label>
            <select
              value={density}
              onChange={(e) => setDensity(e.target.value)}
              className="w-full bg-[#080F1F] border border-[#263858] rounded-xl px-3 py-2 text-white text-xs h-9"
            >
              <option value="203dpi">203 DPI (Estándar Térmico)</option>
              <option value="300dpi">300 DPI (Alta Definición QR)</option>
            </select>
          </div>

          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoCut}
              onChange={(e) => setAutoCut(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span>Enviar comando de corte automático al finalizar ticket</span>
          </label>
        </div>

        <div className="pt-2 flex justify-between items-center border-t border-[#263858]">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrintTest}
            className="border-purple-600 text-purple-300 text-xs gap-1"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Probar Impresión</span>
          </Button>

          <Button
            size="sm"
            onClick={onClose}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
          >
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  );
}
