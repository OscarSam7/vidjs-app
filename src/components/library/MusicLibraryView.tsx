"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Music,
  ListMusic,
  Mic,
  Headphones,
  Disc3,
  Search,
  Plus,
  Play,
  Pause,
  Layers,
  FolderPlus,
  Check,
  Users,
  Tag,
  X,
  ArrowRight,
  Trash2,
  AlertTriangle,
  Volume2,
  Sparkles,
} from "lucide-react";

export interface Artist {
  id: string;
  name: string;
  imageUrl?: string | null;
  _count?: { songs: number };
}

export interface Song {
  id: string;
  title: string;
  artistId?: string | null;
  artist?: { id: string; name: string; imageUrl?: string | null } | null;
  genre?: string | null;
  bpm?: number | null;
  key?: string | null;
  durationSeconds: number;
  fileUrl?: string | null;
  isKaraoke?: boolean;
  isDjTrack?: boolean;
}

export interface GenreItem {
  name: string;
  count: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string | null;
  coverColor?: string;
  icon?: string;
  type: "DJ" | "KARAOKE" | "BOTH";
  tags?: string[];
  songCount?: number;
  songIds?: string[];
}

export interface MusicLibraryViewProps {
  /** Indica si se está renderizando incrustada dentro de la Cabina DJ (drawer/split) */
  isEmbedded?: boolean;
  /** Callback para cargar directamente en Deck A sin salir ni pausar la música */
  onLoadDeckA?: (song: Song) => void;
  /** Callback para cargar directamente en Deck B sin salir ni pausar la música */
  onLoadDeckB?: (song: Song) => void;
  /** Callback para cerrar el drawer o panel */
  onClose?: () => void;
  /** Pestaña inicial a abrir */
  initialTab?: "ALL" | "DJ" | "KARAOKE" | "PLAYLISTS" | "ARTISTS" | "GENRES";
  /** Sugerencia de bandeja objetivo si se abrió para un deck específico */
  targetDeckHint?: "A" | "B" | null;
  /** Clases adicionales de contenedor */
  className?: string;
  /** Ocultar banner superior en espacios compactos */
  compactHeader?: boolean;
}

