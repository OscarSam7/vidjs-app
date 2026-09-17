import { calculateCrossfaderGains } from "../src/lib/audio/dj-audio-engine";

async function testPhase6() {
  const baseUrl = "http://localhost:3000";
  console.log("🎛️ Iniciando pruebas de verificación de la Fase 6 (DJ Bridge & Web Audio Engine)...\n");

  // 1. Verificar Matemática de Audio y Curva de Potencia Constante
  console.log("1. Verificando Curva de Crossfader de Potencia Constante (Equal-Power):");
  const fullA = calculateCrossfaderGains(-100);
  const center = calculateCrossfaderGains(0);
  const fullB = calculateCrossfaderGains(100);

  console.log(`  Extremo Izquierdo (-100): Gain A = ${fullA.gainA}, Gain B = ${fullA.gainB}`);
  console.log(`  Centro (0): Gain A = ${center.gainA}, Gain B = ${center.gainB}`);
  console.log(`  Extremo Derecho (100): Gain A = ${fullB.gainA}, Gain B = ${fullB.gainB}`);

  if (fullA.gainA !== 1 || fullA.gainB !== 0) {
    throw new Error("Fallo en curva de crossfader: Extremo A incorrecto");
  }
  if (fullB.gainA !== 0 || fullB.gainB !== 1) {
    throw new Error("Fallo en curva de crossfader: Extremo B incorrecto");
  }
  // En el centro, cos(pi/4) y sin(pi/4) deben ser aprox 0.707 (suma de cuadrados = 1)
  const centerPower = Math.pow(center.gainA, 2) + Math.pow(center.gainB, 2);
  console.log(`  Suma de potencias en el centro: ${centerPower.toFixed(3)} (esperado: ~1.000)`);
  if (Math.abs(centerPower - 1.0) > 0.01) {
    throw new Error("Fallo: La curva del crossfader no preserva potencia constante");
  }
  console.log("  ✅ PASS: Algoritmo de potencia constante verificado con precisión matemática.");

  // 2. Autenticación como DJ y Obtención de Credenciales de DJ Bridge
  console.log("\n2. Obteniendo Credenciales de DJ Bridge como DJ:");
  const djLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "dj@retrobar.com", password: "Password123!" }),
  });
  const djCookie = djLogin.headers.get("set-cookie")?.split(";")[0];
  if (!djCookie) throw new Error("Fallo al iniciar sesión como DJ");

  // Obtener estado de DJ para encontrar el evento RETRO-POP
  const djStateRes = await fetch(`${baseUrl}/api/v1/dj/state`, {
    headers: { Cookie: djCookie },
  });
  const djStateData = await djStateRes.json();
  const retroEvent =
    djStateData.data.activeEvents?.find((e: any) => e.code === "RETRO-POP") ||
    (djStateData.data.event?.code === "RETRO-POP" ? djStateData.data.event : null);

  const eventId = retroEvent?.id || djStateData.data.event?.id;
  const eventCode = retroEvent?.code || djStateData.data.event?.code || "RETRO-POP";

  const bridgeRes = await fetch(`${baseUrl}/api/v1/dj/bridge?eventId=${eventId}`, {
    headers: { Cookie: djCookie },
  });
  if (!bridgeRes.ok) throw new Error("Fallo al obtener estado del puente");
  const bridgeData = await bridgeRes.json();
  const bridge = bridgeData.data.bridge;

  console.log(`  Evento: ${bridgeData.data.event.name} (${bridgeData.data.event.code})`);
  console.log(`  Token de Bridge: ${bridge.token}`);
  console.log(`  URL M3U8: ${bridge.playlistM3uUrl}`);
  console.log(`  Webhook Sync: ${bridge.syncWebhookUrl}`);

  if (!bridge.token.startsWith(`br_${eventCode.toLowerCase()}_`)) {
    throw new Error("Token de bridge con formato inválido");
  }
  console.log("  ✅ PASS: Credenciales y endpoints de DJ Bridge generados correctamente.");

  // Asegurar que hay al menos una canción en cola para probar
  console.log("\n2.1 Asegurando que existe una canción en cola para sincronización:");
  const scanM1 = await fetch(`${baseUrl}/qr/qr_centro_m1`, { redirect: "manual" });
  const guestCookieM1 = scanM1.headers.get("set-cookie")?.split(";")[0];

  const reqRes = await fetch(`${baseUrl}/api/v1/requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: guestCookieM1 || "",
    },
    body: JSON.stringify({
      customTitle: "Billie Jean",
      customArtist: "Michael Jackson",
      guestName: "Mesa 1 VIP",
      notes: "Sincronizar con VirtualDJ",
    }),
  });
  const reqData = await reqRes.json();
  const requestId = reqData.data.id;

  // El DJ acepta la solicitud a la cola
  const acceptRes = await fetch(`${baseUrl}/api/v1/dj/requests/${requestId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: djCookie },
    body: JSON.stringify({ action: "ACCEPT" }),
  });
  const acceptData = await acceptRes.json();
  const queueEntryId = acceptData.data.newQueueEntry.id;
  console.log(`  Canción encolada para prueba: "Billie Jean" (QueueEntry ID: ${queueEntryId})`);
  console.log("  ✅ PASS: Canción disponible en cola.");

  // 3. Generación y Validación de Playlist Dinámica M3U8
  console.log("\n3. Validando Generador de Playlist M3U8 para VirtualDJ/Rekordbox:");
  const m3uRes = await fetch(`${baseUrl}/api/v1/dj/bridge/playlist.m3u?code=${eventCode}`);
  if (!m3uRes.ok) throw new Error("Fallo al descargar lista M3U");

  const contentType = m3uRes.headers.get("content-type") || "";
  console.log(`  Content-Type recibido: ${contentType}`);
  if (!contentType.includes("audio/x-mpegurl")) {
    throw new Error(`Content-Type incorrecto: esperado audio/x-mpegurl, recibido ${contentType}`);
  }

  const m3uText = await m3uRes.text();
  console.log("  Fragmento de contenido M3U8:");
  console.log(m3uText.split("\n").slice(0, 8).map((l) => "    " + l).join("\n"));

  if (!m3uText.startsWith("#EXTM3U")) {
    throw new Error("El archivo no comienza con encabezado estándar #EXTM3U");
  }
  if (!m3uText.includes(`#EVENT_CODE:${eventCode}`)) {
    throw new Error("Falta el metadato del código del evento en el M3U");
  }
  console.log("  ✅ PASS: Archivo M3U8 estándar compatible con VirtualDJ y Rekordbox.");

  // 4. Probar Seguridad de Autenticación de DJ Bridge Webhook
  console.log("\n4. Verificando Seguridad del Webhook de DJ Bridge:");
  const badAuthRes = await fetch(`${baseUrl}/api/v1/dj/bridge/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventCode: eventCode,
      token: "br_fake_invalid_token",
      action: "HEARTBEAT",
    }),
  });
  console.log(`  Respuesta con token inválido: ${badAuthRes.status} (esperado 401)`);
  if (badAuthRes.status !== 401) {
    throw new Error("Fallo: El webhook debió rechazar el token falso con 401");
  }
  console.log("  ✅ PASS: Token inválido bloqueado con HTTP 401.");

  // 5. Probar Heartbeat de DJ Bridge
  console.log("\n5. Enviando Heartbeat desde software de DJ externo:");
  const heartbeatRes = await fetch(`${baseUrl}/api/v1/dj/bridge/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventCode: eventCode,
      token: bridge.token,
      action: "HEARTBEAT",
    }),
  });
  if (!heartbeatRes.ok) throw new Error("Fallo en heartbeat de bridge");
  const heartbeatData = await heartbeatRes.json();
  console.log(`  Respuesta del servidor: ${heartbeatData.message}`);
  console.log("  ✅ PASS: Enlace bidireccional activo.");

  // 6. Sincronizar Canción en Vivo desde Software de DJ y Propagar a Pantalla Pública
  console.log("\n6. Sincronizando Canción en Vivo mediante DJ Bridge Webhook:");
  const syncTrackRes = await fetch(`${baseUrl}/api/v1/dj/bridge/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventCode: eventCode,
      token: bridge.token,
      action: "TRACK_PLAYING",
      queueEntryId: queueEntryId,
    }),
  });
  if (!syncTrackRes.ok) throw new Error("Fallo al sincronizar pista desde bridge");
  const syncData = await syncTrackRes.json();
  console.log(`  Tema sincronizado: ${syncData.data?.track?.title} - ${syncData.data?.track?.artist}`);
  console.log(`  Mesa solicitante: ${syncData.data?.track?.table}`);
  console.log("  ✅ PASS: Pista sincronizada desde VirtualDJ/Serato al servidor.");

  // 7. Verificar que la Pantalla Pública TV y la Cabina DJ reflejan el cambio en tiempo real
  console.log(`\n7. Verificando impacto inmediato en la Pantalla Pública TV (/api/v1/display/state?code=${eventCode}):`);
  const tvRes = await fetch(`${baseUrl}/api/v1/display/state?code=${eventCode}`);
  if (!tvRes.ok) throw new Error("Fallo al consultar pantalla TV");
  const tvData = await tvRes.json();
  console.log(`  Canción en Pantalla TV: ${tvData.data.currentPlaying?.song?.title}`);
  console.log(`  Artista en Pantalla TV: ${tvData.data.currentPlaying?.song?.artist}`);
  console.log(`  Mesa en Pantalla TV: ${tvData.data.currentPlaying?.table?.label}`);

  if (!tvData.data.currentPlaying?.song?.title?.includes("Billie Jean")) {
    throw new Error("Fallo: La pantalla de TV no reflejó la canción sincronizada desde el DJ Bridge");
  }
  console.log("  ✅ PASS: Pantalla pública TV y Cabina DJ sincronizadas con el software de DJ.");

  console.log("\n========================================================");
  console.log("🎉 TODAS LAS PRUEBAS DE LA FASE 6 PASARON CON ÉXITO (7/7)");
  console.log("========================================================");
}

testPhase6().catch((err) => {
  console.error("❌ Error en pruebas de Fase 6:", err);
  process.exit(1);
});
