"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Sliders,
  Music,
  Headphones,
  Tv,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Save,
  RefreshCw,
  Building,
  Volume2,
  Clock,
  Sparkles,
  Camera,
  QrCode,
  Lock,
  Palette,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface ClubSettings {
  general: {
    clubName: string;
    timezone: string;
    phone: string;
    address: string;
    currency: string;
  };
  djAudio: {
    crossfaderDurationSec: number;
    autoGain: boolean;
    soundEffectsEnabled: boolean;
    autoPlayRequests: boolean;
    allowExplicitLyrics: boolean;
  };
  requestsFairPlay: {
    maxRequestsPerTable: number;
    requestCooldownMinutes: number;
    requireDjApproval: boolean;
    allowDedicationNotes: boolean;
    tippingEnabled: boolean;
  };
  screenPhotos: {
    photoApprovalRequired: boolean;
    photoRotationSeconds: number;
    allowSelfies: boolean;
    watermarkEnabled: boolean;
    tvLyricsDisplay: boolean;
  };
  security: {
    qrAutoRotateOnClose: boolean;
    forceSessionLogoutOnClose: boolean;
    allowMultipleDevicesPerTable: boolean;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "appearance" | "dj" | "requests" | "screen" | "security">("general");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/settings");
      if (res.ok) {
        const json = await res.json();
        setSettings(json.data.settings);
      }
    } catch (err) {
      console.error("Error al cargar configuración:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Error al guardar configuración");
      }

      setFeedback({ type: "success", text: json.message || "Configuración guardada exitosamente." });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error al conectar con el servidor" });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="p-16 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
        <span className="text-xs">Cargando parámetros de configuración...</span>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* 1. Header con feedback */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-indigo-400" />
              SISTEMA & CABINA
            </span>
            <span className="text-xs text-zinc-400">Personalización de políticas operativas</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-indigo-400" />
            Configuración General del Establecimiento
          </h1>
          <p className="text-xs text-zinc-400">
            Ajusta los motores de reproducción de audio, reglas de pedidos para clientes, filtros de pantalla y seguridad.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {feedback && (
            <div
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                feedback.type === "success"
                  ? "bg-emerald-950/90 text-emerald-200 border-emerald-700"
                  : "bg-red-950/90 text-red-200 border-red-700"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white flex items-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? "Guardando..." : "Guardar Cambios"}</span>
          </button>
        </div>
      </div>

      {/* 2. Pestañas de Navegación por Categoría */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "general"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
          }`}
        >
          <Building className="w-4 h-4" />
          <span>General & Establecimiento</span>
        </button>

        <button
          onClick={() => setActiveTab("appearance")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "appearance"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Tema & Apariencia</span>
        </button>

        <button
          onClick={() => setActiveTab("dj")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "dj"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>Cabina DJ & Motor Audio</span>
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "requests"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
          }`}
        >
          <Music className="w-4 h-4" />
          <span>Pedidos Musicales & FairPlay</span>
        </button>

        <button
          onClick={() => setActiveTab("screen")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "screen"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>Pantallas & Muro de Fotos</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "security"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Seguridad & QR</span>
        </button>
      </div>

      {/* 3. Formularios por Sección */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: GENERAL */}
        {activeTab === "general" && (
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-purple-400" />
              <span>Identidad y Datos del Establecimiento</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Nombre Comercial</label>
                <input
                  type="text"
                  value={settings.general.clubName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, clubName: e.target.value },
                    })
                  }
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Zona Horaria Oficial</label>
                <select
                  value={settings.general.timezone}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, timezone: e.target.value },
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="America/Asuncion">América / Asunción - Paraguay (UTC-3 / UTC-4)</option>
                  <option value="America/Montevideo">América / Montevideo (UTC-3)</option>
                  <option value="America/Buenos_Aires">América / Buenos Aires (UTC-3)</option>
                  <option value="America/Santiago">América / Santiago (UTC-3 / UTC-4)</option>
                  <option value="America/Bogota">América / Bogotá (UTC-5)</option>
                  <option value="America/Mexico_City">América / Ciudad de México (UTC-6)</option>
                  <option value="America/New_York">América / Nueva York (UTC-5 / UTC-4)</option>
                  <option value="Europe/Madrid">Europa / Madrid (UTC+1 / UTC+2)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Teléfono / WhatsApp de Contacto</label>
                <input
                  type="text"
                  value={settings.general.phone}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, phone: e.target.value },
                    })
                  }
                  placeholder="+595 981 000 000"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Dirección Física</label>
                <input
                  type="text"
                  value={settings.general.address}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, address: e.target.value },
                    })
                  }
                  placeholder="Av. Monseñor Rodríguez esq. Boquerón, CDE"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* Selector Rápido de Tema de Aplicación */}
            <div className="pt-5 border-t border-zinc-800/80 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-purple-400" />
                  <span>Tema de la Aplicación (Ajustes de Interfaz)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Elige entre Sistema (Ajustes de tu equipo), Modo Claro o Modo Oscuro
                </p>
              </div>
              <ThemeToggle variant="cards" />
            </div>
          </div>
        )}

        {/* TAB TEMA & APARIENCIA */}
        {activeTab === "appearance" && (
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                    <Palette className="w-3 h-3 text-purple-400" />
                    APARIENCIA VISUAL
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-1">
                  Tema de la Aplicación (Ajustes de Interfaz)
                </h2>
                <p className="text-xs text-zinc-400">
                  Personaliza cómo se visualiza el panel de Vidjeis en tu dispositivo: automático con el sistema, modo claro diurno o modo oscuro nocturno.
                </p>
              </div>
            </div>

            {/* Selector de Tema en Tarjetas Grandes */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-300 block">
                Selecciona tu modo preferido
              </label>
              <ThemeToggle variant="cards" />
            </div>

            {/* Explicación de cada modo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                  <Monitor className="w-4 h-4" />
                  <span>Sistema (Ajustes)</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Se sincroniza automáticamente con la configuración de tu computadora o teléfono. Si tu sistema operativo cambia al anochecer, Vidjeis cambiará solo.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Sun className="w-4 h-4" />
                  <span>Modo Claro</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Fondo blanco limpio con texto de alto contraste. Ideal para tareas de oficina de día, carga de eventos, revisión de reportes y facturación.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                  <Moon className="w-4 h-4" />
                  <span>Modo Oscuro</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Fondo oscuro con acentos neón. El modo nativo para clubes, boliches y cabinas de DJ para no encandilar en ambientes con luces bajas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DJ & CABINA */}
        {activeTab === "dj" && (
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Headphones className="w-5 h-5 text-purple-400" />
              <span>Motor de Mezcla & Cabina VirtualDJ</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Crossfader duration */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-white">Transición Crossfader Automático</span>
                  <span className="font-bold text-purple-400 font-mono text-sm">
                    {settings.djAudio.crossfaderDurationSec} segundos
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  value={settings.djAudio.crossfaderDurationSec}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      djAudio: {
                        ...settings.djAudio,
                        crossfaderDurationSec: parseInt(e.target.value, 10),
                      },
                    })
                  }
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <p className="text-[11px] text-zinc-500">
                  Tiempo de fundido entre Deck A y Deck B al presionar Auto-Mix o cambiar pista.
                </p>
              </div>

              {/* Auto Gain */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Normalización de Ganancia (Auto-Gain)</div>
                  <div className="text-[11px] text-zinc-500">
                    Nivela automáticamente los decibeles (EBU R128) para evitar saltos bruscos de volumen.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.djAudio.autoGain}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      djAudio: { ...settings.djAudio, autoGain: e.target.checked },
                    })
                  }
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </div>

              {/* Sound Effects */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Efectos de Sonido Rápidos (Sampler)</div>
                  <div className="text-[11px] text-zinc-500">
                    Habilitar botones de Airhorn / Sirena, Aplausos y Scratch en cabina de DJ.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.djAudio.soundEffectsEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      djAudio: { ...settings.djAudio, soundEffectsEnabled: e.target.checked },
                    })
                  }
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </div>

              {/* Auto-Play Requests */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Modo Auto-DJ Autónomo</div>
                  <div className="text-[11px] text-zinc-500">
                    Carga y reproduce automáticamente las pistas aprobadas si la bandeja activa se detiene.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.djAudio.autoPlayRequests}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      djAudio: { ...settings.djAudio, autoPlayRequests: e.target.checked },
                    })
                  }
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PEDIDOS Y FAIRPLAY */}
        {activeTab === "requests" && (
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Music className="w-5 h-5 text-purple-400" />
              <span>Reglas de Pedidos de Canciones (FairPlay Anti-Spam)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Max requests per table */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-white">Máximo de Pedidos Activos por Mesa</span>
                  <span className="font-bold text-indigo-400 font-mono text-sm">
                    {settings.requestsFairPlay.maxRequestsPerTable} canciones
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={settings.requestsFairPlay.maxRequestsPerTable}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      requestsFairPlay: {
                        ...settings.requestsFairPlay,
                        maxRequestsPerTable: parseInt(e.target.value, 10),
                      },
                    })
                  }
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <p className="text-[11px] text-zinc-500">
                  Evita que una sola mesa monopolice la cola de reproducción del local.
                </p>
              </div>

              {/* Cooldown */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-white">Tiempo de Enfriamiento (Cooldown)</span>
                  <span className="font-bold text-indigo-400 font-mono text-sm">
                    {settings.requestsFairPlay.requestCooldownMinutes} minutos
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={settings.requestsFairPlay.requestCooldownMinutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      requestsFairPlay: {
                        ...settings.requestsFairPlay,
                        requestCooldownMinutes: parseInt(e.target.value, 10),
                      },
                    })
                  }
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <p className="text-[11px] text-zinc-500">
                  Tiempo mínimo que debe esperar un cliente para enviar otro pedido tras ser atendido.
                </p>
              </div>

              {/* DJ approval */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Aprobación Obligatoria del DJ</div>
                  <div className="text-[11px] text-zinc-500">
                    Los pedidos entran a revisión pendiente; el DJ decide si entran a la cola o los rechaza.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.requestsFairPlay.requireDjApproval}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      requestsFairPlay: {
                        ...settings.requestsFairPlay,
                        requireDjApproval: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {/* Dedications */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Permitir Dedicatorias & Mensajes</div>
                  <div className="text-[11px] text-zinc-500">
                    Los invitados pueden adjuntar un mensaje o dedicatoria que se muestra en la pantalla de la pista.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.requestsFairPlay.allowDedicationNotes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      requestsFairPlay: {
                        ...settings.requestsFairPlay,
                        allowDedicationNotes: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PANTALLAS Y FOTOS */}
        {activeTab === "screen" && (
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Tv className="w-5 h-5 text-purple-400" />
              <span>Pantallas Gigantes & Muro Social de Fotos</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo approval */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Moderación Previa de Fotos (Obligatoria)</div>
                  <div className="text-[11px] text-zinc-500">
                    Ninguna foto de clientes se muestra en pantalla hasta que el DJ o Barman la apruebe.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.screenPhotos.photoApprovalRequired}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      screenPhotos: {
                        ...settings.screenPhotos,
                        photoApprovalRequired: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </div>

              {/* Photo rotation */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-white">Rotación de Fotos en TV</span>
                  <span className="font-bold text-purple-400 font-mono text-sm">
                    {settings.screenPhotos.photoRotationSeconds} segundos
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={settings.screenPhotos.photoRotationSeconds}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      screenPhotos: {
                        ...settings.screenPhotos,
                        photoRotationSeconds: parseInt(e.target.value, 10),
                      },
                    })
                  }
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <p className="text-[11px] text-zinc-500">
                  Intervalo de transición entre fotos aprobadas mostradas en el carrusel de TV.
                </p>
              </div>

              {/* Allow selfies */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Cámara Web & Subida de Selfies</div>
                  <div className="text-[11px] text-zinc-500">
                    Permitir a los invitados de las mesas subir fotos directamente desde sus celulares.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.screenPhotos.allowSelfies}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      screenPhotos: {
                        ...settings.screenPhotos,
                        allowSelfies: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </div>

              {/* Karaoke lyrics on TV */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Letras de Karaoke en Pantalla Grande</div>
                  <div className="text-[11px] text-zinc-500">
                    Muestra subtítulos sincronizados y visualizadores rítmicos en el display público.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.screenPhotos.tvLyricsDisplay}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      screenPhotos: {
                        ...settings.screenPhotos,
                        tvLyricsDisplay: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </div>

              {/* Acceso directo a Promoción de Barra & Ofertas Flash */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-zinc-950 to-purple-950/40 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Promoción Activa de Barra & Ofertas (Flash Deals)</div>
                    <div className="text-[11px] text-zinc-400">
                      Personaliza los tragos 2x1, happy hour, descuentos y textos de la marquesina en TV y celular.
                    </div>
                  </div>
                </div>
                <a
                  href="/dashboard/branding"
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shrink-0 transition-colors text-center shadow-md shadow-amber-500/20"
                >
                  Configurar en Marca & White-Label &rarr;
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SEGURIDAD Y QR */}
        {activeTab === "security" && (
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <span>Seguridad, Acceso y Gestión de Códigos QR</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Force session logout */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Cierre de Sesión al Finalizar la Noche</div>
                  <div className="text-[11px] text-zinc-500">
                    Invalida automáticamente los tokens de invitados cuando el evento pasa a estado FINALIZADO.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.security.forceSessionLogoutOnClose}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        forceSessionLogoutOnClose: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </div>

              {/* Auto rotate QR */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Rotación de Tokens QR de Mesas</div>
                  <div className="text-[11px] text-zinc-500">
                    Genera nuevos tokens criptográficos para los QR de las mesas cada semana para evitar pedidos remotos.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.security.qrAutoRotateOnClose}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        qrAutoRotateOnClose: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-purple-400" />
                  Registro Forense de Auditoría Activo
                </span>
                <p className="text-[11px] text-zinc-400">
                  Todas las operaciones críticas y cambios de configuración quedan sellados en el registro inmutable.
                </p>
              </div>
              <a
                href="/dashboard/audit"
                className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shrink-0"
              >
                Ver Auditoría & Logs
              </a>
            </div>

            {/* Acceso a Gestión de Equipo, Roles y Permisos */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-zinc-950 to-indigo-950/40 border border-purple-500/30 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  Roles y Permisos de Personal (Manager y DJ)
                </span>
                <p className="text-[11px] text-zinc-400">
                  Asigna roles a los miembros de tu equipo y personaliza la matriz de permisos para cabina y sala.
                </p>
              </div>
              <a
                href="/dashboard/team"
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shrink-0"
              >
                Administrar Equipo &rarr;
              </a>
            </div>
          </div>
        )}

        {/* Botón flotante inferior para guardar */}
        <div className="flex justify-end pt-4 border-t border-zinc-800">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white flex items-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? "Guardando..." : "Guardar Toda la Configuración"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
