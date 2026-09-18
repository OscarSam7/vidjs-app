"use client";

import { useState, useEffect, use } from "react";
import {
  Disc3,
  Music,
  Radio,
  Sparkles,
  Users,
  Maximize2,
  Minimize2,
  Clock,
  Flame,
  Swords,
  Camera,
} from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import { RealtimeEventType } from "@/lib/realtime/event-bus";

interface LiveDuelData {
  id: string;
  optionA: { id: "A"; title: string; artist: string; tableLabel?: string; votes: number };
  optionB: { id: "B"; title: string; artist: string; tableLabel?: string; votes: number };
  status: "ACTIVE" | "FINISHED";
  endsAt: string;
  totalVotes: number;
}

interface PhotoPostItem {
  id: string;
  guestName: string;
  imageUrl: string;
  caption: string | null;
  table: { label: string; number: number };
  createdAt: string;
}

interface FloatingReaction {
  id: string;
  reaction: string;
  tableLabel?: string;
  xPercent: number;
}

interface ApplauseState {
  targetTableLabel: string;
  durationSeconds: number;
  endsAt: string;
  score: number;
  active: boolean;
}

interface RouletteState {
  tables: string[];
  winner: string;
  prize: string;
  spinning: boolean;
  currentIndex: number;
  finished: boolean;
}

interface FeaturedPhotoState {
  photo: PhotoPostItem;
}

interface DisplayState {
  event: {
    id: string;
    name: string;
    code: string;
    status: string;
    venueName: string;
    tenantName: string;
    logoUrl: string | null;
  };
  currentPlaying: {
    id: string;
    status: string;
    updatedAt: string;
    song: {
      title: string;
      artist: string;
      genre: string;
      durationSeconds: number;
      bpm: number | null;
      key: string | null;
    };
    table: { id: string; number: number; label: string };
    guestName?: string | null;
    notes?: string | null;
    tipAmountCents?: number;
    isFastPass?: boolean;
  } | null;
  upcomingQueue: Array<{
    id: string;
    order: number;
    title: string;
    artist: string;
    table: string;
    tipAmountCents?: number;
    isFastPass?: boolean;
  }>;
  flashDeal?: {
    id: string;
    title: string;
    subtitle: string;
    discount: string;
    badgeText: string;
  } | null;
  policy?: {
    zone: string;
    maxActivePerTable: number;
    queuePaused: boolean;
    rotationMode: string;
    photosAllowed?: boolean;
    photoRotationSeconds?: number;
  };
  qr: {
    scanUrl: string;
    dataUrl: string;
  };
  branding?: {
    logoUrl?: string | null;
    bannerUrl?: string | null;
    primaryColor?: string;
    accentColor?: string;
    welcomeTitle?: string | null;
    welcomeSubtitle?: string | null;
    marqueeText?: string | null;
    instagramHandle?: string | null;
    wifiSsid?: string | null;
    wifiPassword?: string | null;
  };
}

