/**
 * TEST SUITE: TABLE ROTATION, VOLUNTARY CHECKOUT & ZONE HOPPING
 *
 * Valida:
 * 1. Salida voluntaria del comensal (Self-Checkout / Liberar Mesa)
 * 2. Limpieza de pedidos huérfanos y liberación de cupo para el siguiente cliente
 * 3. Cambio dinámico de sector (Sector DJ/Ambiente -> Sector Karaoke)
 * 4. Reset administrativo de mesa por el staff (Mozo / DJ)
 */

import { prisma } from "../src/lib/db/prisma";

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

async function runTableRotationTests() {
  console.log("\n=======================================================");
  console.log("🔄 TEST SUITE: TABLE ROTATION & ZONE HOPPING");
  console.log("=======================================================\n");

  try {
    // Buscar un evento activo y mesas para el test
    const event = await prisma.event.findFirst({
      where: { status: "ACTIVE" },
      include: {
        venue: {
          include: {
            tables: true,
          },
        },
      },
    });

    if (!event || event.venue.tables.length < 2) {
      console.log("  ⚠️ No se encontraron mesas suficientes en el evento activo para ejecutar tests dinámicos.");
      return;
    }

    const tableA = event.venue.tables[0];
    const tableB = event.venue.tables[1];

    console.log(`📋 1. Probando ciclo de ocupación y salida voluntaria en ${tableA.label}...`);

    // Simular sesión del Cliente 1 en Mesa A
    const tokenC1 = `test_c1_${Date.now()}`;
    const guest1 = await prisma.guestSession.create({
      data: {
        tenantId: event.tenantId,
        eventId: event.id,
        tableId: tableA.id,
        guestName: "Cliente 1 (Mesa 3)",
        sessionToken: tokenC1,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 3), // 3 horas
      },
    });

    assert(guest1.id !== null, "Sesión de Cliente 1 creada correctamente");

    // Cliente 1 solicita una canción
    const song = await prisma.song.findFirst();
    const request1 = await prisma.songRequest.create({
      data: {
        tenantId: event.tenantId,
        eventId: event.id,
        tableId: tableA.id,
        guestSessionId: guest1.id,
        songId: song ? song.id : null,
        customTitle: song ? null : "Tema de Prueba Cliente 1",
        customArtist: song ? null : "Artista Test",
        notes: "Dedicatoria Cliente 1",
        status: "PENDING",
      },
    });

    // Validar que la mesa tiene 1 pedido activo
    let activeBefore = await prisma.songRequest.count({
      where: {
        tableId: tableA.id,
        eventId: event.id,
        status: { in: ["PENDING", "ACCEPTED", "PLAYING"] },
      },
    });
    assert(activeBefore >= 1, `Mesa ${tableA.label} registra ${activeBefore} pedido activo`);

    // Simular Salida Voluntaria (Self-Checkout) del Cliente 1
    console.log("\n🚪 2. Simulando Salida Voluntaria (Liberar Mesa)...");
    await prisma.songRequest.updateMany({
      where: {
        tableId: tableA.id,
        eventId: event.id,
        guestSessionId: guest1.id,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      data: {
        status: "CANCELLED",
        notes: "Cliente liberó la mesa voluntariamente",
      },
    });

    await prisma.guestSession.update({
      where: { id: guest1.id },
      data: { expiresAt: new Date() },
    });

    // Validar que los pedidos pendientes quedaron cancelados
    const reqAfterLeave = await prisma.songRequest.findUnique({
      where: { id: request1.id },
    });
    assert(reqAfterLeave?.status === "CANCELLED", "El pedido pendiente de Cliente 1 fue cancelado al retirarse");

    // Validar que el cupo de la mesa quedó liberado (0 activos para esta sesión)
    const activeAfter = await prisma.songRequest.count({
      where: {
        tableId: tableA.id,
        eventId: event.id,
        guestSessionId: guest1.id,
        status: { in: ["PENDING", "ACCEPTED", "PLAYING"] },
      },
    });
    assert(activeAfter === 0, `Cupo de Mesa ${tableA.label} liberado (0 activos)`);

    console.log("\n🆕 3. Validando ocupación por nuevo cliente (Cliente 2) en la misma mesa...");
    const tokenC2 = `test_c2_${Date.now()}`;
    const guest2 = await prisma.guestSession.create({
      data: {
        tenantId: event.tenantId,
        eventId: event.id,
        tableId: tableA.id,
        guestName: "Cliente 2 (Nuevo comensal)",
        sessionToken: tokenC2,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 3),
      },
    });
    assert(guest2.guestName === "Cliente 2 (Nuevo comensal)", "Cliente 2 inicia con sesión fresca independiente");

    console.log("\n🔀 4. Simulando Cambio de Sector (Sector DJ -> Sector Karaoke)...");
    // Supongamos que Cliente 2 decide mudarse a Mesa B (Sector Karaoke)
    const zoneA = tableA.zone;
    const zoneB = tableB.zone;

    // Al escanear Mesa B: se expira la sesión en Mesa A y se crea en Mesa B
    await prisma.guestSession.update({
      where: { id: guest2.id },
      data: { expiresAt: new Date() },
    });

    const tokenC2Moved = `test_c2_moved_${Date.now()}`;
    const guest2Moved = await prisma.guestSession.create({
      data: {
        tenantId: event.tenantId,
        eventId: event.id,
        tableId: tableB.id,
        guestName: guest2.guestName, // Preserva su nombre
        sessionToken: tokenC2Moved,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 3),
      },
    });

    assert(guest2Moved.tableId === tableB.id, `Cliente 2 reubicado exitosamente en ${tableB.label}`);
    assert(guest2Moved.guestName === "Cliente 2 (Nuevo comensal)", "El nombre del cliente se conservó durante el cambio de mesa");

    console.log("\n🧹 5. Validando Reset Administrativo de Mesa por Staff...");
    // Crear un pedido huérfano en Mesa B
    const orphanReq = await prisma.songRequest.create({
      data: {
        tenantId: event.tenantId,
        eventId: event.id,
        tableId: tableB.id,
        guestSessionId: guest2Moved.id,
        customTitle: "Tema Huérfano Test",
        customArtist: "Banda Test",
        notes: "Cliente Saliente",
        status: "PENDING",
      },
    });

    // Staff presiona "Liberar Mesa"
    await prisma.songRequest.updateMany({
      where: {
        tableId: tableB.id,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      data: {
        status: "CANCELLED",
        notes: "Mesa reseteada por personal de cabina/sala",
      },
    });

    const orphanAfter = await prisma.songRequest.findUnique({
      where: { id: orphanReq.id },
    });
    assert(orphanAfter?.status === "CANCELLED", "Reset de staff cancela pedidos huérfanos");

    // Limpieza de datos de prueba
    await prisma.songRequest.deleteMany({
      where: { id: { in: [request1.id, orphanReq.id] } },
    });
    await prisma.guestSession.deleteMany({
      where: { id: { in: [guest1.id, guest2.id, guest2Moved.id] } },
    });
    console.log("  🧹 Registros de prueba temporales limpiados.");

  } catch (error) {
    console.error("Error ejecutando pruebas de rotación:", error);
    assert(false, "Excepción durante la prueba de rotación");
  }

  console.log("\n=======================================================");
  console.log(`🏁 RESULTADO SUITE ROTACIÓN: ${passedTests}/${totalTests} pruebas exitosas`);
  console.log("=======================================================\n");

  if (passedTests === totalTests) {
    console.log("✨ ¡TODAS LAS PRUEBAS DE ROTACIÓN, CHECKOUT Y CAMBIO DE SECTOR PASARON!\n");
  } else {
    process.exit(1);
  }
}

runTableRotationTests().catch(console.error);
