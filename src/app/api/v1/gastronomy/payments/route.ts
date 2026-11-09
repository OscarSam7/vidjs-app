import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { PERMISSIONS, hasAnyPermission } from "@/lib/rbac/permissions";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { generateQrDataUrl } from "@/lib/qr/generator";

const paymentOperationSchema = z.object({
  action: z.enum([
    "CONFIRM_CASH_PAYMENT",
    "CONFIRM_CARD_PAYMENT",
    "CONFIRM_TRANSFER_PAYMENT",
    "GENERATE_QR_PAYMENT",
    "WEBHOOK_QR_CONFIRMATION",
    "REJECT_PAYMENT",
    "REFUND_PAYMENT",
    "OPEN_CASH_SHIFT",
    "CLOSE_CASH_SHIFT",
  ]),
  orderId: z.string().optional(),
  paymentId: z.string().optional(),
  paymentMethod: z
    .enum([
      "CASH",
      "DEBIT_CARD",
      "CREDIT_CARD",
      "BANK_TRANSFER",
      "QR_PAYMENT",
      "PIX",
      "DEPOSIT_APPLICATION",
    ])
    .optional(),
  paymentModality: z.enum(["FULL", "PARTIAL", "DEPOSIT"]).optional(),
  amountCents: z.coerce.number().int().nonnegative().optional(),
  receivedAmountCents: z.coerce.number().int().nonnegative().optional(),
  provider: z.string().optional(),
  providerReference: z.string().optional(),
  cardBrand: z.string().optional(),
  cardLast4: z.string().max(4).optional(),
  // Prohibido expresamente aceptar o guardar números completos de tarjeta o CVV (Fase 7)
  cardNumber: z.string().optional(),
  cvv: z.string().optional(),
  webhookSignature: z.string().optional(),
  customerName: z.string().optional(),
  customerTaxId: z.string().optional(),
  reason: z.string().optional(),
  // Para turnos de caja
  venueId: z.string().optional(),
  shiftName: z.string().optional(),
  openingCashCents: z.coerce.number().int().nonnegative().optional(),
  countedCashCents: z.coerce.number().int().nonnegative().optional(),
  closingNotes: z.string().optional(),
});

