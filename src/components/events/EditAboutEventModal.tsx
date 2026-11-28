"use client";

import React, { useState } from "react";
import { X, Plus, Check, Sparkles, Tag, Smile } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface EventHighlight {
  icon: string;
  label: string;
}

export const PRESET_HIGHLIGHT_OPTIONS: EventHighlight[] = [
  { icon: "🍹", label: "Open Bar" },
  { icon: "🥩", label: "Asado Libre" },
  { icon: "🍲", label: "Feijoada Libre" },
  { icon: "🎸", label: "Música en Vivo" },
  { icon: "🎸", label: "Pagode en Vivo" },
  { icon: "🎧", label: "DJ en Vivo" },
  { icon: "🎤", label: "Karaoke Libre" },
  { icon: "🎂", label: "Cumpleaños VIP" },
  { icon: "🪪", label: "Acceso con QR" },
  { icon: "🎟️", label: "Entradas Anticipadas" },
  { icon: "🍸", label: "Tragos 2x1" },
  { icon: "🍺", label: "Chopp Artesanal" },
  { icon: "🏊", label: "Piscina / Quincho" },
  { icon: "❄️", label: "Salón Climatizado" },
  { icon: "🚗", label: "Estacionamiento Privado" },
  { icon: "🔒", label: "Seguridad Privada" },
  { icon: "🍔", label: "Patio Gastronómico" },
  { icon: "🎁", label: "Sorteos y Premios" },
  { icon: "📸", label: "Spot Fotográfico / Glitter Bar" },
  { icon: "🎆", label: "Show de Luces & FX" },
  { icon: "👗", label: "Dress Code Elegante" },
  { icon: "👕", label: "Ropa Cómoda / Pileta" },
  { icon: "🍕", label: "Pizzas & Picadas" },
  { icon: "⚡", label: "Sector VIP Lounge" },
];

const QUICK_EMOJIS = [
  "🍹", "🥩", "🍲", "🎸", "🎧", "🎤", "🎂", "🪪", 
  "🍸", "🍺", "🏊", "❄️", "🚗", "🔒", "🍔", "🎁", 
  "📸", "🎆", "👗", "🍕", "⚡", "🎉", "🍾", "🔥"
];

interface EditAboutEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventCode: string;
  initialDescription?: string;
  initialHighlights?: EventHighlight[];
  onSaveSuccess: (updated: { description: string; highlights: EventHighlight[] }) => void;
}

