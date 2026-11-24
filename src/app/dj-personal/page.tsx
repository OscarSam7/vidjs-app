"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Headphones, Sparkles, CheckCircle2, AlertCircle, Info } from "lucide-react";
import VirtualDjConsole from "@/components/dj/VirtualDjConsole";
import { CynkoLogo } from "@/components/ui/ZynkoLogo";

export default function PersonalDjBoothPage() {
  const [crossfaderValue, setCrossfaderValue] = useState(50);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const showFeedback = useCallback((type: "success" | "error" | "info", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((curr) => (curr?.text === text ? null : curr));
    }, 3500);
  }, []);

  const noopAsync = useCallback(async () => {}, []);

  return (
    <div className="min-h-screen bg-[#06060b] text-white flex flex-col">
      {/* Header minimalista Modo DJ Personal */}
      <header className="sticky top-0 z-40 bg-[#090912]/90 backdrop-blur-xl border-b border-white/10 px-3 sm:px-6 py-2.5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/guest"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all shrink-0"
              title="Volver al Portal del Cliente"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Volver</span>
            </Link>

            <div className="h-5 w-px bg-white/10 hidden sm:block" />

            <CynkoLogo size="sm" module="MUSIC" />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-fuchsia-500/20 border border-amber-400/40 text-amber-200 text-[10px] sm:text-xs font-black tracking-wide">
              <Headphones className="w-3.5 h-3.5 text-amber-400" />
              <span>CABINA DJ PERSONAL</span>
              <span className="hidden md:inline text-fuchsia-300">• BANDEJA A &amp; B</span>
            </span>
          </div>
        </div>
      </header>

      {/* Banner de bienvenida compacto */}
      <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-6 pt-3">
        <div className="rounded-2xl bg-gradient-to-r from-zinc-900/90 via-purple-950/30 to-zinc-900/90 border border-white/10 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong className="text-white">Sé tu propio DJ:</strong> busca cualquier canción en YouTube o carga tus archivos MP3/MP4 en la <strong className="text-purple-300">Bandeja A</strong> y <strong className="text-cyan-300">Bandeja B</strong> para escuchar y mezclar libremente.
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 bg-black/40 px-2 py-0.5 rounded-lg border border-white/5">
            Solo reproducción personal · Sin eventos
          </span>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-xl ${
              feedback.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/60 text-emerald-200"
                : feedback.type === "error"
                ? "bg-red-950/90 border-red-500/60 text-red-200"
                : "bg-zinc-900/95 border-cyan-500/50 text-cyan-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : feedback.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        </div>
      )}

      {/* Consola DJ Bandeja A & B en Modo Personal */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-2 sm:px-6 py-3">
        <VirtualDjConsole
          currentPlaying={null}
          queue={[]}
          pendingRequests={[]}
          onPlayQueueEntry={noopAsync}
          onNextTrack={noopAsync}
          showFeedback={showFeedback}
          crossfaderValue={crossfaderValue}
          setCrossfaderValue={setCrossfaderValue}
          zone="DJ"
          personalMode={true}
        />
      </main>
    </div>
  );
}
