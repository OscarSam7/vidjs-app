"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  CalendarCheck2,
  ListMusic,
  CreditCard,
  ShieldCheck,
  Settings,
  Disc3,
  Palette,
  X,
  Headphones,
  Mic,
  ChevronDown,
  ChevronRight,
  Users,
  Sparkles,
  BarChart3,
  Trophy,
  Tv,
  Tags,
  IdCard,
  ScanLine,
  DoorOpen,
  UserCheck,
  UtensilsCrossed,
  ClipboardList,
  BookOpen,
  Layers,
  Package,
  LayoutGrid,
  Wine,
  ChefHat,
  ConciergeBell,
  Receipt,
  SmartphoneNfc,
  Boxes,
  FileSpreadsheet,
  History,
  FileBarChart2,
  SlidersHorizontal,
  Lock,
  MessageSquareWarning,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PlanCode,
  PLAN_LABELS,
  isPlanAtLeast,
  normalizePlanCode,
} from "@/lib/billing/plan-modules";

interface SidebarProps {
  currentPath?: string;
  role?: string;
  tenantName?: string;
  tenantLogo?: string | null;
  planCode?: string;
  planName?: string;
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
  requiredPlan: PlanCode;
  allowedRoles?: string[];
}

interface NavGroup {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPlan: PlanCode;
  href?: string; // Si es enlace directo sin submenú (ej. Dashboard)
  active?: boolean;
  items: MenuItem[];
}

