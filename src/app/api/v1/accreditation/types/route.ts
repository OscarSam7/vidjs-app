import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requirePermission } from "@/lib/auth/session";
import { handleApiError, BadRequestError, NotFoundError } from "@/lib/errors";

const createTypeSchema = z.object({
  eventId: z.string().min(1, "El ID del evento es obligatorio"),
  name: z.string().min(2, "El nombre de la categoría es obligatorio"),
  code: z.string().min(1, "El código corto es obligatorio").max(20),
  description: z.string().optional(),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color hexadecimal inválido").default("#3B82F6"),
  textColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color hexadecimal inválido").default("#FFFFFF"),
  maxAvailable: z.number().int().positive().optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  allowedStartTime: z.string().optional().nullable(),
  allowedEndTime: z.string().optional().nullable(),
  maxCheckInsPerDay: z.number().int().min(1).optional().nullable(),
  allowReentry: z.boolean().default(true),
  orderIndex: z.number().int().default(0),
});

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      throw new BadRequestError("Parámetro eventId es obligatorio");
    }

    const types = await prisma.accreditationType.findMany({
      where: { eventId, tenantId },
      orderBy: { orderIndex: "asc" },
      include: {
        _count: {
          select: {
            participants: true,
            accreditations: true,
            accessRules: true,
          },
        },
        accessRules: {
          include: {
            accessPoint: {
              select: { id: true, name: true, code: true, sectorType: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, types });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    await requirePermission("accreditations:manage");

    const body = await req.json();
    const parsed = createTypeSchema.parse(body);

    // Verify event ownership
    const event = await prisma.event.findFirst({
      where: { id: parsed.eventId, tenantId },
    });
    if (!event) {
      throw new NotFoundError("Evento no encontrado o no pertenece a tu cuenta");
    }

    const cleanCode = parsed.code.trim().toUpperCase();

    // Verify code uniqueness per event
    const existing = await prisma.accreditationType.findUnique({
      where: {
        eventId_code: {
          eventId: parsed.eventId,
          code: cleanCode,
        },
      },
    });

    if (existing) {
      throw new BadRequestError(`Ya existe una categoría con el código '${cleanCode}' en este evento`);
    }

    const newType = await prisma.accreditationType.create({
      data: {
        tenantId,
        eventId: parsed.eventId,
        name: parsed.name.trim(),
        code: cleanCode,
        description: parsed.description?.trim(),
        colorHex: parsed.colorHex,
        textColorHex: parsed.textColorHex,
        maxAvailable: parsed.maxAvailable,
        validFrom: parsed.validFrom ? new Date(parsed.validFrom) : null,
        validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null,
        allowedStartTime: parsed.allowedStartTime,
        allowedEndTime: parsed.allowedEndTime,
        maxCheckInsPerDay: parsed.maxCheckInsPerDay,
        allowReentry: parsed.allowReentry,
        orderIndex: parsed.orderIndex,
      },
    });

    // Auto-authorize in all active access points of the event by default
    const accessPoints = await prisma.accessPoint.findMany({
      where: { eventId: parsed.eventId, tenantId, active: true },
    });

    for (const ap of accessPoints) {
      await prisma.accessPointRule.create({
        data: {
          accessPointId: ap.id,
          accreditationTypeId: newType.id,
          isAllowed: true,
        },
      });
    }

    return NextResponse.json({ success: true, type: newType }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
