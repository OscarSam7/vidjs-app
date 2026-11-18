import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inviteKey, staffId, deviceId } = body;

    let staff = null;

    if (inviteKey) {
      const cleanKey = inviteKey.trim().toUpperCase();
      const now = new Date();

      staff = await prisma.staffMember.findFirst({
        where: {
          inviteKey: cleanKey,
          status: "ACTIVE",
          inviteExpiresAt: { gte: now },
        },
        include: {
          venue: {
            select: { id: true, name: true, slug: true, address: true, latitude: true, longitude: true, gpsRadiusMeters: true },
          },
          tenant: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              venues: {
                select: { id: true, name: true, slug: true, address: true, latitude: true, longitude: true, gpsRadiusMeters: true },
              },
            },
          },
        },
      });

      if (!staff) {
        return NextResponse.json(
          { success: false, error: "Clave de invitación inválida o expirada (las claves duran 24 horas)." },
          { status: 401 }
        );
      }

      // Marcar app vinculada
      await prisma.staffMember.update({
        where: { id: staff.id },
        data: { hasApp: true, appDeviceId: deviceId || null },
      });
    } else if (staffId) {
      staff = await prisma.staffMember.findUnique({
        where: { id: staffId, status: "ACTIVE" },
        include: {
          venue: {
            select: { id: true, name: true, slug: true, address: true, latitude: true, longitude: true, gpsRadiusMeters: true },
          },
          tenant: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              venues: {
                select: { id: true, name: true, slug: true, address: true, latitude: true, longitude: true, gpsRadiusMeters: true },
              },
            },
          },
        },
      });

      if (!staff) {
        return NextResponse.json(
          { success: false, error: "Sesión de colaborador no encontrada." },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Debes ingresar tu clave de invitación." },
        { status: 400 }
      );
    }

    const assignedVenue = staff.venue || staff.tenant.venues[0] || null;

    return NextResponse.json({
      success: true,
      data: {
        staff: {
          id: staff.id,
          name: staff.name,
          role: staff.role,
          email: staff.email,
          phone: staff.phone,
          salaryType: staff.salaryType,
        },
        venue: assignedVenue,
        tenant: {
          id: staff.tenant.id,
          name: staff.tenant.name,
          logoUrl: staff.tenant.logoUrl,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al autenticar colaborador" },
      { status: 500 }
    );
  }
}
