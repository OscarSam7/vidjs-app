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
  Award,
  Lock,
  SkipForward,
  Trash2,
  UtensilsCrossed,
  MapPin,
  Users,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { QsrModal } from "@/components/guest/QsrModal";
import { useRealtime } from "@/hooks/use-realtime";
import { RealtimeEventType, NextTurnCountdownPayload } from "@/lib/realtime/event-bus";
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
  table: { id: string; number: number; label: string; zone?: string; sector?: { id: string; name: string } | null };
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
  const eventParam = searchParams.get("event") || searchParams.get("code");

  const modeParam = searchParams.get("mode")?.toUpperCase();
  const [activeMode, setActiveMode] = useState<"DJ" | "KARAOKE">(() => {
    if (modeParam === "DJ" || modeParam === "KARAOKE") {
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("vidjs_guest_active_mode", modeParam);
        } catch {}
      }
      return modeParam as "DJ" | "KARAOKE";
    }
    if (eventParam && String(eventParam).toUpperCase().endsWith("-DJ")) {
      return "DJ";
    }
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("vidjs_guest_active_mode");
        if (saved === "DJ" || saved === "KARAOKE") return saved as "DJ" | "KARAOKE";
      } catch {}
    }
    return "DJ";
  });

  const userModeChoiceRef = useRef<"DJ" | "KARAOKE" | null>(null);

  // Sincronizar automáticamente en vivo con la modalidad activa del evento (incluso sin escanear)
  useEffect(() => {
    const checkLiveMode = async () => {
      try {
        const codeQuery = eventParam || venueParam || "";
        const res = await fetch(
          `/api/v1/guest/live-mode${codeQuery ? `?code=${encodeURIComponent(codeQuery)}` : ""}`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.nightMode === "DJ_ONLY" || (!modeParam && json.defaultClientMode === "DJ")) {
            setActiveMode("DJ");
            if (typeof window !== "undefined") {
              try {
                sessionStorage.setItem("vidjs_guest_active_mode", "DJ");
              } catch {}
            }
          } else if (json.nightMode === "KARAOKE_ONLY") {
            setActiveMode("KARAOKE");
            if (typeof window !== "undefined") {
              try {
                sessionStorage.setItem("vidjs_guest_active_mode", "KARAOKE");
              } catch {}
            }
          }
        }
      } catch {}
    };
    checkLiveMode();
  }, [eventParam, venueParam, modeParam]);

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
  const [activeTurnCountdown, setActiveTurnCountdown] = useState<NextTurnCountdownPayload | null>(null);
  const [turnSecondsRemaining, setTurnSecondsRemaining] = useState<number>(0);
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
    status: string; // "ACTIVE" | "REGISTRATION" | "PAUSED"
    allowRegistrations: boolean;
    description?: string | null;
    prizes?: string | null;
    rules?: string | null;
    stageTitle: string;
    stages?: Array<{
      id: string;
      title: string;
      stageType: string;
      date: string;
      status: string;
    }>;
    scoringMode: string;
    publicVoteWeight: number;
    registrationFee?: number;
    paymentInstructions?: string | null;
    allowRemoteRegistration?: boolean;
    scheduledDate?: string | null;
    myApplication?: {
      id: string;
      name: string;
      stageName?: string | null;
      status: string;
      songTitle?: string | null;
      artistName?: string | null;
      tableLabel?: string | null;
      paymentStatus?: string | null;
      paymentMethod?: string | null;
    } | null;
    activePerformance?: any;
  } | null>(null);

  // 📝 Formulario de Postulación de Clientes al Concurso
  const [applicationForm, setApplicationForm] = useState({
    name: "",
    stageName: "",
    songTitle: "",
    artistName: "",
    phone: "",
    bio: "",
    selectedStageId: "",
    paymentMethod: "TRANSFER",
    paymentReference: "",
    paymentProofUrl: "",
  });
  const [applicationSubmitting, setApplicationSubmitting] = useState(false);
  const [applicationFeedback, setApplicationFeedback] = useState<{
    type: "success" | "error";
    text: string;
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

  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const myRequestsRef = useRef(myRequests);
  useEffect(() => {
    myRequestsRef.current = myRequests;
  }, [myRequests]);

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
  const [isQsrModalOpen, setIsQsrModalOpen] = useState(false);
  const [leavingTable, setLeavingTable] = useState(false);
  const [switchBanner, setSwitchBanner] = useState<string | null>(null);

  // Mesas unificadas disponibles en el local
  const [publicTables, setPublicTables] = useState<
    Array<{
      id: string;
      number: number;
      label: string;
      capacity: number;
      zone: string;
      qrToken: string;
      tableStatus: string;
      isAvailable: boolean;
      sectorId: string | null;
      sectorName: string;
      sectorColor: string;
    }>
  >([]);
  const [publicSectors, setPublicSectors] = useState<Array<{ id: string; name: string; colorHex: string }>>([]);
  const [selectedTableSector, setSelectedTableSector] = useState<string>("ALL");
  const [loadingPublicTables, setLoadingPublicTables] = useState(false);

  const loadPublicTables = async () => {
    setLoadingPublicTables(true);
    try {
      const qs = new URLSearchParams();
      if (eventParam) qs.set("code", eventParam);
      if (venueParam) qs.set("slug", venueParam);
      const res = await fetch(`/api/v1/gastronomy/public/tables?${qs.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setPublicTables(json.tables || []);
        setPublicSectors(json.sectors || []);
      }
    } catch {
      // Silencioso
    } finally {
      setLoadingPublicTables(false);
    }
  };

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

  // Temporizador para cuenta regresiva de turno (5 segundos para dar Play)
  useEffect(() => {
    if (!activeTurnCountdown) {
      setTurnSecondsRemaining(0);
      return;
    }
    const updateCountdown = () => {
      const rem = Math.max(0, Math.ceil((activeTurnCountdown.expiresAt - Date.now()) / 1000));
      setTurnSecondsRemaining(rem);
      if (rem <= 0) {
        setTimeout(() => {
          setActiveTurnCountdown((curr) =>
            curr?.queueEntryId === activeTurnCountdown.queueEntryId ? null : curr
          );
        }, 2000);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 250);
    return () => clearInterval(interval);
  }, [activeTurnCountdown]);

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

  // 🏆 Cargar certamen activo públicamente (para comensales en mesa o remotos)
  const fetchPublicActiveContest = async () => {
    try {
      const codeQuery =
        eventParam ||
        venueParam ||
        sessionRef.current?.event?.code ||
        session?.event?.code ||
        "";
      const url = codeQuery
        ? `/api/v1/contest/active?code=${encodeURIComponent(codeQuery)}`
        : `/api/v1/contest/active`;
      const contestRes = await fetch(url);
      if (contestRes.ok) {
        const cJson = await contestRes.json();
        if (cJson.data) {
          setActiveContestInfo(cJson.data);
          if (cJson.data.activePerformance) {
            setActiveContestVote({
              contestId: cJson.data.id,
              performance: cJson.data.activePerformance,
            });
          }
        } else {
          setActiveContestInfo(null);
          setActiveContestVote(null);
        }
      }
    } catch {
      // Silencioso
    }
  };

  // Cargar sesión inicial o actualizar en segundo plano sin interrumpir al usuario
  const loadSessionAndRequests = async (silent: boolean = false) => {
    try {
      if (!silent && !session && !sessionRef.current) {
        setLoadingSession(true);
      }
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

          // En todas las mesas y sectores funcionan ambas modalidades.
          // Si el DJ configuró la noche en DJ_ONLY o KARAOKE_ONLY, sincronizar automáticamente:
          if (nightMode === "DJ_ONLY" || modeParam === "DJ") {
            setActiveMode("DJ");
            if (typeof window !== "undefined") {
              try {
                sessionStorage.setItem("vidjs_guest_active_mode", "DJ");
              } catch {}
            }
          } else if (nightMode === "KARAOKE_ONLY" || modeParam === "KARAOKE") {
            setActiveMode("KARAOKE");
            if (typeof window !== "undefined") {
              try {
                sessionStorage.setItem("vidjs_guest_active_mode", "KARAOKE");
              } catch {}
            }
          } else {
            // Si es HÍBRIDO, ambas modalidades están disponibles en todas las mesas.
            // Si el cliente no ha forzado karaoke y la noche o zona está en DJ, activar DJ por defecto:
            if (!userModeChoiceRef.current && (tableZone === "DJ" || modeParam === "DJ")) {
              setActiveMode("DJ");
            }
          }
        }
        if (data.data.session?.guestName) {
          setGuestName((prev) => prev || data.data.session.guestName);
          setApplicationForm((prev) => ({
            ...prev,
            name: prev.name || data.data.session.guestName,
          }));
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
          } else {
            setActiveContestVote(null);
          }
        } else {
          // Si requests no trajo certamen para el evento estricto, consultar certamen del establecimiento
          await fetchPublicActiveContest();
        }
      } else {
        setSession(null);
        // Si no hay sesión activa, cargar branding público y certamen público
        try {
          const codeQuery = eventParam || venueParam || "";
          const [brandRes] = await Promise.all([
            fetch(`/api/v1/branding?code=${encodeURIComponent(codeQuery || "RETRO-POP")}`),
            fetchPublicActiveContest(),
          ]);
          if (brandRes && brandRes.ok) {
            const bJson = await brandRes.json();
            if (bJson.data?.resolved) {
              setBranding(bJson.data.resolved);
            }
          }
        } catch {}
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
    fetchPublicActiveContest();
    loadPublicTables();
  }, []);

  useEffect(() => {
    if (isManageTableOpen || !session) {
      loadPublicTables();
    }
  }, [isManageTableOpen, session]);

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
    eventId: session?.event?.id || "global",
    code: session?.event?.code || (eventParam as string) || undefined,
    onEvent: async (type: RealtimeEventType, payload: any) => {
      if (type === "BRANDING_UPDATED") {
        if (payload) {
          setBranding((prev) => ({ ...(prev || {}), ...payload }));
        }
      } else if (type === "DUEL_UPDATE") {
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
        // Desbloqueo en tiempo real: avisar al comensal ÚNICAMENTE si es su propia mesa
        const currentTableId = sessionRef.current?.table?.id || session?.table?.id;
        if (payload?.tableId && currentTableId && payload.tableId === currentTableId) {
          await loadSessionAndRequests(true);
          setSuccessMessage(
            `🎉 ¡Tu mesa completó su turno! Cupo desbloqueado para pedir tu siguiente canción.`
          );
          setTimeout(() => setSuccessMessage(null), 7000);
        }
      } else if (type === "NEXT_TURN_COUNTDOWN") {
        // Mostrar la cuenta regresiva SOLO a los dispositivos de la mesa a la que le corresponde el turno
        const currentTableId = sessionRef.current?.table?.id || session?.table?.id;
        if (!payload?.tableId || (currentTableId && payload.tableId === currentTableId)) {
          setActiveTurnCountdown(payload);
        }
      } else if (type === "NEXT_TURN_CANCELLED") {
        setActiveTurnCountdown(null);
      } else if (type === "QUEUE_POLICY_UPDATED") {
        const newNightMode = payload?.policy?.nightMode;
        const newZone = payload?.policy?.zone;
        if (newNightMode === "DJ_ONLY" || newZone === "DJ") {
          setActiveMode("DJ");
          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem("vidjs_guest_active_mode", "DJ");
            } catch {}
          }
        } else if (newNightMode === "KARAOKE_ONLY" || newZone === "KARAOKE") {
          setActiveMode("KARAOKE");
          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem("vidjs_guest_active_mode", "KARAOKE");
            } catch {}
          }
        }
        await loadSessionAndRequests(true);
      } else if (
        type === "TABLE_RELEASED" ||
        type.startsWith("GASTRO_TABLE_") ||
        type === "GASTRO_ORDER_UPDATED"
      ) {
        await loadPublicTables();
      } else if (type === "TRACK_CHANGE" || type === "QUEUE_UPDATE") {
        // Si es QUEUE_UPDATE con acción ACCEPT de otra canción/mesa, no molestar a los demás comensales
        if (type === "QUEUE_UPDATE" && payload?.action === "ACCEPT") {
          const myRequestIds = myRequestsRef.current?.map((r) => r.id) || [];
          if (payload?.requestId && !myRequestIds.includes(payload.requestId)) {
            return;
          }
        }
        // Actualizar datos en segundo plano sin interrumpir lo que el cliente escribe o busca
        try {
          const res = await fetch("/api/v1/requests");
          if (res.ok) {
            const data = await res.json();
            setMyRequests(data.data.requests);
            setCurrentPlaying(data.data.currentPlaying || null);
            if (data.data.flashDeal) setFlashDeal(data.data.flashDeal);
            if (data.data.branding) setBranding(data.data.branding);
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

        if (type === "CONTEST_STAGE_CHANGE") {
          if (payload?.status === "DELETED") {
            setActiveContestInfo(null);
            setActiveContestVote(null);
          } else {
            await Promise.all([
              loadSessionAndRequests(true),
              fetchPublicActiveContest(),
            ]);
          }
          return;
        }

        if (payload?.contestName || payload?.stageTitle) {
          setActiveContestInfo((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              id: payload.contestId || prev.id,
              name: payload.contestName || prev.name,
              code: payload.contestCode || prev.code,
              stageTitle: payload.stageTitle || prev.stageTitle,
            };
          });
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

  // 📝 Postularse como cantante al concurso (Presencial en Mesa o Remoto/Online)
  const handleRegisterContestApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContestInfo) return;
    const isRemote = !session?.table?.label;
    const finalName = applicationForm.name.trim() || guestName.trim() || session?.guestName || "";
    if (!finalName || !applicationForm.songTitle.trim()) {
      setApplicationFeedback({
        type: "error",
        text: "Por favor ingresa tu nombre y el título de la canción que deseas cantar.",
      });
      return;
    }

    if (isRemote && !applicationForm.phone.trim()) {
      setApplicationFeedback({
        type: "error",
        text: "Para participación remota o previa, por favor ingresa tu teléfono o WhatsApp de contacto.",
      });
      return;
    }

    const regFee = activeContestInfo.registrationFee || 0;
    const selectedMethod = regFee === 0 ? "FREE" : applicationForm.paymentMethod;

    try {
      setApplicationSubmitting(true);
      setApplicationFeedback(null);
      const res = await fetch(`/api/v1/contest/${activeContestInfo.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          stageName: applicationForm.stageName.trim() || null,
          songTitle: applicationForm.songTitle.trim(),
          artistName: applicationForm.artistName.trim() || null,
          phone: applicationForm.phone.trim() || null,
          bio: applicationForm.bio.trim() || null,
          isRemote,
          selectedStageId: applicationForm.selectedStageId || undefined,
          paymentMethod: selectedMethod,
          paymentReference: applicationForm.paymentReference.trim() || null,
          paymentProofUrl: applicationForm.paymentProofUrl.trim() || null,
          paymentAmount: regFee,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setApplicationFeedback({
          type: "success",
          text: json.message || "¡Postulación enviada con éxito!",
        });
        setActiveContestInfo((prev) =>
          prev
            ? {
                ...prev,
                myApplication: {
                  id: json.data?.participant?.id || "p_app",
                  name: finalName,
                  stageName: applicationForm.stageName.trim() || null,
                  status: "APPLICANT",
                  songTitle: applicationForm.songTitle.trim(),
                  artistName: applicationForm.artistName.trim() || null,
                  tableLabel: isRemote ? null : session?.table?.label,
                  paymentStatus: json.data?.participant?.paymentStatus || (regFee === 0 ? "PAID" : "PENDING"),
                  paymentMethod: selectedMethod,
                },
              }
            : null
        );
      } else {
        setApplicationFeedback({
          type: "error",
          text: json.error || "No se pudo registrar la postulación",
        });
      }
    } catch {
      setApplicationFeedback({
        type: "error",
        text: "Error de conexión al enviar la postulación",
      });
    } finally {
      setApplicationSubmitting(false);
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

      await loadSessionAndRequests(true);
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
        await loadSessionAndRequests(true);
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
        await loadSessionAndRequests(true);
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

  const handleCancelRequest = async (requestId: string, status?: string) => {
    let confirmMsg = "¿Deseas cancelar esta solicitud de canción?";
    if (status === "ACCEPTED") {
      confirmMsg = "¿Deseas cancelar tu turno y quitar tu canción de la cola? Se liberará el cupo de tu mesa de inmediato.";
    } else if (status === "PLAYING") {
      confirmMsg = "¿Deseas cancelar este turno al aire? Si el video de YouTube o enlace falló, esto liberará tu mesa y pasará automáticamente al siguiente turno.";
    }

    if (!confirm(confirmMsg)) return;

    setActionLoadingId(requestId);
    try {
      const res = await fetch(`/api/v1/requests/${requestId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message || "Turno cancelado exitosamente");
        setTimeout(() => setSuccessMessage(null), 4000);
        await loadSessionAndRequests(true);
      } else {
        alert(data.error?.message || "No se pudo cancelar");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setActionLoadingId(null);
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
        <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/30 text-purple-400 flex items-center justify-center glow-purple">
          <Disc3 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white">Cargando experiencia...</h3>
          <p className="text-xs text-zinc-500">Conectando con el salón</p>
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
            title="Volver a eventos"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>Volver</span>
          </button>
        </div>
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Evento No Iniciado</h2>
        <p className="text-sm text-zinc-400">
          En este momento no hay un show o sesión activa en <strong className="text-white">{venueParam || "este local"}</strong> ({tableParam || "tu mesa"}).
        </p>
        <p className="text-xs text-zinc-500">
          ¡El evento comenzará en breve! Vuelve a escanear tu código QR en unos minutos.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGoBack}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
            title="Volver a eventos"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-red-400" />
            <span>Volver</span>
          </button>
        </div>
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Mesa no encontrada</h2>
        <p className="text-sm text-zinc-400">
          El código QR escaneado no coincide con ninguna mesa registrada en el sistema.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGoBack}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <ArrowLeft className="w-4 h-4 text-red-400" />
            <span>Volver al menú</span>
          </button>
        </div>
      </div>
    );
  }

  if (!loadingSession && !session && !dismissConnectScreen) {
    const filteredTables = publicTables.filter(
      (t) => selectedTableSector === "ALL" || t.sectorId === selectedTableSector || t.sectorName === selectedTableSector
    );
    const availableCount = filteredTables.filter((t) => t.isAvailable).length;

    return (
      <div className="p-5 text-center my-auto space-y-5 max-w-md mx-auto w-full">
        {/* Barra superior con botón Volver */}
        <div className="w-full flex items-center justify-start">
          <button
            type="button"
            onClick={handleReturnToClient}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
            title="Volver a la pantalla principal del cliente"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
            <span>Volver</span>
          </button>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-500/30 text-purple-400 mx-auto flex items-center justify-center glow-purple">
          <QrCode className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">¡Conéctate a tu Mesa!</h2>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
            Selecciona tu mesa disponible directamente aquí, escanea el QR físico o ingresa el código de la TV.
          </p>
        </div>

        {/* 🏆 Tarjeta destacada de Concurso de Karaoke para Participación Presencial o Remota */}
        {activeContestInfo && (
          <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-950/80 via-zinc-950 to-zinc-950 border-2 border-amber-500/70 text-left shadow-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Trophy className="w-4 h-4 text-amber-400" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  {activeContestInfo.status === "REGISTRATION" ? "¡Inscripciones Abiertas!" : "¡Certamen de Karaoke en Vivo!"}
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {activeContestInfo.stageTitle}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-black text-white">{activeContestInfo.name}</h3>
              <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                {activeContestInfo.description || "Compite en el escenario o participa votando por tus cantantes favoritos."}
              </p>
              {activeContestInfo.registrationFee && activeContestInfo.registrationFee > 0 ? (
                <div className="mt-1.5 inline-block text-[11px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/30">
                  💰 Inscripción: ${activeContestInfo.registrationFee.toLocaleString()}
                </div>
              ) : (
                <div className="mt-1.5 inline-block text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                  🆓 Inscripción Gratuita
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setDismissConnectScreen(true);
                setActiveTab("contest");
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
            >
              <Mic className="w-4 h-4" />
              <span>Ver Certamen e Inscribirme Ahora</span>
            </button>
          </div>
        )}

        {/* Selector en vivo de Mesas Unificadas Disponibles */}
        <div className="pt-2 border-t border-zinc-800/80 text-left space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Mesas Disponibles ({availableCount})</span>
            </span>
            <button
              type="button"
              onClick={loadPublicTables}
              className="text-[11px] text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loadingPublicTables ? "animate-spin" : ""}`} />
              <span>Actualizar</span>
            </button>
          </div>

          {publicSectors.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedTableSector("ALL")}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 border transition-all cursor-pointer ${
                  selectedTableSector === "ALL"
                    ? "bg-purple-600 text-white border-purple-500"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                }`}
              >
                Todos ({publicTables.length})
              </button>
              {publicSectors.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedTableSector(sec.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 border transition-all cursor-pointer ${
                    selectedTableSector === sec.id
                      ? "bg-purple-600 text-white border-purple-500"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                  }`}
                >
                  {sec.name}
                </button>
              ))}
            </div>
          )}

          {loadingPublicTables && publicTables.length === 0 ? (
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center text-xs text-zinc-400">
              Cargando mesas disponibles...
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center text-xs text-zinc-400">
              No hay mesas activas registradas en este sector.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-0.5">
              {[...filteredTables]
                .sort((a, b) => (a.isAvailable === b.isAvailable ? a.number - b.number : a.isAvailable ? -1 : 1))
                .map((tbl) => (
                  <a
                    key={tbl.id}
                    href={`/qr/${tbl.qrToken}`}
                    className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between text-left ${
                      tbl.isAvailable
                        ? "bg-zinc-900/90 hover:bg-purple-950/40 border-emerald-500/40 hover:border-purple-400"
                        : "bg-zinc-950/70 hover:bg-zinc-900 border-zinc-800/80 opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono font-bold text-purple-300 px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                        #{tbl.number}
                      </span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                          tbl.isAvailable
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {tbl.isAvailable ? "Disponible" : "Ocupada"}
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs font-bold text-white truncate">{tbl.label}</div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                        <span className="truncate">{tbl.sectorName}</span>
                      </span>
                      <span className="inline-flex items-center gap-0.5 shrink-0 text-zinc-500">
                        <Users className="w-2.5 h-2.5" />
                        {tbl.capacity}p
                      </span>
                    </div>
                  </a>
                ))}
            </div>
          )}
        </div>

        {/* Input de Código de Evento */}
        <form onSubmit={handleJoinByCode} className="space-y-2 text-left bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
          <label className="text-[11px] font-bold text-zinc-300 block">
            ¿Prefieres ingresar por Código de Pantalla TV?
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: RETRO-POP"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono text-xs uppercase placeholder:text-zinc-600 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer"
            >
              Conectar
            </button>
          </div>
        </form>

        {/* Botón inferior para volver a la pantalla principal */}
        <div className="pt-2 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={handleReturnToClient}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
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
          color: "bg-zinc-800 text-zinc-400 border-zinc-700",
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
          color: "bg-zinc-900 text-zinc-500 border-zinc-800",
          icon: X,
        };
      default:
        return {
          label: status,
          detail: "",
          color: "bg-zinc-800 text-zinc-300 border-zinc-700",
          icon: Clock,
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full overflow-x-hidden">
      {/* ⏱️ Alerta de Turno Siguiente: 5 Segundos para Darle al Play */}
      {activeTurnCountdown && (session?.table?.id === activeTurnCountdown.tableId || myRequests.some((r) => r.id === activeTurnCountdown.songRequestId)) && (
        <div className="fixed top-4 inset-x-3 sm:max-w-md sm:mx-auto z-50 animate-bounce-short">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-zinc-950 to-emerald-950 border-2 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.7)] backdrop-blur-md text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  🎤 ¡ES TU TURNO AL ESCENARIO!
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center font-mono font-black text-sm text-emerald-300 shadow-md">
                {turnSecondsRemaining}s
              </div>
            </div>

            <div>
              <p className="text-base font-black text-white leading-tight">
                {activeTurnCountdown.songTitle}
              </p>
              {activeTurnCountdown.artist && (
                <p className="text-xs text-zinc-300 font-semibold">{activeTurnCountdown.artist}</p>
              )}
            </div>

            {/* Botón de Play Gigante */}
            <button
              type="button"
              onClick={() => handlePlayRequest(activeTurnCountdown.songRequestId)}
              disabled={actionLoadingId === activeTurnCountdown.songRequestId}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/40 cursor-pointer active:scale-95 transition-all"
            >
              {actionLoadingId === activeTurnCountdown.songRequestId ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )}
              <span>▶ ¡DARLE AL PLAY AHORA! ({turnSecondsRemaining}s)</span>
            </button>

            <p className="text-[11px] text-zinc-300 text-center font-bold">
              {activeTurnCountdown.timeoutAction === "SKIP"
                ? "⚠️ Tienes 5 segundos para darle al Play o tu turno pasará al siguiente de la cola."
                : "🚀 Tienes 5 segundos para darle al Play o la cabina iniciará la reproducción automáticamente."}
            </p>

            <div className="flex items-center justify-center pt-0.5">
              <button
                type="button"
                onClick={() => handleCancelRequest(activeTurnCountdown.songRequestId, "ACCEPTED")}
                disabled={actionLoadingId === activeTurnCountdown.songRequestId}
                className="text-[11px] text-zinc-400 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-red-950/40"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
                <span>Cancelar mi turno y ceder lugar</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 1. Header Nocturno de Mesa */}
      <header className="p-3 sm:p-4 bg-zinc-900/95 border-b border-zinc-800 sticky top-0 z-20 backdrop-blur-md w-full">
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Brand & Evento */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {branding?.logoUrl ? (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
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
              <div className="text-xs font-black text-white tracking-wide uppercase truncate">
                {branding?.welcomeTitle || session?.tenant.name}
              </div>
              <div className="text-[10px] sm:text-[11px] text-zinc-400 truncate max-w-[130px] sm:max-w-[200px]">
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
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-zinc-800/80 hover:bg-purple-950/60 text-zinc-400 hover:text-purple-300 border border-zinc-700/60 hover:border-purple-500/50 text-xs flex items-center gap-1 transition-colors shrink-0"
              title="Acceso para el DJ o Personal de la Cabina"
            >
              <Disc3 className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline font-bold text-[11px]">DJ</span>
            </a>

            <button
              onClick={() => setIsPhotoModalOpen(true)}
              className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-purple-300 border border-purple-500/30 text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              title="Subir foto a la pantalla"
            >
              <Camera className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline font-bold text-[11px]">Foto</span>
            </button>

            {/* Buzón QSR VIP Confidencial (Línea Directa Gerencia & Dueño) */}
            <button
              onClick={() => setIsQsrModalOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-sm"
              title="Línea Directa y Confidencial con la Gerencia & Dueño (Quejas, Sugerencias y Reclamos)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline font-bold text-[11px]">Buzón QSR</span>
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
                className="px-2.5 sm:px-3 py-1 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
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
          <div className="mt-3 px-3 py-2 rounded-xl bg-purple-950/70 border border-purple-500/60 flex items-center justify-between text-xs text-purple-200 shadow-lg animate-fade-in">
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
          <div className="mt-3 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Wifi className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div className="truncate">
                <span className="text-zinc-400">Wi-Fi: </span>
                <span className="font-bold text-white">{branding.wifiSsid}</span>
                {branding.wifiPassword && (
                  <span className="text-zinc-400 ml-1.5 font-mono">
                    ({branding.wifiPassword})
                  </span>
                )}
              </div>
            </div>
            {branding.wifiPassword && (
              <button
                onClick={copyWifiPassword}
                className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
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
                : "bg-purple-950/60 text-purple-200 border-purple-800/80"
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
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/40 border border-white/10 font-mono font-bold">
                    {tableAllowance.zone === "DJ"
                      ? "🎧 Pista DJ"
                      : tableAllowance.zone === "KARAOKE"
                      ? "🎤 Escenario Karaoke"
                      : "🔀 Modo Híbrido"}
                  </span>
                  {tableAllowance.autoPlayRequests && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/60 font-mono font-bold">
                      ⚡ Auto-Play Directo
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-zinc-300 opacity-90 truncate">
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

      {/* 2. Navegación Principal: SOLO "Mi Noche" y "Menú" uno al lado del otro con iconos grandes y llamativos */}
      <div className="grid grid-cols-2 gap-2.5 px-3.5 py-2.5 border-b border-zinc-800/90 bg-zinc-950/95 backdrop-blur-md sticky top-[65px] z-10 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab("hub")}
          className="relative group py-3 px-3.5 rounded-2xl border-2 border-purple-500/80 bg-gradient-to-br from-purple-950/90 via-indigo-950/70 to-zinc-950 text-white shadow-[0_0_22px_rgba(168,85,247,0.3)] hover:border-purple-400 transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-[0.98]"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/40 shrink-0 group-hover:scale-105 transition-transform">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div className="text-left min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                Mi Noche
              </span>
              {myRequests.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-500 text-white font-black shadow-sm">
                  {myRequests.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-purple-300/90 block truncate">
              Catálogo y Mis Pedidos
            </span>
          </div>
        </button>

        <a
          href={`/menu?tableId=${encodeURIComponent(session?.table?.id || "")}&table=${encodeURIComponent(session?.table?.label || `Mesa ${session?.table?.number || 1}`)}&sector=${encodeURIComponent(session?.table?.sector?.name || "Salón principal")}`}
          className="relative group py-3 px-3.5 rounded-2xl border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-950/90 via-teal-950/70 to-zinc-950 text-white shadow-[0_0_22px_rgba(16,185,129,0.28)] hover:border-emerald-400 hover:shadow-[0_0_28px_rgba(16,185,129,0.45)] transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-[0.98]"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/40 shrink-0 group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="w-6 h-6 text-zinc-950 stroke-[2.5]" />
          </div>
          <div className="text-left min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-sm sm:text-base font-black tracking-tight text-emerald-300 group-hover:text-emerald-200 truncate">
                Menú
              </span>
              <span className="text-sm leading-none">🍹🍔</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400/90 block truncate">
              Pedir Tragos y Comida
            </span>
          </div>
        </a>
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

      {/* 3. Contenido Principal de "Mi Noche" */}
      <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto w-full overflow-x-hidden space-y-4">
        {/* Sub-navegación interna dentro de "Mi Noche": Inicio, Catálogo y Mis Pedidos */}
        <div className="p-1.5 rounded-2xl bg-zinc-900/95 border border-zinc-800 flex items-center gap-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab("hub")}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "hub"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/50"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Inicio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "catalog"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/50"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Music className="w-3.5 h-3.5 shrink-0" />
            <span>Catálogo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("my-requests")}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "my-requests"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/50"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Mis Pedidos</span>
            {myRequests.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === "my-requests"
                    ? "bg-white text-purple-700"
                    : "bg-purple-600 text-white"
                }`}
              >
                {myRequests.length}
              </span>
            )}
          </button>

          {activeContestInfo && (
            <button
              type="button"
              onClick={() => setActiveTab("contest")}
              className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "contest"
                  ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md shadow-amber-900/50"
                  : "text-amber-400 hover:text-amber-200 hover:bg-amber-950/30"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span>Concurso</span>
              {activeContestVote && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          )}
        </div>

        {/* 🏆 Banner destacado de Concurso en Vivo o Inscripciones Abiertas */}
        {activeContestInfo && activeTab !== "contest" && (
          <div
            onClick={() => setActiveTab("contest")}
            className="w-full p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/90 via-zinc-950 to-amber-950/90 border-2 border-amber-500/70 flex items-center justify-between gap-3 cursor-pointer shadow-xl hover:border-amber-400 transition-all active:scale-[0.99] animate-pulse text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-xl bg-amber-500 text-black font-black shrink-0">
                <Trophy className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                  {activeContestInfo.status === "REGISTRATION"
                    ? "¡Inscripciones Abiertas!"
                    : "¡Certamen de Karaoke en Vivo!"}
                </span>
                <span className="text-xs font-black text-white truncate block">
                  {activeContestInfo.name}
                </span>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-black shrink-0 shadow-md">
              {activeContestInfo.status === "REGISTRATION" ? "Postularme" : "Ver / Votar"}
            </span>
          </div>
        )}

        {/* PESTAÑA 1: "MI NOCHE" (WELCOME HUB) */}
        {activeTab === "hub" && (
          <div className="space-y-4 w-full">
            {/* 🏆 Concurso Oficial de Karaoke Activo o en Registro esta Noche */}
            {activeContestInfo && (
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-950/80 via-zinc-950 to-zinc-950 border-2 border-amber-500/60 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Trophy className="w-5 h-5 text-amber-400" />
                    </span>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                        {activeContestInfo.status === "REGISTRATION"
                          ? "CERTAMEN OFICIAL • INSCRIPCIONES ABIERTAS"
                          : "CERTAMEN OFICIAL • EN CURSO ESTA NOCHE"}
                      </span>
                      <h2 className="text-base font-black text-white">{activeContestInfo.name}</h2>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    {activeContestInfo.stageTitle}
                  </span>
                </div>

                {activeContestInfo.status === "REGISTRATION" ? (
                  <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-zinc-300">
                      <p className="font-bold text-amber-300">¿Quieres subir al escenario y ganar premios?</p>
                      <p className="text-[11px] text-zinc-400">
                        {activeContestInfo.myApplication
                          ? `✅ Tu mesa ya tiene a "${activeContestInfo.myApplication.stageName || activeContestInfo.myApplication.name}" postulado.`
                          : "Las postulaciones están abiertas para los clientes de las mesas."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("contest")}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs transition-all cursor-pointer shadow-md shrink-0 flex items-center justify-center gap-1.5"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{activeContestInfo.myApplication ? "Ver mi Postulación" : "¡Postularme Ahora!"}</span>
                    </button>
                  </div>
                ) : !activeContestVote ? (
                  <div className="p-3 rounded-2xl bg-black/60 border border-zinc-800 flex items-center justify-between gap-2 text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        ¡Atención a tu mesa! Podrás calificar con estrellas a los cantantes en escenario desde aquí.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("contest")}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold shrink-0 transition-all cursor-pointer"
                    >
                      Ver Concurso
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {/* Banner de Portada del Local */}
            {branding?.bannerUrl && (
              <div className="w-full h-28 sm:h-36 rounded-2xl overflow-hidden border border-zinc-800 relative shadow-lg bg-zinc-900">
                <img
                  src={branding.bannerUrl}
                  alt="Portada del Local"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* 👏 Aplausómetro en Vivo para Comensales */}
            {activeApplause && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/90 via-zinc-950 to-orange-950/90 border-2 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)] space-y-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👏</span>
                    <div>
                      <span className="text-xs font-black uppercase text-amber-300 tracking-wider block">
                        ¡Aplausómetro al Aire en Pantalla!
                      </span>
                      <p className="text-[11px] text-zinc-300">
                        Califica a: <strong>{activeApplause.targetTableLabel}</strong>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-amber-400 bg-black/60 px-2.5 py-1 rounded-xl border border-amber-500/40">
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
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-950/90 via-zinc-950 to-purple-950/90 border-2 border-amber-500/80 shadow-[0_0_35px_rgba(245,158,11,0.35)] space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Trophy className="w-5 h-5 text-amber-400" />
                    </span>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                        GALA OFICIAL &bull; VOTACIÓN DEL PÚBLICO
                      </span>
                      <span className="text-sm font-black text-white block">
                        {activeContestVote.performance.stageName || activeContestVote.performance.participantName}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        📱 Voto individual &bull; Cada celular de la mesa vota por separado
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black animate-pulse">
                    EN ESCENARIO
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-black/60 border border-zinc-800 space-y-0.5">
                  <div className="text-sm font-black text-amber-300">
                    {activeContestVote.performance.songTitle}
                  </div>
                  <div className="text-xs text-zinc-400 font-medium">
                    {activeContestVote.performance.artistName}
                  </div>
                </div>

                {!contestVoteSubmitted ? (
                  <div className="space-y-3">
                    <div className="text-center space-y-2">
                      <span className="text-xs font-bold text-zinc-300 block">
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
                                : "bg-zinc-900 text-zinc-600 hover:text-zinc-400"
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
                            : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500"
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
                        <p className="text-[11px] text-zinc-300">
                          Para garantizar que el concurso sea 100% justo, debes escanear el código QR de tu mesa para votar.
                        </p>
                      </div>
                    ) : tableConsumption?.requireConsumption && tableConsumption?.status === "PENDING" ? (
                      <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/60 text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wide">
                          <Lock className="w-4 h-4 text-amber-400 animate-bounce" />
                          <span>Voto Sujeto a Consumo de Mesa</span>
                        </div>
                        <p className="text-[11px] text-zinc-200 leading-relaxed">
                          La mesa <span className="text-amber-300 font-bold">{session.table.label}</span> aún no ha sido validada con consumo mínimo.
                        </p>
                        <div className="text-[10px] text-zinc-400 bg-black/50 p-2 rounded-xl border border-zinc-800">
                          💡 Solicita a tu mozo o en barra confirmar el consumo de tu mesa para desbloquear el voto a todos los comensales presentes.
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchTableConsumption()}
                          className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
                          <div className="flex items-center justify-between text-[11px] px-1 text-zinc-400">
                            <span className="flex items-center gap-1 text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Consumo verificado ({session.table.label})
                            </span>
                            <span className="text-zinc-500">Poder 1.0x</span>
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
                    <p className="text-[11px] text-zinc-300">
                      Tus acompañantes de mesa también pueden votar desde sus propios celulares.
                    </p>
                    <button
                      type="button"
                      onClick={() => setContestVoteSubmitted(false)}
                      className="mt-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-[11px] text-amber-400 hover:text-amber-300 font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>✏️ Modificar mi voto</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 🚀 Barra de Reacciones en Vivo a la Smart TV */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-purple-500/30 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🔥</span>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
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
                    className="py-2.5 rounded-xl bg-zinc-950 hover:bg-purple-950/40 border border-zinc-800 hover:border-purple-500/50 flex flex-col items-center justify-center gap-1 active:scale-90 transition-all cursor-pointer shadow-sm"
                  >
                    <span className="text-xl sm:text-2xl">{item.emoji}</span>
                    <span className="text-[9px] text-zinc-400 font-semibold">{item.label}</span>
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
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/90 via-zinc-950 to-cyan-950/90 border-2 border-purple-500/60 shadow-[0_0_25px_rgba(168,85,247,0.3)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-white tracking-wider">
                    <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                    <span>¡Duelo Musical en Vivo!</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-cyan-300 border border-cyan-500/40 font-bold">
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
                        : "bg-zinc-900/90 border-purple-500/50 hover:border-purple-400 text-purple-200"
                    }`}
                  >
                    <div className="text-[10px] font-mono uppercase font-bold text-purple-400">Opción A</div>
                    <div className="text-xs font-bold truncate text-white">{activeDuel.optionA.title}</div>
                    <div className="text-[10px] truncate text-zinc-400">{activeDuel.optionA.artist}</div>
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
                        : "bg-zinc-900/90 border-cyan-500/50 hover:border-cyan-400 text-cyan-200"
                    }`}
                  >
                    <div className="text-[10px] font-mono uppercase font-bold text-cyan-400">Opción B</div>
                    <div className="text-xs font-bold truncate text-white">{activeDuel.optionB.title}</div>
                    <div className="text-[10px] truncate text-zinc-400">{activeDuel.optionB.artist}</div>
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
                      ? "bg-gradient-to-br from-purple-950 via-zinc-900 to-indigo-950 border-2 border-purple-500/60 shadow-purple-950/60"
                      : "bg-gradient-to-r from-purple-950/60 to-zinc-900 border border-purple-500/30"
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
                        <div className="text-sm font-black text-white truncate">
                          {currentPlaying.title}
                        </div>
                        <div className="text-xs text-zinc-400 truncate">
                          {currentPlaying.artist}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isMyTrack && targetId && (
                        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-end">
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(targetId, "PLAYING")}
                            disabled={Boolean(actionLoadingId)}
                            className="px-2.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-rose-950/80 text-zinc-300 hover:text-rose-300 border border-zinc-700/80 hover:border-rose-800 text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                            title="Si el video de YouTube falló, tiene pantalla negra o enlace roto, cancela aquí para pasar de inmediato a la siguiente canción y liberar tu mesa"
                          >
                            <SkipForward className="w-3 h-3 text-amber-400" />
                            <span className="hidden sm:inline">¿Video roto? </span>
                            <span>Saltar Turno</span>
                          </button>
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
                        </div>
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
                              className="py-2 rounded-xl bg-zinc-950/90 hover:bg-purple-900/50 border border-purple-500/30 hover:border-purple-400 text-center transition-all cursor-pointer active:scale-90 flex flex-col items-center justify-center shadow-sm"
                              title={`Enviar ${item.label} a la pantalla`}
                            >
                              <span className="text-lg leading-tight">{item.emoji}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Compartir Fotos si Auto-Play está activado */}
                      {tableAllowance?.autoPlayRequests && (
                        <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/70 via-teal-950/60 to-zinc-950 border border-emerald-500/40 flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                              <Camera className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-black text-emerald-200 flex items-center gap-1.5">
                                <span>📸 Compartir Fotos en Pantalla</span>
                                <span className="text-[9px] bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 px-1 py-0.2 rounded font-black">
                                  AUTO-PLAY EN VIVO
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-400 truncate">
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
              <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider mb-2.5">
                ¿Qué quieres hacer esta noche?
              </h3>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
                <button
                  onClick={() => {
                    setSelectedMood(null);
                    setActiveTab("catalog");
                  }}
                  className="p-2.5 sm:p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/60 text-left transition-all group cursor-pointer flex flex-col justify-between min-w-0"
                >
                  <div className="w-7 h-7 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-2 group-hover:scale-110 transition-transform shrink-0">
                    <Music className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-bold text-white truncate w-full">Pedir Canción</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 truncate w-full">Catálogo oficial</div>
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
                  className="p-2.5 sm:p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-fuchsia-500/60 text-left transition-all group cursor-pointer flex flex-col justify-between min-w-0"
                >
                  <div className="w-7 h-7 rounded-xl bg-fuchsia-600/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 mb-2 group-hover:scale-110 transition-transform shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-bold text-white truncate w-full">Mood</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 truncate w-full">Según tu vibra</div>
                </button>

                <button
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="p-2.5 sm:p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/60 text-left transition-all group cursor-pointer flex flex-col justify-between min-w-0"
                >
                  <div className="w-7 h-7 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2 group-hover:scale-110 transition-transform shrink-0">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-bold text-white truncate w-full">Foto en TV</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 truncate w-full">Muro social</div>
                </button>
              </div>
            </div>

            {/* Selector Rápido de Moods */}
            <div id="moods-section">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider">
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
                      className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-purple-600/50 flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg bg-gradient-to-r ${mood.color} text-white`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                          {mood.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500">&rarr;</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dedicatorias Rápidas & Celebraciones */}
            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-2.5">
              <div className="flex items-center gap-2">
                <Cake className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white">¿Están festejando algo?</h3>
              </div>
              <p className="text-[11px] text-zinc-400">
                Dedica una canción especial para que salga con felicitación en la pantalla del local:
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {CELEBRATION_TAGS.map((tag) => (
                  <button
                    key={tag.label}
                    onClick={() => handleOpenCelebrationModal(tag.note)}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-purple-500/60 text-[11px] text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mi Noche: Estado de pedidos de esta mesa */}
            {myRequests.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 to-zinc-900 border border-purple-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
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

                <div className="text-[11px] text-zinc-300">
                  Has enviado <strong className="text-white">{myRequests.length} canciones</strong>.
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
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950/90 rounded-2xl border border-zinc-800 shadow-sm">
                <button
                  type="button"
                  onClick={() => handleSelectMode("DJ")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeMode === "DJ"
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md shadow-amber-500/20"
                      : "text-zinc-400 hover:text-white"
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
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>🎤 Cantar Karaoke</span>
                </button>
              </div>
            )}

            {tableAllowance?.nightMode === "DJ_ONLY" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-300">
                <Headphones className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Noche en Modo DJ &bull; Búsqueda de canciones para la pista de baile</span>
              </div>
            )}

            {tableAllowance?.nightMode === "KARAOKE_ONLY" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-xs text-cyan-300">
                <Mic className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Noche en Modo Karaoke &bull; Búsqueda de canciones con letra para cantar</span>
              </div>
            )}

            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeMode === "DJ"
                    ? "Buscar tema bailable, remix o artista para el DJ..."
                    : "Buscar canción, artista o pista de karaoke..."
                }
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              {isSearching && (
                <RefreshCw className="w-3.5 h-3.5 text-purple-400 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin" />
              )}
            </div>

            {selectedMood && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-purple-950/60 border border-purple-600/40 text-xs">
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
                      : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
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
              className="w-full p-3 rounded-xl bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-600/30 hover:border-purple-500/60 text-left flex items-center justify-between transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-bold text-white">¿No encuentras tu tema?</div>
                  <div className="text-[10px] text-zinc-400">Pídelo manualmente con nombre y artista</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 font-semibold">
                Pedir
              </span>
            </button>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Canciones del Local ({songs.length})
                </div>

                {songs.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-500 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                    No se encontraron temas en el repertorio local.
                  </div>
                ) : (
                  songs.map((song) => (
                    <div
                      key={song.id}
                      className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-purple-600/40 flex items-center justify-between transition-all"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-xs font-bold text-white truncate">{song.title}</div>
                        <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {song.artist?.name || "Artista desconocido"}
                        </div>
                        {song.genre && (
                          <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 mt-1">
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
                <div className="space-y-2 pt-2 border-t border-zinc-800">
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
                    <span className="text-[10px] text-zinc-500 font-normal lowercase">
                      (toca para pedir)
                    </span>
                  </div>

                  {youtubeSongs.map((yt) => (
                    <div
                      key={yt.id}
                      className={`p-3 rounded-xl bg-zinc-900/60 border flex items-center justify-between transition-all ${
                        activeMode === "DJ"
                          ? "border-amber-500/30 hover:border-amber-500/60"
                          : "border-cyan-500/30 hover:border-cyan-500/60"
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-xs font-bold text-white truncate">
                          {yt.parsedTitle || yt.title}
                        </div>
                        <div className={`text-[11px] truncate mt-0.5 ${
                          activeMode === "DJ" ? "text-amber-300" : "text-cyan-300"
                        }`}>
                          {yt.parsedArtist || yt.channelTitle}
                        </div>
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded border mt-1 ${
                          activeMode === "DJ"
                            ? "bg-amber-950 text-amber-300 border-amber-800/60"
                            : "bg-cyan-950 text-cyan-300 border-cyan-800/60"
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
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Canciones de tu Mesa</span>
              <span className="text-[10px] text-purple-400">Actualizado en vivo</span>
            </div>

            {myRequests.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Music className="w-10 h-10 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400">Tu mesa todavía no ha pedido ninguna canción.</p>
                <button
                  onClick={() => setActiveTab("catalog")}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold cursor-pointer"
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
                    className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <div className="text-xs font-bold text-white">{title}</div>
                          {(req.tipAmountCents || 0) > 0 && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-amber-400 text-black">
                              VIP FAST-PASS
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400">{artist}</div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {tableAllowance?.autoPlayRequests && (req.status === "PENDING" || req.status === "ACCEPTED") && (
                          Boolean(currentPlaying) ? (
                            <div
                              className="px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-700/80 text-red-300 font-bold text-[11px] flex items-center gap-1.5 shadow-sm opacity-90 cursor-not-allowed select-none"
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
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap justify-end">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-600 font-black flex items-center gap-1 animate-pulse">
                              <Radio className="w-3 h-3 text-purple-400" />
                              <span>¡AL AIRE!</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCancelRequest(req.id, "PLAYING")}
                              disabled={actionLoadingId === req.id}
                              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-rose-950/80 text-zinc-300 hover:text-rose-300 border border-zinc-700 hover:border-rose-800 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                              title="Cancelar y saltar canción si el video o audio de YouTube no funciona"
                            >
                              <SkipForward className="w-3 h-3 text-amber-400" />
                              <span>Saltar (Video roto)</span>
                            </button>
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
                        {req.status === "ACCEPTED" && (
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(req.id, "ACCEPTED")}
                            disabled={actionLoadingId === req.id}
                            className="text-[10px] text-amber-400 hover:text-amber-300 font-medium px-2 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-950/70 border border-amber-900/60 transition-colors cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-50"
                            title="Quitar esta canción de la cola y liberar cupo de mi mesa"
                          >
                            <Trash2 className="w-3 h-3 text-amber-400" />
                            <span>Cancelar Turno</span>
                          </button>
                        )}
                        {req.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(req.id, "PENDING")}
                            disabled={actionLoadingId === req.id}
                            className="text-[10px] text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded-lg bg-red-950/40 hover:bg-red-950/70 border border-red-900/60 transition-colors cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                            <span>Cancelar</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {req.notes && (
                      <div className="text-[11px] text-purple-300/90 italic bg-purple-950/30 p-2 rounded-lg border border-purple-900/40">
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
                        <span className="text-zinc-500">
                          {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {badge.detail && (
                        <div className="text-[10px] text-zinc-400 pl-1">
                          {badge.detail}
                        </div>
                      )}
                    </div>

                    {req.status === "PLAYING" && (
                      <div className="mt-3 pt-3 border-t border-purple-500/30 space-y-2 bg-purple-950/40 -mx-3 -mb-3 p-3 rounded-b-2xl">
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
                              className="py-1.5 rounded-lg bg-zinc-950/90 hover:bg-purple-900/50 border border-purple-500/30 hover:border-purple-400 text-center transition-all cursor-pointer active:scale-90 flex flex-col items-center justify-center shadow-sm"
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
            <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-950/90 via-zinc-950 to-zinc-950 border-2 border-amber-500/80 shadow-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <Trophy className="w-7 h-7 text-amber-400" />
                  </span>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                      {activeContestInfo.status === "REGISTRATION"
                        ? "INSCRIPCIONES Y POSTULACIONES ABIERTAS"
                        : "CERTAMEN OFICIAL EN VIVO"}
                    </span>
                    <h2 className="text-xl font-black text-white">{activeContestInfo.name}</h2>
                  </div>
                </div>
                <div className="inline-block px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black self-start sm:self-auto">
                  {activeContestInfo.stageTitle}
                </div>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {activeContestInfo.status === "REGISTRATION"
                  ? "¡El escenario está listo para recibir tu talento! Postúlate desde tu mesa ingresando tu canción y tu nombre para participar en la gala."
                  : "¡Bienvenido a la votación popular de la gala! Tu mesa y cada celular tienen derecho a calificar a los cantantes con estrellas. El veredicto del público incide directamente en el resultado final."}
              </p>
              {activeContestInfo.prizes && (
                <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                  <span><strong>Premios:</strong> {activeContestInfo.prizes}</span>
                </div>
              )}
            </div>

            {/* Tarjeta de Estado de Postulación de la Mesa */}
            {activeContestInfo.myApplication && (
              <div className="p-5 rounded-3xl bg-zinc-900/90 border-2 border-emerald-500/60 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <CheckCircle2 className="w-6 h-6" />
                    </span>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                        POSTULACIÓN REGISTRADA DESDE TU MESA
                      </span>
                      <h3 className="text-base font-black text-white">
                        {activeContestInfo.myApplication.stageName || activeContestInfo.myApplication.name}
                      </h3>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                      activeContestInfo.myApplication.status === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                    }`}
                  >
                    {activeContestInfo.myApplication.status === "ACTIVE"
                      ? "¡Aprobado para Escenario!"
                      : "En Revisión por el DJ"}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-black/60 border border-zinc-800 space-y-2">
                  <div className="text-xs font-bold text-amber-300">
                    🎤 Canción: {activeContestInfo.myApplication.songTitle}
                    {activeContestInfo.myApplication.artistName ? ` (${activeContestInfo.myApplication.artistName})` : ""}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Ubicación: <strong className="text-white">{activeContestInfo.myApplication.tableLabel || session?.table?.label || "Participación Remota / Online"}</strong> • El DJ te llamará cuando sea tu turno en escenario.
                  </div>
                  {activeContestInfo.myApplication.paymentStatus && (
                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Estado de Inscripción:</span>
                      {activeContestInfo.myApplication.paymentStatus === "PAID" || activeContestInfo.myApplication.paymentStatus === "VERIFIED" ? (
                        <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/40">
                          🟢 Pago Confirmado / Inscripción Oficial
                        </span>
                      ) : (
                        <span className="font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-500/40">
                          🟡 Pago Pendiente de Validación
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Formulario de Postulación de Clientes (cuando está abierto y no se ha postulado) */}
            {!activeContestInfo.myApplication && (activeContestInfo.status === "REGISTRATION" || activeContestInfo.allowRegistrations) && (
              <div className="p-5 rounded-3xl bg-zinc-900/90 border-2 border-amber-500/60 shadow-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Mic className="w-5 h-5 text-amber-400" />
                    </span>
                    <div>
                      <h3 className="text-base font-black text-white">
                        ¡Postúlate para Cantar en el Concurso!
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {session?.table?.label
                          ? `Inscripción abierta desde tu mesa (${session.table.label})`
                          : "Inscripción abierta online para participar en el certamen"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeContestInfo.registrationFee && activeContestInfo.registrationFee > 0 ? (
                      <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                        💰 Inscripción: ${activeContestInfo.registrationFee.toLocaleString()}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black">
                        🆓 Inscripción Gratuita
                      </span>
                    )}
                  </div>
                </div>

                {applicationFeedback && (
                  <div
                    className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                      applicationFeedback.type === "success"
                        ? "bg-emerald-950/80 border border-emerald-500 text-emerald-200"
                        : "bg-red-950/80 border border-red-500 text-red-200"
                    }`}
                  >
                    {applicationFeedback.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{applicationFeedback.text}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterContestApplication} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                        Tu Nombre Completo: *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Andrés Gómez"
                        value={applicationForm.name}
                        onChange={(e) => setApplicationForm({ ...applicationForm, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 rounded-xl text-white text-xs outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                        Nombre Artístico (Opcional):
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: La Voz de Oro"
                        value={applicationForm.stageName}
                        onChange={(e) => setApplicationForm({ ...applicationForm, stageName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 rounded-xl text-white text-xs outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                        Canción que cantarás: *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Ya lo sé que tú te vas"
                        value={applicationForm.songTitle}
                        onChange={(e) => setApplicationForm({ ...applicationForm, songTitle: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 rounded-xl text-white text-xs outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                        Artista original:
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Juan Gabriel"
                        value={applicationForm.artistName}
                        onChange={(e) => setApplicationForm({ ...applicationForm, artistName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 rounded-xl text-white text-xs outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                        Teléfono / WhatsApp de Contacto: {!session?.table?.label ? "*" : "(Opcional)"}
                      </label>
                      <input
                        type="tel"
                        required={!session?.table?.label}
                        placeholder="Ej: +56 9 1234 5678"
                        value={applicationForm.phone}
                        onChange={(e) => setApplicationForm({ ...applicationForm, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 rounded-xl text-white text-xs outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                        Dedicatoria o Nota al DJ (Opcional):
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Para mi familia que vinieron a verme"
                        value={applicationForm.bio}
                        onChange={(e) => setApplicationForm({ ...applicationForm, bio: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 rounded-xl text-white text-xs outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* Selector de Gala / Fecha programada */}
                  {activeContestInfo.stages && activeContestInfo.stages.length > 0 && (
                    <div>
                      <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                        Gala o Fecha a Participar:
                      </label>
                      <select
                        value={applicationForm.selectedStageId}
                        onChange={(e) => setApplicationForm({ ...applicationForm, selectedStageId: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 rounded-xl text-white text-xs outline-none focus:border-amber-400"
                      >
                        <option value="">Gala Activa: {activeContestInfo.stageTitle}</option>
                        {activeContestInfo.stages.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.title} ({new Date(st.date).toLocaleDateString()}) - {st.status === "LIVE" ? "EN VIVO" : "PROGRAMADA"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* SECCIÓN DE FORMA DE PAGO */}
                  {activeContestInfo.registrationFee && activeContestInfo.registrationFee > 0 ? (
                    <div className="p-4 rounded-2xl bg-zinc-950 border border-amber-500/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-amber-400" />
                          <span>Forma de Pago de la Inscripción (${activeContestInfo.registrationFee.toLocaleString()})</span>
                        </span>
                        <span className="text-[10px] text-zinc-400">Requerido para competir</span>
                      </div>

                      {activeContestInfo.paymentInstructions && (
                        <div className="p-3 rounded-xl bg-black/70 border border-zinc-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Datos para Transferencia:</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(activeContestInfo.paymentInstructions || "");
                                alert("¡Datos bancarios copiados al portapapeles!");
                              }}
                              className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copiar Datos</span>
                            </button>
                          </div>
                          <p className="text-xs font-mono text-amber-200/90 whitespace-pre-wrap leading-relaxed">
                            {activeContestInfo.paymentInstructions}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setApplicationForm({ ...applicationForm, paymentMethod: "TRANSFER" })}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            applicationForm.paymentMethod === "TRANSFER"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500"
                              : "bg-zinc-900 text-zinc-400 border-zinc-800"
                          }`}
                        >
                          🏦 Transferencia
                        </button>
                        <button
                          type="button"
                          onClick={() => setApplicationForm({ ...applicationForm, paymentMethod: "CASH_LOCAL" })}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            applicationForm.paymentMethod === "CASH_LOCAL"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500"
                              : "bg-zinc-900 text-zinc-400 border-zinc-800"
                          }`}
                        >
                          💵 Efectivo en Local
                        </button>
                        <button
                          type="button"
                          onClick={() => setApplicationForm({ ...applicationForm, paymentMethod: "CARD_LOCAL" })}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            applicationForm.paymentMethod === "CARD_LOCAL"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500"
                              : "bg-zinc-900 text-zinc-400 border-zinc-800"
                          }`}
                        >
                          💳 Tarjeta / POS
                        </button>
                      </div>

                      {applicationForm.paymentMethod === "TRANSFER" && (
                        <div>
                          <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                            Nro de Operación / Comprobante o Teléfono que Transfiere: *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: Operación #987654 o RUT/Nombre del titular"
                            value={applicationForm.paymentReference}
                            onChange={(e) => setApplicationForm({ ...applicationForm, paymentReference: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 rounded-xl text-white text-xs outline-none focus:border-amber-400"
                          />
                        </div>
                      )}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={applicationSubmitting}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {applicationSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                    <span>
                      {applicationSubmitting
                        ? "Enviando postulación..."
                        : session?.table?.label
                        ? `Enviar Postulación desde ${session.table.label}`
                        : "Enviar Postulación Online / Remota"}
                    </span>
                  </button>
                </form>
              </div>
            )}


            {/* Tarjeta de Votación Activa */}
            {activeContestVote ? (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-950 via-zinc-950 to-purple-950 border-2 border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.4)] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                      🎤 ACTUACIÓN EN ESCENARIO
                    </span>
                    <span className="text-base font-black text-white block">
                      {activeContestVote.performance.stageName || activeContestVote.performance.participantName}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      📱 Voto individual por cada celular de la mesa
                    </span>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-500 text-black font-black animate-pulse">
                    VOTACIÓN ABIERTA
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/70 border border-zinc-800 space-y-0.5">
                  <div className="text-sm font-black text-amber-300">
                    {activeContestVote.performance.songTitle}
                  </div>
                  <div className="text-xs text-zinc-400 font-medium">
                    {activeContestVote.performance.artistName}
                  </div>
                </div>

                {!contestVoteSubmitted ? (
                  <div className="space-y-3">
                    <div className="text-center space-y-2">
                      <span className="text-xs font-bold text-zinc-300 block">
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
                                : "bg-zinc-900 text-zinc-600 hover:text-zinc-400"
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
                            : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${contestCheered ? "fill-white" : "text-pink-400"}`} />
                        <span>{contestCheered ? "¡Con Aplauso Extra!" : "+ Dar Barra y Ánimo"}</span>
                      </button>
                    </div>

                    {!session?.table?.id ? (
                      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-xs">
                          <Lock className="w-4 h-4 text-amber-400" />
                          <span>Presencia física requerida en el local</span>
                        </div>
                        <p className="text-[11px] text-zinc-300">
                          Para garantizar que el concurso sea 100% justo, la votación está reservada a comensales presentes en las mesas. Escanea el código QR de tu mesa para votar.
                        </p>
                      </div>
                    ) : tableConsumption?.requireConsumption && tableConsumption?.status === "PENDING" ? (
                      <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/60 text-center space-y-2.5">
                        <div className="flex items-center justify-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wide">
                          <Lock className="w-4 h-4 text-amber-400 animate-bounce" />
                          <span>Voto Sujeto a Consumo Mínimo de Mesa</span>
                        </div>
                        <p className="text-xs text-zinc-200 leading-relaxed">
                          La mesa <span className="text-amber-300 font-bold">{session.table.label}</span> está a la espera de validación de consumo por el personal del local.
                        </p>
                        <div className="text-[11px] text-zinc-400 bg-black/50 p-2.5 rounded-xl border border-zinc-800">
                          💡 Solicita a tu mozo o en caja confirmar el consumo de tu mesa para habilitar de inmediato el voto individual a todos los comensales presentes en tu mesa.
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchTableConsumption()}
                          className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                          <div className="flex items-center justify-between text-xs px-1 text-zinc-400">
                            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                              <CheckCircle2 className="w-4 h-4" /> Consumo verificado en {session.table.label}
                            </span>
                            <span className="text-zinc-500 font-mono">Poder 1.0x</span>
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
                  <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-center space-y-2">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-sm font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>¡Tu voto individual de {contestStars} estrellas fue sumado!</span>
                    </div>
                    <p className="text-[11px] text-zinc-300">
                      Tus acompañantes de mesa también pueden votar desde sus propios celulares.
                    </p>
                    <button
                      type="button"
                      onClick={() => setContestVoteSubmitted(false)}
                      className="mt-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-[11px] text-amber-400 hover:text-amber-300 font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>✏️ Modificar mi voto</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center space-y-3">
                <Mic className="w-10 h-10 text-amber-400 mx-auto animate-pulse" />
                <h3 className="text-base font-bold text-white">Próximo cantante al escenario</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
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
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 animate-slideUp">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                {activeMode === "DJ" ? (
                  <Headphones className="w-4 h-4 text-amber-400" />
                ) : (
                  <Mic className="w-4 h-4 text-cyan-400" />
                )}
                <h3 className="text-sm font-bold text-white">
                  {selectedSong
                    ? (activeMode === "DJ" ? "Pedir Canción para la Pista DJ" : "Pedir Canción para Cantar")
                    : (activeMode === "DJ" ? "Pedir Pista al DJ" : "Pedir Canción para Karaoke")}
                </h3>
              </div>
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs">
                {formError}
              </div>
            )}

            {tableAllowance?.isLocked && (
              <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-200 text-xs space-y-1">
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
                    ? "bg-red-950/70 border-red-500/60 text-red-200"
                    : "bg-emerald-950/70 border-emerald-500/60 text-emerald-200"
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
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 text-purple-200 text-xs space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>¡Conéctate a tu mesa para pedir esta canción!</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
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
                  className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Conectar mi Mesa</span>
                </button>
              </div>
            )}

            {tableAllowance?.queuePaused && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs space-y-1">
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
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-purple-900/40">
                  <div className="text-xs font-bold text-white">{selectedSong.title}</div>
                  <div className="text-[11px] text-purple-300 mt-0.5">
                    {selectedSong.artist?.name || "Artista"}
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      Nombre de la Canción *
                    </label>
                    <input
                      type="text"
                      required
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Ej: Persiana Americana"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      Artista o Banda *
                    </label>
                    <input
                      type="text"
                      required
                      value={customArtist}
                      onChange={(e) => setCustomArtist(e.target.value)}
                      placeholder="Ej: Soda Stereo"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  Tu Nombre o Apodo (Opcional)
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Ej: Carlos / Los del fondo"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Selector Fast-Pass VIP con Propina */}
              <div
                onClick={() => setIsFastPass(!isFastPass)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isFastPass
                    ? "bg-gradient-to-r from-amber-950/60 via-purple-950/60 to-zinc-950 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                    : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Star className={`w-4 h-4 ${isFastPass ? "text-amber-400 fill-amber-400 animate-pulse" : "text-zinc-500"}`} />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Fast-Pass VIP (Propina DJ)</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-amber-400 text-black">
                        +$5.00
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400">
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
                <label className="block text-[11px] font-medium text-zinc-300 mb-1.5">
                  Dedicatoria o Celebración (Opcional)
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {CELEBRATION_TAGS.map((tag) => (
                    <button
                      key={tag.label}
                      type="button"
                      onClick={() => setNotes(tag.note)}
                      className="px-2 py-0.5 rounded text-[10px] bg-zinc-950 border border-zinc-800 hover:border-purple-500 text-zinc-300 cursor-pointer"
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
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {tableAllowance?.autoPlayRequests ? (
                <div className="space-y-2 pt-1">
                  {Boolean(currentPlaying) ? (
                    <div
                      className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-red-950/80 border border-red-700/80 text-red-300 shadow-inner flex items-center justify-center gap-2 select-none opacity-85 cursor-not-allowed"
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
                    className="w-full py-2 px-3 text-[11px] font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    <Clock className="w-3 h-3 text-zinc-400" />
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
                      : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white"
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
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 animate-slideUp">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Subir Foto al Muro de la TV</h3>
              </div>
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {photoSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">¡Foto Enviada!</h4>
                <p className="text-xs text-zinc-400">
                  {tableAllowance?.autoPlayRequests
                    ? "🎉 ¡Foto aprobada automáticamente y proyectándose en vivo en la pantalla grande!"
                    : "El DJ la proyectará en pantalla en unos momentos."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleUploadPhoto} className="space-y-3.5">
                {/* Alerta de Auto-Play en vivo */}
                {tableAllowance?.autoPlayRequests && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2.5 shadow-sm">
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
                  <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2">
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
                  <div className="py-10 text-center space-y-2.5 bg-zinc-950/60 rounded-2xl border border-cyan-500/30">
                    <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                    <div className="text-xs font-bold text-white">Optimizando foto para la pantalla...</div>
                    <div className="text-[10px] text-zinc-400">Ajustando calidad para transmisión instantánea</div>
                  </div>
                ) : photoPreview ? (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden border border-zinc-700 max-h-56 flex items-center justify-center bg-black">
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
                      <label className="block text-[11px] font-bold text-zinc-300">
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
                                ? `${frame.border} bg-cyan-950/70 text-white shadow-md shadow-cyan-950/40`
                                : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-white"
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
                      className="p-5 rounded-2xl border-2 border-dashed border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/40 flex flex-col items-center justify-center gap-2.5 transition-all group cursor-pointer text-center"
                    >
                      <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">📸 Sacar Foto Ahora</span>
                        <span className="text-[10px] text-zinc-400">Abre la cámara del celular al instante</span>
                      </div>
                    </button>

                    {/* Opción 2: Subir de Archivos / Galería */}
                    <button
                      type="button"
                      onClick={() => fileGalleryInputRef.current?.click()}
                      className="p-5 rounded-2xl border-2 border-dashed border-purple-500/50 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-950/40 flex flex-col items-center justify-center gap-2.5 transition-all group cursor-pointer text-center"
                    >
                      <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">📁 Elegir de Archivos</span>
                        <span className="text-[10px] text-zinc-400">Selecciona fotos de tu galería</span>
                      </div>
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Mensaje o Saludo para la Pantalla (Opcional)
                  </label>
                  <input
                    type="text"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    placeholder="Ej: ¡Celebrando con los chicos de la Mesa 2!"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!photoPreview || uploadingPhoto || compressingPhoto}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsManageTableOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Tu Mesa y Sector</h3>
                <p className="text-xs text-zinc-400">
                  Actualmente en: <strong className="text-purple-300">{session.table.label}</strong>
                </p>
              </div>
            </div>

            {/* Badge del sector actual */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {session.table.zone === "KARAOKE" ? (
                  <>
                    <Mic className="w-4 h-4 text-pink-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Sector Karaoke</div>
                      <div className="text-[10px] text-zinc-400">Escenario y turnos para cantar</div>
                    </div>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4 text-indigo-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Sector DJ / Pista</div>
                      <div className="text-[10px] text-zinc-400">Música ambiente, baile y duelos</div>
                    </div>
                  </>
                )}
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {session.table.zone}
              </span>
            </div>

            {/* Opciones */}
            <div className="space-y-2.5 pt-1">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Acciones disponibles:
              </div>

              {/* Opción 1: Cambiar de Mesa o Sector */}
              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 text-left space-y-2">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-xs font-bold text-white">
                    {session.table.zone === "KARAOKE"
                      ? "¿Te mudas al Sector DJ / Pista o a otra mesa?"
                      : "¿Te mudas al Sector Karaoke o a otra mesa?"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {session.table.zone === "KARAOKE"
                    ? "Para mudarte al sector de baile o barra, apunta tu cámara al código QR de tu nueva mesa. Tu turno en el escenario se limpiará, tu mesa actual se liberará y tu app pasará a modo DJ sin perder tu nombre."
                    : "Para mudarte a cantar al karaoke, apunta tu cámara al código QR de tu mesa en el salón de karaoke. Tu mesa actual se liberará y tu app activará el catálogo de letras y turnos para el escenario sin perder tu nombre."}
                </p>

                {/* Lista en vivo de mesas disponibles para mudarse con 1 toque */}
                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-300">
                      Mesas disponibles ({publicTables.filter((t) => t.id !== session.table.id && t.isAvailable).length}):
                    </span>
                    <button
                      type="button"
                      onClick={loadPublicTables}
                      className="text-[10px] text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingPublicTables ? "animate-spin" : ""}`} />
                      <span>Actualizar</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                    {publicTables
                      .filter((t) => t.id !== session.table.id)
                      .sort((a, b) => (a.isAvailable === b.isAvailable ? a.number - b.number : a.isAvailable ? -1 : 1))
                      .map((tbl) => (
                        <a
                          key={tbl.id}
                          href={`/qr/${tbl.qrToken}`}
                          className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between ${
                            tbl.isAvailable
                              ? "bg-zinc-950 hover:bg-purple-950/40 border-emerald-500/40 hover:border-purple-400"
                              : "bg-zinc-950/60 hover:bg-zinc-900 border-zinc-800 opacity-75"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono font-bold text-purple-300">#{tbl.number}</span>
                            <span
                              className={`text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                                tbl.isAvailable
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-amber-500/15 text-amber-300"
                              }`}
                            >
                              {tbl.isAvailable ? "Disponible" : "Ocupada"}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-white truncate mt-0.5">{tbl.label}</div>
                          <div className="text-[9px] text-zinc-400 truncate">{tbl.sectorName}</div>
                        </a>
                      ))}
                  </div>
                </div>

                <form onSubmit={handleJoinByCode} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Código de la noche (ej. RETRO-POP)"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    className="flex-1 px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono text-[11px] uppercase placeholder:text-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer"
                  >
                    Mudarme
                  </button>
                </form>
              </div>

              {/* Opción 2: Finalizar Estadía y Salir */}
              <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/40 text-left space-y-2">
                <div className="flex items-center gap-2">
                  <LogOut className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-xs font-bold text-white">Finalizar Estadía y Salir</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  ¿Te retiras del local? Liberarás la mesa para que otros clientes puedan ocuparla y se cancelarán tus canciones pendientes en cola.
                </p>
                <button
                  onClick={handleLeaveTable}
                  disabled={leavingTable}
                  className="w-full py-2 px-3 bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                  <span className="text-xs font-bold text-white">¿Eres el DJ o Administrador?</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Si estás a cargo de la música o la animación de la noche, entra a la Cabina DJ con tus credenciales de operador.
                </p>
                <a
                  href="/dj"
                  className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Disc3 className="w-3.5 h-3.5" />
                  <span>Ingresar a la Cabina DJ / KJ</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Buzón QSR VIP (Línea Directa Gerencia & Dueño) */}
      <QsrModal
        isOpen={isQsrModalOpen}
        onClose={() => setIsQsrModalOpen(false)}
        tenantId={session?.tenant?.id || null}
        venueId={null}
        tableId={session?.table?.id || null}
        tableNumber={session?.table ? String(session.table.number) : null}
        tableName={session?.table?.label || null}
        guestSessionId={null}
      />

      {/* Footer link to DJ / Staff Login & Buzón QSR */}
      <footer className="py-6 text-center border-t border-zinc-900 mt-8 mb-4 space-y-2">
        <div>
          <button
            type="button"
            onClick={() => setIsQsrModalOpen(true)}
            className="text-xs text-amber-400/80 hover:text-amber-300 transition-colors inline-flex items-center gap-1.5 font-medium underline underline-offset-4 decoration-amber-500/40"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>¿Algún problema o sugerencia? Escribe directo a Gerencia & Dueño</span>
          </button>
        </div>
        <div>
          <a
            href="/dj"
            className="text-xs text-zinc-500 hover:text-purple-400 transition-colors inline-flex items-center gap-1.5 font-medium"
          >
            <Disc3 className="w-3.5 h-3.5 text-purple-400" />
            <span>¿Eres el DJ o Personal de la Cabina? Ingresar aquí &rarr;</span>
          </a>
        </div>
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
