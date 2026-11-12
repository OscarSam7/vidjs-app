"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar, TopbarVenue } from "@/components/layout/Topbar";
import {
  getRequiredPlanForPath,
  isPlanAtLeast,
  normalizePlanCode,
  PLAN_LABELS,
} from "@/lib/billing/plan-modules";

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    role: string;
  };
  tenantName: string;
  tenantLogo?: string | null;
  venues?: TopbarVenue[];
  planCode?: string;
  planName?: string;
}

export function DashboardShell({
  children,
  user,
  tenantName,
  tenantLogo,
  venues = [],
  planCode = "PRO",
  planName = "Plan Pro",
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  // Cargar estado de colapsado desde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vidjs_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // Ignorar fallos en contextos privados
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("vidjs_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileMenuOpen((prev) => !prev);
    } else {
      toggleCollapsed();
    }
  };

  // Cerrar automáticamente el menú móvil cuando cambia la ruta
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const normalizedPlan = normalizePlanCode(planCode);
  const routeRule = getRequiredPlanForPath(pathname);
  const isRouteLocked = routeRule ? !isPlanAtLeast(normalizedPlan, routeRule.requiredPlan) : false;

  return (
    <div
      translate="no"
      className="notranslate flex min-h-screen bg-[#080F1F] text-[#F8FAFC] overflow-x-hidden selection:bg-purple-600/30 selection:text-white"
    >
      {/* Sidebar Desktop y Drawer Móvil (Única Navegación Principal Colapsable) */}
      <Sidebar
        role={user.role}
        tenantName={tenantName}
        tenantLogo={tenantLogo}
        planCode={normalizedPlan}
        planName={planName}
        isMobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapsed}
      />

      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden transition-all duration-200">
        <Topbar
          user={user}
          tenantName={tenantName}
          tenantLogo={tenantLogo}
          venues={venues}
          isSidebarCollapsed={isCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 lg:p-6 pb-8 sm:pb-10 max-w-7xl w-full mx-auto overflow-y-auto overflow-x-hidden">
          {isRouteLocked && routeRule ? (
            <div className="max-w-lg mx-auto my-10 p-6 sm:p-8 rounded-3xl bg-[#0D1930] border border-purple-500/30 shadow-2xl text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Requiere Plan {PLAN_LABELS[routeRule.requiredPlan]}
                </span>
                <h2 className="text-xl font-black text-white pt-1">{routeRule.title}</h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Tu establecimiento está actualmente en <strong className="text-white">{planName}</strong>.
                  Actualiza tu suscripción al plan <strong className="text-purple-300">{PLAN_LABELS[routeRule.requiredPlan]}</strong> para habilitar este módulo al instante.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <Link
                  href={`/dashboard/subscription?required=${routeRule.requiredPlan}`}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 transition-all"
                >
                  <span>Ver Planes y Actualizar</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Volver al Dashboard
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
