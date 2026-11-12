import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { PERMISSIONS, hasAnyPermission } from "@/lib/rbac/permissions";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { ensureGastronomySeeded } from "@/lib/gastronomy/seed-defaults";

const inventoryActionSchema = z.object({
  action: z.enum([
    "CREATE_INVENTORY_ITEM",
    "EDIT_INVENTORY_ITEM",
    "DELETE_INVENTORY_ITEM",
    "RESTOCK_INVENTORY_ITEM",
    "RESTOCK_OR_CREATE_ITEM",
    "ADJUST_INVENTORY_ITEM",
    "ADD_RECIPE_ITEM",
    "REMOVE_RECIPE_ITEM",
    "REPORT_SHORTAGE",
  ]),
  inventoryItemId: z.string().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  itemType: z.enum(["ARTICLE", "SUPPLY"]).optional(),
  destination: z.enum(["BAR", "KITCHEN", "BOTH"]).optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  currentStock: z.coerce.number().optional(),
  minStock: z.coerce.number().optional(),
  costPerUnitCents: z.coerce.number().int().optional(),
  quantityDelta: z.coerce.number().optional(),
  productId: z.string().optional(),
  quantityRequired: z.coerce.number().optional(),
  reason: z.string().optional(),
  createNewIfNotExists: z.boolean().optional(),
});

