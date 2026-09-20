"use client";

import { useState, useEffect, useRef } from "react";
import {
  Disc3,
  Play,
  Pause,
  SkipForward,
  Check,
  X,
  Clock,
  Sparkles,
  Users,
  Shuffle,
  Volume2,
  Radio,
  Sliders,
  Flame,
  Music,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Laptop,
  Cake,
  Heart,
  Users2,
  Zap,
  ArrowRight,
  Camera,
  Swords,
  Scale,
  Mic,
  PauseCircle,
  PlayCircle,
  Trash2,
  Dices,
  Trophy,
  QrCode,
  Share2,
  Copy,
  Send,
  Megaphone,
  ExternalLink,
  PlusCircle,
  Tv,
  Youtube,
} from "lucide-react";
import Link from "next/link";
import DjBridgeModal from "@/components/dj/DjBridgeModal";
import DjSoundboard from "@/components/dj/DjSoundboard";
import ManualRequestModal from "@/components/dj/ManualRequestModal";
import VirtualDjConsole from "@/components/dj/VirtualDjConsole";
import KaraokeVideoModal from "@/components/dj/KaraokeVideoModal";
import ModeSettingsModal from "@/components/dashboard/ModeSettingsModal";
import { calculateCrossfaderGains, djSoundEffects } from "@/lib/audio/dj-audio-engine";
import { generateQueueIntelligence, QueueSuggestion } from "@/lib/dj/queue-intelligence";
import { useRealtime } from "@/hooks/use-realtime";
import { RealtimeEventType } from "@/lib/realtime/event-bus";
import { parseQueuePolicy, QueuePolicy } from "@/lib/dj/rotation";
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

interface QueueEntryData {
  id: string;
  orderIndex: number;
  status: string;
  songRequest: SongRequestData;
  youtubeVideoId?: string | null;
}

interface DjStateResponse {
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

interface QueuePolicyState {
  maxActivePerTable: number;
  queuePaused: boolean;
  rotationMode: "ROUND_ROBIN" | "FIFO";
  zone: "DJ" | "KARAOKE" | "MAIN";
  avgSongDurationMinutes: number;
  photosAllowed?: boolean;
  photoRotationSeconds?: number;
  photoFitMode?: "BLUR_FILL" | "CONTAIN" | "COVER";
  nightMode?: "KARAOKE_ONLY" | "DJ_ONLY" | "HYBRID";
}

export default function DjBoothPage() {
  const [data, setData] = useState<DjStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ⚖️ Fair-Play Queue Policy State
  const [queuePolicy, setQueuePolicy] = useState<QueuePolicyState>({
    maxActivePerTable: 2,
    queuePaused: false,
    rotationMode: "FIFO",
    zone: "DJ",
    avgSongDurationMinutes: 4,
    photosAllowed: true,
    photoRotationSeconds: 8,
    photoFitMode: "BLUR_FILL",
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);

  // Reproductor simulado en vivo
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSeconds, setPlaybackSeconds] = useState(35);
  const [crossfaderValue, setCrossfaderValue] = useState(0); // -100 (Deck A) a +100 (Deck B)
  const crossfaderGains = calculateCrossfaderGains(crossfaderValue);
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);

  // Solicitud pendiente de carga de pista a bandeja de la consola DJ
  const [pendingDeckLoad, setPendingDeckLoad] = useState<{
    entry: QueueEntryData;
    targetDeck?: "AUTO" | "A" | "B";
    timestamp: number;
  } | null>(null);

  // Mensaje de notificación
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const showFeedback = (
    type: "success" | "error" | "info",
    text: string
  ) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Momento de la noche seleccionado
  const [nightMoment, setNightMoment] = useState<
    "ALL" | "FIESTA" | "DUETOS" | "CUMPLEANOS" | "ROMANTICO" | "ULTIMA_LLAMADA"
  >("ALL");

  // ⚔️ Duelo Musical State
  const [isDuelModalOpen, setIsDuelModalOpen] = useState(false);
  const [activeDuel, setActiveDuel] = useState<LiveDuelData | null>(null);
  const [duelTrackA, setDuelTrackA] = useState({ title: "", artist: "", tableLabel: "" });
  const [duelTrackB, setDuelTrackB] = useState({ title: "", artist: "", tableLabel: "" });
  const [duelDuration, setDuelDuration] = useState(45);
  const [duelLoading, setDuelLoading] = useState(false);

  // 📸 Fotos de Mesas State
  const [pendingPhotos, setPendingPhotos] = useState<PhotoItem[]>([]);
  const [approvedPhotos, setApprovedPhotos] = useState<PhotoItem[]>([]);
  const [photoTab, setPhotoTab] = useState<"PENDING" | "LIVE">("PENDING");
  const [showPhotoDrawer, setShowPhotoDrawer] = useState(false);

  // 👏 Aplausómetro & Ruleta Interactive State
  const [isApplauseModalOpen, setIsApplauseModalOpen] = useState(false);
  const [applauseTarget, setApplauseTarget] = useState("");
  const [interactiveLoading, setInteractiveLoading] = useState(false);

