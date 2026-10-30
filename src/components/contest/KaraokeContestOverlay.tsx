"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Trophy,
  Award,
  Sparkles,
  Star,
  Mic,
  Users,
  Flame,
  CheckCircle2,
  Clock,
  Crown,
  Medal,
  Volume2,
  QrCode,
  Heart,
} from "lucide-react";

export interface ContestCriteriaItem {
  id: string;
  name: string;
  description: string | null;
  maxScore: number;
}

export interface ContestJudgeScoreItem {
  judge: {
    id: string;
    name: string;
    title: string | null;
    avatarUrl: string | null;
  };
  totalScore: number;
  breakdown: string; // JSON { [criteriaId]: number }
  feedbackNotes: string | null;
  isGoldenBuzzer: boolean;
}

export interface ContestPerformanceDisplay {
  id: string;
  songTitle: string;
  artistName: string;
  status: "PENDING" | "ON_STAGE" | "VOTING_OPEN" | "VOTING_CLOSED" | "REVEALED";
  judgeScore: number;
  publicScore: number;
  totalScore: number;
  isGoldenBuzzer: boolean;
  goldenBuzzerBy?: string | null;
  participant: {
    id: string;
    name: string;
    stageName: string | null;
    photoUrl: string | null;
    tableLabel: string | null;
  };
  judgeScores?: ContestJudgeScoreItem[];
  publicVotesCount?: number;
}

export interface LeaderboardItem {
  rank: number;
  name: string;
  stageName: string;
  tableLabel: string;
  songTitle: string;
  totalScore: number;
  isGoldenBuzzer: boolean;
}

interface KaraokeContestOverlayProps {
  contestName: string;
  contestCode: string;
  stageTitle?: string;
  performance: ContestPerformanceDisplay | null;
  criteria?: ContestCriteriaItem[];
  leaderboard?: LeaderboardItem[];
  showLeaderboard?: boolean;
  onCloseLeaderboard?: () => void;
  qrScanUrl?: string;
}

