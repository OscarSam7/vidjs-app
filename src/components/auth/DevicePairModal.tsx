"use client";

import React, { useState } from "react";
import { Laptop, X, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, KeyRound } from "lucide-react";

interface DevicePairModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DevicePairModal({ isOpen, onClose }: DevicePairModalProps) {
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ pcDeviceInfo?: string } | null>(null);

  if (!isOpen) return null;

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/auth/qr/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: pin.trim(),
          action: "APPROVE",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo vincular el dispositivo");
      }

      setSuccessInfo({ pcDeviceInfo: data.pcDeviceInfo });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Error inesperado al vincular dispositivo");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border border-cyan-500/30 shadow-2xl p-6 text-white space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Vincular PC u Otro Dispositivo</h3>
              <p className="text-[11px] text-zinc-400">Inicia sesión en una computadora al instante</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Éxito */}
        {successInfo ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">¡PC Vinculada Exitosamente!</h4>
              <p className="text-xs text-zinc-300 mt-1">
                La sesión en {successInfo.pcDeviceInfo || "tu computadora"} ya se ha iniciado y tiene acceso completo.
              </p>
            </div>
            <button
              onClick={() => {
                setSuccessInfo(null);
                setPin("");
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs"
            >
              Cerrar y Continuar
            </button>
          </div>
        ) : (
          /* Formulario */
          <form onSubmit={handlePair} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-zinc-300 space-y-1.5">
              <p className="font-semibold text-cyan-300">¿Cómo funciona?</p>
              <p className="text-[11px] leading-relaxed">
                1. En tu PC, abre <span className="font-mono text-white">cynko.app/login</span> y selecciona <strong>"Código QR"</strong>.
              </p>
              <p className="text-[11px] leading-relaxed">
                2. Puedes <strong>escanear el QR</strong> con la cámara de tu celular, o escribir aquí el <strong>PIN de 6 dígitos</strong> que aparece debajo del QR en la PC.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>PIN de Vinculación (6 dígitos de la PC)</span>
              </label>
              <input
                type="text"
                required
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.toUpperCase())}
                placeholder="Ej: 482-913"
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-cyan-400 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !pin.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Vinculando PC...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Autorizar e Iniciar Sesión en PC</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