  // 📲 Compartir Fiesta / Amigos QR & WhatsApp
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedShareTableId, setSelectedShareTableId] = useState<string>("");
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // ➕ Carga Manual de Pedidos (Fuera de App / QR)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // 🎤 Control de Video de Karaoke (YouTube Player & TV Broadcast)
  const [isKaraokeModalOpen, setIsKaraokeModalOpen] = useState(false);
  const [karaokeResults, setKaraokeResults] = useState<any[]>([]);
  const [selectedKaraokeVideoId, setSelectedKaraokeVideoId] = useState<string | null>(null);
  const [isTvVideoEnabled, setIsTvVideoEnabled] = useState(true);
  const [isSearchingKaraoke, setIsSearchingKaraoke] = useState(false);
  const [customKaraokeQuery, setCustomKaraokeQuery] = useState("");

  // Cargar estado de la cabina
  const fetchDjState = async (eventId?: string) => {
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
        const currentId = json.data.event?.id || selectedEventId;
        if (!selectedEventId && json.data.event) {
          setSelectedEventId(json.data.event.id);
        }

        if (currentId) {
          // Consultar duelo activo
          fetch(`/api/v1/dj/duel?eventId=${currentId}`)
            .then((r) => r.json())
            .then((dj) => {
              if (dj.success) setActiveDuel(dj.data);
            })
            .catch(() => {});

          // Consultar fotos pendientes
          fetch(`/api/v1/photos?eventId=${currentId}&status=PENDING`)
            .then((r) => r.json())
            .then((pj) => {
              if (pj.success && pj.data?.photos) setPendingPhotos(pj.data.photos);
            })
            .catch(() => {});

          // Consultar fotos al aire (aprobadas)
          fetch(`/api/v1/photos?eventId=${currentId}&status=APPROVED`)
            .then((r) => r.json())
            .then((pj) => {
              if (pj.success && pj.data?.photos) setApprovedPhotos(pj.data.photos);
            })
            .catch(() => {});

          // Consultar política de cola Fair-Play
          fetch(`/api/v1/dj/queue/policy?eventId=${currentId}`)
            .then((r) => r.json())
            .then((pol) => {
              if (pol.success && pol.data?.policy) setQueuePolicy(pol.data.policy);
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      console.error("Error al obtener estado de DJ:", err);
    } finally {
      setLoading(false);
    }
  };

  // Actualizar políticas de cola en tiempo real (Límite por mesa, Pausa, Zona)
  const handleUpdatePolicy = async (patch: Partial<QueuePolicyState>) => {
    const eventId = selectedEventId || data?.event?.id;
    if (!eventId) return;
    setQueuePolicy((prev) => ({ ...prev, ...patch }));
    setPolicyLoading(true);
    try {
      const res = await fetch("/api/v1/dj/queue/policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          ...patch,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setQueuePolicy(json.data);
        showFeedback("success", "Regla de cola actualizada");
      } else {
        showFeedback("error", json.error?.message || "Error al actualizar política");
      }
    } catch {
      showFeedback("error", "Error al comunicar con el servidor");
    } finally {
      setPolicyLoading(false);
    }
  };

  // Moderación rápida y control de fotos de mesas
  const handleModeratePhoto = async (
    photoId: string,
    action: "APPROVE" | "REJECT" | "REMOVE" | "FEATURE"
  ) => {
    setActionLoading(photoId);
    try {
      const res = await fetch(`/api/v1/photos/${photoId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (res.ok) {
        if (action === "APPROVE") {
          showFeedback("success", "¡Foto aprobada para proyectar en TV!");
          const target = pendingPhotos.find((p) => p.id === photoId);
          setPendingPhotos((prev) => prev.filter((p) => p.id !== photoId));
          if (target) setApprovedPhotos((prev) => [target, ...prev]);
        } else if (action === "REJECT") {
          showFeedback("info", "Foto rechazada");
          setPendingPhotos((prev) => prev.filter((p) => p.id !== photoId));
        } else if (action === "REMOVE") {
          showFeedback("success", "Foto retirada de la pantalla de TV");
          setApprovedPhotos((prev) => prev.filter((p) => p.id !== photoId));
        } else if (action === "FEATURE") {
          showFeedback("success", "⭐ ¡Foto proyectándose destacada en pantalla gigante!");
        }
      } else {
        showFeedback("error", json.error?.message || "Error al procesar foto");
      }
    } catch {
      showFeedback("error", "Error al procesar foto");
    } finally {
      setActionLoading(null);
    }
  };

  // 👏 Iniciar Aplausómetro
  const handleStartApplause = async (target?: string) => {
    const eventId = selectedEventId || data?.event?.id;
    if (!eventId) return;
    setInteractiveLoading(true);
    try {
      const res = await fetch("/api/v1/dj/interactive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "START_APPLAUSE",
          eventId,
          targetTableLabel: target || applauseTarget.trim() || undefined,
          durationSeconds: 15,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        showFeedback("success", "👏 ¡Aplausómetro activo en la pantalla gigante!");
        setIsApplauseModalOpen(false);
      } else {
        showFeedback("error", json.error?.message || "Error al iniciar aplausómetro");
      }
    } catch {
      showFeedback("error", "Error al comunicar con el servidor");
    } finally {
      setInteractiveLoading(false);
    }
  };

  // 🎰 Girar Ruleta de Mesas
  const handleSpinRoulette = async () => {
    const eventId = selectedEventId || data?.event?.id;
    if (!eventId) return;
    setInteractiveLoading(true);
    try {
      const res = await fetch("/api/v1/dj/interactive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SPIN_ROULETTE",
          eventId,
          prizeTitle: "¡Ronda de Shots de la Casa! 🍹",
        }),
      });
      const json = await res.json();
      if (res.ok) {
        showFeedback("success", `🎰 ¡Ruleta girando en la TV! Ganador: ${json.data?.winner}`);
      } else {
        showFeedback("error", json.error?.message || "Error al girar ruleta");
      }
    } catch {
      showFeedback("error", "Error al comunicar con el servidor");
    } finally {
      setInteractiveLoading(false);
    }
  };

  // 📢 Llamar al Escenario a un Cantante / Mesa (Karaoke Stage Call)
  const handleCallSinger = async (requestOrEntry?: any) => {
    const trackToCall =
      requestOrEntry?.songRequest ||
      requestOrEntry ||
      data?.currentPlaying?.songRequest;
    const eventId = selectedEventId || data?.event?.id;
    if (!eventId || !trackToCall) {
      showFeedback("error", "No hay ningún cantante o canción seleccionada para llamar");
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
        showFeedback("error", "No se pudo emitir el llamado al escenario");
      }
    } catch {
      showFeedback("error", "Error al emitir llamado de escenario");
    }
  };

  // Iniciar Duelo Musical en vivo
  const handleStartDuel = async () => {
    if (!data?.event?.id) return;
    if (!duelTrackA.title.trim() || !duelTrackB.title.trim()) {
      showFeedback("error", "Debes ingresar título para ambos tracks del duelo");
      return;
    }
    setDuelLoading(true);
    try {
      const res = await fetch("/api/v1/dj/duel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "START",
          eventId: data.event.id,
          trackA: {
            title: duelTrackA.title.trim(),
            artist: duelTrackA.artist.trim() || "Artista A",
            tableLabel: duelTrackA.tableLabel.trim() || undefined,
          },
          trackB: {
            title: duelTrackB.title.trim(),
            artist: duelTrackB.artist.trim() || "Artista B",
            tableLabel: duelTrackB.tableLabel.trim() || undefined,
          },
          durationSeconds: duelDuration,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setActiveDuel(json.data);
        setIsDuelModalOpen(false);
        showFeedback("success", "⚔️ ¡Duelo lanzado a la pantalla y mesas!");
      } else {
        showFeedback("error", json.error?.message || "Error al iniciar duelo");
      }
    } catch {
      showFeedback("error", "Error al conectar con el servidor de duelos");
    } finally {
      setDuelLoading(false);
    }
  };

  // Cancelar/Finalizar Duelo Musical
  const handleCancelDuel = async () => {
    if (!data?.event?.id) return;
    try {
      await fetch("/api/v1/dj/duel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CANCEL", eventId: data.event.id }),
      });
      setActiveDuel(null);
      showFeedback("success", "Duelo finalizado");
    } catch {
      showFeedback("error", "Error al cancelar duelo");
    }
  };

  // Conexión Realtime nativa SSE (0 ms) para eventos de sala y pedidos entrantes
  const { isConnected: isRealtime } = useRealtime({
    eventId: selectedEventId || data?.event?.id,
    onEvent: (type: RealtimeEventType, payload: any) => {
      if (type === "REQUEST_NEW") {
        fetchDjState();
        const isVIP =
          payload?.isFastPass ||
          (payload?.tipAmountCents && payload.tipAmountCents > 0);
        showFeedback(
          "info",
          `🎵 Nueva petición de ${payload?.table?.label || "Mesa"}${
            isVIP ? " (⭐ VIP FAST-PASS)" : ""
          }`
        );
      } else if (type === "PHOTO_NEW") {
        fetchDjState();
        showFeedback(
          "info",
          `📸 Nueva foto de mesa recibida para moderación`
        );
      } else if (type === "DUEL_UPDATE") {
        setActiveDuel(payload || null);
      } else if (type === "QUEUE_UPDATE" || type === "TRACK_CHANGE") {
        fetchDjState();
      } else if (type === "QUEUE_POLICY_UPDATED") {
        if (payload?.policy) {
          setQueuePolicy(payload.policy);
          showFeedback(
            "info",
            `Regla de cola: ${payload.policy.maxActivePerTable} tema(s)/mesa (${
              payload.policy.queuePaused ? "Pausada" : "Abierta"
            })`
          );
        }
      } else if (type === "QUEUE_SLOT_UNLOCKED") {
        fetchDjState();
        showFeedback(
          "success",
          `🎤 ${payload?.tableLabel || "Mesa"} completó su turno. ¡Cupo liberado!`
        );
      }
    },
  });

  // Polling de respaldo resiliente cada 15 segundos
  useEffect(() => {
    fetchDjState();
    const interval = setInterval(() => {
      fetchDjState();
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedEventId]);

  // Temporizador de reproducción visual
  useEffect(() => {
    if (!isPlaying || !data?.currentPlaying) return;
    const timer = setInterval(() => {
      setPlaybackSeconds((prev) => {
        const total =
          data.currentPlaying?.songRequest.song?.durationSeconds || 210;
        if (prev >= total) {
          // Auto avanzar
          handleNextTrack();
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, data?.currentPlaying]);

  // Aceptar solicitud a la cola
  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/v1/dj/requests/${requestId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPT" }),
      });
      if (res.ok) {
        showFeedback("success", "Canción aceptada y encolada");
        await fetchDjState();
      }
    } catch {
      showFeedback("error", "Error al procesar");
    } finally {
      setActionLoading(null);
    }
  };

  // Priorizar solicitudes con festejos o cumpleaños
  const handlePrioritizeCelebrations = async () => {
    if (!data?.event) return;
    const celeb = data.pendingRequests.find(
      (r) =>
        r.notes?.toLowerCase().includes("cumple") ||
        r.notes?.toLowerCase().includes("aniversario") ||
        r.notes?.includes("🎂") ||
        r.notes?.includes("💍") ||
        r.notes?.toLowerCase().includes("festejo")
    );
    if (celeb) {
      await handleAccept(celeb.id);
      showFeedback("success", `¡Tema de ${celeb.table.label} priorizado por celebración!`);
    } else {
      showFeedback("error", "No hay solicitudes pendientes con dedicatoria de festejo");
    }
  };

  // Rechazar solicitud
  const handleReject = async (requestId: string, reason = "No adecuada para este momento") => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/v1/dj/requests/${requestId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", rejectReason: reason }),
      });
      if (res.ok) {
        showFeedback("success", "Solicitud rechazada");
        await fetchDjState();
      }
    } catch {
      showFeedback("error", "Error al procesar");
    } finally {
      setActionLoading(null);
    }
  };

  // Cargar / Reproducir tema de la cola en la bandeja libre o seleccionada
  const handleLoadQueueEntry = async (entry: QueueEntryData, targetDeck: "AUTO" | "A" | "B" = "AUTO") => {
    // 1. Cargar y arrancar inmediatamente en la consola Virtual DJ en la bandeja correspondiente
    setPendingDeckLoad({ entry, targetDeck, timestamp: Date.now() });

    // 2. Notificar al backend de la acción
    try {
      const res = await fetch("/api/v1/dj/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PLAY", queueEntryId: entry.id }),
      });
      if (res.ok) {
        setPlaybackSeconds(0);
        setIsPlaying(true);
        await fetchDjState();
      }
    } catch {
      // Estado local ya activo
    }
  };

  // Reproducir un tema de la cola (compatibilidad)
  const handlePlayQueueEntry = async (queueEntryId: string) => {
    try {
      const entry = data?.queue?.find((q) => q.id === queueEntryId);
      if (entry) {
        setPendingDeckLoad({ entry, targetDeck: "AUTO", timestamp: Date.now() });
      }
      const res = await fetch("/api/v1/dj/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PLAY", queueEntryId }),
      });
      if (res.ok) {
        setPlaybackSeconds(0);
        setIsPlaying(true);
        await fetchDjState();
      }
    } catch {
      showFeedback("error", "Error al reproducir tema");
    }
  };

  // Avanzar a la siguiente canción
  const handleNextTrack = async () => {
    if (!data?.event) return;
    try {
      const res = await fetch("/api/v1/dj/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "NEXT", eventId: data.event.id }),
      });
      if (res.ok) {
        setPlaybackSeconds(0);
        setIsPlaying(true);
        showFeedback("success", "Siguiente tema en reproducción");
        await fetchDjState();
      }
    } catch {
      showFeedback("error", "Error al avanzar tema");
    }
  };

  // Aplicar rotación justa de mesas (Fair-Share)
  const handleFairRotation = async () => {
    if (!data?.event) return;
    try {
      const res = await fetch("/api/v1/dj/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ROTATE", eventId: data.event.id }),
      });
      if (res.ok) {
        showFeedback("success", "¡Rotación justa aplicada! Mesas intercaladas");
        await fetchDjState();
      }
    } catch {
      showFeedback("error", "Error al aplicar rotación");
    }
  };

  // Quitar de la cola
  const handleSkipQueueEntry = async (queueEntryId: string) => {
    try {
      const res = await fetch("/api/v1/dj/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SKIP", queueEntryId }),
      });
      if (res.ok) {
        showFeedback("success", "Tema removido de la cola");
        await fetchDjState();
      }
    } catch {
      showFeedback("error", "Error al quitar tema");
    }
  };

  const currentTrack = data?.currentPlaying?.songRequest;
  const nextTrack = data?.queue?.[0]?.songRequest;
  const trackDuration = currentTrack?.song?.durationSeconds || 210;
  const progressPercent = Math.min((playbackSeconds / trackDuration) * 100, 100);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // 🎤 Búsqueda y gestión de pistas de Karaoke en YouTube
  const handleSearchKaraoke = async (queryText?: string) => {
    const q =
      queryText ||
      (currentTrack
        ? `${currentTrack.song?.title || currentTrack.customTitle || ""} ${
            currentTrack.song?.artist?.name || currentTrack.customArtist || ""
          }`.trim()
        : "");
    if (!q) return;
    setIsSearchingKaraoke(true);
    try {
      const res = await fetch(`/api/v1/karaoke/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setKaraokeResults(json.data.results || []);
          if (json.data.recommended?.id) {
            setSelectedKaraokeVideoId(json.data.recommended.id);
            // Sincronizar automáticamente con la pantalla de TV
            handleSelectAndBroadcastVideo(
              json.data.recommended.id,
              json.data.recommended.title
            );
          }
        }
      }
    } catch (err) {
      console.warn("Error searching karaoke:", err);
    } finally {
      setIsSearchingKaraoke(false);
    }
  };

  const handleSelectAndBroadcastVideo = async (videoId: string, title?: string) => {
    setSelectedKaraokeVideoId(videoId);
    const eventId = selectedEventId || data?.event?.id;
    if (!eventId) return;
    try {
      await fetch("/api/v1/karaoke/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          videoId,
          videoTitle: title,
          isVideoEnabled: isTvVideoEnabled,
        }),
      });
      showFeedback("success", "🎬 Video de Karaoke proyectado en la TV");
    } catch (err) {
      console.error("Error broadcasting karaoke video:", err);
    }
  };

  const handleToggleTvVideo = async (enabled: boolean) => {
    setIsTvVideoEnabled(enabled);
    const eventId = selectedEventId || data?.event?.id;
    if (!eventId) return;
    try {
      await fetch("/api/v1/karaoke/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          videoId: selectedKaraokeVideoId,
          isVideoEnabled: enabled,
        }),
      });
      showFeedback("info", enabled ? "📺 Video Karaoke activado en la TV" : "📺 Modo vinilo en la TV");
    } catch (err) {
      console.error("Error toggling TV video:", err);
    }
  };

  // Auto-búsqueda de pista en YouTube al cambiar de tema
  useEffect(() => {
    if (currentTrack) {
      setSelectedKaraokeVideoId(null);
      handleSearchKaraoke();
    }
  }, [currentTrack?.id]);

  if (loading && !data) {
    return (
      <div className="p-16 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
        <Disc3 className="w-8 h-8 animate-spin text-purple-400" />
        <span className="text-xs">Conectando con la cabina del DJ en tiempo real...</span>
      </div>
    );
  }

  if (!data?.hasActiveEvent) {
    return (
      <div className="p-12 text-center bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-4">
        <Radio className="w-12 h-12 text-zinc-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">No hay eventos en vivo</h2>
        <p className="text-xs text-zinc-400">
          Para utilizar la cabina del DJ, activa un evento desde la sección de Eventos.
        </p>
      </div>
    );
  }

  const suggestions: QueueSuggestion[] = data
    ? generateQueueIntelligence({
        pendingRequests: data.pendingRequests,
        queue: data.queue,
        currentPlaying: data.currentPlaying,
        recentHistory: data.recentHistory,
      })
    : [];

  // Filtrado reactivo por Momento de la Noche
  const filteredPending = (data?.pendingRequests || []).filter((req) => {
    if (nightMoment === "ALL") return true;
    if (nightMoment === "CUMPLEANOS") {
      const n = (req.notes || "").toLowerCase();
      return (
        n.includes("cumple") ||
        n.includes("aniversario") ||
        n.includes("🎂") ||
        n.includes("💍") ||
        n.includes("festejo")
      );
    }
    if (nightMoment === "FIESTA") {
      const g = (req.song?.genre || "").toLowerCase();
      return (
        g.includes("pop") ||
        g.includes("dance") ||
        g.includes("reggaeton") ||
        (req.song?.bpm !== null && req.song?.bpm !== undefined && req.song.bpm >= 110)
      );
    }
    if (nightMoment === "ROMANTICO") {
      const g = (req.song?.genre || "").toLowerCase();
      return (
        g.includes("balada") ||
        g.includes("lento") ||
        g.includes("bolero") ||
        (req.song?.bpm !== null && req.song?.bpm !== undefined && req.song.bpm <= 100)
      );
    }
    if (nightMoment === "DUETOS") {
      const t = (req.song?.title || req.customTitle || "").toLowerCase();
      return t.includes("&") || t.includes("feat") || t.includes("duet");
    }
    return true;
  });

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden mx-auto">
      {/* 1. Header de Cabina & Selector de Evento */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-zinc-950 border border-zinc-800 text-center lg:text-left w-full max-w-full">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div
            className={`p-2.5 rounded-xl border transition-all shrink-0 ${
              queuePolicy.zone === "KARAOKE"
                ? "bg-cyan-600/20 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                : "bg-purple-600/20 border-purple-500/30 text-purple-400 glow-purple"
            }`}
          >
            {queuePolicy.zone === "KARAOKE" ? (
              <Mic className="w-6 h-6 animate-pulse text-cyan-300" />
            ) : (
              <Disc3 className="w-6 h-6 animate-spin [animation-duration:8s]" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  queuePolicy.zone === "KARAOKE"
                    ? "bg-cyan-950 text-cyan-300 border-cyan-800"
                    : "bg-emerald-950 text-emerald-300 border-emerald-800"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    queuePolicy.zone === "KARAOKE" ? "bg-cyan-400" : "bg-emerald-400"
                  } animate-pulse`}
                />
                {queuePolicy.zone === "KARAOKE" ? "CONSOLA KJ AL AIRE" : "CABINA DJ AL AIRE"}
              </span>
              {isRealtime && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-bold">
                  <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span>SSE 0ms</span>
                </span>
              )}
              <span className="text-xs font-mono text-zinc-500">CÓDIGO: {data.event?.code}</span>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap mt-2">
              {data.event && (
                <>
                  <a
                    href={`/display/${data.event.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-purple-950/60 border border-zinc-800 hover:border-purple-500/50 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Pantalla TV</span>
                  </a>

                  <button
                    onClick={() => {
                      if (data.tables && data.tables.length > 0 && !selectedShareTableId) {
                        setSelectedShareTableId(data.tables[0].id);
                      }
                      setIsShareModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-pink-600/30 via-purple-600/30 to-indigo-600/30 hover:from-pink-600/50 hover:to-indigo-600/50 border border-pink-500/40 text-pink-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    title="Compartir QR o Link de WhatsApp con tus amigos"
                  >
                    <QrCode className="w-3.5 h-3.5 text-pink-400" />
                    <span>📲 Invitar Amigos</span>
                  </button>

                  <button
                    onClick={() => setIsBridgeModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-cyan-950/60 border border-zinc-800 hover:border-cyan-500/50 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>DJ Bridge</span>
                  </button>

                  <button
                    onClick={() => setIsManualModalOpen(true)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border ${
                      queuePolicy.zone === "KARAOKE"
                        ? "bg-cyan-600/20 hover:bg-cyan-600/30 border-cyan-500/40 text-cyan-200"
                        : "bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/40 text-purple-200"
                    }`}
                    title="Cargar manualmente pedidos recibidos de palabra o fuera de la app"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{queuePolicy.zone === "KARAOKE" ? "➕ Cantante" : "➕ Pedido"}</span>
                  </button>

                  <PwaInstallButton variant="dj" />
                </>
              )}
            </div>
            <h1 className="text-xl font-black text-white tracking-tight mt-1">
              {data.event?.name}
            </h1>
            <p className="text-xs text-zinc-400">{data.event?.venueName}</p>
          </div>
        </div>

        {/* Notificación Toast Flotante */}
        {feedback && (
          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border animate-fadeIn ${
              feedback.type === "success"
                ? "bg-emerald-950 text-emerald-200 border-emerald-700"
                : feedback.type === "info"
                ? "bg-purple-950 text-purple-200 border-purple-600 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                : "bg-red-950 text-red-200 border-red-700"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : feedback.type === "info" ? (
              <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-bounce" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-3 gap-2 w-full lg:w-auto shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
            <div className="text-[10px] text-zinc-400 font-bold uppercase">Pendientes</div>
            <div className="text-base font-black text-amber-400">{data.stats.pending}</div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
            <div className="text-[10px] text-zinc-400 font-bold uppercase">
              {queuePolicy.zone === "KARAOKE" ? "En Turno" : "En Cola"}
            </div>
            <div className="text-base font-black text-purple-400">{data.stats.queued}</div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
            <div className="text-[10px] text-zinc-400 font-bold uppercase">
              {queuePolicy.zone === "KARAOKE" ? "Cantadas" : "Tocadas"}
            </div>
            <div className="text-base font-black text-emerald-400">{data.stats.played}</div>
          </div>
        </div>
      </div>

      {/* 🎛️ SELECTOR PRINCIPAL DE MODALIDAD: MODO DJ vs MODO KARAOKE */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left w-full max-w-full">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full md:w-auto">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-400 shrink-0 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span>Modalidad:</span>
          </span>
          <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 w-full sm:w-auto gap-1">
            <button
              onClick={() => handleUpdatePolicy({ zone: "DJ", nightMode: "DJ_ONLY" })}
              disabled={policyLoading}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                queuePolicy.zone === "DJ"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/40"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <Disc3 className={`w-4 h-4 shrink-0 ${queuePolicy.zone === "DJ" ? "animate-spin [animation-duration:4s]" : ""}`} />
              <span className="truncate">🎧 Modo DJ</span>
            </button>

            <button
              onClick={() => handleUpdatePolicy({ zone: "KARAOKE", nightMode: "HYBRID" })}
              disabled={policyLoading}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                queuePolicy.zone === "KARAOKE"
                  ? "bg-gradient-to-r from-cyan-600 to-teal-500 text-white shadow-lg shadow-cyan-600/40"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <Mic className="w-4 h-4 text-cyan-200 shrink-0" />
              <span className="truncate">🎤 Modo Karaoke</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs w-full md:w-auto">
          {queuePolicy.zone === "KARAOKE" ? (
            <span className="px-3 py-1.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-semibold flex items-center justify-center gap-1.5 text-[11px] sm:text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <span>Turnos &ldquo;Canta y Libera&rdquo; sincronizados con TV</span>
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-700/60 font-semibold flex items-center justify-center gap-1.5 text-[11px] sm:text-xs">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shrink-0" />
              <span>Pista de baile & Mezclas continuas</span>
            </span>
          )}
        </div>
      </div>

      {/* 1.5. BARRA DE ACCIONES RÁPIDAS & NIGHT MOMENTS */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-3 w-full max-w-full overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full max-w-full">
          {/* Night Moments Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-none text-xs">
            <span className="text-[10px] uppercase font-bold text-zinc-500 mr-1 flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Momento:</span>
            </span>
            {[
              { id: "ALL", label: "🌟 Todos" },
              { id: "FIESTA", label: "💃 Fiesta" },
              { id: "DUETOS", label: "🎤 Duetos" },
              { id: "CUMPLEANOS", label: "🎂 Cumpleaños" },
              { id: "ROMANTICO", label: "🍷 Baladas" },
              { id: "ULTIMA_LLAMADA", label: "⏰ Última Llamada" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setNightMoment(m.id as any)}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] shrink-0 ${
                  nightMoment === m.id
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 scrollbar-none flex-nowrap lg:flex-wrap lg:justify-end w-full lg:w-auto">
            <button
              onClick={() => setIsManualModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border shrink-0 ${
                queuePolicy.zone === "KARAOKE"
                  ? "bg-cyan-600/30 hover:bg-cyan-600/40 border-cyan-500/50 text-cyan-200"
                  : "bg-purple-600/30 hover:bg-purple-600/40 border-purple-500/50 text-purple-200"
              }`}
              title="Cargar un pedido pedido verbalmente o fuera del código QR"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{queuePolicy.zone === "KARAOKE" ? "➕ Cantante" : "➕ Pedido"}</span>
            </button>

            <button
              onClick={() => setIsDuelModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Lanzar un duelo musical para que la sala vote en tiempo real"
            >
              <Swords className="w-3.5 h-3.5 text-amber-400" />
              <span>Duelo Musical</span>
            </button>

            <button
              onClick={() => setShowPhotoDrawer(!showPhotoDrawer)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border shrink-0 ${
                pendingPhotos.length > 0
                  ? "bg-pink-600/30 hover:bg-pink-600/40 border-pink-500/50 text-pink-300 animate-pulse"
                  : "bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-zinc-300"
              }`}
              title="Moderar fotos subidas por los comensales"
            >
              <Camera className="w-3.5 h-3.5 text-pink-400" />
              <span>Fotos Mesas</span>
              {pendingPhotos.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-black flex items-center justify-center">
                  {pendingPhotos.length}
                </span>
              )}
            </button>

            <button
              onClick={handleFairRotation}
              disabled={data.queue.length <= 1}
              className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 shrink-0"
              title="Intercala mesas automáticamente para balance"
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-400" />
              <span>Rotación Justa</span>
            </button>

            <button
              onClick={handlePrioritizeCelebrations}
              className="px-3 py-1.5 rounded-xl bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Acepta y sube a la cola pedidos de cumpleaños"
            >
              <Cake className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Priorizar Festejos</span>
            </button>

            <button
              onClick={() => setIsApplauseModalOpen(true)}
              disabled={interactiveLoading}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 shrink-0"
              title="Activar Aplausómetro en la TV para calificar show o mesa"
            >
              <span>👏</span>
              <span>Aplausómetro</span>
            </button>

            <button
              onClick={handleSpinRoulette}
              disabled={interactiveLoading}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 shrink-0"
              title="Girar ruleta de mesas en la TV para sortear tragos"
            >
              <Dices className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ruleta Sorteo</span>
            </button>
          </div>
        </div>

        {/* Sugerencias Inteligentes con Explicabilidad (Queue Intelligence) */}
        {suggestions.length > 0 && (
          <div className="pt-2 border-t border-zinc-800/80">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-zinc-500 shrink-0 flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>Sugerencia Inteligente:</span>
              </span>
              {suggestions.map((sug) => (
                <div
                  key={sug.id}
                  className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center gap-2 shrink-0"
                >
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border ${sug.badge.color}`}>
                    {sug.badge.label}
                  </span>
                  <span className="text-[11px] text-zinc-300">
                    {sug.explanation}
                  </span>
                  {sug.targetId && (
                    <button
                      onClick={() => handleAccept(sug.targetId!)}
                      className="text-[10px] font-bold text-purple-400 hover:text-purple-300 ml-1 underline cursor-pointer"
                    >
                      {sug.recommendedAction} &rarr;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 1.6 CONTROL FAIR-PLAY & ROTACIÓN DE TURNOS ("CANTA Y LIBERA") */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-950 via-purple-950/20 to-zinc-950 border border-purple-500/30 space-y-3 shadow-lg w-full max-w-full overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 text-center lg:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Fair-Play & Rotación de Turnos
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">
                  {queuePolicy.zone === "KARAOKE" ? "🎤 MODO KARAOKE" : "🎧 MODO DJ"}
                </span>
                {queuePolicy.queuePaused ? (
                  <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 text-[10px] font-bold animate-pulse">
                    ⏸ COLA PAUSADA
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    🟢 RECIBIENDO PEDIDOS
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Regla &ldquo;Canta y Libera&rdquo;: cuando la mesa termina su turno, el sistema desbloquea su cupo automáticamente para volver a pedir.
              </p>
            </div>
          </div>

          {/* Selectores rápidos de política en vivo */}
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2 w-full lg:w-auto">
            <span className="text-[10px] uppercase font-bold text-zinc-500 mr-1">Cupo:</span>

            <button
              onClick={() => handleUpdatePolicy({ maxActivePerTable: 1 })}
              disabled={policyLoading}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                queuePolicy.maxActivePerTable === 1
                  ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800"
              }`}
              title="1 tema activo por mesa a la vez (ideal Karaoke)"
            >
              <span>1 Tema</span>
            </button>

            <button
              onClick={() => handleUpdatePolicy({ maxActivePerTable: 2 })}
              disabled={policyLoading}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                queuePolicy.maxActivePerTable === 2
                  ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800"
              }`}
              title="Hasta 2 temas por mesa simultáneos"
            >
              <span>2 Temas</span>
            </button>

            <button
              onClick={() => handleUpdatePolicy({ maxActivePerTable: 99 })}
              disabled={policyLoading}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                queuePolicy.maxActivePerTable >= 99
                  ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800"
              }`}
              title="Sin límite de temas por mesa"
            >
              <span>Ilimitado</span>
            </button>

            <div className="h-5 w-px bg-zinc-800 hidden sm:block mx-1" />

            <button
              onClick={() => handleUpdatePolicy({ queuePaused: !queuePolicy.queuePaused })}
              disabled={policyLoading}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                queuePolicy.queuePaused
                  ? "bg-red-600 text-white border-red-400 animate-pulse shadow-md shadow-red-600/30"
                  : "bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800"
              }`}
            >
              {queuePolicy.queuePaused ? (
                <>
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Reanudar</span>
                </>
              ) : (
                <>
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Pausar</span>
                </>
              )}
            </button>

            {/* Acceso directo a Cabina Karaoke */}
            <Link
              href="/dashboard/karaoke"
              className="px-2.5 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Abrir el Escenario y Consola Karaoke (KJ)"
            >
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cabina Karaoke</span>
            </Link>

            {/* Configurar DJ */}
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Configurar políticas y límites de pedidos DJ"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Configuración</span>
            </button>
          </div>
        </div>
      </div>

      {/* ⚔️ Banner de Duelo Activo si existe */}
      {activeDuel && activeDuel.status === "ACTIVE" && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 via-zinc-950 to-orange-950/80 border-2 border-amber-500/60 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Swords className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black tracking-wider uppercase">
                  ⚔️ DUELO MUSICAL AL AIRE
                </span>
                <span className="text-xs font-mono text-zinc-300 font-bold">
                  Total Votos: {activeDuel.totalVotes}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm font-black text-white">
                <span className="text-amber-300">
                  Track A: {activeDuel.optionA.title} ({activeDuel.optionA.votes} votos &bull;{" "}
                  {activeDuel.totalVotes > 0
                    ? Math.round((activeDuel.optionA.votes / activeDuel.totalVotes) * 100)
                    : 50}
                  %)
                </span>
                <span className="text-zinc-500 font-mono">VS</span>
                <span className="text-orange-300">
                  Track B: {activeDuel.optionB.title} ({activeDuel.optionB.votes} votos &bull;{" "}
                  {activeDuel.totalVotes > 0
                    ? Math.round((activeDuel.optionB.votes / activeDuel.totalVotes) * 100)
                    : 50}
                  %)
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleCancelDuel}
            className="px-4 py-2 rounded-xl bg-red-950 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-bold transition-all cursor-pointer shadow-lg"
          >
            Finalizar Duelo
          </button>
        </div>
      )}

      {/* 📸 Cajón de Moderación y Control de Fotos en Pantalla */}
      {showPhotoDrawer && (
        <div className="p-5 rounded-2xl bg-zinc-950 border border-pink-500/30 space-y-4 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <Camera className="w-5 h-5 text-pink-400" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Muro de Fotos & Social Lounge &bull; Control de Pantalla
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Modera las fotos entrantes o retira de inmediato fotos proyectadas al aire
                </p>
              </div>
            </div>

            {/* Controles de Política de Fotos */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Switch Permitir / Pausar Fotos */}
              <button
                type="button"
                onClick={() =>
                  handleUpdatePolicy({
                    photosAllowed: queuePolicy.photosAllowed === false ? true : false,
                  })
                }
                disabled={policyLoading}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  queuePolicy.photosAllowed !== false
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-700 hover:bg-emerald-900"
                    : "bg-red-950/80 text-red-300 border-red-700 hover:bg-red-900 animate-pulse"
                }`}
                title="Pausar o permitir que los clientes suban fotos desde el QR"
              >
                <span className={`w-2 h-2 rounded-full ${queuePolicy.photosAllowed !== false ? "bg-emerald-400" : "bg-red-400"}`} />
                <span>{queuePolicy.photosAllowed !== false ? "Subida: Habilitada" : "Subida: Pausada"}</span>
              </button>

              {/* Selector de Rotación en TV */}
              <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-xl border border-zinc-800 text-[11px]">
                <span className="px-2 text-zinc-500 font-bold">Rotación TV:</span>
                {[5, 8, 15].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleUpdatePolicy({ photoRotationSeconds: sec })}
                    disabled={policyLoading}
                    className={`px-2 py-0.5 rounded-lg font-mono font-bold cursor-pointer transition-all ${
                      (queuePolicy.photoRotationSeconds || 8) === sec
                        ? "bg-pink-600 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>

              {/* Selector de Ajuste en Pantalla TV (photoFitMode) */}
              <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-xl border border-zinc-800 text-[11px]">
                <span className="px-2 text-zinc-500 font-bold">Ajuste TV:</span>
                {[
                  { mode: "BLUR_FILL", label: "✨ Cine Blur", desc: "Fondo ambiental desenfocado cinemático (sin cortar caras ni bandas negras)" },
                  { mode: "CONTAIN", label: "🔳 Contener", desc: "Ajuste exacto en caja con marco oscuro" },
                  { mode: "COVER", label: "🔲 Llenar", desc: "Cubre todo el marco (recorte proporcional)" },
                ].map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => handleUpdatePolicy({ photoFitMode: item.mode as any })}
                    disabled={policyLoading}
                    title={item.desc}
                    className={`px-2.5 py-0.5 rounded-lg font-bold cursor-pointer transition-all ${
                      (queuePolicy.photoFitMode || "BLUR_FILL") === item.mode
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowPhotoDrawer(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs font-bold px-2 py-1 cursor-pointer"
              >
                Cerrar &times;
              </button>
            </div>
          </div>

          {/* Pestañas de Fotos: Pendientes vs Al Aire */}
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2">
            <button
              type="button"
              onClick={() => setPhotoTab("PENDING")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                photoTab === "PENDING"
                  ? "bg-pink-600 text-white shadow-lg shadow-pink-600/30"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              <span>📥 Pendientes de Aprobación</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
                {pendingPhotos.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPhotoTab("LIVE")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                photoTab === "LIVE"
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              <span>📺 Fotos al Aire en TV</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
                {approvedPhotos.length}
              </span>
            </button>
          </div>

          {/* CONTENIDO PESTAÑA PENDIENTES */}
          {photoTab === "PENDING" && (
            <div>
              {pendingPhotos.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs space-y-1">
                  <p>No hay fotos pendientes de moderación.</p>
                  <p className="text-[10px] text-zinc-600">
                    Las fotos que envíen los clientes desde sus mesas vía QR aparecerán aquí para tu aprobación antes de proyectarse en la TV.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {pendingPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-pink-500/40 space-y-2.5 transition-all shadow-lg"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden bg-black relative border border-zinc-800">
                        <img
                          src={photo.imageUrl}
                          alt={photo.caption || "Foto de mesa"}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-pink-300 border border-pink-500/30 text-[10px] font-mono font-bold">
                          {photo.table.label}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white truncate">
                          de {photo.guestName}
                        </div>
                        {photo.caption && (
                          <p className="text-[11px] text-zinc-300 italic line-clamp-2 mt-0.5">
                            &ldquo;{photo.caption}&rdquo;
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
                        <button
                          onClick={() => handleModeratePhoto(photo.id, "APPROVE")}
                          disabled={actionLoading === photo.id}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" />
                          <span>Aprobar TV</span>
                        </button>
                        <button
                          onClick={() => handleModeratePhoto(photo.id, "REJECT")}
                          disabled={actionLoading === photo.id}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-700 hover:border-red-800 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                          title="Rechazar foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONTENIDO PESTAÑA AL AIRE */}
          {photoTab === "LIVE" && (
            <div>
              {approvedPhotos.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs space-y-1">
                  <p>No hay fotos proyectándose actualmente en la TV.</p>
                  <p className="text-[10px] text-zinc-600">
                    Aprueba fotos desde la pestaña &ldquo;Pendientes&rdquo; para que roten en la pantalla pública.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {approvedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="p-3 rounded-xl bg-zinc-900 border border-cyan-500/30 hover:border-cyan-400/60 space-y-2.5 transition-all shadow-lg relative"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden bg-black relative border border-zinc-800">
                        <img
                          src={photo.imageUrl}
                          alt={photo.caption || "Foto en TV"}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-cyan-950/90 backdrop-blur-md text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
                          {photo.table.label}
                        </span>
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-[9px] font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>EN TV</span>
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white truncate">
                          de {photo.guestName}
                        </div>
                        {photo.caption && (
                          <p className="text-[11px] text-zinc-300 italic line-clamp-2 mt-0.5">
                            &ldquo;{photo.caption}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Botones de Acción al Aire: Destacar 12s vs Sacar de TV */}
                      <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
                        <button
                          type="button"
                          onClick={() => handleModeratePhoto(photo.id, "FEATURE")}
                          disabled={actionLoading === photo.id}
                          className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-[11px] font-black flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-amber-500/20"
                          title="Proyectar en pantalla completa durante 12 segundos"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Destacar 12s</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModeratePhoto(photo.id, "REMOVE")}
                          disabled={actionLoading === photo.id}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-300 border border-zinc-700 hover:border-red-800 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                          title="Sacar de la pantalla de TV inmediatamente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. PANEL HERO CENTRAL: CONSOLA DUAL-DECK VIRTUAL DJ PRO (AUDIO REAL YOUTUBE & AUTO-ENGANCHE) */}
      <VirtualDjConsole
        currentPlaying={data.currentPlaying}
        queue={data.queue}
        pendingRequests={data.pendingRequests}
        onPlayQueueEntry={handlePlayQueueEntry}
        onNextTrack={handleNextTrack}
        showFeedback={showFeedback}
        crossfaderValue={crossfaderValue}
        setCrossfaderValue={setCrossfaderValue}
        pendingDeckLoad={pendingDeckLoad}
        onDeckLoaded={() => setPendingDeckLoad(null)}
      />

      {/* 2.5 SOUNDBOARD FX LAUNCHPAD PARA DJ */}
      <DjSoundboard mode="DJ" />

      {/* 3. COLUMNAS DIVIDIDAS: Bandeja de Moderación & Cola en Vivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLUMNA IZQUIERDA: Solicitudes Entrantes (Bandeja de Moderación) */}
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">
                Solicitudes Entrantes (Pista de Baile)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                {filteredPending.length}
              </span>
              {nightMoment !== "ALL" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 font-semibold border border-purple-800">
                  Filtro: {nightMoment}
                </span>
              )}
            </div>
            <span className="text-[11px] text-zinc-500">
              De las mesas al DJ
            </span>
          </div>

          {filteredPending.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-zinc-700" />
              <p className="text-xs">
                {nightMoment !== "ALL"
                  ? "No hay pedidos pendientes para este momento."
                  : "No hay solicitudes pendientes en este momento."}
              </p>
              <p className="text-[10px] text-zinc-600">
                Aparecerán automáticamente cuando los clientes escaneen el QR.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setIsManualModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cargar pedido manual</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPending.map((req) => {
                const title = req.song?.title || req.customTitle;
                const artist = req.song?.artist?.name || req.customArtist;
                const isLoading = actionLoading === req.id;

                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 transition-all space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-purple-950/80 text-purple-300 border border-purple-800">
                            {req.table.label}
                          </span>
                          {req.guestSession?.guestName && (
                            <span className="text-xs font-semibold text-zinc-300">
                              de {req.guestSession.guestName}
                            </span>
                          )}
                          {req.tipAmountCents && req.tipAmountCents > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] font-black tracking-wider flex items-center gap-1 shadow-sm shadow-amber-500/20">
                              ⭐ VIP FAST-PASS (${(req.tipAmountCents / 100).toFixed(2)})
                            </span>
                          ) : null}
                        </div>
                        <h3 className="text-sm font-bold text-white mt-1.5">{title}</h3>
                        <p className="text-xs text-zinc-400">{artist}</p>
                      </div>

                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(req.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {req.notes && (
                      <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-purple-300 italic">
                        &ldquo;{req.notes}&rdquo;
                      </div>
                    )}

                    {/* Acciones de Moderación */}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAccept(req.id)}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Aceptar</span>
                        </button>

                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Rechazar</span>
                        </button>
                      </div>

                      {/* Botón rápido Duelo con este tema */}
                      <button
                        onClick={() => {
                          setDuelTrackA({
                            title: title || "Tema A",
                            artist: artist || "Artista A",
                            tableLabel: req.table.label,
                          });
                          setIsDuelModalOpen(true);
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                        title="Usar este tema para lanzar un duelo en vivo"
                      >
                        <Swords className="w-3 h-3" />
                        <span>Batalla VS</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: Cola de Reproducción en Vivo */}
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {queuePolicy.zone === "KARAOKE" ? (
                <Mic className="w-5 h-5 text-cyan-400" />
              ) : (
                <Music className="w-5 h-5 text-purple-400" />
              )}
              <h2 className="text-base font-bold text-white">
                {queuePolicy.zone === "KARAOKE" ? "Turnos de Karaoke" : "Cola de Reproducción"}
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  queuePolicy.zone === "KARAOKE"
                    ? "bg-cyan-950 text-cyan-300 border-cyan-800"
                    : "bg-purple-950 text-purple-300 border-purple-800"
                }`}
              >
                {data.queue.length} {queuePolicy.zone === "KARAOKE" ? "en turno" : "en cola"}
              </span>
            </div>

            {/* Botón Rotación Justa */}
            <button
              onClick={handleFairRotation}
              disabled={data.queue.length <= 1}
              title="Intercala canciones de distintas mesas para evitar monopolio"
              className="px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-400" />
              <span>Rotación Justa</span>
            </button>
          </div>

          {data.queue.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              {queuePolicy.zone === "KARAOKE" ? (
                <Mic className="w-8 h-8 mx-auto text-zinc-700" />
              ) : (
                <Disc3 className="w-8 h-8 mx-auto text-zinc-700" />
              )}
              <p className="text-xs">
                {queuePolicy.zone === "KARAOKE"
                  ? "No hay cantantes en espera de turno."
                  : "La cola de reproducción está vacía."}
              </p>
              <p className="text-[10px] text-zinc-600">
                Acepta canciones de las mesas para ordenarlas aquí.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setIsManualModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    {queuePolicy.zone === "KARAOKE"
                      ? "Agregar cantante a la cola"
                      : "Cargar tema directo a la cola"}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.queue.map((entry, idx) => {
                const title =
                  entry.songRequest.song?.title || entry.songRequest.customTitle;
                const artist =
                  entry.songRequest.song?.artist?.name ||
                  entry.songRequest.customArtist;

                return (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-purple-600/40 transition-all flex items-center justify-between gap-3 shadow-md group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 text-purple-300 text-xs font-black flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate">{title}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-purple-300 border border-zinc-800 shrink-0">
                            {entry.songRequest.table.label}
                          </span>
                          {entry.songRequest.tipAmountCents && entry.songRequest.tipAmountCents > 0 ? (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 shrink-0">
                              ⭐ VIP
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {entry.songRequest.guestSession?.guestName
                            ? `${entry.songRequest.guestSession.guestName} • `
                            : ""}
                          {artist}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {queuePolicy.zone === "KARAOKE" ? (
                        <>
                          <button
                            onClick={() => handleCallSinger(entry)}
                            title="Llamar a esta mesa al escenario (alerta en TV)"
                            className="p-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Megaphone className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleLoadQueueEntry(entry, "AUTO")}
                            title="Subir al escenario ahora"
                            className="p-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Cargar específicamente en Deck A */}
                          <button
                            type="button"
                            onClick={() => handleLoadQueueEntry(entry, "A")}
                            title="Cargar y preparar en Bandeja A"
                            className="px-2 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-600 border border-purple-800/60 hover:border-purple-500 text-purple-300 hover:text-white text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-0.5"
                          >
                            <span>◀ A</span>
                          </button>

                          {/* Botón Principal: Tirar a la Bandeja Libre (Auto) */}
                          <button
                            type="button"
                            onClick={() => handleLoadQueueEntry(entry, "AUTO")}
                            title="Reproducir en la bandeja que esté libre"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-950"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span className="text-[10px] font-bold">Auto</span>
                          </button>

                          {/* Cargar específicamente en Deck B */}
                          <button
                            type="button"
                            onClick={() => handleLoadQueueEntry(entry, "B")}
                            title="Cargar y preparar en Bandeja B"
                            className="px-2 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-600 border border-cyan-800/60 hover:border-cyan-500 text-cyan-300 hover:text-white text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-0.5"
                          >
                            <span>B ▶</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSkipQueueEntry(entry.id)}
                        title="Quitar de cola"
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. MODAL DJ BRIDGE */}
      <DjBridgeModal
        isOpen={isBridgeModalOpen}
        onClose={() => setIsBridgeModalOpen(false)}
        eventCode={data.event?.code}
        eventId={selectedEventId || data.event?.id}
        onSynced={() => {
          showFeedback("success", "Puente sincronizado correctamente");
          fetchDjState();
        }}
      />

      {/* 5. MODAL LANZADOR DE DUELO MUSICAL */}
      {isDuelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-zinc-950 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Swords className="w-5 h-5" />
                <h3 className="text-base font-black text-white">Lanzar Duelo Musical en Vivo</h3>
              </div>
              <button
                onClick={() => setIsDuelModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Inicia una batalla interactiva entre dos canciones. Los comensales votan en tiempo real desde sus mesas y las barras porcentuales se proyectan en la TV.
            </p>

            {/* Cargar desde pendientes (shortcut) */}
            {data.pendingRequests.length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  const rA = data.pendingRequests[0];
                  const rB = data.pendingRequests[1];
                  setDuelTrackA({
                    title: rA.song?.title || rA.customTitle || "Track A",
                    artist: rA.song?.artist?.name || rA.customArtist || "Artista A",
                    tableLabel: rA.table.label,
                  });
                  setDuelTrackB({
                    title: rB.song?.title || rB.customTitle || "Track B",
                    artist: rB.song?.artist?.name || rB.customArtist || "Artista B",
                    tableLabel: rB.table.label,
                  });
                }}
                className="w-full py-1.5 px-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800 text-purple-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Cargar automáticamente las 2 primeras canciones pendientes</span>
              </button>
            )}

            {/* Inputs Track A */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  Opción A
                </span>
                {duelTrackA.tableLabel && (
                  <span className="text-[10px] font-mono text-zinc-400">
                    Mesa: {duelTrackA.tableLabel}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Título (Ej: Tití Me Preguntó)"
                  value={duelTrackA.title}
                  onChange={(e) => setDuelTrackA({ ...duelTrackA, title: e.target.value })}
                  className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  placeholder="Artista (Ej: Bad Bunny)"
                  value={duelTrackA.artist}
                  onChange={(e) => setDuelTrackA({ ...duelTrackA, artist: e.target.value })}
                  className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Inputs Track B */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-orange-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-orange-400 uppercase tracking-wider">
                  Opción B
                </span>
                {duelTrackB.tableLabel && (
                  <span className="text-[10px] font-mono text-zinc-400">
                    Mesa: {duelTrackB.tableLabel}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Título (Ej: Gasolina)"
                  value={duelTrackB.title}
                  onChange={(e) => setDuelTrackB({ ...duelTrackB, title: e.target.value })}
                  className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                />
                <input
                  type="text"
                  placeholder="Artista (Ej: Daddy Yankee)"
                  value={duelTrackB.artist}
                  onChange={(e) => setDuelTrackB({ ...duelTrackB, artist: e.target.value })}
                  className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Duración */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Duración de la votación:</span>
              <div className="flex items-center gap-1.5">
                {[30, 45, 60].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setDuelDuration(dur)}
                    className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                      duelDuration === dur
                        ? "bg-amber-500 text-black font-black"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                    }`}
                  >
                    {dur}s
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsDuelModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStartDuel}
                disabled={duelLoading || !duelTrackA.title.trim() || !duelTrackB.title.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                <Swords className="w-4 h-4" />
                <span>{duelLoading ? "Lanzando..." : "🔥 Lanzar Duelo al Aire"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 👏 Modal de Lanzamiento de Aplausómetro */}
      {isApplauseModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-amber-500/40 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👏</span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Lanzar Aplausómetro a la TV
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Los clientes tocarán sus celulares a toda velocidad para subir la barra de aplausos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApplauseModalOpen(false)}
                className="text-zinc-500 hover:text-white text-xs font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">
                ¿A quién van dirigidos los aplausos? (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Mesa 3, ¡Show de María!, ¡Dueto de la noche!"
                value={applauseTarget}
                onChange={(e) => setApplauseTarget(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-zinc-500">
                Si lo dejas vacío, el aplausómetro dirá &ldquo;¡A TODOS LOS ARTISTAS!&rdquo;
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsApplauseModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleStartApplause()}
                disabled={interactiveLoading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                <span>👏</span>
                <span>{interactiveLoading ? "Activando..." : "¡Iniciar en Pantalla (15s)!"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📲 Modal de Invitar Amigos / QR y WhatsApp */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-pink-500/40 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Invitar Amigos a la Fiesta
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {data.event?.name || "Comparte tu evento para recibir pedidos"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="text-zinc-500 hover:text-white text-base font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Selector si hay múltiples mesas, o indicador de fiesta personal */}
            {data.tables && data.tables.length > 1 ? (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400">
                  Selecciona la mesa o sector a compartir:
                </label>
                <select
                  value={selectedShareTableId || (data.tables[0]?.id ?? "")}
                  onChange={(e) => setSelectedShareTableId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
                >
                  {data.tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} (Sector {t.zone || "Principal"})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="px-3 py-2 rounded-xl bg-pink-950/40 border border-pink-500/30 flex items-center gap-2 text-xs text-pink-200">
                <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
                <span>Modo Fiesta Privada: Un solo QR para que todos los amigos se sumen.</span>
              </div>
            )}

            {/* QR Code Grande Centrado */}
            {(() => {
              const activeTable =
                data.tables?.find((t) => t.id === selectedShareTableId) ||
                data.tables?.[0];
              const shareToken = activeTable?.qrToken || "";
              const shareUrl =
                typeof window !== "undefined" && shareToken
                  ? `${window.location.origin}/qr/${shareToken}`
                  : "";
              const qrImgUrl = shareUrl
                ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    shareUrl
                  )}`
                : "";

              return (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner border border-zinc-200">
                    {qrImgUrl ? (
                      <img
                        src={qrImgUrl}
                        alt="Código QR de la Fiesta"
                        className="w-48 h-48 rounded-lg object-contain"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-zinc-400 text-xs">
                        Generando QR...
                      </div>
                    )}
                    <span className="mt-2 text-xs font-bold text-zinc-900">
                      {activeTable?.label || "Pista / Amigos"}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Escaneá con la cámara del celular
                    </span>
                  </div>

                  {/* Acciones: Copiar Link & WhatsApp */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (shareUrl) {
                          navigator.clipboard.writeText(shareUrl);
                          setCopiedShareLink(true);
                          setTimeout(() => setCopiedShareLink(false), 3000);
                        }
                      }}
                      className="px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {copiedShareLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (shareUrl) {
                          const msg = encodeURIComponent(
                            `🎉 ¡Sumate a la fiesta de ${
                              data.event?.name || "hoy"
                            }! Pedí tus temas y subí tus fotos a la pantalla acá:\n${shareUrl}`
                          );
                          window.open(`https://api.whatsapp.com/send?text=${msg}`, "_blank");
                        }
                      }}
                      className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-emerald-600/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>

                  {/* Proyectar en Smart TV */}
                  {data.event && (
                    <a
                      href={`/display/${data.event.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-2 px-3 text-center rounded-xl bg-purple-950/40 hover:bg-purple-950/70 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-colors"
                    >
                      📺 Abrir Pantalla Gigante para TV del Living
                    </a>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 6. MODAL CARGA MANUAL DE PEDIDOS (FUERA DE APP O QR) */}
      <ManualRequestModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        eventId={selectedEventId || data?.event?.id || ""}
        tables={data?.tables || []}
        isKaraokeMode={queuePolicy.zone === "KARAOKE"}
        onSuccess={() => {
          showFeedback("success", "¡Pedido manual cargado con éxito!");
          fetchDjState();
        }}
      />

      {/* 7. MODAL SELECCIÓN Y PROYECCIÓN DE PISTAS KARAOKE YOUTUBE */}
      <KaraokeVideoModal
        isOpen={isKaraokeModalOpen}
        onClose={() => setIsKaraokeModalOpen(false)}
        currentSongTitle={currentTrack?.song?.title || currentTrack?.customTitle || ""}
        currentSongArtist={currentTrack?.song?.artist?.name || currentTrack?.customArtist || ""}
        results={karaokeResults}
        selectedVideoId={selectedKaraokeVideoId}
        onSelectVideo={(vid, title) => {
          handleSelectAndBroadcastVideo(vid, title);
          setIsKaraokeModalOpen(false);
        }}
        onSearch={(customQ) => handleSearchKaraoke(customQ)}
        isSearching={isSearchingKaraoke}
        isTvVideoEnabled={isTvVideoEnabled}
        onToggleTvVideo={handleToggleTvVideo}
      />

      {/* 8. MODAL CONFIGURACIÓN DE MODOS */}
      {data?.event && (
        <ModeSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          eventId={data.event.id}
          eventName={data.event.name}
          initialPolicy={parseQueuePolicy(null)}
          onPolicyUpdated={(newPolicy) => {
            setQueuePolicy({
              maxActivePerTable: newPolicy.dj.maxActivePerTable,
              queuePaused: newPolicy.dj.queuePaused,
              rotationMode: newPolicy.dj.queueMode === "TIPS_PRIORITY" ? "FIFO" : "FIFO",
              zone: newPolicy.nightMode === "KARAOKE_ONLY" ? "KARAOKE" : "DJ",
              avgSongDurationMinutes: newPolicy.karaoke.avgSongDurationMinutes,
              photosAllowed: newPolicy.photosAllowed,
              photoRotationSeconds: newPolicy.photoRotationSeconds,
              photoFitMode: newPolicy.photoFitMode,
            });
            showFeedback("success", "Configuración actualizada");
            fetchDjState();
          }}
        />
      )}
    </div>
  );
}
