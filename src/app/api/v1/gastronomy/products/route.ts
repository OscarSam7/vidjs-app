import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission, hasAnyPermission } from "@/lib/rbac/permissions";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { ensureGastronomySeeded } from "@/lib/gastronomy/seed-defaults";

const createProductSchema = z.object({
  categoryId: z.string().min(1, "La categoría es obligatoria"),
  code: z.string().min(1, "El código es obligatorio"),
  name: z.string().min(2, "El nombre es obligatorio"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  presentation: z.string().optional(),
  priceCents: z.coerce.number().int().nonnegative(),
  costCents: z.coerce.number().int().nonnegative().default(0),
  stockQuantity: z.coerce.number().nonnegative().default(50),
  minStockQuantity: z.coerce.number().nonnegative().default(10),
  unit: z.string().default("UN"),
  destination: z.enum(["BAR", "KITCHEN", "BOTH"]).default("BAR"),
  availabilityStatus: z
    .enum([
      "AVAILABLE",
      "MANUAL_DISABLED",
      "AUTO_EXHAUSTED",
      "MISSING_INGREDIENTS",
      "TEMPORARILY_UNAVAILABLE",
    ])
    .default("AVAILABLE"),
  active: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isPromotion: z.boolean().default(false),
  hasRecipe: z.boolean().default(false),
  optionsJson: z.string().optional().nullable(),
});

const updateProductSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  presentation: z.string().optional().nullable(),
  priceCents: z.coerce.number().int().nonnegative().optional(),
  costCents: z.coerce.number().int().nonnegative().optional(),
  stockQuantity: z.coerce.number().nonnegative().optional(),
  minStockQuantity: z.coerce.number().nonnegative().optional(),
  unit: z.string().optional(),
  destination: z.enum(["BAR", "KITCHEN", "BOTH"]).optional(),
  availabilityStatus: z
    .enum([
      "AVAILABLE",
      "MANUAL_DISABLED",
      "AUTO_EXHAUSTED",
      "MISSING_INGREDIENTS",
      "TEMPORARILY_UNAVAILABLE",
    ])
    .optional(),
  active: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isPromotion: z.boolean().optional(),
  optionsJson: z.string().optional().nullable(),
  disabledReason: z.string().optional().nullable(),
  restockAmount: z.coerce.number().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    await ensureGastronomySeeded(tenantId);

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const destination = searchParams.get("destination");

    const products = await prisma.gastroProduct.findMany({
      where: {
        tenantId,
        ...(categoryId ? { categoryId } : {}),
        ...(destination ? { destination: { in: [destination, "BOTH"] } } : {}),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        recipeItems: {
          include: {
            inventoryItem: { select: { id: true, code: true, name: true, currentStock: true, unit: true } },
          },
        },
      },
      orderBy: [{ category: { orderIndex: "asc" } }, { name: "asc" }],
    });

    return NextResponse.json({ success: true, products });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    if (!hasPermission(session.role, PERMISSIONS.GASTRO_MENU_MANAGE)) {
      throw new ForbiddenError("No tienes permisos para crear productos en el menú");
    }

    const body = await req.json();
    const data = createProductSchema.parse(body);

    const product = await prisma.gastroProduct.create({
      data: {
        tenantId,
        categoryId: data.categoryId,
        code: data.code.toUpperCase(),
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        presentation: data.presentation,
        priceCents: data.priceCents,
        costCents: data.costCents,
        stockQuantity: data.stockQuantity,
        minStockQuantity: data.minStockQuantity,
        unit: data.unit,
        destination: data.destination,
        availabilityStatus: data.stockQuantity <= 0 ? "AUTO_EXHAUSTED" : data.availabilityStatus,
        active: data.active,
        isFeatured: data.isFeatured,
        isPromotion: data.isPromotion,
        hasRecipe: data.hasRecipe,
        optionsJson: data.optionsJson || null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: "GASTRO_PRODUCT_CREATED",
        resource: "GASTRO_PRODUCT",
        resourceId: product.id,
        metadata: JSON.stringify({
          code: product.code,
          name: product.name,
          priceCents: product.priceCents,
        }),
      },
    });

    realtimeBus.broadcast("global", "GASTRO_PRODUCT_REACTIVATED", {
      tenantId,
      productId: product.id,
      name: product.name,
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    const body = await req.json();
    const data = updateProductSchema.parse(body);

    const existing = await prisma.gastroProduct.findFirst({
      where: { id: data.id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Producto no encontrado" } },
        { status: 404 }
      );
    }

    // REGLA OBLIGATORIA FASE 4 & 16:
    // Barra y Cocina pueden activar/desactivar productos, marcar agotados e informar reposición,
    // pero NO pueden modificar precios ni costos sin permiso GASTRO_PRICES_MANAGE.
    const isChangingPrice =
      (data.priceCents !== undefined && data.priceCents !== existing.priceCents) ||
      (data.costCents !== undefined && data.costCents !== existing.costCents);

    if (isChangingPrice && !hasPermission(session.role, PERMISSIONS.GASTRO_PRICES_MANAGE)) {
      throw new ForbiddenError(
        "Seguridad: Barra y Cocina no están autorizados a modificar precios ni costos de productos."
      );
    }

    // Validar que tenga permiso de menú, barra, cocina o inventario para operar disponibilidad/stock
    const canOperateProduct = hasAnyPermission(session.role, [
      PERMISSIONS.GASTRO_MENU_MANAGE,
      PERMISSIONS.GASTRO_BAR_OPERATE,
      PERMISSIONS.GASTRO_BAR_MANAGE,
      PERMISSIONS.GASTRO_KITCHEN_OPERATE,
      PERMISSIONS.GASTRO_KITCHEN_MANAGE,
      PERMISSIONS.GASTRO_INVENTORY_MANAGE,
    ]);

    if (!canOperateProduct) {
      throw new ForbiddenError("No tienes permisos para modificar este producto");
    }

    let nextStock =
      data.restockAmount !== undefined
        ? existing.stockQuantity + data.restockAmount
        : data.stockQuantity !== undefined
        ? data.stockQuantity
        : existing.stockQuantity;

    if (nextStock < 0) nextStock = 0;

    let nextAvailability = data.availabilityStatus ?? existing.availabilityStatus;
    let nextActive = data.active ?? existing.active;

    // Si se repone stock y estaba agotado, reactivar automáticamente
    if (
      data.restockAmount &&
      data.restockAmount > 0 &&
      nextStock > 0 &&
      existing.availabilityStatus === "AUTO_EXHAUSTED"
    ) {
      nextAvailability = "AVAILABLE";
      nextActive = true;
    }

    // Si el stock llega a 0, marcar agotado automáticamente
    if (nextStock === 0 && nextAvailability === "AVAILABLE" && existing.trackInventory) {
      nextAvailability = "AUTO_EXHAUSTED";
    }

    const isBeingDisabled =
      nextAvailability !== "AVAILABLE" || nextActive === false;

    const updated = await prisma.gastroProduct.update({
      where: { id: existing.id },
      data: {
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.code !== undefined ? { code: data.code.toUpperCase() } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
        ...(data.presentation !== undefined ? { presentation: data.presentation } : {}),
        ...(data.priceCents !== undefined ? { priceCents: data.priceCents } : {}),
        ...(data.costCents !== undefined ? { costCents: data.costCents } : {}),
        ...(data.minStockQuantity !== undefined ? { minStockQuantity: data.minStockQuantity } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        ...(data.destination !== undefined ? { destination: data.destination } : {}),
        ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
        ...(data.isPromotion !== undefined ? { isPromotion: data.isPromotion } : {}),
        ...(data.optionsJson !== undefined ? { optionsJson: data.optionsJson } : {}),
        stockQuantity: nextStock,
        availabilityStatus: nextAvailability,
        active: nextActive,
        disabledByUserId: isBeingDisabled ? session.sub : null,
        disabledByName: isBeingDisabled ? session.name : null,
        disabledByRole: isBeingDisabled ? session.role : null,
        disabledAt: isBeingDisabled ? new Date() : null,
        disabledReason: isBeingDisabled
          ? data.disabledReason || `Marcado como ${nextAvailability} por ${session.name}`
          : null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    // Registrar movimiento en Kardex si varió el stock
    if (nextStock !== existing.stockQuantity) {
      await prisma.gastroInventoryMovement.create({
        data: {
          tenantId,
          productId: updated.id,
          movementType: data.restockAmount ? "RESTOCK" : "MANUAL_ADJUSTMENT",
          quantityDelta: nextStock - existing.stockQuantity,
          previousStock: existing.stockQuantity,
          newStock: nextStock,
          reason: data.disabledReason || (data.restockAmount ? "Reposición operativa" : "Ajuste de stock"),
          performedById: session.sub,
          performedByName: session.name,
          performedByRole: session.role,
        },
      });
    }

    // Registrar auditoría de cambios de precio o disponibilidad (Fase 10 y 16)
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: isChangingPrice
          ? "GASTRO_PRICE_UPDATED"
          : isBeingDisabled
          ? "GASTRO_PRODUCT_DISABLED"
          : "GASTRO_PRODUCT_UPDATED",
        resource: "GASTRO_PRODUCT",
        resourceId: updated.id,
        metadata: JSON.stringify({
          productName: updated.name,
          previousPrice: existing.priceCents,
          newPrice: updated.priceCents,
          previousAvailability: existing.availabilityStatus,
          newAvailability: updated.availabilityStatus,
          previousStock: existing.stockQuantity,
          newStock: updated.stockQuantity,
          performedBy: session.name,
          role: session.role,
        }),
      },
    });

    // Emitir notificación en tiempo real (Fase 13) para sincronizar Menú Digital inmediatamente
    const eventType =
      updated.availabilityStatus === "AVAILABLE" && updated.active
        ? "GASTRO_PRODUCT_REACTIVATED"
        : "GASTRO_PRODUCT_EXHAUSTED";

    realtimeBus.broadcast("global", eventType, {
      tenantId,
      productId: updated.id,
      productName: updated.name,
      availabilityStatus: updated.availabilityStatus,
      active: updated.active,
      stockQuantity: updated.stockQuantity,
      updatedBy: session.name,
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    const canDelete = hasAnyPermission(session.role, [
      PERMISSIONS.GASTRO_MENU_MANAGE,
      "ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    if (!canDelete) {
      throw new ForbiddenError("No tienes permisos para eliminar productos del menú");
    }

    const { searchParams } = new URL(req.url);
    let productId = searchParams.get("id");

    if (!productId) {
      try {
        const body = await req.json();
        productId = body?.id;
      } catch {
        // no body
      }
    }

    if (!productId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "ID de producto requerido" } },
        { status: 400 }
      );
    }

    const existing = await prisma.gastroProduct.findFirst({
      where: { id: productId, tenantId },
      include: {
        orderItems: { take: 1, select: { id: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Producto no encontrado" } },
        { status: 404 }
      );
    }

    let mode: "deleted" | "archived" = "deleted";

    if (existing.orderItems.length > 0) {
      // Tiene pedidos históricos asociados: archivar de forma segura
      mode = "archived";
      await prisma.gastroProduct.update({
        where: { id: existing.id },
        data: {
          active: false,
          availabilityStatus: "MANUAL_DISABLED",
          disabledByUserId: session.sub,
          disabledByName: session.name,
          disabledByRole: session.role,
          disabledAt: new Date(),
          disabledReason: `Archivado/Eliminado del menú por ${session.name}`,
        },
      });
    } else {
      // Eliminar físicamente
      await prisma.gastroProduct.delete({
        where: { id: existing.id },
      });
    }

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: mode === "deleted" ? "GASTRO_PRODUCT_DELETED" : "GASTRO_PRODUCT_ARCHIVED",
        resource: "GASTRO_PRODUCT",
        resourceId: existing.id,
        metadata: JSON.stringify({
          productName: existing.name,
          mode,
          performedBy: session.name,
          role: session.role,
        }),
      },
    });

    // Notificar en tiempo real
    realtimeBus.broadcast("global", "GASTRO_PRODUCT_EXHAUSTED", {
      tenantId,
      productId: existing.id,
      productName: existing.name,
      active: false,
      availabilityStatus: "MANUAL_DISABLED",
      deleted: true,
      mode,
    });

    return NextResponse.json({
      success: true,
      mode,
      message:
        mode === "archived"
          ? "El producto posee pedidos históricos asociados: ha sido archivado y retirado del menú digital y del catálogo activo."
          : "Producto eliminado correctamente del sistema.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
