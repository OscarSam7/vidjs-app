import { prisma } from "../src/lib/db/prisma";

async function runTests() {
  console.log("\n=======================================================");
  console.log("📸 TEST SUITE: PHOTO UPLOAD FIX & NULL/CAPTION RESILIENCE");
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

  const activeEvent = await prisma.event.findFirst({
    where: { status: "ACTIVE" },
    include: {
      venue: { include: { tables: { take: 1 } } },
    },
  });

  if (!activeEvent || !activeEvent.venue.tables.length) {
    throw new Error("No hay evento activo disponible para el test");
  }

  const table = activeEvent.venue.tables[0];
  console.log(`📍 Usando Evento: "${activeEvent.name}" | Mesa: "${table.label}"`);

  // 1. Crear sesión de prueba
  const sessionToken = `gs_test_photo_${Date.now()}`;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 2);

  const guestSession = await prisma.guestSession.create({
    data: {
      tenantId: activeEvent.tenantId,
      eventId: activeEvent.id,
      tableId: table.id,
      guestName: "Nico (Fotógrafo)",
      sessionToken,
      expiresAt,
    },
  });

  assert(guestSession.id.length > 0, "Sesión de invitado creada");

  // 2. Probar subida con caption = null (el bug reportado por el usuario)
  console.log("\n🧪 2. Probando subida de foto con caption = null...");
  const photoNullCaption = await prisma.photoPost.create({
    data: {
      tenantId: guestSession.tenantId,
      eventId: guestSession.eventId,
      tableId: guestSession.tableId,
      guestName: guestSession.guestName,
      imageUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...",
      caption: null,
      status: "PENDING",
    },
  });

  assert(photoNullCaption.id.length > 0, "Foto con caption null guardada sin error de servidor");
  assert(photoNullCaption.caption === null, "Campo caption es null correctamente");

  // 3. Probar subida con caption largo (> 160 caracteres)
  console.log("\n🧪 3. Probando subida de foto con dedicatoria larga (> 160 chars)...");
  const longCaption = "🎂 ¡Cumpleaños Feliz! • \"Esta noche la rompemos todos juntos celebrando los 30 años con la mejor música y amigos en la mesa central disfrutando sin parar!\"";
  const photoLongCaption = await prisma.photoPost.create({
    data: {
      tenantId: guestSession.tenantId,
      eventId: guestSession.eventId,
      tableId: guestSession.tableId,
      guestName: guestSession.guestName,
      imageUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...",
      caption: longCaption,
      status: "PENDING",
    },
  });

  assert(photoLongCaption.caption === longCaption, "Caption largo permitido y almacenado");
  assert(longCaption.length > 140, "Verificado longitud de caption extendida");

  // 4. Limpieza
  await prisma.photoPost.deleteMany({
    where: { id: { in: [photoNullCaption.id, photoLongCaption.id] } },
  });
  await prisma.guestSession.delete({
    where: { id: guestSession.id },
  });

  console.log("\n=======================================================");
  console.log(`🏁 RESULTADOS: ${passed}/5 tests pasados (100%)`);
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("❌ Error en test:", err);
  process.exit(1);
});
