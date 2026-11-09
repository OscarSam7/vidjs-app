import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { PERMISSIONS, hasAnyPermission } from "@/lib/rbac/permissions";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const createDepositSchema = z.object({
  venueId: z.string().optional(),
  tableId: z.string().optional().nullable(),
  reservationId: z.string().optional().nullable(),
  eventId: z.string().optional().nullable(),
  customerName: z.string().min(2, "El nombre del cliente es obligatorio"),
  customerPhone: z.string().optional(),
  customerTaxId: z.string().optional(),
  depositType: z.enum(["PERCENTAGE", "FIXED"]).default("FIXED"),
  estimatedConsumptionCents: z.coerce.number().int().nonnegative().default(0),
  depositPercentage: z.coerce.number().min(0).max(100).optional(),
  depositAmountCents: z.coerce.number().int().nonnegative().optional(),
  paymentMethod: z
    .enum(["CASH", "DEBIT_CARD", "CREDIT_CARD", "BANK_TRANSFER", "QR_PAYMENT", "PIX"])
    .default("BANK_TRANSFER"),
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
});

const applyDepositSchema = z.object({
  depositId: z.string().min(1),
  orderId: z.string().min(1),
});

export async function GET() {
  try {
    const { tenantId } = await requireTenantContext();
    const deposits = await prisma.gastroCustomerDeposit.findMany({
      where: { tenantId },
      include: {
        table: { select: { id: true, number: true, label: true } },
      },
      orderBy: { depositDate: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, deposits });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    if (
      !hasAnyPermission(session.role, [
        PERMISSIONS.GASTRO_DEPOSITS_MANAGE,
        PERMISSIONS.GASTRO_CASHIER_OPERATE,
        PERMISSIONS.GASTRO_ORDERS_MANAGE,
      ])
    ) {
      throw new ForbiddenError("No tienes permisos para registrar señas");
    }

    const body = await req.json();
    const data = createDepositSchema.parse(body);

    let targetVenueId = data.venueId;
    if (!targetVenueId) {
      const firstVenue = await prisma.venue.findFirst({ where: { tenantId, active: true } });
      targetVenueId = firstVenue?.id;
    }
    if (!targetVenueId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No se encontró sede activa" } },
        { status: 404 }
      );
    }

    // Cálculo automático según porcentaje o importe fijo (Fase 8):
    // Ejemplo: Consumo estimado Gs. 500.000, Seña Gs. 150.000, Saldo pendiente Gs. 350.000
    const estimated = data.estimatedConsumptionCents || 0;
    let finalDepositAmount = data.depositAmountCents || 0;

    if (data.depositType === "PERCENTAGE" && data.depositPercentage && estimated > 0) {
      finalDepositAmount = Math.round((estimated * data.depositPercentage) / 100);
    }

    if (finalDepositAmount <= 0) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "El importe de la seña debe ser mayor a 0" } },
        { status: 400 }
      );
    }

    const pendingConsumptionBalanceCents = Math.max(0, estimated - finalDepositAmount);
    const existingDeposits = await prisma.gastroCustomerDeposit.findMany({
      select: { receiptNumber: true },
    });
    const maxDepositNum = existingDeposits.reduce((max, d) => {
      const m = d.receiptNumber.match(/(\d+)$/);
      const n = m ? parseInt(m[1], 10) : 0;
      return n > max ? n : max;
    }, 100);
    const receiptNumber = `SEN-${String(maxDepositNum + 1).padStart(5, "0")}`;

    const deposit = await prisma.$transaction(async (tx) => {
      const created = await tx.gastroCustomerDeposit.create({
        data: {
          tenantId,
          venueId: targetVenueId!,
          tableId: data.tableId || null,
          reservationId: data.reservationId || null,
          eventId: data.eventId || null,
          receiptNumber,
          customerName: data.customerName,
          customerPhone: data.customerPhone || null,
          customerTaxId: data.customerTaxId || null,
          depositType: data.depositType,
          estimatedConsumptionCents: estimated,
          depositPercentage: data.depositPercentage || null,
          depositAmountCents: finalDepositAmount,
          appliedAmountCents: 0,
          remainingCreditCents: finalDepositAmount,
          pendingConsumptionBalanceCents,
          currency: "PYG",
          paymentMethod: data.paymentMethod,
          paymentReference:
            data.paymentReference || `REF-SEN-${Date.now().toString(36).toUpperCase()}`,
          status: "CONFIRMED",
          // REGLA OBLIGATORIA FASE 8:
          // Diferenciar claramente una seña de una venta definitiva (isDefinitiveSale: false)
          // No generar ingresos duplicados al aplicar la seña al consumo.
          isDefinitiveSale: false,
          registeredByUserId: session.sub,
          registeredByName: session.name,
          notes: data.notes || null,
        },
        include: {
          table: { select: { id: true, number: true, label: true } },
        },
      });

      // Si hay mesa vinculada, marcarla como RESERVED si estaba AVAILABLE
      if (data.tableId) {
        const tbl = await tx.table.findUnique({ where: { id: data.tableId } });
        if (tbl && tbl.tableStatus === "AVAILABLE") {
          await tx.table.update({
            where: { id: tbl.id },
            data: { tableStatus: "RESERVED" },
          });
        }
      }

      // Actualizar turno de caja abierto en el rubro señas recibidas (no en ventas definitivas)
      const openShift = await tx.gastroCashRegisterShift.findFirst({
        where: { tenantId, venueId: targetVenueId!, status: "OPEN" },
      });
      if (openShift) {
        await tx.gastroCashRegisterShift.update({
          where: { id: openShift.id },
          data: {
            depositsReceivedCents: openShift.depositsReceivedCents + finalDepositAmount,
            ...(data.paymentMethod === "CASH"
              ? { expectedCashCents: openShift.expectedCashCents + finalDepositAmount }
              : {}),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: session.sub,
          action: "GASTRO_DEPOSIT_REGISTERED",
          resource: "GASTRO_DEPOSIT",
          resourceId: created.id,
          metadata: JSON.stringify({
            receiptNumber: created.receiptNumber,
            customerName: created.customerName,
            estimatedConsumptionCents: created.estimatedConsumptionCents,
            depositAmountCents: created.depositAmountCents,
            pendingConsumptionBalanceCents: created.pendingConsumptionBalanceCents,
          }),
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, deposit });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    if (
      !hasAnyPermission(session.role, [
        PERMISSIONS.GASTRO_DEPOSITS_MANAGE,
        PERMISSIONS.GASTRO_CASHIER_OPERATE,
      ])
    ) {
      throw new ForbiddenError("No tienes permisos para aplicar señas al consumo");
    }

    const body = await req.json();
    const data = applyDepositSchema.parse(body);

    const [deposit, order] = await Promise.all([
      prisma.gastroCustomerDeposit.findFirst({
        where: { id: data.depositId, tenantId },
      }),
      prisma.gastroOrder.findFirst({
        where: { id: data.orderId, tenantId },
        include: { items: true },
      }),
    ]);

    if (!deposit || deposit.remainingCreditCents <= 0) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "La seña no tiene saldo disponible para aplicar" } },
        { status: 400 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Pedido no encontrado" } },
        { status: 404 }
      );
    }

    const orderRemaining = Math.max(0, order.totalCents - order.paidCents);
    if (orderRemaining <= 0) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Este pedido ya está totalmente pagado" } },
        { status: 400 }
      );
    }

    const amountToApply = Math.min(deposit.remainingCreditCents, orderRemaining);

    const result = await prisma.$transaction(async (tx) => {
      const nextRemainingCredit = deposit.remainingCreditCents - amountToApply;
      const nextApplied = deposit.appliedAmountCents + amountToApply;

      const updatedDeposit = await tx.gastroCustomerDeposit.update({
        where: { id: deposit.id },
        data: {
          appliedAmountCents: nextApplied,
          remainingCreditCents: nextRemainingCredit,
          status: nextRemainingCredit === 0 ? "APPLIED_TO_CONSUMPTION" : "PARTIALLY_APPLIED",
          appliedAt: new Date(),
        },
      });

      const nextOrderDepositApplied = order.depositAppliedCents + amountToApply;
      const nextOrderTotalToPayInCashier = Math.max(0, order.totalCents - amountToApply);
      const isNowFullyCovered = nextOrderTotalToPayInCashier <= order.paidCents;

      const updatedOrder = await tx.gastroOrder.update({
        where: { id: order.id },
        data: {
          depositAppliedCents: nextOrderDepositApplied,
          totalCents: nextOrderTotalToPayInCashier,
          paymentStatus: isNowFullyCovered ? "APPROVED" : "PARTIALLY_PAID",
          status:
            isNowFullyCovered &&
            (order.status === "RECEIVED" || order.status === "PENDING_PAYMENT")
              ? "PAYMENT_CONFIRMED"
              : order.status,
          barStatus:
            isNowFullyCovered &&
            order.hasBarItems &&
            (order.barStatus === "RECEIVED" || order.barStatus === "PENDING_PAYMENT")
              ? "PAYMENT_CONFIRMED"
              : order.barStatus,
          kitchenStatus:
            isNowFullyCovered &&
            order.hasKitchenItems &&
            (order.kitchenStatus === "RECEIVED" || order.kitchenStatus === "PENDING_PAYMENT")
              ? "PAYMENT_CONFIRMED"
              : order.kitchenStatus,
        },
        include: { items: true },
      });

      // Si quedó 100% cubierto al aplicar la seña, generar la venta pendiente de facturación sin duplicar ingreso
      if (isNowFullyCovered) {
        const sourceUniqueId = `SRC-GASTRO-${order.tenantId.slice(-6)}-${order.id}`;
        const existingSale = await tx.gastroPendingInvoiceSale.findFirst({
          where: {
            OR: [{ sourceUniqueId }, { orderId: order.id }],
          },
        });
        if (!existingSale) {
          const existingSales = await tx.gastroPendingInvoiceSale.findMany({
            select: { saleNumber: true },
          });
          const maxSaleNum = existingSales.reduce((max, s) => {
            const m = s.saleNumber.match(/(\d+)$/);
            const n = m ? parseInt(m[1], 10) : 0;
            return n > max ? n : max;
          }, 1000);
          const saleNumber = `VTA-${String(maxSaleNum + 1).padStart(6, "0")}`;

          await tx.gastroPendingInvoiceSale.create({
            data: {
              tenantId,
              venueId: order.venueId,
              orderId: order.id,
              saleNumber,
              sourceUniqueId,
              orderNumber: order.orderNumber,
              tableLabel: order.tableLabel,
              sectorName: order.sectorName,
              customerName: order.customerName || deposit.customerName || "Consumidor Final",
              customerTaxId: order.customerTaxId || deposit.customerTaxId || "44444401-7",
              itemsSnapshotJson: JSON.stringify(
                updatedOrder.items.map((it) => ({
                  code: it.productCode,
                  name: it.productName,
                  quantity: it.quantity,
                  unitPriceCents: it.unitPriceCents,
                  extrasPriceCents: it.extrasPriceCents,
                  subtotalCents: it.subtotalCents,
                }))
              ),
              subtotalCents: updatedOrder.subtotalCents,
              discountCents: updatedOrder.discountCents,
              serviceFeeCents: updatedOrder.serviceFeeCents,
              depositAppliedCents: updatedOrder.depositAppliedCents,
              // El total fiscal de la venta es el consumo real (subtotal - descuento + servicio),
              // dejando constancia de cuánto fue cubierto por seña para no duplicar ingresos en caja
              totalCents:
                updatedOrder.subtotalCents -
                updatedOrder.discountCents +
                updatedOrder.serviceFeeCents,
              currency: "PYG",
              paymentMethod: "DEPOSIT_APPLICATION",
              paymentReference: deposit.receiptNumber,
              invoicingStatus: "PENDING_INVOICING",
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: session.sub,
          action: "GASTRO_DEPOSIT_APPLIED",
          resource: "GASTRO_DEPOSIT",
          resourceId: deposit.id,
          metadata: JSON.stringify({
            receiptNumber: deposit.receiptNumber,
            orderNumber: order.orderNumber,
            amountAppliedCents: amountToApply,
            remainingCreditCents: nextRemainingCredit,
          }),
        },
      });

      return { updatedDeposit, updatedOrder };
    });

    realtimeBus.broadcast("global", "GASTRO_ORDER_UPDATED", {
      orderId: result.updatedOrder.id,
      status: result.updatedOrder.status,
      paymentStatus: result.updatedOrder.paymentStatus,
    });

    return NextResponse.json({
      success: true,
      deposit: result.updatedDeposit,
      order: result.updatedOrder,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