export default function PublicDisplayScreenPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [data, setData] = useState<DisplayState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // ⚔️ Duelo Musical en TV
  const [activeDuel, setActiveDuel] = useState<LiveDuelData | null>(null);

  // 📸 Fotos del Muro de Social Lounge
  const [approvedPhotos, setApprovedPhotos] = useState<PhotoPostItem[]>([]);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  // ⭐ Foto Destacada en Pantalla Completa (Spotlight Fullscreen 12s)
  const [featuredPhoto, setFeaturedPhoto] = useState<FeaturedPhotoState | null>(null);

  // 🚀 Reacciones y Emojis Flotantes en Vivo (Efecto TikTok)
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  // 👏 Aplausómetro Digital
  const [applause, setApplause] = useState<ApplauseState | null>(null);

  // 🎰 Ruleta de la Suerte de Mesas
  const [roulette, setRoulette] = useState<RouletteState | null>(null);

  // Simulación de tiempo transcurrido de la canción
  const [elapsedSeconds, setElapsedSeconds] = useState(15);

  const fetchDisplayState = async () => {
    try {
      const res = await fetch(`/api/v1/display/state?code=${code}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
        setError(null);
      } else {
        const errJson = await res.json();
        setError(errJson.error?.message || "Error al cargar la pantalla pública");
      }
    } catch (err) {
      console.error("Error conectando con la pantalla:", err);
    } finally {
      setLoading(false);
    }
  };

  // Conexión Realtime nativa SSE (0 ms) para duelos, fotos, reacciones y juegos
  const { isConnected: isRealtime } = useRealtime({
    code,
    onEvent: (type: RealtimeEventType, payload: any) => {
      if (type === "DUEL_UPDATE") {
        setActiveDuel(payload || null);
      } else if (type === "PHOTO_APPROVED") {
        setApprovedPhotos((prev) => [
          payload,
          ...prev.filter((p) => p.id !== payload.id),
        ]);
      } else if (type === "PHOTO_REMOVED") {
        setApprovedPhotos((prev) => prev.filter((p) => p.id !== payload?.id));
        setFeaturedPhoto((curr) => (curr?.photo.id === payload?.id ? null : curr));
      } else if (type === "PHOTO_FEATURED") {
        if (payload?.photo) {
          setFeaturedPhoto({ photo: payload.photo });
          setTimeout(() => {
            setFeaturedPhoto((curr) => (curr?.photo.id === payload.photo.id ? null : curr));
          }, (payload.durationSeconds || 12) * 1000);
        }
      } else if (type === "REACTION_BURST") {
        const rx: FloatingReaction = {
          id: payload.id || Math.random().toString(),
          reaction: payload.reaction || "🔥",
          tableLabel: payload.tableLabel,
          xPercent: Math.floor(Math.random() * 80) + 10,
        };
        setReactions((prev) => [...prev.slice(-20), rx]);
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== rx.id));
        }, 3800);
      } else if (type === "APPLAUSE_START") {
        setApplause({
          targetTableLabel: payload.targetTableLabel || "¡A TODOS LOS ARTISTAS!",
          durationSeconds: payload.durationSeconds || 15,
          endsAt: payload.endsAt,
          score: 15,
          active: true,
        });
      } else if (type === "APPLAUSE_TICK") {
        setApplause((prev) =>
          prev && prev.active
            ? { ...prev, score: Math.min(100, prev.score + 4.5) }
            : prev
        );
      } else if (type === "APPLAUSE_END") {
        setTimeout(() => setApplause(null), 3000);
      } else if (type === "ROULETTE_SPIN") {
        const spinDuration = payload.spinDurationMs || 6000;
        setRoulette({
          tables: payload.tables || ["Mesa 1", "Mesa 2", "Mesa 3"],
          winner: payload.winner || "Mesa 1",
          prize: payload.prize || "¡Ronda de Shots Gratis!",
          spinning: true,
          currentIndex: 0,
          finished: false,
        });

        const spinInterval = setInterval(() => {
          setRoulette((curr) =>
            curr && curr.spinning
              ? { ...curr, currentIndex: (curr.currentIndex + 1) % curr.tables.length }
              : curr
          );
        }, 120);

        setTimeout(() => {
          clearInterval(spinInterval);
          setRoulette((curr) => (curr ? { ...curr, spinning: false, finished: true } : null));
        }, spinDuration);

        setTimeout(() => {
          setRoulette(null);
        }, spinDuration + 9000);
      } else if (
        type === "TRACK_CHANGE" ||
        type === "QUEUE_UPDATE" ||
        type === "QUEUE_POLICY_UPDATED" ||
        type === "QUEUE_SLOT_UNLOCKED" ||
        type === "TABLE_RELEASED"
      ) {
        fetchDisplayState();
      }
    },
  });

  // Temporizador para finalizar el aplausómetro
  useEffect(() => {
    if (!applause || !applause.active) return;
    const timer = setInterval(() => {
      if (new Date() >= new Date(applause.endsAt)) {
        setApplause((prev) => (prev ? { ...prev, active: false } : null));
        setTimeout(() => setApplause(null), 3500);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [applause?.endsAt, applause?.active]);

  // Carga inicial y polling de respaldo resiliente (cada 15 segundos)
  useEffect(() => {
    fetchDisplayState();

    const fetchExtraState = async () => {
      try {
        const duelRes = await fetch(`/api/v1/duel/state?code=${code}`);
        if (duelRes.ok) {
          const dj = await duelRes.json();
          setActiveDuel(dj.data || null);
        }

        const photoRes = await fetch(`/api/v1/photos?code=${code}&status=APPROVED`);
        if (photoRes.ok) {
          const pj = await photoRes.json();
          if (pj.data?.photos) {
            setApprovedPhotos(pj.data.photos);
          }
        }
      } catch {}
    };

    fetchExtraState();
    const interval = setInterval(() => {
      fetchDisplayState();
      fetchExtraState();
    }, 15000);
    return () => clearInterval(interval);
  }, [code]);

  // Rotación de fotos del Social Lounge en pantalla según la política del DJ (default 8s)
  useEffect(() => {
    if (approvedPhotos.length <= 1) return;
    const intervalSec = data?.policy?.photoRotationSeconds || 8;
    const photoTimer = setInterval(() => {
      setCurrentPhotoIdx((prev) => (prev + 1) % approvedPhotos.length);
    }, intervalSec * 1000);
    return () => clearInterval(photoTimer);
  }, [approvedPhotos.length, data?.policy?.photoRotationSeconds]);

  // Temporizador visual de progreso
  useEffect(() => {
    if (!data?.currentPlaying) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        const max = data.currentPlaying?.song.durationSeconds || 210;
        return prev >= max ? 0 : prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [data?.currentPlaying]);

  // Auto-ocultar cursor y controles en Smart TVs
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <Disc3 className="w-12 h-12 text-purple-500 animate-spin" />
        <p className="text-sm font-mono text-zinc-400">
          Sintonizando pantalla pública del evento {code}...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Radio className="w-16 h-16 text-zinc-700 mx-auto" />
        <h1 className="text-2xl font-bold">Pantalla No Disponible</h1>
        <p className="text-sm text-zinc-400 max-w-md">
          {error || "El evento indicado no se encuentra activo."}
        </p>
      </div>
    );
  }

  const track = data.currentPlaying;
  const isKaraoke = data?.policy?.zone === "KARAOKE";
  const duration = track?.song.durationSeconds || 210;
  const progressPercent = Math.min((elapsedSeconds / duration) * 100, 100);
  const isCelebration = Boolean(
    track?.notes &&
      (track.notes.toLowerCase().includes("cumple") ||
        track.notes.toLowerCase().includes("aniversario") ||
        track.notes.includes("🎂") ||
        track.notes.includes("💍") ||
        track.notes.toLowerCase().includes("festejo"))
  );

  return (
    <div className="min-h-screen bg-[#040406] text-zinc-100 flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden select-none">
      {/* Luces de fondo y resplandor estilo discoteca */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Botón de Pantalla Completa Flotante (auto-ocultable) */}
      <div
        className={`fixed top-4 right-4 z-50 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={toggleFullscreen}
          className="p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white backdrop-blur-md shadow-2xl flex items-center gap-2 text-xs font-semibold cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span>{isFullscreen ? "Salir" : "Pantalla Completa (F11)"}</span>
        </button>
      </div>

      {/* 1. Encabezado Superior (Logo del Local y Código) */}
      <header className="flex items-center justify-between z-10 border-b border-zinc-800/60 pb-5">
        <div className="flex items-center gap-4">
          {data.branding?.logoUrl || data.event.logoUrl ? (
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700/80 p-1.5 flex items-center justify-center overflow-hidden shadow-xl shrink-0">
              <img
                src={data.branding?.logoUrl || data.event.logoUrl || ""}
                alt={data.event.tenantName}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 shrink-0">
              <Disc3 className="w-8 h-8 animate-spin [animation-duration:12s]" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-white tracking-wider">
                {data.branding?.welcomeTitle || data.event.tenantName.toUpperCase()}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-xs font-bold font-mono">
                {data.event.venueName}
              </span>
              {isKaraoke && (
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-xs font-bold font-mono animate-pulse">
                  🎤 MODO KARAOKE
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 font-medium">
              {data.event.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data.branding?.instagramHandle && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-950/80 to-pink-950/80 border border-purple-700/60 text-purple-200 text-xs font-bold">
              <span>📸 {data.branding.instagramHandle}</span>
            </div>
          )}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRealtime
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                  : "bg-emerald-400 animate-ping"
              }`}
            />
            <span className="text-xs font-bold text-emerald-300 tracking-wider">
              {isRealtime ? "⚡ EN VIVO (SSE 0ms)" : "TRANSMISIÓN EN VIVO"}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-purple-900/40 border border-purple-600/50 text-purple-200 font-mono text-xs font-extrabold tracking-wider">
            CÓDIGO: {data.event.code}
          </div>
        </div>
      </header>

      {/* Marquesina de Anuncios y Promociones */}
      {data.branding?.marqueeText && (
        <div className="z-10 -mx-6 sm:-mx-10 my-2 bg-gradient-to-r from-purple-950/90 via-zinc-950 to-purple-950/90 border-y border-purple-500/30 py-2 overflow-hidden shadow-xl">
          <div className="flex animate-pulse whitespace-nowrap justify-center gap-6 font-bold text-xs sm:text-sm text-purple-200 tracking-wider px-4">
            <span>✨ {data.branding.marqueeText}</span>
          </div>
        </div>
      )}

      {/* Marquesina de Flash Deals de Barra */}
      {data.flashDeal && (
        <div className="z-10 -mx-6 sm:-mx-10 my-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-black py-2 px-4 shadow-lg shadow-amber-500/30 flex items-center justify-center gap-3 font-black text-xs sm:text-sm tracking-wider animate-pulse">
          <span className="px-2 py-0.5 rounded bg-black text-amber-300 text-[10px] uppercase font-mono">
            {data.flashDeal.badgeText || "PROMO BARRA"}
          </span>
          <span>⚡ {data.flashDeal.title}:</span>
          <span className="font-semibold text-zinc-950">{data.flashDeal.discount || data.flashDeal.subtitle}</span>
          <span className="text-[10px] font-mono uppercase bg-black/20 px-2 py-0.5 rounded">¡Pide en barra!</span>
        </div>
      )}

      {/* 2. Escenario Central (Duelo en Vivo vs Now Playing vs Idle Mode) */}
      <main className="my-auto py-8 z-10 relative">
        {activeDuel && activeDuel.status === "ACTIVE" ? (
          /* ESCENARIO DE DUELO MUSICAL EN VIVO */
          <div className="max-w-5xl mx-auto w-full space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/50 text-xs font-black tracking-widest uppercase animate-bounce">
                <Swords className="w-4 h-4" />
                <span>¡BATALLA MUSICAL EN VIVO!</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                ¿QUÉ CANCIÓN DEBE SONAR AHORA?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Apunta la cámara de tu celular al QR de tu mesa o en pantalla y vota en vivo
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
              {/* TRACK A */}
              <div className="md:col-span-5 p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/40 border-2 border-amber-500 shadow-2xl shadow-amber-500/20 space-y-4 text-center md:text-left">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-xl bg-amber-500 text-black text-xs font-black uppercase">
                    OPCIÓN A
                  </span>
                  {activeDuel.optionA.tableLabel && (
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      de {activeDuel.optionA.tableLabel}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white truncate">
                    {activeDuel.optionA.title}
                  </h3>
                  <p className="text-base sm:text-lg font-bold text-amber-300 truncate mt-1">
                    {activeDuel.optionA.artist}
                  </p>
                </div>
                {/* Barra y Porcentaje */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-bold text-amber-400 font-mono">
                    <span>{activeDuel.optionA.votes} votos</span>
                    <span className="text-lg font-black">
                      {activeDuel.totalVotes > 0
                        ? Math.round((activeDuel.optionA.votes / activeDuel.totalVotes) * 100)
                        : 50}
                      %
                    </span>
                  </div>
                  <div className="w-full h-4 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                      style={{
                        width: `${
                          activeDuel.totalVotes > 0
                            ? (activeDuel.optionA.votes / activeDuel.totalVotes) * 100
                            : 50
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* VS BADGE CENTRAL */}
              <div className="md:col-span-1 text-center py-2 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black flex items-center justify-center text-sm shadow-xl animate-pulse">
                  VS
                </div>
                <span className="text-[10px] font-mono text-zinc-500 mt-2">EN VIVO</span>
              </div>

              {/* TRACK B */}
              <div className="md:col-span-5 p-6 rounded-3xl bg-gradient-to-bl from-zinc-900 via-zinc-900 to-orange-950/40 border-2 border-orange-500 shadow-2xl shadow-orange-500/20 space-y-4 text-center md:text-right">
                <div className="flex items-center justify-between md:flex-row-reverse">
                  <span className="px-3 py-1 rounded-xl bg-orange-500 text-black text-xs font-black uppercase">
                    OPCIÓN B
                  </span>
                  {activeDuel.optionB.tableLabel && (
                    <span className="text-xs font-mono text-orange-400 font-bold">
                      de {activeDuel.optionB.tableLabel}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white truncate">
                    {activeDuel.optionB.title}
                  </h3>
                  <p className="text-base sm:text-lg font-bold text-orange-300 truncate mt-1">
                    {activeDuel.optionB.artist}
                  </p>
                </div>
                {/* Barra y Porcentaje */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between md:flex-row-reverse text-xs font-bold text-orange-400 font-mono">
                    <span>{activeDuel.optionB.votes} votos</span>
                    <span className="text-lg font-black">
                      {activeDuel.totalVotes > 0
                        ? Math.round((activeDuel.optionB.votes / activeDuel.totalVotes) * 100)
                        : 50}
                      %
                    </span>
                  </div>
                  <div className="w-full h-4 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500 ml-auto"
                      style={{
                        width: `${
                          activeDuel.totalVotes > 0
                            ? (activeDuel.optionB.votes / activeDuel.totalVotes) * 100
                            : 50
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : track ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-7xl mx-auto">
            {/* Vinilo Gigante Giratorio (Col 4) */}
            <div className="lg:col-span-4 flex justify-center">
              <div className="relative">
                <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-black border-8 border-zinc-900 shadow-2xl flex items-center justify-center animate-spin [animation-duration:5s]">
                  {/* Surcos del Vinilo */}
                  <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-zinc-800 flex items-center justify-center">
                    <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border border-zinc-850 flex items-center justify-center">
                      {/* Centro del Disco con Logo */}
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 border-4 border-white flex flex-col items-center justify-center text-center p-2">
                        <Disc3 className="w-6 h-6 text-white" />
                        <span className="text-[8px] font-black text-white mt-1">VIDJS</span>
                        <div className="w-3 h-3 rounded-full bg-black mt-1" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Glow decorativo */}
                <div className="absolute inset-0 bg-purple-600/20 rounded-full blur-2xl -z-10" />
              </div>
            </div>

            {/* Información del Tema & Dedicatoria (Col 8) */}
            <div className="lg:col-span-8 space-y-6 text-center lg:text-left">
              {/* Badge Al Aire o Celebración */}
              <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
                {isCelebration ? (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 text-white font-black text-xs sm:text-sm tracking-widest uppercase flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(236,72,153,0.5)] animate-bounce">
                    <span>🎂</span>
                    <span>¡MOMENTO DE CELEBRACIÓN EN EL LOCAL!</span>
                    <span>🎉</span>
                  </div>
                ) : (
                  <div
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black tracking-widest uppercase border ${
                      isKaraoke
                        ? "bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                        : "bg-purple-600/30 text-purple-300 border-purple-500/40"
                    }`}
                  >
                    <Radio className={`w-4 h-4 animate-pulse ${isKaraoke ? "text-cyan-400" : "text-purple-400"}`} />
                    <span>{isKaraoke ? `🎤 CANTANDO AHORA: ${track.table.label}` : "SONANDO EN LA PISTA"}</span>
                  </div>
                )}
                {track.isFastPass && (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-xs font-black tracking-widest uppercase shadow-lg shadow-amber-500/20 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>⭐ VIP FAST-PASS</span>
                  </div>
                )}
              </div>

              {/* Título y Artista */}
              <div className="space-y-2">
                <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none drop-shadow-lg">
                  {track.song.title}
                </h1>
                <p className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
                  {track.song.artist}
                </p>
              </div>

              {/* Caja de Dedicatoria y Mesa del Comensal */}
              <div
                className={`p-5 rounded-2xl border shadow-xl space-y-2 text-left ${
                  track.isFastPass
                    ? "bg-gradient-to-r from-amber-950/60 via-zinc-900/90 to-zinc-900/80 border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
                    : isCelebration
                    ? "bg-gradient-to-r from-pink-950/70 via-purple-950/80 to-zinc-900 border-pink-500/60 shadow-[0_0_25px_rgba(236,72,153,0.3)]"
                    : "bg-gradient-to-r from-purple-950/60 via-zinc-900/90 to-zinc-900/80 border-purple-500/40"
                }`}
              >
                <div className="flex items-center gap-2 text-xs text-purple-300 font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Pedido por: {track.table.label}</span>
                  {track.guestName && (
                    <span className="text-white">({track.guestName})</span>
                  )}
                  {track.isFastPass && (
                    <span className="text-amber-400 font-black">⭐ FAST-PASS</span>
                  )}
                </div>

                {track.notes && (
                  <p className="text-base sm:text-lg text-white font-medium italic">
                    &ldquo;{track.notes}&rdquo;
                  </p>
                )}
              </div>

              {/* Ecualizador Visual Animado */}
              <div className="flex items-end justify-center lg:justify-start gap-1.5 h-12 pt-2">
                {[45, 80, 60, 95, 30, 75, 90, 50, 85, 40, 70, 100, 55, 90, 65, 80, 45, 95, 60, 85, 50, 75, 90, 35].map((height, i) => (
                  <div
                    key={i}
                    className="w-2 rounded-t-full bg-gradient-to-t from-purple-600 via-fuchsia-500 to-cyan-400 animate-pulse"
                    style={{
                      height: `${height}%`,
                      animationDuration: `${0.4 + (i % 5) * 0.15}s`,
                    }}
                  />
                ))}
              </div>

              {/* Barra de Progreso */}
              <div className="space-y-1.5 max-w-xl mx-auto lg:mx-0">
                <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 transition-all duration-1000"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-mono text-zinc-400">
                  <span>{formatTime(elapsedSeconds)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* MODO INTERMEDIO (IDLE): Pantalla de Bienvenida con QR Central */
          <div className="text-center max-w-2xl mx-auto space-y-6 py-6">
            <div className="inline-flex p-4 rounded-3xl bg-purple-600/10 border border-purple-500/30 text-purple-400 shadow-2xl glow-purple">
              <Disc3 className="w-16 h-16 animate-spin [animation-duration:10s]" />
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                ¡LA PISTA ESTÁ ABIERTA!
              </h1>
              <p className="text-base sm:text-lg text-zinc-400">
                Sé el primero en pedir tu canción favorita para cantar o bailar en{" "}
                <span className="text-purple-300 font-bold">{data.event.tenantName}</span>
              </p>
            </div>

            {/* QR Gigante en el Centro */}
            <div className="p-6 rounded-3xl bg-zinc-900/80 border border-purple-500/30 inline-block shadow-2xl space-y-3">
              <div className="p-4 bg-white rounded-2xl inline-block shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.qr.dataUrl}
                  alt="Escanea para pedir"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
              </div>
              <div className="text-xs font-bold text-white tracking-wider">
                📱 APUNTA LA CÁMARA DE TU CELULAR AQUÍ
              </div>
              <p className="text-[11px] text-zinc-400">
                Catálogo en vivo sin descargas ni registros
              </p>

              {data.branding?.wifiSsid && (
                <div className="pt-2 border-t border-zinc-800 text-xs text-zinc-300 flex items-center justify-center gap-1.5">
                  <span className="text-cyan-400 font-bold">📶 Wi-Fi:</span>
                  <span className="font-bold text-white">{data.branding.wifiSsid}</span>
                  {data.branding.wifiPassword && (
                    <span className="font-mono text-zinc-400">({data.branding.wifiPassword})</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Social Lounge Polaroid Showcase */}
        {approvedPhotos.length > 0 && (
          <div className="hidden xl:block absolute -bottom-4 right-0 z-20 w-60 bg-zinc-950/95 border-2 border-pink-500/40 rounded-2xl p-3 shadow-2xl shadow-pink-500/20 rotate-1 hover:rotate-0 transition-all animate-fadeIn">
            <div className="flex items-center justify-between text-[10px] font-bold text-pink-400 uppercase mb-2">
              <span className="flex items-center gap-1">
                <Camera className="w-3 h-3" />
                <span>Social Lounge</span>
              </span>
              <span className="font-mono text-zinc-400">
                {approvedPhotos[currentPhotoIdx % approvedPhotos.length]?.table.label}
              </span>
            </div>
            <div className="aspect-square rounded-xl overflow-hidden bg-black border border-zinc-800">
              <img
                src={approvedPhotos[currentPhotoIdx % approvedPhotos.length]?.imageUrl}
                alt="Foto del público"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mt-2 text-center">
              {approvedPhotos[currentPhotoIdx % approvedPhotos.length]?.caption && (
                <p className="text-xs text-white italic line-clamp-2">
                  &ldquo;{approvedPhotos[currentPhotoIdx % approvedPhotos.length]?.caption}&rdquo;
                </p>
              )}
              <span className="text-[10px] text-pink-300 font-semibold block mt-0.5">
                &mdash; {approvedPhotos[currentPhotoIdx % approvedPhotos.length]?.guestName}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* 3. Barra Inferior (Próximos Temas & QR Lateral) */}
      <footer className="z-10 pt-4 border-t border-zinc-800/60 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Próximos Temas en Cola */}
        <div className="flex-1 min-w-0 space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest flex-wrap">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>
              {isKaraoke
                ? `🎤 Turnos de Karaoke (${data.upcomingQueue.length} mesas en espera)`
                : `A continuación en la cola (${data.upcomingQueue.length})`}
            </span>
            {data.policy?.queuePaused && (
              <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 text-[10px] font-bold animate-pulse">
                ⏸ Pedidos en pausa momentánea
              </span>
            )}
          </div>

          {data.upcomingQueue.length === 0 ? (
            <p className="text-xs text-zinc-500">
              {isKaraoke
                ? "No hay más mesas en espera para cantar. ¡Sé el primero en pedir desde tu mesa!"
                : "No hay más canciones en espera. ¡Envía tu pedido desde tu mesa!"}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5 justify-center md:justify-start">
              {data.upcomingQueue.map((item) => (
                <div
                  key={item.id}
                  className={`px-3.5 py-2 rounded-xl flex items-center gap-2.5 text-xs shadow-md border ${
                    item.order === 1 && isKaraoke
                      ? "bg-gradient-to-r from-cyan-950/80 to-zinc-900 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse"
                      : "bg-zinc-900/90 border-zinc-800"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md font-mono font-bold flex items-center justify-center text-[10px] ${
                      item.order === 1 && isKaraoke
                        ? "bg-cyan-400 text-black font-black"
                        : "bg-purple-600/30 text-purple-300"
                    }`}
                  >
                    #{item.order}
                  </span>
                  <div className="truncate max-w-[160px]">
                    <div className="font-bold text-white truncate">{item.title}</div>
                    <div className="text-[10px] text-zinc-400 truncate">{item.artist}</div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                      item.order === 1 && isKaraoke
                        ? "bg-cyan-950 text-cyan-200 border-cyan-700 font-bold"
                        : "bg-zinc-950 text-purple-300 border-zinc-800"
                    }`}
                  >
                    {item.order === 1 && isKaraoke ? `🎤 Siguiente: ${item.table}` : item.table}
                  </span>
                  {item.isFastPass && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 shrink-0">
                      ⭐ VIP
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QR Escaneable en la Esquina */}
        {track && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/90 border border-purple-500/30 shadow-xl shrink-0">
            <div className="p-1.5 bg-white rounded-xl shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.qr.dataUrl}
                alt="QR en pantalla"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
              />
            </div>
            <div className="text-left space-y-0.5">
              <div className="text-[11px] font-black text-white flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>¿QUÉ QUIERES ESCUCHAR?</span>
              </div>
              <p className="text-[10px] text-zinc-400 max-w-[140px]">
                Escanea desde tu mesa con tu celular y pide tu tema
              </p>
            </div>
          </div>
        )}
      </footer>

      {/* 🚀 Capa de Reacciones Flotantes en Vivo (SSE 0ms) */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {reactions.map((rx) => (
          <div
            key={rx.id}
            className="absolute bottom-0 flex flex-col items-center animate-reactionFloat"
            style={{
              left: `${rx.xPercent}%`,
            }}
          >
            <span className="text-4xl sm:text-5xl filter drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] select-none">
              {rx.reaction}
            </span>
            {rx.tableLabel && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/80 text-zinc-200 border border-white/20 mt-1 whitespace-nowrap shadow-lg">
                {rx.tableLabel}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ⭐ Spotlight de Foto Destacada en Pantalla Gigante (12s) */}
      {featuredPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="max-w-2xl w-full bg-gradient-to-b from-amber-950/90 via-zinc-950 to-zinc-950 border-4 border-amber-500 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_0_70px_rgba(245,158,11,0.5)] text-center relative overflow-hidden">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-xs sm:text-sm font-black tracking-widest uppercase animate-bounce">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>⭐ MOMENTO DESTACADO DE LA NOCHE ⭐</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>

            <div className="aspect-square max-h-[55vh] mx-auto rounded-2xl overflow-hidden bg-black border-2 border-amber-500/40 shadow-2xl relative">
              <img
                src={featuredPhoto.photo.imageUrl}
                alt="Foto Destacada"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md text-amber-300 border border-amber-500/50 text-xs font-mono font-bold">
                {featuredPhoto.photo.table.label}
              </div>
            </div>

            <div className="space-y-2">
              {featuredPhoto.photo.caption && (
                <p className="text-xl sm:text-2xl font-black text-white italic drop-shadow-md">
                  &ldquo;{featuredPhoto.photo.caption}&rdquo;
                </p>
              )}
              <p className="text-sm font-bold text-amber-300">
                de {featuredPhoto.photo.guestName}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 👏 Aplausómetro Gigante en Pantalla */}
      {applause && applause.active && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="max-w-2xl w-full bg-zinc-950 border-4 border-amber-500 rounded-3xl p-8 space-y-6 shadow-[0_0_70px_rgba(245,158,11,0.4)] text-center relative overflow-hidden">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/50 text-xs sm:text-sm font-black tracking-widest uppercase animate-bounce">
                <span>👏 APLAUSÓMETRO EN VIVO</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                ¡CALIFIQUEN A: {applause.targetTableLabel}!
              </h2>
              <p className="text-sm sm:text-base text-zinc-300 font-medium">
                ¡Toca repetidamente el botón de aplausos en tu celular para subir la barra!
              </p>
            </div>

            {/* Barra Medidora Gigante */}
            <div className="space-y-2">
              <div className="w-full h-12 sm:h-16 bg-zinc-900 rounded-2xl overflow-hidden border-2 border-zinc-800 p-1.5 relative">
                <div
                  className="h-full rounded-xl bg-gradient-to-r from-yellow-500 via-amber-500 to-red-500 transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.6)]"
                  style={{ width: `${applause.score}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center font-black font-mono text-xl sm:text-2xl text-white drop-shadow-md">
                  {Math.round(applause.score)}% DE HYPE
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm font-black text-amber-400">
                <span>🔥 TIBIO</span>
                <span>🔥🔥 ¡FIESTA TOTAL!</span>
                <span>💥💥 ¡LEGENDARIO!</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎰 Ruleta de la Suerte de Mesas */}
      {roulette && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="max-w-xl w-full bg-gradient-to-b from-emerald-950/90 via-zinc-950 to-zinc-950 border-4 border-emerald-500 rounded-3xl p-8 space-y-6 shadow-[0_0_70px_rgba(16,185,129,0.5)] text-center relative overflow-hidden">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs sm:text-sm font-black tracking-widest uppercase animate-bounce">
                <span>🎰 RULETA DE LA SUERTE</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                {roulette.spinning ? "¡SORTEANDO ENTRE LAS MESAS...!" : "🎉 ¡TENEMOS MESA GANADORA! 🎉"}
              </h2>
            </div>

            {/* Display de la Ruleta */}
            <div className="p-8 rounded-2xl bg-zinc-900 border-2 border-emerald-500/50 shadow-inner flex flex-col items-center justify-center min-h-[160px]">
              <span
                className={`text-4xl sm:text-6xl font-black tracking-wider transition-all duration-100 ${
                  roulette.spinning
                    ? "text-emerald-400 scale-105"
                    : "text-amber-300 scale-125 animate-bounce drop-shadow-[0_0_25px_rgba(245,158,11,0.8)]"
                }`}
              >
                {roulette.spinning
                  ? roulette.tables[roulette.currentIndex % roulette.tables.length]
                  : roulette.winner}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-black/60 border border-emerald-500/30">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Premio:</p>
              <p className="text-base sm:text-lg font-black text-emerald-300 mt-0.5">
                {roulette.prize}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estilos de animación para reacciones flotantes */}
      <style jsx global>{`
        @keyframes reactionFloat {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          15% { opacity: 1; transform: translateY(-15vh) scale(1.2); }
          85% { opacity: 1; transform: translateY(-75vh) scale(1); }
          100% { transform: translateY(-95vh) scale(0.8); opacity: 0; }
        }
        .animate-reactionFloat {
          animation: reactionFloat 3.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
