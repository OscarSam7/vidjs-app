"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  BellRing,
  Clock,
  CheckCircle2,
  Phone,
  Printer,
  Sliders,
  Tv,
  Plus,
  RefreshCw,
  Search,
  Volume2,
  Sparkles,
  Zap,
  Star,
  ExternalLink,
  QrCode,
  AlertCircle,
  Hash,
  Utensils,
  Share2,
} from "lucide-react";
import { useBeeperRealtime } from "@/hooks/use-beeper-realtime";
import { CreateTicketModal } from "@/components/beeper/CreateTicketModal";
import { ThermalTicketModal } from "@/components/beeper/ThermalTicketModal";
import { BeeperConfigModal } from "@/components/beeper/BeeperConfigModal";

interface BeeperTicketItem {
  id: string;
  shortCode: string;
  qrToken: string;
  customerName?: string | null;
  customerPhone?: string | null;
  tableOrOrderNumber?: string | null;
  status: "PREPARING" | "READY" | "ACKNOWLEDGED" | "DELIVERED" | "EXPIRED";
  ringCount: number;
  lastRingAt?: string | null;
  estimatedReadyAt?: string | null;
  readyAt?: string | null;
  deliveredAt?: string | null;
  rating?: number | null;
  createdAt: string;
}

export default function BeeperDashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tenantInfo, setTenantInfo] = useState<{ id: string; name: string; slug: string; logoUrl?: string | null }>({
    id: "",
    name: "Mi Establecimiento",
    slug: "local",
    logoUrl: null,
  });

  const [tickets, setTickets] = useState<BeeperTicketItem[]>([]);
  const [counts, setCounts] = useState<{ preparing: number; ready: number; delivered: number }>({
    preparing: 0,
    ready: 0,
    delivered: 0,
  });
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedTicketForThermal, setSelectedTicketForThermal] = useState<BeeperTicketItem | null>(null);

  // Cargar perfil autenticado
  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.user) {
          setCurrentUser(res.user);
          if (res.user.tenant) {
            setTenantInfo({
              id: res.user.tenant.id,
              name: res.user.tenant.name || "Mi Establecimiento",
              slug: res.user.tenant.slug || "local",
              logoUrl: res.user.tenant.logoUrl,
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  // Cargar configuración de beeper
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/beeper/config");
      if (res.ok) {
        const json = await res.json();
        setConfig(json.data);
      }
    } catch (e) {
      console.warn("Error cargando config beeper:", e);
    }
  }, []);

  // Cargar tickets activos
  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const res = await fetch(`/api/v1/beeper/tickets?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTickets(json.data || []);
        if (json.counts) setCounts(json.counts);
      }
    } catch (e) {
      console.warn("Error cargando llamadores:", e);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchConfig();
    fetchTickets();
  }, [fetchConfig, fetchTickets]);

  // Suscripción SSE en tiempo real para sincronizar múltiples cajas/cocinas
  const { isConnected } = useBeeperRealtime({
    tenantId: tenantInfo.id,
    enabled: Boolean(tenantInfo.id),
    onEvent: (type) => {
      // Si se crea o cambia un llamador en otra pantalla, refrescar al instante
      if (
        type === "BEEPER_TICKET_CREATED" ||
        type === "BEEPER_TICKET_READY" ||
        type === "BEEPER_TICKET_RING_AGAIN" ||
        type === "BEEPER_TICKET_ACKNOWLEDGED" ||
        type === "BEEPER_TICKET_DELIVERED" ||
        type === "BEEPER_TICKET_EXPIRED" ||
        type === "BEEPER_CONFIG_UPDATED"
      ) {
        fetchTickets();
        if (type === "BEEPER_CONFIG_UPDATED") fetchConfig();
      }
    },
  });

  // Disparar acción sobre un llamador (Llamar, Re-llamar, Entregar)
  const handleAction = async (ticketId: string, action: "CALL" | "RING_AGAIN" | "DELIVER") => {
    try {
      setActionLoadingId(ticketId);
      const res = await fetch(`/api/v1/beeper/tickets/${ticketId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        await fetchTickets();
      }
    } catch (e) {
      console.error("Error al procesar acción:", e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Al crear un ticket nuevo, abrir de inmediato la vista de ticket térmico/QR
  const handleTicketCreated = (newTicket: any) => {
    fetchTickets();
    setSelectedTicketForThermal(newTicket);
  };

  // Columnas clasificadas
  const preparingTickets = tickets.filter((t) => t.status === "PREPARING");
  const readyTickets = tickets.filter((t) => t.status === "READY" || t.status === "ACKNOWLEDGED");
  const deliveredTickets = tickets.filter((t) => t.status === "DELIVERED");

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden mx-auto">
      {/* 1. Header del Módulo de Llamadores Virtuales */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 p-5 rounded-3xl bg-zinc-950 border border-zinc-800 text-left shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 shrink-0 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
            <BellRing className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-white tracking-tight">
                Llamadores Virtuales (Beeper Web)
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isConnected ? "SSE EN VIVO" : "CONECTANDO..."}
              </span>
              <span className="text-xs font-mono text-zinc-500">
                vidjs.app/b/{tenantInfo.slug}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Avisa a tus clientes cuando su comida o trago esté listo sin descargar apps
            </p>
          </div>
        </div>

        {/* Botones de Cabecera */}
        <div className="flex items-center gap-2 flex-wrap w-full xl:w-auto">
          {/* Botón Principal: + Nuevo Llamador */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-black shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Llamador (1 Clic)</span>
          </button>

          {/* Modo Pantalla TV Salón */}
          <a
            href={`/b/${tenantInfo.slug}/tv`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            title="Abrir la pantalla gigante de salón para televisor"
          >
            <Tv className="w-4 h-4 text-cyan-400" />
            <span>Pantalla TV Kiosco</span>
          </a>

          {/* Configuración */}
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            title="Ajustar tiempos, sonidos, banners y QR general de mostrador"
          >
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>Ajustes & QR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              fetchTickets();
              fetchConfig();
            }}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
            title="Refrescar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Tarjetas de Resumen & Barra de Búsqueda */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-zinc-950 border border-amber-500/30 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              En Preparación
            </div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              {counts.preparing}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/40 flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <div>
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              ¡Listos / Llamando!
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
              {counts.ready}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Entregados Hoy
            </div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              {counts.delivered}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Buscador Rápido */}
        <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-zinc-400 shrink-0 ml-1" />
          <input
            type="text"
            placeholder="Buscar por #turno, comanda o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 3. Tablero Operativo Dividido por Estados (3 Columnas) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* COLUMNA 1: EN PREPARACIÓN */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>En Preparación ({preparingTickets.length})</span>
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">Esperando turno</span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {preparingTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/40">
                No hay pedidos en preparación en este momento.
              </div>
            ) : (
              preparingTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 rounded-2xl bg-zinc-950 border border-amber-500/30 hover:border-amber-400/60 transition-all space-y-3 shadow-md group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-white font-mono tracking-tight leading-none">
                          #{ticket.shortCode}
                        </span>
                        {ticket.tableOrOrderNumber && (
                          <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] font-bold">
                            {ticket.tableOrOrderNumber}
                          </span>
                        )}
                      </div>
                      {ticket.customerName && (
                        <p className="text-xs font-semibold text-zinc-300 mt-1">
                          {ticket.customerName}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTicketForThermal(ticket)}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                      title="Ver QR o imprimir ticket térmico"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tiempo de emisión */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-900 pt-2 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{new Date(ticket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </span>
                    {ticket.estimatedReadyAt && (
                      <span className="text-zinc-500">
                        Est: {new Date(ticket.estimatedReadyAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>

                  {/* Botón de Acción Principal: ¡Llamar! */}
                  <button
                    type="button"
                    onClick={() => handleAction(ticket.id, "CALL")}
                    disabled={actionLoadingId === ticket.id}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <BellRing className="w-4 h-4 animate-bounce" />
                    <span>{actionLoadingId === ticket.id ? "Llamando..." : "¡LLAMAR! (Listo)"}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMNA 2: ¡LISTOS / LLAMANDO! */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>¡Listos / Retirando! ({readyTickets.length})</span>
            </h3>
            <span className="text-[10px] text-emerald-400/80 font-mono">Alerta activa</span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {readyTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/40">
                Ningún pedido esperando retiro en este momento.
              </div>
            ) : (
              readyTickets.map((ticket) => {
                const isAcknowledged = ticket.status === "ACKNOWLEDGED";

                return (
                  <div
                    key={ticket.id}
                    className={`p-4 rounded-2xl bg-zinc-950 border-2 transition-all space-y-3 shadow-xl relative overflow-hidden ${
                      isAcknowledged
                        ? "border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                        : "border-emerald-500 animate-pulse shadow-[0_0_25px_rgba(16,185,129,0.25)]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-4xl font-black text-emerald-400 font-mono tracking-tight leading-none">
                            #{ticket.shortCode}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/50 text-[10px] font-bold">
                            🔔 {ticket.ringCount} {ticket.ringCount === 1 ? "aviso" : "avisos"}
                          </span>
                        </div>
                        {ticket.customerName && (
                          <p className="text-xs font-bold text-white mt-1">
                            {ticket.customerName}
                          </p>
                        )}
                        {ticket.tableOrOrderNumber && (
                          <p className="text-[11px] text-zinc-400 font-medium">
                            {ticket.tableOrOrderNumber}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedTicketForThermal(ticket)}
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                        title="Ver QR o imprimir ticket"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Estado del cliente */}
                    <div className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[11px] font-semibold flex items-center justify-between">
                      {isAcknowledged ? (
                        <span className="text-cyan-300 flex items-center gap-1.5 font-bold">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                          <span>¡Cliente tocó &quot;Voy en camino&quot;!</span>
                        </span>
                      ) : (
                        <span className="text-emerald-300 flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                          <span>Sonando en el móvil del cliente...</span>
                        </span>
                      )}
                      <span className="text-zinc-500 font-mono text-[10px]">
                        Listo a las {ticket.readyAt ? new Date(ticket.readyAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                      </span>
                    </div>

                    {/* Botones duales: Re-llamar (Insistir) & Entregado */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAction(ticket.id, "RING_AGAIN")}
                        disabled={actionLoadingId === ticket.id}
                        className="flex-1 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                        title="Hacer sonar y vibrar nuevamente el celular del cliente"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Re-Llamar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction(ticket.id, "DELIVER")}
                        disabled={actionLoadingId === ticket.id}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Entregado</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMNA 3: ENTREGADOS (HISTORIAL RECIENTE) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
              <span>Entregados Recientes ({deliveredTickets.length})</span>
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">Archivados</span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {deliveredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/40">
                Aún no hay pedidos entregados en este turno.
              </div>
            ) : (
              deliveredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold font-mono text-zinc-400">
                      #{ticket.shortCode}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-zinc-200">
                        {ticket.customerName || ticket.tableOrOrderNumber || "Pedido de Mostrador"}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Entregado {ticket.deliveredAt ? new Date(ticket.deliveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </div>
                    </div>
                  </div>

                  {/* Calificación de cliente si la dejó */}
                  {ticket.rating ? (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{ticket.rating}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-zinc-600 font-mono">Sin calificar</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modales */}
      {isCreateModalOpen && (
        <CreateTicketModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          defaultPrepMinutes={config?.defaultPrepMinutes || 15}
          onCreated={handleTicketCreated}
        />
      )}

      {selectedTicketForThermal && (
        <ThermalTicketModal
          isOpen={Boolean(selectedTicketForThermal)}
          onClose={() => setSelectedTicketForThermal(null)}
          ticket={selectedTicketForThermal}
          tenant={tenantInfo}
        />
      )}

      {isConfigModalOpen && (
        <BeeperConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          config={config}
          tenantSlug={tenantInfo.slug}
          tenantName={tenantInfo.name}
          onSaved={() => {
            fetchConfig();
            fetchTickets();
          }}
        />
      )}
    </div>
  );
}
