"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Trophy,
  Award,
  Sparkles,
  Star,
  Mic,
  Users,
  Plus,
  Tv,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  Pause,
  Send,
  Sliders,
  Calendar,
  FileText,
  Printer,
  Download,
  Trash2,
  QrCode,
  Copy,
  Check,
  ChevronRight,
  Disc3,
  Flame,
  Crown,
  Medal,
  RefreshCw,
  X,
  Volume2,
  Lock,
  Pencil,
} from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import { RealtimeEventType } from "@/lib/realtime/event-bus";

interface ContestCriteria {
  id: string;
  name: string;
  description: string | null;
  maxScore: number;
  weight: number;
  active: boolean;
}

interface ContestJudge {
  id: string;
  name: string;
  title: string | null;
  avatarUrl: string | null;
  accessPin: string;
  canGoldenBuzzer: boolean;
  accessUrl?: string;
}

interface ContestStage {
  id: string;
  title: string;
  stageType: string;
  date: string;
  status: "SCHEDULED" | "LIVE" | "COMPLETED";
  notes: string | null;
  orderIndex: number;
  performances?: ContestPerformance[];
}

interface ContestPerformance {
  id: string;
  stageId: string;
  participantId: string;
  songTitle: string;
  artistName: string;
  youtubeVideoId: string | null;
  fileUrl: string | null;
  orderIndex: number;
  status: "PENDING" | "ON_STAGE" | "VOTING_OPEN" | "VOTING_CLOSED" | "REVEALED";
  judgeScore: number;
  publicScore: number;
  totalScore: number;
  isGoldenBuzzer: boolean;
  participant: {
    id: string;
    name: string;
    stageName: string | null;
    photoUrl: string | null;
    tableLabel: string | null;
    status: string;
  };
  judgeScores?: Array<{
    judgeId: string;
    totalScore: number;
    feedbackNotes: string | null;
    isGoldenBuzzer: boolean;
    judge: { name: string; title: string | null };
  }>;
  publicVotes?: Array<{ stars: number }>;
}

interface ContestParticipant {
  id: string;
  name: string;
  stageName: string | null;
  photoUrl: string | null;
  tableLabel: string | null;
  status: string;
  totalPoints: number;
  finalRank?: number | null;
  bio?: string | null;
}

interface ContestDetail {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  scoringMode: string;
  publicVoteWeight: number;
  rules: string | null;
  prizes: string | null;
  activeStageId: string | null;
  stages: ContestStage[];
  criteria: ContestCriteria[];
  judges: ContestJudge[];
  participants: ContestParticipant[];
  currentPerformance?: ContestPerformance | null;
}