function computeWebhookHmac(transactionCode: string, amountCents: number): string {
  const secret = process.env.JWT_SECRET || "vidjs_gastro_webhook_secret_key";
  return crypto
    .createHmac("sha256", secret)
    .update(`${transactionCode}:${amountCents}:APPROVED`)
    .digest("hex");
}

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const [payments, shifts] = await Promise.all([
      prisma.gastroPayment.findMany({
        where: {
          tenantId,
          ...(status ? { status } : {}),
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              tableLabel: true,
              sectorName: true,
              customerName: true,
              totalCents: true,
              paidCents: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 150,
      }),
      prisma.gastroCashRegisterShift.findMany({
        where: { tenantId },
        orderBy: { openedAt: "desc" },
        take: 25,
      }),
    ]);

    return NextResponse.json({ success: true, payments, shifts });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    const canOperateCashier = hasAnyPermission(session.role, [
      PERMISSIONS.GASTRO_CASHIER_OPERATE,
      PERMISSIONS.GASTRO_PAYMENTS_MANAGE,
      PERMISSIONS.GASTRO_ORDERS_MANAGE,
    ]);

    if (!canOperateCashier) {
      throw new ForbiddenError("No tienes permisos para operar la Caja Gastronómica o Pagos");
    }

    const body = await req.json();
    const data = paymentOperationSchema.parse(body);

    // REGLA DE SEGURIDAD OBLIGATORIA (Fase 7):
    // No guardar números completos de tarjetas ni códigos de seguridad (CVV).
    if (data.cardNumber && data.cardNumber.replace(/\D/g, "").length > 4) {
      return NextResponse.json(
        {
          error: {
            code: "PCI_SECURITY_VIOLATION",
            message:
              "Seguridad PCI: Está estrictamente prohibido enviar o almacenar números completos de tarjetas o códigos CVV.",
          },
        },
        { status: 400 }
      );
    }
    if (data.cvv) {
      return NextResponse.json(
        {
          error: {
            code: "PCI_SECURITY_VIOLATION",
            message: "Seguridad PCI: Está estrictamente prohibido almacenar códigos de seguridad CVV.",
          },
        },
        { status: 400 }
      );
    }

    // 1. APERTURA DE TURNO DE CAJA (Fase 15)
    if (data.action === "OPEN_CASH_SHIFT") {
      let targetVenueId = data.venueId;
      if (!targetVenueId) {
        const firstVenue = await prisma.venue.findFirst({ where: { tenantId, active: true } });
        targetVenueId = firstVenue?.id;
      }
      if (!targetVenueId) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Sede no encontrada" } },
          { status: 404 }
        );
      }

      const existingOpen = await prisma.gastroCashRegisterShift.findFirst({
        where: { tenantId, venueId: targetVenueId, status: "OPEN" },
      });
      if (existingOpen) {
        return NextResponse.json({ success: true, shift: existingOpen });
      }

      const countShifts = await prisma.gastroCashRegisterShift.count({ where: { tenantId } });
      const shiftCode = `TURNO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(
        countShifts + 1
      ).padStart(2, "0")}`;

      const shift = await prisma.gastroCashRegisterShift.create({
        data: {
          tenantId,
          venueId: targetVenueId,
          shiftCode,
          shiftName: data.shiftName || "Turno Operativo",
          cashierUserId: session.sub,
          cashierName: session.name,
          status: "OPEN",
          openingCashCents: data.openingCashCents || 0,
          expectedCashCents: data.openingCashCents || 0,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: session.sub,
          action: "GASTRO_CASH_SHIFT_OPENED",
          resource: "GASTRO_CASH_SHIFT",
          resourceId: shift.id,
          metadata: JSON.stringify({
            shiftCode: shift.shiftCode,
            openingCashCents: shift.openingCashCents,
            cashierName: session.name,
          }),
        },
      });

      return NextResponse.json({ success: true, shift });
    }

    // 2. CIERRE DE TURNO DE CAJA (Fase 15)
    if (data.action === "CLOSE_CASH_SHIFT") {
      const openShift = await prisma.gastroCashRegisterShift.findFirst({
        where: { tenantId, status: "OPEN" },
        orderBy: { openedAt: "desc" },
      });

      if (!openShift) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "No hay un turno de caja abierto actualmente" } },
          { status: 404 }
        );
      }

      const counted = data.countedCashCents ?? openShift.expectedCashCents;
      const diff = counted - openShift.expectedCashCents;

      const closedShift = await prisma.gastroCashRegisterShift.update({
        where: { id: openShift.id },
        data: {
          status: "CLOSED",
          countedCashCents: counted,
          differenceCents: diff,
          closedAt: new Date(),
          closedByName: session.name,
          closingNotes: data.closingNotes || null,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: session.sub,
          action: "GASTRO_CASH_SHIFT_CLOSED",
          resource: "GASTRO_CASH_SHIFT",
          resourceId: closedShift.id,
          metadata: JSON.stringify({
            shiftCode: closedShift.shiftCode,
            totalSalesCents: closedShift.totalSalesCents,
            expectedCashCents: closedShift.expectedCashCents,
            countedCashCents: counted,
            differenceCents: diff,
            closedBy: session.name,
          }),
        },
      });

      return NextResponse.json({ success: true, shift: closedShift });
    }

    // Buscar pedido asociado para operaciones de pago
    const order = data.orderId
      ? await prisma.gastroOrder.findFirst({
          where: { id: data.orderId, tenantId },
          include: { items: true, payments: true },
        })
      : null;

    if (!order && !data.paymentId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Se requiere orderId o paymentId" } },
        { status: 400 }
      );
    }

    // 3. GENERAR QR DE PAGO O PIX INTEROPERABLE (Fase 7)
    if (data.action === "GENERATE_QR_PAYMENT" && order) {
      const amountToPay = Math.max(0, order.totalCents - order.paidCents);
      const method = data.paymentMethod === "PIX" ? "PIX" : "QR_PAYMENT";
      const provider = method === "PIX" ? "PIX_INTEROPERABLE" : data.provider || "SIPAP_QR";
      const txCode = `QR-${order.orderNumber.replace("PED-", "")}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
      const qrPayload = `00020126580014PY.GOV.BCP.SIPAP0114${order.venueId.slice(
        0,
        12
      )}520458125303600540${amountToPay}5802PY5915VIDJSPRO_GASTRO6008ASUNCION62180514${
        order.orderNumber
      }6304${txCode.slice(-4)}`;
      const qrImageUrl = await generateQrDataUrl(qrPayload);
      const validSignature = computeWebhookHmac(txCode, amountToPay);

      const payment = await prisma.gastroPayment.create({
        data: {
          tenantId,
          venueId: order.venueId,
          orderId: order.id,
          tableSessionId: order.tableSessionId,
          transactionCode: txCode,
          orderNumber: order.orderNumber,
          paymentMethod: method,
          paymentModality: "FULL",
          amountCents: amountToPay,
          currency: "PYG",
          provider,
          qrPayload,
          qrImageUrl,
          qrExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: "PROCESSING",
          cashierUserId: session.sub,
          cashierName: session.name,
        },
      });

      return NextResponse.json({
        success: true,
        payment,
        webhookVerificationToken: validSignature,
      });
    }

    // 4. CONFIRMACIÓN DE PAGO EN CAJA (EFECTIVO, TARJETA, TRANSFERENCIA) O WEBHOOK FIRMADO QR/PIX
    if (
      data.action === "CONFIRM_CASH_PAYMENT" ||
      data.action === "CONFIRM_CARD_PAYMENT" ||
      data.action === "CONFIRM_TRANSFER_PAYMENT" ||
      data.action === "WEBHOOK_QR_CONFIRMATION"
    ) {
      let targetPayment = data.paymentId
        ? await prisma.gastroPayment.findFirst({ where: { id: data.paymentId, tenantId } })
        : order?.payments.find((p) => p.status === "PENDING" || p.status === "PROCESSING") || null;

      const targetOrder =
        order ||
        (targetPayment?.orderId
          ? await prisma.gastroOrder.findUnique({
              where: { id: targetPayment.orderId },
              include: { items: true },
            })
          : null);

      if (!targetOrder) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Pedido asociado no encontrado" } },
          { status: 404 }
        );
      }

      const remainingOrderBalance = Math.max(0, targetOrder.totalCents - targetOrder.paidCents);
      const paymentAmount =
        data.amountCents && data.amountCents > 0 ? data.amountCents : remainingOrderBalance;

      // REGLA OBLIGATORIA FASE 7:
      // La confirmación automática de QR/PIX debe realizarse mediante webhook firmado y validación del proveedor.
      // Nunca confirmar pagos solamente por una imagen, captura o mensaje del cliente.
      if (data.action === "WEBHOOK_QR_CONFIRMATION") {
        if (!targetPayment) {
          return NextResponse.json(
            { error: { code: "NOT_FOUND", message: "Transacción QR no encontrada" } },
            { status: 404 }
          );
        }
        const expectedSig = computeWebhookHmac(
          targetPayment.transactionCode,
          targetPayment.amountCents
        );
        if (!data.webhookSignature || data.webhookSignature !== expectedSig) {
          return NextResponse.json(
            {
              error: {
                code: "INVALID_WEBHOOK_SIGNATURE",
                message:
                  "Seguridad: Firma criptográfica del webhook inválida o ausente. Nunca se confirman pagos digitales sin firma del proveedor.",
              },
            },
            { status: 401 }
          );
        }
      }

      const method =
        data.action === "CONFIRM_CASH_PAYMENT"
          ? "CASH"
          : data.action === "CONFIRM_CARD_PAYMENT"
          ? data.paymentMethod === "CREDIT_CARD"
            ? "CREDIT_CARD"
            : "DEBIT_CARD"
          : data.action === "CONFIRM_TRANSFER_PAYMENT"
          ? "BANK_TRANSFER"
          : targetPayment?.paymentMethod || "QR_PAYMENT";

      const receivedAmount =
        method === "CASH"
          ? Math.max(paymentAmount, data.receivedAmountCents || paymentAmount)
          : paymentAmount;
      const changeAmount = method === "CASH" ? Math.max(0, receivedAmount - paymentAmount) : 0;

      const txResult = await prisma.$transaction(async (tx) => {
        // Buscar turno abierto si existe
        const openShift = await tx.gastroCashRegisterShift.findFirst({
          where: { tenantId, venueId: targetOrder.venueId, status: "OPEN" },
        });

        const txCode =
          targetPayment?.transactionCode ||
          `PAY-${targetOrder.orderNumber.replace("PED-", "")}-${Date.now()
            .toString(36)
            .slice(-4)
            .toUpperCase()}`;

        const newTotalPaid = targetOrder.paidCents + paymentAmount;
        const isOrderFullyPaid = newTotalPaid >= targetOrder.totalCents;
        const modality = isOrderFullyPaid ? "FULL" : "PARTIAL";

        let confirmedPayment;
        if (targetPayment) {
          confirmedPayment = await tx.gastroPayment.update({
            where: { id: targetPayment.id },
            data: {
              shiftId: openShift?.id || null,
              paymentMethod: method,
              paymentModality: modality,
              amountCents: paymentAmount,
              receivedAmountCents: receivedAmount,
              changeAmountCents: changeAmount,
              provider:
                data.provider ||
                (method === "CASH"
                  ? "CAJA_LOCAL"
                  : method.includes("CARD")
                  ? "POS_BANCARD"
                  : targetPayment.provider),
              providerReference:
                data.providerReference || `REF-${Date.now().toString(36).toUpperCase()}`,
              cardBrand: data.cardBrand || null,
              cardLast4: data.cardLast4 ? data.cardLast4.slice(-4) : null,
              webhookSignature: data.webhookSignature || null,
              webhookVerified: data.action === "WEBHOOK_QR_CONFIRMATION",
              status: isOrderFullyPaid ? "APPROVED" : "PARTIALLY_PAID",
              cashierUserId: session.sub,
              cashierName: session.name,
              confirmedAt: new Date(),
            },
          });
        } else {
          confirmedPayment = await tx.gastroPayment.create({
            data: {
              tenantId,
              venueId: targetOrder.venueId,
              orderId: targetOrder.id,
              tableSessionId: targetOrder.tableSessionId,
              shiftId: openShift?.id || null,
              transactionCode: txCode,
              orderNumber: targetOrder.orderNumber,
              paymentMethod: method,
              paymentModality: modality,
              amountCents: paymentAmount,
              receivedAmountCents: receivedAmount,
              changeAmountCents: changeAmount,
              provider: data.provider || "CAJA_LOCAL",
              providerReference:
                data.providerReference || `REF-${Date.now().toString(36).toUpperCase()}`,
              cardBrand: data.cardBrand || null,
              cardLast4: data.cardLast4 ? data.cardLast4.slice(-4) : null,
              status: isOrderFullyPaid ? "APPROVED" : "PARTIALLY_PAID",
              cashierUserId: session.sub,
              cashierName: session.name,
              confirmedAt: new Date(),
            },
          });
        }

        // Actualizar acumulados del turno de caja
        if (openShift) {
          await tx.gastroCashRegisterShift.update({
            where: { id: openShift.id },
            data: {
              totalSalesCents: openShift.totalSalesCents + paymentAmount,
              ...(method === "CASH"
                ? {
                    cashSalesCents: openShift.cashSalesCents + paymentAmount,
                    expectedCashCents: openShift.expectedCashCents + paymentAmount,
                  }
                : {}),
              ...(method === "DEBIT_CARD"
                ? { debitCardSalesCents: openShift.debitCardSalesCents + paymentAmount }
                : {}),
              ...(method === "CREDIT_CARD"
                ? { creditCardSalesCents: openShift.creditCardSalesCents + paymentAmount }
                : {}),
              ...(method === "BANK_TRANSFER"
                ? { transferSalesCents: openShift.transferSalesCents + paymentAmount }
                : {}),
              ...(method === "QR_PAYMENT"
                ? { qrSalesCents: openShift.qrSalesCents + paymentAmount }
                : {}),
              ...(method === "PIX"
                ? { pixSalesCents: openShift.pixSalesCents + paymentAmount }
                : {}),
            },
          });
        }

        // Actualizar el Pedido: autorizar procesamiento en Barra y Cocina al aprobar pago (Fase 7)
        const nextOrderState =
          targetOrder.status === "RECEIVED" || targetOrder.status === "PENDING_PAYMENT"
            ? isOrderFullyPaid
              ? "PAYMENT_CONFIRMED"
              : "PENDING_PAYMENT"
            : targetOrder.status;

        const nextBarState =
          targetOrder.hasBarItems &&
          (targetOrder.barStatus === "RECEIVED" || targetOrder.barStatus === "PENDING_PAYMENT")
            ? isOrderFullyPaid
              ? "PAYMENT_CONFIRMED"
              : "PENDING_PAYMENT"
            : targetOrder.barStatus;

        const nextKitchenState =
          targetOrder.hasKitchenItems &&
          (targetOrder.kitchenStatus === "RECEIVED" ||
            targetOrder.kitchenStatus === "PENDING_PAYMENT")
            ? isOrderFullyPaid
              ? "PAYMENT_CONFIRMED"
              : "PENDING_PAYMENT"
            : targetOrder.kitchenStatus;

        const updatedOrder = await tx.gastroOrder.update({
          where: { id: targetOrder.id },
          data: {
            paidCents: newTotalPaid,
            paymentStatus: isOrderFullyPaid ? "APPROVED" : "PARTIALLY_PAID",
            paymentMethodSelected: method,
            status: nextOrderState,
            barStatus: nextBarState,
            kitchenStatus: nextKitchenState,
            ...(data.customerName ? { customerName: data.customerName } : {}),
            ...(data.customerTaxId ? { customerTaxId: data.customerTaxId } : {}),
            paymentConfirmedAt: isOrderFullyPaid ? new Date() : targetOrder.paymentConfirmedAt,
          },
          include: { items: true },
        });

        // Actualizar saldo de la sesión de mesa si existe
        if (targetOrder.tableSessionId) {
          const ts = await tx.gastroTableSession.findUnique({
            where: { id: targetOrder.tableSessionId },
          });
          if (ts) {
            const nextSessionPaid = ts.paidCents + paymentAmount;
            const nextSessionBalance = Math.max(0, ts.totalCents - nextSessionPaid);
            await tx.gastroTableSession.update({
              where: { id: ts.id },
              data: {
                paidCents: nextSessionPaid,
                balanceCents: nextSessionBalance,
              },
            });
          }
        }

        // FASE 11 FUNDAMENTAL:
        // Cada pedido confirmado y cobrado debe generar un registro comercial en VENTAS PENDIENTES DE FACTURACIÓN
        // Sin duplicar ventas (usando sourceUniqueId inmutable 1:1 con order.id)
        let pendingInvoiceSale = null;
        if (isOrderFullyPaid) {
          const sourceUniqueId = `SRC-GASTRO-${targetOrder.tenantId.slice(-6)}-${targetOrder.id}`;
          const existingSale = await tx.gastroPendingInvoiceSale.findUnique({
            where: { sourceUniqueId },
          });

          if (!existingSale) {
            const countSales = await tx.gastroPendingInvoiceSale.count({ where: { tenantId } });
            const saleNumber = `VTA-${String(countSales + 1001).padStart(6, "0")}`;

            pendingInvoiceSale = await tx.gastroPendingInvoiceSale.create({
              data: {
                tenantId,
                venueId: targetOrder.venueId,
                orderId: targetOrder.id,
                saleNumber,
                sourceUniqueId,
                orderNumber: targetOrder.orderNumber,
                tableLabel: targetOrder.tableLabel,
                sectorName: targetOrder.sectorName,
                customerName:
                  data.customerName || targetOrder.customerName || "Consumidor Final",
                customerTaxId: data.customerTaxId || targetOrder.customerTaxId || "44444401-7",
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
                totalCents: updatedOrder.totalCents,
                currency: "PYG",
                paymentMethod: method,
                paymentReference: confirmedPayment.providerReference || confirmedPayment.transactionCode,
                invoicingStatus: "PENDING_INVOICING",
              },
            });
          } else {
            pendingInvoiceSale = existingSale;
          }
        }

        await tx.auditLog.create({
          data: {
            tenantId,
            userId: session.sub,
            action: "GASTRO_PAYMENT_CONFIRMED",
            resource: "GASTRO_PAYMENT",
            resourceId: confirmedPayment.id,
            metadata: JSON.stringify({
              orderNumber: updatedOrder.orderNumber,
              paymentMethod: method,
              amountCents: paymentAmount,
              receivedAmountCents: receivedAmount,
              changeAmountCents: changeAmount,
              cashierName: session.name,
              saleGenerated: pendingInvoiceSale?.saleNumber || null,
            }),
          },
        });

        return {
          confirmedPayment,
          updatedOrder,
          pendingInvoiceSale,
        };
      });

      // Emitir notificaciones en tiempo real a Barra, Cocina y Cliente (Fase 13)
      realtimeBus.broadcast("global", "GASTRO_PAYMENT_CONFIRMED", {
        orderId: txResult.updatedOrder.id,
        orderNumber: txResult.updatedOrder.orderNumber,
        tableLabel: txResult.updatedOrder.tableLabel,
        paymentMethod: method,
        amountCents: txResult.confirmedPayment.amountCents,
        saleNumber: txResult.pendingInvoiceSale?.saleNumber || null,
      });

      realtimeBus.broadcast("global", "GASTRO_ORDER_UPDATED", {
        orderId: txResult.updatedOrder.id,
        orderNumber: txResult.updatedOrder.orderNumber,
        status: txResult.updatedOrder.status,
        paymentStatus: txResult.updatedOrder.paymentStatus,
      });

      return NextResponse.json({
        success: true,
        payment: txResult.confirmedPayment,
        order: txResult.updatedOrder,
        pendingInvoiceSale: txResult.pendingInvoiceSale,
      });
    }

    // 5. RECHAZO DE PAGO (Fase 7 y 13)
    if (data.action === "REJECT_PAYMENT") {
      const targetPayment = data.paymentId
        ? await prisma.gastroPayment.findFirst({ where: { id: data.paymentId, tenantId } })
        : order?.payments[0] || null;

      if (!targetPayment && !order) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Pago o pedido no encontrado" } },
          { status: 404 }
        );
      }

      let updatedPayment = targetPayment;
      if (targetPayment) {
        updatedPayment = await prisma.gastroPayment.update({
          where: { id: targetPayment.id },
          data: {
            status: "REJECTED",
            rejectionReason: data.reason || "Transacción rechazada",
            cashierUserId: session.sub,
            cashierName: session.name,
          },
        });
      }

      const targetOrderId = order?.id || targetPayment?.orderId;
      if (targetOrderId) {
        await prisma.gastroOrder.update({
          where: { id: targetOrderId },
          data: { paymentStatus: "REJECTED" },
        });
      }

      realtimeBus.broadcast("global", "GASTRO_PAYMENT_REJECTED", {
        orderId: targetOrderId,
        paymentId: targetPayment?.id,
        reason: data.reason || "Transacción rechazada",
      });

      return NextResponse.json({ success: true, payment: updatedPayment });
    }

    // 6. REEMBOLSO DE PAGO (Fase 7 y 19)
    if (data.action === "REFUND_PAYMENT") {
      const targetPayment = data.paymentId
        ? await prisma.gastroPayment.findFirst({ where: { id: data.paymentId, tenantId } })
        : order?.payments.find((p) => p.status === "APPROVED") || null;

      if (!targetPayment) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "No se encontró un pago aprobado para reembolsar" } },
          { status: 404 }
        );
      }

      const refunded = await prisma.$transaction(async (tx) => {
        const p = await tx.gastroPayment.update({
          where: { id: targetPayment.id },
          data: {
            status: "REFUNDED",
            refundedAt: new Date(),
            refundReason: data.reason || "Reembolso autorizado en Caja",
            cashierUserId: session.sub,
            cashierName: session.name,
          },
        });

        if (p.orderId) {
          await tx.gastroOrder.update({
            where: { id: p.orderId },
            data: {
              paymentStatus: "REFUNDED",
              paidCents: 0,
            },
          });

          // Si existía una venta pendiente de facturación aún no facturada, anularla
          await tx.gastroPendingInvoiceSale.updateMany({
            where: {
              orderId: p.orderId,
              invoicingStatus: { in: ["PENDING_INVOICING", "INTEGRATION_ERROR"] },
            },
            data: {
              invoicingStatus: "VOIDED",
              voidedReason: `Reembolso de pago: ${data.reason || "Autorizado"}`,
              voidedByName: session.name,
              voidedAt: new Date(),
            },
          });
        }

        if (p.shiftId) {
          const shift = await tx.gastroCashRegisterShift.findUnique({ where: { id: p.shiftId } });
          if (shift && shift.status === "OPEN") {
            await tx.gastroCashRegisterShift.update({
              where: { id: shift.id },
              data: {
                refundsCents: shift.refundsCents + p.amountCents,
                expectedCashCents:
                  p.paymentMethod === "CASH"
                    ? Math.max(0, shift.expectedCashCents - p.amountCents)
                    : shift.expectedCashCents,
              },
            });
          }
        }

        await tx.auditLog.create({
          data: {
            tenantId,
            userId: session.sub,
            action: "GASTRO_PAYMENT_REFUNDED",
            resource: "GASTRO_PAYMENT",
            resourceId: p.id,
            metadata: JSON.stringify({
              transactionCode: p.transactionCode,
              amountCents: p.amountCents,
              reason: data.reason,
              refundedBy: session.name,
            }),
          },
        });

        return p;
      });

      realtimeBus.broadcast("global", "GASTRO_ORDER_UPDATED", {
        orderId: refunded.orderId,
        paymentStatus: "REFUNDED",
      });

      return NextResponse.json({ success: true, payment: refunded });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
