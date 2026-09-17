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
  ExternalLink,
  Palette,
} from "lucide-react";

interface SidebarProps {
  currentPath?: string;
  role?: string;
  tenantName?: string;
}

interface MenuItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  active?: boolean;
  badge?: string;
  tag?: string;
}

export function Sidebar({ role = "OWNER", tenantName = "Retro Bar" }: SidebarProps) {
  const pathname = usePathname();

  const menuItems: MenuItem[] = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard", active: pathname === "/dashboard" },
    { name: "Locales (Venues)", icon: Building2, href: "/dashboard#venues", badge: "2" },
    { name: "Eventos & Noches", icon: CalendarCheck2, href: "/dashboard#events", badge: "2 activos" },
    { name: "Mesas & Códigos QR", icon: QrCode, href: "/dashboard/tables", badge: "11", active: pathname === "/dashboard/tables" },
    { name: "Cola DJ & Deck", icon: ListMusic, href: "/dashboard/dj", active: pathname === "/dashboard/dj", badge: "En Vivo" },
    { name: "Marca & White-Label", icon: Palette, href: "/dashboard/branding", active: pathname === "/dashboard/branding", tag: "Nuevo" },
    { name: "Suscripción & Plan", icon: CreditCard, href: "/dashboard/subscription", active: pathname === "/dashboard/subscription" },
    { name: "Auditoría & Logs", icon: ShieldCheck, href: "#audit" },
    { name: "Configuración", icon: Settings, href: "#settings" },
  ];

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-zinc-800/80 gap-3">
        <div className="p-2 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400">
          <Disc3 className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <span className="font-extrabold text-sm tracking-wide text-white block">VIDJS PLATFORM</span>
          <span className="text-[10px] text-zinc-400 block font-medium">Entertainment SaaS</span>
        </div>
      </div>

      {/* Tenant Context Badge */}
      <div className="p-4 mx-3 my-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
        <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">Establecimiento</div>
        <div className="text-sm font-bold text-white truncate mt-0.5">{tenantName}</div>
        <div className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Tenant Aislado</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                item.active
                  ? "bg-purple-600/15 text-purple-300 border border-purple-500/20 font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${item.active ? "text-purple-400" : "text-zinc-400"}`} />
                <span>{item.name}</span>
              </div>
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
            </a>
          );
        })}
      </nav>

      {/* Footer System Info */}
      <div className="p-4 border-t border-zinc-800/80">
        <div className="flex items-center justify-between text-[11px] text-zinc-400">
          <span>Rol: <strong className="text-white">{role}</strong></span>
          <span className="text-zinc-400">v0.1.0</span>
        </div>
      </div>
    </aside>
  );
}
