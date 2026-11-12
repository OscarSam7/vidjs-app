"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  PlusCircle,
  CreditCard,
  Banknote,
  QrCode,
  Zap,
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  Check,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import { formatGuaranies } from "@/lib/gastronomy/format";

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
  const tables: any[] = data?.tables || [];
  const products: any[] = data?.products || [];
  const currentUser = data?.currentUser;

  // Estado para Nuevo Pedido desde Mesa (Mozo Toma Comanda)
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newOrderTableId, setNewOrderTableId] = useState("");
  const [newOrderCustomerName, setNewOrderCustomerName] = useState("");
  const [newOrderPaymentMethod, setNewOrderPaymentMethod] = useState("CASH");
  const [newOrderNotes, setNewOrderNotes] = useState("");
  const [newOrderSearch, setNewOrderSearch] = useState("");
  const [newOrderCategoryFilter, setNewOrderCategoryFilter] = useState("ALL");
  const [newOrderCart, setNewOrderCart] = useState<
    Array<{ productId: string; name: string; priceCents: number; quantity: number }>
  >([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Estado para Cobro Móvil en Mesa (Mozo Cajero Móvil)
  const [payModalOrder, setPayModalOrder] = useState<any | null>(null);
  const [payMethod, setPayMethod] = useState<string>("CASH");
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payCashReceived, setPayCashReceived] = useState<number>(0);
  const [payCardBrand, setPayCardBrand] = useState<string>("VISA");
  const [payCardLast4, setPayCardLast4] = useState<string>("");
  const [payRef, setPayRef] = useState<string>("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Abrir modal de cobro móvil precargando saldo
  const handleOpenMobilePayment = (ord: any) => {
    const balance = Math.max(0, ord.totalCents - (ord.paidCents || 0));
    setPayModalOrder(ord);
    setPayAmount(balance);
    setPayCashReceived(balance);
    setPayMethod(ord.paymentMethodSelected || "CASH");
    setPayCardLast4("");
    setPayRef("");
  };

  // Procesar cobro móvil en mesa
  const handleProcessMobilePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalOrder) return;
    setIsSubmittingPayment(true);
    setFeedback(null);

    const action =
      payMethod === "CASH"
        ? "CONFIRM_CASH_PAYMENT"
        : payMethod === "BANK_TRANSFER"
        ? "CONFIRM_TRANSFER_PAYMENT"
        : "CONFIRM_CARD_PAYMENT";

    try {
      const res = await fetch("/api/v1/gastronomy/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          orderId: payModalOrder.id,
          paymentMethod: payMethod,
          amountCents: Number(payAmount),
          receivedAmountCents: Number(payCashReceived),
          cardBrand: payMethod.includes("CARD") ? payCardBrand : undefined,
          cardLast4: payMethod.includes("CARD") ? payCardLast4 : undefined,
          providerReference: payRef || undefined,
          customerName: payModalOrder.customerName || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "err",
          msg: json.error?.message || "No se pudo registrar el cobro móvil.",
        });
        return;
      }

      setFeedback({
        type: "ok",
        msg: `Cobro móvil registrado exitosamente para ${payModalOrder.orderNumber} en ${payModalOrder.tableLabel}.`,
      });
      setPayModalOrder(null);
      await loadData();
    } catch {
      setFeedback({ type: "err", msg: "Error de red al procesar el cobro móvil." });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Enviar Nuevo Pedido Tomado en Mesa
  const handleSubmitNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderTableId) {
      setFeedback({ type: "err", msg: "Por favor selecciona una mesa de destino." });
      return;
    }
    if (newOrderCart.length === 0) {
      setFeedback({ type: "err", msg: "Agrega al menos un producto a la comanda." });
      return;
    }

    setIsSubmittingOrder(true);
    setFeedback(null);

    try {
      const targetTable = tables.find((t: any) => t.id === newOrderTableId);
      const res = await fetch("/api/v1/gastronomy/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: newOrderTableId,
          tableLabel: targetTable?.label || `Mesa #${targetTable?.number}`,
          sectorName: targetTable?.sector?.name || targetTable?.sectorName || "Salón principal",
          customerName: newOrderCustomerName.trim() || undefined,
          deliveryMode: "WAITER_DELIVERY",
          paymentMethodSelected: newOrderPaymentMethod,
          priority: "NORMAL",
          items: newOrderCart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            observations: newOrderNotes.trim() || undefined,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "err",
          msg: json.error?.message || "No se pudo crear la comanda.",
        });
        return;
      }

      setFeedback({
        type: "ok",
        msg: `Comanda ${json.order?.orderNumber || ""} creada e inyectada a Barra y Cocina con éxito.`,
      });
      setIsNewOrderModalOpen(false);
      setNewOrderCart([]);
      setNewOrderNotes("");
      setNewOrderCustomerName("");
      await loadData();
    } catch {
      setFeedback({ type: "err", msg: "Error al comunicar con el servidor." });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Categorías de productos
  const productCategories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p: any) => p.category?.name || "Otros")));
    return ["ALL", ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      const matchSearch =
        p.name.toLowerCase().includes(newOrderSearch.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(newOrderSearch.toLowerCase()));
      const matchCat =
        newOrderCategoryFilter === "ALL" || (p.category?.name || "Otros") === newOrderCategoryFilter;
      return matchSearch && matchCat && p.status === "ACTIVE";
    });
  }, [products, newOrderSearch, newOrderCategoryFilter]);

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

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (tables.length > 0 && !newOrderTableId) {
                setNewOrderTableId(tables[0].id);
              }
              setIsNewOrderModalOpen(true);
            }}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-95 transition-transform"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ TOMAR COMANDA EN MESA</span>
          </button>

          <div className="px-4 py-2.5 rounded-2xl bg-[#080F1F] border border-[#263858] text-xs">
            <span className="text-slate-400 block">Pendientes de Despacho:</span>
            <span className="text-xl font-black text-indigo-300">{pendingDeliveryOrders.length} pedidos</span>
          </div>
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

                      {/* Botón Cajero Móvil: Cobrar Pedido en Mesa */}
                      <button
                        type="button"
                        onClick={() => handleOpenMobilePayment(ord)}
                        className={`w-full py-2.5 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                          ord.paymentStatus === "APPROVED"
                            ? "bg-zinc-900 border-emerald-500/30 text-emerald-300"
                            : "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white border-emerald-400/50 shadow-md shadow-emerald-950/60"
                        }`}
                      >
                        <Banknote className="w-4 h-4" />
                        <span>
                          {ord.paymentStatus === "APPROVED"
                            ? `Cobrado ✓ (${formatGuaranies(ord.totalCents)})`
                            : `Cobrar en Mesa • ${formatGuaranies(Math.max(0, ord.totalCents - (ord.paidCents || 0)))}`}
                        </span>
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

      {/* Modal Móvil: Tomar Comanda en Mesa */}
      {isNewOrderModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl bg-gradient-to-b from-[#0F172A] via-[#0B1120] to-zinc-950 border-t sm:border border-emerald-500/35 shadow-[0_-10px_50px_rgba(16,185,129,0.25)] max-h-[90dvh] flex flex-col overflow-hidden"
          >
            {/* Header del Modal */}
            <div className="pt-3 sm:pt-4 px-5 pb-3 border-b border-white/10 bg-zinc-950/60 shrink-0 space-y-3">
              <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto sm:hidden" />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-600/30 shrink-0">
                    <PlusCircle className="w-5 h-5 text-zinc-950 font-black" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Tomar Comanda en Mesa</h3>
                    <p className="text-[11px] text-emerald-400 font-semibold">
                      Registro rápido y despacho inmediato a Barra y Cocina
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulario rápido Mesa y Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">Mesa Destino *</label>
                  <select
                    value={newOrderTableId}
                    onChange={(e) => setNewOrderTableId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-emerald-500/40 text-white font-bold"
                  >
                    {tables.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.label || `Mesa ${t.number}`} ({t.sector?.name || t.sectorName || "Salón"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">Cliente (Opcional)</label>
                  <input
                    type="text"
                    value={newOrderCustomerName}
                    onChange={(e) => setNewOrderCustomerName(e.target.value)}
                    placeholder="Nombre o alias"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder:text-zinc-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">Medio Pago Inicial</label>
                  <select
                    value={newOrderPaymentMethod}
                    onChange={(e) => setNewOrderPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white"
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="QR_PAYMENT">QR Interoperable</option>
                    <option value="DEBIT_CARD">Tarjeta Débito</option>
                    <option value="CREDIT_CARD">Tarjeta Crédito</option>
                    <option value="BANK_TRANSFER">Transferencia SIPAP</option>
                    <option value="PIX">PIX</option>
                  </select>
                </div>
              </div>

              {/* Buscador y Categorías */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={newOrderSearch}
                    onChange={(e) => setNewOrderSearch(e.target.value)}
                    placeholder="Buscar bebida o plato..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white"
                  />
                </div>
                <div className="overflow-x-auto flex items-center gap-1">
                  {productCategories.slice(0, 5).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewOrderCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 border cursor-pointer ${
                        newOrderCategoryFilter === cat
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-zinc-900 text-zinc-400 border-white/5"
                      }`}
                    >
                      {cat === "ALL" ? "Todos" : cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Catálogo de Productos y Carrito Lateral/Inferior */}
            <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Columna Izquierda: Productos */}
              <div className="space-y-2 max-h-[36vh] sm:max-h-[44vh] overflow-y-auto pr-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Productos del Menú ({filteredProducts.length})
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {filteredProducts.map((prod: any) => (
                    <div
                      key={prod.id}
                      className="p-2.5 rounded-xl bg-zinc-900/80 border border-white/5 hover:border-emerald-500/30 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{prod.name}</div>
                        <div className="text-[10px] text-emerald-400 font-semibold">
                          {formatGuaranies(prod.priceCents)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewOrderCart((prev) => {
                            const ex = prev.find((i) => i.productId === prod.id);
                            if (ex) {
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
                              },
                            ];
                          });
                        }}
                        className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Columna Derecha: Ítems Cargados a la Comanda */}
              <div className="p-3 rounded-2xl bg-zinc-950/70 border border-white/10 flex flex-col justify-between space-y-3">
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[28vh] sm:max-h-[35vh]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-white">Comanda en Curso</span>
                    <span className="text-[10px] font-bold text-emerald-400">
                      {newOrderCart.reduce((s, i) => s + i.quantity, 0)} ítems
                    </span>
                  </div>

                  {newOrderCart.length === 0 ? (
                    <div className="py-8 text-center text-zinc-500 text-xs">
                      Toca (+) en los productos para agregarlos a la orden de la mesa.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {newOrderCart.map((item) => (
                        <div
                          key={item.productId}
                          className="p-2 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-white truncate">{item.name}</div>
                            <div className="text-[10px] text-zinc-400">
                              {formatGuaranies(item.priceCents * item.quantity)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setNewOrderCart((prev) =>
                                  prev
                                    .map((i) =>
                                      i.productId === item.productId
                                        ? { ...i, quantity: i.quantity - 1 }
                                        : i
                                    )
                                    .filter((i) => i.quantity > 0)
                                );
                              }}
                              className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-bold text-xs text-white px-1">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setNewOrderCart((prev) =>
                                  prev.map((i) =>
                                    i.productId === item.productId
                                      ? { ...i, quantity: i.quantity + 1 }
                                      : i
                                  )
                                );
                              }}
                              className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/10 space-y-2">
                  <input
                    type="text"
                    value={newOrderNotes}
                    onChange={(e) => setNewOrderNotes(e.target.value)}
                    placeholder="Observaciones de preparación (ej. sin hielo, carne bien cocida)"
                    className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-[11px] text-white placeholder:text-zinc-500"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Total Comanda:</span>
                    <span className="font-mono font-black text-sm text-emerald-400">
                      {formatGuaranies(
                        newOrderCart.reduce((s, i) => s + i.priceCents * i.quantity, 0)
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isSubmittingOrder || newOrderCart.length === 0}
                    onClick={handleSubmitNewOrder}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmittingOrder ? "Enviando comanda..." : "ENVIAR COMANDA A COCINA/BARRA"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cajero Móvil: Cobro en Mesa */}
      {payModalOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-gradient-to-b from-[#0F172A] via-[#0B1120] to-zinc-950 border-t sm:border border-indigo-500/40 shadow-[0_-10px_50px_rgba(99,102,241,0.25)] max-h-[88dvh] flex flex-col overflow-hidden"
          >
            {/* Header del Modal Cobro */}
            <div className="pt-3 sm:pt-4 px-5 pb-3 border-b border-white/10 bg-zinc-950/60 shrink-0 space-y-2">
              <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto sm:hidden" />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
                    <Banknote className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Cobro Móvil en Mesa</h3>
                    <p className="text-[11px] text-indigo-300 font-semibold">
                      {payModalOrder.tableLabel} ({payModalOrder.sectorName}) • {payModalOrder.orderNumber}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPayModalOrder(null)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Formulario de Cobro */}
            <form onSubmit={handleProcessMobilePayment} className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Resumen del Monto */}
              <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-indigo-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-zinc-400 block">Total a Cobrar:</span>
                  <span className="text-xl font-black text-white font-mono">
                    {formatGuaranies(payAmount)}
                  </span>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                  Terminal Móvil Mozo
                </span>
              </div>

              {/* Selector de Medio de Pago */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">Selecciona Medio de Pago *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "CASH", label: "Efectivo", icon: Banknote },
                    { id: "DEBIT_CARD", label: "Débito POS", icon: CreditCard },
                    { id: "CREDIT_CARD", label: "Crédito POS", icon: CreditCard },
                    { id: "QR_PAYMENT", label: "QR Pago", icon: QrCode },
                    { id: "BANK_TRANSFER", label: "SIPAP", icon: ArrowRight },
                    { id: "PIX", label: "PIX", icon: Zap },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayMethod(m.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          payMethod === m.id
                            ? "bg-indigo-600/30 border-indigo-400 text-white font-black shadow-md shadow-indigo-600/20"
                            : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <Icon className="w-4 h-4 mx-auto mb-1 text-indigo-300" />
                        <span className="text-[11px] block">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Campos dinámicos según el método */}
              {payMethod === "CASH" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 block mb-1">Monto Cobrado (Gs.)</label>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 block mb-1">Efectivo Recibido (Gs.)</label>
                    <input
                      type="number"
                      value={payCashReceived}
                      onChange={(e) => setPayCashReceived(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm"
                    />
                  </div>
                  {payCashReceived > payAmount && (
                    <div className="col-span-2 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold flex justify-between">
                      <span>Vuelto a entregar al cliente:</span>
                      <span className="font-mono">{formatGuaranies(payCashReceived - payAmount)}</span>
                    </div>
                  )}
                </div>
              ) : payMethod.includes("CARD") ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 block mb-1">Red POS</label>
                    <select
                      value={payCardBrand}
                      onChange={(e) => setPayCardBrand(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white"
                    >
                      <option value="VISA">Visa</option>
                      <option value="MASTERCARD">Mastercard</option>
                      <option value="CABAL">Cabal</option>
                      <option value="OTRA">Otra</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 block mb-1">Últimos 4 dígitos</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={payCardLast4}
                      onChange={(e) => setPayCardLast4(e.target.value.replace(/\D/g, ""))}
                      placeholder="Ej: 4012"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-center"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                    Número de Operación / Comprobante
                  </label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="Ej: SIPAP-884920"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white"
                  />
                </div>
              )}

              {/* Botón Confirmar Cobro */}
              <button
                type="submit"
                disabled={isSubmittingPayment}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 cursor-pointer mt-2"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>{isSubmittingPayment ? "Procesando pago..." : "CONFIRMAR COBRO Y REGISTRAR"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
