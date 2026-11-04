import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requirePermission } from "@/lib/auth/session";
import { handleApiError, BadRequestError, NotFoundError } from "@/lib/errors";

const createEventSchema = z.object({
  name: z.string().min(2, "El nombre del evento debe tener al menos 2 caracteres"),
  code: z.string().min(2).max(20).optional(),
  description: z.string().optional(),
  eventType: z
    .enum([
      "CONGRESO",
      "CONFERENCIA",
      "SEMINARIO",
      "FERIA",
      "FESTIVAL",
      "CONCIERTO",
      "EMPRESARIAL",
      "PRIVADO",
      "DEPORTIVO",
      "FIESTA",
      "GENERAL",
    ])
    .default("GENERAL"),
  organizerName: z.string().optional(),
  responsibleCompany: z.string().optional(),
  companyRuc: z.string().optional(),
  locationName: z.string().optional(),
  address: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string().optional().nullable(),
  timeSchedule: z.string().optional(),
  maxCapacity: z.number().int().positive().optional().nullable(),
  daysCount: z.number().int().min(1).max(30).default(1),
  venueId: z.string().optional(),
  bannerUrl: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  isPublicRegistration: z.boolean().default(false),
  createDefaultCategories: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const whereClause: any = { tenantId };
    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            participants: true,
            accreditations: true,
            accessPoints: true,
            checkInRecords: true,
            accreditationTypes: true,
          },
        },
        accreditations: {
          select: {
            status: true,
            totalCheckIns: true,
          },
        },
      },
      orderBy: { startsAt: "desc" },
    });

    const enriched = events.map((event) => {
      const totalParticipants = event._count.participants;
      const totalAccredited = event.accreditations.filter(
        (a) => a.status === "ACCREDITED" || a.status === "CHECKED_IN"
      ).length;
      const totalCheckedIn = event.accreditations.filter(
        (a) => a.status === "CHECKED_IN" || a.totalCheckIns > 0
      ).length;
      const totalPending = event.accreditations.filter((a) => a.status === "PENDING").length;

      const attendanceRate =
        totalParticipants > 0 ? Math.round((totalCheckedIn / totalParticipants) * 100) : 0;

      const { accreditations, ...rest } = event;

      return {
        ...rest,
        metrics: {
          totalParticipants,
          totalAccredited,
          totalCheckedIn,
          totalPending,
          attendanceRate,
        },
      };
    });

    return NextResponse.json({ success: true, events: enriched });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    await requirePermission("accreditations:manage");

    const body = await req.json();
    const parsed = createEventSchema.parse(body);

    // Resolve venueId (or pick first venue belonging to tenant)
    let venueId = parsed.venueId;
    if (!venueId) {
      const firstVenue = await prisma.venue.findFirst({
        where: { tenantId, active: true },
        select: { id: true },
      });
      if (!firstVenue) {
        throw new BadRequestError("Debes registrar al menos un local/sede para asociar eventos");
      }
      venueId = firstVenue.id;
    }

    // Generate unique short code if not provided
    let code = parsed.code?.trim().toUpperCase();
    if (!code) {
      const prefix = parsed.name
        .replace(/[^A-Za-z0-9]/g, "")
        .substring(0, 4)
        .toUpperCase();
      const rand = Math.floor(1000 + Math.random() * 9000);
      code = `${prefix || "EVT"}-${rand}`;
    }

    // Verify code uniqueness
    const existing = await prisma.event.findUnique({
      where: { code },
    });
    if (existing) {
      code = `${code}-${Math.floor(10 + Math.random() * 90)}`;
    }

    const event = await prisma.event.create({
      data: {
        tenantId,
        venueId,
        name: parsed.name,
        code,
        description: parsed.description,
        eventType: parsed.eventType,
        organizerName: parsed.organizerName,
        responsibleCompany: parsed.responsibleCompany,
        companyRuc: parsed.companyRuc,
        locationName: parsed.locationName,
        address: parsed.address,
        startsAt: new Date(parsed.startsAt),
        endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
        timeSchedule: parsed.timeSchedule,
        maxCapacity: parsed.maxCapacity,
        daysCount: parsed.daysCount,
        bannerUrl: parsed.bannerUrl,
        logoUrl: parsed.logoUrl,
        isPublicRegistration: parsed.isPublicRegistration,
        status: "ACTIVE",
      },
    });

    // Create default categories if requested
    if (parsed.createDefaultCategories) {
      const defaultCategories = [
        { name: "VIP", code: "VIP", colorHex: "#8B5CF6", description: "Acceso total a todas las áreas", orderIndex: 0 },
        { name: "General / Participante", code: "GEN", colorHex: "#3B82F6", description: "Acceso a salas generales", orderIndex: 1 },
        { name: "Prensa & Medios", code: "PRENSA", colorHex: "#EC4899", description: "Acceso a sala de prensa y sesiones", orderIndex: 2 },
        { name: "Staff & Organización", code: "STAFF", colorHex: "#10B981", description: "Personal técnico y operativo", orderIndex: 3 },
        { name: "Disertante / Expositores", code: "EXPO", colorHex: "#F59E0B", description: "Conferencistas y expositores", orderIndex: 4 },
      ];

      for (const cat of defaultCategories) {
        await prisma.accreditationType.create({
          data: {
            tenantId,
            eventId: event.id,
            name: cat.name,
            code: cat.code,
            colorHex: cat.colorHex,
            description: cat.description,
            orderIndex: cat.orderIndex,
          },
        });
      }

      // Create default Access Point
      const mainGate = await prisma.accessPoint.create({
        data: {
          tenantId,
          eventId: event.id,
          name: "Entrada Principal",
          code: "GATE_MAIN",
          locationDetails: "Acceso peatonal principal",
          sectorType: "MAIN",
        },
      });

      // Link categories to main gate
      const allTypes = await prisma.accreditationType.findMany({
        where: { eventId: event.id },
      });
      for (const cat of allTypes) {
        await prisma.accessPointRule.create({
          data: {
            accessPointId: mainGate.id,
            accreditationTypeId: cat.id,
            isAllowed: true,
          },
        });
      }
    }

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
