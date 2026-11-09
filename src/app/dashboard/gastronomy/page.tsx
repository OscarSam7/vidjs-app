"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  Wine,
  ChefHat,
  ConciergeBell,
  Receipt,
  FileSpreadsheet,
  TrendingUp,
  RefreshCw,
  Volume2,
  VolumeX,
  Filter,
  AlertCircle,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import {
  formatGuaranies,
  GASTRO_ORDER_STATUS_LABELS,
  GASTRO_PAYMENT_STATUS_LABELS,
} from "@/lib/gastronomy/format";

export default function GastronomyDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<"TODAY" | "ALL">("TODAY");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [liveAlert, setLiveAlert] = useState<string | null>(null);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {}
  }, [soundEnabled]);

  const fetchBootstrap = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/gastronomy/bootstrap", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Error cargando dashboard gastronómico:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBootstrap();
  }, [fetchBootstrap]);

  useRealtime({
    eventId: "global",
    onEvent: (type, payload: any) => {
      if (type.startsWith("GASTRO_")) {
        if (!payload?.silentPoll && !payload?.focusSync) {
          playNotificationSound();
          setLiveAlert(
            `${type.replace("GASTRO_", "").replace(/_/g, " ")}: ${
              payload?.orderNumber || payload?.productName || "Actualizado"
            }`
          );
          setTimeout(() => setLiveAlert(null), 5000);
        }
        fetchBootstrap();
      }
    },
  });

  if (loading && !data) {
    return (
      <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-3">
        <RefreshCw className="w-7 h-7 animate-spin text-purple-400" />
        <span className="text-sm font-medium">
          Inicializando Sistema Integral de Gestión Gastronómica...
        </span>
      </div>
    );
  }

  const orders: any[] = data?.orders || [];
  const deposits: any[] = data?.deposits || [];
  const pendingSales: any[] = data?.pendingSales || [];
  const sectors: any[] = data?.sectors || [];

  const todayStr = new Date().toISOString().slice(0, 10);
  const filteredOrders = orders.filter((o) => {
    if (selectedSector !== "ALL" && o.sectorName !== selectedSector) return false;
    if (dateFilter === "TODAY" && !String(o.receivedAt).startsWith(todayStr)) return false;
    return true;
  });

  const validOrders = filteredOrders.filter((o) => o.status !== "CANCELLED");
  const pendingOrders = validOrders.filter(
    (o) => o.status === "RECEIVED" || o.status === "PENDING_PAYMENT" || o.status === "PAYMENT_CONFIRMED"
  );
  const preparingOrders = validOrders.filter((o) => o.status === "PREPARING");
  const readyOrders = validOrders.filter(
    (o) =>
      o.status === "READY" ||
      o.status === "WAITING_PICKUP" ||
      o.status === "WAITING_WAITER" ||
      o.status === "REQUESTING_WAITER"
  );
  const deliveredOrders = validOrders.filter((o) => o.status === "DELIVERED");

  // Ventas confirmadas
  const paidOrders = validOrders.filter(
    (o) => o.paymentStatus === "APPROVED" || o.paymentStatus === "PARTIALLY_PAID"
  );
  const totalSalesToday = paidOrders.reduce((acc, o) => acc + (o.totalCents || 0), 0);

  let barSalesCents = 0;
  let kitchenSalesCents = 0;
  const salesBySector: Record<string, number> = {};
  const salesByTable: Record<string, number> = {};
  const salesByProduct: Record<string, { name: string; qty: number; totalCents: number }> = {};

  for (const ord of paidOrders) {
    salesBySector[ord.sectorName] = (salesBySector[ord.sectorName] || 0) + ord.totalCents;
    salesByTable[ord.tableLabel] = (salesByTable[ord.tableLabel] || 0) + ord.totalCents;
    for (const item of ord.items || []) {
      if (item.destination === "BAR" || item.destination === "BOTH") {
        barSalesCents += item.subtotalCents;
      }
      if (item.destination === "KITCHEN") {
        kitchenSalesCents += item.subtotalCents;
      }
      if (!salesByProduct[item.productCode]) {
        salesByProduct[item.productCode] = { name: item.productName, qty: 0, totalCents: 0 };
      }
      salesByProduct[item.productCode].qty += item.quantity;
      salesByProduct[item.productCode].totalCents += item.subtotalCents;
    }
  }

  const pendingPaymentsCount = validOrders.filter((o) => o.paymentStatus === "PENDING").length;
  const confirmedPaymentsCount = validOrders.filter((o) => o.paymentStatus === "APPROVED").length;
  const pendingInvoicingCount = pendingSales.filter(
    (s) => s.invoicingStatus === "PENDING_INVOICING" || s.invoicingStatus === "INTEGRATION_ERROR"
  ).length;

  const totalDepositsCents = deposits
    .filter((d) => d.status !== "CANCELLED")
    .reduce((acc, d) => acc + (d.depositAmountCents || 0), 0);
  const totalPendingBalancesCents = deposits
    .filter((d) => d.status !== "CANCELLED")
    .reduce((acc, d) => acc + (d.pendingConsumptionBalanceCents || 0), 0);

  const topProducts = Object.values(salesByProduct)
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Alerta en tiempo real */}
      {liveAlert && (
        <div className="p-3.5 rounded-2xl bg-purple-950/90 border border-purple-500/60 text-purple-200 text-xs font-bold flex items-center justify-between shadow-xl animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>NOTIFICACIÓN EN VIVO: {liveAlert}</span>
          </div>
          <button onClick={() => setLiveAlert(null)} className="text-purple-300 hover:text-white">
            Cerrar
          </button>
        </div>
      )}

      {/* Cabecera y Filtros */}
      <div className="p-6 rounded-3xl bg-[#0D1930] border border-[#263858] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              SISTEMA INTEGRAL POS + KDS + QR
            </span>
            <span className="text-xs text-slate-400">
              Rol activo: <strong className="text-white">{data?.currentUser?.role}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1 flex items-center gap-2.5">
            <UtensilsCrossed className="w-6 h-6 text-purple-400" />
            <span>Dashboard Gastronómico</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Control central en tiempo real de pedidos, barra, cocina, mozos, caja, señas y facturación.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filtro Fecha */}
          <div className="flex items-center bg-[#080F1F] border border-[#263858] rounded-xl p-1 text-xs">
            <button
              onClick={() => setDateFilter("TODAY")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                dateFilter === "TODAY" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setDateFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                dateFilter === "ALL" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Histórico
            </button>
          </div>

          {/* Filtro Sector */}
          <div className="flex items-center gap-1.5 bg-[#080F1F] border border-[#263858] rounded-xl px-3 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none"
            >
              <option value="ALL" className="bg-[#080F1F]">
                Todos los sectores
              </option>
              {sectors.map((s) => (
                <option key={s.id} value={s.name} className="bg-[#080F1F]">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sonido Tiempo Real */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              soundEnabled
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : "bg-zinc-900 border-zinc-700 text-zinc-400"
            }`}
            title="Activar/Desactivar alerta sonora en tiempo real"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? "Sonido ON" : "Mudo"}</span>
          </button>

          <Link
            href="/menu"
            target="_blank"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
          >
            <span>Abrir PWA Cliente</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 16 Indicadores Clave del Dashboard Administrativo (Fase 12) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-4 rounded-2xl bg-[#0D1930] border border-[#263858]">
          <span className="text-[11px] text-slate-400 font-semibold block">Pedidos del día</span>
          <span className="text-2xl font-black text-white mt-1 block">{validOrders.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#0D1930] border border-amber-500/30">
          <span className="text-[11px] text-amber-300 font-semibold block">Pendientes</span>
          <span className="text-2xl font-black text-amber-300 mt-1 block">{pendingOrders.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#0D1930] border border-purple-500/30">
          <span className="text-[11px] text-purple-300 font-semibold block">En preparación</span>
          <span className="text-2xl font-black text-purple-300 mt-1 block">{preparingOrders.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#0D1930] border border-cyan-500/30">
          <span className="text-[11px] text-cyan-300 font-semibold block">Pedidos listos</span>
          <span className="text-2xl font-black text-cyan-300 mt-1 block">{readyOrders.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#0D1930] border border-emerald-500/30">
          <span className="text-[11px] text-emerald-300 font-semibold block">Entregados</span>
          <span className="text-2xl font-black text-emerald-300 mt-1 block">{deliveredOrders.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#0D1930] border border-[#263858]">
          <span className="text-[11px] text-slate-400 font-semibold block">Pagos pendientes</span>
          <span className="text-2xl font-black text-rose-300 mt-1 block">{pendingPaymentsCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#0D1930] border border-[#263858]">
          <span className="text-[11px] text-slate-400 font-semibold block">Pagos confirmados</span>
          <span className="text-2xl font-black text-emerald-300 mt-1 block">{confirmedPaymentsCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#0D1930] border border-indigo-500/40">
          <span className="text-[11px] text-indigo-300 font-semibold block">Pend. Facturación</span>
          <span className="text-2xl font-black text-indigo-300 mt-1 block">{pendingInvoicingCount}</span>
        </div>
      </div>

      {/* Tarjetas Financieras Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-[#0D1930] border border-emerald-500/30">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
            <span>VENTAS DEL DÍA</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {formatGuaranies(totalSalesToday)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {paidOrders.length} pedidos cobrados
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D1930] border border-cyan-500/30">
          <div className="flex items-center justify-between text-xs text-cyan-300 font-bold">
            <span>VENTAS DE BARRA</span>
            <Wine className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-white mt-2">
            {formatGuaranies(barSalesCents)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Bebidas, cervezas y cócteles</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D1930] border border-amber-500/30">
          <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
            <span>VENTAS DE COCINA</span>
            <ChefHat className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-white mt-2">
            {formatGuaranies(kitchenSalesCents)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Platos, pizzas y picadas</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D1930] border border-purple-500/30">
          <div className="flex items-center justify-between text-xs text-purple-300 font-bold">
            <span>SEÑAS RECIBIDAS</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-white mt-2">
            {formatGuaranies(totalDepositsCents)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Créditos anticipados (no duplican venta)
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D1930] border border-rose-500/30">
          <div className="flex items-center justify-between text-xs text-rose-300 font-bold">
            <span>SALDOS PENDIENTES</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-white mt-2">
            {formatGuaranies(totalPendingBalancesCents)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Remanente estimado de reservas
          </span>
        </div>
      </div>

      {/* Gráficos de Desglose: Ventas por Sector, por Mesa y Productos Más Vendidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ventas por Sector */}
        <div className="p-5 rounded-2xl bg-[#0D1930] border border-[#263858] space-y-3">
          <h3 className="text-sm font-bold text-white">Ventas por Sector</h3>
          {Object.keys(salesBySector).length === 0 ? (
            <p className="text-xs text-slate-400 py-4">Aún no hay ventas cobradas en este filtro.</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(salesBySector).map(([sec, val]) => {
                const pct = totalSalesToday > 0 ? Math.min(100, Math.round((val / totalSalesToday) * 100)) : 0;
                return (
                  <div key={sec} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-200">{sec}</span>
                      <span className="font-mono text-emerald-300">{formatGuaranies(val)} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#080F1F] overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ventas por Mesa */}
        <div className="p-5 rounded-2xl bg-[#0D1930] border border-[#263858] space-y-3">
          <h3 className="text-sm font-bold text-white">Ventas por Mesa</h3>
          {Object.keys(salesByTable).length === 0 ? (
            <p className="text-xs text-slate-400 py-4">Sin consumos facturados aún.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(salesByTable)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([tbl, val]) => (
                  <div
                    key={tbl}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#080F1F] border border-[#1E2E4A] text-xs"
                  >
                    <span className="font-bold text-white">{tbl}</span>
                    <span className="font-mono font-bold text-cyan-300">{formatGuaranies(val)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Ventas por Producto */}
        <div className="p-5 rounded-2xl bg-[#0D1930] border border-[#263858] space-y-3">
          <h3 className="text-sm font-bold text-white">Productos más vendidos</h3>
          {topProducts.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">Aún no se registran ítems vendidos.</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#080F1F] border border-[#1E2E4A] text-xs"
                >
                  <div className="truncate pr-2">
                    <span className="font-semibold text-white block truncate">{p.name}</span>
                    <span className="text-[10px] text-slate-400">{p.qty} unidades</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-300 shrink-0">
                    {formatGuaranies(p.totalCents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Accesos Operativos Directos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link
          href="/dashboard/gastronomy/bar"
          className="p-4 rounded-2xl bg-[#0D1930] hover:bg-[#142546] border border-cyan-500/30 flex flex-col gap-2 transition-all"
        >
          <Wine className="w-5 h-5 text-cyan-400" />
          <span className="text-xs font-bold text-white">Panel de Barra (KDS)</span>
          <span className="text-[10px] text-slate-400">Bebidas y modalidad entrega</span>
        </Link>
        <Link
          href="/dashboard/gastronomy/kitchen"
          className="p-4 rounded-2xl bg-[#0D1930] hover:bg-[#142546] border border-amber-500/30 flex flex-col gap-2 transition-all"
        >
          <ChefHat className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-bold text-white">Panel de Cocina (KDS)</span>
          <span className="text-[10px] text-slate-400">Comandas y solicitud mozo</span>
        </Link>
        <Link
          href="/dashboard/gastronomy/waiters"
          className="p-4 rounded-2xl bg-[#0D1930] hover:bg-[#142546] border border-indigo-500/30 flex flex-col gap-2 transition-all"
        >
          <ConciergeBell className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white">Panel Móvil Mozos</span>
          <span className="text-[10px] text-slate-400">Aceptación y entrega en mesa</span>
        </Link>
        <Link
          href="/dashboard/gastronomy/cashier"
          className="p-4 rounded-2xl bg-[#0D1930] hover:bg-[#142546] border border-emerald-500/30 flex flex-col gap-2 transition-all"
        >
          <Receipt className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold text-white">Caja Gastronómica</span>
          <span className="text-[10px] text-slate-400">Cobros, señas y cierre</span>
        </Link>
        <Link
          href="/dashboard/gastronomy/invoicing"
          className="p-4 rounded-2xl bg-[#0D1930] hover:bg-[#142546] border border-purple-500/30 flex flex-col gap-2 transition-all"
        >
          <FileSpreadsheet className="w-5 h-5 text-purple-400" />
          <span className="text-xs font-bold text-white">Ventas por Facturar</span>
          <span className="text-[10px] text-slate-400">Bandeja central ERP</span>
        </Link>
        <Link
          href="/dashboard/gastronomy/orders"
          className="p-4 rounded-2xl bg-[#0D1930] hover:bg-[#142546] border border-[#263858] flex flex-col gap-2 transition-all"
        >
          <Clock className="w-5 h-5 text-slate-300" />
          <span className="text-xs font-bold text-white">Monitor de Pedidos</span>
          <span className="text-[10px] text-slate-400">Trazabilidad completa</span>
        </Link>
      </div>

      {/* Últimos Pedidos en Tiempo Real */}
      <div className="p-5 rounded-3xl bg-[#0D1930] border border-[#263858] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Pedidos Recientes en Tiempo Real</span>
          </h3>
          <Link
            href="/dashboard/gastronomy/orders"
            className="text-xs font-bold text-purple-400 hover:text-purple-300"
          >
            Ver todos →
          </Link>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-[#080F1F] rounded-2xl border border-[#1E2E4A]">
            No hay pedidos registrados todavía. Abre la{" "}
            <Link href="/menu" className="text-purple-400 underline font-bold">
              PWA del Cliente
            </Link>{" "}
            para realizar el primer pedido.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#263858] text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Pedido</th>
                  <th className="py-2.5 px-3">Mesa / Sector</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Entrega</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Pago</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2E4A]">
                {filteredOrders.slice(0, 10).map((ord) => {
                  const st = GASTRO_ORDER_STATUS_LABELS[ord.status] || {
                    label: ord.status,
                    color: "bg-zinc-800 text-zinc-300",
                  };
                  const pst = GASTRO_PAYMENT_STATUS_LABELS[ord.paymentStatus] || {
                    label: ord.paymentStatus,
                    color: "bg-zinc-800 text-zinc-300",
                  };
                  return (
                    <tr key={ord.id} className="hover:bg-[#132342]/60">
                      <td className="py-2.5 px-3 font-mono font-bold text-purple-300">
                        {ord.orderNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-white">{ord.tableLabel}</span>
                        <span className="text-slate-400 block text-[10px]">{ord.sectorName}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-200">{ord.customerName || "Cliente"}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#080F1F] border border-[#263858] text-slate-300">
                          {ord.deliveryMode === "BAR_PICKUP" ? "Retiro en barra" : "Entrega por mozo"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pst.color}`}>
                          {pst.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300">
                        {formatGuaranies(ord.totalCents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
