import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";

const decorationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre de la decoración es obligatorio"),
  description: z.string().optional(),
  imageUrl: z.string().min(1, "La foto de la decoración es obligatoria"),
  extraPriceCents: z.coerce.number().int().min(0).default(0),
});

const updatePackageSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  itemsIncluded: z.array(z.string()).optional(),
  pricingType: z.enum(["CLEAN_FEE", "CREDIT_CONSUMPTION", "FIXED_COMBO"]).optional(),
  priceCents: z.coerce.number().int().min(0).optional(),
  creditAmountCents: z.coerce.number().int().min(0).optional(),
  maxGuests: z.coerce.number().int().min(1).optional(),
  isBirthdayPackage: z.boolean().optional(),
  allowScreenShoutout: z.boolean().optional(),
  colorHex: z.string().optional(),
  active: z.boolean().optional(),
  decorations: z.array(decorationSchema).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext();
    const { id } = await params;

    const pkg = await prisma.reservationPackage.findFirst({
      where: { id, tenantId },
      include: {
        decorations: {
          orderBy: { orderIndex: "asc" },
        },
        _count: {
          select: { reservations: true },
        },
      },
    });

    if (!pkg) {
      throw new NotFoundError("Paquete no encontrado");
    }

    let items: string[] = [];
    try {
      items = JSON.parse(pkg.itemsIncluded);
    } catch {
      items = pkg.itemsIncluded ? [pkg.itemsIncluded] : [];
    }

    return NextResponse.json({
      success: true,
      package: {
        ...pkg,
        itemsIncluded: items,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);
    const { id } = await params;

    const body = await req.json();
    const data = updatePackageSchema.parse(body);

    const existing = await prisma.reservationPackage.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError("Paquete no encontrado");
    }

    const updatePayload: any = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.imageUrl !== undefined) updatePayload.imageUrl = data.imageUrl;
    if (data.itemsIncluded !== undefined) updatePayload.itemsIncluded = JSON.stringify(data.itemsIncluded);
    if (data.pricingType !== undefined) updatePayload.pricingType = data.pricingType;
    if (data.priceCents !== undefined) updatePayload.priceCents = data.priceCents;
    if (data.creditAmountCents !== undefined) updatePayload.creditAmountCents = data.creditAmountCents;
    if (data.maxGuests !== undefined) updatePayload.maxGuests = data.maxGuests;
    if (data.isBirthdayPackage !== undefined) updatePayload.isBirthdayPackage = data.isBirthdayPackage;
    if (data.allowScreenShoutout !== undefined) updatePayload.allowScreenShoutout = data.allowScreenShoutout;
    if (data.colorHex !== undefined) updatePayload.colorHex = data.colorHex;
    if (data.active !== undefined) updatePayload.active = data.active;

    // Actualizar decoraciones si fueron enviadas
    if (data.decorations !== undefined) {
      // Reemplazo sincronizado: eliminar las anteriores y crear las nuevas
      await prisma.decorationOption.deleteMany({
        where: { packageId: id, tenantId },
      });

      updatePayload.decorations = {
        create: data.decorations.map((d, idx) => ({
          tenantId,
          name: d.name,
          description: d.description || null,
          imageUrl: d.imageUrl,
          extraPriceCents: d.extraPriceCents || 0,
          orderIndex: idx,
        })),
      };
    }

    const updated = await prisma.reservationPackage.update({
      where: { id },
      data: updatePayload,
      include: {
        decorations: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Paquete y decoraciones actualizados correctamente",
      package: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);
    const { id } = await params;

    const existing = await prisma.reservationPackage.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError("Paquete no encontrado");
    }

    await prisma.reservationPackage.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Paquete eliminado exitosamente",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
