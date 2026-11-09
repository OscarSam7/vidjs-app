"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LiveOrderSimulator from "@/components/gastronomy/LiveOrderSimulator";
import {
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
} from "lucide-react";

const SUBMODULES = [
  { name: "Dashboard", href: "/dashboard/gastronomy", icon: UtensilsCrossed },
  { name: "Pedidos", href: "/dashboard/gastronomy/orders", icon: ClipboardList },
  { name: "Menú digital", href: "/dashboard/gastronomy/menu", icon: BookOpen },
  { name: "Categorías", href: "/dashboard/gastronomy/categories", icon: Layers },
  { name: "Productos", href: "/dashboard/gastronomy/products", icon: Package },
  { name: "Mesas, sectores y QR", href: "/dashboard/gastronomy/tables", icon: LayoutGrid },
  { name: "Barra", href: "/dashboard/gastronomy/bar", icon: Wine },
  { name: "Cocina", href: "/dashboard/gastronomy/kitchen", icon: ChefHat },
  { name: "Mozos", href: "/dashboard/gastronomy/waiters", icon: ConciergeBell },
  { name: "Caja gastronómica", href: "/dashboard/gastronomy/cashier", icon: Receipt },
  { name: "Pagos digitales", href: "/dashboard/gastronomy/payments", icon: SmartphoneNfc },
  { name: "Inventario", href: "/dashboard/gastronomy/inventory", icon: Boxes },
  { name: "Facturación", href: "/dashboard/gastronomy/invoicing", icon: FileSpreadsheet },
  { name: "Historial", href: "/dashboard/gastronomy/history", icon: History },
  { name: "Reportes", href: "/dashboard/gastronomy/reports", icon: FileBarChart2 },
  { name: "Configuración", href: "/dashboard/gastronomy/settings", icon: SlidersHorizontal },
];

export default function GastronomyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      {/* Barra horizontal de acceso rápido a los 16 submódulos gastronómicos */}
      <div className="bg-[#0D1930]/90 border border-[#263858] rounded-2xl p-2 overflow-x-auto shadow-lg">
        <div className="flex items-center gap-1.5 min-w-max">
          {SUBMODULES.map((mod) => {
            const Icon = mod.icon;
            const isActive =
              mod.href === "/dashboard/gastronomy"
                ? pathname === "/dashboard/gastronomy"
                : pathname.startsWith(mod.href);

            return (
              <Link
                key={mod.href}
                href={mod.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/25 border border-purple-400/40"
                    : "text-slate-300 hover:text-white hover:bg-[#162747] border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{mod.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Simulador real de pedidos en vivo + Configurador rápido Barra/Cocina */}
      <LiveOrderSimulator />

      {children}
    </div>
  );
}
