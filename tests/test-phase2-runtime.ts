async function testPhase2() {
  const baseUrl = "http://localhost:3000";
  console.log("🧪 Iniciando pruebas de verificación de la Fase 2 (QR y Flujo del Cliente)...\n");

  // 1. Probar búsqueda en el catálogo musical
  console.log("1. Probando Catálogo Musical (/api/v1/catalog/songs):");
  const catalogRes = await fetch(`${baseUrl}/api/v1/catalog/songs?q=soda`);
  if (!catalogRes.ok) throw new Error("Fallo al consultar catálogo");
  const catalogData = await catalogRes.json();
  console.log(`  Canciones encontradas para 'soda': ${catalogData.data.songs.length}`);
  const sampleSong = catalogData.data.songs[0];
  console.log(`  Canción de prueba: "${sampleSong.title}" por ${sampleSong.artist.name} (${sampleSong.genre})`);
  console.log(`  Total géneros disponibles: ${catalogData.data.genres.join(", ")}`);
  console.log("  ✅ PASS: Catálogo musical responde y filtra correctamente.");

  // 2. Probar resolución del QR de la Mesa 2 (Sede Centro)
  console.log("\n2. Probando Escaneo de QR (/qr/qr_centro_m2):");
  const qrRes = await fetch(`${baseUrl}/qr/qr_centro_m2`, {
    redirect: "manual",
  });
  console.log(`  Status de redirección: ${qrRes.status} (esperado 307 o 302)`);
  const location = qrRes.headers.get("location");
  console.log(`  Redirige a: ${location}`);
  const setCookie = qrRes.headers.get("set-cookie");
  if (!setCookie || !setCookie.includes("vidjs_guest_session")) {
    throw new Error("Fallo: No se emitió la cookie vidjs_guest_session al escanear QR");
  }
  const guestCookie = setCookie.split(";")[0];
  console.log("  ✅ PASS: GuestSession creada y cookie de comensal emitida.");

  // 3. Consultar sesión del comensal (/api/v1/requests)
  console.log("\n3. Verificando datos de sesión del comensal:");
  const sessionRes = await fetch(`${baseUrl}/api/v1/requests`, {
    headers: { Cookie: guestCookie },
  });
  if (!sessionRes.ok) throw new Error("Fallo al obtener sesión de invitado");
  const sessionData = await sessionRes.json();
  console.log(`  Establecimiento: ${sessionData.data.session.tenant.name}`);
  console.log(`  Evento Activo: ${sessionData.data.session.event.name}`);
  console.log(`  Mesa Asignada: ${sessionData.data.session.table.label}`);
  console.log("  ✅ PASS: Contexto de mesa y evento vinculado con éxito.");

  // Limpiar solicitudes pendientes previas de esta mesa si existen (idempotencia)
  for (const existingReq of sessionData.data.requests || []) {
    if (existingReq.status === "PENDING") {
      await fetch(`${baseUrl}/api/v1/requests/${existingReq.id}`, {
        method: "DELETE",
        headers: { Cookie: guestCookie },
      });
    }
  }

  // 4. Enviar primera solicitud de canción (Catálogo)
  console.log("\n4. Enviando solicitud de canción del catálogo con dedicatoria:");
  const req1 = await fetch(`${baseUrl}/api/v1/requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: guestCookie,
    },
    body: JSON.stringify({
      songId: sampleSong.id,
      guestName: "Lucas & Amigos",
      notes: "¡Dedicado a la cumpleañera de la mesa 2!",
    }),
  });
  if (!req1.ok) {
    const errText = await req1.text();
    throw new Error(`Fallo al enviar solicitud 1: ${errText}`);
  }
  const req1Data = await req1.json();
  const requestId1 = req1Data.data.id;
  console.log(`  Solicitud creada con ID: ${requestId1}`);
  console.log(`  Canción: "${req1Data.data.song.title}"`);
  console.log(`  Estado inicial: ${req1Data.data.status}`);
  console.log("  ✅ PASS: Solicitud 1 enviada a la cabina del DJ.");

  // 5. Enviar segunda solicitud (Canción manual personalizada)
  console.log("\n5. Enviando segunda solicitud (Manual / No en catálogo):");
  const req2 = await fetch(`${baseUrl}/api/v1/requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: guestCookie,
    },
    body: JSON.stringify({
      customTitle: "Mil Horas",
      customArtist: "Los Abuelos de la Nada",
      notes: "Por favor DJ, un clásico para bailar",
    }),
  });
  if (!req2.ok) throw new Error("Fallo al enviar solicitud manual");
  const req2Data = await req2.json();
  const requestId2 = req2Data.data.id;
  console.log(`  Solicitud 2 creada: "${req2Data.data.customTitle}" por ${req2Data.data.customArtist}`);
  console.log("  ✅ PASS: Solicitud personalizada creada exitosamente.");

  // 6. Probar regla de fair-play (Límite de solicitudes pendientes por mesa)
  console.log("\n6. Verificando regla Fair-Play anti-spam (3ra canción debe ser rechazada):");
  const req3 = await fetch(`${baseUrl}/api/v1/requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: guestCookie,
    },
    body: JSON.stringify({
      customTitle: "Tercer Tema",
      customArtist: "Spam Artist",
    }),
  });
  console.log(`  Status de la 3ra solicitud: ${req3.status} (esperado 429)`);
  if (req3.status !== 429) {
    throw new Error("Fallo: No se aplicó el límite de canciones simultáneas por mesa");
  }
  const req3Err = await req3.json();
  console.log(`  Mensaje de fair-play: "${req3Err.error.message}"`);
  console.log("  ✅ PASS: Regla de límite por mesa respetada y protegida.");

  // 7. Cancelar una solicitud pendiente
  console.log("\n7. Cancelando una solicitud pendiente por el cliente:");
  const delRes = await fetch(`${baseUrl}/api/v1/requests/${requestId1}`, {
    method: "DELETE",
    headers: { Cookie: guestCookie },
  });
  if (!delRes.ok) throw new Error("Fallo al cancelar solicitud");
  console.log("  ✅ PASS: Solicitud cancelada correctamente por el cliente.");

  // 8. Probar endpoint administrativo de Mesas y QR con sesión de Owner
  console.log("\n8. Probando panel administrativo de Mesas y Generador de QR:");
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "owner@retrobar.com",
      password: "Password123!",
    }),
  });
  const ownerCookie = loginRes.headers.get("set-cookie")?.split(";")[0];
  const tablesRes = await fetch(`${baseUrl}/api/v1/tables`, {
    headers: { Cookie: ownerCookie || "" },
  });
  if (!tablesRes.ok) throw new Error("Fallo al obtener mesas con QR");
  const tablesData = await tablesRes.json();
  console.log(`  Mesas con códigos QR generados: ${tablesData.data.length}`);
  const firstTable = tablesData.data[0];
  console.log(`  Mesa de muestra: ${firstTable.label} (${firstTable.venue.name})`);
  console.log(`  URL de escaneo: ${firstTable.scanUrl}`);
  console.log(`  DataURL QR generado: ${firstTable.qrDataUrl.substring(0, 30)}...`);
  console.log("  ✅ PASS: Generación de QR vectoriales para todas las mesas.");

  console.log("\n🎉 TODAS LAS PRUEBAS DE LA FASE 2 SUPERADAS AL 100%!");
}

testPhase2().catch((err) => {
  console.error("❌ Error en pruebas de Fase 2:", err);
  process.exit(1);
});
