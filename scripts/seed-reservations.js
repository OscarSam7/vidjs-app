const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("--- Seeding Reservation Packages & Venue Bank Settings ---");

  const venue = await prisma.venue.findFirst({
    include: { tenant: true },
  });

  if (!venue) {
    console.error("No venue found in database. Exiting.");
    return;
  }

  console.log(`Setting up for venue: ${venue.name} (Tenant: ${venue.tenant.name})`);

  // 1. Configurar datos bancarios y WhatsApp en el Venue
  await prisma.venue.update({
    where: { id: venue.id },
    data: {
      bankName: "Banco Itaú Paraguay",
      bankAccount: "948210345",
      bankHolder: `${venue.name} S.A.`,
      bankTaxId: "80094821-3",
      bankAlias: "reservas.vidjeis",
      whatsappNumber: "595981123456",
    },
  });

  console.log("✓ Datos bancarios y WhatsApp configurados en el Venue");

  // 2. Limpiar paquetes de prueba anteriores si existen
  await prisma.reservationPackage.deleteMany({
    where: { tenantId: venue.tenantId },
  });

  // 3. Crear Paquete 1: Cumpleaños VIP Gold (Combo Cerrado con 3 opciones de decoración)
  const pkg1 = await prisma.reservationPackage.create({
    data: {
      tenantId: venue.tenantId,
      venueId: venue.id,
      name: "Combo Cumpleaños VIP Black Label",
      description: "La experiencia definitiva para festejar tu noche: mesa VIP reservada, botella prémium, torta de cortesía y tu foto proyectada en la pantalla gigante con saludo del DJ.",
      imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop",
      itemsIncluded: JSON.stringify([
        "1 Botella Johnnie Walker Black Label (750ml)",
        "4 Bebidas energizantes Red Bull",
        "Hielo prémium y copas de cristal",
        "Torta o Champagne de cortesía",
        "8 Pulseras VIP con acceso prioritario sin fila",
        "Foto y saludo especial en pantalla gigante de TV",
      ]),
      pricingType: "FIXED_COMBO",
      priceCents: 850000,
      creditAmountCents: 0,
      maxGuests: 8,
      isBirthdayPackage: true,
      allowScreenShoutout: true,
      colorHex: "#EC4899",
      active: true,
      orderIndex: 0,
      decorations: {
        create: [
          {
            tenantId: venue.tenantId,
            name: "Decoración Neón Glow con Luces Led",
            description: "Luces fluorescentes, globos neón y carteles luminosos",
            imageUrl: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop",
            extraPriceCents: 0,
            orderIndex: 0,
          },
          {
            tenantId: venue.tenantId,
            name: "Elegance Dorado & Negro (Champagne Vibes)",
            description: "Arcos de globos cromados dorados y negros con detalles prémium",
            imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop",
            extraPriceCents: 0,
            orderIndex: 1,
          },
          {
            tenantId: venue.tenantId,
            name: "Glamour Rosa & Glitter Deluxe",
            description: "Cortinas brillantes, globos metalizados rosa gold y cotillón temático",
            imageUrl: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&auto=format&fit=crop",
            extraPriceCents: 100000,
            orderIndex: 2,
          },
        ],
      },
    },
  });

  console.log(`✓ Creado paquete: ${pkg1.name}`);

  // 4. Crear Paquete 2: Camarote Ultra VIP Pista (100% Consumo Acreditable)
  const pkg2 = await prisma.reservationPackage.create({
    data: {
      tenantId: venue.tenantId,
      venueId: venue.id,
      name: "Camarote Ultra VIP Pista (Consumo 100% Libre)",
      description: "Espacio privado elevado frente al escenario del DJ. El 100% del valor pagado se acredita como saldo a favor en tu mesa para pedir cualquier trago de la carta durante toda la noche.",
      imageUrl: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&auto=format&fit=crop",
      itemsIncluded: JSON.stringify([
        "Camarote privado para 12 personas",
        "12 Pulseras Ultra VIP",
        "Mozo exclusivo para la mesa",
        "100% del pago acreditable a consumición libre en barra",
      ]),
      pricingType: "CREDIT_CONSUMPTION",
      priceCents: 1500000,
      creditAmountCents: 1500000,
      maxGuests: 12,
      isBirthdayPackage: false,
      allowScreenShoutout: true,
      colorHex: "#10B981",
      active: true,
      orderIndex: 1,
      decorations: {
        create: [
          {
            tenantId: venue.tenantId,
            name: "Estilo VIP Club Minimalista",
            imageUrl: "https://images.unsplash.com/photo-1578736641330-3155e606cd40?w=600&auto=format&fit=crop",
            extraPriceCents: 0,
            orderIndex: 0,
          },
        ],
      },
    },
  });

  console.log(`✓ Creado paquete: ${pkg2.name}`);

  // 5. Crear Paquete 3: Mesa VIP Terraza (Reserva Limpia / Alquiler Puro)
  const pkg3 = await prisma.reservationPackage.create({
    data: {
      tenantId: venue.tenantId,
      venueId: venue.id,
      name: "Mesa VIP Terraza Lounge",
      description: "Reserva exclusiva de mesa en la terraza al aire libre. Acceso para 6 personas sin colas.",
      imageUrl: "https://images.unsplash.com/photo-1570872626485-d8ffea69f463?w=800&auto=format&fit=crop",
      itemsIncluded: JSON.stringify([
        "Mesa en sector Terraza Lounge",
        "6 Entradas VIP incluidas",
        "Atención de mozo en mesa",
      ]),
      pricingType: "CLEAN_FEE",
      priceCents: 350000,
      creditAmountCents: 0,
      maxGuests: 6,
      isBirthdayPackage: false,
      allowScreenShoutout: false,
      colorHex: "#3B82F6",
      active: true,
      orderIndex: 2,
    },
  });

  console.log(`✓ Creado paquete: ${pkg3.name}`);
  console.log("--- Seeding completado con éxito ---");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
