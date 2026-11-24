"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  Compass,
  QrCode,
  Headphones,
  Crown,
  Sparkles,
  Flame,
  Calendar,
  MapPin,
  Ticket,
  Trophy,
  Gift,
  Share2,
  Copy,
  Check,
  LogOut,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
  Zap,
  Download,
  Users,
  ArrowRight,
  Building2,
  Clock,
  Store,
  Camera,
  Laptop,
} from "lucide-react";
import { CynkoLogo } from "@/components/ui/ZynkoLogo";
import { QRCodeImage } from "@/components/ui/QRCodeImage";
import PwaInstallButton from "@/components/pwa/PwaInstallButton";

const VirtualDjConsole = dynamic(() => import("@/components/dj/VirtualDjConsole"), {
  ssr: false,
  loading: () => (
    <div className="p-10 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center text-xs text-zinc-400">
      Cargando Cabina DJ (Bandeja A &amp; B)...
    </div>
  ),
});

const DevicePairModal = dynamic(() => import("@/components/auth/DevicePairModal"), {
  ssr: false,
});

interface ClientProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  cynkoCode: string;
  referralCode: string;
  globalPoints: number;
  lifetimePoints: number;
  tier: "BRONCE" | "PLATA" | "ORO" | "BLACK";
  tierProgress: {
    current: string;
    next: string | null;
    remaining: number;
    progressPct: number;
  };
  referralCount: number;
  venueMemberships: Array<{
    id: string;
    points: number;
    visits: number;
    tenant: { id: string; name: string; slug: string; logoUrl?: string | null };
  }>;
  pointTransactions: Array<{
    id: string;
    points: number;
    type: string;
    description: string;
    createdAt: string;
    tenant?: { id: string; name: string } | null;
  }>;
  redemptions: Array<{
    id: string;
    code: string;
    pointsSpent: number;
    status: string;
    createdAt: string;
    reward: { id: string; title: string; category: string; pointsCost: number };
    tenant?: { id: string; name: string } | null;
  }>;
}

interface ExploreData {
  events: Array<{
    id: string;
    name: string;
    description?: string | null;
    code: string;
    status: string;
    startsAt: string;
    bannerUrl?: string | null;
    eventType: string;
    locationName?: string | null;
    address?: string | null;
    tenant: { id: string; name: string; slug: string; logoUrl?: string | null };
    pulseCount: number;
  }>;
  contests: Array<{
    id: string;
    name: string;
    description?: string | null;
    code: string;
    status: string;
    registrationFee: number;
    tenant: { id: string; name: string; slug: string };
  }>;
  flashDeals: Array<{
    id: string;
    title: string;
    subtitle?: string | null;
    discountLabel: string;
    minTier: string;
    expiresAt: string;
    tenant: { id: string; name: string; slug: string };
  }>;
  venues: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    address?: string | null;
    hasLiveEvent: boolean;
    rewardsCount: number;
  }>;
}

interface ClubRewardItem {
  id: string;
  title: string;
  description?: string | null;
  pointsCost: number;
  category: string;
  tenant?: { id: string; name: string; slug: string } | null;
}

const TIER_STYLES: Record<string, { badge: string; card: string; label: string }> = {
  BRONCE: {
    badge: "bg-amber-900/50 text-amber-300 border-amber-600/50",
    card: "from-amber-950/60 via-zinc-900 to-zinc-950 border-amber-700/40",
    label: "Bronce",
  },
  PLATA: {
    badge: "bg-slate-700/60 text-slate-200 border-slate-400/50",
    card: "from-slate-800/70 via-zinc-900 to-zinc-950 border-slate-400/40",
    label: "Plata",
  },
  ORO: {
    badge: "bg-yellow-500/20 text-yellow-300 border-yellow-400/60",
    card: "from-yellow-900/50 via-zinc-900 to-amber-950/50 border-yellow-400/50",
    label: "Oro VIP",
  },
  BLACK: {
    badge: "bg-fuchsia-600/25 text-fuchsia-200 border-fuchsia-400/70",
    card: "from-fuchsia-950/70 via-zinc-950 to-amber-950/40 border-fuchsia-400/60",
    label: "Black VIP",
  },
};

