"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Headphones,
  Mic,
  QrCode,
  Tv,
  ListMusic,
  BarChart3,
  Award,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Sliders,
  Flame,
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight
} from "lucide-react";

export function ShowcaseModules() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number>(0);

  const categories = [
    { id: "all", label: "Todos los Módulos (7)" },
    { id: "audio", label: "🎧 DJ & Audio Pro" },
    { id: "karaoke", label: "🎤 Karaoke & Concursos" },
    { id: "monetization", label: "💰 Monetización & Mesas" },
    { id: "screens", label: "📺 Pantallas & Gestión" },
  ];

  const modules = [
    {
      id: "dj-console",
      category: "audio",
      title: "Consola Virtual DJ 2.0 con Video Sync",
      badge: "PRO PERFORMANCE",
      badgeColor: "bg-purple-950/80 text-purple-300 border-purple-800/60",
      accentColor: "from-purple-600 to-indigo-600",
      icon: Headphones,
      directHref: "/dashboard/dj",
      directLabel: "Entrar a Cabina DJ",
      tagline: "Mezcla audio y video YouTube HD en vivo con 2 bandejas independientes y cero cortes.",
      description:
        "Una consola virtual web de grado profesional diseñada para operar horas continuas sin colapsar. Posee bandejas A y B completamente aisladas por hardware y DOM, crossfader analógico/digital, loops dinámicos de 1 a 32 tiempos, y detección armónica de notas musicales (Camelot Wheel).",
      features: [
        "Doble reproductor YouTube HD totalmente aislado (Deck A & B)",
        "Crossfader con transiciones suaves y curvas ajustables",
        "Pitch / Tempo con modulación fina de BPM (+/- 16%)",
        "CUE Points instantáneos y Loops automáticos (1, 2, 4, 8, 16, 32)",
        "Detección armónica Key (Camelot) para mezclas perfectamente afinadas",
        "Guardado a Biblioteca Musical en 1 clic con selección de categoría",
        "Atajos de teclado profesionales (Espacio, C, Flechas, Números)",
      ],
      businessValue:
        "Ahorra hasta $3.500 USD en licencias de software (VirtualDJ Pro, Serato Video) y costosos controladores de hardware. El DJ de tu local trabaja desde cualquier laptop estándar con la máxima fluidez.",
      stats: { label: "Estabilidad de Streaming", value: "99.9% Uptime" },
    },
    {
      id: "karaoke-booth",
      category: "karaoke",
      title: "Cabina de Karaoke Inteligente 'Canta y Libera'",
      badge: "ALGORITMO ANTI-MONOPOLIO",
      badgeColor: "bg-cyan-950/80 text-cyan-300 border-cyan-800/60",
      accentColor: "from-cyan-600 to-teal-600",
      icon: Mic,
      directHref: "/dashboard/karaoke",
      directLabel: "Ver Cabina Karaoke",
      tagline: "Rotación justa de mesas, control de tono y transición suave con la música del DJ.",
      description:
        "El sistema de karaoke que soluciona el mayor dolor de cabeza de los bares: las peleas por el micrófono. Nuestro algoritmo 'Canta y Libera' asegura que una misma mesa no monopolice el escenario, manteniendo a todos los comensales expectantes y consumiendo.",
      features: [
        "Cola de espera inteligente con rotación estricta por mesa",
        "Control de tonalidad y tono (+/- semitonos) en tiempo real",
        "Proyección de dedicatorias personalizadas enviadas por comensales",
        "Pase automático DJ <-> Karaoke sin silencios incómodos",
        "Catálogo integrado con miles de pistas karaoke con letras sincronizadas",
        "Botón de rescate de emergencia y pase de turno con 1 clic",
      ],
      businessValue:
        "Retiene a los grupos de clientes por horas. La expectativa de cantar y apoyar a sus amigos se traduce directamente en rondas adicionales de cerveza, cócteles y comida.",
      stats: { label: "Retención Promedio", value: "+2.5 Horas" },
    },
    {
      id: "contest-supervotes",
      category: "karaoke",
      title: "Concursos de Canto & 'Super Votos' por Consumo",
      badge: "BOOSTER DE VENTAS",
      badgeColor: "bg-pink-950/80 text-pink-300 border-pink-800/60",
      accentColor: "from-pink-600 to-rose-600",
      icon: Award,
      directHref: "/dashboard/contest",
      directLabel: "Gestionar Concursos",
      tagline: "Gamificación en vivo: los comensales desbloquean votos multiplicadores consumiendo en el bar.",
      description:
        "La función más lucrativa para dueños de locales: organiza concursos de canto semanales o duelos 1 vs 1. Los comensales votan en vivo desde sus teléfonos. ¿La clave? Quien consume más en su mesa, desbloquea 'Super Votos' multiplicadores (x5, x10) para hacer ganar a su participante favorito.",
      features: [
        "Duelos en vivo 1 vs 1 y tablas de posiciones automatizadas",
        "Módulo de 'Super Votos' condicionado al consumo mínimo registrado en caja",
        "Panel exclusivo para Jurados VIP (/judge/[code]) con voto técnico ponderado",
        "Animaciones de podio y fuegos artificiales digitales en pantalla gigante",
        "Historial y auditoría de votos a prueba de fraude",
        "Alertas en pantallas invitando al público a consumir para votar",
      ],
      businessValue:
        "Convierte las noches tradicionalmente muertas (martes y jueves) en eventos de alta recaudación. La barra experimenta picos de pedidos durante los duelos y finales del concurso.",
      stats: { label: "Disparo en Facturación", value: "+38% en Barra" },
    },
    {
      id: "guest-qr",
      category: "monetization",
      title: "Portal Web Móvil Comensales (Zero App Install)",
      badge: "100% WEB NATIVO",
      badgeColor: "bg-emerald-950/80 text-emerald-300 border-emerald-800/60",
      accentColor: "from-emerald-600 to-green-600",
      icon: QrCode,
      directHref: "/guest",
      directLabel: "Ver Portal Comensal",
      tagline: "Cero fricción: el cliente escanea el QR en la mesa y accede en menos de 2 segundos.",
      description:
        "Tus clientes no tienen que descargar ninguna app de la tienda ni crear contraseñas complicadas. Con solo enfocar la cámara del celular al código QR de su mesa, ingresan al catálogo para pedir canciones, dejar dedicatorias, dar propinas al DJ y votar en concursos.",
      features: [
        "Escaneo de QR físico por mesa con enlace único e intransferible",
        "Buscador instantáneo en catálogo de la casa y YouTube",
        "Envío de dedicatorias para aparecer en la pantalla gigante de TV",
        "Seguimiento en vivo del estado del pedido (Pendiente, Aceptado, Sonando)",
        "Botón de propinas virtuales voluntarias para el DJ / Barman",
        "Filtro inteligente anti-spam por mesa para evitar saturaciones",
      ],
      businessValue:
        "Elimina las servilletas de papel y las interrupciones constantes al DJ. Todo el flujo es digital, ordenado y monitoreado en tiempo real desde la consola del staff.",
      stats: { label: "Tiempo de Conexión", value: "< 2 Segundos" },
    },
    {
      id: "tv-display",
      category: "screens",
      title: "Video Wall & Pantalla Gigante Smart TV",
      badge: "4K READY",
      badgeColor: "bg-amber-950/80 text-amber-300 border-amber-800/60",
      accentColor: "from-amber-600 to-orange-600",
      icon: Tv,
      directHref: "/display/DEMO",
      directLabel: "Ver Pantalla en Vivo",
      tagline: "Convierte cualquier Smart TV o proyector en un canal de televisión interactivo.",
      description:
        "Diseñado específicamente para emitir a proyectores, pantallas LED y Smart TVs conectadas por HDMI o navegador web. Muestra visualizadores de audio reactivos de neón, letras de karaoke, anuncios de promociones del bar y un código QR gigante rotativo.",
      features: [
        "Interfaz ultra limpia sin bordes ni elementos de navegador",
        "Visualizador de audio reactivo con ondas y barras de ecualizador",
        "Cintillo inferior rotativo con promociones de la casa ('Happy Hour 2x1')",
        "Código QR dinámico en esquina para incentivar la participación continua",
        "Modo Karaoke con letras en tipografía gigante de alta legibilidad",
        "Modo Duelo / Concurso con marcador interactivo y barra de votación viva",
      ],
      businessValue:
        "Monetiza tus pantallas vendiendo espacios publicitarios a marcas patrocinadoras (cervezas, licores, eventos locales) además de promocionar los platos y tragos de mayor margen.",
      stats: { label: "Resolución", value: "Full HD & 4K" },
    },
    {
      id: "music-library",
      category: "audio",
      title: "Biblioteca Musical & Taxonomía Inteligente",
      badge: "PATRIMONIO DEL LOCAL",
      badgeColor: "bg-blue-950/80 text-blue-300 border-blue-800/60",
      accentColor: "from-blue-600 to-indigo-600",
      icon: ListMusic,
      directHref: "/dashboard/library",
      directLabel: "Explorar Biblioteca",
      tagline: "El repertorio musical y de karaoke de tu local, centralizado y categorizado en la nube.",
      description:
        "Organiza la música de tu local por géneros específicos (Cumbia, Reggaeton, Electrónica, Rock, Pop, Karaoke, etc.) con detección automática de BPM y Key. Si contratas un nuevo DJ el fin de semana, encuentra la biblioteca completa lista para sonar según la identidad del bar.",
      features: [
        "Categorización automática con tags de acceso rápido",
        "Guardado inmediato desde la consola DJ o cabina de karaoke",
        "Almacenamiento de BPM, Tonalidad (Key) y Duración exacta",
        "Filtros por tipo de pista: DJ, Karaoke o Ambos",
        "Búsqueda ultra rápida con tolerancia a errores tipográficos",
        "Historial de éxitos más bailados y más pedidos por el público",
      ],
      businessValue:
        "Protege el activo cultural y musical de tu local. La biblioteca le pertenece al bar, no a la computadora personal del DJ.",
      stats: { label: "Capacidad Catálogo", value: "Ilimitada" },
    },
    {
      id: "admin-analytics",
      category: "screens",
      title: "Panel Gerencial, Analítica & Auditoría",
      badge: "CONTROL TOTAL",
      badgeColor: "bg-violet-950/80 text-violet-300 border-violet-800/60",
      accentColor: "from-violet-600 to-purple-600",
      icon: BarChart3,
      directHref: "/dashboard",
      directLabel: "Ver Panel de Control",
      tagline: "Toma decisiones basadas en datos reales de consumo y comportamiento de tus comensales.",
      description:
        "Conoce exactamente qué canciones llenan la pista de baile, qué mesas consumen más, cuáles son las horas pico de pedidos y cómo se desempeñan tus empleados. Incluye auditoría completa para control de caja y seguridad.",
      features: [
        "Métricas en tiempo real de pedidos, votos y canciones en reproducción",
        "Control granular de roles: Dueño, Administrador, DJ, Bartender, Jurado",
        "Registro inmutable de auditoría para prevenir fraudes o abusos de staff",
        "Configuración de consumo mínimo requerido por mesa",
        "Gestión de múltiples locales (Venues) desde una sola cuenta gerencial",
        "Exportación de reportes para contabilidad y análisis comercial",
      ],
      businessValue:
        "Paz mental para el dueño o gerente. Puedes supervisar la operación del boliche o bar desde tu celular mientras viajas o descansas.",
      stats: { label: "Auditoría en Tiempo Real", value: "100% Rastreado" },
    },
  ];

  const filteredModules =
    activeCategory === "all"
      ? modules
      : modules.filter((m) => m.category === activeCategory);

  const currentModule = modules[selectedModuleIndex];

  return (
    <section id="modulos" className="py-24 bg-[#09090d] relative">
      {/* Luz ambiental */}
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Cabecera de la sección */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-xs font-bold text-purple-300 mb-3">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Arquitectura Modular Integral</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Cada Componente Diseñado para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              Multiplicar tu Negocio
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-300">
            Descubre en detalle cada una de las 7 herramientas integradas que hacen de Vidjs Pro la plataforma líder del mercado nocturno.
          </p>

          {/* Filtros de Categoría */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  const firstMatch = modules.findIndex(
                    (m) => cat.id === "all" || m.category === cat.id
                  );
                  if (firstMatch !== -1) setSelectedModuleIndex(firstMatch);
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-900/40 scale-105"
                    : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selector de Módulos (Pestañas horizontales interactivas) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-10">
          {modules.map((m, idx) => {
            const Icon = m.icon;
            const isSelected = selectedModuleIndex === idx;
            const isVisible = activeCategory === "all" || m.category === activeCategory;

            if (!isVisible) return null;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedModuleIndex(idx)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? "bg-zinc-900 border-cyan-500/80 shadow-lg shadow-cyan-950/60 scale-[1.02] ring-1 ring-cyan-500/40"
                    : "bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-900/60 hover:border-zinc-700 text-zinc-400"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-300"
                        : "bg-zinc-900 text-zinc-500"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-zinc-500">
                    0{idx + 1}
                  </span>
                </div>
                <div>
                  <div
                    className={`text-xs font-bold leading-snug line-clamp-2 ${
                      isSelected ? "text-white" : "text-zinc-300"
                    }`}
                  >
                    {m.title.split("(")[0]}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1 truncate">
                    {m.badge}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Ficha Detallada del Módulo Seleccionado */}
        {currentModule && (
          <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800/90 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            {/* Header del Módulo */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-zinc-800/80">
              <div className="space-y-3 max-w-3xl">
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`px-3 py-1 rounded-full border text-xs font-mono font-black ${currentModule.badgeColor}`}
                  >
                    {currentModule.badge}
                  </span>
                  <span className="text-xs font-mono text-zinc-500">
                    MÓDULO #{selectedModuleIndex + 1}
                  </span>
                </div>
                <h3 className="text-2xl sm:text-4xl font-black text-white">
                  {currentModule.title}
                </h3>
                <p className="text-base sm:text-lg text-cyan-300 font-semibold">
                  {currentModule.tagline}
                </p>
                <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                  {currentModule.description}
                </p>
              </div>

              {/* Botón de Entrada Directa y Stat */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 shrink-0">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-left lg:text-right min-w-[180px]">
                  <div className="text-xs font-mono text-zinc-500 uppercase">
                    {currentModule.stats.label}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5">
                    {currentModule.stats.value}
                  </div>
                </div>

                <Link
                  href={currentModule.directHref}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-cyan-900/40 hover:scale-105 transition-all flex items-center gap-2 group cursor-pointer"
                >
                  <span>{currentModule.directLabel}</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Dos Columnas: Especificaciones Técnicas vs Impacto Comercial */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
              {/* Columna Izquierda: Checklist de Funcionalidades Técnicas */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">
                  <Sliders className="w-4 h-4" />
                  <span>Funcionalidades Incluidas en Este Módulo</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentModule.features.map((feature, fIdx) => (
                    <div
                      key={fIdx}
                      className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-start gap-2.5 text-xs sm:text-sm text-zinc-300"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Columna Derecha: Beneficio de Negocio & Retorno para el Dueño */}
              <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br from-purple-950/40 via-zinc-950 to-cyan-950/30 border border-purple-500/30 space-y-5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-400 font-black mb-3">
                    <Flame className="w-4 h-4" />
                    <span>¿Por qué convence al Dueño o Inversor?</span>
                  </div>
                  <h4 className="text-lg font-black text-white mb-2">
                    Impacto Directo en la Rentabilidad
                  </h4>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {currentModule.businessValue}
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    Incluido en todos los planes Pro
                  </span>
                  <Link
                    href={currentModule.directHref}
                    className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors"
                  >
                    <span>Probar en vivo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
