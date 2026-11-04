const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const QRCode = require('qrcode');

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed de datos de demostración para Acreditaciones...");

  // 1. Encontrar o crear Tenant
  let tenant = await prisma.tenant.findFirst({
    include: { venues: true }
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "Retro Bar & Eventos Pro",
        slug: "retro-bar",
        venues: {
          create: {
            name: "Sede Principal Centro",
            slug: "sede-centro",
            active: true
          }
        }
      },
      include: { venues: true }
    });
  }

  let venueId = tenant.venues[0]?.id;
  if (!venueId) {
    const venue = await prisma.venue.create({
      data: {
        tenantId: tenant.id,
        name: "Sede Central de Eventos",
        slug: "sede-central-eventos",
        active: true
      }
    });
    venueId = venue.id;
  }

  // 2. Crear Evento Demo
  const eventCode = "TECH-2026";
  let event = await prisma.event.findUnique({
    where: { code: eventCode }
  });

  if (!event) {
    event = await prisma.event.create({
      data: {
        tenantId: tenant.id,
        venueId,
        name: "Congreso Internacional de Tecnología & IA Vidjeis 2026",
        code: eventCode,
        eventType: "CONGRESO",
        organizerName: "Vidjeis Producciones SaaS",
        responsibleCompany: "Vidjeis Technologies S.A.",
        companyRuc: "80123456-7",
        locationName: "Centro de Convenciones Mariscal",
        address: "J. Eulogio Estigarribia 5086, Asunción",
        startsAt: new Date(Date.now() + 86400000), // Mañana
        endsAt: new Date(Date.now() + 86400000 * 3), // 3 días
        timeSchedule: "08:00 - 19:30",
        maxCapacity: 1200,
        daysCount: 3,
        status: "ACTIVE",
        description: "El mayor encuentro regional sobre Inteligencia Artificial, SaaS, control de accesos y entretenimiento."
      }
    });
    console.log(`Evento creado: ${event.name} (${event.code})`);
  } else {
    console.log(`Evento existente encontrado: ${event.name}`);
  }

  // 3. Crear Categorías
  const categoriesData = [
    { name: "VIP All Access", code: "VIP", colorHex: "#8B5CF6", description: "Acceso ilimitado a todas las salas y cóctel", orderIndex: 0 },
    { name: "Conferencista / Speaker", code: "SPEAKER", colorHex: "#F59E0B", description: "Acceso a escenario, salas y backstage", orderIndex: 1 },
    { name: "Prensa & Medios", code: "PRENSA", colorHex: "#EC4899", description: "Acceso a sala de prensa y sesiones plenarias", orderIndex: 2 },
    { name: "Participante General", code: "GENERAL", colorHex: "#3B82F6", description: "Acceso a conferencias y stands", orderIndex: 3 },
    { name: "Staff & Operaciones", code: "STAFF", colorHex: "#10B981", description: "Equipo organizador y soporte técnico", orderIndex: 4 },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const existing = await prisma.accreditationType.findUnique({
      where: {
        eventId_code: {
          eventId: event.id,
          code: cat.code
        }
      }
    });

    if (!existing) {
      const created = await prisma.accreditationType.create({
        data: {
          tenantId: tenant.id,
          eventId: event.id,
          name: cat.name,
          code: cat.code,
          colorHex: cat.colorHex,
          description: cat.description,
          orderIndex: cat.orderIndex,
          allowReentry: true,
        }
      });
      categories.push(created);
    } else {
      categories.push(existing);
    }
  }

  // 4. Crear Puertas
  const doorsData = [
    { name: "Entrada Principal Peatonal", code: "GATE_MAIN", sectorType: "MAIN", locationDetails: "Hall de Acceso Norte" },
    { name: "Acceso Exclusivo VIP & Speakers", code: "GATE_VIP", sectorType: "VIP", locationDetails: "Ascensor Privado Piso 2" },
    { name: "Sala de Prensa & Backstage", code: "GATE_BACKSTAGE", sectorType: "PRESS", locationDetails: "Túnel Este" },
  ];

  const doors = [];
  for (const d of doorsData) {
    let door = await prisma.accessPoint.findUnique({
      where: {
        eventId_code: {
          eventId: event.id,
          code: d.code
        }
      }
    });

    if (!door) {
      door = await prisma.accessPoint.create({
        data: {
          tenantId: tenant.id,
          eventId: event.id,
          name: d.name,
          code: d.code,
          sectorType: d.sectorType,
          locationDetails: d.locationDetails,
          active: true
        }
      });
    }
    doors.push(door);
  }

  // Configurar reglas de acceso por puerta
  for (const door of doors) {
    for (const cat of categories) {
      let allowed = true;
      if (door.code === "GATE_VIP" && (cat.code === "GENERAL" || cat.code === "PRENSA")) {
        allowed = false;
      }
      if (door.code === "GATE_BACKSTAGE" && cat.code === "GENERAL") {
        allowed = false;
      }

      await prisma.accessPointRule.upsert({
        where: {
          accessPointId_accreditationTypeId: {
            accessPointId: door.id,
            accreditationTypeId: cat.id
          }
        },
        create: {
          accessPointId: door.id,
          accreditationTypeId: cat.id,
          isAllowed: allowed
        },
        update: {
          isAllowed: allowed
        }
      });
    }
  }

  // 5. Crear Delegaciones
  const orgsData = [
    { name: "Google Developer Group Asunción", taxId: "80099111-2", contactName: "Ing. Lucas Benítez", email: "gdg@asuncion.dev" },
    { name: "Cámara Paraguaya de Empresas de Software", taxId: "80055444-1", contactName: "Lic. Andrea Rojas", email: "contacto@cisoft.org.py" },
    { name: "Banco Sudameris Py", taxId: "80011222-3", contactName: "Carlos Gómez", email: "eventos@sudameris.com.py" },
  ];

  const orgs = [];
  for (const o of orgsData) {
    let org = await prisma.eventOrganization.findFirst({
      where: { eventId: event.id, name: o.name }
    });
    if (!org) {
      org = await prisma.eventOrganization.create({
        data: {
          tenantId: tenant.id,
          eventId: event.id,
          name: o.name,
          rucOrTaxId: o.taxId,
          contactName: o.contactName,
          email: o.email
        }
      });
    }
    orgs.push(org);
  }

  // 6. Crear Participantes Demo con Códigos QR Criptográficos y Firmas HMAC
  const participantsData = [
    { first: "Mariana", last: "Giménez", doc: "3892110", email: "mariana.gimenez@gdg.dev", company: "Google Developers", job: "Keynote Speaker", catCode: "SPEAKER", orgIdx: 0, guest: true, checkIn: true },
    { first: "Esteban", last: "Valenzuela", doc: "4125890", email: "esteban@cisoft.org.py", company: "CISOFT", job: "Presidente Ejecutivo", catCode: "VIP", orgIdx: 1, guest: true, checkIn: true },
    { first: "Rodrigo", last: "Cantero", doc: "5234120", email: "rcantero@sudameris.com.py", company: "Banco Sudameris", job: "Gerente de Innovación", catCode: "VIP", orgIdx: 2, guest: false, checkIn: true },
    { first: "Sofía", last: "Almirón", doc: "4890231", email: "sofia.almiron@abc.com.py", company: "ABC Color", job: "Periodista de Tecnología", catCode: "PRENSA", orgIdx: null, guest: false, checkIn: true },
    { first: "Alejandro", last: "Bogado", doc: "3456789", email: "ale.bogado@vidjeis.com", company: "Vidjeis Pro", job: "Coordinador de Acreditación", catCode: "STAFF", orgIdx: null, guest: false, checkIn: true },
    { first: "Natalia", last: "Duarte", doc: "5678901", email: "natalia.duarte@empresa.com", company: "DevStudio S.A.", job: "Senior Fullstack Engineer", catCode: "GENERAL", orgIdx: null, guest: false, checkIn: false },
    { first: "Federico", last: "Mendoza", doc: "4789123", email: "fmendoza@cloudpy.io", company: "CloudPy Solutions", job: "DevOps Architect", catCode: "GENERAL", orgIdx: null, guest: false, checkIn: false },
    { first: "Camila", last: "Ortiz", doc: "6123456", email: "camila.ortiz@fintech.py", company: "Pagos Móviles Py", job: "Product Manager", catCode: "GENERAL", orgIdx: null, guest: false, checkIn: false },
  ];

  let seq = 1;
  for (const p of participantsData) {
    let participant = await prisma.eventParticipant.findFirst({
      where: { eventId: event.id, documentNumber: p.doc }
    });

    const catObj = categories.find(c => c.code === p.catCode) || categories[0];
    const orgObj = p.orgIdx !== null ? orgs[p.orgIdx] : null;

    if (!participant) {
      participant = await prisma.eventParticipant.create({
        data: {
          tenantId: tenant.id,
          eventId: event.id,
          firstName: p.first,
          lastName: p.last,
          documentNumber: p.doc,
          documentType: "CI",
          email: p.email,
          company: p.company,
          jobTitle: p.job,
          accreditationTypeId: catObj.id,
          organizationId: orgObj?.id || null,
          isSpecialGuest: p.guest,
          country: "Paraguay"
        }
      });

      // Crear código secuencial
      const codeNumber = `${event.code}-${catObj.code}-${String(seq).padStart(4, "0")}`;
      seq++;

      // Token y firma HMAC
      const randomPart = crypto.randomBytes(16).toString("hex");
      const qrToken = `vj_${event.id.slice(-4)}_${randomPart}`;
      const hmac = crypto.createHmac("sha256", process.env.JWT_SECRET || "vidjeis-secret-key-prod-2026-very-secure");
      hmac.update(`${qrToken}:${event.id}:${participant.id}`);
      const qrSignature = hmac.digest("hex").slice(0, 32);

      // Generar DataURL de QR
      const qrCodeUrl = await QRCode.toDataURL(qrToken, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 400
      });

      const accreditation = await prisma.eventAccreditation.create({
        data: {
          tenantId: tenant.id,
          eventId: event.id,
          participantId: participant.id,
          accreditationTypeId: catObj.id,
          codeNumber,
          qrToken,
          qrSignature,
          qrCodeUrl,
          status: p.checkIn ? "CHECKED_IN" : "ACCREDITED",
          totalCheckIns: p.checkIn ? 1 : 0,
          firstCheckInAt: p.checkIn ? new Date(Date.now() - 3600000 * Math.floor(Math.random() * 4 + 1)) : null,
          lastCheckInAt: p.checkIn ? new Date() : null,
        }
      });

      // Si tiene checkIn simulado, registrar en CheckInRecord
      if (p.checkIn) {
        const selectedDoor = p.catCode === "VIP" ? doors[1] : doors[0];
        await prisma.checkInRecord.create({
          data: {
            tenantId: tenant.id,
            eventId: event.id,
            accreditationId: accreditation.id,
            participantId: participant.id,
            accessPointId: selectedDoor.id,
            direction: "IN",
            status: "APPROVED",
            operatorName: "Operador Principal (Puerta)",
            scannedAt: accreditation.firstCheckInAt || new Date()
          }
        });
      }
    }
  }

  console.log("¡Seed de demostración completado exitosamente!");
  console.log(`Evento activo: ${event.name} (ID: ${event.id})`);
}

main()
  .catch(err => {
    console.error("Error en seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
