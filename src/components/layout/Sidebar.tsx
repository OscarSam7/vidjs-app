"use client";

import { usePathname } from "next/navigation";
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
} from "lucide-react";

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
  tag?: string;
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

  const menuItems: MenuItem[] = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard", active: pathname === "/dashboard" },
    { name: "Cabina DJ (VirtualDJ)", icon: Headphones, href: "/dashboard/dj", active: pathname === "/dashboard/dj", badge: "DJ" },
    { name: "Cabina Karaoke (KJ)", icon: Mic, href: "/dashboard/karaoke", active: pathname === "/dashboard/karaoke", badge: "KJ" },
    { name: "Locales (Venues)", icon: Building2, href: "/dashboard#venues", badge: "2" },
    { name: "Eventos & Noches", icon: CalendarCheck2, href: "/dashboard#events", badge: "2 activos" },
    { name: "Mesas & Códigos QR", icon: QrCode, href: "/dashboard/tables", badge: "11", active: pathname === "/dashboard/tables" },
    { name: "Marca & White-Label", icon: Palette, href: "/dashboard/branding", active: pathname === "/dashboard/branding", tag: "Nuevo" },
    { name: "Suscripción & Plan", icon: CreditCard, href: "/dashboard/subscription", active: pathname === "/dashboard/subscription" },
    { name: "Auditoría & Logs", icon: ShieldCheck, href: "#audit" },
    { name: "Configuración", icon: Settings, href: "#settings" },
  ];

  const renderContent = (isMobile = false) => {
    const collapsed = !isMobile && isCollapsed;

    return (
      <>
        {/* Brand Header */}
        <div
          className={`h-16 flex items-center ${
            collapsed ? "justify-center px-2" : "justify-between px-4"
          } border-b border-zinc-800/80 shrink-0 transition-all`}
        >
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-2 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 text-purple-400 transition-all cursor-pointer group"
              title="Expandir menú de herramientas"
              aria-label="Expandir menú"
            >
              <ChevronRight className="w-5 h-5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 shrink-0">
                  <Disc3 className="w-5 h-5 text-purple-400" />
                </div>
                <div className="truncate">
                  <span className="font-extrabold text-sm tracking-wide text-white block truncate">
                    VIDJS PLATFORM
                  </span>
                  <span className="text-[10px] text-zinc-400 block font-medium truncate">
                    Entertainment SaaS
                  </span>
                </div>
              </div>

              {isMobile ? (
                onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                    aria-label="Cerrar menú"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors cursor-pointer"
                  title="Minimizar menú hacia la izquierda"
                  aria-label="Minimizar menú hacia la izquierda"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Tenant Context Badge */}
        {collapsed ? (
          <div
            className="mx-auto my-3 w-10 h-10 rounded-xl bg-zinc-900/90 border border-zinc-800 shrink-0 flex items-center justify-center relative cursor-pointer group"
            title={`Establecimiento: ${tenantName} (Tenant Aislado)`}
            onClick={onToggleCollapse}
          >
            <Building2 className="w-4 h-4 text-zinc-400 group-hover:text-purple-300 transition-colors" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse absolute top-1 right-1" />
          </div>
        ) : (
          <div className="p-3.5 mx-3 my-3 rounded-xl bg-zinc-900/90 border border-zinc-800 shrink-0">
            <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
              Establecimiento
            </div>
            <div className="text-sm font-bold text-white truncate mt-0.5">{tenantName}</div>
            <div className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Tenant Aislado</span>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className={`flex-1 ${collapsed ? "px-1.5" : "px-3"} space-y-1.5 overflow-y-auto`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            if (collapsed) {
              return (
                <a
                  key={item.name}
                  href={item.href}
                  title={item.name}
                  className={`w-11 h-11 mx-auto flex items-center justify-center rounded-xl transition-all relative group ${
                    item.active
                      ? "bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900/80 border border-transparent hover:border-zinc-800"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      item.active
                        ? "text-purple-400"
                        : "text-zinc-400 group-hover:text-zinc-200 group-hover:scale-110"
                    } transition-transform`}
                  />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 text-[8px] font-black px-1 rounded-full bg-purple-600 text-white border border-purple-400 shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </a>
              );
            }

            return (
              <a
                key={item.name}
                href={item.href}
                onClick={() => {
                  if (isMobile && onClose) onClose();
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  item.active
                    ? "bg-purple-600/15 text-purple-300 border border-purple-500/20 font-semibold"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${item.active ? "text-purple-400" : "text-zinc-400"}`}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {item.badge}
                    </span>
                  )}
                  {item.tag && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 font-semibold">
                      {item.tag}
                    </span>
                  )}
                </div>
              </a>
            );
          })}
        </nav>

        {/* Footer System Info & Collapse Action */}
        <div className="p-3 border-t border-zinc-800/80 shrink-0">
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-10 h-10 mx-auto rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-purple-500/40 text-zinc-400 hover:text-purple-300 flex items-center justify-center transition-all cursor-pointer"
              title="Expandir menú de módulos"
              aria-label="Expandir menú"
            >
              <PanelLeftOpen className="w-4 h-4 text-purple-400" />
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                <span>
                  Rol: <strong className="text-white">{role}</strong>
                </span>
                <span className="text-zinc-400 font-mono">v0.1.0</span>
              </div>
              {!isMobile && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-2 rounded-xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-white text-xs font-medium transition-all cursor-pointer"
                  title="Minimizar hacia la izquierda"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Minimizar menú</span>
                </button>
              )}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      {/* Desktop Sidebar (visible solo en pantallas grandes lg:flex) */}
      <aside
        className={`hidden lg:flex ${
          isCollapsed ? "w-[68px]" : "w-64"
        } bg-zinc-950 border-r border-zinc-800/80 flex-col shrink-0 min-h-screen sticky top-0 h-screen overflow-y-auto transition-all duration-300 select-none z-30`}
      >
        {renderContent(false)}
      </aside>

      {/* Mobile Drawer (visible solo en móvil cuando se abre) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop con blur */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Deslizante */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-zinc-950 border-r border-zinc-800 flex flex-col z-50 shadow-2xl h-full animate-in slide-in-from-left duration-200">
            {renderContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
