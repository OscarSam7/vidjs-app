import { NextResponse } from "next/server";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    // 1. Autorización: Se requiere rol administrativo (OWNER, MANAGER o SUPER_ADMIN)
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);

    // 2. Contexto multi-tenant estricto
    const { session, tenantId } = await requireTenantContext();

    // 3. Consultar datos del Tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Establecimiento no encontrado" } },
        { status: 404 }
      );
    }

    // 4. Métricas filtradas 100% por tenantId (Aislamiento Multi-Tenant)
    const [venuesCount, totalEventsCount, activeEventsCount, tablesCount, venues, activeEvents, recentLogs] =
      await Promise.all([
        prisma.venue.count({ where: { tenantId } }),
        prisma.event.count({ where: { tenantId } }),
        prisma.event.count({ where: { tenantId, status: "ACTIVE" } }),
        prisma.table.count({ where: { tenantId } }),
        prisma.venue.findMany({
          where: { tenantId },
          include: {
            _count: {
              select: {
                tables: true,
                events: true,
              },
            },
          },
          take: 5,
        }),
        prisma.event.findMany({
          where: { tenantId, status: "ACTIVE" },
          include: {
            venue: {
              select: { name: true },
            },
            _count: {
              select: {
                guestSessions: true,
                songRequests: true,
              },
            },
          },
          orderBy: { startsAt: "asc" },
          take: 5,
        }),
        prisma.auditLog.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            user: {
              select: { name: true, role: true },
            },
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          logoUrl: tenant.logoUrl,
        },
        metrics: {
          venuesCount,
          totalEventsCount,
          activeEventsCount,
          tablesCount,
        },
        subscription: tenant.subscription
          ? {
              status: tenant.subscription.status,
              planName: tenant.subscription.plan.name,
              planCode: tenant.subscription.plan.code,
              priceCents: tenant.subscription.plan.priceCents,
              currency: tenant.subscription.plan.currency,
              interval: tenant.subscription.plan.interval,
              currentPeriodEnd: tenant.subscription.currentPeriodEnd,
              maxVenues: tenant.subscription.plan.maxVenues,
              maxTables: tenant.subscription.plan.maxActiveTables,
            }
          : null,
        venues: venues.map((v) => ({
          id: v.id,
          name: v.name,
          slug: v.slug,
          address: v.address,
          active: v.active,
          tablesCount: v._count.tables,
          eventsCount: v._count.events,
        })),
        activeEvents: activeEvents.map((e) => ({
          id: e.id,
          name: e.name,
          code: e.code,
          status: e.status,
          startsAt: e.startsAt,
          venueName: e.venue.name,
          activeSessionsCount: e._count.guestSessions,
          songRequestsCount: e._count.songRequests,
        })),
        recentActivity: recentLogs.map((log) => ({
          id: log.id,
          action: log.action,
          resource: log.resource,
          createdAt: log.createdAt,
          userName: log.user?.name || "Sistema",
          userRole: log.user?.role || "SYSTEM",
        })),
        currentUser: {
          id: session.sub,
          name: session.name,
          email: session.email,
          role: session.role,
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
