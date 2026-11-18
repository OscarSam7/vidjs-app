import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getDayStart, getDayEnd } from "@/lib/staff/staff-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId");

    if (!staffId) {
      return NextResponse.json({ success: false, error: "ID de colaborador requerido" }, { status: 400 });
    }

    const staff = await prisma.staffMember.findUnique({
      where: { id: staffId },
      include: {
        venue: {
          select: { id: true, name: true, address: true, latitude: true, longitude: true, gpsRadiusMeters: true },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            venues: {
              select: { id: true, name: true, address: true, latitude: true, longitude: true, gpsRadiusMeters: true },
            },
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json({ success: false, error: "Colaborador no encontrado" }, { status: 404 });
    }

    const venue = staff.venue || staff.tenant.venues[0] || null;
    const dayStart = getDayStart();
    const dayEnd = getDayEnd();

    const attendance = await prisma.staffAttendance.findFirst({
      where: {
        staffMemberId: staff.id,
        date: { gte: dayStart, lte: dayEnd },
      },
      select: {
        id: true,
        status: true,
        checkInAt: true,
        checkOutAt: true,
        checkInDistance: true,
        checkOutDistance: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        staff: {
          id: staff.id,
          name: staff.name,
          role: staff.role,
        },
        venue: {
          id: venue?.id || null,
          name: venue?.name || "Sede Principal",
          address: venue?.address || null,
          latitude: venue?.latitude || null,
          longitude: venue?.longitude || null,
          gpsRadiusMeters: venue?.gpsRadiusMeters || 100,
        },
        attendance: {
          hasCheckedIn: !!attendance?.checkInAt,
          checkInAt: attendance?.checkInAt || null,
          hasCheckedOut: !!attendance?.checkOutAt,
          checkOutAt: attendance?.checkOutAt || null,
          status: attendance?.status || "PENDING",
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar estado" },
      { status: 500 }
    );
  }
}
