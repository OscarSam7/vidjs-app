"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Wine,
  ConciergeBell,
  CheckCircle2,
  XCircle,
  Play,
  Package,
  AlertTriangle,
  PlusCircle,
  SlidersHorizontal,
} from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import {
  formatGuaranies,
  GASTRO_ORDER_STATUS_LABELS,
  GASTRO_PAYMENT_STATUS_LABELS,
  GASTRO_AVAILABILITY_LABELS,
} from "@/lib/gastronomy/format";

export default function GastronomyBarPanelPage() {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"orders" | "products">("orders");
  const [filterStatus, setFilterStatus] = useState<string>("ACTIVE");

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

  const handleBarOrderAction = async (orderId: string, action: string, extra?: any) => {
    const res = await fetch("/api/v1/gastronomy/orders/action", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, action, ...extra }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error?.message || "No se pudo cambiar el estado");
      return;
    }
    await loadData();
  };

  const handleUpdateDeliveryConfig = async (updates: any) => {
    const res = await fetch("/api/v1/gastronomy/delivery-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      await loadData();
    } else {
      const err = await res.json();
      alert(err.error?.message || "Sin permisos para configurar entrega");
    }
  };

  const handleProductStockAction = async (product: any, payload: any) => {
    const res = await fetch("/api/v1/gastronomy/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id, ...payload }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error?.message || "No se pudo actualizar el producto");
      return;
    }
    await loadData();
  };

  // Pedidos que contienen ítems de Barra
  const barOrders: any[] = (data?.orders || []).filter((o: any) => o.hasBarItems);
  const filteredOrders = barOrders.filter((o) => {
    if (filterStatus === "ACTIVE") {
      return o.barStatus !== "DELIVERED" && o.barStatus !== "CANCELLED";
    }
    if (filterStatus === "ALL") return true;
    return o.barStatus === filterStatus;
  });

  const barProducts: any[] = (data?.products || []).filter(
    (p: any) => p.destination === "BAR" || p.destination === "BOTH"
  );
  const deliveryConfig = data?.deliveryConfig;

  return (
    <div className="space-y-6">
      {/* Cabecera KDS Barra + Control Operativo de Modalidad de Entrega (Fase 3 y 4) */}
      <div className="p-6 rounded-3xl bg-[#0D1930] border border-cyan-500/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              KDS OPERATIVO DE BARRA EN TIEMPO REAL
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1 flex items-center gap-2.5">
            <Wine className="w-6 h-6 text-cyan-400" />
            <span>Panel de Barra & Despacho de Bebidas</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Visualización simultánea de comandas de bebidas, control de disponibilidad y conmutación en vivo entre Retiro en Barra y Entrega por Mozo.
          </p>
        </div>

        {/* Conmutador Operativo de Modalidad de Entrega desde la Barra (Fase 3) */}
        {deliveryConfig && (
          <div className="p-3.5 rounded-2xl bg-[#080F1F] border border-[#263858] flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Modalidad Operativa:</span>
            </div>

            <button
              onClick={() =>
                handleUpdateDeliveryConfig({
                  barPickupEnabled: !deliveryConfig.barPickupEnabled,
                })
              }
              className={`px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                deliveryConfig.barPickupEnabled
                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/50"
                  : "bg-zinc-900 text-zinc-500 border-zinc-700"
              }`}
            >
              Retiro en Barra: {deliveryConfig.barPickupEnabled ? "ON" : "OFF"}
            </button>

            <button
              onClick={() =>
                handleUpdateDeliveryConfig({
                  waiterDeliveryEnabled: !deliveryConfig.waiterDeliveryEnabled,
                })
              }
              className={`px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                deliveryConfig.waiterDeliveryEnabled
                  ? "bg-indigo-950/80 text-indigo-300 border-indigo-500/50"
                  : "bg-zinc-900 text-zinc-500 border-zinc-700"
              }`}
            >
              Entrega por Mozo: {deliveryConfig.waiterDeliveryEnabled ? "ON" : "OFF"}
            </button>
          </div>
        )}
      </div>

      {/* Pestañas: Comandas en Tiempo Real vs Control de Productos y Stock */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              activeTab === "orders"
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/20"
                : "bg-[#0D1930] text-slate-300 border border-[#263858]"
            }`}
          >
            <Wine className="w-4 h-4" />
            <span>Comandas de Barra ({filteredOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              activeTab === "products"
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/20"
                : "bg-[#0D1930] text-slate-300 border border-[#263858]"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Control de Productos & Existencias ({barProducts.length})</span>
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
              { id: "WAITING_PICKUP", label: "Esperando Retiro" },
              { id: "WAITING_WAITER", label: "Esperando Mozo" },
              { id: "DELIVERED", label: "Entregados" },
              { id: "ALL", label: "Todos" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`px-3 py-1.5 rounded-xl font-bold border ${
                  filterStatus === f.id
                    ? "bg-cyan-600 text-white border-cyan-400"
                    : "bg-[#0D1930] text-slate-300 border-[#263858]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VISTA 1: TABLERO KDS DE PEDIDOS DE BARRA (Fase 4) */}
      {activeTab === "orders" ? (
        filteredOrders.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-[#0D1930] border border-[#263858] text-xs text-slate-400">
            No hay pedidos de barra en este estado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((ord) => {
              const barSt = GASTRO_ORDER_STATUS_LABELS[ord.barStatus] || {
                label: ord.barStatus,
                color: "bg-zinc-800 text-zinc-300",
              };
              const paySt = GASTRO_PAYMENT_STATUS_LABELS[ord.paymentStatus] || {
                label: ord.paymentStatus,
                color: "bg-zinc-800 text-zinc-300",
              };
              const barItems = (ord.items || []).filter(
                (i: any) => i.destination === "BAR" || i.destination === "BOTH"
              );

              return (
                <div
                  key={ord.id}
                  className="p-5 rounded-3xl bg-[#0D1930] border border-[#263858] flex flex-col justify-between space-y-4 shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-base font-black text-cyan-300">
                          {ord.orderNumber}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Hora:{" "}
                          {new Date(ord.receivedAt).toLocaleTimeString("es-PY", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          • {ord.customerName || "Cliente"}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${barSt.color}`}>
                        {barSt.label}
                      </span>
                    </div>

                    {/* Mesa, Sector, Pago y Modalidad de Entrega */}
                    <div className="p-2.5 rounded-xl bg-[#080F1F] border border-[#1E2E4A] space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="font-black text-white">{ord.tableLabel}</span>
                        <span className="text-slate-400">{ord.sectorName}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={`px-2 py-0.5 rounded-full border font-bold ${paySt.color}`}>
                          Pago: {paySt.label}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/40 font-bold">
                          {ord.deliveryMode === "BAR_PICKUP" ? "RETIRO EN BARRA" : "ENTREGA POR MOZO"}
                        </span>
                      </div>
                    </div>

                    {/* Productos Solicitados a Barra */}
                    <div className="space-y-2">
                      {barItems.map((it: any) => {
                        const opts = it.selectedOptionsJson ? JSON.parse(it.selectedOptionsJson) : [];
                        return (
                          <div
                            key={it.id}
                            className="p-2.5 rounded-xl bg-[#080F1F] border border-cyan-900/50 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-black text-white text-sm">
                                {it.quantity}x {it.productName}
                              </span>
                              {it.presentation && (
                                <span className="text-[10px] text-cyan-300">{it.presentation}</span>
                              )}
                            </div>
                            {opts.length > 0 && (
                              <div className="text-[11px] text-purple-300 mt-1">
                                + {opts.map((o: any) => o.name).join(", ")}
                              </div>
                            )}
                            {it.observations && (
                              <div className="text-[11px] font-bold text-amber-300 mt-1 bg-amber-950/40 px-2 py-0.5 rounded">
                                Obs: {it.observations}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Botones de Acción de Estados de Barra */}
                  <div className="pt-3 border-t border-[#263858] grid grid-cols-2 gap-2 text-xs">
                    {(ord.barStatus === "RECEIVED" ||
                      ord.barStatus === "PENDING_PAYMENT" ||
                      ord.barStatus === "PAYMENT_CONFIRMED") && (
                      <button
                        onClick={() => handleBarOrderAction(ord.id, "BAR_START_PREP")}
                        className="col-span-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-4 h-4" />
                        <span>Iniciar Preparación</span>
                      </button>
                    )}

                    {ord.barStatus === "PREPARING" && (
                      <button
                        onClick={() => handleBarOrderAction(ord.id, "BAR_MARK_READY")}
                        className="col-span-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Marcar Preparado</span>
                      </button>
                    )}

                    {ord.barStatus === "READY" && (
                      <>
                        <button
                          onClick={() => handleBarOrderAction(ord.id, "BAR_NOTIFY_PICKUP")}
                          className="py-2 px-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] cursor-pointer"
                        >
                          Esperando Retiro
                        </button>
                        <button
                          onClick={() => handleBarOrderAction(ord.id, "BAR_REQUEST_WAITER")}
                          className="py-2 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <ConciergeBell className="w-3.5 h-3.5" />
                          <span>Solicitar Mozo</span>
                        </button>
                      </>
                    )}

                    {(ord.barStatus === "WAITING_PICKUP" ||
                      ord.barStatus === "WAITING_WAITER" ||
                      ord.barStatus === "READY") && (
                      <button
                        onClick={() => handleBarOrderAction(ord.id, "BAR_MARK_DELIVERED")}
                        className="col-span-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar Entregado</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* VISTA 2: CONTROL DE PRODUCTOS DE BARRA (Activar, Desactivar, Agotado, Falta de Stock, Reposición) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {barProducts.map((p) => {
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
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[11px] text-cyan-300">{p.code}</span>
                      <h3 className="text-sm font-bold text-white">{p.name}</h3>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-300">
                      {formatGuaranies(p.priceCents)} (Fijo)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-[#080F1F] p-2.5 rounded-xl border border-[#1E2E4A]">
                    <span className="text-slate-400">
                      Existencia: <strong className="text-white">{p.stockQuantity} {p.unit}</strong>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${av.color}`}>
                      {av.label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    onClick={() =>
                      handleProductStockAction(p, {
                        availabilityStatus: "AVAILABLE",
                        active: true,
                      })
                    }
                    className="py-2 px-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/40 font-bold flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Activar</span>
                  </button>

                  <button
                    onClick={() =>
                      handleProductStockAction(p, {
                        availabilityStatus: "MANUAL_DISABLED",
                        disabledReason: "Desactivado manualmente desde Barra",
                      })
                    }
                    className="py-2 px-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-600/40 font-bold flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Desactivar</span>
                  </button>

                  <button
                    onClick={() =>
                      handleProductStockAction(p, {
                        stockQuantity: 0,
                        availabilityStatus: "AUTO_EXHAUSTED",
                        disabledReason: "Marcado agotado por operador de Barra",
                      })
                    }
                    className="py-2 px-2.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-600/40 font-bold flex items-center justify-center gap-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Marcar Agotado</span>
                  </button>

                  <button
                    onClick={() => {
                      const qty = Number(prompt(`¿Cuántas unidades reponer para "${p.name}"?`, "24"));
                      if (qty && qty > 0) {
                        handleProductStockAction(p, {
                          restockAmount: qty,
                          availabilityStatus: "AVAILABLE",
                          active: true,
                        });
                      }
                    }}
                    className="py-2 px-2.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-600/40 font-bold flex items-center justify-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Reponer Stock</span>
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
