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
  CheckCircle2,
  Ticket,
  PartyPopper,
  UtensilsCrossed,
  BellRing,
  UserCheck,
  Disc3
} from "lucide-react";

interface ShowcaseHeroProps {
  onOpenDemoModal: () => void;
  onScrollToSection: (sectionId: string) => void;
}

export function ShowcaseHero({ onOpenDemoModal, onScrollToSection }: ShowcaseHeroProps) {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Luces y degradados de fondo tipo Club/Lounge */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[900px] h-[400px] bg-gradient-to-tr from-fuchsia-600/20 via-cyan-500/20 to-pink-500/15 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-12 left-10 w-72 h-72 bg-fuchsia-600/10 rounded-full blur-[90px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      
      {/* Grilla sutil futurista */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e08_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Badge de Categoría / Nivel Enterprise */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-fuchsia-950/80 via-zinc-900/90 to-cyan-950/80 border border-fuchsia-500/30 text-xs font-bold text-fuchsia-300 shadow-lg shadow-fuchsia-950/50 backdrop-blur-md mb-8 animate-fade-in">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="tracking-wide uppercase text-[11px] font-black text-white">
            CYNKO OS ECOSYSTEM
          </span>
          <span className="text-zinc-500">|</span>
          <span className="text-cyan-300 font-medium">Venues & Entertainment Operating System</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        {/* Titular Principal de Alto Impacto */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.08] max-w-5xl mx-auto">
          El Sistema Operativo Definitivo para{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-400 to-cyan-400">
            Venues, Boliches, Bares y Restaurantes.
          </span>
        </h1>

        {/* Subtítulo enfocado en Valor de Negocio y Rentabilidad */}
        <p className="mt-6 text-lg sm:text-xl text-zinc-300 max-w-3xl mx-auto font-normal leading-relaxed">
          Unifica la cabina con <span className="text-fuchsia-300 font-semibold">Audio Cabina Pro & Auto-DJ</span>, 
          controla tu cocina y barra con <span className="text-emerald-300 font-semibold">Restaurante POS & KDS</span>, 
          elimina hardware con <span className="text-amber-300 font-semibold">Beepers Digitales QR</span>, 
          asegura ingresos con <span className="text-pink-300 font-semibold">Reservas VIP con fotos de ambientación</span> 
          y blinda la puerta con <span className="text-teal-300 font-semibold">Acreditaciones QR Offline en 0.2s</span>.
        </p>

        {/* Pilares Clave Rápidos */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-6 text-xs sm:text-sm text-zinc-400">
          <div className="flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1 rounded-full border border-zinc-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Cero apps por descargar (QR Directo PWA)</span>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1 rounded-full border border-zinc-800">
            <CheckCircle2 className="w-4 h-4 text-fuchsia-400 shrink-0" />
            <span>Audio Pro: Auto-DJ Ping-Pong & EQ 3-Band</span>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1 rounded-full border border-zinc-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Restaurante POS, Cocina KDS y Mozos</span>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1 rounded-full border border-zinc-800">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Beeper Digital con Alerta Háptica</span>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1 rounded-full border border-zinc-800">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Asistencia Staff QR con Claves CK-XXXX</span>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1 rounded-full border border-zinc-800">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Control de Acceso QR Offline HMAC</span>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1 rounded-full border border-zinc-800">
            <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Reservas VIP & Fotos de Decoración</span>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1 rounded-full border border-zinc-800">
            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span>+34% en ventas de tragos con Super Votos</span>
          </div>
        </div>

        {/* Botones de Acción Primarios */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black text-base shadow-xl shadow-emerald-950/60 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <Sparkles className="w-5 h-5 fill-current" />
            <span>Probar Gratis 30 Días</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <button
            type="button"
            onClick={() => onScrollToSection("modulos")}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 text-white font-black text-base shadow-xl shadow-fuchsia-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Explorar los 12 Módulos</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => onScrollToSection("sandbox")}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 text-zinc-200 hover:text-white font-bold text-base border border-zinc-700/80 hover:border-zinc-500 shadow-lg backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
            <span>Simulador Interactivo</span>
          </button>

          <button
            type="button"
            onClick={onOpenDemoModal}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-zinc-950/60 hover:bg-zinc-900/80 text-zinc-300 hover:text-white font-bold text-base border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Solicitar Demo VIP</span>
          </button>
        </div>

        {/* Tarjetas Flotantes de Acceso Rápido a los 8 Entornos Principales */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-3.5 max-w-7xl mx-auto">
          {/* 1. Audio Cabina Pro */}
          <Link
            href="/dashboard/dj/pro"
            className="p-3.5 rounded-2xl bg-zinc-900/70 border border-fuchsia-500/30 hover:border-fuchsia-500/80 hover:bg-fuchsia-950/20 text-left transition-all group backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 group-hover:scale-110 transition-transform">
                <Disc3 className="w-5 h-5 animate-[spin_8s_linear_infinite]" />
              </div>
              <span className="text-[9px] font-mono font-bold text-fuchsia-300 bg-fuchsia-950/60 px-1.5 py-0.5 rounded border border-fuchsia-800/50">
                PRO AUTO-DJ
              </span>
            </div>
            <div className="font-bold text-white text-xs group-hover:text-fuchsia-300 transition-colors">
              Cabina Audio Pro
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 line-clamp-2">
              Auto-DJ Ping-Pong, crossfade temporizado y EQ 3-bandas.
            </div>
          </Link>

          {/* 2. Gastronomía POS & KDS */}
          <Link
            href="/dashboard/gastronomy"
            className="p-3.5 rounded-2xl bg-zinc-900/70 border border-emerald-500/30 hover:border-emerald-500/80 hover:bg-emerald-950/20 text-left transition-all group backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
                POS & KDS
              </span>
            </div>
            <div className="font-bold text-white text-xs group-hover:text-emerald-300 transition-colors">
              Restaurante POS
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 line-clamp-2">
              Comandas en vivo, pantalla KDS de cocina, mozos y barra.
            </div>
          </Link>

          {/* 3. Beeper Digital QR */}
          <Link
            href="/dashboard/beeper"
            className="p-3.5 rounded-2xl bg-zinc-900/70 border border-amber-500/30 hover:border-amber-500/80 hover:bg-amber-950/20 text-left transition-all group backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <BellRing className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50">
                SMART PWA
              </span>
            </div>
            <div className="font-bold text-white text-xs group-hover:text-amber-300 transition-colors">
              Beeper Digital
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 line-clamp-2">
              Localizador de platos por QR con vibración y sonido en celular.
            </div>
          </Link>

          {/* 4. Staff & Asistencia QR */}
          <Link
            href="/staff/asistencia"
            className="p-3.5 rounded-2xl bg-zinc-900/70 border border-cyan-500/30 hover:border-cyan-500/80 hover:bg-cyan-950/20 text-left transition-all group backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                CK-XXXX
              </span>
            </div>
            <div className="font-bold text-white text-xs group-hover:text-cyan-300 transition-colors">
              Asistencia Staff
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 line-clamp-2">
              Fichaje rápido de turnos con claves dinámicas y geolocalización.
            </div>
          </Link>

          {/* 5. Acreditaciones QR */}
          <Link
            href="/dashboard/accreditation"
            className="p-3.5 rounded-2xl bg-zinc-900/70 border border-teal-500/30 hover:border-teal-500/80 hover:bg-teal-950/20 text-left transition-all group backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                <Ticket className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-mono font-bold text-teal-300 bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800/50">
                CYNKO PASS
              </span>
            </div>
            <div className="font-bold text-white text-xs group-hover:text-teal-300 transition-colors">
              Control Acceso
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 line-clamp-2">
              Escaneo en 0.2s offline con HMAC y credenciales térmicas.
            </div>
          </Link>

          {/* 6. Reservas VIP & Camarotes */}
          <Link
            href="/reservas"
            className="p-3.5 rounded-2xl bg-zinc-900/70 border border-rose-500/30 hover:border-rose-500/80 hover:bg-rose-950/20 text-left transition-all group backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <PartyPopper className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-mono font-bold text-rose-300 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/50">
                VIP BOOKING
              </span>
            </div>
            <div className="font-bold text-white text-xs group-hover:text-rose-300 transition-colors">
              Reservas VIP
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 line-clamp-2">
              Preventa de mesas con fotos de decoración y pases QR WhatsApp.
            </div>
          </Link>

          {/* 7. Karaoke Inteligente */}
          <Link
            href="/dashboard/karaoke"
            className="p-3.5 rounded-2xl bg-zinc-900/70 border border-indigo-500/30 hover:border-indigo-500/80 hover:bg-indigo-950/20 text-left transition-all group backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Mic className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-mono font-bold text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/50">
                ROTATIVO
              </span>
            </div>
            <div className="font-bold text-white text-xs group-hover:text-indigo-300 transition-colors">
              Karaoke Inteligente
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 line-clamp-2">
              Algoritmo anti-monopolio, dedicatorias y control de tono.
            </div>
          </Link>

          {/* 8. Pantalla TV & Display */}
          <Link
            href="/display/DEMO"
            className="p-3.5 rounded-2xl bg-zinc-900/70 border border-purple-500/30 hover:border-purple-500/80 hover:bg-purple-950/20 text-left transition-all group backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Tv className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-mono font-bold text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/50">
                4K VIDEO
              </span>
            </div>
            <div className="font-bold text-white text-xs group-hover:text-purple-300 transition-colors">
              Pantallas 4K
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 line-clamp-2">
              Visualizadores neón reactivos, letras y fotos de cumpleañeros.
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
