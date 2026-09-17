import { prisma } from "../src/lib/db/prisma";

async function testPhase5() {
  const baseUrl = "http://localhost:3000";
  console.log("💳 Iniciando pruebas de verificación de la Fase 5 (Suscripciones, Facturación & Cuotas)...\n");

  // Limpieza inicial idempotente
  await prisma.table.deleteMany({
    where: { number: { in: [12, 13, 14, 15, 16] } },
  });

  // 1. Probar Seguridad RBAC de Facturación (DJ debe ser bloqueado)
  console.log("1. Verificando Seguridad RBAC de Facturación:");
  const djLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "dj@retrobar.com", password: "Password123!" }),
  });
  const djCookie = djLogin.headers.get("set-cookie")?.split(";")[0];

  const djBillingRes = await fetch(`${baseUrl}/api/v1/billing`, {
    headers: { Cookie: djCookie || "" },
  });
  console.log(`  Intento de acceso por DJ: ${djBillingRes.status} (esperado 403)`);
  if (djBillingRes.status !== 403) throw new Error("Fallo: El rol DJ no debió tener acceso a facturación");
  console.log("  ✅ PASS: Acceso no autorizado a facturación bloqueado con HTTP 403.");

  // 2. Acceso de OWNER a Facturación y Consulta de Cuotas
  console.log("\n2. Acceso como OWNER a Facturación y Cuotas:");
  const ownerLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner@retrobar.com", password: "Password123!" }),
  });
  const ownerCookie = ownerLogin.headers.get("set-cookie")?.split(";")[0];

  const billingRes = await fetch(`${baseUrl}/api/v1/billing`, {
    headers: { Cookie: ownerCookie || "" },
  });
  if (!billingRes.ok) throw new Error("Fallo al consultar facturación como Owner");
  const billingData = await billingRes.json();
  console.log(`  Plan actual: ${billingData.data.subscription.plan.name} (${billingData.data.subscription.plan.code})`);
  console.log(`  Estado: ${billingData.data.subscription.status}`);
  console.log(`  Cuota Locales: ${billingData.data.quotas.venues.current} / ${billingData.data.quotas.venues.max}`);
  console.log(`  Cuota Mesas: ${billingData.data.quotas.tables.current} / ${billingData.data.quotas.tables.max}`);
  console.log(`  Planes disponibles: ${billingData.data.availablePlans.map((p: any) => p.code).join(", ")}`);
  console.log("  ✅ PASS: Métricas de cuota obtenidas correctamente.");

  // 3. Probar Cambio de Plan a STARTER (Límite: 15 mesas)
  console.log("\n3. Cambiando plan a STARTER (Límite 15 mesas):");
  const changeRes = await fetch(`${baseUrl}/api/v1/billing/change-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie || "" },
    body: JSON.stringify({ planCode: "STARTER" }),
  });
  if (!changeRes.ok) throw new Error("Fallo al cambiar a plan Starter");
  const changeData = await changeRes.json();
  console.log(`  Nuevo plan contratado: ${changeData.data.subscription.plan.name}`);
  console.log("  ✅ PASS: Plan cambiado exitosamente a STARTER.");

  // 4. Probar Feature Gating: Llenar cuota hasta el límite de 15 mesas
  console.log("\n4. Probando Feature Gating: Alcanzar límite de 15 mesas:");
  // Obtener venue ID
  const venueId = (await (await fetch(`${baseUrl}/api/v1/tables`, { headers: { Cookie: ownerCookie || "" } })).json()).data[0].venue.id;

  // Creamos mesas 12, 13, 14, 15
  for (let num = 12; num <= 15; num++) {
    const createRes = await fetch(`${baseUrl}/api/v1/tables`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie || "" },
      body: JSON.stringify({
        venueId,
        number: num,
        label: `Mesa Test ${num}`,
        capacity: 4,
      }),
    });
    if (!createRes.ok) throw new Error(`Fallo creando mesa ${num}`);
  }
  console.log("  Mesas 12, 13, 14 y 15 creadas (Total: 15 mesas = 100% de la cuota Starter).");

  // Intentar crear la mesa 16 (DEBE SER BLOQUEADA POR EL BACKEND)
  console.log("\n5. Intentando crear Mesa 16 (debe disparar QUOTA_EXCEEDED):");
  const blockedRes = await fetch(`${baseUrl}/api/v1/tables`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie || "" },
    body: JSON.stringify({
      venueId,
      number: 16,
      label: "Mesa Bloqueada 16",
      capacity: 4,
    }),
  });
  console.log(`  Status de intento excedido: ${blockedRes.status} (esperado 403)`);
  if (blockedRes.status !== 403) throw new Error("Fallo: El backend no bloqueó el límite de cuota");
  const blockedErr = await blockedRes.json();
  console.log(`  Código de error: ${blockedErr.error.code}`);
  console.log(`  Mensaje explicativo: "${blockedErr.error.message}"`);
  console.log("  ✅ PASS: Feature Gating activo en backend (creación bloqueada).");

  // 6. Upgrade a ENTERPRISE (Límite: 200 mesas)
  console.log("\n6. Realizando Upgrade a Plan ENTERPRISE:");
  const upgradeRes = await fetch(`${baseUrl}/api/v1/billing/change-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie || "" },
    body: JSON.stringify({ planCode: "ENTERPRISE" }),
  });
  if (!upgradeRes.ok) throw new Error("Fallo al actualizar a plan Enterprise");
  console.log("  ✅ PASS: Plan mejorado a ENTERPRISE.");

  // Ahora la Mesa 16 sí debe poder crearse
  console.log("\n7. Reintentando creación de Mesa 16 con Plan ENTERPRISE:");
  const retryRes = await fetch(`${baseUrl}/api/v1/tables`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie || "" },
    body: JSON.stringify({
      venueId,
      number: 16,
      label: "Mesa 16 (Desbloqueada)",
      capacity: 4,
    }),
  });
  if (!retryRes.ok) throw new Error("Fallo al crear mesa tras el upgrade");
  console.log("  ✅ PASS: Mesa 16 creada exitosamente tras el upgrade!");

  // Restaurar al plan PRO recomendado
  await fetch(`${baseUrl}/api/v1/billing/change-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie || "" },
    body: JSON.stringify({ planCode: "PRO" }),
  });

  console.log("\n🎉 TODAS LAS PRUEBAS DE LA FASE 5 SUPERADAS AL 100%!");
}

testPhase5().catch((err) => {
  console.error("❌ Error en pruebas de Fase 5:", err);
  process.exit(1);
});