export function MusicLibraryView({
  isEmbedded = false,
  onLoadDeckA,
  onLoadDeckB,
  onClose,
  initialTab = "ALL",
  targetDeckHint = null,
  className = "",
  compactHeader = false,
}: MusicLibraryViewProps) {
  const router = useRouter();

  // Estado principal
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [genres, setGenres] = useState<GenreItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros activos
  const [activeTab, setActiveTab] = useState<"ALL" | "DJ" | "KARAOKE" | "PLAYLISTS" | "ARTISTS" | "GENRES">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");
  const [selectedArtist, setSelectedArtist] = useState<string>("ALL");
  const [selectedBpmRange, setSelectedBpmRange] = useState<string>("ALL");
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);

  // Reproductor de Pre-escucha / Preview (Aislado de las bandejas)
  const [previewTrack, setPreviewTrack] = useState<Song | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewVolume, setPreviewVolume] = useState(0.7);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Modales
  const [isAddSongModalOpen, setIsAddSongModalOpen] = useState(false);
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [deletingSongId, setDeletingSongId] = useState<string | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Formularios
  const [newSongForm, setNewSongForm] = useState({
    title: "",
    artistName: "",
    genre: "Reggaeton / Urbano",
    bpm: 120,
    key: "Am",
    durationSeconds: 210,
    fileUrl: "",
    type: "BOTH" as "DJ" | "KARAOKE" | "BOTH",
  });

  const [newPlaylistForm, setNewPlaylistForm] = useState({
    name: "",
    description: "",
    coverColor: "from-purple-600 to-indigo-700",
    type: "BOTH" as "DJ" | "KARAOKE" | "BOTH",
  });

  // Cargar datos de la biblioteca
  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/library");
      const json = await res.json();
      if (json.success && json.data) {
        setSongs(json.data.songs || []);
        setArtists(json.data.artists || []);
        setGenres(json.data.genres || []);
        setPlaylists(json.data.playlists || []);
      }
    } catch (err) {
      console.error("Error al cargar biblioteca:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryData();

    const handleLibraryUpdated = () => {
      fetchLibraryData();
    };

    window.addEventListener("vidjs-library-updated", handleLibraryUpdated);
    return () => {
      window.removeEventListener("vidjs-library-updated", handleLibraryUpdated);
    };
  }, []);

  // Notificación flash de éxito
  const showNotice = (msg: string) => {
    setActionSuccessNotice(msg);
    setTimeout(() => setActionSuccessNotice(null), 3500);
  };

  // Filtrado reactivo de canciones
  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      // 1. Filtro por Tab de tipo
      if (activeTab === "DJ" && !song.isDjTrack) return false;
      if (activeTab === "KARAOKE" && !song.isKaraoke) return false;

      // 2. Filtro por Playlist seleccionada
      if (activePlaylist && activePlaylist.songIds) {
        if (!activePlaylist.songIds.includes(song.id)) return false;
      }

      // 3. Filtro por Género
      if (selectedGenre !== "ALL" && song.genre !== selectedGenre) {
        return false;
      }

      // 4. Filtro por Artista
      if (selectedArtist !== "ALL" && song.artistId !== selectedArtist) {
        return false;
      }

      // 5. Filtro por rango de BPM
      if (selectedBpmRange !== "ALL") {
        const bpm = song.bpm || 0;
        if (selectedBpmRange === "SLOW" && bpm > 100) return false;
        if (selectedBpmRange === "MID" && (bpm <= 100 || bpm > 125)) return false;
        if (selectedBpmRange === "FAST" && bpm <= 125) return false;
      }

      // 6. Búsqueda de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = song.title.toLowerCase().includes(q);
        const matchesArtist = (song.artist?.name || "").toLowerCase().includes(q);
        const matchesGenre = (song.genre || "").toLowerCase().includes(q);
        const matchesKey = (song.key || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesArtist && !matchesGenre && !matchesKey) {
          return false;
        }
      }

      return true;
    });
  }, [songs, activeTab, activePlaylist, selectedGenre, selectedArtist, selectedBpmRange, searchQuery]);

  // Manejar carga en Bandeja A
  const handleLoadDeckA = (song: Song) => {
    if (isEmbedded && onLoadDeckA) {
      onLoadDeckA(song);
      showNotice(`🎧 ¡Cargada "${song.title}" en Deck A! (Música en vivo continua)`);
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        setIsPlayingPreview(false);
      }
      return;
    }

    // Modo Standalone (guardar y navegar)
    try {
      const payload = {
        track: {
          id: song.id,
          title: song.title,
          artist: song.artist?.name || "Artista",
          genre: song.genre || "Varios",
          bpm: song.bpm || 120,
          key: song.key || "C",
          durationSeconds: song.durationSeconds || 210,
          fileUrl: song.fileUrl || null,
        },
        targetDeck: "A",
        timestamp: Date.now(),
      };
      localStorage.setItem("vidjs_library_deck_load", JSON.stringify(payload));
      showNotice(`🎧 ¡Cargando "${song.title}" en Bandeja A! Abriendo Cabina DJ...`);
      setTimeout(() => {
        router.push("/dashboard/dj");
      }, 350);
    } catch {
      router.push("/dashboard/dj");
    }
  };

  // Manejar carga en Bandeja B
  const handleLoadDeckB = (song: Song) => {
    if (isEmbedded && onLoadDeckB) {
      onLoadDeckB(song);
      showNotice(`🎧 ¡Cargada "${song.title}" en Deck B! (Música en vivo continua)`);
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        setIsPlayingPreview(false);
      }
      return;
    }

    // Modo Standalone (guardar y navegar)
    try {
      const payload = {
        track: {
          id: song.id,
          title: song.title,
          artist: song.artist?.name || "Artista",
          genre: song.genre || "Varios",
          bpm: song.bpm || 120,
          key: song.key || "C",
          durationSeconds: song.durationSeconds || 210,
          fileUrl: song.fileUrl || null,
        },
        targetDeck: "B",
        timestamp: Date.now(),
      };
      localStorage.setItem("vidjs_library_deck_load", JSON.stringify(payload));
      showNotice(`🎧 ¡Cargando "${song.title}" en Bandeja B! Abriendo Cabina DJ...`);
      setTimeout(() => {
        router.push("/dashboard/dj");
      }, 350);
    } catch {
      router.push("/dashboard/dj");
    }
  };

  // Cargar en Cabina Karaoke y redirigir
  const handleSendToKaraoke = (song: Song) => {
    try {
      const payload = {
        title: song.title,
        artist: song.artist?.name || "Artista",
        timestamp: Date.now(),
      };
      localStorage.setItem("vidjs_quick_karaoke_track", JSON.stringify(payload));
      showNotice(`🎤 Pista Karaoke "${song.title}" seleccionada. Abriendo Cabina Karaoke...`);
      setTimeout(() => {
        router.push("/dashboard/karaoke");
      }, 350);
    } catch {
      router.push("/dashboard/karaoke");
    }
  };

  // Eliminar pista de la base de datos
  const handleDeleteSong = async (songId: string) => {
    try {
      setDeletingSongId(songId);
      const res = await fetch(`/api/v1/library?id=${songId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        showNotice(json.message || "Pista eliminada de la biblioteca.");
        setSongs((prev) => prev.filter((s) => s.id !== songId));
        setSongToDelete(null);
        if (previewTrack?.id === songId) {
          setPreviewTrack(null);
          setIsPlayingPreview(false);
        }
      } else {
        alert(json.error || "No se pudo eliminar la pista");
      }
    } catch {
      alert("Error de conexión al eliminar la pista");
    } finally {
      setDeletingSongId(null);
    }
  };

  // Pre-escucha / Preview
  const handleTogglePreview = (song: Song) => {
    if (previewTrack?.id === song.id && isPlayingPreview) {
      setIsPlayingPreview(false);
      if (previewAudioRef.current) previewAudioRef.current.pause();
    } else {
      setPreviewTrack(song);
      setIsPlayingPreview(true);
      if (previewAudioRef.current && song.fileUrl) {
        previewAudioRef.current.src = song.fileUrl;
        previewAudioRef.current.volume = previewVolume;
        previewAudioRef.current.play().catch(() => {});
      }
    }
  };

  // Crear nueva canción en la BD
  const handleCreateSongSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSongForm.title || !newSongForm.artistName) return;

    try {
      const res = await fetch("/api/v1/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSongForm),
      });
      const json = await res.json();
      if (json.success) {
        showNotice(`¡Pista "${newSongForm.title}" agregada a la biblioteca con éxito!`);
        setIsAddSongModalOpen(false);
        setNewSongForm({
          title: "",
          artistName: "",
          genre: "Reggaeton / Urbano",
          bpm: 120,
          key: "Am",
          durationSeconds: 210,
          fileUrl: "",
          type: "BOTH",
        });
        fetchLibraryData();
      } else {
        alert(json.error || "Error al crear la canción");
      }
    } catch {
      alert("Error de conexión al guardar la canción");
    }
  };

  // Crear nueva Playlist
  const handleCreatePlaylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistForm.name) return;

    try {
      const res = await fetch("/api/v1/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_PLAYLIST",
          playlist: {
            name: newPlaylistForm.name,
            description: newPlaylistForm.description,
            coverColor: newPlaylistForm.coverColor,
            type: newPlaylistForm.type,
            songIds: [],
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotice(`¡Playlist "${newPlaylistForm.name}" creada con éxito!`);
        setIsCreatePlaylistModalOpen(false);
        setNewPlaylistForm({
          name: "",
          description: "",
          coverColor: "from-purple-600 to-indigo-700",
          type: "BOTH",
        });
        fetchLibraryData();
      } else {
        alert(json.error || "Error al crear la playlist");
      }
    } catch {
      alert("Error de conexión al crear la playlist");
    }
  };

  // Formato mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className={`space-y-5 pb-24 ${className}`}>
      {/* Audio oculto para Pre-escucha / Preview aislado */}
      <audio
        ref={previewAudioRef}
        onEnded={() => setIsPlayingPreview(false)}
        className="hidden"
      />

      {/* Notificación Flotante */}
      {actionSuccessNotice && (
        <div className="fixed top-20 right-6 z-50 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-purple-400/30 animate-in fade-in slide-in-from-top-4">
          <Check className="w-5 h-5 text-green-300 shrink-0" />
          <span className="text-sm font-bold">{actionSuccessNotice}</span>
        </div>
      )}

      {/* BANNER ESPECIAL: CABINA DJ EN VIVO (Cuando se abre incrustada) */}
      {isEmbedded && (
        <div className="bg-gradient-to-r from-purple-950/80 via-blue-950/80 to-zinc-950 border border-purple-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-black text-white tracking-wide uppercase">
                  Cabina DJ en Vivo Activa
                </span>
                {targetDeckHint && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                    Cargando en Deck {targetDeckHint}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                La música sigue sonando en la sala. Haz clic en <strong>Deck A</strong> o <strong>Deck B</strong> para montar cualquier canción de inmediato sin pausar la fiesta.
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-bold"
              title="Volver a los platos DJ (Tecla Esc o B)"
            >
              <X className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Cerrar</span>
            </button>
          )}
        </div>
      )}

      {/* Cabecera / Hero de Biblioteca (Si no está en modo compacto) */}
      {!compactHeader && !isEmbedded && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 via-purple-950/40 to-zinc-900 border border-zinc-800/80 p-6 sm:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold tracking-wider uppercase">
                <ListMusic className="w-3.5 h-3.5" />
                Catálogo Musical & Karaoke HQ
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Biblioteca de Pistas & Karaoke
              </h1>
              <p className="text-sm text-zinc-400 max-w-2xl">
                Agrega, borra y administra pistas para DJ y canciones para Karaoke. Carga cualquier tema directamente a la bandeja de la cabina DJ sin interrumpir la reproducción.
              </p>
            </div>

            {/* Botones de Acción Superior */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsCreatePlaylistModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg hover:border-purple-500/50"
              >
                <FolderPlus className="w-4 h-4 text-purple-400" />
                Crear Playlist
              </button>
              <button
                onClick={() => setIsAddSongModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-600/30"
              >
                <Plus className="w-4 h-4" />
                Nueva Pista / Tema
              </button>
            </div>
          </div>

          {/* Métricas / Stats de la Biblioteca */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-zinc-800/80">
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-3">
              <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-medium">
                <Music className="w-3.5 h-3.5 text-purple-400" />
                Total Pistas
              </div>
              <div className="text-lg font-black text-white mt-1">{songs.length}</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-3">
              <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-medium">
                <Headphones className="w-3.5 h-3.5 text-blue-400" />
                Pistas DJ
              </div>
              <div className="text-lg font-black text-white mt-1">
                {songs.filter((s) => s.isDjTrack).length}
              </div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-3">
              <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-medium">
                <Mic className="w-3.5 h-3.5 text-pink-400" />
                Karaoke Ready
              </div>
              <div className="text-lg font-black text-white mt-1">
                {songs.filter((s) => s.isKaraoke).length}
              </div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-3">
              <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-medium">
                <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                Playlists
              </div>
              <div className="text-lg font-black text-white mt-1">{playlists.length}</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-3">
              <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-medium">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Artistas
              </div>
              <div className="text-lg font-black text-white mt-1">{artists.length}</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-3">
              <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-medium">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                Géneros
              </div>
              <div className="text-lg font-black text-white mt-1">{genres.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Pestañas Principales (Tabs) */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-zinc-800/80 no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setActiveTab("ALL");
              setActivePlaylist(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === "ALL" && !activePlaylist
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Todas ({songs.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("DJ");
              setActivePlaylist(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === "DJ"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            Pistas DJ ({songs.filter((s) => s.isDjTrack).length})
          </button>

          <button
            onClick={() => {
              setActiveTab("KARAOKE");
              setActivePlaylist(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === "KARAOKE"
                ? "bg-pink-600 text-white shadow-lg shadow-pink-600/30"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            Karaoke ({songs.filter((s) => s.isKaraoke).length})
          </button>

          <button
            onClick={() => setActiveTab("PLAYLISTS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === "PLAYLISTS" || activePlaylist
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Playlists ({playlists.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("ARTISTS");
              setActivePlaylist(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === "ARTISTS"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Artistas ({artists.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("GENRES");
              setActivePlaylist(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === "GENRES"
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Géneros ({genres.length})
          </button>
        </div>

        {/* Acciones directas compactas */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAddSongModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Canción</span>
          </button>
        </div>
      </div>

      {/* Banner de Playlist Activa (si el usuario abrió una) */}
      {activePlaylist && (
        <div
          className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-r ${
            activePlaylist.coverColor || "from-purple-600 to-indigo-700"
          } text-white flex items-center justify-between shadow-xl`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-black/30 backdrop-blur flex items-center justify-center text-white shrink-0">
              <Disc3 className="w-6 h-6 animate-spin [animation-duration:8s]" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">
                Playlist Seleccionada • {activePlaylist.type}
              </div>
              <h2 className="text-lg sm:text-xl font-black">{activePlaylist.name}</h2>
              {activePlaylist.description && (
                <p className="text-xs opacity-90 mt-0.5 line-clamp-1">{activePlaylist.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setActivePlaylist(null)}
            className="p-2 rounded-xl bg-black/30 hover:bg-black/50 text-white transition-all cursor-pointer"
            title="Cerrar filtro de playlist"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/80">
        {/* Input de Búsqueda */}
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, artista, género o Key..."
            className="w-full pl-10 pr-8 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Género */}
        <div>
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
          >
            <option value="ALL">Todos los Géneros</option>
            {genres.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name} ({g.count})
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown Artista */}
        <div>
          <select
            value={selectedArtist}
            onChange={(e) => setSelectedArtist(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
          >
            <option value="ALL">Todos los Artistas</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown BPM */}
        <div>
          <select
            value={selectedBpmRange}
            onChange={(e) => setSelectedBpmRange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
          >
            <option value="ALL">Cualquier BPM</option>
            <option value="SLOW">BPM Lento (&lt; 100)</option>
            <option value="MID">BPM Medio (100 - 125)</option>
            <option value="FAST">BPM Boliche (125+)</option>
          </select>
        </div>
      </div>

      {/* VISTA 1: PLAYLISTS */}
      {activeTab === "PLAYLISTS" && !activePlaylist && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-amber-400" />
              Colecciones & Playlists Disponibles
            </h2>
            <span className="text-xs text-zinc-400">{playlists.length} listas listas para pinchar o cantar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => {
                  setActivePlaylist(pl);
                  setActiveTab("ALL");
                }}
                className="group relative overflow-hidden rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/50 p-4 sm:p-5 transition-all cursor-pointer flex flex-col justify-between hover:shadow-xl hover:shadow-purple-950/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                      pl.coverColor || "from-purple-600 to-indigo-700"
                    } flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform shrink-0`}
                  >
                    <Disc3 className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      pl.type === "DJ"
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : pl.type === "KARAOKE"
                        ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                        : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    }`}
                  >
                    {pl.type}
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="text-base font-extrabold text-white group-hover:text-purple-300 transition-colors">
                    {pl.name}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                    {pl.description || "Playlist curada con selección especial."}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                  <span>{pl.songCount ?? pl.songIds?.length ?? 0} canciones</span>
                  <span className="text-purple-400 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Abrir <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 2: ARTISTAS */}
      {activeTab === "ARTISTS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Directorio de Artistas
            </h2>
            <span className="text-xs text-zinc-400">{artists.length} artistas registrados</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {artists.map((artist) => (
              <button
                key={artist.id}
                onClick={() => {
                  setSelectedArtist(artist.id);
                  setActiveTab("ALL");
                }}
                className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/50 transition-all text-center group cursor-pointer flex flex-col items-center justify-between"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600/30 to-emerald-600/30 border border-emerald-500/30 flex items-center justify-center text-emerald-300 text-lg font-black group-hover:scale-110 transition-transform mb-3 shadow-lg">
                  {artist.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors truncate w-full">
                  {artist.name}
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">
                  {artist._count?.songs || 0} canciones
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 3: GÉNEROS */}
      {activeTab === "GENRES" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-cyan-400" />
              Explorador por Género Musical
            </h2>
            <span className="text-xs text-zinc-400">{genres.length} géneros disponibles</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {genres.map((g) => (
              <button
                key={g.name}
                onClick={() => {
                  setSelectedGenre(g.name);
                  setActiveTab("ALL");
                }}
                className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/50 transition-all text-left group cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-extrabold text-sm text-white group-hover:text-cyan-300 transition-colors">
                    {g.name}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {g.count} {g.count === 1 ? "canción" : "canciones"}
                  </div>
                </div>
                <span className="p-2 rounded-xl bg-cyan-600/10 text-cyan-400 group-hover:bg-cyan-600/20 transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* VISTA PRINCIPAL: LISTADO DE PISTAS & CANCIONES */}
      {(activeTab === "ALL" || activeTab === "DJ" || activeTab === "KARAOKE" || activePlaylist) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>
              Mostrando <strong className="text-white">{filteredSongs.length}</strong> de{" "}
              <strong className="text-white">{songs.length}</strong> pistas
            </span>

            {(selectedGenre !== "ALL" || selectedArtist !== "ALL" || selectedBpmRange !== "ALL" || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedGenre("ALL");
                  setSelectedArtist("ALL");
                  setSelectedBpmRange("ALL");
                  setSearchQuery("");
                }}
                className="text-purple-400 hover:underline cursor-pointer"
              >
                Limpiar filtros activos
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-16 text-zinc-500">
              <Disc3 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-500" />
              Cargando catálogo musical...
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/40 rounded-3xl border border-zinc-800/80 p-8">
              <Music className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No se encontraron pistas</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                No hay canciones que coincidan con los filtros o el término buscado.
              </p>
              <button
                onClick={() => setIsAddSongModalOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs cursor-pointer"
              >
                Agregar una Pista Nueva
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/80 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800 text-[10px]">
                    <tr>
                      <th className="py-3 px-3.5 w-10 text-center">#</th>
                      <th className="py-3 px-3.5">Pista / Título</th>
                      <th className="py-3 px-3.5">Artista</th>
                      <th className="py-3 px-3.5">Género</th>
                      <th className="py-3 px-3.5 text-center">BPM / Key</th>
                      <th className="py-3 px-3.5 text-center">Duración</th>
                      <th className="py-3 px-3.5 text-center">Tipo</th>
                      <th className="py-3 px-3.5 text-right">Cargar en Bandejas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredSongs.map((song) => {
                      const isThisPreviewing = previewTrack?.id === song.id && isPlayingPreview;

                      return (
                        <tr
                          key={song.id}
                          className="hover:bg-zinc-800/40 transition-colors group cursor-default"
                        >
                          {/* Col 1: Play / Index */}
                          <td className="py-3 px-3.5 text-center">
                            <button
                              onClick={() => handleTogglePreview(song)}
                              className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-purple-600 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer mx-auto"
                              title="Pre-escucha aislada"
                            >
                              {isThisPreviewing ? (
                                <Pause className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <Play className="w-3.5 h-3.5 ml-0.5" />
                              )}
                            </button>
                          </td>

                          {/* Col 2: Título */}
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors">
                              {song.title}
                            </div>
                            <div className="text-[11px] text-zinc-500 sm:hidden">
                              {song.artist?.name || "Desconocido"}
                            </div>
                          </td>

                          {/* Col 3: Artista */}
                          <td className="py-3 px-3.5 text-zinc-300 font-medium">
                            {song.artist?.name || "—"}
                          </td>

                          {/* Col 4: Género */}
                          <td className="py-3 px-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-zinc-300">
                              {song.genre || "Varios"}
                            </span>
                          </td>

                          {/* Col 5: BPM & Key */}
                          <td className="py-3 px-3.5 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              {song.bpm ? (
                                <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                  {song.bpm} BPM
                                </span>
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                              {song.key && (
                                <span className="font-mono font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                                  {song.key}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Col 6: Duración */}
                          <td className="py-3 px-3.5 text-center text-zinc-400 font-mono">
                            {formatDuration(song.durationSeconds)}
                          </td>

                          {/* Col 7: Tipo (DJ / Karaoke) */}
                          <td className="py-3 px-3.5 text-center">
                            <div className="inline-flex items-center gap-1">
                              {song.isDjTrack && (
                                <span
                                  className="p-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                  title="Pista para DJ"
                                >
                                  <Headphones className="w-3 h-3" />
                                </span>
                              )}
                              {song.isKaraoke && (
                                <span
                                  className="p-1 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30"
                                  title="Karaoke con Letra"
                                >
                                  <Mic className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Col 8: Acciones Directas (Llevar a Bandeja DJ, Karaoke y Borrar) */}
                          <td className="py-3 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botón Cargar en Deck A */}
                              <button
                                onClick={() => handleLoadDeckA(song)}
                                className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm ${
                                  targetDeckHint === "A"
                                    ? "bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500/50 scale-105"
                                    : "bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border-blue-500/30"
                                }`}
                                title="Cargar en Bandeja A (Sin pausar Deck B ni cortar la música)"
                              >
                                <Headphones className="w-3 h-3" />
                                Deck A
                              </button>

                              {/* Botón Cargar en Deck B */}
                              <button
                                onClick={() => handleLoadDeckB(song)}
                                className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm ${
                                  targetDeckHint === "B"
                                    ? "bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-500/50 scale-105"
                                    : "bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border-indigo-500/30"
                                }`}
                                title="Cargar en Bandeja B (Sin pausar Deck A ni cortar la música)"
                              >
                                <Headphones className="w-3 h-3" />
                                Deck B
                              </button>

                              {/* Botón Encolar en Karaoke */}
                              <button
                                onClick={() => handleSendToKaraoke(song)}
                                className="px-2.5 py-1.5 rounded-lg bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white border border-pink-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                title="Enviar a Cabina Karaoke"
                              >
                                <Mic className="w-3 h-3" />
                                Karaoke
                              </button>

                              {/* Botón Eliminar Pista */}
                              <button
                                onClick={() => setSongToDelete(song)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 text-[10px] transition-all cursor-pointer"
                                title="Eliminar pista de la biblioteca"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Barra Flotante de Pre-escucha / Preview Player Aislado */}
      {previewTrack && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-zinc-950/95 backdrop-blur-xl border border-purple-500/40 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                Pre-escucha Aislada
              </span>
            </div>
            <button
              onClick={() => {
                setPreviewTrack(null);
                setIsPlayingPreview(false);
                if (previewAudioRef.current) previewAudioRef.current.pause();
              }}
              className="text-zinc-500 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <Music className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{previewTrack.title}</div>
              <div className="text-[11px] text-zinc-400 truncate">
                {previewTrack.artist?.name || "Artista"} • {previewTrack.genre || "Varios"}
              </div>
            </div>
            <button
              onClick={() => handleTogglePreview(previewTrack)}
              className="w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-transform hover:scale-105 shrink-0 shadow-lg shadow-purple-600/40 cursor-pointer"
            >
              {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
          </div>

          {/* Acciones directas desde el preview player */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-zinc-800/80">
            <button
              onClick={() => handleLoadDeckA(previewTrack)}
              className="py-1.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold text-center transition-colors flex items-center justify-center gap-1 shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Headphones className="w-3.5 h-3.5" />
              Cargar a Deck A
            </button>
            <button
              onClick={() => handleLoadDeckB(previewTrack)}
              className="py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold text-center transition-colors flex items-center justify-center gap-1 shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Headphones className="w-3.5 h-3.5" />
              Cargar a Deck B
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN DE PISTA */}
      {songToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">¿Eliminar pista de la biblioteca?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Se eliminará permanentemente <strong className="text-white">"{songToDelete.title}"</strong> de {songToDelete.artist?.name || "Artista"}.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSongToDelete(null)}
                disabled={Boolean(deletingSongId)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSong(songToDelete.id)}
                disabled={Boolean(deletingSongId)}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-red-600/30 flex items-center gap-1.5"
              >
                {deletingSongId ? "Eliminando..." : "Eliminar Pista"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AÑADIR NUEVA PISTA / CANCIÓN */}
      {isAddSongModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Añadir Nueva Pista a la Biblioteca</h3>
                  <p className="text-xs text-zinc-400">Disponible de inmediato para Cabina DJ y Karaoke</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSongModalOpen(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSongSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Título de la Canción *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Danza Kuduro"
                  value={newSongForm.title}
                  onChange={(e) => setNewSongForm({ ...newSongForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Artista / Intérprete *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Don Omar"
                  value={newSongForm.artistName}
                  onChange={(e) => setNewSongForm({ ...newSongForm, artistName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">Género Musical</label>
                  <input
                    type="text"
                    placeholder="Ej: Reggaeton / Urbano"
                    value={newSongForm.genre}
                    onChange={(e) => setNewSongForm({ ...newSongForm, genre: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">BPM Estimado</label>
                  <input
                    type="number"
                    min="40"
                    max="240"
                    value={newSongForm.bpm}
                    onChange={(e) => setNewSongForm({ ...newSongForm, bpm: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">Key / Tonalidad</label>
                  <input
                    type="text"
                    placeholder="Ej: 8A / Am"
                    value={newSongForm.key}
                    onChange={(e) => setNewSongForm({ ...newSongForm, key: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">Duración (Segundos)</label>
                  <input
                    type="number"
                    min="10"
                    max="1200"
                    value={newSongForm.durationSeconds}
                    onChange={(e) => setNewSongForm({ ...newSongForm, durationSeconds: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Enlace / URL de Audio o Video (Opcional)</label>
                <input
                  type="url"
                  placeholder="https://... (MP3, WAV o enlace directo)"
                  value={newSongForm.fileUrl}
                  onChange={(e) => setNewSongForm({ ...newSongForm, fileUrl: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1.5">Destino / Uso de la Pista</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSongForm({ ...newSongForm, type: "DJ" })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      newSongForm.type === "DJ"
                        ? "bg-blue-600/30 text-blue-300 border-blue-500"
                        : "bg-zinc-950 text-zinc-400 border-zinc-800"
                    }`}
                  >
                    🎧 Solo DJ
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSongForm({ ...newSongForm, type: "KARAOKE" })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      newSongForm.type === "KARAOKE"
                        ? "bg-pink-600/30 text-pink-300 border-pink-500"
                        : "bg-zinc-950 text-zinc-400 border-zinc-800"
                    }`}
                  >
                    🎤 Solo Karaoke
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSongForm({ ...newSongForm, type: "BOTH" })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      newSongForm.type === "BOTH"
                        ? "bg-purple-600/30 text-purple-300 border-purple-500"
                        : "bg-zinc-950 text-zinc-400 border-zinc-800"
                    }`}
                  >
                    ✨ Ambos
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddSongModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-xs shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  Guardar en Biblioteca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR PLAYLIST */}
      {isCreatePlaylistModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Crear Nueva Playlist</h3>
                  <p className="text-xs text-zinc-400">Organiza colecciones para fiestas o noches temáticas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatePlaylistModalOpen(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylistSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Nombre de la Playlist *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cachengue 2026 / Hits del Verano"
                  value={newPlaylistForm.name}
                  onChange={(e) => setNewPlaylistForm({ ...newPlaylistForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Descripción</label>
                <textarea
                  placeholder="Breve reseña sobre el estilo o momento de la noche..."
                  rows={2}
                  value={newPlaylistForm.description}
                  onChange={(e) => setNewPlaylistForm({ ...newPlaylistForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1.5">Color del Álbum / Carátula</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Púrpura", val: "from-purple-600 to-indigo-700" },
                    { label: "Rosa", val: "from-pink-600 to-rose-700" },
                    { label: "Ámbar", val: "from-amber-500 to-orange-600" },
                    { label: "Cian", val: "from-cyan-600 to-blue-700" },
                  ].map((c) => (
                    <button
                      key={c.val}
                      type="button"
                      onClick={() => setNewPlaylistForm({ ...newPlaylistForm, coverColor: c.val })}
                      className={`h-9 rounded-xl bg-gradient-to-r ${c.val} border-2 transition-all cursor-pointer ${
                        newPlaylistForm.coverColor === c.val ? "border-white scale-105 shadow-md" : "border-transparent opacity-70"
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreatePlaylistModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs shadow-lg shadow-amber-500/30 cursor-pointer"
                >
                  Crear Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
