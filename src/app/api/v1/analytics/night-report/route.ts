import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, requireTenantContext } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { generateNightReport } from "@/lib/analytics/night-report";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);
    const { tenantId } = await requireTenantContext();

    const { searchParams } = new URL(req.url);
    const requestedEventId = searchParams.get("eventId");

    let eventId = requestedEventId;

    if (!eventId) {
      // Tomar el evento activo más reciente o el último evento del tenant
      const latestEvent = await prisma.event.findFirst({
        where: { tenantId },
        orderBy: { startsAt: "desc" },
        select: { id: true },
      });

      if (!latestEvent) {
        throw new NotFoundError("No se encontraron eventos para generar el reporte");
      }

      eventId = latestEvent.id;
    }

    const report = await generateNightReport({ tenantId, eventId });

    if (!report) {
      throw new NotFoundError("No se pudo generar el reporte para el evento indicado");
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
