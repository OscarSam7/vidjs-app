import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requirePermission } from "@/lib/auth/session";
import { handleApiError, NotFoundError, BadRequestError } from "@/lib/errors";

const updateOrgSchema = z.object({
  name: z.string().min(2).optional(),
  taxId: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext();
    await requirePermission("accreditations:manage");
    const { id } = await params;

    const existing = await prisma.eventOrganization.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundError("Organización no encontrada");
    }

    const body = await req.json();
    const parsed = updateOrgSchema.parse(body);

    const updateData: any = {};
    if (parsed.name) updateData.name = parsed.name.trim();
    if (parsed.taxId !== undefined) updateData.rucOrTaxId = parsed.taxId?.trim() || null;
    if (parsed.contactName !== undefined) updateData.contactName = parsed.contactName?.trim() || null;
    if (parsed.email !== undefined) updateData.email = parsed.email?.trim() || null;
    if (parsed.phone !== undefined) updateData.phone = parsed.phone?.trim() || null;
    if (parsed.notes !== undefined) updateData.notes = parsed.notes?.trim() || null;

    const updated = await prisma.eventOrganization.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      organization: { ...updated, taxId: updated.rucOrTaxId },
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
    await requirePermission("accreditations:manage");
    const { id } = await params;

    const existing = await prisma.eventOrganization.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { participants: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError("Organización no encontrada");
    }

    if (existing._count.participants > 0) {
      throw new BadRequestError(
        `No se puede eliminar la organización porque tiene ${existing._count.participants} participantes asignados`
      );
    }

    await prisma.eventOrganization.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Organización eliminada" });
  } catch (error) {
    return handleApiError(error);
  }
}
