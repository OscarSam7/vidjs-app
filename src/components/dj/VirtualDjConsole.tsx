"use client";

import React, { useState, useEffect, useRef, useMemo, memo } from "react";
import {
  Play,
  Pause,
  Sliders,
  RotateCcw,
  Zap,
  Volume2,
  VolumeX,
  Disc3,
  Music,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Flame,
  Radio,
  Clock,
  Layers,
  Repeat,
  Headphones,
  CheckCircle2,
  Search,
  Youtube,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { calculateCrossfaderGains, djSoundEffects } from "@/lib/audio/dj-audio-engine";

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

interface VirtualDjConsoleProps {
  currentPlaying: QueueEntryData | null;
  queue: QueueEntryData[];
  pendingRequests: SongRequestData[];
  onPlayQueueEntry: (queueEntryId: string) => Promise<void>;
  onNextTrack: () => Promise<void>;
  showFeedback: (type: "success" | "error" | "info", text: string) => void;
  crossfaderValue: number;
  setCrossfaderValue: (val: number) => void;
}

interface DeckPlayerProps {
  deckId: "A" | "B";
  videoId: string | null;
  isPlaying: boolean;
  effectiveVol: number;
  pitch: number;
  isLoading: boolean;
  isEjected: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

interface StableIframeProps {
  deckId: "A" | "B";
  videoId: string | null;
  isEjected: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

// Iframe inmutable: NUNCA se navega a about:blank durante la sesión para no reiniciar el pipeline de audio del navegador
const StableIframe = memo(
  function StableIframe({ deckId, videoId, isEjected, iframeRef }: StableIframeProps) {
    const src = videoId
      ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0&widgetid=${deckId === "A" ? 1 : 2}`
      : "about:blank";

    const isVisible = Boolean(videoId) && !isEjected;

    return (
      <iframe
        ref={iframeRef}
        id={`deck-${deckId.toLowerCase()}-iframe`}
        src={src}
        title={`Deck ${deckId} Audio Player`}
        className={`w-full h-full border-0 pointer-events-auto transition-opacity duration-200 ${
          isVisible ? "opacity-100 relative z-0" : "opacity-0 pointer-events-none absolute inset-0 -z-10"
        }`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    );
  },
  (prev, next) => prev.deckId === next.deckId && prev.videoId === next.videoId && prev.isEjected === next.isEjected
);

// Componente de reproductor 100% aislado y memoizado.
// Evita de raíz que la recarga, desmontaje o limpieza de una bandeja afecte a la otra.
const DeckPlayer = memo(
  function DeckPlayer({
    deckId,
    videoId,
    isPlaying,
    effectiveVol,
    pitch,
    isLoading,
    isEjected,
    iframeRef,
  }: DeckPlayerProps) {
    const isA = deckId === "A";
    const borderColor = isA ? "border-purple-500/40" : "border-cyan-500/40";
    const textColor = isA ? "text-purple-300" : "text-cyan-300";
    const spinnerColor = isA ? "text-purple-400" : "text-cyan-400";
    const emptyText = isA
      ? "Bandeja A vacía — Lista para cargar"
      : "Bandeja B vacía — Lista para cargar";
    const chLabel = isA ? "CH 1" : "CH 2";
    const hasActiveTrack = Boolean(videoId) && !isEjected;

    return (
      <div
        className={`relative aspect-video max-h-36 w-full rounded-xl overflow-hidden border ${borderColor} bg-black shadow-inner`}
      >
        <StableIframe deckId={deckId} videoId={videoId} isEjected={isEjected} iframeRef={iframeRef} />

        {/* Overlay HUD cuando hay pista activa */}
        {hasActiveTrack && (
          <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
            <span
              className={`px-2 py-0.5 rounded bg-black/80 ${textColor} text-[9px] font-mono font-bold border ${borderColor} backdrop-blur-xs`}
            >
              {chLabel} &bull; VOL: {effectiveVol}%
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-bold backdrop-blur-xs ${
                isPlaying
                  ? isA
                    ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                    : "bg-cyan-950/80 text-cyan-400 border border-cyan-500/40"
                  : "bg-zinc-900/80 text-zinc-400 border border-zinc-700"
              }`}
            >
              {isPlaying ? "▶ PLAYING" : "⏸ PAUSED"}
            </span>
          </div>
        )}

        {/* Overlay cuando está vacía o cargando */}
        {!hasActiveTrack && (
          <div
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-3 ${spinnerColor} bg-zinc-950/90 space-y-1 text-center`}
          >
            {isLoading ? (
              <>
                <Disc3 className={`w-6 h-6 animate-spin ${spinnerColor}`} />
                <span className="text-[11px] font-bold">
                  {isA ? "Buscando audio en YouTube..." : "Cargando audio desde YouTube..."}
                </span>
              </>
            ) : (
              <>
                <Music className="w-6 h-6 text-zinc-600" />
                <span className="text-[11px] text-zinc-400">{emptyText}</span>
              </>
            )}
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    // Si ninguna de las propiedades exclusivas de esta bandeja cambió, NO re-renderizar
    return (
      prev.deckId === next.deckId &&
      prev.videoId === next.videoId &&
      prev.isPlaying === next.isPlaying &&
      prev.effectiveVol === next.effectiveVol &&
      prev.pitch === next.pitch &&
      prev.isLoading === next.isLoading &&
      prev.isEjected === next.isEjected
    );
  }
);

export default function VirtualDjConsole({
  currentPlaying,
  queue,
  pendingRequests,
  onPlayQueueEntry,
  onNextTrack,
  showFeedback,
  crossfaderValue,
  setCrossfaderValue,
}: VirtualDjConsoleProps) {
  // ==================== MASTER AUDIO CABINA STATE ====================
  const [isMasterMuted, setIsMasterMuted] = useState(false);
  const [masterVolume, setMasterVolume] = useState(100);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // ==================== DECK A STATE ====================
  const [isEjectedA, setIsEjectedA] = useState(false);
  const [deckTrackA, setDeckTrackA] = useState<SongRequestData | null>(() => currentPlaying?.songRequest || null);
  const [manualTrackA, setManualTrackA] = useState<SongRequestData | null>(null);
  const [isPlayingA, setIsPlayingA] = useState(Boolean(currentPlaying));
  const [playbackSecondsA, setPlaybackSecondsA] = useState(0);
  const [pitchA, setPitchA] = useState(0); // -8% a +8%
  const [cuePointA, setCuePointA] = useState(0);
  const [isKeyLockA, setIsKeyLockA] = useState(true);
  const [activeLoopA, setActiveLoopA] = useState<number | null>(null);
  const [hotCuesA, setHotCuesA] = useState<Record<number, number>>({ 1: 0, 2: 30, 3: 60, 4: 90 });
  const [gainA, setGainA] = useState(80);
  const [eqHiA, setEqHiA] = useState(0);
  const [eqMidA, setEqMidA] = useState(0);
  const [eqLowA, setEqLowA] = useState(0);
  const [bassKillA, setBassKillA] = useState(false);
  const [channelVolA, setChannelVolA] = useState(100);
  const [isPflA, setIsPflA] = useState(false);
  const [videoIdA, setVideoIdA] = useState<string | null>(null);
  const [isLoadingVideoA, setIsLoadingVideoA] = useState(false);
  const iframeRefA = useRef<HTMLIFrameElement | null>(null);
  const [isSelectorOpenA, setIsSelectorOpenA] = useState(false);
  const [searchQueryA, setSearchQueryA] = useState("");
  const [searchResultsA, setSearchResultsA] = useState<any[]>([]);
  const [isSearchingA, setIsSearchingA] = useState(false);
  const searchRequestIdA = useRef(0);

  // ==================== DECK B STATE ====================
  const [isEjectedB, setIsEjectedB] = useState(false);
  const [selectedQueueIdB, setSelectedQueueIdB] = useState<string | null>(null);
  const [deckTrackB, setDeckTrackB] = useState<SongRequestData | null>(() => queue?.[0]?.songRequest || null);
  const [deckQueueEntryIdB, setDeckQueueEntryIdB] = useState<string | null>(() => queue?.[0]?.id || null);
  const [manualTrackB, setManualTrackB] = useState<SongRequestData | null>(null);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [playbackSecondsB, setPlaybackSecondsB] = useState(0);
  const [pitchB, setPitchB] = useState(0); // -8% a +8%
  const [cuePointB, setCuePointB] = useState(0);
  const [isKeyLockB, setIsKeyLockB] = useState(true);
  const [isSyncedB, setIsSyncedB] = useState(false);
  const [activeLoopB, setActiveLoopB] = useState<number | null>(null);
  const [hotCuesB, setHotCuesB] = useState<Record<number, number>>({ 1: 0, 2: 15, 3: 45, 4: 75 });
  const [gainB, setGainB] = useState(80);
  const [eqHiB, setEqHiB] = useState(0);
  const [eqMidB, setEqMidB] = useState(0);
  const [eqLowB, setEqLowB] = useState(0);
  const [bassKillB, setBassKillB] = useState(false);
  const [channelVolB, setChannelVolB] = useState(100);
  const [isPflB, setIsPflB] = useState(true);
  const [isSelectorOpenB, setIsSelectorOpenB] = useState(false);
  const [videoIdB, setVideoIdB] = useState<string | null>(null);
  const [isLoadingVideoB, setIsLoadingVideoB] = useState(false);
  const iframeRefB = useRef<HTMLIFrameElement | null>(null);
  const [searchQueryB, setSearchQueryB] = useState("");
  const [searchResultsB, setSearchResultsB] = useState<any[]>([]);
  const [isSearchingB, setIsSearchingB] = useState(false);
  const searchRequestIdB = useRef(0);

  // ==================== AUTO-ENGANCHE / TRANSITION ENGINE ====================
  const [isEnganchando, setIsEnganchando] = useState(false);
  const [engancheDirection, setEngancheDirection] = useState<"A_TO_B" | "B_TO_A">("A_TO_B");
  const [transitionDuration, setTransitionDuration] = useState<4 | 8 | 16>(8); // beats (aprox 3s, 6s, 12s)
  const [transitionProgress, setTransitionProgress] = useState(0); // 0 a 100%
  const engancheIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== BEAT TICK ANIMATION & PHASE ====================
  const [beatPhase, setBeatPhase] = useState(1); // 1, 2, 3, 4

  // Determinar Track A (aislado por estado explícito)
  const trackA = isEjectedA ? null : (deckTrackA || manualTrackA || null);
  const trackADuration = trackA?.song?.durationSeconds || 210;
  const baseBpmA = trackA?.song?.bpm || 124;
  const effectiveBpmA = Number((baseBpmA * (1 + pitchA / 100)).toFixed(1));

  // Determinar Track B (aislado por estado explícito, sin saltos sorpresivos)
  const effectiveQueueEntryB =
    isEjectedB || selectedQueueIdB === "EMPTY"
      ? null
      : selectedQueueIdB
      ? queue.find((q) => q.id === selectedQueueIdB) || null
      : queue[0] || null;
  const trackB = isEjectedB ? null : (deckTrackB || manualTrackB || null);
  const trackBDuration = trackB?.song?.durationSeconds || 210;
  const baseBpmB = trackB?.song?.bpm || 126;
  const effectiveBpmB = Number((baseBpmB * (1 + pitchB / 100)).toFixed(1));

  // Cálculo de ganancias de crossfader de potencia constante
  const crossfaderGains = calculateCrossfaderGains(crossfaderValue);

  // Cálculo de volumen efectivo dinámico para YouTube (0 a 100)
  const effectiveVolA = isMasterMuted
    ? 0
    : Math.min(
        100,
        Math.max(
          0,
          Math.round(
            (channelVolA / 100) *
              (gainA / 100) *
              crossfaderGains.gainA *
              (bassKillA ? 0.75 : 1) *
              (masterVolume / 100) *
              100
          )
        )
      );

  const effectiveVolB = isMasterMuted
    ? 0
    : Math.min(
        100,
        Math.max(
          0,
          Math.round(
            (channelVolB / 100) *
              (gainB / 100) *
              crossfaderGains.gainB *
              (bassKillB ? 0.75 : 1) *
              (masterVolume / 100) *
              100
          )
        )
      );

  // Enviar comando a iframe de YouTube por postMessage
  const sendPlayerCommand = (
    iframe: HTMLIFrameElement | null,
    func: string,
    args: any[] = []
  ) => {
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func,
          args,
        }),
        "*"
      );
    } catch {
      // Ignorar fallos de postMessage
    }
  };

  // Extraer video ID de notas o URL de YouTube
  const extractYoutubeId = (str: string | null | undefined): string | null => {
    if (!str) return null;
    const clean = str.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = clean.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Clave representativa única de un track para evitar resoluciones y recargas no deseadas
  const getTrackKey = (track: SongRequestData | null, explicitId?: string | null): string | null => {
    if (!track) return null;
    const id = track.id || "";
    const songId = track.song?.id || "";
    const title = track.song?.title || track.customTitle || "";
    const artist = track.song?.artist?.name || track.customArtist || "";
    const ytId = explicitId || track.youtubeVideoId || extractYoutubeId(track.notes) || "";
    return `${id}::${songId}::${title}::${artist}::${ytId}`;
  };

  // Desbloquear audio del navegador
  const unlockAudioA = () => {
    setAudioUnlocked(true);
    setIsMasterMuted(false);
    if (iframeRefA.current) {
      sendPlayerCommand(iframeRefA.current, "unMute");
      sendPlayerCommand(iframeRefA.current, "setVolume", [effectiveVolA]);
      if (isPlayingA) sendPlayerCommand(iframeRefA.current, "playVideo");
    }
  };

  const unlockAudioB = () => {
    setAudioUnlocked(true);
    setIsMasterMuted(false);
    if (iframeRefB.current) {
      sendPlayerCommand(iframeRefB.current, "unMute");
      sendPlayerCommand(iframeRefB.current, "setVolume", [effectiveVolB]);
      if (isPlayingB) sendPlayerCommand(iframeRefB.current, "playVideo");
    }
  };

  const unlockAudio = () => {
    setAudioUnlocked(true);
    setIsMasterMuted(false);
    if (iframeRefA.current) {
      sendPlayerCommand(iframeRefA.current, "unMute");
      sendPlayerCommand(iframeRefA.current, "setVolume", [effectiveVolA]);
      if (isPlayingA) sendPlayerCommand(iframeRefA.current, "playVideo");
    }
    if (iframeRefB.current) {
      sendPlayerCommand(iframeRefB.current, "unMute");
      sendPlayerCommand(iframeRefB.current, "setVolume", [effectiveVolB]);
      if (isPlayingB) sendPlayerCommand(iframeRefB.current, "playVideo");
    }
  };

  // Formato mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Formato restante -mm:ss
  const formatRemaining = (current: number, total: number) => {
    const rem = Math.max(0, total - current);
    return `-${formatTime(rem)}`;
  };

  // Temporizador Deck A
  useEffect(() => {
    if (!isPlayingA) return;
    const timer = setInterval(() => {
      setPlaybackSecondsA((prev) => {
        if (activeLoopA !== null && prev >= cuePointA + activeLoopA * 2) {
          return cuePointA;
        }
        if (prev >= trackADuration) {
          return trackADuration;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlayingA, trackADuration, activeLoopA, cuePointA]);

  // Temporizador Deck B
  useEffect(() => {
    if (!isPlayingB) return;
    const timer = setInterval(() => {
      setPlaybackSecondsB((prev) => {
        if (activeLoopB !== null && prev >= cuePointB + activeLoopB * 2) {
          return cuePointB;
        }
        if (prev >= trackBDuration) {
          return trackBDuration;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlayingB, trackBDuration, activeLoopB, cuePointB]);

  // Metrónomo visual de compás (Phase Beat 1-2-3-4)
  useEffect(() => {
    if (!isPlayingA && !isPlayingB) return;
    const intervalMs = Math.round(60000 / (effectiveBpmA || 124));
    const beatTimer = setInterval(() => {
      setBeatPhase((prev) => (prev % 4) + 1);
    }, intervalMs);
    return () => clearInterval(beatTimer);
  }, [isPlayingA, isPlayingB, effectiveBpmA]);

  // Sincronizar BPM con botón SYNC en Deck B
  const handleSyncDeckB = () => {
    if (!trackB) return;
    // Calcular el porcentaje de pitch necesario para igualar el BPM de Deck A
    const neededPitch = ((effectiveBpmA / baseBpmB) - 1) * 100;
    const clampedPitch = Math.max(-16, Math.min(16, neededPitch));
    setPitchB(Number(clampedPitch.toFixed(2)));
    setIsSyncedB(true);
    djSoundEffects.playBeatSyncTone();
    showFeedback("success", `⚡ Deck B sincronizado a ${effectiveBpmA} BPM`);
  };

  // Sincronizar BPM con botón SYNC en Deck A
  const handleSyncDeckA = () => {
    if (!trackA) return;
    const neededPitch = ((effectiveBpmB / baseBpmA) - 1) * 100;
    const clampedPitch = Math.max(-16, Math.min(16, neededPitch));
    setPitchA(Number(clampedPitch.toFixed(2)));
    djSoundEffects.playBeatSyncTone();
    showFeedback("success", `⚡ Deck A sincronizado a ${effectiveBpmB} BPM`);
  };

  // Refs para recordar la pista activa y evitar recargas o reinicios no deseados entre bandejas
  const prevCurrentPlayingIdRef = useRef<string | null>(currentPlaying?.id || null);
  const prevTrackBKeyRef = useRef<string | null>(null);
  const activeVideoIdARef = useRef<string | null>(null);
  const activeVideoIdBRef = useRef<string | null>(null);

  // Cargar pista en DECK A de forma completamente aislada
  const loadTrackIntoDeckA = async (track: SongRequestData, explicitVideoId?: string | null) => {
    searchRequestIdA.current++;
    const reqId = searchRequestIdA.current;
    if (iframeRefA.current) {
      sendPlayerCommand(iframeRefA.current, "stopVideo");
      sendPlayerCommand(iframeRefA.current, "pauseVideo");
    }
    prevCurrentPlayingIdRef.current = currentPlaying?.id || null;
    const directId =
      explicitVideoId ||
      track.youtubeVideoId ||
      extractYoutubeId(track.notes);
    activeVideoIdARef.current = null;
    setVideoIdA(null);
    setIsPlayingA(false);
    setPlaybackSecondsA(0);
    setActiveLoopA(null);
    setIsEjectedA(false);
    setDeckTrackA(track);
    setManualTrackA(track);

    if (directId) {
      activeVideoIdARef.current = directId;
      setVideoIdA(directId);
      setIsLoadingVideoA(false);
      setIsPlayingA(true);
      unlockAudioA();
      showFeedback("success", `🎬 Cargado "${track.song?.title || track.customTitle}" en Deck A`);
      return;
    }

    const title = track.song?.title || track.customTitle || "";
    const artist = track.song?.artist?.name || track.customArtist || "";
    const query = `${title} ${artist}`.trim();

    if (!query) {
      setIsLoadingVideoA(false);
      return;
    }

    setIsLoadingVideoA(true);
    try {
      const res = await fetch(`/api/v1/karaoke/search?q=${encodeURIComponent(query)}&isKaraoke=false`);
      const data = await res.json();
      if (searchRequestIdA.current === reqId) {
        if (data.success && data.data?.results?.length > 0) {
          const resolvedId = data.data.results[0].id;
          activeVideoIdARef.current = resolvedId;
          setVideoIdA(resolvedId);
          setIsPlayingA(true);
          unlockAudioA();
          showFeedback("success", `🎬 Cargado "${track.song?.title || track.customTitle}" en Deck A`);
        } else {
          showFeedback("error", `No se encontró audio en YouTube para "${title}"`);
        }
      }
    } catch {
      if (searchRequestIdA.current === reqId) {
        showFeedback("error", "Error buscando audio para Deck A");
      }
    } finally {
      if (searchRequestIdA.current === reqId) {
        setIsLoadingVideoA(false);
      }
    }
  };

  // Cargar pista en DECK B de forma completamente aislada
  const loadTrackIntoDeckB = async (track: SongRequestData, queueEntryId?: string | null, explicitVideoId?: string | null) => {
    searchRequestIdB.current++;
    const reqId = searchRequestIdB.current;
    if (iframeRefB.current) {
      sendPlayerCommand(iframeRefB.current, "stopVideo");
      sendPlayerCommand(iframeRefB.current, "pauseVideo");
    }
    const directId =
      explicitVideoId ||
      track.youtubeVideoId ||
      extractYoutubeId(track.notes);
    const trackKey = getTrackKey(track, directId);
    prevTrackBKeyRef.current = trackKey;
    activeVideoIdBRef.current = null;
    setVideoIdB(null);
    setIsPlayingB(false);
    setPlaybackSecondsB(0);
    setActiveLoopB(null);
    setIsEjectedB(false);
    setDeckTrackB(track);
    setDeckQueueEntryIdB(queueEntryId || null);

    if (queueEntryId) {
      setSelectedQueueIdB(queueEntryId);
      setManualTrackB(null);
    } else {
      setSelectedQueueIdB(null);
      setManualTrackB(track);
    }

    if (directId) {
      activeVideoIdBRef.current = directId;
      setVideoIdB(directId);
      setIsLoadingVideoB(false);
      setIsPlayingB(true);
      unlockAudioB();
      showFeedback("success", `🎬 Cargado "${track.song?.title || track.customTitle}" en Deck B`);
      return;
    }

    const title = track.song?.title || track.customTitle || "";
    const artist = track.song?.artist?.name || track.customArtist || "";
    const query = `${title} ${artist}`.trim();

    if (!query) {
      setIsLoadingVideoB(false);
      return;
    }

    setIsLoadingVideoB(true);
    try {
      const res = await fetch(`/api/v1/karaoke/search?q=${encodeURIComponent(query)}&isKaraoke=false`);
      const data = await res.json();
      if (searchRequestIdB.current === reqId) {
        if (data.success && data.data?.results?.length > 0) {
          const resolvedId = data.data.results[0].id;
          activeVideoIdBRef.current = resolvedId;
          setVideoIdB(resolvedId);
          setIsPlayingB(true);
          unlockAudioB();
          showFeedback("success", `🎬 Cargado "${track.song?.title || track.customTitle}" en Deck B`);
        } else {
          showFeedback("error", `No se encontró audio en YouTube para "${title}"`);
        }
      }
    } catch {
      if (searchRequestIdB.current === reqId) {
        showFeedback("error", "Error buscando audio para Deck B");
      }
    } finally {
      if (searchRequestIdB.current === reqId) {
        setIsLoadingVideoB(false);
      }
    }
  };

  // Limpiar / Expulsar pista de DECK A (congelamiento silencioso sin recarga de DOM)
  const handleClearDeckA = () => {
    searchRequestIdA.current++;
    if (iframeRefA.current) {
      sendPlayerCommand(iframeRefA.current, "pauseVideo");
      sendPlayerCommand(iframeRefA.current, "mute");
    }
    prevCurrentPlayingIdRef.current = currentPlaying?.id || null;
    activeVideoIdARef.current = null;
    setIsEjectedA(true);
    setDeckTrackA(null);
    setManualTrackA(null);
    setIsPlayingA(false);
    setPlaybackSecondsA(0);
    setActiveLoopA(null);
    setIsLoadingVideoA(false);
  };

  // Limpiar / Expulsar pista de DECK B (congelamiento silencioso sin recarga de DOM)
  const handleClearDeckB = () => {
    searchRequestIdB.current++;
    if (iframeRefB.current) {
      sendPlayerCommand(iframeRefB.current, "pauseVideo");
      sendPlayerCommand(iframeRefB.current, "mute");
    }
    prevTrackBKeyRef.current = null;
    activeVideoIdBRef.current = null;
    setIsEjectedB(true);
    setDeckTrackB(null);
    setDeckQueueEntryIdB(null);
    setManualTrackB(null);
    setSelectedQueueIdB("EMPTY");
    setIsPlayingB(false);
    setPlaybackSecondsB(0);
    setActiveLoopB(null);
    setIsLoadingVideoB(false);
    setIsSyncedB(false);
  };

  // Carga inicial no reactiva: Solo monta los temas iniciales si las bandejas están vacías y no expulsadas
  const initialLoadedA = useRef(false);
  const initialLoadedB = useRef(false);

  useEffect(() => {
    if (!initialLoadedA.current && currentPlaying?.songRequest && !isEjectedA && !deckTrackA) {
      initialLoadedA.current = true;
      loadTrackIntoDeckA(currentPlaying.songRequest, currentPlaying.youtubeVideoId);
    }
  }, [currentPlaying?.id, isEjectedA]);

  useEffect(() => {
    if (!initialLoadedB.current && queue?.[0]?.songRequest && !isEjectedB && !deckTrackB) {
      initialLoadedB.current = true;
      loadTrackIntoDeckB(queue[0].songRequest, queue[0].id, queue[0].youtubeVideoId);
    }
  }, [queue?.[0]?.id, isEjectedB]);

  // Avance de tema del servidor: solo si Deck A no tiene pista activa y no fue expulsada manualmente
  useEffect(() => {
    const currentId = currentPlaying?.id || null;
    if (currentId && currentId !== prevCurrentPlayingIdRef.current) {
      prevCurrentPlayingIdRef.current = currentId;
      if (!deckTrackA && !isEjectedA && currentPlaying?.songRequest) {
        loadTrackIntoDeckA(currentPlaying.songRequest, currentPlaying.youtubeVideoId);
      }
    }
  }, [currentPlaying?.id, deckTrackA, isEjectedA]);

  // Detección inteligente de dirección para Auto-Enganche según la bandeja que está al aire
  useEffect(() => {
    if (isEnganchando) return;
    if (isPlayingA && !isPlayingB && crossfaderValue <= 0) {
      setEngancheDirection("A_TO_B");
    } else if (isPlayingB && !isPlayingA && crossfaderValue >= 0) {
      setEngancheDirection("B_TO_A");
    }
  }, [isPlayingA, isPlayingB, crossfaderValue, isEnganchando]);

  // Sincronización de volumen y mute en Deck A
  useEffect(() => {
    if (videoIdA && iframeRefA.current) {
      sendPlayerCommand(iframeRefA.current, "setVolume", [effectiveVolA]);
      if (effectiveVolA === 0) {
        sendPlayerCommand(iframeRefA.current, "mute");
      } else {
        sendPlayerCommand(iframeRefA.current, "unMute");
      }
    }
  }, [effectiveVolA, videoIdA]);

  // Sincronización de volumen y mute en Deck B
  useEffect(() => {
    if (videoIdB && iframeRefB.current) {
      sendPlayerCommand(iframeRefB.current, "setVolume", [effectiveVolB]);
      if (effectiveVolB === 0) {
        sendPlayerCommand(iframeRefB.current, "mute");
      } else {
        sendPlayerCommand(iframeRefB.current, "unMute");
      }
    }
  }, [effectiveVolB, videoIdB]);

  // Sincronización de Play/Pausa en Deck A
  useEffect(() => {
    if (!videoIdA || !iframeRefA.current) return;
    if (isPlayingA) {
      sendPlayerCommand(iframeRefA.current, "playVideo");
      sendPlayerCommand(iframeRefA.current, "unMute");
      sendPlayerCommand(iframeRefA.current, "setVolume", [effectiveVolA]);
    } else {
      sendPlayerCommand(iframeRefA.current, "pauseVideo");
    }
  }, [isPlayingA, videoIdA, effectiveVolA]);

  // Sincronización de Play/Pausa en Deck B
  useEffect(() => {
    if (!videoIdB || !iframeRefB.current) return;
    if (isPlayingB) {
      sendPlayerCommand(iframeRefB.current, "playVideo");
      sendPlayerCommand(iframeRefB.current, "unMute");
      sendPlayerCommand(iframeRefB.current, "setVolume", [effectiveVolB]);
    } else {
      sendPlayerCommand(iframeRefB.current, "pauseVideo");
    }
  }, [isPlayingB, videoIdB, effectiveVolB]);

  // Sincronización de Pitch Fader (Playback Rate)
  useEffect(() => {
    if (!videoIdA || !iframeRefA.current) return;
    const rate = Math.max(0.5, Math.min(2.0, Number((1 + pitchA / 100).toFixed(2))));
    sendPlayerCommand(iframeRefA.current, "setPlaybackRate", [rate]);
  }, [pitchA, videoIdA]);

  useEffect(() => {
    if (!videoIdB || !iframeRefB.current) return;
    const rate = Math.max(0.5, Math.min(2.0, Number((1 + pitchB / 100).toFixed(2))));
    sendPlayerCommand(iframeRefB.current, "setPlaybackRate", [rate]);
  }, [pitchB, videoIdB]);

  // Inicialización de audio al montar iframes
  useEffect(() => {
    if (!videoIdA) return;
    const t = setTimeout(() => {
      if (iframeRefA.current) {
        sendPlayerCommand(iframeRefA.current, "unMute");
        sendPlayerCommand(iframeRefA.current, "setVolume", [effectiveVolA]);
        if (isPlayingA) sendPlayerCommand(iframeRefA.current, "playVideo");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [videoIdA]);

  useEffect(() => {
    if (!videoIdB) return;
    const t = setTimeout(() => {
      if (iframeRefB.current) {
        sendPlayerCommand(iframeRefB.current, "unMute");
        sendPlayerCommand(iframeRefB.current, "setVolume", [effectiveVolB]);
        if (isPlayingB) sendPlayerCommand(iframeRefB.current, "playVideo");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [videoIdB]);

  // Búsqueda en YouTube para cargar pista en Deck A
  const handleSearchYtA = async (query: string) => {
    if (!query.trim()) return;
    setIsSearchingA(true);
    try {
      const res = await fetch(`/api/v1/karaoke/search?q=${encodeURIComponent(query.trim())}&isKaraoke=false`);
      const data = await res.json();
      if (data.success) {
        setSearchResultsA(data.data?.results || []);
      }
    } catch {
      showFeedback("error", "Error buscando en YouTube");
    } finally {
      setIsSearchingA(false);
    }
  };

  // Búsqueda en YouTube para cargar pista en Deck B
  const handleSearchYtB = async (query: string) => {
    if (!query.trim()) return;
    setIsSearchingB(true);
    try {
      const res = await fetch(`/api/v1/karaoke/search?q=${encodeURIComponent(query.trim())}&isKaraoke=false`);
      const data = await res.json();
      if (data.success) {
        setSearchResultsB(data.data?.results || []);
      }
    } catch {
      showFeedback("error", "Error buscando en YouTube");
    } finally {
      setIsSearchingB(false);
    }
  };



  // ==================== MOTOR DE AUTO-ENGANCHE BIDIRECCIONAL ====================
  const handleStartAutoEnganche = () => {
    if (isEnganchando) return;

    if (engancheDirection === "A_TO_B") {
      if (!trackB) {
        showFeedback("error", "No hay tema cargado en Deck B para enganchar");
        return;
      }

      unlockAudioB();
      setIsPlayingB(true);
      handleSyncDeckB();
      setIsEnganchando(true);
      setTransitionProgress(0);
      showFeedback("info", `⚡ Auto-Enganche A ➔ B iniciado (${transitionDuration} compases)`);

      const totalDurationMs = transitionDuration === 4 ? 3000 : transitionDuration === 8 ? 6000 : 12000;
      const stepIntervalMs = 50;
      const totalSteps = totalDurationMs / stepIntervalMs;
      let step = 0;

      const startXfader = crossfaderValue;
      const targetXfader = 100; // Full Deck B

      if (engancheIntervalRef.current) clearInterval(engancheIntervalRef.current);

      engancheIntervalRef.current = setInterval(() => {
        step++;
        const progressRatio = step / totalSteps;
        setTransitionProgress(Math.round(progressRatio * 100));

        // Mover crossfader suavemente hacia B
        const currentVal = startXfader + (targetXfader - startXfader) * progressRatio;
        setCrossfaderValue(Math.round(currentVal));

        // BASS SWAP al 50% de la transición (Corte de bajo Deck A, entra bajo Deck B)
        if (progressRatio >= 0.5 && !bassKillA) {
          setBassKillA(true);
          setBassKillB(false);
        }

        // Culminación del enganche A -> B
        if (step >= totalSteps) {
          if (engancheIntervalRef.current) clearInterval(engancheIntervalRef.current);
          setIsEnganchando(false);
          setCrossfaderValue(100);
          setTransitionProgress(100);
          setIsPlayingA(false); // Detener Deck A
          djSoundEffects.playVinylBrake();
          setEngancheDirection("B_TO_A");

          const queueEntryId = effectiveQueueEntryB?.id;
          if (queueEntryId) {
            prevCurrentPlayingIdRef.current = queueEntryId;
            onPlayQueueEntry(queueEntryId).then(() => {
              showFeedback("success", `🎉 ¡Enganche A ➔ B completado! "${trackB.song?.title || trackB.customTitle}" al aire`);
            });
          } else {
            showFeedback("success", `🎉 ¡Enganche A ➔ B completado! Deck B al aire`);
          }
        }
      }, stepIntervalMs);
    } else {
      // B_TO_A
      if (!trackA) {
        showFeedback("error", "No hay tema cargado en Deck A para enganchar");
        return;
      }

      unlockAudioA();
      setIsPlayingA(true);
      handleSyncDeckA();
      setIsEnganchando(true);
      setTransitionProgress(0);
      showFeedback("info", `⚡ Auto-Enganche B ➔ A iniciado (${transitionDuration} compases)`);

      const totalDurationMs = transitionDuration === 4 ? 3000 : transitionDuration === 8 ? 6000 : 12000;
      const stepIntervalMs = 50;
      const totalSteps = totalDurationMs / stepIntervalMs;
      let step = 0;

      const startXfader = crossfaderValue;
      const targetXfader = -100; // Full Deck A

      if (engancheIntervalRef.current) clearInterval(engancheIntervalRef.current);

      engancheIntervalRef.current = setInterval(() => {
        step++;
        const progressRatio = step / totalSteps;
        setTransitionProgress(Math.round(progressRatio * 100));

        // Mover crossfader suavemente hacia A
        const currentVal = startXfader + (targetXfader - startXfader) * progressRatio;
        setCrossfaderValue(Math.round(currentVal));

        // BASS SWAP al 50% de la transición (Corte de bajo Deck B, entra bajo Deck A)
        if (progressRatio >= 0.5 && !bassKillB) {
          setBassKillB(true);
          setBassKillA(false);
        }

        // Culminación del enganche B -> A
        if (step >= totalSteps) {
          if (engancheIntervalRef.current) clearInterval(engancheIntervalRef.current);
          setIsEnganchando(false);
          setCrossfaderValue(-100);
          setTransitionProgress(100);
          setIsPlayingB(false); // Detener Deck B
          djSoundEffects.playVinylBrake();
          setEngancheDirection("A_TO_B");

          showFeedback("success", `🎉 ¡Enganche B ➔ A completado! "${trackA.song?.title || trackA.customTitle}" al aire`);
        }
      }, stepIntervalMs);
    }
  };

  // Cancelar Enganche en curso
  const handleCancelEnganche = () => {
    if (engancheIntervalRef.current) clearInterval(engancheIntervalRef.current);
    setIsEnganchando(false);
    showFeedback("info", "Auto-Enganche cancelado");
  };

  // Corte directo bidireccional (Hard Drop)
  const handleInstantDropCut = () => {
    if (engancheDirection === "A_TO_B") {
      if (!trackB) {
        showFeedback("error", "No hay tema cargado en Deck B para cortar");
        return;
      }
      unlockAudioB();
      djSoundEffects.playScratch();
      setCrossfaderValue(100);
      setIsPlayingA(false);
      setIsPlayingB(true);
      setEngancheDirection("B_TO_A");
      const queueEntryId = effectiveQueueEntryB?.id;
      if (queueEntryId) {
        prevCurrentPlayingIdRef.current = queueEntryId;
        onPlayQueueEntry(queueEntryId).then(() => {
          showFeedback("success", `⚡ ¡Corte Directo A ➔ B! Deck B al aire`);
        });
      } else {
        showFeedback("success", `⚡ ¡Corte Directo A ➔ B! Deck B al aire`);
      }
    } else {
      if (!trackA) {
        showFeedback("error", "No hay tema cargado en Deck A para cortar");
        return;
      }
      unlockAudioA();
      djSoundEffects.playScratch();
      setCrossfaderValue(-100);
      setIsPlayingB(false);
      setIsPlayingA(true);
      setEngancheDirection("A_TO_B");
      showFeedback("success", `⚡ ¡Corte Directo B ➔ A! Deck A al aire`);
    }
  };

  // Swap de Bajos (Intercambia Bass Kill entre A y B)
  const handleSwapBass = () => {
    setBassKillA(!bassKillA);
    setBassKillB(bassKillA);
    djSoundEffects.playCueClick();
    showFeedback("info", bassKillA ? "Bajo activo en Deck A" : "Bajo activo en Deck B");
  };

  // Nudge / Pitch Bend (Adelantar o retrasar un instante para alinear compases)
  const handleNudge = (deck: "A" | "B", dir: -1 | 1) => {
    if (deck === "A" && !trackA) return;
    if (deck === "B" && !trackB) return;
    djSoundEffects.playNudge();
    if (deck === "A") {
      const next = Math.max(0, playbackSecondsA + dir * 0.5);
      setPlaybackSecondsA(next);
      sendPlayerCommand(iframeRefA.current, "seekTo", [next, true]);
    } else {
      const next = Math.max(0, playbackSecondsB + dir * 0.5);
      setPlaybackSecondsB(next);
      sendPlayerCommand(iframeRefB.current, "seekTo", [next, true]);
    }
  };

  // CUE handler
  const handleCue = (deck: "A" | "B") => {
    if (deck === "A" && !trackA) return;
    if (deck === "B" && !trackB) return;
    djSoundEffects.playCueClick();
    if (deck === "A") {
      if (isPlayingA) {
        setIsPlayingA(false);
        setPlaybackSecondsA(cuePointA);
        sendPlayerCommand(iframeRefA.current, "pauseVideo");
        sendPlayerCommand(iframeRefA.current, "seekTo", [cuePointA, true]);
      } else {
        setCuePointA(playbackSecondsA);
        showFeedback("info", `Deck A CUE fijado en ${formatTime(playbackSecondsA)}`);
      }
    } else {
      if (isPlayingB) {
        setIsPlayingB(false);
        setPlaybackSecondsB(cuePointB);
        sendPlayerCommand(iframeRefB.current, "pauseVideo");
        sendPlayerCommand(iframeRefB.current, "seekTo", [cuePointB, true]);
      } else {
        setCuePointB(playbackSecondsB);
        showFeedback("info", `Deck B CUE fijado en ${formatTime(playbackSecondsB)}`);
      }
    }
  };

  // Hot Cue Jump
  const handleHotCue = (deck: "A" | "B", cueNum: number) => {
    if (deck === "A" && !trackA) return;
    if (deck === "B" && !trackB) return;
    djSoundEffects.playCueClick();
    if (deck === "A") {
      const targetTime = hotCuesA[cueNum] ?? 0;
      setPlaybackSecondsA(targetTime);
      sendPlayerCommand(iframeRefA.current, "seekTo", [targetTime, true]);
    } else {
      const targetTime = hotCuesB[cueNum] ?? 0;
      setPlaybackSecondsB(targetTime);
      sendPlayerCommand(iframeRefB.current, "seekTo", [targetTime, true]);
    }
  };

  // Loop toggle
  const handleToggleLoop = (deck: "A" | "B", beats: number) => {
    if (deck === "A" && !trackA) return;
    if (deck === "B" && !trackB) return;
    djSoundEffects.playCueClick();
    if (deck === "A") {
      setActiveLoopA(activeLoopA === beats ? null : beats);
    } else {
      setActiveLoopB(activeLoopB === beats ? null : beats);
    }
  };
  const isBeatMatched = Math.abs(effectiveBpmA - effectiveBpmB) <= 0.3;

  return (
    <div className="space-y-4 select-none">
      {/* ========================================================================= */}
      {/* 0. CABINA MASTER AUDIO STATUS & QUICK GAIN BAR                            */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-purple-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              AUDIO CABINA PRO
            </span>
          </div>

          <button
            onClick={() => {
              if (isMasterMuted) {
                unlockAudio();
              } else {
                setIsMasterMuted(true);
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
              isMasterMuted
                ? "bg-red-600 hover:bg-red-500 text-white animate-pulse"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
            }`}
            title="Activa o silencia la salida de audio de cabina"
          >
            {isMasterMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isMasterMuted ? "🔇 AUDIO MUTED (CLICK PARA ACTIVAR)" : "🔊 AUDIO CABINA: ACTIVO"}</span>
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-[11px] font-bold">MASTER:</span>
            <input
              type="range"
              min={0}
              max={100}
              value={masterVolume}
              onChange={(e) => {
                setMasterVolume(Number(e.target.value));
                if (isMasterMuted) setIsMasterMuted(false);
              }}
              className="w-24 accent-purple-500 cursor-pointer h-1.5 bg-zinc-800 rounded"
            />
            <span className="text-zinc-300 font-bold">{masterVolume}%</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[10px] text-zinc-400">
            <span className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800">
              CH 1: {effectiveVolA}%
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
              CH 2: {effectiveVolB}%
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DUAL BEAT-WAVEFORM & PHASE METER (BPM & BEAT MATCHING GRID)            */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl relative overflow-hidden">
        {/* Barra superior de métricas de fase */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pb-2 mb-2 border-b border-zinc-900 text-xs font-mono text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <span className="font-bold text-purple-300">DECK A:</span>
            <span className="text-white font-black">{effectiveBpmA} BPM</span>
            <span className="text-[10px] text-zinc-500">({pitchA >= 0 ? `+${pitchA}` : pitchA}%)</span>
          </div>

          {/* Central Beat Alignment Indicator */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((beat) => (
                <span
                  key={beat}
                  className={`w-3 h-3 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                    beatPhase === beat
                      ? "bg-amber-400 text-black scale-125 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {beat}
                </span>
              ))}
            </div>

            <div
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                isBeatMatched
                  ? "bg-emerald-950 text-emerald-300 border-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800"
              }`}
            >
              {isBeatMatched ? "⚡ BEAT MATCHED" : "OUT OF SYNC"}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="font-bold text-cyan-300">DECK B:</span>
            <span className="text-white font-black">{effectiveBpmB} BPM</span>
            <span className="text-[10px] text-zinc-500">({pitchB >= 0 ? `+${pitchB}` : pitchB}%)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
        </div>

        {/* Formas de Onda Duales Estilo VirtualDJ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 relative">
          {/* Waveform Deck A */}
          <div className="h-12 bg-gradient-to-r from-purple-950/40 via-purple-900/30 to-zinc-950 rounded-xl border border-purple-900/50 relative overflow-hidden flex items-center px-2">
            {/* Playhead vertical */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_white] z-20 transition-all duration-300"
              style={{
                left: `${Math.min(100, (playbackSecondsA / trackADuration) * 100)}%`,
              }}
            />
            {/* Grilla de beats animados */}
            <div className="w-full flex items-center justify-between gap-1 opacity-80">
              {Array.from({ length: 48 }).map((_, i) => {
                const height = 15 + Math.sin(i * 0.4) * 20 + Math.cos(i * 0.8) * 10;
                const isKick = i % 4 === 0;
                return (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-200 ${
                      isKick
                        ? "bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]"
                        : "bg-purple-600/60"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
            {/* Hot Cues marcadores */}
            {Object.entries(hotCuesA).map(([cue, sec]) => (
              <div
                key={cue}
                className="absolute top-1 text-[9px] font-black px-1 rounded bg-amber-400 text-black z-30"
                style={{ left: `${(sec / trackADuration) * 100}%` }}
              >
                C{cue}
              </div>
            ))}
          </div>

          {/* Waveform Deck B */}
          <div className="h-12 bg-gradient-to-r from-cyan-950/40 via-cyan-900/30 to-zinc-950 rounded-xl border border-cyan-900/50 relative overflow-hidden flex items-center px-2">
            {/* Playhead vertical */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_white] z-20 transition-all duration-300"
              style={{
                left: `${Math.min(100, (playbackSecondsB / trackBDuration) * 100)}%`,
              }}
            />
            {/* Grilla de beats animados */}
            <div className="w-full flex items-center justify-between gap-1 opacity-80">
              {Array.from({ length: 48 }).map((_, i) => {
                const height = 15 + Math.cos(i * 0.4) * 20 + Math.sin(i * 0.7) * 12;
                const isKick = i % 4 === 0;
                return (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-200 ${
                      isKick
                        ? "bg-cyan-300 shadow-[0_0_6px_rgba(6,182,212,0.8)]"
                        : "bg-cyan-600/60"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
            {/* Hot Cues marcadores */}
            {Object.entries(hotCuesB).map(([cue, sec]) => (
              <div
                key={cue}
                className="absolute top-1 text-[9px] font-black px-1 rounded bg-amber-400 text-black z-30"
                style={{ left: `${(sec / trackBDuration) * 100}%` }}
              >
                C{cue}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DUAL CONSOLE: DECK A (Col 5) | MIXER & ENGANCHE (Col 2) | DECK B (Col 5) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ========================================== */}
        {/* DECK A (Canal 1 - Violeta / Púrpura)       */}
        {/* ========================================== */}
        <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-purple-950/30 border-2 border-purple-500/40 shadow-2xl flex flex-col justify-between space-y-4 relative w-full max-w-full overflow-hidden">
          {/* Header de Deck A */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-purple-600 text-white text-[10px] font-black tracking-widest uppercase shadow-md shadow-purple-600/30">
                DECK A &bull; CANAL 1
              </span>
              <span className={`w-2 h-2 rounded-full ${trackA ? "bg-emerald-400 animate-ping" : "bg-zinc-600"}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${trackA ? "text-emerald-400" : "text-zinc-500"}`}>
                {trackA ? (isPlayingA ? "Al Aire" : "Preparado") : "Bandeja Vacía"}
              </span>
              {trackA?.table && (
                <span className="px-2 py-0.5 rounded bg-zinc-950 text-purple-300 border border-purple-500/30 text-xs font-bold">
                  {trackA.table.label}
                </span>
              )}
            </div>

            {/* Acciones Deck A: Limpiar y Cargar Pista */}
            <div className="flex items-center gap-1.5">
              {trackA && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClearDeckA();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 hover:border-red-600 text-red-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Limpiar bandeja A (Detener audio, desmontar y liberar memoria)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Limpiar</span>
                </button>
              )}

              {/* Selector de Pista Dropdown Deck A */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSelectorOpenA(!isSelectorOpenA)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-purple-950/60 border border-zinc-800 hover:border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Cargar Pista</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {isSelectorOpenA && (
                  <div className="absolute right-0 top-full mt-1.5 w-80 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-2.5 z-50 space-y-2 max-h-80 overflow-y-auto">
                    {/* Botón rápido para limpiar bandeja */}
                    {trackA && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleClearDeckA();
                          setIsSelectorOpenA(false);
                        }}
                        className="w-full text-left p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 text-red-300 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer mb-1"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>⏹ Limpiar bandeja (Expulsar pista actual)</span>
                      </button>
                    )}

                    {/* Búsqueda directa o pegado de YouTube */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSearchYtA(searchQueryA);
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        placeholder="Buscar en YouTube o pegar link..."
                        value={searchQueryA}
                        onChange={(e) => setSearchQueryA(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-hidden focus:border-purple-500"
                      />
                      <button
                        type="submit"
                        disabled={isSearchingA}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isSearchingA ? <Disc3 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      </button>
                    </form>

                    {/* Resultados de búsqueda de YouTube */}
                    {searchResultsA.length > 0 && (
                      <div className="space-y-1 border-b border-zinc-800 pb-2">
                        <div className="text-[10px] font-black uppercase text-purple-400 px-1">
                          🎬 Resultados de YouTube:
                        </div>
                        {searchResultsA.map((yt) => (
                          <button
                            key={yt.id}
                            onClick={() => {
                              loadTrackIntoDeckA(
                                {
                                  id: `yt-${yt.id}`,
                                  status: "MANUAL",
                                  customTitle: yt.parsedTitle || yt.title,
                                  customArtist: yt.parsedArtist || yt.channelTitle,
                                  notes: `https://www.youtube.com/watch?v=${yt.id}`,
                                  createdAt: new Date().toISOString(),
                                  table: { id: "dj-booth", number: 0, label: "Cabina DJ" },
                                  guestSession: null,
                                  song: {
                                    id: `yt-${yt.id}`,
                                    title: yt.parsedTitle || yt.title,
                                    durationSeconds: 210,
                                    genre: "YouTube",
                                    bpm: 124,
                                    key: "8A / Am",
                                    artist: { name: yt.parsedArtist || yt.channelTitle },
                                  },
                                  youtubeVideoId: yt.id,
                                },
                                yt.id
                              );
                              setIsSelectorOpenA(false);
                              setSearchResultsA([]);
                              setSearchQueryA("");
                            }}
                            className="w-full text-left p-1.5 rounded-lg hover:bg-purple-950/60 transition-colors flex items-center gap-2 text-xs cursor-pointer border border-transparent hover:border-purple-800"
                          >
                            <Youtube className="w-4 h-4 text-red-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-white truncate text-[11px]">
                                {yt.parsedTitle || yt.title}
                              </div>
                              <div className="text-[10px] text-zinc-400 truncate">
                                {yt.parsedArtist || yt.channelTitle}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="text-[10px] font-black uppercase text-zinc-500 px-1 pt-1">
                      Pistas en Cola ({queue.length})
                    </div>
                    {queue.length === 0 ? (
                      <div className="text-xs text-zinc-500 p-2 text-center">
                        No hay temas en cola
                      </div>
                    ) : (
                      queue.map((entry, idx) => (
                        <button
                          key={entry.id}
                          onClick={() => {
                            loadTrackIntoDeckA(entry.songRequest, entry.youtubeVideoId);
                            setIsSelectorOpenA(false);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-purple-950/60 transition-colors flex items-center justify-between gap-2 border border-transparent hover:border-purple-800 text-xs cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">
                              #{idx + 1} {entry.songRequest.song?.title || entry.songRequest.customTitle}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate">
                              {entry.songRequest.table.label} &bull;{" "}
                              {entry.songRequest.song?.bpm ? `${entry.songRequest.song.bpm} BPM` : "124 BPM"}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-purple-400 shrink-0 font-bold">
                            Cargar
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Información del Track A con altura estable */}
          <div className="min-h-[64px] flex flex-col justify-center">
            {trackA ? (
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-white truncate">
                  {trackA.song?.title || trackA.customTitle}
                </h3>
                <p className="text-xs font-semibold text-purple-300 truncate">
                  {trackA.song?.artist?.name || trackA.customArtist}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-zinc-400">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-950 text-amber-400 border border-zinc-800 font-bold">
                    KEY: {trackA.song?.key || "8A / Am"}
                  </span>
                  <span>Dur: {formatTime(trackADuration)}</span>
                  <span className="text-purple-400 font-bold">
                    {formatRemaining(playbackSecondsA, trackADuration)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-2.5 px-3 rounded-xl bg-zinc-950/60 border border-dashed border-purple-900/40 text-center text-zinc-400 text-xs">
                <span className="font-bold text-zinc-300">Bandeja A vacía</span>
                <p className="text-[10px] text-zinc-500 mt-0.5">Usa &quot;Cargar Pista&quot; para subir un tema o buscar en YouTube</p>
              </div>
            )}
          </div>

          {/* Monitor de Video & Audio YouTube Deck A (Memoized & Totalmente Aislado) */}
          <DeckPlayer
            deckId="A"
            videoId={videoIdA}
            isPlaying={isPlayingA}
            effectiveVol={effectiveVolA}
            pitch={pitchA}
            isLoading={isLoadingVideoA}
            isEjected={isEjectedA}
            iframeRef={iframeRefA}
          />

          {/* Platter / Jogwheel Deck A & Pitch Fader */}
          <div className="flex items-center justify-around sm:justify-between gap-3 sm:gap-4 py-2 w-full">
            {/* Jogwheel Giratorio */}
            <div className="relative shrink-0 mx-auto">
              <div
                className={`w-36 h-36 rounded-full bg-black border-4 border-zinc-800 shadow-[0_0_25px_rgba(168,85,247,0.2)] flex items-center justify-center relative cursor-grab active:cursor-grabbing ${
                  isPlayingA ? "animate-spin [animation-duration:3s]" : ""
                }`}
                onClick={() => {
                  if (!trackA) return;
                  unlockAudioA();
                  setIsPlayingA(!isPlayingA);
                }}
                title="Jogwheel / Vinilo Deck A - Click para Play/Pausa"
              >
                {/* Ranuras de vinilo */}
                <div className="w-28 h-28 rounded-full border border-zinc-800 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full border border-zinc-700/60 flex items-center justify-center">
                    {/* Centro HUD de Jogwheel */}
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 border-2 border-white flex flex-col items-center justify-center text-white shadow-lg">
                      <span className="text-[11px] font-black">{effectiveBpmA}</span>
                      <span className="text-[8px] font-bold opacity-80">BPM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de Pitch Bend / Nudge */}
              <div className="flex justify-center gap-2 mt-2">
                <button
                  onClick={() => handleNudge("A", -1)}
                  className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white cursor-pointer"
                  title="Empujar compás atrás"
                >
                  &laquo; NUDGE
                </button>
                <button
                  onClick={() => handleNudge("A", 1)}
                  className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white cursor-pointer"
                  title="Empujar compás adelante"
                >
                  NUDGE &raquo;
                </button>
              </div>
            </div>

            {/* Pitch / Tempo Fader Vertical Deck A */}
            <div className="flex flex-col items-center justify-between h-40 bg-zinc-950/80 p-2 rounded-xl border border-zinc-800">
              <span className="text-[9px] font-mono text-zinc-400 font-bold">+8%</span>
              <input
                type="range"
                min={-8}
                max={8}
                step={0.1}
                value={pitchA}
                onChange={(e) => setPitchA(Number(e.target.value))}
                className="h-24 -rotate-90 w-24 accent-purple-500 cursor-pointer appearance-none bg-zinc-800 rounded-lg"
              />
              <span className="text-[9px] font-mono text-zinc-400 font-bold">-8%</span>
              <button
                onClick={() => setPitchA(0)}
                className="text-[9px] font-mono text-purple-400 hover:underline cursor-pointer"
                title="Resetear Pitch a 0%"
              >
                RESET
              </button>
            </div>
          </div>

          {/* Performance Pads: Hot Cues & Auto Loop */}
          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
              <span>HOT CUES</span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((c) => (
                  <button
                    key={c}
                    onClick={() => handleHotCue("A", c)}
                    className="w-7 h-6 rounded bg-zinc-900 hover:bg-purple-600 hover:text-white text-purple-300 font-black border border-zinc-800 text-[10px] transition-colors cursor-pointer"
                    title={`Saltar a Hot Cue ${c}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
              <span>AUTO LOOP</span>
              <div className="flex gap-1.5">
                {[1, 2, 4, 8].map((beats) => (
                  <button
                    key={beats}
                    onClick={() => handleToggleLoop("A", beats)}
                    className={`px-1.5 h-6 rounded font-black border text-[9px] transition-colors cursor-pointer ${
                      activeLoopA === beats
                        ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                        : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800"
                    }`}
                  >
                    {beats}B
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Channel Strip: EQ 3-Band, Gain & Fader */}
          <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between gap-2 text-center text-[10px] font-bold text-zinc-400">
              <div className="flex-1">
                <span>HI</span>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={eqHiA}
                  onChange={(e) => setEqHiA(Number(e.target.value))}
                  className="w-full accent-purple-400 h-1 bg-zinc-800 rounded"
                />
              </div>
              <div className="flex-1">
                <span>MID</span>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={eqMidA}
                  onChange={(e) => setEqMidA(Number(e.target.value))}
                  className="w-full accent-purple-400 h-1 bg-zinc-800 rounded"
                />
              </div>
              <div className="flex-1">
                <span>LOW</span>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={bassKillA ? -50 : eqLowA}
                  onChange={(e) => setEqLowA(Number(e.target.value))}
                  disabled={bassKillA}
                  className="w-full accent-purple-400 h-1 bg-zinc-800 rounded"
                />
              </div>
              <button
                onClick={() => setBassKillA(!bassKillA)}
                className={`px-2 py-1 rounded text-[9px] font-black border transition-all cursor-pointer ${
                  bassKillA
                    ? "bg-red-600 text-white border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                }`}
                title="Kill Bass / Matar Graves en Deck A"
              >
                BASS KILL
              </button>
            </div>
          </div>

          {/* Controles de Transporte: PLAY, CUE, SYNC */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800">
            <button
              onClick={() => handleCue("A")}
              disabled={!trackA}
              className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-400 text-xs font-black transition-colors cursor-pointer shadow-sm active:scale-95 disabled:opacity-40"
            >
              CUE
            </button>
            <button
              onClick={() => {
                if (!trackA) return;
                unlockAudioA();
                setIsPlayingA(!isPlayingA);
              }}
              disabled={!trackA}
              className={`py-2.5 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-40 ${
                isPlayingA
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/30"
                  : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            >
              {isPlayingA ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlayingA ? "PAUSA" : "PLAY"}</span>
            </button>
            <button
              onClick={handleSyncDeckA}
              disabled={!trackA || !trackB}
              className="py-2.5 rounded-xl bg-zinc-900 hover:bg-emerald-950 border border-zinc-700 hover:border-emerald-600 text-emerald-400 text-xs font-black transition-colors cursor-pointer shadow-sm active:scale-95 disabled:opacity-40"
              title="Sincronizar BPM de Deck A con Deck B"
            >
              SYNC
            </button>
          </div>
        </div>

        {/* ========================================== */}
        {/* MIXER CENTRAL & MOTOR DE ENGANCHE (Col 2)   */}
        {/* ========================================== */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between items-center text-center space-y-4 w-full max-w-full overflow-hidden">
          <div className="w-full pb-2 border-b border-zinc-900">
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 flex items-center justify-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span>MEZCLA & ENGANCHE</span>
            </span>
          </div>

          {/* VU Meters Dinámicos A & B */}
          <div className="flex items-center justify-center gap-3 w-full my-1">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[8px] font-bold text-purple-400">CH 1</span>
              <div className="flex flex-col gap-0.5 h-16 w-3 bg-zinc-900 p-0.5 rounded">
                {[5, 4, 3, 2, 1].map((lvl) => (
                  <div
                    key={lvl}
                    className={`flex-1 rounded-xs transition-opacity ${
                      isPlayingA
                        ? lvl > 4
                          ? "bg-red-500 opacity-90"
                          : lvl > 2
                          ? "bg-amber-400 opacity-90"
                          : "bg-emerald-400 opacity-90"
                        : "bg-zinc-800 opacity-30"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              {/* Botón Swap Bass */}
              <button
                onClick={handleSwapBass}
                className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[9px] font-black text-amber-300 transition-colors cursor-pointer"
                title="Intercambiar bajo entre canales"
              >
                SWAP BASS
              </button>
            </div>

            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[8px] font-bold text-cyan-400">CH 2</span>
              <div className="flex flex-col gap-0.5 h-16 w-3 bg-zinc-900 p-0.5 rounded">
                {[5, 4, 3, 2, 1].map((lvl) => (
                  <div
                    key={lvl}
                    className={`flex-1 rounded-xs transition-opacity ${
                      isPlayingB
                        ? lvl > 4
                          ? "bg-red-500 opacity-90"
                          : lvl > 2
                          ? "bg-amber-400 opacity-90"
                          : "bg-emerald-400 opacity-90"
                        : "bg-zinc-800 opacity-30"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ⚡ BOTÓN PRINCIPAL: AUTO-ENGANCHE AUTOMIX BIDIRECCIONAL */}
          <div className="w-full space-y-2">
            {/* Selector de Dirección de Enganche */}
            <div className="flex items-center justify-center gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
              <button
                type="button"
                onClick={() => setEngancheDirection("A_TO_B")}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[9px] font-black tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  engancheDirection === "A_TO_B"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="Enganchar de Bandeja A hacia Bandeja B"
              >
                <span>A</span>
                <span>➔</span>
                <span>B</span>
              </button>
              <button
                type="button"
                onClick={() => setEngancheDirection("B_TO_A")}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[9px] font-black tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  engancheDirection === "B_TO_A"
                    ? "bg-gradient-to-r from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-600/30"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="Enganchar de Bandeja B hacia Bandeja A"
              >
                <span>B</span>
                <span>➔</span>
                <span>A</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[9px] font-bold text-zinc-500">
              <span>Compases:</span>
              <div className="flex gap-1">
                {[4, 8, 16].map((beats) => (
                  <button
                    key={beats}
                    onClick={() => setTransitionDuration(beats as any)}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                      transitionDuration === beats
                        ? engancheDirection === "A_TO_B"
                          ? "bg-purple-600 text-white"
                          : "bg-cyan-600 text-white"
                        : "bg-zinc-900 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {beats}B
                  </button>
                ))}
              </div>
            </div>

            {isEnganchando ? (
              <button
                onClick={handleCancelEnganche}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-lg animate-pulse flex items-center justify-center gap-1.5"
              >
                <span>CANCELAR ({transitionProgress}%)</span>
              </button>
            ) : (
              <button
                onClick={handleStartAutoEnganche}
                disabled={engancheDirection === "A_TO_B" ? !trackB : !trackA}
                className={`w-full py-2.5 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5 ${
                  engancheDirection === "A_TO_B"
                    ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 shadow-purple-600/30"
                    : "bg-gradient-to-r from-cyan-600 via-teal-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 shadow-cyan-600/30"
                }`}
                title={
                  engancheDirection === "A_TO_B"
                    ? "Inicia la transición y mezcla suave de Deck A hacia Deck B"
                    : "Inicia la transición y mezcla suave de Deck B hacia Deck A"
                }
              >
                <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                <span>
                  {engancheDirection === "A_TO_B" ? "ENGANCHAR A ➔ B" : "ENGANCHAR B ➔ A"}
                </span>
              </button>
            )}

            <button
              onClick={handleInstantDropCut}
              disabled={engancheDirection === "A_TO_B" ? !trackB : !trackA}
              className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              title={
                engancheDirection === "A_TO_B"
                  ? "Corte instantáneo al golpe hacia Deck B"
                  : "Corte instantáneo al golpe hacia Deck A"
              }
            >
              {engancheDirection === "A_TO_B" ? "CORTE DROP A ➔ B" : "CORTE DROP B ➔ A"}
            </button>
          </div>

          {/* CROSSFADER SLIDER */}
          <div className="w-full space-y-1.5 pt-2 border-t border-zinc-900">
            <span className="text-[9px] uppercase font-bold text-zinc-500">Crossfader</span>
            <input
              type="range"
              min={-100}
              max={100}
              value={crossfaderValue}
              onChange={(e) => setCrossfaderValue(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[9px] font-mono font-bold text-zinc-400 px-0.5">
              <span className={crossfaderValue < -20 ? "text-purple-400 font-black" : ""}>
                A: {Math.round(crossfaderGains.gainA * 100)}%
              </span>
              <span className={crossfaderValue > 20 ? "text-cyan-400 font-black" : ""}>
                B: {Math.round(crossfaderGains.gainB * 100)}%
              </span>
            </div>
            <button
              onClick={() => setCrossfaderValue(0)}
              className="text-[9px] text-zinc-500 hover:text-zinc-300 font-mono underline cursor-pointer"
            >
              Centrar (50/50)
            </button>
          </div>
        </div>

        {/* ========================================== */}
        {/* DECK B (Canal 2 - Cian Eléctrico)          */}
        {/* ========================================== */}
        <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-bl from-zinc-950 via-zinc-900 to-cyan-950/30 border-2 border-cyan-500/40 shadow-2xl flex flex-col justify-between space-y-4 relative w-full max-w-full overflow-hidden">
          {/* Header de Deck B con Selector de Pista */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-cyan-600 text-white text-[10px] font-black tracking-widest uppercase shadow-md shadow-cyan-600/30">
                DECK B &bull; CANAL 2
              </span>
              <span className={`w-2 h-2 rounded-full ${trackB ? (isPlayingB ? "bg-cyan-400 animate-ping" : "bg-cyan-400") : "bg-zinc-600"}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${trackB ? "text-cyan-400" : "text-zinc-500"}`}>
                {trackB ? (isPlayingB ? "En Mezcla" : "Preparado") : "Bandeja Vacía"}
              </span>
              {trackB?.tipAmountCents && trackB.tipAmountCents > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] font-black">
                  ⭐ VIP
                </span>
              ) : null}
            </div>

            {/* Acciones Deck B: Limpiar y Cargar Pista */}
            <div className="flex items-center gap-1.5">
              {trackB && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClearDeckB();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 hover:border-red-600 text-red-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Limpiar bandeja B (Detener audio, desmontar y liberar memoria)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Limpiar</span>
                </button>
              )}

              {/* Selector de Pista Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSelectorOpenB(!isSelectorOpenB)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-cyan-950/60 border border-zinc-800 hover:border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Cargar Pista</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {isSelectorOpenB && (
                  <div className="absolute right-0 top-full mt-1.5 w-80 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-2.5 z-50 space-y-2 max-h-80 overflow-y-auto">
                    {/* Botón rápido para limpiar bandeja */}
                    {trackB && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleClearDeckB();
                          setIsSelectorOpenB(false);
                        }}
                        className="w-full text-left p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 text-red-300 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer mb-1"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>⏹ Limpiar bandeja (Expulsar pista actual)</span>
                      </button>
                    )}

                    {/* Búsqueda directa o pegado de YouTube */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSearchYtB(searchQueryB);
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        placeholder="Buscar en YouTube o pegar link..."
                        value={searchQueryB}
                        onChange={(e) => setSearchQueryB(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-hidden focus:border-cyan-500"
                      />
                      <button
                        type="submit"
                        disabled={isSearchingB}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isSearchingB ? <Disc3 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      </button>
                    </form>

                    {/* Resultados de búsqueda de YouTube */}
                    {searchResultsB.length > 0 && (
                      <div className="space-y-1 border-b border-zinc-800 pb-2">
                        <div className="text-[10px] font-black uppercase text-cyan-400 px-1">
                          🎬 Resultados de YouTube:
                        </div>
                        {searchResultsB.map((yt) => (
                          <button
                            key={yt.id}
                            onClick={() => {
                              loadTrackIntoDeckB(
                                {
                                  id: `yt-${yt.id}`,
                                  status: "MANUAL",
                                  customTitle: yt.parsedTitle || yt.title,
                                  customArtist: yt.parsedArtist || yt.channelTitle,
                                  notes: `https://www.youtube.com/watch?v=${yt.id}`,
                                  createdAt: new Date().toISOString(),
                                  table: { id: "dj-booth", number: 0, label: "Cabina DJ" },
                                  guestSession: null,
                                  song: {
                                    id: `yt-${yt.id}`,
                                    title: yt.parsedTitle || yt.title,
                                    durationSeconds: 210,
                                    genre: "YouTube",
                                    bpm: 126,
                                    key: "9A / Em",
                                    artist: { name: yt.parsedArtist || yt.channelTitle },
                                  },
                                  youtubeVideoId: yt.id,
                                },
                                null,
                                yt.id
                              );
                              setIsSelectorOpenB(false);
                              setSearchResultsB([]);
                              setSearchQueryB("");
                            }}
                            className="w-full text-left p-1.5 rounded-lg hover:bg-cyan-950/60 transition-colors flex items-center gap-2 text-xs cursor-pointer border border-transparent hover:border-cyan-800"
                          >
                            <Youtube className="w-4 h-4 text-red-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-white truncate text-[11px]">
                                {yt.parsedTitle || yt.title}
                              </div>
                              <div className="text-[10px] text-zinc-400 truncate">
                                {yt.parsedArtist || yt.channelTitle}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="text-[10px] font-black uppercase text-zinc-500 px-1 pt-1">
                      Pistas en Cola ({queue.length})
                    </div>
                    {queue.length === 0 ? (
                      <div className="text-xs text-zinc-500 p-2 text-center">
                        No hay temas en cola
                      </div>
                    ) : (
                      queue.map((entry, idx) => (
                        <button
                          key={entry.id}
                          onClick={() => {
                            loadTrackIntoDeckB(entry.songRequest, entry.id, entry.youtubeVideoId);
                            setIsSelectorOpenB(false);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-cyan-950/60 transition-colors flex items-center justify-between gap-2 border border-transparent hover:border-cyan-800 text-xs cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">
                              #{idx + 1} {entry.songRequest.song?.title || entry.songRequest.customTitle}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate">
                              {entry.songRequest.table.label} &bull;{" "}
                              {entry.songRequest.song?.bpm ? `${entry.songRequest.song.bpm} BPM` : "126 BPM"}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-cyan-400 shrink-0 font-bold">
                            Cargar
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Información del Track B con altura estable */}
          <div className="min-h-[64px] flex flex-col justify-center">
            {trackB ? (
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-white truncate">
                  {trackB.song?.title || trackB.customTitle}
                </h3>
                <p className="text-xs font-semibold text-cyan-300 truncate">
                  {trackB.song?.artist?.name || trackB.customArtist}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-zinc-400">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-950 text-amber-400 border border-zinc-800 font-bold">
                    KEY: {trackB.song?.key || "9A / Em"}
                  </span>
                  <span>Dur: {formatTime(trackBDuration)}</span>
                  <span className="text-cyan-400 font-bold">
                    {formatRemaining(playbackSecondsB, trackBDuration)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-2.5 px-3 rounded-xl bg-zinc-950/60 border border-dashed border-cyan-900/40 text-center text-zinc-400 text-xs">
                <span className="font-bold text-zinc-300">Bandeja B vacía</span>
                <p className="text-[10px] text-zinc-500 mt-0.5">Usa &quot;Cargar Pista&quot; para preparar el siguiente tema</p>
              </div>
            )}
          </div>

          {/* Monitor de Video & Audio YouTube Deck B (Memoized & Totalmente Aislado) */}
          <DeckPlayer
            deckId="B"
            videoId={videoIdB}
            isPlaying={isPlayingB}
            effectiveVol={effectiveVolB}
            pitch={pitchB}
            isLoading={isLoadingVideoB}
            isEjected={isEjectedB}
            iframeRef={iframeRefB}
          />

          {/* Platter / Jogwheel Deck B & Pitch Fader */}
          <div className="flex items-center justify-around sm:justify-between gap-3 sm:gap-4 py-2 w-full">
            {/* Pitch / Tempo Fader Vertical Deck B */}
            <div className="flex flex-col items-center justify-between h-40 bg-zinc-950/80 p-2 rounded-xl border border-zinc-800">
              <span className="text-[9px] font-mono text-zinc-400 font-bold">+8%</span>
              <input
                type="range"
                min={-8}
                max={8}
                step={0.1}
                value={pitchB}
                onChange={(e) => {
                  setPitchB(Number(e.target.value));
                  setIsSyncedB(false);
                }}
                className="h-24 -rotate-90 w-24 accent-cyan-400 cursor-pointer appearance-none bg-zinc-800 rounded-lg"
              />
              <span className="text-[9px] font-mono text-zinc-400 font-bold">-8%</span>
              <button
                onClick={() => {
                  setPitchB(0);
                  setIsSyncedB(false);
                }}
                className="text-[9px] font-mono text-cyan-400 hover:underline cursor-pointer"
                title="Resetear Pitch a 0%"
              >
                RESET
              </button>
            </div>

            {/* Jogwheel Giratorio Deck B */}
            <div className="relative shrink-0 mx-auto">
              <div
                className={`w-36 h-36 rounded-full bg-black border-4 border-zinc-800 shadow-[0_0_25px_rgba(6,182,212,0.2)] flex items-center justify-center relative cursor-grab active:cursor-grabbing ${
                  isPlayingB ? "animate-spin [animation-duration:3s]" : ""
                }`}
                onClick={() => {
                  if (!trackB) return;
                  unlockAudioB();
                  setIsPlayingB(!isPlayingB);
                }}
                title="Jogwheel / Vinilo Deck B - Click para Play/Pausa"
              >
                {/* Ranuras de vinilo */}
                <div className="w-28 h-28 rounded-full border border-zinc-800 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full border border-zinc-700/60 flex items-center justify-center">
                    {/* Centro HUD de Jogwheel */}
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 border-2 border-white flex flex-col items-center justify-center text-white shadow-lg">
                      <span className="text-[11px] font-black">{effectiveBpmB}</span>
                      <span className="text-[8px] font-bold opacity-80">BPM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de Pitch Bend / Nudge */}
              <div className="flex justify-center gap-2 mt-2">
                <button
                  onClick={() => handleNudge("B", -1)}
                  className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white cursor-pointer"
                  title="Empujar compás atrás"
                >
                  &laquo; NUDGE
                </button>
                <button
                  onClick={() => handleNudge("B", 1)}
                  className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white cursor-pointer"
                  title="Empujar compás adelante"
                >
                  NUDGE &raquo;
                </button>
              </div>
            </div>
          </div>

          {/* Performance Pads: Hot Cues & Auto Loop */}
          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
              <span>HOT CUES</span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((c) => (
                  <button
                    key={c}
                    onClick={() => handleHotCue("B", c)}
                    className="w-7 h-6 rounded bg-zinc-900 hover:bg-cyan-600 hover:text-white text-cyan-300 font-black border border-zinc-800 text-[10px] transition-colors cursor-pointer"
                    title={`Saltar a Hot Cue ${c}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
              <span>AUTO LOOP</span>
              <div className="flex gap-1.5">
                {[1, 2, 4, 8].map((beats) => (
                  <button
                    key={beats}
                    onClick={() => handleToggleLoop("B", beats)}
                    className={`px-1.5 h-6 rounded font-black border text-[9px] transition-colors cursor-pointer ${
                      activeLoopB === beats
                        ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                        : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800"
                    }`}
                  >
                    {beats}B
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Channel Strip: EQ 3-Band, Gain & Fader */}
          <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between gap-2 text-center text-[10px] font-bold text-zinc-400">
              <div className="flex-1">
                <span>HI</span>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={eqHiB}
                  onChange={(e) => setEqHiB(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded"
                />
              </div>
              <div className="flex-1">
                <span>MID</span>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={eqMidB}
                  onChange={(e) => setEqMidB(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded"
                />
              </div>
              <div className="flex-1">
                <span>LOW</span>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={bassKillB ? -50 : eqLowB}
                  onChange={(e) => setEqLowB(Number(e.target.value))}
                  disabled={bassKillB}
                  className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded"
                />
              </div>
              <button
                onClick={() => setBassKillB(!bassKillB)}
                className={`px-2 py-1 rounded text-[9px] font-black border transition-all cursor-pointer ${
                  bassKillB
                    ? "bg-red-600 text-white border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                }`}
                title="Kill Bass / Matar Graves en Deck B"
              >
                BASS KILL
              </button>
            </div>
          </div>

          {/* Controles de Transporte: PLAY, CUE, SYNC */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800">
            <button
              onClick={() => handleCue("B")}
              disabled={!trackB}
              className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-400 text-xs font-black transition-colors cursor-pointer shadow-sm active:scale-95 disabled:opacity-40"
            >
              CUE
            </button>
            <button
              onClick={() => {
                if (!trackB) return;
                unlockAudioB();
                setIsPlayingB(!isPlayingB);
              }}
              disabled={!trackB}
              className={`py-2.5 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-40 ${
                isPlayingB
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/30"
                  : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            >
              {isPlayingB ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlayingB ? "PAUSA" : "PLAY"}</span>
            </button>
            <button
              onClick={handleSyncDeckB}
              disabled={!trackA || !trackB}
              className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 border disabled:opacity-40 ${
                isSyncedB
                  ? "bg-emerald-600 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                  : "bg-zinc-900 hover:bg-emerald-950 border-zinc-700 hover:border-emerald-600 text-emerald-400"
              }`}
              title="Sincronizar BPM de Deck B con Deck A"
            >
              SYNC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
