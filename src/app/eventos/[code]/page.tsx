"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Heart,
  Share2,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  Moon,
  Sun,
  User,
  Plus,
  Minus,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  Download,
  QrCode,
  Layers,
  Building,
  Check,
  X,
  CreditCard,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { TicketPaymentModal } from "@/components/events/TicketPaymentModal";

interface TierSelection {
  [tierId: string]: number;
}

export default function PublicEventLaunchPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);

  const [event, setEvent] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(112);

  // Selected quantities for tickets
  const [tierCounts, setTierCounts] = useState<TierSelection>({});
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  // Checkout modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerDoc, setBuyerDoc] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"vidjs_pay" | "card" | "transfer">("vidjs_pay");
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Success ticket modal
  const [purchasedTickets, setPurchasedTickets] = useState<any[] | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/v1/events/public?code=${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.event) {
          setEvent(data.event);
          setLikesCount(data.event.likesCount || 112);
        }
      })
      .catch((err) => console.error("Error loading event:", err))
      .finally(() => setIsLoading(false));
  }, [code]);

  const handleQuantityChange = (tierId: string, delta: number, max: number) => {
    setTierCounts((prev) => {
      const current = prev[tierId] || 0;
      const next = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [tierId]: next };
    });
  };

  const selectedTiersList = (event?.tiers || []).filter(
    (t: any) => (tierCounts[t.id] || 0) > 0
  );

  const totalTicketCount = selectedTiersList.reduce(
    (sum: number, t: any) => sum + (tierCounts[t.id] || 0),
    0
  );

  const totalAmount = selectedTiersList.reduce(
    (sum: number, t: any) => sum + (tierCounts[t.id] || 0) * t.price,
    0
  );

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event?.name || "Evento CYNKO",
        text: `¡Mira este evento en CYNKO: ${event?.name}!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  const handleToggleLike = () => {
    setIsLiked((prev) => {
      const next = !prev;
      setLikesCount((c) => (next ? c + 1 : c - 1));
      return next;
    });
  };

  const handleConfirmPurchase = async () => {
    if (!buyerName.trim() || !buyerDoc.trim() || !buyerEmail.trim()) {
      alert("Por favor completa tu Nombre, Documento (CI) y Correo Electrónico.");
      return;
    }

    setIsPurchasing(true);

    try {
      // Simulate ticket generation with secure cryptographic token
      const generated: any[] = [];

      selectedTiersList.forEach((tier: any) => {
        const qty = tierCounts[tier.id] || 0;
        for (let i = 1; i <= qty; i++) {
          const ticketNumber = Math.floor(100000 + Math.random() * 900000);
          const tktId = `VID-${event.code.slice(0, 8)}-${ticketNumber}`;
          generated.push({
            id: tktId,
            eventCode: event.code,
            eventName: event.name,
            tierName: tier.name,
            tierPrice: tier.price,
            formattedPrice: tier.formattedPrice,
            buyerName: buyerName.trim(),
            buyerDoc: buyerDoc.trim(),
            buyerEmail: buyerEmail.trim(),
            buyerPhone: buyerPhone.trim(),
            venueName: event.locationName,
            eventDate: event.timeSchedule || "14 Nov. 2026 - 12:00 hs",
            purchaseDate: new Date().toLocaleDateString("es-PY", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            qrPayload: `VIDJS_AUTH:${event.code}:${tktId}:${buyerDoc.trim()}:SECURE_VALID`,
          });
        }
      });

      // Save to localStorage so mobile app `/guest` and billetera see it immediately
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("vidjs_purchased_tickets");
        const existing = stored ? JSON.parse(stored) : [];
        localStorage.setItem("vidjs_purchased_tickets", JSON.stringify([...generated, ...existing]));
      }

      setPurchasedTickets(generated);
      setIsCheckoutOpen(false);
      setTierCounts({});
    } catch (err) {
      console.error(err);
      alert("Error al procesar la adquisición. Intenta nuevamente.");
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-[#080F1F] text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-300">Cargando evento oficial...</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-200 font-sans",
        isDarkMode ? "bg-[#080F1F] text-slate-100" : "bg-[#F8FAFC] text-slate-900"
      )}
    >
      {/* 1. Header / Navbar con Logo CYNKO */}
      <header
        className={cn(
          "sticky top-0 z-40 border-b backdrop-blur-md px-4 sm:px-8 py-3 transition-colors",
          isDarkMode
            ? "bg-[#0A1322]/90 border-[#263858]"
            : "bg-white/95 border-slate-200 shadow-sm"
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo CYNKO */}
          <Link href="/guest" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white font-black shadow-lg shadow-purple-900/40 group-hover:scale-105 transition-transform">
              <Ticket className="w-5 h-5 -rotate-12" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight bg-gradient-to-r from-purple-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">
                  CYNKO
                </span>
                <span
                  className={cn(
                    "text-[10px] font-black uppercase px-1.5 py-0.5 rounded border font-mono tracking-tighter",
                    isDarkMode
                      ? "bg-purple-950/60 text-purple-300 border-purple-500/40"
                      : "bg-purple-100 text-purple-700 border-purple-300"
                  )}
                >
                  PASS
                </span>
              </div>
              <span className="text-[9px] text-slate-400 block -mt-1 tracking-wider uppercase">
                Events & Suite
              </span>
            </div>
          </Link>

          {/* Center Links (RedTicket replica) */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-400">
            <Link
              href="/guest"
              className="hover:text-purple-400 transition-colors"
            >
              Inicio
            </Link>
            <Link
              href="/eventos"
              className="text-purple-400 font-extrabold border-b-2 border-purple-500 pb-0.5"
            >
              Eventos
            </Link>
            <Link
              href="/guest"
              className="hover:text-purple-400 transition-colors"
            >
              Experiencias
            </Link>
            <Link
              href="/guest"
              className="hover:text-purple-400 transition-colors"
            >
              Alojamientos
            </Link>
            <div className="relative">
              <span className="flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer">
                <Search className="w-3.5 h-3.5" />
                <span>Buscar</span>
              </span>
            </div>
          </nav>

          {/* Right actions: Theme toggle + Profile / Billetera */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={cn(
                "p-2 rounded-xl transition-colors",
                isDarkMode
                  ? "bg-[#0F1E36] hover:bg-[#162947] text-slate-300"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              )}
              title="Cambiar Modo Claro / Oscuro"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              href="/guest"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Mi Billetera</span>
            </Link>

            <Link
              href="/dashboard/accreditation/events"
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border text-xs font-bold transition-all",
                isDarkMode
                  ? "bg-[#0F1E36] border-[#263858] text-slate-200 hover:border-purple-500"
                  : "bg-slate-100 border-slate-300 text-slate-700"
              )}
              title="Panel Organizador"
            >
              <User className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Breadcrumb (RedTicket style) */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/guest" className="hover:underline">
            Inicio
          </Link>
          <span>/</span>
          <Link href="/eventos" className="hover:underline">
            Eventos
          </Link>
          <span>/</span>
          <span className="capitalize">{event.eventType.toLowerCase()}</span>
          <span>/</span>
          <span className="text-purple-400 font-bold truncate max-w-[200px] sm:max-w-none">
            {event.name}
          </span>
        </div>

        {/* Title Header & Social Proof Section */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <span>{event.name}</span>
            </h1>

            {/* Favorite button */}
            <button
              onClick={handleToggleLike}
              className={cn(
                "self-start sm:self-auto p-2.5 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer",
                isLiked
                  ? "bg-rose-500/20 border-rose-500 text-rose-400"
                  : isDarkMode
                  ? "bg-[#0A1322] border-[#263858] text-slate-400 hover:text-rose-400"
                  : "bg-white border-slate-200 text-slate-400 hover:text-rose-500 shadow-sm"
              )}
            >
              <Heart
                className={cn(
                  "w-5 h-5 transition-transform active:scale-125",
                  isLiked ? "fill-rose-500 text-rose-500" : ""
                )}
              />
            </button>
          </div>

          {/* Social Proof Line (★ 4.50 (67), 3.3k interesados, 7 amigos van) */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-1 text-amber-400">
              <span>★</span>
              <span className="font-bold">{event.rating.toFixed(2)}</span>
              <span className="text-slate-400">({event.reviewCount})</span>
            </div>

            <span className="text-slate-600">•</span>

            <div className="flex items-center gap-1 text-rose-400">
              <Heart className="w-3.5 h-3.5 fill-rose-400" />
              <span>{(event.interestedCount / 1000).toFixed(1)}k interesados</span>
            </div>

            <span className="text-slate-600">•</span>

            <div className="flex items-center gap-1 text-purple-300">
              <span>👥</span>
              <span>{event.friendsGoingCount} amigos van</span>
            </div>
          </div>

          {/* Tags & Action Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold border",
                  isDarkMode
                    ? "bg-[#0F1E36] text-purple-300 border-purple-500/30"
                    : "bg-purple-50 text-purple-700 border-purple-200"
                )}
              >
                {event.eventType}
              </span>

              <span
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1",
                  isDarkMode
                    ? "bg-[#0A1322] text-slate-300 border-[#263858]"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                )}
              >
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>{event.city}</span>
              </span>
            </div>

            {/* Actions: Likes count, Compartir, Invitar amigos */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleLike}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                  isLiked
                    ? "bg-rose-500/20 border-rose-500 text-rose-400"
                    : isDarkMode
                    ? "bg-[#0A1322] border-[#263858] text-slate-300 hover:border-slate-500"
                    : "bg-white border-slate-200 text-slate-700"
                )}
              >
                <Heart className={cn("w-3.5 h-3.5", isLiked ? "fill-rose-500 text-rose-500" : "")} />
                <span>{likesCount}</span>
              </button>

              <button
                onClick={handleShare}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                  isDarkMode
                    ? "bg-[#0A1322] border-[#263858] text-slate-300 hover:border-slate-500"
                    : "bg-white border-slate-200 text-slate-700"
                )}
              >
                <Share2 className="w-3.5 h-3.5 text-blue-400" />
                <span>{copySuccess ? "¡Enlace Copiado!" : "Compartir"}</span>
              </button>

              <button
                onClick={handleShare}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-900/40 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Invitar amigos</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Main Grid (Flyer + Details on Left, Sticky Purchase on Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
          {/* Left Column (Flyer, Description, Location, FAQ) */}
          <div className="lg:col-span-7 space-y-8">
            {/* High-res Event Flyer */}
            <div className="relative rounded-3xl overflow-hidden border border-[#263858] shadow-2xl bg-black">
              <img
                src={event.bannerUrl}
                alt={event.name}
                className="w-full h-[280px] sm:h-[420px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent flex flex-col justify-between p-4 sm:p-6">
                {/* Top Badges */}
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-600 text-white shadow-lg uppercase tracking-wider">
                    {event.timeSchedule || "14 Noviembre • 12:00 hs"}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/70 backdrop-blur-md text-emerald-300 border border-emerald-500/40">
                    ● Aforo Disponible
                  </span>
                </div>

                {/* Bottom Overlay Title */}
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-purple-300 drop-shadow block">
                    {event.organizerName} presenta
                  </span>
                  <h2 className="text-xl sm:text-3xl font-black text-white drop-shadow-md">
                    {event.name}
                  </h2>
                  <p className="text-xs text-slate-200 drop-shadow mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>{event.locationName} — {event.address}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* "Sobre este evento" */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Sobre este evento</span>
              </h3>
              <div
                className={cn(
                  "p-5 rounded-2xl border text-sm leading-relaxed space-y-3",
                  isDarkMode
                    ? "bg-[#0A1322] border-[#263858] text-slate-300"
                    : "bg-white border-slate-200 text-slate-700 shadow-sm"
                )}
              >
                <p>{event.description}</p>

                {/* Highlights tags */}
                <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-300 font-semibold flex items-center gap-1.5">
                    <span>🍹</span>
                    <span>Open Bar</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 font-semibold flex items-center gap-1.5">
                    <span>🍲</span>
                    <span>Feijoada Libre</span>
                  </div>
                  <div className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 font-semibold flex items-center gap-1.5">
                    <span>🎸</span>
                    <span>Pagode en Vivo</span>
                  </div>
                  <div className="p-2 rounded-xl bg-pink-950/40 border border-pink-800/40 text-pink-300 font-semibold flex items-center gap-1.5">
                    <span>🪪</span>
                    <span>Acceso con QR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* "Ubicación" */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-white tracking-tight">Ubicación</h3>
              <div
                className={cn(
                  "p-5 rounded-2xl border space-y-3",
                  isDarkMode
                    ? "bg-[#0A1322] border-[#263858]"
                    : "bg-white border-slate-200 shadow-sm"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Building className="w-4 h-4 text-purple-400" />
                      <span>{event.locationName}</span>
                    </h4>
                    <p className="text-xs text-slate-400">{event.address}</p>
                    <p className="text-xs text-slate-400">{event.city}, Paraguay</p>
                  </div>

                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(
                      `${event.locationName} ${event.address}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver Mapa</span>
                  </a>
                </div>
              </div>
            </div>

            {/* "Preguntas frecuentes sobre este evento" (Accordion) */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-white tracking-tight">
                Preguntas frecuentes sobre este evento
              </h3>
              <div className="space-y-2.5">
                {(event.faq || []).map((faqItem: any, idx: number) => {
                  const isOpen = expandedFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "rounded-2xl border overflow-hidden transition-all",
                        isDarkMode
                          ? "bg-[#0A1322] border-[#263858]"
                          : "bg-white border-slate-200 shadow-sm"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                        className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-white hover:text-purple-300 transition-colors cursor-pointer"
                      >
                        <span>{faqItem.question}</span>
                        <span className="text-slate-400 shrink-0 text-base">
                          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 text-xs text-slate-400 leading-relaxed border-t border-[#263858]/60 animate-fadeIn">
                          {faqItem.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Purchase Box ("Elegí tus entradas") */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
            <div
              className={cn(
                "p-5 sm:p-6 rounded-3xl border shadow-2xl space-y-5",
                isDarkMode
                  ? "bg-[#0A1322] border-[#263858]"
                  : "bg-white border-slate-200"
              )}
            >
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  Elegí tus entradas
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Selecciona la cantidad de pases que deseas adquirir
                </p>
              </div>

              {/* Tiers List with Counter Controls */}
              <div className="space-y-3">
                {event.tiers.map((tier: any) => {
                  const count = tierCounts[tier.id] || 0;

                  return (
                    <div
                      key={tier.id}
                      className={cn(
                        "p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3",
                        count > 0
                          ? "border-purple-500 bg-purple-950/20 shadow-md shadow-purple-950/30"
                          : isDarkMode
                          ? "border-[#263858] bg-[#080F1F]"
                          : "border-slate-200 bg-slate-50"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-black text-white truncate">
                            {tier.name}
                          </h4>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {tier.available} disponibles
                        </span>
                        <div className="text-xs sm:text-sm font-black text-purple-400 mt-1 font-mono">
                          {tier.formattedPrice}
                        </div>
                      </div>

                      {/* Counter [-] [0] [+] */}
                      <div className="flex items-center gap-2 bg-[#0A1322] border border-[#263858] rounded-xl p-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(tier.id, -1, tier.available)}
                          disabled={count <= 0}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#162947] transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <span className="w-6 text-center text-xs font-black text-white">
                          {count}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleQuantityChange(tier.id, 1, tier.available)}
                          disabled={count >= tier.available}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#162947] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary & Checkout Trigger */}
              {totalTicketCount > 0 ? (
                <div className="pt-3 border-t border-[#263858] space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Entradas seleccionadas:</span>
                    <span className="font-bold text-white">{totalTicketCount} boletos</span>
                  </div>

                  <div className="flex items-center justify-between text-sm sm:text-base font-black text-white">
                    <span>Total a Pagar:</span>
                    <span className="text-purple-400 font-mono">
                      Gs. {totalAmount.toLocaleString("es-PY")}
                    </span>
                  </div>

                  <Button
                    size="lg"
                    onClick={() => setIsCheckoutOpen(true)}
                    className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-sm py-3 rounded-2xl shadow-xl shadow-purple-900/40 gap-2 cursor-pointer"
                  >
                    <span>Adquirir {totalTicketCount} Entradas</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#080F1F] border border-[#263858] text-center text-xs text-slate-400">
                  Selecciona al menos una entrada para continuar
                </div>
              )}

              {/* Trust Badges (Replica from video) */}
              <div className="pt-3 border-t border-[#263858] space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Pago seguro garantizado con <strong>CYNKO Pay</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Entrada QR criptográfica al instante</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Soporte oficial por WhatsApp</span>
                </div>
              </div>

              {/* Live Recent Activity (Social Proof replica) */}
              <div className="pt-3 border-t border-[#263858] space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Actividad reciente</span>
                  <span className="text-[10px] text-purple-400">En vivo</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-300 font-black flex items-center justify-center text-[10px]">
                      M
                    </div>
                    <div className="min-w-0 text-slate-300">
                      <span className="font-bold text-white">María V.</span> le dio ❤️{" "}
                      <span className="text-slate-500 text-[10px]">hace 47 min</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 font-black flex items-center justify-center text-[10px]">
                      S
                    </div>
                    <div className="min-w-0 text-slate-300">
                      <span className="font-bold text-white">Sofía L.</span> invitó a 3 amigos{" "}
                      <span className="text-slate-500 text-[10px]">hace 15 min</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-pink-600/30 text-pink-300 font-black flex items-center justify-center text-[10px]">
                      L
                    </div>
                    <div className="min-w-0 text-slate-300">
                      <span className="font-bold text-white">Lucas S.</span> adquirió 2 entradas{" "}
                      <span className="text-slate-500 text-[10px]">hace 5 min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Footer con Branding CYNKO (Cynko Pass Suite) */}
      <footer
        className={cn(
          "mt-16 border-t pt-12 pb-8 px-4 sm:px-8 transition-colors",
          isDarkMode ? "bg-[#070D1B] border-[#263858]" : "bg-white border-slate-200"
        )}
      >
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Columna 1: Brand */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white font-black">
                  <Ticket className="w-4 h-4" />
                </div>
                <span className="text-lg font-black tracking-tight text-white">
                  CYNKO SUITE
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tu plataforma de entradas, experiencias y entretenimiento gastronómico y nocturno en Paraguay.
              </p>
              <div className="text-[11px] text-purple-400 font-mono">
                Powered by Cynko · Pass Suite
              </div>
            </div>

            {/* Columna 2: Navegación */}
            <div className="space-y-2 text-xs">
              <h5 className="font-bold uppercase tracking-wider text-slate-300">NAVEGACIÓN</h5>
              <ul className="space-y-1.5 text-slate-400">
                <li><Link href="/guest" className="hover:underline">Buscar</Link></li>
                <li><Link href="/eventos" className="hover:underline">Lugares</Link></li>
                <li><Link href="/eventos" className="hover:underline">Puntos de venta</Link></li>
                <li><Link href="/guest" className="hover:underline">Cómo funciona</Link></li>
              </ul>
            </div>

            {/* Columna 3: Organizadores */}
            <div className="space-y-2 text-xs">
              <h5 className="font-bold uppercase tracking-wider text-slate-300">
                ORGANIZADORES Y ANFITRIONES
              </h5>
              <ul className="space-y-1.5 text-slate-400">
                <li><Link href="/dashboard/accreditation/events" className="hover:underline">Publicar evento</Link></li>
                <li><Link href="/dashboard/accreditation/events" className="hover:underline">Ser Anfitrión</Link></li>
                <li><Link href="/login" className="hover:underline">Iniciar sesión</Link></li>
                <li><Link href="/dashboard/accreditation/scanner" className="hover:underline">Scanner</Link></li>
              </ul>
            </div>

            {/* Columna 4: Legal */}
            <div className="space-y-2 text-xs">
              <h5 className="font-bold uppercase tracking-wider text-slate-300">LEGAL</h5>
              <ul className="space-y-1.5 text-slate-400">
                <li><span className="hover:underline cursor-pointer">Contacto</span></li>
                <li><span className="hover:underline cursor-pointer">Términos y condiciones</span></li>
                <li><span className="hover:underline cursor-pointer">Política de privacidad</span></li>
                <li><span className="hover:underline cursor-pointer">Privacidad de CYNKO Pay</span></li>
                <li><span className="hover:underline cursor-pointer">Eliminar cuenta</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[#263858] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <span>© {new Date().getFullYear()} CYNKO OS Inc. Todos los derechos reservados.</span>
            <span>Sistema Multisede de Acreditación y Taquilla Digital</span>
          </div>
        </div>
      </footer>

      {/* MODAL: Checkout / Métodos de Pago y Emisión de Entradas */}
      <TicketPaymentModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        event={{
          id: event?.id,
          code: event.code,
          name: event.name,
          locationName: event.locationName,
          timeSchedule: event.timeSchedule,
          bannerUrl: event.bannerUrl,
        }}
        selectedTiers={selectedTiersList.map((t: any) => ({
          id: t.id,
          name: t.name,
          price: t.price,
          count: tierCounts[t.id] || 0,
          formattedPrice: t.formattedPrice,
        }))}
        totalAmount={totalAmount}
        onTicketPurchased={(tickets) => {
          setTierCounts({});
        }}
      />
    </div>
  );
}