export function EditAboutEventModal({
  isOpen,
  onClose,
  eventCode,
  initialDescription = "",
  initialHighlights = [],
  onSaveSuccess,
}: EditAboutEventModalProps) {
  const [description, setDescription] = useState(initialDescription);
  const [highlights, setHighlights] = useState<EventHighlight[]>(
    initialHighlights && initialHighlights.length > 0
      ? initialHighlights
      : [
          { icon: "🍹", label: "Open Bar" },
          { icon: "🍲", label: "Feijoada Libre" },
          { icon: "🎸", label: "Pagode en Vivo" },
          { icon: "🪪", label: "Acceso con QR" },
        ]
  );

  // Custom typing inputs
  const [customEmoji, setCustomEmoji] = useState("✨");
  const [customLabel, setCustomLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isPresetSelected = (item: EventHighlight) => {
    return highlights.some(
      (h) => h.label.toLowerCase() === item.label.toLowerCase()
    );
  };

  const handleTogglePreset = (item: EventHighlight) => {
    if (isPresetSelected(item)) {
      setHighlights((prev) =>
        prev.filter((h) => h.label.toLowerCase() !== item.label.toLowerCase())
      );
    } else {
      setHighlights((prev) => [...prev, item]);
    }
  };

  const handleRemoveHighlight = (indexToRemove: number) => {
    setHighlights((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = customLabel.trim();
    if (!cleanLabel) return;

    const cleanEmoji = customEmoji.trim() || "✨";
    // Avoid duplicate labels
    if (highlights.some((h) => h.label.toLowerCase() === cleanLabel.toLowerCase())) {
      setErrorMessage("Esta etiqueta ya fue agregada.");
      return;
    }

    setHighlights((prev) => [...prev, { icon: cleanEmoji, label: cleanLabel }]);
    setCustomLabel("");
    setErrorMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/events/public", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: eventCode,
          description: description.trim(),
          highlights,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo guardar la información.");
      }

      onSaveSuccess({
        description: description.trim(),
        highlights,
      });
      onClose();
    } catch (err: any) {
      console.error("Error saving about section:", err);
      setErrorMessage(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 text-white my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Editar "Sobre este evento"
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              Modifica la descripción y configura las etiquetas con emoticones que verán tus invitados.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="space-y-6 overflow-y-auto pr-1 flex-1 text-sm">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMessage}
            </div>
          )}

          {/* 1. Descripción */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <span>📝</span>
              <span>Descripción del evento (puedes tipear libremente):</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe la propuesta del evento, temática, barra libre, artistas invitados, requisitos o dress code..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
            />
          </div>

          {/* 2. Etiquetas Activas */}
          <div className="space-y-2.5 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                <span>Etiquetas destacadas activas ({highlights.length}):</span>
              </label>
              {highlights.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHighlights([])}
                  className="text-[11px] text-zinc-500 hover:text-rose-400 transition-colors"
                >
                  Limpiar todas
                </button>
              )}
            </div>

            {highlights.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-2">
                No hay etiquetas seleccionadas. Elige de las opciones sugeridas o escribe una personalizada abajo.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {highlights.map((h, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-600/40 text-purple-200 text-xs font-medium group transition-all"
                  >
                    <span>{h.icon}</span>
                    <span>{h.label}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveHighlight(idx)}
                      className="ml-1 text-purple-400 hover:text-rose-400 p-0.5 rounded transition-colors"
                      title="Quitar etiqueta"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Opciones predefinidas para elegir con emoticones */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-emerald-400" />
              <span>Opciones para elegir con sus emoticones (toca para activar o desactivar):</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
              {PRESET_HIGHLIGHT_OPTIONS.map((item, idx) => {
                const active = isPresetSelected(item);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleTogglePreset(item)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                      active
                        ? "bg-purple-600/20 border-purple-500 text-purple-200 shadow-sm shadow-purple-900/20 ring-1 ring-purple-500/50"
                        : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span className="truncate flex-1">{item.label}</span>
                    {active && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Tipear etiqueta personalizada */}
          <div className="space-y-2.5 p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <span>✍️</span>
              <span>Tipear etiqueta personalizada con su emoticón:</span>
            </label>

            {/* Quick emoji pills */}
            <div className="space-y-1">
              <span className="text-[11px] text-zinc-400">Elige un emoticón rápido o escribe el que quieras:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_EMOJIS.map((em, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCustomEmoji(em)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-transform active:scale-90 ${
                      customEmoji === em
                        ? "bg-purple-600/40 border border-purple-500 text-white scale-110"
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Input row */}
            <div className="flex items-center gap-2 pt-2">
              <div className="w-14">
                <input
                  type="text"
                  value={customEmoji}
                  onChange={(e) => setCustomEmoji(e.target.value)}
                  placeholder="😀"
                  maxLength={4}
                  className="w-full text-center bg-zinc-950 border border-zinc-700 rounded-xl py-2 text-base text-white focus:outline-none focus:border-purple-500"
                  title="Emoticón"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustom(e);
                    }
                  }}
                  placeholder="Ej: Barra de Gin Tonic, Cancha de Padel, Sector Relax..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              <Button
                type="button"
                onClick={handleAddCustom}
                disabled={!customLabel.trim()}
                variant="secondary"
                className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white border-none rounded-xl text-xs px-3.5 py-2 font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800/80 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
            className="text-zinc-400 hover:text-white rounded-xl text-xs px-4"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs px-5 py-2.5 shadow-lg shadow-purple-600/30 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Guardar cambios</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
