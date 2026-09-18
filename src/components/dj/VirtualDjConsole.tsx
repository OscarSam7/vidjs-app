"use client";

import { useState, useEffect, useRef } from "react";
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
}

interface QueueEntryData {
  id: string;
  orderIndex: number;
  status: string;
  songRequest: SongRequestData;
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
  // ==================== DECK A STATE ====================
  const [isPlayingA, setIsPlayingA] = useState(true);
  const [playbackSecondsA, setPlaybackSecondsA] = useState(42);
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

  // ==================== DECK B STATE ====================
  const [selectedQueueIdB, setSelectedQueueIdB] = useState<string | null>(null);
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

  // ==================== AUTO-ENGANCHE / TRANSITION ENGINE ====================
  const [isEnganchando, setIsEnganchando] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState<4 | 8 | 16>(8); // beats (aprox 3s, 6s, 12s)
  const [transitionProgress, setTransitionProgress] = useState(0); // 0 a 100%
  const engancheIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== BEAT TICK ANIMATION & PHASE ====================
  const [beatPhase, setBeatPhase] = useState(1); // 1, 2, 3, 4

  // Determinar Track A
  const trackA = currentPlaying?.songRequest;
  const trackADuration = trackA?.song?.durationSeconds || 210;
  const baseBpmA = trackA?.song?.bpm || 124;
  const effectiveBpmA = Number((baseBpmA * (1 + pitchA / 100)).toFixed(1));

  // Determinar Track B (de la cola seleccionada o por defecto queue[0])
  const effectiveQueueEntryB = selectedQueueIdB
    ? queue.find((q) => q.id === selectedQueueIdB) || queue[0]
    : queue[0];
  const trackB = manualTrackB || effectiveQueueEntryB?.songRequest;
  const trackBDuration = trackB?.song?.durationSeconds || 210;
  const baseBpmB = trackB?.song?.bpm || 126;
  const effectiveBpmB = Number((baseBpmB * (1 + pitchB / 100)).toFixed(1));

  // Cálculo de ganancias de crossfader de potencia constante
  const crossfaderGains = calculateCrossfaderGains(crossfaderValue);

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

