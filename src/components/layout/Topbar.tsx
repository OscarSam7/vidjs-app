"use client";

import { LogOut, User, Shield, Sparkles } from "lucide-react";
import { useState } from "react";

interface TopbarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  tenantName: string;
}

export function Topbar({ user, tenantName }: TopbarProps) {
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
        return "bg-emerald-950/70 text-emerald-300 border-emerald-700/60";
      case "OWNER":
        return "bg-purple-950/70 text-purple-300 border-purple-700/60";
      case "MANAGER":
        return "bg-indigo-950/70 text-indigo-300 border-indigo-700/60";
      case "DJ":
        return "bg-cyan-950/70 text-cyan-300 border-cyan-700/60";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  return (
    <header className="h-16 bg-zinc-950/70 backdrop-blur-md border-b border-zinc-800/80 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left section: Breadcrumb / Context */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-400">Establecimiento:</span>
        <span className="text-sm font-semibold text-white px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          {tenantName}
        </span>
      </div>

      {/* Right section: User info & Logout */}
      <div className="flex items-center gap-4">
        {/* User Card */}
        <div className="flex items-center gap-3 pr-3 border-r border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 text-xs font-bold">
            {user.name.charAt(0)}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-white leading-none">{user.name}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">{user.email}</div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(user.role)}`}>
            {user.role}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Cerrar sesión"
          className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-900/40 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">Cerrar Sesión</span>
        </button>
      </div>
    </header>
  );
}
