"use client";

import { useState } from "react";
import {
  X,
  Search,
  Tv,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Play,
  Music,
  Youtube,
  Radio,
} from "lucide-react";

interface KaraokeVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSongTitle: string;
  currentSongArtist: string;
  results: Array<{
    id: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
    embedUrl: string;
  }>;
  selectedVideoId: string | null;
  onSelectVideo: (videoId: string, title?: string) => void;
  onSearch: (customQuery: string) => void;
  isSearching: boolean;
  isTvVideoEnabled: boolean;
  onToggleTvVideo: (enabled: boolean) => void;
}

export default function KaraokeVideoModal({
  isOpen,
  onClose,
  currentSongTitle,
  currentSongArtist,
  results,
  selectedVideoId,
  onSelectVideo,
  onSearch,
  isSearching,
  isTvVideoEnabled,
  onToggleTvVideo,
}: KaraokeVideoModalProps) {
  const [searchQuery, setSearchQuery] = useState(
    `${currentSongTitle} ${currentSongArtist}`.trim()
  );
  const [customLinkInput, setCustomLinkInput] = useState("");
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleApplyCustomLink = () => {
    const raw = customLinkInput.trim();
    if (!raw) return;

    let vid = raw;
    // Si pegaron una URL completa de YouTube
    if (raw.includes("youtube.com/watch")) {
      try {
        const u = new URL(raw);
        vid = u.searchParams.get("v") || raw;
      } catch {}
    } else if (raw.includes("youtu.be/")) {
      const parts = raw.split("youtu.be/");
      if (parts[1]) {
        vid = parts[1].split("?")[0];
      }
    }

    onSelectVideo(vid, `Pista Personalizada (${vid})`);
    setCustomLinkInput("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl rounded-3xl bg-zinc-950 border-2 border-cyan-500/40 shadow-2xl shadow-cyan-950/50 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header del Modal */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between bg-gradient-to-r from-zinc-950 via-cyan-950/20 to-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              <Youtube className="w-5 h-5 text-red-500 fill-red-500" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Pistas de Karaoke en YouTube</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">
                  Gratis ($0)
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Selecciona la versión ideal con letra sincronizada para proyectar en la TV
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Control de Proyección en TV */}
        <div className="px-4 sm:px-5 py-3 bg-zinc-900/60 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isTvVideoEnabled ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
              }`}
            />
            <span className="text-xs font-bold text-zinc-200">
              {isTvVideoEnabled
                ? "📺 Video activo en pantalla gigante de TV"
                : "📺 Video pausado en TV (mostrando vinilo)"}
            </span>
          </div>

          <button
            onClick={() => onToggleTvVideo(!isTvVideoEnabled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              isTvVideoEnabled
                ? "bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-600"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{isTvVideoEnabled ? "Video en TV: ON" : "Video en TV: OFF"}</span>
          </button>
        </div>

        {/* Buscador de Pistas */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar canción, artista o versión (ej: Bohemian Rhapsody tono mujer)..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-cyan-500 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-md shadow-cyan-600/30"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isSearching ? "Buscando..." : "Buscar"}</span>
            </button>
          </form>

          {/* Pegar Link Directo de YouTube */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customLinkInput}
              onChange={(e) => setCustomLinkInput(e.target.value)}
              placeholder="O pega link directo de YouTube (ej: https://www.youtube.com/watch?v=...)"
              className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-300 placeholder-zinc-600 outline-none"
            />
            <button
              type="button"
              onClick={handleApplyCustomLink}
              disabled={!customLinkInput.trim()}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold cursor-pointer disabled:opacity-40 transition-colors"
            >
              Proyectar Link
            </button>
          </div>
        </div>

        {/* Lista de Resultados de YouTube */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {previewVideoId && (
            <div className="p-3 rounded-2xl bg-zinc-900 border border-cyan-500/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-300">Previsualización de Audio y Video:</span>
                <button
                  onClick={() => setPreviewVideoId(null)}
                  className="text-zinc-500 hover:text-white"
                >
                  Cerrar Previa &times;
                </button>
              </div>
              <div className="relative aspect-video max-h-56 w-full rounded-xl overflow-hidden bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=1`}
                  title="YouTube Preview"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>
          )}

          {isSearching ? (
            <div className="p-12 text-center text-zinc-400 space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs">Buscando pistas de karaoke con letra...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 space-y-2">
              <Music className="w-10 h-10 text-zinc-700 mx-auto" />
              <p className="text-xs">No se encontraron resultados automáticos.</p>
              <p className="text-[11px] text-zinc-600">
                Prueba buscando con palabras clave o pegando el link directo del video.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.map((item, idx) => {
                const isSelected = selectedVideoId === item.id;
                return (
                  <div
                    key={item.id + idx}
                    className={`p-3 rounded-2xl border transition-all flex flex-col justify-between space-y-2.5 ${
                      isSelected
                        ? "bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/50"
                        : "bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800"
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Miniatura del video */}
                      <div className="relative w-28 h-18 rounded-xl overflow-hidden bg-black shrink-0 border border-zinc-800">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewVideoId(item.id)}
                          className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center text-white transition-opacity"
                          title="Previsualizar en el modal"
                        >
                          <Play className="w-5 h-5 fill-current" />
                        </button>
                      </div>

                      {/* Información */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="text-xs font-bold text-white line-clamp-2" title={item.title}>
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-cyan-400 font-semibold truncate">
                          {item.channelTitle}
                        </p>
                        {isSelected && (
                          <div className="flex items-center gap-1 text-[10px] font-black text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Proyectándose en TV</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/80">
                      <button
                        type="button"
                        onClick={() => onSelectVideo(item.id, item.title)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                            : "bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white"
                        }`}
                      >
                        <Tv className="w-3.5 h-3.5" />
                        <span>{isSelected ? "En Pantalla TV" : "Proyectar en TV"}</span>
                      </button>

                      <a
                        href={`https://www.youtube.com/watch?v=${item.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
                        title="Abrir en YouTube externo"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="p-3 sm:p-4 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
          <span>💡 Las pistas reproducen la instrumental con letra sincronizada en tiempo real.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold cursor-pointer transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
