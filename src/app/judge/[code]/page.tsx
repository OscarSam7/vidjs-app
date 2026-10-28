"use client";

import React, { useState, useEffect, useRef, use } from "react";
import {
  Trophy,
  Award,
  Sparkles,
  Star,
  CheckCircle2,
  AlertCircle,
  Mic,
  MessageSquare,
  Lock,
  Flame,
  Send,
  Volume2,
  RefreshCw,
  Zap,
  Sliders,
  Users,
} from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import { RealtimeEventType } from "@/lib/realtime/event-bus";

interface Criteria {
  id: string;
  name: string;
  description: string | null;
  maxScore: number;
  weight: number;
}

interface JudgeSession {
  id: string;
  name: string;
  title: string | null;
  avatarUrl: string | null;
  canGoldenBuzzer: boolean;
}

interface ContestInfo {
  id: string;
  name: string;
  code: string;
  scoringMode: string;
  rules: string | null;
}

interface CurrentPerformance {
  id: string;
  songTitle: string;
  artistName: string;
  status: string;
  participant: {
    id: string;
    name: string;
    stageName: string | null;
    photoUrl: string | null;
    tableLabel: string | null;
  };
  myScore?: {
    id: string;
    totalScore: number;
    breakdown: string;
    feedbackNotes: string | null;
    isGoldenBuzzer: boolean;
  } | null;
}

