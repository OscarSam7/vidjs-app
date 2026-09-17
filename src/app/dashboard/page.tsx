import { requireTenantContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";
import NightControlDashboard from "@/components/dashboard/NightControlDashboard";

export default async function DashboardPage() {
  const { session, tenantId } = await requireTenantContext();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscription: {
        include: { plan: true },
      },
      venues: {
        include: {
          _count: { select: { tables: true, events: true } },
        },
      },
      events: {
        where: { status: "ACTIVE" },
        include: {
          venue: { select: { name: true } },
          _count: { select: { guestSessions: true, songRequests: true } },
        },
        orderBy: { startsAt: "asc" },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          user: { select: { name: true, role: true } },
        },
      },
      _count: {
        select: {
          venues: true,
          events: true,
          tables: true,
        },
      },
    },
  });

  if (!tenant) {
    return (
      <div className="p-8 text-center text-zinc-400">
        No se encontró información del establecimiento.
      </div>
    );
  }

  const subscription = tenant.subscription;
  const plan = subscription?.plan;

  return (
    <NightControlDashboard
      tenantName={tenant.name}
      tenantSlug={tenant.slug}
      userRole={session.role}
      userName={session.name}
      initialVenues={tenant.venues.map((v) => ({
        id: v.id,
        name: v.name,
        address: v.address,
        active: v.active,
        _count: v._count,
      }))}
      planName={plan?.name}
      planPrice={plan ? formatCurrency(plan.priceCents, plan.currency) : "$0"}
      planStatus={subscription?.status || "INACTIVA"}
      auditLogs={tenant.auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        createdAt: log.createdAt.toISOString(),
        user: log.user ? { name: log.user.name, role: log.user.role } : null,
      }))}
    />
  );
}
