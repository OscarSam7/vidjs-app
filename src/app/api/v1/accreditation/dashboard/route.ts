import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    let resolvedEventId = eventId;

    if (!resolvedEventId) {
      // Find default active event if none passed
      const firstEvent = await prisma.event.findFirst({
        where: { tenantId },
        orderBy: { startsAt: "desc" },
        select: { id: true },
      });
      if (!firstEvent) {
        return NextResponse.json({
          success: true,
          hasEvents: false,
          metrics: null,
          categories: [],
          gates: [],
          recentCheckIns: [],
          hourlyCheckIns: [],
        });
      }
      resolvedEventId = firstEvent.id;
    }

    const event = await prisma.event.findFirst({
      where: { id: resolvedEventId, tenantId },
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
          where: { active: true },
          orderBy: { name: "asc" },
          include: {
            _count: {
              select: { checkInRecords: true },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundError("Evento no encontrado");
    }

    // 1. Fetch accreditations breakdown
    const accreditations = await prisma.eventAccreditation.findMany({
      where: { eventId: resolvedEventId, ...(tenantId ? { tenantId } : {}) },
      select: {
        id: true,
        status: true,
        totalCheckIns: true,
        accreditationTypeId: true,
      },
    });

    const totalParticipants = await prisma.eventParticipant.count({
      where: { eventId: resolvedEventId, ...(tenantId ? { tenantId } : {}) },
    });

    const totalAccredited = accreditations.filter(
      (a) => a.status === "ACCREDITED" || a.status === "CHECKED_IN"
    ).length;

    const totalCheckedIn = accreditations.filter(
      (a) => a.status === "CHECKED_IN" || a.totalCheckIns > 0
    ).length;

    const totalPending = accreditations.filter((a) => a.status === "PENDING").length;

    const attendanceRate =
      totalParticipants > 0 ? Math.round((totalCheckedIn / totalParticipants) * 100) : 0;

    // 2. Fetch category breakdown with check-in rates
    const categoryStats = event.accreditationTypes.map((cat) => {
      const catAccs = accreditations.filter((a) => a.accreditationTypeId === cat.id);
      const catCheckedIn = catAccs.filter(
        (a) => a.status === "CHECKED_IN" || a.totalCheckIns > 0
      ).length;
      return {
        id: cat.id,
        name: cat.name,
        code: cat.code,
        colorHex: cat.colorHex,
        totalParticipants: cat._count.participants,
        totalCheckedIn: catCheckedIn,
        maxAvailable: cat.maxAvailable,
        percent:
          cat._count.participants > 0
            ? Math.round((catCheckedIn / cat._count.participants) * 100)
            : 0,
      };
    });

    // 3. Fetch recent 15 check-ins
    const recentCheckInsRaw = await prisma.checkInRecord.findMany({
      where: { eventId: resolvedEventId, ...(tenantId ? { tenantId } : {}) },
      orderBy: { scannedAt: "desc" },
      take: 15,
      include: {
        participant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentNumber: true,
            company: true,
            jobTitle: true,
            photoUrl: true,
          },
        },
        accessPoint: {
          select: { id: true, name: true, code: true },
        },
        accreditation: {
          select: {
            accreditationType: {
              select: { id: true, name: true, colorHex: true },
            },
          },
        },
      },
    });

    const recentCheckIns = recentCheckInsRaw.map((r: any) => ({
      id: r.id,
      status: r.status,
      scannedAt: r.scannedAt,
      operatorName: r.operatorName,
      rejectionReason: r.rejectionReason,
      participant: r.participant,
      accessPoint: r.accessPoint,
      accreditationType: r.accreditation?.accreditationType || null,
    }));

    // 4. Ingress by hour (last 24 hours of activity)
    const checkInTimes = await prisma.checkInRecord.findMany({
      where: { eventId: resolvedEventId, ...(tenantId ? { tenantId } : {}), status: "APPROVED" },
      select: { scannedAt: true },
      orderBy: { scannedAt: "asc" },
    });

    const hourlyMap: Record<string, number> = {};
    for (const record of checkInTimes) {
      const date = new Date(record.scannedAt);
      const hourKey = `${date.getHours().toString().padStart(2, "0")}:00`;
      hourlyMap[hourKey] = (hourlyMap[hourKey] || 0) + 1;
    }

    const hourlyCheckIns = Object.entries(hourlyMap).map(([hour, count]) => ({
      hour,
      count,
    }));

    return NextResponse.json({
      success: true,
      hasEvents: true,
      event: {
        id: event.id,
        name: event.name,
        code: event.code,
        eventType: event.eventType,
        status: event.status,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        locationName: event.locationName,
        maxCapacity: event.maxCapacity,
      },
      metrics: {
        totalParticipants,
        totalAccredited,
        totalCheckedIn,
        totalPending,
        attendanceRate,
        totalGates: event.accessPoints.length,
      },
      categories: categoryStats,
      gates: event.accessPoints.map((g) => ({
        id: g.id,
        name: g.name,
        code: g.code,
        sectorType: g.sectorType,
        checkInsCount: g._count.checkInRecords,
      })),
      recentCheckIns,
      hourlyCheckIns,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
