"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Mic,
  Tv,
  Users,
  Play,
  Pause,
  SkipForward,
  Megaphone,
  Shuffle,
  Music,
  Clock,
  Sparkles,
  Flame,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  PlusCircle,
  ExternalLink,
  Trash2,
  Dices,
  Trophy,
  Camera,
  Share2,
  Copy,
  Check,
  X,
  Disc3,
  Youtube,
  Send,
} from "lucide-react";
import KaraokeVideoModal from "@/components/dj/KaraokeVideoModal";
import DjSoundboard from "@/components/dj/DjSoundboard";
import ManualRequestModal from "@/components/dj/ManualRequestModal";
import ModeSettingsModal from "@/components/dashboard/ModeSettingsModal";
import TvDisplayConnectModal from "@/components/dashboard/TvDisplayConnectModal";
import { djSoundEffects } from "@/lib/audio/dj-audio-engine";
import { useRealtime } from "@/hooks/use-realtime";
import { RealtimeEventType } from "@/lib/realtime/event-bus";
import { calculateFairQueue, parseQueuePolicy, QueuePolicy } from "@/lib/dj/rotation";
import PwaInstallButton from "@/components/pwa/PwaInstallButton";

interface SongRequestData {
  id: string;
  status: string;
  customTitle: string | null;
  customArtist: string | null;
  notes: string | null;
  tipAmountCents?: number;
  createdAt: string;
  table: { id: string; number: number; label: string };
  guestSession: { id: string; guestName: string | null } | null;
  song: {
    id: string;
    title: string;
    durationSeconds: number;
    genre: string | null;
    bpm: number | null;
    key: string | null;
    artist: { name: string } | null;
  } | null;
  youtubeVideoId?: string | null;
}

interface QueueEntryData {
  id: string;
  orderIndex: number;
  status: string;
  songRequest: SongRequestData;
  youtubeVideoId?: string | null;
}

interface KaraokeBoothStateResponse {
  hasActiveEvent: boolean;
  event?: {
    id: string;
    name: string;
    code: string;
    venueName: string;
  };
  activeEvents?: Array<{
    id: string;
    name: string;
    code: string;
    venueName: string;
  }>;
  tables?: Array<{
    id: string;
    number: number;
    label: string;
    qrToken: string;
    zone?: string;
  }>;
  pendingRequests: SongRequestData[];
  queue: QueueEntryData[];
  currentPlaying: QueueEntryData | null;
  recentHistory: QueueEntryData[];
  stats: {
    pending: number;
    queued: number;
    playing: number;
    played: number;
    rejected: number;
    totalRequests: number;
  };
}

interface PhotoItem {
  id: string;
  guestName: string;
  imageUrl: string;
  caption: string | null;
  status: string;
  createdAt: string;
  table: { label: string; number: number };
}

interface LiveDuelData {
  id: string;
  eventId: string;
  optionA: { id: "A"; title: string; artist: string; tableLabel?: string; votes: number };
  optionB: { id: "B"; title: string; artist: string; tableLabel?: string; votes: number };
  status: "ACTIVE" | "FINISHED";
  endsAt: string;
  totalVotes: number;
}

