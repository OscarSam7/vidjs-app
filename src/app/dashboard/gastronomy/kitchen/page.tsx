"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ChefHat,
  ConciergeBell,
  CheckCircle2,
  XCircle,
  Play,
  Package,
  AlertTriangle,
  Flame,
  ShieldAlert,
} from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import {
  GASTRO_ORDER_STATUS_LABELS,
  GASTRO_PAYMENT_STATUS_LABELS,
  GASTRO_AVAILABILITY_LABELS,
} from "@/lib/gastronomy/format";

export default function GastronomyKitchenPanelPage() {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"orders" | "stock">("orders");
  const [filterStatus, setFilterStatus] = useState("ACTIVE");

  const loadData = useCallback(async () => {
    const res = await fetch("/api/v1/gastronomy/bootstrap", { cache: "no-store" });
    if (res.ok) {
      setData(await res.json());
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtime({
    eventId: "global",
    onEvent: (type) => {
      if (type.startsWith("GASTRO_")) loadData();
    },
  });

  const handleKitchenOrderAction = async (orderId: string, action: string, extra?: any) => {
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
  };

  const handleProductStockAction = async (product: any, payload: any) => {
    const res = await fetch("/api/v1/gastronomy/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id, ...payload }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error?.message || "No se pudo actualizar la disponibilidad");
      return;
    }
    await loadData();
  };

  // REGLA OBLIGATORIA FASE 5:
  // La cocina recibirá automáticamente los pedidos correspondientes a productos gastronómicos.
  // No debe recibir pedidos de bebidas que correspondan exclusivamente a barra.
  const kitchenOrders: any[] = (data?.orders || []).filter((o: any) => o.hasKitchenItems);
  const filteredOrders = kitchenOrders.filter((o) => {
    if (filterStatus === "ACTIVE") {
      return o.kitchenStatus !== "DELIVERED" && o.kitchenStatus !== "CANCELLED";
    }
    if (filterStatus === "ALL") return true;
    return o.kitchenStatus === filterStatus;
  });

  const kitchenProducts: any[] = (data?.products || []).filter(
    (p: any) => p.destination === "KITCHEN" || p.destination === "BOTH"
  );

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-[#0D1930] border border-amber-500/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            KDS OPERATIVO DE COCINA • FILTRADO EXCLUSIVO GASTRONÓMICO
          </span>
          <h1 className="text-2xl font-black text-white mt-1 flex items-center gap-2.5">
            <ChefHat className="w-6 h-6 text-amber-400" />
            <span>Panel de Cocina & Comandas Gastronómicas</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Solo muestra alimentos de cocina (excluye pedidos exclusivos de barra). Toda entrega requiere intervención registrada de un mozo.
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-2 max-w-md">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            <strong>Circuito Obligatorio:</strong> Una vez preparado el plato, presiona{" "}
            <strong>SOLICITAR MOZO</strong> para que el mozo acepte, retire y confirme la entrega en la mesa.
          </span>
        </div>
      </div>

      {/* Pestañas Cocina */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              activeTab === "orders"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                : "bg-[#0D1930] text-slate-300 border border-[#263858]"
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Comandas de Cocina ({filteredOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("stock")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              activeTab === "stock"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                : "bg-[#0D1930] text-slate-300 border border-[#263858]"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Disponibilidad de Platos & Ingredientes ({kitchenProducts.length})</span>
          </button>
        </div>

        {activeTab === "orders" && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: "ACTIVE", label: "En Curso" },
              { id: "PENDING_PAYMENT", label: "Pend. Pago" },
              { id: "PAYMENT_CONFIRMED", label: "Pago Confirmado" },
              { id: "PREPARING", label: "En Preparación" },
              { id: "READY", label: "Preparado" },
              { id: "REQUESTING_WAITER", label: "Solicitando Mozo" },
              { id: "DELIVERED", label: "Entregados" },
              { id: "ALL", label: "Todos" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`px-3 py-1.5 rounded-xl font-bold border ${
                  filterStatus === f.id
                    ? "bg-amber-600 text-white border-amber-400"
                    : "bg-[#0D1930] text-slate-300 border-[#263858]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VISTA 1: COMANDAS DE COCINA (Fase 5) */}
      {activeTab === "orders" ? (
        filteredOrders.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-[#0D1930] border border-[#263858] text-xs text-slate-400">
            No hay comandas gastronómicas pendientes en este filtro.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((ord) => {
              const kitSt = GASTRO_ORDER_STATUS_LABELS[ord.kitchenStatus] || {
                label: ord.kitchenStatus,
                color: "bg-zinc-800 text-zinc-300",
              };
              const paySt = GASTRO_PAYMENT_STATUS_LABELS[ord.paymentStatus] || {
                label: ord.paymentStatus,
                color: "bg-zinc-800 text-zinc-300",
              };
              // Filtrar únicamente productos que corresponden a cocina
              const kitchenItems = (ord.items || []).filter(
                (i: any) => i.destination === "KITCHEN" || i.destination === "BOTH"
              );

              return (
                <div
                  key={ord.id}
                  className={`p-5 rounded-3xl bg-[#0D1930] border flex flex-col justify-between space-y-4 shadow-xl ${
                    ord.priority === "VIP"
                      ? "border-rose-500/70"
                      : ord.priority === "HIGH"
                      ? "border-amber-500/60"
                      : "border-[#263858]"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-base font-black text-amber-300">
                            {ord.orderNumber}
                          </span>
                          {ord.priority !== "NORMAL" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white flex items-center gap-1">
                              <Flame className="w-3 h-3" /> {ord.priority}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block">
                          Hora:{" "}
                          {new Date(ord.receivedAt).toLocaleTimeString("es-PY", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${kitSt.color}`}>
                        {kitSt.label}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#080F1F] border border-[#1E2E4A] space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="font-black text-white">{ord.tableLabel}</span>
                        <span className="text-slate-400">{ord.sectorName}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className={`px-2 py-0.5 rounded-full border font-bold ${paySt.color}`}>
                          Pago: {paySt.label}
                        </span>
                        {ord.assignedWaiterName && (
                          <span className="text-indigo-300 font-bold">
                            Mozo: {ord.assignedWaiterName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ítems de Cocina */}
                    <div className="space-y-2">
                      {kitchenItems.map((it: any) => {
                        const opts = it.selectedOptionsJson ? JSON.parse(it.selectedOptionsJson) : [];
                        return (
                          <div
                            key={it.id}
                            className="p-2.5 rounded-xl bg-[#080F1F] border border-amber-900/50 text-xs"
                          >
                            <div className="font-black text-white text-sm">
                              {it.quantity}x {it.productName}
                            </div>
                            {opts.length > 0 && (
                              <div className="text-[11px] text-emerald-300 font-semibold mt-1">
                                + Adicionales: {opts.map((o: any) => o.name).join(", ")}
                              </div>
                            )}
                            {it.observations && (
                              <div className="text-[11px] font-bold text-amber-300 mt-1 bg-amber-950/50 px-2 py-1 rounded">
                                Observación: {it.observations}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Circuito Operativo de Cocina (1 a 6) */}
                  <div className="pt-3 border-t border-[#263858] space-y-2 text-xs">
                    {(ord.kitchenStatus === "RECEIVED" ||
                      ord.kitchenStatus === "PENDING_PAYMENT" ||
                      ord.kitchenStatus === "PAYMENT_CONFIRMED") && (
                      <button
                        onClick={() => handleKitchenOrderAction(ord.id, "KITCHEN_START_PREP")}
                        className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-4 h-4" />
                        <span>Confirmar Recepción e Iniciar Preparación</span>
                      </button>
                    )}

                    {ord.kitchenStatus === "PREPARING" && (
                      <button
                        onClick={() => handleKitchenOrderAction(ord.id, "KITCHEN_MARK_READY")}
                        className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Marcar como Preparado</span>
                      </button>
                    )}

                    {(ord.kitchenStatus === "READY" ||
                      ord.kitchenStatus === "REQUESTING_WAITER") && (
                      <button
                        onClick={() => handleKitchenOrderAction(ord.id, "KITCHEN_REQUEST_WAITER")}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
                      >
                        <ConciergeBell className="w-4 h-4" />
                        <span>
                          {ord.kitchenStatus === "REQUESTING_WAITER"
                            ? "MOZO SOLICITADO (Re-notificar)"
                            : "SOLICITAR MOZO"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* VISTA 2: CONTROL DE STOCK E INGREDIENTES DE COCINA */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kitchenProducts.map((p) => {
            const av = GASTRO_AVAILABILITY_LABELS[p.availabilityStatus] || {
              label: p.availabilityStatus,
              color: "bg-zinc-800 text-zinc-300",
            };
            return (
              <div
                key={p.id}
                className="p-5 rounded-3xl bg-[#0D1930] border border-[#263858] space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <span className="font-mono text-[11px] text-amber-300">{p.code}</span>
                  <h3 className="text-sm font-bold text-white">{p.name}</h3>
                  <div className="flex items-center justify-between text-xs bg-[#080F1F] p-2.5 rounded-xl border border-[#1E2E4A]">
                    <span className="text-slate-400">
                      Porciones disp.: <strong className="text-white">{p.stockQuantity}</strong>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${av.color}`}>
                      {av.label}
                    </span>
                  </div>

                  {p.recipeItems && p.recipeItems.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-[#080F1F] border border-[#1E2E4A] text-[11px] space-y-1">
                      <span className="text-amber-300 font-bold block">Receta e Ingredientes:</span>
                      {p.recipeItems.map((ri: any) => (
                        <div key={ri.id} className="flex justify-between text-slate-300">
                          <span>
                            • {ri.inventoryItem?.name} (x{ri.quantityRequired})
                          </span>
                          <span className="font-mono text-slate-400">
                            Stock: {ri.inventoryItem?.currentStock} {ri.inventoryItem?.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    onClick={() =>
                      handleProductStockAction(p, {
                        availabilityStatus: "AVAILABLE",
                        active: true,
                      })
                    }
                    className="py-2 px-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/40 font-bold flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Activar Plato</span>
                  </button>

                  <button
                    onClick={() =>
                      handleProductStockAction(p, {
                        availabilityStatus: "MANUAL_DISABLED",
                        disabledReason: "Desactivado manualmente por Cocina",
                      })
                    }
                    className="py-2 px-2 rounded-xl bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-600/40 font-bold flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Desactivar</span>
                  </button>

                  <button
                    onClick={() =>
                      handleProductStockAction(p, {
                        stockQuantity: 0,
                        availabilityStatus: "AUTO_EXHAUSTED",
                        disabledReason: "Marcado agotado por Cocina",
                      })
                    }
                    className="py-2 px-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-600/40 font-bold flex items-center justify-center gap-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Agotado</span>
                  </button>

                  <button
                    onClick={() => {
                      const missing = prompt(
                        `¿Qué ingrediente falta para "${p.name}"?`,
                        "Falta medallón de carne / pan"
                      );
                      if (missing) {
                        handleProductStockAction(p, {
                          availabilityStatus: "MISSING_INGREDIENTS",
                          disabledReason: `Ingrediente faltante: ${missing}`,
                        });
                      }
                    }}
                    className="py-2 px-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-600/40 font-bold flex items-center justify-center gap-1"
                  >
                    <span>Falta Ingrediente</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
