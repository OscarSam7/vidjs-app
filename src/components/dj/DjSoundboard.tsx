"use client";

import { useState } from "react";
import { djSoundEffects } from "@/lib/audio/dj-audio-engine";
import { Volume2, Sparkles, Flame, Disc, Radio } from "lucide-react";

interface SoundPad {
  id: string;
  name: string;
  label: string;
  color: string;
  borderActive: string;
  icon: string;
  action: () => void;
}

export default function DjSoundboard() {
  const [activePad, setActivePad] = useState<string | null>(null);

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

  const pads: SoundPad[] = [
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

  return (
    <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-purple-900/50 text-purple-300">
            <Volume2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
            DJ FX Launchpad &bull; Soundboard Sintetizado
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">Web Audio Engine &bull; Latencia 0ms</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {pads.map((pad) => {
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
