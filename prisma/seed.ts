import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando siembra de base de datos completa (Seed Fase 2)...");

  // 1. Limpiar base de datos previa
  await prisma.auditLog.deleteMany({});
  await prisma.queueEntry.deleteMany({});
  await prisma.songRequest.deleteMany({});
  await prisma.guestSession.deleteMany({});
  await prisma.song.deleteMany({});
  await prisma.artist.deleteMany({});
  await prisma.table.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.plan.deleteMany({});

  // 2. Planes Comerciales y Personales
  const personalPlan = await prisma.plan.create({
    data: {
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
        "Recepción de pedidos musicales en vivo de amigos",
        "Muro interactivo de fotos con marcos temáticos",
        "Juegos en TV: Aplausómetro y Ruleta de Sorteos",
      ]),
    },
  });

  const starterPlan = await prisma.plan.create({
    data: {
      name: "Plan Starter",
      code: "STARTER",
      priceCents: 1900,
      currency: "USD",
      interval: "MONTHLY",
      maxVenues: 1,
      maxEventsPerMonth: 10,
      maxActiveTables: 15,
      features: JSON.stringify(["1 Local físico", "Hasta 15 mesas QR", "Cola básica de canciones"]),
    },
  });

  const proPlan = await prisma.plan.create({
    data: {
      name: "Plan Pro Entertainment",
      code: "PRO",
      priceCents: 4900,
      currency: "USD",
      interval: "MONTHLY",
      maxVenues: 3,
      maxEventsPerMonth: 50,
      maxActiveTables: 60,
      features: JSON.stringify([
        "Hasta 3 Locales físicos",
        "Hasta 60 mesas QR simultáneas",
        "Cola inteligente con rotación de mesas",
        "Panel de DJ en tiempo real con Doble Deck",
        "Pantalla pública interactiva",
        "Analíticas en vivo y exportación",
      ]),
    },
  });

  // 3. Crear Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "Retro Bar & Karaoke Lounge",
      slug: "retro-bar",
      status: "ACTIVE",
      logoUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=150&auto=format&fit=crop&q=80",
      settings: JSON.stringify({
        primaryColor: "#a855f7",
        allowGuestTips: true,
        maxQueuePerTable: 2,
        requirePinForDj: false,
      }),
    },
  });

  // 4. Suscripción Activa
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);

  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      planId: proPlan.id,
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: nextMonth,
      cancelAtPeriodEnd: false,
    },
  });

  // 5. Usuarios Administrativos
  const passwordHash = await bcrypt.hash("Password123!", 10);

  await prisma.user.create({
    data: {
      email: "admin@vidjs.com",
      passwordHash,
      name: "Super Administrador",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      tenantId: null,
    },
  });

  const ownerUser = await prisma.user.create({
    data: {
      email: "owner@retrobar.com",
      passwordHash,
      name: "Carlos Méndez (Owner)",
      phone: "+54 11 5566-7788",
      role: "OWNER",
      status: "ACTIVE",
      tenantId: tenant.id,
    },
  });

  await prisma.user.create({
    data: {
      email: "manager@retrobar.com",
      passwordHash,
      name: "Valeria Gómez (Manager)",
      phone: "+54 11 4433-2211",
      role: "MANAGER",
      status: "ACTIVE",
      tenantId: tenant.id,
    },
  });

  await prisma.user.create({
    data: {
      email: "dj@retrobar.com",
      passwordHash,
      name: "DJ Alex Beat",
      phone: "+54 11 9988-7766",
      role: "DJ",
      status: "ACTIVE",
      tenantId: tenant.id,
    },
  });

  // 6. Locales (Venues)
  const venueCentro = await prisma.venue.create({
    data: {
      tenantId: tenant.id,
      name: "Sede Centro",
      slug: "sede-centro",
      address: "Av. Corrientes 1450, CABA",
      phone: "+54 11 4455-6677",
      timezone: "America/Argentina/Buenos_Aires",
      active: true,
    },
  });

  const venueTerraza = await prisma.venue.create({
    data: {
      tenantId: tenant.id,
      name: "Sede Terraza VIP",
      slug: "sede-terraza",
      address: "Av. Costanera Norte 800, CABA",
      phone: "+54 11 4455-8899",
      timezone: "America/Argentina/Buenos_Aires",
      active: true,
    },
  });

  // 7. Eventos
  const now = new Date();
  const tonightStarts = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0);
  const tonightEnds = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 5, 0, 0);

  const eventKaraoke = await prisma.event.create({
    data: {
      tenantId: tenant.id,
      venueId: venueCentro.id,
      name: "Viernes de Karaoke Pop & Clásicos",
      description: "Pide tus canciones favoritas desde la mesa. Micrófono abierto y pantalla gigante.",
      code: "RETRO-POP",
      status: "ACTIVE",
      startsAt: tonightStarts,
      endsAt: tonightEnds,
      pin: "1234",
      settings: JSON.stringify({
        zone: "KARAOKE",
        maxActivePerTable: 1,
        queuePaused: false,
        rotationMode: "ROUND_ROBIN",
        avgSongDurationMinutes: 4,
      }),
    },
  });

  const tomorrowStarts = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 0, 0);
  await prisma.event.create({
    data: {
      tenantId: tenant.id,
      venueId: venueTerraza.id,
      name: "Sábado DJ Live Sessions & Electro",
      description: "Sesión exclusiva de DJs invitados en la terraza con vista al río.",
      code: "TERRAZA-HOUSE",
      status: "ACTIVE",
      startsAt: tomorrowStarts,
      pin: "5678",
      settings: JSON.stringify({
        zone: "DJ",
        maxActivePerTable: 2,
        queuePaused: false,
        rotationMode: "FIFO",
        avgSongDurationMinutes: 3,
      }),
    },
  });

  // 8. Mesas con Zonas diferenciadas (Pista DJ vs Salón Karaoke)
  const tablesCentroData = [
    { number: 1, label: "Mesa 1 (Pista Central)", token: "qr_centro_m1", zone: "DJ" },
    { number: 2, label: "Mesa 2 (Pista)", token: "qr_centro_m2", zone: "DJ" },
    { number: 3, label: "Mesa 3 (Barra Cocktail)", token: "qr_centro_m3", zone: "DJ" },
    { number: 4, label: "Mesa 4 (Karaoke Escenario)", token: "qr_centro_m4", zone: "KARAOKE" },
    { number: 5, label: "Mesa 5 (Box Karaoke VIP)", token: "qr_centro_m5", zone: "KARAOKE" },
    { number: 6, label: "Mesa 6 (Box Karaoke Lounge)", token: "qr_centro_m6", zone: "KARAOKE" },
  ];

  for (const t of tablesCentroData) {
    await prisma.table.create({
      data: {
        tenantId: tenant.id,
        venueId: venueCentro.id,
        number: t.number,
        label: t.label,
        zone: t.zone,
        qrToken: t.token,
        capacity: 4,
        active: true,
      },
    });
  }

  const tablesTerrazaData = [
    { number: 1, label: "Mesa Terraza 1", token: "qr_terraza_m1", zone: "DJ" },
    { number: 2, label: "Mesa Terraza 2", token: "qr_terraza_m2", zone: "DJ" },
    { number: 3, label: "Mesa Terraza 3", token: "qr_terraza_m3", zone: "DJ" },
    { number: 4, label: "Barra Lounge", token: "qr_terraza_m4", zone: "DJ" },
    { number: 5, label: "Box VIP Mirador", token: "qr_terraza_m5", zone: "DJ" },
  ];

  for (const t of tablesTerrazaData) {
    await prisma.table.create({
      data: {
        tenantId: tenant.id,
        venueId: venueTerraza.id,
        number: t.number,
        label: t.label,
        zone: t.zone,
        qrToken: t.token,
        capacity: 6,
        active: true,
      },
    });
  }

  // 9. Catálogo Musical Extenso (Artistas y Canciones)
  const catalog = [
    {
      artist: "Soda Stereo",
      genre: "Rock en Español",
      songs: [
        { title: "De Música Ligera", duration: 215, bpm: 126, key: "Bm" },
        { title: "Persiana Americana", duration: 290, bpm: 132, key: "G" },
        { title: "Cuando Pase el Temblor", duration: 232, bpm: 118, key: "A" },
        { title: "Trátame Suavemente", duration: 202, bpm: 92, key: "E" },
      ],
    },
    {
      artist: "Queen",
      genre: "Classic Rock / Karaoke",
      songs: [
        { title: "Bohemian Rhapsody", duration: 354, bpm: 72, key: "Bb" },
        { title: "Don't Stop Me Now", duration: 209, bpm: 156, key: "F" },
        { title: "I Want to Break Free", duration: 260, bpm: 110, key: "E" },
        { title: "We Are The Champions", duration: 180, bpm: 64, key: "Cm" },
      ],
    },
    {
      artist: "Luis Miguel",
      genre: "Pop Latino / Balada",
      songs: [
        { title: "Ahora Te Puedes Marchar", duration: 195, bpm: 130, key: "C" },
        { title: "La Incondicional", duration: 258, bpm: 82, key: "G" },
        { title: "Culpable o No", duration: 235, bpm: 74, key: "D" },
        { title: "Suave", duration: 284, bpm: 108, key: "Am" },
      ],
    },
    {
      artist: "Los Enanitos Verdes",
      genre: "Rock en Español",
      songs: [
        { title: "Lamento Boliviano", duration: 224, bpm: 118, key: "Em" },
        { title: "Tu Cárcel", duration: 220, bpm: 122, key: "C" },
        { title: "La Muralla Verde", duration: 162, bpm: 145, key: "A" },
      ],
    },
    {
      artist: "Daft Punk",
      genre: "Electrónica / House",
      songs: [
        { title: "One More Time", duration: 320, bpm: 123, key: "D" },
        { title: "Get Lucky (feat. Pharrell Williams)", duration: 248, bpm: 116, key: "F#m" },
        { title: "Around The World", duration: 238, bpm: 121, key: "Em" },
      ],
    },
    {
      artist: "Los Ángeles Azules",
      genre: "Cumbia",
      songs: [
        { title: "17 Años", duration: 225, bpm: 95, key: "G" },
        { title: "Cómo Te Voy a Olvidar", duration: 270, bpm: 96, key: "D" },
        { title: "Nunca Es Suficiente (con Natalia Lafourcade)", duration: 236, bpm: 94, key: "A" },
      ],
    },
    {
      artist: "ABBA",
      genre: "Pop / Disco",
      songs: [
        { title: "Dancing Queen", duration: 231, bpm: 101, key: "A" },
        { title: "Gimme! Gimme! Gimme!", duration: 288, bpm: 120, key: "Dm" },
        { title: "Mamma Mia", duration: 212, bpm: 138, key: "D" },
      ],
    },
    {
      artist: "Bad Bunny",
      genre: "Reggaeton / Urbano",
      songs: [
        { title: "Tití Me Preguntó", duration: 243, bpm: 111, key: "F" },
        { title: "Me Porto Bonito", duration: 178, bpm: 92, key: "Am" },
        { title: "Callaíta", duration: 250, bpm: 176, key: "Ab" },
      ],
    },
    {
      artist: "Shakira",
      genre: "Pop Latino",
      songs: [
        { title: "Antología", duration: 254, bpm: 84, key: "A" },
        { title: "Hips Don't Lie", duration: 218, bpm: 100, key: "Bb" },
        { title: "Inevitable", duration: 193, bpm: 105, key: "D" },
      ],
    },
    {
      artist: "David Guetta",
      genre: "Electrónica / Dance",
      songs: [
        { title: "Titanium (feat. Sia)", duration: 245, bpm: 126, key: "Eb" },
        { title: "Memories (feat. Kid Cudi)", duration: 210, bpm: 130, key: "Am" },
      ],
    },
  ];

  for (const item of catalog) {
    const artist = await prisma.artist.create({
      data: {
        name: item.artist,
      },
    });

    for (const song of item.songs) {
      await prisma.song.create({
        data: {
          artistId: artist.id,
          title: song.title,
          durationSeconds: song.duration,
          genre: item.genre,
          bpm: song.bpm,
          key: song.key,
        },
      });
    }
  }

  // 10. Auditoría Inicial
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      userId: ownerUser.id,
      action: "CATALOG_SEEDED",
      resource: "CATALOG",
      metadata: JSON.stringify({ totalArtists: catalog.length }),
    },
  });

  console.log("✅ Seed Fase 2 completado exitosamente!");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
