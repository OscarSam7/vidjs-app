"use client";

import { useState, useEffect } from "react";
import { djSoundEffects } from "@/lib/audio/dj-audio-engine";
import { Volume2, Mic, Disc3, ChevronDown, ChevronUp } from "lucide-react";

interface SoundPad {
  id: string;
  name: string;
  label: string;
  color: string;
  borderActive: string;
  icon: string;
  action: () => void;
}

interface DjSoundboardProps {
  mode?: "DJ" | "KARAOKE";
}

export default function DjSoundboard({ mode = "DJ" }: DjSoundboardProps) {
  const [activeTab, setActiveTab] = useState<"DJ" | "KARAOKE">(mode);
  const [activePad, setActivePad] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    setActiveTab(mode);
  }, [mode]);

  const triggerSound = (id: string, playFn: () => void) => {
    setActivePad(id);
    try {
      playFn();
    } catch (err) {
      console.warn("Audio playback not allowed or failed:", err);
    }
    setTimeout(() => {
      setActivePad((curr) => (curr === id ? null : curr));
    }, 400);
  };

  // 10 Efectos Sintetizados para DJ Club
  const djPads: SoundPad[] = [
    {
      id: "airhorn",
      name: "Airhorn",
      label: "Bocina",
      color: "from-amber-500/20 to-red-600/25 text-amber-300 border-amber-500/40",
      borderActive: "border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.6)] scale-95",
      icon: "📢",
      action: () => djSoundEffects.playAirhorn(),
    },
    {
      id: "scratch",
      name: "Spinback",
      label: "Vinilo",
      color: "from-purple-500/20 to-pink-600/25 text-purple-300 border-purple-500/40",
      borderActive: "border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.6)] scale-95",
      icon: "🎛️",
      action: () => djSoundEffects.playVinylSpinback(),
    },
    {
      id: "bassdrop",
      name: "Bass Drop",
      label: "Sub 808",
      color: "from-cyan-500/20 to-blue-600/25 text-cyan-300 border-cyan-500/40",
      borderActive: "border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)] scale-95",
      icon: "🔊",
      action: () => djSoundEffects.playBassDrop(),
    },
    {
      id: "laser",
      name: "Láser EDM",
      label: "Zap",
      color: "from-emerald-500/20 to-lime-600/25 text-emerald-300 border-emerald-500/40",
      borderActive: "border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.6)] scale-95",
      icon: "⚡",
      action: () => djSoundEffects.playLaser(),
    },
    {
      id: "siren",
      name: "Sirena Rave",
      label: "Alarma",
      color: "from-red-500/20 to-rose-600/25 text-red-300 border-red-500/40",
      borderActive: "border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.6)] scale-95",
      icon: "🚨",
      action: () => djSoundEffects.playSiren(),
    },
    {
      id: "riser",
      name: "Riser FX",
      label: "Subida",
      color: "from-indigo-500/20 to-violet-600/25 text-indigo-300 border-indigo-500/40",
      borderActive: "border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.6)] scale-95",
      icon: "🚀",
      action: () => djSoundEffects.playRiser(),
    },
    {
      id: "impact",
      name: "Impacto",
      label: "Boom",
      color: "from-orange-500/20 to-amber-600/25 text-orange-300 border-orange-500/40",
      borderActive: "border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.6)] scale-95",
      icon: "💥",
      action: () => djSoundEffects.playImpact(),
    },
    {
      id: "crowd",
      name: "Grito Hype",
      label: "¡Hey!",
      color: "from-fuchsia-500/20 to-pink-600/25 text-fuchsia-300 border-fuchsia-500/40",
      borderActive: "border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.6)] scale-95",
      icon: "🗣️",
      action: () => djSoundEffects.playCrowdCheer(),
    },
    {
      id: "brake",
      name: "Freno",
      label: "Parada",
      color: "from-zinc-500/20 to-slate-600/25 text-zinc-300 border-zinc-500/40",
      borderActive: "border-zinc-300 shadow-[0_0_15px_rgba(161,161,170,0.6)] scale-95",
      icon: "🛑",
      action: () => djSoundEffects.playVinylBrake(),
    },
    {
      id: "clap",
      name: "Claps",
      label: "Palmas",
      color: "from-teal-500/20 to-emerald-600/25 text-teal-300 border-teal-500/40",
      borderActive: "border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.6)] scale-95",
      icon: "👏",
      action: () => djSoundEffects.playClap(),
    },
  ];

  // 10 Efectos Sintetizados para Karaoke Stage / KJ
  const karaokePads: SoundPad[] = [
    {
      id: "chime",
      name: "Escenario",
      label: "Llamado",
      color: "from-cyan-500/20 to-blue-600/25 text-cyan-300 border-cyan-500/40",
      borderActive: "border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)] scale-95",
      icon: "🔔",
      action: () => djSoundEffects.playStageChime(),
    },
    {
      id: "ovation",
      name: "Ovación",
      label: "Vítores",
      color: "from-pink-500/20 to-rose-600/25 text-pink-300 border-pink-500/40",
      borderActive: "border-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.6)] scale-95",
      icon: "🎉",
      action: () => djSoundEffects.playOvation(),
    },
    {
      id: "drumroll",
      name: "Redoble",
      label: "Tambores",
      color: "from-amber-500/20 to-orange-600/25 text-amber-300 border-amber-500/40",
      borderActive: "border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.6)] scale-95",
      icon: "🥁",
      action: () => djSoundEffects.playDrumroll(),
    },
    {
      id: "failhorn",
      name: "Pifia",
      label: "Humor",
      color: "from-rose-500/20 to-red-600/25 text-rose-300 border-rose-500/40",
      borderActive: "border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.6)] scale-95",
      icon: "🎺",
      action: () => djSoundEffects.playFailHorn(),
    },
    {
      id: "kclap",
      name: "Aplausos",
      label: "Público",
      color: "from-emerald-500/20 to-teal-600/25 text-emerald-300 border-emerald-500/40",
      borderActive: "border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.6)] scale-95",
      icon: "👏",
      action: () => djSoundEffects.playClap(),
    },
    {
      id: "fanfare",
      name: "Fanfarria",
      label: "Victoria",
      color: "from-yellow-500/20 to-amber-600/25 text-yellow-300 border-yellow-500/40",
      borderActive: "border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.6)] scale-95",
      icon: "🏆",
      action: () => djSoundEffects.playFanfare(),
    },
    {
      id: "miccheck",
      name: "Mic Check",
      label: "Test Ping",
      color: "from-sky-500/20 to-blue-600/25 text-sky-300 border-sky-500/40",
      borderActive: "border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.6)] scale-95",
      icon: "🎙️",
      action: () => djSoundEffects.playMicCheck(),
    },
    {
      id: "suspense",
      name: "Suspenso",
      label: "Tensión",
      color: "from-purple-500/20 to-indigo-600/25 text-purple-300 border-purple-500/40",
      borderActive: "border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.6)] scale-95",
      icon: "⏳",
      action: () => djSoundEffects.playSuspense(),
    },
    {
      id: "gong",
      name: "Gong",
      label: "Remate",
      color: "from-orange-500/20 to-red-600/25 text-orange-300 border-orange-500/40",
      borderActive: "border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.6)] scale-95",
      icon: "🛎️",
      action: () => djSoundEffects.playGong(),
    },
    {
      id: "countdown",
      name: "Conteo 3-2-1",
      label: "¡Cantar!",
      color: "from-lime-500/20 to-emerald-600/25 text-lime-300 border-lime-500/40",
      borderActive: "border-lime-400 shadow-[0_0_15px_rgba(132,204,22,0.6)] scale-95",
      icon: "⏱️",
      action: () => djSoundEffects.playCountdown(),
    },
  ];

  const currentPads = activeTab === "KARAOKE" ? karaokePads : djPads;

  return (
    <div className="py-2 px-2.5 sm:px-3 rounded-xl bg-zinc-950/90 border border-zinc-800/80 w-full max-w-full overflow-hidden shadow-sm">
      {/* Barra de cabecera ultra compacta */}
      <div className="flex items-center justify-between gap-2 text-left">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={`p-1 rounded-md shrink-0 ${
              activeTab === "KARAOKE"
                ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                : "bg-purple-950 text-purple-300 border border-purple-800"
            }`}
          >
            <Volume2 className="w-3 h-3" />
          </div>
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-300 truncate">
            {activeTab === "KARAOKE"
              ? "🎤 KJ Stage FX (10 Pads)"
              : "🎧 DJ Launchpad FX (10 Pads)"}
          </span>
          <span className="text-[9px] font-mono text-zinc-500 hidden lg:inline">
            • 0ms Web Audio
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Selector de modo DJ vs Karaoke */}
          <div className="flex items-center p-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-bold">
            <button
              onClick={() => setActiveTab("DJ")}
              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === "DJ"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Cambiar a Launchpad DJ"
            >
              <Disc3 className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">DJ Club</span>
            </button>
            <button
              onClick={() => setActiveTab("KARAOKE")}
              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === "KARAOKE"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Cambiar a Soundboard Karaoke"
            >
              <Mic className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">Karaoke Stage</span>
            </button>
          </div>

          {/* Botón para colapsar/expandir sin desplazar la pantalla */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            title={isCollapsed ? "Expandir pads de efectos" : "Minimizar pads de efectos"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Grid de 10 Pads Ultra Compactos: En desktop entran los 10 en 1 sola fila sin desplazar */}
      {!isCollapsed && (
        <div className="grid grid-cols-5 md:grid-cols-10 gap-1 sm:gap-1.5 mt-2">
          {currentPads.map((pad) => {
            const isActive = activePad === pad.id;
            return (
              <button
                key={pad.id}
                onClick={() => triggerSound(pad.id, pad.action)}
                className={`h-11 sm:h-12 py-1 px-1 rounded-lg border bg-gradient-to-b transition-all duration-150 flex flex-col items-center justify-center gap-0.5 cursor-pointer select-none group relative overflow-hidden shrink-0 ${
                  pad.color
                } ${isActive ? pad.borderActive : "hover:border-zinc-500 hover:brightness-110 active:scale-95"}`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
                )}
                <span className="text-[13px] sm:text-sm group-hover:scale-110 transition-transform leading-none">
                  {pad.icon}
                </span>
                <div className="text-center w-full min-w-0">
                  <div className="text-[10px] sm:text-[11px] font-black tracking-tight text-white truncate leading-tight">
                    {pad.name}
                  </div>
                  <div className="text-[8px] font-mono text-zinc-400 font-bold uppercase truncate leading-none">
                    {pad.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
