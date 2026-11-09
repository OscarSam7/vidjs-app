import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission, hasAnyPermission } from "@/lib/rbac/permissions";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const orderActionSchema = z.object({
  orderId: z.string().min(1),
  action: z.enum([
    // Acciones de Barra (Fase 4)
    "BAR_START_PREP",
    "BAR_MARK_READY",
    "BAR_NOTIFY_PICKUP",
    "BAR_REQUEST_WAITER",
    "BAR_MARK_DELIVERED",
    // Acciones de Cocina (Fase 5)
    "KITCHEN_CONFIRM_RECEIPT",
    "KITCHEN_START_PREP",
    "KITCHEN_MARK_READY",
    "KITCHEN_REQUEST_WAITER",
    "KITCHEN_ADMIN_DIRECT_DELIVERY",
    // Acciones de Mozos (Fase 6)
    "WAITER_ACCEPT_ORDER",
    "WAITER_PICKUP_BAR",
    "WAITER_PICKUP_KITCHEN",
    "WAITER_CONFIRM_DELIVERY",
    "WAITER_REJECT_ASSIGNMENT",
    "WAITER_REPORT_ISSUE",
    // Asignación manual por Supervisor / Admin
    "ASSIGN_WAITER_MANUAL",
    // Cambio de prioridad o cancelación
    "CHANGE_PRIORITY",
    "CANCEL_ORDER",
  ]),
  waiterId: z.string().optional(),
  waiterName: z.string().optional(),
  priority: z.enum(["NORMAL", "HIGH", "VIP"]).optional(),
  reason: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    const body = await req.json();
    const data = orderActionSchema.parse(body);

    const order = await prisma.gastroOrder.findFirst({
      where: { id: data.orderId, tenantId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Pedido no encontrado" } },
        { status: 404 }
      );
    }

    // 1. ACCIONES DE BARRA (Fase 4)
    if (data.action.startsWith("BAR_")) {
      if (
        !hasAnyPermission(session.role, [
          PERMISSIONS.GASTRO_BAR_OPERATE,
          PERMISSIONS.GASTRO_BAR_MANAGE,
          PERMISSIONS.GASTRO_ORDERS_MANAGE,
        ])
      ) {
        throw new ForbiddenError("No tienes permisos para operar el panel de Barra");
      }

      let nextBarStatus = order.barStatus;
      let nextOrderStatus = order.status;
      let nextWaiterRequestStatus = order.waiterRequestStatus;
      let waiterRequestedAt = order.waiterRequestedAt;
      let deliveredAt = order.deliveredAt;
      let deliveredByName = order.deliveredByName;

      if (data.action === "BAR_START_PREP") {
        nextBarStatus = "PREPARING";
        nextOrderStatus = "PREPARING";
      } else if (data.action === "BAR_MARK_READY") {
        nextBarStatus = "READY";
        if (!order.hasKitchenItems || order.kitchenStatus === "READY" || order.kitchenStatus === "DELIVERED") {
          nextOrderStatus = "READY";
        }
      } else if (data.action === "BAR_NOTIFY_PICKUP") {
        nextBarStatus = "WAITING_PICKUP";
        nextOrderStatus = "WAITING_PICKUP";
      } else if (data.action === "BAR_REQUEST_WAITER") {
        nextBarStatus = "WAITING_WAITER";
        nextOrderStatus = "WAITING_WAITER";
        nextWaiterRequestStatus = "REQUESTED";
        waiterRequestedAt = new Date();
      } else if (data.action === "BAR_MARK_DELIVERED") {
        // Permitido en Retiro en Barra o cuando ya fue retirado
        nextBarStatus = "DELIVERED";
        if (!order.hasKitchenItems || order.kitchenStatus === "DELIVERED") {
          nextOrderStatus = "DELIVERED";
          deliveredAt = new Date();
          deliveredByName = session.name;
        }
      }

      const updated = await prisma.gastroOrder.update({
        where: { id: order.id },
        data: {
          barStatus: nextBarStatus,
          status: nextOrderStatus,
          waiterRequestStatus: nextWaiterRequestStatus,
          waiterRequestedAt,
          ...(data.action === "BAR_START_PREP" && !order.prepStartedAt ? { prepStartedAt: new Date() } : {}),
          ...(data.action === "BAR_MARK_READY" ? { readyAt: new Date() } : {}),
          deliveredAt,
          deliveredByName,
        },
        include: { items: true },
      });

      if (data.action === "BAR_MARK_READY" || data.action === "BAR_NOTIFY_PICKUP") {
        realtimeBus.broadcast("global", "GASTRO_ORDER_PREPARED", {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          station: "BAR",
          tableLabel: updated.tableLabel,
          deliveryMode: updated.deliveryMode,
        });
      }
      if (data.action === "BAR_REQUEST_WAITER") {
        realtimeBus.broadcast("global", "GASTRO_WAITER_REQUESTED", {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          station: "BAR",
          tableLabel: updated.tableLabel,
          sectorName: updated.sectorName,
          priority: updated.priority,
        });
      }
      if (data.action === "BAR_MARK_DELIVERED") {
        realtimeBus.broadcast("global", "GASTRO_ORDER_DELIVERED", {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          tableLabel: updated.tableLabel,
          deliveredBy: session.name,
        });
      }
      realtimeBus.broadcast("global", "GASTRO_ORDER_UPDATED", {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
        barStatus: updated.barStatus,
      });

      return NextResponse.json({ success: true, order: updated });
    }

    // 2. ACCIONES DE COCINA (Fase 5)
    if (data.action.startsWith("KITCHEN_")) {
      if (
        !hasAnyPermission(session.role, [
          PERMISSIONS.GASTRO_KITCHEN_OPERATE,
          PERMISSIONS.GASTRO_KITCHEN_MANAGE,
          PERMISSIONS.GASTRO_ORDERS_MANAGE,
        ])
      ) {
        throw new ForbiddenError("No tienes permisos para operar el panel de Cocina");
      }

      // REGLA OBLIGATORIA FASE 5:
      // La cocina no debe entregar directamente al cliente ni cerrar una entrega sin que quede registrada la intervención del mozo,
      // salvo que el administrador autorice una excepción.
      if (data.action === "KITCHEN_ADMIN_DIRECT_DELIVERY") {
        const isAdmin =
          session.role === "SUPER_ADMIN" ||
          session.role === "OWNER" ||
          session.role === "ADMINISTRADOR";

        const deliveryCfg = await prisma.gastroDeliveryConfig.findUnique({
          where: { venueId: order.venueId },
        });

        if (!isAdmin && !deliveryCfg?.allowKitchenDirectDeliveryException) {
          throw new ForbiddenError(
            "Regla Operativa: La cocina no puede entregar directamente al cliente ni cerrar una entrega sin intervención registrada de un mozo. Presiona 'SOLICITAR MOZO'."
          );
        }
      }

      let nextKitchenStatus = order.kitchenStatus;
      let nextOrderStatus = order.status;
      let nextWaiterRequestStatus = order.waiterRequestStatus;
      let waiterRequestedAt = order.waiterRequestedAt;
      let deliveredAt = order.deliveredAt;
      let deliveredByName = order.deliveredByName;

      if (data.action === "KITCHEN_CONFIRM_RECEIPT") {
        nextKitchenStatus = order.paymentStatus === "APPROVED" ? "PAYMENT_CONFIRMED" : "RECEIVED";
      } else if (data.action === "KITCHEN_START_PREP") {
        nextKitchenStatus = "PREPARING";
        nextOrderStatus = "PREPARING";
      } else if (data.action === "KITCHEN_MARK_READY") {
        nextKitchenStatus = "READY";
        if (!order.hasBarItems || order.barStatus === "READY" || order.barStatus === "DELIVERED") {
          nextOrderStatus = "READY";
        }
      } else if (data.action === "KITCHEN_REQUEST_WAITER") {
        nextKitchenStatus = "REQUESTING_WAITER";
        nextOrderStatus = "WAITING_WAITER";
        nextWaiterRequestStatus = "REQUESTED";
        waiterRequestedAt = new Date();
      } else if (data.action === "KITCHEN_ADMIN_DIRECT_DELIVERY") {
        nextKitchenStatus = "DELIVERED";
        if (!order.hasBarItems || order.barStatus === "DELIVERED") {
          nextOrderStatus = "DELIVERED";
          deliveredAt = new Date();
          deliveredByName = `${session.name} (Excepción Admin)`;
        }
      }

      const updated = await prisma.gastroOrder.update({
        where: { id: order.id },
        data: {
          kitchenStatus: nextKitchenStatus,
          status: nextOrderStatus,
          waiterRequestStatus: nextWaiterRequestStatus,
          waiterRequestedAt,
          ...(data.action === "KITCHEN_START_PREP" && !order.prepStartedAt ? { prepStartedAt: new Date() } : {}),
          ...(data.action === "KITCHEN_MARK_READY" ? { readyAt: new Date() } : {}),
          deliveredAt,
          deliveredByName,
        },
        include: { items: true },
      });

      if (data.action === "KITCHEN_MARK_READY") {
        realtimeBus.broadcast("global", "GASTRO_ORDER_PREPARED", {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          station: "KITCHEN",
          tableLabel: updated.tableLabel,
        });
      }
      if (data.action === "KITCHEN_REQUEST_WAITER") {
        realtimeBus.broadcast("global", "GASTRO_WAITER_REQUESTED", {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          station: "KITCHEN",
          tableLabel: updated.tableLabel,
          sectorName: updated.sectorName,
          priority: updated.priority,
        });
      }
      realtimeBus.broadcast("global", "GASTRO_ORDER_UPDATED", {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
        kitchenStatus: updated.kitchenStatus,
      });

      return NextResponse.json({ success: true, order: updated });
    }

    // 3. ACCIONES DE MOZOS (Fase 6) - Bloqueo optimista contra aceptación simultánea
    if (data.action.startsWith("WAITER_") || data.action === "ASSIGN_WAITER_MANUAL") {
      if (
        !hasAnyPermission(session.role, [
          PERMISSIONS.GASTRO_WAITERS_OPERATE,
          PERMISSIONS.GASTRO_WAITERS_MANAGE,
          PERMISSIONS.GASTRO_ORDERS_MANAGE,
        ])
      ) {
        throw new ForbiddenError("No tienes permisos para operar asignaciones de mozos");
      }

      const targetWaiterId = data.waiterId || session.sub;
      const targetWaiterName = data.waiterName || session.name;

      if (data.action === "WAITER_ACCEPT_ORDER") {
        // PREVENCIÓN DE CONCURRENCIA OBLIGATORIA (Fase 6 y 19):
        // Evitar que dos mozos acepten simultáneamente el mismo pedido.
        const atomicAccept = await prisma.gastroOrder.updateMany({
          where: {
            id: order.id,
            tenantId,
            OR: [{ assignedWaiterId: null }, { assignedWaiterId: targetWaiterId }],
          },
          data: {
            assignedWaiterId: targetWaiterId,
            assignedWaiterName: targetWaiterName,
            waiterRequestStatus: "ACCEPTED",
            waiterAcceptedAt: new Date(),
          },
        });

        if (atomicAccept.count === 0) {
          const currentOrder = await prisma.gastroOrder.findUnique({ where: { id: order.id } });
          return NextResponse.json(
            {
              error: {
                code: "CONCURRENT_WAITER_CONFLICT",
                message: `Este pedido ya fue aceptado hace un instante por ${
                  currentOrder?.assignedWaiterName || "otro mozo"
                }.`,
              },
            },
            { status: 409 }
          );
        }

        const updated = await prisma.gastroOrder.findUnique({
          where: { id: order.id },
          include: { items: true },
        });

        realtimeBus.broadcast("global", "GASTRO_ORDER_ACCEPTED_BY_WAITER", {
          orderId: order.id,
          orderNumber: order.orderNumber,
          waiterId: targetWaiterId,
          waiterName: targetWaiterName,
          tableLabel: order.tableLabel,
        });

        return NextResponse.json({ success: true, order: updated });
      }

      if (data.action === "ASSIGN_WAITER_MANUAL") {
        const updated = await prisma.gastroOrder.update({
          where: { id: order.id },
          data: {
            assignedWaiterId: targetWaiterId,
            assignedWaiterName: targetWaiterName,
            waiterRequestStatus: "ACCEPTED",
            waiterAcceptedAt: new Date(),
          },
          include: { items: true },
        });

        realtimeBus.broadcast("global", "GASTRO_ORDER_ACCEPTED_BY_WAITER", {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          waiterId: targetWaiterId,
          waiterName: targetWaiterName,
          tableLabel: updated.tableLabel,
        });

        return NextResponse.json({ success: true, order: updated });
      }

      if (data.action === "WAITER_PICKUP_BAR") {
        const updated = await prisma.gastroOrder.update({
          where: { id: order.id },
          data: {
            assignedWaiterId: order.assignedWaiterId || targetWaiterId,
            assignedWaiterName: order.assignedWaiterName || targetWaiterName,
            waiterRequestStatus: "PICKED_UP_BAR",
            pickedUpFromBarAt: new Date(),
          },
          include: { items: true },
        });
        realtimeBus.broadcast("global", "GASTRO_ORDER_UPDATED", {
          orderId: updated.id,
          waiterRequestStatus: updated.waiterRequestStatus,
        });
        return NextResponse.json({ success: true, order: updated });
      }

      if (data.action === "WAITER_PICKUP_KITCHEN") {
        const updated = await prisma.gastroOrder.update({
          where: { id: order.id },
          data: {
            assignedWaiterId: order.assignedWaiterId || targetWaiterId,
            assignedWaiterName: order.assignedWaiterName || targetWaiterName,
            waiterRequestStatus: "PICKED_UP_KITCHEN",
            pickedUpFromKitchenAt: new Date(),
          },
          include: { items: true },
        });
        realtimeBus.broadcast("global", "GASTRO_ORDER_UPDATED", {
          orderId: updated.id,
          waiterRequestStatus: updated.waiterRequestStatus,
        });
        return NextResponse.json({ success: true, order: updated });
      }

      if (data.action === "WAITER_CONFIRM_DELIVERY") {
        const updated = await prisma.gastroOrder.update({
          where: { id: order.id },
          data: {
            assignedWaiterId: order.assignedWaiterId || targetWaiterId,
            assignedWaiterName: order.assignedWaiterName || targetWaiterName,
            waiterRequestStatus: "DELIVERED",
            status: "DELIVERED",
            barStatus: order.hasBarItems ? "DELIVERED" : order.barStatus,
            kitchenStatus: order.hasKitchenItems ? "DELIVERED" : order.kitchenStatus,
            deliveredAt: new Date(),
            deliveredByName: order.assignedWaiterName || targetWaiterName,
          },
          include: { items: true },
        });

        await prisma.auditLog.create({
          data: {
            tenantId,
            userId: session.sub,
            action: "GASTRO_ORDER_DELIVERED_BY_WAITER",
            resource: "GASTRO_ORDER",
            resourceId: updated.id,
            metadata: JSON.stringify({
              orderNumber: updated.orderNumber,
              tableLabel: updated.tableLabel,
              waiterName: updated.deliveredByName,
            }),
          },
        });

        realtimeBus.broadcast("global", "GASTRO_ORDER_DELIVERED", {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          tableLabel: updated.tableLabel,
          waiterName: updated.deliveredByName,
        });

        return NextResponse.json({ success: true, order: updated });
      }

      if (data.action === "WAITER_REJECT_ASSIGNMENT") {
        if (!data.reason || data.reason.trim().length < 3) {
          return NextResponse.json(
            {
              error: {
                code: "JUSTIFICATION_REQUIRED",
                message: "Debes ingresar una justificación para rechazar la asignación del pedido.",
              },
            },
            { status: 400 }
          );
        }

        const existingLogs = order.rejectionLogsJson ? JSON.parse(order.rejectionLogsJson) : [];
        existingLogs.push({
          waiterId: session.sub,
          waiterName: session.name,
          reason: data.reason.trim(),
          timestamp: new Date().toISOString(),
        });

        const updated = await prisma.gastroOrder.update({
          where: { id: order.id },
          data: {
            assignedWaiterId: null,
            assignedWaiterName: null,
            waiterRequestStatus: "REQUESTED",
            waiterNotes: `Rechazado por ${session.name}: ${data.reason.trim()}`,
            rejectionLogsJson: JSON.stringify(existingLogs),
          },
          include: { items: true },
        });

        realtimeBus.broadcast("global", "GASTRO_WAITER_REQUESTED", {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          tableLabel: updated.tableLabel,
          reason: "REASSIGNED_AFTER_REJECTION",
        });

        return NextResponse.json({ success: true, order: updated });
      }

      if (data.action === "WAITER_REPORT_ISSUE") {
        const updated = await prisma.gastroOrder.update({
          where: { id: order.id },
          data: {
            waiterNotes: `[Inconveniente reportado por ${session.name}]: ${data.reason || "Sin detalle"}`,
          },
          include: { items: true },
        });
        realtimeBus.broadcast("global", "GASTRO_ORDER_UPDATED", {
          orderId: updated.id,
          waiterNotes: updated.waiterNotes,
        });
        return NextResponse.json({ success: true, order: updated });
      }
    }

    // 4. CAMBIO DE PRIORIDAD O CANCELACIÓN (Fase 4, 5, 16)
    if (data.action === "CHANGE_PRIORITY" && data.priority) {
      const updated = await prisma.gastroOrder.update({
        where: { id: order.id },
        data: { priority: data.priority },
        include: { items: true },
      });
      realtimeBus.broadcast("global", "GASTRO_ORDER_UPDATED", {
        orderId: updated.id,
        priority: updated.priority,
      });
      return NextResponse.json({ success: true, order: updated });
    }

    if (data.action === "CANCEL_ORDER") {
      if (
        !hasAnyPermission(session.role, [
          PERMISSIONS.GASTRO_ORDERS_MANAGE,
          PERMISSIONS.GASTRO_BAR_MANAGE,
          PERMISSIONS.GASTRO_KITCHEN_MANAGE,
        ])
      ) {
        throw new ForbiddenError("No tienes permisos para cancelar pedidos");
      }

      const updated = await prisma.$transaction(async (tx) => {
        // Restaurar stock de productos cancelados si aún no se habían entregado
        if (order.status !== "DELIVERED") {
          for (const item of order.items) {
            const prod = await tx.gastroProduct.findUnique({ where: { id: item.productId } });
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
                  reason: `Reintegro por cancelación de ${order.orderNumber}`,
                  orderId: order.id,
                  performedById: session.sub,
                  performedByName: session.name,
                  performedByRole: session.role,
                },
              });
            }
          }
        }

        const cancelledOrder = await tx.gastroOrder.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            barStatus: order.hasBarItems ? "CANCELLED" : "NONE",
            kitchenStatus: order.hasKitchenItems ? "CANCELLED" : "NONE",
            cancelReason: data.reason || "Cancelado por operador autorizado",
            cancelledByName: session.name,
            cancelledAt: new Date(),
          },
          include: { items: true },
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
              reason: data.reason || "Sin motivo especificado",
              cancelledBy: session.name,
            }),
          },
        });

        return cancelledOrder;
      });

      realtimeBus.broadcast("global", "GASTRO_ORDER_UPDATED", {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        status: "CANCELLED",
      });

      return NextResponse.json({ success: true, order: updated });
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    return handleApiError(error);
  }
}
