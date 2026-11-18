"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Smartphone,
  LogOut,
  RefreshCw,
  KeyRound,
  Building2,
  UserCheck,
  Download,
  Navigation,
} from "lucide-react";
import { calculateDistanceMeters } from "@/lib/staff/staff-service";

interface StaffProfile {
  id: string;
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
}

interface VenueGpsInfo {
  id: string;
  name: string;
  address?: string | null;
  latitude: number | null;
  longitude: number | null;
  gpsRadiusMeters: number;
}

interface AttendanceStatus {
  hasCheckedIn: boolean;
  checkInAt: string | null;
  hasCheckedOut: boolean;
  checkOutAt: string | null;
  status: string;
}

export default function StaffAttendanceMobilePage() {
  const [inviteKey, setInviteKey] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [venue, setVenue] = useState<VenueGpsInfo | null>(null);
  const [attendance, setAttendance] = useState<AttendanceStatus | null>(null);

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [punching, setPunching] = useState(false);
  const [punchMessage, setPunchMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  // Detectar soporte para instalación PWA ("Descargar App")
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsPwaInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsPwaInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert("Para instalar la app: toca el menú de tu navegador (los 3 puntos o Compartir) y selecciona 'Agregar a pantalla principal' o 'Instalar aplicación'.");
    }
  };

  // Cargar estado del colaborador guardado en localStorage
  const loadStoredSession = useCallback(async (savedStaffId: string) => {
    try {
      const res = await fetch(`/api/v1/staff/mobile/status?staffId=${savedStaffId}`);
      const data = await res.json();

      if (data.success) {
        setStaff(data.data.staff);
        setVenue(data.data.venue);
        setAttendance(data.data.attendance);
      } else {
        localStorage.removeItem("zynko_staff_id");
      }
    } catch {
      // Ignorar error transitorio de red
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedStaffId = localStorage.getItem("zynko_staff_id");
      if (savedStaffId) {
        loadStoredSession(savedStaffId);
      }
    }
  }, [loadStoredSession]);

  // Actualizar coordenadas GPS en tiempo real
  const requestCurrentLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsError("Tu dispositivo no soporta geolocalización.");
      return;
    }

    setLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setGpsError("Permiso de GPS denegado. Habilita la ubicación en tu navegador para marcar.");
        } else if (err.code === 2) {
          setGpsError("No se pudo obtener señal GPS. Intenta al aire libre o cerca de una ventana.");
        } else {
          setGpsError("Tiempo de espera GPS agotado. Vuelve a intentar.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  }, []);

  // Solicitar ubicación al tener sucursal
  useEffect(() => {
    if (staff && venue) {
      requestCurrentLocation();
    }
  }, [staff, venue, requestCurrentLocation]);

  // Distancia calculada en metros entre el empleado y el local
  const currentDistanceMeters = useMemo(() => {
    if (!currentCoords || !venue || venue.latitude == null || venue.longitude == null) {
      return null;
    }
    return calculateDistanceMeters(
      venue.latitude,
      venue.longitude,
      currentCoords.lat,
      currentCoords.lng
    );
  }, [currentCoords, venue]);

  const radiusLimit = venue?.gpsRadiusMeters || 100;
  const isInsideRadius = currentDistanceMeters !== null && currentDistanceMeters <= radiusLimit;

  // Vincular con clave de invitación (24 horas)
  const handleLinkDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteKey.trim()) {
      setLinkError("Ingresa tu clave de invitación.");
      return;
    }

    try {
      setLinking(true);
      setLinkError(null);

      const res = await fetch("/api/v1/staff/mobile/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteKey: inviteKey.trim() }),
      });

      const data = await res.json();
      if (!data.success) {
        setLinkError(data.error || "Clave no válida o expirada.");
        return;
      }

      const staffData = data.data.staff;
      setStaff(staffData);
      setVenue(data.data.venue);

      if (typeof window !== "undefined") {
        localStorage.setItem("zynko_staff_id", staffData.id);
      }

      await loadStoredSession(staffData.id);
    } catch (err: any) {
      setLinkError("Error al conectar con el servidor.");
    } finally {
      setLinking(false);
    }
  };

  // Marcar Entrada o Salida
  const handlePunch = async (action: "CHECK_IN" | "CHECK_OUT") => {
    if (!staff || !currentCoords) {
      requestCurrentLocation();
      return;
    }

    try {
      setPunching(true);
      setPunchMessage(null);

      const res = await fetch("/api/v1/staff/mobile/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staff.id,
          action,
          latitude: currentCoords.lat,
          longitude: currentCoords.lng,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setPunchMessage({ type: "error", text: data.error || "No se pudo registrar la marcación." });
        return;
      }

      setPunchMessage({ type: "success", text: data.message });
      await loadStoredSession(staff.id);
    } catch (err: any) {
      setPunchMessage({ type: "error", text: "Error de red al marcar asistencia." });
    } finally {
      setPunching(false);
    }
  };

  const handleUnlink = () => {
    if (confirm("¿Deseas desvincular este dispositivo? Necesitarás una nueva clave de tu administrador.")) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("zynko_staff_id");
      }
      setStaff(null);
      setVenue(null);
      setAttendance(null);
    }
  };

  // Formato de hora amigable (Ej: 11:16 AM)
  const formatTimeOnly = (dateString?: string | null) => {
    if (!dateString) return "--:--";
    const d = new Date(dateString);
    return d.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateFriendly = (dateString?: string | null) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#070D18] text-white flex flex-col justify-between selection:bg-cyan-500/30">
      {/* Barra superior de la App */}
      <header className="px-5 py-4 border-b border-slate-800/80 bg-[#0A1324]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-cyan-950/40">
              C
            </div>
            <div>
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block leading-none">
                CYNKO STAFF
              </span>
              <h1 className="text-sm font-extrabold text-white leading-tight">Control de Asistencia</h1>
            </div>
          </div>

          {/* Botón Descargar / Instalar App */}
          {!isPwaInstalled && (
            <button
              type="button"
              onClick={handleInstallApp}
              className="px-2.5 py-1 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 hover:bg-cyan-500/30 transition-all shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar App</span>
            </button>
          )}

          {staff && (
            <button
              type="button"
              onClick={handleUnlink}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
              title="Desvincular celular"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 px-5 py-6 max-w-md mx-auto w-full flex flex-col justify-center">
        {/* ================= PANTALLA 1: VINCULAR DISPOSITIVO CON CLAVE ================= */}
        {!staff ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border-2 border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-cyan-950/30">
              <KeyRound className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">Vincular Celular</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto mb-6">
              Ingresa la clave de 6 dígitos que te facilitó el administrador de tu local para habilitar tu marcación.
            </p>

            <form onSubmit={handleLinkDevice} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={inviteKey}
                  onChange={(e) => {
                    setInviteKey(e.target.value.toUpperCase());
                    setLinkError(null);
                  }}
                  placeholder="Ej: CK-8492"
                  maxLength={10}
                  className="w-full text-center text-3xl font-mono font-black uppercase tracking-widest py-3.5 px-4 bg-[#0D182B] border-2 border-slate-700/80 rounded-2xl text-white focus:outline-none focus:border-cyan-400 transition-colors shadow-2xl"
                />
              </div>

              {linkError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{linkError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={linking || !inviteKey.trim()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-cyan-950/60 flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              >
                {linking ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserCheck className="w-5 h-5" />
                    <span>Habilitar Mi Dispositivo</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2.5 text-left">
              <Smartphone className="w-5 h-5 text-cyan-400 shrink-0" />
              <span>
                Para marcar asistencia necesitas instalar esta app en tu pantalla de inicio y tener el GPS activo.
              </span>
            </div>
          </div>
        ) : (
          /* ================= PANTALLA 2: COLABORADOR VINCULADO Y MARCACIÓN GPS ================= */
          <div className="space-y-6">
            {/* Tarjeta del Colaborador y Local */}
            <div className="p-4 rounded-3xl bg-[#0B1527] border border-slate-800/80 shadow-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {staff.role}
                </span>
                <h2 className="text-lg font-black text-white mt-1 leading-tight">{staff.name}</h2>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{venue?.name || "Sede Principal"}</span>
                </p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-cyan-400 font-bold text-lg">
                {staff.name.substring(0, 1)}
              </div>
            </div>

            {/* Estado Geofence GPS (100 mts) */}
            <div
              className={`p-4 rounded-3xl border transition-all shadow-xl ${
                isInsideRadius
                  ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200"
                  : currentDistanceMeters !== null
                  ? "bg-rose-950/20 border-rose-500/40 text-rose-200"
                  : "bg-slate-900 border-slate-800 text-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className={`w-4 h-4 ${isInsideRadius ? "text-emerald-400" : "text-rose-400"}`} />
                  Geolocalización GPS
                </span>

                <button
                  type="button"
                  onClick={requestCurrentLocation}
                  disabled={locating}
                  className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 px-2 transition-all"
                  title="Actualizar posición GPS"
                >
                  <RefreshCw className={`w-3 h-3 ${locating ? "animate-spin text-cyan-400" : ""}`} />
                  <span className="text-[10px]">{locating ? "Ubicando..." : "GPS"}</span>
                </button>
              </div>

              {gpsError ? (
                <div className="text-xs text-rose-400 mt-1 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{gpsError}</span>
                </div>
              ) : currentDistanceMeters !== null ? (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black">
                      {isInsideRadius ? `A ${currentDistanceMeters} metros` : `A ${currentDistanceMeters}m del local`}
                    </span>
                    <span className="text-xs text-slate-400">/ Máximo {radiusLimit}m</span>
                  </div>
                  <p className="text-xs mt-1 font-medium">
                    {isInsideRadius ? (
                      <span className="text-emerald-300 font-semibold">
                        ✓ Verificado dentro del local. Puedes marcar asistencia.
                      </span>
                    ) : (
                      <span className="text-rose-300 font-semibold">
                        ⚠ Fuera del radio permitido. Acércate a menos de {radiusLimit} metros del local para poder
                        marcar.
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="text-xs text-slate-400 flex items-center gap-2 py-1">
                  <Navigation className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span>Calculando distancia satelital al local...</span>
                </div>
              )}
            </div>

            {punchMessage && (
              <div
                className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg ${
                  punchMessage.type === "success"
                    ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-200"
                    : "bg-rose-500/20 border border-rose-500/40 text-rose-200"
                }`}
              >
                {punchMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{punchMessage.text}</span>
              </div>
            )}

            {/* ================= CASO A: AÚN NO MARCA ENTRADA ================= */}
            {!attendance?.hasCheckedIn && (
              <div className="text-center py-2">
                <button
                  type="button"
                  onClick={() => handlePunch("CHECK_IN")}
                  disabled={!isInsideRadius || punching || locating}
                  className="w-full py-5 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-lg uppercase tracking-wider shadow-2xl shadow-emerald-950/80 flex items-center justify-center gap-3 transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  {punching ? (
                    <div className="w-6 h-6 border-3 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-6 h-6" />
                      <span>Marcar Entrada (GPS)</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  {isInsideRadius
                    ? "Presiona para registrar tu hora de ingreso de hoy."
                    : `Debes estar a menos de ${radiusLimit} metros del local para marcar.`}
                </p>
              </div>
            )}

            {/* ================= CASO B: ENTRADA MARCADA (EN JORNADA) ================= */}
            {attendance?.hasCheckedIn && !attendance?.hasCheckedOut && (
              <div className="space-y-4">
                {/* Cuadro Limpio: Solo Hora de Entrada (SIN CRONÓMETRO NI CONTEO DE HORAS) */}
                <div className="p-5 rounded-3xl bg-[#09172A] border-2 border-emerald-500/40 shadow-xl text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Hora de Entrada Registrada
                  </span>
                  <div className="text-4xl font-black text-emerald-400 my-1 font-mono">
                    {formatTimeOnly(attendance.checkInAt)}
                  </div>
                  <p className="text-xs text-slate-400">{formatDateFriendly(attendance.checkInAt)}</p>
                </div>

                {/* Botón de Marcar Salida */}
                <button
                  type="button"
                  onClick={() => handlePunch("CHECK_OUT")}
                  disabled={!isInsideRadius || punching || locating}
                  className="w-full py-4.5 rounded-3xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 active:scale-95 text-slate-950 font-black text-base uppercase tracking-wider shadow-2xl shadow-rose-950/60 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  {punching ? (
                    <div className="w-6 h-6 border-3 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogOut className="w-5 h-5" />
                      <span>Marcar Salida</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-slate-500 text-center font-medium">
                  Registra tu salida al concluir tu turno.
                </p>
              </div>
            )}

            {/* ================= CASO C: SALIDA MARCADA (JORNADA FINALIZADA) ================= */}
            {attendance?.hasCheckedOut && (
              <div className="p-6 rounded-3xl bg-[#091624] border-2 border-slate-700/80 text-center shadow-2xl space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-black text-white">¡Jornada Finalizada!</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Tus marcaciones del día han sido registradas satelitalmente con éxito.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Entrada
                    </span>
                    <span className="text-lg font-black text-white font-mono">
                      {formatTimeOnly(attendance.checkInAt)}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Salida
                    </span>
                    <span className="text-lg font-black text-white font-mono">
                      {formatTimeOnly(attendance.checkOutAt)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 pt-1">¡Buen descanso!</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Pie de Página */}
      <footer className="px-5 py-4 border-t border-slate-800/60 text-center bg-[#070D18]">
        <div className="max-w-md mx-auto flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Validación GPS Satelital
          </span>
          <span className="font-extrabold text-slate-400">CYNKO OS</span>
        </div>
      </footer>
    </div>
  );
}
