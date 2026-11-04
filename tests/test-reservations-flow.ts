import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testReservationsFlow() {
  console.log("=== INICIANDO TEST END-TO-END DE RESERVAS & DECORACIONES CON FOTOS ===");

  // 1. Obtener primera sede activa
  const venue = await prisma.venue.findFirst({
    where: { active: true },
    include: {
      tenant: true,
      tables: { where: { active: true } },
    },
  });

  if (!venue) {
    console.error("❌ No se encontró sede activa");
    return;
  }
  console.log(`✓ Sede localizada: ${venue.name} (Tenant: ${venue.tenant.name})`);

  // 2. Verificar paquetes y opciones de decoración con fotos
  const packages = await prisma.reservationPackage.findMany({
    where: { tenantId: venue.tenantId },
    include: { decorations: true },
  });

  console.log(`✓ Paquetes encontrados: ${packages.length}`);
  for (const pkg of packages) {
    console.log(`  - Paquete: "${pkg.name}" (${pkg.pricingType})`);
    console.log(`    Decoraciones con fotos (${pkg.decorations.length}):`);
    for (const d of pkg.decorations) {
      console.log(`      * ${d.name} -> Foto: ${d.imageUrl.substring(0, 50)}... Extra: Gs. ${d.extraPriceCents}`);
    }
  }

  const bdayPkg = packages.find((p) => p.isBirthdayPackage) || packages[0];
  const chosenDeco = bdayPkg.decorations[0];

  // 3. Crear una reserva simulada con cliente, cumpleañero, foto de decoración y comprobante
  console.log("\n--- Simulando Reserva de Cumpleaños ---");
  const inviteToken = `res_test_${Date.now().toString(36)}`;
  const table = venue.tables[0];

  const reservation = await prisma.tableReservation.create({
    data: {
      tenantId: venue.tenantId,
      venueId: venue.id,
      tableId: table.id,
      packageId: bdayPkg.id,
      decorationId: chosenDeco ? chosenDeco.id : null,
      customerName: "Camila Insfrán",
      customerPhone: "0981 777 888",
      customerEmail: "camila.insfran@test.com",
      birthdayPersonName: "Camila Insfrán (25 Años)",
      birthdayPhotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600",
      pricingType: bdayPkg.pricingType,
      totalAmountCents: bdayPkg.priceCents + (chosenDeco?.extraPriceCents || 0),
      creditAmountCents: bdayPkg.creditAmountCents || 0,
      creditRemainingCents: bdayPkg.creditAmountCents || 0,
      paymentMethod: "TRANSFER",
      paymentStatus: "PENDING_REVIEW",
      paymentProofUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600",
      reservationDate: new Date(),
      inviteToken,
      maxGuests: bdayPkg.maxGuests,
      status: "CONFIRMED",
    },
    include: {
      package: true,
      decoration: true,
      table: true,
    },
  });

  console.log(`✓ Reserva creada con ID: ${reservation.id}`);
  console.log(`  Titular: ${reservation.customerName}`);
  console.log(`  Homenajeado: ${reservation.birthdayPersonName}`);
  console.log(`  Decoración Elegida: ${reservation.decoration?.name}`);
  console.log(`  Foto Decoración: ${reservation.decoration?.imageUrl.substring(0, 50)}...`);
  console.log(`  Comprobante Transferencia: ${reservation.paymentProofUrl?.substring(0, 50)}...`);
  console.log(`  Estado de Pago: ${reservation.paymentStatus}`);

  // 4. Crear pase individual de amigo que reclama entrada por el link de WhatsApp
  console.log("\n--- Simulando Pase VIP para Amigo ---");
  const guestPass = await prisma.reservationGuest.create({
    data: {
      reservationId: reservation.id,
      guestName: "Rodrigo Benítez",
      guestPhone: "0982 111 222",
      qrToken: `gst_test_${Date.now().toString(36)}`,
    },
  });

  console.log(`✓ Pase VIP emitido para: ${guestPass.guestName}`);
  console.log(`  QR Token de Acceso: ${guestPass.qrToken}`);

  // 5. Simular Aprobación de Pago por el Administrador
  console.log("\n--- Simulando Aprobación de Pago en el Dashboard ---");
  const updatedReservation = await prisma.tableReservation.update({
    where: { id: reservation.id },
    data: {
      paymentStatus: "APPROVED",
      verifiedAt: new Date(),
    },
  });

  console.log(`✓ Estado actualizado a: ${updatedReservation.paymentStatus} (Aprobado y Verificado)`);

  // Limpieza del registro de test
  await prisma.reservationGuest.deleteMany({ where: { reservationId: reservation.id } });
  await prisma.tableReservation.delete({ where: { id: reservation.id } });
  console.log("✓ Limpieza de datos de prueba completada.");

  console.log("\n=== PRUEBA DE RESERVAS Y DECORACIONES CON FOTOS EXITOSA (100%) ===");
}

testReservationsFlow()
  .catch((e) => console.error("Error en test:", e))
  .finally(() => prisma.$disconnect());
