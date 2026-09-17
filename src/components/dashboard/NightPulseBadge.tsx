"use client";

import { Activity, Flame, Sparkles, Zap } from "lucide-react";
import { NightPulseResult } from "@/lib/pulse/night-pulse";

export default function NightPulseBadge({ pulse }: { pulse: NightPulseResult }) {
  const getIcon = () => {
    switch (pulse.level) {
      case "PEAK":
        return <Flame className="w-4 h-4 text-fuchsia-400 animate-bounce" />;
      case "HOT":
        return <Flame className="w-4 h-4 text-amber-400 animate-pulse" />;
      case "ACTIVE":
        return <Activity className="w-4 h-4 text-purple-400 animate-pulse" />;
      case "WARM":
        return <Sparkles className="w-4 h-4 text-cyan-400" />;
      default:
        return <Zap className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all ${pulse.color} ${pulse.glowClass} flex items-center justify-between gap-4`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 shrink-0">
          {getIcon()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider">
              Night Pulse &bull; {pulse.label}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/50 border border-white/10 font-bold">
              {pulse.score}%
            </span>
          </div>
          <div className="text-[11px] opacity-80 mt-0.5">
            {pulse.description}
          </div>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-3 shrink-0 text-right">
        <div className="text-[11px] font-medium opacity-75">
          <div>
            <strong className="text-white">{pulse.metrics.activeTables}</strong> mesas activas
          </div>
          <div>
            <strong className="text-white">{pulse.metrics.queuedWaiters}</strong> en cola
          </div>
        </div>
        <div className="w-16 h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400 transition-all duration-500 rounded-full"
            style={{ width: `${pulse.score}%` }}
          />
        </div>
      </div>
    </div>
  );
}
