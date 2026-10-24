"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import Link from "next/link";
import {
  Disc3,
  Music,
  Radio,
  Sparkles,
  Users,
  Maximize2,
  Minimize2,
  Clock,
  Flame,
  Swords,
  Camera,
  Mic,
  Headphones,
  RotateCcw,
  QrCode,
  Wifi,
  Tv,
} from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import { RealtimeEventType } from "@/lib/realtime/event-bus";

interface LiveDuelData {
  id: string;
  optionA: { id: "A"; title: string; artist: string; tableLabel?: string; votes: number };
  optionB: { id: "B"; title: string; artist: string; tableLabel?: string; votes: number };
  status: "ACTIVE" | "FINISHED";
  endsAt: string;
  totalVotes: number;
}

interface PhotoPostItem {
  id: string;
  guestName: string;
  imageUrl: string;
  caption: string | null;
  table: { label: string; number: number };
  createdAt: string;
}

interface FloatingReaction {
  id: string;
  reaction: string;
  tableLabel?: string;
  xPercent: number;
}

interface ApplauseState {
  targetTableLabel: string;
  durationSeconds: number;
  endsAt: string;
  score: number;
  active: boolean;
}

interface RouletteState {
  tables: string[];
  winner: string;
  prize: string;
  spinning: boolean;
  currentIndex: number;
  finished: boolean;
}

interface FeaturedPhotoState {
  photo: PhotoPostItem;
}

interface DisplayState {
  event: {
    id: string;
    name: string;
    code: string;
    status: string;
    venueName: string;
    tenantName: string;
    logoUrl: string | null;
  };
  currentPlaying: {
    id: string;
    status: string;
    updatedAt: string;
    youtubeVideoId?: string | null;
    song: {
      title: string;
      artist: string;
      genre: string;
      durationSeconds: number;
      bpm: number | null;
      key: string | null;
      youtubeSearchQuery?: string;
    };
    table: { id: string; number: number; label: string };
    guestName?: string | null;
    notes?: string | null;
    tipAmountCents?: number;
    isFastPass?: boolean;
  } | null;
  upcomingQueue: Array<{
    id: string;
    order: number;
    title: string;
    artist: string;
    table: string;
    tipAmountCents?: number;
    isFastPass?: boolean;
  }>;
  flashDeal?: {
    id: string;
    title: string;
    subtitle: string;
    discount: string;
    badgeText: string;
  } | null;
  policy?: {
    zone: string;
    maxActivePerTable: number;
    queuePaused: boolean;
    rotationMode: string;
    photosAllowed?: boolean;
    photoRotationSeconds?: number;
    photoFitMode?: "BLUR_FILL" | "CONTAIN" | "COVER";
  };
  qr: {
    scanUrl: string;
    dataUrl: string;
  };
  branding?: {
    logoUrl?: string | null;
    bannerUrl?: string | null;
    primaryColor?: string;
    accentColor?: string;
    welcomeTitle?: string | null;
    welcomeSubtitle?: string | null;
    marqueeText?: string | null;
    instagramHandle?: string | null;
    wifiSsid?: string | null;
    wifiPassword?: string | null;
  };
}

interface SingerCallState {
  tableLabel: string;
  singerName: string | null;
  songTitle: string | null;
  artist: string | null;
  timestamp: number;
}

