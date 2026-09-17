/**
 * SUITE DE PRUEBAS INTEGRALES: NIGHT EXPERIENCE OS (ADVANCED 4 DIMENSIONS)
 * 
 * 1. Monetización & Flash Deals por Pulse
 * 2. Gamificación en Vivo (Duelos Musicales con Votación Realtime)
 * 3. Muro de Fotos & Social Lounge (Subida, Moderación DJ y Proyección)
 * 4. Night Analytics & Reporte Post-Noche (Curva Horaria, Hora Pico, Top Mesas)
 */

import { getActiveFlashDeal } from "../src/lib/pulse/flash-deals";
import { createDuel, getActiveDuel, voteInDuel, cancelDuel } from "../src/lib/dj/duel-state";

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

async function runAdvancedNightOsTests() {
  console.log("\n=================================================================");
  console.log("🚀 INICIANDO TEST SUITE: NIGHT EXPERIENCE OS (4 DIMENSIONES)");
  console.log("=================================================================\n");

  // =================================================================
  // DIMENSIÓN 1: FLASH DEALS & MONETIZACIÓN EN MESA
  // =================================================================
  console.log("💰 DIMENSIÓN 1: Validando Flash Deals Dinámicos por Pulse & Fast-Pass...");

  const dealLow = getActiveFlashDeal("LOW");
  assert(
    dealLow !== null && (dealLow.badgeText.includes("HORA VALLE") || dealLow.title.includes("Calentamiento")),
    `Nivel LOW entrega promo de arranque: '${dealLow?.title}' (${dealLow?.badgeText})`
  );

  const dealWarm = getActiveFlashDeal("WARM");
  assert(
    dealWarm !== null && (dealWarm.badgeText.includes("ACTIVA") || dealWarm.title.includes("Happy Hour")),
    `Nivel WARM entrega promo de impulso de pista: '${dealWarm?.title}' (${dealWarm?.badgeText})`
  );

  const dealPeak = getActiveFlashDeal("PEAK");
  assert(
    dealPeak !== null && (dealPeak.badgeText.includes("CUMBRE") || dealPeak.title.includes("Pico")),
    `Nivel PEAK entrega oferta premium VIP: '${dealPeak?.title}' (${dealPeak?.badgeText})`
  );

  // =================================================================
  // DIMENSIÓN 2: MOTOR EN MEMORIA DE DUELOS MUSICALES
  // =================================================================
  console.log("\n⚔️ DIMENSIÓN 2: Validando Motor Lógico de Duelos Musicales...");

  const testEventId = "evt_test_duel_99";
  const duel = createDuel({
    eventId: testEventId,
    trackA: { title: "Danza Kuduro", artist: "Don Omar", tableLabel: "Mesa 3" },
    trackB: { title: "Gasolina", artist: "Daddy Yankee", tableLabel: "Mesa 7" },
    durationSeconds: 30,
  });

  assert(duel.status === "ACTIVE", "Duelo creado con estado ACTIVE");
  assert(duel.optionA.votes === 0 && duel.optionB.votes === 0, "Duelo inicia con 0 votos");

  // Voto de Sesión 1 por A
  const vote1 = voteInDuel({
    eventId: testEventId,
    duelId: duel.id,
    option: "A",
    sessionToken: "token_session_user_1",
  });
  assert(vote1.success && vote1.duel.optionA.votes === 1, "Voto por Opción A computado con éxito (A=1)");

  // Doble voto de la misma sesión por B (debe rechazarse por deduplicación)
  let dupThrew = false;
  try {
    voteInDuel({
      eventId: testEventId,
      duelId: duel.id,
      option: "B",
      sessionToken: "token_session_user_1",
    });
  } catch (err: any) {
    dupThrew = err.message.includes("ya emitió su voto");
  }
  assert(dupThrew, "Deduplicación estricta previene voto duplicado de la misma mesa/sesión");

  // Voto de Sesión 2 por B
  const vote2 = voteInDuel({
    eventId: testEventId,
    duelId: duel.id,
    option: "B",
    sessionToken: "token_session_user_2",
  });
  assert(vote2.success && vote2.duel.optionB.votes === 1, "Voto de segunda sesión por Opción B computado (B=1)");
  assert(vote2.duel.totalVotes === 2, "Total de votos contabilizado correctamente (2 votos)");

  // Cancelación de duelo
  cancelDuel(testEventId);
  const activeAfterCancel = getActiveDuel(testEventId);
  assert(activeAfterCancel === null, "Duelo cancelado queda limpio en el motor");

  // =================================================================
  // PRUEBAS DE INTEGRACIÓN HTTP END-TO-END
  // =================================================================
  console.log("\n🌐 PRUEBAS HTTP E2E CON SERVIDOR DE PRODUCCIÓN...");

  try {
    // 1. Autenticación como Owner para operaciones de Cabina y Analítica
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@retrobar.com", password: "Password123!" }),
    });
    assert(loginRes.ok, "Login como Owner exitoso");
    const staffCookie = loginRes.headers.get("set-cookie")?.split(";")[0] || "";

    // 2. Sesión de Comensal vía Escaneo de QR (Mesa 3)
    const scanRes = await fetch(`${BASE_URL}/qr/qr_centro_m3`, { redirect: "manual" });
    assert(scanRes.status === 307 || scanRes.status === 302, "Escaneo QR Mesa 3 redirige correctamente");
    const guestCookie = scanRes.headers.get("set-cookie")?.split(";")[0] || "";
    assert(guestCookie.includes("vidjs_guest_session"), "Cookie de comensal generada");

    // Liberar espacio de la mesa para garantizar prueba idempotente
    const checkRoomRes = await fetch(`${BASE_URL}/api/v1/requests`, { headers: { Cookie: guestCookie } });
    if (checkRoomRes.ok) {
      const crJson = await checkRoomRes.json();
      for (const r of crJson.data?.requests || []) {
        if (r.status === "PENDING") {
          await fetch(`${BASE_URL}/api/v1/dj/requests/${r.id}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: staffCookie },
            body: JSON.stringify({ action: "ACCEPT" }),
          });
        }
      }
    }

    // 3. Fast-Pass VIP con Propina
    console.log("\n💳 Probando Fast-Pass VIP con Propina ($5.00)...");
    const fastPassRes = await fetch(`${BASE_URL}/api/v1/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: guestCookie,
      },
      body: JSON.stringify({
        customTitle: "Provócame (VIP Fast-Pass)",
        customArtist: "Chayanne",
        notes: "⭐ Por favor DJ ponla que salimos a bailar ya!",
        isFastPass: true,
        tipAmountCents: 500,
        guestName: "Carla VIP",
      }),
    });
    assert(fastPassRes.ok, "Solicitud Fast-Pass VIP enviada con éxito");
    const fastPassJson = await fastPassRes.json();
    assert(fastPassJson.data.tipAmountCents === 500, "Pedido registra propina de $5.00 (500 cents)");

    // 4. Verificación de Flash Deals en Vista de Comensal
    const guestStateRes = await fetch(`${BASE_URL}/api/v1/requests`, {
      headers: { Cookie: guestCookie },
    });
    assert(guestStateRes.ok, "GET /api/v1/requests responde 200 OK");
    const guestStateJson = await guestStateRes.json();
    assert(Boolean(guestStateJson.data.flashDeal), "Respuesta de comensal incluye 'flashDeal' dinámico de barra");
    assert(typeof guestStateJson.data.flashDeal.title === "string", `Flash deal actual: '${guestStateJson.data.flashDeal.title}'`);
    const eventId = guestStateJson.data.session.event.id;

    // 5. Ciclo de Duelo Musical vía API
    console.log("\n⚔️ Probando Duelo Musical en Vivo vía API...");
    // 5.1 DJ Inicia Duelo
    const startDuelRes = await fetch(`${BASE_URL}/api/v1/dj/duel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffCookie,
      },
      body: JSON.stringify({
        action: "START",
        eventId,
        trackA: { title: "La Bicicleta", artist: "Shakira & Carlos Vives", tableLabel: "Mesa 3" },
        trackB: { title: "Despacito", artist: "Luis Fonsi", tableLabel: "Mesa 5" },
        durationSeconds: 40,
      }),
    });
    assert(startDuelRes.ok, "DJ inicia duelo musical en vivo vía POST /api/v1/dj/duel");
    const duelStarted = await startDuelRes.json();
    const liveDuelId = duelStarted.data.id;

    // 5.2 Consulta pública de Duelo (Pantalla TV y Móviles)
    const duelStateRes = await fetch(
      `${BASE_URL}/api/v1/duel/state?eventId=${eventId}`
    );
    assert(duelStateRes.ok, "GET /api/v1/duel/state responde 200 OK");
    const duelStateJson = await duelStateRes.json();
    assert(duelStateJson.data?.status === "ACTIVE", "Pantalla TV y móviles detectan duelo ACTIVE");

    // 5.3 Comensal emite voto por Track A
    const guestVoteRes = await fetch(`${BASE_URL}/api/v1/duel/vote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: guestCookie,
      },
      body: JSON.stringify({
        duelId: liveDuelId,
        option: "A",
      }),
    });
    assert(guestVoteRes.ok, "Comensal vota exitosamente por Track A vía POST /api/v1/duel/vote");

    // 5.4 DJ Finaliza Duelo
    const stopDuelRes = await fetch(`${BASE_URL}/api/v1/dj/duel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffCookie,
      },
      body: JSON.stringify({
        action: "CANCEL",
        eventId,
      }),
    });
    assert(stopDuelRes.ok, "DJ finaliza duelo con éxito");

    // 6. Muro de Fotos & Social Lounge
    console.log("\n📸 Probando Muro de Fotos & Social Lounge...");
    // 6.1 Comensal sube foto desde su mesa
    const uploadPhotoRes = await fetch(`${BASE_URL}/api/v1/photos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: guestCookie,
      },
      body: JSON.stringify({
        imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        caption: "¡La mejor noche en Retro Bar! Salud 🥂",
        guestName: "Camila & Friends",
      }),
    });
    assert(uploadPhotoRes.ok, "Comensal envía foto a moderación vía POST /api/v1/photos");
    const photoCreated = await uploadPhotoRes.json();
    const photoId = photoCreated.data.id;
    assert(photoCreated.data.status === "PENDING", "Foto inicia en estado PENDING para revisión del DJ");

    // 6.2 DJ consulta fotos pendientes
    const pendingPhotosRes = await fetch(
      `${BASE_URL}/api/v1/photos?eventId=${eventId}&status=PENDING`,
      { headers: { Cookie: staffCookie } }
    );
    assert(pendingPhotosRes.ok, "DJ consulta fotos pendientes vía GET /api/v1/photos?status=PENDING");
    const pendingJson = await pendingPhotosRes.json();
    const foundPhoto = pendingJson.data.photos.find((p: any) => p.id === photoId);
    assert(Boolean(foundPhoto), "La foto recién subida aparece en la bandeja de moderación del DJ");

    // 6.3 DJ aprueba la foto con 1-clic
    const approvePhotoRes = await fetch(`${BASE_URL}/api/v1/photos/${photoId}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffCookie,
      },
      body: JSON.stringify({ action: "APPROVE" }),
    });
    assert(approvePhotoRes.ok, "DJ aprueba foto para pantalla vía POST /api/v1/photos/[id]/action");

    // 6.4 Pantalla TV consulta muro público de fotos aprobadas
    const approvedPhotosRes = await fetch(
      `${BASE_URL}/api/v1/photos?code=RETRO-VIERNES&status=APPROVED`
    );
    assert(approvedPhotosRes.ok, "Pantalla TV consulta fotos aprobadas vía GET /api/v1/photos?status=APPROVED");
    const approvedJson = await approvedPhotosRes.json();
    const isProjected = approvedJson.data.photos.some((p: any) => p.id === photoId);
    assert(isProjected, "La foto aprobada se encuentra lista para proyectarse en la TV pública");

    // 7. Night Analytics & Reporte Post-Noche
    console.log("\n📊 Probando Night Analytics & Reporte Post-Noche...");
    const reportRes = await fetch(
      `${BASE_URL}/api/v1/analytics/night-report?eventId=${eventId}`,
      { headers: { Cookie: staffCookie } }
    );
    assert(reportRes.ok, "GET /api/v1/analytics/night-report responde 200 OK");
    const reportJson = await reportRes.json();
    const reportData = reportJson.data;

    assert(Boolean(reportData.peakHour), "Reporte detecta y calcula la 'peakHour' del local");
    assert(typeof reportData.peakHour.label === "string", `Hora pico detectada: ${reportData.peakHour.label}`);
    assert(Array.isArray(reportData.hourlyCurve), "Reporte incluye curva horaria de energía");
    assert(reportData.hourlyCurve.length > 0, `Curva horaria cuenta con ${reportData.hourlyCurve.length} intervalos`);
    assert(Array.isArray(reportData.topTables), "Reporte incluye ranking de top mesas");
    assert(reportData.totalVipFastPasses >= 1, `Total de Fast-Pass VIP registrados en analítica: ${reportData.totalVipFastPasses}`);
    assert(Array.isArray(reportData.topGenres), "Reporte incluye desglose de top géneros");
  } catch (err) {
    console.error("Error ejecutando pruebas E2E:", err);
  }

  console.log("\n=================================================================");
  console.log(`🏁 RESULTADO FINAL: ${passedTests}/${totalTests} pruebas pasadas (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("=================================================================\n");

  if (passedTests !== totalTests) {
    process.exitCode = 1;
  }
}

runAdvancedNightOsTests();
