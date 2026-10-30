"use client";

import { useState, useEffect } from "react";
import {
  Radio,
  X,
  Copy,
  Check,
  Zap,
  Download,
  Terminal,
  ExternalLink,
  Laptop,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

interface DjBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventCode?: string;
  eventId?: string;
  onSynced?: () => void;
}

interface BridgeInfo {
  token: string;
  playlistM3uUrl: string;
  syncWebhookUrl: string;
  stats: {
    queuedTracks: number;
    pendingRequests: number;
  };
}

export default function DjBridgeModal({
  isOpen,
  onClose,
  eventCode,
  eventId,
  onSynced,
}: DjBridgeModalProps) {
  const [loading, setLoading] = useState(false);
  const [bridgeData, setBridgeData] = useState<BridgeInfo | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [testSyncLoading, setTestSyncLoading] = useState(false);
  const [testSyncSuccess, setTestSyncSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"virtualdj" | "rekordbox" | "webhook">("virtualdj");

  useEffect(() => {
    if (!isOpen) return;

    const fetchBridgeInfo = async () => {
      setLoading(true);
      try {
        const url = eventId
          ? `/api/v1/dj/bridge?eventId=${eventId}`
          : "/api/v1/dj/bridge";
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.data?.bridge) {
            setBridgeData(json.data.bridge);
          }
        }
      } catch (err) {
        console.error("Error fetching bridge info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBridgeInfo();
  }, [isOpen, eventId]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSimulateSync = async () => {
    if (!eventCode || !bridgeData) return;
    setTestSyncLoading(true);
    setTestSyncSuccess(false);

    try {
      const res = await fetch("/api/v1/dj/bridge/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCode: eventCode,
          token: bridgeData.token,
          action: "HEARTBEAT",
        }),
      });

      if (res.ok) {
        setTestSyncSuccess(true);
        if (onSynced) onSynced();
        setTimeout(() => setTestSyncSuccess(false), 4000);
      }
    } catch (err) {
      console.error("Error simulando sync:", err);
    } finally {
      setTestSyncLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">
                  DJ Bridge Desktop Sync
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  V1.0 PRO
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Conecta tu software de DJ profesional con la cola de Vidjs en tiempo real
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

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-500" />
              <p className="text-xs">Cargando credenciales de enlace...</p>
            </div>
          ) : bridgeData ? (
            <>
              {/* Credentials Card */}
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3.5">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-purple-400 block mb-1">
                    URL de Playlist M3U8 Dinámica (VirtualDJ / Rekordbox)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={bridgeData.playlistM3uUrl}
                      className="flex-1 bg-black/70 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 select-all"
                    />
                    <button
                      onClick={() =>
                        copyToClipboard(bridgeData.playlistM3uUrl, "m3u")
                      }
                      className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                    >
                      {copiedField === "m3u" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                    <a
                      href={bridgeData.playlistM3uUrl}
                      download={`vidjs-${eventCode?.toLowerCase() || "live"}.m3u8`}
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center cursor-pointer transition-colors shrink-0"
                      title="Descargar archivo M3U8"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/60">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                      Bridge Auth Token
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={bridgeData.token}
                        className="w-full bg-black/60 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300"
                      />
                      <button
                        onClick={() => copyToClipboard(bridgeData.token, "token")}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                      >
                        {copiedField === "token" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                      Webhook de Sincronización
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={bridgeData.syncWebhookUrl}
                        className="w-full bg-black/60 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-400 truncate"
                      />
                      <button
                        onClick={() =>
                          copyToClipboard(bridgeData.syncWebhookUrl, "webhook")
                        }
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                      >
                        {copiedField === "webhook" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guía de Integración por Software */}
              <div className="space-y-3">
                <div className="flex border-b border-zinc-800 text-xs font-bold">
                  <button
                    onClick={() => setActiveTab("virtualdj")}
                    className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                      activeTab === "virtualdj"
                        ? "border-purple-500 text-purple-300"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    VirtualDJ
                  </button>
                  <button
                    onClick={() => setActiveTab("rekordbox")}
                    className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                      activeTab === "rekordbox"
                        ? "border-purple-500 text-purple-300"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Pioneer Rekordbox / Serato
                  </button>
                  <button
                    onClick={() => setActiveTab("webhook")}
                    className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                      activeTab === "webhook"
                        ? "border-purple-500 text-purple-300"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Webhook Automático (OBS / Scripts)
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed">
                  {activeTab === "virtualdj" && (
                    <div className="space-y-2">
                      <p className="font-semibold text-white">
                        Conectar con VirtualDJ 2024 / 2025:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-[11px]">
                        <li>
                          En VirtualDJ, ve al panel izquierdo de{" "}
                          <strong className="text-zinc-200">Listas de reproducción (Playlists)</strong>.
                        </li>
                        <li>
                          Haz clic derecho &rarr;{" "}
                          <strong className="text-zinc-200">Añadir lista en línea (M3U URL)</strong>.
                        </li>
                        <li>
                          Pega la URL M3U8 copiada arriba. La lista se actualizará en tiempo real
                          con cada comensal que envíe canciones desde su mesa.
                        </li>
                      </ol>
                    </div>
                  )}

                  {activeTab === "rekordbox" && (
                    <div className="space-y-2">
                      <p className="font-semibold text-white">
                        Conectar con Rekordbox o Serato DJ:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-[11px]">
                        <li>
                          Haz clic en el botón de descarga para guardar el archivo{" "}
                          <code className="px-1 py-0.5 rounded bg-zinc-900 text-cyan-300">
                            vidjs-{eventCode?.toLowerCase()}.m3u8
                          </code>
                          .
                        </li>
                        <li>
                          Arrastra el archivo directamente a tu carpeta de Crates o Playlists.
                        </li>
                        <li>
                          Para actualización continua, mantén abierta la ventana del DJ Booth en un
                          segundo monitor o iPad.
                        </li>
                      </ol>
                    </div>
                  )}

                  {activeTab === "webhook" && (
                    <div className="space-y-2 font-mono text-[11px]">
                      <p className="font-sans font-semibold text-white">
                        Notificar tema actual mediante POST:
                      </p>
                      <pre className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-purple-300 overflow-x-auto text-[10px]">
{`curl -X POST "${bridgeData.syncWebhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "eventCode": "${eventCode || "RETRO-POP"}",
    "token": "${bridgeData.token}",
    "action": "TRACK_PLAYING",
    "trackTitle": "Nombre de la Canción"
  }'`}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-red-400">No se pudo cargar la configuración del puente.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <button
            onClick={handleSimulateSync}
            disabled={testSyncLoading || !bridgeData}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
          >
            {testSyncLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
            ) : testSyncSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>
              {testSyncSuccess ? "¡Enlace Verificado (OK)!" : "Test de Enlace (Heartbeat)"}
            </span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