  // ==================== MOTOR DE AUTO-ENGANCHE ====================
  const handleStartAutoEnganche = () => {
    if (!trackB) {
      showFeedback("error", "No hay tema cargado en Deck B para enganchar");
      return;
    }
    if (isEnganchando) return;

    // 1. Iniciar Deck B si no está sonando y sincronizarlo
    setIsPlayingB(true);
    handleSyncDeckB();
    setIsEnganchando(true);
    setTransitionProgress(0);
    showFeedback("info", `⚡ Auto-Enganche iniciado (${transitionDuration} compases)`);

    // Duración total en milisegundos: 4 beats ~ 2.5s, 8 beats ~ 5s, 16 beats ~ 10s
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

      // Mover crossfader suavemente
      const currentVal = startXfader + (targetXfader - startXfader) * progressRatio;
      setCrossfaderValue(Math.round(currentVal));

      // BASS SWAP al 50% de la transición (Corte de bajo Deck A, entra bajo Deck B)
      if (progressRatio >= 0.5 && !bassKillA) {
        setBassKillA(true);
        setBassKillB(false);
      }

      // Culminación del enganche
      if (step >= totalSteps) {
        if (engancheIntervalRef.current) clearInterval(engancheIntervalRef.current);
        setIsEnganchando(false);
        setCrossfaderValue(100);
        setTransitionProgress(100);
        setIsPlayingA(false); // Detener Deck A
        djSoundEffects.playVinylBrake();

        // Notificar al servidor que el track de Deck B ahora está al aire
        const queueEntryId = effectiveQueueEntryB?.id;
        if (queueEntryId) {
          onPlayQueueEntry(queueEntryId).then(() => {
            showFeedback("success", `🎉 ¡Enganche completado! "${trackB.song?.title || trackB.customTitle}" al aire`);
            // Restablecer crossfader para la siguiente mezcla
            setTimeout(() => {
              setCrossfaderValue(0);
              setBassKillA(false);
              setBassKillB(false);
            }, 1000);
          });
        } else {
          showFeedback("success", `🎉 ¡Enganche completado con éxito!`);
        }
      }
    }, stepIntervalMs);
  };

  // Cancelar Enganche en curso
  const handleCancelEnganche = () => {
    if (engancheIntervalRef.current) clearInterval(engancheIntervalRef.current);
    setIsEnganchando(false);
    showFeedback("info", "Auto-Enganche cancelado");
  };

  // Corte directo (Hard Drop)
  const handleInstantDropCut = () => {
    if (!trackB) return;
    djSoundEffects.playScratch();
    setCrossfaderValue(100);
    setIsPlayingA(false);
    setIsPlayingB(true);
    const queueEntryId = effectiveQueueEntryB?.id;
    if (queueEntryId) {
      onPlayQueueEntry(queueEntryId).then(() => {
        showFeedback("success", `⚡ ¡Corte Directo! Tema en Deck B al aire`);
        setTimeout(() => setCrossfaderValue(0), 800);
      });
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
    djSoundEffects.playNudge();
    if (deck === "A") {
      setPlaybackSecondsA((prev) => Math.max(0, prev + dir * 0.2));
    } else {
      setPlaybackSecondsB((prev) => Math.max(0, prev + dir * 0.2));
    }
  };

  // CUE handler
  const handleCue = (deck: "A" | "B") => {
    djSoundEffects.playCueClick();
    if (deck === "A") {
      if (isPlayingA) {
        setIsPlayingA(false);
        setPlaybackSecondsA(cuePointA);
      } else {
        setCuePointA(playbackSecondsA);
        showFeedback("info", `Deck A CUE fijado en ${formatTime(playbackSecondsA)}`);
      }
    } else {
      if (isPlayingB) {
        setIsPlayingB(false);
        setPlaybackSecondsB(cuePointB);
      } else {
        setCuePointB(playbackSecondsB);
        showFeedback("info", `Deck B CUE fijado en ${formatTime(playbackSecondsB)}`);
      }
    }
  };

  // Hot Cue Jump
  const handleHotCue = (deck: "A" | "B", cueNum: number) => {
    djSoundEffects.playCueClick();
    if (deck === "A") {
      const targetTime = hotCuesA[cueNum] ?? 0;
      setPlaybackSecondsA(targetTime);
    } else {
      const targetTime = hotCuesB[cueNum] ?? 0;
      setPlaybackSecondsB(targetTime);
    }
  };

  // Loop toggle
  const handleToggleLoop = (deck: "A" | "B", beats: number) => {
    djSoundEffects.playCueClick();
    if (deck === "A") {
      setActiveLoopA(activeLoopA === beats ? null : beats);
    } else {
      setActiveLoopB(activeLoopB === beats ? null : beats);
    }
  };

  // Indicador de Beat Match (si ambos BPM están sincronizados en un margen de 0.3)
  const isBeatMatched = Math.abs(effectiveBpmA - effectiveBpmB) <= 0.3;

  return (
    <div className="space-y-4 select-none">
      {/* ========================================================================= */}
      {/* 1. DUAL BEAT-WAVEFORM & PHASE METER (BPM & BEAT MATCHING GRID)            */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl relative overflow-hidden">
        {/* Barra superior de métricas de fase */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-900 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <span className="font-bold text-purple-300">DECK A:</span>
            <span className="text-white font-black">{effectiveBpmA} BPM</span>
            <span className="text-[10px] text-zinc-500">({pitchA >= 0 ? `+${pitchA}` : pitchA}%)</span>
          </div>

          {/* Central Beat Alignment Indicator */}
          <div className="flex items-center gap-3">
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

          <div className="flex items-center gap-2">
            <span className="font-bold text-cyan-300">DECK B:</span>
            <span className="text-white font-black">{effectiveBpmB} BPM</span>
            <span className="text-[10px] text-zinc-500">({pitchB >= 0 ? `+${pitchB}` : pitchB}%)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
        </div>

        {/* Formas de Onda Duales Estilo VirtualDJ */}
        <div className="grid grid-cols-2 gap-2 relative">
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
        <div className="lg:col-span-5 p-5 rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-purple-950/30 border-2 border-purple-500/40 shadow-2xl flex flex-col justify-between space-y-4 relative">
          {/* Header de Deck A */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-purple-600 text-white text-[10px] font-black tracking-widest uppercase shadow-md shadow-purple-600/30">
                DECK A &bull; CANAL 1
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                Al Aire
              </span>
            </div>
            {trackA?.table && (
              <span className="px-2 py-0.5 rounded bg-zinc-950 text-purple-300 border border-purple-500/30 text-xs font-bold">
                {trackA.table.label}
              </span>
            )}
          </div>

          {/* Información del Track A */}
          {trackA ? (
            <div className="space-y-1">
              <h3 className="text-base font-black text-white truncate">
                {trackA.song?.title || trackA.customTitle}
              </h3>
              <p className="text-xs font-semibold text-purple-300 truncate">
                {trackA.song?.artist?.name || trackA.customArtist}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-zinc-400">
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
            <div className="py-4 text-center text-zinc-500 text-xs">Sin tema en Deck A</div>
          )}

          {/* Platter / Jogwheel Deck A & Pitch Fader */}
          <div className="flex items-center justify-between gap-4 py-2">
            {/* Jogwheel Giratorio */}
            <div className="relative shrink-0 mx-auto">
              <div
                className={`w-36 h-36 rounded-full bg-black border-4 border-zinc-800 shadow-[0_0_25px_rgba(168,85,247,0.2)] flex items-center justify-center relative cursor-grab active:cursor-grabbing ${
                  isPlayingA ? "animate-spin [animation-duration:3s]" : ""
                }`}
                onClick={() => setIsPlayingA(!isPlayingA)}
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
              className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-400 text-xs font-black transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              CUE
            </button>
            <button
              onClick={() => setIsPlayingA(!isPlayingA)}
              className={`py-2.5 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
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
              className="py-2.5 rounded-xl bg-zinc-900 hover:bg-emerald-950 border border-zinc-700 hover:border-emerald-600 text-emerald-400 text-xs font-black transition-colors cursor-pointer shadow-sm active:scale-95"
              title="Sincronizar BPM de Deck A con Deck B"
            >
              SYNC
            </button>
          </div>
        </div>

        {/* ========================================== */}
        {/* MIXER CENTRAL & MOTOR DE ENGANCHE (Col 2)   */}
        {/* ========================================== */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between items-center text-center space-y-4">
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

          {/* ⚡ BOTÓN PRINCIPAL: AUTO-ENGANCHE AUTOMIX */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-[9px] font-bold text-zinc-500">
              <span>Compases:</span>
              <div className="flex gap-1">
                {[4, 8, 16].map((beats) => (
                  <button
                    key={beats}
                    onClick={() => setTransitionDuration(beats as any)}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                      transitionDuration === beats
                        ? "bg-purple-600 text-white"
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
                disabled={!trackB}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-lg shadow-purple-600/30 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5"
                title="Inicia la transición y mezcla suave de Deck A hacia Deck B"
              >
                <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                <span>AUTO-ENGANCHE</span>
              </button>
            )}

            <button
              onClick={handleInstantDropCut}
              disabled={!trackB}
              className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              title="Corte instantáneo al golpe hacia Deck B"
            >
              CORTE AL GOLPE (DROP)
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
        <div className="lg:col-span-5 p-5 rounded-2xl bg-gradient-to-bl from-zinc-950 via-zinc-900 to-cyan-950/30 border-2 border-cyan-500/40 shadow-2xl flex flex-col justify-between space-y-4 relative">
          {/* Header de Deck B con Selector de Pista */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-cyan-600 text-white text-[10px] font-black tracking-widest uppercase shadow-md shadow-cyan-600/30">
                DECK B &bull; CANAL 2
              </span>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                {isPlayingB ? "En Mezcla" : "Preparado"}
              </span>
              {trackB?.tipAmountCents && trackB.tipAmountCents > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] font-black">
                  ⭐ VIP
                </span>
              ) : null}
            </div>

            {/* Selector de Pista Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsSelectorOpenB(!isSelectorOpenB)}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-cyan-950/60 border border-zinc-800 hover:border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Cargar Pista</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isSelectorOpenB && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-2 z-50 space-y-1.5 max-h-60 overflow-y-auto">
                  <div className="text-[10px] font-black uppercase text-zinc-500 px-2 pt-1">
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
                          setSelectedQueueIdB(entry.id);
                          setManualTrackB(null);
                          setPlaybackSecondsB(0);
                          setIsSelectorOpenB(false);
                          showFeedback("success", `Cargado #${idx + 1} en Deck B`);
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-cyan-950/60 transition-colors flex items-center justify-between gap-2 border border-transparent hover:border-cyan-800 text-xs cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">
                            #{idx + 1} {entry.songRequest.song?.title || entry.songRequest.customTitle}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">
                            {entry.songRequest.table.label} &bull; {entry.songRequest.song?.bpm ? `${entry.songRequest.song.bpm} BPM` : "126 BPM"}
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

          {/* Información del Track B */}
          {trackB ? (
            <div className="space-y-1">
              <h3 className="text-base font-black text-white truncate">
                {trackB.song?.title || trackB.customTitle}
              </h3>
              <p className="text-xs font-semibold text-cyan-300 truncate">
                {trackB.song?.artist?.name || trackB.customArtist}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-zinc-400">
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
            <div className="py-4 text-center text-zinc-500 text-xs">
              Sin tema en Deck B. Acepta pedidos o carga manualmente.
            </div>
          )}

          {/* Platter / Jogwheel Deck B & Pitch Fader */}
          <div className="flex items-center justify-between gap-4 py-2">
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
                onClick={() => setIsPlayingB(!isPlayingB)}
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
              className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-400 text-xs font-black transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              CUE
            </button>
            <button
              onClick={() => setIsPlayingB(!isPlayingB)}
              className={`py-2.5 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
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
              className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 border ${
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
