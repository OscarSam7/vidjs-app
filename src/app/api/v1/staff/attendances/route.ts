import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  getDailyAttendanceSheet,
  setManualAttendance,
  getGpsAttendanceHistory,
} from "@/lib/staff/staff-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let tenantId = searchParams.get("tenantId");
    const venueId = searchParams.get("venueId") || undefined;
    const view = searchParams.get("view") || "daily"; // "daily" | "gps"
    const date = searchParams.get("date") || undefined;

    if (!tenantId) {
      const firstTenant = await prisma.tenant.findFirst({ select: { id: true } });
      tenantId = firstTenant?.id || null;
    }

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant no encontrado" }, { status: 400 });
    }

    if (view === "gps") {
      const gpsHistory = await getGpsAttendanceHistory(tenantId, venueId);
      return NextResponse.json({ success: true, data: { gpsHistory } });
    }

    const dailySheet = await getDailyAttendanceSheet(tenantId, venueId, date);
    return NextResponse.json({ success: true, data: dailySheet });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener asistencias" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId: reqTenantId, staffMemberId, date, status, venueId, notes } = body;

    let tenantId = reqTenantId;
    if (!tenantId) {
      const firstTenant = await prisma.tenant.findFirst({ select: { id: true } });
      tenantId = firstTenant?.id;
    }

    if (!tenantId || !staffMemberId || !status) {
      return NextResponse.json(
        { success: false, error: "Faltan parámetros requeridos (staffMemberId, status)" },
        { status: 400 }
      );
    }

    const attendance = await setManualAttendance(
      tenantId,
      staffMemberId,
      date || new Date(),
      status,
      venueId,
      notes
    );

    return NextResponse.json({ success: true, data: { attendance } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar asistencia manual" },
      { status: 500 }
    );
  }
}
