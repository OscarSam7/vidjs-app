"use client";

import { useState, useEffect } from "react";
import { djSoundEffects } from "@/lib/audio/dj-audio-engine";
import { Volume2, Mic, Disc3 } from "lucide-react";

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
    }, 450);
  };

  const djPads: SoundPad[] = [
    {
      id: "airhorn",
      name: "Airhorn",
      label: "BOCINA DISCO",
      color: "from-amber-500/20 to-red-600/30 text-amber-300 border-amber-500/40",
      borderActive: "border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-95",
      icon: "📢",
      action: () => djSoundEffects.playAirhorn(),
    },
    {
      id: "scratch",
      name: "Scratch",
      label: "VINYL REWIND",
      color: "from-purple-500/20 to-pink-600/30 text-purple-300 border-purple-500/40",
      borderActive: "border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-95",
      icon: "🎛️",
      action: () => djSoundEffects.playScratch(),
    },
    {
      id: "bassdrop",
      name: "Bass Drop",
      label: "SUB BASS 808",
      color: "from-cyan-500/20 to-blue-600/30 text-cyan-300 border-cyan-500/40",
      borderActive: "border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-95",
      icon: "🔊",
      action: () => djSoundEffects.playBassDrop(),
    },
    {
      id: "clap",
      name: "Aplausos",
      label: "PARTY CLAPS",
      color: "from-emerald-500/20 to-teal-600/30 text-emerald-300 border-emerald-500/40",
      borderActive: "border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-95",
      icon: "👏",
      action: () => djSoundEffects.playClap(),
    },
  ];

  const karaokePads: SoundPad[] = [
    {
      id: "chime",
      name: "Campana",
      label: "AL ESCENARIO",
      color: "from-cyan-500/20 to-blue-600/30 text-cyan-300 border-cyan-500/40",
      borderActive: "border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-95",
      icon: "🔔",
      action: () => djSoundEffects.playStageChime(),
    },
    {
      id: "ovation",
      name: "Ovación",
      label: "VÍTORES & SHOW",
      color: "from-pink-500/20 to-purple-600/30 text-pink-300 border-pink-500/40",
      borderActive: "border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.5)] scale-95",
      icon: "🎉",
      action: () => djSoundEffects.playOvation(),
    },
    {
      id: "drumroll",
      name: "Redoble",
      label: "TAMBORES & GONG",
      color: "from-amber-500/20 to-orange-600/30 text-amber-300 border-amber-500/40",
      borderActive: "border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-95",
      icon: "🥁",
      action: () => djSoundEffects.playDrumroll(),
    },
    {
      id: "failhorn",
      name: "Pifia",
      label: "DESAFINADO HUMOR",
      color: "from-rose-500/20 to-red-600/30 text-rose-300 border-rose-500/40",
      borderActive: "border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.5)] scale-95",
      icon: "🎺",
      action: () => djSoundEffects.playFailHorn(),
    },
    {
      id: "kclap",
      name: "Aplausos",
      label: "PÚBLICO EN VIVO",
      color: "from-emerald-500/20 to-teal-600/30 text-emerald-300 border-emerald-500/40",
      borderActive: "border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-95",
      icon: "👏",
      action: () => djSoundEffects.playClap(),
    },
  ];

  const currentPads = activeTab === "KARAOKE" ? karaokePads : djPads;

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 w-full max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <div
            className={`p-1 rounded-md ${
              activeTab === "KARAOKE"
                ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                : "bg-purple-900/50 text-purple-300"
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
            {activeTab === "KARAOKE"
              ? "🎤 KJ Stage Soundboard • Efectos en Vivo"
              : "🎧 DJ FX Launchpad • Soundboard Sintetizado"}
          </span>
        </div>

        <div className="flex items-center justify-center sm:justify-end gap-1.5">
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold">
            <button
              onClick={() => setActiveTab("DJ")}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === "DJ"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Disc3 className="w-3 h-3" />
              <span>DJ Club</span>
            </button>
            <button
              onClick={() => setActiveTab("KARAOKE")}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === "KARAOKE"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Mic className="w-3 h-3" />
              <span>Karaoke Stage</span>
            </button>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 hidden md:inline">0ms Sintetizado</span>
        </div>
      </div>

      <div
        className={`grid gap-2.5 ${
          activeTab === "KARAOKE"
            ? "grid-cols-2 sm:grid-cols-5"
            : "grid-cols-2 sm:grid-cols-4"
        }`}
      >
        {currentPads.map((pad) => {
          const isActive = activePad === pad.id;
          return (
            <button
              key={pad.id}
              onClick={() => triggerSound(pad.id, pad.action)}
              className={`p-3 rounded-xl border bg-gradient-to-b transition-all duration-150 flex flex-col items-center justify-center gap-1.5 cursor-pointer select-none group relative overflow-hidden ${
                pad.color
              } ${isActive ? pad.borderActive : "hover:border-zinc-500 hover:brightness-110"}`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
              )}
              <span className="text-xl group-hover:scale-110 transition-transform">
                {pad.icon}
              </span>
              <div className="text-center">
                <div className="text-xs font-black tracking-wide text-white">
                  {pad.name}
                </div>
                <div className="text-[9px] font-mono text-zinc-400 font-bold">
                  {pad.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