export default function ContestDashboardPage() {
  const [contests, setContests] = useState<any[]>([]);
  const [selectedContestId, setSelectedContestId] = useState<string | null>(null);
  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [activeTab, setActiveTab] = useState<
    "stage" | "participants" | "stages" | "criteria" | "judges" | "tableVotes" | "reports" | "diplomas"
  >("stage");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Votaciones de mesas y auditoría
  const [publicVotesAudit, setPublicVotesAudit] = useState<{
    totalVotes: number;
    avgStars: number;
    votesByTable: Array<{ tableLabel: string; votersCount: number; avgStars: number; cheerCount: number }>;
    votes: Array<{ id: string; tableLabel: string; stars: number; cheerCount: number; voterId: string; createdAt: string }>;
  } | null>(null);

  const [globalTableVotes, setGlobalTableVotes] = useState<{
    totalVotes: number;
    avgStars: number;
    byTable: Array<{ tableLabel: string; totalVotes: number; totalStars: number; avgStars: number; cheerCount: number }>;
    recentVotes: Array<{ id: string; tableLabel: string; stars: number; cheerCount: number; createdAt: string }>;
  } | null>(null);

  const [showPublicVotesModal, setShowPublicVotesModal] = useState(false);

  // Modales
  const [showNewContestModal, setShowNewContestModal] = useState(false);
  const [showNewParticipantModal, setShowNewParticipantModal] = useState(false);
  const [showNewStageModal, setShowNewStageModal] = useState(false);
  const [showNewJudgeModal, setShowNewJudgeModal] = useState(false);
  const [showNewCriteriaModal, setShowNewCriteriaModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<{ url: string; title: string; pin?: string } | null>(null);

  // Form State para Nuevo Concurso
  const [newContestForm, setNewContestForm] = useState({
    name: "1er Campeonato de Karaoke Vidjs 2026",
    description: "Gran certamen de voces, talento y emoción con evaluación en vivo.",
    scoringMode: "AVERAGE",
    publicVoteWeight: 20,
    judgesCount: 3,
  });

  // Form State para Nuevo Participante
  const [newParticipantForm, setNewParticipantForm] = useState({
    name: "",
    stageName: "",
    tableLabel: "Mesa 1",
    initialSongTitle: "",
    initialArtistName: "",
  });

  // Form State para Nueva Gala / Fecha
  const [newStageForm, setNewStageForm] = useState({
    title: "",
    stageType: "QUALIFIERS",
    notes: "",
  });

  // Form State para Nuevo Juez
  const [newJudgeForm, setNewJudgeForm] = useState({
    name: "",
    title: "Vocal Coach / Productor",
    accessPin: "",
    canGoldenBuzzer: true,
  });

  // Form State para Editar Juez
  const [editingJudge, setEditingJudge] = useState<ContestJudge | null>(null);
  const [editJudgeForm, setEditJudgeForm] = useState({
    name: "",
    title: "",
    accessPin: "",
    canGoldenBuzzer: true,
    active: true,
  });

  // Form State para Nuevo Criterio
  const [newCriteriaForm, setNewCriteriaForm] = useState({
    name: "",
    description: "",
    maxScore: 10,
    weight: 1.0,
  });

  // Form State para Editar Criterio
  const [editingCriteria, setEditingCriteria] = useState<ContestCriteria | null>(null);
  const [editCriteriaForm, setEditCriteriaForm] = useState({
    name: "",
    description: "",
    maxScore: 10,
    weight: 1.0,
    active: true,
  });

  // Reportes y Acta
  const [reportData, setReportData] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const showFeedback = (type: "success" | "error" | "info", text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Cargar lista de concursos
  const fetchContests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/contest");
      const json = await res.json();
      if (res.ok && json.success) {
        setContests(json.data || []);
        if (json.data?.length > 0 && !selectedContestId) {
          setSelectedContestId(json.data[0].id);
        }
      }
    } catch {
      showFeedback("error", "Error cargando concursos");
    } finally {
      setLoading(false);
    }
  };

  // Cargar concurso seleccionado
  const fetchContestDetail = async (contestId: string) => {
    try {
      const res = await fetch(`/api/v1/contest/${contestId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setContest(json.data);
      }
    } catch {
      showFeedback("error", "Error cargando detalle del concurso");
    }
  };

  // Cargar datos de reporte
  const fetchReports = async (contestId: string) => {
    try {
      const res = await fetch(`/api/v1/contest/${contestId}/reports`);
      const json = await res.json();
      if (res.ok && json.success) {
        setReportData(json.data);
      }
    } catch {}
  };

  // Cargar auditoría de votos de mesas para la actuación actual
  const fetchPerformancePublicVotes = async (contestId: string, performanceId?: string | null) => {
    if (!performanceId) {
      setPublicVotesAudit(null);
      return;
    }
    try {
      const res = await fetch(`/api/v1/contest/${contestId}/vote/public?performanceId=${performanceId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setPublicVotesAudit(json.data);
      }
    } catch {}
  };

  // Cargar auditoría global de mesas de todo el certamen
  const fetchGlobalTableVotes = async (contestId: string) => {
    try {
      const res = await fetch(`/api/v1/contest/${contestId}/vote/public`);
      const json = await res.json();
      if (res.ok && json.success) {
        setGlobalTableVotes(json.data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchContests();
  }, []);

  useEffect(() => {
    if (selectedContestId) {
      fetchContestDetail(selectedContestId);
      fetchReports(selectedContestId);
      fetchGlobalTableVotes(selectedContestId);
    }
  }, [selectedContestId]);

  useEffect(() => {
    if (selectedContestId && contest?.currentPerformance?.id) {
      fetchPerformancePublicVotes(selectedContestId, contest.currentPerformance.id);
    }
  }, [selectedContestId, contest?.currentPerformance?.id]);

  // Escuchar eventos en vivo
  useRealtime({
    eventId: contest?.id ? `contest:${contest.id}` : "",
    onEvent: (type: RealtimeEventType, payload: any) => {
      if (selectedContestId) {
        if (type === "CONTEST_VOTE_UPDATE") {
          fetchContestDetail(selectedContestId);
          fetchReports(selectedContestId);
          fetchGlobalTableVotes(selectedContestId);
          if (payload?.performanceId) {
            fetchPerformancePublicVotes(selectedContestId, payload.performanceId);
          }
          if (payload?.isPublicVote) {
            showFeedback("info", `🗳️ Voto desde ${payload?.tableLabel || "Mesa"}: ${payload?.stars}⭐`);
          } else {
            showFeedback("info", `🗳️ Jurado ${payload?.judgeName || ""} emitió su calificación.`);
          }
        } else if (type === "CONTEST_STAGE_CHANGE" || type === "CONTEST_PERFORMANCE_UPDATE") {
          fetchContestDetail(selectedContestId);
          fetchReports(selectedContestId);
          fetchGlobalTableVotes(selectedContestId);
        }
      }
    },
  });

  // Acciones sobre la Actuación en Escenario
  const handlePerformanceAction = async (
    performanceId: string,
    action: "CALL_TO_STAGE" | "OPEN_VOTING" | "CLOSE_VOTING" | "REVEAL_SCORES" | "TRIGGER_GOLDEN_BUZZER"
  ) => {
    if (!contest) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/contest/${contest.id}/performances`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ performanceId, action }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showFeedback("success", json.message || "Acción ejecutada con éxito");
        fetchContestDetail(contest.id);
        fetchReports(contest.id);
      } else {
        showFeedback("error", json.error || "Error en la acción");
      }
    } catch {
      showFeedback("error", "Error de conexión");
    } finally {
      setActionLoading(false);
    }
  };

  // Crear Nuevo Concurso
  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContestForm),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showFeedback("success", json.message);
        setShowNewContestModal(false);
        await fetchContests();
        if (json.data?.id) setSelectedContestId(json.data.id);
      } else {
        showFeedback("error", json.error || "No se pudo crear el certamen");
      }
    } catch {
      showFeedback("error", "Error de conexión al crear concurso");
    } finally {
      setActionLoading(false);
    }
  };

  // Inscribir Participante
  const handleRegisterParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contest) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/contest/${contest.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newParticipantForm,
          stageId: contest.activeStageId,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showFeedback("success", json.message);
        setShowNewParticipantModal(false);
        setNewParticipantForm({
          name: "",
          stageName: "",
          tableLabel: "Mesa 1",
          initialSongTitle: "",
          initialArtistName: "",
        });
        fetchContestDetail(contest.id);
      } else {
        showFeedback("error", json.error || "No se pudo registrar participante");
      }
    } catch {
      showFeedback("error", "Error de conexión");
    } finally {
      setActionLoading(false);
    }
  };

  // Crear Nuevo Jurado
  const handleCreateJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contest) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/contest/${contest.id}/judges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newJudgeForm.name.trim(),
          title: newJudgeForm.title.trim() || "Jurado Oficial",
          accessPin: newJudgeForm.accessPin ? newJudgeForm.accessPin.trim() : null,
          canGoldenBuzzer: newJudgeForm.canGoldenBuzzer,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showFeedback("success", json.message || "Jurado agregado con éxito");
        setShowNewJudgeModal(false);
        setNewJudgeForm({
          name: "",
          title: "Vocal Coach / Productor",
          accessPin: "",
          canGoldenBuzzer: true,
        });
        fetchContestDetail(contest.id);
        fetchReports(contest.id);
      } else {
        showFeedback("error", json.error || "No se pudo agregar al jurado");
      }
    } catch {
      showFeedback("error", "Error de conexión al agregar jurado");
    } finally {
      setActionLoading(false);
    }
  };

  // Abrir Modal de Edición de Jurado
  const handleOpenEditJudge = (judge: ContestJudge) => {
    setEditingJudge(judge);
    setEditJudgeForm({
      name: judge.name,
      title: judge.title || "",
      accessPin: judge.accessPin,
      canGoldenBuzzer: judge.canGoldenBuzzer ?? true,
      active: true,
    });
  };

  // Guardar Cambios del Jurado
  const handleUpdateJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contest || !editingJudge) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/contest/${contest.id}/judges`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judgeId: editingJudge.id,
          name: editJudgeForm.name.trim(),
          title: editJudgeForm.title.trim() || "Jurado Oficial",
          accessPin: editJudgeForm.accessPin.trim(),
          canGoldenBuzzer: editJudgeForm.canGoldenBuzzer,
          active: editJudgeForm.active,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showFeedback("success", json.message || "Jurado actualizado con éxito");
        setEditingJudge(null);
        fetchContestDetail(contest.id);
        fetchReports(contest.id);
      } else {
        showFeedback("error", json.error || "No se pudo actualizar el jurado");
      }
    } catch {
      showFeedback("error", "Error de conexión al actualizar jurado");
    } finally {
      setActionLoading(false);
    }
  };

  // Eliminar Jurado del Certamen
  const handleDeleteJudge = async (judge: ContestJudge) => {
    if (!contest) return;
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar al jurado "${judge.name}"?\nEsta acción retirará su acceso y permisos en este certamen.`
    );
    if (!confirmDelete) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/contest/${contest.id}/judges?judgeId=${judge.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showFeedback("success", json.message || "Jurado eliminado");
        fetchContestDetail(contest.id);
        fetchReports(contest.id);
      } else {
        showFeedback("error", json.error || "No se pudo eliminar el jurado");
      }
    } catch {
      showFeedback("error", "Error de conexión al eliminar jurado");
    } finally {
      setActionLoading(false);
    }
  };

  // Crear Nuevo Criterio de Evaluación
  const handleCreateCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contest) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/contest/${contest.id}/criteria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCriteriaForm.name.trim(),
          description: newCriteriaForm.description.trim() || null,
          maxScore: Number(newCriteriaForm.maxScore),
          weight: Number(newCriteriaForm.weight),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showFeedback("success", json.message || "Criterio añadido con éxito");
        setShowNewCriteriaModal(false);
        setNewCriteriaForm({
          name: "",
          description: "",
          maxScore: 10,
          weight: 1.0,
        });
        fetchContestDetail(contest.id);
        fetchReports(contest.id);
      } else {
        showFeedback("error", json.error || "No se pudo agregar el criterio");
      }
    } catch {
      showFeedback("error", "Error de conexión al agregar criterio");
    } finally {
      setActionLoading(false);
    }
  };

  // Abrir Modal de Edición de Criterio
  const handleOpenEditCriteria = (criteria: ContestCriteria) => {
    setEditingCriteria(criteria);
    setEditCriteriaForm({
      name: criteria.name,
      description: criteria.description || "",
      maxScore: criteria.maxScore,
      weight: criteria.weight,
      active: criteria.active ?? true,
    });
  };

  // Guardar Cambios de Criterio
  const handleUpdateCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contest || !editingCriteria) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/contest/${contest.id}/criteria`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criteriaId: editingCriteria.id,
          name: editCriteriaForm.name.trim(),
          description: editCriteriaForm.description.trim() || null,
          maxScore: Number(editCriteriaForm.maxScore),
          weight: Number(editCriteriaForm.weight),
          active: editCriteriaForm.active,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showFeedback("success", json.message || "Criterio actualizado con éxito");
        setEditingCriteria(null);
        fetchContestDetail(contest.id);
        fetchReports(contest.id);
      } else {
        showFeedback("error", json.error || "No se pudo actualizar el criterio");
      }
    } catch {
      showFeedback("error", "Error de conexión al actualizar criterio");
    } finally {
      setActionLoading(false);
    }
  };

  // Eliminar Criterio del Certamen
  const handleDeleteCriteria = async (criteria: ContestCriteria) => {
    if (!contest) return;
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar el criterio "${criteria.name}"?\nLos jurados ya no lo tendrán disponible para evaluar las siguientes actuaciones.`
    );
    if (!confirmDelete) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/contest/${contest.id}/criteria?criteriaId=${criteria.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showFeedback("success", json.message || "Criterio eliminado");
        fetchContestDetail(contest.id);
        fetchReports(contest.id);
      } else {
        showFeedback("error", json.error || "No se pudo eliminar el criterio");
      }
    } catch {
      showFeedback("error", "Error de conexión al eliminar criterio");
    } finally {
      setActionLoading(false);
    }
  };

  // Cargar Canción Directamente en la Consola DJ / Karaoke
  const handleSendToDjBooth = (perf: ContestPerformance) => {
    const queuePayload = {
      track: {
        id: `contest-${perf.id}`,
        title: perf.songTitle,
        artist: perf.artistName,
        fileUrl: perf.youtubeVideoId
          ? `https://www.youtube.com/watch?v=${perf.youtubeVideoId}`
          : perf.fileUrl || null,
        durationSeconds: 210,
        genre: "Concurso Karaoke",
      },
      targetDeck: "AUTO",
      timestamp: Date.now(),
    };

    localStorage.setItem("vidjs_library_deck_load", JSON.stringify(queuePayload));
    showFeedback(
      "success",
      `🎛️ "${perf.songTitle}" enviada a la cabina DJ (Listo para Play en Bandeja)`
    );
  };

  const activeStage = contest?.stages.find((s) => s.id === contest.activeStageId) || contest?.stages[0];
  const activePerformances = activeStage?.performances || [];
  const currentPerformance = contest?.currentPerformance;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ============================================================ */}
      {/* 1. TOP HEADER DEL CAMPEONATO & SELECTOR                      */}
      {/* ============================================================ */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/80 border border-zinc-800 p-5 rounded-3xl shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center text-zinc-950 shadow-xl shadow-amber-500/20">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {contest?.name || "Concurso de Karaoke Pro"}
              </h1>
              {contest && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/40">
                  {contest.code}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-medium">
              Gestión multidía, jurados móviles, votación en vivo, pantalla gigante y actas oficiales.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Selector de Concurso */}
          {contests.length > 1 && (
            <select
              value={selectedContestId || ""}
              onChange={(e) => setSelectedContestId(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 text-white text-xs font-bold px-3 py-2.5 rounded-xl outline-none"
            >
              {contests.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          )}

          {/* Botón Nuevo Concurso */}
          <button
            onClick={() => setShowNewContestModal(true)}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Nuevo Certamen</span>
          </button>

          {/* Botón Abrir Pantalla Gigante / TV Concurso */}
          {contest && (
            <Link
              href={`/display/${contest.code}/contest`}
              target="_blank"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
            >
              <Tv className="w-4 h-4" />
              <span>Pantalla TV Show</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </header>

      {/* Alerta de Feedback flotante */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-xl transition-all ${
            feedbackMsg.type === "success"
              ? "bg-emerald-950/90 border border-emerald-500 text-emerald-200"
              : feedbackMsg.type === "error"
              ? "bg-red-950/90 border border-red-500 text-red-200"
              : "bg-blue-950/90 border border-blue-500 text-blue-200"
          }`}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. PESTAÑAS DE NAVEGACIÓN                                    */}
      {/* ============================================================ */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto">
        {[
          { id: "stage", label: "Control de Escenario en Vivo", icon: Flame },
          { id: "tableVotes", label: `Votos de Mesas (${globalTableVotes?.totalVotes || 0})`, icon: QrCode },
          { id: "participants", label: `Cantantes (${contest?.participants.length || 0})`, icon: Users },
          { id: "stages", label: `Fechas / Galas (${contest?.stages.length || 0})`, icon: Calendar },
          { id: "criteria", label: `Criterios (${contest?.criteria.length || 0})`, icon: Sliders },
          { id: "judges", label: `Mesa de Jurados (${contest?.judges.length || 0})`, icon: Award },
          { id: "reports", label: "Actas e Informes Oficiales", icon: FileText },
          { id: "diplomas", label: "Generador de Diplomas", icon: Trophy },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? "bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 scale-[1.02]"
                  : "bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* PESTAÑA 1: CONTROL DE ESCENARIO EN VIVO                      */}
      {/* ============================================================ */}
      {activeTab === "stage" && (
        <div className="space-y-6">
          {/* Selector de Gala Activa */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold text-zinc-300">Gala / Fecha en Curso:</span>
              <span className="text-xs font-black text-amber-400 px-3 py-1 rounded-xl bg-zinc-950 border border-zinc-800">
                {activeStage?.title || "Sin fecha activa"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewParticipantModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Inscribir Cantante a Esta Gala</span>
              </button>
            </div>
          </div>

          {/* TARJETA HERO: CANTANTE ACTUALMENTE EN ESCENARIO */}
          {currentPerformance ? (
            <div className="bg-gradient-to-r from-zinc-900 via-amber-950/20 to-zinc-900 border-2 border-amber-500/60 p-6 rounded-3xl shadow-2xl space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                    {currentPerformance.status === "VOTING_OPEN"
                      ? "VOTACIÓN EN CURSO (JURADOS CALIFICANDO)"
                      : currentPerformance.status === "REVEALED"
                      ? "PUNTAJES REVELADOS EN PANTALLA"
                      : "CANTANTE EN ESCENARIO"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {currentPerformance.participant.tableLabel && (
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {currentPerformance.participant.tableLabel}
                    </span>
                  )}
                  <span className="text-xs font-mono font-bold text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
                    Total: {currentPerformance.totalScore} pts
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white font-black text-3xl shadow-2xl shrink-0 overflow-hidden">
                  {currentPerformance.participant.photoUrl ? (
                    <img
                      src={currentPerformance.participant.photoUrl}
                      alt={currentPerformance.participant.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    currentPerformance.participant.name.charAt(0)
                  )}
                </div>

                <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                  <h3 className="text-2xl sm:text-3xl font-black text-white truncate">
                    {currentPerformance.participant.stageName || currentPerformance.participant.name}
                  </h3>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-amber-300 font-bold">
                    <Mic className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      "{currentPerformance.songTitle}" &bull; {currentPerformance.artistName}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Votos de jurados recibidos:{" "}
                    <strong className="text-white">
                      {currentPerformance.judgeScores?.length || 0} de {contest?.judges.length || 0}
                    </strong>
                  </p>
                </div>

                {/* BOTÓN RÁPIDO CARGAR EN CABINA DJ */}
                <button
                  onClick={() => handleSendToDjBooth(currentPerformance)}
                  className="px-5 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-purple-300 hover:text-purple-200 text-xs font-black flex items-center gap-2 shadow-lg transition-all cursor-pointer whitespace-nowrap"
                  title="Carga la canción automáticamente en la consola de DJ o Karaoke"
                >
                  <Disc3 className="w-4 h-4 text-purple-400 animate-spin [animation-duration:4s]" />
                  <span>Cargar en Bandeja DJ</span>
                </button>
              </div>

              {/* BOTONERA DE CONTROL DE LA GALA */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-zinc-800/80">
                {/* 1. Abrir Votación */}
                <button
                  onClick={() => handlePerformanceAction(currentPerformance.id, "OPEN_VOTING")}
                  disabled={actionLoading || currentPerformance.status === "VOTING_OPEN"}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Abrir Votación</span>
                </button>

                {/* 2. Cerrar Votación */}
                <button
                  onClick={() => handlePerformanceAction(currentPerformance.id, "CLOSE_VOTING")}
                  disabled={actionLoading || currentPerformance.status === "VOTING_CLOSED"}
                  className="py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>Cerrar Votación</span>
                </button>

                {/* 3. Revelar en Pantalla */}
                <button
                  onClick={() => handlePerformanceAction(currentPerformance.id, "REVEAL_SCORES")}
                  disabled={actionLoading}
                  className="py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Revelar en TV</span>
                </button>

                {/* 4. Golden Buzzer */}
                <button
                  onClick={() => handlePerformanceAction(currentPerformance.id, "TRIGGER_GOLDEN_BUZZER")}
                  disabled={actionLoading}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-500/30 cursor-pointer"
                >
                  <Crown className="w-4 h-4" />
                  <span>Golden Buzzer</span>
                </button>
              </div>

              {/* Monitor de Votación de Jurados en Tiempo Real */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Estado de la Mesa de Jurados:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {contest?.judges.map((j) => {
                    const score = currentPerformance.judgeScores?.find((s) => s.judgeId === j.id);
                    return (
                      <div
                        key={j.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between ${
                          score
                            ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                            : "bg-zinc-950/60 border-zinc-800 text-zinc-500"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                              score ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {j.name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">{j.name}</span>
                            <span className="text-[10px] text-zinc-400">{j.title}</span>
                          </div>
                        </div>

                        <div>
                          {score ? (
                            <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                              {score.totalScore} pts ✓
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-medium text-amber-400 animate-pulse">
                              Calificando...
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Monitor de Votación de Mesas y Clientes en Tiempo Real */}
              <div className="space-y-3 pt-4 border-t border-zinc-800/80">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      🗳️ Votación de Mesas en Vivo ({publicVotesAudit?.totalVotes ?? currentPerformance.publicVotes?.length ?? 0} celulares):
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                      Promedio: {publicVotesAudit?.avgStars ?? currentPerformance.publicScore ?? 0} / 5.0 ⭐
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPublicVotesModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <span>🔍 Auditar Votos de Mesas</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("tableVotes")}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ver Resumen de Mesas</span>
                    </button>
                  </div>
                </div>

                {publicVotesAudit?.votesByTable && publicVotesAudit.votesByTable.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {publicVotesAudit.votesByTable.map((t) => (
                      <div
                        key={t.tableLabel}
                        className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between"
                      >
                        <div className="truncate">
                          <span className="text-xs font-bold text-white block truncate">
                            {t.tableLabel}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {t.votersCount} {t.votersCount === 1 ? "voto" : "votos"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-amber-400 flex items-center gap-0.5 justify-end">
                            {t.avgStars}{" "}
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                          </span>
                          {t.cheerCount > 0 && (
                            <span className="text-[9px] text-pink-400 font-bold block">
                              +{t.cheerCount} ánimos
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-zinc-950/40 border border-zinc-800/60 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                    <QrCode className="w-4 h-4 text-zinc-600" />
                    <span>Esperando votos del público de las mesas para esta presentación...</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center space-y-3">
              <Mic className="w-10 h-10 mx-auto text-amber-400/60" />
              <h3 className="text-base font-bold text-white">No hay ningún cantante en escenario actualmente</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Selecciona a un cantante de la lista de actuaciones a continuación y haz clic en "Llamar al Escenario".
              </p>
            </div>
          )}

          {/* LISTA DE ACTUACIONES DE LA GALA */}
          <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Orden de Actuaciones de la Gala ({activePerformances.length})</span>
              </h3>
            </div>

            {activePerformances.length > 0 ? (
              <div className="space-y-2.5">
                {activePerformances.map((perf, index) => (
                  <div
                    key={perf.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      perf.status === "ON_STAGE" || perf.status === "VOTING_OPEN"
                        ? "bg-amber-950/30 border-amber-500/60 shadow-lg"
                        : "bg-zinc-950/70 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">
                            {perf.participant.stageName || perf.participant.name}
                          </h4>
                          {perf.participant.tableLabel && (
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                              {perf.participant.tableLabel}
                            </span>
                          )}
                          {perf.isGoldenBuzzer && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-yellow-500/20 text-yellow-300">
                              ★ GOLDEN BUZZER
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-amber-300 font-medium">
                          "{perf.songTitle}" &bull; {perf.artistName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {perf.totalScore > 0 && (
                        <span className="text-xs font-mono font-black text-yellow-300 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-700">
                          {perf.totalScore} pts
                        </span>
                      )}

                      <button
                        onClick={() => handlePerformanceAction(perf.id, "CALL_TO_STAGE")}
                        disabled={actionLoading || perf.status === "ON_STAGE"}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Llamar al Escenario</span>
                      </button>

                      <button
                        onClick={() => handleSendToDjBooth(perf)}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-purple-300 border border-zinc-700 transition-colors cursor-pointer"
                        title="Cargar pista en consola DJ"
                      >
                        <Disc3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-zinc-500 text-xs">
                No hay cantantes programados para esta gala. Usa el botón "+ Inscribir Cantante" para comenzar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PESTAÑA: MONITOR Y AUDITORÍA DE VOTOS DE MESAS                */}
      {/* ============================================================ */}
      {activeTab === "tableVotes" && (
        <div className="space-y-6">
          {/* Cabecera y Resumen */}
          <div className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-amber-400" />
                  <span>Auditoría de Votos de Mesas y Clientes</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Control en tiempo real de calificaciones emitidas por los comensales presentes con validación estricta de código QR
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectedContestId && fetchGlobalTableVotes(selectedContestId)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Actualizar Votos</span>
                </button>
              </div>
            </div>

            {/* Tarjetas Métricas Rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Total Votos de Mesas
                </span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {globalTableVotes?.totalVotes || 0}
                </span>
                <span className="text-[10px] text-zinc-500">Emitidos desde celulares</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Promedio de Estrellas
                </span>
                <span className="text-2xl font-black text-amber-400 mt-1 block flex items-center gap-1">
                  ⭐ {globalTableVotes?.avgStars || 0}
                </span>
                <span className="text-[10px] text-zinc-500">De un máximo de 5.0</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Mesas Participantes
                </span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {globalTableVotes?.byTable?.length || 0}
                </span>
                <span className="text-[10px] text-zinc-500">Mesas con votos válidos</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Seguridad y Presencia
                </span>
                <span className="text-sm font-black text-emerald-400 mt-1 block flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  100% Verificado
                </span>
                <span className="text-[10px] text-emerald-500/80">Solo comensales en el local</span>
              </div>
            </div>
          </div>

          {/* Actuación actual en escenario y sus votos */}
          {currentPerformance && (
            <div className="bg-gradient-to-r from-amber-950/20 via-zinc-900 to-zinc-900 border border-amber-500/40 p-5 rounded-3xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Votación para Cantante en Escenario Ahora
                  </span>
                </div>
                <button
                  onClick={() => setShowPublicVotesModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>🔍 Ver Todos los Votos Detallados</span>
                </button>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800">
                <div>
                  <h4 className="text-lg font-black text-white">
                    {currentPerformance.participant.stageName || currentPerformance.participant.name}
                  </h4>
                  <p className="text-xs text-amber-300 font-bold">
                    "{currentPerformance.songTitle}" &bull; {currentPerformance.artistName}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block">Votos Recibidos</span>
                    <span className="text-base font-black text-white font-mono">
                      {publicVotesAudit?.totalVotes || currentPerformance.publicVotes?.length || 0}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block">Promedio Estrellas</span>
                    <span className="text-base font-black text-amber-400 font-mono">
                      ⭐ {publicVotesAudit?.avgStars || currentPerformance.publicScore || 0} / 5
                    </span>
                  </div>
                </div>
              </div>

              {publicVotesAudit?.votesByTable && publicVotesAudit.votesByTable.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {publicVotesAudit.votesByTable.map((t) => (
                    <div
                      key={t.tableLabel}
                      className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-white block">{t.tableLabel}</span>
                        <span className="text-[10px] text-zinc-400">
                          {t.votersCount} {t.votersCount === 1 ? "comensal" : "comensales"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-amber-400">
                          {t.avgStars} ⭐
                        </span>
                        {t.cheerCount > 0 && (
                          <span className="text-[9px] text-pink-400 font-bold block">
                            +{t.cheerCount} vitoreos
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-2xl border border-zinc-800/60">
                  Esperando las calificaciones de las mesas para este tema...
                </div>
              )}
            </div>
          )}

          {/* Tabla Consolidada de Todas las Mesas */}
          <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-3xl space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Participación Acumulada por Mesa</span>
            </h4>

            {globalTableVotes?.byTable && globalTableVotes.byTable.length > 0 ? (
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-mono uppercase text-[10px]">
                      <th className="py-3 px-4">Posición / Mesa</th>
                      <th className="py-3 px-4 text-center">Votos Emitidos</th>
                      <th className="py-3 px-4 text-center">Promedio Calificación</th>
                      <th className="py-3 px-4 text-center">Aplausos & Vitoreos</th>
                      <th className="py-3 px-4 text-right">Validación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-medium">
                    {globalTableVotes.byTable.map((t, idx) => (
                      <tr key={t.tableLabel} className="hover:bg-zinc-900/50">
                        <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center font-mono text-xs text-amber-400 font-black">
                            {idx + 1}
                          </span>
                          <span className="text-sm">{t.tableLabel}</span>
                          {idx === 0 && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              🔥 Más Activa
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-zinc-200">
                          {t.totalVotes} {t.totalVotes === 1 ? "voto" : "votos"}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-400">
                          ⭐ {t.avgStars} / 5.0
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-pink-400 font-bold">
                          +{t.cheerCount}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-emerald-400 font-mono text-[11px] font-bold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>QR Verificado</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-2xl border border-zinc-800/60">
                Aún no hay votos registrados de mesas en este concurso.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PESTAÑA 2: LISTA DE PARTICIPANTES INSCRITOS                  */}
      {/* ============================================================ */}
      {activeTab === "participants" && contest && (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Participantes Registrados en el Certamen ({contest.participants.length})
              </h3>
              <p className="text-xs text-zinc-400">
                Puntuaciones acumulativas a través de todas las fechas y galas
              </p>
            </div>
            <button
              onClick={() => setShowNewParticipantModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Inscribir Nuevo Cantante</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
            {contest.participants.map((p, idx) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white font-black text-lg overflow-hidden shrink-0">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      p.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black text-white truncate">
                      {p.stageName || p.name}
                    </h4>
                    {p.stageName && (
                      <p className="text-[11px] text-zinc-400 truncate">{p.name}</p>
                    )}
                    {p.tableLabel && (
                      <span className="text-[10px] text-amber-400 font-bold">{p.tableLabel}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black font-mono text-yellow-300">
                      {p.totalPoints} pts
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/80">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === "QUALIFIED"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : p.status === "ELIMINATED"
                        ? "bg-red-500/20 text-red-300"
                        : p.status === "WINNER"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {p.status}
                  </span>
                  <span className="text-[11px] text-zinc-500">Ranking: #{idx + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PESTAÑA 3: GESTIÓN DE GALAS MULTIDÍA                         */}
      {/* ============================================================ */}
      {activeTab === "stages" && contest && (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Fechas y Rondas del Concurso Multidía
              </h3>
              <p className="text-xs text-zinc-400">
                Organiza galas por días o semanas (Audiciones, Semifinal, Gran Final)
              </p>
            </div>
            <button
              onClick={() => setShowNewStageModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nueva Fecha / Gala</span>
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {contest.stages.map((st, i) => (
              <div
                key={st.id}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  st.id === contest.activeStageId
                    ? "bg-amber-950/30 border-amber-500/60 shadow-lg"
                    : "bg-zinc-950 border-zinc-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-zinc-800 text-amber-400 font-mono font-bold text-xs flex items-center justify-center">
                    G{i + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-white">{st.title}</h4>
                      {st.id === contest.activeStageId && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                          ACTIVA EN VIVO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">
                      Tipo: {st.stageType} &bull; Estado: {st.status} &bull;{" "}
                      {st.performances?.length || 0} actuaciones
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {st.id !== contest.activeStageId && (
                    <button
                      onClick={async () => {
                        await fetch(`/api/v1/contest/${contest.id}/stages`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ stageId: st.id, setActive: true, status: "LIVE" }),
                        });
                        fetchContestDetail(contest.id);
                        showFeedback("success", `Gala "${st.title}" fijada como activa.`);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors cursor-pointer"
                    >
                      Activar Esta Gala
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PESTAÑA 4: CRITERIOS EDITABLES                               */}
      {/* ============================================================ */}
      {activeTab === "criteria" && contest && (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Criterios de Evaluación Editables
              </h3>
              <p className="text-xs text-zinc-400">
                Estos criterios aparecen en los celulares de los jurados y se proyectan en la pantalla grande
              </p>
            </div>
            <button
              onClick={() => setShowNewCriteriaModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Criterio</span>
            </button>
          </div>

          {contest.criteria.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
              {contest.criteria.map((c) => (
                <div
                  key={c.id}
                  className="p-5 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-3 shadow-xl hover:border-zinc-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-white">{c.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            Max: {c.maxScore} pts
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400">
                            Ponderación: x{c.weight}
                          </span>
                        </div>
                      </div>

                      {/* Botones de acción rápida: Editar y Eliminar */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCriteria(c)}
                          className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 border border-zinc-800 transition-colors cursor-pointer"
                          title="Editar criterio"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCriteria(c)}
                          className="p-2 rounded-xl bg-zinc-900 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 border border-zinc-800 transition-colors cursor-pointer"
                          title="Eliminar criterio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {c.description ? (
                      <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/80">
                        {c.description}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-600 italic">Sin descripción complementaria</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-zinc-950/60 border border-zinc-800 text-center space-y-3">
              <Sliders className="w-10 h-10 mx-auto text-amber-400/60" />
              <h4 className="text-sm font-bold text-white">No hay criterios de evaluación configurados</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Define criterios como afinación, ritmo, carisma o dificultad vocal para que los jurados emitan sus notas.
              </p>
              <button
                onClick={() => setShowNewCriteriaModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>+ Agregar Primer Criterio</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* PESTAÑA 5: MESA DE JURADOS                                   */}
      {/* ============================================================ */}
      {activeTab === "judges" && contest && (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Mesa Oficial de Jurados ({contest.judges.length})
              </h3>
              <p className="text-xs text-zinc-400">
                Cada jurado puede calificar desde su propio smartphone o tablet usando su PIN de acceso
              </p>
            </div>
            <button
              onClick={() => setShowNewJudgeModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Agregar Jurado</span>
            </button>
          </div>

          {contest.judges.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {contest.judges.map((j) => {
                const accessUrl = typeof window !== "undefined"
                  ? `${window.location.origin}/judge/${contest.code}?pin=${j.accessPin}`
                  : `/judge/${contest.code}?pin=${j.accessPin}`;

                return (
                  <div
                    key={j.id}
                    className="p-5 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-xl hover:border-zinc-700 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-zinc-950 font-black text-lg shadow-md shrink-0">
                            {j.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black text-white truncate">{j.name}</h4>
                            <span className="text-[11px] text-zinc-400 block truncate">
                              {j.title || "Jurado Oficial"}
                            </span>
                          </div>
                        </div>

                        {/* Botones de acción rápida: Editar y Eliminar */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditJudge(j)}
                            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 border border-zinc-800 transition-colors cursor-pointer"
                            title="Editar jurado"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteJudge(j)}
                            className="p-2 rounded-xl bg-zinc-900 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 border border-zinc-800 transition-colors cursor-pointer"
                            title="Eliminar jurado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                        <span className="text-xs text-zinc-400 font-medium">PIN de Acceso Móvil:</span>
                        <span className="text-lg font-mono font-black text-amber-300 tracking-widest px-2.5 py-0.5 rounded-lg bg-zinc-950 border border-zinc-700">
                          {j.accessPin}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                        <span>Golden Buzzer:</span>
                        <span className={`font-bold ${j.canGoldenBuzzer ? "text-yellow-400" : "text-zinc-600"}`}>
                          {j.canGoldenBuzzer ? "👑 Habilitado" : "❌ Deshabilitado"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-900">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(accessUrl);
                          showFeedback("success", `¡Enlace copiado para ${j.name}!`);
                        }}
                        className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Link</span>
                      </button>

                      <button
                        onClick={() =>
                          setShowQrModal({
                            url: accessUrl,
                            title: `Acceso Móvil: ${j.name}`,
                            pin: j.accessPin,
                          })
                        }
                        className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Mostrar QR</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-zinc-950/60 border border-zinc-800 text-center space-y-3">
              <Award className="w-10 h-10 mx-auto text-amber-400/60" />
              <h4 className="text-sm font-bold text-white">No hay jurados registrados</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Agrega jurados oficiales para que califiquen a los participantes desde sus propios celulares o tablets.
              </p>
              <button
                onClick={() => setShowNewJudgeModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>+ Agregar Primer Jurado</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* PESTAÑA 6: REPORTES E INFORMES OFICIALES                     */}
      {/* ============================================================ */}
      {activeTab === "reports" && reportData && (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <span>Acta Oficial y Planilla de Puntuaciones</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Informe listo para imprimir, archivar o exportar a Excel
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Acta Oficial</span>
              </button>
            </div>
          </div>

          {/* Tabla Imprimible del Acta */}
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-x-auto p-4 space-y-4">
            <div className="text-center py-2 border-b border-zinc-800 space-y-1">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                {reportData.contest.name}
              </h2>
              <p className="text-xs text-zinc-400">
                Establecimiento: {reportData.contest.tenantName} &bull; Código: {reportData.contest.code}
              </p>
            </div>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3">Puesto</th>
                  <th className="py-2.5 px-3">Participante</th>
                  <th className="py-2.5 px-3">Canción & Artista</th>
                  <th className="py-2.5 px-3">Gala</th>
                  <th className="py-2.5 px-3 text-right">Nota Jurado</th>
                  <th className="py-2.5 px-3 text-right">Voto Público</th>
                  <th className="py-2.5 px-3 text-right">Puntaje Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {reportData.leaderboard.map((row: any) => (
                  <tr key={row.rank} className="hover:bg-zinc-900/50">
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">
                      {row.rank === 1 ? "🥇 1°" : row.rank === 2 ? "🥈 2°" : row.rank === 3 ? "🥉 3°" : `${row.rank}°`}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      {row.stageName} {row.name !== row.stageName && `(${row.name})`}
                    </td>
                    <td className="py-3 px-3 text-zinc-300">
                      "{row.songTitle}" - {row.artistName}
                    </td>
                    <td className="py-3 px-3 text-zinc-400">{row.stageTitle}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-zinc-200">
                      {row.judgeScore}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-400">
                      {row.publicScore}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-amber-300 text-sm">
                      {row.totalScore} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tabla de Auditoría y Participación Popular por Mesa */}
          {reportData?.stats?.tableStats && reportData.stats.tableStats.length > 0 && (
            <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-amber-400" />
                    <span>Auditoría de Participación y Votos por Mesa</span>
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Registro consolidado de todas las mesas del local que participaron en las votaciones
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>100% Presencia en Local Verificada por QR</span>
                </span>
              </div>

              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">Mesa / Ubicación</th>
                    <th className="py-2.5 px-3 text-center">Votos Emitidos</th>
                    <th className="py-2.5 px-3 text-center">Promedio Calificación Otorgada</th>
                    <th className="py-2.5 px-3 text-center">Aplausos / Ánimos</th>
                    <th className="py-2.5 px-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {reportData.stats.tableStats.map((table: any, idx: number) => (
                    <tr key={table.tableLabel} className="hover:bg-zinc-900/50">
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center font-mono text-[10px] text-amber-400">
                          {idx + 1}
                        </span>
                        <span>{table.tableLabel}</span>
                        {idx === 0 && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            🔥 Más Participativa
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-zinc-200">
                        {table.totalVotes} votos
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">
                        ⭐ {table.avgStars} / 5.0
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-pink-400">
                        +{table.cheerCount}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-400 text-[11px]">
                        ✓ En Local (QR OK)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* PESTAÑA 7: GENERADOR DE DIPLOMAS                             */}
      {/* ============================================================ */}
      {activeTab === "diplomas" && reportData && (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span>Certificados y Diplomas de Premiación</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Genera diplomas de gala con membrete listos para imprimir o entregar en papel a los ganadores
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reportData.leaderboard.slice(0, 3).map((winner: any, i: number) => {
              const title = i === 0 ? "1ER PUESTO &bull; CAMPEÓN" : i === 1 ? "2DO PUESTO" : "3ER PUESTO";
              const border = i === 0 ? "border-yellow-400" : i === 1 ? "border-slate-300" : "border-amber-600";
              const text = i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : "text-amber-500";

              return (
                <div
                  key={winner.rank}
                  className={`p-6 rounded-3xl bg-zinc-950 border-2 ${border} text-center space-y-4 shadow-2xl relative overflow-hidden`}
                >
                  <div className="w-14 h-14 mx-auto rounded-full bg-zinc-900 flex items-center justify-center text-2xl shadow-inner">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                  </div>

                  <div className="space-y-1">
                    <span className={`text-[10px] font-mono font-black tracking-widest uppercase ${text}`}>
                      {title}
                    </span>
                    <h4 className="text-lg font-black text-white">{winner.stageName}</h4>
                    <p className="text-xs text-zinc-400 italic">
                      "{winner.songTitle}" - {winner.artistName}
                    </p>
                    <p className="text-xs font-mono font-black text-amber-300 pt-1">
                      Puntuación Oficial: {winner.totalScore} pts
                    </p>
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Diploma</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: NUEVO CONCURSO                                        */}
      {/* ============================================================ */}
      {showNewContestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Crear Nuevo Campeonato de Karaoke</span>
              </h3>
              <button
                onClick={() => setShowNewContestModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nombre del Certamen</label>
                <input
                  type="text"
                  required
                  value={newContestForm.name}
                  onChange={(e) => setNewContestForm({ ...newContestForm, name: e.target.value })}
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs font-bold outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Descripción / Reglamento Breve</label>
                <textarea
                  rows={2}
                  value={newContestForm.description}
                  onChange={(e) => setNewContestForm({ ...newContestForm, description: e.target.value })}
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Modo de Puntuación</label>
                  <select
                    value={newContestForm.scoringMode}
                    onChange={(e) => setNewContestForm({ ...newContestForm, scoringMode: e.target.value })}
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs font-bold outline-none"
                  >
                    <option value="AVERAGE">Promedio Simple</option>
                    <option value="OLYMPIC">Olímpico (Descarta max y min)</option>
                    <option value="SUM">Suma Total de Puntos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Voto del Público (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={newContestForm.publicVoteWeight}
                    onChange={(e) => setNewContestForm({ ...newContestForm, publicVoteWeight: Number(e.target.value) })}
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewContestModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-lg shadow-amber-500/25"
                >
                  {actionLoading ? "Creando..." : "Crear Concurso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: INSCRIBIR PARTICIPANTE                                */}
      {/* ============================================================ */}
      {showNewParticipantModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Mic className="w-5 h-5 text-amber-400" />
                <span>Inscribir Cantante en el Concurso</span>
              </h3>
              <button onClick={() => setShowNewParticipantModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterParticipant} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Laura Méndez"
                  value={newParticipantForm.name}
                  onChange={(e) => setNewParticipantForm({ ...newParticipantForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nombre Artístico (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Laurita Rock"
                  value={newParticipantForm.stageName}
                  onChange={(e) => setNewParticipantForm({ ...newParticipantForm, stageName: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Canción a Cantar *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: De Música Ligera"
                    value={newParticipantForm.initialSongTitle}
                    onChange={(e) => setNewParticipantForm({ ...newParticipantForm, initialSongTitle: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Artista Original</label>
                  <input
                    type="text"
                    placeholder="Ej: Soda Stereo"
                    value={newParticipantForm.initialArtistName}
                    onChange={(e) => setNewParticipantForm({ ...newParticipantForm, initialArtistName: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Mesa / Ubicación en el Local</label>
                <input
                  type="text"
                  placeholder="Ej: Mesa 14 VIP"
                  value={newParticipantForm.tableLabel}
                  onChange={(e) => setNewParticipantForm({ ...newParticipantForm, tableLabel: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewParticipantModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-md"
                >
                  {actionLoading ? "Inscribiendo..." : "Inscribir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: AGREGAR NUEVO JURADO                                  */}
      {/* ============================================================ */}
      {showNewJudgeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span>Agregar Nuevo Jurado Oficial</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewJudgeModal(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJudge} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcelo Polino / Lucía Méndez"
                  value={newJudgeForm.name}
                  onChange={(e) => setNewJudgeForm({ ...newJudgeForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs outline-none focus:border-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Cargo / Especialidad (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Vocal Coach / Productor Musical / Músico Invitado"
                  value={newJudgeForm.title}
                  onChange={(e) => setNewJudgeForm({ ...newJudgeForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  PIN de Acceso Móvil (4 dígitos)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  pattern="\d{4}"
                  placeholder="Dejar vacío para generar PIN aleatorio"
                  value={newJudgeForm.accessPin}
                  onChange={(e) => setNewJudgeForm({ ...newJudgeForm, accessPin: e.target.value.replace(/\D/g, "") })}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 text-xs font-mono font-bold outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  Si lo dejas vacío, el sistema le asignará un PIN de 4 dígitos automáticamente.
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Botón Dorado (Golden Buzzer)</span>
                  <span className="text-[10px] text-zinc-400">Permite clasificar directo a un cantante a la gran final</span>
                </div>
                <input
                  type="checkbox"
                  checked={newJudgeForm.canGoldenBuzzer}
                  onChange={(e) => setNewJudgeForm({ ...newJudgeForm, canGoldenBuzzer: e.target.checked })}
                  className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewJudgeModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Guardando..." : "Agregar Jurado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDITAR JURADO EXISTENTE                               */}
      {/* ============================================================ */}
      {editingJudge && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                <span>Editar Jurado Oficial</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingJudge(null)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateJudge} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={editJudgeForm.name}
                  onChange={(e) => setEditJudgeForm({ ...editJudgeForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs outline-none focus:border-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Cargo / Especialidad</label>
                <input
                  type="text"
                  value={editJudgeForm.title}
                  onChange={(e) => setEditJudgeForm({ ...editJudgeForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-zinc-300">PIN de Acceso Móvil (4 dígitos) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
                      setEditJudgeForm({ ...editJudgeForm, accessPin: randomPin });
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                  >
                    🎲 Regenerar PIN
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength={4}
                  pattern="\d{4}"
                  value={editJudgeForm.accessPin}
                  onChange={(e) => setEditJudgeForm({ ...editJudgeForm, accessPin: e.target.value.replace(/\D/g, "") })}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 text-sm font-mono font-black outline-none focus:border-amber-400 tracking-widest text-center"
                />
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Botón Dorado (Golden Buzzer)</span>
                  <span className="text-[10px] text-zinc-400">Permite dar pase dorado directo a la final</span>
                </div>
                <input
                  type="checkbox"
                  checked={editJudgeForm.canGoldenBuzzer}
                  onChange={(e) => setEditJudgeForm({ ...editJudgeForm, canGoldenBuzzer: e.target.checked })}
                  className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingJudge(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: NUEVO CRITERIO DE EVALUACIÓN                          */}
      {/* ============================================================ */}
      {showNewCriteriaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <span>Nuevo Criterio de Evaluación</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewCriteriaModal(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCriteria} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nombre del Criterio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Afinación y Entonación / Carisma / Ritmo"
                  value={newCriteriaForm.name}
                  onChange={(e) => setNewCriteriaForm({ ...newCriteriaForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs outline-none focus:border-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Descripción / Pauta para Jurados</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Precisión en las notas, control tonal y afinación a lo largo de la canción."
                  value={newCriteriaForm.description}
                  onChange={(e) => setNewCriteriaForm({ ...newCriteriaForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Puntaje Máximo *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={newCriteriaForm.maxScore}
                    onChange={(e) => setNewCriteriaForm({ ...newCriteriaForm, maxScore: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 font-mono font-bold text-xs outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">Escala habitual: 10</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Ponderación / Peso</label>
                  <input
                    type="number"
                    min={0.1}
                    max={5}
                    step={0.1}
                    required
                    value={newCriteriaForm.weight}
                    onChange={(e) => setNewCriteriaForm({ ...newCriteriaForm, weight: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 font-mono font-bold text-xs outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">Multiplicador (1.0)</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCriteriaModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Guardando..." : "Crear Criterio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDITAR CRITERIO EXISTENTE                             */}
      {/* ============================================================ */}
      {editingCriteria && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                <span>Editar Criterio de Evaluación</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCriteria(null)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCriteria} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nombre del Criterio *</label>
                <input
                  type="text"
                  required
                  value={editCriteriaForm.name}
                  onChange={(e) => setEditCriteriaForm({ ...editCriteriaForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs outline-none focus:border-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Descripción / Pauta</label>
                <textarea
                  rows={2}
                  value={editCriteriaForm.description}
                  onChange={(e) => setEditCriteriaForm({ ...editCriteriaForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Puntaje Máximo *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={editCriteriaForm.maxScore}
                    onChange={(e) => setEditCriteriaForm({ ...editCriteriaForm, maxScore: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 font-mono font-bold text-xs outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Ponderación / Peso</label>
                  <input
                    type="number"
                    min={0.1}
                    max={5}
                    step={0.1}
                    required
                    value={editCriteriaForm.weight}
                    onChange={(e) => setEditCriteriaForm({ ...editCriteriaForm, weight: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 font-mono font-bold text-xs outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCriteria(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: MOSTRAR CÓDIGO QR PARA JURADOS O MESAS               */}
      {/* ============================================================ */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">{showQrModal.title}</h3>
              <button onClick={() => setShowQrModal(null)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl mx-auto inline-block shadow-2xl">
              {/* QR Renderizado a través de API nativa SVG */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  showQrModal.url
                )}`}
                alt="QR Code"
                className="w-48 h-48 mx-auto"
              />
            </div>

            {showQrModal.pin && (
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-xs text-zinc-400">PIN de Acceso: </span>
                <strong className="text-amber-400 font-mono text-base">{showQrModal.pin}</strong>
              </div>
            )}

            <p className="text-[11px] text-zinc-400">
              Escanea con la cámara del celular para abrir el panel de votación al instante sin contraseña.
            </p>

            <button
              onClick={() => {
                navigator.clipboard.writeText(showQrModal.url);
                showFeedback("success", "Enlace copiado al portapapeles");
              }}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold cursor-pointer"
            >
              Copiar Enlace Directo
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: AUDITORÍA DE VOTOS DE MESAS EN TIEMPO REAL            */}
      {/* ============================================================ */}
      {showPublicVotesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-amber-400" />
                  <span>Auditoría de Votos de Mesas en Vivo</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  {currentPerformance?.participant.stageName || currentPerformance?.participant.name || "Actuación en Escenario"} &bull; "{currentPerformance?.songTitle}"
                </p>
              </div>
              <button
                onClick={() => setShowPublicVotesModal(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
              <div>
                <span className="text-xs text-zinc-400">Total Votos Emitidos:</span>
                <span className="text-sm font-black text-white ml-2 font-mono">
                  {publicVotesAudit?.totalVotes || 0}
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-400">Promedio de Estrellas:</span>
                <span className="text-sm font-black text-amber-400 ml-2 font-mono">
                  ⭐ {publicVotesAudit?.avgStars || 0} / 5.0
                </span>
              </div>
              <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>100% Presencia en Mesa por QR</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {publicVotesAudit?.votes && publicVotesAudit.votes.length > 0 ? (
                publicVotesAudit.votes.map((v) => (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 font-black text-zinc-200">
                        {v.tableLabel}
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-amber-400">
                          {Array.from({ length: v.stars }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                          <span className="font-mono font-bold ml-1 text-zinc-300">({v.stars} / 5)</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Dispositivo: {v.voterId}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 block font-mono">
                        {new Date(v.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                      {v.cheerCount > 0 && (
                        <span className="text-[10px] font-bold text-pink-400">+{v.cheerCount} ánimos</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  Aún no se han recibido votos del público para esta actuación.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
              <button
                onClick={() => {
                  if (selectedContestId && currentPerformance?.id) {
                    fetchPerformancePublicVotes(selectedContestId, currentPerformance.id);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refrescar Votos</span>
              </button>
              <button
                onClick={() => setShowPublicVotesModal(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs cursor-pointer shadow-md"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
