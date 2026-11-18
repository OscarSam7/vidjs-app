"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __PWA_DEFERRED_PROMPT__?: BeforeInstallPromptEvent | null;
  }
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Comprobar estado de instalación inicial
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detectar si ya corre instalada en pantalla de inicio (Standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Si ya se capturó el prompt en el head antes del render de React
    if (window.__PWA_DEFERRED_PROMPT__) {
      setDeferredPrompt(window.__PWA_DEFERRED_PROMPT__);
    }

    // Escuchar cuando el prompt esté listo
    const handlePromptReady = () => {
      if (window.__PWA_DEFERRED_PROMPT__) {
        setDeferredPrompt(window.__PWA_DEFERRED_PROMPT__);
      }
    };

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.__PWA_DEFERRED_PROMPT__ = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      window.__PWA_DEFERRED_PROMPT__ = null;
      setDeferredPrompt(null);
    };

    window.addEventListener("pwa-prompt-ready", handlePromptReady);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("pwa-prompt-ready", handlePromptReady);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Función de disparo directo al botón
  const triggerDirectInstall = useCallback(async () => {
    const promptEvent = deferredPrompt || (typeof window !== "undefined" ? window.__PWA_DEFERRED_PROMPT__ : null);

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          if (typeof window !== "undefined") {
            window.__PWA_DEFERRED_PROMPT__ = null;
          }
          setDeferredPrompt(null);
          return true;
        }
      } catch (err) {
        console.warn("Error disparando instalador nativo:", err);
      }
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstalled,
    triggerDirectInstall,
  };
}
