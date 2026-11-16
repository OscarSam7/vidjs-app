import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const venueId = searchParams.get("venueId");

    let targetEventId = eventId;
    if (!targetEventId) {
      const firstEvent = await prisma.event.findFirst({
        where: {
          tenantId,
          ...(venueId && venueId !== "ALL" ? { venueId } : {}),
        },
        orderBy: { startsAt: "desc" },
        select: { id: true },
      });
      if (!firstEvent) {
        return NextResponse.json({
          success: true,
          hasEvents: false,
          event: null,
          summary: null,
          checkIns: [],
          hourlyFlow: [],
          organizationStats: [],
          categoryStats: [],
        });
      }
      targetEventId = firstEvent.id;
    }

    const event = await prisma.event.findFirst({
      where: { id: targetEventId, tenantId },
      include: {
        venue: { select: { id: true, name: true } },
        accreditationTypes: { orderBy: { orderIndex: "asc" } },
        organizations: { orderBy: { name: "asc" } },
      },
    });

    if (!event) {
      throw new NotFoundError("Evento no encontrado");
    }

    // 1. Fetch full check-ins with details
    const checkIns = await prisma.checkInRecord.findMany({
      where: { eventId: targetEventId, tenantId },
      include: {
        participant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentNumber: true,
            documentType: true,
            email: true,
            company: true,
            jobTitle: true,
            organization: { select: { id: true, name: true } },
          },
        },
        accessPoint: {
          select: {
            id: true,
            name: true,
            code: true,
            sectorType: true,
          },
        },
        accreditation: {
          select: {
            id: true,
            codeNumber: true,
            accreditationType: {
              select: {
                id: true,
                name: true,
                code: true,
                colorHex: true,
              },
            },
          },
        },
      },
      orderBy: { scannedAt: "desc" },
    });

    // 2. Fetch all participants and accreditations for metrics
    const [participants, accreditations] = await Promise.all([
      prisma.eventParticipant.findMany({
        where: { eventId: targetEventId, tenantId },
        select: {
          id: true,
          organizationId: true,
          accreditationTypeId: true,
        },
      }),
      prisma.eventAccreditation.findMany({
        where: { eventId: targetEventId, tenantId },
        select: {
          id: true,
          status: true,
          totalCheckIns: true,
          accreditationTypeId: true,
          participantId: true,
        },
      }),
    ]);

    const totalParticipants = participants.length;
    const totalAccredited = accreditations.filter(
      (a) => a.status === "ACCREDITED" || a.status === "CHECKED_IN"
    ).length;
    const totalCheckedIn = accreditations.filter(
      (a) => a.status === "CHECKED_IN" || a.totalCheckIns > 0
    ).length;
    const totalPending = totalParticipants - totalCheckedIn;
    const attendanceRate =
      totalParticipants > 0 ? Math.round((totalCheckedIn / totalParticipants) * 100) : 0;

    // 3. Hourly flow calculation
    const hourlyMap = new Map<string, { total: number; approved: number; rejected: number }>();
    checkIns.forEach((record) => {
      const hourStr = new Date(record.scannedAt).toLocaleTimeString("es-PY", {
        hour: "2-digit",
        minute: "2-digit",
      }).slice(0, 2) + ":00";

      const current = hourlyMap.get(hourStr) || { total: 0, approved: 0, rejected: 0 };
      current.total += 1;
      if (record.status === "APPROVED") {
        current.approved += 1;
      } else {
        current.rejected += 1;
      }
      hourlyMap.set(hourStr, current);
    });

    const hourlyFlow = Array.from(hourlyMap.entries())
      .map(([hour, counts]) => ({
        hour,
        count: counts.total,
        approved: counts.approved,
        rejected: counts.rejected,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    // 4. Breakdown by Category (AccreditationType)
    const categoryStats = event.accreditationTypes.map((cat) => {
      const catParticipants = participants.filter((p) => p.accreditationTypeId === cat.id).length;
      const catCheckedIn = accreditations.filter(
        (a) => a.accreditationTypeId === cat.id && (a.status === "CHECKED_IN" || a.totalCheckIns > 0)
      ).length;
      const percent = catParticipants > 0 ? Math.round((catCheckedIn / catParticipants) * 100) : 0;

      return {
        id: cat.id,
        name: cat.name,
        code: cat.code,
        colorHex: cat.colorHex,
        totalParticipants: catParticipants,
        totalCheckedIn: catCheckedIn,
        attendanceRate: percent,
        maxAvailable: cat.maxAvailable,
      };
    });

    // 5. Breakdown by Organization / Delegation
    const organizationStats = event.organizations.map((org) => {
      const orgParticipants = participants.filter((p) => p.organizationId === org.id);
      const orgPartIds = new Set(orgParticipants.map((p) => p.id));
      const orgCheckedIn = accreditations.filter(
        (a) => orgPartIds.has(a.participantId) && (a.status === "CHECKED_IN" || a.totalCheckIns > 0)
      ).length;
      const totalInOrg = orgParticipants.length;
      const percent = totalInOrg > 0 ? Math.round((orgCheckedIn / totalInOrg) * 100) : 0;

      return {
        id: org.id,
        name: org.name,
        contactName: org.contactName,
        totalMembers: totalInOrg,
        totalCheckedIn: orgCheckedIn,
        attendanceRate: percent,
      };
    });

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
        venueName: event.venue?.name || "Sede Principal",
        maxCapacity: event.maxCapacity,
      },
      summary: {
        totalParticipants,
        totalAccredited,
        totalCheckedIn,
        totalPending,
        attendanceRate,
        totalCheckInRecords: checkIns.length,
        approvedCheckIns: checkIns.filter((c) => c.status === "APPROVED").length,
        rejectedCheckIns: checkIns.filter((c) => c.status !== "APPROVED").length,
      },
      checkIns,
      hourlyFlow,
      categoryStats,
      organizationStats,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
