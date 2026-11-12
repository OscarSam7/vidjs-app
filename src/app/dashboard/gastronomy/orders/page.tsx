"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Plus,
  RefreshCw,
  Search,
  XCircle,
  Check,
  AlertTriangle,
  Wine,
  ChefHat,
  ConciergeBell,
  Flame,
  CreditCard,
  Banknote,
  MapPin,
  Clock,
} from "lucide-react";
import { VipSelectModal } from "@/components/ui/VipSelectModal";
import { useRealtime } from "@/hooks/use-realtime";
import {
  formatGuaranies,
  GASTRO_ORDER_STATUS_LABELS,
  GASTRO_PAYMENT_STATUS_LABELS,
  GASTRO_PAYMENT_METHOD_LABELS,
} from "@/lib/gastronomy/format";

export default function GastronomyOrdersPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Estado para pedido manual
  const [selectedTableId, setSelectedTableId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"WAITER_DELIVERY" | "BAR_PICKUP">("WAITER_DELIVERY");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [priority, setPriority] = useState<"NORMAL" | "HIGH" | "VIP">("NORMAL");
  const [cart, setCart] = useState<Array<{ productId: string; name: string; priceCents: number; quantity: number; observations: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/gastronomy/bootstrap", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (!selectedTableId && json.tables?.length > 0) {
          setSelectedTableId(json.tables[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [selectedTableId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtime({
    eventId: "global",
    onEvent: (type) => {
      if (type.startsWith("GASTRO_")) loadData();
    },
  });

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/v1/gastronomy/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: selectedTableId,
          customerName: customerName.trim() || "Cliente Salón",
          deliveryMode,
          paymentMethodSelected: paymentMethod,
          priority,
          items: cart.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
            observations: c.observations,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Error al crear pedido");
      setFeedback({ type: "ok", msg: `Pedido ${json.order.orderNumber} creado exitosamente.` });
      setCart([]);
      setIsNewModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: "err", msg: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrderAction = async (orderId: string, action: string, extra?: any) => {
    try {
      const res = await fetch("/api/v1/gastronomy/orders/action", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error?.message || "No se pudo ejecutar la acción");
        return;
      }
      await loadData();
    } catch {
      alert("Error de conexión");
    }
  };

  const orders: any[] = data?.orders || [];
  const products: any[] = (data?.products || []).filter(
    (p: any) => p.active && p.availabilityStatus === "AVAILABLE"
  );
  const tables: any[] = data?.tables || [];

  const filtered = orders.filter((o) => {
    if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.tableLabel.toLowerCase().includes(q) ||
        (o.customerName || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            feedback.type === "ok"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-200"
              : "bg-red-950/80 border-red-500/40 text-red-200"
          }`}
        >
          <span>{feedback.msg}</span>
          <button onClick={() => setFeedback(null)}>✕</button>
        </div>
      )}

      <div className="p-6 rounded-3xl bg-[#0D1930] border border-[#263858] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-purple-400" />
            <span>Gestión Central de Pedidos</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitorea todos los pedidos recibidos desde QR en mesa o tomados por operadores.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Pedido Manual</span>
        </button>
      </div>

      {/* Buscador y Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por número de pedido, mesa o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#0D1930] border border-[#263858] text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {["ALL", "PENDING_PAYMENT", "PAYMENT_CONFIRMED", "PREPARING", "READY", "WAITING_WAITER", "DELIVERED", "CANCELLED"].map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                  statusFilter === st
                    ? "bg-purple-600 text-white border-purple-400"
                    : "bg-[#0D1930] text-slate-300 border-[#263858] hover:text-white"
                }`}
              >
                {st === "ALL" ? "Todos" : GASTRO_ORDER_STATUS_LABELS[st]?.label || st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Grilla de Pedidos */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Cargando pedidos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#0D1930] border border-[#263858] text-xs text-slate-400">
          No se encontraron pedidos con el filtro actual.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ord) => {
            const st = GASTRO_ORDER_STATUS_LABELS[ord.status] || {
              label: ord.status,
              color: "bg-zinc-800 text-zinc-300",
            };
            const pst = GASTRO_PAYMENT_STATUS_LABELS[ord.paymentStatus] || {
              label: ord.paymentStatus,
              color: "bg-zinc-800 text-zinc-300",
            };
            return (
              <div
                key={ord.id}
                className="p-5 rounded-3xl bg-[#0D1930] border border-[#263858] flex flex-col justify-between space-y-4 shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-sm font-black text-purple-300">
                        {ord.orderNumber}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        {new Date(ord.receivedAt).toLocaleTimeString("es-PY", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        • {ord.customerName || "Cliente"}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${st.color}`}>
                      {st.label}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#080F1F] border border-[#1E2E4A] flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-white">{ord.tableLabel}</strong>
                      <span className="text-slate-400 ml-1.5">({ord.sectorName})</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/40">
                      {ord.deliveryMode === "BAR_PICKUP" ? "Retiro en Barra" : "Entrega Mozo"}
                    </span>
                  </div>

                  {/* Productos del pedido */}
                  <div className="space-y-1.5">
                    {(ord.items || []).map((it: any) => {
                      const opts = it.selectedOptionsJson ? JSON.parse(it.selectedOptionsJson) : [];
                      return (
                        <div
                          key={it.id}
                          className="p-2 rounded-xl bg-[#080F1F]/70 border border-[#1E2E4A] text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">
                              {it.quantity}x {it.productName}
                            </span>
                            <span className="font-mono text-slate-300">
                              {formatGuaranies(it.subtotalCents)}
                            </span>
                          </div>
                          {opts.length > 0 && (
                            <div className="text-[10px] text-cyan-300 mt-0.5">
                              + Adicionales: {opts.map((o: any) => o.name).join(", ")}
                            </div>
                          )}
                          {it.observations && (
                            <div className="text-[10px] text-amber-300 mt-0.5">
                              Obs: {it.observations}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Estados Barra / Cocina / Mozo */}
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    {ord.hasBarItems && (
                      <span className="px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-700/40 flex items-center gap-1">
                        <Wine className="w-3 h-3" /> Barra: {ord.barStatus}
                      </span>
                    )}
                    {ord.hasKitchenItems && (
                      <span className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-700/40 flex items-center gap-1">
                        <ChefHat className="w-3 h-3" /> Cocina: {ord.kitchenStatus}
                      </span>
                    )}
                    {ord.assignedWaiterName && (
                      <span className="px-2 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-700/40 flex items-center gap-1">
                        <ConciergeBell className="w-3 h-3" /> Mozo: {ord.assignedWaiterName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Pie con Total y Acciones */}
                <div className="pt-3 border-t border-[#263858] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pst.color}`}>
                      {pst.label} ({GASTRO_PAYMENT_METHOD_LABELS[ord.paymentMethodSelected] || ord.paymentMethodSelected})
                    </span>
                    <span className="text-base font-black text-emerald-300 font-mono">
                      {formatGuaranies(ord.totalCents)}
                    </span>
                  </div>

                  {ord.status !== "CANCELLED" && ord.status !== "DELIVERED" && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <VipSelectModal
                          value={ord.priority || "NORMAL"}
                          onChange={(val) =>
                            handleOrderAction(ord.id, "CHANGE_PRIORITY", { priority: val })
                          }
                          options={[
                            { value: "NORMAL", label: "Prioridad Normal", badge: "ESTÁNDAR", badgeTone: "bg-zinc-800 text-zinc-300 border-zinc-700" },
                            { value: "HIGH", label: "Prioridad Alta", badge: "ALTA", badgeTone: "bg-amber-500/20 text-amber-300 border-amber-500/40", icon: Flame },
                            { value: "VIP", label: "Prioridad VIP", badge: "URGENTE VIP", badgeTone: "bg-rose-500/20 text-rose-300 border-rose-500/40", icon: Flame },
                          ]}
                          title="Cambiar Prioridad del Pedido"
                          subtitle={`${ord.tableLabel} • ${ord.orderNumber}`}
                          placeholder="Prioridad..."
                          icon={Flame}
                        />
                      </div>

                      <button
                        onClick={() => {
                          const reason = prompt("Motivo de cancelación del pedido:");
                          if (reason) {
                            handleOrderAction(ord.id, "CANCEL_ORDER", { reason });
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/70 text-red-300 border border-red-700/50 text-[11px] font-bold flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nuevo Pedido Manual */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1930] border border-[#263858] rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Crear Pedido Gastronómico Manual</h2>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Mesa de destino *</label>
                  <VipSelectModal
                    value={selectedTableId}
                    onChange={(val) => setSelectedTableId(val)}
                    options={tables.map((t: any) => ({
                      value: t.id,
                      label: t.label || `Mesa ${t.number}`,
                      subtitle: `Sector: ${t.sector?.name || t.zone || "Salón"}`,
                      badge: `#${t.number}`,
                      icon: MapPin,
                    }))}
                    title="Selecciona la Mesa de Destino"
                    subtitle="Elige la mesa donde se entregará o cargará la comanda"
                    placeholder="Mesa de destino..."
                    icon={MapPin}
                    showSearch={tables.length > 5}
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Nombre del Cliente</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej: Rodrigo Villalba"
                    className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Modalidad de Entrega *</label>
                  <VipSelectModal
                    value={deliveryMode}
                    onChange={(val) => setDeliveryMode(val as any)}
                    options={[
                      {
                        value: "WAITER_DELIVERY",
                        label: "Entrega por Mozo en Mesa",
                        subtitle: "Despacho por staff con confirmación en mesa",
                        badge: "MOZO",
                        badgeTone: "bg-purple-500/20 text-purple-300 border-purple-500/40",
                        icon: ConciergeBell,
                      },
                      {
                        value: "BAR_PICKUP",
                        label: "Retiro en Barra",
                        subtitle: "El cliente retira personalmente en barra",
                        badge: "BARRA",
                        badgeTone: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
                        icon: Wine,
                      },
                    ]}
                    title="Modalidad de Entrega"
                    subtitle="Selecciona cómo se despachará este pedido"
                    placeholder="Modalidad de Entrega..."
                    icon={ConciergeBell}
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Método de Pago *</label>
                  <VipSelectModal
                    value={paymentMethod}
                    onChange={(val) => setPaymentMethod(val)}
                    options={[
                      { value: "CASH", label: "Efectivo", subtitle: "Pagar en caja o al mozo", badge: "EFECTIVO", icon: Banknote },
                      { value: "DEBIT_CARD", label: "Tarjeta de Débito (POS)", subtitle: "POS inalámbrico", badge: "DÉBITO", icon: CreditCard },
                      { value: "CREDIT_CARD", label: "Tarjeta de Crédito (POS)", subtitle: "POS inalámbrico", badge: "CRÉDITO", icon: CreditCard },
                      { value: "BANK_TRANSFER", label: "Transferencia Bancaria", subtitle: "SIPAP inmediata", badge: "SIPAP", icon: Banknote },
                      { value: "QR_PAYMENT", label: "QR Interoperable", subtitle: "Billeteras electrónicas", badge: "QR", icon: CreditCard },
                      { value: "PIX", label: "PIX Instantáneo", subtitle: "Recepción 24/7", badge: "PIX", icon: CreditCard },
                    ]}
                    title="Método de Pago"
                    subtitle="Selecciona el medio de pago preferido para este pedido"
                    placeholder="Método de Pago..."
                    icon={CreditCard}
                  />
                </div>
              </div>

              {/* Selector de productos */}
              <div className="space-y-2">
                <label className="text-slate-300 font-semibold block">
                  Seleccionar Productos Disponibles
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl bg-[#080F1F] border border-[#1E2E4A]">
                  {products.map((prod: any) => (
                    <button
                      type="button"
                      key={prod.id}
                      onClick={() => {
                        setCart((prev) => {
                          const existing = prev.find((i) => i.productId === prod.id);
                          if (existing) {
                            return prev.map((i) =>
                              i.productId === prod.id ? { ...i, quantity: i.quantity + 1 } : i
                            );
                          }
                          return [
                            ...prev,
                            {
                              productId: prod.id,
                              name: prod.name,
                              priceCents: prod.priceCents,
                              quantity: 1,
                              observations: "",
                            },
                          ];
                        });
                      }}
                      className="p-2 rounded-xl bg-[#0D1930] hover:bg-purple-950/60 border border-[#263858] text-left flex items-center justify-between"
                    >
                      <span className="font-semibold text-white truncate pr-2">{prod.name}</span>
                      <span className="font-mono text-emerald-300 shrink-0">
                        {formatGuaranies(prod.priceCents)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ítems agregados */}
              {cart.length > 0 && (
                <div className="space-y-2 p-3 rounded-2xl bg-[#080F1F] border border-[#263858]">
                  <div className="font-bold text-purple-300">Detalle del Pedido</div>
                  {cart.map((c, idx) => (
                    <div key={c.productId} className="flex items-center gap-2">
                      <span className="font-bold text-white w-8">{c.quantity}x</span>
                      <span className="flex-1 text-slate-200 truncate">{c.name}</span>
                      <input
                        type="text"
                        placeholder="Observación (ej: bien fría)"
                        value={c.observations}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCart((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, observations: val } : item))
                          );
                        }}
                        className="px-2 py-1 rounded bg-[#0D1930] border border-[#263858] text-white w-40"
                      />
                      <button
                        type="button"
                        onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold"
                >
                  {submitting ? "Registrando..." : "Confirmar Pedido"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
