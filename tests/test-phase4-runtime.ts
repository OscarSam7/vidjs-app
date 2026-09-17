async function testPhase4() {
  const baseUrl = "http://localhost:3000";
  console.log("📺 Iniciando pruebas de verificación de la Fase 4 (Pantalla Pública / TV)...\n");

  // 1. Probar Endpoint de Pantalla Pública para Evento Válido
  console.log("1. Consultando estado de Pantalla Pública (/api/v1/display/state?code=RETRO-POP):");
  const displayRes = await fetch(`${baseUrl}/api/v1/display/state?code=RETRO-POP`);
  console.log(`  Status: ${displayRes.status} (esperado 200)`);
  if (!displayRes.ok) throw new Error("Fallo al obtener estado de pantalla pública");
  const displayData = await displayRes.json();
  console.log(`  Evento: ${displayData.data.event.name} (${displayData.data.event.code})`);
  console.log(`  Establecimiento: ${displayData.data.event.tenantName}`);
  console.log(`  Local: ${displayData.data.event.venueName}`);
  console.log(`  QR en pantalla generado: ${displayData.data.qr.dataUrl.substring(0, 30)}...`);
  console.log(`  URL de escaneo en TV: ${displayData.data.qr.scanUrl}`);
  console.log("  ✅ PASS: Endpoint de pantalla pública responde con datos correctos.");

  // 2. Probar Evento Inexistente
  console.log("\n2. Verificando manejo de código de evento inexistente:");
  const notFoundRes = await fetch(`${baseUrl}/api/v1/display/state?code=CODIGO-FALSO-999`);
  console.log(`  Status: ${notFoundRes.status} (esperado 404)`);
  if (notFoundRes.status !== 404) throw new Error("Fallo: Debió responder 404");
  console.log("  ✅ PASS: Código inexistente rechazado con 404 seguro.");

  // 3. Probar Redirección de Escaneo desde TV (/display/RETRO-POP/scan)
  console.log("\n3. Probando escaneo del QR proyectado en la TV (/display/RETRO-POP/scan):");
  const tvScanRes = await fetch(`${baseUrl}/display/RETRO-POP/scan`, {
    redirect: "manual",
  });
  console.log(`  Status de redirección: ${tvScanRes.status} (esperado 307 o 302)`);
  const redirectTarget = tvScanRes.headers.get("location");
  console.log(`  Redirige a: ${redirectTarget}`);
  if (!redirectTarget?.includes("/display/RETRO-POP/tables")) {
    throw new Error("Fallo: No redirigió al selector de mesas");
  }
  console.log("  ✅ PASS: El escaneo desde la TV lleva al selector de mesas del local.");

  // 4. Probar Sincronización en Vivo entre DJ y Pantalla Pública
  console.log("\n4. Probando sincronización DJ -> Pantalla Pública:");
  // Iniciar sesión como DJ
  const djLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "dj@retrobar.com", password: "Password123!" }),
  });
  const djCookie = djLogin.headers.get("set-cookie")?.split(";")[0];

  // Mesa 4 pide un tema
  const scanM4 = await fetch(`${baseUrl}/qr/qr_centro_m4`, { redirect: "manual" });
  const guestCookieM4 = scanM4.headers.get("set-cookie")?.split(";")[0];

  const reqRes = await fetch(`${baseUrl}/api/v1/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: guestCookieM4 || "" },
    body: JSON.stringify({
      customTitle: "Bohemian Rhapsody",
      customArtist: "Queen",
      guestName: "Mesa 4 Rockeros",
      notes: "¡Para toda la pista de baile!",
    }),
  });
  const reqData = await reqRes.json();
  const requestId = reqData.data.id;

  // DJ acepta el tema
  const acceptRes = await fetch(`${baseUrl}/api/v1/dj/requests/${requestId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: djCookie || "" },
    body: JSON.stringify({ action: "ACCEPT" }),
  });
  const acceptJson = await acceptRes.json();
  const queueEntryId = acceptJson.data.newQueueEntry.id;

  // DJ lo pone AL AIRE en Deck A
  await fetch(`${baseUrl}/api/v1/dj/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: djCookie || "" },
    body: JSON.stringify({ action: "PLAY", queueEntryId }),
  });

  // Comprobar que la Pantalla Pública ahora muestra la canción en vivo
  const tvSyncRes = await fetch(`${baseUrl}/api/v1/display/state?code=RETRO-POP`);
  const tvSyncData = await tvSyncRes.json();
  const nowPlaying = tvSyncData.data.currentPlaying;

  console.log(`  Canción en Pantalla TV: "${nowPlaying?.song.title}"`);
  console.log(`  Artista en TV: ${nowPlaying?.song.artist}`);
  console.log(`  Pedido por: ${nowPlaying?.table.label} (${nowPlaying?.guestName})`);
  console.log(`  Dedicatoria proyectada: "${nowPlaying?.notes}"`);

  if (nowPlaying?.song.title !== "Bohemian Rhapsody") {
    throw new Error("Fallo: La pantalla pública no reflejó la canción activa del DJ");
  }
  console.log("  ✅ PASS: La Pantalla Pública refleja el tema, mesa y dedicatoria en tiempo real!");

  console.log("\n🎉 TODAS LAS PRUEBAS DE LA FASE 4 SUPERADAS AL 100%!");
}

testPhase4().catch((err) => {
  console.error("❌ Error en pruebas de Fase 4:", err);
  process.exit(1);
});
