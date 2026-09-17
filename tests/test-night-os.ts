/**
 * TEST SUITE: NIGHT EXPERIENCE OS (Centro de Control, Pulse, Intelligence, Moods)
 */

import { calculateNightPulse } from "../src/lib/pulse/night-pulse";
import { generateQueueIntelligence } from "../src/lib/dj/queue-intelligence";

const BASE_URL = "http://localhost:3000";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runNightOsTests() {
  console.log("\n=======================================================");
  console.log("🌙 INICIANDO SUITE DE PRUEBAS: NIGHT EXPERIENCE OS");
  console.log("=======================================================\n");

  // -------------------------------------------------------------
  // 1. Pruebas Unitarias del Motor Night Pulse
  // -------------------------------------------------------------
  console.log("📊 1. Validando Algoritmo de Night Pulse (Nivel de Energía)...");

  const pulseLow = calculateNightPulse({
    activeTables: 0,
    totalTables: 20,
    requestsLast15m: 0,
    queuedWaiters: 0,
  });
  assert(pulseLow.score === 0 && pulseLow.level === "LOW", "Noche sin mesas ni pedidos reporta LOW (0%)");

  const pulseWarm = calculateNightPulse({
    activeTables: 6,
    totalTables: 20,
    requestsLast15m: 3,
    queuedWaiters: 2,
  });
  assert(pulseWarm.score > 20 && pulseWarm.level === "WARM", `Mesas iniciales reportan nivel WARM (${pulseWarm.score}%)`);

  const pulseActive = calculateNightPulse({
    activeTables: 12,
    totalTables: 20,
    requestsLast15m: 6,
    queuedWaiters: 4,
  });
  assert(pulseActive.score >= 46 && pulseActive.level === "ACTIVE", `Actividad constante reporta nivel ACTIVE (${pulseActive.score}%)`);

  const pulsePeak = calculateNightPulse({
    activeTables: 20,
    totalTables: 20,
    requestsLast15m: 10,
    queuedWaiters: 8,
  });
  assert(pulsePeak.score >= 89 && pulsePeak.level === "PEAK", `Pista llena y cola colmada reporta nivel PEAK (${pulsePeak.score}%)`);

  // -------------------------------------------------------------
  // 2. Pruebas Unitarias del Motor Queue Intelligence
  // -------------------------------------------------------------
  console.log("\n🧠 2. Validando Queue Intelligence & Explainability...");

  const mockPending = [
    {
      id: "req-1",
      table: { id: "tbl-1", label: "Mesa 1" },
      notes: "🎂 ¡Feliz Cumpleaños a Julieta!",
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: "req-2",
      table: { id: "tbl-2", label: "Mesa 2" },
      notes: null,
      createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 min esperando
    },
  ];

  const mockQueue = [
    {
      id: "q-1",
      orderIndex: 0,
      songRequest: {
        id: "req-3",
        table: { id: "tbl-3", label: "Mesa 3" },
        notes: null,
      },
    },
    {
      id: "q-2",
      orderIndex: 1,
      songRequest: {
        id: "req-4",
        table: { id: "tbl-3", label: "Mesa 3" }, // Misma mesa consecutiva
        notes: null,
      },
    },
  ];

  const suggestions = generateQueueIntelligence({
    pendingRequests: mockPending,
    queue: mockQueue,
  });

  const celebrationSug = suggestions.find((s) => s.type === "CELEBRATION");
  assert(Boolean(celebrationSug), "Detecta sugerencia de celebración por dedicatoria de cumpleaños");
  assert(celebrationSug?.badge.label.includes("Festejo") ?? false, "Aplica badge '🎂 Festejo' para el DJ");

  const waitTimeSug = suggestions.find((s) => s.type === "WAIT_TIME");
  assert(Boolean(waitTimeSug), "Detecta sugerencia de espera prolongada (>15 min)");

  const balanceSug = suggestions.find((s) => s.type === "FAIR_SHARE");
  assert(Boolean(balanceSug), "Detecta consecutividad de la misma mesa en la cola y sugiere balance");

  // -------------------------------------------------------------
  // 3. Pruebas de Integración con el Servidor Local
  // -------------------------------------------------------------
  console.log("\n🌐 3. Validando API Endpoints en Servidor de Producción...");

  try {
    // 3.1 Login como Owner
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@retrobar.com", password: "Password123!" }),
    });
    assert(loginRes.ok, "Login exitoso de Owner");
    const cookie = loginRes.headers.get("set-cookie") || "";

    // 3.2 Endpoint Night Control State
    const nightControlRes = await fetch(`${BASE_URL}/api/v1/night-control/state`, {
      headers: { Cookie: cookie },
    });
    assert(nightControlRes.ok, "GET /api/v1/night-control/state responde 200 OK");
    const ncJson = await nightControlRes.json();
    assert(ncJson.success === true, "Night Control reporta success=true");
    assert(ncJson.data.hasActiveEvent === true, "Night Control detecta evento activo");
    assert(Boolean(ncJson.data.pulse), "Night Control incluye cálculo de Night Pulse");
    assert(Array.isArray(ncJson.data.tables), "Night Control retorna matriz de mesas para RoomMapMini");
    assert(ncJson.data.tables.length > 0, `Retorna ${ncJson.data.tables.length} mesas en el Room Map`);

    // 3.3 Catálogo con filtro de Mood
    const moodFiestaRes = await fetch(`${BASE_URL}/api/v1/catalog/songs?mood=fiesta`);
    assert(moodFiestaRes.ok, "GET /api/v1/catalog/songs?mood=fiesta responde 200 OK");
    const fiestaJson = await moodFiestaRes.json();
    assert(fiestaJson.data.songs.length > 0, `Catálogo filtra canciones para mood 'fiesta' (${fiestaJson.data.songs.length} encontradas)`);

    const moodRomanticaRes = await fetch(`${BASE_URL}/api/v1/catalog/songs?mood=romantica`);
    assert(moodRomanticaRes.ok, "GET /api/v1/catalog/songs?mood=romantica responde 200 OK");
    const romanticaJson = await moodRomanticaRes.json();
    assert(romanticaJson.data.songs.length > 0, `Catálogo filtra canciones para mood 'romantica' (${romanticaJson.data.songs.length} encontradas)`);

    // 3.4 Flujo de Solicitud de Cliente con Tag de Celebración
    const qrScanRes = await fetch(`${BASE_URL}/qr/qr_centro_m2`, {
      redirect: "manual",
    });
    assert(qrScanRes.status === 307 || qrScanRes.status === 302, "Escaneo de QR de Mesa 2 redirige con éxito (307/302)");
    const setCookie = qrScanRes.headers.get("set-cookie") || "";
    const guestCookie = setCookie.split(";")[0];
    assert(guestCookie.includes("vidjs_guest_session"), "Escaneo de QR emite cookie vidjs_guest_session");

    const submitRes = await fetch(`${BASE_URL}/api/v1/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: guestCookie,
      },
      body: JSON.stringify({
        customTitle: "Mil Horas",
        customArtist: "Los Abuelos de la Nada",
        guestName: "Martín & Grupo",
        notes: "🎂 ¡Festejando el cumple de Martín en Mesa 2!",
      }),
    });
    // Podría ser 200 o 429 si se alcanzó el límite anti-spam de la mesa
    assert(
      submitRes.ok || submitRes.status === 429,
      "POST /api/v1/requests procesa solicitud con dedicatoria de cumpleaños (200 o 429 Fair-Play)"
    );

    // 3.5 Enriquecimiento de GET /api/v1/requests (Mi Noche)
    const getRequestsRes = await fetch(`${BASE_URL}/api/v1/requests`, {
      headers: { Cookie: guestCookie },
    });
    assert(getRequestsRes.ok, "GET /api/v1/requests responde 200 OK");
    const reqJson = await getRequestsRes.json();
    assert(reqJson.data.session.table.label === "Mesa 2 (Pista)", "Sesión identifica correctamente la mesa del cliente");
    assert("currentPlaying" in reqJson.data, "Respuesta de comensal incluye objeto 'currentPlaying'");
    assert(Array.isArray(reqJson.data.requests), "Respuesta incluye lista de pedidos de la mesa");
  } catch (err) {
    console.error("Error en pruebas de integración:", err);
  }

  console.log("\n=======================================================");
  console.log(`🏁 RESULTADO FINAL: ${passedTests}/${totalTests} pruebas pasadas (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("=======================================================\n");

  if (passedTests !== totalTests) {
    process.exitCode = 1;
  }
}

runNightOsTests();
