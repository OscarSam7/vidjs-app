import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";

const settingsSchema = z.object({
  venueId: z.string().optional(),
  bankName: z.string().nullable().optional(),
  bankAccount: z.string().nullable().optional(),
  bankHolder: z.string().nullable().optional(),
  bankTaxId: z.string().nullable().optional(),
  bankAlias: z.string().nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get("venueId");

    const venue = await prisma.venue.findFirst({
      where: {
        tenantId,
        ...(venueId ? { id: venueId } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        bankName: true,
        bankAccount: true,
        bankHolder: true,
        bankTaxId: true,
        bankAlias: true,
        whatsappNumber: true,
      },
    });

    if (!venue) {
      throw new NotFoundError("Establecimiento no encontrado");
    }

    return NextResponse.json({
      success: true,
      settings: venue,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);

    const body = await req.json();
    const data = settingsSchema.parse(body);

    const venue = await prisma.venue.findFirst({
      where: {
        tenantId,
        ...(data.venueId ? { id: data.venueId } : {}),
      },
      select: { id: true },
    });

    if (!venue) {
      throw new NotFoundError("Establecimiento no encontrado");
    }

    const updated = await prisma.venue.update({
      where: { id: venue.id },
      data: {
        bankName: data.bankName !== undefined ? data.bankName : undefined,
        bankAccount: data.bankAccount !== undefined ? data.bankAccount : undefined,
        bankHolder: data.bankHolder !== undefined ? data.bankHolder : undefined,
        bankTaxId: data.bankTaxId !== undefined ? data.bankTaxId : undefined,
        bankAlias: data.bankAlias !== undefined ? data.bankAlias : undefined,
        whatsappNumber: data.whatsappNumber !== undefined ? data.whatsappNumber : undefined,
      },
      select: {
        id: true,
        name: true,
        bankName: true,
        bankAccount: true,
        bankHolder: true,
        bankTaxId: true,
        bankAlias: true,
        whatsappNumber: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Datos bancarios y canal WhatsApp actualizados exitosamente",
      settings: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
