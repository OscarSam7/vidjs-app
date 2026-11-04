"use client";

import { useState } from "react";
import {
  Headphones,
  Smartphone,
  Tv,
  Award,
  Play,
  Pause,
  Sliders,
  Volume2,
  Mic,
  QrCode,
  Flame,
  Sparkles,
  Heart,
  Check,
  RotateCcw,
  Zap,
  Ticket,
  PartyPopper,
  Gift,
  ShieldCheck,
  WifiOff,
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  ScanLine,
  Share2,
  ExternalLink,
  ArrowRight,
  Upload,
} from "lucide-react";

export function ShowcaseSandbox() {
  const [activeTab, setActiveTab] = useState<
    "dj" | "mobile" | "tv" | "contest" | "accreditation" | "reservations"
  >("dj");

  // Estados interactivos para el simulador DJ
  const [isPlayingA, setIsPlayingA] = useState(true);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [crossfader, setCrossfader] = useState(50);
  const [bpmA, setBpmA] = useState(128);

  // Estados interactivos para el simulador Móvil
  const [guestVotes, setGuestVotes] = useState(5);
  const [selectedSong, setSelectedSong] = useState("Dua Lipa - Levitating");
  const [hasRequestedSong, setHasRequestedSong] = useState(false);

  // Estados interactivos para el simulador de Duelo
  const [votesP1, setVotesP1] = useState(142);
  const [votesP2, setVotesP2] = useState(118);
  const [userVoted, setUserVoted] = useState<"P1" | "P2" | null>(null);

  const totalVotes = votesP1 + votesP2;
  const pctP1 = Math.round((votesP1 / totalVotes) * 100);
  const pctP2 = 100 - pctP1;

  const handleCastSuperVote = (contestant: "P1" | "P2") => {
    if (contestant === "P1") {
      setVotesP1((prev) => prev + 5);
    } else {
      setVotesP2((prev) => prev + 5);
    }
    setUserVoted(contestant);
  };

  // Estados interactivos para el simulador de Acreditaciones & Scanner
  const [scanResult, setScanResult] = useState<{
    status: "SUCCESS" | "DENIED" | "WARNING" | null;
    participant: {
      name: string;
      doc: string;
      company: string;
      category: string;
      categoryColor: string;
      door: string;
      photoUrl: string;
      message: string;
    } | null;
  }>({
    status: "SUCCESS",
    participant: {
      name: "Lic. Valeria Duarte",
      doc: "3.840.129",
      company: "Google Cloud Partners",
      category: "VIP ACCESS",
      categoryColor: "bg-purple-600",
      door: "Acceso VIP & Backstage",
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop",
      message: "ACCESO AUTORIZADO • BIENVENIDO/A",
    },
  });
  const [isOfflineSim, setIsOfflineSim] = useState(false);
  const [offlineScansCount, setOfflineScansCount] = useState(14);

  // Estados interactivos para el simulador de Reservas & Cumpleaños con Fotos
  const [simPackage, setSimPackage] = useState<"COMBO" | "SALDO">("COMBO");
  const [simDecoIndex, setSimDecoIndex] = useState(0);
  const [simBirthdayName, setSimBirthdayName] = useState("Camila Insfrán");
  const [simBirthdayPhoto, setSimBirthdayPhoto] = useState(
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop"
  );
  const decoOptions = [
    {
      name: "Decoración Neón Glow con Globos Led",
      imageUrl: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop",
      extraPrice: 0,
      badge: "Más Popular",
    },
    {
      name: "Elegance Dorado & Negro (Champagne Vibes)",
      imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop",
      extraPrice: 0,
      badge: "Estilo Deluxe",
    },
    {
      name: "Glamour Rosa & Glitter VIP",
      imageUrl: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&auto=format&fit=crop",
      extraPrice: 100000,
      badge: "Premium VIP",
    },
  ];

  return (
    <section id="sandbox" className="py-24 bg-zinc-950 relative border-t border-zinc-900">
      {/* Luces sutiles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-r from-purple-900/10 via-cyan-900/10 to-transparent blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Encabezado */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-bold text-cyan-300 mb-3">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Simulador Interactivo en Vivo</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Prueba la Experiencia en Tiempo Real
          </h2>
          <p className="mt-3 text-base text-zinc-400">
            Interactúa con los 6 entornos reales del ecosistema sin salir de esta página. Cambia de pestaña y experimenta la fluidez.
          </p>

          {/* Selector de Entornos */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <button
              type="button"
              onClick={() => setActiveTab("dj")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "dj"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50 scale-105"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              <Headphones className="w-4 h-4" />
              <span>1. Cabina DJ Pro</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("mobile")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "mobile"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 scale-105"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>2. Celular del Comensal</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("tv")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "tv"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-900/50 scale-105"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>3. Pantalla TV Gigante</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("contest")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "contest"
                  ? "bg-pink-600 text-white shadow-lg shadow-pink-900/50 scale-105"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>4. Duelo & Super Votos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("accreditation")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "accreditation"
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-900/50 scale-105"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>5. Control de Acceso QR</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reservations")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "reservations"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-900/50 scale-105"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              <PartyPopper className="w-4 h-4" />
              <span>6. Reservas VIP & Fotos</span>
            </button>
          </div>
        </div>

        {/* Marco de Simulación */}
        <div className="max-w-5xl mx-auto rounded-3xl bg-zinc-900/80 border border-zinc-800 p-4 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* TAB 1: CABINA DJ */}
          {activeTab === "dj" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    Consola Virtual DJ 2.0 &bull; LIVE AUDIO ENGINE
                  </span>
                </div>
                <div className="text-xs font-mono text-zinc-400">
                  MASTER VOL: <span className="text-emerald-400 font-bold">0.0 dB</span>
                </div>
              </div>

              {/* Decks A y B */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* DECK A */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-purple-500/40 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-purple-950 border border-purple-500/50 text-[11px] font-black text-purple-300">
                      DECK A
                    </span>
                    <span className="text-[11px] font-mono text-amber-400 font-bold">
                      KEY: 8A / Am
                    </span>
                  </div>

                  <div className="font-bold text-white text-sm truncate">
                    Bizarrap & Quevedo - Music Sessions #52
                  </div>
                  <div className="text-xs text-purple-300 mb-3">BPM: {bpmA}</div>

                  {/* Visualizador de Ondas Simulado */}
                  <div className="h-12 bg-zinc-900 rounded-lg flex items-center justify-center gap-1 px-3 mb-4 overflow-hidden">
                    {[40, 70, 90, 50, 80, 100, 60, 45, 85, 95, 30, 65, 75, 55, 90, 40].map(
                      (h, i) => (
                        <div
                          key={i}
                          className={`w-1.5 rounded-full transition-all duration-300 ${
                            isPlayingA ? "bg-purple-500 animate-pulse" : "bg-zinc-700"
                          }`}
                          style={{
                            height: isPlayingA ? `${h}%` : "15%",
                            animationDelay: `${i * 60}ms`,
                          }}
                        />
                      )
                    )}
                  </div>

                  {/* Controles Deck A */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPlayingA(!isPlayingA)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isPlayingA
                          ? "bg-purple-600 text-white"
                          : "bg-zinc-800 text-zinc-300 hover:text-white"
                      }`}
                    >
                      {isPlayingA ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isPlayingA ? "PAUSAR" : "REPRODUCIR"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBpmA((b) => (b === 128 ? 130 : 128))}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono cursor-pointer"
                    >
                      BPM SYNC
                    </button>
                  </div>
                </div>

                {/* DECK B */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-cyan-500/40 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 border border-cyan-500/50 text-[11px] font-black text-cyan-300">
                      DECK B
                    </span>
                    <span className="text-[11px] font-mono text-amber-400 font-bold">
                      KEY: 9A / Em
                    </span>
                  </div>

                  <div className="font-bold text-white text-sm truncate">
                    Tiësto - The Business (Extended Mix)
                  </div>
                  <div className="text-xs text-cyan-300 mb-3">BPM: 124</div>

                  {/* Visualizador de Ondas Simulado */}
                  <div className="h-12 bg-zinc-900 rounded-lg flex items-center justify-center gap-1 px-3 mb-4 overflow-hidden">
                    {[50, 40, 65, 85, 30, 90, 70, 60, 100, 45, 80, 55, 75, 95, 40, 60].map(
                      (h, i) => (
                        <div
                          key={i}
                          className={`w-1.5 rounded-full transition-all duration-300 ${
                            isPlayingB ? "bg-cyan-500 animate-pulse" : "bg-zinc-700"
                          }`}
                          style={{
                            height: isPlayingB ? `${h}%` : "15%",
                            animationDelay: `${i * 60}ms`,
                          }}
                        />
                      )
                    )}
                  </div>

                  {/* Controles Deck B */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPlayingB(!isPlayingB)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isPlayingB
                          ? "bg-cyan-600 text-white"
                          : "bg-zinc-800 text-zinc-300 hover:text-white"
                      }`}
                    >
                      {isPlayingB ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isPlayingB ? "PAUSAR" : "REPRODUCIR"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPlayingA(false);
                        setIsPlayingB(true);
                        setCrossfader(100);
                      }}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono cursor-pointer"
                    >
                      TRANSICIÓN AUTOMÁTICA
                    </button>
                  </div>
                </div>
              </div>

              {/* Crossfader Central Interactivo */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 max-w-lg mx-auto text-center space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-400">
                  <span className="text-purple-400">DECK A ({100 - crossfader}%)</span>
                  <span>CROSSFADER ANALÓGICO</span>
                  <span className="text-cyan-400">DECK B ({crossfader}%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={crossfader}
                  onChange={(e) => setCrossfader(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none"
                />
                <div className="flex justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCrossfader(0)}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                  >
                    100% Deck A
                  </button>
                  <button
                    type="button"
                    onClick={() => setCrossfader(50)}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                  >
                    Centro 50/50
                  </button>
                  <button
                    type="button"
                    onClick={() => setCrossfader(100)}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                  >
                    100% Deck B
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CELULAR DEL COMENSAL */}
          {activeTab === "mobile" && (
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              {/* Mockup de Celular */}
              <div className="w-[300px] h-[520px] rounded-[40px] bg-black border-4 border-zinc-700 shadow-2xl p-4 flex flex-col justify-between relative overflow-hidden ring-1 ring-zinc-500/20">
                {/* Notch / Dynamic Island */}
                <div className="w-24 h-4 bg-zinc-800 rounded-full mx-auto mb-2 shrink-0" />

                <div className="flex-1 flex flex-col space-y-3 overflow-y-auto pr-1">
                  {/* Identificación de Mesa y Consumo */}
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/80 to-zinc-900 border border-emerald-500/40 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-emerald-300">
                        📍 MESA 08 &bull; SECTOR TERRAZA
                      </span>
                      <span className="text-[10px] font-mono bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-200 font-bold">
                        ACTIVA
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-300 mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Consumo verificado: $48.500</span>
                    </div>
                    <div className="text-[10px] text-amber-300 font-bold mt-0.5">
                      ⭐ Super Votos Habilitados: x5
                    </div>
                  </div>

                  {/* Buscador de Pista */}
                  <div className="text-left space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400">
                      Pide tu canción al DJ:
                    </label>
                    <input
                      type="text"
                      value={selectedSong}
                      onChange={(e) => setSelectedSong(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                    />
                  </div>

                  {/* Botón de Enviar Pedido */}
                  <button
                    type="button"
                    onClick={() => setHasRequestedSong(true)}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    {hasRequestedSong ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>¡Pedido Enviado al DJ!</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        <span>Enviar Petición a Cabina</span>
                      </>
                    )}
                  </button>

                  {/* Votación de Concurso en Curso */}
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-purple-500/30 text-left space-y-2">
                    <div className="text-[10px] font-bold text-purple-300 uppercase flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      <span>Votación de Concurso Activa</span>
                    </div>
                    <div className="text-xs font-bold text-white">
                      Sofía (Mesa 04) - &quot;Como La Flor&quot;
                    </div>

                    <button
                      type="button"
                      onClick={() => setGuestVotes((v) => v + 5)}
                      className="w-full py-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-300" />
                      <span>Emitir Super Voto (x5 Votos)</span>
                    </button>
                    <div className="text-[9px] text-zinc-400 text-center font-mono">
                      Votos aportados por tu mesa: <span className="text-amber-400 font-bold">{guestVotes}</span>
                    </div>
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="w-20 h-1 bg-zinc-600 rounded-full mx-auto mt-2 shrink-0" />
              </div>

              {/* Explicación de Ventajas para el Negocio */}
              <div className="max-w-md text-left space-y-4">
                <span className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-xs font-mono font-bold text-emerald-300">
                  CERO FRICCIÓN &bull; 100% WEB
                </span>
                <h3 className="text-2xl font-black text-white">
                  El Teléfono del Cliente se Convierte en su Control Remoto de Entretenimiento
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  No hay que pedirles que vayan a la App Store ni que gasten sus datos móviles descargando una app que borrarán mañana.
                </p>
                <div className="space-y-2 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>El consumo mínimo se valida en segundos desde la caja o barra.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>El cliente ve el estado de su pedido en tiempo real.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Incentiva la competencia entre mesas por hacer ganar a su amigo.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PANTALLA TV GIGANTE */}
          {activeTab === "tv" && (
            <div className="space-y-4 text-left">
              {/* TV Bezel */}
              <div className="rounded-2xl bg-black border-4 border-zinc-800 shadow-2xl p-6 relative overflow-hidden aspect-video flex flex-col justify-between">
                {/* Cabecera TV */}
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-xs font-mono font-bold text-white tracking-widest uppercase">
                      RETRO BAR &bull; LIVE ENTERTAINMENT TV
                    </span>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-red-600 text-white font-black text-xs uppercase animate-pulse">
                    EN VIVO
                  </div>
                </div>

                {/* Centro: Now Playing + Animación */}
                <div className="text-center space-y-2 z-10 my-auto">
                  <div className="inline-block px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-700 text-xs font-mono text-cyan-300 font-bold">
                    🎤 KARAOKE &bull; CANTA Y LIBERA
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-black text-white drop-shadow-md">
                    &quot;De Música Ligera&quot; - Soda Stereo
                  </h2>
                  <p className="text-sm font-semibold text-purple-300">
                    Al Micrófono: Carlos &bull; Mesa 03 &bull; &ldquo;Dedicado para Laura en su cumpleaños&rdquo;
                  </p>
                </div>

                {/* Pie de Pantalla TV: Cintillo de Sponsor + QR */}
                <div className="flex items-end justify-between gap-4 z-10 pt-4 border-t border-zinc-800">
                  <div className="bg-zinc-900/90 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs text-amber-300 font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>PROMO DE LA NOCHE: 2x1 en Cerveza Corona y Fernet hasta las 00:30hs</span>
                  </div>

                  <div className="flex items-center gap-2 bg-zinc-950/90 border border-cyan-500/50 p-2 rounded-xl shrink-0">
                    <QrCode className="w-10 h-10 text-white" />
                    <div className="text-[10px] font-mono text-zinc-300 font-bold leading-tight">
                      ESCANEA TU MESA<br />
                      <span className="text-cyan-400">PIDE TU CANCIÓN</span>
                    </div>
                  </div>
                </div>

                {/* Visualizador de fondo */}
                <div className="absolute inset-0 bg-gradient-to-t from-purple-950/40 via-transparent to-black pointer-events-none" />
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400 pt-2">
                <span>Resolución nativa: 1920x1080 Full HD & 4K Ultra HD</span>
                <span className="text-amber-400 font-bold">Se proyecta con un cable HDMI o navegador en Smart TV</span>
              </div>
            </div>
          )}

          {/* TAB 4: DUELO & SUPER VOTOS */}
          {activeTab === "contest" && (
            <div className="space-y-6 text-left">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-pink-400" />
                  <span className="text-sm font-black text-white uppercase">
                    DUELO DE CANTO &bull; FINAL SEMANAL
                  </span>
                </div>
                <div className="text-xs font-mono text-amber-400 font-bold">
                  PREMIO: $100.000 EN CONSUMICIONES
                </div>
              </div>

              {/* Marcador Duelo 1 vs 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Participante 1 */}
                <div
                  className={`p-5 rounded-2xl border transition-all ${
                    userVoted === "P1"
                      ? "bg-purple-950/50 border-purple-500 ring-2 ring-purple-500/40"
                      : "bg-zinc-950 border-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded bg-purple-900/60 text-purple-300 text-xs font-black">
                      MESA 04
                    </span>
                    <span className="text-2xl font-black text-white">{pctP1}%</span>
                  </div>
                  <h4 className="text-lg font-black text-white">Sofía Navarro</h4>
                  <p className="text-xs text-zinc-400 mb-4">&quot;Como La Flor&quot; - Selena</p>

                  <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden mb-4">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500"
                      style={{ width: `${pctP1}%` }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCastSuperVote("P1")}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Flame className="w-4 h-4 text-amber-300" />
                    <span>SUPER VOTO x5 (+5 Votos)</span>
                  </button>
                </div>

                {/* Participante 2 */}
                <div
                  className={`p-5 rounded-2xl border transition-all ${
                    userVoted === "P2"
                      ? "bg-cyan-950/50 border-cyan-500 ring-2 ring-cyan-500/40"
                      : "bg-zinc-950 border-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 text-xs font-black">
                      MESA 11
                    </span>
                    <span className="text-2xl font-black text-white">{pctP2}%</span>
                  </div>
                  <h4 className="text-lg font-black text-white">Martín &quot;El Ruso&quot;</h4>
                  <p className="text-xs text-zinc-400 mb-4">&quot;Persiana Americana&quot; - Soda</p>

                  <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden mb-4">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500"
                      style={{ width: `${pctP2}%` }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCastSuperVote("P2")}
                    className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Flame className="w-4 h-4 text-amber-300" />
                    <span>SUPER VOTO x5 (+5 Votos)</span>
                  </button>
                </div>
              </div>

              {/* Botón reset simulación */}
              <div className="flex justify-between items-center text-xs text-zinc-400 pt-2">
                <span>Votos totales emitidos en la simulación: {totalVotes}</span>
                <button
                  type="button"
                  onClick={() => {
                    setVotesP1(142);
                    setVotesP2(118);
                    setUserVoted(null);
                  }}
                  className="flex items-center gap-1 text-zinc-500 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reiniciar Votos</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: SIMULADOR DE CONTROL DE ACCESO QR & ESCÁNER       */}
          {/* ======================================================== */}
          {activeTab === "accreditation" && (
            <div className="space-y-6">
              {/* Barra superior de estado de terminal */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                    <ScanLine className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span>Terminal de Acceso Inteligente (RedTicket Pro)</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950/80 text-teal-300 border border-teal-800/60 font-bold">
                        T-01 • PUERTA NORTE VIP
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Criptografía HMAC-SHA256 en tiempo real • Latencia de lectura: 0.18s
                    </p>
                  </div>
                </div>

                {/* Toggle Modo Offline Resiliente */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOfflineSim(!isOfflineSim)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                      isOfflineSim
                        ? "bg-amber-950/60 border-amber-500/60 text-amber-300 shadow-md shadow-amber-950/40"
                        : "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                    }`}
                  >
                    {isOfflineSim ? (
                      <>
                        <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                        <span>Modo Offline Resiliente (IndexedDB Activo • {offlineScansCount} en cola)</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>Online Sincronizado en Tiempo Real</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Botones de simulación de escenarios de escaneo */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-zinc-400 mr-1">Disparar Escaneo:</span>
                <button
                  type="button"
                  onClick={() =>
                    setScanResult({
                      status: "SUCCESS",
                      participant: {
                        name: "Lic. Valeria Duarte",
                        doc: "3.840.129",
                        company: "Google Cloud Partners",
                        category: "VIP ACCESS",
                        categoryColor: "bg-purple-600",
                        door: "Acceso VIP & Backstage",
                        photoUrl:
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop",
                        message: "ACCESO AUTORIZADO • BIENVENIDO/A",
                      },
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-200 hover:text-white border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>1. Pase VIP Autorizado</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setScanResult({
                      status: "SUCCESS",
                      participant: {
                        name: "Mateo Benítez",
                        doc: "4.120.908",
                        company: "Revista Asunción Beat",
                        category: "PRENSA & MEDIOS",
                        categoryColor: "bg-teal-600",
                        door: "Acceso VIP & Backstage",
                        photoUrl:
                          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop",
                        message: "ACCESO AUTORIZADO • ACREDITACIÓN DE PRENSA",
                      },
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-200 hover:text-white border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-teal-400" />
                  <span>2. Credencial Prensa</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setScanResult({
                      status: "DENIED",
                      participant: {
                        name: "Carlos Giménez",
                        doc: "5.029.114",
                        company: "Entrada General",
                        category: "GENERAL TIER 1",
                        categoryColor: "bg-zinc-700",
                        door: "Puerta Principal",
                        photoUrl:
                          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop",
                        message: "DENEGADO • CREDENCIAL YA REGISTRADA A LAS 22:41 HS (PUERTA SUR)",
                      },
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-200 hover:text-white border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>3. Intento de Fraude (Ya Usada)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setScanResult({
                      status: "WARNING",
                      participant: {
                        name: "Sofía Ramírez",
                        doc: "4.992.831",
                        company: "Entrada Pista",
                        category: "GENERAL PISTA",
                        categoryColor: "bg-amber-600",
                        door: "Sector VIP",
                        photoUrl:
                          "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop",
                        message: "SECTOR INCORRECTO • ESTA ENTRADA CORRESPONDE A PUERTA B (PISTA)",
                      },
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-200 hover:text-white border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>4. Sector Incorrecto</span>
                </button>
              </div>

              {/* Grid principal: Cámara / Escáner + Credencial validada */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna Izquierda: Viewport de Cámara del Escáner */}
                <div className="relative rounded-2xl bg-black border border-zinc-800 p-5 flex flex-col justify-between overflow-hidden min-h-[300px]">
                  {/* Grid de mira óptica */}
                  <div className="absolute inset-0 bg-[radial-gradient(#14b8a615_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                  {/* Header de visor */}
                  <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span className="flex items-center gap-1.5 text-teal-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                      LENTE ACTIVO • 60 FPS
                    </span>
                    <span className="text-zinc-500">ISO 400 • EXP AUTO</span>
                  </div>

                  {/* Cuadro de enfoque de QR con animación láser */}
                  <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                    <div className="relative w-44 h-44 rounded-2xl border-2 border-teal-500/50 p-2 flex items-center justify-center bg-teal-950/20 backdrop-blur-sm">
                      {/* Esquinas del visor */}
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-teal-400" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-teal-400" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-teal-400" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-teal-400" />

                      {/* Línea láser de barrido */}
                      <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_12px_#14b8a6] animate-pulse" />

                      {/* Mockup del QR en el centro */}
                      <div className="w-28 h-28 bg-white p-2 rounded-xl flex items-center justify-center shadow-lg">
                        <QrCode className="w-24 h-24 text-zinc-950" />
                      </div>
                    </div>
                    <span className="mt-3 text-[11px] font-mono text-teal-300 font-bold tracking-wider">
                      HMAC-SHA256: 8f9b...a10e VALIDADO
                    </span>
                  </div>

                  {/* Footer visor */}
                  <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-900">
                    <span>AUDIO FEEDBACK: ACTIVO</span>
                    <span>SINCRONIZACIÓN: 0.18s</span>
                  </div>
                </div>

                {/* Columna Derecha: Tarjeta de Validación de Credencial */}
                {scanResult.status === "SUCCESS" && scanResult.participant && (
                  <div className="p-6 rounded-2xl bg-gradient-to-b from-teal-950/40 via-zinc-900 to-zinc-950 border-2 border-emerald-500/80 shadow-2xl shadow-emerald-950/50 flex flex-col justify-between">
                    <div>
                      {/* Badge de resultado */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs font-black">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>{scanResult.participant.message}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">0.18s OK</span>
                      </div>

                      {/* Datos del participante */}
                      <div className="flex items-center gap-4 mb-5">
                        <img
                          src={scanResult.participant.photoUrl}
                          alt={scanResult.participant.name}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-400/60 shadow-md"
                        />
                        <div>
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black text-white uppercase tracking-wider mb-1 ${scanResult.participant.categoryColor}`}
                          >
                            {scanResult.participant.category}
                          </span>
                          <h4 className="text-xl font-black text-white leading-tight">
                            {scanResult.participant.name}
                          </h4>
                          <p className="text-xs text-zinc-400">
                            Doc: {scanResult.participant.doc} • {scanResult.participant.company}
                          </p>
                        </div>
                      </div>

                      {/* Detalles de Puerta y Matriz */}
                      <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 text-xs font-mono mb-4">
                        <div>
                          <span className="text-zinc-500 block text-[10px]">PUERTA ASIGNADA</span>
                          <span className="text-white font-bold">{scanResult.participant.door}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">TIPO DE REGISTRO</span>
                          <span className="text-emerald-400 font-bold">ACCESO CONCEDIDO (1er INGRESO)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Firma Criptográfica Verificada</span>
                      </span>
                      <a
                        href="/dashboard/accreditation"
                        className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 text-xs"
                      >
                        <span>Abrir Escáner Real</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}

                {scanResult.status === "DENIED" && scanResult.participant && (
                  <div className="p-6 rounded-2xl bg-gradient-to-b from-rose-950/40 via-zinc-900 to-zinc-950 border-2 border-rose-500/80 shadow-2xl shadow-rose-950/50 flex flex-col justify-between">
                    <div>
                      {/* Badge de resultado */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 text-xs font-black">
                          <XCircle className="w-4 h-4 text-rose-400 animate-pulse" />
                          <span>ACCESO DENEGADO / CÓDIGO REPETIDO</span>
                        </div>
                        <span className="text-[10px] font-mono text-rose-400 font-bold">ALERTA FRAUDE</span>
                      </div>

                      {/* Datos del participante bloqueado */}
                      <div className="flex items-center gap-4 mb-5">
                        <img
                          src={scanResult.participant.photoUrl}
                          alt={scanResult.participant.name}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-500/60 grayscale opacity-80"
                        />
                        <div>
                          <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-black text-white uppercase tracking-wider mb-1 bg-rose-900/80">
                            BLOQUEO POR DUPLICADO
                          </span>
                          <h4 className="text-xl font-black text-white leading-tight">
                            {scanResult.participant.name}
                          </h4>
                          <p className="text-xs text-zinc-400">
                            Doc: {scanResult.participant.doc} • {scanResult.participant.company}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-xs text-rose-200 mb-4 font-mono leading-relaxed">
                        ⚠️ {scanResult.participant.message}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-400">
                      <span className="text-rose-400 font-bold">Anti-Duplicación VIDJS PRO Activo</span>
                      <button
                        type="button"
                        onClick={() =>
                          setScanResult({
                            status: "SUCCESS",
                            participant: {
                              name: "Lic. Valeria Duarte",
                              doc: "3.840.129",
                              company: "Google Cloud Partners",
                              category: "VIP ACCESS",
                              categoryColor: "bg-purple-600",
                              door: "Acceso VIP & Backstage",
                              photoUrl:
                                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop",
                              message: "ACCESO AUTORIZADO • BIENVENIDO/A",
                            },
                          })
                        }
                        className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        Reiniciar
                      </button>
                    </div>
                  </div>
                )}

                {scanResult.status === "WARNING" && scanResult.participant && (
                  <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-950/40 via-zinc-900 to-zinc-950 border-2 border-amber-500/80 shadow-2xl shadow-amber-950/50 flex flex-col justify-between">
                    <div>
                      {/* Badge de resultado */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-xs font-black">
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <span>PUERTA INCORRECTA</span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-400 font-bold">RE-DIRECCIÓN</span>
                      </div>

                      {/* Datos del participante */}
                      <div className="flex items-center gap-4 mb-5">
                        <img
                          src={scanResult.participant.photoUrl}
                          alt={scanResult.participant.name}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/60"
                        />
                        <div>
                          <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-black text-white uppercase tracking-wider mb-1 bg-amber-800">
                            SECTOR GENERAL
                          </span>
                          <h4 className="text-xl font-black text-white leading-tight">
                            {scanResult.participant.name}
                          </h4>
                          <p className="text-xs text-zinc-400">
                            Doc: {scanResult.participant.doc} • {scanResult.participant.company}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-800/80 text-xs text-amber-200 mb-4 font-mono leading-relaxed">
                        📍 {scanResult.participant.message}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-400">
                      <span className="text-amber-400 font-bold">Matriz de Puertas Automatizada</span>
                      <button
                        type="button"
                        onClick={() =>
                          setScanResult({
                            status: "SUCCESS",
                            participant: {
                              name: "Lic. Valeria Duarte",
                              doc: "3.840.129",
                              company: "Google Cloud Partners",
                              category: "VIP ACCESS",
                              categoryColor: "bg-purple-600",
                              door: "Acceso VIP & Backstage",
                              photoUrl:
                                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop",
                              message: "ACCESO AUTORIZADO • BIENVENIDO/A",
                            },
                          })
                        }
                        className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        Reiniciar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: SIMULADOR DE RESERVAS VIP & FOTOS DE DECORACIÓN   */}
          {/* ======================================================== */}
          {activeTab === "reservations" && (
            <div className="space-y-6">
              {/* Barra superior de configuración de reserva */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                    <PartyPopper className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span>Portal de Reservas VIP & Cumpleaños con Fotos</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60 font-bold">
                        SIN BUROCRACIA • SIPAP / PIX
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      El cliente ve fotos reales de la ambientación antes de pagar su reserva anticipada
                    </p>
                  </div>
                </div>

                {/* Switcher de Modalidad de Cobro */}
                <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setSimPackage("COMBO")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      simPackage === "COMBO"
                        ? "bg-rose-600 text-white shadow-md shadow-rose-900/50"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    🎉 Combo Cumpleaños VIP
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimPackage("SALDO")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      simPackage === "SALDO"
                        ? "bg-purple-600 text-white shadow-md shadow-purple-900/50"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    🍾 100% Saldo en Barra
                  </button>
                </div>
              </div>

              {/* Selector interactivo de Fotos de Decoración */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-black uppercase text-zinc-300 tracking-wider">
                      1. Galería de Decoraciones Reales (Haz clic para seleccionar)
                    </span>
                  </div>
                  <span className="text-xs text-rose-400 font-bold">
                    Opción activa: {decoOptions[simDecoIndex].name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {decoOptions.map((deco, idx) => {
                    const isSelected = simDecoIndex === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSimDecoIndex(idx)}
                        className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all group ${
                          isSelected
                            ? "border-rose-500 ring-2 ring-rose-500/50 scale-[1.02] shadow-xl shadow-rose-950/50"
                            : "border-zinc-800 hover:border-zinc-700 opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div className="relative h-32 w-full overflow-hidden">
                          <img
                            src={deco.imageUrl}
                            alt={deco.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                          {/* Badge de tipo */}
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-black text-rose-300 border border-rose-500/30">
                            {deco.badge}
                          </span>

                          {isSelected && (
                            <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        <div className="p-3 bg-zinc-950">
                          <h4 className="text-xs font-black text-white line-clamp-1">{deco.name}</h4>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            {deco.extraPrice > 0
                              ? `+ Gs. ${deco.extraPrice.toLocaleString()} (Upgrade)`
                              : "Incluido en el Paquete"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grid 2 Columnas: Homenaje en TV + Invitación Viral WhatsApp */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Columna 1: Vista Previa en Pantalla TV de la Discoteca */}
                <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Tv className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-black text-white uppercase tracking-wider">
                          Proyección en TV Gigante (/display)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">CANAL 01 • FULL HD</span>
                    </div>

                    {/* Simulación del frame de TV */}
                    <div className="relative rounded-xl overflow-hidden border border-amber-500/40 bg-gradient-to-br from-purple-950 via-zinc-900 to-rose-950 p-4 text-center shadow-inner">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-black mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                        <span>¡CELEBRACIÓN ESPECIAL EN VIVO!</span>
                      </div>

                      <div className="flex items-center justify-center gap-3 my-2">
                        <img
                          src={simBirthdayPhoto}
                          alt={simBirthdayName}
                          className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-lg ring-4 ring-purple-500/30"
                        />
                        <div className="text-left">
                          <h4 className="text-lg font-black text-white tracking-wide">
                            {simBirthdayName}
                          </h4>
                          <p className="text-xs text-rose-300 font-bold">
                            🎂 Mesa VIP Camarote 04 • Cumpleaños
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            Decoración: {decoOptions[simDecoIndex].name}
                          </p>
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-300 italic mt-2">
                        &quot;¡Brindis con champagne y fuegos fríos en cabina!&quot;
                      </p>
                    </div>

                    {/* Input rápido para cambiar el nombre en la demo */}
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-[11px] text-zinc-400 shrink-0 font-medium">
                        Nombre Cumpleañero/a:
                      </label>
                      <input
                        type="text"
                        value={simBirthdayName}
                        onChange={(e) => setSimBirthdayName(e.target.value)}
                        className="w-full px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-rose-500"
                        placeholder="Ej. Camila Insfrán"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-900 flex justify-between items-center text-[11px] text-zinc-400">
                    <span>Transmisión automática al momento del brindis</span>
                    <span className="text-amber-400 font-bold">100% Sincronizado</span>
                  </div>
                </div>

                {/* Columna 2: Invitaciones Virales por WhatsApp & Pases QR */}
                <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-black text-white uppercase tracking-wider">
                          Invitaciones Virales & Pases WhatsApp
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        8 PASES QR INCLUIDOS
                      </span>
                    </div>

                    {/* Mensaje de WhatsApp simulado */}
                    <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                        <span>💬 Mensaje generado para compartir a tus amigos:</span>
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed font-sans bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                        &quot;¡Hola! Festejo mi cumple este sábado en <strong>VIDJSPRO Club</strong> 🎉. 
                        Estás en mi lista VIP con pase directo. Genera tu QR individual aquí:{" "}
                        <span className="text-cyan-400 underline">vidjs.com/r/cumple-camila-x9a</span>&quot;
                      </p>
                    </div>

                    {/* Verificación de Comprobante SIPAP */}
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-zinc-400 block text-[10px]">PAGO POR TRANSFERENCIA</span>
                        <span className="text-white font-bold font-mono">SIPAP Continental #849201</span>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-black">
                        COMPROBANTE VERIFICADO
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-900 flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Cada amigo genera su pase individual</span>
                    <a
                      href="/reservas"
                      className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
                    >
                      <span>Abrir Portal de Reservas</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
