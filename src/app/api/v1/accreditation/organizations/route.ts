import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requirePermission } from "@/lib/auth/session";
import { handleApiError, BadRequestError, NotFoundError } from "@/lib/errors";

const organizationSchema = z.object({
  eventId: z.string().min(1, "El ID del evento es obligatorio"),
  name: z.string().min(2, "El nombre de la empresa/delegación es obligatorio"),
  taxId: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  email: z.string().email("Correo electrónico inválido").optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      throw new BadRequestError("Parámetro eventId es obligatorio");
    }

    const organizations = await prisma.eventOrganization.findMany({
      where: { eventId, tenantId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });

    const mapped = organizations.map((o) => ({
      ...o,
      taxId: o.rucOrTaxId,
    }));

    return NextResponse.json({ success: true, organizations: mapped });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    await requirePermission("accreditations:manage");

    const body = await req.json();
    const parsed = organizationSchema.parse(body);

    const event = await prisma.event.findFirst({
      where: { id: parsed.eventId, tenantId },
    });
    if (!event) {
      throw new NotFoundError("Evento no encontrado");
    }

    const org = await prisma.eventOrganization.create({
      data: {
        tenantId,
        eventId: parsed.eventId,
        name: parsed.name.trim(),
        rucOrTaxId: parsed.taxId?.trim() || null,
        contactName: parsed.contactName?.trim() || null,
        email: parsed.email?.trim() || null,
        phone: parsed.phone?.trim() || null,
        notes: parsed.notes?.trim() || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        organization: { ...org, taxId: org.rucOrTaxId },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
