"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Music,
  User,
  PlusCircle,
  Search,
  Sparkles,
  CheckCircle2,
  Mic,
  Disc3,
  Layers,
} from "lucide-react";

interface TableItem {
  id: string;
  number: number;
  label: string;
  zone?: string;
}

interface ManualRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  tables: TableItem[];
  onSuccess: () => void;
  isKaraokeMode?: boolean;
}

interface CatalogSongResult {
  id: string;
  title: string;
  artist: { name: string } | null;
  bpm?: number | null;
  key?: string | null;
}

export default function ManualRequestModal({
  isOpen,
  onClose,
  eventId,
  tables,
  onSuccess,
  isKaraokeMode = false,
}: ManualRequestModalProps) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [tableId, setTableId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [notes, setNotes] = useState("");
  const [directToQueue, setDirectToQueue] = useState(true);
  const [isFastPass, setIsFastPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Búsqueda en catálogo para autocompletar
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CatalogSongResult[]>([]);
  const [youtubeResults, setYoutubeResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setArtist("");
      setTableId("");
      setGuestName("");
      setNotes("");
      setDirectToQueue(true);
      setIsFastPass(false);
      setError(null);
      setSearchQuery("");
      setSearchResults([]);
      setYoutubeResults([]);
      setSelectedSongId(null);
    }
  }, [isOpen]);

  // Buscar canciones en vivo mientras escribe en el campo de búsqueda rápida
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.trim().length < 2) {
      setSearchResults([]);
      setYoutubeResults([]);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/catalog/songs?q=${encodeURIComponent(val.trim())}&limit=6`);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.data?.songs || []);
          setYoutubeResults(json.data?.youtubeResults || []);
        }
      } catch {
        setSearchResults([]);
        setYoutubeResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
  };

  const handleSelectCatalogSong = (song: CatalogSongResult) => {
    setTitle(song.title);
    setArtist(song.artist?.name || "Desconocido");
    setSelectedSongId(song.id);
    setSearchQuery("");
    setSearchResults([]);
    setYoutubeResults([]);
  };

  const handleSelectYouTubeSong = (yt: any) => {
    setTitle(yt.parsedTitle || yt.title);
    setArtist(yt.parsedArtist || yt.channelTitle || "Desconocido");
    setSelectedSongId(null);
    setSearchQuery("");
    setSearchResults([]);
    setYoutubeResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) {
      setError("Por favor ingresa tanto el título de la canción como el artista");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/dj/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          tableId: tableId || undefined,
          guestName: guestName.trim() || undefined,
          title: title.trim(),
          artist: artist.trim(),
          notes: notes.trim() || undefined,
          songId: selectedSongId || undefined,
          directToQueue,
          isFastPass,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        onSuccess();
        onClose();
      } else {
        setError(json.error?.message || "Error al crear el pedido manual");
      }
    } catch {
      setError("Error de red al comunicarse con el servidor");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-zinc-950 border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isKaraokeMode
                  ? "bg-cyan-600/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-purple-600/20 text-purple-400 border border-purple-500/30"
              }`}
            >
              {isKaraokeMode ? <Mic className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {isKaraokeMode
                  ? "➕ Cargar Cantante / Turno Manual"
                  : "➕ Cargar Pedido Manual (Fuera de App)"}
              </h3>
              <p className="text-xs text-zinc-400">
                Para pedidos pedidos en barra, de palabra o fuera del código QR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 cursor-pointer rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Buscador Rápido de Catálogo */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-3 h-3 text-purple-400" />
            <span>Buscar tema en el catálogo (Opcional):</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Escribe título o artista para autocompletar..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            {searching && (
              <span className="absolute right-3 top-2.5 text-[10px] text-zinc-500 animate-pulse">
                Buscando...
              </span>
            )}
          </div>

          {/* Resultados flotantes (Catálogo + YouTube) */}
          {(searchResults.length > 0 || youtubeResults.length > 0) && (
            <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-700 space-y-2 max-h-56 overflow-y-auto">
              {searchResults.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 font-bold block px-2 py-0.5">
                    Catálogo Local ({searchResults.length}):
                  </span>
                  {searchResults.map((song) => (
                    <button
                      key={song.id}
                      type="button"
                      onClick={() => handleSelectCatalogSong(song)}
                      className="w-full text-left p-2 rounded-lg hover:bg-purple-950/60 hover:border-purple-600/40 border border-transparent transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white group-hover:text-purple-300 truncate">
                          {song.title}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          {song.artist?.name || "Varios artistas"}
                        </div>
                      </div>
                      {song.key && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-950 text-amber-300 border border-zinc-800 ml-2 shrink-0">
                          Key: {song.key}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {youtubeResults.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-zinc-800">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold block px-2 py-0.5 flex items-center gap-1.5">
                    <span>🎬 Sugerencias de YouTube ({youtubeResults.length}):</span>
                  </span>
                  {youtubeResults.map((yt) => (
                    <button
                      key={yt.id}
                      type="button"
                      onClick={() => handleSelectYouTubeSong(yt)}
                      className="w-full text-left p-2 rounded-lg hover:bg-cyan-950/40 hover:border-cyan-500/40 border border-transparent transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                          {yt.parsedTitle || yt.title}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          {yt.parsedArtist || yt.channelTitle}
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 ml-2 shrink-0">
                        YouTube
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Formulario Principal */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Título de la canción */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                <Music className="w-3.5 h-3.5 text-cyan-400" />
                <span>Título de la Canción *</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Sweet Child O' Mine"
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Artista */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>Artista / Banda *</span>
              </label>
              <input
                type="text"
                required
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Ej. Guns N' Roses"
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Mesa Solicitante */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Mesa Asignada:</label>
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">🍸 Cabina DJ / Barra (Sin mesa fija)</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} {t.zone ? `(Sector ${t.zone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Nombre del Cantante / Comensal */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">
                {isKaraokeMode ? "Nombre del Cantante (Opcional):" : "Nombre del Solicitante:"}
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Ej. Marcos / Cumpleañera"
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          {/* Dedicatoria o Notas */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-300">
              Dedicatoria o Nota de Cabina (Opcional):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Vino a pedir a cabina / Cumpleaños de Sofía"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Destino y Prioridad */}
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Destino en la Cabina:
            </span>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-white font-medium">
                <input
                  type="radio"
                  name="destination"
                  checked={directToQueue}
                  onChange={() => setDirectToQueue(true)}
                  className="accent-purple-500"
                />
                <span>
                  {isKaraokeMode
                    ? "🎤 Poner directo en turnos de escenario (Cola)"
                    : "🚀 Cargar directo a la cola de reproducción"}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-white font-medium">
                <input
                  type="radio"
                  name="destination"
                  checked={!directToQueue}
                  onChange={() => setDirectToQueue(false)}
                  className="accent-purple-500"
                />
                <span>📥 Dejar en solicitudes pendientes</span>
              </label>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-amber-300 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={isFastPass}
                  onChange={(e) => setIsFastPass(e.target.checked)}
                  className="accent-amber-500"
                />
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>⭐ Prioridad VIP Fast-Pass</span>
                </span>
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Visible en pantalla TV</span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting || !title.trim() || !artist.trim()}
              className={`px-5 py-2 rounded-xl text-white text-xs font-black transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-lg ${
                isKaraokeMode
                  ? "bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 shadow-cyan-600/30"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/30"
              }`}
            >
              {submitting ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {directToQueue
                      ? isKaraokeMode
                        ? "Agregar al Escenario"
                        : "Agregar a la Cola"
                      : "Guardar en Pendientes"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
