"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ConciergeBell,
  CheckCircle2,
  Wine,
  ChefHat,
  UserCheck,
  AlertTriangle,
  XCircle,
  Clock,
  Flame,
} from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";

export default function GastronomyWaitersPanelPage() {
  const [data, setData] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

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

  const handleWaiterAction = async (orderId: string, action: string, extra?: any) => {
    setFeedback(null);
    const res = await fetch("/api/v1/gastronomy/orders/action", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, action, ...extra }),
    });
    const json = await res.json();
    if (!res.ok) {
      setFeedback({
        type: "err",
        msg: json.error?.message || "No se pudo ejecutar la acción",
      });
      await loadData();
      return;
    }
    setFeedback({
      type: "ok",
      msg: `Acción registrada correctamente en ${json.order?.orderNumber || "pedido"}.`,
    });
    await loadData();
  };

  const orders: any[] = data?.orders || [];
  const waiters: any[] = data?.waiters || [];
  const currentUser = data?.currentUser;

  // Tablero de pedidos listos de barra o cocina o pendientes de entrega por mozo
  const pendingDeliveryOrders = orders.filter(
    (o) =>
      o.status !== "DELIVERED" &&
      o.status !== "CANCELLED" &&
      (o.deliveryMode === "WAITER_DELIVERY" || o.hasKitchenItems) &&
      (o.barStatus === "READY" ||
        o.barStatus === "WAITING_WAITER" ||
        o.kitchenStatus === "READY" ||
        o.kitchenStatus === "REQUESTING_WAITER" ||
        o.waiterRequestStatus !== "NONE")
  );

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            feedback.type === "ok"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : "bg-red-950/90 border-red-500/50 text-red-200"
          }`}
        >
          <span>{feedback.msg}</span>
          <button onClick={() => setFeedback(null)}>✕</button>
        </div>
      )}

      {/* Cabecera Móvil Mozos */}
      <div className="p-6 rounded-3xl bg-[#0D1930] border border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            APP MÓVIL DE MOZOS • CONTROL ANTI-COLISIÓN SIMULTÁNEA
          </span>
          <h1 className="text-2xl font-black text-white mt-1 flex items-center gap-2.5">
            <ConciergeBell className="w-6 h-6 text-indigo-400" />
            <span>Tablero de Pedidos Pendientes de Entrega</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Operador identificado:{" "}
            <strong className="text-white">{currentUser?.name}</strong> ({currentUser?.role}). El bloqueo atómico impide que dos mozos acepten el mismo pedido simultáneamente.
          </p>
        </div>

        <div className="px-4 py-2.5 rounded-2xl bg-[#080F1F] border border-[#263858] text-xs">
          <span className="text-slate-400 block">Pendientes de Despacho:</span>
          <span className="text-xl font-black text-indigo-300">{pendingDeliveryOrders.length} pedidos</span>
        </div>
      </div>

      {/* Tablero Optimizado para Celulares y Tablets */}
      {pendingDeliveryOrders.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-[#0D1930] border border-[#263858] text-xs text-slate-400">
          No hay pedidos listos esperando retiro de Barra o Cocina en este momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingDeliveryOrders.map((ord) => {
            const isReadyFromBar =
              ord.hasBarItems && (ord.barStatus === "READY" || ord.barStatus === "WAITING_WAITER");
            const isReadyFromKitchen =
              ord.hasKitchenItems &&
              (ord.kitchenStatus === "READY" || ord.kitchenStatus === "REQUESTING_WAITER");

            return (
              <div
                key={ord.id}
                className="p-5 rounded-3xl bg-[#0D1930] border border-indigo-500/40 flex flex-col justify-between space-y-4 shadow-xl"
              >
                <div className="space-y-3">
                  {/* Cabecera con Mesa, Sector, Pedido y Prioridad */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-black text-white">{ord.tableLabel}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/40 font-bold">
                          {ord.sectorName}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-purple-300 font-bold block mt-0.5">
                        {ord.orderNumber} • Solicitud:{" "}
                        {new Date(ord.waiterRequestedAt || ord.receivedAt).toLocaleTimeString(
                          "es-PY",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </span>
                    </div>

                    {ord.priority !== "NORMAL" && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1">
                        <Flame className="w-3 h-3" /> {ord.priority}
                      </span>
                    )}
                  </div>

                  {/* Indicadores de Origen: Listo en Barra / Listo en Cocina */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {ord.hasBarItems && (
                      <span
                        className={`px-2.5 py-1 rounded-xl border font-bold flex items-center gap-1.5 ${
                          isReadyFromBar
                            ? "bg-cyan-500/20 text-cyan-200 border-cyan-400"
                            : "bg-[#080F1F] text-slate-400 border-[#263858]"
                        }`}
                      >
                        <Wine className="w-3.5 h-3.5" />
                        <span>Barra: {isReadyFromBar ? "LISTO PARA RETIRAR" : ord.barStatus}</span>
                      </span>
                    )}
                    {ord.hasKitchenItems && (
                      <span
                        className={`px-2.5 py-1 rounded-xl border font-bold flex items-center gap-1.5 ${
                          isReadyFromKitchen
                            ? "bg-amber-500/20 text-amber-200 border-amber-400"
                            : "bg-[#080F1F] text-slate-400 border-[#263858]"
                        }`}
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                        <span>Cocina: {isReadyFromKitchen ? "LISTO PARA RETIRAR" : ord.kitchenStatus}</span>
                      </span>
                    )}
                  </div>

                  {/* Productos a retirar y entregar */}
                  <div className="p-3 rounded-2xl bg-[#080F1F] border border-[#1E2E4A] space-y-1.5 text-xs">
                    {(ord.items || []).map((it: any) => (
                      <div key={it.id} className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          {it.quantity}x {it.productName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {it.destination === "BAR" ? "Barra" : "Cocina"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Estado de Mozo Asignado */}
                  <div className="p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-300">
                        Mozo:{" "}
                        <strong className="text-white">
                          {ord.assignedWaiterName || "Sin asignar (Disponible)"}
                        </strong>
                      </span>
                    </div>

                    {/* Asignación Manual por Supervisor/Admin */}
                    {waiters.length > 0 && (
                      <select
                        value={ord.assignedWaiterId || ""}
                        onChange={(e) => {
                          const w = waiters.find((u) => u.id === e.target.value);
                          if (w) {
                            handleWaiterAction(ord.id, "ASSIGN_WAITER_MANUAL", {
                              waiterId: w.id,
                              waiterName: w.name,
                            });
                          }
                        }}
                        className="bg-[#0D1930] border border-[#263858] rounded-lg px-2 py-1 text-[10px] text-slate-300"
                      >
                        <option value="">Asignar manual...</option>
                        {waiters.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {ord.waiterNotes && (
                    <div className="text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded-xl border border-amber-700/40">
                      {ord.waiterNotes}
                    </div>
                  )}
                </div>

                {/* Botones de Acción del Mozo (Fase 6) */}
                <div className="pt-3 border-t border-[#263858] space-y-2 text-xs">
                  {!ord.assignedWaiterId ? (
                    <button
                      onClick={() => handleWaiterAction(ord.id, "WAITER_ACCEPT_ORDER")}
                      className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>ACEPTAR PEDIDO</span>
                    </button>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        {ord.hasBarItems && (
                          <button
                            onClick={() => handleWaiterAction(ord.id, "WAITER_PICKUP_BAR")}
                            className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 border cursor-pointer ${
                              ord.pickedUpFromBarAt
                                ? "bg-emerald-950/60 text-emerald-300 border-emerald-600/40"
                                : "bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400"
                            }`}
                          >
                            <Wine className="w-3.5 h-3.5" />
                            <span>{ord.pickedUpFromBarAt ? "Retirado Barra ✓" : "Retirar de Barra"}</span>
                          </button>
                        )}

                        {ord.hasKitchenItems && (
                          <button
                            onClick={() => handleWaiterAction(ord.id, "WAITER_PICKUP_KITCHEN")}
                            className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 border cursor-pointer ${
                              ord.pickedUpFromKitchenAt
                                ? "bg-emerald-950/60 text-emerald-300 border-emerald-600/40"
                                : "bg-amber-600 hover:bg-amber-500 text-white border-amber-400"
                            }`}
                          >
                            <ChefHat className="w-3.5 h-3.5" />
                            <span>
                              {ord.pickedUpFromKitchenAt ? "Retirado Cocina ✓" : "Retirar de Cocina"}
                            </span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => handleWaiterAction(ord.id, "WAITER_CONFIRM_DELIVERY")}
                        className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>CONFIRMAR ENTREGA EN MESA</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => {
                            const issue = prompt("Describe el inconveniente en la mesa o pedido:");
                            if (issue) {
                              handleWaiterAction(ord.id, "WAITER_REPORT_ISSUE", { reason: issue });
                            }
                          }}
                          className="py-1.5 px-2 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-700/40 font-semibold flex items-center justify-center gap-1 text-[11px]"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Inconveniente</span>
                        </button>

                        <button
                          onClick={() => {
                            const reason = prompt(
                              "Ingresa justificación obligatoria para rechazar la asignación:"
                            );
                            if (reason) {
                              handleWaiterAction(ord.id, "WAITER_REJECT_ASSIGNMENT", { reason });
                            }
                          }}
                          className="py-1.5 px-2 rounded-xl bg-red-950/60 text-red-300 border border-red-700/40 font-semibold flex items-center justify-center gap-1 text-[11px]"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Rechazar Asig.</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
