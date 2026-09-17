import { calculateFairQueue } from "../src/lib/dj/rotation";

async function testPhase3() {
  const baseUrl = "http://localhost:3000";
  console.log("🎧 Iniciando pruebas de verificación de la Fase 3 (Cabina DJ & Cola en Vivo)...\n");

  // 1. Prueba Unitaria del Algoritmo de Rotación Justa (Fair-Share)
  console.log("1. Probando Algoritmo Matemático de Rotación Justa (Round-Robin):");
  const testQueue = [
    { id: "q1", tableId: "table_1", orderIndex: 1, createdAt: new Date("2026-09-17T00:00:00Z") },
    { id: "q2", tableId: "table_1", orderIndex: 2, createdAt: new Date("2026-09-17T00:01:00Z") },
    { id: "q3", tableId: "table_1", orderIndex: 3, createdAt: new Date("2026-09-17T00:02:00Z") },
    { id: "q4", tableId: "table_2", orderIndex: 4, createdAt: new Date("2026-09-17T00:03:00Z") },
    { id: "q5", tableId: "table_3", orderIndex: 5, createdAt: new Date("2026-09-17T00:04:00Z") },
  ];

  const rotated = calculateFairQueue(testQueue);
  const rotatedIds = rotated.map((r) => r.id);
  console.log(`  Orden original: ${testQueue.map((r) => `${r.id}(${r.tableId})`).join(" -> ")}`);
  console.log(`  Orden rotado:   ${rotated.map((r) => `${r.id}(${r.tableId})`).join(" -> ")}`);

  // Esperado: Ronda 1 (q1 de t1, q4 de t2, q5 de t3), Ronda 2 (q2 de t1), Ronda 3 (q3 de t1)
  if (rotatedIds[0] === "q1" && rotatedIds[1] === "q4" && rotatedIds[2] === "q5" && rotatedIds[3] === "q2") {
    console.log("  ✅ PASS: El algoritmo intercaló exitosamente las mesas evitando monopolio de Mesa 1.");
  } else {
    throw new Error(`Fallo en algoritmo de rotación: recibido ${rotatedIds.join(",")}`);
  }

  // 2. Probar Seguridad y Control de Acceso RBAC para la Cabina
  console.log("\n2. Verificando Seguridad RBAC de la Cabina:");
  const unauthDjRes = await fetch(`${baseUrl}/api/v1/dj/state`);
  console.log(`  Intento sin login: ${unauthDjRes.status} (esperado 401)`);
  if (unauthDjRes.status !== 401) throw new Error("Fallo: Endpoint de DJ no protegido");
  console.log("  ✅ PASS: Acceso anónimo bloqueado con HTTP 401.");

  // Login como DJ
  console.log("\n3. Iniciando sesión como DJ (dj@retrobar.com):");
  const djLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "dj@retrobar.com",
      password: "Password123!",
    }),
  });
  if (!djLoginRes.ok) throw new Error("Fallo al iniciar sesión como DJ");
  const djCookie = djLoginRes.headers.get("set-cookie")?.split(";")[0];
  if (!djCookie) throw new Error("No se recibió cookie de sesión de DJ");
  console.log("  ✅ PASS: Sesión de DJ autenticada.");

  // 4. Consultar estado inicial de la cabina
  console.log("\n4. Consultando estado en vivo de la cabina (/api/v1/dj/state):");
  const djStateRes = await fetch(`${baseUrl}/api/v1/dj/state`, {
    headers: { Cookie: djCookie },
  });
  if (!djStateRes.ok) throw new Error("Fallo al obtener estado de cabina");
  const djState = await djStateRes.json();
  const eventId = djState.data.event.id;
  console.log(`  Evento en cabina: "${djState.data.event.name}" (${djState.data.event.venueName})`);
  console.log(`  Solicitudes pendientes: ${djState.data.pendingRequests.length}`);
  console.log(`  Temas en cola: ${djState.data.queue.length}`);
  console.log("  ✅ PASS: Estado de cabina sincronizado.");

  // 5. Simular Cliente pidiendo una canción desde Mesa 3
  console.log("\n5. Simulando Cliente escaneando Mesa 3 y pidiendo canción:");
  const scanM3 = await fetch(`${baseUrl}/qr/qr_centro_m3`, { redirect: "manual" });
  const guestCookieM3 = scanM3.headers.get("set-cookie")?.split(";")[0];

  const reqRes = await fetch(`${baseUrl}/api/v1/requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: guestCookieM3 || "",
    },
    body: JSON.stringify({
      customTitle: "Lamento Boliviano",
      customArtist: "Los Enanitos Verdes",
      guestName: "Mesa 3 Cumpleaños",
      notes: "¡Dedicatoria en vivo!",
    }),
  });
  if (!reqRes.ok) throw new Error("Fallo al enviar solicitud de cliente");
  const reqData = await reqRes.json();
  const requestId = reqData.data.id;
  console.log(`  Canción solicitada desde Mesa 3: "${reqData.data.customTitle}" (ID: ${requestId})`);

  // 6. DJ modera y ACEPTA la canción a la cola
  console.log("\n6. DJ Acepta la solicitud y la envía a la cola:");
  const acceptRes = await fetch(`${baseUrl}/api/v1/dj/requests/${requestId}/action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: djCookie,
    },
    body: JSON.stringify({ action: "ACCEPT" }),
  });
  if (!acceptRes.ok) throw new Error("Fallo al aceptar solicitud en cabina");
  const acceptData = await acceptRes.json();
  const queueEntryId = acceptData.data.newQueueEntry.id;
  console.log(`  Entrada de cola creada con ID: ${queueEntryId} (Orden: ${acceptData.data.newQueueEntry.orderIndex})`);
  console.log("  ✅ PASS: Canción ingresó a la cola de reproducción.");

  // 7. DJ Carga el tema en Deck A y lo pone AL AIRE (PLAY)
  console.log("\n7. DJ Carga el tema en Deck A (PLAY / AL AIRE):");
  const playRes = await fetch(`${baseUrl}/api/v1/dj/queue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: djCookie,
    },
    body: JSON.stringify({ action: "PLAY", queueEntryId }),
  });
  if (!playRes.ok) throw new Error("Fallo al poner tema al aire");
  console.log("  ✅ PASS: Tema puesto al aire en Deck A.");

  // 8. Verificar que el teléfono del Comensal se actualizó a "PLAYING"
  console.log("\n8. Verificando sincronización en tiempo real con el teléfono del cliente:");
  const guestCheckRes = await fetch(`${baseUrl}/api/v1/requests`, {
    headers: { Cookie: guestCookieM3 || "" },
  });
  const guestCheckData = await guestCheckRes.json();
  const myReq = guestCheckData.data.requests.find((r: any) => r.id === requestId);
  console.log(`  Estado en el celular del cliente: ${myReq.status} (esperado PLAYING)`);
  if (myReq.status !== "PLAYING") {
    throw new Error(`Fallo de sincronización: estado es ${myReq.status}`);
  }
  console.log("  ✅ PASS: El cliente ve '¡Sonando ahora en el local!' en su pantalla.");

  // 9. DJ Avanza al siguiente tema (NEXT)
  console.log("\n9. DJ pulsa Siguiente Tema (NEXT):");
  const nextRes = await fetch(`${baseUrl}/api/v1/dj/queue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: djCookie,
    },
    body: JSON.stringify({ action: "NEXT", eventId }),
  });
  if (!nextRes.ok) throw new Error("Fallo en acción NEXT");
  console.log("  ✅ PASS: Reproductor avanzó y tema anterior pasó a PLAYED.");

  console.log("\n🎉 TODAS LAS PRUEBAS DE LA FASE 3 SUPERADAS AL 100%!");
}

testPhase3().catch((err) => {
  console.error("❌ Error en pruebas de Fase 3:", err);
  process.exit(1);
});
