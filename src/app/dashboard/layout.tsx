import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  // Validar de forma segura si el usuario existe y sigue activo en la BD
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, status: true, tokenVersion: true },
  }).catch(() => null);

  if (!user || user.status !== "ACTIVE" || user.tokenVersion !== session.tokenVersion) {
    redirect("/login");
  }

  // Obtener nombre del establecimiento, logotipo y venues disponibles con fallback tolerante a fallos
  let tenantName = "Plataforma Central";
  let tenantLogo: string | null = null;
  let tenantId = session.tenantId;

  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, logoUrl: true, settings: true },
    }).catch(() => null);
    if (tenant) {
      tenantName = tenant.name;
      tenantLogo = tenant.logoUrl;
      if (!tenantLogo && tenant.settings) {
        try {
          const parsed = JSON.parse(tenant.settings);
          tenantLogo = parsed.branding?.logoUrl || parsed.logoUrl || null;
        } catch {}
      }
    }
  } else if (session.role === "SUPER_ADMIN") {
    tenantName = "CYNKO Central (Super Admin)";
    const firstTenant = await prisma.tenant.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, logoUrl: true, settings: true },
    }).catch(() => null);
    if (firstTenant) {
      tenantId = firstTenant.id;
      tenantName = `CYNKO Central (${firstTenant.name})`;
      tenantLogo = firstTenant.logoUrl;
      if (!tenantLogo && firstTenant.settings) {
        try {
          const parsed = JSON.parse(firstTenant.settings);
          tenantLogo = parsed.branding?.logoUrl || parsed.logoUrl || null;
        } catch {}
      }
    }
  }

  const [venues, subscription] = await Promise.all([
    tenantId
      ? prisma.venue
          .findMany({
            where: { tenantId, active: true },
            select: { id: true, name: true, active: true },
            orderBy: { name: "asc" },
          })
          .catch(() => [])
      : Promise.resolve([]),
    tenantId
      ? prisma.subscription
          .findUnique({
            where: { tenantId },
            include: { plan: { select: { code: true, name: true } } },
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const planCode = subscription?.plan?.code || "PRO";
  const planName = subscription?.plan?.name || "Plan Pro";

  // Bloqueo automático para clientes cuyo período de días asignado ha vencido
  if (session.role !== "SUPER_ADMIN" && subscription?.currentPeriodEnd) {
    const isExpired = new Date(subscription.currentPeriodEnd).getTime() <= Date.now();
    if (isExpired) {
      return (
        <div className="min-h-screen bg-[#070709] flex flex-col justify-center items-center px-4 py-12 text-center">
          <div className="max-w-md w-full bg-zinc-900/80 border border-rose-500/30 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[11px] font-mono font-bold">
                ACCESO BLOQUEADO &bull; TIEMPO EXPIRADO
              </span>
              <h2 className="text-2xl font-black text-white">
                Período de Servicio Finalizado
              </h2>
              <p className="text-sm text-zinc-300">
                Los días de acceso asignados para <strong className="text-white">{tenantName}</strong> han concluido.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 text-left space-y-1 font-mono">
              <div>Establecimiento: <span className="text-white font-bold">{tenantName}</span></div>
              <div>Vencimiento: <span className="text-rose-400">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span></div>
            </div>
            <p className="text-xs text-zinc-400">
              Para renovar tu suscripción y rehabilitar el acceso a mesas, cabina DJ y comandero, contacta al administrador de CYNKO:
            </p>
            <div className="space-y-2 pt-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Hola, el período de acceso de mi local "${tenantName}" en CYNKO OS ha concluido. Deseo renovar mi suscripción.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-xs shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
              >
                <span>Solicitar Renovación por WhatsApp</span>
              </a>
              <form action="/api/v1/auth/logout" method="POST">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Cerrar Sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <DashboardShell
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
      tenantName={tenantName}
      tenantLogo={tenantLogo}
      venues={venues}
      planCode={planCode}
      planName={planName}
    >
      {children}
    </DashboardShell>
  );
}