export default function JudgePortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ pin?: string }>;
}) {
  const { code: contestCode } = use(params);
  const resolvedSearchParams = use(searchParams);
  const initialPin = resolvedSearchParams?.pin || "";

  // Auth State
  const [pin, setPin] = useState(initialPin);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Contest & Judge Data
  const [judge, setJudge] = useState<JudgeSession | null>(null);
  const [contest, setContest] = useState<ContestInfo | null>(null);
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [performance, setPerformance] = useState<CurrentPerformance | null>(null);

  // Scoring Form State
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [showGoldenBuzzerModal, setShowGoldenBuzzerModal] = useState(false);
  const [goldenBuzzerSuccess, setGoldenBuzzerSuccess] = useState(false);

  // Intentar login automático si viene PIN por URL
  useEffect(() => {
    if (initialPin) {
      handleLogin(initialPin);
    }
  }, [initialPin]);

  const handleLogin = async (loginPin: string) => {
    if (!loginPin || loginPin.length < 4) return;
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/v1/contest/judge/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contestCode,
          accessPin: loginPin,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setJudge(json.data.judge);
        setContest(json.data.contest);
        setCriteria(json.data.criteria);
        setIsAuthenticated(true);

        // Si ya hay actuación en escenario
        if (json.data.currentPerformance) {
          applyPerformance(json.data.currentPerformance, json.data.criteria);
        }
      } else {
        setAuthError(json.error || "Código o PIN inválido");
      }
    } catch {
      setAuthError("Error de conexión al autenticar jurado");
    } finally {
      setAuthLoading(false);
    }
  };

  const applyPerformance = (perf: CurrentPerformance, critList: Criteria[]) => {
    setPerformance(perf);
    if (perf.myScore) {
      setHasVoted(true);
      try {
        const parsed = JSON.parse(perf.myScore.breakdown);
        setScores(parsed);
      } catch {}
      setFeedback(perf.myScore.feedbackNotes || "");
    } else {
      setHasVoted(false);
      // Inicializar scores con valores por defecto (la mitad del puntaje máximo)
      const initial: Record<string, number> = {};
      critList.forEach((c) => {
        initial[c.id] = Math.round(c.maxScore * 0.7); // 7 de 10 por defecto
      });
      setScores(initial);
      setFeedback("");
    }
  };

  // Escuchar eventos en tiempo real del concurso
  useRealtime({
    eventId: contest?.id ? `contest:${contest.id}` : "",
    onEvent: (type: RealtimeEventType, payload: any) => {
      if (
        type === "CONTEST_PERFORMANCE_UPDATE" ||
        type === "CONTEST_VOTING_OPEN" ||
        type === "CONTEST_VOTING_CLOSED" ||
        type === "CONTEST_REVEAL_SCORES"
      ) {
        if (payload?.performance) {
          applyPerformance(payload.performance, criteria);
        }
      }
    },
  });

  // Cálculo del puntaje total en tiempo real
  const totalScoreCalculated = criteria.reduce((acc, c) => {
    return acc + (scores[c.id] || 0) * c.weight;
  }, 0);

  const totalWeight = criteria.reduce((acc, c) => acc + c.weight, 0);
  const normalizedFinal = totalWeight > 0 ? (totalScoreCalculated / totalWeight).toFixed(1) : "0.0";

  // Enviar Veredicto Oficial
  const handleSubmitVote = async (isGoldenBuzzer: boolean = false) => {
    if (!contest || !judge || !performance) return;

    setIsSubmitting(true);
    setFeedbackSuccess(null);

    try {
      const res = await fetch(`/api/v1/contest/${contest.id}/vote/judge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judgePin: pin,
          performanceId: performance.id,
          breakdown: scores,
          feedbackNotes: feedback.trim() || null,
          isGoldenBuzzer,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setHasVoted(true);
        if (isGoldenBuzzer) {
          setGoldenBuzzerSuccess(true);
          setShowGoldenBuzzerModal(false);
        }
        setFeedbackSuccess("¡Veredicto firmado y enviado con éxito! ✓");
        // Haptic feedback si el dispositivo lo soporta
        if (typeof window !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      } else {
        alert(json.error || "Error al enviar veredicto");
      }
    } catch {
      alert("Error de conexión al enviar veredicto");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== PANTALLA 1: LOGIN DE JURADO ====================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-zinc-950">
              <Trophy className="w-9 h-9" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              Portal del Jurado Oficial
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              Concurso de Karaoke • Código: <span className="font-mono text-amber-400 font-bold">{contestCode}</span>
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{authError}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Ingresa tu PIN de Jurado (4 dígitos)
              </label>
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="w-full text-center text-3xl font-mono tracking-[0.5em] py-3.5 rounded-2xl bg-zinc-950 border border-zinc-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none text-amber-300 placeholder:text-zinc-700 transition-all font-black"
                />
                <Lock className="w-4 h-4 text-zinc-600 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button
              onClick={() => handleLogin(pin)}
              disabled={authLoading || pin.length < 4}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-sm tracking-wider uppercase transition-all shadow-lg shadow-amber-500/25 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verificando Credenciales...</span>
                </>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  <span>Acceder a la Mesa de Jurado</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-2 text-center border-t border-zinc-800/80">
            <p className="text-[11px] text-zinc-500">
              ¿No tienes tu PIN? Solicítalo al DJ u organizador de cabina.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== PANTALLA 2: JUEZ LOGUEADO / PAD DE CALIFICACIÓN ====================
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col max-w-xl mx-auto border-x border-zinc-900 pb-16 selection:bg-amber-500 selection:text-black">
      {/* Top Header Barra de Jurado */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-zinc-950 font-black text-xs shadow-md">
            {judge?.name?.charAt(0) || "J"}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-black text-white">{judge?.name}</h2>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                JURADO
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 truncate max-w-[170px]">
              {judge?.title || contest?.name}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
            {contest?.code}
          </div>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              setPin("");
            }}
            className="text-[10px] text-zinc-400 hover:text-red-400 transition-colors font-medium cursor-pointer"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="p-4 space-y-4 flex-1">
        {/* Notificación de Éxito al Votar */}
        {feedbackSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2.5 shadow-lg animate-in fade-in duration-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="flex-1">{feedbackSuccess}</span>
          </div>
        )}

        {/* Notificación de Golden Buzzer Otorgado */}
        {goldenBuzzerSuccess && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-900/60 via-yellow-900/40 to-amber-950/80 border border-amber-500/80 text-amber-200 text-xs font-black flex items-center gap-3 shadow-xl animate-bounce">
            <Sparkles className="w-6 h-6 text-yellow-300 shrink-0 animate-spin [animation-duration:3s]" />
            <div>
              <p className="text-sm font-black text-yellow-300">¡PASE DE ORO REGISTRADO!</p>
              <p className="text-[11px] font-medium text-amber-300/90">
                Le has otorgado tu Pase de Oro a la Gran Final a este participante.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TARJETA DEL CANTANTE EN ESCENARIO                            */}
        {/* ============================================================ */}
        {performance ? (
          <div className="rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 p-5 shadow-2xl space-y-4 relative overflow-hidden">
            {/* Banner de Estado */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  {performance.status === "VOTING_OPEN"
                    ? "VOTACIÓN EN CURSO"
                    : performance.status === "VOTING_CLOSED"
                    ? "VOTACIÓN CERRADA"
                    : "EN ESCENARIO"}
                </span>
              </div>
              {performance.participant.tableLabel && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {performance.participant.tableLabel}
                </span>
              )}
            </div>

            {/* Datos del Participante y Tema */}
            <div className="flex items-center gap-3.5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-purple-900/30 shrink-0 overflow-hidden">
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
                <h3 className="text-base sm:text-lg font-black text-white truncate leading-tight">
                  {performance.participant.stageName || performance.participant.name}
                </h3>
                {performance.participant.stageName && (
                  <p className="text-[11px] text-zinc-400 truncate">
                    Nombre real: {performance.participant.name}
                  </p>
                )}
                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold truncate pt-0.5">
                  <Mic className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span className="truncate">
                    "{performance.songTitle}" &bull; {performance.artistName}
                  </span>
                </div>
              </div>
            </div>

            {/* Medidor de Calificación en Tiempo Real */}
            <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Puntaje Total Jurado
                </span>
                <span className="text-[11px] text-zinc-500">
                  Promedio de criterios activos
                </span>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black font-mono text-amber-400 leading-none">
                  {normalizedFinal}
                </div>
                <span className="text-[9px] font-bold text-zinc-500">/ 10.0 PTS</span>
              </div>
            </div>

            {/* ============================================================ */}
            {/* SLIDERS TÁCTILES POR CADA CRITERIO CONFIGURABLE              */}
            {/* ============================================================ */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Criterios de Evaluación</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {criteria.length} criterios
                </span>
              </div>

              {criteria.map((crit) => {
                const currentVal = scores[crit.id] ?? Math.round(crit.maxScore * 0.7);
                const percent = Math.round((currentVal / crit.maxScore) * 100);

                return (
                  <div
                    key={crit.id}
                    className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-2.5 transition-all hover:border-zinc-700"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-white">{crit.name}</h4>
                        {crit.description && (
                          <p className="text-[10px] text-zinc-400 leading-snug">
                            {crit.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right pl-2">
                        <span className="text-lg font-black font-mono text-amber-300">
                          {currentVal}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono">
                          /{crit.maxScore}
                        </span>
                      </div>
                    </div>

                    {/* Slider Range Táctil Ultra Suave */}
                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min={1}
                        max={crit.maxScore}
                        step={0.5}
                        disabled={hasVoted}
                        value={currentVal}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setScores((prev) => ({ ...prev, [crit.id]: val }));
                        }}
                        className={`w-full accent-amber-400 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer ${
                          hasVoted ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                      />
                    </div>

                    <div className="flex justify-between text-[9px] font-mono text-zinc-500 font-bold px-0.5">
                      <span>Bajo (1)</span>
                      <span>Regular ({Math.round(crit.maxScore * 0.5)})</span>
                      <span>Excelente ({crit.maxScore})</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Caja de Comentarios / Devolución del Jurado */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                <span>Devolución / Feedback para el Cantante</span>
              </label>
              <textarea
                rows={2}
                disabled={hasVoted}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Escribe un consejo, felicitación o comentario para el participante..."
                className="w-full text-xs p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20 outline-none resize-none transition-all disabled:opacity-60"
              />
            </div>

            {/* BOTONES DE ACCIÓN: FIRMAR VOTO & GOLDEN BUZZER */}
            <div className="pt-2 space-y-2.5">
              {!hasVoted ? (
                <>
                  <button
                    onClick={() => handleSubmitVote(false)}
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-zinc-950 font-black text-sm tracking-wider uppercase transition-all shadow-xl shadow-amber-500/20 hover:scale-[1.01] active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Enviando Calificación...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Firmar y Enviar Veredicto Oficial</span>
                      </>
                    )}
                  </button>

                  {judge?.canGoldenBuzzer && (
                    <button
                      onClick={() => setShowGoldenBuzzerModal(true)}
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-600/30 via-amber-500/20 to-yellow-600/30 hover:from-yellow-600/50 hover:to-amber-500/40 border border-amber-500/60 text-amber-200 font-black text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 group"
                    >
                      <Sparkles className="w-4 h-4 text-yellow-300 group-hover:rotate-45 transition-transform" />
                      <span>Otorgar Golden Buzzer (Pase de Oro a la Final)</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-center space-y-1">
                  <p className="text-xs font-black text-emerald-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Veredicto Enviado al Sistema</span>
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Tu puntuación ha sido guardada. Espera a que el DJ presente al siguiente participante.
                  </p>
                  <button
                    onClick={() => setHasVoted(false)}
                    className="text-[10px] text-amber-400 underline pt-1 font-bold cursor-pointer"
                  >
                    ¿Necesitas corregir la nota? Toca aquí para re-editar
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* PANTALLA DE ESPERA CUANDO NO HAY CANTANTE EN ESCENARIO      */
          /* ============================================================ */
          <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-8 text-center space-y-4 my-8">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-amber-400 shadow-inner">
              <Mic className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-white">
                Esperando al Próximo Cantante
              </h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                El DJ u organizador está preparando la siguiente actuación. Esta pantalla se actualizará automáticamente en cuanto comience la canción.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Conexión en Vivo Activa</span>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* MODAL DE CONFIRMACIÓN DE GOLDEN BUZZER                       */}
      {/* ============================================================ */}
      {showGoldenBuzzerModal && performance && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-gradient-to-b from-zinc-900 via-amber-950/40 to-black border-2 border-amber-500 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center text-zinc-950 shadow-2xl shadow-yellow-500/50 animate-pulse">
              <Sparkles className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-yellow-300">
                ¿ACTIVAR GOLDEN BUZZER?
              </h3>
              <p className="text-xs text-amber-100 font-medium leading-relaxed">
                ¿Estás seguro de otorgar tu **Pase de Oro Directo a la Final** a{" "}
                <span className="font-bold text-white">
                  {performance.participant.stageName || performance.participant.name}
                </span>
                ?
              </p>
              <p className="text-[10px] text-zinc-400 pt-1">
                Esto disparará fuegos artificiales y confeti dorado en la pantalla gigante del local.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowGoldenBuzzerModal(false)}
                className="py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSubmitVote(true)}
                disabled={isSubmitting}
                className="py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-yellow-500/30 cursor-pointer"
              >
                ¡SÍ, PASE DE ORO!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
