async function testPhase7Branding() {
  const baseUrl = "http://localhost:3000";
  console.log("🎨 Iniciando pruebas de verificación de la Fase 7 (Personalización de Marca & White-Label)...\n");

  // 1. Probar Seguridad RBAC: El rol DJ no debe tener permisos para modificar la marca
  console.log("1. Verificando Seguridad RBAC (DJ no puede editar branding):");
  const djLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "dj@retrobar.com", password: "Password123!" }),
  });
  const djCookie = djLogin.headers.get("set-cookie")?.split(";")[0];

  const djBrandingRes = await fetch(`${baseUrl}/api/v1/branding`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: djCookie || "" },
    body: JSON.stringify({
      target: "TENANT",
      branding: { primaryColor: "#FF0000" },
    }),
  });
  console.log(`  Intento de edición por DJ: ${djBrandingRes.status} (esperado 403)`);
  if (djBrandingRes.status !== 403) throw new Error("Fallo: El rol DJ no debió tener acceso de edición a marca");
  console.log("  ✅ PASS: Acceso no autorizado bloqueado con HTTP 403.");

  // 2. Acceso como OWNER y Consulta Inicial de Marca
  console.log("\n2. Acceso como OWNER y Consulta de Marca:");
  const ownerLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner@retrobar.com", password: "Password123!" }),
  });
  const ownerCookie = ownerLogin.headers.get("set-cookie")?.split(";")[0];
  if (!ownerCookie) throw new Error("Fallo al iniciar sesión como Owner");

  const initialRes = await fetch(`${baseUrl}/api/v1/branding`, {
    headers: { Cookie: ownerCookie },
  });
  if (!initialRes.ok) throw new Error("Fallo al consultar configuración de marca");
  const initialData = await initialRes.json();
  const venues = initialData.data.venues;
  console.log(`  Establecimiento: ${initialData.data.tenant.name}`);
  console.log(`  Locales disponibles para branding: ${venues.map((v: any) => v.name).join(", ")}`);
  console.log(`  Color primario activo: ${initialData.data.resolved.primaryColor}`);
  console.log(`  Presets disponibles: ${initialData.data.presets.length}`);
  console.log("  ✅ PASS: Configuración inicial y presets cargados correctamente.");

  const centroVenue = venues.find((v: any) => v.slug === "centro") || venues[0];
  const terrazaVenue = venues.find((v: any) => v.slug === "terraza") || venues[1] || venues[0];

  // 3. Configurar Marca Corporativa General (TENANT) con Tema 'Golden Luxury'
  console.log("\n3. Actualizando Marca a nivel Corporativo (TENANT) con Preset 'Golden Luxury':");
  const goldenPayload = {
    target: "TENANT",
    branding: {
      themePreset: "golden-lounge",
      primaryColor: "#EAB308",
      accentColor: "#F97316",
      welcomeTitle: "Retro Bar & Golden Lounge",
      welcomeSubtitle: "La mejor música y coctelería premium",
      marqueeText: "🥂 2x1 en Cócteles hasta las 00:00 hs | 🎶 Noche Dorada VIP",
      wifiSsid: "RetroBar_VIP_WiFi",
      wifiPassword: "Champagne2026",
      instagramHandle: "@retrobar_golden",
      whatsappNumber: "+5491155667788",
    },
  };

  const saveTenantRes = await fetch(`${baseUrl}/api/v1/branding`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    body: JSON.stringify(goldenPayload),
  });
  if (!saveTenantRes.ok) throw new Error("Fallo al guardar marca corporativa");
  const saveTenantData = await saveTenantRes.json();
  console.log(`  Respuesta: ${saveTenantData.message}`);
  console.log("  ✅ PASS: Marca corporativa guardada.");

  // 4. Verificar Herencia en Local Centro (no tiene sobreescritura, debe heredar de Tenant)
  console.log(`\n4. Verificando Herencia en ${centroVenue.name} (debe heredar datos corporativos):`);
  const centroRes = await fetch(`${baseUrl}/api/v1/branding?venueId=${centroVenue.id}`, {
    headers: { Cookie: ownerCookie },
  });
  if (!centroRes.ok) throw new Error("Fallo al consultar marca de sede centro");
  const centroData = await centroRes.json();
  console.log(`  Color en ${centroVenue.name}: ${centroData.data.resolved.primaryColor} (esperado #EAB308)`);
  console.log(`  Wi-Fi en ${centroVenue.name}: ${centroData.data.resolved.wifiSsid} (clave: ${centroData.data.resolved.wifiPassword})`);

  if (centroData.data.resolved.primaryColor !== "#EAB308" || centroData.data.resolved.wifiSsid !== "RetroBar_VIP_WiFi") {
    throw new Error("Fallo de herencia: Sede Centro no heredó la marca corporativa");
  }
  console.log("  ✅ PASS: Herencia corporativa funcionando correctamente.");

  // 5. Sobreescribir Marca en Local Específico (Terraza VIP) con Tema 'Emerald Speakeasy'
  console.log(`\n5. Sobreescribiendo Marca en ${terrazaVenue.name} con Tema 'Emerald Speakeasy':`);
  const emeraldPayload = {
    target: "VENUE",
    venueId: terrazaVenue.id,
    branding: {
      themePreset: "emerald-bar",
      primaryColor: "#10B981",
      accentColor: "#06B6D4",
      welcomeTitle: "Terraza VIP & Electro Garden",
      marqueeText: "🌿 Jardín Botánico Nocturno | DJs en Vivo",
      wifiSsid: "Terraza_OpenAir_WiFi",
      wifiPassword: "Electro2026",
      instagramHandle: "@terraza_garden_live",
    },
  };

  const saveVenueRes = await fetch(`${baseUrl}/api/v1/branding`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    body: JSON.stringify(emeraldPayload),
  });
  if (!saveVenueRes.ok) throw new Error("Fallo al guardar sobreescritura de local");
  console.log("  ✅ PASS: Sobreescritura específica de local guardada.");

  // Verificar que Terraza tiene Emerald y Centro mantiene Golden
  const verifyTerraza = await (await fetch(`${baseUrl}/api/v1/branding?venueId=${terrazaVenue.id}`, { headers: { Cookie: ownerCookie } })).json();
  const verifyCentro = await (await fetch(`${baseUrl}/api/v1/branding?venueId=${centroVenue.id}`, { headers: { Cookie: ownerCookie } })).json();

  console.log(`  Color en ${terrazaVenue.name}: ${verifyTerraza.data.resolved.primaryColor} (esperado #10B981)`);
  console.log(`  Color en ${centroVenue.name}: ${verifyCentro.data.resolved.primaryColor} (esperado #EAB308)`);

  if (verifyTerraza.data.resolved.primaryColor !== "#10B981" || verifyCentro.data.resolved.primaryColor !== "#EAB308") {
    throw new Error("Fallo: La sobreescritura de un local afectó incorrectamente a otro");
  }
  console.log("  ✅ PASS: Aislamiento y sobreescrituras independientes por sucursal validadas.");

  // 6. Verificar Propagación en la Pantalla Pública TV (/api/v1/display/state)
  console.log("\n6. Verificando Propagación a la Pantalla Pública TV (/api/v1/display/state?code=RETRO-POP):");
  const displayRes = await fetch(`${baseUrl}/api/v1/display/state?code=RETRO-POP`);
  if (!displayRes.ok) throw new Error("Fallo al consultar display");
  const displayData = await displayRes.json();
  const tvBranding = displayData.data.branding;

  console.log(`  Título en Pantalla TV: ${tvBranding.welcomeTitle}`);
  console.log(`  Color Primario TV: ${tvBranding.primaryColor}`);
  console.log(`  Marquesina en Pantalla TV: "${tvBranding.marqueeText}"`);
  console.log(`  Instagram en Pantalla TV: ${tvBranding.instagramHandle}`);

  if (!tvBranding.marqueeText.includes("Noche Dorada VIP")) {
    throw new Error("Fallo: La marquesina de la pantalla de TV no recibió el texto configurado");
  }
  console.log("  ✅ PASS: Pantalla Pública TV proyecta la marca, colores y cinta de anuncios.");

  // 7. Verificar Propagación a la Web App Móvil del Comensal (/api/v1/requests)
  console.log("\n7. Verificando Propagación al Móvil del Comensal (/api/v1/requests):");
  const scanM1 = await fetch(`${baseUrl}/qr/qr_centro_m1`, { redirect: "manual" });
  const guestCookieM1 = scanM1.headers.get("set-cookie")?.split(";")[0];

  const guestReqRes = await fetch(`${baseUrl}/api/v1/requests`, {
    headers: { Cookie: guestCookieM1 || "" },
  });
  if (!guestReqRes.ok) throw new Error("Fallo al consultar sesión de comensal");
  const guestData = await guestReqRes.json();
  const guestBranding = guestData.data.branding;

  console.log(`  Título en celular del cliente: ${guestBranding.welcomeTitle}`);
  console.log(`  Wi-Fi recibido en celular: ${guestBranding.wifiSsid} (Clave: ${guestBranding.wifiPassword})`);

  if (guestBranding.wifiSsid !== "RetroBar_VIP_WiFi" || guestBranding.wifiPassword !== "Champagne2026") {
    throw new Error("Fallo: El comensal no recibió las credenciales de Wi-Fi configuradas");
  }
  console.log("  ✅ PASS: Comensal recibe automáticamente la identidad de marca y datos de Wi-Fi de su mesa.");

  console.log("\n========================================================");
  console.log("🎉 TODAS LAS PRUEBAS DE LA FASE 7 PASARON CON ÉXITO (7/7)");
  console.log("========================================================");
}

testPhase7Branding().catch((err) => {
  console.error("❌ Error en pruebas de Fase 7:", err);
  process.exit(1);
});
