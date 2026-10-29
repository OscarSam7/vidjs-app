"use client";

import React, { useState, useEffect } from "react";
import {
  BookmarkPlus,
  X,
  Check,
  Tag,
  Loader2,
  Music,
  Mic,
  Headphones,
  Zap,
  FolderPlus,
} from "lucide-react";

export interface SaveToLibraryData {
  deckLabel?: string; // e.g. "Deck A", "Deck B", "Escenario Karaoke"
  title: string;
  artistName: string;
  initialGenre?: string;
  bpm?: number | null;
  key?: string | null;
  durationSeconds?: number | null;
  fileUrl?: string | null;
  defaultType?: "DJ" | "KARAOKE" | "BOTH";
}

export interface SaveToLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackData: SaveToLibraryData | null;
  onSuccess: (savedSong: any, categoryName: string, alreadyExists: boolean) => void;
  showFeedback?: (type: "success" | "error" | "info", msg: string) => void;
}

export const POPULAR_LIBRARY_CATEGORIES = [
  { value: "Cumbia / Cuarteto / Fiesta", label: "Cumbia, Cuarteto & Fiesta", shortLabel: "Cumbia / Cuarteto" },
  { value: "Reggaeton / Urbano / RKT", label: "Reggaeton, Urbano & RKT", shortLabel: "Reggaeton / RKT" },
  { value: "Electrónica / House / Dance", label: "Electrónica, House & Dance", shortLabel: "Electro / House" },
  { value: "Boliche / Pachanga / Remix", label: "Boliche, Pachanga & Remixes", shortLabel: "Boliche / Remix" },
  { value: "Rock Nacional & Clásicos", label: "Rock Nacional & Clásicos", shortLabel: "Rock Nacional" },
  { value: "Pop / Balada / Latino", label: "Pop Latino, Baladas & Hits", shortLabel: "Pop / Latino" },
  { value: "Classic Rock / Retro 80s & 90s", label: "Classic Rock & Retro 80s / 90s", shortLabel: "Classic Rock" },
  { value: "Trap / Hip Hop / R&B", label: "Trap, Hip Hop & R&B", shortLabel: "Trap / Hip Hop" },
  { value: "Karaoke / Hits Inmortales", label: "Karaoke Hits Inmortales", shortLabel: "Karaoke Hits" },
  { value: "Lounge / Previa / Chill", label: "Chill, Lounge & Previa", shortLabel: "Lounge / Chill" },
  { value: "Video Musical / Set DJ", label: "Video Musical / Set DJ Completo", shortLabel: "Video / Set" },
  { value: "Bachata / Salsa / Tropical", label: "Bachata, Salsa & Tropical", shortLabel: "Tropical / Salsa" },
  { value: "Folklore / Tradicional", label: "Folklore & Música Tradicional", shortLabel: "Folklore" },
  { value: "OTHER", label: "➕ Otra categoría personalizada...", shortLabel: "Personalizada..." },
];

