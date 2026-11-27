import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { ensureGastronomySeeded } from "@/lib/gastronomy/seed-defaults";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const venueIdParam = searchParams.get("venueId") || undefined;
    const fromParam = searchParams.get("from") || undefined;
    const toParam = searchParams.get("to") || undefined;

    const parseDateBound = (raw: string | undefined, endOfDay: boolean): Date | undefined => {
      if (!raw) return undefined;
      const trimmed = raw.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const d = new Date(`${trimmed}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}-03:00`);
        return Number.isNaN(d.getTime()) ? undefined : d;
      }
      const d = new Date(trimmed);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };

    const fromDate = parseDateBound(fromParam, false);
    const toDate = parseDateBound(toParam, true);
    const hasDateFilter = Boolean(fromDate || toDate);
    const dateRange = hasDateFilter
      ? {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDate ? { lte: toDate } : {}),
        }
      : undefined;

    const seededInfo = await ensureGastronomySeeded(tenantId, venueIdParam);
    const activeVenueId = venueIdParam || seededInfo?.venueId;

    const [
      venues,
      sectors,
      categories,
      products,
      deliveryConfig,
      orders,
      payments,
      deposits,
      pendingSales,
      inventoryItems,
      tables,
      waiters,
      activeShift,
      shifts,
    ] = await Promise.all([
      prisma.venue.findMany({
        where: { tenantId, active: true },
        select: { id: true, name: true, slug: true, bankName: true, bankAccount: true, bankAlias: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.gastroSector.findMany({
        where: { tenantId, ...(venueIdParam ? { venueId: venueIdParam } : {}) },
        orderBy: { orderIndex: "asc" },
      }),
      prisma.gastroCategory.findMany({
        where: { tenantId },
        orderBy: { orderIndex: "asc" },
      }),
      prisma.gastroProduct.findMany({
        where: { tenantId },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          recipeItems: {
            include: {
              inventoryItem: {
                select: { id: true, code: true, name: true, currentStock: true, unit: true },
              },
            },
          },
        },
        orderBy: [{ category: { orderIndex: "asc" } }, { name: "asc" }],
      }),
      activeVenueId
        ? prisma.gastroDeliveryConfig.findUnique({ where: { venueId: activeVenueId } })
        : prisma.gastroDeliveryConfig.findFirst({ where: { tenantId } }),
      prisma.gastroOrder.findMany({
        where: {
          tenantId,
          ...(venueIdParam ? { venueId: venueIdParam } : {}),
          ...(dateRange ? { receivedAt: dateRange } : {}),
        },
        include: {
          items: true,
          payments: true,
          table: {
            select: {
              id: true,
              number: true,
              label: true,
              sectorId: true,
              sector: { select: { id: true, name: true, code: true, colorHex: true } },
            },
          },
        },
        orderBy: { receivedAt: "desc" },
        take: hasDateFilter ? 2000 : 150,
      }),
      prisma.gastroPayment.findMany({
        where: {
          tenantId,
          ...(venueIdParam ? { venueId: venueIdParam } : {}),
          ...(dateRange ? { createdAt: dateRange } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: hasDateFilter ? 2000 : 100,
      }),
      prisma.gastroCustomerDeposit.findMany({
        where: {
          tenantId,
          ...(venueIdParam ? { venueId: venueIdParam } : {}),
          ...(dateRange ? { depositDate: dateRange } : {}),
        },
        orderBy: { depositDate: "desc" },
        take: hasDateFilter ? 500 : 50,
      }),
      prisma.gastroPendingInvoiceSale.findMany({
        where: {
          tenantId,
          ...(venueIdParam ? { venueId: venueIdParam } : {}),
          ...(dateRange ? { saleDate: dateRange } : {}),
        },
        orderBy: { saleDate: "desc" },
        take: hasDateFilter ? 1000 : 100,
      }),
      prisma.gastroInventoryItem.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
      }),
      prisma.table.findMany({
        where: { tenantId, ...(venueIdParam ? { venueId: venueIdParam } : {}), active: true },
        include: {
          sector: { select: { id: true, name: true, code: true, colorHex: true } },
          gastroTableSessions: {
            where: { status: { in: ["OPEN", "PENDING_PAYMENT"] } },
            include: { orders: { include: { items: true } } },
            orderBy: { openedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { number: "asc" },
      }),
      prisma.user.findMany({
        where: {
          tenantId,
          status: "ACTIVE",
          role: { in: ["MOZO", "OPERATOR", "SUPERVISOR", "MANAGER", "GERENTE"] },
        },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: "asc" },
      }),
      prisma.gastroCashRegisterShift.findFirst({
        where: {
          tenantId,
          ...(venueIdParam ? { venueId: venueIdParam } : {}),
          status: "OPEN",
        },
        orderBy: { openedAt: "desc" },
      }),
      prisma.gastroCashRegisterShift.findMany({
        where: {
          tenantId,
          ...(venueIdParam ? { venueId: venueIdParam } : {}),
          ...(dateRange ? { openedAt: dateRange } : {}),
        },
        orderBy: { openedAt: "desc" },
        take: hasDateFilter ? 200 : 20,
      }),
    ]);

    const normalizedOrders = orders.map((ord) => ({
      ...ord,
      tableLabel: ord.table?.label || ord.tableLabel,
      tableNumber: ord.table?.number ?? ord.tableNumber,
      sectorName: ord.table?.sector?.name || ord.sectorName || "Salón principal",
    }));

    return NextResponse.json({
      success: true,
      currentUser: {
        id: session.sub,
        name: session.name,
        email: session.email,
        role: session.role,
      },
      activeVenueId,
      venues,
      sectors,
      categories,
      products,
      deliveryConfig,
      orders: normalizedOrders,
      payments,
      deposits,
      pendingSales,
      inventoryItems,
      tables,
      waiters,
      activeShift,
      shifts,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
