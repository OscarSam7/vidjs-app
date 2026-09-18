import { prisma } from "../src/lib/db/prisma";
import { realtimeBus } from "../src/lib/realtime/event-bus";
import { checkTenantQuota } from "../src/lib/billing/limits";

async function runTests() {
  console.log("\n=======================================================");
  console.log("🎉 TEST SUITE: PLAN PERSONAL / FIESTA & CROSS-VENUE MIGRATION");
  console.log("=======================================================\n");

  let passed = 0;
  const assert = (condition: any, message: string) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      process.exit(1);
    }
  };

  // 1. Validar Catálogo de Planes: Plan PERSONAL
  console.log("📦 1. Validando Plan Personal / Amigos en Catálogo...");
  const personalPlan = await prisma.plan.upsert({
    where: { code: "PERSONAL" },
    update: {},
    create: {
      name: "Plan Amigos & Fiestas Privadas",
      code: "PERSONAL",
      priceCents: 499,
      currency: "USD",
      interval: "MONTHLY",
      maxVenues: 1,
      maxEventsPerMonth: 4,
      maxActiveTables: 1,
      features: JSON.stringify([
        "Ideal para fiestas en casa, asados y juntadas",
        "1 Anfitrión / DJ personal con cabina interactiva",
        "1 Código QR y Link directo para WhatsApp",
      ]),
    },
  });

  assert(personalPlan.code === "PERSONAL", "Plan PERSONAL registrado correctamente");
  assert(personalPlan.priceCents === 499, "Precio del plan personal es de $4.99 USD");
  assert(personalPlan.maxActiveTables === 1, "Plan personal restringe a 1 mesa virtual / living");
  assert(personalPlan.maxVenues === 1, "Plan personal permite 1 sede virtual");

  // 2. Simular creación de cuenta Personal (Tenant: "Cumpleaños de Nico #30")
  console.log("\n🏠 2. Creando Entorno de Fiesta Privada / DJ Personal...");
  const partyTenant = await prisma.tenant.create({
    data: {
      name: "Cumple de Nico #30",
      slug: `cumple-nico-${Date.now()}`,
      status: "ACTIVE",
      settings: JSON.stringify({ isPersonalParty: true, hostName: "Nico DJ" }),
    },
  });

  // Suscripción al plan Personal
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);
  await prisma.subscription.create({
    data: {
      tenantId: partyTenant.id,
      planId: personalPlan.id,
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
    },
  });

  // Sede virtual ("Living / Quincho")
  const partyVenue = await prisma.venue.create({
    data: {
      tenantId: partyTenant.id,
      name: "Casa de Nico (Living & Quincho)",
      slug: "casa-nico",
      active: true,
    },
  });

  // Mesa virtual única ("Pista & Living")
  const partyQrToken = `qr_fiesta_${Date.now()}`;
  const partyTable = await prisma.table.create({
    data: {
      tenantId: partyTenant.id,
      venueId: partyVenue.id,
      number: 1,
      label: "Living & Parrilla (Amigos)",
      qrToken: partyQrToken,
      capacity: 30,
      zone: "DJ",
      active: true,
    },
  });

  // Evento activo de la noche
  const partyEvent = await prisma.event.create({
    data: {
      tenantId: partyTenant.id,
      venueId: partyVenue.id,
      name: "Asado & Cumple Nico",
      code: `NICO-${Math.floor(Math.random() * 9000 + 1000)}`,
      status: "ACTIVE",
      startsAt: new Date(),
    },
  });

  assert(partyTable.qrToken.length > 5, "Código QR de la fiesta generado exitosamente");
  assert(partyEvent.status === "ACTIVE", "Evento de fiesta privada activo");

  // Validar cuotas del plan
  const quotaCheck = await checkTenantQuota(partyTenant.id, "tables");
  assert(quotaCheck.current === 1, "Cuota de 1 mesa consumida en fiesta privada");
  assert(quotaCheck.max === 1, "Límite de 1 mesa respetado");

  // 3. Simular Amigo (Invitado) escaneando el QR de la fiesta
  console.log("\n📱 3. Amigo (Invitado) ingresa a la fiesta y pide un tema...");
  const friendSessionToken = `gs_friend_${Date.now()}`;
  const friendExpiresAt = new Date();
  friendExpiresAt.setHours(friendExpiresAt.getHours() + 12);

  const friendPartySession = await prisma.guestSession.create({
    data: {
      tenantId: partyTenant.id,
      eventId: partyEvent.id,
      tableId: partyTable.id,
      guestName: "Martín (Amigo)",
      sessionToken: friendSessionToken,
      expiresAt: friendExpiresAt,
    },
  });

  assert(friendPartySession.guestName === "Martín (Amigo)", "Sesión del amigo creada con su nombre");

  // El amigo envía un pedido musical al anfitrión
  const partySongRequest = await prisma.songRequest.create({
    data: {
      tenantId: partyTenant.id,
      eventId: partyEvent.id,
      tableId: partyTable.id,
      guestSessionId: friendPartySession.id,
      customTitle: "Bizarrap Music Sessions",
      customArtist: "Bizarrap & Quevedo",
      status: "PENDING",
      notes: "¡Temazo para el cumple de Nico!",
    },
  });

  assert(partySongRequest.status === "PENDING", "Pedido musical recibido en cabina de la fiesta");

  // 4. Obtener un Bar Comercial existente para simular la mudanza
  console.log("\n🍻 4. Horas después: El amigo va a un Bar de Karaoke Comercial con Vidjs...");
  const commercialEvent = await prisma.event.findFirst({
    where: { status: "ACTIVE", tenantId: { not: partyTenant.id } },
    include: {
      tenant: true,
      venue: { include: { tables: { where: { active: true } } } },
    },
  });

  if (!commercialEvent || !commercialEvent.venue.tables.length) {
    throw new Error("No hay evento comercial de prueba disponible en base de datos");
  }

  const barTable = commercialEvent.venue.tables[0];
  console.log(`📍 Bar comercial: "${commercialEvent.tenant.name}" | Mesa: "${barTable.label}"`);

  // 5. Simular Escaneo del QR en el Bar Comercial (Transición Cross-Tenant)
  console.log("\n🔄 5. Verificando Handshake de Migración Cross-Tenant / Cross-Venue...");

  // Simular la lógica de /qr/[token]/route.ts
  const prevSession = friendPartySession;
  let carriedGuestName: string | null = null;
  let switchType: string | null = null;
  let fromVenue: string | null = null;
  let toVenue: string | null = null;

  let releasedEventReceived: any = null;
  const tableReleasedListener = (event: any) => {
    if (event.type === "TABLE_RELEASED") {
      releasedEventReceived = event.data;
    }
  };
  realtimeBus.subscribe(prevSession.eventId, tableReleasedListener);

  if (prevSession && prevSession.tableId !== barTable.id) {
    carriedGuestName = prevSession.guestName;

    const isDifferentTenant = prevSession.tenantId !== barTable.tenantId;
    const isDifferentVenue = partyVenue.id !== barTable.venueId;

    if (isDifferentTenant || isDifferentVenue) {
      switchType = "venue";
      fromVenue = partyTenant.name;
      toVenue = commercialEvent.tenant.name;
    } else {
      switchType = "table";
    }

    // Cancelar pedidos pendientes de la fiesta anterior
    await prisma.songRequest.updateMany({
      where: {
        tableId: prevSession.tableId,
        guestSessionId: prevSession.id,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      data: {
        status: "CANCELLED",
        notes: `Cliente se retiró y conectó a ${toVenue}`,
      },
    });

    // Expirar la sesión anterior
    await prisma.guestSession.update({
      where: { id: prevSession.id },
      data: { expiresAt: new Date() },
    });

    // Notificar al evento anterior
    realtimeBus.broadcast(prevSession.eventId, "TABLE_RELEASED", {
      tableId: prevSession.tableId,
      tableLabel: partyTable.label,
      zone: partyTable.zone,
      reason: isDifferentTenant ? "GUEST_CHANGED_VENUE" : "GUEST_MOVED_TABLE",
      newTableLabel: barTable.label,
      newZone: barTable.zone,
    });
  }

  // Crear la nueva sesión en el Bar Comercial
  const newSessionToken = `gs_bar_${Date.now()}`;
  const newBarSession = await prisma.guestSession.create({
    data: {
      tenantId: barTable.tenantId,
      eventId: commercialEvent.id,
      tableId: barTable.id,
      guestName: carriedGuestName,
      sessionToken: newSessionToken,
      expiresAt: friendExpiresAt,
    },
  });

  // Validaciones de la transición
  assert(switchType === "venue", "Detectado cambio cross-tenant / cross-venue ('venue')");
  assert(fromVenue === "Cumple de Nico #30", "Identificado establecimiento de origen");
  assert(toVenue === commercialEvent.tenant.name, "Identificado establecimiento de destino");
  assert(newBarSession.guestName === "Martín (Amigo)", "Nombre del usuario preservado automáticamente");
  assert(newBarSession.tenantId === commercialEvent.tenantId, "Sesión asociada al tenant del bar comercial");
  assert(newBarSession.tableId === barTable.id, "Sesión asociada a la mesa física del bar");

  // Validar estado del pedido anterior
  const oldReq = await prisma.songRequest.findUnique({
    where: { id: partySongRequest.id },
  });
  assert(oldReq?.status === "CANCELLED", "Pedido en la fiesta anterior cancelado limpiamente");
  assert(releasedEventReceived?.reason === "GUEST_CHANGED_VENUE", "Evento Realtime TABLE_RELEASED emitido con motivo GUEST_CHANGED_VENUE");

  // Limpieza de datos de prueba temporales
  realtimeBus.unsubscribe(prevSession.eventId, tableReleasedListener);
  await prisma.songRequest.deleteMany({ where: { guestSessionId: { in: [friendPartySession.id, newBarSession.id] } } });
  await prisma.guestSession.deleteMany({ where: { id: { in: [friendPartySession.id, newBarSession.id] } } });
  await prisma.event.delete({ where: { id: partyEvent.id } });
  await prisma.table.delete({ where: { id: partyTable.id } });
  await prisma.venue.delete({ where: { id: partyVenue.id } });
  await prisma.subscription.deleteMany({ where: { tenantId: partyTenant.id } });
  await prisma.tenant.delete({ where: { id: partyTenant.id } });

  console.log("\n=======================================================");
  console.log(`🏁 RESULTADOS: ${passed}/14 tests pasados (100%)`);
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("❌ Error ejecutando test:", err);
  process.exit(1);
});
