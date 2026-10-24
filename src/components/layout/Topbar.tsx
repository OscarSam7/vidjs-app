"use client";

import { LogOut, User, Shield, Sparkles, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface TopbarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  tenantName: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function Topbar({ user, tenantName, isSidebarCollapsed, onToggleSidebar }: TopbarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700/60";
      case "OWNER":
        return "bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-700/60";
      case "MANAGER":
        return "bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-700/60";
      case "DJ":
        return "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-700/60";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    }
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800/80 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0">
      {/* Left section: Hamburger button (mobile/desktop) + Breadcrumb / Context */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Toggle Sidebar (Móvil y Desktop) */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
          aria-label={isSidebarCollapsed ? "Expandir menú de módulos" : "Minimizar menú de módulos hacia la izquierda"}
          title={isSidebarCollapsed ? "Expandir menú de herramientas" : "Minimizar herramientas hacia la izquierda"}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="hidden sm:inline text-xs text-slate-500 dark:text-zinc-400 shrink-0">Establecimiento:</span>
          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white px-2 sm:px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-1.5 min-w-0 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-[220px] md:max-w-none">{tenantName}</span>
          </span>
        </div>
      </div>

      {/* Right section: User info & Logout */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* User Card */}
        <div className="flex items-center gap-2 sm:gap-3 pr-2 sm:pr-3 border-r border-slate-200 dark:border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-600/20 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-700 dark:text-purple-300 text-xs font-bold shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-slate-900 dark:text-white leading-none truncate max-w-[140px]">{user.name}</div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate max-w-[140px]">{user.email}</div>
          </div>
          <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border ${getRoleBadgeColor(user.role)}`}>
            {user.role}
          </span>
        </div>

        {/* Selector Rápido de Tema (Sistema, Claro, Oscuro) */}
        <ThemeToggle variant="dropdown" />

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Cerrar sesión"
          className="p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent hover:border-red-200 dark:hover:border-red-900/40 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
