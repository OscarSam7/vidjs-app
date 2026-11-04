import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requirePermission } from "@/lib/auth/session";
import { handleApiError, NotFoundError, BadRequestError } from "@/lib/errors";

const updateTypeSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  maxAvailable: z.number().int().positive().optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  allowedStartTime: z.string().optional().nullable(),
  allowedEndTime: z.string().optional().nullable(),
  maxCheckInsPerDay: z.number().int().min(1).optional().nullable(),
  allowReentry: z.boolean().optional(),
  orderIndex: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext();
    const { id } = await params;

    const type = await prisma.accreditationType.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { participants: true, accreditations: true },
        },
        accessRules: {
          include: {
            accessPoint: true,
          },
        },
      },
    });

    if (!type) {
      throw new NotFoundError("Tipo de acreditación no encontrado");
    }

    return NextResponse.json({ success: true, type });
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
    await requirePermission("accreditations:manage");
    const { id } = await params;

    const existing = await prisma.accreditationType.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundError("Tipo de acreditación no encontrado");
    }

    const body = await req.json();
    const parsed = updateTypeSchema.parse(body);

    const updateData: any = { ...parsed };
    if (parsed.validFrom !== undefined) {
      updateData.validFrom = parsed.validFrom ? new Date(parsed.validFrom) : null;
    }
    if (parsed.validUntil !== undefined) {
      updateData.validUntil = parsed.validUntil ? new Date(parsed.validUntil) : null;
    }

    const updated = await prisma.accreditationType.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, type: updated });
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
    await requirePermission("accreditations:manage");
    const { id } = await params;

    const existing = await prisma.accreditationType.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { participants: true, accreditations: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError("Tipo de acreditación no encontrado");
    }

    if (existing._count.participants > 0 || existing._count.accreditations > 0) {
      throw new BadRequestError(
        `No se puede eliminar una categoría que tiene ${existing._count.participants} participantes o acreditaciones vinculadas. Puedes desactivarla.`
      );
    }

    await prisma.accreditationType.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Categoría eliminada correctamente" });
  } catch (error) {
    return handleApiError(error);
  }
}
