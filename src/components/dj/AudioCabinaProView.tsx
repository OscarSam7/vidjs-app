"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Disc,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  Zap,
  Maximize2,
  Minimize2,
  Search,
  ListMusic,
  Plus,
  Trash2,
  Shuffle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Flame,
  CheckCircle2,
  Radio,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
} from "lucide-react";
import { ZynkoLogo } from "@/components/ui/ZynkoLogo";
import { calculateCrossfaderGains } from "@/lib/audio/dj-audio-engine";

export interface CabinaTrack {
  id: string;
  title: string;
  artist: string;
  durationSeconds: number;
  videoId?: string;
  thumbnailUrl?: string;
}

// Playlists precargadas listas para usar en cabina de bar / discoteca
const PRESET_PLAYLISTS: Record<string, { name: string; genre: string; tracks: CabinaTrack[] }> = {
  reggaeton: {
    name: "Fiesta Urbana & Reggaeton",
    genre: "Reggaeton / Trap Latino",
    tracks: [
      { id: "reg-1", title: "Danza Kuduro", artist: "Don Omar, Lucenzo", durationSeconds: 198, videoId: "7zp1TbLFPp8" },
      { id: "reg-2", title: "Gasolina", artist: "Daddy Yankee", durationSeconds: 193, videoId: "CCF1_jI8Prk" },
      { id: "reg-3", title: "Pepas", artist: "Farruko", durationSeconds: 287, videoId: "y8trd3gkTW0" },
      { id: "reg-4", title: "Tití Me Preguntó", artist: "Bad Bunny", durationSeconds: 243, videoId: "Cr8K88UcO08" },
      { id: "reg-5", title: "La Bachata", artist: "Manuel Turizo", durationSeconds: 162, videoId: "TiM_TFpT_DE" },
    ],
  },
  electro: {
    name: "Club & Tech-House Pista",
    genre: "Electronic / House",
    tracks: [
      { id: "ele-1", title: "One More Time", artist: "Daft Punk", durationSeconds: 320, videoId: "FGBhQbmPwH8" },
      { id: "ele-2", title: "Levels", artist: "Avicii", durationSeconds: 202, videoId: "_ovdm2yX4MA" },
      { id: "ele-3", title: "Satisfaction", artist: "Benny Benassi", durationSeconds: 144, videoId: "V5bYDhZBFLA" },
      { id: "ele-4", title: "Titanium", artist: "David Guetta ft. Sia", durationSeconds: 245, videoId: "JRfuAukYTKg" },
      { id: "ele-5", title: "Ferrari", artist: "James Hype", durationSeconds: 186, videoId: "bO28o81yYvE" },
    ],
  },
  retro: {
    name: "Retro 80s & 90s Bailable",
    genre: "80s / 90s Classics",
    tracks: [
      { id: "ret-1", title: "Stayin' Alive", artist: "Bee Gees", durationSeconds: 250, videoId: "fNFzfwLM72c" },
      { id: "ret-2", title: "Billie Jean", artist: "Michael Jackson", durationSeconds: 294, videoId: "Zi_XLOBDo_Y" },
      { id: "ret-3", title: "Sweet Child O' Mine", artist: "Guns N' Roses", durationSeconds: 303, videoId: "1w7OgIMMRc4" },
      { id: "ret-4", title: "I Wanna Dance with Somebody", artist: "Whitney Houston", durationSeconds: 312, videoId: "eH3giaIzONA" },
    ],
  },
};

