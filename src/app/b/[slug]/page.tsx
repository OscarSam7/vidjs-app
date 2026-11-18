"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  BellRing,
  Search,
  ArrowRight,
  Clock,
  Sparkles,
  UtensilsCrossed,
  AlertCircle,
  Delete,
  Store,
} from "lucide-react";
import PwaInstallButton from "@/components/pwa/PwaInstallButton";

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    darkTheme?: boolean;
  } | null;
  venueAddress?: string | null;
  venuePhone?: string | null;
}

interface BeeperConfig {
  enabled: boolean;
  soundType: "CHIME" | "BELL" | "DIGITAL" | "VIBRANT";
  defaultPrepMinutes: number;
  googleReviewUrl?: string | null;
  promoBannersJson?: string | null;
}

export default function PublicBeeperCounterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [config, setConfig] = useState<BeeperConfig | null>(null);
  const [promoBanners, setPromoBanners] = useState<any[]>([]);
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);

  const [inputCode, setInputCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [storedToken, setStoredToken] = useState<string | null>(null);

  // Cargar datos del local y chequear token previo en localStorage
  useEffect(() => {
    async function loadVenueData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/beeper/public/${slug}`);
        const data = await res.json();

        if (!data.success) {
          setError(data.error || "No pudimos cargar la información del local.");
          return;
        }

        setTenant(data.data.tenant);
        setConfig(data.data.config);

        if (data.data.config?.promoBannersJson) {
          try {
            const parsed = JSON.parse(data.data.config.promoBannersJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPromoBanners(parsed);
            }
          } catch {}
        }
      } catch (err: any) {
        setError("Error de red al consultar el local. Intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    }

    loadVenueData();

    // Comprobar si hay un llamador activo guardado
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("vidjs_beeper_active_token");
      if (savedToken) {
        setStoredToken(savedToken);
      }
    }
  }, [slug]);

  // Rotar banners promocionales cada 4.5 segundos
  useEffect(() => {
    if (promoBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIdx((prev) => (prev + 1) % promoBanners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [promoBanners.length]);

  const handleKeyPress = (digit: string) => {
    if (inputCode.length < 4) {
      setInputCode((prev) => prev + digit);
      setSearchError(null);
    }
  };

  const handleDelete = () => {
    setInputCode((prev) => prev.slice(0, -1));
    setSearchError(null);
  };

  const handleClear = () => {
    setInputCode("");
    setSearchError(null);
  };

  const handleSearchCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputCode.trim()) {
      setSearchError("Ingresa el número de tu ticket.");
      return;
    }

    try {
      setSearching(true);
      setSearchError(null);

      const codeClean = inputCode.replace(/[^0-9]/g, "");
      const res = await fetch(`/api/v1/beeper/public/${slug}?code=${codeClean}`);
      const data = await res.json();

      if (!data.success || !data.data?.foundTicket) {
        setSearchError(`No encontramos un pedido activo con el número #${codeClean}. Consulta en mostrador.`);
        return;
      }

      const ticket = data.data.foundTicket;
      // Guardar token en localStorage para reconexión instantánea
      if (typeof window !== "undefined") {
        localStorage.setItem("vidjs_beeper_active_token", ticket.qrToken);
      }

      router.push(`/b/t/${ticket.qrToken}`);
    } catch (err) {
      setSearchError("Error al consultar el número. Intenta de nuevo.");
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070D18] text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-medium tracking-wide">Conectando con el mostrador...</p>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-[#070D18] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Local No Encontrado</h1>
        <p className="text-sm text-slate-400 max-w-sm mb-6">{error || "El enlace escaneado no pertenece a un local activo."}</p>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold uppercase tracking-wider"
        >
          Volver al Inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060B14] text-white flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Header White-Label con Branding */}
      <header className="px-5 pt-6 pb-4 border-b border-slate-800/80 bg-[#091120]/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/60 p-0.5 shrink-0 shadow-lg">
                <Image
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  width={44}
                  height={44}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-950/40">
                {tenant.name.substring(0, 1)}
              </div>
            )}
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Llamador Virtual
              </span>
              <h1 className="text-base font-extrabold text-white leading-tight truncate max-w-[200px]">
                {tenant.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-[11px] text-slate-300">
            <Store className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mostrador</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 py-6 max-w-md mx-auto w-full flex flex-col justify-center">
        {/* Banner de Instalación PWA (Desaparece automáticamente al instalar) */}
        <div className="mb-4">
          <PwaInstallButton variant="banner" />
        </div>

        {/* Acceso directo si ya tiene un llamador en memoria */}
        {storedToken && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-slate-900/60 border border-emerald-500/30 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-200">Tienes un pedido en seguimiento</p>
                <p className="text-[11px] text-slate-400">Reconectar a tu llamador activo</p>
              </div>
            </div>
            <Link
              href={`/b/t/${storedToken}`}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-900/50 transition-colors"
            >
              <span>Ver</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Input Numérico y Título */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3 shadow-inner">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Ingresa el Número de tu Ticket</h2>
          <p className="text-xs text-slate-400 mt-1">
            Mira el número de 3 dígitos impreso en tu comprobante de compra o comanda
          </p>
        </div>

        {/* Display del Código */}
        <div className="mb-6">
          <div className="relative flex items-center justify-center bg-[#0C1527] border-2 border-slate-700/80 rounded-2xl py-4 px-6 shadow-2xl focus-within:border-emerald-500 transition-colors">
            <span className="text-2xl font-black text-emerald-400 mr-1 select-none">#</span>
            <span className="text-4xl font-extrabold tracking-widest text-white min-h-[44px] flex items-center">
              {inputCode ? (
                inputCode
              ) : (
                <span className="text-slate-600 font-normal text-2xl tracking-normal">Ej: 104</span>
              )}
            </span>
            {inputCode && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-4 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-md bg-slate-800"
              >
                Borrar
              </button>
            )}
          </div>

          {searchError && (
            <div className="mt-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}
        </div>

        {/* Teclado Táctil Móvil (1-9, C, 0, Ok) */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-2xl bg-[#0D182B] hover:bg-[#13233E] active:scale-95 border border-slate-800/80 text-xl font-bold text-white shadow-lg flex items-center justify-center transition-all"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-[#131F33] hover:bg-[#1A2C49] active:scale-95 border border-slate-800/80 text-slate-300 font-semibold shadow-lg flex items-center justify-center transition-all"
            aria-label="Borrar dígito"
          >
            <Delete className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress("0")}
            className="h-14 rounded-2xl bg-[#0D182B] hover:bg-[#13233E] active:scale-95 border border-slate-800/80 text-xl font-bold text-white shadow-lg flex items-center justify-center transition-all"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleSearchCode()}
            disabled={!inputCode || searching}
            className="h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-slate-950 font-black shadow-lg shadow-emerald-950/60 flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Buscar llamador"
          >
            {searching ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-6 h-6 stroke-[3]" />
            )}
          </button>
        </div>

        {/* Promo Banners Rotativos del Locatario */}
        {promoBanners.length > 0 && (
          <div className="mt-2 rounded-2xl bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/20 p-4 relative overflow-hidden shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                Promo de la Casa
              </span>
            </div>
            <h3 className="text-sm font-bold text-white leading-tight">
              {promoBanners[currentBannerIdx]?.title || "Especial del Día"}
            </h3>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2">
              {promoBanners[currentBannerIdx]?.description ||
                "Aprovecha las promociones exclusivas mientras esperas tu pedido."}
            </p>
          </div>
        )}
      </main>

      {/* Footer Minimalista */}
      <footer className="px-5 py-4 border-t border-slate-800/60 text-center bg-[#070D18]">
        <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <span>Potenciado por</span>
          <span className="font-extrabold text-slate-400 tracking-wider">VIDJS BEEPER</span>
          <span>• Sin descargas</span>
        </p>
      </footer>
    </div>
  );
}
