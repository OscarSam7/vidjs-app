"use client";

import { useEffect } from "react";
import OfflineIndicator from "./OfflineIndicator";

export default function PwaRegistrar() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Registrar el Service Worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Escuchar actualizaciones de nueva versión
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (
                  installingWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // Nueva versión disponible
                  console.log(
                    "[Vidjs PWA] Nueva versión disponible y lista para usar."
                  );
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn("[Vidjs PWA] Error registrando Service Worker:", err);
        });
    }
  }, []);

  return <OfflineIndicator />;
}
