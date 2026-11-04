import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requirePermission } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext();
    await requirePermission("accreditations:checkin");
    const { id } = await params;

    const event = await prisma.event.findFirst({
      where: { id, tenantId },
      include: {
        accreditationTypes: {
          select: {
            id: true,
            name: true,
            code: true,
            colorHex: true,
            allowReentry: true,
            allowedStartTime: true,
            allowedEndTime: true,
          },
        },
        accessPoints: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            code: true,
            sectorType: true,
            rules: {
              select: {
                accreditationTypeId: true,
                isAllowed: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundError("Evento no encontrado");
    }

    // Fetch all accreditations with minimal payload for offline caching
    const accreditations = await prisma.eventAccreditation.findMany({
      where: { eventId: id, tenantId },
      select: {
        id: true,
        qrToken: true,
        qrSignature: true,
        codeNumber: true,
        status: true,
        accreditationTypeId: true,
        totalCheckIns: true,
        lastCheckInAt: true,
        participant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentNumber: true,
            documentType: true,
            company: true,
            jobTitle: true,
            photoUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      pack: {
        eventId: event.id,
        eventName: event.name,
        eventCode: event.code,
        downloadedAt: new Date().toISOString(),
        categories: event.accreditationTypes,
        accessPoints: event.accessPoints,
        accreditations,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
