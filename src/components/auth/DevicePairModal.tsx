"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Laptop,
  X,
  Camera,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  ScanLine,
  Zap,
} from "lucide-react";

// Síntesis de sonido con Web Audio API para feedback inmediato
function playSuccessBeep() {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  } catch {}
}

interface DevicePairModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DevicePairModal({ isOpen, onClose }: DevicePairModalProps) {
  const [activeTab, setActiveTab] = useState<"CAMERA" | "PIN">("CAMERA");
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ pcDeviceInfo?: string } | null>(null);

  const scannerRef = useRef<any>(null);
  const isAuthorizingRef = useRef(false);

  // Función común para autorizar un código o PIN detectado
  const executeAuthorize = useCallback(
    async ({ code, pin }: { code?: string; pin?: string }) => {
      if (isAuthorizingRef.current) return;
      isAuthorizingRef.current = true;
      setIsSubmitting(true);
      setErrorMsg(null);

      try {
        const res = await fetch("/api/v1/auth/qr/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: code?.trim() || undefined,
            pin: pin?.trim() || undefined,
            action: "APPROVE",
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "No se pudo autorizar el dispositivo");
        }

        playSuccessBeep();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate([100, 50, 100]);
          } catch {}
        }

        setSuccessInfo({ pcDeviceInfo: data.pcDeviceInfo });

        // Cerrar modal automáticamente tras 2 segundos de éxito
        setTimeout(() => {
          onClose();
          setSuccessInfo(null);
          setPin("");
          isAuthorizingRef.current = false;
        }, 2200);
      } catch (err: unknown) {
        isAuthorizingRef.current = false;
        if (err instanceof Error) {
          setErrorMsg(err.message);
        } else {
          setErrorMsg("Error inesperado al conectar dispositivo");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [onClose]
  );

  // Parsear texto escaneado por la cámara
  const handleDecodedText = useCallback(
    async (decodedText: string) => {
      if (!decodedText || isAuthorizingRef.current) return;

      let extractedCode: string | undefined;
      let extractedPin: string | undefined;

      const trimmed = decodedText.trim();

      // Caso 1: URL completa tipo https://cynko.app/auth/qr-link?code=cynko_qr_...
      if (trimmed.includes("code=")) {
        try {
          const urlObj = new URL(trimmed);
          extractedCode = urlObj.searchParams.get("code") || undefined;
        } catch {
          const match = trimmed.match(/code=([^&]+)/);
          if (match) extractedCode = match[1];
        }
      }
      // Caso 2: Código directo cynko_qr_...
      else if (trimmed.startsWith("cynko_qr_")) {
        extractedCode = trimmed;
      }
      // Caso 3: PIN numérico tipo 482-913 o 482913
      else if (/^\d{3}-?\d{3}$/.test(trimmed)) {
        extractedPin = trimmed.length === 6 ? `${trimmed.slice(0, 3)}-${trimmed.slice(3)}` : trimmed;
      }

      if (extractedCode || extractedPin) {
        // Detener cámara inmediatamente para evitar lecturas duplicadas
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch {}
        }
        executeAuthorize({ code: extractedCode, pin: extractedPin });
      }
    },
    [executeAuthorize]
  );

  // Inicializar escáner de cámara usando html5-qrcode
  useEffect(() => {
    if (!isOpen || activeTab !== "CAMERA" || successInfo) return;

    let html5QrCode: any = null;
    let isMounted = true;

    async function initCamera() {
      try {
        setCameraError(null);
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!isMounted) return;

        html5QrCode = new Html5Qrcode("cynko-reader-box");
        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText: string) => {
            if (isMounted) handleDecodedText(decodedText);
          },
          () => {} // Ignorar errores de frame no-detectado
        );
      } catch (err: any) {
        if (isMounted) {
          console.warn("Camera init failed:", err);
          setCameraError(
            "No se pudo acceder a la cámara. Concede permisos o ingresa el código PIN manual de 6 dígitos."
          );
        }
      }
    }

    // Pequeño timeout para asegurar que el elemento DOM ya está renderizado
    const timer = setTimeout(() => {
      initCamera();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch {}
        scannerRef.current = null;
      }
    };
  }, [isOpen, activeTab, successInfo, handleDecodedText]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-zinc-950 border border-cyan-500/40 shadow-2xl overflow-hidden text-white flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-cyan-950/60">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-1.5">
                <span>Vincular PC al Instante</span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-700/60 text-[9px] font-mono text-cyan-300 font-bold uppercase">
                  1-Tap
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">Apunta al código QR en la pantalla de tu PC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pantalla de Éxito Instantáneo */}
        {successInfo ? (
          <div className="p-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/60 flex items-center justify-center mx-auto text-emerald-400 shadow-2xl shadow-emerald-950/60">
              <CheckCircle2 className="w-12 h-12 animate-bounce" />
            </div>
            <div>
              <h4 className="text-xl font-black text-white">¡PC Conectada con Éxito!</h4>
              <p className="text-xs text-zinc-300 mt-1 max-w-xs mx-auto">
                Tu computadora ({successInfo.pcDeviceInfo || "PC"}) ha iniciado sesión automáticamente.
              </p>
            </div>
            <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-[11px] text-emerald-400 font-medium">
              Sesión abierta y sincronizada en tiempo real
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Tabs de Selección: Cámara vs PIN */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("CAMERA");
                  setErrorMsg(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "CAMERA"
                    ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Escanear con Cámara</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("PIN");
                  setErrorMsg(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "PIN"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Ingresar PIN</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* TAB 1: CÁMARA EN VIVO */}
            {activeTab === "CAMERA" && (
              <div className="space-y-3">
                <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-3xl overflow-hidden bg-black border-2 border-cyan-500/50 shadow-inner flex flex-col items-center justify-center">
                  {/* Visor de Cámara de html5-qrcode */}
                  <div id="cynko-reader-box" className="w-full h-full object-cover" />

                  {/* Laser Scanner Animation Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                    {/* Esquinas guía de encuadre */}
                    <div className="flex justify-between">
                      <div className="w-7 h-7 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl" />
                      <div className="w-7 h-7 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl" />
                    </div>

                    {/* Línea Láser Animada */}
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse" />

                    <div className="flex justify-between">
                      <div className="w-7 h-7 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl" />
                      <div className="w-7 h-7 border-b-4 border-r-4 border-cyan-400 rounded-br-xl" />
                    </div>
                  </div>

                  {/* Estado de Procesamiento */}
                  {isSubmitting && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 text-cyan-400">
                      <RefreshCw className="w-8 h-8 animate-spin" />
                      <span className="text-xs font-bold">Autorizando PC...</span>
                    </div>
                  )}
                </div>

                {cameraError ? (
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-200 text-xs text-center space-y-2">
                    <p>{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("PIN")}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 text-black font-bold text-xs"
                    >
                      Usar PIN de 6 dígitos
                    </button>
                  </div>
                ) : (
                  <p className="text-center text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Apunta la cámara al QR que ves en tu PC y se conectará solo</span>
                  </p>
                )}
              </div>
            )}

            {/* TAB 2: CÓDIGO PIN MANUAL */}
            {activeTab === "PIN" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeAuthorize({ pin });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    PIN de 6 dígitos mostrado en la PC:
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.toUpperCase())}
                    placeholder="Ej: 482-913"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-2xl text-center text-xl font-mono font-black tracking-widest text-cyan-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1.5 text-center">
                    El código PIN aparece justo debajo del código QR en tu PC
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !pin.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-purple-950"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Conectar PC con PIN</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