export function SaveToLibraryModal({
  isOpen,
  onClose,
  trackData,
  onSuccess,
  showFeedback,
}: SaveToLibraryModalProps) {
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [category, setCategory] = useState("Cumbia / Cuarteto / Fiesta");
  const [customCategory, setCustomCategory] = useState("");
  const [type, setType] = useState<"DJ" | "KARAOKE" | "BOTH">("BOTH");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar el formulario cada vez que se abre con una pista
  useEffect(() => {
    if (trackData && isOpen) {
      setTitle(trackData.title || "");
      setArtistName(trackData.artistName || "Artista Cabina DJ");
      setType(trackData.defaultType || "BOTH");

      const match = POPULAR_LIBRARY_CATEGORIES.find(
        (c) => c.value.toLowerCase() === (trackData.initialGenre || "").toLowerCase()
      );

      if (match) {
        setCategory(match.value);
        setCustomCategory("");
      } else if (trackData.initialGenre && trackData.initialGenre.trim()) {
        setCategory("OTHER");
        setCustomCategory(trackData.initialGenre.trim());
      } else {
        // Categoría por defecto según contexto
        if (trackData.deckLabel === "Deck A") {
          setCategory("Cumbia / Cuarteto / Fiesta");
        } else if (trackData.deckLabel === "Deck B") {
          setCategory("Reggaeton / Urbano / RKT");
        } else if (trackData.deckLabel?.includes("Karaoke")) {
          setCategory("Karaoke / Hits Inmortales");
        } else {
          setCategory("Boliche / Pachanga / Remix");
        }
        setCustomCategory("");
      }
    }
  }, [trackData, isOpen]);

  // Manejo de atajo Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !trackData) return null;

  const formatSeconds = (sec?: number | null) => {
    if (!sec) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedTitle = title.trim();
    const trimmedArtist = artistName.trim();
    if (!trimmedTitle) {
      showFeedback?.("error", "El título de la canción es obligatorio.");
      return;
    }
    if (!trimmedArtist) {
      showFeedback?.("error", "El nombre del artista es obligatorio.");
      return;
    }

    let finalCategory = category;
    if (category === "OTHER") {
      finalCategory = customCategory.trim();
      if (!finalCategory) {
        showFeedback?.("error", "Por favor ingresa el nombre de la categoría personalizada.");
        return;
      }
    }

    const payload = {
      title: trimmedTitle,
      artistName: trimmedArtist,
      genre: finalCategory,
      bpm: trackData.bpm ? Math.round(trackData.bpm) : 124,
      key: trackData.key?.trim() || "8A / Am",
      durationSeconds: trackData.durationSeconds || 210,
      fileUrl: trackData.fileUrl || null,
      type: type || "BOTH",
    };

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("vidjs-library-updated", { detail: json.data }));
        }

        const msg = json.alreadyExists
          ? `ℹ️ "${trimmedTitle}" ya formaba parte de tu biblioteca en "${finalCategory}".`
          : `📚 ¡"${trimmedTitle}" guardada con éxito en la categoría "${finalCategory}"!`;
        showFeedback?.("success", msg);

        onSuccess(json.data, finalCategory, Boolean(json.alreadyExists));
        onClose();
      } else {
        showFeedback?.("error", json.error || "No se pudo guardar la canción en la biblioteca.");
      }
    } catch (err) {
      console.error("Error al guardar en biblioteca:", err);
      showFeedback?.("error", "Error de conexión al guardar en la biblioteca.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col space-y-4 p-5 animate-in zoom-in-95 duration-150 text-left"
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-950/70 border border-purple-500/40 text-purple-400">
              <BookmarkPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>Guardar en Biblioteca Musical</span>
                {trackData.deckLabel && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-zinc-800 text-purple-300 border border-purple-800/60">
                    {trackData.deckLabel}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Elige en qué categoría deseas organizar esta pista antes de aceptar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer disabled:opacity-40"
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleConfirm} className="space-y-4">
          {/* Datos de la pista (Editables) */}
          <div className="space-y-3 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
            <div>
              <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                Título de la Canción
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Tití Me Preguntó"
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                Artista / DJ
              </label>
              <input
                type="text"
                required
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="Ej: Bad Bunny"
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Badges Técnicos */}
            <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-zinc-400 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-bold text-amber-400">
                BPM: {trackData.bpm ? Math.round(trackData.bpm) : "124"}
              </span>
              <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-bold text-emerald-400">
                KEY: {trackData.key || "8A / Am"}
              </span>
              <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                DUR: {formatSeconds(trackData.durationSeconds)}
              </span>
            </div>
          </div>

          {/* Pregunta Principal: Selección de Categoría */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                <span>¿En qué categoría deseas guardarla?</span>
              </span>
              <span className="text-[10px] font-bold text-amber-400">Obligatorio</span>
            </label>

            {/* Dropdown Selector */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
            >
              {POPULAR_LIBRARY_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* Pastillas de acceso rápido */}
            <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
              {POPULAR_LIBRARY_CATEGORIES.filter((c) => c.value !== "OTHER").slice(0, 10).map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                    category === cat.value
                      ? "bg-purple-900/80 border-purple-500 text-purple-200 shadow-sm shadow-purple-900/40"
                      : "bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {cat.shortLabel || cat.label}
                </button>
              ))}
            </div>

            {/* Input adicional si selecciona "OTHER" */}
            {category === "OTHER" && (
              <div className="pt-2 animate-in fade-in duration-100">
                <label className="text-[11px] font-bold text-purple-300 block mb-1">
                  Escribe el nombre de la categoría personalizada:
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-purple-500 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-400"
                  placeholder="Ej: Tech House / Cachengue / Acústico"
                />
              </div>
            )}
          </div>

          {/* Tipo de Uso */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-300 block">
              Disponible para
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "BOTH", label: "⚡ Ambos (DJ & Karaoke)" },
                { id: "DJ", label: "🎧 Solo DJ" },
                { id: "KARAOKE", label: "🎤 Solo Karaoke" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id as any)}
                  className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center ${
                    type === t.id
                      ? "bg-zinc-800 border-purple-500 text-white shadow-sm ring-1 ring-purple-500/40"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Botones de Acción: Cancelar y Aceptar */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-900">
            <button
              type="button"
              onClick={() => !isSubmitting && onClose()}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-colors cursor-pointer border border-zinc-800 disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-950 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando en Biblioteca...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Aceptar y Guardar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
