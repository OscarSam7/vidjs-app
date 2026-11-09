import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { handleApiError } from "@/lib/errors";
import { ensureGastronomySeeded } from "@/lib/gastronomy/seed-defaults";

const createCategorySchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  slug: z.string().optional(),
  description: z.string().optional(),
  destination: z.enum(["BAR", "KITCHEN", "BOTH"]).default("BAR"),
  iconName: z.string().optional(),
  orderIndex: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
  venueId: z.string().optional(),
});

const updateCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  destination: z.enum(["BAR", "KITCHEN", "BOTH"]).optional(),
  iconName: z.string().optional(),
  orderIndex: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  try {
    const { tenantId } = await requireTenantContext();
    await ensureGastronomySeeded(tenantId);

    const categories = await prisma.gastroCategory.findMany({
      where: { tenantId },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.GASTRO_MENU_MANAGE);
    const { session, tenantId } = await requireTenantContext();
    const body = await req.json();
    const data = createCategorySchema.parse(body);

    const slug =
      data.slug?.trim() ||
      data.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const category = await prisma.gastroCategory.create({
      data: {
        tenantId,
        venueId: data.venueId || null,
        name: data.name,
        slug: `${slug}-${Date.now().toString(36).slice(-3)}`,
        description: data.description,
        destination: data.destination,
        iconName: data.iconName || "Utensils",
        orderIndex: data.orderIndex,
        active: data.active,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: "GASTRO_CATEGORY_CREATED",
        resource: "GASTRO_CATEGORY",
        resourceId: category.id,
        metadata: JSON.stringify({ name: category.name, destination: category.destination }),
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.GASTRO_MENU_MANAGE);
    const { session, tenantId } = await requireTenantContext();
    const body = await req.json();
    const data = updateCategorySchema.parse(body);

    const existing = await prisma.gastroCategory.findFirst({
      where: { id: data.id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Categoría no encontrada" } },
        { status: 404 }
      );
    }

    const updated = await prisma.gastroCategory.update({
      where: { id: existing.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.destination !== undefined ? { destination: data.destination } : {}),
        ...(data.iconName !== undefined ? { iconName: data.iconName } : {}),
        ...(data.orderIndex !== undefined ? { orderIndex: data.orderIndex } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: "GASTRO_CATEGORY_UPDATED",
        resource: "GASTRO_CATEGORY",
        resourceId: updated.id,
        metadata: JSON.stringify({ name: updated.name, active: updated.active }),
      },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.GASTRO_MENU_MANAGE);
    const { session, tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "ID de categoría requerido" } },
        { status: 400 }
      );
    }

    const existing = await prisma.gastroCategory.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Categoría no encontrada" } },
        { status: 404 }
      );
    }

    await prisma.gastroCategory.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: "GASTRO_CATEGORY_DELETED",
        resource: "GASTRO_CATEGORY",
        resourceId: id,
        metadata: JSON.stringify({ name: existing.name }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
