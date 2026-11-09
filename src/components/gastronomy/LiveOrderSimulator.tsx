"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Zap,
  Wine,
  ChefHat,
  ConciergeBell,
  Receipt,
  Play,
  CheckCircle2,
  SlidersHorizontal,
  Sparkles,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
  Flame,
  AlertCircle,
} from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import {
  formatGuaranies,
  GASTRO_ORDER_STATUS_LABELS,
  GASTRO_PAYMENT_STATUS_LABELS,
} from "@/lib/gastronomy/format";

export default function LiveOrderSimulator() {
  const [isOpen, setIsOpen] = useState(true);
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Parámetros configurables de la simulación
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [deliveryMode, setDeliveryMode] = useState<"WAITER_DELIVERY" | "BAR_PICKUP">(
    "WAITER_DELIVERY"
  );
  const [priority, setPriority] = useState<"NORMAL" | "HIGH" | "VIP">("NORMAL");
  const [autoApprovePayment, setAutoApprovePayment] = useState<boolean>(true);
  const [customObservation, setCustomObservation] = useState<string>("Bien fría / Punto medio");
  const [selectedProductIds, setSelectedProductIds] = useState<Record<string, number>>({});

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
    } catch {
      // ignore
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

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 5000);
  };

  const products: any[] = data?.products || [];
  const tables: any[] = (data?.tables || []).filter((t: any) => t.active !== false);
  const deliveryConfig = data?.deliveryConfig;

  const barProducts = products.filter(
    (p) => (p.destination === "BAR" || p.destination === "BOTH") && p.active
  );
  const kitchenProducts = products.filter(
    (p) => (p.destination === "KITCHEN" || p.destination === "BOTH") && p.active
  );

  // Función central que crea un pedido REAL en PostgreSQL y opcionalmente aprueba su pago en Caja
  const createSimulatedRealOrder = async (
    itemsToOrder: {
      productId: string;
      quantity: number;
      selectedOptions?: { id: string; name: string; priceCents: number }[];
      observations?: string;
    }[],
    modeOverride?: "WAITER_DELIVERY" | "BAR_PICKUP",
    priorityOverride?: "NORMAL" | "HIGH" | "VIP",
    labelDesc?: string
  ) => {
    if (itemsToOrder.length === 0) {
      alert("Seleccioná al menos un producto para simular el pedido.");
      return;
    }
    setBusy(true);
    try {
      const tableObj = tables.find((t) => t.id === selectedTableId) || tables[0];
      const effectiveMode = modeOverride || deliveryMode;
      const effectivePriority = priorityOverride || priority;

      // Si la modalidad elegida está desactivada en configuración, habilitarla automáticamente para la prueba
      if (
        effectiveMode === "BAR_PICKUP" &&
        deliveryConfig &&
        !deliveryConfig.barPickupEnabled
      ) {
        await fetch("/api/v1/gastronomy/delivery-config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barPickupEnabled: true }),
        });
      }
      if (
        effectiveMode === "WAITER_DELIVERY" &&
        deliveryConfig &&
        !deliveryConfig.waiterDeliveryEnabled
      ) {
        await fetch("/api/v1/gastronomy/delivery-config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waiterDeliveryEnabled: true }),
        });
      }

      const orderRes = await fetch("/api/v1/gastronomy/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: tableObj?.id,
          tableLabel: tableObj?.label || "Mesa 1",
          sectorName: tableObj?.sector?.name || tableObj?.zone || "Salón Principal",
          customerName: "Cliente Simulación en Vivo",
          deliveryMode: effectiveMode,
          paymentMethodSelected: "CASH",
          priority: effectivePriority,
          items: itemsToOrder,
        }),
      });

      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson.order) {
        alert(orderJson.error?.message || "Error al crear pedido simulado");
        return;
      }

      const createdOrder = orderJson.order;

      // Si el usuario marcó "Entrar con Pago Confirmado", aprobamos el pago en Caja automáticamente
      if (autoApprovePayment) {
        await fetch("/api/v1/gastronomy/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CONFIRM_CASH_PAYMENT",
            orderId: createdOrder.id,
            amountCents: createdOrder.totalCents,
            receivedAmountCents: createdOrder.totalCents,
          }),
        });
      }

      notify(
        `✅ ${labelDesc || "Pedido"} creado: ${createdOrder.orderNumber} en ${
          createdOrder.tableLabel
        } (${autoApprovePayment ? "Pago Confirmado" : "Pendiente en Caja"})`
      );
      setSelectedProductIds({});
      await loadData();
    } finally {
      setBusy(false);
    }
  };

  // Escenario 1: Pedido exclusivo de BARRA
  const triggerBarScenario = () => {
    const beer =
      barProducts.find((p) => p.name.toLowerCase().includes("cerveza")) || barProducts[0];
    const drink = barProducts[1] || beer;
    if (!beer) return;

    const items = [
      {
        productId: beer.id,
        quantity: 2,
        observations: "Bien fría (Simulación Barra)",
      },
      ...(drink && drink.id !== beer.id
        ? [{ productId: drink.id, quantity: 1, observations: "Con mucho hielo" }]
        : []),
    ];

    createSimulatedRealOrder(items, deliveryMode, priority, "Pedido Exclusivo de BARRA");
  };

  // Escenario 2: Pedido exclusivo de COCINA
  const triggerKitchenScenario = () => {
    const burger =
      kitchenProducts.find((p) => p.name.toLowerCase().includes("hamburguesa")) ||
      kitchenProducts[0];
    if (!burger) return;

    const items = [
      {
        productId: burger.id,
        quantity: 1,
        selectedOptions: [
          { id: "sim-queso", name: "Queso extra", priceCents: 5000 },
          { id: "sim-panceta", name: "Panceta crocante", priceCents: 7000 },
        ],
        observations: "Punto medio, bien caliente",
      },
    ];

    createSimulatedRealOrder(
      items,
      "WAITER_DELIVERY",
      priority,
      "Pedido Exclusivo de COCINA"
    );
  };

  // Escenario 3: Pedido MIXTO (Barra + Cocina en simultáneo)
  const triggerMixedScenario = () => {
    const beer = barProducts[0];
    const food = kitchenProducts[0];
    if (!beer || !food) return;

    const items = [
      {
        productId: beer.id,
        quantity: 2,
        observations: "Bien fría",
      },
      {
        productId: food.id,
        quantity: 1,
        selectedOptions: [{ id: "sim-extra", name: "Adicional queso", priceCents: 5000 }],
        observations: "Prioridad salón",
      },
    ];

    createSimulatedRealOrder(
      items,
      "WAITER_DELIVERY",
      "VIP",
      "Pedido MIXTO (Barra + Cocina)"
    );
  };

  // Avanzar estado de una orden desde el simulador
  const runOrderAction = async (orderId: string, action: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/gastronomy/orders/action", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error?.message || "Acción no permitida por las reglas configuradas");
      } else {
        await loadData();
      }
    } finally {
      setBusy(false);
    }
  };

  // Aprobar pago rápido desde el simulador
  const quickConfirmPayment = async (ord: any) => {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/gastronomy/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONFIRM_CASH_PAYMENT",
          orderId: ord.id,
          amountCents: ord.totalCents,
          receivedAmountCents: ord.totalCents,
        }),
      });
      if (res.ok) {
        notify(`💰 Pago confirmado en Caja para ${ord.orderNumber}`);
        await loadData();
      }
    } finally {
      setBusy(false);
    }
  };

  // Cambiar reglas operativas en vivo
  const toggleDeliveryRule = async (patch: Record<string, any>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/gastronomy/delivery-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        notify("⚙️ Regla operativa actualizada en vivo");
        await loadData();
      }
    } finally {
      setBusy(false);
    }
  };

  const activeOrders: any[] = (data?.orders || [])
    .filter((o: any) => o.status !== "DELIVERED" && o.status !== "CANCELLED")
    .slice(0, 6);

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#111F3D] via-[#0D1930] to-[#080F1F] border-2 border-purple-500/50 shadow-2xl overflow-hidden">
      {/* Barra Superior del Simulador */}
      <div className="px-5 py-3.5 bg-purple-950/40 border-b border-purple-500/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-purple-600 text-white shadow-md shadow-purple-600/30">
            <Zap className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white">
                SIMULADOR Y CONFIGURADOR EN VIVO (BARRA + COCINA + MOZOS + CAJA)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                Tiempo Real SSE
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Dispará pedidos reales de prueba, cambiá las reglas operativas en caliente y observá cómo responden Barra, Cocina y el Menú QR del cliente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/menu"
            target="_blank"
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
          >
            <span>Abrir PWA Cliente (/menu)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 rounded-xl bg-[#080F1F] hover:bg-slate-800 border border-[#263858] text-xs font-bold text-slate-200 flex items-center gap-1"
          >
            <span>{isOpen ? "Ocultar Simulador" : "Abrir Simulador"}</span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-5 space-y-5">
          {feedback && (
            <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between">
              <span>{feedback}</span>
              <button onClick={() => setFeedback(null)}>✕</button>
            </div>
          )}

          {/* FILA 1: Parámetros + 3 Escenarios Reales en 1 Clic + Reglas Operativas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Columna 1: Configuración de la Simulación */}
            <div className="p-4 rounded-2xl bg-[#080F1F] border border-[#263858] space-y-3">
              <div className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                1. Parámetros del Pedido a Simular
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Mesa de Origen</label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#0D1930] border border-[#263858] text-white text-xs"
                  >
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} ({t.sector?.name || "Salón"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Prioridad</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#0D1930] border border-[#263858] text-white text-xs"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Alta Prioridad</option>
                    <option value="VIP">VIP Prioritario</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDeliveryMode("WAITER_DELIVERY")}
                  className={`py-2 px-2.5 rounded-xl font-bold border text-[11px] ${
                    deliveryMode === "WAITER_DELIVERY"
                      ? "bg-indigo-600 text-white border-indigo-400"
                      : "bg-[#0D1930] text-slate-400 border-[#263858]"
                  }`}
                >
                  🤵 Entrega por Mozo
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode("BAR_PICKUP")}
                  className={`py-2 px-2.5 rounded-xl font-bold border text-[11px] ${
                    deliveryMode === "BAR_PICKUP"
                      ? "bg-cyan-600 text-white border-cyan-400"
                      : "bg-[#0D1930] text-slate-400 border-[#263858]"
                  }`}
                >
                  🍸 Retiro en Barra
                </button>
              </div>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D1930] border border-[#263858] cursor-pointer text-xs">
                <span className="text-slate-200 font-semibold">
                  Entrar con Pago ya Confirmado en Caja
                </span>
                <input
                  type="checkbox"
                  checked={autoApprovePayment}
                  onChange={(e) => setAutoApprovePayment(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500"
                />
              </label>
            </div>

            {/* Columna 2: Disparadores Instantáneos (Barra, Cocina, Mixto) */}
            <div className="p-4 rounded-2xl bg-[#080F1F] border border-[#263858] space-y-2.5">
              <div className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5" />
                2. Disparar Simulación Real en 1 Clic
              </div>

              <button
                disabled={busy}
                onClick={triggerBarScenario}
                className="w-full p-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-left flex items-center justify-between transition"
              >
                <div>
                  <div className="text-xs font-black text-cyan-200 flex items-center gap-1.5">
                    <Wine className="w-4 h-4 text-cyan-400" />
                    <span>Simular Pedido SOLO BARRA (Bebidas)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    2x Cerveza Munich (bien fría) → Entra a Barra, no a Cocina.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 text-[10px] font-black">
                  Enviar
                </span>
              </button>

              <button
                disabled={busy}
                onClick={triggerKitchenScenario}
                className="w-full p-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/35 border border-amber-500/40 text-left flex items-center justify-between transition"
              >
                <div>
                  <div className="text-xs font-black text-amber-200 flex items-center gap-1.5">
                    <ChefHat className="w-4 h-4 text-amber-400" />
                    <span>Simular Pedido SOLO COCINA (Comida)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    1x Hamburguesa (queso y panceta) → Descuenta receta y exige Mozo.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-black">
                  Enviar
                </span>
              </button>

              <button
                disabled={busy}
                onClick={triggerMixedScenario}
                className="w-full p-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-left flex items-center justify-between transition"
              >
                <div>
                  <div className="text-xs font-black text-purple-200 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-purple-400" />
                    <span>Simular Pedido MIXTO (Barra + Cocina VIP)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Bebidas + Comida en 1 pedido → Divide a Barra y Cocina en simultáneo.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-purple-500 text-white text-[10px] font-black">
                  Enviar
                </span>
              </button>
            </div>

            {/* Columna 3: Conmutador en Vivo de Reglas Operativas */}
            <div className="p-4 rounded-2xl bg-[#080F1F] border border-[#263858] space-y-2.5">
              <div className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                3. Configurar Comportamiento en Vivo
              </div>

              {deliveryConfig && (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#0D1930] border border-[#263858]">
                    <span className="text-slate-200">Opción 1: Retiro en Barra</span>
                    <button
                      onClick={() =>
                        toggleDeliveryRule({
                          barPickupEnabled: !deliveryConfig.barPickupEnabled,
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${
                        deliveryConfig.barPickupEnabled
                          ? "bg-emerald-600 text-white"
                          : "bg-red-950 text-red-300 border border-red-500/40"
                      }`}
                    >
                      {deliveryConfig.barPickupEnabled ? "ACTIVO" : "DESACTIVADO"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#0D1930] border border-[#263858]">
                    <span className="text-slate-200">Opción 2: Entrega por Mozo</span>
                    <button
                      onClick={() =>
                        toggleDeliveryRule({
                          waiterDeliveryEnabled: !deliveryConfig.waiterDeliveryEnabled,
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${
                        deliveryConfig.waiterDeliveryEnabled
                          ? "bg-emerald-600 text-white"
                          : "bg-red-950 text-red-300 border border-red-500/40"
                      }`}
                    >
                      {deliveryConfig.waiterDeliveryEnabled ? "ACTIVO" : "DESACTIVADO"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#0D1930] border border-[#263858]">
                    <span className="text-slate-200">
                      Cocina: Excepción entregar sin Mozo
                    </span>
                    <button
                      onClick={() =>
                        toggleDeliveryRule({
                          allowKitchenDirectDeliveryException:
                            !deliveryConfig.allowKitchenDirectDeliveryException,
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${
                        deliveryConfig.allowKitchenDirectDeliveryException
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {deliveryConfig.allowKitchenDirectDeliveryException
                        ? "PERMITIDO"
                        : "BLOQUEADO (EXIGE MOZO)"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FILA 2: Monitor Interactivo Simultáneo (Barra vs Cocina vs Mozo/Caja) */}
          <div className="p-4 rounded-2xl bg-[#080F1F] border border-[#263858] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-black text-white flex items-center gap-2">
                <span>4. MONITOR INTERACTIVO DEL CIRCUITO EN VIVO ({activeOrders.length} pedidos en curso)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <Link
                  href="/dashboard/gastronomy/bar"
                  className="text-cyan-300 hover:underline flex items-center gap-1"
                >
                  <Wine className="w-3.5 h-3.5" /> Ir a Barra KDS
                </Link>
                <span>•</span>
                <Link
                  href="/dashboard/gastronomy/kitchen"
                  className="text-amber-300 hover:underline flex items-center gap-1"
                >
                  <ChefHat className="w-3.5 h-3.5" /> Ir a Cocina KDS
                </Link>
                <span>•</span>
                <Link
                  href="/dashboard/gastronomy/waiters"
                  className="text-indigo-300 hover:underline flex items-center gap-1"
                >
                  <ConciergeBell className="w-3.5 h-3.5" /> Ir a Panel Mozos
                </Link>
              </div>
            </div>

            {activeOrders.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No hay pedidos en curso en este instante. Hacé clic en cualquiera de los 3 botones de arriba para simular un pedido en tiempo real.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeOrders.map((ord) => {
                  const barSt = GASTRO_ORDER_STATUS_LABELS[ord.barStatus]?.label || ord.barStatus;
                  const kitSt =
                    GASTRO_ORDER_STATUS_LABELS[ord.kitchenStatus]?.label || ord.kitchenStatus;
                  const paySt =
                    GASTRO_PAYMENT_STATUS_LABELS[ord.paymentStatus]?.label || ord.paymentStatus;

                  return (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-2xl bg-[#0D1930] border border-[#263858] space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-black text-purple-300">
                            {ord.orderNumber}
                          </span>
                          <span className="text-slate-300 font-bold ml-2">
                            {ord.tableLabel}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                          {ord.deliveryMode === "BAR_PICKUP"
                            ? "🍸 Retiro en Barra"
                            : "🤵 Entrega por Mozo"}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-0.5">
                        {(ord.items || []).map((it: any) => (
                          <div key={it.id} className="flex items-center justify-between">
                            <span>
                              <strong className="text-white">{it.quantity}x</strong> {it.productName}{" "}
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                  it.destination === "KITCHEN"
                                    ? "bg-amber-500/20 text-amber-300"
                                    : "bg-cyan-500/20 text-cyan-300"
                                }`}
                              >
                                {it.destination === "KITCHEN" ? "COCINA" : "BARRA"}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Botón rápido de Caja si está pendiente de pago */}
                      {ord.paymentStatus !== "APPROVED" && (
                        <button
                          onClick={() => quickConfirmPayment(ord)}
                          className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Caja: Confirmar Pago ({formatGuaranies(ord.totalCents)})</span>
                        </button>
                      )}

                      {/* Controles rápidos de BARRA para este pedido */}
                      {ord.hasBarItems && (
                        <div className="p-2 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-1.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="font-bold text-cyan-300">BARRA:</span>
                            <span className="text-white font-semibold">{barSt}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() => runOrderAction(ord.id, "BAR_START_PREP")}
                              className="px-2 py-1 rounded bg-cyan-600/30 hover:bg-cyan-600 text-cyan-100 text-[10px] font-bold"
                            >
                              1. Preparar
                            </button>
                            <button
                              onClick={() => runOrderAction(ord.id, "BAR_MARK_READY")}
                              className="px-2 py-1 rounded bg-cyan-600/30 hover:bg-cyan-600 text-cyan-100 text-[10px] font-bold"
                            >
                              2. Listo
                            </button>
                            {ord.deliveryMode === "BAR_PICKUP" ? (
                              <button
                                onClick={() => runOrderAction(ord.id, "BAR_NOTIFY_PICKUP")}
                                className="px-2 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold"
                              >
                                3. Avisar Retiro
                              </button>
                            ) : (
                              <button
                                onClick={() => runOrderAction(ord.id, "BAR_REQUEST_WAITER")}
                                className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold"
                              >
                                3. Pedir Mozo
                              </button>
                            )}
                            <button
                              onClick={() => runOrderAction(ord.id, "BAR_MARK_DELIVERED")}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
                            >
                              4. Entregado
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Controles rápidos de COCINA para este pedido */}
                      {ord.hasKitchenItems && (
                        <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="font-bold text-amber-300">COCINA:</span>
                            <span className="text-white font-semibold">{kitSt}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() => runOrderAction(ord.id, "KITCHEN_START_PREP")}
                              className="px-2 py-1 rounded bg-amber-600/30 hover:bg-amber-600 text-amber-100 text-[10px] font-bold"
                            >
                              1. Preparar
                            </button>
                            <button
                              onClick={() => runOrderAction(ord.id, "KITCHEN_MARK_READY")}
                              className="px-2 py-1 rounded bg-amber-600/30 hover:bg-amber-600 text-amber-100 text-[10px] font-bold"
                            >
                              2. Listo
                            </button>
                            <button
                              onClick={() => runOrderAction(ord.id, "KITCHEN_REQUEST_WAITER")}
                              className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold"
                            >
                              3. SOLICITAR MOZO
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Controles rápidos de MOZO cuando Barra o Cocina solicitaron Mozo */}
                      {(ord.waiterRequestStatus === "REQUESTED" ||
                        ord.waiterRequestStatus === "ACCEPTED" ||
                        ord.waiterRequestStatus === "PICKED_UP") && (
                        <div className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/40 space-y-1.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="font-bold text-indigo-300">
                              MOZO ({ord.assignedWaiterName || "Sin asignar"}):
                            </span>
                            <span className="text-white font-semibold">
                              {ord.waiterRequestStatus}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() => runOrderAction(ord.id, "WAITER_ACCEPT_ORDER")}
                              className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold"
                            >
                              1. Aceptar Pedido
                            </button>
                            {ord.hasBarItems && (
                              <button
                                onClick={() => runOrderAction(ord.id, "WAITER_PICKUP_BAR")}
                                className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold"
                              >
                                2a. Retirar Barra
                              </button>
                            )}
                            {ord.hasKitchenItems && (
                              <button
                                onClick={() => runOrderAction(ord.id, "WAITER_PICKUP_KITCHEN")}
                                className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold"
                              >
                                2b. Retirar Cocina
                              </button>
                            )}
                            <button
                              onClick={() => runOrderAction(ord.id, "WAITER_CONFIRM_DELIVERY")}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
                            >
                              3. Confirmar Entrega en Mesa
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
