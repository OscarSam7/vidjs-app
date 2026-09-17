"use client";

import { useState, useEffect } from "react";
import {
  Palette,
  Sparkles,
  Building2,
  Tv,
  Smartphone,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Radio,
  Disc3,
  Image as ImageIcon,
  Instagram,
  MessageCircle,
  ExternalLink,
  Eye,
} from "lucide-react";
import { THEME_PRESETS, BrandingConfig, DEFAULT_BRANDING } from "@/lib/branding/config";

interface VenueOption {
  id: string;
  name: string;
  slug: string;
}

export default function BrandingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<"TENANT" | "VENUE">("TENANT");
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");

  // Form State
  const [formData, setFormData] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Cargar configuración de marca
  const fetchBranding = async (venueId?: string) => {
    setLoading(true);
    try {
      const url = venueId
        ? `/api/v1/branding?venueId=${venueId}`
        : "/api/v1/branding";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setVenues(json.data.venues || []);
        if (json.data.resolved) {
          setFormData(json.data.resolved);
        }
      }
    } catch (err) {
      console.error("Error al cargar marca:", err);
      showFeedback("error", "Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding(selectedTarget === "VENUE" ? selectedVenueId : undefined);
  }, [selectedTarget, selectedVenueId]);

  const handleSelectPreset = (presetId: string) => {
    const preset = THEME_PRESETS[presetId];
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        themePreset: preset.id,
        primaryColor: preset.primaryColor,
        accentColor: preset.accentColor,
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        target: selectedTarget,
        venueId: selectedTarget === "VENUE" ? selectedVenueId : undefined,
        branding: formData,
      };

      const res = await fetch("/api/v1/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showFeedback("success", "¡Personalización de marca guardada exitosamente!");
        await fetchBranding(selectedTarget === "VENUE" ? selectedVenueId : undefined);
      } else {
        const err = await res.json();
        showFeedback("error", err.error?.message || "Error al guardar personalización");
      }
    } catch {
      showFeedback("error", "Error de red al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* 1. Header de Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-purple-600/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold tracking-widest uppercase">
              WHITE-LABEL & BRANDING
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Palette className="w-6 h-6 text-purple-400" />
            <span>Personalización de Marca para Locales</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Adapta los colores temáticos, logos, cintas de anuncios y datos de Wi-Fi de la pantalla TV y el móvil del cliente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {feedback && (
            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border animate-fadeIn ${
                feedback.type === "success"
                  ? "bg-emerald-950 text-emerald-200 border-emerald-700"
                  : "bg-red-950 text-red-200 border-red-700"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-600/30 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? "Guardando..." : "Guardar Cambios"}</span>
          </button>
        </div>
      </div>

      {/* 2. Selector de Ámbito (Marca Global vs. Local Específico) */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-purple-400" />
            <span>Ámbito de Personalización</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Define si los cambios aplican a toda la cadena o a una sucursal en particular.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedTarget("TENANT")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              selectedTarget === "TENANT"
                ? "bg-purple-600/20 text-purple-300 border-purple-500"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
          >
            🏢 Marca General (Cadena)
          </button>

          <button
            onClick={() => {
              setSelectedTarget("VENUE");
              if (!selectedVenueId && venues.length > 0) {
                setSelectedVenueId(venues[0].id);
              }
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              selectedTarget === "VENUE"
                ? "bg-purple-600/20 text-purple-300 border-purple-500"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
          >
            📍 Local Específico
          </button>

          {selectedTarget === "VENUE" && venues.length > 0 && (
            <select
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white font-medium focus:outline-none focus:border-purple-500"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 3. Grid Principal: Editor (Col 7) vs Live Preview (Col 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Formulario de Configuración (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Paleta y Presets */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white">Plantillas de Estilo Neón</h2>
              </div>
              <span className="text-[10px] text-zinc-500">1-clic para aplicar</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.values(THEME_PRESETS).map((preset) => {
                const isSelected = formData.themePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? "bg-zinc-900 border-white shadow-lg ring-2 ring-purple-500/50"
                        : "bg-zinc-950/80 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">{preset.name}</span>
                      <div className="flex items-center gap-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40"
                          style={{ backgroundColor: preset.primaryColor }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40"
                          style={{ backgroundColor: preset.accentColor }}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-1">{preset.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Selectores de Color Manuales */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-800/80">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Color Primario (Botones & Acentos)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.primaryColor || "#8B5CF6"}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="w-9 h-9 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Color de Resplandor / Destello
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.accentColor || "#06B6D4"}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, accentColor: e.target.value }))
                    }
                    className="w-9 h-9 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={formData.accentColor || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, accentColor: e.target.value }))
                    }
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Logotipo y Banner */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white">Logotipo & Portada</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  URL del Logotipo (PNG / SVG transparente)
                </label>
                <input
                  type="text"
                  placeholder="https://ejemplo.com/logo-bar.png"
                  value={formData.logoUrl || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, logoUrl: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  URL del Banner / Portada del Móvil (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="https://ejemplo.com/banner-fiesta.jpg"
                  value={formData.bannerUrl || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bannerUrl: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Textos y Marquesina */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Textos de Bienvenida & Marquesina TV</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Título de Bienvenida en Móvil
                </label>
                <input
                  type="text"
                  placeholder="¡Bienvenidos a Retro Bar & Karaoke!"
                  value={formData.welcomeTitle || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, welcomeTitle: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Cinta de Anuncios y Promociones (Marquesina TV & Móvil)
                </label>
                <input
                  type="text"
                  placeholder="🍹 2x1 en Tragos hasta las 23hs | 🎂 Festeja tu cumpleaños en cabina"
                  value={formData.marqueeText || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, marqueeText: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Se proyectará animada en la parte superior de la Smart TV y en el móvil de los clientes.
                </span>
              </div>
            </div>
          </div>

          {/* Wi-Fi y Redes Sociales */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Wi-Fi de Mesa & Redes Sociales</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Nombre de Red Wi-Fi (SSID)
                </label>
                <input
                  type="text"
                  placeholder="RetroBar_Clientes"
                  value={formData.wifiSsid || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, wifiSsid: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Contraseña de Wi-Fi
                </label>
                <input
                  type="text"
                  placeholder="Karaoke2026"
                  value={formData.wifiPassword || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, wifiPassword: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Usuario de Instagram
                </label>
                <input
                  type="text"
                  placeholder="@retrobar_oficial"
                  value={formData.instagramHandle || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, instagramHandle: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  WhatsApp para Reservas / Contacto
                </label>
                <input
                  type="text"
                  placeholder="+5491155667788"
                  value={formData.whatsappNumber || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, whatsappNumber: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Dual (Col 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Vista Previa en Tiempo Real</h2>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">Live Simulator</span>
            </div>

            {/* Simulación Pantalla TV */}
            <div className="rounded-2xl bg-black border-2 border-zinc-800 p-4 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-[10px] font-bold text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-purple-400" />
                  <span>SMART TV (1080p / 4K)</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px]">
                  EN VIVO
                </span>
              </div>

              {/* Marquesina TV en Preview */}
              {formData.marqueeText && (
                <div className="my-2 py-1 px-2 rounded bg-purple-950/60 border border-purple-800/60 text-[9px] font-bold text-purple-200 truncate animate-pulse text-center">
                  ✨ {formData.marqueeText}
                </div>
              )}

              {/* Header TV en Preview */}
              <div className="flex items-center gap-3 my-3">
                {formData.logoUrl ? (
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 p-1 flex items-center justify-center shrink-0">
                    <img
                      src={formData.logoUrl}
                      alt="Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    <Disc3 className="w-5 h-5 animate-spin" />
                  </div>
                )}
                <div>
                  <div className="text-xs font-black text-white">
                    {formData.welcomeTitle || "RETRO BAR & KARAOKE"}
                  </div>
                  <div className="text-[10px] text-zinc-400">Viernes de Karaoke Pop</div>
                </div>
              </div>

              {/* Now Playing Mockup */}
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-white shrink-0"
                  style={{
                    borderColor: formData.primaryColor,
                    backgroundColor: "#000",
                  }}
                >
                  <Disc3 className="w-6 h-6 animate-spin [animation-duration:4s]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-white truncate">Bohemian Rhapsody</div>
                  <div
                    className="text-[10px] font-bold truncate"
                    style={{ color: formData.primaryColor }}
                  >
                    Queen
                  </div>
                  <div className="text-[9px] text-zinc-400 mt-0.5">Mesa 4 &bull; Carlos M.</div>
                </div>
              </div>
            </div>

            {/* Simulación Móvil del Cliente */}
            <div className="max-w-[320px] mx-auto rounded-3xl bg-zinc-950 border-4 border-zinc-800 p-4 shadow-2xl relative">
              <div className="w-24 h-3 rounded-full bg-zinc-850 mx-auto mb-3" />

              {/* Header Móvil */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo"
                      className="w-6 h-6 rounded object-contain bg-zinc-900"
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-black"
                      style={{ backgroundColor: formData.primaryColor }}
                    >
                      VB
                    </div>
                  )}
                  <span className="text-[11px] font-bold text-white truncate max-w-[120px]">
                    {formData.welcomeTitle || "Retro Bar"}
                  </span>
                </div>
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full border text-white"
                  style={{
                    backgroundColor: `${formData.primaryColor}20`,
                    borderColor: formData.primaryColor,
                  }}
                >
                  Mesa 3
                </span>
              </div>

              {/* Wi-Fi Móvil en Preview */}
              {formData.wifiSsid && (
                <div className="my-2.5 p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <Wifi className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="text-zinc-300 truncate">
                      Wi-Fi: <strong className="text-white">{formData.wifiSsid}</strong>
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500">Clave lista</span>
                </div>
              )}

              {/* Botón de Pedido Móvil con Color Primario */}
              <div className="my-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="text-[10px] font-bold text-white">Catálogo de Canciones</div>
                <div className="h-6 rounded-lg bg-zinc-800/80 text-[10px] text-zinc-400 px-2 flex items-center">
                  🔍 Buscar artista o canción...
                </div>
                <button
                  type="button"
                  className="w-full py-1.5 rounded-lg text-white text-[10px] font-bold transition-transform active:scale-95 shadow-md"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  Pedir Canción a Cabina
                </button>
              </div>

              {/* Redes Sociales en Preview */}
              {formData.instagramHandle && (
                <div className="pt-2 border-t border-zinc-800/60 text-center text-[10px] text-zinc-400 font-medium">
                  📸 Síguenos: <span className="text-purple-300 font-bold">{formData.instagramHandle}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
