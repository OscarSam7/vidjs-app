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
  Zap
} from "lucide-react";

export function ShowcaseSandbox() {
  const [activeTab, setActiveTab] = useState<"dj" | "mobile" | "tv" | "contest">("dj");

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
            Interactúa con los 4 entornos reales del ecosistema sin salir de esta página. Cambia de pestaña y experimenta la fluidez.
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
        </div>
      </div>
    </section>
  );
}
