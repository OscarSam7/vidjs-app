"use client";

import { useState, useEffect } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      const timer = setTimeout(() => setJustReconnected(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setJustReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const res = await fetch("/api/v1/branding", {
        method: "HEAD",
        cache: "no-store",
      });
      if (res.ok) {
        setIsOffline(false);
        setJustReconnected(true);
        setTimeout(() => setJustReconnected(false), 3500);
      }
    } catch {
      // Sigue offline
    } finally {
      setIsChecking(false);
    }
  };

  if (!isOffline && !justReconnected) return null;

  return (
    <aside
      aria-label="Estado de conexión"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] max-w-[92vw] sm:max-w-md w-full px-2 pointer-events-auto transition-all duration-300 animate-fadeIn"
    >
      {isOffline ? (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs font-semibold shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-amber-900/60 text-amber-400 shrink-0">
              <WifiOff className="w-4 h-4" />
            </span>
            <div className="truncate">
              <div className="font-bold text-amber-100">Sin conexión en el local</div>
              <div className="text-[11px] text-amber-300/80 font-normal truncate">
                Tus datos locales están a salvo. Esperando señal...
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isChecking}
            className="px-2.5 py-1 rounded-xl bg-amber-900/80 hover:bg-amber-800 text-amber-200 text-[11px] font-bold shrink-0 flex items-center gap-1 border border-amber-700/50 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3 h-3 ${isChecking ? "animate-spin" : ""}`}
            />
            <span>Reintentar</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-bold shadow-2xl backdrop-blur-md animate-bounce">
          <Wifi className="w-4 h-4 text-emerald-400" />
          <span>⚡ Conexión restablecida con el local</span>
        </div>
      )}
    </aside>
  );
}