export default function AudioCabinaProView() {
  // ==========================================
  // ESTADO DE SUSCRIPCIÓN & LICENCIA
  // ==========================================
  const [isSubscribed, setIsSubscribed] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // ==========================================
  // PANTALLA COMPLETA
  // ==========================================
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // ==========================================
  // MASTER AUDIO & CROSSFADER
  // ==========================================
  const [masterVolume, setMasterVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  // Crossfader: -100 (Full A) a +100 (Full B)
  const [crossfader, setCrossfader] = useState(-100);
  const crossfaderRef = useRef(crossfader);
  crossfaderRef.current = crossfader;

  // ==========================================
  // AUTO-DJ ENGINE STATE
  // ==========================================
  const [autoDjActive, setAutoDjActive] = useState(true);
  const [autoDjFadeDurationSec, setAutoDjFadeDurationSec] = useState<number>(8); // 4, 8, 12, 16s
  const [autoDjNextTransitionIn, setAutoDjNextTransitionIn] = useState<number | null>(null);
  const isTransitioningRef = useRef(false);

  // ==========================================
  // DECK A STATE
  // ==========================================
  const [trackA, setTrackA] = useState<CabinaTrack | null>(PRESET_PLAYLISTS.reggaeton.tracks[0]);
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [currentTimeA, setCurrentTimeA] = useState(0);
  const [durationA, setDurationA] = useState(trackA?.durationSeconds || 198);
  const [eqHighA, setEqHighA] = useState(0);
  const [eqMidA, setEqMidA] = useState(0);
  const [eqLowA, setEqLowA] = useState(0);
  const [pitchA, setPitchA] = useState(0);
  const iframeRefA = useRef<HTMLIFrameElement | null>(null);

  // ==========================================
  // DECK B STATE
  // ==========================================
  const [trackB, setTrackB] = useState<CabinaTrack | null>(PRESET_PLAYLISTS.reggaeton.tracks[1]);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [currentTimeB, setCurrentTimeB] = useState(0);
  const [durationB, setDurationB] = useState(trackB?.durationSeconds || 193);
  const [eqHighB, setEqHighB] = useState(0);
  const [eqMidB, setEqMidB] = useState(0);
  const [eqLowB, setEqLowB] = useState(0);
  const [pitchB, setPitchB] = useState(0);
  const iframeRefB = useRef<HTMLIFrameElement | null>(null);

  // ==========================================
  // COLA Y PLAYLIST
  // ==========================================
  const [queue, setQueue] = useState<CabinaTrack[]>(PRESET_PLAYLISTS.reggaeton.tracks.slice(2));
  const [activeTab, setActiveTab] = useState<"QUEUE" | "SEARCH" | "PRESETS">("QUEUE");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isBottomDrawerOpen, setIsBottomDrawerOpen] = useState(false);

  // Helper para enviar comandos postMessage a los iframes de YouTube
  const sendYoutubeCommand = (iframe: HTMLIFrameElement | null, command: string, args: any[] = []) => {
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: command, args }), "*");
    } catch {}
  };

  // ==========================================
  // ANIMADOR DEL CROSSFADER SUAVE (EQUAL POWER)
  // ==========================================
  const crossfaderAnimRef = useRef<NodeJS.Timeout | null>(null);
  const animateCrossfader = useCallback((target: number, durationMs = 3000, onComplete?: () => void) => {
    if (crossfaderAnimRef.current) clearInterval(crossfaderAnimRef.current);
    const startVal = crossfaderRef.current;
    if (startVal === target) {
      if (onComplete) onComplete();
      return;
    }

    const steps = 60;
    const intervalMs = durationMs / steps;
    const diff = target - startVal;
    let currentStep = 0;

    crossfaderAnimRef.current = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      // Curva easeInOutQuad para mezcla orgánica de DJ
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const nextVal = Math.round(startVal + diff * ease);

      setCrossfader(nextVal);
      crossfaderRef.current = nextVal;

      if (currentStep >= steps) {
        if (crossfaderAnimRef.current) clearInterval(crossfaderAnimRef.current);
        setCrossfader(target);
        crossfaderRef.current = target;
        if (onComplete) onComplete();
      }
    }, intervalMs);
  }, []);

  // ==========================================
  // CONTROL DE TRANSPORTE DECK A
  // ==========================================
  const playDeckA = useCallback(() => {
    setIsPlayingA(true);
    sendYoutubeCommand(iframeRefA.current, "playVideo");
  }, []);

  const pauseDeckA = useCallback(() => {
    setIsPlayingA(false);
    sendYoutubeCommand(iframeRefA.current, "pauseVideo");
  }, []);

  const cueDeckA = useCallback(() => {
    pauseDeckA();
    setCurrentTimeA(0);
    sendYoutubeCommand(iframeRefA.current, "seekTo", [0, true]);
  }, [pauseDeckA]);

  // ==========================================
  // CONTROL DE TRANSPORTE DECK B
  // ==========================================
  const playDeckB = useCallback(() => {
    setIsPlayingB(true);
    sendYoutubeCommand(iframeRefB.current, "playVideo");
  }, []);

  const pauseDeckB = useCallback(() => {
    setIsPlayingB(false);
    sendYoutubeCommand(iframeRefB.current, "pauseVideo");
  }, []);

  const cueDeckB = useCallback(() => {
    pauseDeckB();
    setCurrentTimeB(0);
    sendYoutubeCommand(iframeRefB.current, "seekTo", [0, true]);
  }, [pauseDeckB]);

  // ==========================================
  // DISPATCH DE TRANSICIÓN AUTO-DJ PING-PONG
  // ==========================================
  const triggerAutoTransitionTo = useCallback(
    (targetDeck: "A" | "B") => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;

      const durationMs = autoDjFadeDurationSec * 1000;

      if (targetDeck === "B") {
        // Pasar de A hacia B
        playDeckB();
        animateCrossfader(100, durationMs, () => {
          pauseDeckA();
          isTransitioningRef.current = false;
          // Cargar el siguiente tema de la cola en Deck A en modo espera
          setQueue((prevQueue) => {
            if (prevQueue.length > 0) {
              const nextTrack = prevQueue[0];
              setTrackA(nextTrack);
              setCurrentTimeA(0);
              setDurationA(nextTrack.durationSeconds || 180);
              return prevQueue.slice(1);
            }
            return prevQueue;
          });
        });
      } else {
        // Pasar de B hacia A
        playDeckA();
        animateCrossfader(-100, durationMs, () => {
          pauseDeckB();
          isTransitioningRef.current = false;
          // Cargar el siguiente tema de la cola en Deck B en modo espera
          setQueue((prevQueue) => {
            if (prevQueue.length > 0) {
              const nextTrack = prevQueue[0];
              setTrackB(nextTrack);
              setCurrentTimeB(0);
              setDurationB(nextTrack.durationSeconds || 180);
              return prevQueue.slice(1);
            }
            return prevQueue;
          });
        });
      }
    },
    [autoDjFadeDurationSec, playDeckA, pauseDeckA, playDeckB, pauseDeckB, animateCrossfader]
  );

  // ==========================================
  // RELOJ / TICKER AUTO-DJ DE REPRODUCCIÓN
  // ==========================================
  useEffect(() => {
    const timer = setInterval(() => {
      // Simular avance de tiempo para la bandeja al aire
      if (isPlayingA) {
        setCurrentTimeA((prev) => {
          const next = prev + 1;
          const remaining = durationA - next;

          if (autoDjActive && !isTransitioningRef.current) {
            setAutoDjNextTransitionIn(Math.max(0, remaining - autoDjFadeDurationSec));
            if (remaining <= autoDjFadeDurationSec && trackB) {
              triggerAutoTransitionTo("B");
            }
          }
          if (next >= durationA) {
            pauseDeckA();
            return durationA;
          }
          return next;
        });
      }

      if (isPlayingB) {
        setCurrentTimeB((prev) => {
          const next = prev + 1;
          const remaining = durationB - next;

          if (autoDjActive && !isTransitioningRef.current) {
            setAutoDjNextTransitionIn(Math.max(0, remaining - autoDjFadeDurationSec));
            if (remaining <= autoDjFadeDurationSec && trackA) {
              triggerAutoTransitionTo("A");
            }
          }
          if (next >= durationB) {
            pauseDeckB();
            return durationB;
          }
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlayingA, isPlayingB, durationA, durationB, autoDjActive, autoDjFadeDurationSec, trackA, trackB, pauseDeckA, pauseDeckB, triggerAutoTransitionTo]);

  // ==========================================
  // BÚSQUEDA Y ADICIÓN DE CANCIONES
  // ==========================================
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/v1/karaoke/search?q=${encodeURIComponent(searchQuery)}&isKaraoke=false`);
      const data = await res.json();
      if (data.success && data.data?.results) {
        setSearchResults(data.data.results);
      }
    } catch {
    } finally {
      setIsSearching(false);
    }
  };

  const addSearchResultToQueue = (item: any) => {
    const newTrack: CabinaTrack = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      title: item.title,
      artist: item.channelTitle || "Cabina Pro",
      durationSeconds: 210,
      videoId: item.id,
      thumbnailUrl: item.thumbnail,
    };
    setQueue((prev) => [...prev, newTrack]);
    setActiveTab("QUEUE");
  };

  const loadPresetPlaylist = (key: string) => {
    const preset = PRESET_PLAYLISTS[key];
    if (!preset) return;
    if (preset.tracks.length >= 2) {
      setTrackA(preset.tracks[0]);
      setTrackB(preset.tracks[1]);
      setQueue(preset.tracks.slice(2));
      setCurrentTimeA(0);
      setCurrentTimeB(0);
      setDurationA(preset.tracks[0].durationSeconds);
      setDurationB(preset.tracks[1].durationSeconds);
    }
    setActiveTab("QUEUE");
  };

  // Cálculo de ganancias de mezcla
  const gains = calculateCrossfaderGains(crossfader);
  const volMultiplierA = isMuted ? 0 : (masterVolume / 100) * gains.gainA;
  const volMultiplierB = isMuted ? 0 : (masterVolume / 100) * gains.gainB;

  // Formateador de tiempo MM:SS
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07090e] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* ========================================================= */}
      {/* HEADER SUPERIOR COMPACTO (ZYNKO COCKPIT CABINA AUDIO PRO) */}
      {/* ========================================================= */}
      <header className="h-14 px-4 bg-zinc-950/90 border-b border-zinc-800/80 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/dj" className="hover:opacity-80 transition-opacity">
            <ZynkoLogo size="xs" />
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-[10px] font-black text-fuchsia-400">
            <Radio className="w-3 h-3 animate-pulse text-fuchsia-400" />
            <span>CABINA AUDIO PRO</span>
          </div>
          <span className="text-[10px] text-zinc-500 hidden md:inline">Cockpit Dual-Deck con Auto-Crossfade</span>
        </div>

        {/* Panel Central: SWITCH AUTO-DJ & TIMING */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoDjActive((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md ${
              autoDjActive
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-black border border-emerald-300 shadow-emerald-500/30 ring-2 ring-emerald-400/30"
                : "bg-zinc-900 text-zinc-400 border border-zinc-700 hover:text-white"
            }`}
            title="Activa o desactiva la auto-reproducción continua y mezcla automática de temas"
          >
            <Zap className={`w-3.5 h-3.5 ${autoDjActive ? "animate-bounce" : ""}`} />
            <span>{autoDjActive ? "⚡ AUTO-DJ: ACTIVO" : "MANUAL DJ"}</span>
          </button>

          {/* Selector de Segundos de Fade */}
          <div className="hidden lg:flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-[10px] font-bold">
            <span className="text-zinc-500 px-1">FADE:</span>
            {[4, 8, 12, 16].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setAutoDjFadeDurationSec(sec)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  autoDjFadeDurationSec === sec ? "bg-fuchsia-600 text-white font-black" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          {autoDjActive && autoDjNextTransitionIn !== null && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900/90 border border-zinc-700/60 text-[10px] font-mono text-amber-300">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Cambio en {formatTime(autoDjNextTransitionIn)}</span>
            </div>
          )}
        </div>

        {/* Acciones Rápidas Derecha */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBottomDrawerOpen((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
              isBottomDrawerOpen
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cola ({queue.length})</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
            title="Pantalla Completa"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <Link
            href="/dashboard/dj"
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold transition-all"
          >
            Salir
          </Link>
        </div>
      </header>

      {/* ========================================================= */}
      {/* COCKPIT CENTRAL DUAL-DECK (SIN SCROLL / 100% PANTALLA)    */}
      {/* ========================================================= */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_280px_1fr] xl:grid-cols-[1fr_320px_1fr] gap-2 p-2 sm:p-3 overflow-hidden">
        {/* ======================================================= */}
        {/* BANDEJA A (DECK A - VIOLETA NEÓN / FUCSIA)             */}
        {/* ======================================================= */}
        <section
          className={`rounded-2xl border transition-all flex flex-col justify-between p-3 relative overflow-hidden ${
            crossfader < 0
              ? "bg-gradient-to-b from-[#150a24] to-[#0c0517] border-fuchsia-500/60 shadow-[0_0_25px_rgba(224,36,195,0.15)] ring-1 ring-fuchsia-500/30"
              : "bg-zinc-950/70 border-zinc-800/80"
          }`}
        >
          {/* Header Deck A */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-fuchsia-500 text-black font-black text-xs tracking-wider">
                DECK A
              </span>
              {crossfader < 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[9px] font-black text-rose-400 animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  AL AIRE
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-fuchsia-300">
                {formatTime(currentTimeA)} / {formatTime(durationA)}
              </span>
            </div>
          </div>

          {/* Vinilo Deck A Animado */}
          <div className="my-auto flex flex-col items-center justify-center relative py-2">
            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 relative flex items-center justify-center shadow-2xl transition-transform ${
                isPlayingA ? "animate-spin [animation-duration:3s]" : ""
              } ${
                crossfader < 0
                  ? "border-fuchsia-500/80 shadow-[0_0_30px_rgba(224,36,195,0.3)] bg-gradient-to-tr from-black via-fuchsia-950/30 to-black"
                  : "border-zinc-800 bg-black"
              }`}
            >
              {/* Surcos concéntricos del vinilo */}
              <div className="absolute inset-2 rounded-full border border-fuchsia-500/20" />
              <div className="absolute inset-5 rounded-full border border-fuchsia-500/10" />
              <div className="absolute inset-9 rounded-full border border-fuchsia-500/20" />
              {/* Centro / Galleta del vinilo */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-fuchsia-600 to-indigo-600 border-2 border-fuchsia-300 flex items-center justify-center shadow-inner">
                <Disc className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Info de Canción */}
            <div className="mt-3 text-center max-w-xs px-2">
              <h3 className="text-sm sm:text-base font-black truncate text-white">
                {trackA ? trackA.title : "Bandeja Vacía"}
              </h3>
              <p className="text-xs text-zinc-400 truncate">{trackA ? trackA.artist : "Cargar tema desde la cola"}</p>
            </div>

            {/* Barra de Progreso */}
            <div className="w-full max-w-xs mt-2">
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-fuchsia-500 to-pink-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${durationA > 0 ? (currentTimeA / durationA) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Controles de Transporte Deck A */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/60 z-10">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={cueDeckA}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-xs font-black text-amber-300 active:scale-95 transition-all shadow-sm"
              >
                CUE
              </button>
              <button
                type="button"
                onClick={isPlayingA ? pauseDeckA : playDeckA}
                className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-md ${
                  isPlayingA
                    ? "bg-amber-500 text-black border border-amber-300 shadow-amber-500/20"
                    : "bg-fuchsia-600 hover:bg-fuchsia-500 text-white border border-fuchsia-400 shadow-fuchsia-600/30"
                }`}
              >
                {isPlayingA ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlayingA ? "PAUSA" : "PLAY"}</span>
              </button>
            </div>

            {/* EQ Rápido Deck A */}
            <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
              <div className="flex flex-col items-center">
                <span>HI</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={eqHighA}
                  onChange={(e) => setEqHighA(Number(e.target.value))}
                  className="w-12 h-1 accent-fuchsia-500 bg-zinc-800 cursor-pointer"
                />
              </div>
              <div className="flex flex-col items-center">
                <span>MID</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={eqMidA}
                  onChange={(e) => setEqMidA(Number(e.target.value))}
                  className="w-12 h-1 accent-fuchsia-500 bg-zinc-800 cursor-pointer"
                />
              </div>
              <div className="flex flex-col items-center">
                <span>LOW</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={eqLowA}
                  onChange={(e) => setEqLowA(Number(e.target.value))}
                  className="w-12 h-1 accent-fuchsia-500 bg-zinc-800 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Iframe invisible para audio de YouTube Deck A */}
          {trackA?.videoId && (
            <iframe
              ref={iframeRefA}
              src={`https://www.youtube.com/embed/${trackA.videoId}?enablejsapi=1&autoplay=0&controls=0&playsinline=1`}
              className="absolute -top-96 -left-96 w-1 h-1 pointer-events-none opacity-0"
              allow="autoplay"
            />
          )}
        </section>

        {/* ======================================================= */}
        {/* MEZCLADOR CENTRAL & AUTO-CROSSFADER MOTORIZADO          */}
        {/* ======================================================= */}
        <section className="rounded-2xl bg-zinc-950 border border-zinc-800/80 p-3 flex flex-col justify-between items-center shadow-xl relative overflow-hidden">
          {/* Master Volume Superior */}
          <div className="w-full flex flex-col items-center gap-1.5 pb-2 border-b border-zinc-800/80">
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-[10px] font-bold text-zinc-400">MASTER VOL</span>
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className={`p-1 rounded transition-colors ${isMuted ? "text-rose-400" : "text-zinc-400 hover:text-white"}`}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : masterVolume}
              onChange={(e) => {
                setMasterVolume(Number(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-full h-2 accent-amber-400 bg-zinc-800 rounded cursor-pointer"
            />
          </div>

          {/* Medidores LED Centrales (Vúmetros A y B) */}
          <div className="my-auto flex items-center justify-center gap-6 py-2">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-black text-fuchsia-400">CH-A</span>
              <div className="w-3 h-20 bg-black rounded p-0.5 border border-zinc-800 flex flex-col-reverse gap-0.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-full h-1.5 rounded-xs transition-colors ${
                      isPlayingA && volMultiplierA > (i / 8)
                        ? i > 6
                          ? "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]"
                          : i > 4
                          ? "bg-amber-400"
                          : "bg-fuchsia-500"
                        : "bg-zinc-800/30"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Logo ZYNKO Central */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900/90 border border-zinc-700/60 flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
              </div>
              <span className="text-[9px] font-black tracking-widest text-zinc-500 mt-2 uppercase">CROSSMIX</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-black text-cyan-400">CH-B</span>
              <div className="w-3 h-20 bg-black rounded p-0.5 border border-zinc-800 flex flex-col-reverse gap-0.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-full h-1.5 rounded-xs transition-colors ${
                      isPlayingB && volMultiplierB > (i / 8)
                        ? i > 6
                          ? "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]"
                          : i > 4
                          ? "bg-amber-400"
                          : "bg-cyan-500"
                        : "bg-zinc-800/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* CROSSFADER PRO MOTORIZADO */}
          <div className="w-full flex flex-col items-center gap-2 pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between w-full px-1 text-[10px] font-mono font-bold">
              <span className={crossfader <= -10 ? "text-fuchsia-400 font-black" : "text-zinc-500"}>
                DECK A {crossfader <= 0 ? "100%" : `${Math.max(0, 100 - crossfader)}%`}
              </span>
              <span className="text-zinc-400">
                {crossfader === 0 ? "CENTRO 50/50" : crossfader < 0 ? `◀ A ${Math.abs(crossfader)}%` : `B ${crossfader}% ▶`}
              </span>
              <span className={crossfader >= 10 ? "text-cyan-400 font-black" : "text-zinc-500"}>
                DECK B {crossfader >= 0 ? "100%" : `${Math.max(0, 100 + crossfader)}%`}
              </span>
            </div>

            {/* Pista física del Fader */}
            <div className="w-full relative px-2">
              <input
                type="range"
                min="-100"
                max="100"
                value={crossfader}
                onChange={(e) => setCrossfader(Number(e.target.value))}
                className="w-full h-4 bg-black rounded-lg border border-zinc-800 accent-fuchsia-500 cursor-pointer"
              />
            </div>

            {/* Botones de Auto-Mezcla Directos */}
            <div className="flex items-center justify-center gap-1.5 w-full pt-1">
              <button
                type="button"
                onClick={() => animateCrossfader(-100, 1200)}
                className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-fuchsia-500 text-[10px] font-bold text-fuchsia-300"
                title="Transición suave a Deck A"
              >
                ◀ Fade A
              </button>
              <button
                type="button"
                onClick={() => animateCrossfader(0, 800)}
                className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-amber-500 text-[10px] font-bold text-amber-300"
                title="Centrar Crossfader (Ambas al 100%)"
              >
                50 / 50
              </button>
              <button
                type="button"
                onClick={() => animateCrossfader(100, 1200)}
                className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-cyan-500 text-[10px] font-bold text-cyan-300"
                title="Transición suave a Deck B"
              >
                Fade B ▶
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================= */}
        {/* BANDEJA B (DECK B - CYAN ELÉCTRICO / NEÓN)              */}
        {/* ======================================================= */}
        <section
          className={`rounded-2xl border transition-all flex flex-col justify-between p-3 relative overflow-hidden ${
            crossfader > 0
              ? "bg-gradient-to-b from-[#081724] to-[#040d17] border-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30"
              : "bg-zinc-950/70 border-zinc-800/80"
          }`}
        >
          {/* Header Deck B */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-400 text-black font-black text-xs tracking-wider">
                DECK B
              </span>
              {crossfader > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[9px] font-black text-cyan-400 animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  AL AIRE
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-cyan-300">
                {formatTime(currentTimeB)} / {formatTime(durationB)}
              </span>
            </div>
          </div>

          {/* Vinilo Deck B Animado */}
          <div className="my-auto flex flex-col items-center justify-center relative py-2">
            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 relative flex items-center justify-center shadow-2xl transition-transform ${
                isPlayingB ? "animate-spin [animation-duration:3s]" : ""
              } ${
                crossfader > 0
                  ? "border-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.3)] bg-gradient-to-tr from-black via-cyan-950/30 to-black"
                  : "border-zinc-800 bg-black"
              }`}
            >
              {/* Surcos concéntricos del vinilo */}
              <div className="absolute inset-2 rounded-full border border-cyan-500/20" />
              <div className="absolute inset-5 rounded-full border border-cyan-500/10" />
              <div className="absolute inset-9 rounded-full border border-cyan-500/20" />
              {/* Centro / Galleta del vinilo */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-600 border-2 border-cyan-300 flex items-center justify-center shadow-inner">
                <Disc className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Info de Canción */}
            <div className="mt-3 text-center max-w-xs px-2">
              <h3 className="text-sm sm:text-base font-black truncate text-white">
                {trackB ? trackB.title : "Bandeja Vacía"}
              </h3>
              <p className="text-xs text-zinc-400 truncate">{trackB ? trackB.artist : "Cargar tema desde la cola"}</p>
            </div>

            {/* Barra de Progreso */}
            <div className="w-full max-w-xs mt-2">
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-teal-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${durationB > 0 ? (currentTimeB / durationB) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Controles de Transporte Deck B */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/60 z-10">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={cueDeckB}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-xs font-black text-amber-300 active:scale-95 transition-all shadow-sm"
              >
                CUE
              </button>
              <button
                type="button"
                onClick={isPlayingB ? pauseDeckB : playDeckB}
                className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-md ${
                  isPlayingB
                    ? "bg-amber-500 text-black border border-amber-300 shadow-amber-500/20"
                    : "bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400 shadow-cyan-600/30"
                }`}
              >
                {isPlayingB ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlayingB ? "PAUSA" : "PLAY"}</span>
              </button>
            </div>

            {/* EQ Rápido Deck B */}
            <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
              <div className="flex flex-col items-center">
                <span>HI</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={eqHighB}
                  onChange={(e) => setEqHighB(Number(e.target.value))}
                  className="w-12 h-1 accent-cyan-400 bg-zinc-800 cursor-pointer"
                />
              </div>
              <div className="flex flex-col items-center">
                <span>MID</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={eqMidB}
                  onChange={(e) => setEqMidB(Number(e.target.value))}
                  className="w-12 h-1 accent-cyan-400 bg-zinc-800 cursor-pointer"
                />
              </div>
              <div className="flex flex-col items-center">
                <span>LOW</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={eqLowB}
                  onChange={(e) => setEqLowB(Number(e.target.value))}
                  className="w-12 h-1 accent-cyan-400 bg-zinc-800 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Iframe invisible para audio de YouTube Deck B */}
          {trackB?.videoId && (
            <iframe
              ref={iframeRefB}
              src={`https://www.youtube.com/embed/${trackB.videoId}?enablejsapi=1&autoplay=0&controls=0&playsinline=1`}
              className="absolute -top-96 -left-96 w-1 h-1 pointer-events-none opacity-0"
              allow="autoplay"
            />
          )}
        </section>
      </main>

      {/* ========================================================= */}
      {/* DRAWER INFERIOR: COLA AUTO-PLAY & BÚSQUEDA RÁPIDA         */}
      {/* ========================================================= */}
      <footer
        className={`bg-zinc-950/95 border-t border-zinc-800 transition-all duration-300 z-40 flex flex-col ${
          isBottomDrawerOpen ? "h-64 sm:h-72" : "h-10"
        }`}
      >
        {/* Barra de Pestañas Inferiores */}
        <div className="h-10 px-4 flex items-center justify-between border-b border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("QUEUE");
                if (!isBottomDrawerOpen) setIsBottomDrawerOpen(true);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === "QUEUE"
                  ? "bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/40"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Cola Auto-Play ({queue.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("SEARCH");
                if (!isBottomDrawerOpen) setIsBottomDrawerOpen(true);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === "SEARCH"
                  ? "bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/40"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              + Buscar Canción
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("PRESETS");
                if (!isBottomDrawerOpen) setIsBottomDrawerOpen(true);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === "PRESETS"
                  ? "bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/40"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Playlists del Club
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsBottomDrawerOpen((prev) => !prev)}
            className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
          >
            {isBottomDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Contenido Expandible del Cajón */}
        {isBottomDrawerOpen && (
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            {/* TAB 1: COLA AUTO-PLAY */}
            {activeTab === "QUEUE" && (
              <div className="space-y-1.5">
                {queue.length === 0 ? (
                  <div className="text-center py-6 text-zinc-500 text-xs">
                    No hay canciones en cola. Usa el buscador o carga una playlist para mantener el Auto-DJ encendido.
                  </div>
                ) : (
                  queue.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition-all text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-center font-mono font-bold text-zinc-500">{index + 1}</span>
                        <div className="min-w-0">
                          <p className="font-bold truncate text-white">{item.title}</p>
                          <p className="text-[10px] text-zinc-400 truncate">{item.artist}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-zinc-400">{formatTime(item.durationSeconds)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTrackA(item);
                            setDurationA(item.durationSeconds);
                            setCurrentTimeA(0);
                            setQueue((prev) => prev.filter((_, idx) => idx !== index));
                          }}
                          className="px-2 py-0.5 rounded bg-fuchsia-950/60 border border-fuchsia-800/60 text-fuchsia-300 text-[10px] font-bold hover:bg-fuchsia-900"
                        >
                          A Deck A
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTrackB(item);
                            setDurationB(item.durationSeconds);
                            setCurrentTimeB(0);
                            setQueue((prev) => prev.filter((_, idx) => idx !== index));
                          }}
                          className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-[10px] font-bold hover:bg-cyan-900"
                        >
                          A Deck B
                        </button>
                        <button
                          type="button"
                          onClick={() => setQueue((prev) => prev.filter((_, idx) => idx !== index))}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: BUSCADOR DE CANCIONES */}
            {activeTab === "SEARCH" && (
              <div className="space-y-3">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por título o artista en YouTube..."
                      className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl font-bold text-xs text-white transition-all disabled:opacity-50"
                  >
                    {isSearching ? "Buscando..." : "Buscar"}
                  </button>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs hover:border-zinc-700"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold truncate text-white">{item.title}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{item.channelTitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addSearchResultToQueue(item)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-lg text-[10px] shrink-0"
                      >
                        + Cola
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: PLAYLISTS PRECONFIGURADAS */}
            {activeTab === "PRESETS" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(PRESET_PLAYLISTS).map(([key, list]) => (
                  <div
                    key={key}
                    className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-fuchsia-500/40 transition-all flex flex-col justify-between gap-3"
                  >
                    <div>
                      <h4 className="font-black text-sm text-white">{list.name}</h4>
                      <p className="text-[10px] text-zinc-400">{list.genre}</p>
                      <p className="text-[10px] text-fuchsia-400 mt-1 font-mono">{list.tracks.length} temas seleccionados</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadPresetPlaylist(key)}
                      className="w-full py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold text-xs hover:opacity-90 transition-opacity"
                    >
                      Cargar en Cabina
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </footer>

      {/* ========================================================= */}
      {/* MODAL DE SUSCRIPCIÓN (SI SE DESEA BLOQUEAR / ACTIVAR)      */}
      {/* ========================================================= */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-fuchsia-500/40 rounded-3xl p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowSubscriptionModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <ZynkoLogo size="md" subtitle="VENUES & ENTERTAINMENT OS" />
              <h3 className="text-xl font-black text-white mt-4">ZYNKO Audio Cabina Pro</h3>
              <p className="text-xs text-zinc-400 mt-2">
                Desbloquea las dos bandejas táctiles fijadas y el motor de auto-reproducción continua (Auto-DJ) sin pausas ni silencios.
              </p>
              <div className="my-6 p-4 rounded-2xl bg-fuchsia-950/20 border border-fuchsia-500/30 text-left space-y-2 text-xs">
                <div className="flex items-center gap-2 text-fuchsia-300">
                  <CheckCircle2 className="w-4 h-4 text-fuchsia-400 shrink-0" />
                  <span>Doble Deck profesional estático sin scroll</span>
                </div>
                <div className="flex items-center gap-2 text-fuchsia-300">
                  <CheckCircle2 className="w-4 h-4 text-fuchsia-400 shrink-0" />
                  <span>Motor Auto-DJ Ping-Pong continuo</span>
                </div>
                <div className="flex items-center gap-2 text-fuchsia-300">
                  <CheckCircle2 className="w-4 h-4 text-fuchsia-400 shrink-0" />
                  <span>Transición de Crossfader suave ecualizada</span>
                </div>
                <div className="flex items-center gap-2 text-fuchsia-300">
                  <CheckCircle2 className="w-4 h-4 text-fuchsia-400 shrink-0" />
                  <span>Playlists automáticas para toda la noche</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSubscriptionModal(false);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white font-black text-sm shadow-lg shadow-fuchsia-500/30 hover:opacity-90 transition-opacity"
              >
                Suscribirme a Audio Cabina Pro ($14.99 / mes)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
