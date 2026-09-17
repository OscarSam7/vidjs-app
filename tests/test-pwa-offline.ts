/**
 * Test Suite: PWA Instalable & Resiliencia Offline (Service Workers)
 * Valida:
 * 1. Endpoint dinámico /manifest.webmanifest (formato PWA, display standalone, colores, iconos, shortcuts)
 * 2. Service Worker public/sw.js (headers, ciclo de vida, bypass SSE, fallback offline)
 * 3. Página de contingencia public/offline.html (diseño neón, auto-reconexión, script)
 * 4. Assets de iconos PWA (/icons/icon.svg, /icons/icon-192x192.png, /icons/icon-512x512.png, maskable)
 * 5. Integración en HTML (meta viewport, links de manifiesto y PwaRegistrar)
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runPwaOfflineTests() {
  console.log("\n=================================================================");
  console.log("📱 INICIANDO TEST SUITE: PWA INSTALABLE & RESILIENCIA OFFLINE");
  console.log("=================================================================\n");

  // -------------------------------------------------------------
  // 1. Validar Manifiesto Web PWA (/manifest.webmanifest)
  // -------------------------------------------------------------
  console.log("📋 1. Validando Manifiesto PWA (/manifest.webmanifest)...");

  const manifestRes = await fetch(`${BASE_URL}/manifest.webmanifest`);
  assert(manifestRes.ok, "GET /manifest.webmanifest responde 200 OK");

  const manifestContentType = manifestRes.headers.get("content-type") || "";
  assert(
    manifestContentType.includes("manifest+json") || manifestContentType.includes("application/json"),
    `Header Content-Type es válido para PWA manifest (${manifestContentType})`
  );

  const manifest = await manifestRes.json();
  assert(manifest.name === "Vidjs - Night Experience OS", `Nombre completo de PWA: '${manifest.name}'`);
  assert(manifest.short_name === "Vidjs", `Nombre corto PWA: '${manifest.short_name}'`);
  assert(manifest.display === "standalone", `Modo de visualización es 'standalone' (sin barra de navegador)`);
  assert(manifest.start_url === "/", `Start URL configurada en raíz: '${manifest.start_url}'`);
  assert(manifest.background_color === "#040406", `Color de fondo coincide con estética dark (${manifest.background_color})`);
  assert(manifest.theme_color === "#7c3aed", `Color de acento neón coincide (${manifest.theme_color})`);

  // Validar iconos en manifiesto
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 3, `Manifiesto incluye ${manifest.icons?.length} iconos`);
  const has192 = manifest.icons?.some((i: any) => i.sizes === "192x192" && i.type === "image/png");
  const has512 = manifest.icons?.some((i: any) => i.sizes === "512x512" && i.type === "image/png");
  const hasMaskable = manifest.icons?.some((i: any) => i.purpose === "maskable");
  assert(has192, "Icono 192x192 PNG presente en manifest");
  assert(has512, "Icono 512x512 PNG presente en manifest");
  assert(hasMaskable, "Icono con purpose 'maskable' presente para Android adaptive icons");

  // Validar shortcuts rápidos
  assert(Array.isArray(manifest.shortcuts) && manifest.shortcuts.length >= 2, `Manifiesto define ${manifest.shortcuts?.length} accesos directos`);
  const hasDjShortcut = manifest.shortcuts?.some((s: any) => s.url === "/dashboard/dj");
  const hasGuestShortcut = manifest.shortcuts?.some((s: any) => s.url === "/guest");
  assert(hasDjShortcut, "Acceso directo a Cabina DJ configurado");
  assert(hasGuestShortcut, "Acceso directo a Mi Noche (Mesas) configurado");

  // -------------------------------------------------------------
  // 2. Validar Service Worker (public/sw.js)
  // -------------------------------------------------------------
  console.log("\n⚙️ 2. Validando Service Worker (public/sw.js)...");

  const swRes = await fetch(`${BASE_URL}/sw.js`);
  assert(swRes.ok, "GET /sw.js responde 200 OK");

  const swContentType = swRes.headers.get("content-type") || "";
  assert(
    swContentType.includes("javascript"),
    `Header Content-Type del Service Worker es JavaScript (${swContentType})`
  );

  const swCode = await swRes.text();
  assert(swCode.includes("CACHE_NAME"), "Service Worker define versión de cache");
  assert(swCode.includes("OFFLINE_URL"), "Service Worker define URL de contingencia offline");
  assert(swCode.includes("skipWaiting"), "Service Worker implementa auto-activación skipWaiting()");
  assert(swCode.includes("clients.claim"), "Service Worker reclama clientes activos con clients.claim()");
  assert(swCode.includes("/api/v1/realtime"), "Service Worker incluye bypass estricto para eventos SSE en vivo");
  assert(swCode.includes("offline.html"), "Service Worker enlaza fallback a offline.html");

  // -------------------------------------------------------------
  // 3. Validar Página de Contingencia Offline (public/offline.html)
  // -------------------------------------------------------------
  console.log("\n🛡️ 3. Validando Página de Contingencia Offline (/offline.html)...");

  const offlineRes = await fetch(`${BASE_URL}/offline.html`);
  assert(offlineRes.ok, "GET /offline.html responde 200 OK");

  const offlineContentType = offlineRes.headers.get("content-type") || "";
  assert(offlineContentType.includes("text/html"), `Content-Type es HTML (${offlineContentType})`);

  const offlineHtml = await offlineRes.text();
  assert(offlineHtml.includes("Sin Conexión en el Local"), "Página contiene titular amigable de contingencia");
  assert(offlineHtml.includes("Reintentar Conexión"), "Página contiene botón de reintento manual");
  assert(offlineHtml.includes("window.addEventListener('online'"), "Página incluye listener para auto-recarga cuando regrese la señal");
  assert(offlineHtml.includes("Night Experience OS"), "Página mantiene la marca e identidad visual de Vidjs");

  // -------------------------------------------------------------
  // 4. Validar Disponibilidad de Iconos PWA
  // -------------------------------------------------------------
  console.log("\n🎨 4. Validando Recursos de Iconos PWA...");

  const svgRes = await fetch(`${BASE_URL}/icons/icon.svg`);
  assert(svgRes.ok, "GET /icons/icon.svg responde 200 OK");
  assert((svgRes.headers.get("content-type") || "").includes("svg"), "Formato de icono es SVG válido");

  const png192Res = await fetch(`${BASE_URL}/icons/icon-192x192.png`);
  assert(png192Res.ok, "GET /icons/icon-192x192.png responde 200 OK");
  assert((png192Res.headers.get("content-type") || "").includes("png"), "Formato 192x192 es PNG válido");
  const png192Blob = await png192Res.arrayBuffer();
  assert(png192Blob.byteLength > 5000, `Tamaño binario del icono 192x192 es robusto (${png192Blob.byteLength} bytes)`);

  const png512Res = await fetch(`${BASE_URL}/icons/icon-512x512.png`);
  assert(png512Res.ok, "GET /icons/icon-512x512.png responde 200 OK");
  const png512Blob = await png512Res.arrayBuffer();
  assert(png512Blob.byteLength > 10000, `Tamaño binario del icono 512x512 es robusto (${png512Blob.byteLength} bytes)`);

  const maskableRes = await fetch(`${BASE_URL}/icons/icon-maskable.png`);
  assert(maskableRes.ok, "GET /icons/icon-maskable.png responde 200 OK");

  // -------------------------------------------------------------
  // 5. Validar Integración en HTML (Layout & App Shells)
  // -------------------------------------------------------------
  console.log("\n📱 5. Validando Integración en Layout y Vistas Principales...");

  const homeRes = await fetch(`${BASE_URL}/`);
  assert(homeRes.ok, "Página principal responde 200 OK");
  const homeHtml = await homeRes.text();
  assert(homeHtml.includes("manifest.webmanifest"), "HTML de la app incluye enlace al manifiesto PWA");

  const guestRes = await fetch(`${BASE_URL}/guest`);
  assert(guestRes.ok, "Página de Comensales responde 200 OK");

  const djRes = await fetch(`${BASE_URL}/dashboard/dj`);
  assert(djRes.ok, "Página de Cabina DJ responde 200 OK");

  // -------------------------------------------------------------
  // Resumen Final
  // -------------------------------------------------------------
  console.log("\n=================================================================");
  console.log(`🏁 RESULTADO FINAL: ${passed}/${passed + failed} pruebas pasadas (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPwaOfflineTests().catch((err) => {
  console.error("Error fatal en suite de pruebas PWA:", err);
  process.exit(1);
});
