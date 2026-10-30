"use client";

import { useState, useEffect, useRef } from "react";
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
  Upload,
  Trash2,
  Check,
  Link as LinkIcon,
  Flame,
  Zap,
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

  // Refs para inputs de archivo
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Estados de subida de archivos
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [logoDragOver, setLogoDragOver] = useState(false);
  const [bannerDragOver, setBannerDragOver] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState({ logo: false, banner: false });

  // Form State
  const [formData, setFormData] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Función para subir archivo de imagen directamente desde el dispositivo
  const uploadFile = async (file: File, type: "logo" | "banner") => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];
    if (!allowed.includes(file.type)) {
      showFeedback("error", "Formato no válido. Debe ser PNG, JPG, WebP, SVG o GIF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showFeedback("error", "El archivo excede el tamaño máximo de 10 MB.");
      return;
    }

    if (type === "logo") setUploadingLogo(true);
    else setUploadingBanner(true);

    try {
      const data = new FormData();
      data.append("file", file);
      data.append("type", type);

      const res = await fetch("/api/v1/branding/upload", {
        method: "POST",
        body: data,
      });

      if (res.ok) {
        const json = await res.json();
        const uploadedUrl = json.data?.url;
        if (uploadedUrl) {
          setFormData((prev) => ({
            ...prev,
            [type === "logo" ? "logoUrl" : "bannerUrl"]: uploadedUrl,
          }));
          showFeedback("success", `¡${type === "logo" ? "Logotipo" : "Portada"} subido exitosamente desde tu dispositivo!`);
        }
      } else {
        // Fallback resiliente: leer como base64 data URL para no bloquear al usuario
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          setFormData((prev) => ({
            ...prev,
            [type === "logo" ? "logoUrl" : "bannerUrl"]: base64,
          }));
          showFeedback("success", `¡${type === "logo" ? "Logotipo" : "Portada"} cargado desde tu dispositivo!`);
        };
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setFormData((prev) => ({
          ...prev,
          [type === "logo" ? "logoUrl" : "bannerUrl"]: base64,
        }));
        showFeedback("success", `¡${type === "logo" ? "Logotipo" : "Portada"} cargado desde tu dispositivo!`);
      };
      reader.readAsDataURL(file);
    } finally {
      if (type === "logo") setUploadingLogo(false);
      else setUploadingBanner(false);
    }
  };

  // Actualizar campos de la promoción activa con valores por defecto seguros
  const updateActivePromo = (updates: Partial<NonNullable<BrandingConfig["activePromo"]>>) => {
    setFormData((prev) => {
      const current = prev.activePromo || {
        enabled: true,
        mode: "CUSTOM",
        badgeText: "PROMO ACTIVA",
        title: "🍸 2x1 en Tragos de Barra",
        discount: "Happy Hour hasta las 00:00 hs",
        subtitle: "Acércate a la barra mostrando tu pantalla para canjear",
        callToAction: "Pedir en Barra",
      };
      return {
        ...prev,
        activePromo: {
          ...current,
          ...updates,
        },
      };
    });
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#263858] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 text-[10px] font-black tracking-widest uppercase">
              WHITE-LABEL & BRANDING VIDJSPRO
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <Palette className="w-6 h-6 text-[#8B5CF6]" />
            <span>Personalización de Marca para Locales</span>
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Adapta los colores temáticos, logos, cintas de anuncios y datos de Wi-Fi de la pantalla TV y el móvil del cliente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {feedback && (
            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border animate-fadeIn ${
                feedback.type === "success"
                  ? "bg-emerald-950/80 text-emerald-200 border-emerald-500/40"
                  : "bg-red-950/80 text-red-200 border-red-500/40"
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
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:from-[#7C3AED] hover:to-[#4F46E5] text-white text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-violet-600/30 disabled:opacity-50 active:scale-95"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? "Guardando..." : "Guardar Cambios"}</span>
          </button>
        </div>
      </div>

      {/* 2. Selector de Ámbito (Marca Global vs. Local Específico) */}
      <div className="p-4 rounded-2xl bg-[#111F38] border border-[#263858] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-black/20">
        <div>
          <div className="text-xs font-black text-[#F8FAFC] flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#8B5CF6]" />
            <span>Ámbito de Personalización</span>
          </div>
          <p className="text-[11px] text-[#94A3B8]">
            Define si los cambios aplican a toda la cadena o a una sucursal en particular.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedTarget("TENANT")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              selectedTarget === "TENANT"
                ? "bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]/60 shadow-sm"
                : "bg-[#0D1930] text-[#94A3B8] border-[#263858] hover:text-[#F8FAFC] hover:border-slate-600"
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
                ? "bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]/60 shadow-sm"
                : "bg-[#0D1930] text-[#94A3B8] border-[#263858] hover:text-[#F8FAFC] hover:border-slate-600"
            }`}
          >
            📍 Local Específico
          </button>

          {selectedTarget === "VENUE" && venues.length > 0 && (
            <select
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#0D1930] border border-[#263858] text-xs text-[#F8FAFC] font-medium focus:outline-none focus:border-[#8B5CF6]"
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
          <div className="p-5 rounded-2xl bg-[#111F38] border border-[#263858] space-y-4 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-black text-[#F8FAFC]">Plantillas de Estilo Neón VIDJSPRO</h2>
              </div>
              <span className="text-[10px] text-[#64748B] font-mono">1-clic para aplicar</span>
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
                        ? "bg-[#0D1930] border-[#8B5CF6] shadow-lg ring-2 ring-[#8B5CF6]/50"
                        : "bg-[#0D1930]/60 border-[#263858] hover:border-slate-600 hover:bg-[#0D1930]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#F8FAFC]">{preset.name}</span>
                      <div className="flex items-center gap-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm"
                          style={{ backgroundColor: preset.primaryColor }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm"
                          style={{ backgroundColor: preset.accentColor }}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-[#94A3B8] line-clamp-1">{preset.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Selectores de Color Manuales */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#263858]">
              <div>
                <label className="text-[11px] font-bold text-[#94A3B8] block mb-1">
                  Color Primario (Botones & Acentos)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.primaryColor || "#8B5CF6"}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="w-9 h-9 rounded-lg bg-[#0D1930] border border-[#263858] cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="flex-1 px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs font-mono text-[#F8FAFC] uppercase focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#94A3B8] block mb-1">
                  Color de Resplandor / Destello
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.accentColor || "#06B6D4"}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, accentColor: e.target.value }))
                    }
                    className="w-9 h-9 rounded-lg bg-[#0D1930] border border-[#263858] cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={formData.accentColor || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, accentColor: e.target.value }))
                    }
                    className="flex-1 px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs font-mono text-[#F8FAFC] uppercase focus:outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Logotipo y Banner desde Dispositivo */}
          <div className="p-5 rounded-2xl bg-[#111F38] border border-[#263858] space-y-6 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#8B5CF6]" />
                <h2 className="text-sm font-black text-[#F8FAFC]">Logotipo & Portada del Local</h2>
              </div>
              <span className="text-[10px] text-[#A78BFA] bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 px-2 py-0.5 rounded-full font-bold">
                Carga desde dispositivo
              </span>
            </div>

            {/* 1. Logotipo del Establecimiento */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#F8FAFC] flex items-center gap-1.5">
                  <span>Logotipo del Establecimiento</span>
                  <span className="text-[#64748B] font-normal">(PNG transparente, SVG, WebP o JPG)</span>
                </label>
                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, logoUrl: null }))}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Quitar logo</span>
                  </button>
                )}
              </div>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file, "logo");
                  e.target.value = "";
                }}
              />

              {formData.logoUrl ? (
                /* Card con Logo Cargado */
                <div className="p-4 rounded-xl bg-[#0D1930] border border-[#263858] flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-24 rounded-lg bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:8px_8px] bg-[#080F1F] border border-[#263858] p-2 flex items-center justify-center shrink-0 overflow-hidden relative group">
                    <img
                      src={formData.logoUrl}
                      alt="Logo cargado"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold mb-1">
                      <Check className="w-3 h-3" />
                      <span>Logotipo activo en Pantalla TV y Móvil</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] truncate max-w-xs sm:max-w-md">
                      {formData.logoUrl.startsWith("data:")
                        ? "Archivo cargado en memoria"
                        : formData.logoUrl.split("/").pop()}
                    </p>
                    <div className="mt-2 flex items-center gap-2 justify-center sm:justify-start">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="px-3 py-1 rounded-lg bg-[#111F38] hover:bg-[#1E293B] border border-[#263858] text-[#F8FAFC] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {uploadingLogo ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>Cambiar archivo</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Dropzone de carga */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setLogoDragOver(true);
                  }}
                  onDragLeave={() => setLogoDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setLogoDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) uploadFile(file, "logo");
                  }}
                  onClick={() => logoInputRef.current?.click()}
                  className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2.5 ${
                    logoDragOver
                      ? "border-[#8B5CF6] bg-[#8B5CF6]/15 shadow-lg shadow-violet-500/10"
                      : "border-[#263858] bg-[#0D1930] hover:border-slate-500 hover:bg-[#0D1930]/80"
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#A78BFA] flex items-center justify-center">
                    {uploadingLogo ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#F8FAFC] block">
                      {uploadingLogo ? "Subiendo archivo..." : "Haz clic o arrastra tu logotipo aquí"}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] block mt-0.5">
                      Sube el logo de tu local desde este dispositivo (PNG, SVG, WebP o JPG)
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:from-[#7C3AED] hover:to-[#4F46E5] text-white text-[11px] font-bold shadow-md shadow-violet-600/30">
                    Elegir archivo desde el equipo
                  </span>
                </div>
              )}

              {/* Opción secundaria para pegar URL si se desea */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowManualUrl((prev) => ({ ...prev, logo: !prev.logo }))}
                  className="text-[10px] text-[#64748B] hover:text-[#94A3B8] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>{showManualUrl.logo ? "Ocultar opción de enlace URL" : "O pegar enlace web externo"}</span>
                </button>
                {showManualUrl.logo && (
                  <input
                    type="text"
                    placeholder="https://ejemplo.com/logo.png"
                    value={formData.logoUrl || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, logoUrl: e.target.value }))}
                    className="mt-1.5 w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#8B5CF6]"
                  />
                )}
              </div>
            </div>

            {/* 2. Banner / Portada del Móvil */}
            <div className="space-y-2 pt-4 border-t border-[#263858]">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#F8FAFC] flex items-center gap-1.5">
                  <span>Banner / Portada para Móvil de Clientes</span>
                  <span className="text-[#64748B] font-normal">(Opcional • Recomendado 1200x400)</span>
                </label>
                {formData.bannerUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, bannerUrl: null }))}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Quitar portada</span>
                  </button>
                )}
              </div>

              <input
                ref={bannerInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file, "banner");
                  e.target.value = "";
                }}
              />

              {formData.bannerUrl ? (
                /* Card con Banner Cargado */
                <div className="p-4 rounded-xl bg-[#0D1930] border border-[#263858] space-y-3">
                  <div className="w-full h-28 rounded-lg overflow-hidden border border-[#263858] relative bg-[#080F1F]">
                    <img
                      src={formData.bannerUrl}
                      alt="Banner cargado"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                      <Check className="w-3 h-3" />
                      <span>Portada lista para el móvil de los clientes</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={uploadingBanner}
                      className="px-3 py-1 rounded-lg bg-[#111F38] hover:bg-[#1E293B] border border-[#263858] text-[#F8FAFC] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {uploadingBanner ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>Cambiar portada</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Dropzone de carga */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setBannerDragOver(true);
                  }}
                  onDragLeave={() => setBannerDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setBannerDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) uploadFile(file, "banner");
                  }}
                  onClick={() => bannerInputRef.current?.click()}
                  className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2.5 ${
                    bannerDragOver
                      ? "border-[#06B6D4] bg-[#06B6D4]/15 shadow-lg shadow-cyan-500/10"
                      : "border-[#263858] bg-[#0D1930] hover:border-slate-500 hover:bg-[#0D1930]/80"
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#06B6D4]/15 border border-[#06B6D4]/30 text-[#22D3EE] flex items-center justify-center">
                    {uploadingBanner ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#F8FAFC] block">
                      {uploadingBanner ? "Subiendo archivo..." : "Haz clic o arrastra la imagen de portada aquí"}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] block mt-0.5">
                      Foto de barra, flyer de la noche o banner horizontal (JPG, PNG, WebP)
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#06B6D4] to-[#0284C7] hover:from-[#0891B2] hover:to-[#0369A1] text-white text-[11px] font-bold shadow-md shadow-cyan-600/30">
                    Elegir portada desde el equipo
                  </span>
                </div>
              )}

              {/* Opción secundaria para pegar URL si se desea */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowManualUrl((prev) => ({ ...prev, banner: !prev.banner }))}
                  className="text-[10px] text-[#64748B] hover:text-[#94A3B8] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>{showManualUrl.banner ? "Ocultar opción de enlace URL" : "O pegar enlace web externo"}</span>
                </button>
                {showManualUrl.banner && (
                  <input
                    type="text"
                    placeholder="https://ejemplo.com/banner.jpg"
                    value={formData.bannerUrl || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bannerUrl: e.target.value }))}
                    className="mt-1.5 w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Textos y Marquesina */}
          <div className="p-5 rounded-2xl bg-[#111F38] border border-[#263858] space-y-4 shadow-lg shadow-black/20">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#06B6D4]" />
              <h2 className="text-sm font-black text-[#F8FAFC]">Textos de Bienvenida & Marquesina TV</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#F8FAFC] block mb-1">
                  Título de Bienvenida en Móvil
                </label>
                <input
                  type="text"
                  placeholder="¡Bienvenidos a Retro Bar & Karaoke!"
                  value={formData.welcomeTitle || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, welcomeTitle: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#F8FAFC] block mb-1">
                  Cinta de Anuncios y Promociones (Marquesina TV & Móvil)
                </label>
                <input
                  type="text"
                  placeholder="🍹 2x1 en Tragos hasta las 23hs | 🎂 Festeja tu cumpleaños en cabina"
                  value={formData.marqueeText || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, marqueeText: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#8B5CF6]"
                />
                <span className="text-[10px] text-[#64748B] mt-1 block">
                  Se proyectará animada en la parte superior de la Smart TV y en el móvil de los clientes.
                </span>
              </div>
            </div>
          </div>

          {/* Promoción Activa de Barra & Ofertas Flash */}
          <div className="p-5 rounded-2xl bg-[#111F38] border border-[#263858] space-y-4 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-black text-[#F8FAFC]">Promoción Activa de Barra & Ofertas (Flash Deals)</h2>
              </div>
              <span className="text-[10px] text-amber-300 bg-amber-950/60 border border-amber-700/60 px-2 py-0.5 rounded-full font-bold">
                TV & Móvil
              </span>
            </div>

            <p className="text-[11px] text-[#94A3B8]">
              Personaliza la promoción de barra que se muestra a los comensales en su celular y en la barra superior de la Smart TV.
            </p>

            {/* Toggle de Activación */}
            <div className="p-3.5 rounded-xl bg-[#0D1930] border border-[#263858] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  formData.activePromo?.enabled !== false
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-[#111F38] text-[#64748B]"
                }`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#F8FAFC] block">
                    Mostrar Promoción Activa al Público
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">
                    Visible en la barra superior de la Smart TV y en el móvil de cada mesa.
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.activePromo?.enabled !== false}
                  onChange={(e) => updateActivePromo({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#111F38] border border-[#263858] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>

            {formData.activePromo?.enabled !== false && (
              <div className="space-y-4 pt-2 animate-fadeIn">
                {/* Selector de Modo: Personalizada vs Automática */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0D1930] border border-[#263858]">
                  <button
                    type="button"
                    onClick={() => updateActivePromo({ enabled: true, mode: "CUSTOM" })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formData.activePromo?.mode !== "AUTO"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                        : "text-[#94A3B8] hover:text-[#F8FAFC]"
                    }`}
                  >
                    ✨ Personalizada (Tu propia promo)
                  </button>

                  <button
                    type="button"
                    onClick={() => updateActivePromo({ enabled: true, mode: "AUTO" })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formData.activePromo?.mode === "AUTO"
                        ? "bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/40 shadow-sm"
                        : "text-[#94A3B8] hover:text-[#F8FAFC]"
                    }`}
                  >
                    🤖 Automática (Modo Demo Dinámico)
                  </button>
                </div>

                {formData.activePromo?.mode === "AUTO" ? (
                  <div className="p-3.5 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-xs text-[#94A3B8] space-y-1.5">
                    <div className="font-bold text-[#A78BFA] flex items-center gap-1.5">
                      <span>⚡ Modo Demo Dinámico Activado</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      El sistema rota automáticamente entre ofertas sugeridas según la energía del local:
                      Calentamiento de pista (2x1 Cerveza), Happy Hour relámpago, Trago de autor y Brindis colectivo cumbre.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-[#94A3B8] block mb-1">
                          Insignia / Etiqueta
                        </label>
                        <input
                          type="text"
                          placeholder="PROMO ACTIVA"
                          value={formData.activePromo?.badgeText || ""}
                          onChange={(e) => updateActivePromo({ badgeText: e.target.value })}
                          className="w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-amber-500 font-bold uppercase"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-[#94A3B8] block mb-1">
                          Título de la Promoción
                        </label>
                        <input
                          type="text"
                          placeholder="🍸 2x1 en Cócteles Clásicos & Gin"
                          value={formData.activePromo?.title || ""}
                          onChange={(e) => updateActivePromo({ title: e.target.value })}
                          className="w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-amber-500 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-[#94A3B8] block mb-1">
                          Descuento o Beneficio Principal
                        </label>
                        <input
                          type="text"
                          placeholder="2x1 hasta las 00:00 hs • 25% OFF"
                          value={formData.activePromo?.discount || ""}
                          onChange={(e) => updateActivePromo({ discount: e.target.value })}
                          className="w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[#94A3B8] block mb-1">
                          Botón de Acción
                        </label>
                        <input
                          type="text"
                          placeholder="Pedir en Barra"
                          value={formData.activePromo?.callToAction || ""}
                          onChange={(e) => updateActivePromo({ callToAction: e.target.value })}
                          className="w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-amber-500 font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#94A3B8] block mb-1">
                        Instrucciones para el Cliente (Subtítulo)
                      </label>
                      <input
                        type="text"
                        placeholder="Muestra esta pantalla al barman para canjear tu beneficio"
                        value={formData.activePromo?.subtitle || ""}
                        onChange={(e) => updateActivePromo({ subtitle: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Wi-Fi y Redes Sociales */}
          <div className="p-5 rounded-2xl bg-[#111F38] border border-[#263858] space-y-4 shadow-lg shadow-black/20">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-black text-[#F8FAFC]">Wi-Fi de Mesa & Redes Sociales</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[#94A3B8] block mb-1">
                  Nombre de Red Wi-Fi (SSID)
                </label>
                <input
                  type="text"
                  placeholder="RetroBar_Clientes"
                  value={formData.wifiSsid || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, wifiSsid: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#94A3B8] block mb-1">
                  Contraseña de Wi-Fi
                </label>
                <input
                  type="text"
                  placeholder="Karaoke2026"
                  value={formData.wifiPassword || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, wifiPassword: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#94A3B8] block mb-1">
                  Usuario de Instagram
                </label>
                <input
                  type="text"
                  placeholder="@retrobar_oficial"
                  value={formData.instagramHandle || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, instagramHandle: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#94A3B8] block mb-1">
                  WhatsApp para Reservas / Contacto
                </label>
                <input
                  type="text"
                  placeholder="+5491155667788"
                  value={formData.whatsappNumber || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, whatsappNumber: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-[#0D1930] border border-[#263858] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#8B5CF6]"
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
                <Eye className="w-4 h-4 text-[#06B6D4]" />
                <h2 className="text-sm font-black text-[#F8FAFC]">Vista Previa en Tiempo Real</h2>
              </div>
              <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Live Simulator</span>
            </div>

            {/* Simulación Pantalla TV */}
            <div className="rounded-2xl bg-[#080F1F] border-2 border-[#263858] p-4 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-[#263858] text-[10px] font-bold text-[#94A3B8]">
                <div className="flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span className="font-mono">SMART TV (1080p / 4K)</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[9px] font-black">
                  EN VIVO
                </span>
              </div>

              {/* Marquesina TV en Preview */}
              {formData.marqueeText && (
                <div className="my-2 py-1 px-2 rounded bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[9px] font-bold text-[#A78BFA] truncate animate-pulse text-center">
                  ✨ {formData.marqueeText}
                </div>
              )}

              {/* Promo Activa TV en Preview */}
              {formData.activePromo?.enabled !== false && (
                <div className="my-2 py-1 px-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-[9px] flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-400 text-[8px] font-black uppercase">
                      {formData.activePromo?.badgeText || "PROMO ACTIVA"}
                    </span>
                    <span className="truncate">⚡ {formData.activePromo?.title || "Happy Hour en Barra"}</span>
                  </div>
                  <span className="font-bold text-slate-900 text-[9px] shrink-0 truncate ml-2">
                    {formData.activePromo?.discount}
                  </span>
                </div>
              )}

              {/* Header TV en Preview */}
              <div className="flex items-center gap-3 my-3">
                {formData.logoUrl ? (
                  <div className="w-10 h-10 rounded-xl bg-[#0D1930] border border-[#263858] p-1 flex items-center justify-center shrink-0">
                    <img
                      src={formData.logoUrl}
                      alt="Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    <Disc3 className="w-5 h-5 animate-spin" />
                  </div>
                )}
                <div>
                  <div className="text-xs font-black text-[#F8FAFC]">
                    {formData.welcomeTitle || "RETRO BAR & KARAOKE"}
                  </div>
                  <div className="text-[10px] text-[#94A3B8]">Viernes de Karaoke Pop</div>
                </div>
              </div>

              {/* Now Playing Mockup */}
              <div className="p-3 rounded-xl bg-[#111F38] border border-[#263858] flex items-center gap-3 shadow-inner">
                <div
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-white shrink-0"
                  style={{
                    borderColor: formData.primaryColor,
                    backgroundColor: "#080F1F",
                  }}
                >
                  <Disc3 className="w-6 h-6 animate-spin [animation-duration:4s]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-[#F8FAFC] truncate">Bohemian Rhapsody</div>
                  <div
                    className="text-[10px] font-bold truncate"
                    style={{ color: formData.primaryColor }}
                  >
                    Queen
                  </div>
                  <div className="text-[9px] text-[#64748B] mt-0.5">Mesa 4 &bull; Carlos M.</div>
                </div>
              </div>
            </div>

            {/* Simulación Móvil del Cliente */}
            <div className="max-w-[320px] mx-auto rounded-3xl bg-[#080F1F] border-4 border-[#263858] p-4 shadow-2xl relative">
              <div className="w-24 h-3 rounded-full bg-[#111F38] border border-[#263858] mx-auto mb-3" />

              {/* Banner de Portada en Preview si existe */}
              {formData.bannerUrl && (
                <div className="mb-3 rounded-xl overflow-hidden h-20 w-full border border-[#263858] relative bg-[#0D1930]">
                  <img
                    src={formData.bannerUrl}
                    alt="Portada"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Header Móvil */}
              <div className="flex items-center justify-between pb-3 border-b border-[#263858]">
                <div className="flex items-center gap-2">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo"
                      className="w-6 h-6 rounded object-contain bg-[#0D1930]"
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-black"
                      style={{ backgroundColor: formData.primaryColor }}
                    >
                      VB
                    </div>
                  )}
                  <span className="text-[11px] font-bold text-[#F8FAFC] truncate max-w-[120px]">
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
                <div className="my-2.5 p-2 rounded-xl bg-[#0D1930] border border-[#263858] text-[10px] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <Wifi className="w-3 h-3 text-[#06B6D4] shrink-0" />
                    <span className="text-[#94A3B8] truncate">
                      Wi-Fi: <strong className="text-[#F8FAFC]">{formData.wifiSsid}</strong>
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-[#64748B]">Clave lista</span>
                </div>
              )}

              {/* Promo Activa Móvil en Preview */}
              {formData.activePromo?.enabled !== false && (
                <div className="my-2.5 p-2 rounded-xl bg-gradient-to-r from-amber-950/80 via-[#0D1930] to-purple-950/80 border border-amber-500/50 flex items-center justify-between gap-1.5 shadow-md">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-black uppercase px-1 rounded bg-black/60 text-amber-300">
                        {formData.activePromo?.badgeText || "PROMO ACTIVA"}
                      </span>
                      <span className="text-[10px] font-black text-[#F8FAFC] truncate">
                        {formData.activePromo?.title || "Happy Hour"}
                      </span>
                    </div>
                    <p className="text-[9px] text-[#94A3B8] font-bold truncate">
                      {formData.activePromo?.discount}
                    </p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-white text-slate-950 font-black text-[8px] uppercase shrink-0 shadow-sm">
                    {formData.activePromo?.callToAction || "Pedir"}
                  </span>
                </div>
              )}

              {/* Botón de Pedido Móvil con Color Primario */}
              <div className="my-3 p-3 rounded-xl bg-[#0D1930] border border-[#263858] space-y-2">
                <div className="text-[10px] font-bold text-[#F8FAFC]">Catálogo de Canciones</div>
                <div className="h-6 rounded-lg bg-[#111F38] border border-[#263858] text-[10px] text-[#64748B] px-2 flex items-center">
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
                <div className="pt-2 border-t border-[#263858] text-center text-[10px] text-[#94A3B8] font-medium">
                  📸 Síguenos: <span className="text-[#A78BFA] font-bold">{formData.instagramHandle}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