export default function PublicDisplayScreenPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [data, setData] = useState<DisplayState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // 📸 Modo de Ajuste de Fotos en Pantalla (Cine Blur, Contener, Llenar)
  const [photoFitMode, setPhotoFitMode] = useState<"BLUR_FILL" | "CONTAIN" | "COVER">("BLUR_FILL");

  // ⚔️ Duelo Musical en TV
  const [activeDuel, setActiveDuel] = useState<LiveDuelData | null>(null);

  // 📸 Fotos del Muro de Social Lounge
  const [approvedPhotos, setApprovedPhotos] = useState<PhotoPostItem[]>([]);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  // ⭐ Foto Destacada en Pantalla Completa (Spotlight Fullscreen 12s)
  const [featuredPhoto, setFeaturedPhoto] = useState<FeaturedPhotoState | null>(null);

  // 🚀 Reacciones y Emojis Flotantes en Vivo (Efecto TikTok)
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  // 👏 Aplausómetro Digital
  const [applause, setApplause] = useState<ApplauseState | null>(null);

  // 🎰 Ruleta de la Suerte de Mesas
  const [roulette, setRoulette] = useState<RouletteState | null>(null);

  // 🎤 Llamado a Cantante al Escenario (Karaoke Stage Call)
  const [singerCall, setSingerCall] = useState<SingerCallState | null>(null);

  // 📺 Video de Karaoke (YouTube IFrame Embed sincronizado con cabina DJ)
  const [karaokeVideoId, setKaraokeVideoId] = useState<string | null>(null);
  const [isKaraokeVideoEnabled, setIsKaraokeVideoEnabled] = useState<boolean>(true);
  const karaokeIframeRef = useRef<HTMLIFrameElement>(null);
  const [isTvPaused, setIsTvPaused] = useState<boolean>(false);
  const [forceKaraokeMode, setForceKaraokeMode] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<"player" | "queue" | "qr">("player");

  // Detección reactiva de parámetro ?mode=karaoke en URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("mode") === "karaoke") {
        setForceKaraokeMode(true);
      }
    }
  }, []);

  // Control remoto de YouTube IFrame (Play, Pause, Unmute, Seek) y estado TV
  const sendYouTubeCommand = (func: string, args: any[] = []) => {
    if (func === "playVideo") {
      setIsTvPaused(false);
    } else if (func === "pauseVideo") {
      setIsTvPaused(true);
    }

    if (!karaokeIframeRef.current?.contentWindow) return;
    try {
      karaokeIframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func,
          args,
        }),
        "*"
      );

      if (func === "playVideo") {
        // Desmutear y asegurar arranque confiable tras 300ms
        setTimeout(() => {
          if (karaokeIframeRef.current?.contentWindow) {
            karaokeIframeRef.current.contentWindow.postMessage(
              JSON.stringify({ event: "command", func: "unMute", args: [] }),
              "*"
            );
            karaokeIframeRef.current.contentWindow.postMessage(
              JSON.stringify({ event: "command", func: "playVideo", args: [] }),
              "*"
            );
          }
        }, 300);
      }
    } catch (err) {
      console.warn("Error enviando comando a YouTube IFrame en TV:", err);
    }
  };

  // Simulación y control de tiempo transcurrido de la canción
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Sincronizador unificado de reproducción entre la cabina DJ y la pantalla TV
  const handleIncomingPlaybackControl = useCallback(
    (payload: {
      action: "PLAY" | "PAUSE" | "SEEK" | "RESET";
      seconds?: number;
      duration?: number;
      trackTitle?: string;
      trackArtist?: string;
      videoId?: string | null;
    }) => {
      if (!payload?.action) return;
      const { action, seconds, duration, trackTitle, trackArtist, videoId } = payload;

      if (action === "RESET") {
        setIsTvPaused(false);
        sendYouTubeCommand("pauseVideo");
        setKaraokeVideoId(null);
        setElapsedSeconds(0);
        setData((prev) => (prev ? { ...prev, currentPlaying: null } : null));
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("vidjs_playback_sync_payload");
          } catch {}
        }
        return;
      }

      if (action === "PLAY") {
        setIsTvPaused(false);
        sendYouTubeCommand("playVideo");
        setMobileTab("player");

        if (typeof seconds === "number") {
          setElapsedSeconds(seconds);
        }

        if (videoId) {
          setKaraokeVideoId(videoId);
        } else if (trackTitle) {
          setKaraokeVideoId((prevVid) => {
            if (data?.currentPlaying?.song?.title && data.currentPlaying.song.title !== trackTitle) {
              return null;
            }
            return prevVid;
          });
        }

        if (trackTitle) {
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              currentPlaying: {
                id: prev.currentPlaying?.id || "live_dj_active",
                status: "PLAYING",
                updatedAt: new Date().toISOString(),
                youtubeVideoId: videoId !== undefined ? videoId : prev.currentPlaying?.youtubeVideoId || null,
                song: {
                  title: trackTitle,
                  artist: trackArtist || prev.currentPlaying?.song?.artist || "DJ Mix",
                  genre: prev.currentPlaying?.song?.genre || "General",
                  durationSeconds: duration || prev.currentPlaying?.song?.durationSeconds || 210,
                  bpm: prev.currentPlaying?.song?.bpm || null,
                  key: prev.currentPlaying?.song?.key || null,
                },
                table: prev.currentPlaying?.table || { id: "booth", number: 0, label: "Cabina DJ" },
                guestName: prev.currentPlaying?.guestName || null,
                notes: prev.currentPlaying?.notes || null,
                isFastPass: prev.currentPlaying?.isFastPass || false,
              },
            };
          });
        } else {
          setData((prev) => {
            if (!prev || !prev.currentPlaying) return prev;
            return {
              ...prev,
              currentPlaying: {
                ...prev.currentPlaying,
                status: "PLAYING",
                updatedAt: new Date().toISOString(),
              },
            };
          });
        }
      } else if (action === "PAUSE") {
        setIsTvPaused(true);
        sendYouTubeCommand("pauseVideo");

        if (typeof seconds === "number") {
          setElapsedSeconds(seconds);
        }

        setData((prev) => {
          if (!prev || !prev.currentPlaying) return prev;
          return {
            ...prev,
            currentPlaying: {
              ...prev.currentPlaying,
              status: "PAUSED",
              updatedAt: new Date().toISOString(),
            },
          };
        });
      } else if (action === "SEEK" && typeof seconds === "number") {
        setElapsedSeconds(seconds);
        sendYouTubeCommand("seekTo", [seconds, true]);
      }
    },
    [data?.currentPlaying?.song?.title]
  );

  // Restaurar pista activa desde storage local al montar si existe sesión en curso reciente
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("vidjs_playback_sync_payload");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.action === "PLAY" && parsed.trackTitle) {
          const age = Date.now() - (parsed.timestamp || 0);
          if (age < 15 * 60 * 1000) {
            handleIncomingPlaybackControl(parsed);
          }
        }
      }
    } catch {}
  }, [handleIncomingPlaybackControl]);

  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Limpiar y resetear la pantalla TV cuando un tema queda desfasado o trabado
  const handleResetScreen = async () => {
    setIsResetting(true);
    try {
      // 1. Limpieza local inmediata (0ms)
      setIsTvPaused(false);
      sendYouTubeCommand("pauseVideo");
      setKaraokeVideoId(null);
      setElapsedSeconds(0);
      setData((prev) => (prev ? { ...prev, currentPlaying: null } : null));

      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("vidjs_playback_sync_payload");
        } catch {}

        // Difusión local a todas las pestañas y consolas DJ
        const resetPayload = {
          type: "PLAYBACK_CONTROL",
          action: "RESET",
          timestamp: Date.now(),
        };
        const channelNames = ["vidjs_karaoke_sync_global"];
        if (code) {
          channelNames.push(`vidjs_karaoke_sync_${code}`);
          channelNames.push(`vidjs_karaoke_sync_${code.toUpperCase()}`);
        }
        if (data?.event?.id) {
          channelNames.push(`vidjs_karaoke_sync_${data.event.id}`);
        }
        channelNames.forEach((chName) => {
          try {
            const ch = new BroadcastChannel(chName);
            ch.postMessage(resetPayload);
            setTimeout(() => {
              try {
                ch.close();
              } catch {}
            }, 1000);
          } catch {}
        });
      }

      // 2. Notificar al backend para liberar la canción en la base de datos
      const res = await fetch("/api/v1/display/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, action: "RESET" }),
      });

      if (res.ok) {
        setResetSuccessMessage("✨ Pantalla liberada. Lista para el siguiente pedido.");
        setTimeout(() => setResetSuccessMessage(null), 4000);
      }

      // 3. Recargar estado fresco del servidor
      await fetchDisplayState();
    } catch (err) {
      console.warn("Error reseteando pantalla:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const fetchDisplayState = async () => {
    try {
      const res = await fetch(`/api/v1/display/state?code=${code}`);
      if (res.ok) {
        const json = await res.json();
        setData((prev) => {
          if (!prev) return json.data;

          // Si en la pantalla la canción está sonando activamente (isPlaying y no reseteada),
          // y el servidor devolvió null para currentPlaying (ej. DJ tiró la pista manualmente o de biblioteca),
          // PRESERVAR la pista activa para que la pantalla NO se borre a los pocos segundos.
          const isActivelyPlayingLocally = !isTvPaused && Boolean(prev.currentPlaying);
          const serverHasNoTrack = !json.data?.currentPlaying;

          if (isActivelyPlayingLocally && serverHasNoTrack) {
            return {
              ...json.data,
              currentPlaying: prev.currentPlaying,
            };
          }

          return json.data;
        });

        if (json.data?.currentPlaying?.youtubeVideoId) {
          setKaraokeVideoId(json.data.currentPlaying.youtubeVideoId);
        }
        setError(null);
      } else {
        const errJson = await res.json();
        setError(errJson.error?.message || "Error al cargar la pantalla pública");
      }
    } catch (err) {
      console.error("Error conectando con la pantalla:", err);
    } finally {
      setLoading(false);
    }
  };

  // Conexión Realtime nativa SSE (0 ms) para duelos, fotos, reacciones y juegos
  const { isConnected: isRealtime } = useRealtime({
    code,
    onEvent: (type: RealtimeEventType, payload: any) => {
      if (type === "DUEL_UPDATE") {
        setActiveDuel(payload || null);
      } else if (type === "PHOTO_APPROVED") {
        setApprovedPhotos((prev) => [
          payload,
          ...prev.filter((p) => p.id !== payload.id),
        ]);
      } else if (type === "PHOTO_REMOVED") {
        setApprovedPhotos((prev) => prev.filter((p) => p.id !== payload?.id));
        setFeaturedPhoto((curr) => (curr?.photo.id === payload?.id ? null : curr));
      } else if (type === "PHOTO_FEATURED") {
        if (payload?.photo) {
          setFeaturedPhoto({ photo: payload.photo });
          setTimeout(() => {
            setFeaturedPhoto((curr) => (curr?.photo.id === payload.photo.id ? null : curr));
          }, (payload.durationSeconds || 12) * 1000);
        }
      } else if (type === "REACTION_BURST") {
        const rx: FloatingReaction = {
          id: payload.id || Math.random().toString(),
          reaction: payload.reaction || "🔥",
          tableLabel: payload.tableLabel,
          xPercent: Math.floor(Math.random() * 80) + 10,
        };
        setReactions((prev) => [...prev.slice(-20), rx]);
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== rx.id));
        }, 3800);
      } else if (type === "APPLAUSE_START") {
        setApplause({
          targetTableLabel: payload.targetTableLabel || "¡A TODOS LOS ARTISTAS!",
          durationSeconds: payload.durationSeconds || 15,
          endsAt: payload.endsAt,
          score: 15,
          active: true,
        });
      } else if (type === "APPLAUSE_TICK") {
        setApplause((prev) =>
          prev && prev.active
            ? { ...prev, score: Math.min(100, prev.score + 4.5) }
            : prev
        );
      } else if (type === "APPLAUSE_END") {
        setTimeout(() => setApplause(null), 3000);
      } else if (type === "ROULETTE_SPIN") {
        const spinDuration = payload.spinDurationMs || 6000;
        setRoulette({
          tables: payload.tables || ["Mesa 1", "Mesa 2", "Mesa 3"],
          winner: payload.winner || "Mesa 1",
          prize: payload.prize || "¡Ronda de Shots Gratis!",
          spinning: true,
          currentIndex: 0,
          finished: false,
        });

        const spinInterval = setInterval(() => {
          setRoulette((curr) =>
            curr && curr.spinning
              ? { ...curr, currentIndex: (curr.currentIndex + 1) % curr.tables.length }
              : curr
          );
        }, 120);

        setTimeout(() => {
          clearInterval(spinInterval);
          setRoulette((curr) => (curr ? { ...curr, spinning: false, finished: true } : null));
        }, spinDuration);

        setTimeout(() => {
          setRoulette(null);
        }, spinDuration + 9000);
      } else if (type === "SINGER_CALLED") {
        setSingerCall({
          tableLabel: payload.tableLabel || "Mesa de Karaoke",
          singerName: payload.singerName || null,
          songTitle: payload.songTitle || null,
          artist: payload.artist || null,
          timestamp: Date.now(),
        });
        setTimeout(() => {
          setSingerCall((prev) => (prev && Date.now() - prev.timestamp >= 9500 ? null : prev));
        }, 10000);
      } else if (type === "PHOTO_FIT_MODE") {
        if (payload?.photoFitMode) {
          setPhotoFitMode(payload.photoFitMode);
        }
      } else if (type === "KARAOKE_VIDEO_UPDATE") {
        if (payload?.videoId !== undefined) {
          setKaraokeVideoId(payload.videoId);
        }
        if (payload?.isVideoEnabled !== undefined) {
          setIsKaraokeVideoEnabled(payload.isVideoEnabled);
        }
      } else if (type === "KARAOKE_PLAYBACK_CONTROL") {
        handleIncomingPlaybackControl(payload);
      } else if (
        type === "TRACK_CHANGE" ||
        type === "QUEUE_UPDATE" ||
        type === "QUEUE_POLICY_UPDATED" ||
        type === "QUEUE_SLOT_UNLOCKED" ||
        type === "TABLE_RELEASED"
      ) {
        if (type === "QUEUE_POLICY_UPDATED" && payload?.policy?.photoFitMode) {
          setPhotoFitMode(payload.policy.photoFitMode);
        }
        fetchDisplayState();
      }
    },
  });

  // Sincronización instantánea ultra-resiliente (0ms) con la consola DJ/KJ mediante BroadcastChannel y Storage Events
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Escuchar Storage Event (infalible entre ventanas y pestañas del mismo dominio)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "vidjs_playback_sync_payload" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleIncomingPlaybackControl(parsed);
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    // 2. Canales BroadcastChannel multicanal
    const channelNames = ["vidjs_karaoke_sync_global"];
    if (code) {
      channelNames.push(`vidjs_karaoke_sync_${code}`);
      channelNames.push(`vidjs_karaoke_sync_${code.toUpperCase()}`);
    }
    if (data?.event?.id) {
      channelNames.push(`vidjs_karaoke_sync_${data.event.id}`);
    }

    const openChannels: BroadcastChannel[] = [];
    try {
      channelNames.forEach((name) => {
        try {
          const ch = new BroadcastChannel(name);
          ch.onmessage = (e) => {
            const msg = e.data || {};
            if (msg.type === "PLAYBACK_CONTROL" || msg.action) {
              handleIncomingPlaybackControl(msg);
            }
          };
          openChannels.push(ch);
        } catch {}
      });
    } catch {}

    return () => {
      window.removeEventListener("storage", handleStorage);
      openChannels.forEach((ch) => {
        try {
          ch.close();
        } catch {}
      });
    };
  }, [code, data?.event?.id, handleIncomingPlaybackControl]);

  // Temporizador para finalizar el aplausómetro
  useEffect(() => {
    if (!applause || !applause.active) return;
    const timer = setInterval(() => {
      if (new Date() >= new Date(applause.endsAt)) {
        setApplause((prev) => (prev ? { ...prev, active: false } : null));
        setTimeout(() => setApplause(null), 3500);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [applause?.endsAt, applause?.active]);

  // Carga inicial y polling de respaldo resiliente (cada 15 segundos)
  useEffect(() => {
    fetchDisplayState();

    const fetchExtraState = async () => {
      try {
        const duelRes = await fetch(`/api/v1/duel/state?code=${code}`);
        if (duelRes.ok) {
          const dj = await duelRes.json();
          setActiveDuel(dj.data || null);
        }

        const photoRes = await fetch(`/api/v1/photos?code=${code}&status=APPROVED`);
        if (photoRes.ok) {
          const pj = await photoRes.json();
          if (pj.data?.photos) {
            setApprovedPhotos(pj.data.photos);
          }
        }
      } catch {}
    };

    fetchExtraState();
    const interval = setInterval(() => {
      fetchDisplayState();
      fetchExtraState();
    }, 15000);
    return () => clearInterval(interval);
  }, [code]);

  // Rotación de fotos del Social Lounge en pantalla según la política del DJ (default 8s)
  useEffect(() => {
    if (approvedPhotos.length <= 1) return;
    const intervalSec = data?.policy?.photoRotationSeconds || 8;
    const photoTimer = setInterval(() => {
      setCurrentPhotoIdx((prev) => (prev + 1) % approvedPhotos.length);
    }, intervalSec * 1000);
    return () => clearInterval(photoTimer);
  }, [approvedPhotos.length, data?.policy?.photoRotationSeconds]);

  // Sincronizar modo de ajuste de foto con la política del evento
  useEffect(() => {
    if (data?.policy?.photoFitMode) {
      setPhotoFitMode(data.policy.photoFitMode);
    }
  }, [data?.policy?.photoFitMode]);

  // Temporizador visual de progreso (se congela en tiempo real cuando la cabina DJ pausa)
  useEffect(() => {
    if (!data?.currentPlaying || isTvPaused) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        const max = data.currentPlaying?.song.durationSeconds || 210;
        return prev >= max ? 0 : prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [data?.currentPlaying, isTvPaused]);

  // Auto-ocultar cursor y controles en Smart TVs
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  // Prevenir que el Smart TV o monitor se apague o entre en reposo (Screen Wake Lock API)
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch {
        // Silencioso si el navegador no lo soporta
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const isKaraoke = forceKaraokeMode || data?.policy?.zone === "KARAOKE";

  // Auto-resolución de video de YouTube para el tema al aire (Karaoke TV)
  useEffect(() => {
    const current = data?.currentPlaying;
    if (!isKaraoke || !current) return;
    if (karaokeVideoId) return;

    let isMounted = true;
    const songTitle = current.song?.title || "";
    const songArtist = current.song?.artist || "";
    const q = `${songTitle} ${songArtist}`.trim();
    if (!q) return;

    fetch(`/api/v1/karaoke/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((json) => {
        if (isMounted && json.success && json.data?.recommended?.id) {
          setKaraokeVideoId(json.data.recommended.id);
        }
      })
      .catch((err) => console.warn("Error resolviendo pista de YouTube en TV:", err));

    return () => {
      isMounted = false;
    };
  }, [data?.currentPlaying?.id, isKaraoke, karaokeVideoId]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <Disc3 className="w-12 h-12 text-purple-500 animate-spin" />
        <p className="text-sm font-mono text-zinc-400">
          Sintonizando pantalla pública del evento {code}...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Radio className="w-16 h-16 text-zinc-700 mx-auto" />
        <h1 className="text-2xl font-bold">Pantalla No Disponible</h1>
        <p className="text-sm text-zinc-400 max-w-md">
          {error || "El evento indicado no se encuentra activo."}
        </p>
      </div>
    );
  }

  const track = data.currentPlaying;
  const duration = track?.song.durationSeconds || 210;
  const progressPercent = Math.min((elapsedSeconds / duration) * 100, 100);
  const isCelebration = Boolean(
    track?.notes &&
      (track.notes.toLowerCase().includes("cumple") ||
        track.notes.toLowerCase().includes("aniversario") ||
        track.notes.includes("🎂") ||
        track.notes.includes("💍") ||
        track.notes.toLowerCase().includes("festejo"))
  );

  return (
    <div
      data-display="tv"
      className="tv-screen dark h-[100dvh] max-h-[100dvh] w-screen bg-[#040406] text-zinc-100 flex flex-col justify-between p-2 sm:p-4 lg:p-6 relative overflow-hidden select-none"
    >
      {/* Luces de fondo y resplandor estilo discoteca */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Toast Notificación de Reset de Pantalla */}
      {resetSuccessMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-fadeIn pointer-events-none">
          <div className="px-5 py-2.5 rounded-2xl bg-zinc-950/95 border-2 border-emerald-500/80 text-emerald-300 text-xs sm:text-sm font-bold shadow-2xl flex items-center gap-2.5 backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{resetSuccessMessage}</span>
          </div>
        </div>
      )}

      {/* 1. Encabezado Superior (Logo del Local y Código) */}
      <header className="flex items-center justify-between z-10 border-b border-zinc-800/60 pb-2 sm:pb-3 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {data.branding?.logoUrl || data.event.logoUrl ? (
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-900 border border-zinc-700/80 p-0.5 sm:p-1 flex items-center justify-center overflow-hidden shadow-xl shrink-0">
              <img
                src={data.branding?.logoUrl || data.event.logoUrl || ""}
                alt={data.event.tenantName}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 shrink-0">
              <Disc3 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin [animation-duration:12s]" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-sm sm:text-xl font-black text-white tracking-wider truncate max-w-[120px] sm:max-w-none">
                {data.branding?.welcomeTitle || data.event.tenantName.toUpperCase()}
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-[10px] sm:text-[11px] font-bold font-mono">
                {data.event.venueName}
              </span>
              {isKaraoke && (
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] sm:text-[11px] font-bold font-mono animate-pulse">
                  🎤 MODO KARAOKE
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-400 font-medium truncate">
              {data.event.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {data.branding?.instagramHandle && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-purple-950/80 to-pink-950/80 border border-purple-700/60 text-purple-200 text-xs font-bold">
              <span>📸 {data.branding.instagramHandle}</span>
            </div>
          )}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <span
              className={`w-2 h-2 rounded-full ${
                isRealtime
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                  : "bg-emerald-400 animate-ping"
              }`}
            />
            <span className="text-xs font-bold text-emerald-300 tracking-wider">
              {isRealtime ? "⚡ EN VIVO (SSE 0ms)" : "TRANSMISIÓN EN VIVO"}
            </span>
          </div>

          <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-purple-900/40 border border-purple-600/50 text-purple-200 font-mono text-[11px] sm:text-xs font-extrabold tracking-wider">
            <span className="hidden sm:inline">CÓDIGO: </span>{data.event.code}
          </div>

          {/* Botón para Limpiar / Resetear pantalla y permitir que entre el siguiente pedido */}
          <button
            onClick={handleResetScreen}
            disabled={isResetting}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-rose-950/80 to-red-950/80 hover:from-rose-600 hover:to-red-600 border border-rose-600/60 hover:border-rose-400 text-rose-200 hover:text-white text-xs font-black shadow-md shadow-rose-950/60 transition-all cursor-pointer active:scale-95"
            title="Limpiar / Resetear pantalla para dar paso al siguiente pedido si un tema se quedó trabado o desincronizado"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin text-white" : "text-rose-400"}`} />
            <span className="hidden sm:inline">Limpiar / Resetear</span>
            <span className="sm:hidden">Reset</span>
          </button>

          {/* Botón para volver a la Consola y Panel de Control del DJ */}
          <Link
            href="/dashboard/dj"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-md shadow-purple-950/60 transition-all cursor-pointer border border-purple-400/40 active:scale-95"
            title="Volver a la Consola y Panel de Control del DJ"
          >
            <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Panel DJ</span>
          </Link>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla Completa (F11)"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>
      </header>

      {/* Marquesina de Anuncios y Promociones */}
      {data.branding?.marqueeText && (
        <div className="z-10 -mx-2 sm:-mx-4 lg:-mx-6 my-0.5 sm:my-1 bg-gradient-to-r from-purple-950/90 via-zinc-950 to-purple-950/90 border-y border-purple-500/30 py-0.5 sm:py-1 overflow-hidden shadow-xl shrink-0">
          <div className="flex animate-pulse whitespace-nowrap justify-center gap-6 font-bold text-[11px] sm:text-xs text-purple-200 tracking-wider px-3 sm:px-4">
            <span>✨ {data.branding.marqueeText}</span>
          </div>
        </div>
      )}

      {/* Marquesina de Flash Deals de Barra */}
      {data.flashDeal && (
        <div className="z-10 -mx-2 sm:-mx-4 lg:-mx-6 my-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-black py-0.5 sm:py-1 px-3 sm:px-4 shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 font-black text-[11px] sm:text-xs tracking-wider animate-pulse shrink-0">
          <span className="px-1.5 py-0.2 rounded bg-black text-amber-300 text-[8px] sm:text-[9px] uppercase font-mono">
            {data.flashDeal.badgeText || "PROMO BARRA"}
          </span>
          <span>⚡ {data.flashDeal.title}:</span>
          <span className="font-semibold text-zinc-950 truncate">{data.flashDeal.discount || data.flashDeal.subtitle}</span>
          <span className="text-[8px] sm:text-[9px] font-mono uppercase bg-black/20 px-1.5 py-0.2 rounded hidden sm:inline">¡Pide en barra!</span>
        </div>
      )}

      {/* 📱 Selector de Pestañas para Vista Móvil / App */}
      <div className="lg:hidden flex items-center justify-center p-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl shrink-0 my-1 gap-1 z-20 shadow-lg">
        <button
          onClick={() => setMobileTab("player")}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === "player"
              ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-md shadow-purple-950/50"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          <span>En Vivo</span>
        </button>
        <button
          onClick={() => setMobileTab("queue")}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === "queue"
              ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-md shadow-purple-950/50"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Cola ({data.upcomingQueue?.length ?? 0})</span>
        </button>
        <button
          onClick={() => setMobileTab("qr")}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === "qr"
              ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-md shadow-purple-950/50"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Pedir QR</span>
        </button>
      </div>

      {/* 2. Escenario Principal en 3 Columnas (Izquierda: Cola | Centro: Video/Vinilo | Derecha: QR Gigante) */}
      <main className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-4 my-auto py-1 sm:py-2 z-10 relative overflow-hidden">
        {/* COLUMNA 1 (IZQUIERDA - lg:col-span-3 xl:col-span-3): LISTA DE COLA DE PEDIDOS */}
        <aside
          className={`${
            mobileTab === "queue" ? "flex flex-1" : "hidden"
          } lg:flex lg:col-span-3 xl:col-span-3 h-full min-h-0 flex-col rounded-3xl bg-zinc-950/85 border border-purple-500/30 p-3 sm:p-4 shadow-2xl backdrop-blur-md overflow-hidden`}
        >
          {/* Encabezado de la Cola */}
          <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-zinc-800/80 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <Clock className="w-4 h-4 text-purple-400 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-white tracking-wider uppercase">
                  {isKaraoke ? "Cola Karaoke" : "Próximos Temas"}
                </h2>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {data.upcomingQueue.length} {data.upcomingQueue.length === 1 ? "en espera" : "en espera"}
                </span>
              </div>
            </div>
            {data.policy?.queuePaused && (
              <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[9px] font-black uppercase animate-pulse">
                Pausa
              </span>
            )}
          </div>

          {/* Lista de Canciones en Espera */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 py-2 pr-1 custom-scrollbar">
            {data.upcomingQueue.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2 text-zinc-500">
                <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                  <Music className="w-8 h-8 text-zinc-600 animate-bounce" />
                </div>
                <p className="text-xs font-bold text-zinc-300">
                  {isKaraoke ? "¡La cola está libre!" : "¡Sin temas en cola!"}
                </p>
                <p className="text-[11px] text-zinc-500 max-w-[180px]">
                  Sé el primero en pedir escaneando el código QR
                </p>
              </div>
            ) : (
              data.upcomingQueue.map((item) => {
                const isNext = item.order === 1;
                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-2xl border transition-all ${
                      isNext
                        ? isKaraoke
                          ? "bg-gradient-to-r from-cyan-950/90 via-zinc-900/90 to-zinc-900 border-cyan-500/70 shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-pulse"
                          : "bg-gradient-to-r from-purple-950/90 via-zinc-900/90 to-zinc-900 border-purple-500/70 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                        : "bg-zinc-900/70 border-zinc-800/80 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`w-6 h-6 rounded-xl font-mono font-black flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                          isNext
                            ? isKaraoke
                              ? "bg-cyan-400 text-black shadow-md shadow-cyan-400/50"
                              : "bg-purple-500 text-white shadow-md shadow-purple-500/50"
                            : "bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        #{item.order}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <div className="font-bold text-white text-xs sm:text-sm truncate">
                            {item.title}
                          </div>
                          {item.isFastPass && (
                            <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 shrink-0">
                              ⭐ VIP
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {item.artist}
                        </div>

                        <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                          <span
                            className={`px-1.5 py-0.5 rounded border ${
                              isNext
                                ? isKaraoke
                                  ? "bg-cyan-950 text-cyan-300 border-cyan-800"
                                  : "bg-purple-950 text-purple-300 border-purple-800"
                                : "bg-black/60 text-zinc-400 border-zinc-800"
                            }`}
                          >
                            {item.table}
                          </span>
                          {isNext && (
                            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                              ¡Siguiente!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pie de la Columna Izquierda */}
          <div className="pt-2 border-t border-zinc-800/80 text-center shrink-0">
            <button
              onClick={() => setMobileTab("qr")}
              className="w-full text-[10px] font-semibold text-zinc-400 hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Pide el tuyo con el QR 👉</span>
            </button>
          </div>
        </aside>

        {/* COLUMNA 2 (CENTRAL - lg:col-span-6 xl:col-span-6): ESCENARIO (VIDEO / VINILO / IDLE / DUELO) */}
        <div
          className={`${
            mobileTab === "player" ? "flex flex-1" : "hidden"
          } lg:flex lg:col-span-6 xl:col-span-6 h-full min-h-0 flex-col items-center justify-center relative overflow-hidden px-1`}
        >
          {activeDuel && activeDuel.status === "ACTIVE" ? (
            /* ESCENARIO DE DUELO MUSICAL EN VIVO */
            <div className="max-w-5xl mx-auto w-full space-y-5 animate-fadeIn">
              <div className="text-center space-y-1.5">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/50 text-xs font-black tracking-widest uppercase animate-bounce">
                  <Swords className="w-4 h-4" />
                  <span>¡BATALLA MUSICAL EN VIVO!</span>
                </div>
                <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black text-white tracking-tight">
                  ¿QUÉ CANCIÓN DEBE SONAR AHORA?
                </h2>
                <p className="text-xs text-zinc-400">
                  Apunta la cámara de tu celular al QR de la derecha o de tu mesa y vota en vivo
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-11 gap-3 sm:gap-4 items-center">
                {/* TRACK A */}
                <div className="md:col-span-5 p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/40 border-2 border-amber-500 shadow-2xl shadow-amber-500/20 space-y-3 text-center md:text-left">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-xl bg-amber-500 text-black text-xs font-black uppercase">
                      OPCIÓN A
                    </span>
                    {activeDuel.optionA.tableLabel && (
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        de {activeDuel.optionA.tableLabel}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white truncate">
                      {activeDuel.optionA.title}
                    </h3>
                    <p className="text-sm sm:text-base font-bold text-amber-300 truncate mt-0.5">
                      {activeDuel.optionA.artist}
                    </p>
                  </div>
                  {/* Barra y Porcentaje */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-xs font-bold text-amber-400 font-mono">
                      <span>{activeDuel.optionA.votes} votos</span>
                      <span className="text-base font-black">
                        {activeDuel.totalVotes > 0
                          ? Math.round((activeDuel.optionA.votes / activeDuel.totalVotes) * 100)
                          : 50}
                        %
                      </span>
                    </div>
                    <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                        style={{
                          width: `${
                            activeDuel.totalVotes > 0
                              ? (activeDuel.optionA.votes / activeDuel.totalVotes) * 100
                              : 50
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* VS BADGE CENTRAL */}
                <div className="md:col-span-1 text-center py-1 flex flex-col items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black flex items-center justify-center text-xs shadow-xl animate-pulse">
                    VS
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 mt-1">EN VIVO</span>
                </div>

                {/* TRACK B */}
                <div className="md:col-span-5 p-4 sm:p-5 rounded-3xl bg-gradient-to-bl from-zinc-900 via-zinc-900 to-orange-950/40 border-2 border-orange-500 shadow-2xl shadow-orange-500/20 space-y-3 text-center md:text-right">
                  <div className="flex items-center justify-between md:flex-row-reverse">
                    <span className="px-3 py-1 rounded-xl bg-orange-500 text-black text-xs font-black uppercase">
                      OPCIÓN B
                    </span>
                    {activeDuel.optionB.tableLabel && (
                      <span className="text-xs font-mono text-orange-400 font-bold">
                        de {activeDuel.optionB.tableLabel}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white truncate">
                      {activeDuel.optionB.title}
                    </h3>
                    <p className="text-sm sm:text-base font-bold text-orange-300 truncate mt-0.5">
                      {activeDuel.optionB.artist}
                    </p>
                  </div>
                  {/* Barra y Porcentaje */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between md:flex-row-reverse text-xs font-bold text-orange-400 font-mono">
                      <span>{activeDuel.optionB.votes} votos</span>
                      <span className="text-base font-black">
                        {activeDuel.totalVotes > 0
                          ? Math.round((activeDuel.optionB.votes / activeDuel.totalVotes) * 100)
                          : 50}
                        %
                      </span>
                    </div>
                    <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500 ml-auto"
                        style={{
                          width: `${
                            activeDuel.totalVotes > 0
                              ? (activeDuel.optionB.votes / activeDuel.totalVotes) * 100
                              : 50
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : track ? (
            isKaraoke && isKaraokeVideoEnabled ? (
              /* REPRODUCTOR DE VIDEO KARAOKE EN VIVO (YOUTUBE EMBED) */
              <div className="w-full h-full flex flex-col items-center justify-center space-y-2 z-20 animate-fadeIn">
                {/* Barra Superior de Identificación del Cantante */}
                <div className="w-full flex items-center justify-between px-1 text-xs shrink-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/60 font-black tracking-wider flex items-center gap-1.5 shadow-[0_0_20px_rgba(6,182,212,0.35)] text-xs">
                      <Mic className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                      <span className="truncate max-w-[200px] sm:max-w-none">
                        EN ESCENARIO:{" "}
                        {track.guestName
                          ? `${track.guestName} (${track.table.label})`
                          : track.table.label}
                      </span>
                    </span>
                    {track.isFastPass && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] font-black">
                        ⭐ VIP
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleResetScreen}
                      disabled={isResetting}
                      className="text-[11px] text-rose-300 hover:text-white px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-800 border border-rose-700/60 transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                      title="Limpiar pantalla y desbloquear para permitir entrar el siguiente pedido"
                    >
                      <RotateCcw className={`w-3 h-3 ${isResetting ? "animate-spin" : ""}`} />
                      <span>Reset</span>
                    </button>

                    <button
                      onClick={() => setIsKaraokeVideoEnabled(false)}
                      className="text-[11px] text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Cambiar a visualizador clásico con vinilo"
                    >
                      <Disc3 className="w-3.5 h-3.5 text-purple-400" />
                      <span className="hidden sm:inline">Modo Vinilo</span>
                    </button>
                  </div>
                </div>

                {/* Marco Widescreen 16:9 del Video de YouTube */}
                <div className="w-full flex-1 min-h-0 relative aspect-video max-h-[64vh] rounded-3xl overflow-hidden border-2 sm:border-4 border-cyan-500/60 shadow-[0_0_50px_rgba(6,182,212,0.3)] bg-black">
                  {karaokeVideoId ? (
                    <>
                      <iframe
                        ref={karaokeIframeRef}
                        key={karaokeVideoId}
                        src={`https://www.youtube.com/embed/${karaokeVideoId}?autoplay=1&enablejsapi=1&origin=${typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : ""}`}
                        title={`Karaoke: ${track.song.title}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />

                      {/* HUD Flotante si la consola de DJ pausó el video */}
                      {isTvPaused && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center pointer-events-none animate-fadeIn z-20">
                          <div className="px-5 py-3 rounded-2xl bg-zinc-950/90 border-2 border-cyan-500/60 text-cyan-300 flex items-center gap-3 shadow-2xl shadow-cyan-950/80">
                            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                            <span className="text-sm font-black tracking-widest uppercase">
                              ⏸ PAUSADO DESDE CONSOLA
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-3 bg-zinc-950 text-cyan-400 p-6 text-center">
                      <Disc3 className="w-12 h-12 animate-spin text-cyan-400" />
                      <span className="text-xs sm:text-sm font-black tracking-widest uppercase text-cyan-300">
                        Sincronizando pista de Karaoke en YouTube...
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {track.song.title} &bull; {track.song.artist}
                      </span>
                    </div>
                  )}

                  {/* Dedicatoria Flotante si existe */}
                  {track.notes && (
                    <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-4 bg-zinc-950/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-cyan-500/40 text-cyan-200 text-xs sm:text-sm font-medium italic shadow-2xl pointer-events-none flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="truncate">&ldquo;{track.notes}&rdquo;</span>
                    </div>
                  )}
                </div>

                {/* Subbarra con información del tema */}
                <div className="w-full flex items-center justify-between px-2 text-[11px] text-zinc-400 shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-black text-white text-xs sm:text-sm truncate">{track.song.title}</span>
                    <span>&bull;</span>
                    <span className="text-cyan-300 font-bold truncate">{track.song.artist}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                    🎤 Pista Sincronizada
                  </span>
                </div>
              </div>
            ) : (
              /* REPRODUCTOR VISUAL DE VINILO (DJ / AUDIO MODE) */
              <div className="w-full h-full flex flex-col items-center justify-center space-y-3 sm:space-y-4 py-1 text-center animate-fadeIn">
                {/* Badge Al Aire o Celebración + Reset */}
                <div className="flex items-center justify-center gap-2 flex-wrap shrink-0">
                  {isTvPaused ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black tracking-widest uppercase border bg-amber-950/80 text-amber-300 border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.35)] animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>⏸ EN PAUSA • CABINA DJ</span>
                    </div>
                  ) : isCelebration ? (
                    <div className="px-3 py-1 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 text-white font-black text-xs sm:text-sm tracking-widest uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(236,72,153,0.5)] animate-bounce">
                      <span>🎂 ¡MOMENTO DE CELEBRACIÓN! 🎉</span>
                    </div>
                  ) : (
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase border ${
                        isKaraoke
                          ? "bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                          : "bg-purple-600/30 text-purple-300 border-purple-500/40"
                      }`}
                    >
                      <Radio className={`w-3.5 h-3.5 animate-pulse ${isKaraoke ? "text-cyan-400" : "text-purple-400"}`} />
                      <span>{isKaraoke ? `🎤 CANTANDO: ${track.table.label}` : "SONANDO EN LA PISTA"}</span>
                    </div>
                  )}

                  {track.isFastPass && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-xs font-black">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>⭐ FAST-PASS</span>
                    </div>
                  )}

                  {isKaraoke && (
                    <button
                      onClick={() => setIsKaraokeVideoEnabled(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 text-xs font-bold hover:bg-cyan-900 transition-colors cursor-pointer shadow-sm"
                      title="Activar video de YouTube con letra en la TV"
                    >
                      <Mic className="w-3 h-3 text-cyan-400" />
                      <span>📺 Ver Video Karaoke</span>
                    </button>
                  )}

                  <button
                    onClick={handleResetScreen}
                    disabled={isResetting}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-600/60 hover:border-rose-400 text-xs font-bold transition-colors cursor-pointer shadow-sm active:scale-95"
                    title="Limpiar y liberar pantalla para que entre el siguiente pedido"
                  >
                    <RotateCcw className={`w-3 h-3 ${isResetting ? "animate-spin" : ""}`} />
                    <span>Limpiar</span>
                  </button>
                </div>

                {/* Vinilo Giratorio Proporcional */}
                <div className="relative my-auto shrink-0">
                  <div
                    className="w-40 h-40 sm:w-48 sm:h-48 xl:w-56 xl:h-56 rounded-full bg-black border-6 sm:border-8 border-zinc-900 shadow-2xl flex items-center justify-center animate-spin [animation-duration:5s] transition-all"
                    style={{ animationPlayState: isTvPaused ? "paused" : "running" }}
                  >
                    {/* Surcos del Vinilo */}
                    <div className="w-32 h-32 sm:w-40 sm:h-40 xl:w-46 xl:h-46 rounded-full border border-zinc-800 flex items-center justify-center">
                      <div className="w-24 h-24 sm:w-30 sm:h-30 xl:w-34 xl:h-34 rounded-full border border-zinc-850 flex items-center justify-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 xl:w-22 xl:h-22 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 border-2 sm:border-4 border-white flex flex-col items-center justify-center text-center p-1 shadow-inner">
                          <Disc3 className={`w-5 h-5 text-white ${!isTvPaused ? "animate-pulse" : ""}`} />
                          <span className="text-[7px] font-black text-white mt-0.5">VIDJEIS</span>
                          <div className="w-2 h-2 rounded-full bg-black mt-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Badge de Pausa */}
                  {isTvPaused && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none animate-fadeIn">
                      <div className="px-3 py-1 rounded-full bg-black/90 border-2 border-amber-500/80 text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xl backdrop-blur-xs">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        <span>⏸ EN PAUSA</span>
                      </div>
                    </div>
                  )}

                  {/* Glow decorativo */}
                  <div
                    className={`absolute inset-0 rounded-full blur-2xl -z-10 transition-opacity duration-500 ${
                      isTvPaused ? "bg-amber-600/10 opacity-40" : "bg-purple-600/25 opacity-100"
                    }`}
                  />
                </div>

                {/* Título & Artista */}
                <div className="space-y-0.5 max-w-lg w-full shrink-0">
                  <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight truncate">
                    {track.song.title}
                  </h1>
                  <p className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 truncate">
                    {track.song.artist}
                  </p>
                </div>

                {/* Caja de Dedicatoria */}
                <div
                  className={`p-2.5 sm:p-3 rounded-2xl border shadow-xl space-y-1 text-center max-w-md w-full shrink-0 ${
                    track.isFastPass
                      ? "bg-gradient-to-r from-amber-950/60 via-zinc-900/90 to-zinc-900/80 border-amber-500/50"
                      : isCelebration
                      ? "bg-gradient-to-r from-pink-950/70 via-purple-950/80 to-zinc-900 border-pink-500/60"
                      : "bg-gradient-to-r from-purple-950/60 via-zinc-900/90 to-zinc-900/80 border-purple-500/40"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 text-xs text-purple-300 font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Pedido por: {track.table.label}</span>
                    {track.guestName && <span className="text-white">({track.guestName})</span>}
                  </div>
                  {track.notes && (
                    <p className="text-xs sm:text-sm text-white font-medium italic line-clamp-2">
                      &ldquo;{track.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Ecualizador Animado */}
                <div className="flex items-end justify-center gap-1 h-6 sm:h-7 pt-1 shrink-0">
                  {[45, 80, 60, 95, 30, 75, 90, 50, 85, 40, 70, 100, 55, 90, 65, 80, 45, 95].map((height, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-t-full bg-gradient-to-t from-purple-600 via-fuchsia-500 to-cyan-400 animate-pulse transition-all duration-300"
                      style={{
                        height: `${height}%`,
                        animationDuration: `${0.4 + (i % 5) * 0.15}s`,
                        animationPlayState: isTvPaused ? "paused" : "running",
                        opacity: isTvPaused ? 0.3 : 1,
                      }}
                    />
                  ))}
                </div>

                {/* Barra de Progreso */}
                <div className="space-y-1 w-full max-w-md shrink-0">
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className={`h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 transition-all duration-1000 ${
                        isTvPaused ? "opacity-60" : "opacity-100"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                    <span className={isTvPaused ? "text-amber-400 font-bold" : ""}>
                      {formatTime(elapsedSeconds)} {isTvPaused && "(Pausa)"}
                    </span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            )
          ) : (
            /* MODO INTERMEDIO (IDLE): Pantalla de Bienvenida y Animación */
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4 p-4 text-center animate-fadeIn">
              <div className="p-4 sm:p-5 rounded-3xl bg-purple-600/20 border-2 border-purple-500/40 text-purple-400 shadow-2xl glow-purple">
                <Disc3 className="w-14 h-14 sm:w-16 sm:h-16 animate-spin [animation-duration:10s]" />
              </div>

              <div className="space-y-2">
                <span className="px-3.5 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-xs font-black uppercase tracking-wider">
                  {isKaraoke ? "🎤 Escenario Karaoke Listo" : "🎧 Pista DJ Abierta"}
                </span>
                <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black text-white tracking-tight leading-tight">
                  ¡LA PISTA ESTÁ ABIERTA!
                </h1>
                <p className="text-sm sm:text-base text-zinc-300 max-w-md mx-auto">
                  Sé el primero en pedir tu canción favorita para cantar o bailar en{" "}
                  <span className="text-purple-300 font-bold">{data.event.tenantName}</span>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 space-y-2 max-w-md mx-auto shadow-xl">
                <div className="font-bold text-white flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span>Pide música desde tu mesa con tu celular</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Apunta la cámara al código QR de la derecha para elegir tus temas favoritos al instante.
                </p>
                {/* Atajos rápidos en versión móvil */}
                <div className="lg:hidden pt-1 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setMobileTab("qr")}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-purple-900/40 active:scale-95 transition-all"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Ver QR para Pedir</span>
                  </button>
                  <button
                    onClick={() => setMobileTab("queue")}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center gap-1.5 border border-zinc-700 active:scale-95 transition-all"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Ver Cola ({data.upcomingQueue?.length ?? 0})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Social Lounge Polaroid Showcase en la esquina del centro */}
          {approvedPhotos.length > 0 && (
            <div
              key={approvedPhotos[currentPhotoIdx % approvedPhotos.length]?.id || currentPhotoIdx}
              className="hidden 2xl:block absolute bottom-2 right-2 z-20 w-44 bg-zinc-950/95 border-2 border-pink-500/40 rounded-2xl p-2 shadow-2xl shadow-pink-500/20 rotate-1 hover:rotate-0 transition-all animate-fadeIn"
            >
              <div className="flex items-center justify-between text-[9px] font-bold text-pink-400 uppercase mb-1">
                <span className="flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  <span>Social Lounge</span>
                </span>
                <span className="font-mono text-zinc-400">
                  {approvedPhotos[currentPhotoIdx % approvedPhotos.length]?.table.label}
                </span>
              </div>
              <div className="aspect-square rounded-xl overflow-hidden bg-black border border-zinc-800 relative">
                {photoFitMode === "BLUR_FILL" ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={approvedPhotos[currentPhotoIdx % approvedPhotos.length]?.imageUrl}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50 scale-125 pointer-events-none"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={approvedPhotos[currentPhotoIdx % approvedPhotos.length]?.imageUrl}
                      alt="Foto del público"
                      className="relative z-10 w-full h-full object-contain drop-shadow-md"
                    />
                  </>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={approvedPhotos[currentPhotoIdx % approvedPhotos.length]?.imageUrl}
                    alt="Foto del público"
                    className={`w-full h-full ${photoFitMode === "CONTAIN" ? "object-contain" : "object-cover"}`}
                  />
                )}
              </div>
              <div className="mt-1 text-center">
                {approvedPhotos[currentPhotoIdx % approvedPhotos.length]?.caption && (
                  <p className="text-[10px] text-white italic line-clamp-1">
                    &ldquo;{approvedPhotos[currentPhotoIdx % approvedPhotos.length]?.caption}&rdquo;
                  </p>
                )}
                <span className="text-[9px] text-pink-300 font-semibold block mt-0.5">
                  &mdash; {approvedPhotos[currentPhotoIdx % approvedPhotos.length]?.guestName}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA 3 (DERECHA - lg:col-span-3 xl:col-span-3): QR GIGANTE QUE CUBRE EL ESPACIO */}
        <aside
          className={`${
            mobileTab === "qr" ? "flex flex-1" : "hidden"
          } lg:flex lg:col-span-3 xl:col-span-3 h-full min-h-0 flex-col items-center justify-between rounded-3xl bg-zinc-950/85 border border-purple-500/30 p-3 sm:p-4 xl:p-5 shadow-2xl backdrop-blur-md overflow-hidden text-center`}
        >
          {/* Encabezado del QR */}
          <div className="space-y-1 w-full shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600/20 text-purple-300 border border-purple-500/40 text-[11px] font-black uppercase tracking-wider">
              <QrCode className="w-3.5 h-3.5 text-purple-400" />
              <span>Pide desde tu Mesa</span>
            </div>
            <h3 className="text-sm sm:text-base xl:text-lg font-black text-white tracking-tight leading-tight">
              {isKaraoke ? "¡CANTA TU TEMA!" : "¿QUÉ QUIERES ESCUCHAR?"}
            </h3>
            <p className="text-[11px] text-zinc-400">
              Apunta la cámara de tu celular
            </p>
          </div>

          {/* Tarjeta del Código QR Gigante */}
          <div className="my-auto py-2 flex flex-col items-center justify-center shrink-0 w-full">
            <div className="p-3 sm:p-3.5 xl:p-4 bg-white rounded-3xl shadow-[0_0_40px_rgba(168,85,247,0.35)] border-4 border-purple-400/50 inline-block transition-transform duration-300 hover:scale-[1.02]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.qr.dataUrl}
                alt="Escanea para pedir música o karaoke"
                className="w-44 h-44 sm:w-52 sm:h-52 lg:w-48 lg:h-48 xl:w-60 xl:h-60 2xl:w-72 2xl:h-72 object-contain"
              />
            </div>
            <div className="mt-2 px-3 py-1 rounded-xl bg-purple-950/90 border border-purple-600/60 text-purple-200 font-mono text-xs font-black tracking-widest shadow-md">
              CÓDIGO: {data.event.code}
            </div>

            {/* Enlace directo para abrir la app o catálogo web desde el mismo dispositivo móvil */}
            {data.qr?.scanUrl && (
              <a
                href={data.qr.scanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="lg:hidden mt-2 px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all w-full max-w-[240px]"
              >
                <QrCode className="w-3.5 h-3.5 text-purple-400" />
                <span>Pedir directamente aquí</span>
              </a>
            )}
          </div>

          {/* Guía en 3 Pasos y Wi-Fi */}
          <div className="w-full space-y-2 pt-2 border-t border-zinc-800/80 shrink-0">
            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="p-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[10px] font-black text-purple-400 block">1. CÁMARA</span>
                <span className="text-[9px] text-zinc-400 block leading-tight">Abre tu app</span>
              </div>
              <div className="p-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[10px] font-black text-cyan-400 block">2. ESCANEA</span>
                <span className="text-[9px] text-zinc-400 block leading-tight">Apunta al QR</span>
              </div>
              <div className="p-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[10px] font-black text-amber-400 block">3. PIDE</span>
                <span className="text-[9px] text-zinc-400 block leading-tight">Elige tu tema</span>
              </div>
            </div>

            {data.branding?.wifiSsid && (
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-300 bg-zinc-900/90 py-1 px-2 rounded-xl border border-zinc-800">
                <Wifi className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="text-zinc-400">Wi-Fi:</span>
                <span className="font-bold text-white truncate max-w-[90px]">{data.branding.wifiSsid}</span>
                {data.branding.wifiPassword && (
                  <span className="font-mono text-cyan-300 truncate max-w-[80px]">({data.branding.wifiPassword})</span>
                )}
              </div>
            )}

            <span className="text-[10px] font-semibold text-zinc-500 block">
              ⚡ Catálogo digital sin descargas
            </span>
          </div>
        </aside>
      </main>

      {/* 🚀 Capa de Reacciones Flotantes en Vivo (SSE 0ms) */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {reactions.map((rx) => (
          <div
            key={rx.id}
            className="absolute bottom-0 flex flex-col items-center animate-reactionFloat"
            style={{
              left: `${rx.xPercent}%`,
            }}
          >
            <span className="text-4xl sm:text-5xl filter drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] select-none">
              {rx.reaction}
            </span>
            {rx.tableLabel && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/80 text-zinc-200 border border-white/20 mt-1 whitespace-nowrap shadow-lg">
                {rx.tableLabel}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ⭐ Spotlight de Foto Destacada en Pantalla Gigante (12s) */}
      {featuredPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="max-w-2xl w-full bg-gradient-to-b from-amber-950/90 via-zinc-950 to-zinc-950 border-4 border-amber-500 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_0_70px_rgba(245,158,11,0.5)] text-center relative overflow-hidden">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-xs sm:text-sm font-black tracking-widest uppercase animate-bounce">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>⭐ MOMENTO DESTACADO DE LA NOCHE ⭐</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>

            <div className="aspect-square max-h-[55vh] mx-auto rounded-2xl overflow-hidden bg-black border-2 border-amber-500/40 shadow-2xl relative">
              {photoFitMode === "BLUR_FILL" ? (
                <>
                  {/* Fondo ambiental difuminado para no tener bordes vacíos en TV */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featuredPhoto.photo.imageUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-50 scale-125 pointer-events-none"
                  />
                  {/* Foto original nítida centrada completa sin recortes */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featuredPhoto.photo.imageUrl}
                    alt="Foto Destacada"
                    className="relative z-10 w-full h-full object-contain drop-shadow-2xl"
                  />
                </>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={featuredPhoto.photo.imageUrl}
                  alt="Foto Destacada"
                  className={`w-full h-full ${photoFitMode === "CONTAIN" ? "object-contain" : "object-cover"}`}
                />
              )}
              <div className="absolute top-3 left-3 z-20 px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md text-amber-300 border border-amber-500/50 text-xs font-mono font-bold">
                {featuredPhoto.photo.table.label}
              </div>
            </div>

            <div className="space-y-2">
              {featuredPhoto.photo.caption && (
                <p className="text-xl sm:text-2xl font-black text-white italic drop-shadow-md">
                  &ldquo;{featuredPhoto.photo.caption}&rdquo;
                </p>
              )}
              <p className="text-sm font-bold text-amber-300">
                de {featuredPhoto.photo.guestName}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 👏 Aplausómetro Gigante en Pantalla */}
      {applause && applause.active && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="max-w-2xl w-full bg-zinc-950 border-4 border-amber-500 rounded-3xl p-8 space-y-6 shadow-[0_0_70px_rgba(245,158,11,0.4)] text-center relative overflow-hidden">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/50 text-xs sm:text-sm font-black tracking-widest uppercase animate-bounce">
                <span>👏 APLAUSÓMETRO EN VIVO</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                ¡CALIFIQUEN A: {applause.targetTableLabel}!
              </h2>
              <p className="text-sm sm:text-base text-zinc-300 font-medium">
                ¡Toca repetidamente el botón de aplausos en tu celular para subir la barra!
              </p>
            </div>

            {/* Barra Medidora Gigante */}
            <div className="space-y-2">
              <div className="w-full h-12 sm:h-16 bg-zinc-900 rounded-2xl overflow-hidden border-2 border-zinc-800 p-1.5 relative">
                <div
                  className="h-full rounded-xl bg-gradient-to-r from-yellow-500 via-amber-500 to-red-500 transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.6)]"
                  style={{ width: `${applause.score}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center font-black font-mono text-xl sm:text-2xl text-white drop-shadow-md">
                  {Math.round(applause.score)}% DE HYPE
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm font-black text-amber-400">
                <span>🔥 TIBIO</span>
                <span>🔥🔥 ¡FIESTA TOTAL!</span>
                <span>💥💥 ¡LEGENDARIO!</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎤 Banner de Llamado a Cantante al Escenario (Karaoke Stage Call) */}
      {singerCall && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="max-w-2xl w-full bg-gradient-to-b from-cyan-950/95 via-zinc-950 to-zinc-950 border-4 border-cyan-400 rounded-3xl p-8 space-y-6 shadow-[0_0_80px_rgba(6,182,212,0.5)] text-center relative overflow-hidden">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400 text-sm font-black tracking-widest uppercase animate-bounce">
              <Mic className="w-5 h-5 text-cyan-400" />
              <span>🎤 ¡ATENCIÓN: AL ESCENARIO A CANTAR! 🎤</span>
              <Mic className="w-5 h-5 text-cyan-400" />
            </div>

            <div className="space-y-3">
              <div className="text-4xl sm:text-6xl font-black text-white tracking-tight drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]">
                {singerCall.singerName ? singerCall.singerName : singerCall.tableLabel}
              </div>
              {singerCall.singerName && (
                <div className="inline-block px-3 py-1 rounded-xl bg-cyan-950 border border-cyan-700 text-cyan-300 font-mono text-sm font-bold">
                  {singerCall.tableLabel}
                </div>
              )}
            </div>

            {singerCall.songTitle && (
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-cyan-500/40 shadow-inner space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                  Tema a Interpretar:
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-amber-300">
                  {singerCall.songTitle}
                </h3>
                {singerCall.artist && (
                  <p className="text-base text-zinc-300 font-semibold">{singerCall.artist}</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-xs font-bold text-cyan-300 animate-pulse">
              <span>🎙️</span>
              <span>El micrófono está listo para ti en el escenario. ¡A romperla!</span>
              <span>🌟</span>
            </div>
          </div>
        </div>
      )}

      {/* 🎰 Ruleta de la Suerte de Mesas */}
      {roulette && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="max-w-xl w-full bg-gradient-to-b from-emerald-950/90 via-zinc-950 to-zinc-950 border-4 border-emerald-500 rounded-3xl p-8 space-y-6 shadow-[0_0_70px_rgba(16,185,129,0.5)] text-center relative overflow-hidden">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs sm:text-sm font-black tracking-widest uppercase animate-bounce">
                <span>🎰 RULETA DE LA SUERTE</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                {roulette.spinning ? "¡SORTEANDO ENTRE LAS MESAS...!" : "🎉 ¡TENEMOS MESA GANADORA! 🎉"}
              </h2>
            </div>

            {/* Display de la Ruleta */}
            <div className="p-8 rounded-2xl bg-zinc-900 border-2 border-emerald-500/50 shadow-inner flex flex-col items-center justify-center min-h-[160px]">
              <span
                className={`text-4xl sm:text-6xl font-black tracking-wider transition-all duration-100 ${
                  roulette.spinning
                    ? "text-emerald-400 scale-105"
                    : "text-amber-300 scale-125 animate-bounce drop-shadow-[0_0_25px_rgba(245,158,11,0.8)]"
                }`}
              >
                {roulette.spinning
                  ? roulette.tables[roulette.currentIndex % roulette.tables.length]
                  : roulette.winner}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-black/60 border border-emerald-500/30">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Premio:</p>
              <p className="text-base sm:text-lg font-black text-emerald-300 mt-0.5">
                {roulette.prize}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estilos de animación para reacciones flotantes */}
      <style jsx global>{`
        @keyframes reactionFloat {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          15% { opacity: 1; transform: translateY(-15vh) scale(1.2); }
          85% { opacity: 1; transform: translateY(-75vh) scale(1); }
          100% { transform: translateY(-95vh) scale(0.8); opacity: 0; }
        }
        .animate-reactionFloat {
          animation: reactionFloat 3.8s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(24, 24, 27, 0.4);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.4);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.8);
        }
      `}</style>
    </div>
  );
}
