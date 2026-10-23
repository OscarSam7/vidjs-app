import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/v1/tables/staff-members
 * Retorna los miembros del equipo activos (DJ, Manager, Staff/Operador, Propietario)
 * para asignar como responsables de mesas ocupadas sin registro de clientes.
 */
export async function GET() {
  try {
    const { tenantId, session } = await requireTenantContext();
    await requireRole(["DJ", "MANAGER", "OWNER", "SUPER_ADMIN", "OPERATOR"]);

    const teamUsers = await prisma.user.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: [
        { role: "asc" },
        { name: "asc" },
      ],
    });

    // Formatear opciones predeterminadas útiles para el establecimiento
    const staffList = [
      {
        id: "current_user",
        name: `${session.name} (Tú - ${session.role})`,
        role: session.role,
        isSelf: true,
      },
      {
        id: "booth_dj",
        name: "🎧 Cabina DJ de Turno",
        role: "DJ",
        isPreset: true,
      },
      {
        id: "bar_staff",
        name: "🍸 Personal de Barra / Mozo",
        role: "OPERATOR",
        isPreset: true,
      },
      ...teamUsers
        .filter((u) => u.id !== session.sub)
        .map((u) => ({
          id: u.id,
          name: `${u.name} (${u.role === "OPERATOR" ? "Staff" : u.role})`,
          role: u.role,
          email: u.email,
        })),
    ];

    return NextResponse.json({
      success: true,
      data: staffList,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
