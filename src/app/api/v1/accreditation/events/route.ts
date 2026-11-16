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
  pin: z.string().optional().nullable(),
  isPublicRegistration: z.boolean().default(false),
  createDefaultCategories: z.boolean().default(true),
  artists: z
    .array(
      z.object({
        name: z.string(),
        role: z.string(),
        time: z.string().optional(),
      })
    )
    .optional(),
  customCategories: z
    .array(
      z.object({
        name: z.string(),
        code: z.string(),
        colorHex: z.string().default("#8B5CF6"),
        maxAvailable: z.number().optional().nullable(),
        allowReentry: z.boolean().default(true),
        description: z.string().optional(),
      })
    )
    .optional(),
  eventDaysList: z
    .array(
      z.object({
        dayNumber: z.number().default(1),
        name: z.string(),
        date: z.string(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
      })
    )
    .optional(),
  staff: z
    .array(
      z.object({
        name: z.string(),
        role: z.string(),
        phone: z.string().optional(),
      })
    )
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const venueId = searchParams.get("venueId");

    const whereClause: any = { tenantId };
    if (venueId && venueId !== "ALL") {
      whereClause.venueId = venueId;
    }
    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
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
        accreditationTypes: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            code: true,
            colorHex: true,
            maxAvailable: true,
            _count: {
              select: {
                participants: true,
              },
            },
          },
          orderBy: { orderIndex: "asc" },
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

      // Calcular lotes de entradas y ventas financieras (Red Ticket Suite)
      const typesList = event.accreditationTypes || [];
      let totalCapacity = event.maxCapacity || 0;
      let calculatedGross = 0;

      const tiers = typesList.map((t) => {
        const sold = t._count?.participants || 0;
        const max = t.maxAvailable || 100;
        if (!event.maxCapacity) totalCapacity += max;

        let price = 50000;
        const lowerName = t.name.toLowerCase();
        if (lowerName.includes("feijoada") || lowerName.includes("combo")) price = 120000;
        else if (lowerName.includes("camarote") || lowerName.includes("vip")) price = 300000;
        else if (lowerName.includes("general") || lowerName.includes("lote")) price = 60000;
        else if (lowerName.includes("cortesia") || lowerName.includes("staff")) price = 0;

        calculatedGross += sold * price;
        return {
          id: t.id,
          name: t.name,
          code: t.code,
          colorHex: t.colorHex,
          sold,
          max,
          price,
        };
      });

      if (!totalCapacity) totalCapacity = Math.max(totalParticipants, 400);
      const commission = Math.round(calculatedGross * 0.02); // 2% comisión Redticket

      const { accreditations, ...rest } = event;

      return {
        ...rest,
        financials: {
          totalSold: totalParticipants,
          totalCapacity,
          grossRevenue: calculatedGross,
          commission,
          currency: "Gs",
          tiers,
        },
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

    const settingsObj = {
      artists: parsed.artists || [],
      staff: parsed.staff || [],
      responsibleProducer: parsed.organizerName || "Rumba Stage",
    };

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
        pin: parsed.pin,
        settings: JSON.stringify(settingsObj),
        isPublicRegistration: parsed.isPublicRegistration,
        status: "ACTIVE",
      },
    });

    // 1. Create Event Days if provided
    if (parsed.eventDaysList && parsed.eventDaysList.length > 0) {
      for (const day of parsed.eventDaysList) {
        await prisma.eventDay.create({
          data: {
            eventId: event.id,
            dayNumber: day.dayNumber,
            name: day.name,
            date: new Date(day.date),
            startTime: day.startTime || null,
            endTime: day.endTime || null,
            active: true,
          },
        }).catch(() => null);
      }
    }

    // 2. Create Categories: custom or default
    const categoriesToCreate =
      parsed.customCategories && parsed.customCategories.length > 0
        ? parsed.customCategories.map((c, idx) => ({
            name: c.name,
            code: c.code,
            colorHex: c.colorHex || "#8B5CF6",
            description: c.description || "",
            maxAvailable: c.maxAvailable || null,
            allowReentry: c.allowReentry ?? true,
            orderIndex: idx,
          }))
        : parsed.createDefaultCategories
        ? [
            { name: "VIP", code: "VIP", colorHex: "#8B5CF6", description: "Acceso total a todas las áreas", orderIndex: 0, allowReentry: true },
            { name: "General / Participante", code: "GEN", colorHex: "#3B82F6", description: "Acceso a salas generales", orderIndex: 1, allowReentry: true },
            { name: "Prensa & Medios", code: "PRENSA", colorHex: "#EC4899", description: "Acceso a sala de prensa y sesiones", orderIndex: 2, allowReentry: true },
            { name: "Staff & Organización", code: "STAFF", colorHex: "#10B981", description: "Personal técnico y operativo", orderIndex: 3, allowReentry: true },
            { name: "Disertante / Expositores", code: "EXPO", colorHex: "#F59E0B", description: "Conferencistas y expositores", orderIndex: 4, allowReentry: true },
          ]
        : [];

    for (const cat of categoriesToCreate) {
      await prisma.accreditationType.create({
        data: {
          tenantId,
          eventId: event.id,
          name: cat.name,
          code: cat.code,
          colorHex: cat.colorHex,
          description: cat.description,
          maxAvailable: (cat as any).maxAvailable || null,
          allowReentry: (cat as any).allowReentry ?? true,
          orderIndex: cat.orderIndex,
        },
      });
    }

    // 3. Create Default Access Point
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

    // Link all categories to main gate
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
      }).catch(() => null);
    }

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
