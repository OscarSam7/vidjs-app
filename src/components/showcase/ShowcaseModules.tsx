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
  ArrowRight,
  Ticket,
  PartyPopper,
  Gift,
  Building,
  ScanLine,
  WifiOff,
  Palette,
  Image as ImageIcon,
  UtensilsCrossed,
  BellRing,
  UserCheck,
  Disc3,
  ChefHat,
  Smartphone
} from "lucide-react";

export function ShowcaseModules() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number>(0);

  const categories = [
    { id: "all", label: "Todos los Módulos (12)" },
    { id: "audio", label: "🎧 DJ & Audio Pro" },
    { id: "gastro", label: "🍽️ Gastronomía POS & Beepers" },
    { id: "events", label: "🎟️ Acreditaciones & Accesos" },
    { id: "reservations", label: "🍾 Reservas & Camarotes VIP" },
    { id: "staff", label: "👥 Staff & Asistencia QR" },
    { id: "karaoke", label: "🎤 Karaoke & Concursos" },
    { id: "screens", label: "📺 Pantallas & Gestión" },
    { id: "branding", label: "🎨 White-Label & Marca Propia" },
  ];

  const modules = [
    {
      id: "audio-pro",
      category: "audio",
      title: "Audio Cabina Pro (Auto-DJ Dual-Deck & Crossfade)",
      badge: "NUEVO & EXCLUSIVO",
      badgeColor: "bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-800/60",
      accentColor: "from-fuchsia-600 to-pink-600",
      icon: Disc3,
      directHref: "/dashboard/dj/pro",
      directLabel: "Entrar a Cabina Audio Pro",
      tagline: "Cockpit DJ con crossfade automático por tiempo, ecualizador paramétrico y cero silencios.",
      description:
        "Diseñado para bares, lounges y discotecas que necesitan música continua de máxima calidad sin depender de un DJ físico a cada minuto. El motor Auto-DJ Ping-Pong alterna automáticamente entre Deck A y Deck B con curvas de desvanecimiento seleccionables (4s, 8s, 12s, 16s). Incorpora un ecualizador Web Audio API de 3 bandas (Bajos, Medios, Agudos) y medidores visuales reactivos.",
      features: [
        "Motor Auto-DJ Ping-Pong con crossfade automático continuo entre bandejas",
        "Selector de curva de crossfade: 4s (rápido), 8s (estándar), 12s (suave), 16s (lounge)",
        "Ecualizador Web Audio API de 3 bandas con ganancia paramétrica y VUmeter",
        "Deck A (Vinilo Neón Fucsia) y Deck B (Vinilo Cian) con control de pitch y loop",
        "Temporizador en cuenta regresiva para el próximo fade automático",
        "Cockpit a pantalla completa con cero desplazamiento (fixed full-screen) anti-fatiga",
        "Buscador instantáneo en YouTube y listas de reproducción de club preconfiguradas",
      ],
      businessValue:
        "Tu local nunca vuelve a quedarse en silencio. Mantiene el ambiente festivo y el ritmo de consumo a tope incluso durante los descansos del DJ o en horarios tempranos.",
      stats: { label: "Transición sin Silencios", value: "100% Automático" },
    },
    {
      id: "gastronomy-pos",
      category: "gastro",
      title: "Restaurante POS & Cocina KDS en Tiempo Real",
      badge: "SISTEMA INTEGRAL",
      badgeColor: "bg-emerald-950/80 text-emerald-300 border-emerald-800/60",
      accentColor: "from-emerald-600 to-teal-600",
      icon: UtensilsCrossed,
      directHref: "/dashboard/gastronomy",
      directLabel: "Ver Módulo Gastronómico",
      tagline: "Comandero digital, pantalla de cocina KDS, barra de tragos y arqueo de turnos de caja.",
      description:
        "La suite gastronómica completa para locales gastronómicos y clubes. Los mozos cargan pedidos desde sus teléfonos o tablets, la comanda aparece de inmediato en la pantalla de cocina KDS dividida por tiempos de preparación, y la barra despacha bebidas con precisión sin duplicar pedidos.",
      features: [
        "Comandero digital para mozos con división de mesas y cuentas separadas",
        "Pantalla KDS de Cocina (/kitchen) con cronómetro por plato (Pendiente, En Marcha, Listo)",
        "Estación de Barra (/bar) optimizada para salida rápida de cócteles y botellas",
        "Gestión de caja (/cashier) con arqueo de apertura/cierre, propinas y métodos de pago",
        "Soporte de pagos con Efectivo, Tarjetas y transferencias QR (SIPAP / PIX)",
        "Control de inventario, recetas e insumos con alerta de stock crítico",
        "Menú digital QR público (/menu) sincronizado en tiempo real",
      ],
      businessValue:
        "Reduce los tiempos de espera de platos en un 35%, elimina errores de comandas extraviadas y asegura que cada trago servido esté registrado y cobrado en caja.",
      stats: { label: "Aceleración de Comandas", value: "-35% Tiempo" },
    },
    {
      id: "beeper-digital",
      category: "gastro",
      title: "Beeper Digital QR PWA (Localizador de Pedidos)",
      badge: "CERO HARDWARE",
      badgeColor: "bg-amber-950/80 text-amber-300 border-amber-800/60",
      accentColor: "from-amber-600 to-orange-600",
      icon: BellRing,
      directHref: "/dashboard/beeper",
      directLabel: "Ver Beeper Digital",
      tagline: "Reemplaza los beepers físicos costosos por alertas vibratorias y sonoras en el móvil del cliente.",
      description:
        "Olvídate de comprar y reponer beepers plásticos de $40-$60 USD que se caen, se rompen o los clientes se llevan por error. Con CYNKO, el cliente escanea el QR de su ticket de compra y su teléfono inteligente se convierte en el beeper: vibra, suena y destella cuando su comida o trago está listo.",
      features: [
        "Cero descargas: funciona en cualquier navegador móvil iOS y Android como PWA",
        "Alerta háptica (vibración del dispositivo) y sonido acústico envolvente",
        "Destello de pantalla a colores y animación de aviso llamativo",
        "Panel del operador (/dashboard/beeper) con llamada en 1 clic al comensal",
        "Notificaciones Web Push incluso si el usuario bloquea la pantalla",
        "Métricas de tiempo promedio de entrega por mesa o mostrador",
        "Ahorro inmediato de miles de dólares en equipos de radiofrecuencia",
      ],
      businessValue:
        "Ahorro de hasta $2.000 USD en inversión inicial de hardware. Mayor comodidad para el cliente, que puede esperar sentado en su mesa o recorrer el local sin perder su turno.",
      stats: { label: "Costo de Equipos", value: "$0 en Hardware" },
    },
    {
      id: "staff-attendance",
      category: "staff",
      title: "CYNKO Staff & Asistencia QR con Claves Dinámicas",
      badge: "CONTROL DE EQUIPO",
      badgeColor: "bg-cyan-950/80 text-cyan-300 border-cyan-800/60",
      accentColor: "from-cyan-600 to-blue-600",
      icon: UserCheck,
      directHref: "/staff/asistencia",
      directLabel: "Ver Asistencia Staff",
      tagline: "Fichaje ultrarrápido con códigos CK-XXXX, GPS anti-fraude y registro de turnos.",
      description:
        "Gestiona al personal nocturno y de restaurante sin relojes biométricos costosos. Cada empleado ingresa desde su teléfono (/staff/asistencia) con su clave dinámica CK-XXXX para registrar entradas, salidas y pausas con verificación de presencia en el establecimiento.",
      features: [
        "Fichaje instantáneo en 3 segundos con clave dinámica CK-XXXX",
        "Verificación de presencia por geolocalización o red Wi-Fi del establecimiento",
        "Roles específicos: Mozos, Bartenders, Cocina, DJ, Seguridad y Encargados",
        "Reportes en tiempo real de quién está activo en el turno de la noche",
        "Cálculo automatizado de horas nocturnas y horas extra trabajadas",
        "Auditoría inmutable para evitar fichajes de favor entre compañeros",
      ],
      businessValue:
        "Elimina el ausentismo no detectado y los retrasos del personal en las horas de mayor afluencia. Facilita la liquidación de sueldos y jornales nocturnos sin planillas de papel.",
      stats: { label: "Tiempo de Fichaje", value: "< 3 Segundos" },
    },
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
      badge: "ANTI-MONOPOLIO",
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
      id: "accreditation-access",
      category: "events",
      title: "Acreditaciones & Control de Acceso QR (RedTicket Pro)",
      badge: "ALTA SEGURIDAD CRIPTO",
      badgeColor: "bg-emerald-950/80 text-emerald-300 border-emerald-800/60",
      accentColor: "from-emerald-600 to-teal-600",
      icon: Ticket,
      directHref: "/dashboard/accreditation",
      directLabel: "Ver Módulo de Acreditaciones",
      tagline: "Gestión masiva de boliches, conciertos y ferias con QR anti-fraude y modo offline.",
      description:
        "Inspirado en la potencia de RedTicket Pro pero 100% nativo en la nube de CYNKO. Permite emitir credenciales térmicas, etiquetas o PVC para miles de participantes por categorías (VIP, Prensa, Staff, General). Incluye escáner QR de puerta con cámara web/celular, validación en milisegundos, feedback sonoro y sincronización offline en IndexedDB.",
      features: [
        "Dashboard en tiempo real con aforo por puerta, sector y categoría",
        "Códigos QR únicos con firma criptográfica HMAC-SHA256 anti-clonación",
        "Escáner QR de alta velocidad con respuesta visual y tonos audibles",
        "Modo Offline Resiliente: valida localmente y sincroniza por lotes al reconectar",
        "Diseñador de credenciales e impresión térmica, PVC o A4 masiva",
        "Portal de auto-registro público (/accreditation/[code]/register)",
        "Despacho masivo por correo electrónico con credencial digital adjunta",
      ],
      businessValue:
        "Elimina las filas eternas en la entrada, previene el ingreso de colados o credenciales duplicadas y reduce en un 80% los costos de impresión física y logística.",
      stats: { label: "Velocidad de Escaneo", value: "< 0.2 Segundos" },
    },
    {
      id: "vip-reservations-decorations",
      category: "reservations",
      title: "Reservas de Camarotes VIP & Fotos de Decoración",
      badge: "ALTO VALOR COMERCIAL",
      badgeColor: "bg-pink-950/80 text-pink-300 border-pink-800/60",
      accentColor: "from-pink-600 to-purple-600",
      icon: PartyPopper,
      directHref: "/reservas",
      directLabel: "Ver Portal de Reservas",
      tagline: "Venta anticipada de mesas VIP y combos de cumpleaños con elección fotográfica de ambientación.",
      description:
        "Monetiza las noches de tu local días antes de abrir puertas. Los clientes eligen su paquete VIP (con 100% consumo acreditable en barra, alquiler limpio o combo cerrado de botellas) y seleccionan visualmente la decoración de su mesa viendo fotos reales del montaje.",
      features: [
        "Portal público mobile-first (/reservas) con selección por fecha y ocasión",
        "Galería interactiva de opciones de decoración con fotos reales en alta definición",
        "Modalidades: 100% Consumo Acreditable, Combo Cerrado o Alquiler Limpio",
        "Subida de foto del cumpleañero para proyección en Smart TV (/display)",
        "Pasarela para transferencias bancarias (SIPAP / PIX) y subida de comprobante",
        "Invitaciones por WhatsApp (/r/[inviteToken]): pases QR individuales por amigo",
        "Panel gerencial con aprobación de comprobantes en 1 clic",
      ],
      businessValue:
        "Asegura ingresos récord garantizados antes del fin de semana. Un camarote reservado con combo de cumpleaños garantiza entre $150 y $1.200 USD de facturación segura por mesa.",
      stats: { label: "Ingresos Anticipados", value: "100% Cobrado Antes" },
    },
    {
      id: "guest-qr",
      category: "gastro",
      title: "Portal Web Móvil Comensales (Zero App Install)",
      badge: "100% WEB NATIVO",
      badgeColor: "bg-emerald-950/80 text-emerald-300 border-emerald-800/60",
      accentColor: "from-emerald-600 to-green-600",
      icon: QrCode,
      directHref: "/guest",
      directLabel: "Ver Portal Comensal",
      tagline: "Cero fricción: el cliente escanea el QR en la mesa y accede en menos de 2 segundos.",
      description:
        "Tus clientes no tienen que descargar ninguna app de la tienda ni crear contraseñas. Con solo enfocar la cámara del celular al código QR de su mesa, ingresan al catálogo para pedir canciones, dejar dedicatorias, pedir platos, dar propinas al DJ y votar en concursos.",
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
      title: "Video Wall & Pantalla Gigante Smart TV 4K",
      badge: "4K READY",
      badgeColor: "bg-amber-950/80 text-amber-300 border-amber-800/60",
      accentColor: "from-amber-600 to-orange-600",
      icon: Tv,
      directHref: "/display/DEMO",
      directLabel: "Ver Pantalla en Vivo",
      tagline: "Convierte cualquier Smart TV o proyector en un canal de televisión interactivo.",
      description:
        "Diseñado específicamente para emitir a proyectores, pantallas LED y Smart TVs conectadas por HDMI o navegador web. Muestra visualizadores de audio reactivos de neón, letras de karaoke, anuncios de promociones del bar y fotos de homenajeados.",
      features: [
        "Interfaz ultra limpia sin bordes ni elementos de navegador",
        "Visualizador de audio reactivo con ondas y barras de ecualizador",
        "Cintillo inferior rotativo con promociones de la casa ('Happy Hour 2x1')",
        "Código QR dinámico en esquina para incentivar la participación continua",
        "Modo Karaoke con letras en tipografía gigante de alta legibilidad",
        "Modo Cumpleaños con foto del agasajado y felicitación en pantalla",
      ],
      businessValue:
        "Monetiza tus pantallas vendiendo espacios publicitarios a marcas patrocinadoras (cervezas, licores, eventos locales) además de promocionar los platos y tragos de mayor margen.",
      stats: { label: "Resolución", value: "Full HD & 4K" },
    },
    {
      id: "white-label-branding",
      category: "branding",
      title: "White-Label & Branding Total (PWA Propia)",
      badge: "MARCA PROPIA",
      badgeColor: "bg-purple-950/80 text-purple-300 border-purple-800/60",
      accentColor: "from-purple-600 via-pink-600 to-cyan-500",
      icon: Palette,
      directHref: "/dashboard/branding",
      directLabel: "Configurar Marca Blanca",
      tagline: "Convierte CYNKO en la aplicación oficial de tu local con tu propio logotipo, portada y colores.",
      description:
        "Tus comensales interactúan exclusivamente con la identidad de tu marca. El portal móvil, las pantallas gigantes de televisión, las reservas VIP y los tickets QR llevan el logo de tu empresa, tu banner de bienvenida y la paleta de iluminación neón de tu establecimiento.",
      features: [
        "Logotipo Oficial: 512 × 512 px o panorámico con fondo transparente",
        "Portada Móvil: 1200 × 400 px con zona segura central para celulares",
        "Fondo para Pantallas TV / Espera: 1920 × 1080 px Full HD",
        "Motor de Paletas Neón: Cyber Purple, Golden Luxury, Retro Synthwave, Emerald Speakeasy",
        "Multi-Sucursal: Personalización visual independiente para cada sucursal",
        "Portal PWA instalable sin tiendas con el nombre e icono de tu local",
      ],
      businessValue:
        "Genera estatus y pertenencia. Tu establecimiento proyecta una imagen de cadena internacional con software propio de alta gama sin pagar cientos de miles de dólares en desarrollo a medida.",
      stats: { label: "Personalización Visual", value: "100% White-Label" },
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
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Cabecera de la sección */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-950/60 border border-fuchsia-500/30 text-xs font-bold text-fuchsia-300 mb-3">
            <Layers className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Arquitectura Modular Integral</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Cada Componente Diseñado para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
              Multiplicar tu Negocio
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-300">
            Descubre en detalle cada una de las 12 herramientas integradas que hacen de CYNKO OS la plataforma líder para venues, discotecas y gastronomía.
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
                    ? "bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white shadow-lg shadow-fuchsia-900/40 scale-105"
                    : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selector de Módulos (Pestañas interactivas) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 mb-10">
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
                    {idx < 9 ? `0${idx + 1}` : `${idx + 1}`}
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
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white font-bold text-sm shadow-lg shadow-cyan-900/40 hover:scale-105 transition-all flex items-center gap-2 group cursor-pointer"
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
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-fuchsia-400 font-bold">
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
              <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br from-fuchsia-950/40 via-zinc-950 to-cyan-950/30 border border-fuchsia-500/30 space-y-5">
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
