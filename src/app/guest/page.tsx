"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
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
  table: { id: string; number: number; label: string };
  event: { id: string; name: string; code: string; status: string };
  tenant: { id: string; name: string; slug: string };
}

interface CurrentPlayingInfo {
  title: string;
  artist: string;
  tableLabel: string;
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

function GuestContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const venueParam = searchParams.get("venue");
  const tableParam = searchParams.get("table");

  const [activeTab, setActiveTab] = useState<"hub" | "catalog" | "my-requests">("hub");
  const [session, setSession] = useState<GuestSessionInfo | null>(null);
  const [currentPlaying, setCurrentPlaying] = useState<CurrentPlayingInfo | null>(null);
  const [flashDeal, setFlashDeal] = useState<FlashDealInfo | null>(null);
  const [activeDuel, setActiveDuel] = useState<LiveDuelInfo | null>(null);
  const [votedOption, setVotedOption] = useState<"A" | "B" | null>(null);
  const [votingLoading, setVotingLoading] = useState(false);
  const [branding, setBranding] = useState<BrandingInfo | null>(null);
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);

  // Catálogo state
  const [songs, setSongs] = useState<Song[]>([]);
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

  // Modal de Subida de Fotos
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    window.location.href = `/display/${manualCode.trim().toUpperCase()}/tables`;
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
        if (data.data.session.guestName) {
          setGuestName(data.data.session.guestName);
        }
        // Consultar duelos
        if (data.data.session.event.id) {
          fetchDuelState(data.data.session.event.id);
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

  useEffect(() => {
    loadSessionAndRequests();
  }, []);

  // Cargar catálogo de canciones con debounce y soporte de moods
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append("q", searchQuery);
        if (selectedGenre && selectedGenre !== "ALL") params.append("genre", selectedGenre);
        if (selectedMood) params.append("mood", selectedMood);

        const res = await fetch(`/api/v1/catalog/songs?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setSongs(data.data.songs);
          if (data.data.genres) setGenres(data.data.genres);
        }
      } catch (err) {
        console.error("Error cargando canciones:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedGenre, selectedMood]);

  // Sincronización Realtime nativa SSE (0 ms) para comensales de mesa
  const { isConnected: isRealtime } = useRealtime({
    eventId: session?.event?.id,
    onEvent: async (type: RealtimeEventType, payload: any) => {
      if (type === "DUEL_UPDATE") {
        setActiveDuel(payload || null);
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
          }
        } catch {}
      }
    },
  });

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
        }
        fetchDuelState(session.event.id);
      } catch {
        // Silencioso
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [session]);

  // Enviar solicitud de canción con Fast-Pass
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const payload: any = {
        guestName,
        notes,
        isFastPass,
        tipAmountCents: isFastPass ? 500 : 0,
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
        isFastPass
          ? "⭐ ¡Canción con Fast-Pass VIP enviada al DJ!"
          : "¡Canción enviada a la cabina del DJ exitosamente!"
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

  // Subir Foto al Muro Social
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPreview) return;
    setUploadingPhoto(true);
    try {
      const res = await fetch("/api/v1/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: photoPreview,
          caption: photoCaption,
          guestName,
        }),
      });
      if (res.ok) {
        setPhotoSuccess(true);
        setPhotoPreview(null);
        setPhotoCaption("");
        setTimeout(() => {
          setIsPhotoModalOpen(false);
          setPhotoSuccess(false);
        }, 2000);
      } else {
        const err = await res.json();
        alert(err.error?.message || "Error al enviar la foto");
      }
    } catch {
      alert("Error de conexión");
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

  if (errorParam === "no_active_event") {
    return (
      <div className="p-6 text-center my-auto space-y-4">
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
      </div>
    );
  }

  if (errorParam === "table_not_found") {
    return (
      <div className="p-6 text-center my-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Mesa no encontrada</h2>
        <p className="text-sm text-zinc-400">
          El código QR escaneado no coincide con ninguna mesa registrada en el sistema.
        </p>
      </div>
    );
  }

  if (!loadingSession && !session) {
    return (
      <div className="p-6 text-center my-auto space-y-6 max-w-sm mx-auto w-full">
        <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/30 text-purple-400 mx-auto flex items-center justify-center glow-purple">
          <QrCode className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">¡Conéctate a tu Mesa!</h2>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
            Apunta la cámara de tu teléfono al código QR de tu mesa, o ingresa el código del evento que ves en la pantalla gigante de TV.
          </p>
        </div>

        {/* Input de Código de Evento */}
        <form onSubmit={handleJoinByCode} className="space-y-2 text-left bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
          <label className="text-[11px] font-bold text-zinc-300 block">
            Código de la Noche / Pantalla TV:
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

        <div className="pt-2 border-t border-zinc-800/80 text-left">
          <div className="text-[11px] text-zinc-400 mb-2 font-medium">O prueba en modo demostración (1-clic):</div>
          <a
            href="/qr/qr_centro_m2"
            className="block p-3 rounded-xl bg-zinc-900 hover:bg-purple-950/40 border border-zinc-800 hover:border-purple-600/50 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Simular Mesa 2 (Pista)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 font-mono">
                Sede Centro
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Retro Bar &bull; Viernes de Karaoke Pop & Clásicos
            </p>
          </a>
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
    <div className="flex-1 flex flex-col">
      {/* 1. Header Nocturno de Mesa */}
      <header className="p-4 bg-zinc-900/90 border-b border-zinc-800 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {branding?.logoUrl ? (
              <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={branding.logoUrl}
                  alt={session?.tenant.name || "Logo"}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Disc3 className="w-4 h-4 animate-spin [animation-duration:10s]" />
              </div>
            )}
            <div>
              <div className="text-xs font-black text-white tracking-wide uppercase">
                {branding?.welcomeTitle || session?.tenant.name}
              </div>
              <div className="text-[11px] text-zinc-400 truncate max-w-[170px]">
                {session?.event.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PwaInstallButton variant="guest" />

            <button
              onClick={() => setIsPhotoModalOpen(true)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-purple-300 border border-purple-500/30 text-xs flex items-center gap-1 cursor-pointer transition-colors"
              title="Subir foto a la pantalla"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-bold">Foto</span>
            </button>

            <div className="px-3 py-1 rounded-full bg-purple-600/20 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5 shrink-0">
              <span
                className={`w-2 h-2 rounded-full ${
                  isRealtime
                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse"
                    : "bg-emerald-400"
                }`}
              />
              <span>{session?.table.label}</span>
              {isRealtime && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-mono">
                  SSE
                </span>
              )}
            </div>
          </div>
        </div>

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

        {/* Notificación flotante de éxito */}
        {successMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-700/80 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}
      </header>

      {/* 2. Tabs de Navegación "ONE QR — ONE NIGHT" */}
      <div className="flex border-b border-zinc-800 bg-zinc-950/90 sticky top-[65px] z-10">
        <button
          onClick={() => setActiveTab("hub")}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "hub"
              ? "border-purple-500 text-purple-300 bg-purple-950/20"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
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
              : "border-transparent text-zinc-400 hover:text-zinc-200"
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
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Mis Pedidos</span>
          {myRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-600 text-white font-bold">
              {myRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. Contenido Principal */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* PESTAÑA 1: "MI NOCHE" (WELCOME HUB) */}
        {activeTab === "hub" && (
          <div className="space-y-4">
            {/* Promo Flash Deal de Barra (Pulse) */}
            {flashDeal && (
              <div
                className={`p-3.5 rounded-2xl bg-gradient-to-r ${flashDeal.bannerBg} border ${flashDeal.color} flex items-center justify-between shadow-xl animate-fadeIn`}
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-white font-mono">
                      {flashDeal.badgeText}
                    </span>
                    <span className="text-xs font-black text-white truncate">{flashDeal.title}</span>
                  </div>
                  <div className="text-[11px] text-zinc-300 font-semibold mt-0.5">
                    {flashDeal.discount}
                  </div>
                </div>
                <span className="text-[10px] px-3 py-1.5 rounded-xl bg-white text-black font-extrabold shrink-0 shadow-md">
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
            {currentPlaying && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/60 to-zinc-900 border border-purple-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400 shrink-0">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">
                      Sonando Ahora &bull; {currentPlaying.tableLabel}
                    </div>
                    <div className="text-xs font-bold text-white truncate">
                      {currentPlaying.title}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {currentPlaying.artist}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0 pl-2">
                  <span className="w-1 h-3 bg-purple-400 rounded-full animate-pulse" />
                  <span className="w-1 h-5 bg-purple-400 rounded-full animate-pulse [animation-delay:150ms]" />
                  <span className="w-1 h-2 bg-purple-400 rounded-full animate-pulse [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {/* "¿Qué quieres hacer esta noche?" - Tarjetas de Acción Directa */}
            <div>
              <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider mb-2.5">
                ¿Qué quieres hacer esta noche?
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setSelectedMood(null);
                    setActiveTab("catalog");
                  }}
                  className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/60 text-left transition-all group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-2 group-hover:scale-110 transition-transform">
                    <Music className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-bold text-white">Pedir Canción</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Catálogo oficial</div>
                </button>

                <button
                  onClick={() => {
                    setSelectedMood("fiesta");
                    setActiveTab("catalog");
                  }}
                  className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-fuchsia-500/60 text-left transition-all group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-xl bg-fuchsia-600/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 mb-2 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-bold text-white">Sorpréndeme</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Por mood</div>
                </button>

                <button
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/60 text-left transition-all group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2 group-hover:scale-110 transition-transform">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-bold text-white">Foto en TV</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Muro social</div>
                </button>
              </div>
            </div>

            {/* Selector Rápido de Moods */}
            <div>
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
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar canción, artista o banda..."
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

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Canciones Disponibles ({songs.length})
              </div>

              {songs.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  No se encontraron canciones con esa búsqueda.
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
                      className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold transition-colors shrink-0 cursor-pointer"
                    >
                      Pedir
                    </button>
                  </div>
                ))
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

                      {req.status === "PENDING" && (
                        <button
                          onClick={() => handleCancelRequest(req.id)}
                          className="text-[10px] text-red-400 hover:text-red-300 font-medium px-2 py-0.5 rounded bg-red-950/50 border border-red-900/60 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
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
                  </div>
                );
              })
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
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">
                  {selectedSong ? "Pedir Canción" : "Petición de Canción"}
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

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando al DJ...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirmar y Enviar Canción</span>
                  </>
                )}
              </button>
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
                <p className="text-xs text-zinc-400">El DJ la proyectará en pantalla en unos momentos.</p>
              </div>
            ) : (
              <form onSubmit={handleUploadPhoto} className="space-y-3">
                {photoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-zinc-700 max-h-56 flex items-center justify-center bg-black">
                    <img src={photoPreview} alt="Preview" className="max-h-56 object-contain" />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-zinc-700 hover:border-cyan-500 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-zinc-950/60">
                    <Camera className="w-8 h-8 text-cyan-400" />
                    <span className="text-xs font-bold text-white">Tomar o Seleccionar Foto</span>
                    <span className="text-[10px] text-zinc-500">De tu mesa o grupo de amigos</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
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
                  disabled={!photoPreview || uploadingPhoto}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  {uploadingPhoto ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando al proyector...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Proyectar en Pantalla</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
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
