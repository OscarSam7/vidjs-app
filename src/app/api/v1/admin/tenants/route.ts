import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    // Solo accesible por el rol SUPER_ADMIN
    await requireRole(["SUPER_ADMIN"]);

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status"); // "ACTIVE", "PENDING_APPROVAL", "SUSPENDED"
    const search = searchParams.get("search");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { users: { some: { email: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            phone: true,
            createdAt: true,
          },
        },
        subscription: {
          include: {
            plan: true,
          },
        },
        _count: {
          select: {
            venues: true,
            users: true,
            tables: true,
            events: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = tenants.map((t) => {
      const owner = t.users.find((u) => u.role === "OWNER") || t.users[0] || null;
      let serviceType = "FULL_VENUE";
      if (t.settings) {
        try {
          const parsed = JSON.parse(t.settings);
          serviceType = parsed.serviceType || "FULL_VENUE";
        } catch {}
      }

      // Cálculo de días restantes de suscripción
      let daysRemaining = 0;
      if (t.subscription?.currentPeriodEnd) {
        const diffMs = new Date(t.subscription.currentPeriodEnd).getTime() - Date.now();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status,
        logoUrl: t.logoUrl,
        serviceType,
        createdAt: t.createdAt,
        owner: owner
          ? {
              id: owner.id,
              name: owner.name,
              email: owner.email,
              phone: owner.phone,
              status: owner.status,
              createdAt: owner.createdAt,
            }
          : null,
        counts: {
          venues: t._count.venues,
          users: t._count.users,
          tables: t._count.tables,
          events: t._count.events,
        },
        subscription: t.subscription
          ? {
              id: t.subscription.id,
              status: t.subscription.status,
              planCode: t.subscription.plan.code,
              planName: t.subscription.plan.name,
              currentPeriodStart: t.subscription.currentPeriodStart,
              currentPeriodEnd: t.subscription.currentPeriodEnd,
              daysRemaining,
            }
          : null,
      };
    });

    // Métricas globales rápidas
    const totalTenants = await prisma.tenant.count();
    const activeTenants = await prisma.tenant.count({ where: { status: "ACTIVE" } });
    const pendingTenants = await prisma.tenant.count({ where: { status: "PENDING_APPROVAL" } });
    const suspendedTenants = await prisma.tenant.count({ where: { status: "SUSPENDED" } });

    return NextResponse.json({
      success: true,
      stats: {
        total: totalTenants,
        active: activeTenants,
        pending: pendingTenants,
        suspended: suspendedTenants,
      },
      data: formatted,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
