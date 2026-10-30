"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Play,
  Music,
  Search,
  Sparkles,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Radio,
  AlertCircle,
  PlusCircle,
  X,
  RefreshCw,
  Disc3,
  QrCode,
  Wifi,
  Copy,
  Check,
  Flame,
  Heart,
  Users2,
  Guitar,
  PartyPopper,
  Gift,
  Cake,
  Zap,
  Camera,
  Image as ImageIcon,
  Star,
  ArrowLeftRight,
  ArrowLeft,
  LogOut,
  Mic,
  Headphones,
  Square,
  Trophy,
  Lock,
} from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import { RealtimeEventType } from "@/lib/realtime/event-bus";
import PwaInstallButton from "@/components/pwa/PwaInstallButton";

interface Song {
  id: string;
  title: string;
  durationSeconds: number;
  genre: string | null;
  bpm: number | null;
  key: string | null;
  artist: { id: string; name: string } | null;
}

interface SongRequestItem {
  id: string;
  status: string;
  notes: string | null;
  customTitle: string | null;
  customArtist: string | null;
  createdAt: string;
  tipAmountCents?: number;
  queuePosition?: number | null;
  estimatedWaitMinutes?: number | null;
  song: {
    title: string;
    artist: { name: string } | null;
  } | null;
}

interface GuestSessionInfo {
  guestName: string | null;
  table: { id: string; number: number; label: string; zone?: string };
  event: { id: string; name: string; code: string; status: string };
  tenant: { id: string; name: string; slug: string };
}

export interface TableAllowanceInfo {
  usedSlots: number;
  maxSlots: number;
  isLocked: boolean;
  queuePaused: boolean;
  zone: string;
  nightMode?: string;
  djQueuePaused?: boolean;
  karaokeQueuePaused?: boolean;
  autoPlayRequests?: boolean;
}

interface CurrentPlayingInfo {
  id?: string;
  requestId?: string;
  tableId?: string;
  title: string;
  artist: string;
  tableLabel: string;
  isMyRequest?: boolean;
}

interface FlashDealInfo {
  id: string;
  title: string;
  subtitle: string;
  discount: string;
  badgeText: string;
  color: string;
  bannerBg: string;
  callToAction: string;
}

interface DuelOption {
  id: "A" | "B";
  title: string;
  artist: string;
  tableLabel?: string;
  votes: number;
}

interface LiveDuelInfo {
  id: string;
  eventId: string;
  optionA: DuelOption;
  optionB: DuelOption;
  status: "ACTIVE" | "FINISHED";
  endsAt: string;
  totalVotes: number;
  winner?: "A" | "B" | "TIE";
}

interface BrandingInfo {
  logoUrl?: string | null;
  bannerUrl?: string | null;
  primaryColor?: string;
  accentColor?: string;
  welcomeTitle?: string | null;
  welcomeSubtitle?: string | null;
  marqueeText?: string | null;
  wifiSsid?: string | null;
  wifiPassword?: string | null;
  instagramHandle?: string | null;
  tiktokHandle?: string | null;
  whatsappNumber?: string | null;
}

const MOODS = [
  { id: "fiesta", label: "Fiesta / Arriba", icon: Flame, color: "from-fuchsia-600 to-pink-600" },
  { id: "romantica", label: "Romántica / Lenta", icon: Heart, color: "from-rose-600 to-red-600" },
  { id: "duo", label: "Dúo / Amigos", icon: Users2, color: "from-purple-600 to-indigo-600" },
  { id: "rock", label: "Rock / Clásicos", icon: Guitar, color: "from-amber-600 to-orange-600" },
  { id: "cumbia", label: "Cumbia / Tropical", icon: PartyPopper, color: "from-emerald-600 to-teal-600" },
];

const CELEBRATION_TAGS = [
  { label: "🎂 Cumpleaños", note: "🎂 ¡Celebrando mi cumpleaños con todos!" },
  { label: "💍 Aniversario", note: "💍 ¡Festejando nuestro aniversario!" },
  { label: "🍻 Junta de Amigos", note: "🍻 ¡Para toda la mesa y la barra!" },
  { label: "🎉 Brindis", note: "🎉 ¡Un brindis por esta gran noche!" },
];

const PHOTO_FRAMES = [
  { id: "NONE", label: "Normal", icon: "🖼️", border: "border-zinc-700", text: "" },
  { id: "BIRTHDAY", label: "Cumpleaños", icon: "🎂", border: "border-pink-500", text: "🎂 ¡Cumpleaños Feliz!" },
  { id: "CHEERS", label: "Amigos", icon: "🍻", border: "border-amber-500", text: "🍻 ¡Salud con todos!" },
  { id: "KARAOKE", label: "Karaoke", icon: "🎤", border: "border-cyan-500", text: "🎤 ¡Voz de Oro!" },
  { id: "PARTY", label: "Fiesta", icon: "🔥", border: "border-rose-500", text: "🔥 ¡Modo Fiesta!" },
];

/**
 * Comprime y redimensiona fotos tomadas con el celular antes de subirlas
 * Evita exceder límites de carga (413), acelera el envío a 100ms y optimiza memoria en la Smart TV
 */
