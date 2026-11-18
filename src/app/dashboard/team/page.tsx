"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Users,
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  Plus,
  KeyRound,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Smartphone,
  Trash2,
  Edit3,
  Copy,
  Check,
  Navigation,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  Settings,
  X,
  Building2,
  DollarSign,
  AlertCircle,
  QrCode,
} from "lucide-react";
import { QRCodeImage } from "@/components/ui/QRCodeImage";

interface StaffMember {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  salaryType: "MONTHLY" | "DAILY" | "HOURLY";
  salaryAmount?: number | null;
  hasApp: boolean;
  appDeviceId?: string | null;
  inviteKey?: string | null;
  inviteExpiresAt?: string | null;
  status: string;
  venue?: { id: string; name: string } | null;
}

interface PendingKey {
  staffMemberId: string;
  staffName: string;
  inviteKey: string;
  expiresAt: string;
}

interface VenueOption {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  gpsRadiusMeters?: number;
}

interface DailyAttendanceRow {
  staffMember: StaffMember;
  record?: any;
  currentStatus: "PRESENT" | "ABSENT" | "LATE" | "PERMIT" | "SIN_REGISTRAR";
}

interface DailySummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  permit: number;
  unrecorded: number;
}

interface GpsRecord {
  id: string;
  staffMember: { id: string; name: string; role: string; email?: string | null };
  venue?: { id: string; name: string } | null;
  checkInAt?: string | null;
  checkInDistance?: number | null;
  checkInVerified: boolean;
  checkOutAt?: string | null;
  checkOutDistance?: number | null;
  workHours?: number | null;
  status: string;
  createdAt: string;
}

