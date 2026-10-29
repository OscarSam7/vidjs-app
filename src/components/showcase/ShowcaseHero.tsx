"use client";

import Link from "next/link";
import { 
  Sparkles, 
  ArrowRight, 
  Play, 
  ShieldCheck, 
  QrCode, 
  Headphones, 
  Mic, 
  Tv, 
  TrendingUp, 
  Zap,
  CheckCircle2
} from "lucide-react";

interface ShowcaseHeroProps {
  onOpenDemoModal: () => void;
  onScrollToSection: (sectionId: string) => void;
}

export function ShowcaseHero({ onOpenDemoModal, onScrollToSection }: ShowcaseHeroProps) {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Luces y degradados de fondo tipo Club/Lounge */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[900px] h-[400px] bg-gradient-to-tr from-purple-600/20 via-cyan-500/20 to-pink-500/15 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-12 left-10 w-72 h-72 bg-purple-600/10 rounded-full blur-[90px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      
      {/* Grilla sutil futurista */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e08_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Badge de Categoría / Nivel Enterprise */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-950/80 via-zinc-900/90 to-cyan-950/80 border border-purple-500/30 text-xs font-bold text-purple-300 shadow-lg shadow-purple-950/50 backdrop-blur-md mb-8 animate-fade-in">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="tracking-wide uppercase text-[11px] font-black text-white">
            VIDJS PRO ECOSYSTEM
          </span>
          <span className="text-zinc-500">|</span>
          <span className="text-cyan-300 font-medium">El Sistema Operativo Definitivo para la Noche</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        {/* Titular Principal de Alto Impacto */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.08] max-w-5xl mx-auto">
          Revoluciona tu Local con la Plataforma que{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
            Conecta al DJ, al Bar y a tus Clientes.
          </span>
        </h1>

        {/* Subtítulo enfocado en Valor de Negocio y Rentabilidad */}
        <p className="mt-6 text-lg sm:text-xl text-zinc-300 max-w-3xl mx-auto font-normal leading-relaxed">
          Digitaliza tu cabina con <span className="text-cyan-300 font-semibold">Virtual DJ HD en la nube</span>, 
          dispara el consumo en barra con <span className="text-purple-300 font-semibold">Karaokes interactivos y Super Votos</span>, 
          y proyecta pantallas gigantes sincronizadas <span className="text-emerald-300 font-semibold">sin instalar ninguna app</span>.
        </p>

        {/* Pilares Clave Rápidos */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 text-xs sm:text-sm text-zinc-400">
          <div className="flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1 rounded-full border border-zinc-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Cero apps por descargar (QR Directo)</span>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1 rounded-full border border-zinc-800">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Dual Deck DJ con Video Streaming</span>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1 rounded-full border border-zinc-800">
            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span>+34% en ventas de tragos con Super Votos</span>
          </div>
        </div>

        {/* Botones de Acción Primarios */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
          <button
            type="button"
            onClick={() => onScrollToSection("modulos")}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-base shadow-xl shadow-purple-600/30 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Explorar Todos los Módulos</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => onScrollToSection("sandbox")}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 text-zinc-200 hover:text-white font-bold text-base border border-zinc-700/80 hover:border-zinc-500 shadow-lg backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
            <span>Simulador Interactivo en Vivo</span>
          </button>

          <button
            type="button"
            onClick={onOpenDemoModal}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 font-bold text-base border border-emerald-500/40 hover:border-emerald-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Solicitar Demo para mi Local</span>
          </button>
        </div>

        {/* Tarjetas Flotantes de Acceso Rápido a los 4 Entornos del Sistema */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto">
          <Link
            href="/dashboard/dj"
            className="p-4 rounded-2xl bg-zinc-900/70 border border-purple-500/30 hover:border-purple-500/80 hover:bg-purple-950/20 text-left transition-all group backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Headphones className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50">
                PRO 2.0
              </span>
            </div>
            <div className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors">
              Cabina Virtual DJ
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
              Doble bandeja YouTube HD, crossfader, loops y sincronización armónica de tonos.
            </div>
          </Link>

          <Link
            href="/dashboard/karaoke"
            className="p-4 rounded-2xl bg-zinc-900/70 border border-cyan-500/30 hover:border-cyan-500/80 hover:bg-cyan-950/20 text-left transition-all group backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Mic className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                INTELIGENTE
              </span>
            </div>
            <div className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors">
              Karaoke Canta y Libera
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
              Turnos rotativos anti-monopolio, dedicatorias en vivo y control de tonalidad.
            </div>
          </Link>

          <Link
            href="/guest"
            className="p-4 rounded-2xl bg-zinc-900/70 border border-emerald-500/30 hover:border-emerald-500/80 hover:bg-emerald-950/20 text-left transition-all group backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                ZERO APPS
              </span>
            </div>
            <div className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
              Portal Comensales QR
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
              Peticiones musicales, propinas al DJ y Super Votos con consumo mínimo por mesa.
            </div>
          </Link>

          <Link
            href="/display/DEMO"
            className="p-4 rounded-2xl bg-zinc-900/70 border border-amber-500/30 hover:border-amber-500/80 hover:bg-amber-950/20 text-left transition-all group backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Tv className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                VIDEO WALL
              </span>
            </div>
            <div className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">
              Pantalla TV & Display
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
              Visualizadores dinámicos, publicidad de sponsors y letras de karaoke en tiempo real.
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
