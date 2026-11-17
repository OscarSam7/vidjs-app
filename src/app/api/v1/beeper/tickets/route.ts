import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createBeeperTicket } from "@/lib/beeper/beeper-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN", "OPERATOR"]);
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status"); // PREPARING, READY, ACKNOWLEDGED, DELIVERED
    const venueId = searchParams.get("venueId");
    const search = searchParams.get("search");

    const where: any = { tenantId };

    if (venueId && venueId !== "ALL") {
      where.venueId = venueId;
    }

    if (status && status !== "ALL") {
      where.status = status;
    } else {
      // Por defecto no mostrar los cancelados antiguos a menos que se filtre
      where.status = { in: ["PREPARING", "READY", "ACKNOWLEDGED", "DELIVERED"] };
    }

    if (search) {
      where.OR = [
        { shortCode: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
        { tableOrOrderNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    // Limitar entregados para no sobrecargar
    const tickets = await prisma.beeperTicket.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    });

    // Conteo estadístico rápido
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [preparingCount, readyCount, deliveredCount] = await Promise.all([
      prisma.beeperTicket.count({ where: { tenantId, status: "PREPARING" } }),
      prisma.beeperTicket.count({ where: { tenantId, status: { in: ["READY", "ACKNOWLEDGED"] } } }),
      prisma.beeperTicket.count({
        where: { tenantId, status: "DELIVERED", createdAt: { gte: today } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: tickets,
      counts: {
        preparing: preparingCount,
        ready: readyCount,
        delivered: deliveredCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al listar llamadores" },
      { status: error.status || 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN", "OPERATOR"]);
    const { tenantId } = await requireTenantContext();
    const body = await req.json();

    const ticket = await createBeeperTicket({
      tenantId,
      venueId: body.venueId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      tableOrOrderNumber: body.tableOrOrderNumber,
      prepMinutes: body.prepMinutes ? Number(body.prepMinutes) : undefined,
      shortCode: body.shortCode,
    });

    return NextResponse.json({ success: true, data: ticket });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear llamador" },
      { status: error.status || 400 }
    );
  }
}
