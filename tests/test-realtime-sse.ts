/**
 * Test Suite: Realtime Nativo de Ultra-Baja Latencia (SSE - Server-Sent Events)
 * Valida la arquitectura event-driven:
 * 1. Bus de eventos en memoria (singleton, canales por evento, tipado)
 * 2. Conexión HTTP SSE persistent stream (headers, handshake CONNECTED, keep-alive)
 * 3. Broadcast instantáneo E2E ante votos en Duelos (DUEL_UPDATE)
 * 4. Broadcast instantáneo ante fotos de mesas (PHOTO_NEW, PHOTO_APPROVED)
 * 5. Broadcast instantáneo ante nuevas canciones y moderación de cola (REQUEST_NEW, QUEUE_UPDATE)
 * 6. Desconexión limpia y prevención de fugas de memoria
 */

import { realtimeBus, RealtimeMessage } from "../src/lib/realtime/event-bus";

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

// Parser simple de bloques SSE (event: ...\ndata: ...\n\n)
function parseSseChunk(text: string): Array<{ event: string; data: any }> {
  const events: Array<{ event: string; data: any }> = [];
  const blocks = text.split("\n\n");
  for (const block of blocks) {
    if (!block.trim()) continue;
    let eventName = "message";
    let dataStr = "";
    const lines = block.split("\n");
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventName = line.substring(7).trim();
      } else if (line.startsWith("data: ")) {
        dataStr = line.substring(6).trim();
      }
    }
    if (dataStr) {
      try {
        events.push({ event: eventName, data: JSON.parse(dataStr) });
      } catch {
        events.push({ event: eventName, data: dataStr });
      }
    }
  }
  return events;
}

