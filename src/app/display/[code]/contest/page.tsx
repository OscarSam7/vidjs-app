"use client";

import React, { useState, useEffect, use } from "react";
import KaraokeContestOverlay, {
  ContestPerformanceDisplay,
  ContestCriteriaItem,
  LeaderboardItem,
} from "@/components/contest/KaraokeContestOverlay";
import { useRealtime } from "@/hooks/use-realtime";
import { RealtimeEventType } from "@/lib/realtime/event-bus";
import { Maximize2, Minimize2, Trophy, Disc3 } from "lucide-react";

export default function DedicatedContestDisplayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);

  const [contest, setContest] = useState<any>(null);
  const [currentPerformance, setCurrentPerformance] = useState<ContestPerformanceDisplay | null>(null);
  const [criteria, setCriteria] = useState<ContestCriteriaItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Cargar estado inicial del concurso
  const fetchContest = async () => {
    try {
      const res = await fetch(`/api/v1/contest/${code}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setContest(json.data);
        setCriteria(json.data.criteria || []);
        if (json.data.currentPerformance) {
          setCurrentPerformance(json.data.currentPerformance);
        }
      }
    } catch (err) {
      console.error("Error fetching contest display state:", err);
    }
  };

  const fetchLeaderboard = async () => {
    if (!contest?.id) return;
    try {
      const res = await fetch(`/api/v1/contest/${contest.id}/reports`);
      const json = await res.json();
      if (res.ok && json.success) {
        setLeaderboard(json.data.leaderboard || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchContest();
  }, [code]);

  useEffect(() => {
    if (contest?.id) {
      fetchLeaderboard();
    }
  }, [contest?.id]);

  // Escuchar eventos en vivo
  useRealtime({
    eventId: contest?.id ? `contest:${contest.id}` : "",
    onEvent: (type: RealtimeEventType, payload: any) => {
      if (type === "CONTEST_PERFORMANCE_UPDATE" || type === "CONTEST_VOTING_OPEN") {
        setShowLeaderboard(false);
        if (payload?.performance) {
          setCurrentPerformance(payload.performance);
        }
      } else if (type === "CONTEST_REVEAL_SCORES") {
        if (payload?.performance) {
          setCurrentPerformance(payload.performance);
        }
      } else if (type === "CONTEST_GOLDEN_BUZZER") {
        if (currentPerformance) {
          setCurrentPerformance((prev) =>
            prev
              ? {
                  ...prev,
                  isGoldenBuzzer: true,
                  goldenBuzzerBy: payload.judgeName || "Pase de Oro",
                }
              : null
          );
        }
      } else if (type === "CONTEST_LEADERBOARD_UPDATE") {
        setShowLeaderboard(true);
        fetchLeaderboard();
      }
    },
  });

  // Sincronizar estado de pantalla completa ante eventos del navegador (F11, Esc o botón táctil)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    try {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      );

      if (!isCurrentlyFullscreen) {
        const el = document.documentElement;
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {});
        } else if ((el as any).webkitRequestFullscreen) {
          (el as any).webkitRequestFullscreen();
        } else if ((el as any).msRequestFullscreen) {
          (el as any).msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn("Error alternando pantalla completa:", e);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      {/* Fondo visual dinámico de escenario / luces */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/40 via-black to-amber-950/40 opacity-80" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl animate-pulse" />

      {/* 🔲 Botón Flotante Fijo Icono-Only Pantalla Completa */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 select-none">
        <button
          type="button"
          onClick={toggleFullscreen}
          className={`p-3 sm:p-3.5 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 cursor-pointer active:scale-95 flex items-center justify-center group ${
            isFullscreen
              ? "bg-purple-950/85 hover:bg-purple-900 border-purple-500/70 text-purple-200 hover:text-white shadow-purple-950/60 ring-2 ring-purple-500/30"
              : "bg-zinc-950/85 hover:bg-zinc-900 border-zinc-700/80 hover:border-cyan-500/80 text-zinc-300 hover:text-white shadow-black/80 hover:shadow-cyan-950/40 ring-1 ring-white/10"
          }`}
          title={isFullscreen ? "Salir de pantalla completa (Esc)" : "Pantalla Completa (F11)"}
          aria-label={isFullscreen ? "Salir de pantalla completa" : "Poner pantalla completa"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5 text-purple-300 group-hover:scale-110 transition-transform" />
          ) : (
            <Maximize2 className="w-5 h-5 text-cyan-300 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>

      {/* Componente Overlay de Concurso */}
      <KaraokeContestOverlay
        contestName={contest?.name || "Campeonato de Karaoke Vidjs"}
        contestCode={contest?.code || code}
        stageTitle={
          contest?.stages?.find((s: any) => s.id === contest.activeStageId)?.title ||
          "Gala de Karaoke en Vivo"
        }
        performance={currentPerformance}
        criteria={criteria}
        leaderboard={leaderboard}
        showLeaderboard={showLeaderboard}
        onCloseLeaderboard={() => setShowLeaderboard(false)}
      />

      {/* En caso de estar esperando */}
      {!currentPerformance && !showLeaderboard && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-30 pointer-events-none">
          <div className="w-24 h-24 rounded-3xl bg-zinc-900/90 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-2xl mb-4 animate-pulse">
            <Trophy className="w-12 h-12" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
            {contest?.name || "Campeonato de Karaoke"}
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mt-2">
            La gala comenzará en unos instantes. Los jurados y participantes están listos.
          </p>
        </div>
      )}
    </div>
  );
}
