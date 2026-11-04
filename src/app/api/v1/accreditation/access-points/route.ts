import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requirePermission } from "@/lib/auth/session";
import { handleApiError, BadRequestError, NotFoundError } from "@/lib/errors";

const accessPointSchema = z.object({
  eventId: z.string().min(1, "El ID del evento es obligatorio"),
  name: z.string().min(2, "El nombre de la puerta es obligatorio"),
  code: z.string().min(1, "El código corto es obligatorio").max(20),
  locationDetails: z.string().optional().nullable(),
  sectorType: z
    .enum(["MAIN", "VIP", "PRESS", "BACKSTAGE", "STAFF", "VENDOR", "GENERAL"])
    .default("MAIN"),
  authorizedCategoryIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      throw new BadRequestError("Parámetro eventId es obligatorio");
    }

    const accessPoints = await prisma.accessPoint.findMany({
      where: { eventId, tenantId },
      orderBy: { name: "asc" },
      include: {
        rules: {
          include: {
            accreditationType: {
              select: { id: true, name: true, code: true, colorHex: true },
            },
          },
        },
        _count: {
          select: { checkInRecords: true },
        },
      },
    });

    return NextResponse.json({ success: true, accessPoints });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    await requirePermission("accreditations:manage");

    const body = await req.json();
    const parsed = accessPointSchema.parse(body);

    const event = await prisma.event.findFirst({
      where: { id: parsed.eventId, tenantId },
      include: { accreditationTypes: true },
    });
    if (!event) {
      throw new NotFoundError("Evento no encontrado");
    }

    const cleanCode = parsed.code.trim().toUpperCase();

    // Verify code uniqueness per event
    const existing = await prisma.accessPoint.findUnique({
      where: {
        eventId_code: {
          eventId: parsed.eventId,
          code: cleanCode,
        },
      },
    });
    if (existing) {
      throw new BadRequestError(`Ya existe un punto de acceso con el código '${cleanCode}'`);
    }

    const accessPoint = await prisma.accessPoint.create({
      data: {
        tenantId,
        eventId: parsed.eventId,
        name: parsed.name.trim(),
        code: cleanCode,
        locationDetails: parsed.locationDetails?.trim() || null,
        sectorType: parsed.sectorType,
        active: true,
      },
    });

    // Create rules: if authorizedCategoryIds provided, allow only those; otherwise allow all
    const allowedSet = parsed.authorizedCategoryIds
      ? new Set(parsed.authorizedCategoryIds)
      : new Set(event.accreditationTypes.map((c) => c.id));

    for (const cat of event.accreditationTypes) {
      await prisma.accessPointRule.create({
        data: {
          accessPointId: accessPoint.id,
          accreditationTypeId: cat.id,
          isAllowed: allowedSet.has(cat.id),
        },
      });
    }

    return NextResponse.json({ success: true, accessPoint }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
