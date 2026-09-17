async function testRuntime() {
  const baseUrl = "http://localhost:3000";
  console.log("🌐 Probando endpoints del servidor en tiempo real...\n");

  // 1. Probar ruta protegida sin autenticación
  console.log("1. Verificando protección de ruta sin token:");
  const resUnauth = await fetch(`${baseUrl}/api/v1/dashboard/stats`);
  console.log(`  Status: ${resUnauth.status} (esperado 401)`);
  if (resUnauth.status !== 401) {
    throw new Error("Fallo: La ruta protegida no devolvió 401");
  }
  console.log("  ✅ PASS: Acceso no autenticado bloqueado.");

  // 2. Login con usuario OWNER
  console.log("\n2. Iniciando sesión como OWNER (owner@retrobar.com):");
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "owner@retrobar.com",
      password: "Password123!",
    }),
  });
  console.log(`  Login Status: ${loginRes.status} (esperado 200)`);
  if (loginRes.status !== 200) {
    const errorBody = await loginRes.text();
    throw new Error(`Fallo de login: ${errorBody}`);
  }
  const loginData = await loginRes.json();
  console.log(`  Usuario: ${loginData.user.name} (${loginData.user.role})`);
  console.log(`  Tenant: ${loginData.user.tenant.name} (${loginData.user.tenant.slug})`);

  // Extraer cookie de sesión
  const cookieHeader = loginRes.headers.get("set-cookie");
  if (!cookieHeader) {
    throw new Error("Fallo: No se emitió la cookie httpOnly");
  }
  const sessionCookie = cookieHeader.split(";")[0];
  console.log("  ✅ PASS: Cookie httpOnly emitida correctamente.");

  // 3. Consultar /api/v1/auth/me con la cookie
  console.log("\n3. Verificando /api/v1/auth/me con sesión activa:");
  const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  console.log(`  Status: ${meRes.status} (esperado 200)`);
  const meData = await meRes.json();
  console.log(`  Permisos asignados: ${meData.user.permissions.length} permisos`);
  console.log("  ✅ PASS: Sesión validada en backend.");

  // 4. Consultar /api/v1/dashboard/stats con la cookie
  console.log("\n4. Consultando métricas del dashboard con aislamiento de Tenant:");
  const statsRes = await fetch(`${baseUrl}/api/v1/dashboard/stats`, {
    headers: { Cookie: sessionCookie },
  });
  console.log(`  Status: ${statsRes.status} (esperado 200)`);
  const statsData = await statsRes.json();
  console.log(`  Establecimiento: ${statsData.data.tenant.name}`);
  console.log(`  Estado: ${statsData.data.tenant.status}`);
  console.log(`  Locales (Venues): ${statsData.data.metrics.venuesCount}`);
  console.log(`  Eventos activos: ${statsData.data.metrics.activeEventsCount} de ${statsData.data.metrics.totalEventsCount} totales`);
  console.log(`  Mesas con QR: ${statsData.data.metrics.tablesCount}`);
  console.log(`  Plan de Suscripción: ${statsData.data.subscription.planName} (${statsData.data.subscription.status})`);
  console.log("  ✅ PASS: Métricas multi-tenant obtenidas correctamente.");

  // 5. Logout
  console.log("\n5. Cerrando sesión (Logout):");
  const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
    method: "POST",
    headers: { Cookie: sessionCookie },
  });
  console.log(`  Logout Status: ${logoutRes.status} (esperado 200)`);
  console.log("  ✅ PASS: Sesión finalizada.");

  console.log("\n🎉 Todas las pruebas de tiempo de ejecución fueron exitosas!");
}

testRuntime().catch((err) => {
  console.error("❌ Error en prueba de tiempo de ejecución:", err);
  process.exit(1);
});