export async function GET() {
  try {
    const { tenantId } = await requireTenantContext();
    await ensureGastronomySeeded(tenantId);

    const [inventoryItems, products, movements] = await Promise.all([
      prisma.gastroInventoryItem.findMany({
        where: { tenantId },
        include: {
          recipeUsages: {
            include: {
              product: { select: { id: true, code: true, name: true, destination: true } },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.gastroProduct.findMany({
        where: { tenantId },
        include: {
          category: { select: { id: true, name: true } },
          recipeItems: {
            include: {
              inventoryItem: {
                select: { id: true, code: true, name: true, currentStock: true, unit: true, itemType: true, destination: true },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.gastroInventoryMovement.findMany({
        where: { tenantId },
        include: {
          product: { select: { code: true, name: true } },
          inventoryItem: { select: { code: true, name: true, unit: true, itemType: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    return NextResponse.json({
      success: true,
      inventoryItems,
      products,
      movements,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    const canOperateInventory = hasAnyPermission(session.role, [
      PERMISSIONS.GASTRO_INVENTORY_MANAGE,
      PERMISSIONS.GASTRO_BAR_OPERATE,
      PERMISSIONS.GASTRO_BAR_MANAGE,
      PERMISSIONS.GASTRO_KITCHEN_OPERATE,
      PERMISSIONS.GASTRO_KITCHEN_MANAGE,
      PERMISSIONS.GASTRO_MENU_MANAGE,
    ]);

    if (!canOperateInventory) {
      throw new ForbiddenError("No tienes permisos para realizar operaciones de inventario");
    }

    const body = await req.json();
    const data = inventoryActionSchema.parse(body);

    // 1. CREAR INSUMO O ARTÍCULO
    if (data.action === "CREATE_INVENTORY_ITEM") {
      if (!data.name) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "El nombre del ítem es obligatorio" } },
          { status: 400 }
        );
      }

      const itemType = data.itemType || "SUPPLY";
      const code = data.code?.trim().toUpperCase() || `${itemType === "ARTICLE" ? "ART" : "INS"}-${Date.now().toString().slice(-4)}`;

      const item = await prisma.gastroInventoryItem.create({
        data: {
          tenantId,
          code,
          name: data.name.trim(),
          itemType,
          destination: data.destination || "BOTH",
          category: data.category || (itemType === "ARTICLE" ? "BEVERAGE" : "INGREDIENT"),
          unit: data.unit || "UN",
          currentStock: data.currentStock ?? 0,
          minStock: data.minStock ?? 10,
          costPerUnitCents: data.costPerUnitCents ?? 0,
          active: true,
          lastRestockedAt: new Date(),
          lastRestockedBy: session.name,
        },
      });

      return NextResponse.json({ success: true, inventoryItem: item });
    }

    // 1.1 EDITAR ÍTEM
    if (data.action === "EDIT_INVENTORY_ITEM" && data.inventoryItemId) {
      const existing = await prisma.gastroInventoryItem.findFirst({
        where: { id: data.inventoryItemId, tenantId },
      });
      if (!existing) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Ítem no encontrado" } },
          { status: 404 }
        );
      }

      const updated = await prisma.gastroInventoryItem.update({
        where: { id: existing.id },
        data: {
          name: data.name?.trim() || existing.name,
          itemType: data.itemType || existing.itemType,
          destination: data.destination || existing.destination,
          unit: data.unit || existing.unit,
          minStock: data.minStock !== undefined ? Number(data.minStock) : existing.minStock,
          costPerUnitCents: data.costPerUnitCents !== undefined ? Number(data.costPerUnitCents) : existing.costPerUnitCents,
        },
      });

      return NextResponse.json({ success: true, inventoryItem: updated });
    }

    // 1.2 ELIMINAR / DESACTIVAR ÍTEM
    if (data.action === "DELETE_INVENTORY_ITEM" && data.inventoryItemId) {
      await prisma.gastroInventoryItem.delete({
        where: { id: data.inventoryItemId },
      });
      return NextResponse.json({ success: true });
    }

    // 2. REPOSICIÓN / COMPRA (O CREACIÓN AL VUELO SI NO EXISTE)
    if (
      data.action === "RESTOCK_INVENTORY_ITEM" ||
      data.action === "RESTOCK_OR_CREATE_ITEM"
    ) {
      // Caso A: El usuario está registrando una compra de un artículo/insumo nuevo que no existía
      if (data.createNewIfNotExists || (!data.inventoryItemId && data.name)) {
        const itemType = data.itemType || "SUPPLY";
        const code = data.code?.trim().toUpperCase() || `${itemType === "ARTICLE" ? "ART" : "INS"}-${Date.now().toString().slice(-4)}`;
        const initialQty = Number(data.quantityDelta || 0);

        const createdItem = await prisma.$transaction(async (tx) => {
          const item = await tx.gastroInventoryItem.create({
            data: {
              tenantId,
              code,
              name: data.name!.trim(),
              itemType,
              destination: data.destination || "BOTH",
              category: data.category || (itemType === "ARTICLE" ? "BEVERAGE" : "INGREDIENT"),
              unit: data.unit || "UN",
              currentStock: initialQty,
              minStock: Number(data.minStock || 10),
              costPerUnitCents: Number(data.costPerUnitCents || 0),
              active: true,
              lastRestockedAt: new Date(),
              lastRestockedBy: session.name,
            },
          });

          if (initialQty > 0) {
            await tx.gastroInventoryMovement.create({
              data: {
                tenantId,
                inventoryItemId: item.id,
                movementType: "RESTOCK",
                quantityDelta: initialQty,
                previousStock: 0,
                newStock: initialQty,
                reason: data.reason || "Compra / Alta directa de nuevo ítem en inventario",
                performedById: session.sub,
                performedByName: session.name,
                performedByRole: session.role,
              },
            });
          }

          return item;
        });

        return NextResponse.json({ success: true, inventoryItem: createdItem });
      }

      // Caso B: Reposición de un ítem existente
      if (!data.inventoryItemId) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Debes seleccionar un insumo o artículo para reponer" } },
          { status: 400 }
        );
      }
      const existing = await prisma.gastroInventoryItem.findFirst({
        where: { id: data.inventoryItemId, tenantId },
        include: {
          recipeUsages: {
            include: {
              product: {
                include: {
                  recipeItems: { include: { inventoryItem: true } },
                },
              },
            },
          },
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Insumo no encontrado" } },
          { status: 404 }
        );
      }

      const delta = data.quantityDelta ?? 0;
      const newStock = Math.max(0, existing.currentStock + delta);

      const updatedItem = await prisma.$transaction(async (tx) => {
        const item = await tx.gastroInventoryItem.update({
          where: { id: existing.id },
          data: {
            currentStock: newStock,
            ...(delta > 0
              ? {
                  lastRestockedAt: new Date(),
                  lastRestockedBy: session.name,
                }
              : {}),
          },
        });

        await tx.gastroInventoryMovement.create({
          data: {
            tenantId,
            inventoryItemId: existing.id,
            movementType: delta > 0 ? "RESTOCK" : "MANUAL_ADJUSTMENT",
            quantityDelta: delta,
            previousStock: existing.currentStock,
            newStock,
            reason: data.reason || (delta > 0 ? "Reposición de insumo" : "Ajuste manual"),
            performedById: session.sub,
            performedByName: session.name,
            performedByRole: session.role,
          },
        });

        // Verificar productos que usan este ingrediente en su receta
        for (const usage of existing.recipeUsages) {
          const prod = usage.product;
          const allIngredientsAvailable = prod.recipeItems.every((ri) => {
            const stockToCheck = ri.inventoryItemId === existing.id ? newStock : ri.inventoryItem.currentStock;
            return stockToCheck >= ri.quantityRequired;
          });

          if (!allIngredientsAvailable && prod.availabilityStatus === "AVAILABLE") {
            await tx.gastroProduct.update({
              where: { id: prod.id },
              data: {
                availabilityStatus: "MISSING_INGREDIENTS",
                disabledByName: session.name,
                disabledByRole: session.role,
                disabledAt: new Date(),
                disabledReason: `Falta de ingrediente: ${existing.name}`,
              },
            });
            realtimeBus.broadcast("global", "GASTRO_PRODUCT_EXHAUSTED", {
              productId: prod.id,
              productName: prod.name,
              availabilityStatus: "MISSING_INGREDIENTS",
            });
          } else if (
            allIngredientsAvailable &&
            prod.availabilityStatus === "MISSING_INGREDIENTS"
          ) {
            await tx.gastroProduct.update({
              where: { id: prod.id },
              data: {
                availabilityStatus: "AVAILABLE",
                disabledByName: null,
                disabledAt: null,
                disabledReason: null,
              },
            });
            realtimeBus.broadcast("global", "GASTRO_PRODUCT_REACTIVATED", {
              productId: prod.id,
              productName: prod.name,
              availabilityStatus: "AVAILABLE",
            });
          }
        }

        return item;
      });

      return NextResponse.json({ success: true, inventoryItem: updatedItem });
    }

    // 3. VINCULAR INGREDIENTE A RECETA DE PRODUCTO
    if (data.action === "ADD_RECIPE_ITEM" && data.productId && data.inventoryItemId) {
      const recipeItem = await prisma.gastroProductRecipeItem.upsert({
        where: {
          productId_inventoryItemId: {
            productId: data.productId,
            inventoryItemId: data.inventoryItemId,
          },
        },
        update: { quantityRequired: data.quantityRequired || 1 },
        create: {
          productId: data.productId,
          inventoryItemId: data.inventoryItemId,
          quantityRequired: data.quantityRequired || 1,
        },
      });

      await prisma.gastroProduct.update({
        where: { id: data.productId },
        data: { hasRecipe: true },
      });

      return NextResponse.json({ success: true, recipeItem });
    }

    // 4. QUITAR INGREDIENTE DE RECETA
    if (data.action === "REMOVE_RECIPE_ITEM" && data.productId && data.inventoryItemId) {
      await prisma.gastroProductRecipeItem.delete({
        where: {
          productId_inventoryItemId: {
            productId: data.productId,
            inventoryItemId: data.inventoryItemId,
          },
        },
      });

      const remaining = await prisma.gastroProductRecipeItem.count({
        where: { productId: data.productId },
      });
      if (remaining === 0) {
        await prisma.gastroProduct.update({
          where: { id: data.productId },
          data: { hasRecipe: false },
        });
      }

      return NextResponse.json({ success: true });
    }

    // 5. INFORMAR FALTA DE STOCK / INGREDIENTE DESDE BARRA O COCINA (Fase 4 y 5)
    if (data.action === "REPORT_SHORTAGE") {
      await prisma.gastroInventoryMovement.create({
        data: {
          tenantId,
          productId: data.productId || null,
          inventoryItemId: data.inventoryItemId || null,
          movementType: "STOCK_ALERT",
          quantityDelta: 0,
          previousStock: 0,
          newStock: 0,
          reason: data.reason || "Alerta operativa de falta de stock/insumo",
          performedById: session.sub,
          performedByName: session.name,
          performedByRole: session.role,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: session.sub,
          action: "GASTRO_STOCK_SHORTAGE_REPORTED",
          resource: "GASTRO_INVENTORY",
          resourceId: data.productId || data.inventoryItemId || null,
          metadata: JSON.stringify({
            reason: data.reason,
            reportedBy: session.name,
            role: session.role,
          }),
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
