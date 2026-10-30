"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import {
  Play,
  Pause,
  Sliders,
  RotateCcw,
  RotateCw,
  Zap,
  Volume2,
  VolumeX,
  Disc,
  Disc3,
  Music,
  ChevronDown,
  ChevronUp,
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
  FastForward,
  Rewind,
  ListMusic,
  Columns,
  Maximize2,
  Minimize2,
  X,
  BookmarkPlus,
  BookmarkCheck,
  Loader2,
  Video,
  VideoOff,
  FileVideo,
} from "lucide-react";
import { calculateCrossfaderGains, djSoundEffects, webDjEngine, AudioLevels } from "@/lib/audio/dj-audio-engine";
import { MusicLibraryView, Song as LibSong } from "@/components/library/MusicLibraryView";
import { SaveToLibraryModal, SaveToLibraryData } from "@/components/library/SaveToLibraryModal";

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

export interface PendingDeckLoad {
  entry: QueueEntryData;
  targetDeck?: "AUTO" | "A" | "B";
  timestamp: number;
}

export interface PlaybackSyncDetails {
  currentTime?: number;
  duration?: number;
  trackTitle?: string;
  trackArtist?: string;
  videoId?: string | null;
  fileUrl?: string | null;
  isVideo?: boolean;
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
  pendingDeckLoad?: PendingDeckLoad | null;
  onDeckLoaded?: () => void;
  onPlaybackControl?: (
    action: "PLAY" | "PAUSE" | "SEEK",
    deckId?: "A" | "B",
    details?: PlaybackSyncDetails
  ) => void;
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
  mediaRef?: React.RefObject<HTMLVideoElement | null>;
  isVideo?: boolean;
  onTimeUpdate?: () => void;
  onEnded?: () => void;
  onClearVideo?: () => void;
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

// Iframe estático para YouTube:
// Solo se monta si hay un videoId real asignado a la bandeja y la bandeja no está vacía ni expulsada.
// Jamás se cargan videos de prueba ni IDs por defecto (elimina por completo voces o audios en inglés con bandejas vacías).
const StableIframe = memo(
  function StableIframe({ deckId, videoId, isEjected, iframeRef }: StableIframeProps) {
    const staticSrcRef = useRef<string>("");
    const prevVideoIdRef = useRef(videoId);
    if (prevVideoIdRef.current !== videoId) {
      prevVideoIdRef.current = videoId;
      staticSrcRef.current = "";
    }

    // Si la bandeja está vacía o expulsada, NO montar ningún iframe
    if (!videoId || isEjected) {
      staticSrcRef.current = "";
      return null;
    }

    if (!staticSrcRef.current) {
      const originParam =
        typeof window !== "undefined" && window.location.origin
          ? `&origin=${encodeURIComponent(window.location.origin)}`
          : "";
      staticSrcRef.current = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&playsinline=1&controls=0&modestbranding=1&rel=0&widgetid=${
        deckId === "A" ? 1 : 2
      }${originParam}`;
    }

    return (
      <iframe
        ref={iframeRef}
        id={`deck-${deckId.toLowerCase()}-iframe`}
        src={staticSrcRef.current}
        title={`Deck ${deckId} Audio Player`}
        className="w-full h-full border-0 pointer-events-auto transition-opacity duration-200 opacity-100 relative z-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    );
  },
  (prev, next) =>
    prev.deckId === next.deckId &&
    prev.videoId === next.videoId &&
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
    mediaRef,
    isVideo = false,
    onTimeUpdate,
    onEnded,
    onClearVideo,
  }: DeckPlayerProps) {
    const isA = deckId === "A";
    const borderColor = isA ? "border-purple-500/40" : "border-cyan-500/40";
    const textColor = isA ? "text-purple-300" : "text-cyan-300";
    const spinnerColor = isA ? "text-purple-400" : "text-cyan-400";
    const emptyText = isA
      ? "Bandeja A vacía — Carga desde cola, YouTube o arrastra MP4 / MP3"
      : "Bandeja B vacía — Carga desde cola, YouTube o arrastra MP4 / MP3";
    const chLabel = isA ? "CH 1" : "CH 2";
    const hasActiveTrack = (deckMode === "native" || Boolean(videoId)) && !isEjected;

    return (
      <div
        className={`relative aspect-video max-h-36 w-full rounded-xl overflow-hidden border ${borderColor} bg-black shadow-inner`}
      >
        {/* Elemento de Video / Audio Nativo Web Media & Web Audio API (Siempre montado para preservar grafo) */}
        {mediaRef && (
          <video
            ref={mediaRef}
            playsInline
            crossOrigin="anonymous"
            onTimeUpdate={onTimeUpdate}
            onEnded={onEnded}
            className={`w-full h-full object-contain bg-black ${
              deckMode === "native" && hasActiveTrack && isVideo ? "block" : "hidden"
            }`}
          />
        )}

        {deckMode === "native" && hasActiveTrack ? (
          isVideo ? (
            /* Badge de Video MP4 para VJ */
            <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[9px] font-bold text-amber-300 border border-amber-500/40 flex items-center gap-1 z-10 pointer-events-none">
              <Video className="w-2.5 h-2.5 text-amber-400" />
              <span>MP4 VIDEO VJ</span>
            </div>
          ) : (
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
          )
        ) : (
          /* Iframe aislado de YouTube: Solo se monta si hay una pista activa en la bandeja */
          Boolean(videoId) && !isEjected ? (
            <StableIframe deckId={deckId} videoId={videoId} isEjected={isEjected} iframeRef={iframeRef} />
          ) : null
        )}

        {/* Overlay HUD cuando hay pista activa */}
        {hasActiveTrack && (
          <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
            <span
              className={`px-2 py-0.5 rounded bg-black/80 ${textColor} text-[9px] font-mono font-bold border ${borderColor} backdrop-blur-xs`}
            >
              {chLabel} &bull; VOL: {effectiveVol}%
            </span>
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {Boolean(videoId) && onClearVideo && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClearVideo();
                  }}
                  className="px-1.5 py-0.5 rounded bg-black/85 hover:bg-rose-950 text-rose-300 hover:text-white border border-rose-500/50 hover:border-rose-400 text-[9px] font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-colors"
                  title={`Borrar solamente el video de la Bandeja ${deckId} (sin afectar audio ni la otra bandeja)`}
                >
                  <VideoOff className="w-2.5 h-2.5 text-rose-400" />
                  <span>Borrar Video</span>
                </button>
              )}
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
  pendingDeckLoad,
  onDeckLoaded,
  onPlaybackControl,
}: VirtualDjConsoleProps) {
  // ==================== MASTER AUDIO CABINA STATE ====================
  const [isMasterMuted, setIsMasterMuted] = useState(false);
  const [masterVolume, setMasterVolume] = useState(100);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // ==================== DECK A STATE ====================
  const [isEjectedA, setIsEjectedA] = useState(false);
  const [deckTrackA, setDeckTrackA] = useState<SongRequestData | null>(() => currentPlaying?.songRequest || null);
  const [manualTrackA, setManualTrackA] = useState<SongRequestData | null>(null);
  const [isPlayingA, setIsPlayingA] = useState(false);
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
  const [deckTrackB, setDeckTrackB] = useState<SongRequestData | null>(null);
  const [deckQueueEntryIdB, setDeckQueueEntryIdB] = useState<string | null>(null);
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
  const audioRefA = useRef<HTMLVideoElement | null>(null);
  const audioRefB = useRef<HTMLVideoElement | null>(null);
  const [isVideoA, setIsVideoA] = useState(false);
  const [isVideoB, setIsVideoB] = useState(false);
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

  // ==================== REAL VINYL TURNTABLE & NUDGE ENGINE ====================
  const platterRefA = useRef<HTMLDivElement | null>(null);
  const platterRefB = useRef<HTMLDivElement | null>(null);
  const platterAngleRefA = useRef<number>(0);
  const platterAngleRefB = useRef<number>(0);

  const [vinylActionA, setVinylActionA] = useState<"IDLE" | "REWIND" | "FORWARD" | "SPINBACK" | "SCRATCH">("IDLE");
  const [vinylActionB, setVinylActionB] = useState<"IDLE" | "REWIND" | "FORWARD" | "SPINBACK" | "SCRATCH">("IDLE");

  const isSpinbackingARef = useRef(false);
  const isSpinbackingBRef = useRef(false);
  const isPlatterTouchingARef = useRef(false);
  const isPlatterTouchingBRef = useRef(false);

  const continuousNudgeIntervalRefA = useRef<NodeJS.Timeout | null>(null);
  const continuousNudgeIntervalRefB = useRef<NodeJS.Timeout | null>(null);

  const platterLastAngleARef = useRef<number>(0);
  const platterLastAngleBRef = useRef<number>(0);
  const lastScratchSoundTimeARef = useRef<number>(0);
  const lastScratchSoundTimeBRef = useRef<number>(0);

  // ==================== IN-CONSOLE MUSIC LIBRARY (SIN PAUSAR AUDIO) ====================
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryViewMode, setLibraryViewMode] = useState<"drawer" | "split">("drawer");
  const [libraryTargetDeckHint, setLibraryTargetDeckHint] = useState<"A" | "B" | null>(null);

  // ==================== GUARDAR EN BIBLIOTECA (TRACKS EN REPRODUCCIÓN) ====================
  const [savingDeckA, setSavingDeckA] = useState(false);
  const [savedDeckA, setSavedDeckA] = useState(false);
  const [savingDeckB, setSavingDeckB] = useState(false);
  const [savedDeckB, setSavedDeckB] = useState(false);

  // ==================== 2-TOUCH SAFETY: CROSSFADER & RESET ====================
  const [isCrossfaderActive, setIsCrossfaderActive] = useState(false);
  const crossfaderTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Ref y animador suave del Crossfader hacia la bandeja activa
  const crossfaderValueRef = useRef(crossfaderValue);
  useEffect(() => {
    crossfaderValueRef.current = crossfaderValue;
  }, [crossfaderValue]);

  const crossfaderAnimRef = useRef<NodeJS.Timeout | null>(null);

  const animateCrossfaderTo = useCallback((target: number, durationMs = 600) => {
    if (crossfaderAnimRef.current) {
      clearInterval(crossfaderAnimRef.current);
      crossfaderAnimRef.current = null;
    }
    const startVal = crossfaderValueRef.current;
    if (Math.abs(startVal - target) < 1) {
      setCrossfaderValue(target);
      return;
    }
    const intervalMs = 25;
    const totalSteps = Math.max(1, Math.round(durationMs / intervalMs));
    let step = 0;

    crossfaderAnimRef.current = setInterval(() => {
      step++;
      const progress = Math.min(1, step / totalSteps);
      const nextVal = Math.round(startVal + (target - startVal) * progress);
      setCrossfaderValue(nextVal);

      if (step >= totalSteps) {
        if (crossfaderAnimRef.current) {
          clearInterval(crossfaderAnimRef.current);
          crossfaderAnimRef.current = null;
        }
        setCrossfaderValue(target);
      }
    }, intervalMs);
  }, [setCrossfaderValue]);

  // Guardias de debounce y referencias para fin de pista en Decks A y B
  const isEndingARef = useRef(false);
  const isEndingBRef = useRef(false);
  const handleDeckAEndedRef = useRef<() => void>(() => {});
  const handleDeckBEndedRef = useRef<() => void>(() => {});

  const resetCrossfaderTimer = () => {
    if (crossfaderTimerRef.current) clearTimeout(crossfaderTimerRef.current);
    crossfaderTimerRef.current = setTimeout(() => {
      setIsCrossfaderActive(false);
    }, 6000); // 6s de inactividad antes de re-bloquear
  };

  const handleActivateCrossfader = () => {
    setIsCrossfaderActive(true);
    resetCrossfaderTimer();
  };

  // ==================== 2-TOUCH SAFETY: PITCH FADERS A & B ====================
  const [isPitchActiveA, setIsPitchActiveA] = useState(false);
  const pitchTimerARef = useRef<NodeJS.Timeout | null>(null);

  const resetPitchTimerA = () => {
    if (pitchTimerARef.current) clearTimeout(pitchTimerARef.current);
    pitchTimerARef.current = setTimeout(() => {
      setIsPitchActiveA(false);
    }, 6000); // 6s de inactividad antes de re-bloquear
  };

  const handleActivatePitchA = () => {
    setIsPitchActiveA(true);
    resetPitchTimerA();
  };

  const [isPitchActiveB, setIsPitchActiveB] = useState(false);
  const pitchTimerBRef = useRef<NodeJS.Timeout | null>(null);

  const resetPitchTimerB = () => {
    if (pitchTimerBRef.current) clearTimeout(pitchTimerBRef.current);
    pitchTimerBRef.current = setTimeout(() => {
      setIsPitchActiveB(false);
    }, 6000); // 6s de inactividad antes de re-bloquear
  };

  const handleActivatePitchB = () => {
    setIsPitchActiveB(true);
    resetPitchTimerB();
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
    } else {
      // 2do toque: Acción
      if (resetTimerPitchARef.current) clearTimeout(resetTimerPitchARef.current);
      resetArmedPitchARef.current = false;
      setResetArmedPitchA(false);
      setPitchA(0);
      setResetSuccessPitchA(true);
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
    } else {
      // 2do toque: Acción
      if (resetTimerPitchBRef.current) clearTimeout(resetTimerPitchBRef.current);
      resetArmedPitchBRef.current = false;
      setResetArmedPitchB(false);
      setPitchB(0);
      setIsSyncedB(false);
      setResetSuccessPitchB(true);
      setTimeout(() => setResetSuccessPitchB(false), 1500);
    }
  };

  // ==================== 2-TOUCH TEMPO ADJUST (SUBIR / BAJAR TIEMPO) ====================
  // Deck A: Subir Tiempo (+0.5% pitch)
  const pitchUpArmedARef = useRef(false);
  const [pitchUpArmedA, setPitchUpArmedA] = useState(false);
  const [pitchUpSuccessA, setPitchUpSuccessA] = useState(false);
  const pitchUpTimerARef = useRef<NodeJS.Timeout | null>(null);

  const handlePitchUpA = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (pitchDownArmedARef.current) {
      pitchDownArmedARef.current = false;
      setPitchDownArmedA(false);
      if (pitchDownTimerARef.current) clearTimeout(pitchDownTimerARef.current);
    }
    if (!pitchUpArmedARef.current) {
      // 1er toque: Armar / Activar
      pitchUpArmedARef.current = true;
      setPitchUpArmedA(true);
      if (pitchUpTimerARef.current) clearTimeout(pitchUpTimerARef.current);
      pitchUpTimerARef.current = setTimeout(() => {
        pitchUpArmedARef.current = false;
        setPitchUpArmedA(false);
      }, 3500);
    } else {
      // 2do toque: Ejecutar acción
      if (pitchUpTimerARef.current) clearTimeout(pitchUpTimerARef.current);
      pitchUpArmedARef.current = false;
      setPitchUpArmedA(false);
      setPitchA((prev) => Math.min(8, Number((prev + 0.5).toFixed(1))));
      resetPitchTimerA();
      setPitchUpSuccessA(true);
      setTimeout(() => setPitchUpSuccessA(false), 1200);
    }
  };

  // Deck A: Bajar Tiempo (-0.5% pitch)
  const pitchDownArmedARef = useRef(false);
  const [pitchDownArmedA, setPitchDownArmedA] = useState(false);
  const [pitchDownSuccessA, setPitchDownSuccessA] = useState(false);
  const pitchDownTimerARef = useRef<NodeJS.Timeout | null>(null);

  const handlePitchDownA = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (pitchUpArmedARef.current) {
      pitchUpArmedARef.current = false;
      setPitchUpArmedA(false);
      if (pitchUpTimerARef.current) clearTimeout(pitchUpTimerARef.current);
    }
    if (!pitchDownArmedARef.current) {
      // 1er toque: Armar / Activar
      pitchDownArmedARef.current = true;
      setPitchDownArmedA(true);
      if (pitchDownTimerARef.current) clearTimeout(pitchDownTimerARef.current);
      pitchDownTimerARef.current = setTimeout(() => {
        pitchDownArmedARef.current = false;
        setPitchDownArmedA(false);
      }, 3500);
    } else {
      // 2do toque: Ejecutar acción
      if (pitchDownTimerARef.current) clearTimeout(pitchDownTimerARef.current);
      pitchDownArmedARef.current = false;
      setPitchDownArmedA(false);
      setPitchA((prev) => Math.max(-8, Number((prev - 0.5).toFixed(1))));
      resetPitchTimerA();
      setPitchDownSuccessA(true);
      setTimeout(() => setPitchDownSuccessA(false), 1200);
    }
  };

  // Deck B: Subir Tiempo (+0.5% pitch)
  const pitchUpArmedBRef = useRef(false);
  const [pitchUpArmedB, setPitchUpArmedB] = useState(false);
  const [pitchUpSuccessB, setPitchUpSuccessB] = useState(false);
  const pitchUpTimerBRef = useRef<NodeJS.Timeout | null>(null);

  const handlePitchUpB = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (pitchDownArmedBRef.current) {
      pitchDownArmedBRef.current = false;
      setPitchDownArmedB(false);
      if (pitchDownTimerBRef.current) clearTimeout(pitchDownTimerBRef.current);
    }
    if (!pitchUpArmedBRef.current) {
      // 1er toque: Armar / Activar
      pitchUpArmedBRef.current = true;
      setPitchUpArmedB(true);
      if (pitchUpTimerBRef.current) clearTimeout(pitchUpTimerBRef.current);
      pitchUpTimerBRef.current = setTimeout(() => {
        pitchUpArmedBRef.current = false;
        setPitchUpArmedB(false);
      }, 3500);
    } else {
      // 2do toque: Ejecutar acción
      if (pitchUpTimerBRef.current) clearTimeout(pitchUpTimerBRef.current);
      pitchUpArmedBRef.current = false;
      setPitchUpArmedB(false);
      setPitchB((prev) => Math.min(8, Number((prev + 0.5).toFixed(1))));
      setIsSyncedB(false);
      resetPitchTimerB();
      setPitchUpSuccessB(true);
      setTimeout(() => setPitchUpSuccessB(false), 1200);
    }
  };

  // Deck B: Bajar Tiempo (-0.5% pitch)
  const pitchDownArmedBRef = useRef(false);
  const [pitchDownArmedB, setPitchDownArmedB] = useState(false);
  const [pitchDownSuccessB, setPitchDownSuccessB] = useState(false);
  const pitchDownTimerBRef = useRef<NodeJS.Timeout | null>(null);

  const handlePitchDownB = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (pitchUpArmedBRef.current) {
      pitchUpArmedBRef.current = false;
      setPitchUpArmedB(false);
      if (pitchUpTimerBRef.current) clearTimeout(pitchUpTimerBRef.current);
    }
    if (!pitchDownArmedBRef.current) {
      // 1er toque: Armar / Activar
      pitchDownArmedBRef.current = true;
      setPitchDownArmedB(true);
      if (pitchDownTimerBRef.current) clearTimeout(pitchDownTimerBRef.current);
      pitchDownTimerBRef.current = setTimeout(() => {
        pitchDownArmedBRef.current = false;
        setPitchDownArmedB(false);
      }, 3500);
    } else {
      // 2do toque: Ejecutar acción
      if (pitchDownTimerBRef.current) clearTimeout(pitchDownTimerBRef.current);
      pitchDownArmedBRef.current = false;
      setPitchDownArmedB(false);
      setPitchB((prev) => Math.max(-8, Number((prev - 0.5).toFixed(1))));
      setIsSyncedB(false);
      resetPitchTimerB();
      setPitchDownSuccessB(true);
      setTimeout(() => setPitchDownSuccessB(false), 1200);
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
    } else {
      // 2do toque: Acción
      if (resetCrossfaderTimerRef.current) clearTimeout(resetCrossfaderTimerRef.current);
      resetCrossfaderArmedRef.current = false;
      setResetCrossfaderArmed(false);
      setCrossfaderValue(0);
      setResetCrossfaderSuccess(true);
      resetCrossfaderTimer();
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
    } else {
      if (resetDeckATimer.current) clearTimeout(resetDeckATimer.current);
      resetDeckARef.current = false;
      setResetDeckAState(false);
      handleClearDeckA();
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
    } else {
      if (resetDeckBTimer.current) clearTimeout(resetDeckBTimer.current);
      resetDeckBRef.current = false;
      setResetDeckBState(false);
      handleClearDeckB();
    }
  };

  useEffect(() => {
    return () => {
      if (crossfaderAnimRef.current) clearInterval(crossfaderAnimRef.current);
      if (crossfaderTimerRef.current) clearTimeout(crossfaderTimerRef.current);
      if (pitchTimerARef.current) clearTimeout(pitchTimerARef.current);
      if (pitchTimerBRef.current) clearTimeout(pitchTimerBRef.current);
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

  // Reiniciar estado de guardado cuando cambia la pista montada en Deck A o Deck B
  useEffect(() => {
    setSavedDeckA(false);
  }, [trackA?.id, trackA?.customTitle, videoIdA, localAudioNameA]);

  useEffect(() => {
    setSavedDeckB(false);
  }, [trackB?.id, trackB?.customTitle, videoIdB, localAudioNameB]);

  // Rotación física continua del vinilo a ~33 1/3 RPM sincronizado con BPM y pitch
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Deck A: gira físicamente según BPM y tempo
      if (isPlayingA && !isPlatterTouchingARef.current && !isSpinbackingARef.current) {
        const speedFactor = effectiveBpmA > 0 ? effectiveBpmA / 124 : 1;
        platterAngleRefA.current = (platterAngleRefA.current + 200 * speedFactor * delta) % 360000;
        if (platterRefA.current) {
          platterRefA.current.style.transform = `rotate(${platterAngleRefA.current}deg)`;
        }
      }

      // Deck B: gira físicamente según BPM y tempo
      if (isPlayingB && !isPlatterTouchingBRef.current && !isSpinbackingBRef.current) {
        const speedFactor = effectiveBpmB > 0 ? effectiveBpmB / 124 : 1;
        platterAngleRefB.current = (platterAngleRefB.current + 200 * speedFactor * delta) % 360000;
        if (platterRefB.current) {
          platterRefB.current.style.transform = `rotate(${platterAngleRefB.current}deg)`;
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlayingA, isPlayingB, effectiveBpmA, effectiveBpmB]);

  // Eventos de apertura de biblioteca integrada y atajos de teclado (Tecla B / Esc)
  useEffect(() => {
    const handleOpen = (e: any) => {
      setIsLibraryOpen(true);
      if (e?.detail?.targetDeck) {
        setLibraryTargetDeckHint(e.detail.targetDeck);
      }
      setTimeout(() => {
        const libEl = document.getElementById("dj-library-section");
        if (libEl) {
          libEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 120);
    };
    const handleToggle = () => {
      setIsLibraryOpen((prev) => !prev);
    };

    window.addEventListener("open-dj-library", handleOpen);
    window.addEventListener("toggle-dj-library", handleToggle);

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT");
      if (isInput) return;

      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        setIsLibraryOpen((prev) => !prev);
      } else if (e.key === "Escape" && isLibraryOpen) {
        setIsLibraryOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("open-dj-library", handleOpen);
      window.removeEventListener("toggle-dj-library", handleToggle);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLibraryOpen]);

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

  // Cargar video en iframe de forma 100% aislada usando cueVideoById / loadVideoById por postMessage
  const loadVideoIntoIframe = (
    iframe: HTMLIFrameElement | null,
    vid: string,
    volume: number,
    autoPlay: boolean = false
  ) => {
    if (!iframe) return;
    if (autoPlay) {
      sendPlayerCommand(iframe, "loadVideoById", [vid, 0]);
      sendPlayerCommand(iframe, "unMute");
      sendPlayerCommand(iframe, "setVolume", [volume]);
      sendPlayerCommand(iframe, "playVideo");
      sendPlayerCommand(iframe, "addEventListener", ["onStateChange"]);
      // Retry de volumen y reproducción tras 400ms para asegurar arranque confiable
      setTimeout(() => {
        if (iframe) {
          sendPlayerCommand(iframe, "unMute");
          sendPlayerCommand(iframe, "setVolume", [volume]);
          sendPlayerCommand(iframe, "playVideo");
          sendPlayerCommand(iframe, "addEventListener", ["onStateChange"]);
        }
      }, 400);
    } else {
      // Modo CUE (por defecto): Cargar en segundo 0 y mantener pausado esperando PLAY manual
      sendPlayerCommand(iframe, "cueVideoById", [vid, 0]);
      sendPlayerCommand(iframe, "pauseVideo");
      sendPlayerCommand(iframe, "seekTo", [0, true]);
      sendPlayerCommand(iframe, "unMute");
      sendPlayerCommand(iframe, "setVolume", [volume]);
      sendPlayerCommand(iframe, "addEventListener", ["onStateChange"]);
      setTimeout(() => {
        if (iframe) {
          sendPlayerCommand(iframe, "pauseVideo");
          sendPlayerCommand(iframe, "seekTo", [0, true]);
        }
      }, 350);
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

  // Desbloquear audio del navegador (solo envía comandos a bandejas con pista activa real)
  const unlockAudioA = () => {
    setAudioUnlocked(true);
    setIsMasterMuted(false);
    webDjEngine.unlock();
    if (iframeRefA.current && videoIdA && !isEjectedA) {
      if (effectiveVolA === 0) {
        sendPlayerCommand(iframeRefA.current, "mute");
        sendPlayerCommand(iframeRefA.current, "setVolume", [0]);
      } else {
        sendPlayerCommand(iframeRefA.current, "unMute");
        sendPlayerCommand(iframeRefA.current, "setVolume", [effectiveVolA]);
      }
      if (isPlayingA) sendPlayerCommand(iframeRefA.current, "playVideo");
    }
  };

  const unlockAudioB = () => {
    setAudioUnlocked(true);
    setIsMasterMuted(false);
    webDjEngine.unlock();
    if (iframeRefB.current && videoIdB && !isEjectedB) {
      if (effectiveVolB === 0) {
        sendPlayerCommand(iframeRefB.current, "mute");
        sendPlayerCommand(iframeRefB.current, "setVolume", [0]);
      } else {
        sendPlayerCommand(iframeRefB.current, "unMute");
        sendPlayerCommand(iframeRefB.current, "setVolume", [effectiveVolB]);
      }
      if (isPlayingB) sendPlayerCommand(iframeRefB.current, "playVideo");
    }
  };

  const unlockAudio = () => {
    setAudioUnlocked(true);
    setIsMasterMuted(false);
    webDjEngine.unlock();
    if (iframeRefA.current && videoIdA && !isEjectedA) {
      if (effectiveVolA === 0) {
        sendPlayerCommand(iframeRefA.current, "mute");
        sendPlayerCommand(iframeRefA.current, "setVolume", [0]);
      } else {
        sendPlayerCommand(iframeRefA.current, "unMute");
        sendPlayerCommand(iframeRefA.current, "setVolume", [effectiveVolA]);
      }
      if (isPlayingA) sendPlayerCommand(iframeRefA.current, "playVideo");
    }
    if (iframeRefB.current && videoIdB && !isEjectedB) {
      if (effectiveVolB === 0) {
        sendPlayerCommand(iframeRefB.current, "mute");
        sendPlayerCommand(iframeRefB.current, "setVolume", [0]);
      } else {
        sendPlayerCommand(iframeRefB.current, "unMute");
        sendPlayerCommand(iframeRefB.current, "setVolume", [effectiveVolB]);
      }
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

  // ==================== SCREEN WAKE LOCK & BACKGROUND AUDIO ANCHOR ====================
  const wakeLockRef = useRef<any>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  const startSilentAudioAnchor = () => {
    if (silentAudioRef.current) {
      silentAudioRef.current.play().catch(() => {});
    }
  };

  const requestWakeLock = async () => {
    if (typeof window === "undefined" || !("wakeLock" in navigator)) return;
    try {
      if (document.visibilityState === "visible") {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      }
    } catch {
      // Silencioso si la batería está baja o ventana no enfocada
    }
  };

  useEffect(() => {
    requestWakeLock();
    startSilentAudioAnchor();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // El DJ salió de la app (cambió a WhatsApp, minimizó o fue al inicio)
        // 1. Mantener activo el ancla de audio para que el SO no suspenda el proceso
        startSilentAudioAnchor();

        // 2. Anular el auto-pausado forzado por YouTube embebido en segundo plano solo si hay pista activa
        if (isPlayingA && iframeRefA.current && videoIdA && !isEjectedA) {
          setTimeout(() => {
            if (iframeRefA.current && videoIdA && !isEjectedA) {
              sendPlayerCommand(iframeRefA.current, "unMute");
              sendPlayerCommand(iframeRefA.current, "playVideo");
            }
          }, 150);
          setTimeout(() => {
            if (iframeRefA.current && videoIdA && !isEjectedA) {
              sendPlayerCommand(iframeRefA.current, "unMute");
              sendPlayerCommand(iframeRefA.current, "playVideo");
            }
          }, 500);
        }

        if (isPlayingB && iframeRefB.current && videoIdB && !isEjectedB) {
          setTimeout(() => {
            if (iframeRefB.current && videoIdB && !isEjectedB) {
              sendPlayerCommand(iframeRefB.current, "unMute");
              sendPlayerCommand(iframeRefB.current, "playVideo");
            }
          }, 150);
          setTimeout(() => {
            if (iframeRefB.current && videoIdB && !isEjectedB) {
              sendPlayerCommand(iframeRefB.current, "unMute");
              sendPlayerCommand(iframeRefB.current, "playVideo");
            }
          }, 500);
        }
      } else {
        // El DJ volvió a la app
        requestWakeLock();
        webDjEngine.unlock();
        startSilentAudioAnchor();

        if (isPlayingA && iframeRefA.current && videoIdA && !isEjectedA) {
          if (effectiveVolA === 0) {
            sendPlayerCommand(iframeRefA.current, "mute");
            sendPlayerCommand(iframeRefA.current, "setVolume", [0]);
          } else {
            sendPlayerCommand(iframeRefA.current, "unMute");
            sendPlayerCommand(iframeRefA.current, "setVolume", [effectiveVolA]);
          }
          sendPlayerCommand(iframeRefA.current, "playVideo");
        }
        if (isPlayingB && iframeRefB.current && videoIdB && !isEjectedB) {
          if (effectiveVolB === 0) {
            sendPlayerCommand(iframeRefB.current, "mute");
            sendPlayerCommand(iframeRefB.current, "setVolume", [0]);
          } else {
            sendPlayerCommand(iframeRefB.current, "unMute");
            sendPlayerCommand(iframeRefB.current, "setVolume", [effectiveVolB]);
          }
          sendPlayerCommand(iframeRefB.current, "playVideo");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isPlayingA, isPlayingB, effectiveVolA, effectiveVolB]);



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
  const channelOnlyVolA = isMasterMuted ? 0 : Math.min(100, Math.round((channelVolA / 100) * (gainA / 100) * 100));
  const channelOnlyVolB = isMasterMuted ? 0 : Math.min(100, Math.round((channelVolB / 100) * (gainB / 100) * 100));

  useEffect(() => {
    webDjEngine.setChannelVolume("A", channelOnlyVolA);
  }, [channelOnlyVolA]);

  useEffect(() => {
    webDjEngine.setChannelVolume("B", channelOnlyVolB);
  }, [channelOnlyVolB]);

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

  // Controladores de carga de archivos locales MP3 / WAV / MP4 Video
  const handleLoadLocalFileA = (file: File) => {
    if (!file) return;
    const isVideo = file.type.startsWith("video/") || Boolean(file.name.match(/\.(mp4|webm|mov|m4v|mkv|avi)$/i));
    setIsVideoA(isVideo);

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
      customArtist: isVideo ? "Video MP4 (Web Media)" : "Pista Local (Web Audio)",
      notes: null,
      createdAt: new Date().toISOString(),
      table: { id: "local", number: 0, label: "Cabina DJ" },
      guestSession: null,
      song: {
        id: `local-song-${Date.now()}`,
        title: cleanName,
        durationSeconds: 240,
        genre: isVideo ? "Video Musical / VJ" : "DJ Mix",
        bpm: 126,
        key: "8A / Am",
        artist: { name: isVideo ? "Video MP4 (Web Media)" : "Pista Local (Web Audio)" },
      },
    };

    setDeckTrackA(syntheticTrack);
    setManualTrackA(syntheticTrack);
    setPlaybackSecondsA(0);
    setIsPlayingA(false);
    webDjEngine.unlock();

    if (audioRefA.current) {
      audioRefA.current.src = url;
      audioRefA.current.currentTime = 0;
      audioRefA.current.pause();
    }

    showFeedback("success", `📁 ${isVideo ? "Video MP4" : "Pista local"} cargada en Deck A: "${cleanName}" (Listo para Play)`);
  };

  const handleLoadLocalFileB = (file: File) => {
    if (!file) return;
    const isVideo = file.type.startsWith("video/") || Boolean(file.name.match(/\.(mp4|webm|mov|m4v|mkv|avi)$/i));
    setIsVideoB(isVideo);

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
      customArtist: isVideo ? "Video MP4 (Web Media)" : "Pista Local (Web Audio)",
      notes: null,
      createdAt: new Date().toISOString(),
      table: { id: "local", number: 0, label: "Cabina DJ" },
      guestSession: null,
      song: {
        id: `local-song-b-${Date.now()}`,
        title: cleanName,
        durationSeconds: 240,
        genre: isVideo ? "Video Musical / VJ" : "DJ Mix",
        bpm: 128,
        key: "9A / Em",
        artist: { name: isVideo ? "Video MP4 (Web Media)" : "Pista Local (Web Audio)" },
      },
    };

    setDeckTrackB(syntheticTrack);
    setManualTrackB(syntheticTrack);
    setPlaybackSecondsB(0);
    setIsPlayingB(false);
    webDjEngine.unlock();

    if (audioRefB.current) {
      audioRefB.current.src = url;
      audioRefB.current.currentTime = 0;
      audioRefB.current.pause();
    }

    showFeedback("success", `📁 ${isVideo ? "Video MP4" : "Pista local"} cargada en Deck B: "${cleanName}" (Listo para Play)`);
  };

  // Helper para generar metadata enriquecida de sincronización con la pantalla de TV
  const getDeckSyncDetails = useCallback(
    (deck: "A" | "B"): PlaybackSyncDetails => {
      if (deck === "A") {
        const title = trackA?.song?.title || trackA?.customTitle || localAudioNameA || "Pista Deck A";
        const artist = trackA?.song?.artist?.name || trackA?.customArtist || "DJ Mix";
        return {
          currentTime: playbackSecondsA,
          duration: trackADuration,
          trackTitle: title,
          trackArtist: artist,
          videoId: videoIdA,
          fileUrl: (trackA?.song as any)?.fileUrl || localAudioUrlA || null,
          isVideo: isVideoA,
        };
      } else {
        const title = trackB?.song?.title || trackB?.customTitle || localAudioNameB || "Pista Deck B";
        const artist = trackB?.song?.artist?.name || trackB?.customArtist || "DJ Mix";
        return {
          currentTime: playbackSecondsB,
          duration: trackBDuration,
          trackTitle: title,
          trackArtist: artist,
          videoId: videoIdB,
          fileUrl: (trackB?.song as any)?.fileUrl || localAudioUrlB || null,
          isVideo: isVideoB,
        };
      }
    },
    [
      trackA,
      trackB,
      localAudioNameA,
      localAudioNameB,
      localAudioUrlA,
      localAudioUrlB,
      playbackSecondsA,
      playbackSecondsB,
      trackADuration,
      trackBDuration,
      videoIdA,
      videoIdB,
      isVideoA,
      isVideoB,
    ]
  );

  // Determinar la bandeja actualmente al aire según reproducción simultánea y posición del crossfader
  const currentOnAirDeck = useMemo<"A" | "B" | null>(() => {
    if (!isPlayingA && !isPlayingB) return null;
    if (isPlayingA && !isPlayingB) return "A";
    if (isPlayingB && !isPlayingA) return "B";
    // Ambas bandejas están reproduciendo al mismo tiempo: la salida al aire está gobernada por el crossfader
    return crossfaderValue > 0 ? "B" : "A";
  }, [isPlayingA, isPlayingB, crossfaderValue]);

  // Estado para el modal de confirmación y selección de categoría al guardar en biblioteca
  const [saveLibraryTrackData, setSaveLibraryTrackData] = useState<SaveToLibraryData | null>(null);
  const [isSaveLibraryModalOpen, setIsSaveLibraryModalOpen] = useState(false);

  // Abrir modal interactivo para guardar en la Biblioteca Musical preguntando categoría
  const handleSaveDeckToLibrary = useCallback(
    (deck: "A" | "B") => {
      const isDeckA = deck === "A";
      const track = isDeckA ? trackA : trackB;
      const videoId = isDeckA ? videoIdA : videoIdB;
      const localName = isDeckA ? localAudioNameA : localAudioNameB;
      const duration = isDeckA ? trackADuration : trackBDuration;
      const bpm = isDeckA ? baseBpmA : baseBpmB;

      if (!track && !videoId && !localName) {
        showFeedback("info", "No hay ninguna pista en la bandeja para guardar.");
        return;
      }

      let rawTitle = track?.song?.title || track?.customTitle || localName || `Pista en Bandeja ${deck}`;
      let rawArtist = track?.song?.artist?.name || track?.customArtist || "";

      // Si el título contiene " - ", intentar separar Artista y Título
      if (!rawArtist && rawTitle.includes(" - ")) {
        const parts = rawTitle.split(" - ");
        rawArtist = parts[0].trim();
        rawTitle = parts.slice(1).join(" - ").trim();
      }

      // Limpiar sufijos típicos de YouTube ("(Official Video)", "[Audio Oficial]", etc.)
      const cleanTitle = rawTitle
        .replace(/\s*[\(\[](official\s*video|audio\s*oficial|video\s*oficial|letra|lyrics|hd|4k|videoclip|video)[\)\]]/gi, "")
        .replace(/\.[^/.]+$/, "") // Quitar extensión si es archivo local
        .trim();

      if (!rawArtist) {
        rawArtist = "Artista Cabina DJ";
      }

      const fileUrl = videoId
        ? `https://www.youtube.com/watch?v=${videoId}`
        : (track?.song as any)?.fileUrl || null;

      // Sugerencia inicial de categoría
      const initialGenre = track?.song?.genre || (isDeckA ? "Cumbia / Cuarteto / Fiesta" : "Reggaeton / Urbano / RKT");

      setSaveLibraryTrackData({
        deckLabel: `Deck ${deck}`,
        title: cleanTitle || rawTitle,
        artistName: rawArtist,
        initialGenre,
        bpm: bpm ? Math.round(bpm) : 124,
        key: track?.song?.key || "8A / Am",
        durationSeconds: duration || 210,
        fileUrl,
        defaultType: "BOTH",
      });
      setIsSaveLibraryModalOpen(true);
    },
    [
      trackA,
      trackB,
      videoIdA,
      videoIdB,
      localAudioNameA,
      localAudioNameB,
      trackADuration,
      trackBDuration,
      baseBpmA,
      baseBpmB,
      showFeedback,
    ]
  );

  const handleSaveLibrarySuccess = (savedSong: any, categoryName: string, alreadyExists: boolean) => {
    if (saveLibraryTrackData?.deckLabel?.includes("Deck A")) {
      setSavedDeckA(true);
    } else if (saveLibraryTrackData?.deckLabel?.includes("Deck B")) {
      setSavedDeckB(true);
    }
  };

  // Play / Pause toggles con soporte dual Web Audio / YouTube y desplazamiento de crossfader
  const togglePlayA = () => {
    webDjEngine.unlock();
    if (isEjectedA || !trackA) return;

    if (deckModeA === "native" && audioRefA.current) {
      if (isPlayingA) {
        audioRefA.current.pause();
        setIsPlayingA(false);
        if (isPlayingB) {
          onPlaybackControl?.("PLAY", "B", getDeckSyncDetails("B"));
        } else {
          onPlaybackControl?.("PAUSE", "A", getDeckSyncDetails("A"));
        }
      } else {
        audioRefA.current.play().catch(() => {});
        setIsPlayingA(true);
        if (isPlayingB) {
          const onAir = crossfaderValue > 0 ? "B" : "A";
          onPlaybackControl?.("PLAY", onAir, getDeckSyncDetails(onAir));
        } else {
          onPlaybackControl?.("PLAY", "A", getDeckSyncDetails("A"));
          animateCrossfaderTo(-100, 500);
        }
      }
      return;
    }

    if (isPlayingA) {
      if (iframeRefA.current) sendPlayerCommand(iframeRefA.current, "pauseVideo");
      setIsPlayingA(false);
      if (isPlayingB) {
        onPlaybackControl?.("PLAY", "B", getDeckSyncDetails("B"));
      } else {
        onPlaybackControl?.("PAUSE", "A", getDeckSyncDetails("A"));
      }
    } else {
      unlockAudioA();
      if (iframeRefA.current) {
        if (effectiveVolA === 0) {
          sendPlayerCommand(iframeRefA.current, "mute");
          sendPlayerCommand(iframeRefA.current, "setVolume", [0]);
        } else {
          sendPlayerCommand(iframeRefA.current, "unMute");
          sendPlayerCommand(iframeRefA.current, "setVolume", [effectiveVolA]);
        }
        sendPlayerCommand(iframeRefA.current, "playVideo");
      }
      setIsPlayingA(true);
      if (isPlayingB) {
        const onAir = crossfaderValue > 0 ? "B" : "A";
        onPlaybackControl?.("PLAY", onAir, getDeckSyncDetails(onAir));
      } else {
        onPlaybackControl?.("PLAY", "A", getDeckSyncDetails("A"));
        animateCrossfaderTo(-100, 500);
      }
    }
  };

  const togglePlayB = () => {
    webDjEngine.unlock();
    if (isEjectedB || !trackB) return;

    if (deckModeB === "native" && audioRefB.current) {
      if (isPlayingB) {
        audioRefB.current.pause();
        setIsPlayingB(false);
        if (isPlayingA) {
          onPlaybackControl?.("PLAY", "A", getDeckSyncDetails("A"));
        } else {
          onPlaybackControl?.("PAUSE", "B", getDeckSyncDetails("B"));
        }
      } else {
        audioRefB.current.play().catch(() => {});
        setIsPlayingB(true);
        if (isPlayingA) {
          const onAir = crossfaderValue > 0 ? "B" : "A";
          onPlaybackControl?.("PLAY", onAir, getDeckSyncDetails(onAir));
        } else {
          onPlaybackControl?.("PLAY", "B", getDeckSyncDetails("B"));
          animateCrossfaderTo(100, 500);
        }
      }
      return;
    }

    if (isPlayingB) {
      if (iframeRefB.current) sendPlayerCommand(iframeRefB.current, "pauseVideo");
      setIsPlayingB(false);
      if (isPlayingA) {
        onPlaybackControl?.("PLAY", "A", getDeckSyncDetails("A"));
      } else {
        onPlaybackControl?.("PAUSE", "B", getDeckSyncDetails("B"));
      }
    } else {
      unlockAudioB();
      if (iframeRefB.current) {
        if (effectiveVolB === 0) {
          sendPlayerCommand(iframeRefB.current, "mute");
          sendPlayerCommand(iframeRefB.current, "setVolume", [0]);
        } else {
          sendPlayerCommand(iframeRefB.current, "unMute");
          sendPlayerCommand(iframeRefB.current, "setVolume", [effectiveVolB]);
        }
        sendPlayerCommand(iframeRefB.current, "playVideo");
      }
      setIsPlayingB(true);
      if (isPlayingA) {
        const onAir = crossfaderValue > 0 ? "B" : "A";
        onPlaybackControl?.("PLAY", onAir, getDeckSyncDetails(onAir));
      } else {
        onPlaybackControl?.("PLAY", "B", getDeckSyncDetails("B"));
        animateCrossfaderTo(100, 500);
      }
    }
  };

  // Atajo de teclado: Espacio para Play / Pausa en la bandeja activa
  useEffect(() => {
    const handleSpaceKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT");
      if (isInput) return;

      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (isPlayingA) {
          togglePlayA();
        } else if (isPlayingB) {
          togglePlayB();
        } else {
          if (crossfaderValue <= 0 && trackA) {
            togglePlayA();
          } else if (trackB) {
            togglePlayB();
          } else if (trackA) {
            togglePlayA();
          }
        }
      }
    };

    window.addEventListener("keydown", handleSpaceKeyDown);
    return () => window.removeEventListener("keydown", handleSpaceKeyDown);
  }, [isPlayingA, isPlayingB, trackA, trackB, crossfaderValue, togglePlayA, togglePlayB]);

  // Actualizar MediaSession para control y persistencia en segundo plano
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    try {
      const activeDeck = currentOnAirDeck || (trackA ? "A" : "B");
      const activeTrack = activeDeck === "A" ? trackA : trackB;
      const title = activeTrack?.song?.title || activeTrack?.customTitle || "Vidjs DJ Live Session";
      const artist = activeTrack?.song?.artist?.name || activeTrack?.customArtist || "Vidjs DJ";

      if ("MediaMetadata" in window) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title,
          artist,
          album: "Vidjs Night Experience OS",
          artwork: [
            { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
          ],
        });
      }

      navigator.mediaSession.setActionHandler("play", () => {
        webDjEngine.unlock();
        startSilentAudioAnchor();
        if (deckModeA === "native" && audioRefA.current) {
          audioRefA.current.play().catch(() => {});
          setIsPlayingA(true);
        } else if (iframeRefA.current && trackA) {
          sendPlayerCommand(iframeRefA.current, "unMute");
          sendPlayerCommand(iframeRefA.current, "playVideo");
          setIsPlayingA(true);
        }
        if (deckModeB === "native" && audioRefB.current) {
          audioRefB.current.play().catch(() => {});
          setIsPlayingB(true);
        } else if (iframeRefB.current && trackB) {
          sendPlayerCommand(iframeRefB.current, "unMute");
          sendPlayerCommand(iframeRefB.current, "playVideo");
          setIsPlayingB(true);
        }
        try {
          navigator.mediaSession.playbackState = "playing";
        } catch {}
      });

      navigator.mediaSession.setActionHandler("pause", () => {
        if (deckModeA === "native" && audioRefA.current) {
          audioRefA.current.pause();
        } else if (iframeRefA.current) {
          sendPlayerCommand(iframeRefA.current, "pauseVideo");
        }
        if (deckModeB === "native" && audioRefB.current) {
          audioRefB.current.pause();
        } else if (iframeRefB.current) {
          sendPlayerCommand(iframeRefB.current, "pauseVideo");
        }
        setIsPlayingA(false);
        setIsPlayingB(false);
        try {
          navigator.mediaSession.playbackState = "paused";
        } catch {}
      });
    } catch {
      // Ignorar si el navegador restringe handlers de MediaSession
    }
  }, [trackA, trackB, isPlayingA, isPlayingB]);

  // Sincronización reactiva del estado global de reproducción con la pantalla de TV
  const prevOnAirDeckRef = useRef<"A" | "B" | null>(null);
  useEffect(() => {
    if (currentOnAirDeck !== prevOnAirDeckRef.current) {
      const prevDeck = prevOnAirDeckRef.current;
      prevOnAirDeckRef.current = currentOnAirDeck;
      if (currentOnAirDeck) {
        onPlaybackControl?.("PLAY", currentOnAirDeck, getDeckSyncDetails(currentOnAirDeck));
      } else {
        const deckToPause = prevDeck || (!isPlayingA && isPlayingB ? "B" : "A");
        onPlaybackControl?.("PAUSE", deckToPause, getDeckSyncDetails(deckToPause));
      }
    }
  }, [currentOnAirDeck, onPlaybackControl, getDeckSyncDetails, isPlayingA, isPlayingB]);

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

  // Temporizador Deck A (Resistente a segundo plano mediante delta Date.now)
  const lastTickARef = useRef(Date.now());
  useEffect(() => {
    if (!isPlayingA) return;
    lastTickARef.current = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.max(1, Math.round((now - lastTickARef.current) / 1000));
      lastTickARef.current = now;

      setPlaybackSecondsA((prev) => {
        const next = prev + elapsedSeconds;
        if (activeLoopA !== null && next >= cuePointA + activeLoopA * 2) {
          return cuePointA;
        }
        if (next >= trackADuration) {
          handleDeckAEndedRef.current?.();
          return trackADuration;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlayingA, trackADuration, activeLoopA, cuePointA]);

  // Temporizador Deck B (Resistente a segundo plano mediante delta Date.now)
  const lastTickBRef = useRef(Date.now());
  useEffect(() => {
    if (!isPlayingB) return;
    lastTickBRef.current = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.max(1, Math.round((now - lastTickBRef.current) / 1000));
      lastTickBRef.current = now;

      setPlaybackSecondsB((prev) => {
        const next = prev + elapsedSeconds;
        if (activeLoopB !== null && next >= cuePointB + activeLoopB * 2) {
          return cuePointB;
        }
        if (next >= trackBDuration) {
          handleDeckBEndedRef.current?.();
          return trackBDuration;
        }
        return next;
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
  const handleSyncDeckB = (arg?: unknown) => {
    if (!trackB) return;
    const playSound = typeof arg === "boolean" ? arg : true;
    // Calcular el porcentaje de pitch necesario para igualar el BPM de Deck A
    const neededPitch = ((effectiveBpmA / baseBpmB) - 1) * 100;
    const clampedPitch = Math.max(-16, Math.min(16, neededPitch));
    setPitchB(Number(clampedPitch.toFixed(2)));
    setIsSyncedB(true);
    if (playSound) {
      djSoundEffects.playBeatSyncTone();
    }
    showFeedback("success", `⚡ Deck B sincronizado a ${effectiveBpmA} BPM`);
  };

  // Sincronizar BPM con botón SYNC en Deck A
  const handleSyncDeckA = (arg?: unknown) => {
    if (!trackA) return;
    const playSound = typeof arg === "boolean" ? arg : true;
    const neededPitch = ((effectiveBpmB / baseBpmA) - 1) * 100;
    const clampedPitch = Math.max(-16, Math.min(16, neededPitch));
    setPitchA(Number(clampedPitch.toFixed(2)));
    if (playSound) {
      djSoundEffects.playBeatSyncTone();
    }
    showFeedback("success", `⚡ Deck A sincronizado a ${effectiveBpmB} BPM`);
  };

  // Refs para recordar la pista activa y evitar recargas o reinicios no deseados entre bandejas
  const prevServerCurrentPlayingIdRef = useRef<string | null>(currentPlaying?.id || null);
  const prevCurrentPlayingIdRef = useRef<string | null>(currentPlaying?.id || null);
  const prevTrackAKeyRef = useRef<string | null>(null);
  const prevTrackBKeyRef = useRef<string | null>(null);
  const activeVideoIdARef = useRef<string | null>(null);
  const activeVideoIdBRef = useRef<string | null>(null);
  const activeTrackReqIdARef = useRef<string | null>(null);
  const activeTrackReqIdBRef = useRef<string | null>(null);
  const activeQueueEntryIdARef = useRef<string | null>(null);
  const activeQueueEntryIdBRef = useRef<string | null>(null);

  const isPlayingARef = useRef(isPlayingA);
  const isPlayingBRef = useRef(isPlayingB);
  const playbackSecondsARef = useRef(playbackSecondsA);
  const playbackSecondsBRef = useRef(playbackSecondsB);

  useEffect(() => {
    isPlayingARef.current = isPlayingA;
  }, [isPlayingA]);

  useEffect(() => {
    isPlayingBRef.current = isPlayingB;
  }, [isPlayingB]);

  useEffect(() => {
    playbackSecondsARef.current = playbackSecondsA;
  }, [playbackSecondsA]);

  useEffect(() => {
    playbackSecondsBRef.current = playbackSecondsB;
  }, [playbackSecondsB]);

  // Cargar pista en DECK A de forma completamente aislada
  const loadTrackIntoDeckA = async (track: SongRequestData, explicitVideoId?: string | null, queueEntryId?: string | null) => {
    const directId =
      explicitVideoId ||
      track.youtubeVideoId ||
      extractYoutubeId(track.notes);
    const trackKey = getTrackKey(track, directId);

    // Si ya está montada en Deck A o sonando, NUNCA reiniciar ni interrumpir
    if (isPlayingARef.current || isPlayingA) {
      if (
        deckTrackA?.id === track.id ||
        activeTrackReqIdARef.current === track.id ||
        prevTrackAKeyRef.current === trackKey ||
        (directId && activeVideoIdARef.current === directId)
      ) {
        return;
      }
    }

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
    prevTrackAKeyRef.current = trackKey;
    activeTrackReqIdARef.current = track.id;
    activeQueueEntryIdARef.current = queueEntryId || null;
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
      setIsPlayingA(false);
      loadVideoIntoIframe(iframeRefA.current, directId, effectiveVolA, false);
      showFeedback("success", `🎬 Cargado "${track.song?.title || track.customTitle}" en Deck A (Listo para Play)`);
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
          setIsPlayingA(false);
          loadVideoIntoIframe(iframeRefA.current, resolvedId, effectiveVolA, false);
          showFeedback("success", `🎬 Cargado "${track.song?.title || track.customTitle}" en Deck A (Listo para Play)`);
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
    const directId =
      explicitVideoId ||
      track.youtubeVideoId ||
      extractYoutubeId(track.notes);
    const trackKey = getTrackKey(track, directId);

    // Si ya está montada en Deck B o sonando, NUNCA reiniciar ni interrumpir
    if (isPlayingBRef.current || isPlayingB) {
      if (
        deckTrackB?.id === track.id ||
        activeTrackReqIdBRef.current === track.id ||
        prevTrackBKeyRef.current === trackKey ||
        (directId && activeVideoIdBRef.current === directId)
      ) {
        return;
      }
    }

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
    activeTrackReqIdBRef.current = track.id;
    activeQueueEntryIdBRef.current = queueEntryId || null;
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
      setIsPlayingB(false);
      loadVideoIntoIframe(iframeRefB.current, directId, effectiveVolB, false);
      showFeedback("success", `🎬 Cargado "${track.song?.title || track.customTitle}" en Deck B (Listo para Play)`);
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
          setIsPlayingB(false);
          loadVideoIntoIframe(iframeRefB.current, resolvedId, effectiveVolB, false);
          showFeedback("success", `🎬 Cargado "${track.song?.title || track.customTitle}" en Deck B (Listo para Play)`);
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

  // Borrar SOLAMENTE el video de la Bandeja A (Deck B y el audio del sistema quedan 100% protegidos)
  const handleClearVideoOnlyA = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    searchRequestIdA.current++;
    if (iframeRefA.current) {
      sendPlayerCommand(iframeRefA.current, "stopVideo");
      sendPlayerCommand(iframeRefA.current, "pauseVideo");
    }
    activeVideoIdARef.current = null;
    setVideoIdA(null);
    setIsVideoA(false);
    setIsLoadingVideoA(false);
    showFeedback("info", "🎬 Video de Bandeja A borrado (Deck B no afectado)");
  };

  // Borrar SOLAMENTE el video de la Bandeja B (Deck A y el audio del sistema quedan 100% protegidos)
  const handleClearVideoOnlyB = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    searchRequestIdB.current++;
    if (iframeRefB.current) {
      sendPlayerCommand(iframeRefB.current, "stopVideo");
      sendPlayerCommand(iframeRefB.current, "pauseVideo");
    }
    activeVideoIdBRef.current = null;
    setVideoIdB(null);
    setIsVideoB(false);
    setIsLoadingVideoB(false);
    showFeedback("info", "🎬 Video de Bandeja B borrado (Deck A no afectado)");
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
    prevTrackAKeyRef.current = null;
    activeVideoIdARef.current = null;
    activeTrackReqIdARef.current = null;
    activeQueueEntryIdARef.current = null;
    setVideoIdA(null);
    setIsEjectedA(true);
    setDeckTrackA(null);
    setManualTrackA(null);
    setIsPlayingA(false);
    setPlaybackSecondsA(0);
    setActiveLoopA(null);
    setIsLoadingVideoA(false);
    setIsVideoA(false);

    // Si Deck B está en reproducción, preservar su emisión en la pantalla de TV
    if (isPlayingB) {
      onPlaybackControl?.("PLAY", "B", getDeckSyncDetails("B"));
    }
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
    activeTrackReqIdBRef.current = null;
    activeQueueEntryIdBRef.current = null;
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
    setIsVideoB(false);
    setIsSyncedB(false);

    // Si Deck A está en reproducción, preservar su emisión en la pantalla de TV
    if (isPlayingA) {
      onPlaybackControl?.("PLAY", "A", getDeckSyncDetails("A"));
    }
  };

  // Manejador automático de fin de pista en DECK A (Aislamiento Total: NUNCA vacía la bandeja ni interrumpe Deck B)
  const handleDeckAEnded = useCallback(() => {
    if (isEndingARef.current) return;
    isEndingARef.current = true;
    setTimeout(() => {
      isEndingARef.current = false;
    }, 2000);

    setIsPlayingA(false);
    if (deckModeA === "native" && audioRefA.current) {
      audioRefA.current.pause();
    } else if (iframeRefA.current) {
      sendPlayerCommand(iframeRefA.current, "pauseVideo");
    }

    // Si Deck B está en reproducción, mantenerlo al aire sin interrupciones
    if (isPlayingB) {
      onPlaybackControl?.("PLAY", "B", getDeckSyncDetails("B"));
      setEngancheDirection("B_TO_A");
      showFeedback("info", "🔄 Fin de pista Deck A. Deck B continúa al aire.");
    } else {
      onPlaybackControl?.("PAUSE", "A", getDeckSyncDetails("A"));
      showFeedback("info", "🏁 Pista de Deck A finalizada.");
    }

    // NUNCA llamar a handleClearDeckA(): la pista y sus controles se preservan en la bandeja como en un DJ profesional.
    // NUNCA llamar a onNextTrack() automáticamente: el DJ controla cuándo avanzar de tema en la cola.
  }, [
    isPlayingB,
    deckModeA,
    onPlaybackControl,
    getDeckSyncDetails,
    showFeedback,
  ]);

  // Manejador automático de fin de pista en DECK B (Aislamiento Total: NUNCA vacía la bandeja ni interrumpe Deck A)
  const handleDeckBEnded = useCallback(() => {
    if (isEndingBRef.current) return;
    isEndingBRef.current = true;
    setTimeout(() => {
      isEndingBRef.current = false;
    }, 2000);

    setIsPlayingB(false);
    if (deckModeB === "native" && audioRefB.current) {
      audioRefB.current.pause();
    } else if (iframeRefB.current) {
      sendPlayerCommand(iframeRefB.current, "pauseVideo");
    }

    // Si Deck A está en reproducción, mantenerlo al aire sin interrupciones
    if (isPlayingA) {
      onPlaybackControl?.("PLAY", "A", getDeckSyncDetails("A"));
      setEngancheDirection("A_TO_B");
      showFeedback("info", "🔄 Fin de pista Deck B. Deck A continúa al aire.");
    } else {
      onPlaybackControl?.("PAUSE", "B", getDeckSyncDetails("B"));
      showFeedback("info", "🏁 Pista de Deck B finalizada.");
    }

    // NUNCA llamar a handleClearDeckB(): la pista y sus controles se preservan en la bandeja como en un DJ profesional.
    // NUNCA llamar a onNextTrack() automáticamente: el DJ controla cuándo avanzar de tema en la cola.
  }, [
    isPlayingA,
    deckModeB,
    onPlaybackControl,
    getDeckSyncDetails,
    showFeedback,
  ]);

  useEffect(() => {
    handleDeckAEndedRef.current = handleDeckAEnded;
  }, [handleDeckAEnded]);

  useEffect(() => {
    handleDeckBEndedRef.current = handleDeckBEnded;
  }, [handleDeckBEnded]);

  // Listener de eventos postMessage de YouTube para detectar fin de video (playerState === 0)
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      if (!event.data) return;
      let data: any;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (!data || typeof data !== "object") return;

      let playerState: number | null = null;
      if (data.event === "onStateChange" && typeof data.info === "number") {
        playerState = data.info;
      } else if (data.event === "infoDelivery" && data.info && typeof data.info.playerState === "number") {
        playerState = data.info.playerState;
      }

      // playerState === 0 es YT.PlayerState.ENDED
      if (playerState === 0) {
        const winA = iframeRefA.current?.contentWindow;
        const winB = iframeRefB.current?.contentWindow;

        let deck: "A" | "B" | null = null;
        if (winA && event.source === winA) {
          deck = "A";
        } else if (winB && event.source === winB) {
          deck = "B";
        }

        // SOLO disparar fin de tema si la bandeja estaba efectivamente reproduciendo y
        // la pista realmente llegó al final (evita que inicializaciones de Deck B o pausas de iframe maten Deck A)
        if (deck === "A" && isPlayingARef.current && playbackSecondsARef.current >= Math.max(10, trackADuration - 5)) {
          handleDeckAEndedRef.current?.();
        } else if (deck === "B" && isPlayingBRef.current && playbackSecondsBRef.current >= Math.max(10, trackBDuration - 5)) {
          handleDeckBEndedRef.current?.();
        }
      }
    };

    window.addEventListener("message", handleWindowMessage);
    return () => {
      window.removeEventListener("message", handleWindowMessage);
    };
  }, [trackADuration, trackBDuration]);

  // Carga inicial no reactiva: Solo monta el tema que ya esté al aire si la bandeja A está vacía
  const initialLoadedA = useRef(false);

  useEffect(() => {
    if (!initialLoadedA.current && currentPlaying?.songRequest && !isEjectedA && !deckTrackA) {
      initialLoadedA.current = true;
      loadTrackIntoDeckA(currentPlaying.songRequest, currentPlaying.youtubeVideoId, currentPlaying.id);
    }
  }, [currentPlaying?.id, isEjectedA]);

  // Función para determinar inteligentemente cuál bandeja está libre para recibir la pista
  const determineFreeDeck = (requested?: "AUTO" | "A" | "B"): "A" | "B" => {
    if (requested === "A") return "A";
    if (requested === "B") return "B";

    const isAEmpty = !trackA || isEjectedA;
    const isBEmpty = !trackB || isEjectedB;

    // 1. Si alguna bandeja está completamente vacía (sin pista o expulsada)
    if (isAEmpty && !isBEmpty) return "A";
    if (isBEmpty && !isAEmpty) return "B";
    if (isAEmpty && isBEmpty) return "A";

    // 2. Si ambas tienen pista cargada: la que NO esté reproduciendo está libre
    if (isPlayingA && !isPlayingB) return "B";
    if (isPlayingB && !isPlayingA) return "A";

    // 3. Si ambas están sonando o ambas en pausa: según hacia dónde esté inclinado el crossfader
    // Si el crossfader favorece A (< 0), el público escucha A -> montar en B
    if (crossfaderValue < 0) return "B";
    // Si el crossfader favorece B (> 0), el público escucha B -> montar en A
    if (crossfaderValue > 0) return "A";

    // 4. Por defecto: si Deck A tiene pista, montar en B; si no, en A
    return trackA ? "B" : "A";
  };

  const lastHandledLoadTimestamp = useRef<number>(0);

  // Carga reactiva inmediata disparada desde la cola de reproducción del DJ
  useEffect(() => {
    if (!pendingDeckLoad || pendingDeckLoad.timestamp === lastHandledLoadTimestamp.current) return;
    lastHandledLoadTimestamp.current = pendingDeckLoad.timestamp;

    const { entry, targetDeck = "AUTO" } = pendingDeckLoad;

    const resolvedTarget = determineFreeDeck(targetDeck);
    const title = entry.songRequest.song?.title || entry.songRequest.customTitle || "Tema";
    const tableLabel = entry.songRequest.table?.label ? ` (${entry.songRequest.table.label})` : "";

    if (resolvedTarget === "A") {
      loadTrackIntoDeckA(entry.songRequest, entry.youtubeVideoId, entry.id);
      showFeedback("success", `🎧 Cargada en Bandeja A: "${title}"${tableLabel} (Listo para Play)`);
    } else {
      loadTrackIntoDeckB(entry.songRequest, entry.id, entry.youtubeVideoId);
      showFeedback("success", `🎧 Cargada en Bandeja B: "${title}"${tableLabel} (Listo para Play)`);
    }

    if (onDeckLoaded) onDeckLoaded();
  }, [pendingDeckLoad, isPlayingA, isPlayingB]);

  // Avance de tema del servidor / Sincronización cuando entra un nuevo tema al aire
  useEffect(() => {
    const currentId = currentPlaying?.id || null;
    if (!currentId) {
      prevServerCurrentPlayingIdRef.current = null;
      // NUNCA vaciar ni interrumpir bandejas que estén en reproducción activa
      return;
    }

    if (currentId && currentId !== prevServerCurrentPlayingIdRef.current) {
      prevServerCurrentPlayingIdRef.current = currentId;

      if (!currentPlaying?.songRequest) return;

      const currentReqId = currentPlaying.songRequest.id;
      const currentEntryId = currentPlaying.id;

      // Verificar si la pista ya está cargada en alguna de las bandejas
      const isAlreadyInA =
        trackA?.id === currentReqId ||
        deckTrackA?.id === currentReqId ||
        activeTrackReqIdARef.current === currentReqId ||
        activeQueueEntryIdARef.current === currentEntryId ||
        videoIdA === currentPlaying.youtubeVideoId ||
        (Boolean(currentPlaying.youtubeVideoId) && activeVideoIdARef.current === currentPlaying.youtubeVideoId);

      const isAlreadyInB =
        trackB?.id === currentReqId ||
        deckTrackB?.id === currentReqId ||
        deckQueueEntryIdB === currentEntryId ||
        selectedQueueIdB === currentEntryId ||
        activeTrackReqIdBRef.current === currentReqId ||
        activeQueueEntryIdBRef.current === currentEntryId ||
        videoIdB === currentPlaying.youtubeVideoId ||
        (Boolean(currentPlaying.youtubeVideoId) && activeVideoIdBRef.current === currentPlaying.youtubeVideoId);

      // Si ya está en alguna de las bandejas, no hacer nada para no duplicar en la otra bandeja
      if (isAlreadyInA || isAlreadyInB) {
        return;
      }

      // Solo montar en una bandeja que esté verdaderamente libre (sin tema y sin reproducción activa)
      // NUNCA vaciar ni interrumpir ninguna bandeja que tenga tema o esté sonando en vivo
      const isAOccupied = Boolean(trackA) || Boolean(deckTrackA) || isPlayingA;
      const isBOccupied = Boolean(trackB) || Boolean(deckTrackB) || isPlayingB;
      const title = currentPlaying.songRequest.song?.title || currentPlaying.songRequest.customTitle || "Tema";
      const tableLabel = currentPlaying.songRequest.table?.label ? ` (${currentPlaying.songRequest.table.label})` : "";

      if (!isAOccupied) {
        loadTrackIntoDeckA(currentPlaying.songRequest, currentPlaying.youtubeVideoId, currentPlaying.id);
        showFeedback("info", `🎧 Montada en Bandeja A: "${title}"${tableLabel} (Listo para Play)`);
      } else if (!isBOccupied) {
        loadTrackIntoDeckB(currentPlaying.songRequest, currentPlaying.id, currentPlaying.youtubeVideoId);
        showFeedback("info", `🎧 Montada en Bandeja B: "${title}"${tableLabel} (Listo para Play)`);
      }
    }
  }, [currentPlaying?.id, trackA?.id, trackB?.id, isPlayingA, isPlayingB]);

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
      handleSyncDeckB(false);
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
          if (iframeRefA.current) sendPlayerCommand(iframeRefA.current, "pauseVideo");
          setEngancheDirection("B_TO_A");

          const queueEntryId = effectiveQueueEntryB?.id;
          if (queueEntryId) {
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
      handleSyncDeckA(false);
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
          if (iframeRefB.current) sendPlayerCommand(iframeRefB.current, "pauseVideo");
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
      if (iframeRefA.current) sendPlayerCommand(iframeRefA.current, "pauseVideo");
      setIsPlayingB(true);
      setEngancheDirection("B_TO_A");
      const queueEntryId = effectiveQueueEntryB?.id;
      if (queueEntryId) {
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
      if (iframeRefB.current) sendPlayerCommand(iframeRefB.current, "pauseVideo");
      setIsPlayingA(true);
      setEngancheDirection("A_TO_B");
      showFeedback("success", `⚡ ¡Corte Directo B ➔ A! Deck A al aire`);
    }
  };

  // Swap de Bajos (Intercambia Bass Kill entre A y B)
  const handleSwapBass = () => {
    setBassKillA(!bassKillA);
    setBassKillB(bassKillA);
    showFeedback("info", bassKillA ? "Bajo activo en Deck A" : "Bajo activo en Deck B");
  };

  // ==================== REAL VINYL TURNTABLE & NUDGE ENGINE ====================
  // Nudge / Pitch Bend con comportamiento físico de disco de vinilo real (retroceso y empuje)
  const handleNudge = (deck: "A" | "B", dir: -1 | 1) => {
    webDjEngine.unlock();

    if (deck === "A") {
      if (!trackA) {
        if (dir === -1) djSoundEffects.playVinylNudgeBack(0.8);
        else djSoundEffects.playVinylNudgeForward(0.8);
        return;
      }

      const deltaSec = dir * 0.55;
      const next = Math.max(0, playbackSecondsA + deltaSec);
      setPlaybackSecondsA(next);

      if (deckModeA === "native" && audioRefA.current) {
        audioRefA.current.currentTime = next;
      } else if (iframeRefA.current) {
        sendPlayerCommand(iframeRefA.current, "seekTo", [next, true]);
      }

      // Física y visual de disco de vinilo
      if (dir === -1) {
        djSoundEffects.playVinylNudgeBack(1.0);
        setVinylActionA("REWIND");
        platterAngleRefA.current -= 65;
        if (platterRefA.current) {
          platterRefA.current.style.transition = "transform 0.15s ease-out";
          platterRefA.current.style.transform = `rotate(${platterAngleRefA.current}deg)`;
          setTimeout(() => {
            if (platterRefA.current) platterRefA.current.style.transition = "none";
          }, 150);
        }
      } else {
        djSoundEffects.playVinylNudgeForward(1.0);
        setVinylActionA("FORWARD");
        platterAngleRefA.current += 65;
        if (platterRefA.current) {
          platterRefA.current.style.transition = "transform 0.15s ease-out";
          platterRefA.current.style.transform = `rotate(${platterAngleRefA.current}deg)`;
          setTimeout(() => {
            if (platterRefA.current) platterRefA.current.style.transition = "none";
          }, 150);
        }
      }
      setTimeout(() => setVinylActionA("IDLE"), 350);
    } else {
      if (!trackB) {
        if (dir === -1) djSoundEffects.playVinylNudgeBack(0.8);
        else djSoundEffects.playVinylNudgeForward(0.8);
        return;
      }

      const deltaSec = dir * 0.55;
      const next = Math.max(0, playbackSecondsB + deltaSec);
      setPlaybackSecondsB(next);

      if (deckModeB === "native" && audioRefB.current) {
        audioRefB.current.currentTime = next;
      } else if (iframeRefB.current) {
        sendPlayerCommand(iframeRefB.current, "seekTo", [next, true]);
      }

      if (dir === -1) {
        djSoundEffects.playVinylNudgeBack(1.0);
        setVinylActionB("REWIND");
        platterAngleRefB.current -= 65;
        if (platterRefB.current) {
          platterRefB.current.style.transition = "transform 0.15s ease-out";
          platterRefB.current.style.transform = `rotate(${platterAngleRefB.current}deg)`;
          setTimeout(() => {
            if (platterRefB.current) platterRefB.current.style.transition = "none";
          }, 150);
        }
      } else {
        djSoundEffects.playVinylNudgeForward(1.0);
        setVinylActionB("FORWARD");
        platterAngleRefB.current += 65;
        if (platterRefB.current) {
          platterRefB.current.style.transition = "transform 0.15s ease-out";
          platterRefB.current.style.transform = `rotate(${platterAngleRefB.current}deg)`;
          setTimeout(() => {
            if (platterRefB.current) platterRefB.current.style.transition = "none";
          }, 150);
        }
      }
      setTimeout(() => setVinylActionB("IDLE"), 350);
    }
  };

  // ↺ Efecto SPINBACK / BACKSPIN: Retroceso real de disco de discoteca
  const handleSpinback = (deck: "A" | "B") => {
    webDjEngine.unlock();
    djSoundEffects.playVinylSpinback(1.15);

    if (deck === "A") {
      isSpinbackingARef.current = true;
      setVinylActionA("SPINBACK");

      // Rebobinar 4 segundos hacia atrás en el audio
      const next = Math.max(0, playbackSecondsA - 4);
      setPlaybackSecondsA(next);

      if (deckModeA === "native" && audioRefA.current) {
        const originalRate = audioRefA.current.playbackRate;
        audioRefA.current.playbackRate = 0.35;
        audioRefA.current.currentTime = next;
        setTimeout(() => {
          if (audioRefA.current) audioRefA.current.playbackRate = originalRate;
        }, 850);
      } else if (iframeRefA.current) {
        sendPlayerCommand(iframeRefA.current, "setPlaybackRate", [0.5]);
        sendPlayerCommand(iframeRefA.current, "seekTo", [next, true]);
        setTimeout(() => {
          if (iframeRefA.current) sendPlayerCommand(iframeRefA.current, "setPlaybackRate", [1]);
        }, 850);
      }

      // Giro inercial de vinilo (-1080 deg = 3 vueltas completas en reversa)
      platterAngleRefA.current -= 1080;
      if (platterRefA.current) {
        platterRefA.current.style.transition = "transform 1.15s cubic-bezier(0.12, 0.9, 0.2, 1)";
        platterRefA.current.style.transform = `rotate(${platterAngleRefA.current}deg)`;
      }

      showFeedback("info", "↺ SPINBACK: Retroceso de Disco Deck A");

      setTimeout(() => {
        isSpinbackingARef.current = false;
        if (platterRefA.current) platterRefA.current.style.transition = "none";
        setVinylActionA("IDLE");
      }, 1150);
    } else {
      isSpinbackingBRef.current = true;
      setVinylActionB("SPINBACK");

      const next = Math.max(0, playbackSecondsB - 4);
      setPlaybackSecondsB(next);

      if (deckModeB === "native" && audioRefB.current) {
        const originalRate = audioRefB.current.playbackRate;
        audioRefB.current.playbackRate = 0.35;
        audioRefB.current.currentTime = next;
        setTimeout(() => {
          if (audioRefB.current) audioRefB.current.playbackRate = originalRate;
        }, 850);
      } else if (iframeRefB.current) {
        sendPlayerCommand(iframeRefB.current, "setPlaybackRate", [0.5]);
        sendPlayerCommand(iframeRefB.current, "seekTo", [next, true]);
        setTimeout(() => {
          if (iframeRefB.current) sendPlayerCommand(iframeRefB.current, "setPlaybackRate", [1]);
        }, 850);
      }

      platterAngleRefB.current -= 1080;
      if (platterRefB.current) {
        platterRefB.current.style.transition = "transform 1.15s cubic-bezier(0.12, 0.9, 0.2, 1)";
        platterRefB.current.style.transform = `rotate(${platterAngleRefB.current}deg)`;
      }

      showFeedback("info", "↺ SPINBACK: Retroceso de Disco Deck B");

      setTimeout(() => {
        isSpinbackingBRef.current = false;
        if (platterRefB.current) platterRefB.current.style.transition = "none";
        setVinylActionB("IDLE");
      }, 1150);
    }
  };

  // Rebobinado o avance continuo al mantener presionado el Nudge
  const startContinuousNudge = (deck: "A" | "B", dir: -1 | 1) => {
    webDjEngine.unlock();
    const isDeckA = deck === "A";
    const ref = isDeckA ? continuousNudgeIntervalRefA : continuousNudgeIntervalRefB;
    if (ref.current) clearInterval(ref.current);

    djSoundEffects.startContinuousVinylScrub(dir);
    if (isDeckA) setVinylActionA(dir === -1 ? "REWIND" : "FORWARD");
    else setVinylActionB(dir === -1 ? "REWIND" : "FORWARD");

    ref.current = setInterval(() => {
      if (isDeckA) {
        setPlaybackSecondsA((prev) => {
          const next = Math.max(0, prev + dir * 0.7);
          if (deckModeA === "native" && audioRefA.current) {
            audioRefA.current.currentTime = next;
          } else if (iframeRefA.current) {
            sendPlayerCommand(iframeRefA.current, "seekTo", [next, true]);
          }
          return next;
        });
        platterAngleRefA.current += dir * 40;
        if (platterRefA.current) {
          platterRefA.current.style.transform = `rotate(${platterAngleRefA.current}deg)`;
        }
      } else {
        setPlaybackSecondsB((prev) => {
          const next = Math.max(0, prev + dir * 0.7);
          if (deckModeB === "native" && audioRefB.current) {
            audioRefB.current.currentTime = next;
          } else if (iframeRefB.current) {
            sendPlayerCommand(iframeRefB.current, "seekTo", [next, true]);
          }
          return next;
        });
        platterAngleRefB.current += dir * 40;
        if (platterRefB.current) {
          platterRefB.current.style.transform = `rotate(${platterAngleRefB.current}deg)`;
        }
      }
    }, 110);
  };

  const stopContinuousNudge = (deck: "A" | "B") => {
    const isDeckA = deck === "A";
    const ref = isDeckA ? continuousNudgeIntervalRefA : continuousNudgeIntervalRefB;
    if (ref.current) {
      clearInterval(ref.current);
      ref.current = null;
    }
    djSoundEffects.stopContinuousVinylScrub();
    if (isDeckA) setVinylActionA("IDLE");
    else setVinylActionB("IDLE");
  };

  // Cálculo angular para soporte táctil y arrastre de vinilo
  const getPlatterPointerAngle = (clientX: number, clientY: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
  };

  // Handlers de arrastre y scratch para Deck A
  const handlePlatterPointerDownA = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-spindle]")) return;

    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    isPlatterTouchingARef.current = true;
    const angle = getPlatterPointerAngle(e.clientX, e.clientY, e.currentTarget);
    platterLastAngleARef.current = angle;
    setVinylActionA("SCRATCH");
    webDjEngine.unlock();
    djSoundEffects.playVinylNudgeBack(0.6);
  };

  const handlePlatterPointerMoveA = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPlatterTouchingARef.current) return;
    const currentAngle = getPlatterPointerAngle(e.clientX, e.clientY, e.currentTarget);
    let delta = currentAngle - platterLastAngleARef.current;

    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    platterLastAngleARef.current = currentAngle;
    platterAngleRefA.current += delta;
    if (platterRefA.current) {
      platterRefA.current.style.transition = "none";
      platterRefA.current.style.transform = `rotate(${platterAngleRefA.current}deg)`;
    }

    const now = Date.now();
    if (Math.abs(delta) > 2 && now - lastScratchSoundTimeARef.current > 70) {
      lastScratchSoundTimeARef.current = now;
      const dir = delta < 0 ? -1 : 1;
      djSoundEffects.playVinylScratch(dir, Math.min(2, Math.abs(delta) / 6));

      const scrubSec = (delta / 360) * 2.0;
      setPlaybackSecondsA((prev) => {
        const next = Math.max(0, prev + scrubSec);
        if (deckModeA === "native" && audioRefA.current) {
          audioRefA.current.currentTime = next;
        } else if (iframeRefA.current) {
          sendPlayerCommand(iframeRefA.current, "seekTo", [next, true]);
        }
        return next;
      });
    }
  };

  const handlePlatterPointerUpA = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPlatterTouchingARef.current) return;
    isPlatterTouchingARef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setVinylActionA("IDLE");
  };

  // Handlers de arrastre y scratch para Deck B
  const handlePlatterPointerDownB = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-spindle]")) return;

    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    isPlatterTouchingBRef.current = true;
    const angle = getPlatterPointerAngle(e.clientX, e.clientY, e.currentTarget);
    platterLastAngleBRef.current = angle;
    setVinylActionB("SCRATCH");
    webDjEngine.unlock();
    djSoundEffects.playVinylNudgeBack(0.6);
  };

  const handlePlatterPointerMoveB = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPlatterTouchingBRef.current) return;
    const currentAngle = getPlatterPointerAngle(e.clientX, e.clientY, e.currentTarget);
    let delta = currentAngle - platterLastAngleBRef.current;

    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    platterLastAngleBRef.current = currentAngle;
    platterAngleRefB.current += delta;
    if (platterRefB.current) {
      platterRefB.current.style.transition = "none";
      platterRefB.current.style.transform = `rotate(${platterAngleRefB.current}deg)`;
    }

    const now = Date.now();
    if (Math.abs(delta) > 2 && now - lastScratchSoundTimeBRef.current > 70) {
      lastScratchSoundTimeBRef.current = now;
      const dir = delta < 0 ? -1 : 1;
      djSoundEffects.playVinylScratch(dir, Math.min(2, Math.abs(delta) / 6));

      const scrubSec = (delta / 360) * 2.0;
      setPlaybackSecondsB((prev) => {
        const next = Math.max(0, prev + scrubSec);
        if (deckModeB === "native" && audioRefB.current) {
          audioRefB.current.currentTime = next;
        } else if (iframeRefB.current) {
          sendPlayerCommand(iframeRefB.current, "seekTo", [next, true]);
        }
        return next;
      });
    }
  };

  const handlePlatterPointerUpB = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPlatterTouchingBRef.current) return;
    isPlatterTouchingBRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setVinylActionB("IDLE");
  };

  // ==================== CARGA DIRECTA DESDE BIBLIOTECA (SIN PAUSAR) ====================
  const handleLoadSongFromLibraryA = (song: LibSong) => {
    webDjEngine.unlock();

    const syntheticTrack: SongRequestData = {
      id: `lib-a-${song.id}-${Date.now()}`,
      status: "PENDING",
      customTitle: song.title,
      customArtist: song.artist?.name || "Artista",
      notes: song.genre || null,
      createdAt: new Date().toISOString(),
      table: { id: "library", number: 0, label: "Biblioteca" },
      guestSession: null,
      song: {
        id: song.id,
        title: song.title,
        durationSeconds: song.durationSeconds || 210,
        artist: { name: song.artist?.name || "Artista" },
        key: song.key || "8A",
        bpm: song.bpm || 124,
        genre: song.genre || "General",
      },
    };

    if (song.fileUrl) {
      const isVideo = Boolean(song.fileUrl.match(/\.(mp4|webm|mov|m4v|mkv)/i));
      setIsVideoA(isVideo);
      setDeckModeA("native");
      setLocalAudioUrlA(song.fileUrl);
      setLocalAudioNameA(song.title);
      setDeckTrackA(syntheticTrack);
      setManualTrackA(syntheticTrack);
      setIsEjectedA(false);
      setPlaybackSecondsA(0);
      setIsPlayingA(false);
      if (audioRefA.current) {
        audioRefA.current.src = song.fileUrl;
        audioRefA.current.currentTime = 0;
        audioRefA.current.pause();
      }
    } else {
      setIsVideoA(false);
      loadTrackIntoDeckA(syntheticTrack);
    }

    showFeedback("success", `🎧 "${song.title}" cargada en Bandeja A (Listo para Play)`);
  };

  const handleLoadSongFromLibraryB = (song: LibSong) => {
    webDjEngine.unlock();

    const syntheticTrack: SongRequestData = {
      id: `lib-b-${song.id}-${Date.now()}`,
      status: "PENDING",
      customTitle: song.title,
      customArtist: song.artist?.name || "Artista",
      notes: song.genre || null,
      createdAt: new Date().toISOString(),
      table: { id: "library", number: 0, label: "Biblioteca" },
      guestSession: null,
      song: {
        id: song.id,
        title: song.title,
        durationSeconds: song.durationSeconds || 210,
        artist: { name: song.artist?.name || "Artista" },
        key: song.key || "8A",
        bpm: song.bpm || 126,
        genre: song.genre || "General",
      },
    };

    if (song.fileUrl) {
      const isVideo = Boolean(song.fileUrl.match(/\.(mp4|webm|mov|m4v|mkv)/i));
      setIsVideoB(isVideo);
      setDeckModeB("native");
      setLocalAudioUrlB(song.fileUrl);
      setLocalAudioNameB(song.title);
      setDeckTrackB(syntheticTrack);
      setManualTrackB(syntheticTrack);
      setIsEjectedB(false);
      setPlaybackSecondsB(0);
      setIsPlayingB(false);
      if (audioRefB.current) {
        audioRefB.current.src = song.fileUrl;
        audioRefB.current.currentTime = 0;
        audioRefB.current.pause();
      }
    } else {
      setIsVideoB(false);
      loadTrackIntoDeckB(syntheticTrack);
    }

    showFeedback("success", `🎧 "${song.title}" cargada en Bandeja B (Listo para Play)`);
  };

  // CUE handler
  const handleCue = (deck: "A" | "B") => {
    if (deck === "A" && !trackA) return;
    if (deck === "B" && !trackB) return;
    if (deck === "A") {
      if (isPlayingA) {
        setIsPlayingA(false);
        if (deckModeA === "native" && audioRefA.current) {
          audioRefA.current.pause();
          audioRefA.current.currentTime = cuePointA;
        } else if (iframeRefA.current) {
          sendPlayerCommand(iframeRefA.current, "pauseVideo");
          sendPlayerCommand(iframeRefA.current, "seekTo", [cuePointA, true]);
        }
        setPlaybackSecondsA(cuePointA);
        if (isPlayingB) {
          onPlaybackControl?.("PLAY", "B", getDeckSyncDetails("B"));
        } else {
          onPlaybackControl?.("PAUSE", "A", { ...getDeckSyncDetails("A"), currentTime: cuePointA });
        }
      } else {
        setCuePointA(playbackSecondsA);
        showFeedback("info", `Deck A CUE fijado en ${formatTime(playbackSecondsA)}`);
      }
    } else {
      if (isPlayingB) {
        setIsPlayingB(false);
        if (deckModeB === "native" && audioRefB.current) {
          audioRefB.current.pause();
          audioRefB.current.currentTime = cuePointB;
        } else if (iframeRefB.current) {
          sendPlayerCommand(iframeRefB.current, "pauseVideo");
          sendPlayerCommand(iframeRefB.current, "seekTo", [cuePointB, true]);
        }
        setPlaybackSecondsB(cuePointB);
        if (isPlayingA) {
          onPlaybackControl?.("PLAY", "A", getDeckSyncDetails("A"));
        } else {
          onPlaybackControl?.("PAUSE", "B", { ...getDeckSyncDetails("B"), currentTime: cuePointB });
        }
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
    if (deck === "A") {
      const targetTime = hotCuesA[cueNum] ?? 0;
      setPlaybackSecondsA(targetTime);
      if (deckModeA === "native" && audioRefA.current) {
        audioRefA.current.currentTime = targetTime;
      } else if (iframeRefA.current) {
        sendPlayerCommand(iframeRefA.current, "seekTo", [targetTime, true]);
      }
      onPlaybackControl?.("SEEK", "A", { ...getDeckSyncDetails("A"), currentTime: targetTime });
    } else {
      const targetTime = hotCuesB[cueNum] ?? 0;
      setPlaybackSecondsB(targetTime);
      if (deckModeB === "native" && audioRefB.current) {
        audioRefB.current.currentTime = targetTime;
      } else if (iframeRefB.current) {
        sendPlayerCommand(iframeRefB.current, "seekTo", [targetTime, true]);
      }
      onPlaybackControl?.("SEEK", "B", { ...getDeckSyncDetails("B"), currentTime: targetTime });
    }
  };

  // Loop toggle
  const handleToggleLoop = (deck: "A" | "B", beats: number) => {
    if (deck === "A" && !trackA) return;
    if (deck === "B" && !trackB) return;
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

        {/* Acceso a Biblioteca Musical Integrada (Cero pausa / Cero interrupción) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsLibraryOpen((prev) => !prev);
              setLibraryTargetDeckHint(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              isLibraryOpen
                ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/40 ring-2 ring-amber-300"
                : "bg-zinc-900 hover:bg-zinc-800 text-amber-300 hover:text-amber-200 border border-amber-500/40"
            }`}
            title="Abrir/Cerrar Biblioteca Musical sin detener la música en vivo (Atajo de teclado: B)"
          >
            <ListMusic className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{isLibraryOpen ? "OCULTAR BIBLIOTECA [B]" : "📚 BIBLIOTECA MUSICAL [B]"}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono">
              EN VIVO
            </span>
          </button>

          {isLibraryOpen && (
            <div className="hidden sm:flex items-center bg-zinc-900 border border-zinc-700 rounded-xl p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setLibraryViewMode("drawer")}
                className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  libraryViewMode === "drawer"
                    ? "bg-purple-600 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Modo Modal Flotante con Mini-HUD de Cabina"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Flotante</span>
              </button>
              <button
                type="button"
                onClick={() => setLibraryViewMode("split")}
                className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  libraryViewMode === "split"
                    ? "bg-cyan-600 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Modo Panel Dividido (VirtualDJ / Traktor)"
              >
                <Columns className="w-3 h-3" />
                <span>Dividido</span>
              </button>
            </div>
          )}
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
          <div
            onClick={(e) => {
              if (!trackA) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const targetSec = Math.round(ratio * trackADuration);
              setPlaybackSecondsA(targetSec);
              if (deckModeA === "native" && audioRefA.current) {
                audioRefA.current.currentTime = targetSec;
              } else if (iframeRefA.current) {
                sendPlayerCommand(iframeRefA.current, "seekTo", [targetSec, true]);
              }
              onPlaybackControl?.("SEEK", "A", { ...getDeckSyncDetails("A"), currentTime: targetSec });
            }}
            className="h-12 bg-gradient-to-r from-purple-950/40 via-purple-900/30 to-zinc-950 rounded-xl border border-purple-900/50 relative overflow-hidden flex items-center px-2 cursor-pointer hover:border-purple-500/70 transition-all select-none"
            title="Click para saltar a esta posición en la pista (Seek)"
          >
            {/* Playhead vertical */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_white] z-20 transition-all duration-300 pointer-events-none"
              style={{
                left: `${Math.min(100, (playbackSecondsA / trackADuration) * 100)}%`,
              }}
            />
            {/* Grilla de beats animados */}
            <div className="w-full flex items-center justify-between gap-1 opacity-80 pointer-events-none">
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
                className="absolute top-1 text-[9px] font-black px-1 rounded bg-amber-400 text-black z-30 pointer-events-none"
                style={{ left: `${(sec / trackADuration) * 100}%` }}
              >
                C{cue}
              </div>
            ))}
          </div>

          {/* Waveform Deck B */}
          <div
            onClick={(e) => {
              if (!trackB) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const targetSec = Math.round(ratio * trackBDuration);
              setPlaybackSecondsB(targetSec);
              if (deckModeB === "native" && audioRefB.current) {
                audioRefB.current.currentTime = targetSec;
              } else if (iframeRefB.current) {
                sendPlayerCommand(iframeRefB.current, "seekTo", [targetSec, true]);
              }
              onPlaybackControl?.("SEEK", "B", { ...getDeckSyncDetails("B"), currentTime: targetSec });
            }}
            className="h-12 bg-gradient-to-r from-cyan-950/40 via-cyan-900/30 to-zinc-950 rounded-xl border border-cyan-900/50 relative overflow-hidden flex items-center px-2 cursor-pointer hover:border-cyan-500/70 transition-all select-none"
            title="Click para saltar a esta posición en la pista (Seek)"
          >
            {/* Playhead vertical */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_white] z-20 transition-all duration-300 pointer-events-none"
              style={{
                left: `${Math.min(100, (playbackSecondsB / trackBDuration) * 100)}%`,
              }}
            />
            {/* Grilla de beats animados */}
            <div className="w-full flex items-center justify-between gap-1 opacity-80 pointer-events-none">
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
                className="absolute top-1 text-[9px] font-black px-1 rounded bg-amber-400 text-black z-30 pointer-events-none"
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
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_290px_minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_320px_minmax(0,1fr)] gap-4 items-start">
        {/* ========================================== */}
        {/* DECK A (Canal 1 - Violeta / Púrpura)       */}
        {/* ========================================== */}
        <div id="deck-a" className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-purple-950/30 border-2 border-purple-500/40 shadow-2xl flex flex-col justify-between space-y-4 relative w-full max-w-full overflow-hidden scroll-mt-24 transition-all duration-300">
          {/* Header de Deck A */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-purple-600 text-white text-[10px] font-black tracking-widest uppercase shadow-md shadow-purple-600/30">
                DECK A &bull; CANAL 1
              </span>
              <span className={`w-2 h-2 rounded-full ${trackA ? (isPlayingA ? (currentOnAirDeck === "A" ? "bg-emerald-400 animate-ping" : "bg-purple-400") : "bg-purple-500/50") : "bg-zinc-600"}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${trackA ? (isPlayingA ? (currentOnAirDeck === "A" ? "text-emerald-400 font-black" : "text-purple-300 font-bold") : "text-purple-400") : "text-zinc-500"}`}>
                {trackA ? (isPlayingA ? (currentOnAirDeck === "A" ? "Al Aire" : "En Mezcla") : "Preparado") : "Bandeja Vacía"}
              </span>
              {trackA?.table && (
                <span className="px-2 py-0.5 rounded bg-zinc-950 text-purple-300 border border-purple-500/30 text-xs font-bold">
                  {trackA.table.label}
                </span>
              )}
            </div>

            {/* Acciones Deck A: Guardar en Biblioteca, Limpiar y Cargar Pista */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {trackA && (
                <button
                  type="button"
                  onClick={() => handleSaveDeckToLibrary("A")}
                  disabled={savingDeckA || savedDeckA}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                    savedDeckA
                      ? "bg-emerald-950/70 border-emerald-500/60 text-emerald-300 shadow-sm"
                      : isPlayingA
                      ? "bg-purple-900/80 hover:bg-purple-800 border-purple-500/60 text-purple-100 shadow-md shadow-purple-600/30 animate-pulse"
                      : "bg-zinc-900 hover:bg-purple-950/60 border-zinc-800 hover:border-purple-500/40 text-purple-300"
                  }`}
                  title={
                    savedDeckA
                      ? "Pista guardada en la biblioteca"
                      : isPlayingA
                      ? "Guardar la pista en reproducción actual en la Biblioteca Musical"
                      : "Guardar esta pista cargada en la Biblioteca Musical"
                  }
                >
                  {savedDeckA ? (
                    <>
                      <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">En Biblioteca</span>
                    </>
                  ) : savingDeckA ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5 text-purple-400" />
                      <span>{isPlayingA ? "⭐ Guardar en Biblioteca" : "Guardar en Biblioteca"}</span>
                    </>
                  )}
                </button>
              )}

              {/* Opción para Borrar solamente el video de Deck A */}
              {videoIdA && (
                <button
                  type="button"
                  onClick={handleClearVideoOnlyA}
                  className="px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer select-none bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/60 hover:border-rose-600 text-rose-300 shadow-sm"
                  title="Borrar solamente el video de la Bandeja A (Deck B y audio del sistema intactos)"
                >
                  <VideoOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Borrar Video</span>
                </button>
              )}

              {trackA && (
                <button
                  type="button"
                  onClick={handleSafeClearDeckA}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer select-none ${
                    resetDeckAState
                      ? "bg-amber-500 border-amber-400 text-black font-black animate-pulse shadow-md scale-105"
                      : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white"
                  }`}
                  title={
                    resetDeckAState
                      ? "2° toque: Toca para confirmar y borrar la pista cargada en Bandeja A"
                      : "1° toque: Toca para borrar la pista cargada en Bandeja A"
                  }
                >
                  <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{resetDeckAState ? "¿CONFIRMAR BORRADO?" : "Borrar Pista"}</span>
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
                        <Trash2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>⏹ Borrar pista actual de la bandeja</span>
                      </button>
                    )}

                    {videoIdA && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleClearVideoOnlyA();
                          setIsSelectorOpenA(false);
                        }}
                        className="w-full text-left p-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/50 text-rose-300 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer mb-1"
                      >
                        <VideoOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>🎬 Borrar solamente video (Mantener pista)</span>
                      </button>
                    )}

                    {/* Botón para explorar en Biblioteca Musical */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSelectorOpenA(false);
                        setLibraryTargetDeckHint("A");
                        setIsLibraryOpen(true);
                      }}
                      className="w-full text-left p-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 text-amber-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer mb-1"
                    >
                      <ListMusic className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="flex flex-col">
                        <span>📚 Explorar en Biblioteca Musical</span>
                        <span className="text-[10px] text-amber-400 font-normal">Playlists, géneros, karaoke y pistas guardadas</span>
                      </div>
                    </button>

                    {/* Botón para subir archivo MP3/WAV/MP4 local */}
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
                        <span>📁 Subir MP4 Video / MP3 Local</span>
                        <span className="text-[10px] text-purple-400 font-normal">Soporta Video MP4 y Audio MP3/WAV &bull; 0 Latencia</span>
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
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black text-white truncate">
                      {trackA.song?.title || trackA.customTitle}
                    </h3>
                    <p className="text-xs font-semibold text-purple-300 truncate">
                      {trackA.song?.artist?.name || trackA.customArtist}
                    </p>
                  </div>
                </div>
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
            mediaRef={audioRefA}
            isVideo={isVideoA}
            onTimeUpdate={() => {
              if (audioRefA.current && deckModeA === "native") {
                setPlaybackSecondsA(Math.floor(audioRefA.current.currentTime));
              }
            }}
            onEnded={() => {
              if (isPlayingARef.current && playbackSecondsARef.current >= Math.max(10, trackADuration - 5)) {
                handleDeckAEndedRef.current?.();
              }
            }}
            onClearVideo={handleClearVideoOnlyA}
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
                ref={platterRefA}
                onPointerDown={handlePlatterPointerDownA}
                onPointerMove={handlePlatterPointerMoveA}
                onPointerUp={handlePlatterPointerUpA}
                onPointerCancel={handlePlatterPointerUpA}
                className={`w-36 h-36 rounded-full bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-950 border-4 ${
                  isDraggingA
                    ? "border-purple-400 scale-105"
                    : vinylActionA === "SPINBACK"
                    ? "border-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.5)] scale-102"
                    : vinylActionA === "REWIND"
                    ? "border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.5)]"
                    : vinylActionA === "FORWARD"
                    ? "border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.5)]"
                    : vinylActionA === "SCRATCH"
                    ? "border-purple-300 shadow-[0_0_25px_rgba(192,132,252,0.6)]"
                    : "border-zinc-800"
                } shadow-[0_0_25px_rgba(168,85,247,0.2)] flex items-center justify-center relative cursor-grab active:cursor-grabbing select-none transition-colors`}
                title="Plato de Vinilo Deck A - Arrastra para scratch o retroceder como un disco real"
              >
                {/* Ranuras de vinilo auténticas (micro-grooves concéntricos) */}
                <div className="absolute inset-1.5 rounded-full border border-zinc-800/80 pointer-events-none" />
                <div className="absolute inset-3 rounded-full border border-zinc-700/40 pointer-events-none" />
                <div className="absolute inset-5 rounded-full border border-zinc-800/60 pointer-events-none" />
                <div className="absolute inset-7 rounded-full border border-zinc-700/30 pointer-events-none" />

                {/* Marcador de Vinilo / Stripe Blanca de Posición (Estilo Slipmat de Torna) */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-6 rounded-full bg-gradient-to-b from-white via-purple-200 to-transparent shadow-[0_0_8px_rgba(255,255,255,0.9)] pointer-events-none z-10" />

                {/* Ranuras de vinilo intermedias */}
                <div className="w-28 h-28 rounded-full border border-zinc-800 flex items-center justify-center pointer-events-none">
                  <div className="w-20 h-20 rounded-full border border-zinc-700/60 flex items-center justify-center">
                    {/* Centro HUD de Jogwheel (Spindle / Record Label con botón Play/Pause táctil) */}
                    <div
                      data-spindle="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlayA();
                      }}
                      className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 border-2 border-white flex flex-col items-center justify-center text-white shadow-lg pointer-events-auto cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                      title="Click en centro: Play / Pausa"
                    >
                      {vinylActionA === "REWIND" ? (
                        <div className="flex flex-col items-center animate-pulse">
                          <RotateCcw className="w-4 h-4 text-amber-300" />
                          <span className="text-[7px] font-black text-amber-200">REWIND</span>
                        </div>
                      ) : vinylActionA === "FORWARD" ? (
                        <div className="flex flex-col items-center animate-pulse">
                          <RotateCw className="w-4 h-4 text-purple-200" />
                          <span className="text-[7px] font-black text-purple-100">PUSH</span>
                        </div>
                      ) : vinylActionA === "SPINBACK" ? (
                        <div className="flex flex-col items-center animate-spin">
                          <Disc3 className="w-4 h-4 text-pink-300" />
                          <span className="text-[7px] font-black text-pink-200">SPINBACK</span>
                        </div>
                      ) : vinylActionA === "SCRATCH" ? (
                        <div className="flex flex-col items-center">
                          <Disc className="w-4 h-4 text-purple-200 animate-spin [animation-duration:1s]" />
                          <span className="text-[7px] font-black text-purple-100">SCRATCH</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-[11px] font-black">{effectiveBpmA}</span>
                          <span className="text-[8px] font-bold opacity-80">BPM</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controles de Vinilo: Nudge Atrás, Spinback Club, Nudge Adelante */}
              <div className="flex items-center justify-center gap-1.5 mt-2.5">
                {/* Nudge Atrás (Clic: Empujón vinilo atrás | Mantener: Rebobinado continuo de disco) */}
                <button
                  onMouseDown={() => startContinuousNudge("A", -1)}
                  onMouseUp={() => stopContinuousNudge("A")}
                  onMouseLeave={() => stopContinuousNudge("A")}
                  onTouchStart={() => startContinuousNudge("A", -1)}
                  onTouchEnd={() => stopContinuousNudge("A")}
                  onClick={() => handleNudge("A", -1)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-purple-950/50 active:bg-purple-900 border border-zinc-800 hover:border-purple-600/40 text-[10px] font-black text-zinc-300 hover:text-purple-300 transition-all cursor-pointer flex items-center gap-1 shadow-sm select-none"
                  title="Clic: Empujar vinilo atrás (-0.5s) | Mantener: Rebobinado continuo de vinilo"
                >
                  <RotateCcw className="w-3 h-3 text-purple-400" />
                  <span>&laquo; NUDGE</span>
                </button>

                {/* Botón Central: SPINBACK / RETROCESO REAL DE DISCO */}
                <button
                  onClick={() => handleSpinback("A")}
                  className="px-2 py-1 rounded-lg bg-gradient-to-r from-red-600/20 via-purple-600/30 to-pink-600/20 hover:from-red-600/40 hover:to-pink-600/40 border border-purple-500/40 text-[10px] font-black text-white hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-purple-900/20"
                  title="Efecto Spinback: Retroceso salvaje de vinilo club (-4 segs con frenada inercial)"
                >
                  <Disc3 className="w-3.5 h-3.5 text-pink-400 animate-spin [animation-duration:4s]" />
                  <span className="bg-gradient-to-r from-pink-300 to-purple-200 bg-clip-text text-transparent">SPINBACK</span>
                </button>

                {/* Nudge Adelante (Clic: Empuje adelante | Mantener: Avance continuo) */}
                <button
                  onMouseDown={() => startContinuousNudge("A", 1)}
                  onMouseUp={() => stopContinuousNudge("A")}
                  onMouseLeave={() => stopContinuousNudge("A")}
                  onTouchStart={() => startContinuousNudge("A", 1)}
                  onTouchEnd={() => stopContinuousNudge("A")}
                  onClick={() => handleNudge("A", 1)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-purple-950/50 active:bg-purple-900 border border-zinc-800 hover:border-purple-600/40 text-[10px] font-black text-zinc-300 hover:text-purple-300 transition-all cursor-pointer flex items-center gap-1 shadow-sm select-none"
                  title="Clic: Empujar vinilo adelante (+0.5s) | Mantener: Avance continuo"
                >
                  <span>NUDGE &raquo;</span>
                  <RotateCw className="w-3 h-3 text-purple-400" />
                </button>
              </div>
            </div>

            {/* Contenedor Pitch Fader y Botones Subir/Bajar Tiempo Deck A */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Botones 2-Toques Subir / Bajar Tiempo Deck A (lado izquierdo del cuadro hacia dentro) */}
              <div className="flex flex-col justify-between h-40 py-0.5 gap-1 shrink-0">
                {/* Botón SUBIR TIEMPO (+0.5%) */}
                <button
                  type="button"
                  onClick={handlePitchUpA}
                  className={`w-9 sm:w-10 h-[47%] rounded-lg transition-all flex flex-col items-center justify-center p-1 cursor-pointer select-none active:scale-95 border ${
                    pitchUpSuccessA
                      ? "bg-emerald-500 text-black border-emerald-400 font-black shadow-md scale-105"
                      : pitchUpArmedA
                      ? "bg-amber-400 text-black border-amber-300 font-black animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.7)] scale-105"
                      : "bg-zinc-900/90 hover:bg-purple-950/70 border-zinc-800 hover:border-purple-500/50 text-purple-300 hover:text-white"
                  }`}
                  title={
                    pitchUpArmedA
                      ? "2° toque: Toca para subir tempo +0.5%"
                      : "1° toque: Toca para activar subir tempo (+0.5%)"
                  }
                >
                  <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[8px] font-mono font-black leading-none mt-0.5">
                    {pitchUpSuccessA ? "✓" : pitchUpArmedA ? "CONFIRM" : "+0.5%"}
                  </span>
                  <span className="text-[6.5px] uppercase font-bold tracking-tight opacity-75">
                    {pitchUpArmedA ? "SUBIR" : "TEMPO"}
                  </span>
                </button>

                {/* Botón BAJAR TIEMPO (-0.5%) */}
                <button
                  type="button"
                  onClick={handlePitchDownA}
                  className={`w-9 sm:w-10 h-[47%] rounded-lg transition-all flex flex-col items-center justify-center p-1 cursor-pointer select-none active:scale-95 border ${
                    pitchDownSuccessA
                      ? "bg-emerald-500 text-black border-emerald-400 font-black shadow-md scale-105"
                      : pitchDownArmedA
                      ? "bg-amber-400 text-black border-amber-300 font-black animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.7)] scale-105"
                      : "bg-zinc-900/90 hover:bg-purple-950/70 border-zinc-800 hover:border-purple-500/50 text-purple-300 hover:text-white"
                  }`}
                  title={
                    pitchDownArmedA
                      ? "2° toque: Toca para bajar tempo -0.5%"
                      : "1° toque: Toca para activar bajar tempo (-0.5%)"
                  }
                >
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[8px] font-mono font-black leading-none mt-0.5">
                    {pitchDownSuccessA ? "✓" : pitchDownArmedA ? "CONFIRM" : "-0.5%"}
                  </span>
                  <span className="text-[6.5px] uppercase font-bold tracking-tight opacity-75">
                    {pitchDownArmedA ? "BAJAR" : "TEMPO"}
                  </span>
                </button>
              </div>

              {/* Pitch / Tempo Fader Vertical Deck A (2-Toques Seguridad) */}
              <div className="flex flex-col items-center justify-between h-40 w-20 bg-zinc-950/80 p-1.5 rounded-xl border border-zinc-800 touch-pan-y select-none relative">
              {/* Indicador de Valor y Bloqueo / Desbloqueo */}
              <button
                type="button"
                onClick={() => {
                  if (isPitchActiveA) {
                    setIsPitchActiveA(false);
                    if (pitchTimerARef.current) clearTimeout(pitchTimerARef.current);
                  } else {
                    handleActivatePitchA();
                  }
                }}
                className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold transition-all cursor-pointer ${
                  isPitchActiveA
                    ? "bg-purple-950 border border-purple-400 text-purple-200 shadow-sm animate-pulse"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-300"
                }`}
                title={isPitchActiveA ? "Pitch activo (toca para bloquear)" : "1° toque: Toca para activar ajuste de tempo"}
              >
                {isPitchActiveA ? (
                  <>
                    <Unlock className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                    <span>{pitchA >= 0 ? `+${pitchA.toFixed(1)}%` : `${pitchA.toFixed(1)}%`}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                    <span>{pitchA >= 0 ? `+${pitchA.toFixed(1)}%` : `${pitchA.toFixed(1)}%`}</span>
                  </>
                )}
              </button>

              {/* Slider con Overlay protector para el 1er toque y libre scroll vertical */}
              <div className="relative flex items-center justify-center my-auto w-20 h-24 touch-pan-y">
                {!isPitchActiveA && (
                  <div
                    onClick={handleActivatePitchA}
                    className="absolute inset-0 z-10 cursor-pointer flex flex-col items-center justify-center rounded-lg bg-zinc-950/75 border border-dashed border-purple-500/40 hover:border-purple-400 transition-all touch-pan-y select-none group"
                    title="1er toque: Toca para activar y mover el tempo"
                  >
                    <Lock className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[7.5px] font-mono text-zinc-400 group-hover:text-purple-300 mt-0.5 text-center font-bold px-0.5 leading-tight">
                      1° toque activar
                    </span>
                  </div>
                )}

                <input
                  type="range"
                  min={-8}
                  max={8}
                  step={0.1}
                  disabled={!isPitchActiveA}
                  value={pitchA}
                  onChange={(e) => {
                    setPitchA(Number(e.target.value));
                    resetPitchTimerA();
                  }}
                  onPointerDown={resetPitchTimerA}
                  className={`h-24 -rotate-90 w-24 accent-purple-500 appearance-none bg-zinc-800 rounded-lg transition-all ${
                    isPitchActiveA
                      ? "cursor-pointer ring-1 ring-purple-500/50 shadow-sm shadow-purple-500/20"
                      : "opacity-40 pointer-events-none cursor-not-allowed"
                  }`}
                />
              </div>

              {/* Botón RESET con confirmación en 2 toques */}
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
              title={isPlayingA ? "Pausar Bandeja A" : "Reproducir Bandeja A"}
              className={`py-2.5 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-40 ${
                isPlayingA
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/30"
                  : trackA
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/40 ring-1 ring-emerald-400/50 animate-pulse"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
              }`}
            >
              {isPlayingA ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>
                {isPlayingA ? "PAUSA" : "PLAY"}
              </span>
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
        {/* MIXER CENTRAL & MOTOR DE ENGANCHE          */}
        {/* ========================================== */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between items-center text-center space-y-4 w-full max-w-full overflow-hidden">
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
                className={`w-full py-2.5 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5 whitespace-nowrap ${
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

          {/* CROSSFADER PROFESIONAL CON ACTIVACIÓN EN DOS TOQUES */}
          <div className={`w-full space-y-2.5 pt-3 border-t transition-all rounded-2xl p-3 sm:p-3.5 ${
            isCrossfaderActive
              ? "bg-purple-950/20 border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.18)]"
              : "bg-zinc-950/60 border-zinc-800/80"
          }`}>
            {/* Header del Crossfader: Justificado, Título e Indicador de Seguridad */}
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full transition-all ${
                  isCrossfaderActive
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                    : "bg-purple-500/60"
                }`} />
                <span className="text-[11px] uppercase font-black tracking-wider text-zinc-200">
                  Crossfader
                </span>
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
                className={`px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap select-none shadow-sm ${
                  isCrossfaderActive
                    ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.2)] animate-pulse"
                    : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700/80 text-zinc-400 hover:text-white"
                }`}
                title={isCrossfaderActive ? "Crossfader activo (toca para bloquear)" : "1er toque: Toca para activar crossfader"}
              >
                {isCrossfaderActive ? (
                  <>
                    <Unlock className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>DESBLOQUEADO</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-purple-400 shrink-0" />
                    <span>SEGURIDAD (2T)</span>
                  </>
                )}
              </button>
            </div>

            {/* Pista física del Crossfader (Hardware Realistic DJ Look) */}
            <div className="relative py-1 touch-pan-y w-full">
              {/* Recessed Track Container */}
              <div className="relative h-11 bg-zinc-900/90 rounded-xl border border-zinc-800 p-1 flex items-center shadow-inner overflow-hidden">
                {/* Marcas de graduación de fondo (-100, -50, 0, +50, +100) */}
                <div className="absolute inset-x-3 inset-y-0 flex items-center justify-between pointer-events-none opacity-40 z-0">
                  <span className="text-[7px] font-mono text-purple-400 font-bold">A</span>
                  <div className="w-px h-3 bg-zinc-700" />
                  <div className="w-0.5 h-6 bg-zinc-500/80 rounded-full" />
                  <div className="w-px h-3 bg-zinc-700" />
                  <span className="text-[7px] font-mono text-cyan-400 font-bold">B</span>
                </div>

                {/* Slider range nativo */}
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
                  className={`w-full accent-purple-500 h-3 bg-transparent appearance-none relative z-10 transition-all ${
                    isCrossfaderActive
                      ? "cursor-pointer"
                      : "opacity-40 cursor-not-allowed"
                  }`}
                />

                {/* Overlay protector para el 1er toque con efecto de cristal suave */}
                {!isCrossfaderActive && (
                  <div
                    onClick={handleActivateCrossfader}
                    className="absolute inset-0 z-20 cursor-pointer flex items-center justify-center rounded-xl bg-zinc-950/75 border border-dashed border-purple-500/40 hover:border-purple-400 transition-all backdrop-blur-[1px] group touch-pan-y select-none"
                    title="Primer toque: Toca para activar el crossfader"
                  >
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/95 border border-purple-500/40 text-purple-200 text-[9.5px] font-bold shadow-lg group-hover:scale-105 group-hover:border-purple-400 transition-all whitespace-nowrap">
                      <Lock className="w-3 h-3 text-purple-400 shrink-0" />
                      <span>1er toque: Toca para activar</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Medidores de balance y volumen de canales con justificación equilibrada */}
            {(() => {
              const levelA = crossfaderValue <= 0 ? 100 : Math.max(0, 100 - crossfaderValue);
              const levelB = crossfaderValue >= 0 ? 100 : Math.max(0, 100 + crossfaderValue);
              return (
                <div className="grid grid-cols-3 items-center text-[10px] font-mono font-bold px-1 text-zinc-400 w-full">
                  {/* Izquierda: Deck A */}
                  <div className="text-left flex items-center gap-1">
                    <span className={crossfaderValue < -10 ? "text-purple-400 font-black" : "text-zinc-400"}>
                      A: {levelA}%
                    </span>
                  </div>

                  {/* Centro: Posición de mezcla */}
                  <div className="text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[8.5px] font-black tracking-wider transition-all ${
                        crossfaderValue === 0
                          ? "bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                          : crossfaderValue === -100
                          ? "bg-purple-950/80 border border-purple-500/50 text-purple-300"
                          : crossfaderValue === 100
                          ? "bg-cyan-950/80 border border-cyan-500/50 text-cyan-300"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-400"
                      }`}
                    >
                      {crossfaderValue === 0
                        ? "50 / 50"
                        : crossfaderValue < 0
                        ? `◀ A ${Math.abs(crossfaderValue)}%`
                        : `B ${crossfaderValue}% ▶`}
                    </span>
                  </div>

                  {/* Derecha: Deck B */}
                  <div className="text-right flex items-center justify-end gap-1">
                    <span className={crossfaderValue > 10 ? "text-cyan-400 font-black" : "text-zinc-400"}>
                      B: {levelB}%
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Botones de Posición Rápida y Reset (Hardware DJ Style) */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5 w-full">
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
                className={`py-2 px-1 rounded-xl text-[10px] font-mono font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 cursor-pointer shadow-sm ${
                  crossfaderValue === -100
                    ? "bg-purple-600 text-white shadow-purple-600/30 font-black"
                    : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-purple-300 border border-zinc-800"
                }`}
                title="Llevar crossfader a Deck A (100%)"
              >
                <span>◀ DECK A</span>
              </button>

              <button
                type="button"
                onClick={handleResetCrossfader}
                className={`py-2 px-1 rounded-xl text-[10px] font-mono font-bold transition-all flex items-center justify-center whitespace-nowrap select-none cursor-pointer shadow-sm ${
                  resetCrossfaderSuccess
                    ? "bg-emerald-500 text-black font-black shadow-md scale-105"
                    : resetCrossfaderArmed
                    ? "bg-amber-400 text-black font-black animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.7)] scale-105"
                    : crossfaderValue === 0
                    ? "bg-zinc-800 text-zinc-200 border border-zinc-700"
                    : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800"
                }`}
                title="Resetear Crossfader al Centro (50/50) en 2 toques"
              >
                {resetCrossfaderSuccess ? (
                  <span>✓ 50/50</span>
                ) : resetCrossfaderArmed ? (
                  <span>¿CONFIRMAR?</span>
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
                className={`py-2 px-1 rounded-xl text-[10px] font-mono font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 cursor-pointer shadow-sm ${
                  crossfaderValue === 100
                    ? "bg-cyan-600 text-white shadow-cyan-600/30 font-black"
                    : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-300 border border-zinc-800"
                }`}
                title="Llevar crossfader a Deck B (100%)"
              >
                <span>DECK B ▶</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* DECK B (Canal 2 - Cian Eléctrico)          */}
        {/* ========================================== */}
        <div id="deck-b" className="p-4 sm:p-5 rounded-2xl bg-gradient-to-bl from-zinc-950 via-zinc-900 to-cyan-950/30 border-2 border-cyan-500/40 shadow-2xl flex flex-col justify-between space-y-4 relative w-full max-w-full overflow-hidden scroll-mt-24 transition-all duration-300">
          {/* Header de Deck B con Selector de Pista */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-cyan-600 text-white text-[10px] font-black tracking-widest uppercase shadow-md shadow-cyan-600/30">
                DECK B &bull; CANAL 2
              </span>
              <span className={`w-2 h-2 rounded-full ${trackB ? (isPlayingB ? (currentOnAirDeck === "B" ? "bg-emerald-400 animate-ping" : "bg-cyan-400") : "bg-cyan-500/50") : "bg-zinc-600"}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${trackB ? (isPlayingB ? (currentOnAirDeck === "B" ? "text-emerald-400 font-black" : "text-cyan-300 font-bold") : "text-cyan-400") : "text-zinc-500"}`}>
                {trackB ? (isPlayingB ? (currentOnAirDeck === "B" ? "Al Aire" : "En Mezcla") : "Preparado") : "Bandeja Vacía"}
              </span>
              {trackB?.tipAmountCents && trackB.tipAmountCents > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] font-black">
                  ⭐ VIP
                </span>
              ) : null}
            </div>

            {/* Acciones Deck B: Guardar en Biblioteca, Limpiar y Cargar Pista */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {trackB && (
                <button
                  type="button"
                  onClick={() => handleSaveDeckToLibrary("B")}
                  disabled={savingDeckB || savedDeckB}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                    savedDeckB
                      ? "bg-emerald-950/70 border-emerald-500/60 text-emerald-300 shadow-sm"
                      : isPlayingB
                      ? "bg-cyan-900/80 hover:bg-cyan-800 border-cyan-500/60 text-cyan-100 shadow-md shadow-cyan-600/30 animate-pulse"
                      : "bg-zinc-900 hover:bg-cyan-950/60 border-zinc-800 hover:border-cyan-500/40 text-cyan-300"
                  }`}
                  title={
                    savedDeckB
                      ? "Pista guardada en la biblioteca"
                      : isPlayingB
                      ? "Guardar la pista en reproducción actual en la Biblioteca Musical"
                      : "Guardar esta pista cargada en la Biblioteca Musical"
                  }
                >
                  {savedDeckB ? (
                    <>
                      <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">En Biblioteca</span>
                    </>
                  ) : savingDeckB ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isPlayingB ? "⭐ Guardar en Biblioteca" : "Guardar en Biblioteca"}</span>
                    </>
                  )}
                </button>
              )}

              {/* Opción para Borrar solamente el video de Deck B */}
              {videoIdB && (
                <button
                  type="button"
                  onClick={handleClearVideoOnlyB}
                  className="px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer select-none bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/60 hover:border-rose-600 text-rose-300 shadow-sm"
                  title="Borrar solamente el video de la Bandeja B (Deck A y audio del sistema intactos)"
                >
                  <VideoOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Borrar Video</span>
                </button>
              )}

              {trackB && (
                <button
                  type="button"
                  onClick={handleSafeClearDeckB}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer select-none ${
                    resetDeckBState
                      ? "bg-amber-500 border-amber-400 text-black font-black animate-pulse shadow-md scale-105"
                      : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white"
                  }`}
                  title={
                    resetDeckBState
                      ? "2° toque: Toca para confirmar y borrar la pista cargada en Bandeja B"
                      : "1° toque: Toca para borrar la pista cargada en Bandeja B"
                  }
                >
                  <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{resetDeckBState ? "¿CONFIRMAR BORRADO?" : "Borrar Pista"}</span>
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
                        <Trash2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>⏹ Borrar pista actual de la bandeja</span>
                      </button>
                    )}

                    {videoIdB && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleClearVideoOnlyB();
                          setIsSelectorOpenB(false);
                        }}
                        className="w-full text-left p-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/50 text-rose-300 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer mb-1"
                      >
                        <VideoOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>🎬 Borrar solamente video (Mantener pista)</span>
                      </button>
                    )}

                    {/* Botón para explorar en Biblioteca Musical */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSelectorOpenB(false);
                        setLibraryTargetDeckHint("B");
                        setIsLibraryOpen(true);
                      }}
                      className="w-full text-left p-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 text-amber-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer mb-1"
                    >
                      <ListMusic className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="flex flex-col">
                        <span>📚 Explorar en Biblioteca Musical</span>
                        <span className="text-[10px] text-amber-400 font-normal">Playlists, géneros, karaoke y pistas guardadas</span>
                      </div>
                    </button>

                    {/* Botón para subir archivo MP3/WAV/MP4 local */}
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
                        <span>📁 Subir MP4 Video / MP3 Local</span>
                        <span className="text-[10px] text-cyan-400 font-normal">Soporta Video MP4 y Audio MP3/WAV &bull; 0 Latencia</span>
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
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black text-white truncate">
                      {trackB.song?.title || trackB.customTitle}
                    </h3>
                    <p className="text-xs font-semibold text-cyan-300 truncate">
                      {trackB.song?.artist?.name || trackB.customArtist}
                    </p>
                  </div>
                </div>
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
            mediaRef={audioRefB}
            isVideo={isVideoB}
            onTimeUpdate={() => {
              if (audioRefB.current && deckModeB === "native") {
                setPlaybackSecondsB(Math.floor(audioRefB.current.currentTime));
              }
            }}
            onEnded={() => {
              if (isPlayingBRef.current && playbackSecondsBRef.current >= Math.max(10, trackBDuration - 5)) {
                handleDeckBEndedRef.current?.();
              }
            }}
            onClearVideo={handleClearVideoOnlyB}
          />

          {/* Platter / Jogwheel Deck B & Pitch Fader */}
          <div className="flex items-center justify-around sm:justify-between gap-3 sm:gap-4 py-2 w-full">
            {/* Contenedor Pitch Fader y Botones Subir/Bajar Tiempo Deck B */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Pitch / Tempo Fader Vertical Deck B (2-Toques Seguridad) */}
              <div className="flex flex-col items-center justify-between h-40 w-20 bg-zinc-950/80 p-1.5 rounded-xl border border-zinc-800 touch-pan-y select-none relative">
                {/* Indicador de Valor y Bloqueo / Desbloqueo */}
                <button
                  type="button"
                  onClick={() => {
                    if (isPitchActiveB) {
                      setIsPitchActiveB(false);
                      if (pitchTimerBRef.current) clearTimeout(pitchTimerBRef.current);
                    } else {
                      handleActivatePitchB();
                    }
                  }}
                  className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold transition-all cursor-pointer ${
                    isPitchActiveB
                      ? "bg-cyan-950 border border-cyan-400 text-cyan-200 shadow-sm animate-pulse"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-300"
                  }`}
                  title={isPitchActiveB ? "Pitch activo (toca para bloquear)" : "1° toque: Toca para activar ajuste de tempo"}
                >
                  {isPitchActiveB ? (
                    <>
                      <Unlock className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                      <span>{pitchB >= 0 ? `+${pitchB.toFixed(1)}%` : `${pitchB.toFixed(1)}%`}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                      <span>{pitchB >= 0 ? `+${pitchB.toFixed(1)}%` : `${pitchB.toFixed(1)}%`}</span>
                    </>
                  )}
                </button>

                {/* Slider con Overlay protector para el 1er toque y libre scroll vertical */}
                <div className="relative flex items-center justify-center my-auto w-20 h-24 touch-pan-y">
                  {!isPitchActiveB && (
                    <div
                      onClick={handleActivatePitchB}
                      className="absolute inset-0 z-10 cursor-pointer flex flex-col items-center justify-center rounded-lg bg-zinc-950/75 border border-dashed border-cyan-500/40 hover:border-cyan-400 transition-all touch-pan-y select-none group"
                      title="1er toque: Toca para activar y mover el tempo"
                    >
                      <Lock className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[7.5px] font-mono text-zinc-400 group-hover:text-cyan-300 mt-0.5 text-center font-bold px-0.5 leading-tight">
                        1° toque activar
                      </span>
                    </div>
                  )}

                  <input
                    type="range"
                    min={-8}
                    max={8}
                    step={0.1}
                    disabled={!isPitchActiveB}
                    value={pitchB}
                    onChange={(e) => {
                      setPitchB(Number(e.target.value));
                      setIsSyncedB(false);
                      resetPitchTimerB();
                    }}
                    onPointerDown={resetPitchTimerB}
                    className={`h-24 -rotate-90 w-24 accent-cyan-400 appearance-none bg-zinc-800 rounded-lg transition-all ${
                      isPitchActiveB
                        ? "cursor-pointer ring-1 ring-cyan-500/50 shadow-sm shadow-cyan-500/20"
                        : "opacity-40 pointer-events-none cursor-not-allowed"
                    }`}
                  />
                </div>

                {/* Botón RESET con confirmación en 2 toques */}
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

              {/* Botones 2-Toques Subir / Bajar Tiempo Deck B (lado derecho del cuadro hacia dentro) */}
              <div className="flex flex-col justify-between h-40 py-0.5 gap-1 shrink-0">
                {/* Botón SUBIR TIEMPO (+0.5%) */}
                <button
                  type="button"
                  onClick={handlePitchUpB}
                  className={`w-9 sm:w-10 h-[47%] rounded-lg transition-all flex flex-col items-center justify-center p-1 cursor-pointer select-none active:scale-95 border ${
                    pitchUpSuccessB
                      ? "bg-emerald-500 text-black border-emerald-400 font-black shadow-md scale-105"
                      : pitchUpArmedB
                      ? "bg-amber-400 text-black border-amber-300 font-black animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.7)] scale-105"
                      : "bg-zinc-900/90 hover:bg-cyan-950/70 border-zinc-800 hover:border-cyan-500/50 text-cyan-300 hover:text-white"
                  }`}
                  title={
                    pitchUpArmedB
                      ? "2° toque: Toca para subir tempo +0.5%"
                      : "1° toque: Toca para activar subir tempo (+0.5%)"
                  }
                >
                  <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[8px] font-mono font-black leading-none mt-0.5">
                    {pitchUpSuccessB ? "✓" : pitchUpArmedB ? "CONFIRM" : "+0.5%"}
                  </span>
                  <span className="text-[6.5px] uppercase font-bold tracking-tight opacity-75">
                    {pitchUpArmedB ? "SUBIR" : "TEMPO"}
                  </span>
                </button>

                {/* Botón BAJAR TIEMPO (-0.5%) */}
                <button
                  type="button"
                  onClick={handlePitchDownB}
                  className={`w-9 sm:w-10 h-[47%] rounded-lg transition-all flex flex-col items-center justify-center p-1 cursor-pointer select-none active:scale-95 border ${
                    pitchDownSuccessB
                      ? "bg-emerald-500 text-black border-emerald-400 font-black shadow-md scale-105"
                      : pitchDownArmedB
                      ? "bg-amber-400 text-black border-amber-300 font-black animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.7)] scale-105"
                      : "bg-zinc-900/90 hover:bg-cyan-950/70 border-zinc-800 hover:border-cyan-500/50 text-cyan-300 hover:text-white"
                  }`}
                  title={
                    pitchDownArmedB
                      ? "2° toque: Toca para bajar tempo -0.5%"
                      : "1° toque: Toca para activar bajar tempo (-0.5%)"
                  }
                >
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[8px] font-mono font-black leading-none mt-0.5">
                    {pitchDownSuccessB ? "✓" : pitchDownArmedB ? "CONFIRM" : "-0.5%"}
                  </span>
                  <span className="text-[6.5px] uppercase font-bold tracking-tight opacity-75">
                    {pitchDownArmedB ? "BAJAR" : "TEMPO"}
                  </span>
                </button>
              </div>
            </div>

            {/* Jogwheel Giratorio Deck B con soporte Drag & Drop desplazado hacia la derecha */}
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
              className="relative shrink-0 ml-auto mr-1 sm:mr-3 translate-x-1 sm:translate-x-2"
            >
              <div
                ref={platterRefB}
                onPointerDown={handlePlatterPointerDownB}
                onPointerMove={handlePlatterPointerMoveB}
                onPointerUp={handlePlatterPointerUpB}
                onPointerCancel={handlePlatterPointerUpB}
                className={`w-36 h-36 rounded-full bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-950 border-4 ${
                  isDraggingB
                    ? "border-cyan-400 scale-105"
                    : vinylActionB === "SPINBACK"
                    ? "border-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.5)] scale-102"
                    : vinylActionB === "REWIND"
                    ? "border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.5)]"
                    : vinylActionB === "FORWARD"
                    ? "border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.5)]"
                    : vinylActionB === "SCRATCH"
                    ? "border-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.6)]"
                    : "border-zinc-800"
                } shadow-[0_0_25px_rgba(6,182,212,0.2)] flex items-center justify-center relative cursor-grab active:cursor-grabbing select-none transition-colors`}
                title="Plato de Vinilo Deck B - Arrastra para scratch o retroceder como un disco real"
              >
                {/* Ranuras de vinilo auténticas (micro-grooves concéntricos) */}
                <div className="absolute inset-1.5 rounded-full border border-zinc-800/80 pointer-events-none" />
                <div className="absolute inset-3 rounded-full border border-zinc-700/40 pointer-events-none" />
                <div className="absolute inset-5 rounded-full border border-zinc-800/60 pointer-events-none" />
                <div className="absolute inset-7 rounded-full border border-zinc-700/30 pointer-events-none" />

                {/* Marcador de Vinilo / Stripe Blanca de Posición (Estilo Slipmat de Torna) */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-6 rounded-full bg-gradient-to-b from-white via-cyan-200 to-transparent shadow-[0_0_8px_rgba(255,255,255,0.9)] pointer-events-none z-10" />

                {/* Ranuras de vinilo intermedias */}
                <div className="w-28 h-28 rounded-full border border-zinc-800 flex items-center justify-center pointer-events-none">
                  <div className="w-20 h-20 rounded-full border border-zinc-700/60 flex items-center justify-center">
                    {/* Centro HUD de Jogwheel (Spindle / Record Label con botón Play/Pause táctil) */}
                    <div
                      data-spindle="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlayB();
                      }}
                      className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 border-2 border-white flex flex-col items-center justify-center text-white shadow-lg pointer-events-auto cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                      title="Click en centro: Play / Pausa"
                    >
                      {vinylActionB === "REWIND" ? (
                        <div className="flex flex-col items-center animate-pulse">
                          <RotateCcw className="w-4 h-4 text-amber-300" />
                          <span className="text-[7px] font-black text-amber-200">REWIND</span>
                        </div>
                      ) : vinylActionB === "FORWARD" ? (
                        <div className="flex flex-col items-center animate-pulse">
                          <RotateCw className="w-4 h-4 text-cyan-200" />
                          <span className="text-[7px] font-black text-cyan-100">PUSH</span>
                        </div>
                      ) : vinylActionB === "SPINBACK" ? (
                        <div className="flex flex-col items-center animate-spin">
                          <Disc3 className="w-4 h-4 text-pink-300" />
                          <span className="text-[7px] font-black text-pink-200">SPINBACK</span>
                        </div>
                      ) : vinylActionB === "SCRATCH" ? (
                        <div className="flex flex-col items-center">
                          <Disc className="w-4 h-4 text-cyan-200 animate-spin [animation-duration:1s]" />
                          <span className="text-[7px] font-black text-cyan-100">SCRATCH</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center translate-x-0.5">
                          <span className="text-[11px] font-black tracking-wider">{effectiveBpmB}</span>
                          <span className="text-[8px] font-bold opacity-80 tracking-widest">BPM</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controles de Vinilo: Nudge Atrás, Spinback Club, Nudge Adelante */}
              <div className="flex items-center justify-center gap-1.5 mt-2.5">
                {/* Nudge Atrás (Clic: Empujón vinilo atrás | Mantener: Rebobinado continuo de disco) */}
                <button
                  onMouseDown={() => startContinuousNudge("B", -1)}
                  onMouseUp={() => stopContinuousNudge("B")}
                  onMouseLeave={() => stopContinuousNudge("B")}
                  onTouchStart={() => startContinuousNudge("B", -1)}
                  onTouchEnd={() => stopContinuousNudge("B")}
                  onClick={() => handleNudge("B", -1)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-cyan-950/50 active:bg-cyan-900 border border-zinc-800 hover:border-cyan-600/40 text-[10px] font-black text-zinc-300 hover:text-cyan-300 transition-all cursor-pointer flex items-center gap-1 shadow-sm select-none"
                  title="Clic: Empujar vinilo atrás (-0.5s) | Mantener: Rebobinado continuo de vinilo"
                >
                  <RotateCcw className="w-3 h-3 text-cyan-400" />
                  <span>&laquo; NUDGE</span>
                </button>

                {/* Botón Central: SPINBACK / RETROCESO REAL DE DISCO */}
                <button
                  onClick={() => handleSpinback("B")}
                  className="px-2 py-1 rounded-lg bg-gradient-to-r from-red-600/20 via-cyan-600/30 to-pink-600/20 hover:from-red-600/40 hover:to-pink-600/40 border border-cyan-500/40 text-[10px] font-black text-white hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-cyan-900/20"
                  title="Efecto Spinback: Retroceso salvaje de vinilo club (-4 segs con frenada inercial)"
                >
                  <Disc3 className="w-3.5 h-3.5 text-pink-400 animate-spin [animation-duration:4s]" />
                  <span className="bg-gradient-to-r from-pink-300 to-cyan-200 bg-clip-text text-transparent">SPINBACK</span>
                </button>

                {/* Nudge Adelante (Clic: Empuje adelante | Mantener: Avance continuo) */}
                <button
                  onMouseDown={() => startContinuousNudge("B", 1)}
                  onMouseUp={() => stopContinuousNudge("B")}
                  onMouseLeave={() => stopContinuousNudge("B")}
                  onTouchStart={() => startContinuousNudge("B", 1)}
                  onTouchEnd={() => stopContinuousNudge("B")}
                  onClick={() => handleNudge("B", 1)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-cyan-950/50 active:bg-cyan-900 border border-zinc-800 hover:border-cyan-600/40 text-[10px] font-black text-zinc-300 hover:text-cyan-300 transition-all cursor-pointer flex items-center gap-1 shadow-sm select-none"
                  title="Clic: Empujar vinilo adelante (+0.5s) | Mantener: Avance continuo"
                >
                  <span>NUDGE &raquo;</span>
                  <RotateCw className="w-3 h-3 text-cyan-400" />
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
              title={isPlayingB ? "Pausar Bandeja B" : "Reproducir Bandeja B"}
              className={`py-2.5 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-40 ${
                isPlayingB
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/30"
                  : trackB
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/40 ring-1 ring-emerald-400/50 animate-pulse"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
              }`}
            >
              {isPlayingB ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>
                {isPlayingB ? "PAUSA" : "PLAY"}
              </span>
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

      {/* ========================================================================= */}
      {/* 4. PANEL SPLIT-SCREEN: BIBLIOTECA MUSICAL EN VIVO (ESTILO VIRTUALDJ)      */}
      {/* ========================================================================= */}
      {isLibraryOpen && libraryViewMode === "split" && (
        <section id="dj-library-section" className="rounded-3xl border border-amber-500/40 bg-zinc-950/95 backdrop-blur-md p-4 sm:p-5 shadow-2xl transition-all animate-in fade-in duration-200 scroll-mt-24">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <ListMusic className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    BIBLIOTECA MUSICAL • CABINA INTEGRADA
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    EN VIVO SIN PAUSAS
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Navega playlists, géneros y karaoke. Carga temas en cualquiera de las bandejas sin detener la música al aire.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLibraryViewMode("drawer")}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Cambiar a pantalla completa flotante"
              >
                <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Modo Flotante</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLibraryOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-red-950/50 text-zinc-400 hover:text-red-300 border border-zinc-750 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Cerrar biblioteca (Atajo: Esc o B)"
              >
                <X className="w-4 h-4 text-red-400" />
                <span>Cerrar [Esc]</span>
              </button>
            </div>
          </div>

          <div className="max-h-[620px] overflow-y-auto pr-1">
            <MusicLibraryView
              isEmbedded={true}
              onLoadDeckA={handleLoadSongFromLibraryA}
              onLoadDeckB={handleLoadSongFromLibraryB}
              onClose={() => setIsLibraryOpen(false)}
              targetDeckHint={libraryTargetDeckHint}
              compactHeader={true}
            />
          </div>
        </section>
      )}

      {/* Ancla de Audio Silencioso de Fondo (Garantiza que iOS y Android no suspendan la pestaña al salir a WhatsApp) */}
      <audio
        ref={silentAudioRef}
        src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"
        loop
        playsInline
        className="hidden"
      />

      {/* Selectores de archivo ocultos para carga de MP4 / MP3 / WAV local */}
      <input
        type="file"
        ref={fileInputRefA}
        accept="audio/*,video/mp4,video/*,.mp4,.webm,.m4v,.mov,.mp3,.wav,.ogg"
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
        accept="audio/*,video/mp4,video/*,.mp4,.webm,.m4v,.mov,.mp3,.wav,.ogg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleLoadLocalFileB(file);
          e.target.value = "";
        }}
      />

      {/* ========================================================================= */}
      {/* 5. MODAL / DRAWER FLOTANTE DE BIBLIOTECA CON MINI-HUD DE CABINA EN VIVO   */}
      {/* ========================================================================= */}
      {isLibraryOpen && libraryViewMode === "drawer" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col p-2 sm:p-4 animate-in fade-in duration-200"
        >
          {/* LIVE MINI-DJ HUD BAR (Mantén el control visual total mientras buscas pistas) */}
          <div className="rounded-2xl bg-zinc-950/95 border border-zinc-800 shadow-2xl p-3 mb-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* DECK A MINI MONITOR */}
            <div className="flex items-center gap-2 sm:gap-3 bg-zinc-900/90 border border-purple-900/40 rounded-xl px-3 py-1.5 flex-1 min-w-[200px]">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-[11px] font-black text-purple-400 uppercase tracking-wider">
                  DECK A
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    isPlayingA
                      ? currentOnAirDeck === "A"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black"
                        : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {isPlayingA ? (currentOnAirDeck === "A" ? "▶ AL AIRE" : "▶ EN MEZCLA") : "⏸ PAUSA"}
                </span>
              </div>
              <div className="truncate text-xs text-white font-medium flex-1">
                {trackA ? (
                  <span>
                    <strong className="text-purple-300">{trackA.customTitle || trackA.song?.title || "Pista A"}</strong>
                    {" - "}
                    <span className="text-zinc-400">{trackA.customArtist || trackA.song?.artist?.name || "Artista"}</span>
                  </span>
                ) : (
                  <span className="text-zinc-500 italic">Bandeja A vacía</span>
                )}
              </div>
              <div className="text-[10px] font-mono text-zinc-400 shrink-0">
                {formatTime(playbackSecondsA)} / {formatTime(trackADuration)}
              </div>
            </div>

            {/* CENTRO: MASTER STATUS & MODE SWITCH */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300">
                <Headphones className="w-3.5 h-3.5 text-amber-400" />
                <span>CROSSFADER:</span>
                <strong className="text-amber-400">
                  {crossfaderValue === 0 ? "CENTRO" : crossfaderValue < 0 ? `A ${Math.abs(crossfaderValue)}%` : `B ${crossfaderValue}%`}
                </strong>
              </div>

              <button
                type="button"
                onClick={() => setLibraryViewMode("split")}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Cambiar a modo Split-Screen bajo las bandejas"
              >
                <Columns className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Panel Dividido</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLibraryOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                title="Cerrar biblioteca y volver a la cabina completa (Atajo: Esc o B)"
              >
                <X className="w-4 h-4" />
                <span>CERRAR [ESC]</span>
              </button>
            </div>

            {/* DECK B MINI MONITOR */}
            <div className="flex items-center gap-2 sm:gap-3 bg-zinc-900/90 border border-cyan-900/40 rounded-xl px-3 py-1.5 flex-1 min-w-[200px]">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[11px] font-black text-cyan-400 uppercase tracking-wider">
                  DECK B
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    isPlayingB
                      ? currentOnAirDeck === "B"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black"
                        : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {isPlayingB ? (currentOnAirDeck === "B" ? "▶ AL AIRE" : "▶ EN MEZCLA") : "⏸ PAUSA"}
                </span>
              </div>
              <div className="truncate text-xs text-white font-medium flex-1">
                {trackB ? (
                  <span>
                    <strong className="text-cyan-300">{trackB.customTitle || trackB.song?.title || "Pista B"}</strong>
                    {" - "}
                    <span className="text-zinc-400">{trackB.customArtist || trackB.song?.artist?.name || "Artista"}</span>
                  </span>
                ) : (
                  <span className="text-zinc-500 italic">Bandeja B vacía</span>
                )}
              </div>
              <div className="text-[10px] font-mono text-zinc-400 shrink-0">
                {formatTime(playbackSecondsB)} / {formatTime(trackBDuration)}
              </div>
            </div>
          </div>

          {/* CUERPO PRINCIPAL DE LA BIBLIOTECA */}
          <div className="flex-1 overflow-y-auto rounded-2xl bg-zinc-950/80 border border-zinc-800/80 p-3 sm:p-4 shadow-inner">
            <MusicLibraryView
              isEmbedded={true}
              onLoadDeckA={handleLoadSongFromLibraryA}
              onLoadDeckB={handleLoadSongFromLibraryB}
              onClose={() => setIsLibraryOpen(false)}
              targetDeckHint={libraryTargetDeckHint}
            />
          </div>
        </div>
      )}

      {/* 6. MODAL INTERACTIVO DE CONFIRMACIÓN Y CATEGORÍA PARA GUARDAR EN BIBLIOTECA */}
      <SaveToLibraryModal
        isOpen={isSaveLibraryModalOpen}
        onClose={() => {
          setIsSaveLibraryModalOpen(false);
          setSaveLibraryTrackData(null);
        }}
        trackData={saveLibraryTrackData}
        onSuccess={handleSaveLibrarySuccess}
        showFeedback={showFeedback}
      />
    </div>
  );
}