export function Sidebar({
  role = "OWNER",
  tenantName = "Retro Bar",
  tenantLogo = null,
  planCode = "PRO",
  planName = "Plan Pro",
  isMobileOpen = false,
  onClose,
  isCollapsed = false,
}: SidebarProps) {
  const pathname = usePathname();
  const activePlan = normalizePlanCode(planCode);

  const groups: NavGroup[] = [
    {
      id: "dashboard",
      title: "Dashboard",
      icon: LayoutDashboard,
      requiredPlan: "PERSONAL",
      href: "/dashboard",
      active: pathname === "/dashboard",
      items: [],
    },
    {
      id: "gastronomy",
      title: "Gestión Gastronómica",
      icon: UtensilsCrossed,
      requiredPlan: "STARTER",
      items: [
        {
          name: "Dashboard Gastro",
          icon: UtensilsCrossed,
          href: "/dashboard/gastronomy",
          active: pathname === "/dashboard/gastronomy",
          badge: "POS",
          badgeVariant: "primary",
          requiredPlan: "STARTER",
        },
        {
          name: "Pedidos",
          icon: ClipboardList,
          href: "/dashboard/gastronomy/orders",
          active: pathname.startsWith("/dashboard/gastronomy/orders"),
          badge: "Live",
          badgeVariant: "success",
          requiredPlan: "STARTER",
        },
        {
          name: "Menú Digital",
          icon: BookOpen,
          href: "/dashboard/gastronomy/menu",
          active: pathname.startsWith("/dashboard/gastronomy/menu"),
          requiredPlan: "STARTER",
        },
        {
          name: "Categorías",
          icon: Layers,
          href: "/dashboard/gastronomy/categories",
          active: pathname.startsWith("/dashboard/gastronomy/categories"),
          requiredPlan: "STARTER",
        },
        {
          name: "Productos",
          icon: Package,
          href: "/dashboard/gastronomy/products",
          active: pathname.startsWith("/dashboard/gastronomy/products"),
          requiredPlan: "STARTER",
        },
        {
          name: "Barra (KDS)",
          icon: Wine,
          href: "/dashboard/gastronomy/bar",
          active: pathname.startsWith("/dashboard/gastronomy/bar"),
          badge: "KDS",
          badgeVariant: "karaoke",
          requiredPlan: "PRO",
        },
        {
          name: "Cocina (KDS)",
          icon: ChefHat,
          href: "/dashboard/gastronomy/kitchen",
          active: pathname.startsWith("/dashboard/gastronomy/kitchen"),
          badge: "KDS",
          badgeVariant: "dj",
          requiredPlan: "PRO",
        },
        {
          name: "Mozos",
          icon: ConciergeBell,
          href: "/dashboard/gastronomy/waiters",
          active: pathname.startsWith("/dashboard/gastronomy/waiters"),
          requiredPlan: "PRO",
        },
        {
          name: "Caja Gastronómica",
          icon: Receipt,
          href: "/dashboard/gastronomy/cashier",
          active: pathname.startsWith("/dashboard/gastronomy/cashier"),
          requiredPlan: "STARTER",
        },
        {
          name: "Pagos Digitales",
          icon: SmartphoneNfc,
          href: "/dashboard/gastronomy/payments",
          active: pathname.startsWith("/dashboard/gastronomy/payments"),
          requiredPlan: "PRO",
        },
        {
          name: "Inventario",
          icon: Boxes,
          href: "/dashboard/gastronomy/inventory",
          active: pathname.startsWith("/dashboard/gastronomy/inventory"),
          requiredPlan: "PRO",
        },
        {
          name: "Ventas por Facturar",
          icon: FileSpreadsheet,
          href: "/dashboard/gastronomy/invoicing",
          active: pathname.startsWith("/dashboard/gastronomy/invoicing"),
          badge: "ERP",
          badgeVariant: "primary",
          requiredPlan: "PRO",
        },
        {
          name: "Historial",
          icon: History,
          href: "/dashboard/gastronomy/history",
          active: pathname.startsWith("/dashboard/gastronomy/history"),
          requiredPlan: "STARTER",
        },
        {
          name: "Reportes Gastro",
          icon: FileBarChart2,
          href: "/dashboard/gastronomy/reports",
          active: pathname.startsWith("/dashboard/gastronomy/reports"),
          requiredPlan: "PRO",
        },
        {
          name: "Configuración Gastro",
          icon: SlidersHorizontal,
          href: "/dashboard/gastronomy/settings",
          active: pathname.startsWith("/dashboard/gastronomy/settings"),
          requiredPlan: "STARTER",
        },
      ],
    },
    {
      id: "accreditation",
      title: "Acreditación & Eventos",
      icon: IdCard,
      requiredPlan: "ENTERPRISE",
      items: [
        {
          name: "Dashboard Acreditación",
          icon: LayoutDashboard,
          href: "/dashboard/accreditation",
          active: pathname === "/dashboard/accreditation",
          requiredPlan: "ENTERPRISE",
        },
        {
          name: "Gestión de Eventos",
          icon: CalendarCheck2,
          href: "/dashboard/accreditation/events",
          active: pathname.startsWith("/dashboard/accreditation/events"),
          requiredPlan: "ENTERPRISE",
        },
        {
          name: "Participantes",
          icon: UserCheck,
          href: "/dashboard/accreditation/participants",
          active: pathname.startsWith("/dashboard/accreditation/participants"),
          requiredPlan: "ENTERPRISE",
        },
        {
          name: "Delegaciones",
          icon: Building2,
          href: "/dashboard/accreditation/organizations",
          active: pathname.startsWith("/dashboard/accreditation/organizations"),
          requiredPlan: "ENTERPRISE",
        },
        {
          name: "Tipos de Acreditación",
          icon: Tags,
          href: "/dashboard/accreditation/types",
          active: pathname.startsWith("/dashboard/accreditation/types"),
          requiredPlan: "ENTERPRISE",
        },
        {
          name: "Credenciales",
          icon: IdCard,
          href: "/dashboard/accreditation/badges",
          active: pathname.startsWith("/dashboard/accreditation/badges"),
          requiredPlan: "ENTERPRISE",
        },
        {
          name: "Escáner QR",
          icon: ScanLine,
          href: "/dashboard/accreditation/scanner",
          active: pathname.startsWith("/dashboard/accreditation/scanner"),
          badge: "Scan",
          badgeVariant: "primary",
          requiredPlan: "ENTERPRISE",
        },
        {
          name: "Puertas & Sectores",
          icon: DoorOpen,
          href: "/dashboard/accreditation/access-points",
          active: pathname.startsWith("/dashboard/accreditation/access-points"),
          requiredPlan: "ENTERPRISE",
        },
        {
          name: "Reportes Acceso",
          icon: BarChart3,
          href: "/dashboard/accreditation/reports",
          active: pathname.startsWith("/dashboard/accreditation/reports"),
          requiredPlan: "ENTERPRISE",
        },
      ],
    },
    {
      id: "entertainment",
      title: "Entretenimiento",
      icon: Headphones,
      requiredPlan: "PERSONAL",
      items: [
        {
          name: "Cabina DJ",
          icon: Headphones,
          href: "/dashboard/dj",
          active: pathname === "/dashboard/dj",
          badge: "DJ",
          badgeVariant: "dj",
          requiredPlan: "PERSONAL",
        },
        {
          name: "Cabina Karaoke",
          icon: Mic,
          href: "/dashboard/karaoke",
          active: pathname === "/dashboard/karaoke",
          badge: "KJ",
          badgeVariant: "karaoke",
          requiredPlan: "PERSONAL",
        },
        {
          name: "Biblioteca Musical",
          icon: ListMusic,
          href: "/dashboard/library",
          active: pathname === "/dashboard/library",
          requiredPlan: "PERSONAL",
        },
        {
          name: "Pantalla TV",
          icon: Tv,
          href: "/display/DEMO",
          active: pathname.startsWith("/display"),
          badge: "TV",
          badgeVariant: "success",
          requiredPlan: "PERSONAL",
        },
      ],
    },
    {
      id: "venue_management",
      title: "Gestión del Local",
      icon: Building2,
      requiredPlan: "PERSONAL",
      items: [
        {
          name: "Locales & Sedes",
          icon: Building2,
          href: "/dashboard#venues",
          active: false,
          requiredPlan: "STARTER",
        },
        {
          name: "Centro Unificado de Mesas",
          icon: LayoutGrid,
          href: "/dashboard/gastronomy/tables",
          active:
            pathname.startsWith("/dashboard/gastronomy/tables") ||
            pathname.startsWith("/dashboard/tables"),
          badge: "QR",
          badgeVariant: "primary",
          requiredPlan: "STARTER",
        },
        {
          name: "Eventos & Noches",
          icon: CalendarCheck2,
          href: "/dashboard/events",
          active: pathname === "/dashboard/events",
          requiredPlan: "PERSONAL",
        },
        {
          name: "Reservas VIP",
          icon: Sparkles,
          href: "/dashboard/reservations",
          active: pathname.startsWith("/dashboard/reservations"),
          badge: "VIP",
          badgeVariant: "primary",
          requiredPlan: "PRO",
        },
        {
          name: "Equipo & Roles",
          icon: Users,
          href: "/dashboard/team",
          active: pathname === "/dashboard/team",
          requiredPlan: "STARTER",
        },
        {
          name: "Buzón QSR (Privado)",
          icon: MessageSquareWarning,
          href: "/dashboard/qsr",
          active: pathname.startsWith("/dashboard/qsr"),
          badge: "VIP",
          badgeVariant: "dj",
          requiredPlan: "STARTER",
          allowedRoles: ["OWNER", "MANAGER", "SUPER_ADMIN"],
        },
      ],
    },
    {
      id: "analytics",
      title: "Análisis",
      icon: BarChart3,
      requiredPlan: "PRO",
      items: [
        {
          name: "Analítica & Reportes",
          icon: BarChart3,
          href: "/dashboard?tab=analytics",
          active: false,
          requiredPlan: "PRO",
        },
        {
          name: "Concursos & Votos",
          icon: Trophy,
          href: "/dashboard/contest",
          active: pathname === "/dashboard/contest",
          requiredPlan: "PRO",
        },
        {
          name: "Auditoría & Logs",
          icon: ShieldCheck,
          href: "/dashboard/audit",
          active: pathname === "/dashboard/audit",
          requiredPlan: "ENTERPRISE",
        },
      ],
    },
    {
      id: "customization",
      title: "Personalización",
      icon: Palette,
      requiredPlan: "PERSONAL",
      items: [
        {
          name: "Marca & White-Label",
          icon: Palette,
          href: "/dashboard/branding",
          active: pathname === "/dashboard/branding",
          requiredPlan: "PRO",
        },
        {
          name: "Configuración",
          icon: Settings,
          href: "/dashboard/settings",
          active: pathname === "/dashboard/settings",
          requiredPlan: "PERSONAL",
        },
      ],
    },
    {
      id: "account",
      title: "Cuenta",
      icon: CreditCard,
      requiredPlan: "PERSONAL",
      items: [
        {
          name: "Suscripción & Plan",
          icon: CreditCard,
          href: "/dashboard/subscription",
          active: pathname === "/dashboard/subscription",
          requiredPlan: "PERSONAL",
        },
        {
          name: "Showcase Comercial",
          icon: Sparkles,
          href: "/showcase",
          active: pathname === "/showcase",
          requiredPlan: "PERSONAL",
        },
      ],
    },
  ];

  // Todos los grupos ocultos/colapsados por defecto; solo se abre automáticamente el grupo activo
  const [openGroupId, setOpenGroupId] = useState<string | null>(() => {
    const activeGrp = groups.find((g) => g.items.some((it) => it.active));
    return activeGrp ? activeGrp.id : null;
  });

  useEffect(() => {
    const activeGrp = groups.find((g) => g.items.some((it) => it.active));
    if (activeGrp) {
      setOpenGroupId(activeGrp.id);
    }
  }, [pathname]);

  const toggleGroup = (groupId: string) => {
    setOpenGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const handleItemClick = (
    e: React.MouseEvent,
    item: MenuItem,
    isLocked: boolean,
    isMobile = false
  ) => {
    if (isMobile && onClose) onClose();
    if (isLocked) return;
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
            tenantLogo ? (
              <div
                className="w-9 h-9 rounded-xl bg-purple-950/70 border border-purple-700/50 p-1 flex items-center justify-center overflow-hidden shadow-sm shrink-0"
                title={tenantName}
              >
                <img src={tenantLogo} alt={tenantName} className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div
                className="w-8 h-8 rounded-xl bg-purple-950/70 border border-purple-700/50 flex items-center justify-center text-purple-300 shadow-sm shrink-0"
                title="VIDJEIS PRO"
              >
                <Disc3 className="w-4 h-4 text-purple-400" />
              </div>
            )
          ) : (
            <>
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                {tenantLogo ? (
                  <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-600/50 p-1 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                    <img src={tenantLogo} alt={tenantName} className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-purple-950/70 border border-purple-700/50 flex items-center justify-center text-purple-300 shadow-sm shrink-0">
                    <Disc3 className="w-4 h-4 text-purple-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-sm tracking-wide text-[#F8FAFC] block leading-tight truncate">
                    {tenantName || "VIDJSPRO"}
                  </span>
                  <span className="text-[10px] text-purple-400 font-medium block truncate">
                    {planName}
                  </span>
                </div>
              </div>

              {isMobile && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors shrink-0"
                  aria-label="Cerrar menú"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Active Tenant & Plan Card */}
        {collapsed ? (
          <Link
            href="/dashboard/subscription"
            className="mx-auto my-3 w-10 h-10 rounded-xl bg-navy-850 border border-navy-700 shrink-0 flex items-center justify-center relative group overflow-hidden"
            title={`${tenantName} • Plan ${PLAN_LABELS[activePlan]}`}
          >
            <Building2 className="w-4 h-4 text-slate-300 group-hover:text-purple-300 transition-colors" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse absolute top-1.5 right-1.5" />
          </Link>
        ) : (
          <Link
            href="/dashboard/subscription"
            onClick={() => isMobile && onClose?.()}
            className="p-3 mx-3 my-2.5 rounded-xl bg-[#111F38] hover:bg-[#162747] border border-[#263858] shrink-0 transition-colors block"
          >
            <div className="flex items-center justify-between gap-2 text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider mb-1">
              <span className="truncate">Plan Activo</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-600/25 text-purple-300 border border-purple-500/40 font-mono text-[9px] shrink-0">
                {PLAN_LABELS[activePlan]}
              </span>
            </div>
            <div className="text-xs font-semibold text-[#F8FAFC] truncate">
              {tenantName}
            </div>
          </Link>
        )}

        {/* 8 Secciones Principales Colapsables con Control por Plan */}
        <nav className={cn("flex-1 overflow-y-auto space-y-1.5 py-2", collapsed ? "px-1.5" : "px-3")}>
          {groups.map((group) => {
            const GroupIcon = group.icon;
            const groupUnlocked = isPlanAtLeast(activePlan, group.requiredPlan);
            const visibleItems = group.items.filter(
              (it) => !it.allowedRoles || it.allowedRoles.includes(role)
            );
            // Si el grupo no tiene enlaces directos y todos sus items están restringidos para este rol, ocultar el grupo
            if (!group.href && group.items.length > 0 && visibleItems.length === 0) {
              return null;
            }

            const hasActiveChild = visibleItems.some((it) => it.active);
            const isExpanded = openGroupId === group.id;

            // Modo Icono Colapsado en Desktop
            if (collapsed) {
              const targetHref = group.href
                ? group.href
                : groupUnlocked
                ? visibleItems[0]?.href || "/dashboard"
                : `/dashboard/subscription?required=${group.requiredPlan}`;

              return (
                <Link
                  key={group.id}
                  href={targetHref}
                  title={`${group.title}${!groupUnlocked ? ` (Plan ${PLAN_LABELS[group.requiredPlan]})` : ""}`}
                  className={cn(
                    "w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all relative group",
                    group.active || hasActiveChild
                      ? "bg-purple-950/60 text-purple-200 border border-purple-600/50 shadow-sm"
                      : groupUnlocked
                      ? "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-navy-800 border border-transparent hover:border-navy-700"
                      : "text-slate-600 hover:text-amber-300 border border-transparent opacity-70"
                  )}
                >
                  <GroupIcon className="w-4 h-4 shrink-0" />
                  {!groupUnlocked && (
                    <Lock className="w-2.5 h-2.5 text-amber-400 absolute bottom-1 right-1" />
                  )}
                </Link>
              );
            }

            // Enlace Directo (Dashboard)
            if (group.href) {
              return (
                <Link
                  key={group.id}
                  href={group.href}
                  onClick={() => isMobile && onClose?.()}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs transition-all relative",
                    group.active
                      ? "bg-purple-600/20 text-white border border-purple-500/40 font-bold shadow-sm"
                      : "text-slate-200 hover:text-white hover:bg-[#162747] border border-transparent font-semibold"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <GroupIcon
                      className={cn(
                        "w-4 h-4 shrink-0",
                        group.active ? "text-purple-400" : "text-slate-400"
                      )}
                    />
                    <span className="truncate">{group.title}</span>
                  </div>
                </Link>
              );
            }

            // Grupo Acordeón Desplegable
            return (
              <div
                key={group.id}
                className={cn(
                  "rounded-xl border transition-colors",
                  isExpanded || hasActiveChild
                    ? "bg-[#111F38]/70 border-[#263858]"
                    : "bg-transparent border-transparent hover:bg-[#111F38]/40"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer text-left",
                    hasActiveChild
                      ? "text-white font-bold"
                      : groupUnlocked
                      ? "text-slate-200 hover:text-white font-semibold"
                      : "text-slate-400 hover:text-slate-200 font-medium"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <GroupIcon
                      className={cn(
                        "w-4 h-4 shrink-0",
                        hasActiveChild
                          ? "text-purple-400"
                          : groupUnlocked
                          ? "text-slate-400"
                          : "text-slate-500"
                      )}
                    />
                    <span className="truncate leading-snug">{group.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!groupUnlocked && (
                      <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold uppercase">
                        <Lock className="w-2.5 h-2.5" />
                        <span>{PLAN_LABELS[group.requiredPlan]}</span>
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-2 pb-2 pt-0.5 space-y-1">
                    {visibleItems.map((item) => {
                      const ItemIcon = item.icon;
                      const isLocked = !isPlanAtLeast(activePlan, item.requiredPlan);
                      const targetHref = isLocked
                        ? `/dashboard/subscription?required=${item.requiredPlan}`
                        : item.href;

                      return (
                        <Link
                          key={item.name}
                          href={targetHref}
                          onClick={(e) => handleItemClick(e, item, isLocked, isMobile)}
                          className={cn(
                            "flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-all relative",
                            item.active && !isLocked
                              ? "bg-purple-600/25 text-white border border-purple-500/40 font-semibold"
                              : isLocked
                              ? "text-slate-500 hover:text-amber-200 hover:bg-amber-950/20 border border-transparent"
                              : "text-slate-300 hover:text-white hover:bg-[#162747] border border-transparent"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <ItemIcon
                              className={cn(
                                "w-3.5 h-3.5 shrink-0",
                                item.active && !isLocked
                                  ? "text-purple-300"
                                  : isLocked
                                  ? "text-slate-600"
                                  : "text-slate-400"
                              )}
                            />
                            <span className="truncate leading-snug">{item.name}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isLocked ? (
                              <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                                <Lock className="w-2.5 h-2.5" />
                                <span>{PLAN_LABELS[item.requiredPlan]}</span>
                              </span>
                            ) : item.badge ? (
                              <span
                                className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap border",
                                  item.badgeVariant === "dj"
                                    ? "bg-amber-950/70 text-amber-300 border-amber-800/60"
                                    : item.badgeVariant === "karaoke"
                                    ? "bg-cyan-950/70 text-cyan-300 border-cyan-800/60"
                                    : item.badgeVariant === "success"
                                    ? "bg-emerald-950/70 text-emerald-300 border-emerald-800/60"
                                    : item.badgeVariant === "primary"
                                    ? "bg-purple-950/70 text-purple-300 border-purple-800/60"
                                    : "bg-navy-800 text-slate-300 border-navy-700"
                                )}
                              >
                                {item.badge}
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer Session Info */}
        <div className="p-3 border-t border-[#263858] shrink-0 bg-[#0D1930]">
          {collapsed ? (
            <div className="flex flex-col items-center justify-center text-[10px] text-[#94A3B8] font-mono py-1">
              <span className="text-purple-400 font-bold">v1.0</span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 text-[11px] text-[#94A3B8] px-1 py-1">
              <span className="truncate">
                Rol: <strong className="text-[#F8FAFC] font-semibold">{role}</strong>
              </span>
              <span className="text-[#94A3B8] font-mono shrink-0">v1.0 SaaS</span>
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
