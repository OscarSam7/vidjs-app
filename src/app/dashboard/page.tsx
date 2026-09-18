import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";
import NightControlDashboard from "@/components/dashboard/NightControlDashboard";

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  // Si el usuario es DJ, enviarlo directamente a la Cabina del DJ
  if (session.role === "DJ") {
    redirect("/dashboard/dj");
  }

  // Resolver tenantId contextualmente de forma segura
  let tenantId = session.tenantId;
  if (!tenantId && session.role === "SUPER_ADMIN") {
    const firstTenant = await prisma.tenant.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true },
    }).catch(() => null);

    if (firstTenant) {
      tenantId = firstTenant.id;
    }
  }

  if (!tenantId) {
    redirect("/login");
  }

  let tenant = null;
  try {
    tenant = await prisma.tenant.findUnique({
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
  } catch (dbErr) {
    console.error("Error al consultar el tenant en DashboardPage:", dbErr);
  }

  if (!tenant) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-12 text-center rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-2">Establecimiento no encontrado</h2>
        <p className="text-sm text-zinc-400 mb-6">
          No se encontró información activa del establecimiento asociado a tu cuenta.
        </p>
        <a
          href="/login"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all"
        >
          Volver a iniciar sesión
        </a>
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
      initialVenues={(tenant.venues || []).map((v) => ({
        id: v.id,
        name: v.name,
        address: v.address,
        active: v.active,
        _count: v._count || { tables: 0, events: 0 },
      }))}
      planName={plan?.name}
      planPrice={plan ? formatCurrency(plan.priceCents, plan.currency) : "$0"}
      planStatus={subscription?.status || "INACTIVA"}
      auditLogs={(tenant.auditLogs || []).map((log) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : new Date(log.createdAt).toISOString(),
        user: log.user ? { name: log.user.name, role: log.user.role } : null,
      }))}
    />
  );
}