export default function ClientSuperApp() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "explore" | "dj" | "club") || "explore";
  const urlRefCode = searchParams.get("ref") || "";

  const [activeTab, setActiveTab] = useState<"explore" | "dj" | "club">(
    ["explore", "dj", "club"].includes(initialTab) ? initialTab : "explore"
  );

  // Client Auth State
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loadingClient, setLoadingClient] = useState(true);
  const [authMode, setAuthMode] = useState<"register" | "login">(urlRefCode ? "register" : "register");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authReferral, setAuthReferral] = useState(urlRefCode);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Explore & Club Data
  const [exploreData, setExploreData] = useState<ExploreData | null>(null);
  const [loadingExplore, setLoadingExplore] = useState(true);
  const [rewards, setRewards] = useState<ClubRewardItem[]>([]);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  // DJ Personal Console State
  const [crossfaderValue, setCrossfaderValue] = useState(50);

  // UI Helpers
  const [copiedRef, setCopiedRef] = useState(false);
  const [isPairPcOpen, setIsPairPcOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const showToast = useCallback((type: "success" | "error" | "info", text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((curr) => (curr?.text === text ? null : curr));
    }, 4000);
  }, []);

  const noopAsync = useCallback(async () => {}, []);

  const fetchClientSession = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/client/auth", { cache: "no-store" });
      const data = await res.json();
      if (data.authenticated && data.client) {
        setClient(data.client);
      } else {
        setClient(null);
      }
    } catch {
      setClient(null);
    } finally {
      setLoadingClient(false);
    }
  }, []);

  const fetchExplore = useCallback(async () => {
    try {
      setLoadingExplore(true);
      const [expRes, clubRes] = await Promise.all([
        fetch("/api/v1/client/explore", { cache: "no-store" }),
        fetch("/api/v1/client/club", { cache: "no-store" }),
      ]);
      const expJson = await expRes.json();
      const clubJson = await clubRes.json();
      if (expJson.success) setExploreData(expJson.data);
      if (clubJson.success) setRewards(clubJson.rewards || []);
    } catch {
      // silent
    } finally {
      setLoadingExplore(false);
    }
  }, []);

  useEffect(() => {
    fetchClientSession();
    fetchExplore();
  }, [fetchClientSession, fetchExplore]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);

    try {
      const payload =
        authMode === "register"
          ? {
              action: "register",
              name: authName,
              email: authEmail,
              password: authPassword,
              phone: authPhone || undefined,
              referralCode: authReferral || undefined,
            }
          : {
              action: "login",
              email: authEmail,
              password: authPassword,
            };

      const res = await fetch("/api/v1/client/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo completar la operación");
      }

      setClient(data.client);
      setAuthPassword("");
      showToast(
        "success",
        authMode === "register"
          ? `¡Bienvenido ${data.client.name}! Ganaste +${data.welcomeBonus || 100} pts en CYNKO Club y ya tienes acceso a la Cabina DJ.`
          : `¡Hola de nuevo, ${data.client.name}!`
      );
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/v1/client/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setClient(null);
    showToast("info", "Sesión de cliente cerrada.");
  };

  const handleRedeem = async (rewardId: string) => {
    if (!client) {
      setActiveTab("club");
      showToast("info", "Regístrate gratis para canjear premios de CYNKO Club.");
      return;
    }

    setRedeemingId(rewardId);
    try {
      const res = await fetch("/api/v1/client/club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "redeem", rewardId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo canjear");

      showToast("success", data.message || "¡Premio canjeado con éxito!");
      await fetchClientSession();
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Error al canjear");
    } finally {
      setRedeemingId(null);
    }
  };

  const copyReferralLink = () => {
    if (!client || typeof window === "undefined") return;
    const link = `${window.location.origin}/app?ref=${client.referralCode}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedRef(true);
    showToast("success", "¡Enlace de invitación copiado!");
    setTimeout(() => setCopiedRef(false), 2500);
  };

  // Generador de Tarjeta VIP para Instagram Stories (PNG 1080x1920 escalado a 540x960)
  const downloadStoryCard = () => {
    if (!client) return;
    const canvas = document.createElement("canvas");
    canvas.width = 540;
    canvas.height = 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fondo degradado nocturno CYNKO
    const bg = ctx.createLinearGradient(0, 0, 540, 960);
    bg.addColorStop(0, "#140e1f");
    bg.addColorStop(0.5, "#07070c");
    bg.addColorStop(1, "#1b1207");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 540, 960);

    // Auras Oro VIP & Magenta
    const glow1 = ctx.createRadialGradient(120, 220, 10, 120, 220, 240);
    glow1.addColorStop(0, "rgba(251, 191, 36, 0.28)");
    glow1.addColorStop(1, "rgba(251, 191, 36, 0)");
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 540, 960);

    const glow2 = ctx.createRadialGradient(420, 680, 10, 420, 680, 260);
    glow2.addColorStop(0, "rgba(224, 36, 195, 0.28)");
    glow2.addColorStop(1, "rgba(224, 36, 195, 0)");
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, 540, 960);

    // Marco tarjeta
    ctx.strokeStyle = "rgba(251, 191, 36, 0.55)";
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 60, 468, 840);

    // Título CYNKO CLUB
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 44px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CYNKO CLUB", 270, 155);

    ctx.fillStyle = "#fbbf24";
    ctx.font = "700 16px sans-serif";
    ctx.fillText("PASAPORTE NOCTURNO OFICIAL", 270, 190);

    // Nivel Badge
    ctx.fillStyle = "rgba(251, 191, 36, 0.18)";
    ctx.fillRect(145, 235, 250, 52);
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.strokeRect(145, 235, 250, 52);
    ctx.fillStyle = "#fde047";
    ctx.font = "900 22px sans-serif";
    ctx.fillText(`NIVEL ${client.tier}`, 270, 269);

    // Nombre del Miembro
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 34px sans-serif";
    ctx.fillText(client.name.toUpperCase().slice(0, 22), 270, 385);

    // Código CYNKO ID
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "700 22px monospace";
    ctx.fillText(`ID: ${client.cynkoCode}`, 270, 428);

    // Estadísticas
    ctx.fillStyle = "#fbbf24";
    ctx.font = "900 66px sans-serif";
    ctx.fillText(`${client.globalPoints.toLocaleString()}`, 270, 560);
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "700 18px sans-serif";
    ctx.fillText("PUNTOS CYNKO ACUMULADOS", 270, 595);

    ctx.fillStyle = "#f0abfc";
    ctx.font = "800 20px sans-serif";
    ctx.fillText(`Código de invitación: ${client.referralCode}`, 270, 710);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 16px sans-serif";
    ctx.fillText("Descarga la app en cynko.app", 270, 815);
    ctx.fillText("Eventos • Entradas • Cabina DJ • Premios", 270, 845);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `CYNKO-CLUB-${client.cynkoCode}.png`;
    a.click();
    showToast("success", "¡Tarjeta VIP descargada! Ya puedes subirla a tus Stories.");
  };

  // Formulario reutilizable de Registro / Login de Cliente
  const renderClientAuthGate = (title: string, subtitle: string) => (
    <div className="max-w-md mx-auto my-4 bg-zinc-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-fuchsia-600/25 border border-amber-400/40 flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7 text-amber-300" />
        </div>
        <h2 className="text-lg font-black text-white">{title}</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">{subtitle}</p>
      </div>

      {/* Selector Registro / Ingreso */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
        <button
          type="button"
          onClick={() => {
            setAuthMode("register");
            setAuthError(null);
          }}
          className={`py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
            authMode === "register"
              ? "bg-gradient-to-r from-amber-500 to-fuchsia-600 text-white shadow"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Crear Cuenta Gratis
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMode("login");
            setAuthError(null);
          }}
          className={`py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
            authMode === "login"
              ? "bg-zinc-800 text-white shadow"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Ya tengo cuenta
        </button>
      </div>

      {authError && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      <form onSubmit={handleAuthSubmit} className="space-y-3.5">
        {authMode === "register" && (
          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">Tu Nombre *</label>
            <input
              type="text"
              required
              value={authName}
              onChange={(e) => setAuthName(e.target.value)}
              placeholder="Ej: Lucas Benítez"
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-zinc-300 mb-1">Correo / Gmail *</label>
          <input
            type="email"
            required
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="tuemail@gmail.com"
            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-300 mb-1">Contraseña *</label>
          <div className="relative">
            <input
              type={showAuthPassword ? "text" : "password"}
              required
              minLength={6}
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3.5 py-2.5 pr-11 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={() => setShowAuthPassword((p) => !p)}
              aria-label="Mostrar u ocultar contraseña"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
            >
              {showAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {authMode === "register" && (
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">WhatsApp (Opcional)</label>
              <input
                type="tel"
                value={authPhone}
                onChange={(e) => setAuthPhone(e.target.value)}
                placeholder="+595 9..."
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">Código de Amigo</label>
              <input
                type="text"
                value={authReferral}
                onChange={(e) => setAuthReferral(e.target.value.toUpperCase())}
                placeholder="Opcional (+100 pts)"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-amber-300 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={authSubmitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-fuchsia-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {authSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Procesando...</span>
            </>
          ) : authMode === "register" ? (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Registrarme Gratis (+100 pts)</span>
            </>
          ) : (
            <>
              <span>Ingresar a CYNKO</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-3 border-t border-zinc-800 space-y-2 text-center">
        <Link
          href="/login"
          className="w-full py-2.5 px-3 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Laptop className="w-4 h-4 text-cyan-400" />
          <span>¿Ya tienes sesión en tu celular? Entrar en PC con QR</span>
        </Link>
        <Link
          href="/login"
          className="text-[11px] text-zinc-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>¿Eres dueño de un local o empresa? Ingresa aquí</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#06060b] text-white flex flex-col pb-24">
      {/* Header Superior Fijo */}
      <header className="sticky top-0 z-40 bg-[#090912]/90 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <CynkoLogo size="sm" subtitle="SUPER APP" />

          <div className="flex items-center gap-2">
            {client ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsPairPcOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-400/50 text-xs font-black text-cyan-200 flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.2)] transition-all"
                  title="Escanea el código QR de tu PC para abrir tu cuenta y Cabina DJ en la computadora"
                >
                  <Camera className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Escanear PC</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("club")}
                  className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-fuchsia-500/20 border border-amber-400/40 text-xs font-black text-amber-200 flex items-center gap-1.5 cursor-pointer hover:border-amber-300 transition-all"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>{client.globalPoints} pts</span>
                  <span className="hidden sm:inline text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-fuchsia-300">
                    {client.tier}
                  </span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab("club")}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-fuchsia-600 text-white text-xs font-black cursor-pointer shadow-md"
              >
                Unirme Gratis
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Banner de Instalación PWA */}
      <div className="max-w-6xl w-full mx-auto px-4 pt-3">
        <PwaInstallButton variant="banner" />
      </div>

      {/* Toast Global */}
      {toast && (
        <div className="fixed top-16 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl border text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-xl ${
              toast.type === "success"
                ? "bg-emerald-950/95 border-emerald-500/60 text-emerald-200"
                : toast.type === "error"
                ? "bg-red-950/95 border-red-500/60 text-red-200"
                : "bg-zinc-900/95 border-amber-400/50 text-amber-200"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toast.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 space-y-6">
        {/* ============================================================ */}
        {/* PESTAÑA 1: EXPLORAR (EVENTOS, CONCURSOS, FLASH DEALS, LOCALES) */}
        {/* ============================================================ */}
        {activeTab === "explore" && (
          <div className="space-y-6">
            {/* Hero Rápido de la Super App */}
            <div className="rounded-3xl bg-gradient-to-br from-fuchsia-950/60 via-zinc-900 to-amber-950/40 border border-white/10 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
              <div className="max-w-xl space-y-2.5 relative z-10">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Tu noche en una sola app</span>
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  Eventos, Entradas, Cabina DJ y Puntos VIP
                </h1>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Descubre dónde salir hoy, compra tus entradas, mezcla música con tu propia{" "}
                  <strong className="text-amber-300">Cabina DJ (Bandeja A &amp; B)</strong> y acumula puntos por cada consumo en locales CYNKO.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("dj")}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-fuchsia-600 hover:from-amber-400 hover:to-fuchsia-500 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Headphones className="w-4 h-4" />
                    <span>Abrir Cabina DJ (A &amp; B)</span>
                  </button>
                  <Link
                    href="/guest"
                    className="px-4 py-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/15 text-white text-xs font-bold flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4 text-cyan-400" />
                    <span>Estoy en un Local (Mesa QR)</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* FLASH DEALS ACTIVOS (FASE 3) */}
            {exploreData && exploreData.flashDeals.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 fill-amber-400 text-amber-400 animate-pulse" />
                    <span>Flash Deals de Último Minuto</span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {exploreData.flashDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/70 via-zinc-900 to-fuchsia-950/40 border border-amber-400/50 shadow-lg space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black">
                          {deal.discountLabel}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          Hasta {new Date(deal.expiresAt).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-white">{deal.title}</h3>
                      {deal.subtitle && <p className="text-xs text-zinc-300">{deal.subtitle}</p>}
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-amber-200">{deal.tenant.name}</span>
                        <Link
                          href={`/reservas/${deal.tenant.slug}`}
                          className="text-fuchsia-300 hover:text-white font-bold flex items-center gap-1"
                        >
                          <span>Aprovechar</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* EVENTOS Y FIESTAS */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-fuchsia-400" />
                  <span>Eventos, Fiestas &amp; Entradas</span>
                </h2>
                <Link href="/eventos" className="text-xs font-bold text-fuchsia-400 hover:text-fuchsia-300">
                  Ver todos &rarr;
                </Link>
              </div>

              {loadingExplore ? (
                <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center text-xs text-zinc-400">
                  Cargando eventos en vivo...
                </div>
              ) : !exploreData || exploreData.events.length === 0 ? (
                <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center text-xs text-zinc-400">
                  Próximamente nuevos eventos y fiestas publicadas por los locales CYNKO.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {exploreData.events.map((ev) => (
                    <Link
                      key={ev.id}
                      href={`/eventos/${ev.code}`}
                      className="group rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-fuchsia-500/60 overflow-hidden transition-all flex flex-col shadow-lg"
                    >
                      <div className="h-28 bg-gradient-to-br from-purple-950 via-zinc-900 to-amber-950/60 relative p-3 flex flex-col justify-between">
                        {ev.bannerUrl && (
                          <img
                            src={ev.bannerUrl}
                            alt={ev.name}
                            className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-300"
                          />
                        )}
                        <div className="relative z-10 flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-full bg-black/70 border border-white/15 text-[10px] font-black text-amber-300">
                            {ev.eventType}
                          </span>
                          {ev.status === "ACTIVE" && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-black text-emerald-300 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              EN VIVO {ev.pulseCount > 0 ? `• 🔥 ${ev.pulseCount}` : ""}
                            </span>
                          )}
                        </div>
                        <div className="relative z-10 text-[11px] font-bold text-white/90 drop-shadow">
                          {ev.tenant.name}
                        </div>
                      </div>
                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <h3 className="text-sm font-black text-white group-hover:text-fuchsia-300 transition-colors line-clamp-1">
                            {ev.name}
                          </h3>
                          <div className="mt-1.5 space-y-1 text-[11px] text-zinc-400">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                              <span>
                                {new Date(ev.startsAt).toLocaleDateString("es-PY", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            </div>
                            {ev.locationName && (
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span className="truncate">{ev.locationName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs font-black text-amber-300">
                          <span>Ver Entradas / Detalles</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* CONCURSOS DE KARAOKE */}
            {exploreData && exploreData.contests.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Concursos &amp; Certámenes en Vivo</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {exploreData.contests.map((c) => (
                    <Link
                      key={c.id}
                      href="/guest"
                      className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 via-zinc-900 to-zinc-900 border border-amber-500/40 hover:border-amber-400 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase text-amber-400">
                          {c.tenant.name} • {c.registrationFee > 0 ? `Inscripción $${c.registrationFee.toLocaleString()}` : "Gratis"}
                        </span>
                        <h3 className="text-sm font-black text-white truncate">{c.name}</h3>
                        {c.description && (
                          <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{c.description}</p>
                        )}
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-black shrink-0">
                        Participar
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* LOCALES ADHERIDOS CYNKO CLUB */}
            {exploreData && exploreData.venues.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Store className="w-4 h-4 text-cyan-400" />
                  <span>Locales donde acumulas puntos CYNKO Club</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {exploreData.venues.map((v) => (
                    <div
                      key={v.id}
                      className="p-3.5 rounded-2xl bg-zinc-900/75 border border-zinc-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-white truncate">{v.name}</h3>
                          {v.hasLiveEvent && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" title="Evento en vivo" />
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {v.address || "Local adherido CYNKO Club"}
                        </p>
                      </div>
                      <Link
                        href={`/reservas/${v.slug}`}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-fuchsia-600 text-white text-[11px] font-bold transition-colors shrink-0"
                      >
                        Reservar
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* PESTAÑA 2: CABINA DJ PERSONAL (BANDEJA A & B PARA REGISTRADOS) */}
        {/* ============================================================ */}
        {activeTab === "dj" && (
          <div>
            {loadingClient ? (
              <div className="p-12 text-center text-xs text-zinc-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                Verificando tu acceso DJ...
              </div>
            ) : !client ? (
              renderClientAuthGate(
                "Desbloquea tu Cabina DJ (Bandeja A & B)",
                "Crea tu cuenta gratuita de CYNKO en segundos para escuchar y mezclar tus canciones favoritas en la Bandeja A y B (sin crear eventos) y ganar +100 puntos de bienvenida."
              )
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl bg-gradient-to-r from-zinc-900 via-purple-950/30 to-zinc-900 border border-amber-400/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Headphones className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      <strong className="text-white">Cabina DJ de {client.name}:</strong> busca temas en YouTube o carga MP3/MP4 en la{" "}
                      <strong className="text-purple-300">Bandeja A</strong> y <strong className="text-cyan-300">Bandeja B</strong>.
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-300 bg-black/50 px-2 py-0.5 rounded-lg border border-amber-400/30">
                    Modo Cliente • Solo escucha y mezcla personal
                  </span>
                </div>

                <VirtualDjConsole
                  currentPlaying={null}
                  queue={[]}
                  pendingRequests={[]}
                  onPlayQueueEntry={noopAsync}
                  onNextTrack={noopAsync}
                  showFeedback={showToast}
                  crossfaderValue={crossfaderValue}
                  setCrossfaderValue={setCrossfaderValue}
                  zone="DJ"
                  personalMode={true}
                />
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* PESTAÑA 3: CYNKO CLUB & PERFIL VIP (PUNTOS, CANJES, REFERIDOS) */}
        {/* ============================================================ */}
        {activeTab === "club" && (
          <div className="space-y-6">
            {loadingClient ? (
              <div className="p-12 text-center text-xs text-zinc-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                Cargando tu perfil CYNKO Club...
              </div>
            ) : !client ? (
              renderClientAuthGate(
                "Únete gratis a CYNKO Club",
                "Acumula puntos por consumo en tus locales favoritos, canjea tragos, entradas VIP y Fast-Pass, y desbloquea tu propia Cabina DJ."
              )
            ) : (
              <>
                {/* TARJETA PASAPORTE VIP CON QR CYNKO ID */}
                <div
                  className={`rounded-3xl bg-gradient-to-br ${
                    (TIER_STYLES[client.tier] || TIER_STYLES.BRONCE).card
                  } border p-5 sm:p-6 shadow-2xl`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                    <div className="md:col-span-8 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full border text-xs font-black inline-flex items-center gap-1.5 ${
                            (TIER_STYLES[client.tier] || TIER_STYLES.BRONCE).badge
                          }`}
                        >
                          <Crown className="w-3.5 h-3.5" />
                          <span>NIVEL {(TIER_STYLES[client.tier] || TIER_STYLES.BRONCE).label.toUpperCase()}</span>
                        </span>
                        <span className="text-xs font-mono text-zinc-400 bg-black/40 px-2.5 py-1 rounded-full border border-white/10">
                          ID: {client.cynkoCode}
                        </span>
                      </div>

                      <div>
                        <h2 className="text-2xl font-black text-white">{client.name}</h2>
                        <p className="text-xs text-zinc-400">{client.email}</p>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-amber-300">
                          {client.globalPoints.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          puntos disponibles
                        </span>
                      </div>

                      {/* Barra de Progreso al Siguiente Nivel */}
                      <div className="space-y-1.5 max-w-md">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-zinc-300">Progreso VIP</span>
                          <span className="text-amber-300">
                            {client.tierProgress.next
                              ? `Faltan ${client.tierProgress.remaining} pts para ${client.tierProgress.next}`
                              : "¡Nivel Máximo BLACK VIP alcanzado!"}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-black/50 overflow-hidden border border-white/10">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-fuchsia-500 transition-all"
                            style={{ width: `${client.tierProgress.progressPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsPairPcOpen(true)}
                          className="px-3.5 py-2 rounded-xl bg-cyan-600/25 hover:bg-cyan-600/40 border border-cyan-400/50 text-xs font-black text-cyan-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-cyan-300" />
                          <span>Conectar PC (QR)</span>
                        </button>
                        <button
                          type="button"
                          onClick={downloadStoryCard}
                          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-300" />
                          <span>Tarjeta para Stories</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="px-3.5 py-2 rounded-xl bg-zinc-950/70 hover:bg-red-950/60 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-red-300 flex items-center gap-1.5 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Cerrar sesión</span>
                        </button>
                      </div>
                    </div>

                    {/* QR Personal para mostrar en caja y sumar puntos */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center bg-black/40 rounded-2xl p-4 border border-white/10">
                      <div className="p-2.5 bg-white rounded-2xl shadow-lg">
                        <QRCodeImage value={client.cynkoCode} size={132} />
                      </div>
                      <span className="mt-2.5 text-xs font-mono font-black text-amber-300 tracking-widest">
                        {client.cynkoCode}
                      </span>
                      <span className="text-[10px] text-zinc-400 text-center mt-0.5">
                        Muestra este QR en caja o barra para sumar puntos
                      </span>
                    </div>
                  </div>
                </div>

                {/* INVITA Y GANA (REFERIDOS - FASE 3) */}
                <div className="rounded-2xl bg-gradient-to-r from-fuchsia-950/50 via-zinc-900 to-amber-950/40 border border-fuchsia-500/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-black text-white">
                      <Users className="w-4 h-4 text-fuchsia-400" />
                      <span>Invita amigos y suma +150 pts por cada uno</span>
                    </div>
                    <p className="text-xs text-zinc-300">
                      Comparte tu código <strong className="font-mono text-amber-300">{client.referralCode}</strong>. Tu amigo recibe{" "}
                      <strong>+200 pts</strong> al registrarse y tú recibes <strong>+150 pts</strong>. (Invitados: {client.referralCount})
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={copyReferralLink}
                      className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRef ? "Copiado" : "Copiar Link"}</span>
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `¡Únete gratis a CYNKO Club con mi código ${client.referralCode} y gana +200 puntos VIP + tu propia Cabina DJ! Regístrate aquí: ${
                          typeof window !== "undefined" ? window.location.origin : "https://cynko.app"
                        }/app?ref=${client.referralCode}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* PUNTOS POR LOCAL */}
                {client.venueMemberships.length > 0 && (
                  <section className="space-y-2.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                      Tus Puntos por Local
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {client.venueMemberships.map((m) => (
                        <div
                          key={m.id}
                          className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-sm font-black text-white">{m.tenant.name}</div>
                            <div className="text-[11px] text-zinc-400">{m.visits} visita(s)</div>
                          </div>
                          <span className="text-sm font-black text-amber-300">{m.points} pts</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* CATÁLOGO DE PREMIOS CANJEABLES */}
                <section className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-400" />
                    <span>Premios Canjeables CYNKO Club</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {rewards.map((r) => {
                      const canAfford = client.globalPoints >= r.pointsCost;
                      return (
                        <div
                          key={r.id}
                          className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              {r.tenant ? r.tenant.name : "CYNKO Global"}
                            </span>
                            <h4 className="text-sm font-black text-white pt-1">{r.title}</h4>
                            {r.description && (
                              <p className="text-[11px] text-zinc-400 leading-snug">{r.description}</p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-amber-300">{r.pointsCost} pts</span>
                            <button
                              type="button"
                              disabled={!canAfford || redeemingId === r.id}
                              onClick={() => handleRedeem(r.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                canAfford
                                  ? "bg-gradient-to-r from-amber-500 to-fuchsia-600 text-white hover:opacity-90"
                                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                              }`}
                            >
                              {redeemingId === r.id ? "..." : canAfford ? "Canjear" : "Faltan pts"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* MIS CUPONES CANJEADOS */}
                {client.redemptions.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">
                      Mis Cupones Canjeados
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {client.redemptions.map((rdm) => (
                        <div
                          key={rdm.id}
                          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                            rdm.status === "ACTIVE"
                              ? "bg-emerald-950/30 border-emerald-500/50"
                              : "bg-zinc-900/50 border-zinc-800 opacity-60"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-black text-white truncate">{rdm.reward.title}</div>
                            <div className="text-sm font-mono font-black text-emerald-300 mt-1">
                              {rdm.code}
                            </div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">
                              {rdm.status === "ACTIVE" ? "Válido • Mostrar en barra/caja" : "Ya utilizado"}
                            </div>
                          </div>
                          {rdm.status === "ACTIVE" && (
                            <div className="p-1.5 bg-white rounded-xl shrink-0">
                              <QRCodeImage value={rdm.code} size={58} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* HISTORIAL DE MOVIMIENTOS */}
                {client.pointTransactions.length > 0 && (
                  <section className="space-y-2.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                      Historial de Puntos
                    </h3>
                    <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 divide-y divide-zinc-800/80">
                      {client.pointTransactions.slice(0, 8).map((tx) => (
                        <div key={tx.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <div className="font-semibold text-zinc-200 truncate">{tx.description}</div>
                            <div className="text-[10px] text-zinc-500">
                              {new Date(tx.createdAt).toLocaleDateString("es-PY", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                          <span
                            className={`font-mono font-black shrink-0 ${
                              tx.points >= 0 ? "text-emerald-400" : "text-fuchsia-400"
                            }`}
                          >
                            {tx.points >= 0 ? `+${tx.points}` : tx.points} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* BARRA INFERIOR DE NAVEGACIÓN DE LA SUPER APP (4 PESTAÑAS) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#090912]/95 backdrop-blur-xl border-t border-white/10 px-2 py-2">
        <div className="max-w-lg mx-auto grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("explore")}
            className={`py-1.5 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-black transition-all cursor-pointer ${
              activeTab === "explore" ? "text-amber-300 bg-amber-400/10" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Compass className="w-5 h-5" />
            <span>Explorar</span>
          </button>

          <Link
            href="/guest"
            className="py-1.5 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-black text-zinc-400 hover:text-cyan-300 transition-all"
          >
            <QrCode className="w-5 h-5" />
            <span>Mi Mesa</span>
          </Link>

          <button
            type="button"
            onClick={() => setActiveTab("dj")}
            className={`py-1.5 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-black transition-all cursor-pointer ${
              activeTab === "dj" ? "text-fuchsia-300 bg-fuchsia-500/15" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Headphones className="w-5 h-5" />
            <span>Cabina DJ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("club")}
            className={`py-1.5 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-black transition-all cursor-pointer ${
              activeTab === "club" ? "text-amber-300 bg-amber-400/10" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Crown className="w-5 h-5" />
            <span>Club VIP</span>
          </button>
        </div>
      </nav>
      {/* Modal Escáner de Cámara en Vivo para Conectar PC con QR */}
      <DevicePairModal isOpen={isPairPcOpen} onClose={() => setIsPairPcOpen(false)} />
    </div>
  );
}
