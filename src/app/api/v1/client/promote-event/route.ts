import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export const EVENT_PROMO_PLANS = {
  STANDARD: {
    code: "STANDARD",
    name: "Cartelera Estándar",
    priceGs: 150000,
    days: 7,
    features: [
      "Publicación en Cartelera Oficial de CYNKO",
      "Enlace directo para consultas / entradas",
      "Visible en búsquedas por categoría y ciudad",
    ],
  },
  CAROUSEL_7D: {
    code: "CAROUSEL_7D",
    name: "Carrusel Portada VIP (7 días)",
    priceGs: 350000,
    days: 7,
    popular: true,
    features: [
      "Banner destacado en el Carrusel Principal de la App",
      "Insignia oficial EVENTO DESTACADO",
      "Publicación en Cartelera + Taquilla Cynko Pass",
    ],
  },
  FULL_PROMO_15D: {
    code: "FULL_PROMO_15D",
    name: "Full Promo Festival (15 días)",
    priceGs: 650000,
    days: 15,
    features: [
      "Carrusel Principal prioritario durante 15 días",
      "Taquilla QR Cynko Pass + Escáner de puerta",
      "Soporte prioritario y difusión destacada",
    ],
  },
} as const;

const submitSchema = z.object({
  organizerName: z.string().min(2, "Ingresa tu nombre o productora"),
  organizerPhone: z.string().min(6, "Ingresa un WhatsApp o teléfono válido"),
  organizerEmail: z.string().email("Correo inválido").optional().or(z.literal("")),
  eventName: z.string().min(3, "Ingresa el nombre del evento"),
  eventType: z.string().default("FIESTA"),
  eventDate: z.string().min(4, "Selecciona la fecha del evento"),
  locationName: z.string().min(2, "Ingresa el lugar del evento"),
  city: z.string().optional(),
  description: z.string().optional(),
  bannerUrl: z.string().optional(),
  ticketPriceLabel: z.string().optional(),
  planCode: z.enum(["STANDARD", "CAROUSEL_7D", "FULL_PROMO_15D"]).default("CAROUSEL_7D"),
  paymentMethod: z.enum(["TRANSFER", "QR_PAGOS", "PIX"]).default("TRANSFER"),
  paymentReference: z.string().min(2, "Ingresa el número de comprobante o referencia de pago"),
});

export async function GET() {
  try {
    const now = new Date();
    const promoted = await prisma.eventPromotionSubmission.findMany({
      where: {
        status: "APPROVED",
        OR: [{ featuredUntil: null }, { featuredUntil: { gt: now } }],
      },
      orderBy: [{ createdAt: "desc" }],
      take: 12,
    });

    return NextResponse.json({
      success: true,
      plans: Object.values(EVENT_PROMO_PLANS),
      promotedEvents: promoted,
    });
  } catch (error) {
    console.error("[PROMOTE_EVENT_GET_ERROR]", error);
    return NextResponse.json({ error: "Error cargando eventos destacados" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos incompletos para publicar tu evento" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const plan = EVENT_PROMO_PLANS[d.planCode];
    const parsedEventDate = new Date(d.eventDate);
    if (Number.isNaN(parsedEventDate.getTime())) {
      return NextResponse.json({ error: "La fecha del evento no es válida" }, { status: 400 });
    }

    const featuredUntil = new Date(Date.now() + plan.days * 24 * 60 * 60 * 1000);

    const created = await prisma.eventPromotionSubmission.create({
      data: {
        organizerName: d.organizerName.trim(),
        organizerPhone: d.organizerPhone.trim(),
        organizerEmail: d.organizerEmail?.trim() || null,
        eventName: d.eventName.trim(),
        eventType: d.eventType.trim().toUpperCase(),
        eventDate: parsedEventDate,
        locationName: d.locationName.trim(),
        city: d.city?.trim() || null,
        description: d.description?.trim() || null,
        bannerUrl: d.bannerUrl?.trim() || null,
        ticketPriceLabel: d.ticketPriceLabel?.trim() || null,
        planCode: plan.code,
        amountCents: plan.priceGs,
        currency: "PYG",
        paymentMethod: d.paymentMethod,
        paymentReference: d.paymentReference.trim(),
        paymentStatus: "PENDING_REVIEW",
        status: "PENDING",
        featuredUntil,
      },
    });

    return NextResponse.json({
      success: true,
      submission: {
        id: created.id,
        eventName: created.eventName,
        planName: plan.name,
        amountGs: plan.priceGs,
        status: created.status,
      },
    });
  } catch (error) {
    console.error("[PROMOTE_EVENT_POST_ERROR]", error);
    return NextResponse.json(
      { error: "No pudimos registrar tu solicitud. Intenta nuevamente." },
      { status: 500 }
    );
  }
}
