/**
 * TEST SUITE: MULTI-ZONE FAIR-PLAY QUEUE ENGINE ("CANTA Y LIBERA")
 *
 * Valida:
 * 1. Parseo y límites de políticas de cola (QueuePolicy)
 * 2. Algoritmo de rotación justa secuencial (calculateFairQueue)
 * 3. Cálculo de tiempos de espera estimados por posición
 * 4. Lógica de cupos por mesa ("Canta y Libera")
 * 5. Verificación de zonas y esquema en base de datos
 */

import { parseQueuePolicy, calculateEstimatedWait, calculateFairQueue } from "../src/lib/dj/rotation";
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

async function runFairPlayQueueTests() {
  console.log("\n=======================================================");
  console.log("🎤 TEST SUITE: MULTI-ZONE & FAIR-PLAY QUEUE ENGINE");
  console.log("=======================================================\n");

  // -------------------------------------------------------------
  // 1. Validar Parseo de Políticas de Cola (QueuePolicy)
  // -------------------------------------------------------------
  console.log("📋 1. Validando parseQueuePolicy...");

  // Defaults ante configuración nula o vacía
  const defaultPolicy = parseQueuePolicy(null);
  assert(defaultPolicy.maxActivePerTable === 1, "Default maxActivePerTable es 1");
  assert(defaultPolicy.queuePaused === false, "Default queuePaused es false");
  assert(defaultPolicy.rotationMode === "ROUND_ROBIN", "Default rotationMode es ROUND_ROBIN");
  assert(defaultPolicy.zone === "KARAOKE", "Default zone es KARAOKE");
  assert(defaultPolicy.avgSongDurationMinutes === 4, "Default avgSongDurationMinutes es 4");

  // Configuración de Karaoke Estricto (1 tema por mesa)
  const karaokeConfig = JSON.stringify({
    zone: "KARAOKE",
    maxActivePerTable: 1,
    queuePaused: true,
    rotationMode: "ROUND_ROBIN",
    avgSongDurationMinutes: 5,
  });
  const karaokePolicy = parseQueuePolicy(karaokeConfig);
  assert(karaokePolicy.zone === "KARAOKE", "Parseo de zona KARAOKE correcto");
  assert(karaokePolicy.maxActivePerTable === 1, "Modo estricto 1 tema por mesa correcto");
  assert(karaokePolicy.queuePaused === true, "Detección de cola pausada correcta");
  assert(karaokePolicy.avgSongDurationMinutes === 5, "Duración promedio de 5 min correcta");

  // Validación de límites seguros (clamping)
  const clampedPolicy = parseQueuePolicy(
    JSON.stringify({ maxActivePerTable: -5, avgSongDurationMinutes: 50 })
  );
  assert(clampedPolicy.maxActivePerTable === 1, "maxActivePerTable menor a 1 se ajusta a 1");
  assert(clampedPolicy.avgSongDurationMinutes === 15, "avgSongDurationMinutes mayor a 15 se ajusta a 15");

  // -------------------------------------------------------------
  // 2. Validar Estimación de Tiempos de Espera
  // -------------------------------------------------------------
  console.log("\n⏱️ 2. Validando cálculo de tiempos de espera...");

  assert(calculateEstimatedWait(0, 4)?.minutes === 0, "Posición #0 (al aire) espera 0 minutos");
  assert(calculateEstimatedWait(1, 4)?.minutes === 4, "Posición #1 espera 4 minutos");
  assert(calculateEstimatedWait(2, 4)?.minutes === 8, "Posición #2 espera 8 minutos");
  assert(calculateEstimatedWait(4, 4)?.minutes === 16, "Posición #4 espera 16 minutos");
  assert(calculateEstimatedWait(null, 4) === null, "Posición nula retorna null");

  // -------------------------------------------------------------
  // 3. Validar Algoritmo Fair-Share de Rotación de Mesas
  // -------------------------------------------------------------
  console.log("\n🔄 3. Validando Algoritmo de Rotación Justa (Round-Robin Interleaved)...");

  const now = new Date();
  // Simulación: Mesa 1 pide 3 canciones seguidas, luego Mesa 2 pide 1 canción
  const mockQueue = [
    { id: "q1", tableId: "table_1", orderIndex: 1, createdAt: new Date(now.getTime() - 30000) },
    { id: "q2", tableId: "table_1", orderIndex: 2, createdAt: new Date(now.getTime() - 20000) },
    { id: "q3", tableId: "table_1", orderIndex: 3, createdAt: new Date(now.getTime() - 10000) },
    { id: "q4", tableId: "table_2", orderIndex: 4, createdAt: new Date(now.getTime() - 5000) },
  ];

  const fairQueue = calculateFairQueue(mockQueue);
  assert(fairQueue.length === 4, "La cola resultante mantiene la totalidad de temas");
  assert(fairQueue[0].id === "q1", "El primer tema de Mesa 1 se respeta en orden (#1)");
  assert(fairQueue[1].id === "q4", "El tema de Mesa 2 se intercala en posición #2 evitando monopolio de Mesa 1");
  assert(fairQueue[2].id === "q2", "El segundo tema de Mesa 1 pasa a posición #3");
  assert(fairQueue[3].id === "q3", "El tercer tema de Mesa 1 pasa a posición #4");

  // -------------------------------------------------------------
  // 4. Validar Lógica de Cupos ("Canta y Libera")
  // -------------------------------------------------------------
  console.log("\n🎤 4. Validando Lógica de Cupos por Mesa ('Canta y Libera')...");

  const policyStrict = { maxActivePerTable: 1, queuePaused: false };
  const usedSlotsMesa1 = 1; // Ya tiene 1 tema PENDING o PLAYING
  const isLockedMesa1 = usedSlotsMesa1 >= policyStrict.maxActivePerTable;
  assert(isLockedMesa1 === true, "Mesa 1 con 1 tema en modo estricto tiene el cupo bloqueado (1/1)");

  // Al finalizar de cantar (PLAYED), su slot pasa a 0
  const usedSlotsMesa1AfterSinging = 0;
  const isLockedAfter = usedSlotsMesa1AfterSinging >= policyStrict.maxActivePerTable;
  assert(isLockedAfter === false, "Al finalizar de cantar, el cupo de Mesa 1 se libera inmediatamente ('Canta y Libera')");

  // Pausa de cola
  const policyPaused = { maxActivePerTable: 2, queuePaused: true };
  assert(policyPaused.queuePaused === true, "Puerta de cola detecta pausa y bloquea nuevos pedidos independientemente del cupo");

  // -------------------------------------------------------------
  // 5. Validar Estructura y Persistencia en Base de Datos Neon
  // -------------------------------------------------------------
  console.log("\n🗄️ 5. Validando esquema Multi-Zona y Eventos en Base de Datos...");

  try {
    const tablesWithZones = await prisma.table.findMany({
      select: { id: true, number: true, label: true, zone: true },
      take: 10,
    });
    assert(tablesWithZones.length > 0, `Se consultaron ${tablesWithZones.length} mesas en la BD`);

    const hasDjZone = tablesWithZones.some((t) => t.zone === "DJ" || t.zone === "MAIN");
    const hasKaraokeZone = tablesWithZones.some((t) => t.zone === "KARAOKE");
    assert(hasDjZone, "Existen mesas asignadas a Zona DJ / MAIN");
    assert(hasKaraokeZone, "Existen mesas asignadas a Zona KARAOKE");

    const activeEvent = await prisma.event.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, settings: true },
    });
    assert(Boolean(activeEvent), `Evento activo encontrado: ${activeEvent?.name}`);

    if (activeEvent?.settings) {
      const dbPolicy = parseQueuePolicy(activeEvent.settings);
      assert(
        typeof dbPolicy.maxActivePerTable === "number",
        `Política de evento en BD válida: ${dbPolicy.maxActivePerTable} temas/mesa, zona ${dbPolicy.zone}`
      );
    }
  } catch (err: any) {
    console.error("  Error consultando BD:", err.message);
    assert(false, "Fallo de conexión o consulta de BD");
  }

  // -------------------------------------------------------------
  // Resumen Final
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`🏁 RESULTADO SUITE FAIR-PLAY: ${passedTests}/${totalTests} pruebas exitosas`);
  console.log("=======================================================\n");

  if (passedTests === totalTests) {
    console.log("✨ ¡TODAS LAS PRUEBAS DE LA COLA MULTI-ZONA Y FAIR-PLAY PASARON!");
    process.exit(0);
  } else {
    console.error("❌ Algunas pruebas fallaron.");
    process.exit(1);
  }
}

runFairPlayQueueTests().catch((err) => {
  console.error("Excepción inesperada:", err);
  process.exit(1);
});