export default function StaffAndAttendanceDashboard() {
  const [activeTab, setActiveTab] = useState<"staff" | "daily" | "gps">("staff");

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [pendingKeys, setPendingKeys] = useState<PendingKey[]>([]);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState<string>("ALL");

  // Planilla Diaria
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dailyRows, setDailyRows] = useState<DailyAttendanceRow[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary>({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    permit: 0,
    unrecorded: 0,
  });
  const [loadingDaily, setLoadingDaily] = useState(false);

  // Historial GPS
  const [gpsHistory, setGpsHistory] = useState<GpsRecord[]>([]);
  const [loadingGps, setLoadingGps] = useState(false);

  // Modales
  const [isNewStaffOpen, setIsNewStaffOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isGpsConfigOpen, setIsGpsConfigOpen] = useState(false);

  // Estados formulario nuevo personal
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState("OPERATOR");
  const [formSalaryType, setFormSalaryType] = useState<"MONTHLY" | "DAILY" | "HOURLY">("MONTHLY");
  const [formSalaryAmount, setFormSalaryAmount] = useState("");
  const [formVenueId, setFormVenueId] = useState("");
  const [savingStaff, setSavingStaff] = useState(false);

  // Estados modal invitación
  const [inviteStaffId, setInviteStaffId] = useState("");
  const [generatedKeyResult, setGeneratedKeyResult] = useState<{
    key: string;
    expiresAt: string;
    staffName: string;
  } | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);

  // Estados modal GPS
  const [gpsVenueId, setGpsVenueId] = useState("");
  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [gpsRadius, setGpsRadius] = useState("100");
  const [detectingGps, setDetectingGps] = useState(false);
  const [savingGps, setSavingGps] = useState(false);
  const [gpsFeedback, setGpsFeedback] = useState<string | null>(null);

  // Cargar lista de colaboradores
  const fetchStaffData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/staff");
      const data = await res.json();

      if (data.success) {
        setStaffList(data.data.members || []);
        setPendingKeys(data.data.pendingKeys || []);
        setVenues(data.data.venues || []);
        if (data.data.venues?.length > 0 && !formVenueId) {
          setFormVenueId(data.data.venues[0].id);
          setGpsVenueId(data.data.venues[0].id);
          if (data.data.venues[0].latitude) {
            setGpsLat(data.data.venues[0].latitude.toString());
            setGpsLng(data.data.venues[0].longitude?.toString() || "");
            setGpsRadius((data.data.venues[0].gpsRadiusMeters || 100).toString());
          }
        }
      }
    } catch (err) {
      console.error("Error al cargar personal:", err);
    } finally {
      setLoading(false);
    }
  }, [formVenueId]);

  // Cargar planilla diaria
  const fetchDailySheet = useCallback(async (date: Date) => {
    try {
      setLoadingDaily(true);
      const formattedDate = date.toISOString().split("T")[0];
      const res = await fetch(`/api/v1/staff/attendances?view=daily&date=${formattedDate}`);
      const data = await res.json();

      if (data.success) {
        setDailyRows(data.data.rows || []);
        setDailySummary(data.data.summary);
      }
    } catch (err) {
      console.error("Error al cargar planilla diaria:", err);
    } finally {
      setLoadingDaily(false);
    }
  }, []);

  // Cargar historial GPS
  const fetchGpsHistory = useCallback(async () => {
    try {
      setLoadingGps(true);
      const res = await fetch("/api/v1/staff/attendances?view=gps");
      const data = await res.json();

      if (data.success) {
        setGpsHistory(data.data.gpsHistory || []);
      }
    } catch (err) {
      console.error("Error al cargar historial GPS:", err);
    } finally {
      setLoadingGps(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  useEffect(() => {
    if (activeTab === "daily") {
      fetchDailySheet(selectedDate);
    } else if (activeTab === "gps") {
      fetchGpsHistory();
    }
  }, [activeTab, selectedDate, fetchDailySheet, fetchGpsHistory]);

  // Navegación de fechas
  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Guardar marcación manual
  const handleMarkManual = async (staffMemberId: string, status: "PRESENT" | "ABSENT" | "LATE" | "PERMIT") => {
    try {
      setDailyRows((prev) =>
        prev.map((row) =>
          row.staffMember.id === staffMemberId ? { ...row, currentStatus: status } : row
        )
      );

      await fetch("/api/v1/staff/attendances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffMemberId,
          status,
          date: selectedDate.toISOString(),
        }),
      });

      fetchDailySheet(selectedDate);
    } catch (err) {
      console.error("Error al marcar asistencia manual:", err);
    }
  };

  // Crear colaborador
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      setSavingStaff(true);
      const res = await fetch("/api/v1/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim() || null,
          phone: formPhone.trim() || null,
          role: formRole,
          salaryType: formSalaryType,
          salaryAmount: formSalaryAmount || null,
          venueId: formVenueId || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsNewStaffOpen(false);
        setFormName("");
        setFormEmail("");
        setFormPhone("");
        fetchStaffData();
      } else {
        alert(data.error || "No se pudo crear el colaborador.");
      }
    } catch (err) {
      alert("Error de conexión al crear colaborador.");
    } finally {
      setSavingStaff(false);
    }
  };

  // Generar clave de invitación (24 horas)
  const handleGenerateInvite = async (staffIdToInvite?: string) => {
    const targetId = staffIdToInvite || inviteStaffId;
    if (!targetId) return;

    try {
      setGeneratingKey(true);
      const res = await fetch(`/api/v1/staff/${targetId}/invite`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        const staffObj = staffList.find((s) => s.id === targetId);
        setGeneratedKeyResult({
          key: data.data.inviteKey,
          expiresAt: data.data.expiresAt,
          staffName: staffObj?.name || "Colaborador",
        });
        setIsInviteModalOpen(true);
        fetchStaffData();
      }
    } catch (err) {
      alert("Error al generar clave.");
    } finally {
      setGeneratingKey(false);
    }
  };

  // Detectar ubicación actual para Geocerca
  const handleDetectCurrentGps = () => {
    if (!navigator.geolocation) {
      setGpsFeedback("Geolocalización no soportada en este navegador.");
      return;
    }
    setDetectingGps(true);
    setGpsFeedback(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(pos.coords.latitude.toFixed(6));
        setGpsLng(pos.coords.longitude.toFixed(6));
        setGpsRadius("100");
        setDetectingGps(false);
        setGpsFeedback("¡Coordenadas actuales capturadas con éxito!");
      },
      (err) => {
        setDetectingGps(false);
        setGpsFeedback("No se pudo obtener la ubicación GPS. Verifica los permisos de tu navegador.");
      },
      { enableHighAccuracy: true }
    );
  };

  // Guardar GPS del local
  const handleSaveVenueGps = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingGps(true);
      const res = await fetch("/api/v1/staff/venue-gps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: gpsVenueId,
          latitude: gpsLat,
          longitude: gpsLng,
          gpsRadiusMeters: gpsRadius,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsGpsConfigOpen(false);
        fetchStaffData();
        alert("¡Geocerca GPS del local configurada con éxito!");
      }
    } catch (err) {
      alert("Error al guardar GPS.");
    } finally {
      setSavingGps(false);
    }
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesVenue = selectedVenueId === "ALL" || s.venue?.id === selectedVenueId;
      return matchesSearch && matchesVenue;
    });
  }, [staffList, searchQuery, selectedVenueId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 selection:bg-cyan-500/30">
      {/* ================= HEADER PRINCIPAL ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Mi Equipo y Asistencias</span>
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-widest">
              ZYNKO STAFF
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gestiona tu personal (con o sin app), roles, planilla diaria de asistencia y sueldos.
          </p>
        </div>

        {/* Botones de Cabecera (Idénticos a captura) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsNewStaffOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-950/50 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Nuevo Personal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setGeneratedKeyResult(null);
              setIsInviteModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-[#0F1E3D] hover:bg-[#142852] border border-cyan-500/40 text-cyan-300 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <span>Invitar Colaborador (App)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsGpsConfigOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Configurar radio y coordenadas GPS de la sucursal"
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">GPS Local (100m)</span>
          </button>
        </div>
      </div>

      {/* ================= PESTAÑAS (TABS) ================= */}
      <div className="flex items-center gap-3 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("staff")}
          className={`pb-3 px-4 font-black text-xs sm:text-sm uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "staff"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Mi Personal ({staffList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("daily")}
          className={`pb-3 px-4 font-black text-xs sm:text-sm uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "daily"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Planilla Diaria (Manual)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gps")}
          className={`pb-3 px-4 font-black text-xs sm:text-sm uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "gps"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Historial GPS</span>
        </button>
      </div>

      {/* ================= CONTENIDO PESTAÑA 1: MI PERSONAL ================= */}
      {activeTab === "staff" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda (2/3): Lista de Colaboradores */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Personal del Negocio
              </span>
              <span className="text-xs font-bold text-slate-500">{filteredStaff.length} colaboradores</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-cyan-400" />
                <p className="text-xs">Cargando equipo de trabajo...</p>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#0A1324] border border-slate-800 text-center">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-300">No hay colaboradores registrados</p>
                <p className="text-xs text-slate-500 mt-1">
                  Agrega a tu personal con el botón "+ Nuevo Personal" o invítalos con clave móvil.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStaff.map((staff) => (
                  <div
                    key={staff.id}
                    className="p-4 rounded-3xl bg-[#091322] border border-slate-800/90 shadow-xl flex items-center justify-between gap-4 transition-all hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold text-lg shrink-0">
                        {staff.name.substring(0, 1)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-white truncate">{staff.name}</h3>

                          {staff.hasApp ? (
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-black flex items-center gap-1">
                              <Smartphone className="w-3 h-3" />
                              APP MÓVIL
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold">
                              Sin App
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="font-bold text-white uppercase text-[11px]">{staff.role}</span>
                          <span>•</span>
                          <span className="text-slate-400 capitalize">
                            {staff.salaryType === "MONTHLY"
                              ? "Mensual"
                              : staff.salaryType === "DAILY"
                              ? "Jornal"
                              : "Por Hora"}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {staff.email || staff.phone || "Sin contacto registrado"}
                        </p>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleGenerateInvite(staff.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                        title="Generar clave móvil 24h"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Columna Derecha (1/3): Keys Pendientes (24h) */}
          <div className="space-y-4">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Keys Pendientes (24H)
            </span>

            <div className="p-5 rounded-3xl border-2 border-dashed border-slate-800 bg-[#070E1C] flex flex-col items-center justify-center text-center">
              {pendingKeys.length === 0 ? (
                <div className="py-8">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/60 text-slate-500 flex items-center justify-center mx-auto mb-2">
                    <KeyRound className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    No hay códigos activos
                  </span>
                  <p className="text-[11px] text-slate-600 max-w-[200px] mt-1">
                    Genera una clave con el botón superior para que un colaborador vincule su celular.
                  </p>
                </div>
              ) : (
                <div className="w-full space-y-3">
                  {pendingKeys.map((pk) => (
                    <div
                      key={pk.inviteKey}
                      className="p-3.5 rounded-2xl bg-[#0B1527] border border-cyan-500/30 text-left space-y-1 shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate max-w-[140px]">{pk.staffName}</span>
                        <span className="text-[10px] text-cyan-400 font-mono font-bold">24H</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-lg font-black font-mono tracking-widest text-cyan-300">
                          {pk.inviteKey}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(pk.inviteKey);
                            alert(`Clave ${pk.inviteKey} copiada`);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                          title="Copiar clave"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= CONTENIDO PESTAÑA 2: PLANILLA DIARIA (MANUAL) ================= */}
      {activeTab === "daily" && (
        <div className="p-6 rounded-3xl bg-[#091122] border border-slate-800 space-y-6 shadow-2xl">
          {/* Header de la Planilla Diaria */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <span>Control Diario de Asistencias</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Marca la presencia para habilitar el vale/beneficio del día a jornaleros y personal de turno.
              </p>
            </div>

            {/* Selector de Fecha */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevDay}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-4 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-black text-white font-mono">
                {selectedDate.toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </div>

              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase cursor-pointer"
              >
                Hoy
              </button>

              <button
                type="button"
                onClick={handleNextDay}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => fetchDailySheet(selectedDate)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 cursor-pointer"
                title="Refrescar planilla"
              >
                <RefreshCw className={`w-4 h-4 ${loadingDaily ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Tarjetas de Resumen (Idénticas a la imagen) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-[#0D182B] border border-slate-800 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Total Personal
              </span>
              <span className="text-2xl font-black text-white mt-1 block">{dailySummary.total}</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                Presentes
              </span>
              <span className="text-2xl font-black text-emerald-300 mt-1 block">{dailySummary.present}</span>
            </div>

            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/40 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">
                Ausentes
              </span>
              <span className="text-2xl font-black text-rose-300 mt-1 block">{dailySummary.absent}</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/40 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                Tardanzas
              </span>
              <span className="text-2xl font-black text-amber-300 mt-1 block">{dailySummary.late}</span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/40 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
                Permisos
              </span>
              <span className="text-2xl font-black text-blue-300 mt-1 block">{dailySummary.permit}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Sin Registrar
              </span>
              <span className="text-2xl font-black text-slate-400 mt-1 block">{dailySummary.unrecorded}</span>
            </div>
          </div>

          {/* Caja con la Regla de Beneficios (Copiada fielmente) */}
          <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/30 flex items-start gap-3">
            <span className="text-lg">💡</span>
            <p className="text-xs text-blue-200/90 leading-relaxed">
              <strong>Regla de beneficios:</strong> Los funcionarios con sueldo mensual tienen sus beneficios
              siempre continuos. Para el personal a jornal o por hora, marcar Presente o Tardanza les desbloquea
              automáticamente el vale diario o acumulación de la jornada.
            </p>
          </div>

          {/* Listado con Botones de 1 Clic */}
          <div className="space-y-3">
            {dailyRows.map((row) => (
              <div
                key={row.staffMember.id}
                className="p-4 rounded-2xl bg-[#070D1A] border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-sm shrink-0">
                    {row.staffMember.name.substring(0, 1)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">{row.staffMember.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {row.staffMember.role}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {row.staffMember.hasApp ? "📱 App Móvil" : "⚪ Sin App"}
                    </span>
                  </div>
                </div>

                {/* 4 Botones Rápidos (Presente, Ausente, Tardanza, Permiso) */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleMarkManual(row.staffMember.id, "PRESENT")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      row.currentStatus === "PRESENT"
                        ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/60"
                        : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    }`}
                  >
                    ✓ Presente
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkManual(row.staffMember.id, "AUSENTE")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      row.currentStatus === "AUSENTE"
                        ? "bg-rose-500 text-white shadow-md shadow-rose-950/60"
                        : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    }`}
                  >
                    ✕ Ausente
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkManual(row.staffMember.id, "LATE")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      row.currentStatus === "LATE"
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-950/60"
                        : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    }`}
                  >
                    ⏱ Tardanza
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkManual(row.staffMember.id, "PERMIT")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      row.currentStatus === "PERMIT"
                        ? "bg-blue-500 text-white shadow-md shadow-blue-950/60"
                        : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    }`}
                  >
                    📄 Permiso
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= CONTENIDO PESTAÑA 3: HISTORIAL GPS ================= */}
      {activeTab === "gps" && (
        <div className="p-6 rounded-3xl bg-[#091122] border border-slate-800 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <span>REGISTRO DE MARCACIONES GPS (APP MÓVIL)</span>
            </h2>
            <button
              type="button"
              onClick={fetchGpsHistory}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingGps ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Sucursal</th>
                  <th className="py-3 px-4">Entrada (GPS)</th>
                  <th className="py-3 px-4">Salida (GPS)</th>
                  <th className="py-3 px-4">Horas</th>
                  <th className="py-3 px-4">Estado GPS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {gpsHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No hay registros de marcación GPS registrados aún.
                    </td>
                  </tr>
                ) : (
                  gpsHistory.map((rec) => {
                    const checkInDate = rec.checkInAt ? new Date(rec.checkInAt) : null;
                    const checkOutDate = rec.checkOutAt ? new Date(rec.checkOutAt) : null;

                    return (
                      <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">
                          <div>{rec.staffMember.name}</div>
                          <span className="text-[10px] text-slate-400 font-normal">{rec.staffMember.role}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {rec.venue?.name || "CASA MATRIZ"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-mono">
                          {checkInDate
                            ? checkInDate.toLocaleString("es-AR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "---"}
                        </td>
                        <td className="py-3.5 px-4">
                          {checkOutDate ? (
                            <span className="font-mono text-slate-300">
                              {checkOutDate.toLocaleString("es-AR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black border border-cyan-500/40 animate-pulse">
                              ACTIVO (DENTRO)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          {rec.workHours ? `${rec.workHours} hrs` : "---"}
                        </td>
                        <td className="py-3.5 px-4">
                          {rec.checkInVerified ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black flex items-center gap-1 w-max">
                              <MapPin className="w-3 h-3" />
                              VERIFICADO (&lt;{Math.round(rec.checkInDistance || 20)}M)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black">
                              FUERA DE RANGO
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: NUEVO PERSONAL ================= */}
      {isNewStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0A1324] border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                <span>Registrar Nuevo Personal</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewStaffOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Delos Santos Molinas"
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Email (Opcional)</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+595 9..."
                    className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Rol en el Local</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="WAITER">MOZO / ATENCIÓN</option>
                    <option value="BARTENDER">BARTENDER / BARRA</option>
                    <option value="KITCHEN">COCINA</option>
                    <option value="CASHIER">CAJERO</option>
                    <option value="DJ">DJ / KJ</option>
                    <option value="SECURITY">SEGURIDAD</option>
                    <option value="CLEANING">LIMPIEZA</option>
                    <option value="OPERATOR">OPERADOR GENERAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Tipo de Sueldo</label>
                  <select
                    value={formSalaryType}
                    onChange={(e) => setFormSalaryType(e.target.value as any)}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="MONTHLY">Mensual</option>
                    <option value="DAILY">Jornal (Diario)</option>
                    <option value="HOURLY">Por Hora</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewStaffOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingStaff}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black"
                >
                  {savingStaff ? "Guardando..." : "Guardar Personal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: INVITAR COLABORADOR (APP MÓVIL) ================= */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0A1324] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-cyan-400" />
                <span>Invitar Colaborador a la App Móvil</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!generatedKeyResult ? (
              <div className="space-y-4 text-left">
                <p className="text-xs text-slate-400">
                  Selecciona el colaborador para generarle un código de vinculación válido por <strong>24 horas</strong>.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Colaborador</label>
                  <select
                    value={inviteStaffId}
                    onChange={(e) => setInviteStaffId(e.target.value)}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  >
                    <option value="">Selecciona un colaborador...</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleGenerateInvite()}
                  disabled={!inviteStaffId || generatingKey}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider disabled:opacity-40"
                >
                  {generatingKey ? "Generando..." : "Generar Clave de 24h"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Clave para {generatedKeyResult.staffName}
                  </span>
                  <div className="text-4xl font-black font-mono text-cyan-300 my-1 tracking-widest">
                    {generatedKeyResult.key}
                  </div>
                  <p className="text-[11px] text-slate-400">Válida por 24 horas</p>
                </div>

                {/* Código QR para Escanear Directo desde el Móvil */}
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl">
                  <QRCodeImage
                    value={
                      typeof window !== "undefined"
                        ? `${window.location.origin}/staff/asistencia`
                        : "https://vidjs.app/staff/asistencia"
                    }
                    size={130}
                  />
                  <p className="text-[10px] font-bold text-slate-900 mt-1">
                    Escanea para abrir la App de Asistencia
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 text-left">
                  1. El colaborador abre la app o ingresa a <strong>/staff/asistencia</strong>.<br />
                  2. Ingresa la clave <strong>{generatedKeyResult.key}</strong>.<br />
                  3. ¡Listo! Su celular queda vinculado para marcar con GPS.
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedKeyResult.key);
                    alert("Clave copiada al portapapeles");
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-4 h-4 text-cyan-400" />
                  <span>Copiar Clave</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIGURAR GPS SUCURSAL (100M) ================= */}
      {isGpsConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0A1324] border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <span>Geocerca GPS del Local (100 mts)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsGpsConfigOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVenueGps} className="space-y-4 text-xs">
              <p className="text-slate-400">
                Define las coordenadas GPS exactas de tu local para que el personal solo pueda marcar cuando esté a
                menos de <strong>100 metros</strong>.
              </p>

              <button
                type="button"
                onClick={handleDetectCurrentGps}
                disabled={detectingGps}
                className="w-full py-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Navigation className={`w-4 h-4 ${detectingGps ? "animate-spin text-emerald-400" : ""}`} />
                <span>{detectingGps ? "Detectando satélites..." : "Obtener mi ubicación GPS actual"}</span>
              </button>

              {gpsFeedback && (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-cyan-300">
                  {gpsFeedback}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Latitud</label>
                  <input
                    type="text"
                    required
                    value={gpsLat}
                    onChange={(e) => setGpsLat(e.target.value)}
                    placeholder="-25.2965"
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Longitud</label>
                  <input
                    type="text"
                    required
                    value={gpsLng}
                    onChange={(e) => setGpsLng(e.target.value)}
                    placeholder="-57.6234"
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Radio de Tolerancia (Metros)</label>
                <input
                  type="number"
                  required
                  value={gpsRadius}
                  onChange={(e) => setGpsRadius(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Por defecto: 100 metros</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGpsConfigOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingGps || !gpsLat || !gpsLng}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black disabled:opacity-40"
                >
                  {savingGps ? "Guardando..." : "Guardar Coordenadas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