export default function KaraokeContestOverlay({
  contestName,
  contestCode,
  stageTitle = "Gala Oficial de Karaoke",
  performance,
  criteria = [],
  leaderboard = [],
  showLeaderboard = false,
  qrScanUrl,
}: KaraokeContestOverlayProps) {
  const [revealedIndex, setRevealedIndex] = useState<number>(0);
  const [confettiActive, setConfettiActive] = useState(false);

  // Efecto de confeti y fuegos artificiales para Golden Buzzer
  useEffect(() => {
    if (performance?.isGoldenBuzzer) {
      setConfettiActive(true);
      const timer = setTimeout(() => setConfettiActive(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [performance?.isGoldenBuzzer]);

  // Animación secuencial de revelación de jueces
  useEffect(() => {
    if (performance?.status === "REVEALED" && performance.judgeScores) {
      setRevealedIndex(0);
      const interval = setInterval(() => {
        setRevealedIndex((prev) => {
          if (prev < (performance.judgeScores?.length || 0)) {
            return prev + 1;
          }
          clearInterval(interval);
          return prev;
        });
      }, 900);
      return () => clearInterval(interval);
    } else {
      setRevealedIndex(0);
    }
  }, [performance?.status, performance?.judgeScores?.length]);

  if (!performance && !showLeaderboard) return null;

  return (
    <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden font-sans">
      {/* ============================================================ */}
      {/* 1. TOP BAR: BANNER DEL CAMPEONATO                            */}
      {/* ============================================================ */}
      <header className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3 bg-zinc-950/90 border border-amber-500/40 rounded-2xl px-5 py-2.5 backdrop-blur-md shadow-2xl">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-amber-500/30">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-wide text-white uppercase">
                {contestName}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                EN VIVO
              </span>
            </div>
            <p className="text-xs text-amber-400 font-medium">
              {stageTitle} &bull; Código: <span className="font-mono font-bold">{contestCode}</span>
            </p>
          </div>
        </div>

        {/* QR Flotante para Votación del Público desde las mesas */}
        {qrScanUrl && performance && (
          <div className="hidden lg:flex items-center gap-3 bg-zinc-950/90 border border-zinc-800 rounded-2xl px-4 py-2 backdrop-blur-md shadow-2xl">
            <div className="text-right">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                ¡VOTA DESDE TU MESA!
              </span>
              <span className="text-xs font-black text-amber-300">
                1 a 5 Estrellas ⭐
              </span>
            </div>
            <div className="w-10 h-10 bg-white rounded-lg p-1 flex items-center justify-center">
              <QrCode className="w-full h-full text-black" />
            </div>
          </div>
        )}
      </header>

      {/* ============================================================ */}
      {/* 2. OVERLAY ESPECIAL: GOLDEN BUZZER EXPLOSION                 */}
      {/* ============================================================ */}
      {confettiActive && performance?.isGoldenBuzzer && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-in zoom-in-95 duration-500 pointer-events-auto">
          {/* Lluvia de confeti virtual animada */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 45 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-sm bg-yellow-400 animate-bounce"
                style={{
                  top: `${Math.random() * 90}%`,
                  left: `${Math.random() * 95}%`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                  backgroundColor: ["#fbbf24", "#f59e0b", "#ec4899", "#8b5cf6", "#10b981"][i % 5],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>

          <div className="relative space-y-4 max-w-2xl bg-zinc-950/90 border-4 border-yellow-400 rounded-3xl p-8 shadow-[0_0_80px_rgba(251,191,36,0.6)]">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center text-zinc-950 shadow-2xl shadow-yellow-500 animate-pulse">
              <Sparkles className="w-14 h-14" />
            </div>

            <div className="space-y-2">
              <h2 className="text-4xl sm:text-6xl font-black tracking-tight bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent uppercase animate-pulse">
                ¡GOLDEN BUZZER!
              </h2>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                {performance.participant.stageName || performance.participant.name}
              </h3>
              <p className="text-base text-amber-200 font-bold">
                {performance.goldenBuzzerBy
                  ? `Otorgado por: ${performance.goldenBuzzerBy}`
                  : "¡PASE DE ORO DIRECTO A LA GRAN FINAL!"}
              </p>
            </div>

            <div className="pt-2 inline-flex items-center gap-2 px-6 py-2 rounded-full bg-yellow-400 text-zinc-950 font-black text-sm uppercase tracking-wider shadow-lg">
              <Crown className="w-5 h-5" />
              <span>CLASIFICACIÓN DIRECTA ASEGURADA</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MODAL DE PODIO / TABLA DE POSICIONES (LEADERBOARD)        */}
      {/* ============================================================ */}
      {showLeaderboard && (
        <div className="absolute inset-0 z-40 bg-zinc-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 sm:p-12 animate-in fade-in duration-300 pointer-events-auto">
          <div className="w-full max-w-4xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest">
                <Trophy className="w-4 h-4" />
                <span>TABLA OFICIAL DE POSICIONES</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
                Clasificación del Campeonato
              </h2>
              <p className="text-sm text-zinc-400 font-medium">
                {stageTitle} &bull; Vidjs Karaoke Championship
              </p>
            </div>

            {/* PODIO TOP 3 (Oro, Plata, Bronce) */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-4 items-end max-w-2xl mx-auto">
              {/* 2do PUESTO (Plata) */}
              <div className="flex flex-col items-center">
                {leaderboard[1] ? (
                  <div className="w-full bg-zinc-900/90 border-2 border-slate-400 rounded-3xl p-4 text-center shadow-xl space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-300 text-zinc-950 font-black flex items-center justify-center text-lg shadow-md">
                      <Medal className="w-6 h-6 text-slate-700" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                      2° LUGAR
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-white truncate">
                      {leaderboard[1].stageName}
                    </h4>
                    <div className="text-xl sm:text-2xl font-mono font-black text-slate-200">
                      {leaderboard[1].totalScore} pts
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-32 rounded-3xl border border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 text-xs">
                    Vacante
                  </div>
                )}
              </div>

              {/* 1er PUESTO (Oro - Centro Elevado) */}
              <div className="flex flex-col items-center">
                {leaderboard[0] ? (
                  <div className="w-full bg-gradient-to-b from-amber-950/70 via-zinc-900 to-zinc-900 border-2 border-yellow-400 rounded-3xl p-5 text-center shadow-2xl shadow-yellow-500/20 space-y-2.5 scale-105">
                    <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-tr from-yellow-400 to-amber-300 text-zinc-950 font-black flex items-center justify-center text-2xl shadow-lg shadow-yellow-500/40 animate-pulse">
                      <Crown className="w-8 h-8 text-amber-950" />
                    </div>
                    <span className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest block">
                      1° LUGAR &bull; LÍDER
                    </span>
                    <h4 className="text-base sm:text-lg font-black text-white truncate">
                      {leaderboard[0].stageName}
                    </h4>
                    <div className="text-2xl sm:text-3xl font-mono font-black text-yellow-300">
                      {leaderboard[0].totalScore} pts
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-40 rounded-3xl border border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 text-xs">
                    Vacante
                  </div>
                )}
              </div>

              {/* 3er PUESTO (Bronce) */}
              <div className="flex flex-col items-center">
                {leaderboard[2] ? (
                  <div className="w-full bg-zinc-900/90 border-2 border-amber-700/60 rounded-3xl p-4 text-center shadow-xl space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-amber-700 text-amber-100 font-black flex items-center justify-center text-lg shadow-md">
                      <Medal className="w-6 h-6 text-amber-200" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest block">
                      3° LUGAR
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-white truncate">
                      {leaderboard[2].stageName}
                    </h4>
                    <div className="text-xl sm:text-2xl font-mono font-black text-amber-400">
                      {leaderboard[2].totalScore} pts
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-28 rounded-3xl border border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 text-xs">
                    Vacante
                  </div>
                )}
              </div>
            </div>

            {/* TABLA DEL RESTO DE PARTICIPANTES (Puestos 4 en adelante) */}
            {leaderboard.length > 3 && (
              <div className="max-h-48 overflow-y-auto rounded-2xl bg-zinc-900/60 border border-zinc-800 divide-y divide-zinc-800/80">
                {leaderboard.slice(3).map((item) => (
                  <div
                    key={item.rank}
                    className="flex items-center justify-between px-4 py-2.5 text-xs font-medium"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-zinc-500 font-mono font-bold">{item.rank}°</span>
                      <span className="text-white font-bold">{item.stageName}</span>
                      <span className="text-zinc-500 text-[11px] truncate max-w-[150px]">
                        "{item.songTitle}"
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.isGoldenBuzzer && (
                        <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[10px] font-bold">
                          ★ GOLDEN
                        </span>
                      )}
                      <span className="font-mono font-black text-amber-400">{item.totalScore} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. ZONA INFERIOR: CARTEL DE CANTANTE & REVELACIÓN EN TV       */}
      {/* ============================================================ */}
      {performance && !showLeaderboard && (
        <footer className="space-y-4 pointer-events-auto">
          {/* A. REVELACIÓN DEL VEREDICTO DE JURADOS (Estilo The Voice) */}
          {performance.status === "REVEALED" && performance.judgeScores && performance.judgeScores.length > 0 && (
            <div className="bg-zinc-950/95 border-2 border-amber-500/60 rounded-3xl p-5 backdrop-blur-xl shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    Veredicto Oficial del Jurado
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-medium">Calificación Total:</span>
                  <span className="text-2xl font-black font-mono text-yellow-300 px-3 py-0.5 rounded-xl bg-amber-950/80 border border-amber-500/50 shadow-inner">
                    {performance.totalScore} PTS
                  </span>
                </div>
              </div>

              {/* Tarjetas individuales de cada jurado reveladas secuencialmente */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {performance.judgeScores.map((js, idx) => {
                  const isRevealed = idx < revealedIndex;
                  return (
                    <div
                      key={js.judge.id}
                      className={`p-3.5 rounded-2xl border transition-all duration-500 ${
                        isRevealed
                          ? "bg-zinc-900 border-amber-500/50 shadow-lg scale-100 opacity-100"
                          : "bg-zinc-950/60 border-zinc-800 scale-95 opacity-40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black text-white">{js.judge.name}</h4>
                          <span className="text-[10px] text-zinc-400 truncate block">
                            {js.judge.title || "Jurado"}
                          </span>
                        </div>
                        <div className="text-right">
                          {isRevealed ? (
                            <span className="text-2xl font-mono font-black text-amber-400">
                              {js.totalScore}
                            </span>
                          ) : (
                            <span className="text-xl font-mono font-bold text-zinc-600 animate-pulse">
                              ?
                            </span>
                          )}
                        </div>
                      </div>

                      {isRevealed && js.feedbackNotes && (
                        <p className="text-[10px] text-amber-200/90 italic pt-2 border-t border-zinc-800/80 mt-2 truncate">
                          "{js.feedbackNotes}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* B. TARJETA PRINCIPAL DEL CANTANTE Y CRITERIOS VISIBLES */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4 items-stretch">
            {/* Tarjeta del Participante */}
            <div className="bg-zinc-950/90 border border-zinc-800 rounded-3xl p-5 backdrop-blur-md shadow-2xl flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-purple-900/40 shrink-0 overflow-hidden">
                {performance.participant.photoUrl ? (
                  <img
                    src={performance.participant.photoUrl}
                    alt={performance.participant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  performance.participant.name.charAt(0)
                )}
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black uppercase tracking-wider">
                    {performance.status === "VOTING_OPEN"
                      ? "VOTACIÓN EN CURSO"
                      : "EN ESCENARIO"}
                  </span>
                  {performance.participant.tableLabel && (
                    <span className="text-[10px] font-bold text-zinc-400">
                      {performance.participant.tableLabel}
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white truncate">
                  {performance.participant.stageName || performance.participant.name}
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold truncate">
                  <Mic className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">
                    "{performance.songTitle}" &bull; {performance.artistName}
                  </span>
                </div>
              </div>
            </div>

            {/* Criterios de Evaluación Visibles en Pantalla para el Público */}
            {criteria.length > 0 && (
              <div className="bg-zinc-950/90 border border-zinc-800 rounded-3xl p-4 backdrop-blur-md shadow-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Criterios Evaluados por el Jurado</span>
                  </span>
                  <span className="text-[9px] text-amber-400 font-mono font-bold">
                    Escala Oficial 1-10
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {criteria.slice(0, 6).map((c, i) => (
                    <div
                      key={c.id}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2"
                    >
                      <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-[11px] font-bold text-zinc-200 truncate">
                        {c.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
