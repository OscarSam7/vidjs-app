import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);
    const { tenantId, session } = await requireTenantContext();

    const where: any = {};
    if (session.role !== "SUPER_ADMIN" || tenantId) {
      where.tenantId = tenantId;
    }

    const [
      totalTickets,
      pendingCount,
      urgentCount,
      ratingsData,
      byType,
      byCategory,
      recentResolved,
    ] = await Promise.all([
      prisma.qsrTicket.count({ where }),
      prisma.qsrTicket.count({ where: { ...where, status: "PENDING" } }),
      prisma.qsrTicket.count({
        where: { ...where, status: { in: ["PENDING", "IN_PROGRESS"] }, priority: "URGENT" },
      }),
      prisma.qsrTicket.aggregate({
        where: { ...where, rating: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.qsrTicket.groupBy({
        by: ["type"],
        where,
        _count: { id: true },
      }),
      prisma.qsrTicket.groupBy({
        by: ["category"],
        where,
        _count: { id: true },
      }),
      prisma.qsrTicket.count({
        where: { ...where, status: "RESOLVED" },
      }),
    ]);

    const resolutionRate = totalTickets > 0 ? Math.round((recentResolved / totalTickets) * 100) : 100;
    const avgRating = ratingsData._avg.rating ? Number(ratingsData._avg.rating.toFixed(1)) : 5.0;

    return NextResponse.json({
      totalTickets,
      pendingCount,
      urgentCount,
      resolvedCount: recentResolved,
      resolutionRate,
      avgRating,
      totalRatings: ratingsData._count.rating,
      byType: byType.map((t) => ({ type: t.type, count: t._count.id })),
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.id })),
    });
  } catch (error: any) {
    if (error?.status === 403) {
      return NextResponse.json(
        { error: "Acceso denegado. Exclusivo para Gerencia y Dueño." },
        { status: 403 }
      );
    }
    console.error("[QSR STATS ERROR]", error);
    return NextResponse.json({ error: "Error al obtener estadísticas QSR." }, { status: 500 });
  }
}
