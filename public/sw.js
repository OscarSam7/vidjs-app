/**
 * Service Worker: Vidjs Night Experience OS
 * Estrategias de cache inteligente:
 * - Pre-cacheo esencial (offline.html, iconos, manifest)
 * - Network-First con fallback a offline.html para navegaciones de páginas
 * - Cache-First para estáticos e iconos
 * - Bypass estricto para Server-Sent Events (SSE /api/v1/realtime) y mutaciones
 */

const CACHE_NAME = "vidjs-pwa-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/icons/icon.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable.png",
];

// Instalación: Guardar recursos de contingencia esenciales
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activación: Purgar versiones viejas de cache y reclamar control inmediato
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptor de Peticiones Fetch
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. Ignorar métodos que no sean GET
  if (event.request.method !== "GET") {
    return;
  }

  // 2. Bypass estricto para Server-Sent Events (SSE) y WebSockets
  if (url.pathname.startsWith("/api/v1/realtime")) {
    return;
  }

  // 3. Estrategia para Navegación de Páginas HTML (Network-First -> Cache -> Contingencia Offline)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Si la respuesta es exitosa, guardar copia en cache
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Si no hay red, intentar responder con la página en cache
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si tampoco está en cache, servir la página de contingencia nocturna
          const offlinePage = await caches.match(OFFLINE_URL);
          return offlinePage || new Response("Sin conexión a internet", { status: 503 });
        })
    );
    return;
  }

  // 4. Estrategia para Recursos Estáticos (Iconos, CSS, JS) - Cache-First con actualización de fondo
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js")
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Devolver del cache y revalidar en segundo plano
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, networkResponse);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // Si no está en cache, buscar en la red y cachear
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 5. Peticiones de API normales: Intentar red con timeout
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            error: {
              code: "OFFLINE",
              message: "Sin conexión a internet en la sala. Tus datos locales se conservan.",
            },
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }
});
