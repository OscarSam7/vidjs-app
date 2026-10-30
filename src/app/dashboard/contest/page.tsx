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
  coverUrl?: string | null;
  logoUrl?: string | null;
  sponsors?: string | null;
  organizers?: string | null;
  status: string;
  scoringMode: string;
  publicVoteWeight: number;
  requireConsumption?: boolean;
  minConsumptionNotes?: string | null;
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

  // 💳 Gestión de Consumo Mínimo de Mesas y Súper Votos
  const [tableConsumptions, setTableConsumptions] = useState<
    Array<{
      id: string;
      tableLabel: string;
      status: "PENDING" | "VERIFIED" | "SUPER_VOTE";
      consumptionAmount: number | null;
      notes: string | null;
      verifiedBy: string | null;
      updatedAt: string;
    }>
  >([]);
  const [quickTableInput, setQuickTableInput] = useState("");
  const [quickNotesInput, setQuickNotesInput] = useState("");
  const [tableStatusFilter, setTableStatusFilter] = useState<"ALL" | "PENDING" | "VERIFIED" | "SUPER_VOTE">("ALL");

  const [showPublicVotesModal, setShowPublicVotesModal] = useState(false);

  // Modales
  const [showNewContestModal, setShowNewContestModal] = useState(false);
  const [showNewParticipantModal, setShowNewParticipantModal] = useState(false);
  const [showNewStageModal, setShowNewStageModal] = useState(false);
  const [showNewJudgeModal, setShowNewJudgeModal] = useState(false);
  const [showNewCriteriaModal, setShowNewCriteriaModal] = useState(false);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<{ url: string; title: string; pin?: string } | null>(null);

  // Form State para Nuevo Concurso
  const [newContestForm, setNewContestForm] = useState({
    name: "1er Campeonato de Karaoke Vidjs 2026",
    description: "Gran certamen de voces, talento y emoción con evaluación en vivo.",
    scoringMode: "AVERAGE",
    publicVoteWeight: 20,
    judgesCount: 3,
    requireConsumption: true,
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
    date: new Date().toISOString().split("T")[0],
    notes: "",
    setActive: false,
  });

  // Form State para Editar Gala / Fecha
  const [editingStage, setEditingStage] = useState<ContestStage | null>(null);
  const [editStageForm, setEditStageForm] = useState({
    title: "",
    stageType: "QUALIFIERS",
    status: "SCHEDULED",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    setActive: false,
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
  const [selectedReportStageId, setSelectedReportStageId] = useState<string>("ALL");
  const [copiedLink, setCopiedLink] = useState(false);

  // Form State para Marca, Logo, Auspiciadores y Organizadores
  const [brandingForm, setBrandingForm] = useState({
    logoUrl: "",
    coverUrl: "",
    sponsors: "",
    organizers: "",
    prizes: "",
    rules: "",
  });

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
  const fetchReports = async (contestId: string, stageId?: string) => {
    try {
      const url =
        stageId && stageId !== "ALL"
          ? `/api/v1/contest/${contestId}/reports?stageId=${stageId}`
          : `/api/v1/contest/${contestId}/reports`;
      const res = await fetch(url);
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

  // 💳 Cargar estados de consumo de mesas y súper votos
  const fetchTableConsumptions = async (contestId: string) => {
    try {
      const res = await fetch(`/api/v1/contest/${contestId}/consumption`);
      const json = await res.json();
      if (res.ok && json.success) {
        setTableConsumptions(json.data.tableConsumptions || []);
      }
    } catch {}
  };

  const handleToggleRequireConsumption = async () => {
    if (!contest) return;
    try {
      const newReq = !contest.requireConsumption;
      const res = await fetch(`/api/v1/contest/${contest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireConsumption: newReq }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setContest((prev) => (prev ? { ...prev, requireConsumption: newReq } : prev));
        showFeedback(
          "success",
          newReq
            ? "🔒 Política activada: solo mesas con consumo confirmado podrán votar"
            : "🔓 Política desactivada: todas las mesas tienen votación libre"
        );
      } else {
        showFeedback("error", json.error || "No se pudo actualizar la política");
      }
    } catch {
      showFeedback("error", "Error al actualizar política de consumo");
    }
  };

  const handleSetTableStatus = async (
    tableLabel: string,
    status: "PENDING" | "VERIFIED" | "SUPER_VOTE",
    notes?: string
  ) => {
    if (!contest || !tableLabel.trim()) return;
    try {
      const res = await fetch(`/api/v1/contest/${contest.id}/consumption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableLabel: tableLabel.trim(),
          status,
          notes,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showFeedback(
          "success",
          status === "SUPER_VOTE"
            ? `🌟 ¡SÚPER VOTO (x2) asignado a ${tableLabel}!`
            : status === "VERIFIED"
            ? `✅ Consumo validado para ${tableLabel}`
            : `🔒 ${tableLabel} bloqueada a la espera de consumo`
        );
        fetchTableConsumptions(contest.id);
      } else {
        showFeedback("error", json.error || "No se pudo actualizar el estado de la mesa");
      }
    } catch {
      showFeedback("error", "Error de red al actualizar estado de consumo");
    }
  };

  useEffect(() => {
    fetchContests();
  }, []);

  useEffect(() => {
    if (selectedContestId) {
      fetchContestDetail(selectedContestId);
      fetchReports(selectedContestId);
      fetchGlobalTableVotes(selectedContestId);
      fetchTableConsumptions(selectedContestId);
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
          fetchTableConsumptions(selectedContestId);
          if (payload?.type === "TABLE_CONSUMPTION_UPDATE") {
            showFeedback(
              "info",
              `💳 Mesa ${payload.tableLabel}: Estado actualizado a ${
                payload.status === "SUPER_VOTE"
                  ? "🌟 Súper Voto (x2)"
                  : payload.status === "VERIFIED"
                  ? "✅ Validado"
                  : "🔒 Pendiente"
              }`
            );
            return;
          }
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
          fetchTableConsumptions(selectedContestId);
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

  // Crear Nueva Fecha / Gala
  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contest) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/contest/${contest.id}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newStageForm.title.trim(),
          stageType: newStageForm.stageType,
          date: newStageForm.date ? new Date(newStageForm.date).toISOString() : new Date().toISOString(),
          notes: newStageForm.notes.trim() || null,
          setActive: newStageForm.setActive,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showFeedback("success", json.message || "Gala creada con éxito");
        setShowNewStageModal(false);
        setNewStageForm({
          title: "",
          stageType: "QUALIFIERS",
          date: new Date().toISOString().split("T")[0],
          notes: "",
          setActive: false,
        });
        fetchContestDetail(contest.id);
        fetchReports(contest.id);
      } else {
        showFeedback("error", json.error || "No se pudo crear la gala");
      }
    } catch {
      showFeedback("error", "Error de conexión al crear gala");
    } finally {
      setActionLoading(false);
    }
  };

  // Abrir Modal de Edición de Gala
  const handleOpenEditStage = (st: ContestStage) => {
    setEditingStage(st);
    setEditStageForm({
      title: st.title,
      stageType: st.stageType || "QUALIFIERS",
      status: st.status || "SCHEDULED",
      date: st.date ? new Date(st.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      notes: st.notes || "",
      setActive: st.id === contest?.activeStageId,
    });
  };

  // Guardar Cambios de Gala
  const handleUpdateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contest || !editingStage) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/contest/${contest.id}/stages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageId: editingStage.id,
          title: editStageForm.title.trim(),
          stageType: editStageForm.stageType,
          status: editStageForm.status,
          date: editStageForm.date ? new Date(editStageForm.date).toISOString() : undefined,
          notes: editStageForm.notes.trim() || null,
          setActive: editStageForm.setActive,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showFeedback("success", json.message || "Gala actualizada con éxito");
        setEditingStage(null);
        fetchContestDetail(contest.id);
        fetchReports(contest.id);
      } else {
        showFeedback("error", json.error || "No se pudo actualizar la gala");
      }
    } catch {
      showFeedback("error", "Error de conexión al actualizar gala");
    } finally {
      setActionLoading(false);
    }
  };

  // Eliminar Gala del Certamen
  const handleDeleteStage = async (st: ContestStage) => {
    if (!contest) return;
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar la gala "${st.title}"?\nSe desvincularán las actuaciones programadas en esta fecha.`
    );
    if (!confirmDelete) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/contest/${contest.id}/stages?stageId=${st.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showFeedback("success", json.message || "Gala eliminada");
        fetchContestDetail(contest.id);
        fetchReports(contest.id);
      } else {
        showFeedback("error", json.error || "No se pudo eliminar la gala");
      }
    } catch {
      showFeedback("error", "Error de conexión al eliminar la gala");
    } finally {
      setActionLoading(false);
    }
  };

  // Abrir Modal de Marca, Logo y Auspiciadores
  const handleOpenBrandingModal = () => {
    if (!contest) return;
    setBrandingForm({
      logoUrl: contest.logoUrl || "",
      coverUrl: contest.coverUrl || "",
      sponsors: contest.sponsors || "",
      organizers: contest.organizers || "",
      prizes: contest.prizes || "",
      rules: contest.rules || "",
    });
    setShowBrandingModal(true);
  };

  // Guardar Cambios de Marca y Auspiciadores
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contest) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/contest/${contest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brandingForm),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showFeedback("success", json.message || "Ajustes de marca, logo y auspiciadores guardados");
        setShowBrandingModal(false);
        fetchContestDetail(contest.id);
        fetchReports(contest.id, selectedReportStageId);
      } else {
        showFeedback("error", json.error || "No se pudo actualizar la marca");
      }
    } catch {
      showFeedback("error", "Error de conexión al actualizar marca");
    } finally {
      setActionLoading(false);
    }
  };

  // Copiar Resumen de Premiación y Acta para WhatsApp / Redes Sociales
  const handleCopyReportSummary = () => {
    if (!reportData) return;
    const c = reportData.contest;
    const top3 = reportData.leaderboard.slice(0, 3);
    const podiumText = top3
      .map(
        (p: any, idx: number) =>
          `${idx === 0 ? "🥇 1ER LUGAR (CAMPEÓN)" : idx === 1 ? "🥈 2DO LUGAR" : "🥉 3ER LUGAR"}: ${p.stageName} ("${p.songTitle}") - ${p.totalScore} pts`
      )
      .join("\n");

    const textToCopy = `🏆 ACTA OFICIAL DE RESULTADOS: ${c.name.toUpperCase()}\n🏛️ Establecimiento: ${c.tenantName} | Código: ${c.code}\n📅 Fecha: ${new Date().toLocaleDateString("es-ES")}\n\n🌟 CUADRO DE HONOR Y GANADORES:\n${podiumText}\n\n${
      reportData.stats?.tableStats?.length
        ? `🔥 Mesa Más Participativa: ${reportData.stats.tableStats[0].tableLabel} (${reportData.stats.tableStats[0].totalVotes} votos emitidos con presencia QR)\n`
        : ""
    }${
      c.sponsors ? `\n🤝 Con el valioso auspicio de:\n${c.sponsors}\n` : ""
    }\n✨ Certificación Notarial Automatizada con Vidjs Karaoke Pro 2026`;

    navigator.clipboard.writeText(textToCopy);
    showFeedback("success", "📋 ¡Acta y podio copiados! Listos para compartir en WhatsApp o redes sociales.");
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
    <div className="min-h-screen bg-[#080F1F] text-[#F8FAFC] p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn">
      {/* ============================================================ */}
      {/* 1. TOP HEADER DEL CAMPEONATO & SELECTOR                      */}
      {/* ============================================================ */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111F38] border border-[#263858] p-5 rounded-3xl shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#F8FAFC] tracking-tight">
                {contest?.name || "Concurso de Karaoke Pro"}
              </h1>
              {contest && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/40">
                  {contest.code}
                </span>
              )}
            </div>
            <p className="text-xs text-[#94A3B8] font-medium">
              Gestión multidía, jurados móviles, votación en vivo, pantalla gigante y actas oficiales VIDJSPRO.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Selector de Concurso */}
          {contests.length > 1 && (
            <select
              value={selectedContestId || ""}
              onChange={(e) => setSelectedContestId(e.target.value)}
              className="bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs font-bold px-3 py-2.5 rounded-xl outline-none focus:border-[#8B5CF6]"
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
            className="px-4 py-2.5 rounded-xl bg-[#0D1930] hover:bg-[#1E293B] border border-[#263858] text-[#F8FAFC] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Nuevo Certamen</span>
          </button>

          {/* Botón Abrir Pantalla Gigante / TV Concurso */}
          {contest && (
            <Link
              href={`/display/${contest.code}/contest`}
              target="_blank"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:from-[#7C3AED] hover:to-[#4F46E5] text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
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
              ? "bg-emerald-950/90 border border-emerald-500/80 text-emerald-200"
              : feedbackMsg.type === "error"
              ? "bg-red-950/90 border border-red-500/80 text-red-200"
              : "bg-blue-950/90 border border-blue-500/80 text-blue-200"
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
      <div className="flex items-center gap-2 border-b border-[#263858] pb-3 overflow-x-auto">
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
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]"
                  : "bg-[#0D1930] hover:bg-[#111F38] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263858]"
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
          <div className="flex items-center justify-between flex-wrap gap-3 bg-[#111F38] border border-[#263858] p-4 rounded-2xl shadow-md">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold text-[#94A3B8]">Gala / Fecha en Curso:</span>
              <span className="text-xs font-black text-amber-400 px-3 py-1 rounded-xl bg-[#0D1930] border border-[#263858]">
                {activeStage?.title || "Sin fecha activa"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewParticipantModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Inscribir Cantante a Esta Gala</span>
              </button>
            </div>
          </div>

          {/* TARJETA HERO: CANTANTE ACTUALMENTE EN ESCENARIO */}
          {currentPerformance ? (
            <div className="bg-gradient-to-r from-[#111F38] via-[#1E293B] to-[#111F38] border-2 border-amber-500/60 p-6 rounded-3xl shadow-2xl space-y-6">
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
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#0D1930] text-[#94A3B8] border border-[#263858]">
                      {currentPerformance.participant.tableLabel}
                    </span>
                  )}
                  <span className="text-xs font-mono font-bold text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
                    Total: {currentPerformance.totalScore} pts
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-pink-500 flex items-center justify-center text-white font-black text-3xl shadow-2xl shrink-0 overflow-hidden">
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
                  <h3 className="text-2xl sm:text-3xl font-black text-[#F8FAFC] truncate">
                    {currentPerformance.participant.stageName || currentPerformance.participant.name}
                  </h3>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-amber-300 font-bold">
                    <Mic className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      "{currentPerformance.songTitle}" &bull; {currentPerformance.artistName}
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    Votos de jurados recibidos:{" "}
                    <strong className="text-[#F8FAFC]">
                      {currentPerformance.judgeScores?.length || 0} de {contest?.judges.length || 0}
                    </strong>
                  </p>
                </div>

                {/* BOTÓN RÁPIDO CARGAR EN CABINA DJ */}
                <button
                  onClick={() => handleSendToDjBooth(currentPerformance)}
                  className="px-5 py-3 rounded-2xl bg-[#0D1930] hover:bg-[#1E293B] border border-[#263858] text-[#A78BFA] hover:text-white text-xs font-black flex items-center gap-2 shadow-lg transition-all cursor-pointer whitespace-nowrap"
                  title="Carga la canción automáticamente en la consola de DJ o Karaoke"
                >
                  <Disc3 className="w-4 h-4 text-[#8B5CF6] animate-spin [animation-duration:4s]" />
                  <span>Cargar en Bandeja DJ</span>
                </button>
              </div>

              {/* BOTONERA DE CONTROL DE LA GALA */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#263858]">
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
                  className="py-3 px-4 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Revelar en TV</span>
                </button>

                {/* 4. Golden Buzzer */}
                <button
                  onClick={() => handlePerformanceAction(currentPerformance.id, "TRIGGER_GOLDEN_BUZZER")}
                  disabled={actionLoading}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-500/30 cursor-pointer"
                >
                  <Crown className="w-4 h-4" />
                  <span>Golden Buzzer</span>
                </button>
              </div>

              {/* Monitor de Votación de Jurados en Tiempo Real */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">
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
                            ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-200"
                            : "bg-[#0D1930] border-[#263858] text-[#94A3B8]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                              score ? "bg-emerald-500 text-slate-950" : "bg-[#111F38] text-[#94A3B8]"
                            }`}
                          >
                            {j.name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#F8FAFC] block">{j.name}</span>
                            <span className="text-[10px] text-[#94A3B8]">{j.title}</span>
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
              <div className="space-y-3 pt-4 border-t border-[#263858]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                      🗳️ Votación de Mesas en Vivo ({publicVotesAudit?.totalVotes ?? currentPerformance.publicVotes?.length ?? 0} celulares):
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                      Promedio: {publicVotesAudit?.avgStars ?? currentPerformance.publicScore ?? 0} / 5.0 ⭐
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPublicVotesModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#0D1930] hover:bg-[#1E293B] border border-[#263858] text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <span>🔍 Auditar Votos de Mesas</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("tableVotes")}
                      className="px-3 py-1.5 rounded-xl bg-[#0D1930] hover:bg-[#1E293B] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
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
                        className="p-3 rounded-2xl bg-[#0D1930] border border-[#263858] flex items-center justify-between"
                      >
                        <div className="truncate">
                          <span className="text-xs font-bold text-[#F8FAFC] block truncate">
                            {t.tableLabel}
                          </span>
                          <span className="text-[10px] text-[#94A3B8]">
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
                  <div className="p-3.5 rounded-2xl bg-[#0D1930]/40 border border-[#263858]/60 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
                    <QrCode className="w-4 h-4 text-[#64748B]" />
                    <span>Esperando votos del público de las mesas para esta presentación...</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-[#111F38] border border-[#263858] text-center space-y-3 shadow-lg">
              <Mic className="w-10 h-10 mx-auto text-amber-400/60" />
              <h3 className="text-base font-bold text-[#F8FAFC]">No hay ningún cantante en escenario actualmente</h3>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                Selecciona a un cantante de la lista de actuaciones a continuación y haz clic en "Llamar al Escenario".
              </p>
            </div>
          )}

          {/* LISTA DE ACTUACIONES DE LA GALA */}
          <div className="bg-[#111F38] border border-[#263858] p-5 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
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
                        : "bg-[#0D1930] border-[#263858] hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="w-8 h-8 rounded-xl bg-[#111F38] border border-[#263858] text-[#F8FAFC] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-[#F8FAFC]">
                            {perf.participant.stageName || perf.participant.name}
                          </h4>
                          {perf.participant.tableLabel && (
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#111F38] text-[#94A3B8] border border-[#263858]">
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
                        <span className="text-xs font-mono font-black text-yellow-300 px-3 py-1 rounded-xl bg-[#080F1F] border border-[#263858]">
                          {perf.totalScore} pts
                        </span>
                      )}

                      <button
                        onClick={() => handlePerformanceAction(perf.id, "CALL_TO_STAGE")}
                        disabled={actionLoading || perf.status === "ON_STAGE"}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Llamar al Escenario</span>
                      </button>

                      <button
                        onClick={() => handleSendToDjBooth(perf)}
                        className="p-2 rounded-xl bg-[#0D1930] hover:bg-[#1E293B] text-[#A78BFA] border border-[#263858] transition-colors cursor-pointer"
                        title="Cargar pista en consola DJ"
                      >
                        <Disc3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-[#94A3B8] text-xs">
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
          <div className="bg-[#111F38] border border-[#263858] p-6 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-base font-black text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-amber-400" />
                  <span>Auditoría de Votos de Mesas y Clientes</span>
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  Control en tiempo real de calificaciones emitidas por los comensales presentes con validación estricta de código QR
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectedContestId && fetchGlobalTableVotes(selectedContestId)}
                  className="px-3.5 py-2 rounded-xl bg-[#0D1930] hover:bg-[#1E293B] border border-[#263858] text-[#F8FAFC] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Actualizar Votos</span>
                </button>
              </div>
            </div>

            {/* Tarjetas Métricas Rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-[#0D1930] border border-[#263858]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                  Total Votos de Mesas
                </span>
                <span className="text-2xl font-black text-[#F8FAFC] mt-1 block">
                  {globalTableVotes?.totalVotes || 0}
                </span>
                <span className="text-[10px] text-[#64748B]">Emitidos desde celulares</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#0D1930] border border-[#263858]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                  Promedio de Estrellas
                </span>
                <span className="text-2xl font-black text-amber-400 mt-1 block flex items-center gap-1">
                  ⭐ {globalTableVotes?.avgStars || 0}
                </span>
                <span className="text-[10px] text-[#64748B]">De un máximo de 5.0</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#0D1930] border border-[#263858]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                  Mesas Participantes
                </span>
                <span className="text-2xl font-black text-[#F8FAFC] mt-1 block">
                  {globalTableVotes?.byTable?.length || 0}
                </span>
                <span className="text-[10px] text-[#64748B]">Mesas con votos válidos</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#0D1930] border border-[#263858]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">
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

          {/* ============================================================ */}
          {/* GESTIÓN DE CONSUMO MÍNIMO Y SÚPER VOTOS (X2) POR MESA       */}
          {/* ============================================================ */}
          <div className="bg-[#111F38] border border-amber-500/30 p-6 rounded-3xl space-y-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#263858] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-black text-[#F8FAFC] uppercase tracking-wider">
                    Gestión de Consumo Mínimo & Súper Votos por Mesa
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-black border border-amber-500/40">
                    Control de Mozos / Barra
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                  Garantiza que solo las mesas con consumo confirmado puedan votar. Activa el <strong>Súper Voto</strong> (peso doble x2) a mesas destacadas.
                </p>
              </div>

              {/* Interruptor de Política de Consumo */}
              <div className="flex items-center gap-3 bg-[#0D1930] p-2.5 rounded-2xl border border-[#263858] shrink-0">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Exigir Consumo:</span>
                  <span
                    className={`text-xs font-black ${
                      contest?.requireConsumption !== false ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {contest?.requireConsumption !== false ? "🔒 ACTIVADO (Obligatorio)" : "🔓 DESACTIVADO (Libre)"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleRequireConsumption}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    contest?.requireConsumption !== false
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:from-amber-400 hover:to-yellow-300 shadow-md shadow-amber-500/30"
                      : "bg-[#111F38] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263858]"
                  }`}
                >
                  {contest?.requireConsumption !== false ? "Desactivar" : "Activar Exigencia"}
                </button>
              </div>
            </div>

            {/* Barra de Validación Rápida por Mozo o Barra */}
            <div className="bg-[#0D1930] p-4 rounded-2xl border border-[#263858] space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#F8FAFC] block">
                ⚡ Validación Rápida de Mesa
              </span>
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <input
                  type="text"
                  placeholder="Ej: Mesa 7, VIP 2, Barra 1..."
                  value={quickTableInput}
                  onChange={(e) => setQuickTableInput(e.target.value)}
                  className="w-full sm:w-64 p-2.5 rounded-xl bg-[#111F38] border border-[#263858] text-[#F8FAFC] text-xs font-bold outline-none placeholder:text-[#64748B] focus:border-amber-400"
                />
                <input
                  type="text"
                  placeholder="Nota u observaciones (opcional)"
                  value={quickNotesInput}
                  onChange={(e) => setQuickNotesInput(e.target.value)}
                  className="w-full sm:flex-1 p-2.5 rounded-xl bg-[#111F38] border border-[#263858] text-[#F8FAFC] text-xs outline-none placeholder:text-[#64748B] focus:border-amber-400"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (!quickTableInput.trim()) {
                        showFeedback("error", "Ingresa el nombre o número de la mesa");
                        return;
                      }
                      handleSetTableStatus(quickTableInput, "VERIFIED", quickNotesInput);
                      setQuickTableInput("");
                      setQuickNotesInput("");
                    }}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-900/30"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>✓ Validar Consumo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!quickTableInput.trim()) {
                        showFeedback("error", "Ingresa el nombre o número de la mesa");
                        return;
                      }
                      handleSetTableStatus(quickTableInput, "SUPER_VOTE", quickNotesInput);
                      setQuickTableInput("");
                      setQuickNotesInput("");
                    }}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/30"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>🌟 Súper Voto (x2)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Listado de Mesas con Acciones Rápidas */}
            {(() => {
              const knownTableLabels = new Set<string>();
              tableConsumptions.forEach((tc) => knownTableLabels.add(tc.tableLabel));
              globalTableVotes?.byTable?.forEach((tb) => knownTableLabels.add(tb.tableLabel));
              contest?.participants?.forEach((p) => {
                if (p.tableLabel) knownTableLabels.add(p.tableLabel);
              });

              const tablesList = Array.from(knownTableLabels).map((label) => {
                const consumption = tableConsumptions.find(
                  (tc) => tc.tableLabel.toLowerCase().trim() === label.toLowerCase().trim()
                );
                const voteStats = globalTableVotes?.byTable?.find(
                  (tb) => tb.tableLabel.toLowerCase().trim() === label.toLowerCase().trim()
                );
                return {
                  tableLabel: label,
                  status: consumption?.status || "PENDING",
                  isSuperVote: consumption?.status === "SUPER_VOTE",
                  notes: consumption?.notes || null,
                  totalVotes: voteStats?.totalVotes || 0,
                  avgStars: voteStats?.avgStars || 0,
                  updatedAt: consumption?.updatedAt,
                };
              });

              const filteredTables = tablesList.filter((t) => {
                if (tableStatusFilter === "ALL") return true;
                return t.status === tableStatusFilter;
              });

              const verifiedCount = tablesList.filter((t) => t.status === "VERIFIED").length;
              const superCount = tablesList.filter((t) => t.status === "SUPER_VOTE").length;
              const pendingCount = tablesList.filter((t) => t.status === "PENDING").length;

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    {/* Filtros */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTableStatusFilter("ALL")}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          tableStatusFilter === "ALL"
                            ? "bg-[#8B5CF6] text-white shadow-sm"
                            : "bg-[#0D1930] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263858]"
                        }`}
                      >
                        Todas ({tablesList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTableStatusFilter("VERIFIED")}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          tableStatusFilter === "VERIFIED"
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/50"
                            : "bg-[#0D1930] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263858]"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Validadas ({verifiedCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTableStatusFilter("SUPER_VOTE")}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          tableStatusFilter === "SUPER_VOTE"
                            ? "bg-amber-950/80 text-amber-300 border border-amber-500/50"
                            : "bg-[#0D1930] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263858]"
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-yellow-400" />
                        <span>Súper Votos ({superCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTableStatusFilter("PENDING")}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          tableStatusFilter === "PENDING"
                            ? "bg-[#111F38] text-[#F8FAFC] border border-[#263858]"
                            : "bg-[#0D1930] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263858]"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Pendientes ({pendingCount})</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => contest && fetchTableConsumptions(contest.id)}
                      className="text-xs font-bold text-[#94A3B8] hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Actualizar lista</span>
                    </button>
                  </div>

                  {filteredTables.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredTables.map((tbl) => (
                        <div
                          key={tbl.tableLabel}
                          className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                            tbl.status === "SUPER_VOTE"
                              ? "bg-gradient-to-br from-amber-950/50 via-[#111F38] to-[#0D1930] border-amber-500/60 shadow-lg shadow-amber-950/30"
                              : tbl.status === "VERIFIED"
                              ? "bg-[#0D1930] border-emerald-500/40"
                              : "bg-[#0D1930] border-[#263858]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-black text-[#F8FAFC] block">
                                {tbl.tableLabel}
                              </span>
                              {tbl.notes && (
                                <span className="text-[10px] text-[#94A3B8] italic block">
                                  {tbl.notes}
                                </span>
                              )}
                            </div>
                            <div>
                              {tbl.status === "SUPER_VOTE" ? (
                                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[10px] font-black uppercase flex items-center gap-1 shadow-md">
                                  <Sparkles className="w-3 h-3" />
                                  <span>Súper Voto x2</span>
                                </span>
                              ) : tbl.status === "VERIFIED" ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold uppercase flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Validado (1.0x)</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  <span>Pendiente</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-[#94A3B8] border-t border-[#263858] pt-2 font-mono">
                            <span>Votos emitidos: {tbl.totalVotes}</span>
                            <span>Promedio: ⭐ {tbl.avgStars}</span>
                          </div>

                          {/* Acciones de 1 toque */}
                          <div className="grid grid-cols-3 gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleSetTableStatus(tbl.tableLabel, "VERIFIED")}
                              className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                tbl.status === "VERIFIED"
                                  ? "bg-emerald-600 text-white font-black"
                                  : "bg-[#111F38] hover:bg-emerald-950/60 text-emerald-400 border border-[#263858] hover:border-emerald-500/40"
                              }`}
                              title="Validar consumo normal (1.0x)"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Validar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSetTableStatus(tbl.tableLabel, "SUPER_VOTE")}
                              className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                tbl.status === "SUPER_VOTE"
                                  ? "bg-amber-400 text-black font-black"
                                  : "bg-[#111F38] hover:bg-amber-950/60 text-amber-400 border border-[#263858] hover:border-amber-500/40"
                              }`}
                              title="Asignar beneficio de Súper Voto doble (2.0x)"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Súper x2</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSetTableStatus(tbl.tableLabel, "PENDING")}
                              className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                tbl.status === "PENDING"
                                  ? "bg-[#111F38] text-[#94A3B8] font-bold border border-[#263858]"
                                  : "bg-[#111F38] hover:bg-red-950/40 text-[#94A3B8] hover:text-red-400 border border-[#263858]"
                              }`}
                              title="Restablecer o bloquear hasta nuevo consumo"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Bloquear</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-[#94A3B8] bg-[#0D1930]/40 rounded-2xl border border-[#263858]/60">
                      No hay mesas registradas en este filtro. Usa el formulario de validación rápida arriba para ingresar cualquier mesa.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Actuación actual en escenario y sus votos */}
          {currentPerformance && (
            <div className="bg-gradient-to-r from-amber-950/20 via-[#111F38] to-[#111F38] border border-amber-500/40 p-5 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Votación para Cantante en Escenario Ahora
                  </span>
                </div>
                <button
                  onClick={() => setShowPublicVotesModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>🔍 Ver Todos los Votos Detallados</span>
                </button>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl bg-[#0D1930] border border-[#263858]">
                <div>
                  <h4 className="text-lg font-black text-[#F8FAFC]">
                    {currentPerformance.participant.stageName || currentPerformance.participant.name}
                  </h4>
                  <p className="text-xs text-amber-300 font-bold">
                    "{currentPerformance.songTitle}" &bull; {currentPerformance.artistName}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-[#94A3B8] block">Votos Recibidos</span>
                    <span className="text-base font-black text-[#F8FAFC] font-mono">
                      {publicVotesAudit?.totalVotes || currentPerformance.publicVotes?.length || 0}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#94A3B8] block">Promedio Estrellas</span>
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
                      className="p-3.5 rounded-2xl bg-[#0D1930] border border-[#263858] flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-[#F8FAFC] block">{t.tableLabel}</span>
                        <span className="text-[10px] text-[#94A3B8]">
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
                <div className="p-4 text-center text-xs text-[#94A3B8] bg-[#0D1930]/40 rounded-2xl border border-[#263858]/60">
                  Esperando las calificaciones de las mesas para este tema...
                </div>
              )}
            </div>
          )}

          {/* Tabla Consolidada de Todas las Mesas */}
          <div className="bg-[#111F38] border border-[#263858] p-5 rounded-3xl space-y-4 shadow-xl">
            <h4 className="text-sm font-black text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Participación Acumulada por Mesa</span>
            </h4>

            {globalTableVotes?.byTable && globalTableVotes.byTable.length > 0 ? (
              <div className="rounded-2xl bg-[#0D1930] border border-[#263858] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#263858] text-[#94A3B8] font-mono uppercase text-[10px]">
                      <th className="py-3 px-4">Posición / Mesa</th>
                      <th className="py-3 px-4 text-center">Votos Emitidos</th>
                      <th className="py-3 px-4 text-center">Promedio Calificación</th>
                      <th className="py-3 px-4 text-center">Aplausos & Vitoreos</th>
                      <th className="py-3 px-4 text-right">Validación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#263858] font-medium">
                    {globalTableVotes.byTable.map((t, idx) => (
                      <tr key={t.tableLabel} className="hover:bg-[#111F38]/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#F8FAFC] flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-[#111F38] border border-[#263858] flex items-center justify-center font-mono text-xs text-amber-400 font-black">
                            {idx + 1}
                          </span>
                          <span className="text-sm">{t.tableLabel}</span>
                          {idx === 0 && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              🔥 Más Activa
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-[#F8FAFC]">
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
              <div className="p-8 text-center text-xs text-[#94A3B8] bg-[#0D1930]/40 rounded-2xl border border-[#263858]/60">
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
        <div className="bg-[#111F38] border border-[#263858] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black text-[#F8FAFC] uppercase tracking-wider">
                Participantes Registrados en el Certamen ({contest.participants.length})
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Puntuaciones acumulativas a través de todas las fechas y galas
              </p>
            </div>
            <button
              onClick={() => setShowNewParticipantModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Inscribir Nuevo Cantante</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
            {contest.participants.map((p, idx) => (
              <div
                key={p.id}
                className="p-4 rounded-xl bg-[#0D1930] border border-[#263858] space-y-3 hover:border-violet-500/40 transition-all shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center text-white font-black text-lg overflow-hidden shrink-0 shadow-inner">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      p.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black text-[#F8FAFC] truncate">
                      {p.stageName || p.name}
                    </h4>
                    {p.stageName && (
                      <p className="text-[11px] text-[#94A3B8] truncate">{p.name}</p>
                    )}
                    {p.tableLabel && (
                      <span className="text-[10px] text-amber-400 font-bold">{p.tableLabel}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black font-mono text-amber-400">
                      {p.totalPoints} pts
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#263858]/80">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      p.status === "QUALIFIED"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : p.status === "ELIMINATED"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : p.status === "WINNER"
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                        : "bg-[#111F38] text-[#94A3B8] border-[#263858]"
                    }`}
                  >
                    {p.status}
                  </span>
                  <span className="text-[11px] text-[#64748B]">Ranking: #{idx + 1}</span>
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
        <div className="bg-[#111F38] border border-[#263858] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black text-[#F8FAFC] uppercase tracking-wider">
                Fechas y Rondas del Concurso Multidía
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Organiza galas por días o semanas (Audiciones, Clasificatorias, Semifinal, Gran Final)
              </p>
            </div>
            <button
              onClick={() => {
                setNewStageForm({
                  title: "",
                  stageType: "QUALIFIERS",
                  date: new Date().toISOString().split("T")[0],
                  notes: "",
                  setActive: false,
                });
                setShowNewStageModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nueva Fecha / Gala</span>
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {contest.stages.length > 0 ? (
              contest.stages.map((st, i) => (
                <div
                  key={st.id}
                  className={`p-4 sm:p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    st.id === contest.activeStageId
                      ? "bg-[#0D1930] border-2 border-amber-500/70 shadow-lg shadow-amber-500/10"
                      : "bg-[#0D1930] border-[#263858] hover:border-violet-500/40"
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <span
                      className={`w-10 h-10 rounded-xl font-mono font-black text-sm flex items-center justify-center shrink-0 ${
                        st.id === contest.activeStageId
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/30"
                          : "bg-[#111F38] text-amber-400 border border-[#263858]"
                      }`}
                    >
                      G{i + 1}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-black text-[#F8FAFC]">{st.title}</h4>
                        {st.id === contest.activeStageId && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                            Gala Activa en Vivo
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            st.status === "LIVE"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : st.status === "COMPLETED"
                              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                              : "bg-[#111F38] text-[#94A3B8] border-[#263858]"
                          }`}
                        >
                          {st.status === "LIVE"
                            ? "🔴 En Vivo"
                            : st.status === "COMPLETED"
                            ? "✅ Concluida"
                            : "⏳ Programada"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#94A3B8] flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          {st.stageType === "AUDITIONS"
                            ? "Audiciones"
                            : st.stageType === "QUALIFIERS"
                            ? "Clasificatorias"
                            : st.stageType === "SEMIFINALS"
                            ? "Semifinal"
                            : "Gran Final"}
                        </span>
                        {st.date && (
                          <span className="flex items-center gap-1 font-mono text-[#F8FAFC]">
                            <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                            {new Date(st.date).toLocaleDateString("es-ES", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-mono text-[#94A3B8]">
                          <Mic className="w-3.5 h-3.5 text-[#64748B]" />
                          {st.performances?.length || 0} actuaciones
                        </span>
                      </div>
                      {st.notes && (
                        <p className="text-xs text-[#94A3B8] italic bg-[#111F38] px-2.5 py-1 rounded-lg border border-[#263858] inline-block mt-1">
                          {st.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                    {st.id !== contest.activeStageId ? (
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
                        className="px-3 py-1.5 rounded-xl bg-[#111F38] hover:bg-[#1a2e50] border border-[#263858] text-xs font-bold text-[#F8FAFC] transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 text-amber-400" />
                        <span>Activar Esta Gala</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>En Curso</span>
                      </span>
                    )}
                    <button
                      onClick={() => handleOpenEditStage(st)}
                      title="Editar Gala / Fecha"
                      className="p-2 rounded-xl bg-[#111F38] hover:bg-[#1a2e50] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteStage(st)}
                      title="Eliminar Gala"
                      className="p-2 rounded-xl bg-[#111F38] hover:bg-rose-950/60 border border-[#263858] text-[#94A3B8] hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-[#0D1930] rounded-xl border border-[#263858] space-y-3">
                <Calendar className="w-10 h-10 text-[#64748B] mx-auto" />
                <p className="text-sm font-bold text-[#F8FAFC]">No hay galas registradas</p>
                <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                  Crea la primera fecha o gala para comenzar a programar las actuaciones y clasificaciones del certamen.
                </p>
                <button
                  onClick={() => setShowNewStageModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Primera Gala</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PESTAÑA 4: CRITERIOS EDITABLES                               */}
      {/* ============================================================ */}
      {activeTab === "criteria" && contest && (
        <div className="bg-[#111F38] border border-[#263858] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black text-[#F8FAFC] uppercase tracking-wider">
                Criterios de Evaluación Editables
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Estos criterios aparecen en los celulares de los jurados y se proyectan en la pantalla grande
              </p>
            </div>
            <button
              onClick={() => setShowNewCriteriaModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
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
                  className="p-5 rounded-xl bg-[#0D1930] border border-[#263858] space-y-3 shadow-lg hover:border-violet-500/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-[#F8FAFC]">{c.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            Max: {c.maxScore} pts
                          </span>
                          <span className="text-[11px] font-mono text-[#94A3B8]">
                            Ponderación: x{c.weight}
                          </span>
                        </div>
                      </div>

                      {/* Botones de acción rápida: Editar y Eliminar */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCriteria(c)}
                          className="p-2 rounded-xl bg-[#111F38] hover:bg-[#1a2e50] text-[#94A3B8] hover:text-amber-400 border border-[#263858] transition-colors cursor-pointer"
                          title="Editar criterio"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCriteria(c)}
                          className="p-2 rounded-xl bg-[#111F38] hover:bg-rose-950/60 text-[#94A3B8] hover:text-rose-400 border border-[#263858] transition-colors cursor-pointer"
                          title="Eliminar criterio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {c.description ? (
                      <p className="text-xs text-[#94A3B8] leading-relaxed bg-[#111F38] p-3 rounded-xl border border-[#263858]">
                        {c.description}
                      </p>
                    ) : (
                      <p className="text-xs text-[#64748B] italic">Sin descripción complementaria</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-[#0D1930] border border-[#263858] text-center space-y-3">
              <Sliders className="w-10 h-10 mx-auto text-amber-400/60" />
              <h4 className="text-sm font-bold text-[#F8FAFC]">No hay criterios de evaluación configurados</h4>
              <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                Define criterios como afinación, ritmo, carisma o dificultad vocal para que los jurados emitan sus notas.
              </p>
              <button
                onClick={() => setShowNewCriteriaModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
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
        <div className="bg-[#111F38] border border-[#263858] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black text-[#F8FAFC] uppercase tracking-wider">
                Mesa Oficial de Jurados ({contest.judges.length})
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Cada jurado puede calificar desde su propio smartphone o tablet usando su PIN de acceso
              </p>
            </div>
            <button
              onClick={() => setShowNewJudgeModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
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
                    className="p-5 rounded-xl bg-[#0D1930] border border-[#263858] space-y-4 shadow-lg hover:border-violet-500/40 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-md shrink-0">
                            {j.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black text-[#F8FAFC] truncate">{j.name}</h4>
                            <span className="text-[11px] text-[#94A3B8] block truncate">
                              {j.title || "Jurado Oficial"}
                            </span>
                          </div>
                        </div>

                        {/* Botones de acción rápida: Editar y Eliminar */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditJudge(j)}
                            className="p-2 rounded-xl bg-[#111F38] hover:bg-[#1a2e50] text-[#94A3B8] hover:text-amber-400 border border-[#263858] transition-colors cursor-pointer"
                            title="Editar jurado"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteJudge(j)}
                            className="p-2 rounded-xl bg-[#111F38] hover:bg-rose-950/60 text-[#94A3B8] hover:text-rose-400 border border-[#263858] transition-colors cursor-pointer"
                            title="Eliminar jurado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#111F38] border border-[#263858] flex items-center justify-between">
                        <span className="text-xs text-[#94A3B8] font-medium">PIN de Acceso Móvil:</span>
                        <span className="text-lg font-mono font-black text-amber-300 tracking-widest px-2.5 py-0.5 rounded-lg bg-[#0D1930] border border-[#263858]">
                          {j.accessPin}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#94A3B8] px-1">
                        <span>Golden Buzzer:</span>
                        <span className={`font-bold ${j.canGoldenBuzzer ? "text-amber-400" : "text-[#64748B]"}`}>
                          {j.canGoldenBuzzer ? "👑 Habilitado" : "❌ Deshabilitado"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#263858]/80">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(accessUrl);
                          showFeedback("success", `¡Enlace copiado para ${j.name}!`);
                        }}
                        className="py-2.5 px-3 rounded-xl bg-[#111F38] hover:bg-[#1a2e50] border border-[#263858] text-xs font-bold text-[#F8FAFC] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                        className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
            <div className="p-8 rounded-xl bg-[#0D1930] border border-[#263858] text-center space-y-3">
              <Award className="w-10 h-10 mx-auto text-amber-400/60" />
              <h4 className="text-sm font-bold text-[#F8FAFC]">No hay jurados registrados</h4>
              <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                Agrega jurados oficiales para que califiquen a los participantes desde sus propios celulares o tablets.
              </p>
              <button
                onClick={() => setShowNewJudgeModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
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
        <div className="space-y-6">
          {/* Barra de Acciones y Filtros (no imprimible) */}
          <div className="no-print bg-[#111F38] border border-[#263858] rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-[#F8FAFC] uppercase tracking-wider">
                  Acta Notarial & Informes Especiales
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
                  Formato Oficial A4
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Certificación oficial con firmas de jurados, podio, desglose y mención de auspiciadores.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Selector de Gala o Consolidado */}
              <div className="flex items-center gap-1.5 bg-[#0D1930] px-3 py-1.5 rounded-xl border border-[#263858]">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <select
                  value={selectedReportStageId}
                  onChange={(e) => {
                    const stageId = e.target.value;
                    setSelectedReportStageId(stageId);
                    if (contest) fetchReports(contest.id, stageId);
                  }}
                  className="bg-transparent text-[#F8FAFC] text-xs font-bold outline-none cursor-pointer pr-2"
                >
                  <option value="ALL" className="bg-[#0D1930] text-[#F8FAFC]">🌐 Consolidado General (Todas las Fechas)</option>
                  {contest?.stages.map((st) => (
                    <option key={st.id} value={st.id} className="bg-[#0D1930] text-[#F8FAFC]">
                      📅 {st.title} ({st.stageType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón para configurar Marca y Auspiciadores */}
              <button
                onClick={handleOpenBrandingModal}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Configurar Logo, Auspiciadores, Organizadores y Premios"
              >
                <Sliders className="w-4 h-4" />
                <span>Marca & Auspiciadores</span>
              </button>

              {/* Botón Copiar Resumen */}
              <button
                onClick={handleCopyReportSummary}
                className="px-3.5 py-2 rounded-xl bg-[#0D1930] hover:bg-[#1a2e50] border border-[#263858] text-[#F8FAFC] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copiar podio y resumen formateado para redes o WhatsApp"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar Podio</span>
              </button>

              {/* Botón Imprimir Acta Notarial Oficial */}
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-transform active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Acta Oficial</span>
              </button>
            </div>
          </div>

          {/* ========================================================== */}
          {/* EL ACTA OFICIAL NOTARIAL (DISEÑO PARA PANTALLA E IMPRESIÓN) */}
          {/* ========================================================== */}
          <div
            id="official-acta"
            className="acta-document bg-[#0D1930] border-4 border-double border-amber-500/40 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl relative text-[#F8FAFC]"
          >
            {/* 1. Membrete de Honor & Escudo Notarial */}
            <div className="border-b-2 border-[#263858] pb-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Logo oficial o Escudo */}
                <div className="flex items-center gap-4">
                  {reportData.contest.logoUrl ? (
                    <img
                      src={reportData.contest.logoUrl}
                      alt="Logo Oficial"
                      className="w-20 h-20 object-contain rounded-2xl border border-amber-500/40 bg-[#111F38] p-1.5 shadow-xl shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20 shrink-0">
                      <Trophy className="w-9 h-9" />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-mono font-black tracking-[0.2em] uppercase text-amber-400">
                      REPÚBLICA DEL KARAOKE &bull; SISTEMA NOTARIAL VIDJS PRO
                    </span>
                    <h1 className="text-xl sm:text-2xl font-black text-[#F8FAFC] tracking-tight uppercase">
                      Acta Oficial de Calificaciones y Premiación
                    </h1>
                    <p className="text-sm font-bold text-amber-300">
                      {reportData.contest.name}
                    </p>
                  </div>
                </div>

                {/* Sello Notarial Digital con QR */}
                <div className="flex items-center gap-3 bg-[#111F38] border border-[#263858] p-2.5 rounded-2xl self-start sm:self-auto shrink-0">
                  <div className="bg-white p-1 rounded-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(
                        typeof window !== "undefined" ? window.location.href : "https://vidjs.com"
                      )}`}
                      alt="QR Validación"
                      className="w-14 h-14"
                    />
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-[9px] uppercase font-black text-emerald-400 block">
                      ✓ ACTA CERTIFICADA
                    </span>
                    <span className="text-[10px] text-[#F8FAFC] block font-bold">
                      FOLIO #{reportData.contest.code}
                    </span>
                    <span className="text-[9px] text-[#94A3B8] block">
                      Validez electrónica Vidjs
                    </span>
                  </div>
                </div>
              </div>

              {/* Fila de Metadatos de Fe Pública */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#263858] text-xs">
                <div className="bg-[#111F38] p-2.5 rounded-xl border border-[#263858]">
                  <span className="text-[10px] uppercase font-mono text-[#94A3B8] block">Sede / Establecimiento</span>
                  <strong className="text-[#F8FAFC]">{reportData.contest.tenantName}</strong>
                </div>
                <div className="bg-[#111F38] p-2.5 rounded-xl border border-[#263858]">
                  <span className="text-[10px] uppercase font-mono text-[#94A3B8] block">Fecha y Hora de Emisión</span>
                  <strong className="text-[#F8FAFC] font-mono text-[11px]">
                    {new Date().toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    {new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </strong>
                </div>
                <div className="bg-[#111F38] p-2.5 rounded-xl border border-[#263858]">
                  <span className="text-[10px] uppercase font-mono text-[#94A3B8] block">Etapa Evaluada</span>
                  <strong className="text-amber-300">
                    {reportData.activeStage ? reportData.activeStage.title : "Gran Final & Consolidado General"}
                  </strong>
                </div>
                <div className="bg-[#111F38] p-2.5 rounded-xl border border-[#263858]">
                  <span className="text-[10px] uppercase font-mono text-[#94A3B8] block">Ponderación Notarial</span>
                  <strong className="text-[#F8FAFC] font-mono text-[11px]">
                    {100 - reportData.contest.publicVoteWeight}% Jueces / {reportData.contest.publicVoteWeight}% Mesas
                  </strong>
                </div>
              </div>
            </div>

            {/* 2. Franja Oficial de Auspiciadores & Colaboradores */}
            {((reportData.contest.parsedSponsors && reportData.contest.parsedSponsors.length > 0) || reportData.contest.sponsors) && (
              <div className="bg-[#111F38] border border-amber-500/30 p-4 sm:p-5 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-mono font-black text-amber-300 uppercase tracking-widest">
                    Evento Auspiciado y Patrocinado por Nuestras Marcas Aliadas
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {reportData.contest.parsedSponsors && reportData.contest.parsedSponsors.length > 0 ? (
                    reportData.contest.parsedSponsors.map((sp: any, sIdx: number) => (
                      <div
                        key={sIdx}
                        className="px-3.5 py-1.5 rounded-xl bg-[#0D1930] border border-[#263858] flex items-center gap-2 shadow-sm"
                      >
                        {sp.logoUrl ? (
                          <img src={sp.logoUrl} alt={sp.name} className="w-5 h-5 object-contain rounded" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span className="text-xs font-bold text-[#F8FAFC]">{sp.name}</span>
                        {sp.category && (
                          <span className="text-[10px] font-mono text-[#94A3B8] bg-[#111F38] px-2 py-0.5 rounded-md border border-[#263858]">
                            {sp.category}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#94A3B8] whitespace-pre-line font-medium">
                      {reportData.contest.sponsors}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 3. Premios y Comité Organizador (si existen) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportData.contest.prizes && (
                <div className="p-4 rounded-2xl bg-[#111F38] border border-[#263858] space-y-1.5">
                  <span className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Premios Oficiales en Disputa</span>
                  </span>
                  <p className="text-xs text-[#94A3B8] whitespace-pre-line leading-relaxed font-medium">
                    {reportData.contest.prizes}
                  </p>
                </div>
              )}
              {((reportData.contest.parsedOrganizers && reportData.contest.parsedOrganizers.length > 0) || reportData.contest.organizers) && (
                <div className="p-4 rounded-2xl bg-[#111F38] border border-[#263858] space-y-1.5">
                  <span className="text-[10px] font-mono font-black text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Comité Organizador & Producción</span>
                  </span>
                  {reportData.contest.parsedOrganizers && reportData.contest.parsedOrganizers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {reportData.contest.parsedOrganizers.map((org: any, oIdx: number) => (
                        <div key={oIdx} className="text-[#94A3B8]">
                          <span className="text-[#64748B] font-mono text-[10px] block">{org.role}</span>
                          <strong className="text-[#F8FAFC]">{org.name}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#94A3B8] whitespace-pre-line font-medium">
                      {reportData.contest.organizers}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 4. Cuadro de Honor (Podio Oficial de Ganadores) */}
            <div className="space-y-3 avoid-break">
              <div className="flex items-center gap-2 border-b border-[#263858] pb-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-[#F8FAFC] uppercase tracking-wider">
                  Cuadro de Honor y Podio de Campeones
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reportData.leaderboard.slice(0, 3).map((winner: any, i: number) => {
                  const border =
                    i === 0
                      ? "border-amber-400 bg-amber-500/10 shadow-amber-500/10"
                      : i === 1
                      ? "border-slate-400 bg-[#111F38]"
                      : "border-amber-700 bg-[#111F38]";
                  const badgeBg =
                    i === 0
                      ? "bg-amber-500 text-slate-950 font-black"
                      : i === 1
                      ? "bg-slate-300 text-slate-950 font-bold"
                      : "bg-amber-700 text-white font-bold";

                  return (
                    <div
                      key={winner.rank}
                      className={`p-5 rounded-2xl border-2 ${border} space-y-2 shadow-xl relative overflow-hidden`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono ${badgeBg}`}>
                          {i === 0 ? "🥇 Gran Campeón" : i === 1 ? "🥈 2do Lugar" : "🥉 3er Lugar"}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {winner.totalScore} pts
                        </span>
                      </div>
                      <div>
                        <h4 className="text-base font-black text-[#F8FAFC]">{winner.stageName}</h4>
                        {winner.name !== winner.stageName && (
                          <p className="text-[11px] text-[#94A3B8] font-medium">Nombre: {winner.name}</p>
                        )}
                        <p className="text-xs text-[#94A3B8] italic mt-0.5">
                          "{winner.songTitle}" - {winner.artistName}
                        </p>
                      </div>
                      <div className="pt-1.5 border-t border-[#263858] flex items-center justify-between text-[11px] text-[#94A3B8] font-mono">
                        <span>Mesa: {winner.tableLabel}</span>
                        <span>Jueces: {winner.judgeScore} &bull; Público: {winner.publicScore}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Planilla General de Puntuaciones y Clasificación Oficial */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#263858] pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-black text-[#F8FAFC] uppercase tracking-wider">
                    Planilla General de Calificaciones y Dictamen Oficial
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#94A3B8]">
                  Total de Actuaciones Registradas: {reportData.leaderboard.length}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#263858]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#111F38] border-b border-[#263858] text-[#94A3B8] font-mono uppercase text-[10px]">
                      <th className="py-3 px-3.5">Puesto</th>
                      <th className="py-3 px-3.5">Participante</th>
                      <th className="py-3 px-3.5">Canción & Artista</th>
                      <th className="py-3 px-3.5">Mesa</th>
                      <th className="py-3 px-3.5 text-right">Nota Jurado</th>
                      <th className="py-3 px-3.5 text-right">Voto Público</th>
                      <th className="py-3 px-3.5 text-right font-black text-amber-400">Puntaje Final</th>
                      <th className="py-3 px-3.5 text-center">Dictamen Notarial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#263858]/60 font-medium">
                    {reportData.leaderboard.map((row: any) => (
                      <tr key={row.rank} className="hover:bg-[#111F38]/50 transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold text-amber-400">
                          {row.rank === 1 ? "🥇 1°" : row.rank === 2 ? "🥈 2°" : row.rank === 3 ? "🥉 3°" : `${row.rank}°`}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-[#F8FAFC]">
                          <div>
                            <span>{row.stageName}</span>
                            {row.name !== row.stageName && (
                              <span className="text-[11px] text-[#94A3B8] font-normal ml-1">({row.name})</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-[#94A3B8]">
                          "{row.songTitle}" <span className="text-[#64748B] font-normal">&bull; {row.artistName}</span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-[#94A3B8] text-[11px]">{row.tableLabel}</td>
                        <td className="py-3 px-3.5 text-right font-mono text-[#F8FAFC] font-bold">
                          {row.judgeScore}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-[#94A3B8]">
                          {row.publicScore}
                          {row.publicVotesCount > 0 && (
                            <span className="text-[10px] text-[#64748B] ml-1">({row.publicVotesCount}v)</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-black text-amber-300 text-sm">
                          {row.totalScore} pts
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {row.rank === 1 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase">
                              🥇 Campeón Oficial
                            </span>
                          ) : row.rank === 2 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/40 text-[10px] font-bold uppercase">
                              🥈 Sub-Campeón
                            </span>
                          ) : row.rank === 3 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-700/20 text-amber-400 border border-amber-700/40 text-[10px] font-bold uppercase">
                              🥉 3er Puesto
                            </span>
                          ) : row.rank <= 6 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                              Clasificado Destacado
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#111F38] text-[#94A3B8] border border-[#263858] text-[10px]">
                              Mención de Honor
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6. Tabla de Auditoría y Votación Popular por Mesa */}
            {reportData?.stats?.tableStats && reportData.stats.tableStats.length > 0 && (
              <div className="space-y-3 avoid-break">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#263858] pb-2">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-black text-[#F8FAFC] uppercase tracking-wider">
                      Auditoría Notarial de Votación Popular por Mesas
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>100% Presencia en Local Verificada por QR</span>
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#263858]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#111F38] border-b border-[#263858] text-[#94A3B8] font-mono uppercase text-[10px]">
                        <th className="py-2.5 px-3">Mesa / Ubicación</th>
                        <th className="py-2.5 px-3 text-center">Votos Emitidos</th>
                        <th className="py-2.5 px-3 text-center">Calificación Promedio</th>
                        <th className="py-2.5 px-3 text-center">Aplausos / Ánimos</th>
                        <th className="py-2.5 px-3 text-right">Validación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#263858]/60 font-medium">
                      {reportData.stats.tableStats.map((table: any, idx: number) => (
                        <tr key={table.tableLabel} className="hover:bg-[#111F38]/50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-[#F8FAFC] flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#111F38] border border-[#263858] flex items-center justify-center font-mono text-[10px] text-amber-400">
                              {idx + 1}
                            </span>
                            <span>{table.tableLabel}</span>
                            {idx === 0 && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                🔥 Más Participativa
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[#F8FAFC]">
                            {table.totalVotes} votos
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-400">
                            ⭐ {table.avgStars} / 5.0
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-cyan-400">
                            +{table.cheerCount}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-400 text-[11px]">
                            ✓ Presencia Física Verificada (QR)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. Bloque Solemne de Firmas y Rúbricas */}
            <div className="pt-6 border-t-2 border-[#263858] space-y-4 avoid-break">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#94A3B8]">
                  CERTIFICACIÓN SOLEMNE Y FE PÚBLICA
                </span>
                <p className="text-xs text-[#94A3B8] italic max-w-2xl mx-auto">
                  "Los suscritos miembros del Jurado Calificador Oficial y la Dirección General del evento certifican bajo fe de juramento que las evaluaciones y calificaciones expuestas en esta acta son el resultado inalterable de las actuaciones artísticas presenciadas en vivo y la votación auditada del público comensal presente en sala."
                </p>
              </div>

              {/* Firmas de los Jurados Oficiales y Dirección */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 pt-6">
                {reportData.judges.map((judge: any) => (
                  <div key={judge.id} className="text-center space-y-2">
                    <div className="border-b-2 border-dashed border-[#263858] h-14 flex items-end justify-center pb-1">
                      <span className="text-[11px] font-serif italic text-[#64748B]">Rúbrica Oficial</span>
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-[#F8FAFC] block">{judge.name}</strong>
                      <span className="text-[10px] text-[#94A3B8] block font-medium">
                        {judge.title || "Jurado Calificador Oficial"}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Firma del DJ Anfitrión / Dirección Técnica */}
                <div className="text-center space-y-2">
                  <div className="border-b-2 border-dashed border-[#263858] h-14 flex items-end justify-center pb-1">
                    <span className="text-[11px] font-serif italic text-[#64748B]">Rúbrica Técnica</span>
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-[#F8FAFC] block">
                      {reportData.contest.parsedOrganizers?.find((o: any) => o.role.toLowerCase().includes("dj"))?.name || "DJ Anfitrión & Sonido"}
                    </strong>
                    <span className="text-[10px] text-[#94A3B8] block font-medium">
                      Dirección Técnica & Cabina Vidjs
                    </span>
                  </div>
                </div>

                {/* Firma de la Gerencia / Establecimiento */}
                <div className="text-center space-y-2">
                  <div className="border-b-2 border-dashed border-[#263858] h-14 flex items-end justify-center pb-1">
                    <span className="text-[11px] font-serif italic text-[#64748B]">Sello & Conforme</span>
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-[#F8FAFC] block">
                      Gerencia / Dirección Sede
                    </strong>
                    <span className="text-[10px] text-[#94A3B8] block font-medium">
                      {reportData.contest.tenantName}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 8. Pie de Página Institucional */}
            <div className="border-t border-[#263858] pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#64748B] gap-2">
              <span>
                Documento generado por Vidjs Karaoke Professional &bull; Certificación Criptográfica #
                {reportData.contest.code}
              </span>
              <span>
                Expedido en {reportData.contest.tenantName} &bull; Todos los derechos reservados.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PESTAÑA 7: GENERADOR DE DIPLOMAS                             */}
      {/* ============================================================ */}
      {activeTab === "diplomas" && reportData && (
        <div className="bg-[#111F38] border border-[#263858] rounded-2xl p-6 space-y-6 shadow-xl">
          <div>
            <h3 className="text-base font-black text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>Certificados y Diplomas de Premiación</span>
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Genera diplomas de gala con membrete listos para imprimir o entregar en papel a los ganadores
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reportData.leaderboard.slice(0, 3).map((winner: any, i: number) => {
              const title = i === 0 ? "1ER PUESTO &bull; CAMPEÓN" : i === 1 ? "2DO PUESTO" : "3ER PUESTO";
              const border = i === 0 ? "border-amber-400" : i === 1 ? "border-slate-300" : "border-amber-600";
              const text = i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : "text-amber-500";

              return (
                <div
                  key={winner.rank}
                  className={`p-6 rounded-2xl bg-[#0D1930] border-2 ${border} text-center space-y-4 shadow-xl relative overflow-hidden`}
                >
                  <div className="w-14 h-14 mx-auto rounded-full bg-[#111F38] border border-[#263858] flex items-center justify-center text-2xl shadow-inner">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                  </div>

                  <div className="space-y-1">
                    <span className={`text-[10px] font-mono font-black tracking-widest uppercase ${text}`}>
                      {title}
                    </span>
                    <h4 className="text-lg font-black text-[#F8FAFC]">{winner.stageName}</h4>
                    <p className="text-xs text-[#94A3B8] italic">
                      "{winner.songTitle}" - {winner.artistName}
                    </p>
                    <p className="text-xs font-mono font-black text-amber-300 pt-1">
                      Puntuación Oficial: {winner.totalScore} pts
                    </p>
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="w-full py-2.5 rounded-xl bg-[#111F38] hover:bg-[#1a2e50] border border-[#263858] text-[#F8FAFC] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
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
          <div className="w-full max-w-lg bg-[#111F38] border border-[#263858] rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[#F8FAFC] flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Crear Nuevo Campeonato de Karaoke</span>
              </h3>
              <button
                onClick={() => setShowNewContestModal(false)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Nombre del Certamen</label>
                <input
                  type="text"
                  required
                  value={newContestForm.name}
                  onChange={(e) => setNewContestForm({ ...newContestForm, name: e.target.value })}
                  className="w-full p-3 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs font-bold outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Descripción / Reglamento Breve</label>
                <textarea
                  rows={2}
                  value={newContestForm.description}
                  onChange={(e) => setNewContestForm({ ...newContestForm, description: e.target.value })}
                  className="w-full p-3 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Modo de Puntuación</label>
                  <select
                    value={newContestForm.scoringMode}
                    onChange={(e) => setNewContestForm({ ...newContestForm, scoringMode: e.target.value })}
                    className="w-full p-3 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs font-bold outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="AVERAGE" className="bg-[#0D1930] text-[#F8FAFC]">Promedio Simple</option>
                    <option value="OLYMPIC" className="bg-[#0D1930] text-[#F8FAFC]">Olímpico (Descarta max y min)</option>
                    <option value="SUM" className="bg-[#0D1930] text-[#F8FAFC]">Suma Total de Puntos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Voto del Público (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={newContestForm.publicVoteWeight}
                    onChange={(e) => setNewContestForm({ ...newContestForm, publicVoteWeight: Number(e.target.value) })}
                    className="w-full p-3 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs font-bold outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0D1930] border border-[#263858] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#F8FAFC] block">
                    Exigir Consumo Mínimo de Mesas
                  </span>
                  <span className="text-[10px] text-[#94A3B8] block">
                    Solo los comensales de mesas validadas por mozo podrán votar
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={newContestForm.requireConsumption}
                  onChange={(e) =>
                    setNewContestForm({ ...newContestForm, requireConsumption: e.target.checked })
                  }
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewContestModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#0D1930] hover:bg-[#1a2e50] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
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
          <div className="w-full max-w-md bg-[#111F38] border border-[#263858] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#F8FAFC] flex items-center gap-2">
                <Mic className="w-5 h-5 text-amber-400" />
                <span>Inscribir Cantante en el Concurso</span>
              </h3>
              <button onClick={() => setShowNewParticipantModal(false)} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterParticipant} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Laura Méndez"
                  value={newParticipantForm.name}
                  onChange={(e) => setNewParticipantForm({ ...newParticipantForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Nombre Artístico (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Laurita Rock"
                  value={newParticipantForm.stageName}
                  onChange={(e) => setNewParticipantForm({ ...newParticipantForm, stageName: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Canción a Cantar *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: De Música Ligera"
                    value={newParticipantForm.initialSongTitle}
                    onChange={(e) => setNewParticipantForm({ ...newParticipantForm, initialSongTitle: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Artista Original</label>
                  <input
                    type="text"
                    placeholder="Ej: Soda Stereo"
                    value={newParticipantForm.initialArtistName}
                    onChange={(e) => setNewParticipantForm({ ...newParticipantForm, initialArtistName: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Mesa / Ubicación en el Local</label>
                <input
                  type="text"
                  placeholder="Ej: Mesa 14 VIP"
                  value={newParticipantForm.tableLabel}
                  onChange={(e) => setNewParticipantForm({ ...newParticipantForm, tableLabel: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewParticipantModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#0D1930] hover:bg-[#1a2e50] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
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
          <div className="w-full max-w-md bg-[#111F38] border border-[#263858] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#F8FAFC] flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span>Agregar Nuevo Jurado Oficial</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewJudgeModal(false)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJudge} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcelo Polino / Lucía Méndez"
                  value={newJudgeForm.name}
                  onChange={(e) => setNewJudgeForm({ ...newJudgeForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Cargo / Especialidad (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Vocal Coach / Productor Musical / Músico Invitado"
                  value={newJudgeForm.title}
                  onChange={(e) => setNewJudgeForm({ ...newJudgeForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">
                  PIN de Acceso Móvil (4 dígitos)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  pattern="\d{4}"
                  placeholder="Dejar vacío para generar PIN aleatorio"
                  value={newJudgeForm.accessPin}
                  onChange={(e) => setNewJudgeForm({ ...newJudgeForm, accessPin: e.target.value.replace(/\D/g, "") })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-amber-400 text-xs font-mono font-bold outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-[#94A3B8] mt-0.5 block">
                  Si lo dejas vacío, el sistema le asignará un PIN de 4 dígitos automáticamente.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#0D1930] border border-[#263858] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#F8FAFC] block">Botón Dorado (Golden Buzzer)</span>
                  <span className="text-[10px] text-[#94A3B8]">Permite clasificar directo a un cantante a la gran final</span>
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
                  className="px-4 py-2 rounded-xl bg-[#0D1930] hover:bg-[#1a2e50] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
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
          <div className="w-full max-w-md bg-[#111F38] border border-[#263858] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#F8FAFC] flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                <span>Editar Jurado Oficial</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingJudge(null)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateJudge} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={editJudgeForm.name}
                  onChange={(e) => setEditJudgeForm({ ...editJudgeForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Cargo / Especialidad</label>
                <input
                  type="text"
                  value={editJudgeForm.title}
                  onChange={(e) => setEditJudgeForm({ ...editJudgeForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#F8FAFC]">PIN de Acceso Móvil (4 dígitos) *</label>
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
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-amber-400 text-sm font-mono font-black outline-none focus:border-amber-400 tracking-widest text-center"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#0D1930] border border-[#263858] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#F8FAFC] block">Botón Dorado (Golden Buzzer)</span>
                  <span className="text-[10px] text-[#94A3B8]">Permite dar pase dorado directo a la final</span>
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
                  className="px-4 py-2 rounded-xl bg-[#0D1930] hover:bg-[#1a2e50] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
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
          <div className="w-full max-w-md bg-[#111F38] border border-[#263858] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#F8FAFC] flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <span>Nuevo Criterio de Evaluación</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewCriteriaModal(false)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCriteria} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Nombre del Criterio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Afinación y Entonación / Carisma / Ritmo"
                  value={newCriteriaForm.name}
                  onChange={(e) => setNewCriteriaForm({ ...newCriteriaForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Descripción / Pauta para Jurados</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Precisión en las notas, control tonal y afinación a lo largo de la canción."
                  value={newCriteriaForm.description}
                  onChange={(e) => setNewCriteriaForm({ ...newCriteriaForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Puntaje Máximo *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={newCriteriaForm.maxScore}
                    onChange={(e) => setNewCriteriaForm({ ...newCriteriaForm, maxScore: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-amber-400 font-mono font-bold text-xs outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-[#94A3B8] mt-0.5 block">Escala habitual: 10</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Ponderación / Peso</label>
                  <input
                    type="number"
                    min={0.1}
                    max={5}
                    step={0.1}
                    required
                    value={newCriteriaForm.weight}
                    onChange={(e) => setNewCriteriaForm({ ...newCriteriaForm, weight: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-amber-400 font-mono font-bold text-xs outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-[#94A3B8] mt-0.5 block">Multiplicador (1.0)</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCriteriaModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#0D1930] hover:bg-[#1a2e50] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
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
          <div className="w-full max-w-md bg-[#111F38] border border-[#263858] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#F8FAFC] flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                <span>Editar Criterio de Evaluación</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCriteria(null)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCriteria} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Nombre del Criterio *</label>
                <input
                  type="text"
                  required
                  value={editCriteriaForm.name}
                  onChange={(e) => setEditCriteriaForm({ ...editCriteriaForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Descripción / Pauta</label>
                <textarea
                  rows={2}
                  value={editCriteriaForm.description}
                  onChange={(e) => setEditCriteriaForm({ ...editCriteriaForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Puntaje Máximo *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={editCriteriaForm.maxScore}
                    onChange={(e) => setEditCriteriaForm({ ...editCriteriaForm, maxScore: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-amber-400 font-mono font-bold text-xs outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Ponderación / Peso</label>
                  <input
                    type="number"
                    min={0.1}
                    max={5}
                    step={0.1}
                    required
                    value={editCriteriaForm.weight}
                    onChange={(e) => setEditCriteriaForm({ ...editCriteriaForm, weight: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-amber-400 font-mono font-bold text-xs outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCriteria(null)}
                  className="px-4 py-2 rounded-xl bg-[#0D1930] hover:bg-[#1a2e50] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: NUEVA FECHA / GALA                                    */}
      {/* ============================================================ */}
      {showNewStageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111F38] border border-[#263858] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#F8FAFC] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <span>Nueva Fecha / Gala</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewStageModal(false)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStage} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Título de la Gala *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Clasificatorias Día 1 / Semifinal / Gran Final"
                  value={newStageForm.title}
                  onChange={(e) => setNewStageForm({ ...newStageForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Tipo de Ronda *</label>
                  <select
                    value={newStageForm.stageType}
                    onChange={(e) => setNewStageForm({ ...newStageForm, stageType: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="AUDITIONS" className="bg-[#0D1930] text-[#F8FAFC]">Audiciones / Filtro</option>
                    <option value="QUALIFIERS" className="bg-[#0D1930] text-[#F8FAFC]">Clasificatorias</option>
                    <option value="SEMIFINALS" className="bg-[#0D1930] text-[#F8FAFC]">Semifinal</option>
                    <option value="FINALS" className="bg-[#0D1930] text-[#F8FAFC]">Gran Final</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Fecha Programada</label>
                  <input
                    type="date"
                    value={newStageForm.date}
                    onChange={(e) => setNewStageForm({ ...newStageForm, date: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-amber-400 font-mono text-xs outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Notas / Descripción (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Clasifican los 3 mejores puntajes de la noche para la Gran Final."
                  value={newStageForm.notes}
                  onChange={(e) => setNewStageForm({ ...newStageForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#0D1930] border border-[#263858] flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-[#F8FAFC]">Activar Inmediatamente</span>
                  <span className="text-[11px] text-[#94A3B8]">Fijar como la gala activa para la cabina y votaciones en vivo</span>
                </div>
                <input
                  type="checkbox"
                  checked={newStageForm.setActive}
                  onChange={(e) => setNewStageForm({ ...newStageForm, setActive: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewStageModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#0D1930] hover:bg-[#1a2e50] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Guardando..." : "Crear Gala"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDITAR FECHA / GALA                                   */}
      {/* ============================================================ */}
      {editingStage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111F38] border border-[#263858] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#F8FAFC] flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                <span>Editar Fecha / Gala</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingStage(null)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStage} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Título de la Gala *</label>
                <input
                  type="text"
                  required
                  value={editStageForm.title}
                  onChange={(e) => setEditStageForm({ ...editStageForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Tipo de Ronda</label>
                  <select
                    value={editStageForm.stageType}
                    onChange={(e) => setEditStageForm({ ...editStageForm, stageType: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="AUDITIONS" className="bg-[#0D1930] text-[#F8FAFC]">Audiciones / Filtro</option>
                    <option value="QUALIFIERS" className="bg-[#0D1930] text-[#F8FAFC]">Clasificatorias</option>
                    <option value="SEMIFINALS" className="bg-[#0D1930] text-[#F8FAFC]">Semifinal</option>
                    <option value="FINALS" className="bg-[#0D1930] text-[#F8FAFC]">Gran Final</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Estado de la Gala</label>
                  <select
                    value={editStageForm.status}
                    onChange={(e) => setEditStageForm({ ...editStageForm, status: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="SCHEDULED" className="bg-[#0D1930] text-[#F8FAFC]">Programada</option>
                    <option value="LIVE" className="bg-[#0D1930] text-[#F8FAFC]">En Vivo / Activa</option>
                    <option value="COMPLETED" className="bg-[#0D1930] text-[#F8FAFC]">Concluida</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Fecha Programada</label>
                <input
                  type="date"
                  value={editStageForm.date}
                  onChange={(e) => setEditStageForm({ ...editStageForm, date: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-amber-400 font-mono text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">Notas / Instrucciones</label>
                <textarea
                  rows={2}
                  value={editStageForm.notes}
                  onChange={(e) => setEditStageForm({ ...editStageForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#0D1930] border border-[#263858] flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-[#F8FAFC]">Marcar como Gala Activa</span>
                  <span className="text-[11px] text-[#94A3B8]">Los puntajes y actuaciones se sincronizarán con esta gala</span>
                </div>
                <input
                  type="checkbox"
                  checked={editStageForm.setActive}
                  onChange={(e) => setEditStageForm({ ...editStageForm, setActive: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStage(null)}
                  className="px-4 py-2 rounded-xl bg-[#0D1930] hover:bg-[#1a2e50] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
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
          <div className="w-full max-w-sm bg-[#111F38] border border-[#263858] rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#F8FAFC]">{showQrModal.title}</h3>
              <button onClick={() => setShowQrModal(null)} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl mx-auto inline-block shadow-2xl">
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
              <div className="p-2.5 rounded-xl bg-[#0D1930] border border-[#263858]">
                <span className="text-xs text-[#94A3B8]">PIN de Acceso: </span>
                <strong className="text-amber-400 font-mono text-base">{showQrModal.pin}</strong>
              </div>
            )}

            <p className="text-[11px] text-[#94A3B8]">
              Escanea con la cámara del celular para abrir el panel de votación al instante sin contraseña.
            </p>

            <button
              onClick={() => {
                navigator.clipboard.writeText(showQrModal.url);
                showFeedback("success", "Enlace copiado al portapapeles");
              }}
              className="w-full py-2.5 rounded-xl bg-[#0D1930] hover:bg-[#1a2e50] border border-[#263858] text-[#F8FAFC] text-xs font-bold cursor-pointer transition-colors"
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
          <div className="w-full max-w-2xl bg-[#111F38] border border-[#263858] rounded-2xl p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-amber-400" />
                  <span>Auditoría de Votos de Mesas en Vivo</span>
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  {currentPerformance?.participant.stageName || currentPerformance?.participant.name || "Actuación en Escenario"} &bull; "{currentPerformance?.songTitle}"
                </p>
              </div>
              <button
                onClick={() => setShowPublicVotesModal(false)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 p-3.5 rounded-xl bg-[#0D1930] border border-[#263858]">
              <div>
                <span className="text-xs text-[#94A3B8]">Total Votos Emitidos:</span>
                <span className="text-sm font-black text-[#F8FAFC] ml-2 font-mono">
                  {publicVotesAudit?.totalVotes || 0}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#94A3B8]">Promedio de Estrellas:</span>
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
                    className="p-3.5 rounded-xl bg-[#0D1930] border border-[#263858] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1.5 rounded-xl bg-[#111F38] border border-[#263858] font-black text-[#F8FAFC]">
                        {v.tableLabel}
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-amber-400">
                          {Array.from({ length: v.stars }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                          <span className="font-mono font-bold ml-1 text-[#F8FAFC]">({v.stars} / 5)</span>
                        </div>
                        <span className="text-[10px] text-[#94A3B8] font-mono">
                          Dispositivo: {v.voterId}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#94A3B8] block font-mono">
                        {new Date(v.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                      {v.cheerCount > 0 && (
                        <span className="text-[10px] font-bold text-cyan-400">+{v.cheerCount} ánimos</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-[#94A3B8] text-xs">
                  Aún no se han recibido votos del público para esta actuación.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#263858] flex justify-between items-center">
              <button
                onClick={() => {
                  if (selectedContestId && currentPerformance?.id) {
                    fetchPerformancePublicVotes(selectedContestId, currentPerformance.id);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#0D1930] hover:bg-[#1a2e50] border border-[#263858] text-[#F8FAFC] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refrescar Votos</span>
              </button>
              <button
                onClick={() => setShowPublicVotesModal(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-amber-500/20 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: MARCA OFICIAL, LOGO, AUSPICIADORES Y ORGANIZADORES    */}
      {/* ============================================================ */}
      {showBrandingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#111F38] border border-[#263858] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#263858] pb-3">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-black text-[#F8FAFC]">
                    Configuración de Marca, Logo y Auspiciadores
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    Personaliza logotipos, patrocinadores, premios y directores del certamen
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBrandingModal(false)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logo URL */}
                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC] mb-1">
                    URL del Logo Oficial del Certamen o Local
                  </label>
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/logo-certamen.png"
                    value={brandingForm.logoUrl}
                    onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 font-mono"
                  />
                  <span className="text-[10px] text-[#94A3B8] mt-1 block">
                    Membrete en el acta notarial, diplomas y pantalla gigante.
                  </span>
                </div>

                {/* Previsualización del Logo */}
                <div className="flex items-center gap-3 p-3 bg-[#0D1930] rounded-xl border border-[#263858]">
                  <div className="w-16 h-16 rounded-xl bg-[#111F38] border border-[#263858] flex items-center justify-center overflow-hidden shrink-0">
                    {brandingForm.logoUrl ? (
                      <img src={brandingForm.logoUrl} alt="Preview" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Trophy className="w-7 h-7 text-[#64748B]" />
                    )}
                  </div>
                  <div className="text-xs text-[#94A3B8]">
                    <strong className="text-[#F8FAFC] block">Previsualización</strong>
                    <span className="text-[11px]">
                      {brandingForm.logoUrl ? "Logo asignado correctamente" : "Sin logo (se usará el escudo oficial Vidjs)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Imagen de Portada / Banner */}
              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">
                  URL de Imagen de Portada o Banner de Gala (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/banner-gala.jpg"
                  value={brandingForm.coverUrl}
                  onChange={(e) => setBrandingForm({ ...brandingForm, coverUrl: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 font-mono"
                />
              </div>

              {/* Auspiciadores, Patrocinadores y Colaboradores */}
              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">
                  Auspiciadores, Patrocinadores & Marcas Colaboradoras
                </label>
                <textarea
                  rows={3}
                  placeholder={`Ejemplo (uno por línea):\nCerveza Corona | Patrocinador Oficial | https://ejemplo.com/logo-corona.png\nAudio Pro Master | Auspicio Técnico de Sonido\nRestaurante El Gaucho | Premio Especial Cena VIP`}
                  value={brandingForm.sponsors}
                  onChange={(e) => setBrandingForm({ ...brandingForm, sponsors: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 resize-none font-mono"
                />
                <span className="text-[10px] text-[#94A3B8] mt-1 block">
                  Formato recomendado: <code>Nombre de Marca | Categoría | LogoUrl</code> o un nombre de empresa por renglón.
                </span>
              </div>

              {/* Comité Organizador & Directores */}
              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">
                  Comité Organizador, Directores & DJ Anfitrión
                </label>
                <textarea
                  rows={2}
                  placeholder={`Director del Certamen: Oscar Sam\nDJ Anfitrión / Sonido: DJ Sam\nProductora General: Vidjs Live`}
                  value={brandingForm.organizers}
                  onChange={(e) => setBrandingForm({ ...brandingForm, organizers: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 resize-none font-mono"
                />
              </div>

              {/* Premios en Disputa */}
              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">
                  Premios Oficiales del Certamen
                </label>
                <textarea
                  rows={2}
                  placeholder={`🥇 1er Lugar: Trofeo de Oro + $500.000 + Grabación de Single\n🥈 2do Lugar: Trofeo de Plata + $200.000\n🥉 3er Lugar: Medalla de Bronce + Cena VIP`}
                  value={brandingForm.prizes}
                  onChange={(e) => setBrandingForm({ ...brandingForm, prizes: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 resize-none"
                />
              </div>

              {/* Reglamento / Notas */}
              <div>
                <label className="block text-xs font-bold text-[#F8FAFC] mb-1">
                  Reglamento o Mensaje Institucional de Clausura (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Certamen regido bajo normas internacionales de entonación y carisma escénico."
                  value={brandingForm.rules}
                  onChange={(e) => setBrandingForm({ ...brandingForm, rules: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] text-[#F8FAFC] text-xs outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[#263858] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBrandingModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#0D1930] hover:bg-[#1a2e50] border border-[#263858] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Guardando..." : "Guardar Configuración"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Estilos Globales de Impresión Notarial A4 */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          nav,
          header,
          aside,
          button,
          .no-print {
            display: none !important;
          }
          .acta-document {
            background: #ffffff !important;
            color: #000000 !important;
            border: 2px solid #000000 !important;
            padding: 16px !important;
            margin: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
          }
          .acta-document * {
            color: #000000 !important;
            border-color: #9ca3af !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
