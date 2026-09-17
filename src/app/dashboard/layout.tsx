import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

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
    <div className="flex min-h-screen bg-[#070709] text-zinc-100">
      <Sidebar role={session.role} tenantName={tenantName} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={{
            name: session.name,
            email: session.email,
            role: session.role,
          }}
          tenantName={tenantName}
        />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