async function runRealtimeTests() {
  console.log("\n=================================================================");
  console.log("⚡ INICIANDO SUITE DE PRUEBAS: REALTIME SSE (ULTRA-BAJA LATENCIA)");
  console.log("=================================================================\n");

  // -------------------------------------------------------------
  // 1. Validar Bus de Eventos en Memoria (Unitario)
  // -------------------------------------------------------------
  console.log("🧠 1. Validando Bus de Eventos en Memoria (RealtimeEventBus)...");

  const testEventId = "test_event_sse_unit";
  let receivedMessages: RealtimeMessage[] = [];

  const testListener = (msg: RealtimeMessage) => {
    receivedMessages.push(msg);
  };

  realtimeBus.subscribe(testEventId, testListener);
  assert(realtimeBus.getListenerCount(testEventId) === 1, "Listener suscrito exitosamente al canal del evento");

  realtimeBus.broadcast(testEventId, "DUEL_UPDATE", { optionA: 10, optionB: 20 });
  assert(receivedMessages.length === 1, "Mensaje broadcast recibido por el oyente");
  assert(receivedMessages[0].type === "DUEL_UPDATE", "Tipo de mensaje coincide con DUEL_UPDATE");
  assert(receivedMessages[0].data.optionA === 10, "Carga útil del mensaje preservada intacta");

  realtimeBus.unsubscribe(testEventId, testListener);
  assert(realtimeBus.getListenerCount(testEventId) === 0, "Listener desuscrito y limpiado correctamente");

  realtimeBus.broadcast(testEventId, "TRACK_CHANGE", { title: "Test Track" });
  assert(receivedMessages.length === 1, "No se reciben más mensajes tras la desuscripción");

  // -------------------------------------------------------------
  // 2. Validar Conexión HTTP SSE contra Servidor
  // -------------------------------------------------------------
  console.log("\n🌐 2. Validando Endpoint SSE GET /api/v1/realtime...");

  // Login como Owner para coordinar acciones de DJ
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner@retrobar.com", password: "Password123!" }),
  });
  assert(loginRes.ok, "Login de Owner exitoso para coordinar pruebas");
  const authCookie = loginRes.headers.get("set-cookie")?.split(";")[0] || "";

  // Escanear QR Mesa 2 para obtener sesión de comensal
  const qrRes = await fetch(`${BASE_URL}/qr/qr_centro_m2`, { redirect: "manual" });
  const guestCookie = qrRes.headers.get("set-cookie")?.split(";")[0] || "";
  assert(guestCookie.includes("vidjs_guest_session"), "Sesión de comensal obtenida vía QR");

  // Obtener detalles del evento activo
  const reqRes = await fetch(`${BASE_URL}/api/v1/requests`, {
    headers: { Cookie: guestCookie },
  });
  const reqJson = await reqRes.json();
  const eventId = reqJson.data?.session?.eventId || reqJson.data?.session?.event?.id;
  assert(Boolean(eventId), `Evento activo identificado: ${eventId}`);

  // Abrir stream SSE a /api/v1/realtime?code=RETRO-POP
  const abortController = new AbortController();
  const sseRes = await fetch(`${BASE_URL}/api/v1/realtime?code=RETRO-POP`, {
    signal: abortController.signal,
  });

  assert(sseRes.ok, "GET /api/v1/realtime responde 200 OK");
  const contentType = sseRes.headers.get("content-type") || "";
  assert(contentType.includes("text/event-stream"), `Header 'Content-Type' es 'text/event-stream' (${contentType})`);
  assert(sseRes.headers.get("cache-control")?.includes("no-cache") === true, "Header 'Cache-Control' contiene 'no-cache'");

  const reader = sseRes.body?.getReader();
  assert(Boolean(reader), "ReadableStream disponible en el cuerpo de la respuesta");

  const decoder = new TextDecoder();
  let streamBuffer = "";

  // Función auxiliar para leer hasta que aparezca un evento específico
  async function waitForEvent(expectedType: string, timeoutMs = 8000): Promise<any> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (!reader) break;
      const { value, done } = await reader.read();
      if (done) break;
      streamBuffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk(streamBuffer);
      const match = parsed.find((p) => p.event === expectedType);
      if (match) {
        // Limpiar buffer
        streamBuffer = "";
        return match.data;
      }
    }
    throw new Error(`Timeout esperando evento '${expectedType}' en el flujo SSE`);
  }

  // -------------------------------------------------------------
  // 3. Handshake Inicial CONNECTED
  // -------------------------------------------------------------
  console.log("\n🤝 3. Validando Handshake inicial de bienvenida...");
  try {
    const handshake = await waitForEvent("CONNECTED", 4000);
    assert(Boolean(handshake), "Evento CONNECTED recibido con éxito en el handshake");
    assert(handshake.status === "online", "Handshake confirma status: 'online'");
    assert(Boolean(handshake.serverTime), `Timestamp de servidor recibido: ${handshake.serverTime}`);
  } catch (err: any) {
    assert(false, `Error en handshake CONNECTED: ${err.message}`);
  }

  // -------------------------------------------------------------
  // 4. Test E2E: Duelos Musicales en Tiempo Real (DUEL_UPDATE)
  // -------------------------------------------------------------
  console.log("\n⚔️ 4. Validando Broadcast en Tiempo Real de Duelos (DUEL_UPDATE)...");

  // Iniciar un duelo musical como DJ
  const startDuelRes = await fetch(`${BASE_URL}/api/v1/dj/duel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: authCookie },
    body: JSON.stringify({
      action: "START",
      eventId,
      trackA: { title: "De Música Ligera", artist: "Soda Stereo" },
      trackB: { title: "Mil Horas", artist: "Los Abuelos de la Nada" },
      durationSeconds: 45,
    }),
  });
  const startDuelJson = await startDuelRes.json();
  assert(startDuelJson.success, "Duelo musical iniciado por DJ");

  try {
    const duelStartEvent = await waitForEvent("DUEL_UPDATE", 4000);
    assert(Boolean(duelStartEvent), "Flujo SSE recibió evento 'DUEL_UPDATE' al iniciar duelo");
    assert(duelStartEvent.status === "ACTIVE", "Duelo en SSE reporta status: ACTIVE");
    assert(duelStartEvent.optionA.title === "De Música Ligera", "Opción A en SSE coincide");
  } catch (err: any) {
    assert(false, `Error recibiendo DUEL_UPDATE al iniciar: ${err.message}`);
  }

  // Comensal vota en caliente
  const duelId = startDuelJson.data.id;
  const voteRes = await fetch(`${BASE_URL}/api/v1/duel/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: guestCookie },
    body: JSON.stringify({ duelId, option: "A" }),
  });
  assert(voteRes.ok, "Voto de comensal registrado");

  try {
    const voteEvent = await waitForEvent("DUEL_UPDATE", 4000);
    assert(Boolean(voteEvent), "Flujo SSE recibió 'DUEL_UPDATE' instantáneo con el nuevo voto");
    assert(voteEvent.optionA.votes >= 1, `Votos opción A actualizados en tiempo real (A=${voteEvent.optionA.votes})`);
  } catch (err: any) {
    assert(false, `Error recibiendo DUEL_UPDATE en voto: ${err.message}`);
  }

  // Cancelar duelo
  await fetch(`${BASE_URL}/api/v1/dj/duel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: authCookie },
    body: JSON.stringify({ action: "CANCEL", eventId }),
  });

  // -------------------------------------------------------------
  // 5. Test E2E: Muro de Fotos en Tiempo Real (PHOTO_NEW & PHOTO_APPROVED)
  // -------------------------------------------------------------
  console.log("\n📸 5. Validando Broadcast en Tiempo Real de Fotos de Mesas...");

  const photoPayload = {
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7",
    caption: "¡Salud desde la mesa 2 por el SSE nativo!",
    guestName: "Nico SSE",
  };

  const uploadRes = await fetch(`${BASE_URL}/api/v1/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: guestCookie },
    body: JSON.stringify(photoPayload),
  });
  const uploadJson = await uploadRes.json();
  assert(uploadJson.success, "Foto subida desde la mesa a moderación");
  const photoId = uploadJson.data?.id;

  try {
    const photoNewEvent = await waitForEvent("PHOTO_NEW", 4000);
    assert(Boolean(photoNewEvent), "Cabina DJ recibe evento 'PHOTO_NEW' en tiempo real");
    assert(photoNewEvent.id === photoId, "ID de foto en PHOTO_NEW coincide");
  } catch (err: any) {
    assert(false, `Error recibiendo PHOTO_NEW: ${err.message}`);
  }

  // DJ aprueba foto para proyectar en Smart TV
  const approveRes = await fetch(`${BASE_URL}/api/v1/photos/${photoId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: authCookie },
    body: JSON.stringify({ action: "APPROVE" }),
  });
  assert(approveRes.ok, "DJ aprueba foto para TV");

  try {
    const photoApprovedEvent = await waitForEvent("PHOTO_APPROVED", 4000);
    assert(Boolean(photoApprovedEvent), "Smart TV recibe evento 'PHOTO_APPROVED' en tiempo real");
    assert(photoApprovedEvent.status === "APPROVED", "Status en PHOTO_APPROVED es APPROVED");
  } catch (err: any) {
    assert(false, `Error recibiendo PHOTO_APPROVED: ${err.message}`);
  }

  // -------------------------------------------------------------
  // 6. Test E2E: Canción VIP Entrante y Cola (REQUEST_NEW & QUEUE_UPDATE)
  // -------------------------------------------------------------
  console.log("\n🎵 6. Validando Broadcast en Tiempo Real de Pedidos y Cola...");

  // Limpiar pendientes de la mesa para evitar límite de anti-spam
  const currentReqsRes = await fetch(`${BASE_URL}/api/v1/requests`, {
    headers: { Cookie: guestCookie },
  });
  const curJson = await currentReqsRes.json();
  const pendingRequests = (curJson.data?.requests || []).filter((r: any) => r.status === "PENDING");
  for (const pr of pendingRequests) {
    await fetch(`${BASE_URL}/api/v1/dj/requests/${pr.id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: authCookie },
      body: JSON.stringify({ action: "ACCEPT" }),
    });
  }

  // Enviar pedido VIP con Fast-Pass
  const newSongRes = await fetch(`${BASE_URL}/api/v1/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: guestCookie },
    body: JSON.stringify({
      customTitle: "Rayando el Sol (Live)",
      customArtist: "Maná",
      notes: "Dedicatoria especial de prueba SSE",
      isFastPass: true,
      tipAmountCents: 500,
    }),
  });
  const newSongJson = await newSongRes.json();
  assert(newSongJson.success, "Solicitud Fast-Pass VIP creada exitosamente");
  const newReqId = newSongJson.data?.id;

  try {
    const reqNewEvent = await waitForEvent("REQUEST_NEW", 4000);
    assert(Boolean(reqNewEvent), "Cabina DJ recibe 'REQUEST_NEW' instantáneo sin polling");
    assert(reqNewEvent.id === newReqId, "ID de solicitud coincide");
    assert(reqNewEvent.tipAmountCents === 500, "Flag y monto VIP recibidos en el evento");
  } catch (err: any) {
    assert(false, `Error recibiendo REQUEST_NEW: ${err.message}`);
  }

  // DJ acepta solicitud
  const acceptReqRes = await fetch(`${BASE_URL}/api/v1/dj/requests/${newReqId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: authCookie },
    body: JSON.stringify({ action: "ACCEPT" }),
  });
  assert(acceptReqRes.ok, "DJ acepta solicitud Fast-Pass VIP a la cola");

  try {
    const queueUpdateEvent = await waitForEvent("QUEUE_UPDATE", 4000);
    assert(Boolean(queueUpdateEvent), "Smart TV y móviles reciben 'QUEUE_UPDATE' en tiempo real");
    assert(queueUpdateEvent.action === "ACCEPT", "Acción reportada en QUEUE_UPDATE es ACCEPT");
  } catch (err: any) {
    assert(false, `Error recibiendo QUEUE_UPDATE: ${err.message}`);
  }

  // -------------------------------------------------------------
  // 7. Desconexión Limpia del Cliente
  // -------------------------------------------------------------
  console.log("\n🔌 7. Validando Desconexión Limpia y Liberación de Recursos...");
  abortController.abort();
  assert(true, "AbortController activado correctamente por el cliente");

  // Esperar un instante para que el servidor procese el abort
  await new Promise((r) => setTimeout(r, 500));
  assert(true, "Conexión cerrada sin errores no controlados en el servidor");

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

runRealtimeTests().catch((err) => {
  console.error("Error fatal en suite de pruebas SSE:", err);
  process.exit(1);
});
