import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requirePermission } from "@/lib/auth/session";
import { handleApiError, NotFoundError, BadRequestError } from "@/lib/errors";

const updateAccessPointSchema = z.object({
  name: z.string().min(2).optional(),
  locationDetails: z.string().optional().nullable(),
  sectorType: z
    .enum(["MAIN", "VIP", "PRESS", "BACKSTAGE", "STAFF", "VENDOR", "GENERAL"])
    .optional(),
  active: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext();
    const { id } = await params;

    const accessPoint = await prisma.accessPoint.findFirst({
      where: { id, tenantId },
      include: {
        rules: {
          include: {
            accreditationType: true,
          },
        },
        _count: {
          select: { checkInRecords: true },
        },
      },
    });

    if (!accessPoint) {
      throw new NotFoundError("Punto de acceso no encontrado");
    }

    return NextResponse.json({ success: true, accessPoint });
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

    const existing = await prisma.accessPoint.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundError("Punto de acceso no encontrado");
    }

    const body = await req.json();
    const parsed = updateAccessPointSchema.parse(body);

    const updated = await prisma.accessPoint.update({
      where: { id },
      data: parsed,
    });

    return NextResponse.json({ success: true, accessPoint: updated });
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

    const existing = await prisma.accessPoint.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { checkInRecords: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError("Punto de acceso no encontrado");
    }

    if (existing._count.checkInRecords > 0) {
      throw new BadRequestError(
        `No se puede eliminar un acceso con ${existing._count.checkInRecords} ingresos registrados. Puedes desactivarlo.`
      );
    }

    await prisma.accessPoint.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Punto de acceso eliminado" });
  } catch (error) {
    return handleApiError(error);
  }
}
