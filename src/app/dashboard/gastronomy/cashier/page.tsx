"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  XCircle,
  RotateCcw,
  DollarSign,
  Lock,
  Unlock,
  ShieldCheck,
} from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import {
  formatGuaranies,
  GASTRO_PAYMENT_STATUS_LABELS,
  GASTRO_PAYMENT_METHOD_LABELS,
} from "@/lib/gastronomy/format";

export default function GastronomyCashierPage() {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"cashier" | "deposits" | "shift">("cashier");
  const [paymentFilter, setPaymentFilter] = useState<"PENDING" | "APPROVED" | "ALL">("ALL");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Campos de cobro en caja
  const [payMethod, setPayMethod] = useState<"CASH" | "DEBIT_CARD" | "CREDIT_CARD" | "BANK_TRANSFER">("CASH");
  const [amountInput, setAmountInput] = useState<number>(0);
  const [receivedCashInput, setReceivedCashInput] = useState<number>(0);
  const [cardBrand, setCardBrand] = useState("VISA");
  const [cardLast4, setCardLast4] = useState("");
  const [providerRef, setProviderRef] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerTaxId, setCustomerTaxId] = useState("");

  // Campos de nueva seña (Fase 8)
  const [depCustomerName, setDepCustomerName] = useState("");
  const [depTableId, setDepTableId] = useState("");
  const [depType, setDepType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [depEstimated, setDepEstimated] = useState(500000);
  const [depPercent, setDepPercent] = useState(30);
  const [depAmount, setDepAmount] = useState(150000);
  const [depMethod, setDepMethod] = useState("BANK_TRANSFER");

  // Campos de turno de caja
  const [openingCash, setOpeningCash] = useState(500000);
  const [countedCash, setCountedCash] = useState(0);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const selectOrderForPayment = useCallback((ord: any) => {
    const balance = Math.max(0, ord.totalCents - ord.paidCents);
    setSelectedOrder(ord);
    setAmountInput(balance);
    setReceivedCashInput(balance);
    setCustomerName(ord.customerName || "Consumidor Final");
    setCustomerTaxId(ord.customerTaxId || "44444401-7");
  }, []);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/v1/gastronomy/bootstrap", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      setData(json);
      if (!depTableId && json.tables?.length > 0) {
        setDepTableId(json.tables[0].id);
      }
      const pendingList = (json.orders || []).filter(
        (o: any) =>
          o.status !== "CANCELLED" &&
          (o.paymentStatus === "PENDING" || o.paymentStatus === "PARTIALLY_PAID")
      );
      if (pendingList.length > 0) {
        setSelectedOrder((prev: any) => {
          if (prev) {
            const updatedPrev = (json.orders || []).find((o: any) => o.id === prev.id);
            if (updatedPrev && updatedPrev.paymentStatus !== "APPROVED") return updatedPrev;
          }
          const first = pendingList[0];
          const balance = Math.max(0, first.totalCents - first.paidCents);
          setAmountInput(balance);
          setReceivedCashInput(balance);
          setCustomerName(first.customerName || "Consumidor Final");
          setCustomerTaxId(first.customerTaxId || "44444401-7");
          return first;
        });
      }
    }
  }, [depTableId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtime({
    eventId: "global",
    onEvent: (type) => {
      if (type.startsWith("GASTRO_")) loadData();
    },
  });

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const action =
      payMethod === "CASH"
        ? "CONFIRM_CASH_PAYMENT"
        : payMethod === "BANK_TRANSFER"
        ? "CONFIRM_TRANSFER_PAYMENT"
        : "CONFIRM_CARD_PAYMENT";

    const res = await fetch("/api/v1/gastronomy/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        orderId: selectedOrder.id,
        paymentMethod: payMethod,
        amountCents: Number(amountInput),
        receivedAmountCents: Number(receivedCashInput),
        cardBrand: payMethod.includes("CARD") ? cardBrand : undefined,
        cardLast4: payMethod.includes("CARD") ? cardLast4 : undefined,
        providerReference: providerRef || undefined,
        customerName,
        customerTaxId,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setToast({ type: "err", msg: json.error?.message || "Error al procesar pago" });
      return;
    }

    setToast({
      type: "ok",
      msg: `Pago confirmado en ${selectedOrder.orderNumber}. Autorización enviada a Barra y Cocina.${
        json.pendingInvoiceSale ? ` Venta ${json.pendingInvoiceSale.saleNumber} enviada a bandeja de facturación.` : ""
      }`,
    });
    setSelectedOrder(null);
    setCardLast4("");
    setProviderRef("");
    await loadData();
  };

  const handleRegisterDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/v1/gastronomy/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableId: depTableId || null,
        customerName: depCustomerName,
        depositType: depType,
        estimatedConsumptionCents: Number(depEstimated),
        depositPercentage: depType === "PERCENTAGE" ? Number(depPercent) : undefined,
        depositAmountCents:
          depType === "PERCENTAGE"
            ? Math.round((Number(depEstimated) * Number(depPercent)) / 100)
            : Number(depAmount),
        paymentMethod: depMethod,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setToast({ type: "err", msg: json.error?.message || "Error al registrar seña" });
      return;
    }
    setToast({
      type: "ok",
      msg: `Seña ${json.deposit.receiptNumber} registrada (${formatGuaranies(
        json.deposit.depositAmountCents
      )}). Saldo estimado pendiente: ${formatGuaranies(json.deposit.pendingConsumptionBalanceCents)}.`,
    });
    setDepCustomerName("");
    await loadData();
  };

  const handleApplyDepositToOrder = async (depositId: string, orderId: string) => {
    const res = await fetch("/api/v1/gastronomy/deposits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ depositId, orderId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setToast({ type: "err", msg: json.error?.message || "No se pudo aplicar la seña" });
      return;
    }
    setToast({
      type: "ok",
      msg: `Seña aplicada al pedido ${json.order.orderNumber} sin duplicar ingresos.`,
    });
    await loadData();
  };

  const rawOrders: any[] = (data?.orders || []).filter((o: any) => o.status !== "CANCELLED");
  // Ordenar: primero los pendientes/parciales, luego los aprobados
  const sortedOrders = [...rawOrders].sort((a, b) => {
    const aPend = a.paymentStatus === "PENDING" || a.paymentStatus === "PARTIALLY_PAID" ? 0 : 1;
    const bPend = b.paymentStatus === "PENDING" || b.paymentStatus === "PARTIALLY_PAID" ? 0 : 1;
    if (aPend !== bPend) return aPend - bPend;
    return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
  });

  const pendingOrdersCount = sortedOrders.filter(
    (o) => o.paymentStatus === "PENDING" || o.paymentStatus === "PARTIALLY_PAID"
  ).length;
  const approvedOrdersCount = sortedOrders.filter((o) => o.paymentStatus === "APPROVED").length;

  const orders = sortedOrders.filter((o) => {
    if (paymentFilter === "PENDING") {
      return o.paymentStatus === "PENDING" || o.paymentStatus === "PARTIALLY_PAID";
    }
    if (paymentFilter === "APPROVED") {
      return o.paymentStatus === "APPROVED";
    }
    return true;
  });

  const deposits: any[] = data?.deposits || [];
  const tables: any[] = data?.tables || [];
  const activeShift = data?.activeShift;

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            toast.type === "ok"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : "bg-red-950/90 border-red-500/50 text-red-200"
          }`}
        >
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      <div className="p-6 rounded-3xl bg-[#0D1930] border border-emerald-500/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            MÓDULO DE CAJA GASTRONÓMICA, SEÑAS Y CIERRE DE TURNO
          </span>
          <h1 className="text-2xl font-black text-white mt-1 flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-emerald-400" />
            <span>Caja Gastronómica & Control de Cobros</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Efectivo, Tarjetas Débito/Crédito (sin almacenar PAN ni CVV), Transferencias, QR/PIX, Pagos Parciales y Señas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("cashier")}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              activeTab === "cashier"
                ? "bg-emerald-600 text-white"
                : "bg-[#080F1F] text-slate-300 border border-[#263858]"
            }`}
          >
            Cobro de Pedidos
          </button>
          <button
            onClick={() => setActiveTab("deposits")}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              activeTab === "deposits"
                ? "bg-purple-600 text-white"
                : "bg-[#080F1F] text-slate-300 border border-[#263858]"
            }`}
          >
            Señas y Reservas ({deposits.length})
          </button>
          <button
            onClick={() => setActiveTab("shift")}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              activeTab === "shift"
                ? "bg-cyan-600 text-white"
                : "bg-[#080F1F] text-slate-300 border border-[#263858]"
            }`}
          >
            Turno y Cierre de Caja
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: COBRO EN CAJA (Fase 7) */}
      {activeTab === "cashier" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Pedidos Pendientes y Cobrados */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Pedidos de Clientes en Caja</span>
                {pendingOrdersCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-[11px] font-black animate-pulse">
                    {pendingOrdersCount} Pendiente{pendingOrdersCount > 1 ? "s" : ""} de Pago
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => setPaymentFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl font-bold border ${
                    paymentFilter === "ALL"
                      ? "bg-emerald-600 text-white border-emerald-400"
                      : "bg-[#0D1930] text-slate-300 border-[#263858]"
                  }`}
                >
                  Todos ({sortedOrders.length})
                </button>
                <button
                  onClick={() => setPaymentFilter("PENDING")}
                  className={`px-3 py-1.5 rounded-xl font-bold border ${
                    paymentFilter === "PENDING"
                      ? "bg-amber-500 text-black border-amber-300"
                      : "bg-[#0D1930] text-amber-300 border-amber-500/40"
                  }`}
                >
                  Pendientes de Cobro ({pendingOrdersCount})
                </button>
                <button
                  onClick={() => setPaymentFilter("APPROVED")}
                  className={`px-3 py-1.5 rounded-xl font-bold border ${
                    paymentFilter === "APPROVED"
                      ? "bg-emerald-600 text-white border-emerald-400"
                      : "bg-[#0D1930] text-slate-300 border-[#263858]"
                  }`}
                >
                  Cobrados ({approvedOrdersCount})
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {orders.map((ord) => {
                const pst = GASTRO_PAYMENT_STATUS_LABELS[ord.paymentStatus] || {
                  label: ord.paymentStatus,
                  color: "bg-zinc-800 text-zinc-300",
                };
                const balance = Math.max(0, ord.totalCents - ord.paidCents);
                const isPending =
                  ord.paymentStatus === "PENDING" || ord.paymentStatus === "PARTIALLY_PAID";
                return (
                  <div
                    key={ord.id}
                    onClick={() => selectOrderForPayment(ord)}
                    className={`p-4 rounded-2xl bg-[#0D1930] border transition-all cursor-pointer space-y-2.5 ${
                      selectedOrder?.id === ord.id
                        ? "border-emerald-400 ring-2 ring-emerald-500/30"
                        : isPending
                        ? "border-amber-500/60 hover:border-amber-400"
                        : "border-[#263858] hover:border-emerald-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-sm text-purple-300">
                        {ord.orderNumber}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pst.color}`}>
                        {pst.label}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-white">
                        {ord.tableLabel} ({ord.sectorName})
                      </span>
                      <span className="text-slate-400">{ord.customerName}</span>
                    </div>

                    {/* Detalle de productos solicitados por el cliente */}
                    {ord.items && ord.items.length > 0 && (
                      <div className="p-2 rounded-xl bg-[#080F1F]/80 border border-[#1E2E4A] text-[11px] text-slate-300 space-y-0.5">
                        {ord.items.map((it: any) => (
                          <div key={it.id} className="flex items-center justify-between">
                            <span className="truncate">
                              <strong className="text-white">{it.quantity}x</strong> {it.productName}
                              {it.observations ? ` (${it.observations})` : ""}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 ml-2 shrink-0">
                              {it.destination === "BAR" ? "🍹 Barra" : "🍔 Cocina"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="p-2 rounded-xl bg-[#080F1F] border border-[#1E2E4A] text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Pedido:</span>
                        <span className="font-mono font-bold text-white">
                          {formatGuaranies(ord.totalCents)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Pagado:</span>
                        <span className="font-mono text-emerald-300">
                          {formatGuaranies(ord.paidCents)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-[#1E2E4A] pt-1">
                        <span className="text-slate-300 font-bold">Saldo a Cobrar:</span>
                        <span className="font-mono font-black text-amber-300">
                          {formatGuaranies(balance)}
                        </span>
                      </div>
                    </div>

                    {/* Acciones rápidas Cobrar / Rechazar / Reembolsar */}
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-slate-400">
                        Método: {GASTRO_PAYMENT_METHOD_LABELS[ord.paymentMethodSelected] || ord.paymentMethodSelected}
                      </span>
                      {ord.paymentStatus === "APPROVED" ? (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const reason = prompt("Motivo del reembolso:");
                            if (reason) {
                              await fetch("/api/v1/gastronomy/payments", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "REFUND_PAYMENT",
                                  orderId: ord.id,
                                  reason,
                                }),
                              });
                              await loadData();
                            }
                          }}
                          className="text-purple-300 hover:text-purple-200 font-bold flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Reembolsar
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectOrderForPayment(ord);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                          >
                            Cobrar en Terminal →
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const reason = prompt("Motivo de rechazo del pago:");
                              if (reason) {
                                await fetch("/api/v1/gastronomy/payments", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    action: "REJECT_PAYMENT",
                                    orderId: ord.id,
                                    reason,
                                  }),
                                });
                                await loadData();
                              }
                            }}
                            className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terminal de Cobro de Caja */}
          <div className="p-5 rounded-3xl bg-[#0D1930] border border-[#263858] space-y-4 h-fit sticky top-20">
            {!selectedOrder ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Selecciona un pedido de la izquierda para registrar cobro en Efectivo, POS Tarjeta (Débito/Crédito), Transferencia o Pago Parcial.
              </div>
            ) : (
              <form onSubmit={handleConfirmPayment} className="space-y-3.5 text-xs">
                <div className="border-b border-[#263858] pb-3 space-y-1">
                  <span className="font-mono text-xs text-purple-300 font-bold">
                    COBRANDO PEDIDO {selectedOrder.orderNumber}
                  </span>
                  <h2 className="text-lg font-black text-white">
                    {selectedOrder.tableLabel} ({selectedOrder.sectorName}) •{" "}
                    {formatGuaranies(Math.max(0, selectedOrder.totalCents - selectedOrder.paidCents))}
                  </h2>
                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div className="pt-1 space-y-1 text-[11px] text-slate-300">
                      {selectedOrder.items.map((it: any) => (
                        <div key={it.id} className="flex justify-between">
                          <span>
                            {it.quantity}x {it.productName}
                          </span>
                          <span className="font-mono text-slate-400">
                            {formatGuaranies(it.subtotalCents)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selector de Método */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "CASH", label: "Efectivo", icon: Banknote },
                    { id: "DEBIT_CARD", label: "Tarjeta Débito", icon: CreditCard },
                    { id: "CREDIT_CARD", label: "Tarjeta Crédito", icon: CreditCard },
                    { id: "BANK_TRANSFER", label: "Transferencia", icon: QrCode },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setPayMethod(m.id as any)}
                        className={`p-2.5 rounded-xl border font-bold flex items-center gap-2 ${
                          payMethod === m.id
                            ? "bg-emerald-600 text-white border-emerald-400"
                            : "bg-[#080F1F] text-slate-300 border-[#263858]"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Importe a Cobrar (Permite Pago Total o Pago Parcial)
                  </label>
                  <input
                    type="number"
                    required
                    value={amountInput}
                    onChange={(e) => setAmountInput(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white font-mono font-bold text-sm"
                  />
                </div>

                {payMethod === "CASH" && (
                  <div className="p-3 rounded-2xl bg-[#080F1F] border border-[#263858] space-y-2">
                    <label className="text-slate-300 font-semibold block">
                      Importe Recibido en Efectivo (Gs.)
                    </label>
                    <input
                      type="number"
                      value={receivedCashInput}
                      onChange={(e) => setReceivedCashInput(Number(e.target.value))}
                      className="w-full p-2 rounded-xl bg-[#0D1930] border border-[#263858] text-white font-mono"
                    />
                    <div className="flex justify-between text-xs pt-1">
                      <span className="text-slate-400">Vuelto a entregar:</span>
                      <span className="font-mono font-black text-emerald-300">
                        {formatGuaranies(Math.max(0, receivedCashInput - amountInput))}
                      </span>
                    </div>
                  </div>
                )}

                {payMethod.includes("CARD") && (
                  <div className="p-3 rounded-2xl bg-[#080F1F] border border-cyan-500/30 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-cyan-300 font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Protección PCI: No se guardan números completos ni CVV</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={cardBrand}
                        onChange={(e) => setCardBrand(e.target.value)}
                        className="p-2 rounded-xl bg-[#0D1930] border border-[#263858] text-white"
                      >
                        <option value="VISA">VISA</option>
                        <option value="MASTERCARD">MASTERCARD</option>
                        <option value="CABAL">CABAL</option>
                      </select>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="Últimos 4 dígitos (opc)"
                        value={cardLast4}
                        onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        className="p-2 rounded-xl bg-[#0D1930] border border-[#263858] text-white font-mono"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="N° Boleta / Cupón POS Terminal"
                      value={providerRef}
                      onChange={(e) => setProviderRef(e.target.value)}
                      className="w-full p-2 rounded-xl bg-[#0D1930] border border-[#263858] text-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Razón Social / Cliente</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full p-2 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">RUC / C.I.</label>
                    <input
                      type="text"
                      value={customerTaxId}
                      onChange={(e) => setCustomerTaxId(e.target.value)}
                      className="w-full p-2 rounded-xl bg-[#080F1F] border border-[#263858] text-white font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>CONFIRMAR PAGO Y AUTORIZAR PEDIDO</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: SISTEMA DE SEÑAS Y RESERVAS (Fase 8) */}
      {activeTab === "deposits" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleRegisterDeposit}
            className="p-5 rounded-3xl bg-[#0D1930] border border-purple-500/40 space-y-3 text-xs h-fit"
          >
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-400" />
              <span>Registrar Nueva Seña</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Diferenciada de una venta definitiva. Al aplicarse al consumo final no duplica ingresos.
            </p>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Cliente / Reserva / Evento</label>
              <input
                type="text"
                required
                placeholder="Ej: Reserva Cumpleaños Camila"
                value={depCustomerName}
                onChange={(e) => setDepCustomerName(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Asociar a Mesa</label>
              <select
                value={depTableId}
                onChange={(e) => setDepTableId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
              >
                {tables.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.sector?.name || t.zone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Consumo Estimado (Gs.)</label>
              <input
                type="number"
                value={depEstimated}
                onChange={(e) => setDepEstimated(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDepType("FIXED")}
                className={`py-2 rounded-xl font-bold border ${
                  depType === "FIXED"
                    ? "bg-purple-600 text-white border-purple-400"
                    : "bg-[#080F1F] text-slate-300 border-[#263858]"
                }`}
              >
                Importe Fijo
              </button>
              <button
                type="button"
                onClick={() => setDepType("PERCENTAGE")}
                className={`py-2 rounded-xl font-bold border ${
                  depType === "PERCENTAGE"
                    ? "bg-purple-600 text-white border-purple-400"
                    : "bg-[#080F1F] text-slate-300 border-[#263858]"
                }`}
              >
                Por Porcentaje (%)
              </button>
            </div>

            {depType === "PERCENTAGE" ? (
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Porcentaje de Seña (%)</label>
                <input
                  type="number"
                  value={depPercent}
                  onChange={(e) => setDepPercent(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white font-mono"
                />
              </div>
            ) : (
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Importe de Seña (Gs.)</label>
                <input
                  type="number"
                  value={depAmount}
                  onChange={(e) => setDepAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white font-mono"
                />
              </div>
            )}

            <div className="p-3 rounded-2xl bg-[#080F1F] border border-[#263858] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Consumo estimado:</span>
                <span className="font-mono text-white">{formatGuaranies(depEstimated)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Seña a registrar:</span>
                <span className="font-mono font-bold text-purple-300">
                  {formatGuaranies(
                    depType === "PERCENTAGE"
                      ? Math.round((depEstimated * depPercent) / 100)
                      : depAmount
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#1E2E4A] pt-1">
                <span className="text-slate-300 font-bold">Saldo pendiente estimado:</span>
                <span className="font-mono font-bold text-amber-300">
                  {formatGuaranies(
                    Math.max(
                      0,
                      depEstimated -
                        (depType === "PERCENTAGE"
                          ? Math.round((depEstimated * depPercent) / 100)
                          : depAmount)
                    )
                  )}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer"
            >
              Emitir Comprobante de Seña
            </button>
          </form>

          {/* Listado de Señas y Aplicación al Consumo Final */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-bold text-white">
              Señas Registradas y Aplicación al Consumo Final
            </h3>
            {deposits.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-[#0D1930] border border-[#263858] text-xs text-slate-400">
                No hay señas registradas todavía.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {deposits.map((dep) => (
                  <div
                    key={dep.id}
                    className="p-4 rounded-3xl bg-[#0D1930] border border-[#263858] space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-purple-300">
                        {dep.receiptNumber}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-200 border border-purple-700/40">
                        {dep.status}
                      </span>
                    </div>

                    <div className="font-bold text-white text-sm">{dep.customerName}</div>

                    <div className="p-2.5 rounded-xl bg-[#080F1F] border border-[#1E2E4A] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Consumo estimado:</span>
                        <span className="font-mono text-slate-200">
                          {formatGuaranies(dep.estimatedConsumptionCents)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Seña abonada:</span>
                        <span className="font-mono font-bold text-emerald-300">
                          {formatGuaranies(dep.depositAmountCents)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Crédito disp. para aplicar:</span>
                        <span className="font-mono font-bold text-cyan-300">
                          {formatGuaranies(dep.remainingCreditCents)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-[#1E2E4A] pt-1">
                        <span className="text-slate-300">Saldo pendiente estimado:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {formatGuaranies(dep.pendingConsumptionBalanceCents)}
                        </span>
                      </div>
                    </div>

                    {dep.remainingCreditCents > 0 && orders.filter((o) => o.paymentStatus === "PENDING").length > 0 && (
                      <div className="pt-1">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleApplyDepositToOrder(dep.id, e.target.value);
                            }
                          }}
                          className="w-full p-2 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-200 font-bold"
                        >
                          <option value="">Aplicar seña a pedido pendiente...</option>
                          {orders
                            .filter((o) => o.paymentStatus === "PENDING")
                            .map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.orderNumber} - {o.tableLabel} ({formatGuaranies(o.totalCents)})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: TURNO Y CIERRE DE CAJA POR OPERADOR (Fase 15) */}
      {activeTab === "shift" && (
        <div className="p-6 rounded-3xl bg-[#0D1930] border border-[#263858] max-w-2xl space-y-4 text-xs">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            {activeShift ? (
              <>
                <Unlock className="w-5 h-5 text-emerald-400" />
                <span>Turno de Caja Abierto: {activeShift.shiftCode}</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 text-amber-400" />
                <span>Apertura de Turno de Caja</span>
              </>
            )}
          </h3>

          {!activeShift ? (
            <div className="space-y-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Fondo Inicial de Efectivo (Gs.)
                </label>
                <input
                  type="number"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white font-mono"
                />
              </div>
              <button
                onClick={async () => {
                  await fetch("/api/v1/gastronomy/payments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "OPEN_CASH_SHIFT",
                      openingCashCents: openingCash,
                      shiftName: "Turno Noche Gastronómico",
                    }),
                  });
                  await loadData();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Abrir Turno de Caja
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#080F1F] border border-[#1E2E4A]">
                  <span className="text-slate-400 block">Cajero Responsable</span>
                  <span className="font-bold text-white">{activeShift.cashierName}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#080F1F] border border-[#1E2E4A]">
                  <span className="text-slate-400 block">Fondo Inicial</span>
                  <span className="font-mono font-bold text-white">
                    {formatGuaranies(activeShift.openingCashCents)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#080F1F] border border-[#1E2E4A]">
                  <span className="text-slate-400 block">Ventas Efectivo</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {formatGuaranies(activeShift.cashSalesCents)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#080F1F] border border-[#1E2E4A]">
                  <span className="text-slate-400 block">Tarjetas / QR / PIX</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {formatGuaranies(
                      activeShift.debitCardSalesCents +
                        activeShift.creditCardSalesCents +
                        activeShift.qrSalesCents +
                        activeShift.pixSalesCents +
                        activeShift.transferSalesCents
                    )}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#080F1F] border border-[#1E2E4A]">
                  <span className="text-slate-400 block">Señas Recibidas</span>
                  <span className="font-mono font-bold text-purple-300">
                    {formatGuaranies(activeShift.depositsReceivedCents)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#080F1F] border border-emerald-500/30">
                  <span className="text-emerald-300 font-bold block">Efectivo Esperado en Caja</span>
                  <span className="font-mono font-black text-emerald-300">
                    {formatGuaranies(activeShift.expectedCashCents)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#263858] space-y-2">
                <label className="text-slate-300 font-semibold block">
                  Arqueo Físico de Efectivo al Cerrar (Gs.)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder={String(activeShift.expectedCashCents)}
                    value={countedCash || activeShift.expectedCashCents}
                    onChange={(e) => setCountedCash(Number(e.target.value))}
                    className="flex-1 p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white font-mono"
                  />
                  <button
                    onClick={async () => {
                      await fetch("/api/v1/gastronomy/payments", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "CLOSE_CASH_SHIFT",
                          countedCashCents: countedCash || activeShift.expectedCashCents,
                        }),
                      });
                      await loadData();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                  >
                    Ejecutar Cierre de Caja
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
