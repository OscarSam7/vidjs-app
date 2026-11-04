"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccreditation } from "@/lib/accreditation/context";
import {
  Tags,
  Plus,
  Edit,
  Trash2,
  Users,
  Shield,
  Clock,
  DoorOpen,
  Sparkles,
  Check,
  X,
  Loader2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

const COLOR_PRESETS = [
  "#8B5CF6", // Purple (VIP)
  "#3B82F6", // Blue (General)
  "#10B981", // Emerald (Staff)
  "#EC4899", // Pink (Prensa)
  "#F59E0B", // Amber (Expositor)
  "#EF4444", // Red (Seguridad / Autoridades)
  "#06B6D4", // Cyan (Técnico)
  "#6366F1", // Indigo (Invitado)
  "#14B8A6", // Teal (Organizador)
  "#84CC16", // Lime (Proveedor)
];

const PRESET_TEMPLATES = [
  { name: "VIP", code: "VIP", color: "#8B5CF6", desc: "Acceso total y áreas preferenciales" },
  { name: "Prensa & Medios", code: "PRENSA", color: "#EC4899", desc: "Acceso a sala de prensa y sesiones" },
  { name: "Staff & Producción", code: "STAFF", color: "#10B981", desc: "Personal organizador y operativo" },
  { name: "Conferencista / Speaker", code: "SPEAKER", color: "#F59E0B", desc: "Acceso a escenario y backstage" },
  { name: "Expositor / Stand", code: "EXPO", color: "#06B6D4", desc: "Acceso a feria y montaje" },
  { name: "Invitado Especial", code: "INVITADO", color: "#6366F1", desc: "Acceso preferente a eventos principales" },
  { name: "Seguridad", code: "SEGURIDAD", color: "#EF4444", desc: "Control perimetral y accesos restringidos" },
  { name: "Participante General", code: "GENERAL", color: "#3B82F6", desc: "Acceso a conferencias y áreas generales" },
];

export default function AccreditationTypesPage() {
  const { activeEvent, activeEventId, setCreateEventModalOpen } = useAccreditation();
  const [types, setTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<any | null>(null);

  const fetchTypes = useCallback(async () => {
    if (!activeEventId) {
      setTypes([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/accreditation/types?eventId=${activeEventId}`);
      if (res.ok) {
        const json = await res.json();
        setTypes(json.types || []);
      }
    } catch (err) {
      console.error("Error loading accreditation types:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeEventId]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${name}"?`)) return;

    try {
      const res = await fetch(`/api/v1/accreditation/types/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Error al eliminar");
        return;
      }
      fetchTypes();
    } catch (err) {
      alert("Error al comunicarse con el servidor");
    }
  };

  const handleOpenCreate = () => {
    setEditingType(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (t: any) => {
    setEditingType(t);
    setModalOpen(true);
  };

  if (!activeEventId) {
    return (
      <div className="py-16 text-center bg-[#0F1E36] border border-[#263858] rounded-2xl p-8 max-w-xl mx-auto">
        <Tags className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-2">Selecciona un Evento</h3>
        <p className="text-xs text-slate-400 mb-5">
          Debes seleccionar o crear un evento para configurar sus categorías de acreditación.
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60">
              {activeEvent?.name}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Tags className="w-5 h-5 text-purple-400" />
            Tipos de Acreditación & Categorías
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Personaliza colores identificadores, cupos máximos, horarios y reglas de acceso
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreate}
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Categoría</span>
        </Button>
      </div>

      {/* Preset Suggestions Quick Bar */}
      <div className="bg-[#0F1E36] border border-[#263858] rounded-xl p-3.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
          Plantillas Rápidas Frecuentes
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.code}
              onClick={() => {
                setEditingType({
                  name: tmpl.name,
                  code: tmpl.code,
                  colorHex: tmpl.color,
                  description: tmpl.desc,
                  allowReentry: true,
                });
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0A1322] hover:bg-[#13233F] border border-[#263858] text-xs font-medium text-slate-300 transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tmpl.color }} />
              <span>{tmpl.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Types Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
          Cargando categorías...
        </div>
      ) : types.length === 0 ? (
        <div className="py-16 text-center bg-[#0F1E36] border border-[#263858] rounded-2xl p-8">
          <Tags className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Sin categorías configuradas</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
            Crea categorías como VIP, Prensa, Staff o Participante para asignar permisos y diseñar credenciales.
          </p>
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Crear Primera Categoría
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map((cat) => (
            <div
              key={cat.id}
              className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-600 transition-colors relative overflow-hidden"
            >
              {/* Colored top bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: cat.colorHex }}
              />

              <div className="flex items-start justify-between gap-3 pt-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: cat.colorHex }}
                    />
                    <h3 className="text-base font-bold text-white">{cat.name}</h3>
                  </div>
                  <span className="text-[11px] font-mono text-purple-300 font-bold ml-5 block">
                    CÓDIGO: {cat.code}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 text-slate-400 hover:text-white"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="p-1.5 text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {cat.description && (
                <p className="text-xs text-slate-400 line-clamp-2">{cat.description}</p>
              )}

              {/* Badges / Rules Strip */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#263858]/60 text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-400 block">Cupo Máximo</span>
                  <span className="font-mono font-semibold">
                    {cat.maxAvailable ? `${cat.maxAvailable} personas` : "Ilimitado"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Reingreso</span>
                  <span className="font-semibold text-emerald-400">
                    {cat.allowReentry ? "Permitido" : "Ingreso único"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Horario Permitido</span>
                  <span className="font-mono text-[11px] text-slate-300">
                    {cat.allowedStartTime && cat.allowedEndTime
                      ? `${cat.allowedStartTime} - ${cat.allowedEndTime}`
                      : "24hs / Todo el día"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Registrados</span>
                  <span className="font-mono font-bold text-purple-300">
                    {cat._count?.participants || 0}
                  </span>
                </div>
              </div>

              {/* Credential color sample preview */}
              <div
                className="rounded-lg p-2 flex items-center justify-between text-xs font-bold font-mono tracking-wider shadow-inner"
                style={{
                  backgroundColor: cat.colorHex,
                  color: cat.textColorHex || "#FFFFFF",
                }}
              >
                <span>CREDENTIAL PREVIEW</span>
                <span>[{cat.code}]</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Create/Edit Modal */}
      {modalOpen && (
        <TypeModal
          isOpen={modalOpen}
          initialData={editingType}
          eventId={activeEventId}
          onClose={() => {
            setModalOpen(false);
            setEditingType(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setEditingType(null);
            fetchTypes();
          }}
        />
      )}
    </div>
  );
}

function TypeModal({
  isOpen,
  initialData,
  eventId,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  initialData: any | null;
  eventId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = Boolean(initialData?.id);
  const [name, setName] = useState(initialData?.name || "");
  const [code, setCode] = useState(initialData?.code || "");
  const [colorHex, setColorHex] = useState(initialData?.colorHex || "#3B82F6");
  const [textColorHex, setTextColorHex] = useState(initialData?.textColorHex || "#FFFFFF");
  const [description, setDescription] = useState(initialData?.description || "");
  const [maxAvailable, setMaxAvailable] = useState(
    initialData?.maxAvailable ? String(initialData.maxAvailable) : ""
  );
  const [allowedStartTime, setAllowedStartTime] = useState(initialData?.allowedStartTime || "");
  const [allowedEndTime, setAllowedEndTime] = useState(initialData?.allowedEndTime || "");
  const [allowReentry, setAllowReentry] = useState(
    initialData?.allowReentry !== undefined ? initialData.allowReentry : true
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (!isEditing && !code.trim())) {
      setError("Nombre y código son obligatorios");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const endpoint = isEditing
        ? `/api/v1/accreditation/types/${initialData.id}`
        : "/api/v1/accreditation/types";
      const method = isEditing ? "PATCH" : "POST";

      const payload: any = {
        name: name.trim(),
        colorHex,
        textColorHex,
        description: description.trim() || null,
        maxAvailable: maxAvailable ? parseInt(maxAvailable, 10) : null,
        allowedStartTime: allowedStartTime.trim() || null,
        allowedEndTime: allowedEndTime.trim() || null,
        allowReentry,
      };

      if (!isEditing) {
        payload.eventId = eventId;
        payload.code = code.trim().toUpperCase();
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al guardar categoría");
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0F1E36] border border-[#263858] rounded-2xl p-6 shadow-2xl text-[#F8FAFC]">
        <div className="flex items-center justify-between pb-4 border-b border-[#263858]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-600/50 flex items-center justify-center text-purple-300">
              <Tags className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? "Editar Categoría" : "Nueva Categoría de Acreditación"}
              </h3>
              <p className="text-xs text-slate-400">
                Define color identificador, código y restricciones de acceso
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre de la Categoría *
              </label>
              <Input
                type="text"
                placeholder="Ej: VIP, Prensa, Disertante"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!isEditing && !code) {
                    setCode(e.target.value.substring(0, 5).toUpperCase());
                  }
                }}
                required
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Código Único *
              </label>
              <Input
                type="text"
                placeholder="Ej: VIP, PRESS, STAFF"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={isEditing}
                required
                className="bg-[#0A1322] border-[#263858] text-white font-mono uppercase"
              />
            </div>
          </div>

          {/* Color Picker & Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Color Identificador de Credencial
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-[#263858]"
              />
              <Input
                type="text"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="w-32 bg-[#0A1322] border-[#263858] text-white font-mono text-xs uppercase"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setColorHex(color)}
                    className={cn(
                      "w-6 h-6 rounded-full border transition-transform",
                      colorHex.toLowerCase() === color.toLowerCase()
                        ? "scale-125 border-white shadow-md ring-2 ring-purple-500"
                        : "border-transparent hover:scale-110"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cupo Disponible Máximo
              </label>
              <Input
                type="number"
                placeholder="Dejar vacío para ilimitado"
                min="1"
                value={maxAvailable}
                onChange={(e) => setMaxAvailable(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-semibold select-none">
                <input
                  type="checkbox"
                  checked={allowReentry}
                  onChange={(e) => setAllowReentry(e.target.checked)}
                  className="rounded border-[#263858] text-purple-600 focus:ring-purple-500 w-4 h-4 bg-[#0A1322]"
                />
                Permitir reingreso (salida y retorno)
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hora de Inicio Permitida
              </label>
              <Input
                type="time"
                value={allowedStartTime}
                onChange={(e) => setAllowedStartTime(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hora de Cierre Permitida
              </label>
              <Input
                type="time"
                value={allowedEndTime}
                onChange={(e) => setAllowedEndTime(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descripción o Permisos Especiales
            </label>
            <Input
              type="text"
              placeholder="Ej: Acceso a backstage, sala de prensa y catering"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-[#0A1322] border-[#263858] text-white"
            />
          </div>

          {/* Credential Live Preview Bar */}
          <div
            className="rounded-xl p-3 flex items-center justify-between font-mono font-bold text-xs shadow-md"
            style={{ backgroundColor: colorHex, color: textColorHex }}
          >
            <span>{name.toUpperCase() || "CATEGORÍA"}</span>
            <span>[{code.toUpperCase() || "CODE"}]</span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-[#263858] text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : isEditing ? (
                "Guardar Cambios"
              ) : (
                "Crear Categoría"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
