import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requirePermission } from "@/lib/auth/session";
import { handleApiError, NotFoundError, BadRequestError } from "@/lib/errors";

const updateEventSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  eventType: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "FINISHED", "CANCELLED"]).optional(),
  organizerName: z.string().optional().nullable(),
  responsibleCompany: z.string().optional().nullable(),
  companyRuc: z.string().optional().nullable(),
  locationName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional().nullable(),
  timeSchedule: z.string().optional().nullable(),
  maxCapacity: z.number().int().positive().optional().nullable(),
  daysCount: z.number().int().min(1).max(30).optional(),
  bannerUrl: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  isPublicRegistration: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext();
    const { id } = await params;

    const event = await prisma.event.findFirst({
      where: { id, tenantId },
      include: {
        accreditationTypes: {
          orderBy: { orderIndex: "asc" },
          include: {
            _count: {
              select: { participants: true, accreditations: true },
            },
          },
        },
        accessPoints: {
          orderBy: { name: "asc" },
          include: {
            rules: true,
            _count: {
              select: { checkInRecords: true },
            },
          },
        },
        organizations: {
          orderBy: { name: "asc" },
          include: {
            _count: { select: { participants: true } },
          },
        },
        _count: {
          select: {
            participants: true,
            accreditations: true,
            checkInRecords: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundError("Evento no encontrado o no pertenece a tu cuenta");
    }

    // Compute live status breakdown
    const accreditations = await prisma.eventAccreditation.findMany({
      where: { eventId: id, tenantId },
      select: { status: true, totalCheckIns: true },
    });

    const totalParticipants = event._count.participants;
    const totalAccredited = accreditations.filter(
      (a) => a.status === "ACCREDITED" || a.status === "CHECKED_IN"
    ).length;
    const totalCheckedIn = accreditations.filter(
      (a) => a.status === "CHECKED_IN" || a.totalCheckIns > 0
    ).length;
    const totalPending = accreditations.filter((a) => a.status === "PENDING").length;

    const attendanceRate =
      totalParticipants > 0 ? Math.round((totalCheckedIn / totalParticipants) * 100) : 0;

    return NextResponse.json({
      success: true,
      event: {
        ...event,
        metrics: {
          totalParticipants,
          totalAccredited,
          totalCheckedIn,
          totalPending,
          attendanceRate,
        },
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
    await requirePermission("accreditations:manage");
    const { id } = await params;

    const existing = await prisma.event.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundError("Evento no encontrado");
    }

    const body = await req.json();
    const parsed = updateEventSchema.parse(body);

    const updateData: any = { ...parsed };
    if (parsed.startsAt) updateData.startsAt = new Date(parsed.startsAt);
    if (parsed.endsAt !== undefined) {
      updateData.endsAt = parsed.endsAt ? new Date(parsed.endsAt) : null;
    }

    const updated = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, event: updated });
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

    const existing = await prisma.event.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { checkInRecords: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError("Evento no encontrado");
    }

    if (existing._count.checkInRecords > 0) {
      throw new BadRequestError(
        `No se puede eliminar un evento con ${existing._count.checkInRecords} ingresos registrados. Puedes cambiar su estado a FINALIZADO.`
      );
    }

    await prisma.event.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Evento eliminado correctamente" });
  } catch (error) {
    return handleApiError(error);
  }
}
