"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";

interface Artist {
  id: string;
  name: string;
  imageUrl?: string | null;
  _count?: { songs: number };
}

interface Song {
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

interface GenreItem {
  name: string;
  count: number;
}

interface Playlist {
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

export default function LibraryPage() {
  const router = useRouter();

  // Estado principal
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [genres, setGenres] = useState<GenreItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros activos
  const [activeTab, setActiveTab] = useState<"ALL" | "DJ" | "KARAOKE" | "PLAYLISTS" | "ARTISTS" | "GENRES">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");
  const [selectedArtist, setSelectedArtist] = useState<string>("ALL");
  const [selectedBpmRange, setSelectedBpmRange] = useState<string>("ALL");
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);

  // Reproductor de Pre-escucha / Preview
  const [previewTrack, setPreviewTrack] = useState<Song | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

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

  // Cargar en bandeja DJ y redirigir automáticamente a la Cabina DJ
  const handleLoadAndGoToDj = (song: Song, targetDeck: "A" | "B" = "A") => {
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
        targetDeck,
        timestamp: Date.now(),
      };
      localStorage.setItem("vidjs_library_deck_load", JSON.stringify(payload));
      showNotice(`🎧 ¡Cargando "${song.title}" en Bandeja ${targetDeck}! Te llevamos a la Cabina DJ...`);
      setTimeout(() => {
        router.push("/dashboard/dj");
      }, 350);
    } catch {
      router.push("/dashboard/dj");
    }
  };

  // Cargar en Cabina Karaoke y redirigir automáticamente
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
    } else {
      setPreviewTrack(song);
      setIsPlayingPreview(true);
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
    <div className="space-y-6 pb-28">
      {/* Notificación Flotante */}
      {actionSuccessNotice && (
        <div className="fixed top-20 right-6 z-50 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-purple-400/30 animate-in fade-in slide-in-from-top-4">
          <Check className="w-5 h-5 text-green-300 shrink-0" />
          <span className="text-sm font-bold">{actionSuccessNotice}</span>
        </div>
      )}

      {/* Cabecera / Hero de Biblioteca */}
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
              Agrega, borra y administra pistas para DJ y canciones para Karaoke. Carga cualquier tema directamente a la bandeja de la cabina DJ con un solo clic.
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

      {/* Pestañas Principales (Tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-800/80 no-scrollbar">
        <button
          onClick={() => {
            setActiveTab("ALL");
            setActivePlaylist(null);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === "ALL" && !activePlaylist
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Todas las Pistas ({songs.length})
        </button>

        <button
          onClick={() => {
            setActiveTab("DJ");
            setActivePlaylist(null);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
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
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === "KARAOKE"
              ? "bg-pink-600 text-white shadow-lg shadow-pink-600/30"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          Karaoke Instrumental ({songs.filter((s) => s.isKaraoke).length})
        </button>

        <button
          onClick={() => setActiveTab("PLAYLISTS")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
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
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
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
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === "GENRES"
              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          Géneros ({genres.length})
        </button>
      </div>

      {/* Banner de Playlist Activa (si el usuario abrió una) */}
      {activePlaylist && (
        <div
          className={`p-5 rounded-2xl bg-gradient-to-r ${
            activePlaylist.coverColor || "from-purple-600 to-indigo-700"
          } text-white flex items-center justify-between shadow-xl`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-black/30 backdrop-blur flex items-center justify-center text-white shrink-0">
              <Disc3 className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="text-xs uppercase font-extrabold tracking-wider opacity-80">
                Playlist Seleccionada • {activePlaylist.type}
              </div>
              <h2 className="text-xl font-black">{activePlaylist.name}</h2>
              {activePlaylist.description && (
                <p className="text-xs opacity-90 mt-0.5">{activePlaylist.description}</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800/80">
        {/* Input de Búsqueda */}
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, artista, género o Key..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
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
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
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
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
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
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
          >
            <option value="ALL">Cualquier BPM</option>
            <option value="SLOW">BPM Lento (&lt; 100)</option>
            <option value="MID">BPM Medio (100 - 125)</option>
            <option value="FAST">BPM Boliche (125+)</option>
          </select>
        </div>
      </div>

      {/* Contenido según Tab Activo */}

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
                className="group relative overflow-hidden rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/50 p-5 transition-all cursor-pointer flex flex-col justify-between hover:shadow-xl hover:shadow-purple-950/20"
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
        <div className="space-y-4">
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
                className="mt-4 px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs"
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
                      <th className="py-3.5 px-4 w-12 text-center">#</th>
                      <th className="py-3.5 px-4">Pista / Título</th>
                      <th className="py-3.5 px-4">Artista</th>
                      <th className="py-3.5 px-4">Género</th>
                      <th className="py-3.5 px-4 text-center">BPM / Key</th>
                      <th className="py-3.5 px-4 text-center">Duración</th>
                      <th className="py-3.5 px-4 text-center">Tipo</th>
                      <th className="py-3.5 px-4 text-right">Acciones Directas</th>
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
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleTogglePreview(song)}
                              className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-purple-600 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer mx-auto"
                              title="Pre-escucha"
                            >
                              {isThisPreviewing ? (
                                <Pause className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <Play className="w-3.5 h-3.5 ml-0.5" />
                              )}
                            </button>
                          </td>

                          {/* Col 2: Título */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors">
                              {song.title}
                            </div>
                            <div className="text-[11px] text-zinc-500 sm:hidden">
                              {song.artist?.name || "Desconocido"}
                            </div>
                          </td>

                          {/* Col 3: Artista */}
                          <td className="py-3.5 px-4 text-zinc-300 font-medium">
                            {song.artist?.name || "—"}
                          </td>

                          {/* Col 4: Género */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-zinc-300">
                              {song.genre || "Varios"}
                            </span>
                          </td>

                          {/* Col 5: BPM & Key */}
                          <td className="py-3.5 px-4 text-center">
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
                          <td className="py-3.5 px-4 text-center text-zinc-400 font-mono">
                            {formatDuration(song.durationSeconds)}
                          </td>

                          {/* Col 7: Tipo (DJ / Karaoke) */}
                          <td className="py-3.5 px-4 text-center">
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
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botón Cargar en Deck A (Lleva automáticamente a la Cabina DJ) */}
                              <button
                                onClick={() => handleLoadAndGoToDj(song, "A")}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                title="Cargar en Bandeja A y abrir Cabina DJ"
                              >
                                <Headphones className="w-3 h-3" />
                                Deck A
                              </button>

                              {/* Botón Cargar en Deck B (Lleva automáticamente a la Cabina DJ) */}
                              <button
                                onClick={() => handleLoadAndGoToDj(song, "B")}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                title="Cargar en Bandeja B y abrir Cabina DJ"
                              >
                                <Headphones className="w-3 h-3" />
                                Deck B
                              </button>

                              {/* Botón Encolar en Karaoke y abrir Cabina Karaoke */}
                              <button
                                onClick={() => handleSendToKaraoke(song)}
                                className="px-2.5 py-1.5 rounded-lg bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white border border-pink-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                title="Enviar a Cabina Karaoke y abrir pantalla"
                              >
                                <Mic className="w-3 h-3" />
                                Karaoke
                              </button>

                              {/* Botón Eliminar Pista de la Biblioteca */}
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

      {/* Barra Flotante de Pre-escucha / Preview Player */}
      {previewTrack && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 bg-zinc-950/95 backdrop-blur-xl border border-purple-500/40 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                Pre-escucha Activa
              </span>
            </div>
            <button
              onClick={() => {
                setPreviewTrack(null);
                setIsPlayingPreview(false);
              }}
              className="text-zinc-500 hover:text-white"
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
              onClick={() => setIsPlayingPreview((prev) => !prev)}
              className="w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-transform hover:scale-105 shrink-0 shadow-lg shadow-purple-600/40"
            >
              {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
          </div>

          {/* Acciones directas desde el preview player */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-zinc-800/80">
            <button
              onClick={() => handleLoadAndGoToDj(previewTrack, "A")}
              className="py-1.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold text-center transition-colors flex items-center justify-center gap-1 shadow-md shadow-blue-600/20"
            >
              <Headphones className="w-3.5 h-3.5" />
              Llevar a Deck A
            </button>
            <button
              onClick={() => handleLoadAndGoToDj(previewTrack, "B")}
              className="py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold text-center transition-colors flex items-center justify-center gap-1 shadow-md shadow-indigo-600/20"
            >
              <Headphones className="w-3.5 h-3.5" />
              Llevar a Deck B
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
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">Agregar Pista al Catálogo</h3>
                <p className="text-xs text-zinc-400">Registra una nueva canción para la cabina DJ o Karaoke.</p>
              </div>
              <button
                onClick={() => setIsAddSongModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSongSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Título de la Canción *</label>
                <input
                  type="text"
                  required
                  value={newSongForm.title}
                  onChange={(e) => setNewSongForm({ ...newSongForm, title: e.target.value })}
                  placeholder="Ej: Gasolina, Persiana Americana, Tusa..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Artista *</label>
                <input
                  type="text"
                  required
                  value={newSongForm.artistName}
                  onChange={(e) => setNewSongForm({ ...newSongForm, artistName: e.target.value })}
                  placeholder="Ej: Daddy Yankee, Soda Stereo, Karol G..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Género</label>
                  <select
                    value={newSongForm.genre}
                    onChange={(e) => setNewSongForm({ ...newSongForm, genre: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Reggaeton / Urbano">Reggaeton / Urbano</option>
                    <option value="Cumbia">Cumbia</option>
                    <option value="Rock en Español">Rock en Español</option>
                    <option value="Pop Latino">Pop Latino</option>
                    <option value="Electrónica / House">Electrónica / House</option>
                    <option value="Classic Rock / Karaoke">Classic Rock / Karaoke</option>
                    <option value="Pop Latino / Balada">Pop Latino / Balada</option>
                    <option value="Pop / Disco">Pop / Disco</option>
                    <option value="Trap / Latino">Trap / Latino</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Tipo de Pista</label>
                  <select
                    value={newSongForm.type}
                    onChange={(e) =>
                      setNewSongForm({ ...newSongForm, type: e.target.value as "DJ" | "KARAOKE" | "BOTH" })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
                  >
                    <option value="BOTH">Ambos (DJ y Karaoke)</option>
                    <option value="DJ">Solo Pista DJ</option>
                    <option value="KARAOKE">Solo Karaoke</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">BPM (Tempo)</label>
                  <input
                    type="number"
                    min="40"
                    max="220"
                    value={newSongForm.bpm}
                    onChange={(e) => setNewSongForm({ ...newSongForm, bpm: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 text-center font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Key (Tono)</label>
                  <input
                    type="text"
                    value={newSongForm.key}
                    onChange={(e) => setNewSongForm({ ...newSongForm, key: e.target.value })}
                    placeholder="Am, C, G..."
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 text-center font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Duración (seg)</label>
                  <input
                    type="number"
                    min="30"
                    max="900"
                    value={newSongForm.durationSeconds}
                    onChange={(e) => setNewSongForm({ ...newSongForm, durationSeconds: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 text-center font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">URL de Audio / Video (Opcional)</label>
                <input
                  type="text"
                  value={newSongForm.fileUrl}
                  onChange={(e) => setNewSongForm({ ...newSongForm, fileUrl: e.target.value })}
                  placeholder="https://... o enlace a YouTube"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddSongModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
                >
                  Guardar en Biblioteca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR PLAYLIST PERSONALIZADA */}
      {isCreatePlaylistModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">Nueva Playlist</h3>
                <p className="text-xs text-zinc-400">Crea una colección temática para tu local.</p>
              </div>
              <button
                onClick={() => setIsCreatePlaylistModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylistSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Nombre de la Playlist *</label>
                <input
                  type="text"
                  required
                  value={newPlaylistForm.name}
                  onChange={(e) => setNewPlaylistForm({ ...newPlaylistForm, name: e.target.value })}
                  placeholder="Ej: Cumbias del Recuerdo, Hora Pico DJ..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={newPlaylistForm.description}
                  onChange={(e) => setNewPlaylistForm({ ...newPlaylistForm, description: e.target.value })}
                  placeholder="Breve reseña del estilo de música de esta lista..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Tipo de Colección</label>
                <select
                  value={newPlaylistForm.type}
                  onChange={(e) =>
                    setNewPlaylistForm({
                      ...newPlaylistForm,
                      type: e.target.value as "DJ" | "KARAOKE" | "BOTH",
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
                >
                  <option value="BOTH">Mixta (DJ y Karaoke)</option>
                  <option value="DJ">Exclusiva para DJ</option>
                  <option value="KARAOKE">Exclusiva para Karaoke</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Color de Portada</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Morado", val: "from-purple-600 to-indigo-700" },
                    { label: "Rosa", val: "from-pink-600 to-rose-700" },
                    { label: "Fuego", val: "from-amber-500 to-orange-600" },
                    { label: "Azul", val: "from-cyan-600 to-blue-700" },
                  ].map((c) => (
                    <button
                      type="button"
                      key={c.val}
                      onClick={() => setNewPlaylistForm({ ...newPlaylistForm, coverColor: c.val })}
                      className={`h-9 rounded-xl bg-gradient-to-r ${c.val} border-2 transition-all cursor-pointer ${
                        newPlaylistForm.coverColor === c.val ? "border-white scale-105" : "border-transparent"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreatePlaylistModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
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
