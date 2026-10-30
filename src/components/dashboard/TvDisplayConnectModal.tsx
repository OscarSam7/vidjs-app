"use client";

import { useState, useEffect } from "react";
import {
  Tv,
  Smartphone,
  Monitor,
  Copy,
  Check,
  Share2,
  ExternalLink,
  X,
  Sparkles,
  Cast,
  Maximize2,
  Mic,
  QrCode,
  Laptop,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import QRCode from "qrcode";

interface TvDisplayConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventCode: string;
  eventName?: string;
  venueName?: string;
}

export default function TvDisplayConnectModal({
  isOpen,
  onClose,
  eventCode,
  eventName = "Noche de Karaoke",
  venueName = "Salón Principal",
}: TvDisplayConnectModalProps) {
  const [activeTab, setActiveTab] = useState<"mobile" | "pc-multi" | "stage">("mobile");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [displayUrl, setDisplayUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && eventCode) {
      const url = `${window.location.origin}/display/${eventCode.toUpperCase()}`;
      setDisplayUrl(url);

      QRCode.toDataURL(url, {
        width: 280,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      })
        .then((dataUrl) => setQrCodeDataUrl(dataUrl))
        .catch((err) => console.error("Error al generar QR de TV:", err));
    }
  }, [eventCode]);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    if (displayUrl) {
      navigator.clipboard.writeText(displayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareMobile = async () => {
    if (navigator.share && displayUrl) {
      try {
        await navigator.share({
          title: `Pantalla TV Karaoke - ${eventName}`,
          text: `Abre la pantalla pública del karaoke de ${venueName} en tu Smart TV:`,
          url: displayUrl,
        });
      } catch (err) {
        // Cancelado o no soportado
      }
    } else {
      handleCopyUrl();
    }
  };

  const handleOpenPopup = () => {
    if (typeof window !== "undefined" && displayUrl) {
      window.open(
        displayUrl,
        "VidjsTvDisplayScreen",
        "width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes"
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Conectar Pantalla TV & Multipantalla
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                  {eventCode}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Informa a los clientes en vivo: estado del karaoke, próximos turnos, QR de pedidos, fotos y aplausos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 border-b border-zinc-800 bg-zinc-900/40 text-xs font-bold">
          <button
            onClick={() => setActiveTab("mobile")}
            className={`py-3 px-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === "mobile"
                ? "border-cyan-400 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="truncate">Del Celular a Smart TV</span>
          </button>

          <button
            onClick={() => setActiveTab("pc-multi")}
            className={`py-3 px-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === "pc-multi"
                ? "border-cyan-400 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="truncate">3ra Pantalla en PC Karaoke</span>
          </button>

          <button
            onClick={() => setActiveTab("stage")}
            className={`py-3 px-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === "stage"
                ? "border-cyan-400 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="truncate">Monitor de Escenario</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-zinc-300 text-xs">
          {/* TAB 1: DESDE EL CELULAR A UN SMART TV */}
          {activeTab === "mobile" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-200 space-y-1">
                <div className="font-bold flex items-center gap-2 text-sm text-cyan-300">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>¿Para qué sirve la Pantalla TV?</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Es la pantalla de cara al público: muestra en tiempo real <strong>quién está cantando</strong>,{" "}
                  <strong>qué mesa sigue en turno</strong>, el <strong>código QR gigante</strong> para que los comensales
                  pidan canciones desde su mesa, y el muro interactivo de fotos y aplausómetro.
                </p>
              </div>

              {/* Método 1: En el Navegador del Smart TV (Recomendado) */}
              <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-white text-xs uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-black flex items-center justify-center text-[11px] font-black">
                      1
                    </span>
                    <span>Método Recomendado: Navegador del Smart TV (100% Estable)</span>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Cero lag &bull; Sin gastar batería
                  </span>
                </div>

                <p className="text-zinc-400 text-[11px]">
                  En el control remoto de tu Smart TV (Samsung, LG, Android TV, Google TV, Roku o Fire TV), abre la app{" "}
                  <strong className="text-white">Internet</strong> o <strong className="text-white">Navegador Web</strong>{" "}
                  e ingresa la siguiente dirección:
                </p>

                <div className="flex items-center gap-2 p-2 rounded-xl bg-black/60 border border-zinc-800">
                  <span className="font-mono text-[11px] text-cyan-300 truncate flex-1 pl-2 select-all">
                    {displayUrl || "Cargando URL..."}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleShareMobile}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-cyan-600/20"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Compartir Enlace por WhatsApp / Móvil</span>
                  </button>

                  <a
                    href={displayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Abrir TV</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Método 2: Transmisión Inalámbrica (Chromecast / Smart View / AirPlay) */}
              <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 font-bold text-white text-xs uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center text-[11px] font-black">
                    2
                  </span>
                  <span>Método Alternativo: Transmisión Inalámbrica (Cast / AirPlay)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Android / Chrome */}
                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <Cast className="w-4 h-4" />
                      <span>Android / Chromecast</span>
                    </div>
                    <ol className="text-[11px] text-zinc-400 list-decimal list-inside space-y-1">
                      <li>Abre el enlace de la TV en Google Chrome.</li>
                      <li>Toca el menú de tres puntos <strong className="text-white">(⋮)</strong>.</li>
                      <li>Selecciona <strong className="text-white">&ldquo;Transmitir...&rdquo;</strong> (Cast).</li>
                      <li>Elige tu Smart TV de la lista.</li>
                    </ol>
                  </div>

                  {/* iPhone / AirPlay */}
                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                      <Smartphone className="w-4 h-4" />
                      <span>iPhone / iPad (AirPlay)</span>
                    </div>
                    <ol className="text-[11px] text-zinc-400 list-decimal list-inside space-y-1">
                      <li>Abre el enlace de la TV en Safari.</li>
                      <li>Desliza el Centro de Control superior.</li>
                      <li>Toca <strong className="text-white">&ldquo;Duplicar pantalla&rdquo;</strong>.</li>
                      <li>Selecciona tu Smart TV (LG, Samsung, Roku, Apple TV).</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Código QR para escanear con la cámara del Smart TV o dispositivo */}
              {qrCodeDataUrl && (
                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center gap-4">
                  <div className="w-24 h-24 bg-white p-1 rounded-xl shrink-0 flex items-center justify-center shadow-lg">
                    <img src={qrCodeDataUrl} alt="QR TV" className="w-full h-full object-contain" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Escanear con otro celular o TV</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Si tu Smart TV o dispositivo de barra tiene cámara o app lectora de QR, apúntale directamente a este
                      código para abrir la pantalla automáticamente.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TERCERA PANTALLA DESDE LA COMPUTADORA DEL KARAOKE */}
          {activeTab === "pc-multi" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-purple-200 space-y-1">
                <div className="font-bold flex items-center gap-2 text-sm text-purple-300">
                  <Monitor className="w-4 h-4 text-purple-400" />
                  <span>Configuración de 3 Pantallas en Windows (Karaoke Pro)</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Para que tu show sea 100% profesional sin interrupciones, la computadora del karaoke maneja 3
                  pantallas independientes:
                </p>
              </div>

              {/* Diagrama de las 3 Pantallas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div className="font-black text-white text-xs">PANTALLA 1</div>
                  <div className="text-[10px] text-cyan-300 font-semibold">Tu Laptop / PC</div>
                  <p className="text-[10px] text-zinc-400">
                    Consola del Animador / KJ: llamados, rotación fair-play, sonido y colas.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div className="font-black text-white text-xs">PANTALLA 2</div>
                  <div className="text-[10px] text-amber-300 font-semibold">Monitor de Escenario</div>
                  <p className="text-[10px] text-zinc-400">
                    Puesto frente al cantante con la letra y pista de YouTube en pantalla completa.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900/90 border border-cyan-500/40 shadow-lg shadow-cyan-500/10 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500 text-black flex items-center justify-center mx-auto font-black">
                    <Tv className="w-4 h-4" />
                  </div>
                  <div className="font-black text-white text-xs">PANTALLA 3 (ESTA OPCIÓN)</div>
                  <div className="text-[10px] text-cyan-300 font-semibold">TV Pública de Clientes</div>
                  <p className="text-[10px] text-zinc-400">
                    TV del salón o proyector: desarrollo del karaoke, próximos turnos, QR, fotos y aplausos.
                  </p>
                </div>
              </div>

              {/* Pasos en Windows */}
              <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <div className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <span>Paso a Paso para Conectar en Windows</span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <strong className="text-white block">Conecta tu 3ra pantalla o proyector</strong>
                      <span className="text-zinc-400 text-[11px]">
                        Mediante cable HDMI, DisplayPort o adaptador USB a HDMI hacia la TV del salón.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <strong className="text-white block">
                        Presiona en tu teclado:{" "}
                        <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-cyan-300 font-mono">
                          Win + P
                        </kbd>
                      </strong>
                      <span className="text-zinc-400 text-[11px]">
                        En el menú que aparece en Windows a la derecha, selecciona{" "}
                        <strong className="text-white">&ldquo;Extender&rdquo;</strong> (nunca &ldquo;Duplicar&rdquo;).
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <strong className="text-white block">Lanza la ventana de la Pantalla TV</strong>
                      <span className="text-zinc-400 text-[11px]">
                        Haz clic en el botón de abajo para abrir la TV en una ventana limpia sin barras. Arrástrala a tu
                        3ra pantalla y presiona <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 font-mono">F11</kbd>.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleOpenPopup}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>🚀 Lanzar Pantalla TV de Clientes en Ventana Independiente</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MONITOR DE ESCENARIO PARA EL CANTANTE */}
          {activeTab === "stage" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-2 text-sm text-amber-300">
                  <Mic className="w-4 h-4 text-amber-400" />
                  <span>Monitor de Escenario (Pantalla 2 del Cantante)</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  El monitor de escenario está orientado exclusivamente al cantante en tarima con el video karaoke de
                  YouTube y la letra sincronizada en grande.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  ¿Cómo opera durante la noche?
                </h4>
                <ul className="text-zinc-400 text-[11px] space-y-2 list-disc list-inside">
                  <li>
                    Cuando seleccionas un tema en la consola del KJ, se carga automáticamente el video de YouTube con la
                    letra sincronizada.
                  </li>
                  <li>
                    Puedes proyectar este video en el monitor del cantante mientras la{" "}
                    <strong className="text-white">Pantalla TV (Tercer Monitor)</strong> sigue informando a las mesas
                    sobre los turnos, fotos y aplausos.
                  </li>
                  <li>
                    <strong>Audio:</strong> El audio sale por la salida de auriculares o interfaz de audio conectada a tu
                    consola o mixer de sonido.
                  </li>
                </ul>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenPopup}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Pantalla TV / Monitor</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Sincronización en vivo SSE (0 ms de retardo)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