export default function KaraokeBoothPage() {
  const [data, setData] = useState<KaraokeBoothStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Política Fair-Play y Modos
  const [policy, setPolicy] = useState<QueuePolicy>(parseQueuePolicy(null));
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);

  // Reproductor / Progreso del cantante al aire
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSeconds, setPlaybackSeconds] = useState(25);

  // Video de YouTube para el cantante
  const [selectedKaraokeVideoId, setSelectedKaraokeVideoId] = useState<string | null>(null);
  const [isTvVideoEnabled, setIsTvVideoEnabled] = useState(true);
  const [isKaraokeModalOpen, setIsKaraokeModalOpen] = useState(false);
  const [karaokeResults, setKaraokeResults] = useState<
    Array<{
      id: string;
      title: string;
      channelTitle: string;
      thumbnail: string;
      embedUrl: string;
    }>
  >([]);
  const [isSearchingKaraoke, setIsSearchingKaraoke] = useState(false);

  // Modal de Solicitud Manual
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Duelos & Fotos
  const [duel, setDuel] = useState<LiveDuelData | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activePhotoTab, setActivePhotoTab] = useState<"PENDING" | "APPROVED">("PENDING");
  const [isRouletteSpinning, setIsRouletteSpinning] = useState(false);
  const [rouletteWinner, setRouletteWinner] = useState<string | null>(null);

  // Feedback Toast
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const showFeedback = (type: "success" | "error" | "info", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  // 1. Cargar Estado de la Cabina
  const fetchBoothState = async (eventId?: string) => {
    try {
      const url = eventId
        ? `/api/v1/dj/state?eventId=${eventId}`
        : selectedEventId
        ? `/api/v1/dj/state?eventId=${selectedEventId}`
        : "/api/v1/dj/state";

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);

        if (!selectedEventId && json.data.event) {
          setSelectedEventId(json.data.event.id);
        }

        // Sincronizar video de YouTube del tema al aire
        if (json.data.currentPlaying?.youtubeVideoId) {
          setSelectedKaraokeVideoId(json.data.currentPlaying.youtubeVideoId);
        }
      }
    } catch (err) {
      console.error("Error al cargar estado de Cabina Karaoke:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Cargar Política del Evento
  const fetchPolicy = async (eventId?: string) => {
    const id = eventId || selectedEventId || data?.event?.id;
    if (!id) return;
    try {
      const res = await fetch(`/api/v1/dj/queue/policy?eventId=${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data?.policy) {
          setPolicy(json.data.policy);
        }
      }
    } catch (err) {
      console.error("Error al cargar política de Karaoke:", err);
    }
  };

  // 3. Cargar Fotos y Duelos
  const fetchPhotos = async () => {
    const eventId = selectedEventId || data?.event?.id;
    if (!eventId) return;
    try {
      const res = await fetch(`/api/v1/photos?eventId=${eventId}`);
      if (res.ok) {
        const json = await res.json();
        const photosList = Array.isArray(json.data?.photos)
          ? json.data.photos
          : Array.isArray(json.data)
          ? json.data
          : [];
        setPhotos(photosList);
      }
    } catch {
      // Silencioso
    }
  };

  const fetchDuel = async () => {
    const eventId = selectedEventId || data?.event?.id;
    if (!eventId) return;
    try {
      const res = await fetch(`/api/v1/dj/duel?eventId=${eventId}`);
      if (res.ok) {
        const json = await res.json();
        setDuel(json.data || null);
      }
    } catch {
      // Silencioso
    }
  };

  useEffect(() => {
    fetchBoothState();
    const interval = setInterval(() => {
      fetchBoothState();
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedEventId || data?.event?.id) {
      fetchPolicy();
      fetchPhotos();
      fetchDuel();
    }
  }, [selectedEventId, data?.event?.id]);

  // Temporizador de Progreso del Tema
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && data?.currentPlaying) {
      timer = setInterval(() => {
        setPlaybackSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, data?.currentPlaying]);

  // Reset de tiempo cuando cambia la canción al aire
  useEffect(() => {
    setPlaybackSeconds(0);
    if (data?.currentPlaying?.youtubeVideoId) {
      setSelectedKaraokeVideoId(data.currentPlaying.youtubeVideoId);
    }
  }, [data?.currentPlaying?.id]);

  // 4. Suscripción en Tiempo Real (SSE)
  useRealtime({
    eventId: selectedEventId || data?.event?.id,
    onEvent: (type: RealtimeEventType) => {
      if (
        type === "REQUEST_NEW" ||
        type === "QUEUE_UPDATE" ||
        type === "TRACK_CHANGE"
      ) {
        fetchBoothState();
      } else if (type === "QUEUE_POLICY_UPDATED") {
        fetchPolicy();
      } else if (
        type === "PHOTO_NEW" ||
        type === "PHOTO_APPROVED" ||
        type === "PHOTO_REJECTED" ||
        type === "PHOTO_REMOVED"
      ) {
        fetchPhotos();
      } else if (type === "DUEL_UPDATE") {
        fetchDuel();
      }
    },
  });

  // 📢 Llamar al Escenario a un Cantante (Singer Call)
  const handleCallSinger = async (requestOrEntry?: any) => {
    const trackToCall =
      requestOrEntry?.songRequest ||
      requestOrEntry ||
      data?.currentPlaying?.songRequest;
    const eventId = selectedEventId || data?.event?.id;
    if (!eventId || !trackToCall) {
      showFeedback("error", "No hay ningún cantante seleccionado para llamar");
      return;
    }

    try {
      djSoundEffects.playStageChime();
      const res = await fetch("/api/v1/dj/interactive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CALL_SINGER",
          eventId,
          targetTableLabel: trackToCall.table?.label,
          singerName: trackToCall.guestSession?.guestName || null,
          songTitle: trackToCall.song?.title || trackToCall.customTitle,
          artist: trackToCall.song?.artist?.name || trackToCall.customArtist,
        }),
      });

      if (res.ok) {
        showFeedback(
          "success",
          `📢 ¡Llamando a ${
            trackToCall.guestSession?.guestName || trackToCall.table?.label || "cantante"
          } al escenario en la TV!`
        );
      } else {
        showFeedback("error", "No se pudo enviar el llamado a pantalla");
      }
    } catch {
      showFeedback("error", "Error de conexión al llamar al cantante");
    }
  };

  // ⏭️ Siguiente Cantante (Ceder Micrófono & Canta y Libera)
  const handleNextSinger = async () => {
    if (!data?.queue || data.queue.length === 0) {
      showFeedback("info", "No hay más cantantes en la cola");
      return;
    }

    const nextEntry = data.queue[0];
    setActionLoading("next");

    try {
      const res = await fetch("/api/v1/dj/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queueEntryId: nextEntry.id,
          status: "CURRENT",
        }),
      });

      if (res.ok) {
        showFeedback(
          "success",
          `🎤 ¡Micrófono cedido a ${
            nextEntry.songRequest.guestSession?.guestName || nextEntry.songRequest.table.label
          }!`
        );
        fetchBoothState();
      } else {
        showFeedback("error", "Error al avanzar al siguiente cantante");
      }
    } catch {
      showFeedback("error", "Error de red");
    } finally {
      setActionLoading(null);
    }
  };

  // ⚖️ Rotación Fair-Play ("Canta y Libera")
  const handleFairRotation = async () => {
    if (!data?.queue || data.queue.length <= 1) return;

    setActionLoading("rotate");
    try {
      const rotatable = data.queue.map((q) => ({
        id: q.id,
        tableId: q.songRequest.table.id,
        orderIndex: q.orderIndex,
        createdAt: q.songRequest.createdAt,
      }));

      const balanced = calculateFairQueue(rotatable);
      const reorderedQueueIds = balanced.map((b) => b.id);

      const res = await fetch("/api/v1/dj/queue", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId || data?.event?.id,
          reorderedQueueIds,
        }),
      });

      if (res.ok) {
        showFeedback("success", "⚖️ Cola de cantantes equilibrada con Fair-Play");
        fetchBoothState();
      } else {
        showFeedback("error", "No se pudo balancear la cola");
      }
    } catch {
      showFeedback("error", "Error al ejecutar rotación equitativa");
    } finally {
      setActionLoading(null);
    }
  };

  // Buscar Videos de Karaoke en YouTube
  const handleSearchKaraoke = async (customQuery?: string) => {
    const current = data?.currentPlaying?.songRequest;
    const q =
      customQuery ||
      `${current?.song?.title || current?.customTitle || ""} ${
        current?.song?.artist?.name || current?.customArtist || ""
      } karaoke`.trim();

    if (!q) return;

    setIsSearchingKaraoke(true);
    try {
      const res = await fetch(`/api/v1/karaoke/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const json = await res.json();
        setKaraokeResults(json.data || []);
      }
    } catch {
      showFeedback("error", "Error al buscar en YouTube");
    } finally {
      setIsSearchingKaraoke(false);
    }
  };

  // Asignar Video de YouTube a Pantalla y Cantante
  const handleSelectKaraokeVideo = async (videoId: string, title?: string) => {
    setSelectedKaraokeVideoId(videoId);
    setIsKaraokeModalOpen(false);

    const eventId = selectedEventId || data?.event?.id;
    const currentPlayingId = data?.currentPlaying?.id;

    if (eventId) {
      try {
        await fetch("/api/v1/dj/interactive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UPDATE_KARAOKE_VIDEO",
            eventId,
            queueEntryId: currentPlayingId,
            videoId,
            videoTitle: title || "Pista Karaoke",
            isVideoEnabled: isTvVideoEnabled,
          }),
        });
        showFeedback("success", `🎬 Pista sincronizada: "${title || videoId}"`);
      } catch {
        showFeedback("error", "Error al sincronizar con la pantalla TV");
      }
    }
  };

  // Alternar Video en la Pantalla TV
  const handleToggleTvVideo = async () => {
    const nextState = !isTvVideoEnabled;
    setIsTvVideoEnabled(nextState);

    const eventId = selectedEventId || data?.event?.id;
    if (eventId) {
      try {
        await fetch("/api/v1/dj/interactive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UPDATE_KARAOKE_VIDEO",
            eventId,
            videoId: selectedKaraokeVideoId,
            isVideoEnabled: nextState,
          }),
        });
        showFeedback(
          "info",
          nextState ? "📺 Video en TV activado" : "📺 TV en modo visualizador clásico"
        );
      } catch {
        // Silencioso
      }
    }
  };

  // Moderación de Solicitudes de Cantantes
  const handleModerateRequest = async (requestId: string, status: "ACCEPTED" | "REJECTED") => {
    setActionLoading(requestId);
    try {
      const res = await fetch("/api/v1/dj/requests/moderate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status }),
      });

      if (res.ok) {
        showFeedback(
          "success",
          status === "ACCEPTED"
            ? "🎤 Solicitud aprobada y agregada a la cola"
            : "❌ Solicitud rechazada"
        );
        fetchBoothState();
      } else {
        showFeedback("error", "No se pudo actualizar la solicitud");
      }
    } catch {
      showFeedback("error", "Error al moderar solicitud");
    } finally {
      setActionLoading(null);
    }
  };

  // Moderación rápida de fotos de mesas
  const handleModeratePhoto = async (
    photoId: string,
    action: "APPROVE" | "REJECT" | "REMOVE"
  ) => {
    setActionLoading(photoId);
    try {
      const res = await fetch(`/api/v1/photos/${photoId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        if (action === "APPROVE") {
          showFeedback("success", "¡Foto aprobada para TV!");
        } else if (action === "REJECT") {
          showFeedback("info", "Foto rechazada");
        } else if (action === "REMOVE") {
          showFeedback("success", "Foto retirada de TV");
        }
        fetchPhotos();
      } else {
        showFeedback("error", "No se pudo actualizar la foto");
      }
    } catch {
      showFeedback("error", "Error al procesar la foto");
    } finally {
      setActionLoading(null);
    }
  };

  // Formateador de tiempo
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const currentTrack = data?.currentPlaying?.songRequest;
  const trackDuration = currentTrack?.song?.durationSeconds || 240;
  const progressPercent = Math.min(100, Math.round((playbackSeconds / trackDuration) * 100));

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl border text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-xl transition-all ${
            feedback.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : feedback.type === "error"
              ? "bg-red-950/90 border-red-500/50 text-red-200"
              : "bg-cyan-950/90 border-cyan-500/50 text-cyan-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : feedback.type === "error" ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 1. HEADER DE LA CABINA KARAOKE */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-cyan-950/80 via-zinc-900/90 to-zinc-950 border-2 border-cyan-500/30 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                <Mic className="w-3 h-3" />
                <span>CABINA KARAOKE &bull; KJ HOST CONSOLE</span>
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {data?.event?.venueName || "Escenario Principal"}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="truncate">{data?.event?.name || "Noche de Karaoke"}</span>
              <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 animate-pulse shrink-0">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                Escenario Activo
              </span>
            </h1>

            <p className="text-xs text-zinc-400">
              Operación 100% dedicada al animador/KJ: llamados al escenario, letras en TV y equidad
              Fair-Play.
            </p>
          </div>

          {/* Botones de Cabecera */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Cambiar a Cabina DJ */}
            <Link
              href="/dashboard/dj"
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20 group"
              title="Abrir la Consola Virtual DJ Dual-Deck"
            >
              <Disc3 className="w-4 h-4 group-hover:rotate-45 transition-transform shrink-0" />
              <span>Ir a Cabina DJ</span>
            </Link>

            {/* Cargar Cantante Manual */}
            <button
              type="button"
              onClick={() => setIsManualModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/30 cursor-pointer"
              title="Anotar a un cantante verbalmente sin que use el QR"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>+ Cargar Cantante</span>
            </button>

            {/* Configurar Karaoke */}
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Configuración</span>
            </button>

            {/* Pantalla TV & Multipantalla (Smart TV / 3ra Pantalla) */}
            {data?.event?.code && (
              <button
                type="button"
                onClick={() => setIsTvModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-950 to-zinc-900 hover:from-cyan-900/60 hover:to-zinc-800 border-2 border-cyan-500/50 text-cyan-300 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20 group"
                title="Conectar Smart TV desde celular o 3ra Pantalla desde PC"
              >
                <Tv className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
                <span>Pantalla TV & Multipantalla</span>
              </button>
            )}

            <PwaInstallButton
              label="Instalar App KJ"
              className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-white"
            />
          </div>
        </div>
      </div>

      {/* 2. ESCENARIO CENTRAL: CANTANTE AL AIRE & PRÓXIMOS TURNOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CANTANTE EN ESCENARIO (Col 7) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-cyan-950/40 border-2 border-cyan-500/50 shadow-2xl relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-xs font-black tracking-widest uppercase shadow-md shadow-cyan-600/30 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5" />
                <span>AL AIRE &bull; EN ESCENARIO</span>
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              {currentTrack?.tipAmountCents && currentTrack.tipAmountCents > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] font-black">
                  ⭐ VIP FAST-PASS (${(currentTrack.tipAmountCents / 100).toFixed(2)})
                </span>
              ) : null}
            </div>

            {currentTrack?.table && (
              <span className="px-3 py-1 rounded-xl bg-zinc-950 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-black">
                {currentTrack.table.label}
              </span>
            )}
          </div>

          {currentTrack ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {/* Spotlight Mic Visual */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border-2 border-cyan-500/40 shadow-xl flex items-center justify-center">
                    <Mic className="w-10 h-10 text-cyan-300 animate-bounce" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black uppercase text-cyan-400 tracking-wider">
                    {currentTrack.guestSession?.guestName
                      ? `🎤 Cantante: ${currentTrack.guestSession.guestName}`
                      : `🎤 Mesa: ${currentTrack.table?.label || "Sin mesa"}`}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white truncate drop-shadow-md">
                    {currentTrack.song?.title || currentTrack.customTitle || "Canción de Karaoke"}
                  </h2>
                  <p className="text-sm font-semibold text-zinc-300 truncate">
                    {currentTrack.song?.artist?.name ||
                      currentTrack.customArtist ||
                      "Pista personalizada"}
                  </p>

                  <div className="flex items-center gap-2 mt-2 text-[11px] font-mono flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-zinc-950 text-zinc-300 border border-zinc-800">
                      TONO: {currentTrack.song?.key || "Original"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-950 text-purple-300 border border-zinc-800 font-bold">
                      REGLA: Canta y Libera
                    </span>
                  </div>
                </div>
              </div>

              {/* Dedicatoria del Cantante */}
              {currentTrack.notes && (
                <div className="p-3 rounded-xl bg-cyan-950/50 border border-cyan-800/80 text-xs text-cyan-100 italic">
                  &ldquo;{currentTrack.notes}&rdquo;
                  {currentTrack.guestSession?.guestName && (
                    <span className="block not-italic font-bold text-[10px] text-cyan-300 mt-1">
                      &mdash; Dedicado por {currentTrack.guestSession.guestName}
                    </span>
                  )}
                </div>
              )}

              {/* Barra de Progreso */}
              <div className="space-y-1">
                <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-1000"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                  <span>{formatTime(playbackSeconds)}</span>
                  <span>{formatTime(trackDuration)}</span>
                </div>
              </div>

              {/* Preview de YouTube en Cabina (si el video está activo) */}
              {isTvVideoEnabled && (
                <div className="p-3 rounded-2xl bg-zinc-950/90 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Pista con Letras proyectada en TV (YouTube):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsKaraokeModalOpen(true);
                        handleSearchKaraoke();
                      }}
                      className="text-[11px] text-cyan-400 hover:text-cyan-200 underline font-bold cursor-pointer"
                    >
                      Cambiar Pista ({karaokeResults.length || "Buscar"}) ▾
                    </button>
                  </div>
                  <div className="relative aspect-video max-h-48 w-full rounded-xl overflow-hidden border border-zinc-800 bg-black">
                    {selectedKaraokeVideoId ? (
                      <iframe
                        key={selectedKaraokeVideoId}
                        src={`https://www.youtube.com/embed/${selectedKaraokeVideoId}?enablejsapi=1`}
                        title="Karaoke Video Preview"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 text-xs p-4 text-center">
                        <Youtube className="w-8 h-8 text-red-500/50 mb-1" />
                        <span>Sin video asignado. Haz clic en &ldquo;Cambiar Pista&rdquo; para vincular una versión de YouTube.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3">
              <Mic className="w-12 h-12 text-zinc-700 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Escenario Libre</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  No hay ningún cantante cantando en este momento. Selecciona el siguiente turno de
                  la cola o llama a una mesa.
                </p>
              </div>
            </div>
          )}

          {/* ACCIONES DEL KJ HOST */}
          <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Botón Llamar Cantante al Escenario */}
              <button
                type="button"
                onClick={() => handleCallSinger()}
                disabled={!currentTrack}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 shadow-md shadow-cyan-600/30"
                title="Emite sonido y muestra en la pantalla de TV gigante que suban a cantar"
              >
                <Megaphone className="w-4 h-4" />
                <span>Llamar al Escenario</span>
              </button>

              {/* Toggle Video en TV */}
              <button
                type="button"
                onClick={handleToggleTvVideo}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isTvVideoEnabled
                    ? "bg-cyan-600/20 hover:bg-cyan-600/30 border-cyan-500/50 text-cyan-200"
                    : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-400"
                }`}
                title="Alternar entre video con letras de YouTube y visualizador de fiesta en la TV"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Video TV: {isTvVideoEnabled ? "ON" : "OFF"}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={!currentTrack}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? "Pausar" : "Seguir"}</span>
              </button>

              <button
                type="button"
                onClick={handleNextSinger}
                disabled={!data?.queue || data.queue.length === 0 || actionLoading === "next"}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 shadow-md shadow-emerald-600/30"
                title="Termina este turno, libera el cupo de la mesa (Canta y Libera) y sube al siguiente cantante"
              >
                <span>Ceder Micrófono &rarr;</span>
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* PRÓXIMOS TURNOS EN ROTACIÓN FAIR-PLAY (Col 5) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Próximos Turnos ({data?.queue?.length || 0})
              </h3>
            </div>
            <button
              type="button"
              onClick={handleFairRotation}
              disabled={!data?.queue || data.queue.length <= 1 || actionLoading === "rotate"}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer flex items-center gap-1 disabled:opacity-40"
              title="Intercala turnos entre mesas para máxima equidad"
            >
              <Shuffle className="w-3 h-3" />
              <span>Rotar Mesas</span>
            </button>
          </div>

          {!data?.queue || data.queue.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 space-y-2">
              <Music className="w-10 h-10 mx-auto text-zinc-700" />
              <p className="text-xs text-zinc-400">No hay más cantantes en espera.</p>
              <p className="text-[10px] text-zinc-500">
                Las mesas pueden pedir temas desde su celular escaneando el QR.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
              {data.queue.map((entry, index) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800/90 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-zinc-900 text-cyan-400 border border-zinc-800 flex items-center justify-center font-mono font-black text-xs shrink-0">
                      #{index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {entry.songRequest.song?.title ||
                          entry.songRequest.customTitle ||
                          "Canción"}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1.5">
                        <span>
                          {entry.songRequest.guestSession?.guestName
                            ? `${entry.songRequest.guestSession.guestName} (${entry.songRequest.table.label})`
                            : entry.songRequest.table.label}
                        </span>
                        {entry.songRequest.tipAmountCents &&
                        entry.songRequest.tipAmountCents > 0 ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                            ⭐ Fast-Pass
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCallSinger(entry)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-cyan-950 text-zinc-400 hover:text-cyan-300 border border-zinc-700 hover:border-cyan-700 transition-colors cursor-pointer"
                      title="Llamar a esta mesa al escenario"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Fair-Play activo: 1 turno por mesa</span>
            <span className="font-mono text-cyan-400 font-bold">Canta y Libera</span>
          </div>
        </div>
      </div>

      {/* 3. SOUNDBOARD FX LAUNCHPAD PARA EL ANIMADOR/KJ */}
      <DjSoundboard mode="KARAOKE" />

      {/* 4. COLUMNAS DIVIDIDAS: Bandeja de Solicitudes Entrantes & Dinámicas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLUMNA IZQUIERDA: Solicitudes de Cantantes (Bandeja de Moderación) */}
        <div className="p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white">Solicitudes de Cantantes</h2>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">
                {data?.pendingRequests.length || 0}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500">De las mesas al KJ</span>
          </div>

          {!data?.pendingRequests || data.pendingRequests.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-zinc-700" />
              <p className="text-xs text-zinc-400">No hay solicitudes pendientes de cantantes.</p>
              <p className="text-[10px] text-zinc-500">
                Los clientes pueden pedir canciones desde su celular.
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[500px]">
              {data.pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 hover:border-cyan-500/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">
                        {req.song?.title || req.customTitle || "Canción solicitada"}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">
                        {req.song?.artist?.name || req.customArtist || "Artista"}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-cyan-400 font-medium">
                        <span>{req.table.label}</span>
                        {req.guestSession?.guestName && (
                          <span>&bull; Cantante: {req.guestSession.guestName}</span>
                        )}
                        {req.tipAmountCents && req.tipAmountCents > 0 ? (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                            ⭐ Fast-Pass (${(req.tipAmountCents / 100).toFixed(2)})
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-500 font-mono">
                      {new Date(req.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {req.notes && (
                    <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 italic">
                      &ldquo;{req.notes}&rdquo;
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-900">
                    <button
                      type="button"
                      onClick={() => handleModerateRequest(req.id, "REJECTED")}
                      disabled={actionLoading === req.id}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-800 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModerateRequest(req.id, "ACCEPTED")}
                      disabled={actionLoading === req.id}
                      className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-black transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-600/30"
                    >
                      Aprobar a Cola
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: Dinámicas del Escenario (Fotos y Duelos) */}
        <div className="p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-pink-400" />
              <h2 className="text-base font-bold text-white">Muro de Fotos en Pantalla TV</h2>
              <span className="px-2 py-0.5 rounded-full bg-pink-950 text-pink-300 border border-pink-800 text-[10px] font-bold">
                {(Array.isArray(photos) ? photos : []).length}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setActivePhotoTab("PENDING")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                  activePhotoTab === "PENDING"
                    ? "bg-pink-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Por Moderar
              </button>
              <button
                type="button"
                onClick={() => setActivePhotoTab("APPROVED")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                  activePhotoTab === "APPROVED"
                    ? "bg-pink-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                En TV
              </button>
            </div>
          </div>

          {(Array.isArray(photos) ? photos : []).filter((p) => p.status === activePhotoTab).length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <Camera className="w-8 h-8 mx-auto text-zinc-700" />
              <p className="text-xs text-zinc-400">
                {activePhotoTab === "PENDING"
                  ? "No hay fotos pendientes de moderación."
                  : "No hay fotos rotando en la TV actualmente."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[460px]">
              {(Array.isArray(photos) ? photos : [])
                .filter((p) => p.status === activePhotoTab)
                .map((photo) => (
                  <div
                    key={photo.id}
                    className="p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-square rounded-xl overflow-hidden bg-black border border-zinc-800 relative">
                        <img
                          src={photo.imageUrl}
                          alt={photo.caption || "Foto"}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur text-pink-300 font-mono text-[9px] font-bold">
                          {photo.table.label}
                        </span>
                      </div>
                      <div className="text-xs text-white font-bold truncate mt-1">
                        de {photo.guestName}
                      </div>
                      {photo.caption && (
                        <p className="text-[10px] text-zinc-400 italic line-clamp-1">
                          &ldquo;{photo.caption}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Botones de Moderación Rápida */}
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-zinc-800/80">
                      {photo.status === "PENDING" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleModeratePhoto(photo.id, "APPROVE")}
                            disabled={actionLoading === photo.id}
                            className="flex-1 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3 h-3" />
                            <span>Aprobar TV</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModeratePhoto(photo.id, "REJECT")}
                            disabled={actionLoading === photo.id}
                            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-700 hover:border-red-800 text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                            title="Rechazar foto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleModeratePhoto(photo.id, "REMOVE")}
                          disabled={actionLoading === photo.id}
                          className="w-full py-1 rounded-lg bg-zinc-800 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-700 hover:border-red-800 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Quitar de TV</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Modales de Karaoke */}
      <KaraokeVideoModal
        isOpen={isKaraokeModalOpen}
        onClose={() => setIsKaraokeModalOpen(false)}
        currentSongTitle={currentTrack?.song?.title || currentTrack?.customTitle || ""}
        currentSongArtist={currentTrack?.song?.artist?.name || currentTrack?.customArtist || ""}
        selectedVideoId={selectedKaraokeVideoId}
        onSelectVideo={handleSelectKaraokeVideo}
        results={karaokeResults}
        isSearching={isSearchingKaraoke}
        onSearch={handleSearchKaraoke}
        isTvVideoEnabled={isTvVideoEnabled}
        onToggleTvVideo={handleToggleTvVideo}
      />

      <ManualRequestModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        eventId={selectedEventId || data?.event?.id || ""}
        tables={data?.tables || []}
        isKaraokeMode={true}
        onSuccess={() => {
          showFeedback("success", "🎤 Cantante anotado con éxito");
          fetchBoothState();
        }}
      />

      {data?.event && (
        <ModeSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          eventId={data.event.id}
          eventName={data.event.name}
          initialPolicy={policy}
          onPolicyUpdated={(newPolicy) => {
            setPolicy(newPolicy);
            showFeedback("success", "Configuración de modos actualizada");
          }}
        />
      )}

      {data?.event && (
        <TvDisplayConnectModal
          isOpen={isTvModalOpen}
          onClose={() => setIsTvModalOpen(false)}
          eventCode={data.event.code}
          eventName={data.event.name}
          venueName={data.event.venueName}
        />
      )}
    </div>
  );
}
