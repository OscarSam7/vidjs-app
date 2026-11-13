import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission, hasAnyPermission } from "@/lib/rbac/permissions";
import { handleApiError, ForbiddenError, BadRequestError, NotFoundError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const cancelOperationSchema = z.object({
  orderId: z.string().min(1, "ID de pedido requerido"),
  operationType: z.enum(["CANCEL_UNPAID", "ANNUL_PAID_SALE"]),
  reason: z.string().min(3, "El motivo debe tener al menos 3 caracteres"),
  restoreStock: z.boolean().default(true),
  permanentDelete: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();

    const canManageOrders =
      hasAnyPermission(session.role, [
        PERMISSIONS.GASTRO_ORDERS_MANAGE,
        PERMISSIONS.GASTRO_CASHIER_OPERATE,
        PERMISSIONS.GASTRO_PAYMENTS_MANAGE,
        PERMISSIONS.GASTRO_BAR_MANAGE,
        PERMISSIONS.GASTRO_KITCHEN_MANAGE,
      ]) || ["OWNER", "SUPER_ADMIN", "MANAGER", "ADMINISTRADOR", "GERENTE", "CAJERO"].includes(session.role);

    if (!canManageOrders) {
      throw new ForbiddenError("No tienes permisos para cancelar pedidos o anular ventas");
    }

    const body = await req.json();
    const data = cancelOperationSchema.parse(body);

    const order = await prisma.gastroOrder.findFirst({
      where: { id: data.orderId, tenantId },
      include: {
        items: true,
        payments: true,
        pendingInvoiceSale: true,
      },
    });

    if (!order) {
      throw new NotFoundError("El pedido no existe o pertenece a otro local");
    }

    if (order.status === "CANCELLED") {
      throw new BadRequestError("Este pedido ya se encuentra cancelado o anulado previamente.");
    }

    // =========================================================================
    // CASO 1: ANULAR VENTA YA COBRADA / PASADA POR CAJA
    // =========================================================================
    if (data.operationType === "ANNUL_PAID_SALE") {
      // Requerir rol de Caja, Gerente o Administrador para anular cobros
      const canAnnulSales =
        hasAnyPermission(session.role, [
          PERMISSIONS.GASTRO_CASHIER_OPERATE,
          PERMISSIONS.GASTRO_PAYMENTS_MANAGE,
        ]) || ["OWNER", "SUPER_ADMIN", "MANAGER", "ADMINISTRADOR", "GERENTE", "CAJERO"].includes(session.role);

      if (!canAnnulSales) {
        throw new ForbiddenError("Se requieren permisos de Caja o Administración para anular ventas cobradas");
      }

      const txResult = await prisma.$transaction(async (tx) => {
        // 1. Reembolsar / anular todos los pagos aprobados
        const approvedPayments = order.payments.filter(
          (p) => p.status === "APPROVED" || p.status === "PARTIALLY_PAID"
        );

        for (const payment of approvedPayments) {
          await tx.gastroPayment.update({
            where: { id: payment.id },
            data: {
              status: "REFUNDED",
              refundedAt: new Date(),
              refundReason: `Venta anulada: ${data.reason.trim()}`,
              cashierUserId: session.sub,
              cashierName: session.name,
            },
          });

          // Ajustar arqueo del turno de caja si está abierto
          if (payment.shiftId) {
            const shift = await tx.gastroCashRegisterShift.findUnique({
              where: { id: payment.shiftId },
            });
            if (shift && shift.status === "OPEN") {
              await tx.gastroCashRegisterShift.update({
                where: { id: shift.id },
                data: {
                  refundsCents: shift.refundsCents + payment.amountCents,
                  ...(payment.paymentMethod === "CASH"
                    ? {
                        expectedCashCents: Math.max(0, shift.expectedCashCents - payment.amountCents),
                      }
                    : {}),
                },
              });
            }
          }
        }

        // 2. Anular ventas pendientes de facturación si las hubiere
        await tx.gastroPendingInvoiceSale.updateMany({
          where: {
            orderId: order.id,
            invoicingStatus: { in: ["PENDING_INVOICING", "INTEGRATION_ERROR"] },
          },
          data: {
            invoicingStatus: "VOIDED",
            voidedReason: `Venta cobrada anulada por ${session.name}: ${data.reason.trim()}`,
            voidedByName: session.name,
            voidedAt: new Date(),
          },
        });

        // 3. Reversar inventario si data.restoreStock es true
        if (data.restoreStock) {
          for (const item of order.items) {
            const prod = await tx.gastroProduct.findUnique({
              where: { id: item.productId },
            });
            if (prod && prod.trackInventory) {
              const restoredStock = prod.stockQuantity + item.quantity;
              await tx.gastroProduct.update({
                where: { id: prod.id },
                data: {
                  stockQuantity: restoredStock,
                  ...(prod.availabilityStatus === "AUTO_EXHAUSTED" && restoredStock > 0
                    ? { availabilityStatus: "AVAILABLE" }
                    : {}),
                },
              });

              await tx.gastroInventoryMovement.create({
                data: {
                  tenantId,
                  venueId: order.venueId,
                  productId: prod.id,
                  movementType: "CANCEL_RESTORE",
                  quantityDelta: item.quantity,
                  previousStock: prod.stockQuantity,
                  newStock: restoredStock,
                  reason: `Reintegro por venta anulada de ${order.orderNumber}: ${data.reason.trim()}`,
                  orderId: order.id,
                  performedById: session.sub,
                  performedByName: session.name,
                  performedByRole: session.role,
                },
              });
            }
          }
        }

        // 4. Actualizar sesión de mesa si existe
        if (order.tableSessionId) {
          const ts = await tx.gastroTableSession.findUnique({
            where: { id: order.tableSessionId },
          });
          if (ts) {
            const newPaid = Math.max(0, ts.paidCents - order.paidCents);
            const newTotal = Math.max(0, ts.totalCents - order.totalCents);
            const newBalance = Math.max(0, newTotal - newPaid);

            await tx.gastroTableSession.update({
              where: { id: ts.id },
              data: {
                paidCents: newPaid,
                totalCents: newTotal,
                balanceCents: newBalance,
              },
            });
          }
        }

        // 5. Marcar el pedido como CANCELLED / REFUNDED
        const updatedOrder = await tx.gastroOrder.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            barStatus: order.hasBarItems ? "CANCELLED" : "NONE",
            kitchenStatus: order.hasKitchenItems ? "CANCELLED" : "NONE",
            paymentStatus: "REFUNDED",
            paidCents: 0,
            cancelReason: `Venta anulada por ${session.name}: ${data.reason.trim()}`,
            cancelledByName: session.name,
            cancelledAt: new Date(),
          },
          include: {
            items: true,
            payments: true,
          },
        });

        // 6. Auditoría
        await tx.auditLog.create({
          data: {
            tenantId,
            userId: session.sub,
            action: "GASTRO_SALE_ANNULLED",
            resource: "GASTRO_ORDER",
            resourceId: order.id,
            metadata: JSON.stringify({
              orderNumber: order.orderNumber,
              tableLabel: order.tableLabel,
              totalCents: order.totalCents,
              paidCents: order.paidCents,
              reason: data.reason.trim(),
              restoreStock: data.restoreStock,
              annulledBy: session.name,
              role: session.role,
            }),
          },
        });

        return updatedOrder;
      });

      // Emisión de eventos en tiempo real
      realtimeBus.broadcast("global", "GASTRO_ORDER_UPDATED", {
        orderId: txResult.id,
        orderNumber: txResult.orderNumber,
        status: "CANCELLED",
        paymentStatus: "REFUNDED",
      });

      realtimeBus.broadcast("global", "GASTRO_PAYMENT_REFUNDED", {
        orderId: txResult.id,
        orderNumber: txResult.orderNumber,
        reason: data.reason.trim(),
      });

      return NextResponse.json({
        success: true,
        message: "Venta anulada exitosamente en Caja. Se reintegraron los importes y el stock seleccionado.",
        order: txResult,
        mode: "ANNULLED",
      });
    }

    // =========================================================================
    // CASO 2: BORRAR O CANCELAR PEDIDO NO PAGADO
    // =========================================================================
    if (data.operationType === "CANCEL_UNPAID") {
      if (order.paidCents > 0 && order.paymentStatus === "APPROVED") {
        throw new BadRequestError(
          "El pedido ya tiene cobros registrados en caja. Debes usar la opción 'Anular Venta Realizada'."
        );
      }

      const txResult = await prisma.$transaction(async (tx) => {
        // 1. Restaurar stock de productos si el pedido ya había reservado o descontado
        if (data.restoreStock) {
          for (const item of order.items) {
            const prod = await tx.gastroProduct.findUnique({
              where: { id: item.productId },
            });
            if (prod && prod.trackInventory) {
              const restoredStock = prod.stockQuantity + item.quantity;
              await tx.gastroProduct.update({
                where: { id: prod.id },
                data: {
                  stockQuantity: restoredStock,
                  ...(prod.availabilityStatus === "AUTO_EXHAUSTED" && restoredStock > 0
                    ? { availabilityStatus: "AVAILABLE" }
                    : {}),
                },
              });

              await tx.gastroInventoryMovement.create({
                data: {
                  tenantId,
                  venueId: order.venueId,
                  productId: prod.id,
                  movementType: "CANCEL_RESTORE",
                  quantityDelta: item.quantity,
                  previousStock: prod.stockQuantity,
                  newStock: restoredStock,
                  reason: `Devolución por cancelación de pedido no pagado ${order.orderNumber}: ${data.reason.trim()}`,
                  orderId: order.id,
                  performedById: session.sub,
                  performedByName: session.name,
                  performedByRole: session.role,
                },
              });
            }
          }
        }

        // 2. Eliminar transacciones de pago pendientes que no hayan sido aprobadas
        await tx.gastroPayment.deleteMany({
          where: {
            orderId: order.id,
            status: { in: ["PENDING", "REJECTED"] },
          },
        });

        // 3. Ajustar o restar el total de la sesión de mesa
        if (order.tableSessionId) {
          const ts = await tx.gastroTableSession.findUnique({
            where: { id: order.tableSessionId },
          });
          if (ts) {
            const newTotal = Math.max(0, ts.totalCents - order.totalCents);
            const newBalance = Math.max(0, newTotal - ts.paidCents);
            await tx.gastroTableSession.update({
              where: { id: ts.id },
              data: {
                totalCents: newTotal,
                balanceCents: newBalance,
              },
            });
          }
        }

        // 4. Si se solicitó borrado permanente y no tiene dependencias de facturación
        if (data.permanentDelete) {
          // Eliminar items y pedido
          await tx.gastroOrderItem.deleteMany({
            where: { orderId: order.id },
          });

          await tx.gastroOrder.delete({
            where: { id: order.id },
          });

          await tx.auditLog.create({
            data: {
              tenantId,
              userId: session.sub,
              action: "GASTRO_ORDER_DELETED",
              resource: "GASTRO_ORDER",
              resourceId: order.id,
              metadata: JSON.stringify({
                orderNumber: order.orderNumber,
                tableLabel: order.tableLabel,
                totalCents: order.totalCents,
                reason: data.reason.trim(),
                deletedBy: session.name,
                role: session.role,
              }),
            },
          });

          return { id: order.id, orderNumber: order.orderNumber, mode: "DELETED" };
        }

        // Si no es borrado permanente, marcar como CANCELLED
        const updatedOrder = await tx.gastroOrder.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            barStatus: order.hasBarItems ? "CANCELLED" : "NONE",
            kitchenStatus: order.hasKitchenItems ? "CANCELLED" : "NONE",
            cancelReason: `Cancelado por ${session.name}: ${data.reason.trim()}`,
            cancelledByName: session.name,
            cancelledAt: new Date(),
          },
          include: {
            items: true,
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            userId: session.sub,
            action: "GASTRO_ORDER_CANCELLED",
            resource: "GASTRO_ORDER",
            resourceId: order.id,
            metadata: JSON.stringify({
              orderNumber: order.orderNumber,
              tableLabel: order.tableLabel,
              totalCents: order.totalCents,
              reason: data.reason.trim(),
              cancelledBy: session.name,
              role: session.role,
            }),
          },
        });

        return { ...updatedOrder, mode: "CANCELLED" };
      });

      // Emisión de eventos en tiempo real
      realtimeBus.broadcast("global", "GASTRO_ORDER_UPDATED", {
        orderId: txResult.id,
        orderNumber: txResult.orderNumber,
        status: "CANCELLED",
      });

      return NextResponse.json({
        success: true,
        message:
          data.permanentDelete
            ? `Pedido ${order.orderNumber} eliminado permanentemente con reintegro de existencias.`
            : `Pedido ${order.orderNumber} cancelado correctamente por motivo: "${data.reason.trim()}".`,
        order: txResult,
        mode: txResult.mode,
      });
    }

    throw new BadRequestError("Tipo de operación no admitido");
  } catch (error) {
    return handleApiError(error);
  }
}
