"use client";

import { useState } from "react";
import {
  X,
  Sliders,
  Disc3,
  Mic,
  Tv,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { QueuePolicy, NightMode } from "@/lib/dj/rotation";

interface ModeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  initialPolicy?: QueuePolicy;
  onPolicyUpdated?: (newPolicy: QueuePolicy) => void;
}

export default function ModeSettingsModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  initialPolicy,
  onPolicyUpdated,
}: ModeSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"GENERAL" | "DJ" | "KARAOKE" | "TV">("GENERAL");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados locales editables
  const [nightMode, setNightMode] = useState<NightMode>(initialPolicy?.nightMode || "HYBRID");

  // Configuración DJ
  const [djEnabled, setDjEnabled] = useState(initialPolicy?.dj?.enabled ?? true);
  const [djQueueMode, setDjQueueMode] = useState<"FIFO" | "TIPS_PRIORITY">(
    initialPolicy?.dj?.queueMode || "FIFO"
  );
  const [djMaxPerTable, setDjMaxPerTable] = useState<number>(
    initialPolicy?.dj?.maxActivePerTable ?? 2
  );
  const [djQueuePaused, setDjQueuePaused] = useState(initialPolicy?.dj?.queuePaused ?? false);
  const [djTippingEnabled, setDjTippingEnabled] = useState(
    initialPolicy?.dj?.tippingEnabled ?? true
  );
  const [djAutoBeats, setDjAutoBeats] = useState<number>(
    initialPolicy?.dj?.autoTransitionBeats ?? 8
  );

  // Configuración Karaoke
  const [karaokeEnabled, setKaraokeEnabled] = useState(initialPolicy?.karaoke?.enabled ?? true);
  const [karaokeFairPlay, setKaraokeFairPlay] = useState<"ROUND_ROBIN" | "FIFO">(
    initialPolicy?.karaoke?.fairPlayMode || "ROUND_ROBIN"
  );
  const [karaokeMaxPerTable, setKaraokeMaxPerTable] = useState<number>(
    initialPolicy?.karaoke?.maxActivePerTable ?? 1
  );
  const [karaokeQueuePaused, setKaraokeQueuePaused] = useState(
    initialPolicy?.karaoke?.queuePaused ?? false
  );
  const [karaokeSongDuration, setKaraokeSongDuration] = useState<number>(
    initialPolicy?.karaoke?.avgSongDurationMinutes ?? 4
  );
  const [karaokeTvVideo, setKaraokeTvVideo] = useState(
    initialPolicy?.karaoke?.tvLyricsVideoEnabled ?? true
  );
  const [karaokeApplause, setKaraokeApplause] = useState(
    initialPolicy?.karaoke?.applauseMeterEnabled ?? true
  );

  // Configuración TV & Fotos
  const [photosAllowed, setPhotosAllowed] = useState(initialPolicy?.photosAllowed ?? true);
  const [photoFitMode, setPhotoFitMode] = useState<"BLUR_FILL" | "CONTAIN" | "COVER">(
    initialPolicy?.photoFitMode || "BLUR_FILL"
  );
  const [photoRotationSeconds, setPhotoRotationSeconds] = useState<number>(
    initialPolicy?.photoRotationSeconds ?? 8
  );

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        eventId,
        nightMode,
        dj: {
          enabled: nightMode !== "KARAOKE_ONLY" && djEnabled,
          queueMode: djQueueMode,
          maxActivePerTable: djMaxPerTable,
          queuePaused: djQueuePaused,
          tippingEnabled: djTippingEnabled,
          autoTransitionBeats: djAutoBeats,
        },
        karaoke: {
          enabled: nightMode !== "DJ_ONLY" && karaokeEnabled,
          fairPlayMode: karaokeFairPlay,
          maxActivePerTable: karaokeMaxPerTable,
          queuePaused: karaokeQueuePaused,
          avgSongDurationMinutes: karaokeSongDuration,
          tvLyricsVideoEnabled: karaokeTvVideo,
          applauseMeterEnabled: karaokeApplause,
        },
        photosAllowed,
        photoFitMode,
        photoRotationSeconds,
      };

      const res = await fetch("/api/v1/dj/queue/policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Error al guardar la configuración");
      }

      setSuccessMsg("¡Configuración de la noche aplicada exitosamente!");
      if (onPolicyUpdated && json.data) {
        onPolicyUpdated(json.data);
      }
      setTimeout(() => {
        setSuccessMsg(null);
      }, 2500);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Error desconocido al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Configuración de Modos & Operación</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Ajusta de forma independiente la Cabina DJ, el Escenario Karaoke y las pantallas en{" "}
                <span className="text-purple-300 font-semibold">{eventName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificaciones */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Selector de Pestañas */}
        <div className="flex border-b border-zinc-800 px-6 bg-zinc-900/30">
          <button
            type="button"
            onClick={() => setActiveTab("GENERAL")}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === "GENERAL"
                ? "border-purple-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Modo de la Noche</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DJ")}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === "DJ"
                ? "border-amber-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Disc3 className="w-4 h-4 text-amber-400" />
            <span>Cabina DJ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("KARAOKE")}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === "KARAOKE"
                ? "border-cyan-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Mic className="w-4 h-4 text-cyan-400" />
            <span>Escenario Karaoke</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TV")}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === "TV"
                ? "border-pink-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Tv className="w-4 h-4 text-pink-400" />
            <span>TV & Fotos</span>
          </button>
        </div>

        {/* Contenido por pestaña */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* TAB: GENERAL (Modo de la Noche) */}
          {activeTab === "GENERAL" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  ¿Cómo opera el local esta noche?
                </h3>
                <p className="text-xs text-zinc-400">
                  Selecciona la modalidad principal para orientar la experiencia de comensales y pantallas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Opción 1: HÍBRIDO */}
                <div
                  onClick={() => setNightMode("HYBRID")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all space-y-3 ${
                    nightMode === "HYBRID"
                      ? "border-purple-500 bg-purple-950/30 shadow-lg shadow-purple-950/40"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400">
                      <Layers className="w-5 h-5" />
                    </div>
                    {nightMode === "HYBRID" && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-black">
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Modo Híbrido</h4>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                      DJ y Karaoke operan en simultáneo. Los clientes eligen si piden para bailar o suben al escenario.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-purple-300 font-semibold">
                    Recomendado para bares con pista y escenario
                  </div>
                </div>

                {/* Opción 2: SOLO DJ */}
                <div
                  onClick={() => setNightMode("DJ_ONLY")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all space-y-3 ${
                    nightMode === "DJ_ONLY"
                      ? "border-amber-500 bg-amber-950/30 shadow-lg shadow-amber-950/40"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-amber-600/20 text-amber-400">
                      <Disc3 className="w-5 h-5" />
                    </div>
                    {nightMode === "DJ_ONLY" && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black">
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Solo Modo DJ</h4>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                      100% Pista y mezclas. La app de clientes solo pide temas para bailar al DJ. Consola Virtual DJ activa.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-amber-300 font-semibold">
                    Discotecas, clubs, fiestas electrónicas
                  </div>
                </div>

                {/* Opción 3: SOLO KARAOKE */}
                <div
                  onClick={() => setNightMode("KARAOKE_ONLY")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all space-y-3 ${
                    nightMode === "KARAOKE_ONLY"
                      ? "border-cyan-500 bg-cyan-950/30 shadow-lg shadow-cyan-950/40"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400">
                      <Mic className="w-5 h-5" />
                    </div>
                    {nightMode === "KARAOKE_ONLY" && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-black text-[10px] font-black">
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Solo Karaoke</h4>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                      100% Escenario. Letras en TV, llamado de cantantes y regla Fair-Play de turnos.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-cyan-300 font-semibold">
                    Karaoke Bars, peñas, concursos de canto
                  </div>
                </div>
              </div>

              {/* Acceso Rápido a Cabinas */}
              <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/dashboard/dj"
                  className="flex-1 p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Disc3 className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Abrir Cabina DJ (VirtualDJ)</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                </Link>

                <Link
                  href="/dashboard/karaoke"
                  className="flex-1 p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Mic className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">Abrir Cabina Karaoke (KJ)</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                </Link>
              </div>
            </div>
          )}

          {/* TAB: DJ (Configuración de Cabina DJ) */}
          {activeTab === "DJ" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-amber-200">Recepción de Pedidos para el DJ</h4>
                  <p className="text-[11px] text-zinc-400">
                    Permite a los comensales solicitar temas musicales a la consola del DJ.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!djQueuePaused}
                    onChange={(e) => setDjQueuePaused(!e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Modo de Cola DJ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Modo de Organización de Cola</label>
                  <select
                    value={djQueueMode}
                    onChange={(e) => setDjQueueMode(e.target.value as "FIFO" | "TIPS_PRIORITY")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-amber-500 focus:outline-none"
                  >
                    <option value="FIFO">Orden de Llegada (Cronológico)</option>
                    <option value="TIPS_PRIORITY">Prioridad por Propinas / VIP Fast-Pass</option>
                  </select>
                  <p className="text-[10px] text-zinc-500">
                    En TIPS_PRIORITY, los pedidos con propina suben automáticamente a la cima.
                  </p>
                </div>

                {/* Límite de temas por mesa */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">
                    Máximo de Pedidos Activos por Mesa
                  </label>
                  <select
                    value={djMaxPerTable}
                    onChange={(e) => setDjMaxPerTable(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-amber-500 focus:outline-none"
                  >
                    <option value="1">1 canción activa a la vez</option>
                    <option value="2">2 canciones activas (Recomendado)</option>
                    <option value="3">3 canciones activas</option>
                    <option value="5">5 canciones activas</option>
                    <option value="99">Ilimitadas (Sin restricción)</option>
                  </select>
                  <p className="text-[10px] text-zinc-500">
                    Evita que una sola mesa monopolice la pista de baile.
                  </p>
                </div>

                {/* Auto-Enganche Beats */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">
                    Compases de Auto-Enganche (Virtual DJ)
                  </label>
                  <select
                    value={djAutoBeats}
                    onChange={(e) => setDjAutoBeats(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-amber-500 focus:outline-none"
                  >
                    <option value="4">4 beats (Transición rápida)</option>
                    <option value="8">8 beats (Recomendado estándar)</option>
                    <option value="16">16 beats (Mezcla gradual larga)</option>
                    <option value="32">32 beats (Club Extended)</option>
                  </select>
                  <p className="text-[10px] text-zinc-500">
                    Duración del fundido de audio entre Deck A y Deck B al hacer &ldquo;Auto-Enganchar&rdquo;.
                  </p>
                </div>

                {/* Propinas / VIP Fast-Pass */}
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Propinas Virtuales</span>
                    <span className="text-[10px] text-zinc-400">
                      Permitir a los clientes ofrecer propina con sus pedidos.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={djTippingEnabled}
                      onChange={(e) => setDjTippingEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB: KARAOKE (Configuración de Escenario Karaoke) */}
          {activeTab === "KARAOKE" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-cyan-200">Recepción de Cantantes (Karaoke)</h4>
                  <p className="text-[11px] text-zinc-400">
                    Permite a los comensales enviar canciones para subir al escenario.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!karaokeQueuePaused}
                    onChange={(e) => setKaraokeQueuePaused(!e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Política Fair Play */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">
                    Política Fair-Play de Escenario
                  </label>
                  <select
                    value={karaokeFairPlay}
                    onChange={(e) => setKaraokeFairPlay(e.target.value as "ROUND_ROBIN" | "FIFO")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="ROUND_ROBIN">
                      Equidad por Mesas: &ldquo;Canta y Libera&rdquo; (Recomendado)
                    </option>
                    <option value="FIFO">Orden de Llegada Estricto</option>
                  </select>
                  <p className="text-[10px] text-zinc-500">
                    En Canta y Libera, todas las mesas cantan una vez antes de que una mesa repita.
                  </p>
                </div>

                {/* Límite de cantantes por mesa */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">
                    Turnos Simultáneos por Mesa
                  </label>
                  <select
                    value={karaokeMaxPerTable}
                    onChange={(e) => setKaraokeMaxPerTable(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="1">1 turno activo (Canta y luego vuelve a pedir)</option>
                    <option value="2">Hasta 2 canciones por mesa</option>
                    <option value="3">Hasta 3 canciones por mesa</option>
                  </select>
                  <p className="text-[10px] text-zinc-500">
                    Garantiza rotación sana en el micrófono durante toda la velada.
                  </p>
                </div>

                {/* Duración Estimada por Canción */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">
                    Duración Estimada por Tema
                  </label>
                  <select
                    value={karaokeSongDuration}
                    onChange={(e) => setKaraokeSongDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="3">3 minutos</option>
                    <option value="4">4 minutos (Estándar)</option>
                    <option value="5">5 minutos</option>
                  </select>
                  <p className="text-[10px] text-zinc-500">
                    Se utiliza para calcular el tiempo estimado de espera en los celulares.
                  </p>
                </div>

                {/* Letras de YouTube en Pantalla */}
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Video con Letras en TV</span>
                    <span className="text-[10px] text-zinc-400">
                      Proyectar video karaoke de YouTube sincronizado en la TV.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={karaokeTvVideo}
                      onChange={(e) => setKaraokeTvVideo(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TV & FOTOS */}
          {activeTab === "TV" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Muro de Fotos Interactivo */}
                <div className="p-4 rounded-2xl bg-pink-950/20 border border-pink-800/40 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-pink-200">Muro de Fotos en Pantalla</h4>
                    <p className="text-[11px] text-zinc-400">
                      Permitir a los comensales subir fotos desde su celular a la pantalla gigante.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={photosAllowed}
                      onChange={(e) => setPhotosAllowed(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                  </label>
                </div>

                {/* Formato de Encuadre */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">
                    Ajuste de Foto en la Pantalla TV
                  </label>
                  <select
                    value={photoFitMode}
                    onChange={(e) =>
                      setPhotoFitMode(e.target.value as "BLUR_FILL" | "CONTAIN" | "COVER")
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-pink-500 focus:outline-none"
                  >
                    <option value="BLUR_FILL">
                      Relleno Difuminado (Blur Fill - Recomendado para fotos verticales)
                    </option>
                    <option value="CONTAIN">Ajustar Completa (Barras negras laterales)</option>
                    <option value="COVER">Llenar Pantalla (Recorte)</option>
                  </select>
                </div>

                {/* Tiempo de Rotación de Fotos */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">
                    Tiempo de Rotación de Fotos
                  </label>
                  <select
                    value={photoRotationSeconds}
                    onChange={(e) => setPhotoRotationSeconds(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-medium focus:border-pink-500 focus:outline-none"
                  >
                    <option value="5">5 segundos</option>
                    <option value="8">8 segundos (Recomendado)</option>
                    <option value="12">12 segundos</option>
                    <option value="15">15 segundos</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            Los cambios se aplican y sincronizan en vivo sin recargar la página.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-purple-600/30 flex items-center gap-2"
            >
              {loading ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Configuración</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
