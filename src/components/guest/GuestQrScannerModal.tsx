"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Camera, QrCode, AlertCircle, CheckCircle2, ScanLine } from "lucide-react";

function playScanBeep() {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(920, ctx.currentTime);
    osc.frequency.setValueAtTime(1380, ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch {}
}

export interface GuestQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVenueScanned?: (slug: string) => void;
  onEventCodeScanned?: (code: string) => void;
}

export function GuestQrScannerModal({
  isOpen,
  onClose,
  onVenueScanned,
  onEventCodeScanned,
}: GuestQrScannerModalProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const handledRef = useRef(false);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      try {
        await scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
  }, []);

  const handleDecoded = useCallback(
    async (decodedText: string) => {
      if (!decodedText || handledRef.current) return;
      const raw = decodedText.trim();
      if (!raw) return;

      handledRef.current = true;
      await stopCamera();
      playScanBeep();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate([80, 40, 80]);
        } catch {}
      }

      // Intentar parsear como URL
      try {
        const isUrl = /^https?:\/\//i.test(raw) || raw.startsWith("/");
        if (isUrl) {
          const urlObj = new URL(raw, window.location.origin);
          const pathname = urlObj.pathname;

          // Caso 1: QR directo de mesa (/qr/<token>)
          const qrMatch = pathname.match(/^\/qr\/([^/?#]+)/i);
          if (qrMatch) {
            setScanSuccessMsg("¡QR de mesa detectado! Conectando...");
            window.location.href = `/qr/${qrMatch[1]}`;
            return;
          }

          // Caso 2: QR de local o evento en /guest o /menu
          const venueParam = urlObj.searchParams.get("venue") || urlObj.searchParams.get("slug");
          const eventParam = urlObj.searchParams.get("event") || urlObj.searchParams.get("code");

          if (venueParam && onVenueScanned) {
            setScanSuccessMsg("¡Local detectado! Cargando mesas...");
            setTimeout(() => {
              onVenueScanned(venueParam);
              onClose();
            }, 500);
            return;
          }

          if (eventParam && onEventCodeScanned) {
            setScanSuccessMsg(`¡Evento ${eventParam} detectado! Conectando...`);
            setTimeout(() => {
              onEventCodeScanned(eventParam.toUpperCase());
              onClose();
            }, 500);
            return;
          }

          // Caso 3: QR de evento público /eventos/<code> o reservas /reservas/<slug> o beeper /b/<slug>
          if (
            pathname.startsWith("/eventos/") ||
            pathname.startsWith("/reservas/") ||
            pathname.startsWith("/b/") ||
            pathname.startsWith("/guest")
          ) {
            setScanSuccessMsg("¡QR CYNKO reconocido! Redirigiendo...");
            window.location.href = `${pathname}${urlObj.search}`;
            return;
          }
        }
      } catch {
        // No era una URL estándar, seguimos como código plano
      }

      // Caso 4: Token directo de mesa (largo o con guiones largos tipo UUID/cuid)
      if (/^[a-z0-9_-]{18,}$/i.test(raw)) {
        setScanSuccessMsg("¡Código de mesa detectado! Conectando...");
        window.location.href = `/qr/${encodeURIComponent(raw)}`;
        return;
      }

      // Caso 5: Código de pantalla TV / evento (ej: RETRO-POP, VIP2026)
      if (/^[a-z0-9-]{3,16}$/i.test(raw) && onEventCodeScanned) {
        setScanSuccessMsg(`¡Código ${raw.toUpperCase()} detectado! Conectando...`);
        setTimeout(() => {
          onEventCodeScanned(raw.toUpperCase());
          onClose();
        }, 500);
        return;
      }

      // Si no coincide con ningún formato CYNKO
      handledRef.current = false;
      setCameraError(
        "El código escaneado no parece ser un QR válido de mesa o local CYNKO. Intenta nuevamente."
      );
    },
    [onClose, onEventCodeScanned, onVenueScanned, stopCamera]
  );

  useEffect(() => {
    if (!isOpen) {
      handledRef.current = false;
      setScanSuccessMsg(null);
      setCameraError(null);
      stopCamera();
      return;
    }

    let isMounted = true;
    handledRef.current = false;
    setScanSuccessMsg(null);
    setCameraError(null);

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!isMounted) return;

        // Esperar un frame a que el contenedor exista en el DOM
        await new Promise((r) => setTimeout(r, 80));
        if (!isMounted) return;

        const el = document.getElementById("cynko-guest-qr-reader");
        if (!el) return;

        const html5QrCode = new Html5Qrcode("cynko-guest-qr-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 12,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            if (isMounted) handleDecoded(decodedText);
          },
          () => {
            // Ignorar frames sin QR
          }
        );
      } catch (err: any) {
        if (!isMounted) return;
        const msg = err?.message || "";
        if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("notallowed")) {
          setCameraError(
            "Permiso de cámara denegado. Habilita el acceso a la cámara en tu navegador o selecciona tu local de la lista."
          );
        } else {
          setCameraError(
            "No pudimos iniciar la cámara en este dispositivo. Puedes buscar tu local en la lista o ingresar el código de la TV."
          );
        }
      }
    }

    startScanner();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, handleDecoded, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-purple-500/40 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between gap-2 bg-gradient-to-r from-purple-950/60 via-zinc-950 to-fuchsia-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Escanear QR del Local o Mesa</h3>
              <p className="text-[11px] text-zinc-400">Apunta al QR físico en tu mesa o entrada</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {scanSuccessMsg ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="text-sm font-black text-emerald-300">{scanSuccessMsg}</p>
            </div>
          ) : (
            <>
              <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-purple-500/40 aspect-square w-full flex items-center justify-center">
                <div id="cynko-guest-qr-reader" className="w-full h-full" />
                {!cameraError && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="w-56 h-56 rounded-2xl border-2 border-purple-400/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] relative">
                      <ScanLine className="w-6 h-6 text-purple-400/80 absolute -top-3 left-1/2 -translate-x-1/2 animate-bounce" />
                    </div>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-[11px] text-zinc-400 bg-zinc-900/70 p-3 rounded-xl border border-zinc-800/80">
                <QrCode className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  Reconoce automáticamente el <strong>QR de tu mesa</strong>, el{" "}
                  <strong>QR del local</strong> o el <strong>QR de la pantalla TV</strong>.
                </span>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer transition-colors"
          >
            Cerrar escáner
          </button>
        </div>
      </div>
    </div>
  );
}
