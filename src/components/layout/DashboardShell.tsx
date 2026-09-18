"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    role: string;
  };
  tenantName: string;
}

export function DashboardShell({ children, user, tenantName }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Cerrar automáticamente el menú móvil cuando cambia la ruta
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-[#070709] text-zinc-100 overflow-x-hidden">
      {/* Sidebar Desktop y Drawer Móvil */}
      <Sidebar
        role={user.role}
        tenantName={tenantName}
        isMobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <Topbar
          user={user}
          tenantName={tenantName}
          onToggleSidebar={() => setMobileMenuOpen((prev) => !prev)}
        />
        <main className="flex-1 p-3 sm:p-5 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto overflow-x-hidden max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
