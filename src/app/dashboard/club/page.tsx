"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Crown,
  Gift,
  Zap,
  QrCode,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  Sparkles,
  Ticket,
  Star,
  ExternalLink,
} from "lucide-react";

interface ClubDashboardData {
  rewards: Array<{
    id: string;
    title: string;
    description?: string | null;
    pointsCost: number;
    category: string;
    active: boolean;
  }>;
  flashDeals: Array<{
    id: string;
    title: string;
    subtitle?: string | null;
    discountLabel: string;
    minTier: string;
    expiresAt: string;
  }>;
  topClients: Array<{
    id: string;
    points: number;
    visits: number;
    client: {
      id: string;
      name: string;
      email: string;
      cynkoCode: string;
      tier: string;
      globalPoints: number;
    };
  }>;
  recentRedemptions: Array<{
    id: string;
    code: string;
    status: string;
    createdAt: string;
    client: { name: string; cynkoCode: string };
    reward: { title: string; category: string };
  }>;
}

export default function DashboardClubPage() {
  const [data, setData] = useState<ClubDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form 1: Acreditar Puntos por Consumo
  const [cynkoCode, setCynkoCode] = useState("");
  const [awardPoints, setAwardPoints] = useState("100");
  const [awardDesc, setAwardDesc] = useState("");
  const [awarding, setAwarding] = useState(false);

  // Form 2: Validar Cupón Canjeado
  const [couponCode, setCouponCode] = useState("");
  const [validating, setValidating] = useState(false);

  // Form 3: Crear Premio del Local
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardDesc, setRewardDesc] = useState("");
  const [rewardCost, setRewardCost] = useState("250");
  const [rewardCategory, setRewardCategory] = useState<"DRINK" | "TICKET" | "VIP" | "FASTPASS" | "DISCOUNT">("DRINK");
  const [creatingReward, setCreatingReward] = useState(false);

  // Form 4: Lanzar Flash Deal (Fase 3)
  const [dealTitle, setDealTitle] = useState("");
  const [dealSubtitle, setDealSubtitle] = useState("");
  const [dealDiscount, setDealDiscount] = useState("2x1 CHOPP");
  const [dealHours, setDealHours] = useState("3");
  const [creatingDeal, setCreatingDeal] = useState(false);

  // Reseñas del Local & Google Maps
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [savingGoogleUrl, setSavingGoogleUrl] = useState(false);
  const [reviewsData, setReviewsData] = useState<{
    avgRating: number;
    reviewsCount: number;
    reviews: Array<{ id: string; authorName: string; rating: number; comment?: string | null; createdAt: string }>;
  }>({ avgRating: 0, reviewsCount: 0, reviews: [] });

  const showMsg = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [clubRes, revRes] = await Promise.all([
        fetch("/api/v1/dashboard/club", { cache: "no-store" }),
        fetch("/api/v1/reviews", { cache: "no-store" }),
      ]);
      const json = await clubRes.json();
      if (json.success) setData(json.data);

      const revJson = await revRes.json();
      if (revJson.success && revJson.data) {
        setGoogleReviewUrl(revJson.data.googleReviewUrl || "");
        setReviewsData({
          avgRating: revJson.data.avgRating || 0,
          reviewsCount: revJson.data.reviewsCount || 0,
          reviews: revJson.data.reviews || [],
        });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSaveGoogleUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGoogleUrl(true);
    try {
      const res = await fetch("/api/v1/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_google_url",
          googleReviewUrl: googleReviewUrl.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error guardando enlace");
      showMsg("success", json.message || "Enlace de Google Reviews guardado.");
    } catch (err: unknown) {
      showMsg("error", err instanceof Error ? err.message : "Error");
    } finally {
      setSavingGoogleUrl(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAwardPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cynkoCode.trim()) return;
    setAwarding(true);
    try {
      const res = await fetch("/api/v1/dashboard/club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "award_points",
          cynkoCode: cynkoCode.trim(),
          points: Number(awardPoints),
          description: awardDesc.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error acreditando puntos");
      showMsg("success", json.message);
      setCynkoCode("");
      setAwardDesc("");
      await loadData();
    } catch (err: unknown) {
      showMsg("error", err instanceof Error ? err.message : "Error");
    } finally {
      setAwarding(false);
    }
  };

  const handleValidateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setValidating(true);
    try {
      const res = await fetch("/api/v1/dashboard/club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate_redemption", code: couponCode.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Cupón inválido");
      showMsg("success", json.message);
      setCouponCode("");
      await loadData();
    } catch (err: unknown) {
      showMsg("error", err instanceof Error ? err.message : "Error");
    } finally {
      setValidating(false);
    }
  };

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardTitle.trim()) return;
    setCreatingReward(true);
    try {
      const res = await fetch("/api/v1/dashboard/club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_reward",
          title: rewardTitle.trim(),
          description: rewardDesc.trim() || undefined,
          pointsCost: Number(rewardCost),
          category: rewardCategory,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error creando premio");
      showMsg("success", "Premio agregado al catálogo de CYNKO Club.");
      setRewardTitle("");
      setRewardDesc("");
      await loadData();
    } catch (err: unknown) {
      showMsg("error", err instanceof Error ? err.message : "Error");
    } finally {
      setCreatingReward(false);
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    await fetch("/api/v1/dashboard/club", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_reward", rewardId }),
    });
    await loadData();
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealTitle.trim()) return;
    setCreatingDeal(true);
    try {
      const res = await fetch("/api/v1/dashboard/club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_flash_deal",
          title: dealTitle.trim(),
          subtitle: dealSubtitle.trim() || undefined,
          discountLabel: dealDiscount.trim(),
          durationHours: Number(dealHours),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error lanzando Flash Deal");
      showMsg("success", "⚡ Flash Deal publicado en vivo en la Super App CYNKO.");
      setDealTitle("");
      setDealSubtitle("");
      await loadData();
    } catch (err: unknown) {
      showMsg("error", err instanceof Error ? err.message : "Error");
    } finally {
      setCreatingDeal(false);
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    await fetch("/api/v1/dashboard/club", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_flash_deal", dealId }),
    });
    await loadData();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--text-heading)] flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-400" />
            <span>CYNKO Club &amp; Flash Deals</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Acredita puntos por consumo, valida cupones de premios y lanza promociones Flash en vivo para todos los clientes de la App CYNKO.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 text-xs font-bold text-zinc-300 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-200"
              : "bg-red-950/60 border-red-500/50 text-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* FILA 1: ACREDITAR PUNTOS + VALIDAR CUPÓN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Acreditar Puntos por Consumo */}
        <form
          onSubmit={handleAwardPoints}
          className="p-5 rounded-3xl bg-zinc-900/90 border border-amber-500/30 space-y-4 shadow-xl"
        >
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>Acreditar Puntos por Consumo (Caja / Barra)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">CYNKO ID o Correo del Cliente *</label>
              <input
                type="text"
                required
                value={cynkoCode}
                onChange={(e) => setCynkoCode(e.target.value)}
                placeholder="Ej: CYK-8492A"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-mono text-amber-300 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">Puntos a Sumar *</label>
              <input
                type="number"
                required
                min={1}
                value={awardPoints}
                onChange={(e) => setAwardPoints(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-1">Concepto (Opcional)</label>
            <input
              type="text"
              value={awardDesc}
              onChange={(e) => setAwardDesc(e.target.value)}
              placeholder="Ej: Consumo Mesa 4 - Combo VIP"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>
          <button
            type="submit"
            disabled={awarding}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs cursor-pointer disabled:opacity-50"
          >
            {awarding ? "Acreditando..." : "➕ Sumar Puntos al Cliente"}
          </button>
        </form>

        {/* Validar Cupón Canjeado */}
        <form
          onSubmit={handleValidateCoupon}
          className="p-5 rounded-3xl bg-zinc-900/90 border border-emerald-500/30 space-y-4 shadow-xl"
        >
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Ticket className="w-4 h-4 text-emerald-400" />
            <span>Validar Cupón de Premio Canjeado</span>
          </div>
          <p className="text-xs text-zinc-400">
            Cuando un cliente canjea un premio en la App CYNKO, te mostrará un código <span className="font-mono text-emerald-300">RDM-XXXXXX</span>. Ingrésalo aquí para marcarlo como entregado.
          </p>
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-1">Código de Cupón *</label>
            <input
              type="text"
              required
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Ej: RDM-92A4K1"
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-mono text-emerald-300 focus:outline-none focus:border-emerald-400"
            />
          </div>
          <button
            type="submit"
            disabled={validating}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer disabled:opacity-50"
          >
            {validating ? "Validando..." : "✅ Validar y Entregar Premio"}
          </button>
        </form>
      </div>

      {/* FILA 2: PREMIOS DEL LOCAL + FLASH DEALS EN VIVO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Crear Premio Propio */}
        <div className="p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Gift className="w-4 h-4 text-fuchsia-400" />
            <span>Premios Propios de tu Local</span>
          </div>

          <form onSubmit={handleCreateReward} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                required
                value={rewardTitle}
                onChange={(e) => setRewardTitle(e.target.value)}
                placeholder="Ej: 1 Trago de Cortesía"
                className="sm:col-span-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
              />
              <input
                type="number"
                required
                min={10}
                value={rewardCost}
                onChange={(e) => setRewardCost(e.target.value)}
                placeholder="Puntos"
                className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-amber-300 font-mono"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={rewardDesc}
                onChange={(e) => setRewardDesc(e.target.value)}
                placeholder="Descripción breve (opcional)"
                className="sm:col-span-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
              />
              <select
                value={rewardCategory}
                onChange={(e) => setRewardCategory(e.target.value as typeof rewardCategory)}
                className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
              >
                <option value="DRINK">Trago / Barra</option>
                <option value="TICKET">Entrada</option>
                <option value="VIP">Mesa / VIP</option>
                <option value="FASTPASS">Fast-Pass</option>
                <option value="DISCOUNT">Descuento</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={creatingReward}
              className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{creatingReward ? "Guardando..." : "Publicar Premio"}</span>
            </button>
          </form>

          <div className="space-y-2 pt-2 border-t border-zinc-800">
            {data?.rewards?.length ? (
              data.rewards.map((r) => (
                <div
                  key={r.id}
                  className="px-3 py-2 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{r.title}</div>
                    <div className="text-[11px] text-amber-300 font-mono">{r.pointsCost} pts</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteReward(r.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/40 cursor-pointer"
                    title="Eliminar premio"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500">Aún no creaste premios propios para tu establecimiento.</p>
            )}
          </div>
        </div>

        {/* Lanzar Flash Deal (Fase 3) */}
        <div className="p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Flash Deals en Vivo (Rescate de Noches Flojas)</span>
          </div>

          <form onSubmit={handleCreateDeal} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                required
                value={dealTitle}
                onChange={(e) => setDealTitle(e.target.value)}
                placeholder="Ej: Happy Hour de Jueves"
                className="sm:col-span-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
              />
              <input
                type="text"
                required
                value={dealDiscount}
                onChange={(e) => setDealDiscount(e.target.value)}
                placeholder="2x1 CHOPP"
                className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-black text-amber-300"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={dealSubtitle}
                onChange={(e) => setDealSubtitle(e.target.value)}
                placeholder="Detalle (ej: Mostrando tu CYNKO ID)"
                className="sm:col-span-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
              />
              <select
                value={dealHours}
                onChange={(e) => setDealHours(e.target.value)}
                className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
              >
                <option value="1">1 hora</option>
                <option value="2">2 horas</option>
                <option value="3">3 horas</option>
                <option value="6">6 horas</option>
                <option value="12">12 horas</option>
                <option value="24">24 horas</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={creatingDeal}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{creatingDeal ? "Publicando..." : "⚡ Lanzar Flash Deal Ahora"}</span>
            </button>
          </form>

          <div className="space-y-2 pt-2 border-t border-zinc-800">
            {data?.flashDeals?.length ? (
              data.flashDeals.map((d) => (
                <div
                  key={d.id}
                  className="px-3 py-2 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-black text-white flex items-center gap-2">
                      <span>{d.title}</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-400 text-black text-[10px]">
                        {d.discountLabel}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Expira: {new Date(d.expiresAt).toLocaleString("es-PY")}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDeal(d.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 cursor-pointer"
                    title="Finalizar Flash Deal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500">No hay Flash Deals activos en este momento.</p>
            )}
          </div>
        </div>
      </div>

      {/* RESEÑAS DEL LOCAL & GOOGLE MAPS */}
      <div className="p-5 rounded-3xl bg-zinc-900/90 border border-amber-500/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>Reseñas del Local &amp; Google Maps</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-xs font-black text-amber-300">
            ⭐ {reviewsData.reviewsCount > 0 ? `${reviewsData.avgRating} / 5 (${reviewsData.reviewsCount} reseñas)` : "Sin reseñas aún"}
          </span>
        </div>

        <form onSubmit={handleSaveGoogleUrl} className="space-y-2">
          <label className="block text-[11px] font-bold text-zinc-300">
            Enlace directo de Reseñas de Google Business Profile
          </label>
          <p className="text-[11px] text-zinc-400">
            En Google Business Profile toca <strong>&quot;Solicitar reseñas&quot;</strong>, copia tu enlace (<span className="font-mono text-zinc-300">https://g.page/r/.../review</span>) y pégalo aquí. Cuando tus clientes califiquen en CYNKO, les aparecerá el botón directo a tu Google Maps.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={googleReviewUrl}
              onChange={(e) => setGoogleReviewUrl(e.target.value)}
              placeholder="https://g.page/r/tu-codigo/review"
              className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={savingGoogleUrl}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black cursor-pointer shrink-0 disabled:opacity-50"
            >
              {savingGoogleUrl ? "Guardando..." : "Guardar Enlace"}
            </button>
            {googleReviewUrl && (
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold inline-flex items-center justify-center gap-1 shrink-0"
              >
                <span>Probar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </form>

        {reviewsData.reviews.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-zinc-800">
            {reviewsData.reviews.slice(0, 6).map((rev) => (
              <div
                key={rev.id}
                className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white truncate">{rev.authorName}</span>
                  <span className="text-amber-400 font-black shrink-0">{"★".repeat(rev.rating)}</span>
                </div>
                {rev.comment && <p className="text-[11px] text-zinc-300 leading-snug">{rev.comment}</p>}
                <div className="text-[10px] text-zinc-500">
                  {new Date(rev.createdAt).toLocaleDateString("es-PY", { day: "numeric", month: "short" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CLIENTES FRECUENTES DEL LOCAL */}
      <div className="p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800 space-y-3">
        <div className="flex items-center gap-2 text-sm font-black text-white">
          <Users className="w-4 h-4 text-cyan-400" />
          <span>Clientes Frecuentes CYNKO Club en tu Local</span>
        </div>
        {data?.topClients?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {data.topClients.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">{m.client.name}</div>
                  <div className="text-[10px] font-mono text-zinc-400">
                    {m.client.cynkoCode} • {m.visits} visitas • {m.client.tier}
                  </div>
                </div>
                <span className="font-mono font-black text-amber-300 shrink-0">{m.points} pts</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            Cuando acredites puntos a clientes con su CYNKO ID, aparecerán aquí ordenados por fidelidad.
          </p>
        )}
      </div>
    </div>
  );
}
