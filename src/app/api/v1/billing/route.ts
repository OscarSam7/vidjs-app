import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { checkTenantQuota } from "@/lib/billing/limits";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    // 1. Autorización: Se requiere rol OWNER o SUPER_ADMIN
    await requireRole(["OWNER", "SUPER_ADMIN"]);
    const { tenantId } = await requireTenantContext();

    // 2. Asegurar que los planes PERSONAL y ENTERPRISE existan en la base de datos
    await Promise.all([
      prisma.plan.upsert({
        where: { code: "PERSONAL" },
        update: {},
        create: {
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
      }),
      prisma.plan.upsert({
        where: { code: "ENTERPRISE" },
        update: {},
        create: {
          name: "Plan Enterprise Elite",
          code: "ENTERPRISE",
          priceCents: 9900,
          currency: "USD",
          interval: "MONTHLY",
          maxVenues: 10,
          maxEventsPerMonth: 200,
          maxActiveTables: 200,
          features: JSON.stringify([
            "Locales físicos ilimitados",
            "Hasta 200 mesas QR simultáneas",
            "Eventos en vivo ilimitados",
            "Doble Deck profesional con Crossfader",
            "Pantalla pública 4K sin marca de agua",
            "DJ Bridge (Integración de audio de escritorio)",
            "Soporte prioritario 24/7 y SLA garantizado",
          ]),
        },
      }),
    ]);

    // 3. Consultar suscripción activa del Tenant
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
      include: {
        plan: true,
      },
    });

    // 4. Calcular consumo de cuotas en tiempo real
    const [venuesQuota, tablesQuota, eventsQuota, allPlans] = await Promise.all([
      checkTenantQuota(tenantId, "venues"),
      checkTenantQuota(tenantId, "tables"),
      checkTenantQuota(tenantId, "events"),
      prisma.plan.findMany({
        where: { active: true },
        orderBy: { priceCents: "asc" },
      }),
    ]);

    // 5. Historial de facturas simuladas
    const invoices = [
      {
        id: "INV-2026-003",
        date: new Date().toISOString(),
        amountCents: subscription?.plan.priceCents || 4900,
        currency: subscription?.plan.currency || "USD",
        status: "PAID",
        planName: subscription?.plan.name || "Plan Pro",
      },
      {
        id: "INV-2026-002",
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        amountCents: subscription?.plan.priceCents || 4900,
        currency: subscription?.plan.currency || "USD",
        status: "PAID",
        planName: subscription?.plan.name || "Plan Pro",
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        subscription: subscription
          ? {
              id: subscription.id,
              status: subscription.status,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              plan: {
                id: subscription.plan.id,
                name: subscription.plan.name,
                code: subscription.plan.code,
                priceCents: subscription.plan.priceCents,
                currency: subscription.plan.currency,
                interval: subscription.plan.interval,
                features: subscription.plan.features ? JSON.parse(subscription.plan.features) : [],
              },
            }
          : null,
        quotas: {
          venues: venuesQuota,
          tables: tablesQuota,
          events: eventsQuota,
        },
        availablePlans: allPlans.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          priceCents: p.priceCents,
          currency: p.currency,
          interval: p.interval,
          maxVenues: p.maxVenues,
          maxTables: p.maxActiveTables,
          maxEvents: p.maxEventsPerMonth,
          features: p.features ? JSON.parse(p.features) : [],
          isCurrent: p.id === subscription?.planId,
        })),
        invoices,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
