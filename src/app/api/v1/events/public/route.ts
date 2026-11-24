import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export interface PublicEventItem {
  id: string;
  name: string;
  code: string;
  description: string;
  eventType: string;
  organizerName: string;
  locationName: string;
  address: string;
  city: string;
  startsAt: string;
  endsAt?: string | null;
  timeSchedule?: string;
  bannerUrl?: string;
  logoUrl?: string;
  maxCapacity?: number;
  rating: number;
  reviewCount: number;
  interestedCount: number;
  friendsGoingCount: number;
  likesCount: number;
  tiers: {
    id: string;
    name: string;
    code: string;
    price: number;
    formattedPrice: string;
    available: number;
    colorHex: string;
    description?: string;
  }[];
  faq: {
    question: string;
    answer: string;
  }[];
}

const DEFAULT_SAMPLE_EVENTS: PublicEventItem[] = [
  {
    id: "evt_tardezinha_crocco",
    name: "TARDEZINHA DA CROCCO",
    code: "TARDEZINHA-CROCCO",
    description:
      "La propuesta combina una tarde al aire libre con música en vivo de pagode, almuerzo tradicional de feijoada y barra libre de bebidas (open bar) de 12:00h. a 14:00 h. (Caipirinha y Cerveza). Fecha: 14 de noviembre. Horario: A partir de las 12:00 h. Lugar: Rumba Stage. Atracciones principales: Open bar, show de pagode y feijoada.",
    eventType: "GASTRONOMIA",
    organizerName: "Rumba Stage & Atlética Medicina Crocodilo",
    locationName: "Rumba Stage",
    address: "Mcal. José F. Estigarribia, Cd. del Este 100151",
    city: "Ciudad del Este",
    startsAt: "2026-11-14T12:00:00Z",
    endsAt: "2026-11-14T22:00:00Z",
    timeSchedule: "A partir de las 12:00 hs",
    bannerUrl:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80",
    maxCapacity: 400,
    rating: 4.5,
    reviewCount: 67,
    interestedCount: 3300,
    friendsGoingCount: 7,
    likesCount: 112,
    tiers: [
      {
        id: "tier_combo_com_feijoada",
        name: "COMBO COM FEIJOADA",
        code: "COM-FEIJOADA",
        price: 35000,
        formattedPrice: "Gs. 35.000",
        available: 189,
        colorHex: "#10B981",
        description: "Acceso completo + Almuerzo tradicional de feijoada libre + Open Bar 12:00 a 14:00 hs",
      },
      {
        id: "tier_combo_sem_feijoada",
        name: "COMBO SEM FEIJOADA",
        code: "SEM-FEIJOADA",
        price: 25000,
        formattedPrice: "Gs. 25.000",
        available: 199,
        colorHex: "#3B82F6",
        description: "Acceso a la tarde de pagode + Open Bar (Caipirinha y Cerveza de 12:00 a 14:00 hs)",
      },
    ],
    faq: [
      {
        question: "¿Cómo recibo mis entradas?",
        answer:
          "Tus entradas se generan al instante con un código QR criptográfico único. Puedes descargarlas en PDF, verlas directamente en la app CYNKO en tu celular o recibirlas por WhatsApp.",
      },
      {
        question: "¿Qué métodos de pago aceptan?",
        answer:
          "Aceptamos CYNKO Pay (billetera digital), Tarjetas de Débito/Crédito (Visa, Mastercard), Transferencias Bancarias (SIPAP) y Pix.",
      },
      {
        question: "¿Puedo reembolsar o transferir mi entrada?",
        answer:
          "Puedes transferir tu entrada a otra persona con su número de documento (CI/DNI) hasta 24 horas antes del inicio del evento desde la opción 'Transferir' en tu billetera CYNKO.",
      },
      {
        question: "¿Hay descuentos para grupos o menores?",
        answer:
          "Los menores de 12 años acompañados de un tutor ingresan de forma gratuita. Para mesas corporativas y delegaciones de más de 10 personas consultar con RRPP.",
      },
      {
        question: "¿Qué pasa si se cancela el evento?",
        answer:
          "En caso de reprogramación tus entradas mantienen su validez. Si se cancela definitivamente, CYNKO reembolsa el 100% del valor pagado de forma automática.",
      },
    ],
  },
  {
    id: "evt_midnight_mask",
    name: "MIDNIGHT MASK HALLOWEEN",
    code: "MIDNIGHT-MASK",
    description:
      "La fiesta de disfraces y máscaras más exclusiva de la temporada. 3 pistas simultáneas: Tech House, Reggaetón Old School y Sector VIP Open Bar con DJs internacionales invitados.",
    eventType: "FIESTA",
    organizerName: "Rumba Stage Events",
    locationName: "Rumba Stage - Terraza VIP",
    address: "Mcal. José F. Estigarribia, Cd. del Este 100151",
    city: "Ciudad del Este",
    startsAt: "2026-10-31T22:00:00Z",
    endsAt: "2026-11-01T06:00:00Z",
    timeSchedule: "Desde las 22:00 hs hasta el amanecer",
    bannerUrl:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80",
    maxCapacity: 1355,
    rating: 4.8,
    reviewCount: 142,
    interestedCount: 5400,
    friendsGoingCount: 19,
    likesCount: 384,
    tiers: [
      {
        id: "tier_acc_general",
        name: "ACCESO GENERAL",
        code: "GENERAL",
        price: 40000,
        formattedPrice: "Gs. 40.000",
        available: 373,
        colorHex: "#8B5CF6",
        description: "Acceso a pistas principales y patio gastronómico",
      },
      {
        id: "tier_camarote_vip",
        name: "CAMAROTE VIP (CON 8 ENTRADAS)",
        code: "CAMAROTE-8",
        price: 800000,
        formattedPrice: "Gs. 800.000",
        available: 5,
        colorHex: "#F59E0B",
        description: "Espacio privado exclusivo + 8 pulseras VIP + 1 botella de whisky premium y servicio de mozo",
      },
    ],
    faq: [
      {
        question: "¿Es obligatorio el uso de máscara o disfraz?",
        answer: "El uso de antifaz o disfraz es altamente recomendado y otorga un cóctel de bienvenida gratuito en puerta.",
      },
      {
        question: "¿A qué hora se habilita el ingreso VIP?",
        answer: "El ingreso VIP y camarotes está habilitado a partir de las 22:00 hs por la Puerta 1 Terraza.",
      },
    ],
  },
  {
    id: "evt_la_casa_del_funk",
    name: "LA CASA DEL FUNK - OPEN BAR GUMMY",
    code: "LA-CASA-DEL-FUNK",
    description:
      "1 Hora de Open Bar de Gummy Vodka de cortesía para las primeras 200 personas. El mejor funk brasilero y latino con DJs invitados en vivo.",
    eventType: "FIESTA",
    organizerName: "Rumba Stage",
    locationName: "Rumba Stage Sala Central",
    address: "Mcal. José F. Estigarribia, Cd. del Este 100151",
    city: "Ciudad del Este",
    startsAt: "2026-08-22T23:00:00Z",
    endsAt: "2026-08-23T06:00:00Z",
    timeSchedule: "23:00 a 06:00 hs",
    bannerUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80",
    maxCapacity: 520,
    rating: 4.6,
    reviewCount: 48,
    interestedCount: 2100,
    friendsGoingCount: 11,
    likesCount: 165,
    tiers: [
      {
        id: "tier_lote_01",
        name: "LOTE 01 ANTICIPADAS",
        code: "LOTE-01",
        price: 30000,
        formattedPrice: "Gs. 30.000",
        available: 300,
        colorHex: "#EC4899",
        description: "Ingreso garantizado toda la noche + 1 consumición",
      },
      {
        id: "tier_camarote",
        name: "CAMAROTE",
        code: "CAMAROTE",
        price: 450000,
        formattedPrice: "Gs. 450.000",
        available: 20,
        colorHex: "#EAB308",
        description: "Mesa VIP alta con 5 pulseras",
      },
    ],
    faq: [
      {
        question: "¿Qué horario tiene el Open Bar de Gummy?",
        answer: "De 23:30 a 00:30 hs o hasta agotar los primeros 200 vasos en la barra central.",
      },
    ],
  },
  {
    id: "evt_funk_intense",
    name: "FUNK INTENSE LIVE SESSIONS",
    code: "FUNK-INTENSE",
    description:
      "DJ David, DJ DSZ y DJ Sal Teles en un mano a mano imperdible. Visuales 3D, sonido lineal de alta fidelidad y efectos especiales.",
    eventType: "CONCIERTO",
    organizerName: "Rumba Stage Producciones",
    locationName: "Rumba Stage Arena",
    address: "Mcal. José F. Estigarribia, Cd. del Este 100151",
    city: "Ciudad del Este",
    startsAt: "2026-08-15T23:30:00Z",
    endsAt: "2026-08-16T06:00:00Z",
    timeSchedule: "23:30 hs",
    bannerUrl:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&auto=format&fit=crop&q=80",
    maxCapacity: 520,
    rating: 4.4,
    reviewCount: 31,
    interestedCount: 1800,
    friendsGoingCount: 5,
    likesCount: 94,
    tiers: [
      {
        id: "tier_lote_01_fi",
        name: "LOTE 01 GENERAL",
        code: "LOTE-01",
        price: 35000,
        formattedPrice: "Gs. 35.000",
        available: 300,
        colorHex: "#6366F1",
        description: "Acceso pista y sectores comunes",
      },
    ],
    faq: [
      {
        question: "¿Se venden entradas en puerta?",
        answer: "Sujeto a disponibilidad de aforo. Se recomienda adquirir con anticipación.",
      },
    ],
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    // 1. If code is requested, try to find single event
    if (code) {
      const cleanCode = code.trim().toUpperCase();

      const dbEvent = await prisma.event.findFirst({
        where: {
          code: cleanCode,
          status: { in: ["ACTIVE", "PUBLISHED", "DRAFT"] },
        },
        include: {
          accreditationTypes: {
            where: { active: true },
            orderBy: { orderIndex: "asc" },
            include: {
              _count: { select: { participants: true } },
            },
          },
        },
      });

      if (dbEvent) {
        const publicEvent: PublicEventItem = {
          id: dbEvent.id,
          name: dbEvent.name,
          code: dbEvent.code,
          description: dbEvent.description || "Evento exclusivo gestionado en CYNKO Suite.",
          eventType: dbEvent.eventType || "GENERAL",
          organizerName: dbEvent.organizerName || "Organizador Oficial",
          locationName: dbEvent.locationName || "Sede Oficial",
          address: dbEvent.address || "Ciudad del Este, Paraguay",
          city: "Ciudad del Este",
          startsAt: dbEvent.startsAt.toISOString(),
          endsAt: dbEvent.endsAt ? dbEvent.endsAt.toISOString() : null,
          timeSchedule: dbEvent.timeSchedule || "Horario a confirmar",
          bannerUrl:
            dbEvent.bannerUrl ||
            "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80",
          maxCapacity: dbEvent.maxCapacity || 500,
          rating: 4.7,
          reviewCount: 42,
          interestedCount: 1500,
          friendsGoingCount: 8,
          likesCount: 95,
          tiers: dbEvent.accreditationTypes.map((t) => {
            const count = t._count.participants;
            const avail = t.maxAvailable ? Math.max(0, t.maxAvailable - count) : 200;
            // Simulated price based on tier name or default
            const price = t.name.toLowerCase().includes("vip")
              ? 80000
              : t.name.toLowerCase().includes("combo")
              ? 35000
              : 25000;
            return {
              id: t.id,
              name: t.name,
              code: t.code,
              price,
              formattedPrice: `Gs. ${price.toLocaleString("es-PY")}`,
              available: avail,
              colorHex: t.colorHex || "#8B5CF6",
              description: t.description || undefined,
            };
          }),
          faq: [
            {
              question: "¿Cómo recibo mis entradas?",
              answer:
                "Tus entradas se generan al instante con un código QR criptográfico único. Puedes descargarlas en PDF, verlas directamente en la app CYNKO en tu celular o recibirlas por WhatsApp.",
            },
            {
              question: "¿Qué métodos de pago aceptan?",
              answer:
                "Aceptamos CYNKO Pay (billetera digital), Tarjetas de Débito/Crédito (Visa, Mastercard), Transferencias Bancarias (SIPAP) y Pix.",
            },
            {
              question: "¿Puedo reembolsar o transferir mi entrada?",
              answer:
                "Puedes transferir tu entrada a otra persona con su número de documento (CI/DNI) hasta 24 horas antes del inicio del evento desde tu billetera CYNKO.",
            },
          ],
        };

        return NextResponse.json({ success: true, event: publicEvent });
      }

      // Check in default sample events
      const fallback = DEFAULT_SAMPLE_EVENTS.find(
        (e) => e.code.toUpperCase() === cleanCode || e.id === code
      );
      if (fallback) {
        return NextResponse.json({ success: true, event: fallback });
      }

      // Default to first sample event if code not found
      return NextResponse.json({ success: true, event: DEFAULT_SAMPLE_EVENTS[0] });
    }

    // 2. Return all published events (DB events merged with sample events)
    const dbEvents = await prisma.event.findMany({
      where: {
        status: { in: ["ACTIVE", "PUBLISHED"] },
      },
      include: {
        accreditationTypes: {
          where: { active: true },
          orderBy: { orderIndex: "asc" },
          include: {
            _count: { select: { participants: true } },
          },
        },
      },
      orderBy: { startsAt: "asc" },
      take: 20,
    });

    const formattedDbEvents: PublicEventItem[] = dbEvents.map((dbEvent) => {
      return {
        id: dbEvent.id,
        name: dbEvent.name,
        code: dbEvent.code,
        description: dbEvent.description || "Evento oficial gestionado por CYNKO Suite.",
        eventType: dbEvent.eventType || "GENERAL",
        organizerName: dbEvent.organizerName || "Organizador Oficial",
        locationName: dbEvent.locationName || "Sede Oficial",
        address: dbEvent.address || "Ciudad del Este, Paraguay",
        city: "Ciudad del Este",
        startsAt: dbEvent.startsAt.toISOString(),
        endsAt: dbEvent.endsAt ? dbEvent.endsAt.toISOString() : null,
        timeSchedule: dbEvent.timeSchedule || "Horario a confirmar",
        bannerUrl:
          dbEvent.bannerUrl ||
          "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80",
        maxCapacity: dbEvent.maxCapacity || 500,
        rating: 4.8,
        reviewCount: 35,
        interestedCount: 1200,
        friendsGoingCount: 6,
        likesCount: 88,
        tiers: dbEvent.accreditationTypes.map((t) => {
          const count = t._count.participants;
          const avail = t.maxAvailable ? Math.max(0, t.maxAvailable - count) : 200;
          const price = t.name.toLowerCase().includes("vip")
            ? 80000
            : t.name.toLowerCase().includes("combo")
            ? 35000
            : 25000;
          return {
            id: t.id,
            name: t.name,
            code: t.code,
            price,
            formattedPrice: `Gs. ${price.toLocaleString("es-PY")}`,
            available: avail,
            colorHex: t.colorHex || "#8B5CF6",
            description: t.description || undefined,
          };
        }),
        faq: DEFAULT_SAMPLE_EVENTS[0].faq,
      };
    });

    // Merge DB events with default sample events (prevent duplicates by code)
    const existingCodes = new Set(formattedDbEvents.map((e) => e.code));
    const allEvents = [
      ...formattedDbEvents,
      ...DEFAULT_SAMPLE_EVENTS.filter((e) => !existingCodes.has(e.code)),
    ];

    return NextResponse.json({
      success: true,
      events: allEvents,
      total: allEvents.length,
    });
  } catch (error) {
    console.error("Error in public events API:", error);
    return NextResponse.json({
      success: true,
      events: DEFAULT_SAMPLE_EVENTS,
      total: DEFAULT_SAMPLE_EVENTS.length,
    });
  }
}
