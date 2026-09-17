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

  // Obtener nombre del establecimiento
  let tenantName = "Plataforma Central";
  if (session.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { name: true },
    });
    if (tenant) tenantName = tenant.name;
  } else if (session.role === "SUPER_ADMIN") {
    tenantName = "Vidjs Global SaaS (Admin)";
  }

  return (
    <DashboardShell
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
      tenantName={tenantName}
    >
      {children}
    </DashboardShell>
  );
}