function compressImageFile(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedBase64);
      };
      img.onerror = () => resolve(readerEvent.target?.result as string);
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function GuestContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const venueParam = searchParams.get("venue");
  const tableParam = searchParams.get("table");

  const modeParam = searchParams.get("mode")?.toUpperCase();
  const [activeMode, setActiveMode] = useState<"DJ" | "KARAOKE">(() => {
    if (modeParam === "DJ" || modeParam === "KARAOKE") {
      return modeParam as "DJ" | "KARAOKE";
    }
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("vidjs_guest_active_mode");
        if (saved === "DJ" || saved === "KARAOKE") return saved as "DJ" | "KARAOKE";
      } catch {}
    }
    return "KARAOKE";
  });

  const userModeChoiceRef = useRef<"DJ" | "KARAOKE" | null>(null);

  const handleSelectMode = (mode: "DJ" | "KARAOKE") => {
    userModeChoiceRef.current = mode;
    setActiveMode(mode);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("vidjs_guest_active_mode", mode);
      } catch {}
    }
  };

  const [activeTab, setActiveTab] = useState<"hub" | "catalog" | "my-requests" | "contest">("hub");
  const [session, setSession] = useState<GuestSessionInfo | null>(null);
  const [tableAllowance, setTableAllowance] = useState<TableAllowanceInfo | null>(null);
  const [currentPlaying, setCurrentPlaying] = useState<CurrentPlayingInfo | null>(null);
  const [flashDeal, setFlashDeal] = useState<FlashDealInfo | null>(null);
  const [activeDuel, setActiveDuel] = useState<LiveDuelInfo | null>(null);
  const [votedOption, setVotedOption] = useState<"A" | "B" | null>(null);
  const [votingLoading, setVotingLoading] = useState(false);
  const [branding, setBranding] = useState<BrandingInfo | null>(null);
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);

  // 🏆 Información del Certamen de Karaoke Activo esta Noche
  const [activeContestInfo, setActiveContestInfo] = useState<{
    id: string;
    name: string;
    code: string;
    stageTitle: string;
    scoringMode: string;
    publicVoteWeight: number;
    activePerformance?: any;
  } | null>(null);

  // 🏆 Votación del Público para Concurso de Karaoke
  const [activeContestVote, setActiveContestVote] = useState<{
    contestId: string;
    performance: {
      id: string;
      songTitle: string;
      artistName: string;
      participantName: string;
      stageName?: string | null;
      tableLabel?: string | null;
    };
  } | null>(null);
  const [contestStars, setContestStars] = useState<number>(5);
  const [contestCheered, setContestCheered] = useState<boolean>(false);
  const [contestVoteSubmitted, setContestVoteSubmitted] = useState<boolean>(false);
  const [contestVoteLoading, setContestVoteLoading] = useState<boolean>(false);

  // 💳 Estado de Consumo Mínimo de Mesa y Súper Voto (x2)
  const [tableConsumption, setTableConsumption] = useState<{
    status: "PENDING" | "VERIFIED" | "SUPER_VOTE";
    isSuperVote: boolean;
    requireConsumption: boolean;
    notes?: string | null;
  } | null>(null);

  // Catálogo state
  const [songs, setSongs] = useState<Song[]>([]);
  const [youtubeSongs, setYoutubeSongs] = useState<any[]>([]);
  const [genres, setGenres] = useState<string[]>(["ALL"]);
  const [selectedGenre, setSelectedGenre] = useState("ALL");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Mis pedidos state
  const [myRequests, setMyRequests] = useState<SongRequestItem[]>([]);

  // Modal de solicitud
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [notes, setNotes] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customArtist, setCustomArtist] = useState("");
  const [isFastPass, setIsFastPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal de Subida de Fotos y Marcos
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");
  const [selectedFrame, setSelectedFrame] = useState<string>("NONE");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const instantCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileGalleryInputRef = useRef<HTMLInputElement | null>(null);

  // 🚀 Reacciones en Vivo & Aplausómetro
  const [lastReactionSent, setLastReactionSent] = useState<string | null>(null);
  const [activeApplause, setActiveApplause] = useState<{
    targetTableLabel: string;
    endsAt: string;
  } | null>(null);
  const [applauseCount, setApplauseCount] = useState<number>(0);

  const [isManageTableOpen, setIsManageTableOpen] = useState(false);
  const [leavingTable, setLeavingTable] = useState(false);
  const [switchBanner, setSwitchBanner] = useState<string | null>(null);

  const [dismissConnectScreen, setDismissConnectScreen] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return sessionStorage.getItem("vidjs_guest_dismiss_connect") === "true";
      } catch {}
    }
    return false;
  });

  const handleReturnToClient = () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("vidjs_guest_dismiss_connect", "true");
        if (window.location.search) {
          window.history.replaceState(null, "", "/guest");
        }
      } catch {}
    }
    setDismissConnectScreen(true);
  };

  const handleGoBack = () => {
    handleReturnToClient();
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim().toUpperCase().replace(/\s+/g, "");
    if (!clean) return;
    window.location.href = `/display/${clean}/tables`;
  };

  useEffect(() => {
    const switched = searchParams.get("switched");
    const toZone = searchParams.get("toZone");
    const fromZone = searchParams.get("fromZone");
    const tableName = searchParams.get("table");

    if (switched === "zone") {
      if (fromZone === "KARAOKE" && toZone !== "KARAOKE") {
        setSwitchBanner(
          `🎧 ¡Te has mudado del Karaoke a ${tableName || "tu nueva mesa"} (Sector DJ & Música de Ambiente)! Tu app ahora está en modo Fiesta y Pista de Baile. Pide temas para los parlantes de cabina.`
        );
      } else if (fromZone !== "KARAOKE" && toZone === "KARAOKE") {
        setSwitchBanner(
          `🎤 ¡Te has mudado de la Pista a ${tableName || "tu nueva mesa"} (Sector Karaoke)! Catálogo con letras y turnos de escenario activados. ¡Prepara tu voz!`
        );
      } else {
        setSwitchBanner(
          `🎉 ¡Te has mudado a ${tableName || "tu nueva mesa"} en el Sector ${
            toZone === "KARAOKE" ? "🎤 Karaoke" : "🎧 DJ"
          }! Tu catálogo y cola se han adaptado a este ambiente.`
        );
      }
    } else if (switched === "table") {
      setSwitchBanner(`✨ ¡Te has cambiado a ${tableName || "tu nueva mesa"}! Tu mesa anterior fue liberada con éxito.`);
    } else if (switched === "venue") {
      const fromVenue = searchParams.get("fromVenue") || "tu evento anterior";
      const toVenue = searchParams.get("toVenue") || "este local";
      setSwitchBanner(
        `🎉 ¡Bienvenido a ${toVenue} (${tableName || "tu nueva mesa"})! Te desvinculaste de ${fromVenue} y tu sesión se actualizó con éxito. ¡Tu nombre sigue guardado, que disfrutes la noche!`
      );
    }
  }, [searchParams]);

  const handleLeaveTable = async () => {
    if (
      !confirm(
        "¿Estás seguro de que deseas liberar tu mesa? Tus pedidos en espera serán cancelados y la mesa quedará disponible para nuevos comensales."
      )
    ) {
      return;
    }
    setLeavingTable(true);
    try {
      const res = await fetch("/api/v1/guest/session/leave", {
        method: "POST",
      });
      if (res.ok) {
        setSession(null);
        setMyRequests([]);
        setTableAllowance(null);
        setIsManageTableOpen(false);
        setSuccessMessage("¡Mesa liberada con éxito! Esperamos que hayas disfrutado tu noche.");
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const json = await res.json();
        alert(json.error?.message || "No se pudo liberar la mesa");
      }
    } catch {
      alert("Error de conexión al liberar la mesa");
    } finally {
      setLeavingTable(false);
    }
  };

  // Cargar sesión inicial
  const loadSessionAndRequests = async () => {
    try {
      setLoadingSession(true);
      const res = await fetch("/api/v1/requests");
      if (res.ok) {
        const data = await res.json();
        setSession(data.data.session);
        setMyRequests(data.data.requests);
        setCurrentPlaying(data.data.currentPlaying || null);
        if (data.data.flashDeal) {
          setFlashDeal(data.data.flashDeal);
        }
        if (data.data.branding) {
          setBranding(data.data.branding);
        }
        if (data.data.tableAllowance) {
          setTableAllowance(data.data.tableAllowance);
          const nightMode = data.data.tableAllowance.nightMode;
          const tableZone = data.data.tableAllowance.zone;

          // Solo forzar modo si la noche o la mesa son exclusivamente DJ o Karaoke
          if (nightMode === "DJ_ONLY" || tableZone === "DJ") {
            setActiveMode("DJ");
          } else if (nightMode === "KARAOKE_ONLY" || tableZone === "KARAOKE") {
            setActiveMode("KARAOKE");
          } else if (!userModeChoiceRef.current && !modeParam) {
            // Noche híbrida: si el usuario no ha elegido manualmente, chequear si había preferencia en sessionStorage
            if (typeof window !== "undefined") {
              try {
                const saved = sessionStorage.getItem("vidjs_guest_active_mode");
                if (saved === "DJ" || saved === "KARAOKE") {
                  setActiveMode(saved as "DJ" | "KARAOKE");
                }
              } catch {}
            }
          }
        }
        if (data.data.session?.guestName) {
          setGuestName(data.data.session.guestName);
        }
        // Consultar duelos
        if (data.data.session?.event?.id) {
          fetchDuelState(data.data.session.event.id);
        }

        // 🏆 Cargar Concurso activo si existe en la noche o local
        if (data.data.contest) {
          setActiveContestInfo(data.data.contest);
          if (data.data.contest.activePerformance) {
            const perf = data.data.contest.activePerformance;
            setActiveContestVote({
              contestId: data.data.contest.id,
              performance: {
                id: perf.id,
                songTitle: perf.songTitle,
                artistName: perf.artistName,
                participantName: perf.participantName,
                stageName: perf.stageName,
                tableLabel: perf.tableLabel,
              },
            });
            if (typeof window !== "undefined") {
              const saved = localStorage.getItem(`vidjs_voted_${perf.id}`);
              setContestVoteSubmitted(Boolean(saved));
              if (saved) {
                try {
                  const p = JSON.parse(saved);
                  if (p.stars) setContestStars(p.stars);
                } catch {}
              }
            }
          }
        }
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setLoadingSession(false);
    }
  };

  const fetchDuelState = async (eventId?: string) => {
    const id = eventId || session?.event.id;
    if (!id) return;
    try {
      const res = await fetch(`/api/v1/duel/state?eventId=${id}`);
      if (res.ok) {
        const json = await res.json();
        setActiveDuel(json.data);
      }
    } catch {
      // Silencioso
    }
  };

  const copyWifiPassword = () => {
    if (branding?.wifiPassword) {
      navigator.clipboard.writeText(branding.wifiPassword);
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2500);
    }
  };

  const fetchTableConsumption = async (contestId?: string, tableLabel?: string) => {
    const cId = contestId || activeContestVote?.contestId || activeContestInfo?.id;
    const tLabel = tableLabel || session?.table?.label;
    if (!cId || !tLabel) return;
    try {
      const res = await fetch(
        `/api/v1/contest/${cId}/consumption?tableLabel=${encodeURIComponent(tLabel)}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setTableConsumption({
            status: json.data.status,
            isSuperVote: Boolean(json.data.isSuperVote),
            requireConsumption: Boolean(json.data.requireConsumption),
            notes: json.data.notes || null,
          });
        }
      }
    } catch {
      // Silencioso
    }
  };

  useEffect(() => {
    loadSessionAndRequests();
  }, []);

  useEffect(() => {
    if (session?.table?.label && (activeContestInfo?.id || activeContestVote?.contestId)) {
      fetchTableConsumption();
    }
  }, [session?.table?.label, activeContestInfo?.id, activeContestVote?.contestId]);

  // Cargar catálogo de canciones con debounce, soporte de moods y modo DJ vs Karaoke
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append("q", searchQuery);
        if (selectedGenre && selectedGenre !== "ALL") params.append("genre", selectedGenre);
        if (selectedMood) params.append("mood", selectedMood);
        params.append("mode", activeMode);

        const res = await fetch(`/api/v1/catalog/songs?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setSongs(data.data.songs);
          setYoutubeSongs(data.data.youtubeResults || []);
          if (data.data.genres) setGenres(data.data.genres);
        }
      } catch (err) {
        console.error("Error cargando canciones:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedGenre, selectedMood, activeMode]);

  // Sincronización Realtime nativa SSE (0 ms) para comensales de mesa
  const { isConnected: isRealtime } = useRealtime({
    eventId: session?.event?.id,
    code: session?.event?.code,
    onEvent: async (type: RealtimeEventType, payload: any) => {
      if (type === "DUEL_UPDATE") {
        setActiveDuel(payload || null);
      } else if (type === "APPLAUSE_START") {
        setActiveApplause({
          targetTableLabel: payload.targetTableLabel || "¡A TODOS!",
          endsAt: payload.endsAt,
        });
        setApplauseCount(0);
      } else if (type === "APPLAUSE_END") {
        setActiveApplause(null);
      } else if (type === "QUEUE_SLOT_UNLOCKED") {
        // Desbloqueo en tiempo real: avisar al comensal si es su mesa
        await loadSessionAndRequests();
        if (!payload?.tableId || (session && payload.tableId === session.table.id)) {
          setSuccessMessage(
            `🎉 ¡Tu mesa completó su turno! Cupo desbloqueado para pedir tu siguiente canción.`
          );
          setTimeout(() => setSuccessMessage(null), 7000);
        }
      } else if (type === "QUEUE_POLICY_UPDATED") {
        await loadSessionAndRequests();
      } else if (
        type === "TRACK_CHANGE" ||
        type === "QUEUE_UPDATE" ||
        type === "REQUEST_NEW"
      ) {
        try {
          const res = await fetch("/api/v1/requests");
          if (res.ok) {
            const data = await res.json();
            setMyRequests(data.data.requests);
            setCurrentPlaying(data.data.currentPlaying || null);
            if (data.data.flashDeal) setFlashDeal(data.data.flashDeal);
            if (data.data.tableAllowance) setTableAllowance(data.data.tableAllowance);
            if (data.data.contest) {
              setActiveContestInfo(data.data.contest);
            }
          }
        } catch {}
      } else if (
        type === "CONTEST_STAGE_CHANGE" ||
        type === "CONTEST_PERFORMANCE_UPDATE" ||
        type === "CONTEST_VOTING_OPEN" ||
        type === "CONTEST_VOTING_CLOSED" ||
        type === "CONTEST_REVEAL_SCORES" ||
        type === "CONTEST_LEADERBOARD_UPDATE" ||
        type === "CONTEST_VOTE_UPDATE"
      ) {
        if (payload?.type === "TABLE_CONSUMPTION_UPDATE") {
          const myTable = session?.table?.label?.toLowerCase().trim();
          const targetTable = payload.tableLabel ? String(payload.tableLabel).toLowerCase().trim() : null;
          if (!targetTable || !myTable || targetTable === myTable) {
            setTableConsumption((prev) => ({
              status: payload.status || prev?.status || "PENDING",
              isSuperVote: payload.status === "SUPER_VOTE",
              requireConsumption: payload.requireConsumption !== undefined ? payload.requireConsumption : (prev?.requireConsumption ?? true),
              notes: payload.notes !== undefined ? payload.notes : prev?.notes,
            }));
          }
          return;
        }

        if (payload?.contestName || payload?.stageTitle) {
          setActiveContestInfo((prev) => ({
            id: payload.contestId || prev?.id || "contest",
            name: payload.contestName || prev?.name || "Campeonato de Karaoke",
            code: payload.contestCode || prev?.code || "",
            stageTitle: payload.stageTitle || prev?.stageTitle || "Gala Oficial",
            scoringMode: prev?.scoringMode || "AVERAGE",
            publicVoteWeight: prev?.publicVoteWeight || 30,
          }));
        }

        if (
          type === "CONTEST_VOTING_OPEN" ||
          (type === "CONTEST_PERFORMANCE_UPDATE" && payload?.performance?.status === "VOTING_OPEN")
        ) {
          const perf = payload?.performance;
          if (perf) {
            setActiveContestVote({
              contestId: payload.contestId || perf.contestId,
              performance: {
                id: perf.id,
                songTitle: perf.songTitle,
                artistName: perf.artistName,
                participantName: perf.participant?.name || "Cantante",
                stageName: perf.participant?.stageName,
                tableLabel: perf.participant?.tableLabel,
              },
            });
            fetchTableConsumption(payload.contestId || perf.contestId, session?.table?.label);
            if (typeof window !== "undefined") {
              const saved = localStorage.getItem(`vidjs_voted_${perf.id}`);
              setContestVoteSubmitted(Boolean(saved));
            } else {
              setContestVoteSubmitted(false);
            }
            setContestStars(5);
          }
        } else if (type === "CONTEST_VOTING_CLOSED" || type === "CONTEST_REVEAL_SCORES") {
          setTimeout(() => {
            setActiveContestVote(null);
            setContestVoteSubmitted(false);
          }, 4000);
        }
      }
    },
  });

  // Escuchar difusiones locales del concurso
  useEffect(() => {
    if (typeof window === "undefined") return;
    const channelNames = ["vidjs_contest_sync_global"];
    if (session?.event?.code) {
      channelNames.push(`vidjs_contest_sync_${session.event.code}`);
      channelNames.push(`vidjs_contest_sync_${session.event.code.toUpperCase()}`);
    }
    if (session?.event?.id) {
      channelNames.push(`vidjs_contest_sync_${session.event.id}`);
    }
    if (activeContestInfo?.id) {
      channelNames.push(`vidjs_contest_sync_${activeContestInfo.id}`);
    }
    const openChannels: BroadcastChannel[] = [];
    channelNames.forEach((name) => {
      try {
        const ch = new BroadcastChannel(name);
        ch.onmessage = (e) => {
          const msg = e.data || {};
          if (msg.type === "CONTEST_SYNC") {
            if (msg.action === "VOTING_OPEN" && msg.performance) {
              setActiveContestVote({
                contestId: msg.performance.contestId,
                performance: {
                  id: msg.performance.id,
                  songTitle: msg.performance.songTitle,
                  artistName: msg.performance.artistName,
                  participantName: msg.performance.participant?.name || "Cantante",
                  stageName: msg.performance.participant?.stageName,
                  tableLabel: msg.performance.participant?.tableLabel,
                },
              });
              setContestVoteSubmitted(false);
              setContestStars(5);
            } else if (msg.action === "VOTING_CLOSED" || msg.action === "DISMISS") {
              setActiveContestVote(null);
            }
          }
        };
        openChannels.push(ch);
      } catch {}
    });
    return () => {
      openChannels.forEach((ch) => {
        try {
          ch.close();
        } catch {}
      });
    };
  }, [session?.event?.code]);

  // Enviar voto individual de este dispositivo / persona al concurso
  const handleSendContestPublicVote = async () => {
    if (!activeContestVote?.contestId || !activeContestVote?.performance?.id) return;
    setContestVoteLoading(true);
    try {
      // Token único de dispositivo para que cada persona en la mesa tenga su propio voto
      let deviceToken = "anon_device";
      if (typeof window !== "undefined") {
        deviceToken = localStorage.getItem("vidjs_device_voter_token") || "";
        if (!deviceToken) {
          deviceToken = `voter_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
          localStorage.setItem("vidjs_device_voter_token", deviceToken);
        }
      }

      const res = await fetch(`/api/v1/contest/${activeContestVote.contestId}/vote/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performanceId: activeContestVote.performance.id,
          stars: contestStars,
          cheerCount: contestCheered ? 5 : 1,
          guestSessionToken: deviceToken,
          tableLabel: session?.table?.label || "Mesa de Invitados",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setContestVoteSubmitted(true);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `vidjs_voted_${activeContestVote.performance.id}`,
            JSON.stringify({ stars: contestStars })
          );
        }
        if (tableConsumption?.status === "SUPER_VOTE" || data.data?.isSuperVote) {
          setSuccessMessage(`🌟 ¡Tu SÚPER VOTO individual (x2) fue registrado desde ${session?.table?.label || "tu mesa"}!`);
        } else {
          setSuccessMessage(`⭐ ¡Tu voto individual fue registrado desde ${session?.table?.label || "tu mesa"}!`);
        }
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        if (data?.requiresConsumption) {
          setTableConsumption((prev) => ({
            status: "PENDING",
            isSuperVote: false,
            requireConsumption: true,
            notes: prev?.notes,
          }));
        }
        alert(data.error || "No se pudo emitir el voto");
      }
    } catch {
      alert("Error de conexión al emitir voto");
    } finally {
      setContestVoteLoading(false);
    }
  };

  // Temporizador para finalizar el aplausómetro en el móvil
  useEffect(() => {
    if (!activeApplause) return;
    const interval = setInterval(() => {
      if (new Date() >= new Date(activeApplause.endsAt)) {
        setActiveApplause(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeApplause]);

  // Enviar reacción de emoji flotante a la Smart TV
  const handleSendReaction = async (reaction: string) => {
    setLastReactionSent(reaction);
    try {
      await fetch("/api/v1/guest/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction }),
      });
    } catch {}
    setTimeout(() => {
      setLastReactionSent((prev) => (prev === reaction ? null : prev));
    }, 1000);
  };

  // Enviar tick de aplausos desde el celular
  const handleSendApplauseTick = async () => {
    if (!session?.event?.id) return;
    setApplauseCount((prev) => prev + 1);
    try {
      await fetch("/api/v1/dj/interactive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TICK_APPLAUSE",
          eventId: session.event.id,
        }),
      });
    } catch {}
  };

  // Polling de respaldo resiliente cada 15 segundos
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/v1/requests");
        if (res.ok) {
          const data = await res.json();
          setMyRequests(data.data.requests);
          setCurrentPlaying(data.data.currentPlaying || null);
          if (data.data.flashDeal) setFlashDeal(data.data.flashDeal);
          if (data.data.tableAllowance) setTableAllowance(data.data.tableAllowance);
        }
        fetchDuelState(session.event.id);
      } catch {
        // Silencioso
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [session]);

  // Enviar solicitud de canción con Fast-Pass y soporte de Play directo en Auto-Play
  const handleSubmitRequest = async (e: React.FormEvent, playNow = false) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    if (!session) {
      setFormError("Para enviar una canción al DJ necesitas conectarte al código QR de tu mesa.");
      setSubmitting(false);
      return;
    }

    try {
      const payload: any = {
        guestName,
        notes,
        isFastPass,
        tipAmountCents: isFastPass ? 500 : 0,
        mode: activeMode,
        playNow,
      };

      if (selectedSong) {
        payload.songId = selectedSong.id;
      } else {
        payload.customTitle = customTitle;
        payload.customArtist = customArtist;
      }

      const res = await fetch("/api/v1/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "No se pudo enviar la solicitud");
      }

      setSelectedSong(null);
      setIsCustomModalOpen(false);
      setCustomTitle("");
      setCustomArtist("");
      setNotes("");
      setIsFastPass(false);
      setSuccessMessage(
        playNow
          ? `🎉 ¡Le diste al Play! Tu tema está sonando en vivo al aire.`
          : isFastPass
          ? `⭐ ¡Canción con Fast-Pass VIP enviada ${activeMode === "DJ" ? "a la cabina DJ" : "al escenario de Karaoke"}!`
          : `¡Canción enviada ${activeMode === "DJ" ? "a la cabina del DJ" : "al escenario de Karaoke"} exitosamente!`
      );
      setTimeout(() => setSuccessMessage(null), 4000);

      await loadSessionAndRequests();
      setActiveTab("my-requests");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Ocurrió un error al enviar el pedido");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Acción directa: el solicitante le da al Play a una canción en modo Auto-Play
  const handlePlayRequest = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      const res = await fetch(`/api/v1/requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PLAY" }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message || "🎉 ¡Tu canción está sonando al aire ahora mismo!");
        setTimeout(() => setSuccessMessage(null), 4000);
        await loadSessionAndRequests();
      } else {
        alert(data.error?.message || "No se pudo reproducir la canción");
      }
    } catch {
      alert("Error de conexión al reproducir");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Terminar reproducción activa por el solicitante para dar lugar al siguiente
  const handleFinishRequest = async (requestId: string) => {
    if (
      !confirm(
        "¿Deseas terminar tu turno ahora para dar paso a la siguiente canción? Tu cupo de mesa se liberará de inmediato."
      )
    ) {
      return;
    }
    setActionLoadingId(requestId);
    try {
      const res = await fetch(`/api/v1/requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "FINISH" }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message || "🎉 ¡Turno finalizado! Dando lugar al siguiente tema.");
        setTimeout(() => setSuccessMessage(null), 4000);
        await loadSessionAndRequests();
      } else {
        alert(data.error?.message || "No se pudo finalizar la reproducción");
      }
    } catch {
      alert("Error de conexión al finalizar");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Votar en Duelo Musical
  const handleVote = async (option: "A" | "B") => {
    if (!activeDuel || votedOption || votingLoading) return;
    setVotingLoading(true);
    try {
      const res = await fetch("/api/v1/duel/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duelId: activeDuel.id, option }),
      });
      if (res.ok) {
        const json = await res.json();
        setActiveDuel(json.data);
        setVotedOption(option);
        setSuccessMessage("¡Tu voto ha sido registrado!");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const err = await res.json();
        alert(err.error?.message || "Error al votar");
      }
    } catch {
      alert("Error de conexión al votar");
    } finally {
      setVotingLoading(false);
    }
  };

  // Subir Foto al Muro Social con compresión automática
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setCompressingPhoto(true);
    try {
      const compressed = await compressImageFile(file, 1200, 1200, 0.8);
      setPhotoPreview(compressed);
    } catch (err) {
      console.error("Error al procesar foto:", err);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setCompressingPhoto(false);
      e.target.value = "";
    }
  };

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPreview) return;
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const frameObj = PHOTO_FRAMES.find((f) => f.id === selectedFrame);
      const finalCaption = frameObj?.text
        ? `${frameObj.text} ${photoCaption.trim() ? `• "${photoCaption.trim()}"` : ""}`
        : photoCaption.trim() || null;

      const res = await fetch("/api/v1/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: photoPreview,
          caption: finalCaption,
          guestName: guestName.trim() || session?.guestName || "Mesa",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPhotoSuccess(true);
        setPhotoPreview(null);
        setPhotoCaption("");
        setSelectedFrame("NONE");
        setTimeout(() => {
          setIsPhotoModalOpen(false);
          setPhotoSuccess(false);
        }, 2500);
      } else {
        setPhotoError(data.error?.message || "Error al enviar la foto a la cabina");
      }
    } catch {
      setPhotoError("Error de conexión al enviar la foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm("¿Deseas cancelar esta solicitud de canción?")) return;
    try {
      const res = await fetch(`/api/v1/requests/${requestId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadSessionAndRequests();
      } else {
        const data = await res.json();
        alert(data.error?.message || "No se pudo cancelar");
      }
    } catch {
      alert("Error de conexión");
    }
  };

  const handleSelectMood = (moodId: string) => {
    setSelectedMood(moodId);
    setSelectedGenre("ALL");
    setActiveTab("catalog");
  };

  const handleOpenCelebrationModal = (tagNote: string) => {
    setNotes(tagNote);
    setSelectedSong(null);
    setIsCustomModalOpen(true);
  };

  if (loadingSession) {
    return (
      <div className="p-6 text-center my-auto space-y-4 max-w-sm mx-auto w-full flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center glow-purple">
          <Disc3 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[#F8FAFC]">Cargando experiencia...</h3>
          <p className="text-xs text-[#94A3B8]">Conectando con el salón</p>
        </div>
      </div>
    );
  }

  if (errorParam === "no_active_event") {
    return (
      <div className="p-6 text-center my-auto space-y-4 max-w-sm mx-auto w-full">
        <div className="w-full flex items-center justify-start">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111F38] hover:bg-[#1b2c4e] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
            title="Volver a eventos"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>Volver</span>
          </button>
        </div>
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#F8FAFC]">Evento No Iniciado</h2>
        <p className="text-sm text-[#94A3B8]">
          En este momento no hay un show o sesión activa en <strong className="text-[#F8FAFC]">{venueParam || "este local"}</strong> ({tableParam || "tu mesa"}).
        </p>
        <p className="text-xs text-[#64748B]">
          ¡El evento comenzará en breve! Vuelve a escanear tu código QR en unos minutos.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGoBack}
            className="w-full py-2.5 px-4 rounded-xl bg-[#111F38] hover:bg-[#1b2c4e] border border-[#263858] text-[#F8FAFC] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Volver al menú</span>
          </button>
        </div>
      </div>
    );
  }

  if (errorParam === "table_not_found") {
    return (
      <div className="p-6 text-center my-auto space-y-4 max-w-sm mx-auto w-full">
        <div className="w-full flex items-center justify-start">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111F38] hover:bg-[#1b2c4e] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
            title="Volver a eventos"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-red-400" />
            <span>Volver</span>
          </button>
        </div>
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#F8FAFC]">Mesa no encontrada</h2>
        <p className="text-sm text-[#94A3B8]">
          El código QR escaneado no coincide con ninguna mesa registrada en el sistema.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGoBack}
            className="w-full py-2.5 px-4 rounded-xl bg-[#111F38] hover:bg-[#1b2c4e] border border-[#263858] text-[#F8FAFC] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <ArrowLeft className="w-4 h-4 text-red-400" />
            <span>Volver al menú</span>
          </button>
        </div>
      </div>
    );
  }

  if (!loadingSession && !session && !dismissConnectScreen) {
    return (
      <div className="p-6 text-center my-auto space-y-6 max-w-sm mx-auto w-full">
        {/* Barra superior con botón Volver */}
        <div className="w-full flex items-center justify-start">
          <button
            type="button"
            onClick={handleReturnToClient}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111F38] hover:bg-[#1b2c4e] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
            title="Volver a la pantalla principal del cliente"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
            <span>Volver</span>
          </button>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 mx-auto flex items-center justify-center glow-purple">
          <QrCode className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-black text-[#F8FAFC]">¡Conéctate a tu Mesa!</h2>
          <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
            Apunta la cámara de tu teléfono al código QR de tu mesa, o ingresa el código del evento que ves en la pantalla gigante de TV.
          </p>
        </div>

        {/* Input de Código de Evento */}
        <form onSubmit={handleJoinByCode} className="space-y-2 text-left bg-[#111F38] p-3.5 rounded-xl border border-[#263858]">
          <label className="text-[11px] font-bold text-[#F8FAFC] block">
            Código de la Noche / Pantalla TV:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: RETRO-POP"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-lg text-[#F8FAFC] font-mono text-xs uppercase placeholder:text-[#64748B] focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md"
            >
              Conectar
            </button>
          </div>
        </form>

        <div className="pt-2 border-t border-[#263858] text-left">
          <div className="text-[11px] text-[#94A3B8] mb-2 font-medium">O prueba en modo demostración (1-clic):</div>
          <a
            href="/qr/qr_centro_m2"
            className="block p-3 rounded-xl bg-[#111F38] hover:bg-[#1b2c4e] border border-[#263858] hover:border-purple-500/50 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F8FAFC]">Simular Mesa 2 (Pista)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 font-mono">
                Sede Centro
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1">
              Retro Bar &bull; Viernes de Karaoke Pop & Clásicos
            </p>
          </a>
        </div>

        {/* Botón inferior para volver a la pantalla principal */}
        <div className="pt-2 border-t border-[#263858]">
          <button
            type="button"
            onClick={handleReturnToClient}
            className="w-full py-2.5 px-4 rounded-xl bg-[#111F38] hover:bg-[#1b2c4e] border border-[#263858] text-[#F8FAFC] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <ArrowLeft className="w-4 h-4 text-purple-400" />
            <span>Volver a la pantalla principal</span>
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string, queuePosition?: number | null, estMinutes?: number | null, tipCents?: number) => {
    switch (status) {
      case "PENDING":
        return {
          label: (tipCents || 0) > 0 ? "⭐ Fast-Pass en revisión" : "En revisión por el DJ",
          detail: "El DJ está evaluando tu pedido",
          color: (tipCents || 0) > 0 ? "bg-amber-950/80 text-amber-200 border-amber-500" : "bg-amber-950/70 text-amber-300 border-amber-800/80",
          icon: Clock,
        };
      case "ACCEPTED":
        return {
          label: queuePosition ? `Turno #${queuePosition} en cola` : "En cola de reproducción",
          detail: estMinutes ? `Tiempo est. de espera: ~${estMinutes} min` : "¡Aceptada por la cabina!",
          color: "bg-emerald-950/70 text-emerald-300 border-emerald-800/80",
          icon: CheckCircle2,
        };
      case "PLAYING":
        return {
          label: "¡Sonando ahora en el local!",
          detail: "¡Es el turno de tu mesa en el escenario!",
          color: "bg-purple-900/80 text-purple-200 border-purple-600 animate-pulse",
          icon: Radio,
        };
      case "PLAYED":
        return {
          label: "Completada",
          detail: "¡Gracias por cantar!",
          color: "bg-[#0D1930] text-[#94A3B8] border border-[#263858]",
          icon: CheckCircle2,
        };
      case "REJECTED":
        return {
          label: "No seleccionada",
          detail: "Pide otro tema que anime a la pista",
          color: "bg-red-950/70 text-red-300 border-red-800/80",
          icon: XCircle,
        };
      case "CANCELLED":
        return {
          label: "Cancelada",
          detail: "Cancelada por el cliente",
          color: "bg-[#080F1F] text-[#64748B] border border-[#263858]",
          icon: X,
        };
      default:
        return {
          label: status,
          detail: "",
          color: "bg-[#0D1930] text-[#94A3B8] border border-[#263858]",
          icon: Clock,
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full overflow-x-hidden">
      {/* 1. Header Nocturno de Mesa */}
      <header className="p-3 sm:p-4 bg-[#111F38]/95 border-b border-[#263858] sticky top-0 z-20 backdrop-blur-md w-full">
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Brand & Evento */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {branding?.logoUrl ? (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#080F1F] border border-[#263858] p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={branding.logoUrl}
                  alt={session?.tenant.name || "Logo"}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Disc3 className="w-4 h-4 animate-spin [animation-duration:10s]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-[#F8FAFC] tracking-wide uppercase truncate">
                {branding?.welcomeTitle || session?.tenant.name}
              </div>
              <div className="text-[10px] sm:text-[11px] text-[#94A3B8] truncate max-w-[130px] sm:max-w-[200px]">
                {session?.event.name}
              </div>
            </div>
          </div>

          {/* Acciones & Mesa Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <PwaInstallButton variant="guest" />

            {/* Acceso directo a Cabina DJ */}
            <a
              href="/dj"
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#0D1930] hover:bg-[#1b2c4c] text-[#94A3B8] hover:text-purple-300 border border-[#263858] hover:border-purple-500/50 text-xs flex items-center gap-1 transition-colors shrink-0"
              title="Acceso para el DJ o Personal de la Cabina"
            >
              <Disc3 className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline font-bold text-[11px]">DJ</span>
            </a>

            <button
              onClick={() => setIsPhotoModalOpen(true)}
              className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-[#0D1930] hover:bg-[#1b2c4c] text-purple-300 border border-[#263858] hover:border-purple-500/40 text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              title="Subir foto a la pantalla"
            >
              <Camera className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline font-bold text-[11px]">Foto</span>
            </button>

            {/* Badge de Mesa con acción de cambiar/salir o Conectar Mesa */}
            {session ? (
              <button
                onClick={() => setIsManageTableOpen(true)}
                className="px-2.5 sm:px-3 py-1 rounded-full bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 hover:border-purple-400 text-purple-300 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shrink-0 max-w-[170px] transition-all cursor-pointer group shadow-sm"
                title="Toca para cambiar de mesa, mudarte al Karaoke o liberar tu mesa"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isRealtime
                      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse"
                      : "bg-emerald-400"
                  }`}
                />
                <span className="truncate">{session.table.label}</span>
                <ArrowLeftRight className="w-3 h-3 text-purple-400 group-hover:text-white shrink-0 ml-0.5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setDismissConnectScreen(false);
                  if (typeof window !== "undefined") {
                    try {
                      sessionStorage.removeItem("vidjs_guest_dismiss_connect");
                    } catch {}
                  }
                }}
                className="px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Conectar a una mesa"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Conectar Mesa</span>
              </button>
            )}
          </div>
        </div>

        {/* Notificación de Cambio de Sector o Mesa */}
        {switchBanner && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-[#111F38] border border-purple-500/60 flex items-center justify-between text-xs text-purple-200 shadow-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400 shrink-0 animate-bounce" />
              <span className="leading-snug">{switchBanner}</span>
            </div>
            <button
              onClick={() => setSwitchBanner(null)}
              className="text-purple-300 hover:text-white ml-2 p-1 shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tarjeta de Cortesía Wi-Fi */}
        {branding?.wifiSsid && (
          <div className="mt-3 px-3 py-1.5 rounded-xl bg-[#0D1930] border border-[#263858] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Wifi className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div className="truncate">
                <span className="text-[#94A3B8]">Wi-Fi: </span>
                <span className="font-bold text-[#F8FAFC]">{branding.wifiSsid}</span>
                {branding.wifiPassword && (
                  <span className="text-cyan-300 ml-1.5 font-mono">
                    ({branding.wifiPassword})
                  </span>
                )}
              </div>
            </div>
            {branding.wifiPassword && (
              <button
                onClick={copyWifiPassword}
                className="px-2 py-1 rounded-lg bg-[#111F38] hover:bg-[#1b2c4c] text-[#F8FAFC] text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors border border-[#263858]"
              >
                {copiedWifi ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Banner de Cupo Fair-Play ("Canta y Libera") */}
        {tableAllowance && (
          <div
            className={`mt-2.5 px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 border transition-all ${
              tableAllowance.queuePaused
                ? "bg-red-950/80 text-red-200 border-red-800"
                : tableAllowance.isLocked
                ? "bg-amber-950/70 text-amber-200 border-amber-700/80"
                : "bg-[#0D1930] text-purple-200 border-[#263858]"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">
                {tableAllowance.queuePaused ? "⏸" : tableAllowance.isLocked ? (tableAllowance.zone === "DJ" ? "🎧" : "🎤") : "✨"}
              </span>
              <div className="min-w-0">
                <div className="font-bold flex items-center gap-1.5 flex-wrap">
                  <span>
                    {tableAllowance.queuePaused
                      ? "Pedidos pausados temporalmente"
                      : tableAllowance.isLocked
                      ? `Turno asignado: ${tableAllowance.usedSlots}/${tableAllowance.maxSlots} activos`
                      : `Cupo disponible: ${tableAllowance.usedSlots}/${tableAllowance.maxSlots} pedidos`}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#080F1F] border border-[#263858] font-mono font-bold">
                    {tableAllowance.zone === "DJ"
                      ? "🎧 Pista DJ"
                      : tableAllowance.zone === "KARAOKE"
                      ? "🎤 Escenario Karaoke"
                      : "🔀 Modo Híbrido"}
                  </span>
                  {tableAllowance.autoPlayRequests && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/60 font-mono font-bold">
                      ⚡ Auto-Play Directo
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#94A3B8] opacity-90 truncate">
                  {tableAllowance.queuePaused
                    ? "La cabina pausó momentáneamente los pedidos. Se reanudarán en breve."
                    : tableAllowance.isLocked
                    ? tableAllowance.zone === "DJ"
                      ? "Tu tema está en cola de mezcla. Al reproducirse se desbloqueará tu cupo."
                      : "Canta tu turno en el escenario y al terminar se desbloqueará tu cupo (Canta y Libera)."
                    : tableAllowance.autoPlayRequests
                    ? "⚡ Auto-Play activo: ¡Tu pedido sonará automáticamente en la pista!"
                    : tableAllowance.zone === "DJ"
                    ? "Pide temas para bailar en la pista a la consola del DJ."
                    : "Pide una canción para cantar en vivo en el escenario."}
                </div>
              </div>
            </div>

            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                tableAllowance.queuePaused
                  ? "bg-red-900 text-red-100"
                  : tableAllowance.isLocked
                  ? "bg-amber-500 text-black animate-pulse"
                  : "bg-emerald-950 text-emerald-300 border border-emerald-700"
              }`}
            >
              {tableAllowance.queuePaused
                ? "Pausa"
                : tableAllowance.isLocked
                ? "En Turno"
                : "Libre"}
            </span>
          </div>
        )}
      </header>

      {/* 2. Tabs de Navegación "ONE QR — ONE NIGHT" */}
      <div className="flex border-b border-[#263858] bg-[#080F1F]/90 backdrop-blur-md sticky top-[65px] z-10">
        <button
          onClick={() => setActiveTab("hub")}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "hub"
              ? "border-purple-500 text-purple-300 bg-purple-950/20"
              : "border-transparent text-[#94A3B8] hover:text-[#F8FAFC]"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Mi Noche</span>
        </button>

        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "catalog"
              ? "border-purple-500 text-purple-300 bg-purple-950/20"
              : "border-transparent text-[#94A3B8] hover:text-[#F8FAFC]"
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Catálogo</span>
        </button>

        <button
          onClick={() => setActiveTab("my-requests")}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "my-requests"
              ? "border-purple-500 text-purple-300 bg-purple-950/20"
              : "border-transparent text-[#94A3B8] hover:text-[#F8FAFC]"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Mis Pedidos</span>
          {myRequests.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-600 text-white font-bold">
              {myRequests.length}
            </span>
          )}
        </button>

        {activeContestInfo && (
          <button
            onClick={() => setActiveTab("contest")}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "contest"
                ? "border-amber-500 text-amber-300 bg-amber-950/30"
                : "border-transparent text-amber-400 hover:text-amber-200"
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Concurso</span>
            {activeContestVote && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        )}
      </div>

      {/* 🔴 Aviso Flotante de Votación Abierta cuando estás en otra pestaña */}
      {activeContestVote && activeTab !== "hub" && activeTab !== "contest" && (
        <div
          onClick={() => setActiveTab("hub")}
          className="mx-3.5 mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black flex items-center justify-between shadow-2xl cursor-pointer animate-pulse"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-black shrink-0" />
            <div className="text-left leading-tight">
              <span className="text-[10px] uppercase tracking-wider block font-black">
                ¡VOTACIÓN ABIERTA EN EL CONCURSO!
              </span>
              <span className="text-xs truncate block font-bold">
                {activeContestVote.performance.stageName || activeContestVote.performance.participantName} - {activeContestVote.performance.songTitle}
              </span>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-xl bg-black text-amber-300 font-extrabold shrink-0 shadow-md">
            Calificar ⭐
          </span>
        </div>
      )}

      {/* 3. Contenido Principal */}
      <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto w-full overflow-x-hidden">
        {/* PESTAÑA 1: "MI NOCHE" (WELCOME HUB) */}
        {activeTab === "hub" && (
          <div className="space-y-4 w-full">
            {/* 🏆 Concurso Oficial de Karaoke Activo esta Noche */}
            {activeContestInfo && (
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-950/80 via-[#111F38] to-[#0D1930] border-2 border-amber-500/60 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Trophy className="w-5 h-5 text-amber-400" />
                    </span>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                        CERTAMEN OFICIAL &bull; EN CURSO ESTA NOCHE
                      </span>
                      <h2 className="text-base font-black text-[#F8FAFC]">{activeContestInfo.name}</h2>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    {activeContestInfo.stageTitle}
                  </span>
                </div>

                {!activeContestVote && (
                  <div className="p-3 rounded-2xl bg-[#080F1F] border border-[#263858] flex items-center gap-2 text-xs text-[#94A3B8]">
                    <Mic className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      ¡Atención a tu mesa! Cuando el próximo cantante suba al escenario, podrás evaluarlo con 1 a 5 estrellas directamente desde aquí.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Banner de Portada del Local */}
            {branding?.bannerUrl && (
              <div className="w-full h-28 sm:h-36 rounded-2xl overflow-hidden border border-[#263858] relative shadow-lg bg-[#080F1F]">
                <img
                  src={branding.bannerUrl}
                  alt="Portada del Local"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* 👏 Aplausómetro en Vivo para Comensales */}
            {activeApplause && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/90 via-[#111F38] to-[#0D1930] border-2 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)] space-y-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👏</span>
                    <div>
                      <span className="text-xs font-black uppercase text-amber-300 tracking-wider block">
                        ¡Aplausómetro al Aire en Pantalla!
                      </span>
                      <p className="text-[11px] text-[#94A3B8]">
                        Califica a: <strong className="text-[#F8FAFC]">{activeApplause.targetTableLabel}</strong>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-amber-400 bg-[#080F1F] px-2.5 py-1 rounded-xl border border-amber-500/40">
                    +{applauseCount}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSendApplauseTick}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black text-sm tracking-wider uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-2xl">👏</span>
                  <span>¡TOCA PARA APLAUDIR! (+1)</span>
                </button>
              </div>
            )}

            {/* 🏆 Votación en Vivo del Concurso de Karaoke desde la Mesa */}
            {activeContestVote && (
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-950/90 via-[#111F38] to-purple-950/90 border-2 border-amber-500/80 shadow-[0_0_35px_rgba(245,158,11,0.35)] space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Trophy className="w-5 h-5 text-amber-400" />
                    </span>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                        GALA OFICIAL &bull; VOTACIÓN DEL PÚBLICO
                      </span>
                      <span className="text-sm font-black text-[#F8FAFC] block">
                        {activeContestVote.performance.stageName || activeContestVote.performance.participantName}
                      </span>
                      <span className="text-[10px] text-[#94A3B8]">
                        📱 Voto individual &bull; Cada celular de la mesa vota por separado
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black animate-pulse">
                    EN ESCENARIO
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#080F1F] border border-[#263858] space-y-0.5">
                  <div className="text-sm font-black text-amber-300">
                    {activeContestVote.performance.songTitle}
                  </div>
                  <div className="text-xs text-[#94A3B8] font-medium">
                    {activeContestVote.performance.artistName}
                  </div>
                </div>

                {!contestVoteSubmitted ? (
                  <div className="space-y-3">
                    <div className="text-center space-y-2">
                      <span className="text-xs font-bold text-[#F8FAFC] block">
                        ¿Qué puntaje le otorgas a esta presentación?
                      </span>
                      <div className="flex items-center justify-center gap-2 py-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setContestStars(star)}
                            className={`p-2.5 rounded-2xl transition-all cursor-pointer ${
                              contestStars >= star
                                ? "bg-amber-500 text-black scale-110 shadow-lg shadow-amber-500/40"
                                : "bg-[#0D1930] text-[#64748B] hover:text-[#94A3B8]"
                            }`}
                          >
                            <Star className="w-6 h-6 fill-current" />
                          </button>
                        ))}
                      </div>
                      <div className="text-xs font-black text-amber-400">
                        {contestStars === 5
                          ? "⭐⭐⭐⭐⭐ ¡IMPRESIONANTE!"
                          : contestStars === 4
                          ? "⭐⭐⭐⭐ ¡MUY BUENO!"
                          : contestStars === 3
                          ? "⭐⭐⭐ ¡BUEN INTENTO!"
                          : contestStars === 2
                          ? "⭐⭐ REGULAR"
                          : "⭐ PUEDE MEJORAR"}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setContestCheered(!contestCheered)}
                        className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          contestCheered
                            ? "bg-pink-600 border-pink-400 text-white shadow-md shadow-pink-600/30"
                            : "bg-[#0D1930] border-[#263858] text-[#94A3B8] hover:border-pink-500/50"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${contestCheered ? "fill-white" : "text-pink-400"}`} />
                        <span>{contestCheered ? "¡Con Aplauso Extra!" : "+ Dar Barra y Ánimo"}</span>
                      </button>
                    </div>

                    {!session?.table?.id ? (
                      <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-center space-y-1.5">
                        <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-xs">
                          <Lock className="w-4 h-4 text-amber-400" />
                          <span>Presencia física requerida en el local</span>
                        </div>
                        <p className="text-[11px] text-[#94A3B8]">
                          Para garantizar que el concurso sea 100% justo, debes escanear el código QR de tu mesa para votar.
                        </p>
                      </div>
                    ) : tableConsumption?.requireConsumption && tableConsumption?.status === "PENDING" ? (
                      <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/60 text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wide">
                          <Lock className="w-4 h-4 text-amber-400 animate-bounce" />
                          <span>Voto Sujeto a Consumo de Mesa</span>
                        </div>
                        <p className="text-[11px] text-[#F8FAFC] leading-relaxed">
                          La mesa <span className="text-amber-300 font-bold">{session.table.label}</span> aún no ha sido validada con consumo mínimo.
                        </p>
                        <div className="text-[10px] text-[#94A3B8] bg-[#080F1F] p-2 rounded-xl border border-[#263858]">
                          💡 Solicita a tu mozo o en barra confirmar el consumo de tu mesa para desbloquear el voto a todos los comensales presentes.
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchTableConsumption()}
                          className="w-full py-2 px-3 rounded-xl bg-[#0D1930] hover:bg-[#111F38] text-[#F8FAFC] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-[#263858]"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Comprobar estado de consumo</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tableConsumption?.status === "SUPER_VOTE" ? (
                          <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border border-amber-400/50 flex items-center justify-between px-3 text-xs text-amber-300 font-black animate-pulse">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-yellow-300" />
                              🌟 ¡SÚPER VOTO ACTIVADO!
                            </span>
                            <span className="text-[10px] bg-amber-400 text-black px-2 py-0.5 rounded-full font-black">
                              PODER x2
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[11px] px-1 text-[#94A3B8]">
                            <span className="flex items-center gap-1 text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Consumo verificado ({session.table.label})
                            </span>
                            <span className="text-[#64748B]">Poder 1.0x</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleSendContestPublicVote}
                          disabled={contestVoteLoading}
                          className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                            tableConsumption?.status === "SUPER_VOTE"
                              ? "bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 text-black shadow-xl shadow-yellow-500/40 hover:scale-[1.01]"
                              : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-lg shadow-amber-500/30"
                          }`}
                        >
                          {contestVoteLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : tableConsumption?.status === "SUPER_VOTE" ? (
                            <Sparkles className="w-4 h-4 text-black" />
                          ) : (
                            <Trophy className="w-4 h-4 text-black" />
                          )}
                          <span>
                            {tableConsumption?.status === "SUPER_VOTE"
                              ? `Enviar Súper Voto x2 (${session.table.label})`
                              : `Enviar Mi Calificación (${session.table.label})`}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-center space-y-2">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-sm font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>¡Tu voto individual de {contestStars} estrellas fue sumado!</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      Tus acompañantes de mesa también pueden votar desde sus propios celulares.
                    </p>
                    <button
                      type="button"
                      onClick={() => setContestVoteSubmitted(false)}
                      className="mt-1 px-3 py-1.5 rounded-xl bg-[#0D1930] border border-[#263858] hover:border-amber-500/50 text-[11px] text-amber-400 hover:text-amber-300 font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>✏️ Modificar mi voto</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 🚀 Barra de Reacciones en Vivo a la Smart TV */}
            <div className="p-3.5 rounded-2xl bg-[#111F38] border border-[#263858] shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🔥</span>
                  <span className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                    Reaccionar en Vivo a la Pantalla
                  </span>
                </div>
                {lastReactionSent && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800 animate-bounce">
                    ¡{lastReactionSent} enviado a la TV!
                  </span>
                )}
              </div>
              <div className="grid grid-cols-6 gap-2">
                {[
                  { emoji: "🔥", label: "Fuego" },
                  { emoji: "❤️", label: "Amor" },
                  { emoji: "👏", label: "Bravo" },
                  { emoji: "🍻", label: "Salud" },
                  { emoji: "💃", label: "Baile" },
                  { emoji: "🎤", label: "Canto" },
                ].map((item) => (
                  <button
                    key={item.emoji}
                    type="button"
                    onClick={() => handleSendReaction(item.emoji)}
                    className="py-2.5 rounded-xl bg-[#0D1930] hover:bg-[#1c2e4e] border border-[#263858] hover:border-purple-500/50 flex flex-col items-center justify-center gap-1 active:scale-90 transition-all cursor-pointer shadow-sm"
                  >
                    <span className="text-xl sm:text-2xl">{item.emoji}</span>
                    <span className="text-[9px] text-[#94A3B8] font-semibold">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Promo Flash Deal de Barra (Pulse) */}
            {flashDeal && (
              <div
                className={`p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r ${flashDeal.bannerBg} border ${flashDeal.color} flex items-center justify-between gap-2 shadow-xl animate-fadeIn w-full`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-white font-mono shrink-0">
                      {flashDeal.badgeText}
                    </span>
                    <span className="text-xs font-black text-white truncate">{flashDeal.title}</span>
                  </div>
                  <div className="text-[11px] text-zinc-300 font-semibold mt-0.5 truncate">
                    {flashDeal.discount}
                  </div>
                </div>
                <span className="text-[10px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-white text-black font-extrabold shrink-0 shadow-md">
                  {flashDeal.callToAction}
                </span>
              </div>
            )}

            {/* Duelo Musical en Vivo (Live Duel) */}
            {activeDuel && activeDuel.status === "ACTIVE" && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#111F38] via-[#0D1930] to-cyan-950/90 border-2 border-purple-500/60 shadow-[0_0_25px_rgba(168,85,247,0.3)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-[#F8FAFC] tracking-wider">
                    <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                    <span>¡Duelo Musical en Vivo!</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#080F1F] text-cyan-300 border border-cyan-500/40 font-bold">
                    {activeDuel.totalVotes} votos
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleVote("A")}
                    disabled={Boolean(votedOption) || votingLoading}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      votedOption === "A"
                        ? "bg-purple-600 border-white text-white shadow-lg"
                        : "bg-[#0D1930] border-purple-500/50 hover:border-purple-400 text-purple-200"
                    }`}
                  >
                    <div className="text-[10px] font-mono uppercase font-bold text-purple-400">Opción A</div>
                    <div className="text-xs font-bold truncate text-[#F8FAFC]">{activeDuel.optionA.title}</div>
                    <div className="text-[10px] truncate text-[#94A3B8]">{activeDuel.optionA.artist}</div>
                    <div className="mt-1.5 text-[11px] font-extrabold text-purple-300">
                      {activeDuel.optionA.votes} votos ({activeDuel.totalVotes ? Math.round((activeDuel.optionA.votes / activeDuel.totalVotes) * 100) : 0}%)
                    </div>
                  </button>

                  <button
                    onClick={() => handleVote("B")}
                    disabled={Boolean(votedOption) || votingLoading}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      votedOption === "B"
                        ? "bg-cyan-600 border-white text-white shadow-lg"
                        : "bg-[#0D1930] border-cyan-500/50 hover:border-cyan-400 text-cyan-200"
                    }`}
                  >
                    <div className="text-[10px] font-mono uppercase font-bold text-cyan-400">Opción B</div>
                    <div className="text-xs font-bold truncate text-[#F8FAFC]">{activeDuel.optionB.title}</div>
                    <div className="text-[10px] truncate text-[#94A3B8]">{activeDuel.optionB.artist}</div>
                    <div className="mt-1.5 text-[11px] font-extrabold text-cyan-300">
                      {activeDuel.optionB.votes} votos ({activeDuel.totalVotes ? Math.round((activeDuel.optionB.votes / activeDuel.totalVotes) * 100) : 0}%)
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Spotlight en Vivo */}
            {currentPlaying && (() => {
              const isMyTrack = Boolean(currentPlaying.isMyRequest || myRequests.some((r) => r.status === "PLAYING"));
              const playingReq = myRequests.find((r) => r.status === "PLAYING");
              const targetId = currentPlaying.requestId || playingReq?.id;

              return (
                <div
                  className={`p-4 rounded-2xl transition-all shadow-xl space-y-3 ${
                    isMyTrack
                      ? "bg-gradient-to-br from-purple-950/80 via-[#111F38] to-[#0D1930] border-2 border-purple-500/60 shadow-purple-950/60"
                      : "bg-[#111F38] border border-[#263858]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2.5 rounded-xl border text-purple-400 shrink-0 ${
                          isMyTrack
                            ? "bg-purple-600/30 border-purple-400 animate-pulse text-purple-300"
                            : "bg-purple-600/20 border-purple-500/40"
                        }`}
                      >
                        <Radio className="w-5 h-5 animate-pulse" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-purple-300 font-bold uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                          <span>Sonando Ahora &bull; {currentPlaying.tableLabel}</span>
                          {isMyTrack && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black tracking-wider animate-pulse shadow-sm">
                              ✨ ¡TU CANCIÓN AL AIRE!
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-black text-[#F8FAFC] truncate">
                          {currentPlaying.title}
                        </div>
                        <div className="text-xs text-[#94A3B8] truncate">
                          {currentPlaying.artist}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {isMyTrack && targetId && (
                        <button
                          type="button"
                          onClick={() => handleFinishRequest(targetId)}
                          disabled={Boolean(actionLoadingId)}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-rose-950 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Terminar mi canción ahora para dar lugar al siguiente pedido y liberar mi cupo"
                        >
                          {actionLoadingId ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Square className="w-3 h-3 fill-current" />
                          )}
                          <span>Terminar Turno</span>
                        </button>
                      )}
                      <div className="flex items-center gap-0.5 shrink-0 pl-1">
                        <span className="w-1 h-3 bg-purple-400 rounded-full animate-pulse" />
                        <span className="w-1 h-5 bg-purple-400 rounded-full animate-pulse [animation-delay:150ms]" />
                        <span className="w-1 h-2 bg-purple-400 rounded-full animate-pulse [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>

                  {/* Panel VIP interactivo para el solicitante cuando su canción está sonando */}
                  {isMyTrack && (
                    <div className="pt-2 border-t border-purple-500/20 space-y-2.5">
                      {/* Fila de Reacciones en Vivo */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-purple-200 flex items-center gap-1.5">
                            <span>🎉 Reacciona en Vivo en la Pantalla TV:</span>
                          </span>
                          {lastReactionSent && (
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800 animate-bounce">
                              ¡{lastReactionSent} en la Pantalla!
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-8 gap-1.5">
                          {[
                            { emoji: "🔥", label: "Fuego" },
                            { emoji: "❤️", label: "Amor" },
                            { emoji: "👏", label: "Bravo" },
                            { emoji: "🍻", label: "Salud" },
                            { emoji: "💃", label: "Baile" },
                            { emoji: "🎤", label: "Canto" },
                            { emoji: "⭐", label: "Estrella" },
                            { emoji: "🎉", label: "Fiesta" },
                          ].map((item) => (
                            <button
                              key={item.emoji}
                              type="button"
                              onClick={() => handleSendReaction(item.emoji)}
                              className="py-2 rounded-xl bg-[#080F1F] hover:bg-purple-900/50 border border-[#263858] hover:border-purple-400 text-center transition-all cursor-pointer active:scale-90 flex flex-col items-center justify-center shadow-sm"
                              title={`Enviar ${item.label} a la pantalla`}
                            >
                              <span className="text-lg leading-tight">{item.emoji}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Compartir Fotos si Auto-Play está activado */}
                      {tableAllowance?.autoPlayRequests && (
                        <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/70 via-[#111F38] to-[#0D1930] border border-emerald-500/40 flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                              <Camera className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-black text-emerald-200 flex items-center gap-1.5">
                                <span>📸 Compartir Fotos en Pantalla</span>
                                <span className="text-[9px] bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 px-1 py-0.5 rounded font-black">
                                  AUTO-PLAY EN VIVO
                                </span>
                              </div>
                              <p className="text-[10px] text-[#94A3B8] truncate">
                                Sube una foto para proyectarla al instante en la TV durante tu canción
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsPhotoModalOpen(true)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all cursor-pointer active:scale-95 shrink-0"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Subir Foto Ahora</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* "¿Qué quieres hacer esta noche?" - Tarjetas de Acción Directa */}
            <div className="w-full">
              <h3 className="text-xs font-black uppercase text-[#94A3B8] tracking-wider mb-2.5">
                ¿Qué quieres hacer esta noche?
              </h3>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
                <button
                  onClick={() => {
                    setSelectedMood(null);
                    setActiveTab("catalog");
                  }}
                  className="p-2.5 sm:p-3 rounded-2xl bg-[#111F38] border border-[#263858] hover:border-purple-500/60 text-left transition-all group cursor-pointer flex flex-col justify-between min-w-0"
                >
                  <div className="w-7 h-7 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-2 group-hover:scale-110 transition-transform shrink-0">
                    <Music className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-bold text-[#F8FAFC] truncate w-full">Pedir Canción</div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5 truncate w-full">Catálogo oficial</div>
                </button>

                <button
                  onClick={() => {
                    const moodSection = document.getElementById("moods-section");
                    if (moodSection) {
                      moodSection.scrollIntoView({ behavior: "smooth" });
                    } else {
                      setSelectedMood("fiesta");
                      setActiveTab("catalog");
                    }
                  }}
                  className="p-2.5 sm:p-3 rounded-2xl bg-[#111F38] border border-[#263858] hover:border-fuchsia-500/60 text-left transition-all group cursor-pointer flex flex-col justify-between min-w-0"
                >
                  <div className="w-7 h-7 rounded-xl bg-fuchsia-600/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 mb-2 group-hover:scale-110 transition-transform shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-bold text-[#F8FAFC] truncate w-full">Mood</div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5 truncate w-full">Según tu vibra</div>
                </button>

                <button
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="p-2.5 sm:p-3 rounded-2xl bg-[#111F38] border border-[#263858] hover:border-cyan-500/60 text-left transition-all group cursor-pointer flex flex-col justify-between min-w-0"
                >
                  <div className="w-7 h-7 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2 group-hover:scale-110 transition-transform shrink-0">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-bold text-[#F8FAFC] truncate w-full">Foto en TV</div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5 truncate w-full">Muro social</div>
                </button>
              </div>
            </div>

            {/* Selector Rápido de Moods */}
            <div id="moods-section">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase text-[#94A3B8] tracking-wider">
                  Elige tu Mood
                </h3>
                <span className="text-[10px] text-purple-400">1-clic</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MOODS.map((mood) => {
                  const Icon = mood.icon;
                  return (
                    <button
                      key={mood.id}
                      onClick={() => handleSelectMood(mood.id)}
                      className="p-3 rounded-xl bg-[#111F38] border border-[#263858] hover:border-purple-600/50 flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg bg-gradient-to-r ${mood.color} text-white`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-[#F8FAFC] group-hover:text-purple-300 transition-colors">
                          {mood.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#64748B]">&rarr;</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dedicatorias Rápidas & Celebraciones */}
            <div className="p-4 rounded-2xl bg-[#111F38] border border-[#263858] space-y-2.5">
              <div className="flex items-center gap-2">
                <Cake className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-[#F8FAFC]">¿Están festejando algo?</h3>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Dedica una canción especial para que salga con felicitación en la pantalla del local:
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {CELEBRATION_TAGS.map((tag) => (
                  <button
                    key={tag.label}
                    onClick={() => handleOpenCelebrationModal(tag.note)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0D1930] border border-[#263858] hover:border-purple-500/60 text-[11px] text-[#94A3B8] hover:text-[#F8FAFC] transition-all cursor-pointer"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mi Noche: Estado de pedidos de esta mesa */}
            {myRequests.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 via-[#111F38] to-[#0D1930] border border-[#263858] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#F8FAFC] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Tu Estado Esta Noche</span>
                  </span>
                  <button
                    onClick={() => setActiveTab("my-requests")}
                    className="text-purple-400 hover:underline text-[11px]"
                  >
                    Ver detalles &rarr;
                  </button>
                </div>

                <div className="text-[11px] text-[#94A3B8]">
                  Has enviado <strong className="text-[#F8FAFC]">{myRequests.length} canciones</strong>.
                  {myRequests.some((r) => r.status === "PLAYING") && (
                    <div className="text-purple-300 font-bold mt-1">
                      ¡Tu tema está sonando en vivo ahora mismo!
                    </div>
                  )}
                  {myRequests.some((r) => r.status === "ACCEPTED") && (
                    <div className="text-emerald-300 font-medium mt-1">
                      ¡Tu próximo tema ya fue aceptado en la cola del DJ!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 2: CATÁLOGO DE CANCIONES */}
        {activeTab === "catalog" && (
          <div className="space-y-4">
            {/* Selector de Modo DJ vs Karaoke si el evento o salón es híbrido */}
            {tableAllowance?.nightMode !== "DJ_ONLY" && tableAllowance?.nightMode !== "KARAOKE_ONLY" && (
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#0D1930] rounded-2xl border border-[#263858] shadow-sm">
                <button
                  type="button"
                  onClick={() => handleSelectMode("DJ")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeMode === "DJ"
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md shadow-amber-500/20"
                      : "text-[#94A3B8] hover:text-[#F8FAFC]"
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>🎧 Pista DJ (Baile)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMode("KARAOKE")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeMode === "KARAOKE"
                      ? "bg-gradient-to-r from-cyan-400 to-teal-400 text-black shadow-md shadow-cyan-400/20"
                      : "text-[#94A3B8] hover:text-[#F8FAFC]"
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>🎤 Cantar Karaoke</span>
                </button>
              </div>
            )}

            {tableAllowance?.nightMode === "DJ_ONLY" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300">
                <Headphones className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Noche en Modo DJ &bull; Búsqueda de canciones para la pista de baile</span>
              </div>
            )}

            {tableAllowance?.nightMode === "KARAOKE_ONLY" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-300">
                <Mic className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Noche en Modo Karaoke &bull; Búsqueda de canciones con letra para cantar</span>
              </div>
            )}

            <div className="relative">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeMode === "DJ"
                    ? "Buscar tema bailable, remix o artista para el DJ..."
                    : "Buscar canción, artista o pista de karaoke..."
                }
                className="w-full pl-9 pr-4 py-2.5 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-purple-500 transition-colors"
              />
              {isSearching && (
                <RefreshCw className="w-3.5 h-3.5 text-purple-400 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin" />
              )}
            </div>

            {selectedMood && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#111F38] border border-purple-500/40 text-xs">
                <span className="text-purple-200">
                  Filtrando por Mood: <strong className="uppercase">{selectedMood}</strong>
                </span>
                <button
                  onClick={() => setSelectedMood(null)}
                  className="text-[10px] text-purple-400 hover:text-white underline cursor-pointer"
                >
                  Quitar filtro
                </button>
              </div>
            )}

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {genres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => {
                    setSelectedMood(null);
                    setSelectedGenre(genre);
                  }}
                  className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-colors cursor-pointer ${
                    selectedGenre === genre && !selectedMood
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                      : "bg-[#0D1930] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263858]"
                  }`}
                >
                  {genre === "ALL" ? "Todos" : genre}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setSelectedSong(null);
                setIsCustomModalOpen(true);
              }}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-purple-950/40 via-[#111F38] to-[#0D1930] border border-[#263858] hover:border-purple-500/60 text-left flex items-center justify-between transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-bold text-[#F8FAFC]">¿No encuentras tu tema?</div>
                  <div className="text-[10px] text-[#94A3B8]">Pídelo manualmente con nombre y artista</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 font-semibold border border-purple-700/40">
                Pedir
              </span>
            </button>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Canciones del Local ({songs.length})
                </div>

                {songs.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#64748B] bg-[#0D1930]/50 rounded-xl border border-[#263858]/60">
                    No se encontraron temas en el repertorio local.
                  </div>
                ) : (
                  songs.map((song) => (
                    <div
                      key={song.id}
                      className="p-3 rounded-xl bg-[#111F38] border border-[#263858] hover:border-purple-600/40 flex items-center justify-between transition-all"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-xs font-bold text-[#F8FAFC] truncate">{song.title}</div>
                        <div className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                          {song.artist?.name || "Artista desconocido"}
                        </div>
                        {song.genre && (
                          <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-[#080F1F] text-[#94A3B8] border border-[#263858] mt-1">
                            {song.genre}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedSong(song);
                          setIsCustomModalOpen(true);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                          tableAllowance?.autoPlayRequests
                            ? "bg-emerald-600/30 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/50 shadow-sm"
                            : "bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30"
                        }`}
                      >
                        {tableAllowance?.autoPlayRequests && <Play className="w-3 h-3 fill-current" />}
                        <span>{tableAllowance?.autoPlayRequests ? "Play / Pedir" : "Pedir"}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Resultados complementarios estirados de YouTube según Modo */}
              {youtubeSongs.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#263858]">
                  <div className={`text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between ${
                    activeMode === "DJ" ? "text-amber-400" : "text-cyan-400"
                  }`}>
                    <span className="flex items-center gap-1.5">
                      {activeMode === "DJ" ? (
                        <Headphones className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Mic className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span>
                        {activeMode === "DJ"
                          ? `Pistas Originales YouTube para DJ (${youtubeSongs.length})`
                          : `Pistas de Karaoke con Letra en YouTube (${youtubeSongs.length})`}
                      </span>
                    </span>
                    <span className="text-[10px] text-[#64748B] font-normal lowercase">
                      (toca para pedir)
                    </span>
                  </div>

                  {youtubeSongs.map((yt) => (
                    <div
                      key={yt.id}
                      className={`p-3 rounded-xl bg-[#111F38] border flex items-center justify-between transition-all ${
                        activeMode === "DJ"
                          ? "border-amber-500/30 hover:border-amber-500/60"
                          : "border-cyan-500/30 hover:border-cyan-500/60"
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-xs font-bold text-[#F8FAFC] truncate">
                          {yt.parsedTitle || yt.title}
                        </div>
                        <div className={`text-[11px] truncate mt-0.5 ${
                          activeMode === "DJ" ? "text-amber-300" : "text-cyan-300"
                        }`}>
                          {yt.parsedArtist || yt.channelTitle}
                        </div>
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded border mt-1 ${
                          activeMode === "DJ"
                            ? "bg-amber-950/60 text-amber-300 border-amber-800/60"
                            : "bg-cyan-950/60 text-cyan-300 border-cyan-800/60"
                        }`}>
                          {activeMode === "DJ" ? "🎧 Pista Original para DJ" : "🎤 Pista con Letra"}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedSong(null);
                          setCustomTitle(yt.parsedTitle || yt.title);
                          setCustomArtist(yt.parsedArtist || yt.channelTitle || "Desconocido");
                          setIsCustomModalOpen(true);
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                          tableAllowance?.autoPlayRequests
                            ? "bg-emerald-600/30 hover:bg-emerald-500 text-emerald-300 hover:text-black border-emerald-500/50"
                            : activeMode === "DJ"
                            ? "bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-black border-amber-500/30"
                            : "bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border-cyan-500/30"
                        }`}
                      >
                        {tableAllowance?.autoPlayRequests && <Play className="w-3 h-3 fill-current" />}
                        <span>
                          {tableAllowance?.autoPlayRequests
                            ? "Play / Pedir"
                            : activeMode === "DJ"
                            ? "Pedir a DJ"
                            : "Cantar"}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 3: MIS PEDIDOS ("MI NOCHE" TRACKER) */}
        {activeTab === "my-requests" && (
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
              <span>Canciones de tu Mesa</span>
              <span className="text-[10px] text-purple-400 flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Actualizado en vivo
              </span>
            </div>

            {myRequests.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-[#111F38]/40 rounded-2xl border border-[#263858] p-6">
                <Music className="w-10 h-10 text-[#64748B] mx-auto" />
                <p className="text-xs text-[#94A3B8]">Tu mesa todavía no ha pedido ninguna canción.</p>
                <button
                  onClick={() => setActiveTab("catalog")}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer transition-all shadow-md shadow-purple-600/30"
                >
                  Explorar Catálogo
                </button>
              </div>
            ) : (
              myRequests.map((req) => {
                const badge = getStatusBadge(req.status, req.queuePosition, req.estimatedWaitMinutes, req.tipAmountCents);
                const BadgeIcon = badge.icon;
                const title = req.song?.title || req.customTitle;
                const artist = req.song?.artist?.name || req.customArtist;

                return (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-[#111F38] border border-[#263858] space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <div className="text-xs font-bold text-[#F8FAFC]">{title}</div>
                          {(req.tipAmountCents || 0) > 0 && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-amber-400 text-black">
                              VIP FAST-PASS
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#94A3B8]">{artist}</div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {tableAllowance?.autoPlayRequests && (req.status === "PENDING" || req.status === "ACCEPTED") && (
                          Boolean(currentPlaying) ? (
                            <div
                              className="px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-700/60 text-red-300 font-bold text-[11px] flex items-center gap-1.5 shadow-sm opacity-90 cursor-not-allowed select-none"
                              title="Bandeja en reproducción. Espera a que termine la canción actual para darle al Play"
                            >
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                              <span>🔴 En Reprod.</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePlayRequest(req.id)}
                              disabled={actionLoadingId === req.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] flex items-center gap-1 shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                              title="Darle al Play para que esta canción suene de inmediato en la cabina y TV"
                            >
                              {actionLoadingId === req.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3 fill-current" />
                              )}
                              <span>▶ Darle al Play</span>
                            </button>
                          )
                        )}
                        {req.status === "PLAYING" && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500 font-black flex items-center gap-1 animate-pulse">
                              <Radio className="w-3 h-3 text-purple-400" />
                              <span>¡AL AIRE!</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleFinishRequest(req.id)}
                              disabled={actionLoadingId === req.id}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-md shadow-rose-950 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                              title="Terminar mi canción ahora para dar lugar al siguiente pedido y liberar mi cupo"
                            >
                              {actionLoadingId === req.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Square className="w-3 h-3 fill-current" />
                              )}
                              <span>Terminar Turno</span>
                            </button>
                          </div>
                        )}
                        {req.status === "PENDING" && (
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            className="text-[10px] text-red-400 hover:text-red-300 font-medium px-2 py-0.5 rounded bg-red-950/40 border border-red-900/60 cursor-pointer transition-colors"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>

                    {req.notes && (
                      <div className="text-[11px] text-purple-300/90 italic bg-[#0D1930] p-2.5 rounded-xl border border-purple-900/40">
                        &ldquo;{req.notes}&rdquo;
                      </div>
                    )}

                    <div className="pt-1 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${badge.color}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          <span className="font-semibold">{badge.label}</span>
                        </div>
                        <span className="text-[#64748B]">
                          {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {badge.detail && (
                        <div className="text-[10px] text-[#94A3B8] pl-1">
                          {badge.detail}
                        </div>
                      )}
                    </div>

                    {req.status === "PLAYING" && (
                      <div className="mt-3 pt-3 border-t border-purple-500/30 space-y-2 bg-[#0D1930] -mx-3.5 -mb-3.5 p-3 rounded-b-2xl">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-purple-200 flex items-center gap-1.5">
                            <span>🎉 Reacciona en Vivo en la Pantalla TV:</span>
                          </span>
                          {lastReactionSent && (
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800 animate-bounce">
                              ¡{lastReactionSent} en la Pantalla!
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-8 gap-1.5">
                          {[
                            { emoji: "🔥", label: "Fuego" },
                            { emoji: "❤️", label: "Amor" },
                            { emoji: "👏", label: "Bravo" },
                            { emoji: "🍻", label: "Salud" },
                            { emoji: "💃", label: "Baile" },
                            { emoji: "🎤", label: "Canto" },
                            { emoji: "⭐", label: "Estrella" },
                            { emoji: "🎉", label: "Fiesta" },
                          ].map((item) => (
                            <button
                              key={item.emoji}
                              type="button"
                              onClick={() => handleSendReaction(item.emoji)}
                              className="py-1.5 rounded-lg bg-[#111F38] hover:bg-purple-900/40 border border-[#263858] hover:border-purple-400 text-center transition-all cursor-pointer active:scale-90 flex flex-col items-center justify-center shadow-sm"
                              title={`Enviar ${item.label} a la pantalla`}
                            >
                              <span className="text-base leading-tight">{item.emoji}</span>
                            </button>
                          ))}
                        </div>

                        {tableAllowance?.autoPlayRequests && (
                          <button
                            type="button"
                            onClick={() => setIsPhotoModalOpen(true)}
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-950 transition-all cursor-pointer active:scale-95"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>📸 Compartir Foto en Pantalla (Auto-Play En Vivo)</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* PESTAÑA 4: CONCURSO DE KARAOKE EN VIVO */}
        {activeTab === "contest" && activeContestInfo && (
          <div className="space-y-4 animate-fadeIn">
            {/* Cabecera del Concurso */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-950/70 via-[#111F38] to-[#080F1F] border-2 border-amber-500/60 shadow-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <Trophy className="w-7 h-7 text-amber-400" />
                  </span>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                      CERTAMEN OFICIAL EN VIVO
                    </span>
                    <h2 className="text-xl font-black text-[#F8FAFC]">{activeContestInfo.name}</h2>
                  </div>
                </div>
                <div className="inline-block px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black self-start sm:self-auto">
                  {activeContestInfo.stageTitle}
                </div>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                ¡Bienvenido a la votación popular de la gala! Tu mesa y cada celular tienen derecho a calificar a los cantantes con estrellas. El veredicto del público incide directamente en el resultado final.
              </p>
            </div>

            {/* Tarjeta de Votación Activa */}
            {activeContestVote ? (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-950/80 via-[#111F38] to-[#0D1930] border-2 border-amber-400/80 shadow-[0_0_40px_rgba(245,158,11,0.3)] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                      🎤 ACTUACIÓN EN ESCENARIO
                    </span>
                    <span className="text-base font-black text-[#F8FAFC] block">
                      {activeContestVote.performance.stageName || activeContestVote.performance.participantName}
                    </span>
                    <span className="text-[10px] text-[#94A3B8]">
                      📱 Voto individual por cada celular de la mesa
                    </span>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-500 text-black font-black animate-pulse">
                    VOTACIÓN ABIERTA
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#080F1F]/90 border border-[#263858] space-y-0.5">
                  <div className="text-sm font-black text-amber-300">
                    {activeContestVote.performance.songTitle}
                  </div>
                  <div className="text-xs text-[#94A3B8] font-medium">
                    {activeContestVote.performance.artistName}
                  </div>
                </div>

                {!contestVoteSubmitted ? (
                  <div className="space-y-3">
                    <div className="text-center space-y-2">
                      <span className="text-xs font-bold text-[#F8FAFC] block">
                        ¿Qué puntaje le otorgas a esta presentación?
                      </span>
                      <div className="flex items-center justify-center gap-2 py-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setContestStars(star)}
                            className={`p-3 rounded-2xl transition-all cursor-pointer ${
                              contestStars >= star
                                ? "bg-amber-500 text-black scale-110 shadow-lg shadow-amber-500/40"
                                : "bg-[#0D1930] text-[#64748B] hover:text-[#94A3B8] border border-[#263858]"
                            }`}
                          >
                            <Star className="w-7 h-7 fill-current" />
                          </button>
                        ))}
                      </div>
                      <div className="text-xs font-black text-amber-400">
                        {contestStars === 5
                          ? "⭐⭐⭐⭐⭐ ¡IMPRESIONANTE!"
                          : contestStars === 4
                          ? "⭐⭐⭐⭐ ¡MUY BUENO!"
                          : contestStars === 3
                          ? "⭐⭐⭐ ¡BUEN INTENTO!"
                          : contestStars === 2
                          ? "⭐⭐ REGULAR"
                          : "⭐ PUEDE MEJORAR"}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setContestCheered(!contestCheered)}
                        className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          contestCheered
                            ? "bg-pink-600 border-pink-400 text-white shadow-md shadow-pink-600/30"
                            : "bg-[#0D1930] border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-pink-500/40"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${contestCheered ? "fill-white" : "text-pink-400"}`} />
                        <span>{contestCheered ? "¡Con Aplauso Extra!" : "+ Dar Barra y Ánimo"}</span>
                      </button>
                    </div>

                    {!session?.table?.id ? (
                      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-xs">
                          <Lock className="w-4 h-4 text-amber-400" />
                          <span>Presencia física requerida en el local</span>
                        </div>
                        <p className="text-[11px] text-[#94A3B8]">
                          Para garantizar que el concurso sea 100% justo, la votación está reservada a comensales presentes en las mesas. Escanea el código QR de tu mesa para votar.
                        </p>
                      </div>
                    ) : tableConsumption?.requireConsumption && tableConsumption?.status === "PENDING" ? (
                      <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-500/50 text-center space-y-2.5">
                        <div className="flex items-center justify-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wide">
                          <Lock className="w-4 h-4 text-amber-400 animate-bounce" />
                          <span>Voto Sujeto a Consumo Mínimo de Mesa</span>
                        </div>
                        <p className="text-xs text-[#F8FAFC] leading-relaxed">
                          La mesa <span className="text-amber-300 font-bold">{session.table.label}</span> está a la espera de validación de consumo por el personal del local.
                        </p>
                        <div className="text-[11px] text-[#94A3B8] bg-[#080F1F]/60 p-2.5 rounded-xl border border-[#263858]">
                          💡 Solicita a tu mozo o en caja confirmar el consumo de tu mesa para habilitar de inmediato el voto individual a todos los comensales presentes en tu mesa.
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchTableConsumption()}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#0D1930] hover:bg-[#111F38] border border-[#263858] text-[#F8FAFC] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Comprobar estado de consumo</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {tableConsumption?.status === "SUPER_VOTE" ? (
                          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border border-amber-400/50 flex items-center justify-between px-4 text-xs text-amber-300 font-black animate-pulse">
                            <span className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-yellow-300" />
                              🌟 ¡SÚPER VOTO ACTIVADO PARA TU MESA!
                            </span>
                            <span className="text-[10px] bg-amber-400 text-black px-2.5 py-0.5 rounded-full font-black">
                              PODER x2
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs px-1 text-[#94A3B8]">
                            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                              <CheckCircle2 className="w-4 h-4" /> Consumo verificado en {session.table.label}
                            </span>
                            <span className="text-[#64748B] font-mono">Poder 1.0x</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleSendContestPublicVote}
                          disabled={contestVoteLoading}
                          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                            tableConsumption?.status === "SUPER_VOTE"
                              ? "bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 text-black shadow-xl shadow-yellow-500/40 hover:scale-[1.01]"
                              : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-xl shadow-amber-500/30"
                          }`}
                        >
                          {contestVoteLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : tableConsumption?.status === "SUPER_VOTE" ? (
                            <Sparkles className="w-4 h-4 text-black" />
                          ) : (
                            <Trophy className="w-4 h-4 text-black" />
                          )}
                          <span>
                            {tableConsumption?.status === "SUPER_VOTE"
                              ? `Enviar Súper Voto x2 (${session.table.label})`
                              : `Enviar Mi Calificación (${session.table.label})`}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 text-center space-y-2">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-sm font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>¡Tu voto individual de {contestStars} estrellas fue sumado!</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      Tus acompañantes de mesa también pueden votar desde sus propios celulares.
                    </p>
                    <button
                      type="button"
                      onClick={() => setContestVoteSubmitted(false)}
                      className="mt-1 px-3 py-1.5 rounded-xl bg-[#0D1930] border border-[#263858] hover:border-amber-500/50 text-[11px] text-amber-400 hover:text-amber-300 font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>✏️ Modificar mi voto</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-[#111F38] border border-[#263858] text-center space-y-3">
                <Mic className="w-10 h-10 text-amber-400 mx-auto animate-pulse" />
                <h3 className="text-base font-bold text-[#F8FAFC]">Próximo cantante al escenario</h3>
                <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                  En cuanto el DJ o animador llame al siguiente concursante y abra la votación, podrás calificarlo aquí mismo con 1 a 5 estrellas.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Modal de Confirmación, Dedicatoria y Fast-Pass */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-[#111F38] border border-[#263858] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-slideUp shadow-2xl text-[#F8FAFC]">
            <div className="flex items-center justify-between border-b border-[#263858] pb-3">
              <div className="flex items-center gap-2">
                {activeMode === "DJ" ? (
                  <Headphones className="w-4 h-4 text-amber-400" />
                ) : (
                  <Mic className="w-4 h-4 text-cyan-400" />
                )}
                <h3 className="text-sm font-bold text-[#F8FAFC]">
                  {selectedSong
                    ? (activeMode === "DJ" ? "Pedir Canción para la Pista DJ" : "Pedir Canción para Cantar")
                    : (activeMode === "DJ" ? "Pedir Pista al DJ" : "Pedir Canción para Karaoke")}
                </h3>
              </div>
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#0D1930] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
                {formError}
              </div>
            )}

            {tableAllowance?.isLocked && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Cupo de mesa alcanzado ({tableAllowance.usedSlots}/{tableAllowance.maxSlots})</span>
                </div>
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  Tu mesa ya tiene su turno asignado. En cuanto terminen de cantar, se habilitará tu cupo para pedir otro tema automáticamente (&ldquo;Canta y Libera&rdquo;).
                </p>
              </div>
            )}

            {tableAllowance?.autoPlayRequests && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 shadow-sm ${
                  Boolean(currentPlaying)
                    ? "bg-red-950/60 border-red-500/50 text-red-200"
                    : "bg-emerald-950/60 border-emerald-500/50 text-emerald-200"
                }`}
              >
                {Boolean(currentPlaying) ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                    <div className="text-[11px] leading-relaxed">
                      <strong className="text-white font-black">🔴 Pista en Reproducción:</strong> Hay una canción sonando actualmente. Podrás darle al Play directamente en cuanto termine la pista actual. Por ahora puedes enviarla a la cola.
                    </div>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                    <div className="text-[11px] leading-relaxed">
                      <strong className="text-white font-black">⚡ ¡Bandeja Libre!:</strong> Puedes darle al Play ahora mismo para que tu canción suene de inmediato en la pista.
                    </div>
                  </>
                )}
              </div>
            )}

            {!session && (
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200 text-xs space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>¡Conéctate a tu mesa para pedir esta canción!</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Para que la cabina reciba tu canción y sepa a qué mesa llevar el show, vincula tu mesa con el código QR.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomModalOpen(false);
                    setDismissConnectScreen(false);
                    if (typeof window !== "undefined") {
                      try {
                        sessionStorage.removeItem("vidjs_guest_dismiss_connect");
                      } catch {}
                    }
                  }}
                  className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/30"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Conectar mi Mesa</span>
                </button>
              </div>
            )}

            {tableAllowance?.queuePaused && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Pedidos en pausa momentánea</span>
                </div>
                <p className="text-[11px] text-red-300/90 leading-relaxed">
                  La cabina ha pausado temporalmente los pedidos debido a alta concurrencia. Se reactivará en unos momentos.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-3">
              {selectedSong ? (
                <div className="p-3 rounded-xl bg-[#0D1930] border border-[#263858]">
                  <div className="text-xs font-bold text-[#F8FAFC]">{selectedSong.title}</div>
                  <div className="text-[11px] text-purple-300 mt-0.5">
                    {selectedSong.artist?.name || "Artista"}
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">
                      Nombre de la Canción *
                    </label>
                    <input
                      type="text"
                      required
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Ej: Persiana Americana"
                      className="w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">
                      Artista o Banda *
                    </label>
                    <input
                      type="text"
                      required
                      value={customArtist}
                      onChange={(e) => setCustomArtist(e.target.value)}
                      placeholder="Ej: Soda Stereo"
                      className="w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">
                  Tu Nombre o Apodo (Opcional)
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Ej: Carlos / Los del fondo"
                  className="w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Selector Fast-Pass VIP con Propina */}
              <div
                onClick={() => setIsFastPass(!isFastPass)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isFastPass
                    ? "bg-gradient-to-r from-amber-950/60 via-purple-950/60 to-[#0D1930] border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                    : "bg-[#0D1930] border-[#263858] hover:border-amber-500/40"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Star className={`w-4 h-4 ${isFastPass ? "text-amber-400 fill-amber-400 animate-pulse" : "text-[#64748B]"}`} />
                  <div>
                    <div className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
                      <span>Fast-Pass VIP (Propina DJ)</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-amber-400 text-black">
                        +$5.00
                      </span>
                    </div>
                    <div className="text-[10px] text-[#94A3B8]">
                      Insignia dorada en TV y prioridad de cabina
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isFastPass}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-amber-500 cursor-pointer pointer-events-none"
                />
              </div>

              {/* Tags de Celebración */}
              <div>
                <label className="block text-[11px] font-medium text-[#94A3B8] mb-1.5">
                  Dedicatoria o Celebración (Opcional)
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {CELEBRATION_TAGS.map((tag) => (
                    <button
                      key={tag.label}
                      type="button"
                      onClick={() => setNotes(tag.note)}
                      className="px-2 py-0.5 rounded text-[10px] bg-[#0D1930] border border-[#263858] hover:border-purple-500 text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer transition-colors"
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: ¡Para festejar el cumple de Laura en la mesa!"
                  className="w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {tableAllowance?.autoPlayRequests ? (
                <div className="space-y-2 pt-1">
                  {Boolean(currentPlaying) ? (
                    <div
                      className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-red-950/60 border border-red-700/60 text-red-300 shadow-inner flex items-center justify-center gap-2 select-none opacity-85 cursor-not-allowed"
                      title="Bandeja en reproducción. Espera a que termine la canción actual para darle al Play"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                      <span>🔴 Pista Ocupada (Espera que termine para dar Play)</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleSubmitRequest(e, true)}
                      disabled={!session || submitting || Boolean(tableAllowance?.isLocked) || Boolean(tableAllowance?.queuePaused)}
                      className="w-full py-2.5 px-4 text-xs font-black rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                    >
                      {!session ? (
                        <span>🔒 Conecta tu mesa para enviar</span>
                      ) : submitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Dando al Play...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>¡Darle al Play y Sonar Ahora!</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleSubmitRequest(e, false)}
                    disabled={!session || submitting || Boolean(tableAllowance?.isLocked) || Boolean(tableAllowance?.queuePaused)}
                    className="w-full py-2 px-3 text-[11px] font-bold rounded-xl bg-[#0D1930] hover:bg-[#111F38] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    <Clock className="w-3 h-3 text-[#64748B]" />
                    <span>Solo Enviar a la Cola (Esperar turno)</span>
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={!session || submitting || Boolean(tableAllowance?.isLocked) || Boolean(tableAllowance?.queuePaused)}
                  className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                    activeMode === "DJ"
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20"
                      : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/20"
                  }`}
                >
                  {!session ? (
                    <span>🔒 Conecta tu mesa para enviar</span>
                  ) : submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando {activeMode === "DJ" ? "al DJ..." : "al Karaoke..."}</span>
                    </>
                  ) : tableAllowance?.queuePaused ? (
                    <span>⏸ Pedidos Pausados {activeMode === "DJ" ? "por el DJ" : "en el Escenario"}</span>
                  ) : tableAllowance?.isLocked ? (
                    <span>🔒 Cupo Asignado &bull; {activeMode === "DJ" ? "Espera tu turno" : "Canta para Liberar"}</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {activeMode === "DJ"
                          ? "Confirmar y Enviar a Cabina DJ"
                          : "Confirmar y Subir al Karaoke"}
                      </span>
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal de Subida de Fotos al Muro de la TV */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-[#111F38] border border-[#263858] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-slideUp shadow-2xl text-[#F8FAFC]">
            <div className="flex items-center justify-between border-b border-[#263858] pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-[#F8FAFC]">Subir Foto al Muro de la TV</h3>
              </div>
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#0D1930] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {photoSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-[#F8FAFC]">¡Foto Enviada!</h4>
                <p className="text-xs text-[#94A3B8]">
                  {tableAllowance?.autoPlayRequests
                    ? "🎉 ¡Foto aprobada automáticamente y proyectándose en vivo en la pantalla grande!"
                    : "El DJ la proyectará en pantalla en unos momentos."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleUploadPhoto} className="space-y-3.5">
                {/* Alerta de Auto-Play en vivo */}
                {tableAllowance?.autoPlayRequests && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/70 to-teal-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2.5 shadow-sm">
                    <Zap className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>⚡ Modo Auto-Play Activo</span>
                        <span className="text-[9px] bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 px-1.5 py-0.2 rounded font-black">
                          PROYECCIÓN DIRECTA
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-300/90 mt-0.5 leading-relaxed">
                        ¡Tu foto se proyectará al instante en la pantalla grande de la TV sin esperas!
                      </p>
                    </div>
                  </div>
                )}
                {/* Alerta de error si falla la subida */}
                {photoError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{photoError}</span>
                  </div>
                )}

                {/* Inputs invisibles para Cámara Instantánea y Galería */}
                <input
                  ref={instantCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <input
                  ref={fileGalleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                {compressingPhoto ? (
                  <div className="py-10 text-center space-y-2.5 bg-[#0D1930] rounded-2xl border border-cyan-500/30">
                    <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                    <div className="text-xs font-bold text-[#F8FAFC]">Optimizando foto para la pantalla...</div>
                    <div className="text-[10px] text-[#94A3B8]">Ajustando calidad para transmisión instantánea</div>
                  </div>
                ) : photoPreview ? (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-[#263858] max-h-56 flex items-center justify-center bg-[#080F1F]">
                      <img src={photoPreview} alt="Preview" className="max-h-56 object-contain" />
                      {selectedFrame !== "NONE" && (
                        <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-sm text-xs font-bold text-white border border-white/20 flex items-center gap-1">
                          <span>{PHOTO_FRAMES.find((f) => f.id === selectedFrame)?.text}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setPhotoPreview(null)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-white cursor-pointer transition-colors"
                        title="Eliminar y elegir otra"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Selector de Marcos y Stickers Temáticos */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-[#94A3B8]">
                        Elige un Marco o Sticker para tu Foto:
                      </label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {PHOTO_FRAMES.map((frame) => (
                          <button
                            key={frame.id}
                            type="button"
                            onClick={() => setSelectedFrame(frame.id)}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              selectedFrame === frame.id
                                ? `${frame.border} bg-cyan-950/60 text-[#F8FAFC] shadow-md shadow-cyan-950/40`
                                : "border-[#263858] bg-[#0D1930] text-[#94A3B8] hover:text-[#F8FAFC]"
                            }`}
                          >
                            <span className="text-lg">{frame.icon}</span>
                            <span className="text-[9px] font-bold truncate w-full">{frame.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Opción 1: Sacar Foto Instantánea con Cámara */}
                    <button
                      type="button"
                      onClick={() => instantCameraInputRef.current?.click()}
                      className="p-5 rounded-2xl border-2 border-dashed border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/30 flex flex-col items-center justify-center gap-2.5 transition-all group cursor-pointer text-center"
                    >
                      <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-[#F8FAFC] block">📸 Sacar Foto Ahora</span>
                        <span className="text-[10px] text-[#94A3B8]">Abre la cámara del celular al instante</span>
                      </div>
                    </button>

                    {/* Opción 2: Subir de Archivos / Galería */}
                    <button
                      type="button"
                      onClick={() => fileGalleryInputRef.current?.click()}
                      className="p-5 rounded-2xl border-2 border-dashed border-purple-500/50 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-950/30 flex flex-col items-center justify-center gap-2.5 transition-all group cursor-pointer text-center"
                    >
                      <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-[#F8FAFC] block">📁 Elegir de Archivos</span>
                        <span className="text-[10px] text-[#94A3B8]">Selecciona fotos de tu galería</span>
                      </div>
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">
                    Mensaje o Saludo para la Pantalla (Opcional)
                  </label>
                  <input
                    type="text"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    placeholder="Ej: ¡Celebrando con los chicos de la Mesa 2!"
                    className="w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!photoPreview || uploadingPhoto || compressingPhoto}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shadow-lg shadow-cyan-600/20"
                >
                  {uploadingPhoto ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        {tableAllowance?.autoPlayRequests
                          ? "Proyectando en vivo en la pantalla..."
                          : "Enviando al proyector..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {tableAllowance?.autoPlayRequests
                          ? "📸 Proyectar en Vivo en la Pantalla"
                          : "Proyectar en Pantalla"}
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Gestión de Mesa & Cambio de Sector */}
      {isManageTableOpen && session && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111F38] border border-[#263858] rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative text-[#F8FAFC]">
            <button
              onClick={() => setIsManageTableOpen(false)}
              className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#F8FAFC] p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#F8FAFC]">Tu Mesa y Sector</h3>
                <p className="text-xs text-[#94A3B8]">
                  Actualmente en: <strong className="text-purple-300">{session.table.label}</strong>
                </p>
              </div>
            </div>

            {/* Badge del sector actual */}
            <div className="p-3 rounded-xl bg-[#0D1930] border border-[#263858] flex items-center justify-between">
              <div className="flex items-center gap-2">
                {session.table.zone === "KARAOKE" ? (
                  <>
                    <Mic className="w-4 h-4 text-pink-400" />
                    <div>
                      <div className="text-xs font-bold text-[#F8FAFC]">Sector Karaoke</div>
                      <div className="text-[10px] text-[#94A3B8]">Escenario y turnos para cantar</div>
                    </div>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4 text-indigo-400" />
                    <div>
                      <div className="text-xs font-bold text-[#F8FAFC]">Sector DJ / Pista</div>
                      <div className="text-[10px] text-[#94A3B8]">Música ambiente, baile y duelos</div>
                    </div>
                  </>
                )}
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#080F1F] text-[#94A3B8] border border-[#263858]">
                {session.table.zone}
              </span>
            </div>

            {/* Opciones */}
            <div className="space-y-2.5 pt-1">
              <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                Acciones disponibles:
              </div>

              {/* Opción 1: Cambiar de Mesa o Sector */}
              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 text-left space-y-2">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-xs font-bold text-[#F8FAFC]">
                    {session.table.zone === "KARAOKE"
                      ? "¿Te mudas al Sector DJ / Pista o a otra mesa?"
                      : "¿Te mudas al Sector Karaoke o a otra mesa?"}
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  {session.table.zone === "KARAOKE"
                    ? "Para mudarte al sector de baile o barra, apunta tu cámara al código QR de tu nueva mesa. Tu turno en el escenario se limpiará, tu mesa actual se liberará y tu app pasará a modo DJ sin perder tu nombre."
                    : "Para mudarte a cantar al karaoke, apunta tu cámara al código QR de tu mesa en el salón de karaoke. Tu mesa actual se liberará y tu app activará el catálogo de letras y turnos para el escenario sin perder tu nombre."}
                </p>

                {/* Acceso directo 1-clic según sector actual */}
                <div className="pt-1">
                  {session.table.zone === "KARAOKE" ? (
                    <a
                      href="/qr/qr_centro_m1"
                      className="block p-2 rounded-lg bg-[#0D1930] hover:bg-purple-950/40 border border-[#263858] hover:border-purple-600/50 text-[11px] font-semibold text-purple-300 transition-all text-center"
                    >
                      ⇄ Simular mudanza a Mesa 1 (Sector DJ / Pista)
                    </a>
                  ) : (
                    <a
                      href="/qr/qr_centro_m4"
                      className="block p-2 rounded-lg bg-[#0D1930] hover:bg-pink-950/40 border border-[#263858] hover:border-pink-600/50 text-[11px] font-semibold text-pink-300 transition-all text-center"
                    >
                      🎤 Simular mudanza a Mesa 4 (Sector Karaoke)
                    </a>
                  )}
                </div>

                <form onSubmit={handleJoinByCode} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Código de la noche (ej. RETRO-POP)"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    className="flex-1 px-2.5 py-1.5 bg-[#0D1930] border border-[#263858] rounded-lg text-[#F8FAFC] font-mono text-[11px] uppercase placeholder:text-[#64748B] focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md shadow-purple-600/30"
                  >
                    Mudarme
                  </button>
                </form>
              </div>

              {/* Opción 2: Finalizar Estadía y Salir */}
              <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/40 text-left space-y-2">
                <div className="flex items-center gap-2">
                  <LogOut className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-xs font-bold text-[#F8FAFC]">Finalizar Estadía y Salir</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  ¿Te retiras del local? Liberarás la mesa para que otros clientes puedan ocuparla y se cancelarán tus canciones pendientes en cola.
                </p>
                <button
                  onClick={handleLeaveTable}
                  disabled={leavingTable}
                  className="w-full py-2 px-3 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-rose-950"
                >
                  {leavingTable ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Liberando mesa...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Liberar {session.table.label} y Salir</span>
                    </>
                  )}
                </button>
              </div>

              {/* Opción 3: Acceso a Cabina DJ / Operador */}
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/50 text-left space-y-2">
                <div className="flex items-center gap-2">
                  <Disc3 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-xs font-bold text-[#F8FAFC]">¿Eres el DJ o Administrador?</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Si estás a cargo de la música o la animación de la noche, entra a la Cabina DJ con tus credenciales de operador.
                </p>
                <a
                  href="/dj"
                  className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-600/30"
                >
                  <Disc3 className="w-3.5 h-3.5" />
                  <span>Ingresar a la Cabina DJ / KJ</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer link to DJ / Staff Login */}
      <footer className="py-6 text-center border-t border-[#263858]/80 mt-8 mb-4">
        <a
          href="/dj"
          className="text-xs text-[#64748B] hover:text-purple-400 transition-colors inline-flex items-center gap-1.5 font-medium"
        >
          <Disc3 className="w-3.5 h-3.5 text-purple-400" />
          <span>¿Eres el DJ o Personal de la Cabina? Ingresar aquí &rarr;</span>
        </a>
      </footer>
    </div>
  );
}

export default function GuestPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-500">Cargando experiencia...</div>}>
      <GuestContent />
    </Suspense>
  );
}
