"use client";

import React, { useState } from "react";
import {
  X,
  Sliders,
  Bell,
  Volume2,
  Clock,
  Sparkles,
  Star,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  QrCode,
  Printer,
} from "lucide-react";
import { playBeeperSound } from "@/lib/beeper/beeper-audio";
import { QRCodeImage } from "@/components/ui/QRCodeImage";

interface BeeperConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: any;
  tenantSlug: string;
  tenantName: string;
  onSaved: () => void;
}

export function BeeperConfigModal({
  isOpen,
  onClose,
  config,
  tenantSlug,
  tenantName,
  onSaved,
}: BeeperConfigModalProps) {
  const [enabled, setEnabled] = useState<boolean>(config?.enabled ?? true);
  const [defaultPrepMinutes, setDefaultPrepMinutes] = useState<number>(
    config?.defaultPrepMinutes ?? 15
  );
  const [soundType, setSoundType] = useState<"CHIME" | "BELL" | "DIGITAL" | "VIBRANT">(
    config?.soundType || "CHIME"
  );
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string>(
    config?.googleReviewUrl || ""
  );
  const [autoVibrate, setAutoVibrate] = useState<boolean>(config?.autoVibrate ?? true);
  const [customWelcomeMsg, setCustomWelcomeMsg] = useState<string>(
    config?.customWelcomeMsg || ""
  );
  const [customReadyMsg, setCustomReadyMsg] = useState<string>(
    config?.customReadyMsg || ""
  );
  const [promoBanners, setPromoBanners] = useState<Array<any>>(
    config?.promoBanners || []
  );

  const [activeTab, setActiveTab] = useState<"general" | "banners" | "counter_qr">("general");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const counterQrUrl = typeof window !== "undefined"
    ? `${window.location.origin}/b/${tenantSlug}`
    : `https://vidjs.app/b/${tenantSlug}`;

  const handleTestSound = (type: any) => {
    playBeeperSound(type);
  };

  const handleAddBanner = () => {
    setPromoBanners((prev) => [
      ...prev,
      {
        id: `promo-${Date.now()}`,
        title: "Nueva Promoción del Local",
        badge: "OFERTA",
        linkUrl: "",
        active: true,
      },
    ]);
  };

  const handleRemoveBanner = (id: string) => {
    setPromoBanners((prev) => prev.filter((b) => b.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/v1/beeper/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          defaultPrepMinutes,
          soundType,
          googleReviewUrl,
          autoVibrate,
          customWelcomeMsg,
          customReadyMsg,
          promoBanners,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        onSaved();
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 800);
      }
    } catch (e) {
      console.error("Error guardando config beeper:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0A1322] border border-[#263858] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-5 border-b border-[#263858] flex items-center justify-between bg-[#0F1E36]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-none">
                Configuración de Llamadores Virtuales
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Personalización White-Label, alertas y promociones
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de configuración */}
        <div className="flex items-center border-b border-[#263858] bg-[#0A1322] px-4 pt-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2.5 rounded-t-xl transition-all cursor-pointer ${
              activeTab === "general"
                ? "bg-[#111F38] text-purple-400 border-t-2 border-purple-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Ajustes Generales
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("banners")}
            className={`px-4 py-2.5 rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "banners"
                ? "bg-[#111F38] text-purple-400 border-t-2 border-purple-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Banners de Ofertas</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 text-[10px]">
              {promoBanners.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("counter_qr")}
            className={`px-4 py-2.5 rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "counter_qr"
                ? "bg-[#111F38] text-purple-400 border-t-2 border-purple-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR General Mostrador</span>
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === "general" && (
            <div className="space-y-4">
              {/* Interruptor de activación */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0F1E36] border border-[#263858]">
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Activar Módulo de Llamadores Virtuales
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Habilita la emisión y sincronización de beepers web para tus clientes
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    enabled ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                      enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Tiempo estimado de preparación por defecto */}
              <div className="p-4 rounded-2xl bg-[#0F1E36] border border-[#263858] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Tiempo de Preparación Promedio:</span>
                  </label>
                  <span className="font-mono font-black text-purple-400 text-sm">
                    {defaultPrepMinutes} min
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={defaultPrepMinutes}
                  onChange={(e) => setDefaultPrepMinutes(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>5 min (Fast-Food)</span>
                  <span>15 min</span>
                  <span>30 min</span>
                  <span>60 min (Platos Elaborados)</span>
                </div>
              </div>

              {/* Selector de Sonido de Alerta con Prueba Web Audio */}
              <div className="p-4 rounded-2xl bg-[#0F1E36] border border-[#263858] space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Tipo de Sonido de Timbre:</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "CHIME", label: "Chime Sala", desc: "Suave y elegante" },
                    { id: "BELL", label: "Campana", desc: "Clásica de caja" },
                    { id: "DIGITAL", label: "Digital", desc: "Beeper retro" },
                    { id: "VIBRANT", label: "Vibrante", desc: "Acorde brillante" },
                  ].map((s) => (
                    <div
                      key={s.id}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col justify-between ${
                        soundType === s.id
                          ? "bg-purple-950/80 border-purple-500 text-white font-bold shadow-md shadow-purple-900/40"
                          : "bg-[#0A1322] border-[#263858] text-slate-400 hover:text-white"
                      }`}
                      onClick={() => {
                        setSoundType(s.id as any);
                        handleTestSound(s.id);
                      }}
                    >
                      <span className="text-xs">{s.label}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestSound(s.id);
                        }}
                        className="mt-1 text-[10px] text-purple-400 hover:text-purple-300 underline font-semibold"
                      >
                        🔊 Probar
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Link de Reseñas de Google */}
              <div className="p-4 rounded-2xl bg-[#0F1E36] border border-[#263858] space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span>Enlace de Reseñas de Google (Google Review URL):</span>
                </label>
                <input
                  type="url"
                  placeholder="https://g.page/r/tu-negocio/review"
                  value={googleReviewUrl}
                  onChange={(e) => setGoogleReviewUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A1322] border border-[#263858] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-slate-400">
                  Al recibir 4 o 5 estrellas en la encuesta exprés, se invitará al cliente a dejar su reseña en Google con un solo toque.
                </p>
              </div>

              {/* Mensajes Personalizados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Mensaje en Estado Preparando:
                  </label>
                  <input
                    type="text"
                    placeholder="Tu pedido está en cocina..."
                    value={customWelcomeMsg}
                    onChange={(e) => setCustomWelcomeMsg(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A1322] border border-[#263858] text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Mensaje en Estado ¡Listo!:
                  </label>
                  <input
                    type="text"
                    placeholder="¡Acércate al mostrador a retirar!"
                    value={customReadyMsg}
                    onChange={(e) => setCustomReadyMsg(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A1322] border border-[#263858] text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "banners" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Banners Rotativos de Ofertas y Promociones
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Se muestran en el celular del cliente mientras espera que su comida esté lista
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddBanner}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Banner</span>
                </button>
              </div>

              {promoBanners.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-[#263858] rounded-2xl">
                  No hay banners cargados. Añade uno para promocionar tus productos mientras el cliente espera.
                </div>
              ) : (
                <div className="space-y-3">
                  {promoBanners.map((banner, index) => (
                    <div
                      key={banner.id}
                      className="p-3 rounded-2xl bg-[#0F1E36] border border-[#263858] space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300">
                          Oferta #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBanner(banner.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Título / Texto de la oferta"
                          value={banner.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPromoBanners((prev) =>
                              prev.map((b) => (b.id === banner.id ? { ...b, title: val } : b))
                            );
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#0A1322] border border-[#263858] text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="Badge / Etiqueta (ej: 2x1, PROMO)"
                          value={banner.badge || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPromoBanners((prev) =>
                              prev.map((b) => (b.id === banner.id ? { ...b, badge: val } : b))
                            );
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#0A1322] border border-[#263858] text-xs text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "counter_qr" && (
            <div className="space-y-4 text-center">
              <div>
                <h4 className="text-xs font-bold text-white">
                  Cartel QR General del Local para Mostrador / Cajas
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Imprime este cartel para que los clientes entren al portal e ingresen su número de 3 dígitos
                </p>
              </div>

              <div className="p-6 bg-white text-black rounded-3xl max-w-[260px] mx-auto shadow-2xl space-y-3 font-mono">
                <div className="border-b border-black pb-2">
                  <h3 className="font-black text-sm uppercase">{tenantName}</h3>
                  <p className="text-[10px] text-zinc-600">Llamador Virtual de Pedidos</p>
                </div>
                <div className="flex justify-center p-2 bg-zinc-50 rounded-xl">
                  <QRCodeImage value={counterQrUrl} size={150} />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-black leading-tight text-black">
                    ¿Esperando tu pedido?
                  </p>
                  <p className="text-[9px] text-zinc-600">
                    Escanea aquí e ingresa el número de tu comanda o ticket
                  </p>
                  <p className="text-[8px] font-bold text-purple-700">vidjs.app/b/{tenantSlug}</p>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/30 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Cartel de Mostrador</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pie de modal */}
        <div className="p-4 border-t border-[#263858] flex items-center justify-between bg-[#0F1E36]">
          {saveSuccess ? (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configuración guardada</span>
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">
              Cambios sincronizados en tiempo real
            </span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 cursor-pointer flex items-center gap-1.5"
            >
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
