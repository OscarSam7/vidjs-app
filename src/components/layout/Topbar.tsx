"use client";

import React, { useState } from "react";
import {
  LogOut,
  Building2,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Wifi,
  ChevronDown,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Badge } from "@/components/ui/Badge";

export interface TopbarVenue {
  id: string;
  name: string;
  active: boolean;
}

interface TopbarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  tenantName: string;
  venues?: TopbarVenue[];
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function Topbar({
  user,
  tenantName,
  venues = [],
  isSidebarCollapsed,
  onToggleSidebar,
}: TopbarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState<string>(
    venues.length > 0 ? venues[0].id : ""
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const getRoleVariant = (role: string): "primary" | "success" | "dj" | "karaoke" | "neutral" => {
    switch (role) {
      case "SUPER_ADMIN":
        return "success";
      case "OWNER":
        return "primary";
      case "MANAGER":
        return "primary";
      case "DJ":
        return "dj";
      case "KARAOKE_HOST":
        return "karaoke";
      default:
        return "neutral";
    }
  };

  return (
    <header className="h-14 bg-[#080F1F]/90 backdrop-blur-md border-b border-[#263858] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0 transition-colors">
      {/* Left section: Sidebar toggle & Venue Selector */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white bg-[#111F38] hover:bg-[#162644] border border-[#263858] transition-all shrink-0 cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          aria-label={isSidebarCollapsed ? "Expandir menú de módulos" : "Minimizar menú de módulos"}
          title={isSidebarCollapsed ? "Expandir menú" : "Minimizar menú"}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-purple-400" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        {/* Venue Selector / Establecimiento */}
        <div className="flex items-center gap-2 min-w-0">
          {venues.length > 1 ? (
            <div className="relative flex items-center">
              <Building2 className="w-3.5 h-3.5 text-purple-400 absolute left-2.5 pointer-events-none" />
              <select
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="appearance-none bg-[#111F38] hover:bg-[#162644] border border-[#263858] rounded-xl pl-8 pr-7 py-1 text-xs font-semibold text-[#F8FAFC] outline-none focus:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500 cursor-pointer transition-colors max-w-[150px] sm:max-w-[200px] truncate shadow-sm"
                aria-label="Seleccionar sede o local"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#0D1930] text-[#F8FAFC]">
                    {v.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] absolute right-2 pointer-events-none" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#111F38] border border-[#263858] text-[#F8FAFC] text-xs font-semibold max-w-[160px] sm:max-w-[240px] truncate shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="truncate">{tenantName}</span>
            </div>
          )}

          {/* Connection Status Badge */}
          <div className="hidden md:flex items-center">
            <Badge variant="success" size="xs" pulse icon={<Wifi className="w-3 h-3" />}>
              SSE Conectado
            </Badge>
          </div>
        </div>
      </div>

      {/* Right section: User info, Role Badge, ThemeToggle, Logout */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* User Card */}
        <div className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l border-[#263858]">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-950/80 border border-purple-600/50 flex items-center justify-center text-purple-200 text-xs font-bold shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.25)]">
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-[#F8FAFC] leading-none truncate max-w-[130px]">
              {user.name}
            </div>
            <div className="text-[10px] text-[#94A3B8] font-mono mt-0.5 truncate max-w-[130px]">
              {user.email}
            </div>
          </div>
          <Badge variant={getRoleVariant(user.role)} size="xs">
            {user.role}
          </Badge>
        </div>

        {/* Theme Toggle */}
        <div className="hidden sm:block">
          <ThemeToggle variant="dropdown" />
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Cerrar sesión"
          className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-red-300 hover:bg-red-950/40 border border-transparent hover:border-red-800/60 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">{isLoggingOut ? "Saliendo..." : "Salir"}</span>
        </button>
      </div>
    </header>
  );
}
