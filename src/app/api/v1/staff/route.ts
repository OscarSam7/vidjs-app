import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getStaffMembers } from "@/lib/staff/staff-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let tenantId = searchParams.get("tenantId");
    const venueId = searchParams.get("venueId") || undefined;

    if (!tenantId) {
      const firstTenant = await prisma.tenant.findFirst({ select: { id: true } });
      tenantId = firstTenant?.id || null;
    }

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant no encontrado" }, { status: 400 });
    }

    const { members, pendingKeys } = await getStaffMembers(tenantId, venueId);

    // Obtener también venues para selector
    const venues = await prisma.venue.findMany({
      where: { tenantId },
      select: { id: true, name: true, slug: true, latitude: true, longitude: true, gpsRadiusMeters: true },
    });

    return NextResponse.json({
      success: true,
      data: { members, pendingKeys, venues },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener equipo" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId: reqTenantId, venueId, name, email, phone, role, salaryType, salaryAmount } = body;

    let tenantId = reqTenantId;
    if (!tenantId) {
      const firstTenant = await prisma.tenant.findFirst({ select: { id: true } });
      tenantId = firstTenant?.id;
    }

    if (!tenantId || !name?.trim()) {
      return NextResponse.json(
        { success: false, error: "El nombre del colaborador es requerido" },
        { status: 400 }
      );
    }

    const newStaff = await prisma.staffMember.create({
      data: {
        tenantId,
        venueId: venueId || null,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        role: role || "OPERATOR",
        salaryType: salaryType || "MONTHLY",
        salaryAmount: salaryAmount ? parseFloat(salaryAmount) : null,
      },
      include: {
        venue: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: { staffMember: newStaff } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear colaborador" },
      { status: 500 }
    );
  }
}
