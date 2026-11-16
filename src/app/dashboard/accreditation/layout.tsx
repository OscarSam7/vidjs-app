"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AccreditationProvider,
  useAccreditation,
  AccreditationEventSummary,
} from "@/lib/accreditation/context";
import {
  LayoutDashboard,
  CalendarCheck2,
  UserCheck,
  Building2,
  Tags,
  IdCard,
  ScanLine,
  DoorOpen,
  BarChart3,
  Plus,
  Wifi,
  WifiOff,
  ChevronDown,
  Sparkles,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { VipSelectModal } from "@/components/ui/VipSelectModal";
import { cn } from "@/lib/utils";
import { EventWizardModal } from "@/components/accreditation/EventWizardModal";

function AccreditationHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    events,
    activeEvent,
    activeEventId,
    setActiveEventId,
    activeVenueId,
    isLoading,
    isOnline,
    refreshEvents,
    createEventModalOpen,
    setCreateEventModalOpen,
  } = useAccreditation();

  const navLinks = [
    { name: "Resumen", href: "/dashboard/accreditation", icon: LayoutDashboard, exact: true },
    { name: "Eventos", href: "/dashboard/accreditation/events", icon: CalendarCheck2 },
    { name: "Participantes", href: "/dashboard/accreditation/participants", icon: UserCheck },
    { name: "Empresas", href: "/dashboard/accreditation/organizations", icon: Building2 },
    { name: "Categorías", href: "/dashboard/accreditation/types", icon: Tags },
    { name: "Credenciales", href: "/dashboard/accreditation/badges", icon: IdCard },
    { name: "Escáner QR", href: "/dashboard/accreditation/scanner", icon: ScanLine, badge: "Scan" },
    { name: "Puertas", href: "/dashboard/accreditation/access-points", icon: DoorOpen },
    { name: "Reportes", href: "/dashboard/accreditation/reports", icon: BarChart3 },
  ];

  return (
    <>
      <div className="bg-[#0A1322] border-b border-[#263858] pb-0 mb-6 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 sticky top-0 z-30 shadow-md backdrop-blur-md bg-opacity-95">
        {/* Top bar with Active Event Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-sm shrink-0">
              <IdCard className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Acreditaciones & Control de Acceso
                </h1>
                <Badge variant="primary" className="text-[10px] uppercase font-mono px-2 py-0.5">
                  Pro RedTicket Suite
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Gestión integral de credenciales, registro, impresión masiva y verificación QR
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Online / Offline status */}
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border",
                isOnline
                  ? "bg-emerald-950/50 text-emerald-300 border-emerald-800/60"
                  : "bg-amber-950/60 text-amber-300 border-amber-800/60 animate-pulse"
              )}
              title={isOnline ? "Conectado al servidor central" : "Modo Offline Activo"}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>En Línea</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Modo Offline</span>
                </>
              )}
            </div>

            {/* Selector VIP Elegante de Evento Activo */}
            <div className="min-w-[190px] max-w-[260px]">
              <VipSelectModal
                value={activeEventId || ""}
                onChange={(val) => setActiveEventId(val || null)}
                options={
                  events.length === 0
                    ? [{ value: "", label: "Sin eventos creados", subtitle: "Crea tu primer evento" }]
                    : events.map((evt) => ({
                        value: evt.id,
                        label: evt.name,
                        subtitle: `${evt.code} • ${evt.status || "Activo"}`,
                        badge: evt.eventType || "EVENTO",
                        icon: Calendar,
                      }))
                }
                title="Selecciona el Evento Activo"
                subtitle="Elige el evento para gestionar credenciales, acreditados y aforo"
                placeholder="Seleccionar Evento..."
                icon={Calendar}
                disabled={isLoading || events.length === 0}
                showSearch={events.length > 4}
              />
            </div>

            {/* Button New Event */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateEventModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Evento</span>
            </Button>
          </div>
        </div>

        {/* Active Event Quick Info Strip */}
        {activeEvent && (
          <div className="flex flex-wrap items-center justify-between text-xs py-2 px-3 mb-3 bg-[#0F1E36]/80 rounded-xl border border-[#263858] text-slate-300 gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                {activeEvent.name}
              </span>
              <span className="text-slate-400 font-mono text-[11px] bg-slate-800/80 px-2 py-0.5 rounded">
                Código: <strong className="text-white">{activeEvent.code}</strong>
              </span>
              {activeEvent.locationName && (
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-purple-400" />
                  {activeEvent.locationName}
                </span>
              )}
            </div>

            {activeEvent.metrics && (
              <div className="flex items-center gap-4 font-mono text-xs">
                <span>
                  Registrados: <strong className="text-purple-300">{activeEvent.metrics.totalParticipants}</strong>
                </span>
                <span>
                  Acreditados: <strong className="text-blue-300">{activeEvent.metrics.totalAccredited}</strong>
                </span>
                <span>
                  Ingresados: <strong className="text-emerald-300">{activeEvent.metrics.totalCheckedIn}</strong>
                </span>
                <span className="bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60">
                  {activeEvent.metrics.attendanceRate}% Asistencia
                </span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg text-xs font-semibold whitespace-nowrap transition-all border-b-2 relative",
                  isActive
                    ? "bg-[#0F1E36] text-purple-300 border-purple-500 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#0F1E36]/40 border-transparent"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-purple-400" : "text-slate-500")} />
                <span>{link.name}</span>
                {link.badge && (
                  <span className="px-1.5 py-0.2 rounded bg-purple-600/80 text-[10px] text-white font-mono font-bold">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <EventWizardModal
        isOpen={createEventModalOpen}
        onClose={() => setCreateEventModalOpen(false)}
        activeVenueId={activeVenueId}
        onCreated={async (newEvt) => {
          await refreshEvents();
          setActiveEventId(newEvt.id);
          router.push(`/dashboard/accreditation/events`);
        }}
      />
    </>
  );
}

export default function AccreditationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccreditationProvider>
      <div className="min-h-full pb-12">
        <AccreditationHeader />
        <main>{children}</main>
      </div>
    </AccreditationProvider>
  );
}
