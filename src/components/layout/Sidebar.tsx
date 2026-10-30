"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  CalendarCheck2,
  QrCode,
  ListMusic,
  CreditCard,
  ShieldCheck,
  Settings,
  Disc3,
  Palette,
  X,
  Headphones,
  Mic,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  Sparkles,
  BarChart3,
  Trophy,
  Tv,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentPath?: string;
  role?: string;
  tenantName?: string;
  isMobileOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface MenuItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  active?: boolean;
  badge?: string;
  badgeVariant?: "primary" | "dj" | "karaoke" | "neutral" | "success";
  tag?: string;
  external?: boolean;
}

interface NavCategory {
  title: string;
  items: MenuItem[];
}

export function Sidebar({
  role = "OWNER",
  tenantName = "Retro Bar",
  isMobileOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  const categories: NavCategory[] = [
    {
      title: "Principal",
      items: [
        {
          name: "Dashboard",
          icon: LayoutDashboard,
          href: "/dashboard",
          active: pathname === "/dashboard",
        },
      ],
    },
    {
      title: "Entretenimiento",
      items: [
        {
          name: "Cabina DJ (VirtualDJ)",
          icon: Headphones,
          href: "/dashboard/dj",
          active: pathname === "/dashboard/dj",
          badge: "DJ",
          badgeVariant: "dj",
        },
        {
          name: "Cabina Karaoke (KJ)",
          icon: Mic,
          href: "/dashboard/karaoke",
          active: pathname === "/dashboard/karaoke",
          badge: "KJ",
          badgeVariant: "karaoke",
        },
        {
          name: "Biblioteca Musical",
          icon: ListMusic,
          href: "/dashboard/library",
          active: pathname === "/dashboard/library",
          tag: "HQ",
        },
        {
          name: "Pantalla TV Proyección",
          icon: Tv,
          href: "/display/DEMO",
          active: pathname.startsWith("/display"),
          tag: "EN VIVO",
        },
      ],
    },
    {
      title: "Gestión del Local",
      items: [
        {
          name: "Locales & Sedes",
          icon: Building2,
          href: "/dashboard#venues",
          active: pathname === "/dashboard" && typeof window !== "undefined" && window.location.hash === "#venues",
        },
        {
          name: "Eventos & Noches",
          icon: CalendarCheck2,
          href: "/dashboard/events",
          active: pathname === "/dashboard/events",
        },
        {
          name: "Mesas & Códigos QR",
          icon: QrCode,
          href: "/dashboard/tables",
          active: pathname === "/dashboard/tables",
        },
        {
          name: "Equipo & Roles",
          icon: Users,
          href: "/dashboard/team",
          active: pathname === "/dashboard/team",
        },
      ],
    },
    {
      title: "Análisis",
      items: [
        {
          name: "Analítica & Reportes",
          icon: BarChart3,
          href: "/dashboard?tab=analytics",
          active: pathname === "/dashboard" && typeof window !== "undefined" && window.location.search.includes("tab=analytics"),
        },
        {
          name: "Concursos & Votaciones",
          icon: Trophy,
          href: "/dashboard/contest",
          active: pathname === "/dashboard/contest",
        },
        {
          name: "Auditoría & Registros",
          icon: ShieldCheck,
          href: "/dashboard/audit",
          active: pathname === "/dashboard/audit",
        },
      ],
    },
    {
      title: "Personalización",
      items: [
        {
          name: "Marca & White-Label",
          icon: Palette,
          href: "/dashboard/branding",
          active: pathname === "/dashboard/branding",
          tag: "Pro",
        },
        {
          name: "Configuración",
          icon: Settings,
          href: "/dashboard/settings",
          active: pathname === "/dashboard/settings",
        },
      ],
    },
    {
      title: "Cuenta",
      items: [
        {
          name: "Suscripción & Plan",
          icon: CreditCard,
          href: "/dashboard/subscription",
          active: pathname === "/dashboard/subscription",
        },
        {
          name: "Showcase Comercial",
          icon: Sparkles,
          href: "/showcase",
          active: pathname === "/showcase",
          tag: "VENTAS",
        },
      ],
    },
  ];

  const handleItemClick = (e: React.MouseEvent, item: MenuItem, isMobile = false) => {
    if (isMobile && onClose) onClose();
    if (pathname === "/dashboard/dj" && item.href === "/dashboard/library") {
      e.preventDefault();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("open-dj-library"));
      }
    }
  };

  const renderContent = (isMobile = false) => {
    const collapsed = !isMobile && isCollapsed;

    return (
      <div className="flex flex-col h-full bg-[#0D1930] text-[#F8FAFC]">
        {/* Brand Header */}
        <div
          className={cn(
            "h-16 flex items-center border-b border-[#263858] shrink-0 transition-all px-3 sm:px-4",
            collapsed ? "justify-center px-2" : "justify-between"
          )}
        >
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-2 rounded-xl bg-[#111F38] hover:bg-[#162644] border border-[#263858] text-purple-400 transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              title="Expandir menú lateral"
              aria-label="Expandir menú"
            >
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-600/50 flex items-center justify-center text-purple-300 shadow-[0_0_12px_rgba(139,92,246,0.25)] shrink-0">
                  <Disc3 className="w-4 h-4 text-purple-400 animate-[spin_8s_linear_infinite]" />
                </div>
                <div className="truncate">
                  <span className="font-bold text-sm tracking-wider text-[#F8FAFC] block leading-tight truncate">
                    VIDJEIS PRO
                  </span>
                  <span className="text-[10px] text-purple-400/80 font-mono font-medium block truncate tracking-wide uppercase">
                    SaaS Entertainment
                  </span>
                </div>
              </div>

              {isMobile ? (
                onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#111F38] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                    aria-label="Cerrar menú"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#111F38] border border-transparent hover:border-[#263858] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  title="Minimizar menú"
                  aria-label="Minimizar menú"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Tenant Isolated Indicator */}
        {collapsed ? (
          <div
            className="mx-auto my-3 w-10 h-10 rounded-xl bg-[#111F38] border border-[#263858] shrink-0 flex items-center justify-center relative cursor-pointer group hover:border-purple-500/50 transition-colors"
            title={`Establecimiento: ${tenantName}`}
            onClick={onToggleCollapse}
          >
            <Building2 className="w-4 h-4 text-slate-400 group-hover:text-purple-300 transition-colors" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse absolute top-1.5 right-1.5" />
          </div>
        ) : (
          <div className="p-3 mx-3 my-2.5 rounded-xl bg-[#111F38] border border-[#263858] shrink-0 shadow-sm">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider mb-1">
              <span>Local Activo</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Aislado
              </span>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#F8FAFC] truncate">
              {tenantName}
            </div>
          </div>
        )}

        {/* Categorized Navigation */}
        <nav
          className={cn("flex-1 overflow-y-auto space-y-4 py-2", collapsed ? "px-1.5" : "px-3")}
          aria-label="Navegación principal de VIDJEIS"
        >
          {categories.map((category) => (
            <div key={category.title} className="space-y-1">
              {!collapsed ? (
                <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/80 select-none">
                  {category.title}
                </div>
              ) : (
                <div className="my-2 border-t border-[#263858]/60" />
              )}

              {category.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.active;

                if (collapsed) {
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={(e) => handleItemClick(e, item, isMobile)}
                      title={item.name}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
                        isActive
                          ? "bg-purple-950/80 text-purple-200 border border-purple-500/50 shadow-[0_0_10px_rgba(139,92,246,0.2)]"
                          : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111F38] border border-transparent hover:border-[#263858]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-transform",
                          isActive
                            ? "text-purple-300"
                            : "text-slate-400 group-hover:text-slate-200 group-hover:scale-110"
                        )}
                      />
                      {item.badge && (
                        <span className="absolute -top-1 -right-1 text-[8px] font-bold px-1 rounded-full bg-purple-600 text-white border border-purple-400">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={(e) => handleItemClick(e, item, isMobile)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
                      isActive
                        ? "bg-gradient-to-r from-purple-950/70 to-purple-900/30 text-[#F8FAFC] border border-purple-600/40 font-semibold shadow-sm"
                        : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04] border border-transparent font-medium"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-purple-400 rounded-r-full shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                    )}

                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isActive
                            ? "text-purple-400"
                            : "text-[#94A3B8] group-hover:text-slate-200"
                        )}
                      />
                      <span className="truncate whitespace-nowrap">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-md font-mono font-bold whitespace-nowrap border",
                            item.badgeVariant === "dj"
                              ? "bg-amber-950/70 text-amber-300 border-amber-700/60"
                              : item.badgeVariant === "karaoke"
                              ? "bg-cyan-950/70 text-cyan-300 border-cyan-700/60"
                              : "bg-[#111F38] text-slate-300 border-[#263858]"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                      {item.tag && (
                        <span
                          className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold whitespace-nowrap border",
                            item.tag === "EN VIVO"
                              ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
                              : "bg-purple-950/80 text-purple-300 border-purple-700/60"
                          )}
                        >
                          {item.tag}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Session Info */}
        <div className="p-3 border-t border-[#263858] shrink-0 bg-[#0D1930]">
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-9 h-9 mx-auto rounded-xl bg-[#111F38] hover:bg-[#162644] border border-[#263858] text-purple-400 flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              title="Expandir menú"
              aria-label="Expandir menú"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#94A3B8] px-1">
                <span>
                  Rol: <strong className="text-[#F8FAFC] font-semibold">{role}</strong>
                </span>
                <span className="text-[#94A3B8] font-mono text-[10px]">v1.0 SaaS</span>
              </div>
              {!isMobile && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-2 rounded-xl bg-[#111F38] hover:bg-[#162644] border border-[#263858] text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  title="Minimizar hacia la izquierda"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Contraer menú</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col shrink-0 min-h-screen sticky top-0 h-screen select-none z-30 transition-all duration-200 border-r border-[#263858]",
          isCollapsed ? "w-[68px]" : "w-64"
        )}
      >
        {renderContent(false)}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-[#040813]/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] border-r border-[#263858] flex flex-col z-50 shadow-2xl h-full animate-in slide-in-from-left duration-200">
            {renderContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
