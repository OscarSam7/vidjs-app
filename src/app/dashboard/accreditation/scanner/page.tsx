"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAccreditation } from "@/lib/accreditation/context";
import {
  ScanLine,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  DoorOpen,
  Users,
  Search,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Building,
  Calendar,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

// Web Audio API sound synthesizers (no external MP3 dependencies)
function playBeep(type: "APPROVED" | "REJECTED" | "DUPLICATE") {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (type === "APPROVED") {
      // Pleasant high-pitched double chime
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.25);
    } else if (type === "REJECTED") {
      // Low saw-wave buzzer
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else {
      // Warning triple beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

export default function AccessScannerPage() {
  const { activeEvent, activeEventId, isOnline } = useAccreditation();

  const [accessPoints, setAccessPoints] = useState<any[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string>("");
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Scan Result State
  const [lastScan, setLastScan] = useState<{
    status: "APPROVED" | "REJECTED" | "DUPLICATE" | null;
    message: string;
    participant?: any;
    accessPoint?: any;
    rejectionReason?: string;
    timestamp?: string;
  } | null>(null);

  // Session scan counter
  const [sessionCount, setSessionCount] = useState(0);

  // Camera video reference
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Load doors for the active event
  useEffect(() => {
    if (!activeEventId) return;

    fetch(`/api/v1/accreditation/access-points?eventId=${activeEventId}`)
      .then((res) => res.json())
      .then((d) => {
        const pts = d.accessPoints || [];
        setAccessPoints(pts);
        if (pts.length > 0 && !selectedPointId) {
          setSelectedPointId(pts[0].id);
        }
      })
      .catch(console.error);
  }, [activeEventId, selectedPointId]);

  // Handle Verify QR Token
  const handleVerifyScan = useCallback(
    async (tokenOrCode: string) => {
      const cleanToken = tokenOrCode.trim();
      if (!cleanToken || isProcessing || !activeEventId) return;

      try {
        setIsProcessing(true);
        const res = await fetch("/api/v1/accreditation/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: activeEventId,
            qrToken: cleanToken,
            accessPointId: selectedPointId || undefined,
            direction: "IN",
          }),
        });

        const data = await res.json();
        const status = data.status || (res.ok ? "APPROVED" : "REJECTED");

        if (soundEnabled) {
          playBeep(status as any);
        }

        if (status === "APPROVED") {
          setSessionCount((prev) => prev + 1);
        }

        setLastScan({
          status,
          message: data.message || (status === "APPROVED" ? "Acceso autorizado" : "Acceso denegado"),
          participant: data.participant,
          accessPoint: data.accessPoint,
          rejectionReason: data.rejectionReason,
          timestamp: new Date().toLocaleTimeString("es-PY"),
        });

        setManualCode("");
      } catch (err: any) {
        if (soundEnabled) playBeep("REJECTED");
        setLastScan({
          status: "REJECTED",
          message: err.message || "Error al conectar con el servidor",
          timestamp: new Date().toLocaleTimeString("es-PY"),
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [activeEventId, selectedPointId, isProcessing, soundEnabled]
  );

  // Laser barcode scanner gun keyboard listener (rapid keystrokes followed by Enter)
  const barcodeBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        if (barcodeBufferRef.current.length >= 4) {
          handleVerifyScan(barcodeBufferRef.current);
          barcodeBufferRef.current = "";
        }
      } else if (e.key.length === 1) {
        if (diff > 200) {
          // Reset buffer if delay between keystrokes was too long (human typing)
          barcodeBufferRef.current = e.key;
        } else {
          barcodeBufferRef.current += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleVerifyScan]);

  // Start Camera Stream
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      setCameraError("No se pudo acceder a la cámara. Concede permisos o utiliza un lector láser / entrada manual.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Continuous Camera QR scanning using BarcodeDetector if available in browser
  useEffect(() => {
    let animId: number;
    let detector: any = null;

    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      } catch (e) {
        detector = null;
      }
    }

    const scanFrame = async () => {
      if (isCameraActive && videoRef.current && detector && !isProcessing) {
        try {
          if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue;
              if (rawValue) {
                handleVerifyScan(rawValue);
              }
            }
          }
        } catch (e) {
          // Frame error, continue
        }
      }
      animId = requestAnimationFrame(scanFrame);
    };

    if (isCameraActive && detector) {
      animId = requestAnimationFrame(scanFrame);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isCameraActive, isProcessing, handleVerifyScan]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner with Gate Selector & Session Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60">
              {activeEvent?.name || "EVENTO"}
            </span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Escáner Activo
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-emerald-400" />
            Control de Acceso & Escáner QR de Alta Velocidad
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Compatible con cámaras de celular, tablets, computadoras y lectores de código láser USB/Bluetooth
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              "p-2 rounded-xl border transition-colors",
              soundEnabled
                ? "bg-purple-950/60 border-purple-700/60 text-purple-300"
                : "bg-slate-800 border-slate-700 text-slate-500"
            )}
            title={soundEnabled ? "Sonido activado" : "Sonido silenciado"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Door Selector */}
          <div className="flex items-center gap-2 bg-[#0A1322] border border-[#263858] rounded-xl px-3 py-1.5 shadow-sm">
            <DoorOpen className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-400">Punto de Control</span>
              <select
                value={selectedPointId}
                onChange={(e) => setSelectedPointId(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-3"
              >
                {accessPoints.map((pt) => (
                  <option key={pt.id} value={pt.id} className="bg-[#0F1E36] text-white">
                    {pt.name} ({pt.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Session check-ins counter */}
          <div className="px-3.5 py-1.5 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-center">
            <span className="text-[9px] text-emerald-300 uppercase block font-semibold">
              Ingresos en Sesión
            </span>
            <strong className="text-emerald-400 font-mono text-base">{sessionCount}</strong>
          </div>
        </div>
      </div>

      {/* Main Two-Column Scanner Interface */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Camera Viewfinder & Manual Input */}
        <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-purple-400" />
              Cámara & Visor QR
            </span>
            {!isCameraActive ? (
              <Button
                variant="outline"
                size="sm"
                onClick={startCamera}
                className="border-purple-600/50 text-purple-300 text-xs flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Encender Cámara</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={stopCamera}
                className="border-red-800 text-red-300 text-xs flex items-center gap-1"
              >
                <CameraOff className="w-3.5 h-3.5" />
                <span>Apagar</span>
              </Button>
            )}
          </div>

          {/* Viewfinder Screen */}
          <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-[#263858] flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className={cn("w-full h-full object-cover", !isCameraActive && "hidden")}
            />

            {!isCameraActive && (
              <div className="text-center p-6 text-slate-500">
                <CameraOff className="w-12 h-12 mx-auto mb-2 text-slate-600" />
                <p className="text-xs font-semibold">Cámara apagada</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  Enciende la cámara para escanear en vivo o utiliza un lector láser / pistola conectada.
                </p>
              </div>
            )}

            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-emerald-400 rounded-2xl relative shadow-2xl animate-pulse">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400" />
                </div>
              </div>
            )}
          </div>

          {cameraError && (
            <p className="text-xs text-amber-300 bg-amber-950/60 p-2.5 rounded-lg border border-amber-800">
              {cameraError}
            </p>
          )}

          {/* Manual / Laser input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyScan(manualCode);
            }}
            className="pt-2 border-t border-[#263858]/60 space-y-2"
          >
            <label className="block text-xs font-semibold text-slate-300">
              Ingreso Manual o Lector Láser (Pistola USB/Bluetooth)
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Pega token QR o escanea con pistola..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                disabled={isProcessing}
                className="bg-[#0A1322] border-[#263858] text-white font-mono text-xs flex-1"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={isProcessing || !manualCode.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4"
              >
                {isProcessing ? "Validando..." : "Validar"}
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Giant Visual Response Card (VERDE / ROJO / AMARILLO) */}
        <div className="flex flex-col justify-center">
          {!lastScan ? (
            <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-8 text-center space-y-3 h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                <ScanLine className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-white">Listo para Escanear</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Apunta la cámara al código QR de la credencial o presiona el gatillo del lector láser.
              </p>
            </div>
          ) : lastScan.status === "APPROVED" ? (
            // Card VERDE: Acceso Autorizado (Fase 7)
            <div className="bg-emerald-950/40 border-2 border-emerald-500 rounded-2xl p-6 shadow-2xl space-y-4 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-lg shrink-0">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-emerald-400">
                    ACCESO AUTORIZADO
                  </span>
                  <h3 className="text-2xl font-black text-white">
                    {lastScan.participant?.firstName} {lastScan.participant?.lastName}
                  </h3>
                </div>
              </div>

              {/* Category & Details */}
              <div className="p-4 bg-[#0A1322] border border-emerald-800/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Categoría:</span>
                  <span
                    className="px-2.5 py-0.5 rounded font-mono font-bold text-xs uppercase"
                    style={{
                      backgroundColor: lastScan.participant?.colorHex || "#10B981",
                      color: "#FFFFFF",
                    }}
                  >
                    {lastScan.participant?.category}
                  </span>
                </div>

                {lastScan.participant?.company && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Empresa:</span>
                    <strong className="text-white">{lastScan.participant.company}</strong>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Documento:</span>
                  <span className="font-mono text-slate-200">
                    {lastScan.participant?.documentType}: {lastScan.participant?.documentNumber}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Nº Credencial:</span>
                  <span className="font-mono font-bold text-purple-400">
                    {lastScan.participant?.codeNumber}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-900/60">
                  <span className="text-slate-400">Hora de Ingreso:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {lastScan.timestamp}
                  </span>
                </div>
              </div>
            </div>
          ) : lastScan.status === "DUPLICATE" ? (
            // Card AMARILLO: Duplicado / Ya Ingresó (Fase 7)
            <div className="bg-amber-950/40 border-2 border-amber-500 rounded-2xl p-6 shadow-2xl space-y-4 animate-fade-in relative">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-lg shrink-0">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-amber-400">
                    ¡ATENCIÓN! ACCESO YA REGISTRADO
                  </span>
                  <h3 className="text-xl font-bold text-white">
                    {lastScan.participant?.firstName} {lastScan.participant?.lastName}
                  </h3>
                </div>
              </div>

              <div className="p-3.5 bg-[#0A1322] border border-amber-800/80 rounded-xl space-y-1.5 text-xs">
                <p className="text-amber-200 font-medium">{lastScan.message}</p>
                <div className="text-slate-400 pt-1">
                  Categoría: <strong className="text-white">{lastScan.participant?.category}</strong>
                </div>
                <div className="text-slate-400">
                  Total ingresos previos:{" "}
                  <strong className="text-amber-300 font-mono">
                    {lastScan.participant?.totalCheckIns}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            // Card ROJO: Rechazado / Falsificación / Sector Restringido (Fase 7)
            <div className="bg-red-950/40 border-2 border-red-500 rounded-2xl p-6 shadow-2xl space-y-4 animate-fade-in relative">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shrink-0">
                  <XCircle className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-red-400">
                    ACCESO DENEGADO
                  </span>
                  <h3 className="text-xl font-bold text-white">
                    {lastScan.rejectionReason || "RECHAZADO"}
                  </h3>
                </div>
              </div>

              <div className="p-3.5 bg-[#0A1322] border border-red-800/80 rounded-xl text-xs space-y-1">
                <p className="text-red-200 font-medium">{lastScan.message}</p>
                {lastScan.participant && (
                  <p className="text-slate-400 pt-1">
                    Titular: {lastScan.participant.firstName} {lastScan.participant.lastName}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
