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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      {/* Fondo visual dinámico de escenario / luces */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/40 via-black to-amber-950/40 opacity-80" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl animate-pulse" />

      {/* Botón Flotante de Pantalla Completa */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleFullscreen}
          className="p-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700 backdrop-blur-md shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Pantalla Completa"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
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
