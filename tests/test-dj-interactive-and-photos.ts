/**
 * TEST SUITE: DJ INTERACTIVE GAMES & ADVANCED PHOTO MODERATION
 *
 * Valida:
 * 1. Ciclo completo de fotos: Subida con sticker/marco, aprobación por DJ,
 *    destacado en pantalla (Feature 12s) y retiro inmediato de TV (Remove).
 * 2. Políticas del DJ: Pausa/habilitación de fotos y rotación de segundos en TV.
 * 3. Reacciones en vivo: Ráfaga de emojis flotantes (SSE 0ms).
 * 4. Dinámicas interactivas: Aplausómetro digital y Ruleta de la suerte de mesas.
 */

import { prisma } from "../src/lib/db/prisma";
import { parseQueuePolicy } from "../src/lib/dj/rotation";
import { realtimeBus } from "../src/lib/realtime/event-bus";

let totalTests = 0;
let passedTests = 0;

function assert(condition: any, message: string) {
  totalTests++;
  if (Boolean(condition)) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runInteractiveAndPhotoTests() {
  console.log("\n=======================================================");
  console.log("🎮 TEST SUITE: DJ INTERACTIVE & ADVANCED PHOTO CONTROLS");
  console.log("=======================================================\n");

  try {
    const event = await prisma.event.findFirst({
      where: { status: "ACTIVE" },
      include: {
        venue: {
          include: {
            tables: { where: { active: true }, orderBy: { number: "asc" } },
          },
        },
      },
    });

    if (!event || event.venue.tables.length === 0) {
      console.log("  ⚠️ No se encontró un evento activo con mesas.");
      return;
    }

    const table = event.venue.tables[0];
    console.log(`📍 Usando Evento: "${event.name}" | Mesa: ${table.label}`);

    // -------------------------------------------------------------
    // 1. POLÍTICAS DE FOTOS DEL DJ
    // -------------------------------------------------------------
    console.log("\n📋 1. Probando Políticas de Fotos del DJ...");

    // Política por defecto
    const defaultPolicy = parseQueuePolicy(null);
    assert(defaultPolicy.photosAllowed === true, "Por defecto la subida de fotos está permitida");
    assert(defaultPolicy.photoRotationSeconds === 8, "Por defecto la rotación de fotos es de 8 segundos");

    // Guardar política con fotos pausadas y 5 segundos
    const customSettings = JSON.stringify({
      photosAllowed: false,
      photoRotationSeconds: 5,
      zone: "DJ",
    });
    const parsedCustom = parseQueuePolicy(customSettings);
    assert(parsedCustom.photosAllowed === false, "Politica parsea photosAllowed: false correctamente");
    assert(parsedCustom.photoRotationSeconds === 5, "Politica parsea photoRotationSeconds: 5s correctamente");

    // -------------------------------------------------------------
    // 2. CICLO COMPLETO DE MODERACIÓN DE FOTOS
    // -------------------------------------------------------------
    console.log("\n📸 2. Probando Moderación Avanzada de Fotos (Aprobar, Destacar, Sacar de TV)...");

    // Crear foto con marco temático de Cumpleaños
    const testPhoto = await prisma.photoPost.create({
      data: {
        tenantId: event.tenantId,
        eventId: event.id,
        tableId: table.id,
        guestName: "Martín Test",
        imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        caption: "🎂 ¡Cumpleaños Feliz! • \"¡Celebrando con todos!\"",
        status: "PENDING",
      },
    });

    assert(testPhoto.status === "PENDING", "Foto creada inicialmente en estado PENDING");
    assert(testPhoto.caption?.includes("🎂 ¡Cumpleaños Feliz!"), "Foto contiene sticker de cumpleaños aplicado");

    // DJ aprueba foto para proyectar en TV
    const approvedPhoto = await prisma.photoPost.update({
      where: { id: testPhoto.id },
      data: { status: "APPROVED" },
    });
    assert(approvedPhoto.status === "APPROVED", "Foto actualizada a APPROVED para proyección en TV");

    // Verificar consulta pública de fotos aprobadas
    const livePhotos = await prisma.photoPost.findMany({
      where: { eventId: event.id, status: "APPROVED" },
    });
    const foundInLive = livePhotos.some((p) => p.id === testPhoto.id);
    assert(foundInLive, "Foto aprobada aparece en la lista de fotos al aire de la TV");

    // DJ saca la foto de pantalla (REMOVE)
    const removedPhoto = await prisma.photoPost.update({
      where: { id: testPhoto.id },
      data: { status: "REMOVED" },
    });
    assert(removedPhoto.status === "REMOVED", "Foto retirada de pantalla con status REMOVED");

    // Verificar que ya no aparece en fotos al aire
    const livePhotosAfterRemove = await prisma.photoPost.findMany({
      where: { eventId: event.id, status: "APPROVED" },
    });
    const stillInLive = livePhotosAfterRemove.some((p) => p.id === testPhoto.id);
    assert(!stillInLive, "Foto retirada ya NO aparece en las fotos al aire de la TV");

    // Limpieza de foto de prueba
    await prisma.photoPost.delete({ where: { id: testPhoto.id } });

    // -------------------------------------------------------------
    // 3. REACCIONES EN VIVO (SSE 0ms)
    // -------------------------------------------------------------
    console.log("\n🚀 3. Probando Emisión de Reacciones en Vivo (SSE)...");

    let receivedReactionEvent: any = null;
    const rxListener = (msg: any) => {
      if (msg.type === "REACTION_BURST") {
        receivedReactionEvent = msg.data;
      }
    };
    realtimeBus.subscribe(event.id, rxListener);

    realtimeBus.broadcast(event.id, "REACTION_BURST", {
      id: "rx_test_123",
      reaction: "🔥",
      tableLabel: table.label,
      guestName: "Martín Test",
      timestamp: Date.now(),
    });

    assert(receivedReactionEvent !== null, "Evento REACTION_BURST emitido y capturado por el bus SSE");
    assert(receivedReactionEvent?.reaction === "🔥", "Reacción transporta el emoji correcto (🔥)");
    assert(receivedReactionEvent?.tableLabel === table.label, `Reacción asociada a la mesa ${table.label}`);

    realtimeBus.unsubscribe(event.id, rxListener);

    // -------------------------------------------------------------
    // 4. DINÁMICAS INTERACTIVAS: APLAUSÓMETRO & RULETA
    // -------------------------------------------------------------
    console.log("\n🎮 4. Probando Dinámicas Interactivas (Aplausómetro & Ruleta)...");

    // Aplausómetro Start
    let applauseStartReceived: any = null;
    const applauseListener = (msg: any) => {
      if (msg.type === "APPLAUSE_START") {
        applauseStartReceived = msg.data;
      }
    };
    realtimeBus.subscribe(event.id, applauseListener);

    realtimeBus.broadcast(event.id, "APPLAUSE_START", {
      targetTableLabel: table.label,
      durationSeconds: 15,
      endsAt: new Date(Date.now() + 15000).toISOString(),
    });

    assert(applauseStartReceived !== null, "Evento APPLAUSE_START recibido por oyentes");
    assert(applauseStartReceived?.targetTableLabel === table.label, "Aplausómetro dirigido a la mesa correcta");
    assert(applauseStartReceived?.durationSeconds === 15, "Aplausómetro dura 15 segundos");

    realtimeBus.unsubscribe(event.id, applauseListener);

    // Ruleta de la Suerte de Mesas
    const tableLabels = event.venue.tables.map((t) => t.label);
    const chosenWinner = tableLabels[0];
    let rouletteReceived: any = null;

    const rouletteListener = (msg: any) => {
      if (msg.type === "ROULETTE_SPIN") {
        rouletteReceived = msg.data;
      }
    };
    realtimeBus.subscribe(event.id, rouletteListener);

    realtimeBus.broadcast(event.id, "ROULETTE_SPIN", {
      tables: tableLabels,
      winner: chosenWinner,
      winningIndex: 0,
      prize: "¡Ronda de Shots Gratis!",
      spinDurationMs: 6000,
    });

    assert(rouletteReceived !== null, "Evento ROULETTE_SPIN recibido con éxito");
    assert(rouletteReceived?.winner === chosenWinner, `Ruleta selecciona al ganador: ${chosenWinner}`);
    assert(rouletteReceived?.tables.length > 0, "Ruleta transporta el listado de mesas del local");

    realtimeBus.unsubscribe(event.id, rouletteListener);

    // -------------------------------------------------------------
    // RESUMEN
    // -------------------------------------------------------------
    console.log("\n=======================================================");
    console.log(`🏁 RESULTADOS: ${passedTests}/${totalTests} tests pasados (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log("=======================================================\n");

    if (passedTests === totalTests) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error ejecutando test suite:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runInteractiveAndPhotoTests();
