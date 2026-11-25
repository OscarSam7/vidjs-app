"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Headphones,
  Mic,
  QrCode,
  Tv,
  ListMusic,
  BarChart3,
  Award,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  LogIn,
  ExternalLink,
  MessageCircle,
  Menu,
  X,
  UtensilsCrossed,
  BellRing,
  UserCheck
} from "lucide-react";
import { CynkoLogo } from "@/components/ui/ZynkoLogo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

import { ShowcaseHero } from "@/components/showcase/ShowcaseHero";
import { ShowcaseMetrics } from "@/components/showcase/ShowcaseMetrics";
import { ShowcaseModules } from "@/components/showcase/ShowcaseModules";
import { ShowcaseSandbox } from "@/components/showcase/ShowcaseSandbox";
import { ShowcaseRoiCalculator } from "@/components/showcase/ShowcaseRoiCalculator";
import { ShowcaseComparison } from "@/components/showcase/ShowcaseComparison";
import { ShowcaseTestimonials } from "@/components/showcase/ShowcaseTestimonials";
import { ShowcaseCtaModal } from "@/components/showcase/ShowcaseCtaModal";

export default function ShowcasePage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#060609] text-zinc-100 selection:bg-purple-500 selection:text-white relative">
      {/* NAVBAR SUPERIOR FIJO */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo Brand */}
          <Link href="/showcase" className="flex items-center gap-3 group">
            <CynkoLogo size="md" subtitle="Venues & Entertainment OS" />
            <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-950/80 text-[10px] font-mono font-bold text-fuchsia-300 border border-fuchsia-800/60 hidden sm:inline shadow-sm shadow-fuchsia-900/30">
              OS ECOSYSTEM
            </span>
          </Link>

          {/* Menú Desktop */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-zinc-400">
            <button
              type="button"
              onClick={() => scrollToSection("modulos")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Módulos del Sistema
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("sandbox")}
              className="hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Simulador Sandbox</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("calculadora-roi")}
              className="hover:text-emerald-300 transition-colors cursor-pointer"
            >
              Calculadora ROI
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("comparativa")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Comparativa
            </button>
          </nav>

          {/* Botones de Acción */}
          <div className="hidden sm:flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/register"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-xs shadow-md shadow-emerald-950/40 hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>30 Días Pro Gratis</span>
            </Link>

            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold border border-zinc-700/80 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Ingresar Staff</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsDemoModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 text-white text-xs font-black shadow-md shadow-fuchsia-900/30 hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Solicitar Demo VIP</span>
            </button>
          </div>

          {/* Botón Móvil Hamburguesa */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Menú Desplegable Móvil */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-zinc-950 border-b border-zinc-800 p-4 space-y-3 animate-fade-in">
            <button
              type="button"
              onClick={() => scrollToSection("modulos")}
              className="block w-full text-left py-2 px-3 rounded-lg text-sm font-bold text-zinc-300 hover:bg-zinc-900"
            >
              Módulos del Sistema
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("sandbox")}
              className="block w-full text-left py-2 px-3 rounded-lg text-sm font-bold text-cyan-300 hover:bg-zinc-900"
            >
              Simulador Sandbox
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("calculadora-roi")}
              className="block w-full text-left py-2 px-3 rounded-lg text-sm font-bold text-emerald-300 hover:bg-zinc-900"
            >
              Calculadora ROI
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("comparativa")}
              className="block w-full text-left py-2 px-3 rounded-lg text-sm font-bold text-zinc-300 hover:bg-zinc-900"
            >
              Comparativa de Mercado
            </button>

            <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">
              <Link
                href="/register"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-center font-black text-xs text-black"
              >
                Probar 30 Días Gratis
              </Link>
              <Link
                href="/login"
                className="w-full py-2.5 rounded-xl bg-zinc-900 text-center font-bold text-xs text-white border border-zinc-800"
              >
                Ingresar Staff
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsDemoModalOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-fuchsia-600 text-center font-bold text-xs text-white"
              >
                Solicitar Demo VIP
              </button>
            </div>
          </div>
        )}
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main>
        {/* HERO SECTION */}
        <ShowcaseHero
          onOpenDemoModal={() => setIsDemoModalOpen(true)}
          onScrollToSection={scrollToSection}
        />

        {/* METRICS & KPIS */}
        <ShowcaseMetrics />

        {/* DETAILED 360° MODULES */}
        <ShowcaseModules />

        {/* LIVE INTERACTIVE SANDBOX */}
        <ShowcaseSandbox />

        {/* ROI CALCULATOR */}
        <ShowcaseRoiCalculator onOpenDemoModal={() => setIsDemoModalOpen(true)} />

        {/* COMPARISON MATRIX */}
        <ShowcaseComparison />

        {/* TESTIMONIALS & CASE STUDIES */}
        <ShowcaseTestimonials />

        {/* BANNER FINAL DE CONVERSIÓN */}
        <section className="py-20 relative overflow-hidden bg-gradient-to-b from-zinc-950 via-purple-950/40 to-zinc-950 border-t border-zinc-900">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
            <span className="px-4 py-1.5 rounded-full bg-purple-900/60 border border-purple-500/40 text-xs font-mono font-bold text-purple-300 inline-block">
              TRANSFORMA TU ESTABLECIMIENTO HOY MISMO
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              ¿Listo para Llevar la Experiencia de tu Local al Siguiente Nivel?
            </h2>
            <p className="text-zinc-300 text-base sm:text-lg max-w-2xl mx-auto">
              Comienza hoy a digitalizar tus mesas, modernizar la cabina DJ y maximizar los ingresos por consumición con Super Votos.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(true)}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black text-base shadow-xl shadow-emerald-950/60 hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>Agendar Demostración VIP por WhatsApp</span>
              </button>

              <Link
                href="/login"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-base border border-zinc-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-cyan-400" />
                <span>Iniciar Sesión en el Sistema</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER DETALLADO */}
      <footer className="py-16 bg-[#040406] border-t border-zinc-800/80 text-zinc-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <CynkoLogo size="sm" subtitle="Venues & Entertainment OS" />
              </div>
              <p className="text-zinc-400 max-w-sm leading-relaxed">
                El sistema operativo integral para venues, discotecas, bares y restaurantes. Unifica cabina de Audio Pro, gastronomía POS/KDS, beepers digitales QR, asistencia de staff, karaoke, acreditaciones y reservas VIP.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
                <ShieldCheck className="w-4 h-4" />
                <span>Enterprise Security &bull; 99.9% Uptime Guarantee</span>
              </div>
            </div>

            {/* Columna Módulos */}
            <div className="space-y-3">
              <div className="font-bold text-white uppercase tracking-wider text-[11px] font-mono">
                Módulos del Sistema
              </div>
              <ul className="space-y-2">
                <li>
                  <Link href="/dashboard/dj/pro" className="hover:text-fuchsia-300 transition-colors flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 inline-block"></span>
                    <span>Audio Cabina Pro (Auto-DJ)</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/gastronomy" className="hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                    <span>Restaurante POS & KDS</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/beeper" className="hover:text-amber-300 transition-colors flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                    <span>Beeper Digital QR</span>
                  </Link>
                </li>
                <li>
                  <Link href="/staff/asistencia" className="hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span>
                    <span>Asistencia Staff QR</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/accreditation" className="hover:text-teal-300 transition-colors">
                    Acreditaciones QR (Cynko Pass)
                  </Link>
                </li>
                <li>
                  <Link href="/reservas" className="hover:text-rose-300 transition-colors">
                    Reservas VIP & Camarotes
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/dj" className="hover:text-purple-300 transition-colors">
                    Consola Virtual DJ
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/karaoke" className="hover:text-cyan-300 transition-colors">
                    Karaoke Canta y Libera
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/contest" className="hover:text-pink-300 transition-colors">
                    Concursos & Super Votos
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/branding" className="hover:text-purple-300 transition-colors">
                    White-Label & Marca Blanca
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna Experiencias */}
            <div className="space-y-3">
              <div className="font-bold text-white uppercase tracking-wider text-[11px] font-mono">
                Experiencias en Vivo
              </div>
              <ul className="space-y-2">
                <li>
                  <Link href="/guest" className="hover:text-emerald-300 transition-colors">
                    Portal Comensal QR
                  </Link>
                </li>
                <li>
                  <Link href="/display/DEMO" className="hover:text-amber-300 transition-colors">
                    Pantalla Gigante TV 4K
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/gastronomy/kitchen" className="hover:text-orange-300 transition-colors">
                    Cocina KDS en Tiempo Real
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/gastronomy/bar" className="hover:text-cyan-300 transition-colors">
                    Barra de Tragos & Coctelería
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/gastronomy/tables" className="hover:text-white transition-colors">
                    Gestor de Mesas & Comandas
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/events" className="hover:text-white transition-colors">
                    Gestor de Eventos & Aforo
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna Staff & Soporte */}
            <div className="space-y-3">
              <div className="font-bold text-white uppercase tracking-wider text-[11px] font-mono">
                Acceso & Registro
              </div>
              <ul className="space-y-2">
                <li>
                  <Link href="/register" className="hover:text-emerald-300 transition-colors font-bold text-emerald-400">
                    Registrar Local (30 Días Pro)
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-purple-300 transition-colors">
                    Iniciar Sesión Staff
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsDemoModalOpen(true)}
                    className="hover:text-cyan-300 transition-colors text-left cursor-pointer"
                  >
                    Solicitar Presupuesto VIP
                  </button>
                </li>
                <li>
                  <Link href="/dashboard/subscription" className="hover:text-white transition-colors">
                    Planes & Precios
                  </Link>
                </li>
                <li>
                  <Link href="/health" className="hover:text-white transition-colors">
                    Estado de Servidores
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
            <div>
              &copy; {new Date().getFullYear()} CYNKO OS (cynko.app) &bull; Venues & Entertainment Operating System. Todos los derechos reservados.
            </div>
            <div className="flex items-center gap-4">
              <span>Cloud Web Architecture</span>
              <span>&bull;</span>
              <span>Zero App Downloads</span>
              <span>&bull;</span>
              <span>Optimized for Gastronomy & Nightlife</span>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL DE CAPTURA COMERCIAL / WHATSAPP */}
      <ShowcaseCtaModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
}
