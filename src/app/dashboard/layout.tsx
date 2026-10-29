import { redirect } from "next/navigation";
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

  // Obtener nombre del establecimiento y venues disponibles con fallback tolerante a fallos
  let tenantName = "Plataforma Central";
  let tenantId = session.tenantId;

  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    }).catch(() => null);
    if (tenant) tenantName = tenant.name;
  } else if (session.role === "SUPER_ADMIN") {
    tenantName = "Vidjeis Global SaaS (Admin)";
    const firstTenant = await prisma.tenant.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
    }).catch(() => null);
    if (firstTenant) {
      tenantId = firstTenant.id;
      tenantName = `${firstTenant.name} (Global)`;
    }
  }

  const venues = tenantId
    ? await prisma.venue
        .findMany({
          where: { tenantId, active: true },
          select: { id: true, name: true, active: true },
          orderBy: { name: "asc" },
        })
        .catch(() => [])
    : [];

  return (
    <DashboardShell
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
      tenantName={tenantName}
      venues={venues}
    >
      {children}
    </DashboardShell>
  );
}
