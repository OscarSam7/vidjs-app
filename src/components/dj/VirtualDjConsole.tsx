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
  Upload,
  FileAudio,
  Lock,
  Unlock,
} from "lucide-react";
import { calculateCrossfaderGains, djSoundEffects, webDjEngine, AudioLevels } from "@/lib/audio/dj-audio-engine";

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
  deckMode: "youtube" | "native";
  localFileName?: string | null;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

interface StableIframeProps {
  deckId: "A" | "B";
  videoId: string | null;
  isEjected: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

// Barra LED de Vúmetro de alta fidelidad para el mezclador de cabina
const VuMeterBar = memo(function VuMeterBar({
  peak,
  rms,
  channelColor = "purple",
}: {
  peak: number;
  rms: number;
  channelColor?: "purple" | "cyan" | "emerald";
}) {
  const segments = 10;
  const activeCount = Math.min(segments, Math.round(Math.max(peak, rms) * segments));

  return (
    <div className="flex flex-col-reverse gap-0.5 h-20 w-2.5 bg-zinc-950 p-0.5 rounded border border-zinc-800 shadow-inner">
      {Array.from({ length: segments }).map((_, idx) => {
        const isActive = idx < activeCount;
        let colorClass = "bg-zinc-800/40";
        if (isActive) {
          if (idx >= 8) colorClass = "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]";
          else if (idx >= 6) colorClass = "bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.8)]";
          else if (channelColor === "cyan") colorClass = "bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.7)]";
          else if (channelColor === "emerald") colorClass = "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.7)]";
          else colorClass = "bg-purple-500 shadow-[0_0_4px_rgba(168,85,247,0.7)]";
        }
        return <div key={idx} className={`w-full flex-1 rounded-[1px] ${colorClass} transition-all duration-75`} />;
      })}
    </div>
  );
});

// Iframe estático permanente: el atributo src se asigna UNA SOLA VEZ al montar el componente.
// NUNCA se navega ni se cambia src en el DOM. Todas las pistas se cargan con loadVideoById por postMessage.
// Esto garantiza que el navegador jamás reinicie el pipeline de audio ni interfiera con la otra bandeja.
const StableIframe = memo(
  function StableIframe({ deckId, videoId, isEjected, iframeRef }: StableIframeProps) {
    const staticSrcRef = useRef<string>("");

    if (!staticSrcRef.current) {
      const baseId = videoId || (deckId === "A" ? "M7lc1UVf-VE" : "dQw4w9WgXcQ");
      const originParam = typeof window !== "undefined" && window.location.origin ? `&origin=${encodeURIComponent(window.location.origin)}` : "";
      staticSrcRef.current = `https://www.youtube.com/embed/${baseId}?enablejsapi=1&autoplay=0&playsinline=1&controls=0&modestbranding=1&rel=0&widgetid=${deckId === "A" ? 1 : 2}${originParam}`;
    }

    const isVisible = Boolean(videoId) && !isEjected;

    return (
      <iframe
        ref={iframeRef}
        id={`deck-${deckId.toLowerCase()}-iframe`}
        src={staticSrcRef.current}
        title={`Deck ${deckId} Audio Player`}
        className={`w-full h-full border-0 pointer-events-auto transition-opacity duration-200 ${
          isVisible ? "opacity-100 relative z-0" : "opacity-0 pointer-events-none absolute inset-0 -z-10"
        }`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    );
  },
  (prev, next) =>
    prev.deckId === next.deckId &&
    Boolean(prev.videoId) === Boolean(next.videoId) &&
    prev.isEjected === next.isEjected
);


// Componente de reproductor 100% aislado y memoizado.
// Soporta tanto reproducción nativa Web Audio API como YouTube con cero interferencias cruzadas.
const DeckPlayer = memo(
  function DeckPlayer({
    deckId,
    videoId,
    isPlaying,
    effectiveVol,
    pitch,
    isLoading,
    isEjected,
    deckMode,
    localFileName,
    iframeRef,
  }: DeckPlayerProps) {
    const isA = deckId === "A";
    const borderColor = isA ? "border-purple-500/40" : "border-cyan-500/40";
    const textColor = isA ? "text-purple-300" : "text-cyan-300";
    const spinnerColor = isA ? "text-purple-400" : "text-cyan-400";
    const emptyText = isA
      ? "Bandeja A vacía — Carga desde cola, YouTube o arrastra MP3"
      : "Bandeja B vacía — Carga desde cola, YouTube o arrastra MP3";
    const chLabel = isA ? "CH 1" : "CH 2";
    const hasActiveTrack = (deckMode === "native" || Boolean(videoId)) && !isEjected;

    return (
      <div
        className={`relative aspect-video max-h-36 w-full rounded-xl overflow-hidden border ${borderColor} bg-black shadow-inner`}
      >
        {deckMode === "native" && hasActiveTrack ? (
          /* Visualizador de Alta Fidelidad Nativo Web Audio API */
          <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black relative overflow-hidden select-none">
            {/* Anillos giratorios de vinilo digital */}
            <div className="absolute inset-0 opacity-20 flex items-center justify-center pointer-events-none">
              <div
                className={`w-40 h-40 rounded-full border border-dashed ${borderColor} ${
                  isPlaying ? "animate-spin [animation-duration:8s]" : ""
                }`}
              />
              <div
                className={`absolute w-24 h-24 rounded-full border ${borderColor} ${
                  isPlaying ? "animate-pulse" : ""
                }`}
              />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-1.5 text-center px-4 w-full">
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                    isA
                      ? "bg-purple-950 text-purple-300 border border-purple-800"
                      : "bg-cyan-950 text-cyan-300 border border-cyan-800"
                  }`}
                >
                  <Zap className="w-2.5 h-2.5" />
                  WEB AUDIO API 44.1kHz
                </span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-emerald-400 text-[9px] font-mono font-bold border border-zinc-700">
                  0 LATENCIA
                </span>
              </div>
              <p className="text-xs font-bold text-white truncate max-w-[220px]">
                {localFileName || "Pista Local (Web Audio)"}
              </p>
              {/* Espectro de barras animado */}
              <div className="flex items-end justify-center gap-1 h-4 mt-0.5">
                {Array.from({ length: 16 }).map((_, i) => {
                  const barH = isPlaying ? Math.max(3, (Math.sin(i * 0.5 + 1) + 1) * 6 + 3) : 2;
                  return (
                    <div
                      key={i}
                      style={{ height: `${barH}px` }}
                      className={`w-1 rounded-full ${
                        isA ? "bg-purple-400" : "bg-cyan-400"
                      } transition-all duration-75`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Iframe aislado de YouTube */
          <StableIframe deckId={deckId} videoId={videoId} isEjected={isEjected} iframeRef={iframeRef} />
        )}

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
    return (
      prev.deckId === next.deckId &&
      prev.videoId === next.videoId &&
      prev.isPlaying === next.isPlaying &&
      prev.effectiveVol === next.effectiveVol &&
      prev.pitch === next.pitch &&
      prev.isLoading === next.isLoading &&
      prev.isEjected === next.isEjected &&
      prev.deckMode === next.deckMode &&
      prev.localFileName === next.localFileName
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

  // ==================== NATIVE WEB AUDIO API ENGINE ====================
  const [deckModeA, setDeckModeA] = useState<"youtube" | "native">("youtube");
  const [deckModeB, setDeckModeB] = useState<"youtube" | "native">("youtube");
  const [localAudioUrlA, setLocalAudioUrlA] = useState<string | null>(null);
  const [localAudioUrlB, setLocalAudioUrlB] = useState<string | null>(null);
  const [localAudioNameA, setLocalAudioNameA] = useState<string | null>(null);
  const [localAudioNameB, setLocalAudioNameB] = useState<string | null>(null);
  const [isDraggingA, setIsDraggingA] = useState(false);
  const [isDraggingB, setIsDraggingB] = useState(false);
  const audioRefA = useRef<HTMLAudioElement | null>(null);
  const audioRefB = useRef<HTMLAudioElement | null>(null);
  const fileInputRefA = useRef<HTMLInputElement | null>(null);
  const fileInputRefB = useRef<HTMLInputElement | null>(null);

  // Vúmetros estéreo en tiempo real
  const [vuLevelsA, setVuLevelsA] = useState<AudioLevels>({ peak: 0, rms: 0 });
  const [vuLevelsB, setVuLevelsB] = useState<AudioLevels>({ peak: 0, rms: 0 });
  const [vuLevelsMaster, setVuLevelsMaster] = useState<AudioLevels>({ peak: 0, rms: 0 });

  // ==================== AUTO-ENGANCHE / TRANSITION ENGINE ====================
  const [isEnganchando, setIsEnganchando] = useState(false);
  const [engancheDirection, setEngancheDirection] = useState<"A_TO_B" | "B_TO_A">("A_TO_B");
  const [transitionDuration, setTransitionDuration] = useState<4 | 8 | 16>(8); // beats (aprox 3s, 6s, 12s)
  const [transitionProgress, setTransitionProgress] = useState(0); // 0 a 100%
  const engancheIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== BEAT TICK ANIMATION & PHASE ====================
  const [beatPhase, setBeatPhase] = useState(1); // 1, 2, 3, 4

  // ==================== 2-TOUCH SAFETY: CROSSFADER & RESET ====================
  const [isCrossfaderActive, setIsCrossfaderActive] = useState(false);
  const crossfaderTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetCrossfaderTimer = () => {
    if (crossfaderTimerRef.current) clearTimeout(crossfaderTimerRef.current);
    crossfaderTimerRef.current = setTimeout(() => {
      setIsCrossfaderActive(false);
    }, 6000); // 6s de inactividad antes de re-bloquear
  };

  const handleActivateCrossfader = () => {
    setIsCrossfaderActive(true);
    resetCrossfaderTimer();
    djSoundEffects.playCueClick();
  };

  // 1. Reset Pitch Deck A (2 toques síncronos: 1° activar, 2° acción)
  const resetArmedPitchARef = useRef(false);
  const [resetArmedPitchA, setResetArmedPitchA] = useState(false);
  const [resetSuccessPitchA, setResetSuccessPitchA] = useState(false);
  const resetTimerPitchARef = useRef<NodeJS.Timeout | null>(null);

  const handleResetPitchA = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!resetArmedPitchARef.current) {
      // 1er toque: Activar
      resetArmedPitchARef.current = true;
      setResetArmedPitchA(true);
      if (resetTimerPitchARef.current) clearTimeout(resetTimerPitchARef.current);
      resetTimerPitchARef.current = setTimeout(() => {
        resetArmedPitchARef.current = false;
        setResetArmedPitchA(false);
      }, 4000);
      djSoundEffects.playCueClick();
    } else {
      // 2do toque: Acción
      if (resetTimerPitchARef.current) clearTimeout(resetTimerPitchARef.current);
      resetArmedPitchARef.current = false;
      setResetArmedPitchA(false);
      setPitchA(0);
      setResetSuccessPitchA(true);
      djSoundEffects.playCueClick();
      setTimeout(() => setResetSuccessPitchA(false), 1500);
    }
  };

  // 2. Reset Pitch Deck B (2 toques síncronos: 1° activar, 2° acción)
  const resetArmedPitchBRef = useRef(false);
  const [resetArmedPitchB, setResetArmedPitchB] = useState(false);
  const [resetSuccessPitchB, setResetSuccessPitchB] = useState(false);
  const resetTimerPitchBRef = useRef<NodeJS.Timeout | null>(null);

  const handleResetPitchB = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!resetArmedPitchBRef.current) {
      // 1er toque: Activar
      resetArmedPitchBRef.current = true;
      setResetArmedPitchB(true);
      if (resetTimerPitchBRef.current) clearTimeout(resetTimerPitchBRef.current);
      resetTimerPitchBRef.current = setTimeout(() => {
        resetArmedPitchBRef.current = false;
        setResetArmedPitchB(false);
      }, 4000);
      djSoundEffects.playCueClick();
    } else {
      // 2do toque: Acción
      if (resetTimerPitchBRef.current) clearTimeout(resetTimerPitchBRef.current);
      resetArmedPitchBRef.current = false;
      setResetArmedPitchB(false);
      setPitchB(0);
      setIsSyncedB(false);
      setResetSuccessPitchB(true);
      djSoundEffects.playCueClick();
      setTimeout(() => setResetSuccessPitchB(false), 1500);
    }
  };

  // 3. Reset / Centrar Crossfader (2 toques síncronos: 1° activar, 2° acción)
  const resetCrossfaderArmedRef = useRef(false);
  const [resetCrossfaderArmed, setResetCrossfaderArmed] = useState(false);
  const [resetCrossfaderSuccess, setResetCrossfaderSuccess] = useState(false);
  const resetCrossfaderTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleResetCrossfader = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Asegurar que el crossfader también se active
    if (!isCrossfaderActive) {
      setIsCrossfaderActive(true);
      resetCrossfaderTimer();
    }

    if (!resetCrossfaderArmedRef.current) {
      // 1er toque: Activar
      resetCrossfaderArmedRef.current = true;
      setResetCrossfaderArmed(true);
      if (resetCrossfaderTimerRef.current) clearTimeout(resetCrossfaderTimerRef.current);
      resetCrossfaderTimerRef.current = setTimeout(() => {
        resetCrossfaderArmedRef.current = false;
        setResetCrossfaderArmed(false);
      }, 4000);
      djSoundEffects.playCueClick();
    } else {
      // 2do toque: Acción
      if (resetCrossfaderTimerRef.current) clearTimeout(resetCrossfaderTimerRef.current);
      resetCrossfaderArmedRef.current = false;
      setResetCrossfaderArmed(false);
      setCrossfaderValue(0);
      setResetCrossfaderSuccess(true);
      resetCrossfaderTimer();
      djSoundEffects.playCueClick();
      setTimeout(() => setResetCrossfaderSuccess(false), 1500);
    }
  };

  // 4. Reset / Limpiar Bandejas A y B (2 toques de seguridad)
  const resetDeckARef = useRef(false);
  const [resetDeckAState, setResetDeckAState] = useState(false);
  const resetDeckATimer = useRef<NodeJS.Timeout | null>(null);

  const handleSafeClearDeckA = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!resetDeckARef.current) {
      resetDeckARef.current = true;
      setResetDeckAState(true);
      if (resetDeckATimer.current) clearTimeout(resetDeckATimer.current);
      resetDeckATimer.current = setTimeout(() => {
        resetDeckARef.current = false;
        setResetDeckAState(false);
      }, 4000);
      djSoundEffects.playCueClick();
    } else {
      if (resetDeckATimer.current) clearTimeout(resetDeckATimer.current);
      resetDeckARef.current = false;
      setResetDeckAState(false);
      handleClearDeckA();
      djSoundEffects.playCueClick();
    }
  };

  const resetDeckBRef = useRef(false);
  const [resetDeckBState, setResetDeckBState] = useState(false);
  const resetDeckBTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSafeClearDeckB = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!resetDeckBRef.current) {
      resetDeckBRef.current = true;
      setResetDeckBState(true);
      if (resetDeckBTimer.current) clearTimeout(resetDeckBTimer.current);
      resetDeckBTimer.current = setTimeout(() => {
        resetDeckBRef.current = false;
        setResetDeckBState(false);
      }, 4000);
      djSoundEffects.playCueClick();
    } else {
      if (resetDeckBTimer.current) clearTimeout(resetDeckBTimer.current);
      resetDeckBRef.current = false;
      setResetDeckBState(false);
      handleClearDeckB();
      djSoundEffects.playCueClick();
    }
  };

  useEffect(() => {
    return () => {
      if (crossfaderTimerRef.current) clearTimeout(crossfaderTimerRef.current);
      if (resetTimerPitchARef.current) clearTimeout(resetTimerPitchARef.current);
      if (resetTimerPitchBRef.current) clearTimeout(resetTimerPitchBRef.current);
      if (resetCrossfaderTimerRef.current) clearTimeout(resetCrossfaderTimerRef.current);
      if (resetDeckATimer.current) clearTimeout(resetDeckATimer.current);
      if (resetDeckBTimer.current) clearTimeout(resetDeckBTimer.current);
    };
  }, []);

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

  // Cargar video en iframe de forma 100% aislada usando loadVideoById por postMessage (cero recargas del iframe)
  const loadVideoIntoIframe = (
    iframe: HTMLIFrameElement | null,
    vid: string,
    volume: number
  ) => {
    if (!iframe) return;
    sendPlayerCommand(iframe, "loadVideoById", [vid, 0]);
    sendPlayerCommand(iframe, "unMute");
    sendPlayerCommand(iframe, "setVolume", [volume]);
    sendPlayerCommand(iframe, "playVideo");
    // Retry de volumen y reproducción tras 400ms para asegurar arranque confiable
    setTimeout(() => {
      if (iframe) {
        sendPlayerCommand(iframe, "unMute");
        sendPlayerCommand(iframe, "setVolume", [volume]);
        sendPlayerCommand(iframe, "playVideo");
      }
    }, 400);
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
    webDjEngine.unlock();
    if (iframeRefA.current) {
      sendPlayerCommand(iframeRefA.current, "unMute");
      sendPlayerCommand(iframeRefA.current, "setVolume", [effectiveVolA]);
      if (isPlayingA) sendPlayerCommand(iframeRefA.current, "playVideo");
    }
  };

  const unlockAudioB = () => {
    setAudioUnlocked(true);
    setIsMasterMuted(false);
    webDjEngine.unlock();
    if (iframeRefB.current) {
      sendPlayerCommand(iframeRefB.current, "unMute");
      sendPlayerCommand(iframeRefB.current, "setVolume", [effectiveVolB]);
      if (isPlayingB) sendPlayerCommand(iframeRefB.current, "playVideo");
    }
  };

  const unlockAudio = () => {
    setAudioUnlocked(true);
    setIsMasterMuted(false);
    webDjEngine.unlock();
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

  // Neutralizar secuestro de MediaSession por parte de YouTube para evitar interrupciones entre bandejas
  useEffect(() => {
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      try {
        Object.defineProperty(navigator.mediaSession, "playbackState", {
          get: () => "playing",
          set: () => {},
          configurable: true,
        });
      } catch {
        // Silencioso si el navegador restringe la modificación
      }
    }
  }, []);

  // Conectar elementos de audio nativo al grafo de Web Audio API
  useEffect(() => {
    if (audioRefA.current) {
      webDjEngine.attachAudioElement("A", audioRefA.current);
    }
  }, [audioRefA.current]);

  useEffect(() => {
    if (audioRefB.current) {
      webDjEngine.attachAudioElement("B", audioRefB.current);
    }
  }, [audioRefB.current]);

  // Sincronizar parámetros en tiempo real con Web Audio API
  useEffect(() => {
    webDjEngine.setChannelVolume("A", effectiveVolA);
  }, [effectiveVolA]);

  useEffect(() => {
    webDjEngine.setChannelVolume("B", effectiveVolB);
  }, [effectiveVolB]);

  useEffect(() => {
    webDjEngine.setEq("A", eqLowA, eqMidA, eqHiA);
  }, [eqLowA, eqMidA, eqHiA]);

  useEffect(() => {
    webDjEngine.setEq("B", eqLowB, eqMidB, eqHiB);
  }, [eqLowB, eqMidB, eqHiB]);

  useEffect(() => {
    webDjEngine.setBassKill("A", bassKillA);
  }, [bassKillA]);

  useEffect(() => {
    webDjEngine.setBassKill("B", bassKillB);
  }, [bassKillB]);

  useEffect(() => {
    webDjEngine.setCrossfader(crossfaderValue);
  }, [crossfaderValue]);

  useEffect(() => {
    webDjEngine.setMasterVolume(isMasterMuted ? 0 : masterVolume);
  }, [masterVolume, isMasterMuted]);

  // Loop de animación para Vúmetros estéreo en tiempo real (Peak & RMS)
  useEffect(() => {
    let animId: number;
    const tickVuMeters = () => {
      if (isPlayingA || isPlayingB) {
        const aLevels = webDjEngine.getChannelLevels("A");
        const bLevels = webDjEngine.getChannelLevels("B");
        const mLevels = webDjEngine.getMasterLevels();

        // Si es modo YouTube y está reproduciendo, sintetizar actividad de vúmetro en base al volumen
        const finalA = deckModeA === "native" && aLevels.peak > 0
          ? aLevels
          : isPlayingA && effectiveVolA > 0
          ? { peak: (effectiveVolA / 100) * (0.6 + Math.random() * 0.35), rms: (effectiveVolA / 100) * 0.6 }
          : { peak: 0, rms: 0 };

        const finalB = deckModeB === "native" && bLevels.peak > 0
          ? bLevels
          : isPlayingB && effectiveVolB > 0
          ? { peak: (effectiveVolB / 100) * (0.6 + Math.random() * 0.35), rms: (effectiveVolB / 100) * 0.6 }
          : { peak: 0, rms: 0 };

        const finalM = mLevels.peak > 0
          ? mLevels
          : { peak: Math.max(finalA.peak, finalB.peak), rms: Math.max(finalA.rms, finalB.rms) };

        setVuLevelsA(finalA);
        setVuLevelsB(finalB);
        setVuLevelsMaster(finalM);
      } else {
        setVuLevelsA({ peak: 0, rms: 0 });
        setVuLevelsB({ peak: 0, rms: 0 });
        setVuLevelsMaster({ peak: 0, rms: 0 });
      }
      animId = requestAnimationFrame(tickVuMeters);
    };

    animId = requestAnimationFrame(tickVuMeters);
    return () => cancelAnimationFrame(animId);
  }, [isPlayingA, isPlayingB, effectiveVolA, effectiveVolB, deckModeA, deckModeB]);

  // Sincronizar Pitch en audio nativo Web Audio
  useEffect(() => {
    if (deckModeA === "native" && audioRefA.current) {
      const rate = Math.max(0.5, Math.min(2.0, 1 + pitchA / 100));
      audioRefA.current.playbackRate = rate;
      (audioRefA.current as any).preservesPitch = isKeyLockA;
    }
  }, [pitchA, isKeyLockA, deckModeA]);

  useEffect(() => {
    if (deckModeB === "native" && audioRefB.current) {
      const rate = Math.max(0.5, Math.min(2.0, 1 + pitchB / 100));
      audioRefB.current.playbackRate = rate;
      (audioRefB.current as any).preservesPitch = isKeyLockB;
    }
  }, [pitchB, isKeyLockB, deckModeB]);

  // Controladores de carga de archivos locales MP3 / WAV
  const handleLoadLocalFileA = (file: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLocalAudioUrlA(url);
    const cleanName = file.name.replace(/\.[^/.]+$/, "");
    setLocalAudioNameA(cleanName);
    setDeckModeA("native");
    setIsEjectedA(false);

    const syntheticTrack: SongRequestData = {
      id: `local-a-${Date.now()}`,
      status: "PLAYING",
      customTitle: cleanName,
      customArtist: "Pista Local (Web Audio)",
      notes: null,
      createdAt: new Date().toISOString(),
      table: { id: "local", number: 0, label: "Cabina DJ" },
      guestSession: null,
      song: {
        id: `local-song-${Date.now()}`,
        title: cleanName,
        durationSeconds: 240,
        genre: "DJ Mix",
        bpm: 126,
        key: "8A / Am",
        artist: { name: "Pista Local (Web Audio)" },
      },
    };

    setDeckTrackA(syntheticTrack);
    setManualTrackA(syntheticTrack);
    setPlaybackSecondsA(0);
    setIsPlayingA(true);
    webDjEngine.unlock();

    if (audioRefA.current) {
      audioRefA.current.src = url;
      audioRefA.current.currentTime = 0;
      audioRefA.current.play().catch(() => {});
    }

    showFeedback("success", `📁 Pista local cargada en Deck A: "${cleanName}"`);
  };

  const handleLoadLocalFileB = (file: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLocalAudioUrlB(url);
    const cleanName = file.name.replace(/\.[^/.]+$/, "");
    setLocalAudioNameB(cleanName);
    setDeckModeB("native");
    setIsEjectedB(false);

    const syntheticTrack: SongRequestData = {
      id: `local-b-${Date.now()}`,
      status: "PLAYING",
      customTitle: cleanName,
      customArtist: "Pista Local (Web Audio)",
      notes: null,
      createdAt: new Date().toISOString(),
      table: { id: "local", number: 0, label: "Cabina DJ" },
      guestSession: null,
      song: {
        id: `local-song-b-${Date.now()}`,
        title: cleanName,
        durationSeconds: 240,
        genre: "DJ Mix",
        bpm: 128,
        key: "9A / Em",
        artist: { name: "Pista Local (Web Audio)" },
      },
    };

    setDeckTrackB(syntheticTrack);
    setManualTrackB(syntheticTrack);
    setPlaybackSecondsB(0);
    setIsPlayingB(true);
    webDjEngine.unlock();

    if (audioRefB.current) {
      audioRefB.current.src = url;
      audioRefB.current.currentTime = 0;
      audioRefB.current.play().catch(() => {});
    }

    showFeedback("success", `📁 Pista local cargada en Deck B: "${cleanName}"`);
  };

  // Play / Pause toggles con soporte dual Web Audio / YouTube
  const togglePlayA = () => {
    webDjEngine.unlock();
    if (isEjectedA || !trackA) return;

    if (deckModeA === "native" && audioRefA.current) {
      if (isPlayingA) {
        audioRefA.current.pause();
        setIsPlayingA(false);
      } else {
        audioRefA.current.play().catch(() => {});
        setIsPlayingA(true);
      }
      return;
    }

    if (isPlayingA) {
      if (iframeRefA.current) sendPlayerCommand(iframeRefA.current, "pauseVideo");
      setIsPlayingA(false);
    } else {
      unlockAudioA();
      if (iframeRefA.current) sendPlayerCommand(iframeRefA.current, "playVideo");
      setIsPlayingA(true);
    }
  };

  const togglePlayB = () => {
    webDjEngine.unlock();
    if (isEjectedB || !trackB) return;

    if (deckModeB === "native" && audioRefB.current) {
      if (isPlayingB) {
        audioRefB.current.pause();
        setIsPlayingB(false);
      } else {
        audioRefB.current.play().catch(() => {});
        setIsPlayingB(true);
      }
      return;
    }

    if (isPlayingB) {
      if (iframeRefB.current) sendPlayerCommand(iframeRefB.current, "pauseVideo");
      setIsPlayingB(false);
    } else {
      unlockAudioB();
      if (iframeRefB.current) sendPlayerCommand(iframeRefB.current, "playVideo");
      setIsPlayingB(true);
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
    setDeckModeA("youtube");
    if (audioRefA.current) {
      audioRefA.current.pause();
      audioRefA.current.currentTime = 0;
      audioRefA.current.src = "";
    }
    setLocalAudioUrlA(null);
    setLocalAudioNameA(null);
    prevCurrentPlayingIdRef.current = currentPlaying?.id || null;
    const directId =
      explicitVideoId ||
      track.youtubeVideoId ||
      extractYoutubeId(track.notes);
    activeVideoIdARef.current = null;
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
      loadVideoIntoIframe(iframeRefA.current, directId, effectiveVolA);
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
          loadVideoIntoIframe(iframeRefA.current, resolvedId, effectiveVolA);
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
    setDeckModeB("youtube");
    if (audioRefB.current) {
      audioRefB.current.pause();
      audioRefB.current.currentTime = 0;
      audioRefB.current.src = "";
    }
    setLocalAudioUrlB(null);
    setLocalAudioNameB(null);
    const directId =
      explicitVideoId ||
      track.youtubeVideoId ||
      extractYoutubeId(track.notes);
    const trackKey = getTrackKey(track, directId);
    prevTrackBKeyRef.current = trackKey;
    activeVideoIdBRef.current = null;
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
      loadVideoIntoIframe(iframeRefB.current, directId, effectiveVolB);
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
          loadVideoIntoIframe(iframeRefB.current, resolvedId, effectiveVolB);
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

  // Limpiar / Expulsar pista de DECK A (Aislamiento Total: Deck B NUNCA es afectada)
  const handleClearDeckA = () => {
    searchRequestIdA.current++;
    if (deckModeA === "native" && audioRefA.current) {
      audioRefA.current.pause();
      audioRefA.current.currentTime = 0;
      audioRefA.current.src = "";
      setLocalAudioUrlA(null);
      setLocalAudioNameA(null);
    } else if (iframeRefA.current) {
      sendPlayerCommand(iframeRefA.current, "stopVideo");
      sendPlayerCommand(iframeRefA.current, "pauseVideo");
      sendPlayerCommand(iframeRefA.current, "mute");
    }
    prevCurrentPlayingIdRef.current = currentPlaying?.id || null;
    activeVideoIdARef.current = null;
    setVideoIdA(null);
    setIsEjectedA(true);
    setDeckTrackA(null);
    setManualTrackA(null);
    setIsPlayingA(false);
    setPlaybackSecondsA(0);
    setActiveLoopA(null);
    setIsLoadingVideoA(false);
  };

  // Limpiar / Expulsar pista de DECK B (Aislamiento Total: Deck A NUNCA es afectada)
  const handleClearDeckB = () => {
    searchRequestIdB.current++;
    if (deckModeB === "native" && audioRefB.current) {
      audioRefB.current.pause();
      audioRefB.current.currentTime = 0;
      audioRefB.current.src = "";
      setLocalAudioUrlB(null);
      setLocalAudioNameB(null);
    } else if (iframeRefB.current) {
      sendPlayerCommand(iframeRefB.current, "stopVideo");
      sendPlayerCommand(iframeRefB.current, "pauseVideo");
      sendPlayerCommand(iframeRefB.current, "mute");
    }
    prevTrackBKeyRef.current = null;
    activeVideoIdBRef.current = null;
    setVideoIdB(null);
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

  // Sincronización de Play/Pausa en Deck A (Estricta y aislada: sin dependencias espurias de volumen)
  useEffect(() => {
    if (!videoIdA || !iframeRefA.current) return;
    if (isPlayingA) {
      sendPlayerCommand(iframeRefA.current, "playVideo");
    } else {
      sendPlayerCommand(iframeRefA.current, "pauseVideo");
    }
  }, [isPlayingA, videoIdA]);

  // Sincronización de Play/Pausa en Deck B (Estricta y aislada: sin dependencias espurias de volumen)
  useEffect(() => {
    if (!videoIdB || !iframeRefB.current) return;
    if (isPlayingB) {
      sendPlayerCommand(iframeRefB.current, "playVideo");
    } else {
      sendPlayerCommand(iframeRefB.current, "pauseVideo");
    }
  }, [isPlayingB, videoIdB]);

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

  // Búsqueda en YouTube o carga directa de URL para Deck A
  const handleSearchYtA = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    // Carga directa si es URL o ID de YouTube
    const directId = extractYoutubeId(trimmed);
    if (directId) {
      loadTrackIntoDeckA(
        {
          id: `yt-${directId}`,
          status: "MANUAL",
          customTitle: "Video de YouTube",
          customArtist: "Enlace Directo",
          notes: `https://www.youtube.com/watch?v=${directId}`,
          createdAt: new Date().toISOString(),
          table: { id: "dj-booth", number: 0, label: "Cabina DJ" },
          guestSession: null,
          song: {
            id: `yt-${directId}`,
            title: "Video de YouTube",
            durationSeconds: 210,
            genre: "YouTube",
            bpm: 124,
            key: "8A / Am",
            artist: { name: "Enlace Directo" },
          },
          youtubeVideoId: directId,
        },
        directId
      );
      setIsSelectorOpenA(false);
      setSearchQueryA("");
      setSearchResultsA([]);
      return;
    }

    setIsSearchingA(true);
    try {
      const res = await fetch(`/api/v1/karaoke/search?q=${encodeURIComponent(trimmed)}&isKaraoke=false`);
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

  // Búsqueda en YouTube o carga directa de URL para Deck B
  const handleSearchYtB = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const directId = extractYoutubeId(trimmed);
    if (directId) {
      loadTrackIntoDeckB(
        {
          id: `yt-${directId}`,
          status: "MANUAL",
          customTitle: "Video de YouTube",
          customArtist: "Enlace Directo",
          notes: `https://www.youtube.com/watch?v=${directId}`,
          createdAt: new Date().toISOString(),
          table: { id: "dj-booth", number: 0, label: "Cabina DJ" },
          guestSession: null,
          song: {
            id: `yt-${directId}`,
            title: "Video de YouTube",
            durationSeconds: 210,
            genre: "YouTube",
            bpm: 124,
            key: "8A / Am",
            artist: { name: "Enlace Directo" },
          },
          youtubeVideoId: directId,
        },
        null,
        directId
      );
      setIsSelectorOpenB(false);
      setSearchQueryB("");
      setSearchResultsB([]);
      return;
    }

    setIsSearchingB(true);
    try {
      const res = await fetch(`/api/v1/karaoke/search?q=${encodeURIComponent(trimmed)}&isKaraoke=false`);
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
                  onClick={handleSafeClearDeckA}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer select-none ${
                    resetDeckAState
                      ? "bg-amber-500 border-amber-400 text-black font-black animate-pulse shadow-md scale-105"
                      : "bg-red-950/40 hover:bg-red-900/60 border-red-800/60 hover:border-red-600 text-red-300"
                  }`}
                  title={
                    resetDeckAState
                      ? "2° toque: Toca para confirmar y limpiar/resetear la bandeja A"
                      : "1° toque: Toca para activar reseteo/limpieza de bandeja A"
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{resetDeckAState ? "¿CONFIRMAR RESET?" : "Limpiar"}</span>
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

                    {/* Botón para subir archivo MP3/WAV local (Web Audio API) */}
                    <button
                      type="button"
                      onClick={() => {
                        fileInputRefA.current?.click();
                        setIsSelectorOpenA(false);
                      }}
                      className="w-full text-left p-2 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/60 text-purple-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer mb-1"
                    >
                      <Upload className="w-4 h-4 text-purple-400 shrink-0" />
                      <div className="flex flex-col">
                        <span>📁 Subir MP3 / Archivo local</span>
                        <span className="text-[10px] text-purple-400 font-normal">Motor Web Audio API &bull; 0 Latencia &bull; Offline</span>
                      </div>
                    </button>

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
            deckMode={deckModeA}
            localFileName={localAudioNameA}
            iframeRef={iframeRefA}
          />

          {/* Platter / Jogwheel Deck A & Pitch Fader */}
          <div className="flex items-center justify-around sm:justify-between gap-3 sm:gap-4 py-2 w-full">
            {/* Jogwheel Giratorio con soporte Drag & Drop */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingA(true);
              }}
              onDragLeave={() => setIsDraggingA(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingA(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleLoadLocalFileA(file);
              }}
              className="relative shrink-0 mx-auto"
            >
              <div
                className={`w-36 h-36 rounded-full bg-black border-4 ${
                  isDraggingA ? "border-purple-400 scale-105" : "border-zinc-800"
                } shadow-[0_0_25px_rgba(168,85,247,0.2)] flex items-center justify-center relative cursor-grab active:cursor-grabbing transition-all ${
                  isPlayingA ? "animate-spin [animation-duration:3s]" : ""
                }`}
                onClick={togglePlayA}
                title="Jogwheel / Vinilo Deck A - Click para Play/Pausa o arrastra un MP3 aquí"
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
              <button
                type="button"
                onClick={handleResetPitchA}
                className={`text-[9px] font-mono transition-all rounded px-2 py-0.5 cursor-pointer font-bold select-none ${
                  resetSuccessPitchA
                    ? "bg-emerald-500 text-black font-black shadow-md scale-105"
                    : resetArmedPitchA
                    ? "bg-amber-400 text-black font-black animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.6)] scale-105"
                    : "text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/60 hover:border-purple-500"
                }`}
                title={
                  resetArmedPitchA
                    ? "2° toque: Toca para resetear Pitch a 0%"
                    : "1° toque: Toca para activar reseteo a 0%"
                }
              >
                {resetSuccessPitchA ? "✓ 0.0%" : resetArmedPitchA ? "¿CONFIRMAR 0%?" : "RESET"}
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
              onClick={togglePlayA}
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

          {/* VÚMETROS ESTÉREO LED DE CABINA (CH 1 / MASTER / CH 2) */}
          <div className="w-full py-2 px-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-around shadow-inner">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[8px] font-mono text-purple-400 font-bold">CH 1</span>
              <VuMeterBar peak={vuLevelsA.peak} rms={vuLevelsA.rms} channelColor="purple" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[8px] font-mono text-emerald-400 font-bold">MASTER</span>
              <VuMeterBar peak={vuLevelsMaster.peak} rms={vuLevelsMaster.rms} channelColor="emerald" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[8px] font-mono text-cyan-400 font-bold">CH 2</span>
              <VuMeterBar peak={vuLevelsB.peak} rms={vuLevelsB.rms} channelColor="cyan" />
            </div>
          </div>

          {/* CROSSFADER SLIDER CON ACTIVACIÓN EN DOS TOQUES */}
          <div className={`w-full space-y-1.5 pt-2 border-t transition-all rounded-xl p-2 ${
            isCrossfaderActive
              ? "bg-purple-950/20 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
              : "bg-zinc-950/40 border-zinc-900"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] uppercase font-bold text-zinc-400">Crossfader</span>
                {isCrossfaderActive ? (
                  <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-emerald-300 bg-emerald-950/80 border border-emerald-500/60 px-1.5 py-0.2 rounded-full animate-pulse">
                    <Unlock className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Activo (Desliza)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[8px] font-bold text-zinc-500 bg-zinc-900 px-1.5 py-0.2 rounded-full border border-zinc-800">
                    <Lock className="w-2.5 h-2.5 text-zinc-500" />
                    <span>2 Toques</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isCrossfaderActive) {
                    setIsCrossfaderActive(false);
                    if (crossfaderTimerRef.current) clearTimeout(crossfaderTimerRef.current);
                  } else {
                    handleActivateCrossfader();
                  }
                }}
                className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                  isCrossfaderActive
                    ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30"
                    : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white"
                }`}
                title={isCrossfaderActive ? "Toca para bloquear crossfader" : "1er toque: Toca para activar crossfader"}
              >
                {isCrossfaderActive ? (
                  <>
                    <Unlock className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Bloquear</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-2.5 h-2.5 text-purple-400" />
                    <span>Tocar para Activar</span>
                  </>
                )}
              </button>
            </div>

            {/* Pista del slider con Overlay protector para el 1er toque */}
            <div className="relative py-1">
              {!isCrossfaderActive && (
                <div
                  onClick={handleActivateCrossfader}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleActivateCrossfader();
                  }}
                  className="absolute inset-0 z-20 cursor-pointer flex items-center justify-center rounded-lg bg-zinc-950/75 border border-dashed border-purple-500/40 hover:border-purple-400 transition-all backdrop-blur-[0.5px] group"
                  title="Primer toque: Toca para activar el crossfader"
                >
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-300 text-[10px] font-bold shadow-md group-hover:scale-105 group-hover:border-purple-500 transition-all">
                    <Lock className="w-3 h-3 text-purple-400" />
                    <span>1er toque para activar</span>
                  </div>
                </div>
              )}

              <input
                type="range"
                min={-100}
                max={100}
                disabled={!isCrossfaderActive}
                value={crossfaderValue}
                onChange={(e) => {
                  setCrossfaderValue(Number(e.target.value));
                  resetCrossfaderTimer();
                }}
                onPointerDown={resetCrossfaderTimer}
                className={`w-full accent-purple-500 h-2.5 bg-zinc-800 rounded-lg appearance-none transition-all ${
                  isCrossfaderActive
                    ? "cursor-pointer ring-2 ring-purple-500/40 shadow-md shadow-purple-500/20"
                    : "opacity-40 cursor-not-allowed"
                }`}
              />
            </div>

            {/* Medidores de ganancia Deck A vs Deck B */}
            <div className="flex justify-between text-[9px] font-mono font-bold text-zinc-400 px-0.5">
              <span className={crossfaderValue < -20 ? "text-purple-400 font-black" : ""}>
                A: {Math.round(crossfaderGains.gainA * 100)}%
              </span>
              <span className={crossfaderValue > 20 ? "text-cyan-400 font-black" : ""}>
                B: {Math.round(crossfaderGains.gainB * 100)}%
              </span>
            </div>

            {/* Acceso rápido a posiciones (A / Centrar / B) */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (!isCrossfaderActive) {
                    handleActivateCrossfader();
                  } else {
                    setCrossfaderValue(-100);
                    resetCrossfaderTimer();
                  }
                }}
                className={`flex-1 py-1 px-1.5 rounded text-[9px] font-mono font-bold transition-all ${
                  crossfaderValue === -100
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-purple-300 border border-zinc-800"
                }`}
                title="Ir a Deck A (100%)"
              >
                ◀ Deck A
              </button>

              <button
                type="button"
                onClick={handleResetCrossfader}
                className={`flex-1 py-1 px-1.5 rounded text-[9px] font-mono font-bold transition-all flex items-center justify-center gap-1 select-none cursor-pointer ${
                  resetCrossfaderSuccess
                    ? "bg-emerald-500 text-black font-black shadow-md scale-105"
                    : resetCrossfaderArmed
                    ? "bg-amber-400 text-black font-black animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.6)] scale-105"
                    : crossfaderValue === 0
                    ? "bg-zinc-800 text-zinc-300 border border-zinc-700"
                    : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800"
                }`}
                title="Resetear Crossfader al Centro (50/50) en 2 toques"
              >
                {resetCrossfaderSuccess ? (
                  <span>✓ 50/50</span>
                ) : resetCrossfaderArmed ? (
                  <span>¿CONFIRMAR 50/50?</span>
                ) : (
                  <span>RESET (50/50)</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!isCrossfaderActive) {
                    handleActivateCrossfader();
                  } else {
                    setCrossfaderValue(100);
                    resetCrossfaderTimer();
                  }
                }}
                className={`flex-1 py-1 px-1.5 rounded text-[9px] font-mono font-bold transition-all ${
                  crossfaderValue === 100
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-cyan-300 border border-zinc-800"
                }`}
                title="Ir a Deck B (100%)"
              >
                Deck B ▶
              </button>
            </div>
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
                  onClick={handleSafeClearDeckB}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer select-none ${
                    resetDeckBState
                      ? "bg-amber-500 border-amber-400 text-black font-black animate-pulse shadow-md scale-105"
                      : "bg-red-950/40 hover:bg-red-900/60 border-red-800/60 hover:border-red-600 text-red-300"
                  }`}
                  title={
                    resetDeckBState
                      ? "2° toque: Toca para confirmar y limpiar/resetear la bandeja B"
                      : "1° toque: Toca para activar reseteo/limpieza de bandeja B"
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{resetDeckBState ? "¿CONFIRMAR RESET?" : "Limpiar"}</span>
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

                    {/* Botón para subir archivo MP3/WAV local (Web Audio API) */}
                    <button
                      type="button"
                      onClick={() => {
                        fileInputRefB.current?.click();
                        setIsSelectorOpenB(false);
                      }}
                      className="w-full text-left p-2 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer mb-1"
                    >
                      <Upload className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div className="flex flex-col">
                        <span>📁 Subir MP3 / Archivo local</span>
                        <span className="text-[10px] text-cyan-400 font-normal">Motor Web Audio API &bull; 0 Latencia &bull; Offline</span>
                      </div>
                    </button>

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
            deckMode={deckModeB}
            localFileName={localAudioNameB}
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
              <button
                type="button"
                onClick={handleResetPitchB}
                className={`text-[9px] font-mono transition-all rounded px-2 py-0.5 cursor-pointer font-bold select-none ${
                  resetSuccessPitchB
                    ? "bg-emerald-500 text-black font-black shadow-md scale-105"
                    : resetArmedPitchB
                    ? "bg-amber-400 text-black font-black animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.6)] scale-105"
                    : "text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 hover:border-cyan-500"
                }`}
                title={
                  resetArmedPitchB
                    ? "2° toque: Toca para resetear Pitch a 0%"
                    : "1° toque: Toca para activar reseteo a 0%"
                }
              >
                {resetSuccessPitchB ? "✓ 0.0%" : resetArmedPitchB ? "¿CONFIRMAR 0%?" : "RESET"}
              </button>
            </div>

            {/* Jogwheel Giratorio Deck B con soporte Drag & Drop */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingB(true);
              }}
              onDragLeave={() => setIsDraggingB(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingB(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleLoadLocalFileB(file);
              }}
              className="relative shrink-0 mx-auto"
            >
              <div
                className={`w-36 h-36 rounded-full bg-black border-4 ${
                  isDraggingB ? "border-cyan-400 scale-105" : "border-zinc-800"
                } shadow-[0_0_25px_rgba(6,182,212,0.2)] flex items-center justify-center relative cursor-grab active:cursor-grabbing transition-all ${
                  isPlayingB ? "animate-spin [animation-duration:3s]" : ""
                }`}
                onClick={togglePlayB}
                title="Jogwheel / Vinilo Deck B - Click para Play/Pausa o arrastra un MP3 aquí"
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
              onClick={togglePlayB}
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

      {/* Elementos de Audio Nativo Web Audio API (conectados al grafo de 44.1kHz) */}
      <audio
        ref={audioRefA}
        crossOrigin="anonymous"
        onTimeUpdate={() => {
          if (audioRefA.current && deckModeA === "native") {
            setPlaybackSecondsA(Math.floor(audioRefA.current.currentTime));
          }
        }}
        onEnded={() => {
          setIsPlayingA(false);
          if (engancheDirection === "A_TO_B" && !isEjectedB && trackB) {
            handleStartAutoEnganche();
          }
        }}
        className="hidden"
      />
      <audio
        ref={audioRefB}
        crossOrigin="anonymous"
        onTimeUpdate={() => {
          if (audioRefB.current && deckModeB === "native") {
            setPlaybackSecondsB(Math.floor(audioRefB.current.currentTime));
          }
        }}
        onEnded={() => {
          setIsPlayingB(false);
          if (engancheDirection === "B_TO_A" && !isEjectedA && trackA) {
            handleStartAutoEnganche();
          }
        }}
        className="hidden"
      />

      {/* Selectores de archivo ocultos para carga de MP3 / WAV local */}
      <input
        type="file"
        ref={fileInputRefA}
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleLoadLocalFileA(file);
          e.target.value = "";
        }}
      />
      <input
        type="file"
        ref={fileInputRefB}
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleLoadLocalFileB(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
