import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { handleApiError } from "@/lib/errors";
import { ensureGastronomySeeded } from "@/lib/gastronomy/seed-defaults";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qrToken = searchParams.get("qrToken");
    const tableIdParam = searchParams.get("tableId");
    const slug = searchParams.get("slug");
    const tableNumberParam = searchParams.get("table");

    // 1. Intentar identificar desde sesión activa de invitado o usuario staff autenticado
    const guestSession = await getCurrentGuestSession().catch(() => null);
    const userSession = await getCurrentSession().catch(() => null);

    let tenantId: string | null = userSession?.tenantId || guestSession?.tenant.id || null;
    let venueId: string | null = guestSession?.table.venueId || null;
    let tableInfo: {
      id: string;
      number: number;
      label: string;
      sectorName: string;
      qrToken: string;
    } | null = null;
    let sessionCode: string = guestSession?.id
      ? `SES-M${guestSession.table.number}-${guestSession.id.slice(-4).toUpperCase()}`
      : `SES-WEB-${Date.now().toString(36).slice(-4).toUpperCase()}`;

    // 2. Si viene qrToken o tableId explícito en query, resolver la mesa
    if (qrToken || tableIdParam) {
      const tableFound = await prisma.table.findFirst({
        where: qrToken ? { qrToken } : { id: tableIdParam! },
        include: {
          sector: { select: { name: true } },
          venue: { select: { id: true, name: true, tenantId: true } },
        },
      });
      if (tableFound) {
        tenantId = tableFound.tenantId;
        venueId = tableFound.venueId;
        tableInfo = {
          id: tableFound.id,
          number: tableFound.number,
          label: tableFound.label,
          sectorName: tableFound.sector?.name || "Salón principal",
          qrToken: tableFound.qrToken,
        };
        sessionCode = `SES-M${tableFound.number}-${tableFound.qrToken.slice(-4).toUpperCase()}`;
      }
    }

    // 3. Si viene slug del establecimiento
    if (!tenantId && slug) {
      const tenantBySlug = await prisma.tenant.findUnique({
        where: { slug },
        include: {
          venues: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 1 },
        },
      });
      if (tenantBySlug) {
        tenantId = tenantBySlug.id;
        venueId = tenantBySlug.venues[0]?.id || null;
      }
    }

    // 4. Fallback al establecimiento principal activo (priorizando el que posee usuarios activos)
    if (!tenantId) {
      const mainTenant =
        (await prisma.tenant.findFirst({
          where: { status: "ACTIVE", users: { some: {} } },
          include: { venues: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 1 } },
          orderBy: { createdAt: "asc" },
        })) ||
        (await prisma.tenant.findFirst({
          where: { status: "ACTIVE" },
          include: { venues: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 1 } },
          orderBy: { createdAt: "asc" },
        }));
      if (mainTenant) {
        tenantId = mainTenant.id;
        venueId = mainTenant.venues[0]?.id || null;
      }
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Establecimiento no encontrado" } },
        { status: 404 }
      );
    }

    // Asegurar semilla gastronómica
    const seeded = await ensureGastronomySeeded(tenantId, venueId || undefined);
    const activeVenueId = venueId || seeded?.venueId;

    // Resolver datos de la mesa si no se había resuelto por qrToken o tableId
    if (!tableInfo) {
      if (guestSession?.table && guestSession.tenant.id === tenantId) {
        const dbTable = await prisma.table.findUnique({
          where: { id: guestSession.table.id },
          include: { sector: { select: { name: true } } },
        });
        if (dbTable) {
          tableInfo = {
            id: dbTable.id,
            number: dbTable.number,
            label: dbTable.label,
            sectorName: dbTable.sector?.name || "Salón principal",
            qrToken: dbTable.qrToken,
          };
        }
      } else if (tableNumberParam) {
        const num = parseInt(tableNumberParam.replace(/\D/g, ""), 10);
        const dbTable = await prisma.table.findFirst({
          where: {
            tenantId,
            active: true,
            ...(isNaN(num) ? { label: { contains: tableNumberParam, mode: "insensitive" } } : { number: num }),
          },
          include: { sector: { select: { name: true } } },
        });
        if (dbTable) {
          tableInfo = {
            id: dbTable.id,
            number: dbTable.number,
            label: dbTable.label,
            sectorName: dbTable.sector?.name || "Salón principal",
            qrToken: dbTable.qrToken,
          };
          sessionCode = `SES-M${dbTable.number}-${dbTable.id.slice(-4).toUpperCase()}`;
        }
      }
    }

    // Fallback a la primera mesa activa del local si sigue sin mesa asignada
    if (!tableInfo) {
      const firstTable = await prisma.table.findFirst({
        where: { tenantId, active: true },
        include: { sector: { select: { name: true } } },
        orderBy: { number: "asc" },
      });
      if (firstTable) {
        tableInfo = {
          id: firstTable.id,
          number: firstTable.number,
          label: firstTable.label,
          sectorName: firstTable.sector?.name || "Salón principal",
          qrToken: firstTable.qrToken,
        };
      }
    }

    const [tenant, venue, categories, availableProducts, deliveryConfig, allTables, activeOrders] =
      await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { id: true, name: true, slug: true, logoUrl: true },
        }),
        activeVenueId
          ? prisma.venue.findUnique({
              where: { id: activeVenueId },
              select: {
                id: true,
                name: true,
                slug: true,
                bankName: true,
                bankAccount: true,
                bankHolder: true,
                bankTaxId: true,
                bankAlias: true,
                whatsappNumber: true,
              },
            })
          : null,
        prisma.gastroCategory.findMany({
          where: { tenantId, active: true },
          orderBy: { orderIndex: "asc" },
        }),
        // IMPORTANTE FASE 4 & 5:
        // Cuando un producto esté desactivado o sin disponibilidad, desaparece automáticamente del menú disponible del cliente
        prisma.gastroProduct.findMany({
          where: {
            tenantId,
            active: true,
            availabilityStatus: "AVAILABLE",
            OR: [{ trackInventory: false }, { stockQuantity: { gt: 0 } }],
          },
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
          orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
        }),
        activeVenueId
          ? prisma.gastroDeliveryConfig.findUnique({ where: { venueId: activeVenueId } })
          : prisma.gastroDeliveryConfig.findFirst({ where: { tenantId } }),
        prisma.table.findMany({
          where: { tenantId, active: true, number: { lt: 90 } },
          include: { sector: { select: { id: true, name: true } } },
          orderBy: { number: "asc" },
        }),
        // Pedidos recientes de esta mesa para seguimiento en vivo
        tableInfo
          ? prisma.gastroOrder.findMany({
              where: {
                tenantId,
                tableId: tableInfo.id,
              },
              include: {
                items: true,
                payments: true,
              },
              orderBy: { receivedAt: "desc" },
              take: 10,
            })
          : [],
      ]);

    // Buscar señas confirmadas aplicables a la mesa (Fase 8)
    const availableDeposits = tableInfo
      ? await prisma.gastroCustomerDeposit.findMany({
          where: {
            tenantId,
            tableId: tableInfo.id,
            status: { in: ["CONFIRMED", "PARTIALLY_APPLIED"] },
            remainingCreditCents: { gt: 0 },
          },
          orderBy: { depositDate: "desc" },
        })
      : [];

    return NextResponse.json({
      success: true,
      establishment: {
        tenantId: tenant?.id,
        name: tenant?.name || "VIDJSPRO Gastronomía",
        slug: tenant?.slug,
        logoUrl: tenant?.logoUrl,
        venueId: venue?.id || activeVenueId,
        venueName: venue?.name || "Sede Principal",
        bankInfo: {
          bankName: venue?.bankName || "Banco Itaú / Continental",
          bankAccount: venue?.bankAccount || "700458912",
          bankHolder: venue?.bankHolder || tenant?.name || "Retro Bar S.A.",
          bankTaxId: venue?.bankTaxId || "80091234-5",
          bankAlias: venue?.bankAlias || "ALIAS.RETROBAR.PY",
        },
      },
      sessionInfo: {
        sessionCode,
        guestName: guestSession?.guestName || null,
        table: tableInfo,
      },
      tables: allTables.map((t) => ({
        id: t.id,
        number: t.number,
        label: t.label,
        capacity: t.capacity,
        tableStatus: t.tableStatus,
        isAvailable: t.tableStatus === "AVAILABLE",
        sectorName: t.sector?.name || "Salón principal",
        qrToken: t.qrToken,
      })),
      deliveryConfig: deliveryConfig || {
        barPickupEnabled: true,
        waiterDeliveryEnabled: true,
        defaultDeliveryMode: "WAITER_DELIVERY",
        serviceFeeCents: 0,
        serviceFeePercent: 0,
      },
      categories,
      products: availableProducts,
      activeOrders,
      availableDeposits,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
