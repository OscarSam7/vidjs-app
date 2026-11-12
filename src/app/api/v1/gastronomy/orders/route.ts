import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { PERMISSIONS, hasAnyPermission } from "@/lib/rbac/permissions";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { generateQrDataUrl } from "@/lib/qr/generator";

const createOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  selectedOptions: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        priceCents: z.coerce.number().int().nonnegative(),
      })
    )
    .optional()
    .default([]),
  observations: z.string().optional(),
});

const createOrderSchema = z.object({
  tenantId: z.string().optional(),
  venueId: z.string().optional(),
  tableId: z.string().optional(),
  tableLabel: z.string().optional(),
  sectorName: z.string().optional(),
  sessionCode: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerTaxId: z.string().optional(),
  deliveryMode: z.enum(["BAR_PICKUP", "WAITER_DELIVERY"]).default("WAITER_DELIVERY"),
  paymentMethodSelected: z
    .enum([
      "CASH",
      "DEBIT_CARD",
      "CREDIT_CARD",
      "BANK_TRANSFER",
      "QR_PAYMENT",
      "PIX",
      "DEPOSIT_APPLICATION",
      "PARTIAL",
    ])
    .default("CASH"),
  priority: z.enum(["NORMAL", "HIGH", "VIP"]).default("NORMAL"),
  discountCents: z.coerce.number().int().nonnegative().default(0),
  depositIdToApply: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(createOrderItemSchema).min(1, "El pedido debe incluir al menos un producto"),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get("tableId");
    const orderNumber = searchParams.get("orderNumber");
    const destination = searchParams.get("destination"); // BAR, KITCHEN

    const userSession = await getCurrentSession().catch(() => null);
    const guestSession = await getCurrentGuestSession().catch(() => null);

    let tenantId = userSession?.tenantId || guestSession?.tenant.id || searchParams.get("tenantId");
    if (!tenantId) {
      const mainTenant =
        (await prisma.tenant.findFirst({
          where: { status: "ACTIVE", users: { some: {} } },
          orderBy: { createdAt: "asc" },
        })) || (await prisma.tenant.findFirst({ where: { status: "ACTIVE" } }));
      tenantId = mainTenant?.id || null;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const where: any = { tenantId };
    if (tableId) where.tableId = tableId;
    if (orderNumber) where.orderNumber = orderNumber;
    if (destination === "BAR") where.hasBarItems = true;
    if (destination === "KITCHEN") where.hasKitchenItems = true;

    const orders = await prisma.gastroOrder.findMany({
      where,
      include: {
        items: true,
        payments: true,
        pendingInvoiceSale: true,
      },
      orderBy: { receivedAt: "desc" },
      take: 150,
    });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createOrderSchema.parse(body);

    const userSession = await getCurrentSession().catch(() => null);
    const guestSession = await getCurrentGuestSession().catch(() => null);

    // Resolver Mesa y Sector primero si existe tableId para garantizar consistencia de Tenant, Venue y Sector
    let tableId = data.tableId || guestSession?.table.id || null;
    let tableLabel = data.tableLabel || guestSession?.table.label || "Mesa 1";
    let tableNumber: number | null = guestSession?.table.number || 1;
    let sectorName = data.sectorName && data.sectorName !== "DJ" && data.sectorName !== "KARAOKE"
      ? data.sectorName
      : "Salón principal";
    let resolvedTableTenantId: string | null = null;
    let resolvedTableVenueId: string | null = null;

    if (tableId) {
      const dbTable = await prisma.table.findUnique({
        where: { id: tableId },
        include: { sector: { select: { name: true } } },
      });
      if (dbTable) {
        resolvedTableTenantId = dbTable.tenantId;
        resolvedTableVenueId = dbTable.venueId;
        tableLabel = dbTable.label;
        tableNumber = dbTable.number;
        sectorName = dbTable.sector?.name || "Salón principal";
      }
    }

    // Resolver Tenant y Venue
    let tenantId =
      resolvedTableTenantId || data.tenantId || userSession?.tenantId || guestSession?.tenant.id;
    if (!tenantId) {
      const firstTenant =
        (await prisma.tenant.findFirst({
          where: { status: "ACTIVE", users: { some: {} } },
          orderBy: { createdAt: "asc" },
        })) || (await prisma.tenant.findFirst({ where: { status: "ACTIVE" } }));
      if (!firstTenant) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "No se encontró establecimiento activo" } },
          { status: 404 }
        );
      }
      tenantId = firstTenant.id;
    }

    let venueId = resolvedTableVenueId || data.venueId || guestSession?.table.venueId;
    if (!venueId) {
      const firstVenue = await prisma.venue.findFirst({
        where: { tenantId, active: true },
        orderBy: { createdAt: "asc" },
      });
      if (!firstVenue) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "No se encontró sede activa" } },
          { status: 404 }
        );
      }
      venueId = firstVenue.id;
    }

    // Validar descuento autorizado (Fase 2 y 16)
    let discountCents = data.discountCents || 0;
    let discountAuthorizedBy: string | null = null;
    if (discountCents > 0) {
      if (
        !userSession ||
        !hasAnyPermission(userSession.role, [
          PERMISSIONS.GASTRO_DISCOUNTS_AUTHORIZE,
          PERMISSIONS.GASTRO_ORDERS_MANAGE,
        ])
      ) {
        throw new ForbiddenError("Los descuentos requieren autorización de Gerencia o Administración");
      }
      discountAuthorizedBy = userSession.name;
    }

    // Validar configuración de modalidad de entrega (Fase 3)
    const deliveryConfig =
      (await prisma.gastroDeliveryConfig.findUnique({ where: { venueId } })) ||
      (await prisma.gastroDeliveryConfig.findFirst({ where: { tenantId } }));

    let finalDeliveryMode = data.deliveryMode;
    if (deliveryConfig) {
      if (finalDeliveryMode === "BAR_PICKUP" && !deliveryConfig.barPickupEnabled) {
        if (deliveryConfig.waiterDeliveryEnabled) {
          finalDeliveryMode = "WAITER_DELIVERY";
        } else {
          return NextResponse.json(
            {
              error: {
                code: "DELIVERY_DISABLED",
                message: "La modalidad de Retiro en Barra se encuentra desactivada operativamente.",
              },
            },
            { status: 400 }
          );
        }
      }
      if (finalDeliveryMode === "WAITER_DELIVERY" && !deliveryConfig.waiterDeliveryEnabled) {
        if (deliveryConfig.barPickupEnabled) {
          finalDeliveryMode = "BAR_PICKUP";
        } else {
          return NextResponse.json(
            {
              error: {
                code: "DELIVERY_DISABLED",
                message: "La modalidad de Entrega por Mozo se encuentra desactivada operativamente.",
              },
            },
            { status: 400 }
          );
        }
      }
    }

    // Transacción ACID para validar stock, recetas, descontar existencias y crear el pedido
    const result = await prisma.$transaction(async (tx) => {
      const productIds = data.items.map((i) => i.productId);
      const products = await tx.gastroProduct.findMany({
        where: { id: { in: productIds }, tenantId },
        include: {
          recipeItems: {
            include: { inventoryItem: true },
          },
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotalCents = 0;
      let hasBarItems = false;
      let hasKitchenItems = false;

      const orderItemsToCreate: Array<{
        productId: string;
        productCode: string;
        productName: string;
        presentation: string | null;
        destination: string;
        quantity: number;
        unitPriceCents: number;
        extrasPriceCents: number;
        subtotalCents: number;
        selectedOptionsJson: string | null;
        observations: string | null;
      }> = [];

      const exhaustedProductAlerts: Array<{ id: string; name: string; status: string }> = [];

      for (const reqItem of data.items) {
        const product = productMap.get(reqItem.productId);
        if (!product || !product.active || product.availabilityStatus !== "AVAILABLE") {
          throw new Error(
            `El producto "${product?.name || reqItem.productId}" ya no está disponible en el menú.`
          );
        }

        // Validar stock directo (si no tiene receta, valida stock directo del producto)
        if (product.trackInventory && !product.hasRecipe && product.stockQuantity < reqItem.quantity) {
          throw new Error(
            `Stock insuficiente para "${product.name}". Disponible: ${product.stockQuantity} ${product.unit}.`
          );
        }

        // Validar ingredientes si tiene receta (Fase 10)
        if (product.hasRecipe && product.recipeItems.length > 0) {
          for (const recipe of product.recipeItems) {
            const totalIngredientNeeded = recipe.quantityRequired * reqItem.quantity;
            if (recipe.inventoryItem.currentStock < totalIngredientNeeded) {
              // Marcar producto sin ingredientes suficientes
              await tx.gastroProduct.update({
                where: { id: product.id },
                data: {
                  availabilityStatus: "MISSING_INGREDIENTS",
                  disabledReason: `Ingrediente insuficiente: ${recipe.inventoryItem.name}`,
                  disabledAt: new Date(),
                },
              });
              throw new Error(
                `El producto "${product.name}" no cuenta con suficientes ingredientes (${recipe.inventoryItem.name}).`
              );
            }
          }
        }

        // Descontar stock directo del producto
        if (product.trackInventory) {
          const newStock = Math.max(0, product.stockQuantity - reqItem.quantity);
          const nextAvailability =
            !product.hasRecipe && newStock <= 0 ? "AUTO_EXHAUSTED" : product.availabilityStatus;

          await tx.gastroProduct.update({
            where: { id: product.id },
            data: {
              stockQuantity: newStock,
              availabilityStatus: nextAvailability,
              ...(!product.hasRecipe && newStock <= 0
                ? {
                    disabledAt: new Date(),
                    disabledReason: "Agotado automáticamente por venta",
                  }
                : {}),
            },
          });

          await tx.gastroInventoryMovement.create({
            data: {
              tenantId,
              venueId,
              productId: product.id,
              movementType: "SALE_DEDUCTION",
              quantityDelta: -reqItem.quantity,
              previousStock: product.stockQuantity,
              newStock,
              reason: `Venta en pedido (${tableLabel})`,
              performedByName: data.customerName || userSession?.name || "Cliente QR",
            },
          });

          if (newStock <= 0) {
            exhaustedProductAlerts.push({
              id: product.id,
              name: product.name,
              status: "AUTO_EXHAUSTED",
            });
          }
        }

        // Descontar ingredientes de la receta (Fase 10)
        if (product.hasRecipe && product.recipeItems.length > 0) {
          let recipeShortageForNextUnit = false;
          for (const recipe of product.recipeItems) {
            const deduction = recipe.quantityRequired * reqItem.quantity;
            const prevIngStock = recipe.inventoryItem.currentStock;
            const newIngStock = Math.max(0, prevIngStock - deduction);

            await tx.gastroInventoryItem.update({
              where: { id: recipe.inventoryItem.id },
              data: { currentStock: newIngStock },
            });

            await tx.gastroInventoryMovement.create({
              data: {
                tenantId,
                venueId,
                productId: product.id,
                inventoryItemId: recipe.inventoryItem.id,
                movementType: "SALE_DEDUCTION",
                quantityDelta: -deduction,
                previousStock: prevIngStock,
                newStock: newIngStock,
                reason: `Receta de ${product.name} x${reqItem.quantity}`,
                performedByName: data.customerName || userSession?.name || "Cliente QR",
              },
            });

            if (newIngStock < recipe.quantityRequired) {
              recipeShortageForNextUnit = true;
            }
          }

          if (recipeShortageForNextUnit) {
            await tx.gastroProduct.update({
              where: { id: product.id },
              data: {
                availabilityStatus: "MISSING_INGREDIENTS",
                disabledAt: new Date(),
                disabledReason: "Ingredientes de receta agotados tras venta",
              },
            });
            exhaustedProductAlerts.push({
              id: product.id,
              name: product.name,
              status: "MISSING_INGREDIENTS",
            });
          }
        }

        // Calcular precios y adicionales
        const extrasPriceCents = (reqItem.selectedOptions || []).reduce(
          (sum, opt) => sum + (opt.priceCents || 0),
          0
        );
        const itemSubtotal = (product.priceCents + extrasPriceCents) * reqItem.quantity;
        subtotalCents += itemSubtotal;

        if (product.destination === "BAR" || product.destination === "BOTH") {
          hasBarItems = true;
        }
        if (product.destination === "KITCHEN" || product.destination === "BOTH") {
          hasKitchenItems = true;
        }

        orderItemsToCreate.push({
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          presentation: product.presentation,
          destination: product.destination,
          quantity: reqItem.quantity,
          unitPriceCents: product.priceCents,
          extrasPriceCents,
          subtotalCents: itemSubtotal,
          selectedOptionsJson:
            reqItem.selectedOptions && reqItem.selectedOptions.length > 0
              ? JSON.stringify(reqItem.selectedOptions)
              : null,
          observations: reqItem.observations?.trim() || null,
        });
      }

      // Calcular costo de servicio/entrega si corresponde (Fase 3)
      let serviceFeeCents = 0;
      if (finalDeliveryMode === "WAITER_DELIVERY" && deliveryConfig) {
        serviceFeeCents =
          deliveryConfig.serviceFeeCents +
          Math.round((subtotalCents * (deliveryConfig.serviceFeePercent || 0)) / 100);
      }

      // Aplicar seña si existe depositIdToApply (Fase 8)
      let depositAppliedCents = 0;
      const grossTotal = Math.max(0, subtotalCents - discountCents + serviceFeeCents);

      if (data.depositIdToApply) {
        const deposit = await tx.gastroCustomerDeposit.findFirst({
          where: {
            id: data.depositIdToApply,
            tenantId,
            status: { in: ["CONFIRMED", "PARTIALLY_APPLIED"] },
            remainingCreditCents: { gt: 0 },
          },
        });
        if (deposit) {
          depositAppliedCents = Math.min(deposit.remainingCreditCents, grossTotal);
          const nextRemaining = deposit.remainingCreditCents - depositAppliedCents;
          const nextApplied = deposit.appliedAmountCents + depositAppliedCents;

          await tx.gastroCustomerDeposit.update({
            where: { id: deposit.id },
            data: {
              appliedAmountCents: nextApplied,
              remainingCreditCents: nextRemaining,
              status: nextRemaining === 0 ? "APPLIED_TO_CONSUMPTION" : "PARTIALLY_APPLIED",
              appliedAt: new Date(),
            },
          });
        }
      }

      const totalCents = Math.max(0, grossTotal - depositAppliedCents);

      // Asegurar o crear GastroTableSession para la mesa (Fase 9)
      let tableSessionId: string | null = null;
      let sessionCode =
        data.sessionCode ||
        `SES-M${tableNumber || 1}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

      if (tableId) {
        let openSession = await tx.gastroTableSession.findFirst({
          where: {
            tenantId,
            tableId,
            status: { in: ["OPEN", "PENDING_PAYMENT"] },
          },
          orderBy: { openedAt: "desc" },
        });

        if (!openSession) {
          openSession = await tx.gastroTableSession.create({
            data: {
              tenantId,
              venueId,
              tableId,
              sessionCode,
              status: "OPEN",
              customerName: data.customerName || guestSession?.guestName || "Cliente Mesa",
              customerTaxId: data.customerTaxId || null,
              subtotalCents,
              discountCents,
              serviceFeeCents,
              depositAppliedCents,
              totalCents,
              paidCents: 0,
              balanceCents: totalCents,
            },
          });
        } else {
          sessionCode = openSession.sessionCode;
          openSession = await tx.gastroTableSession.update({
            where: { id: openSession.id },
            data: {
              subtotalCents: openSession.subtotalCents + subtotalCents,
              discountCents: openSession.discountCents + discountCents,
              serviceFeeCents: openSession.serviceFeeCents + serviceFeeCents,
              depositAppliedCents: openSession.depositAppliedCents + depositAppliedCents,
              totalCents: openSession.totalCents + totalCents,
              balanceCents: openSession.balanceCents + totalCents,
              ...(data.customerName ? { customerName: data.customerName } : {}),
              ...(data.customerTaxId ? { customerTaxId: data.customerTaxId } : {}),
            },
          });
        }
        tableSessionId = openSession.id;

        // Marcar la mesa como OCCUPIED
        await tx.table.update({
          where: { id: tableId },
          data: { tableStatus: "OCCUPIED" },
        });
      }

      // Generar número único de pedido (ej: PED-000112) sin colisionar aunque se hayan borrado pedidos previos
      const existingOrders = await tx.gastroOrder.findMany({
        where: { tenantId },
        select: { orderNumber: true },
      });
      const maxOrderNum = existingOrders.reduce((max, o) => {
        const m = o.orderNumber.match(/(\d+)$/);
        const n = m ? parseInt(m[1], 10) : 0;
        return n > max ? n : max;
      }, 100);
      const orderNumber = `PED-${String(maxOrderNum + 1).padStart(6, "0")}`;

      // Determinar estados iniciales según si quedó cubierto 100% por seña o requiere caja
      const isFullyPaidByDeposit = totalCents === 0 && depositAppliedCents > 0;
      const initialPaymentStatus = isFullyPaidByDeposit ? "APPROVED" : "PENDING";
      const initialOrderStatus = isFullyPaidByDeposit ? "PAYMENT_CONFIRMED" : "PENDING_PAYMENT";

      const order = await tx.gastroOrder.create({
        data: {
          tenantId,
          venueId,
          tableId,
          tableSessionId,
          guestSessionId: guestSession?.id || null,
          orderNumber,
          tableNumber,
          tableLabel,
          sectorName,
          sessionCode,
          customerName: data.customerName || guestSession?.guestName || "Cliente",
          customerPhone: data.customerPhone || null,
          customerTaxId: data.customerTaxId || "44444401-7",
          deliveryMode: finalDeliveryMode,
          priority: data.priority,
          hasBarItems,
          hasKitchenItems,
          status: initialOrderStatus,
          barStatus: hasBarItems ? initialOrderStatus : "NONE",
          kitchenStatus: hasKitchenItems ? initialOrderStatus : "NONE",
          paymentStatus: initialPaymentStatus,
          paymentMethodSelected: data.paymentMethodSelected,
          subtotalCents,
          discountCents,
          discountAuthorizedBy,
          serviceFeeCents,
          depositAppliedCents,
          totalCents,
          paidCents: isFullyPaidByDeposit ? grossTotal : 0,
          currency: "PYG",
          notes: data.notes || null,
          paymentConfirmedAt: isFullyPaidByDeposit ? new Date() : null,
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
          items: true,
        },
      });

      // Crear registro de transacción de pago pendiente en Caja / Pasarela QR (Fase 7)
      let qrPayload: string | null = null;
      let qrImageUrl: string | null = null;
      const txCode = `PAY-${orderNumber.replace("PED-", "")}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

      if (data.paymentMethodSelected === "QR_PAYMENT" || data.paymentMethodSelected === "PIX") {
        qrPayload = `00020126580014PY.GOV.BCP.SIPAP0114${venueId.slice(0, 12)}520458125303600540${totalCents}5802PY5915VIDJSPRO_GASTRO6008ASUNCION62180514${orderNumber}6304ABCD`;
        qrImageUrl = await generateQrDataUrl(qrPayload);
      }

      const paymentRecord = await tx.gastroPayment.create({
        data: {
          tenantId,
          venueId,
          orderId: order.id,
          tableSessionId,
          transactionCode: txCode,
          orderNumber: order.orderNumber,
          paymentMethod: isFullyPaidByDeposit ? "DEPOSIT_APPLICATION" : data.paymentMethodSelected,
          paymentModality: data.paymentMethodSelected === "PARTIAL" ? "PARTIAL" : "FULL",
          amountCents: isFullyPaidByDeposit ? depositAppliedCents : totalCents,
          currency: "PYG",
          provider:
            data.paymentMethodSelected === "QR_PAYMENT"
              ? "SIPAP_QR"
              : data.paymentMethodSelected === "PIX"
              ? "PIX_PROVIDER"
              : data.paymentMethodSelected === "DEBIT_CARD" ||
                data.paymentMethodSelected === "CREDIT_CARD"
              ? "POS_BANCARD"
              : "CAJA_LOCAL",
          qrPayload,
          qrImageUrl,
          qrExpiresAt: qrPayload ? new Date(Date.now() + 30 * 60 * 1000) : null,
          status: isFullyPaidByDeposit ? "APPROVED" : "PENDING",
          confirmedAt: isFullyPaidByDeposit ? new Date() : null,
        },
      });

      return {
        order,
        paymentRecord,
        exhaustedProductAlerts,
      };
    });

    // Emitir eventos en tiempo real para Barra, Cocina y Caja (Fase 13)
    if (result.order.hasBarItems) {
      realtimeBus.broadcast("global", "GASTRO_ORDER_NEW_BAR", {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        tableLabel: result.order.tableLabel,
        sectorName: result.order.sectorName,
        deliveryMode: result.order.deliveryMode,
      });
    }

    if (result.order.hasKitchenItems) {
      realtimeBus.broadcast("global", "GASTRO_ORDER_NEW_KITCHEN", {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        tableLabel: result.order.tableLabel,
        sectorName: result.order.sectorName,
      });
    }

    realtimeBus.broadcast("global", "GASTRO_ORDER_UPDATED", {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      status: result.order.status,
      paymentStatus: result.order.paymentStatus,
    });

    for (const alert of result.exhaustedProductAlerts) {
      realtimeBus.broadcast("global", "GASTRO_PRODUCT_EXHAUSTED", {
        productId: alert.id,
        productName: alert.name,
        availabilityStatus: alert.status,
      });
    }

    return NextResponse.json({
      success: true,
      order: result.order,
      payment: result.paymentRecord,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
