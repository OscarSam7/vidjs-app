"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  History,
  Search,
  RefreshCw,
  User,
} from "lucide-react";
import {
  formatGuaranies,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  DELIVERY_MODE_LABELS,
} from "@/lib/gastronomy/format";
import { useRealtime } from "@/hooks/use-realtime";

export default function GastronomyOrderHistoryPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/gastronomy/bootstrap", { cache: "no-store" });
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
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

  const orders: any[] = data?.orders || [];
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchesQuery =
      !q ||
      o.orderNumber?.toLowerCase().includes(q) ||
      o.tableLabel?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.assignedWaiterName?.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <History className="w-6 h-6 text-purple-400" />
            Historial Completo y Trazabilidad de Pedidos
          </h1>
          <p className="text-sm text-zinc-400">
            Auditoría cronológica de cada pedido: recepción, pago, preparación en barra/cocina, mozo asignado y entrega final.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-300"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Recargar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por N° de pedido, mesa, cliente o mozo..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white"
        >
          <option value="ALL">Todos los estados ({orders.length})</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* History List */}
      <div className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase text-zinc-400">
              <th className="py-2.5 px-3">Pedido / Fecha</th>
              <th className="py-2.5 px-3">Mesa / Sector</th>
              <th className="py-2.5 px-3">Detalle de Productos</th>
              <th className="py-2.5 px-3">Entrega / Mozo</th>
              <th className="py-2.5 px-3">Pago</th>
              <th className="py-2.5 px-3">Total Gs.</th>
              <th className="py-2.5 px-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-zinc-500">
                  No se encontraron pedidos con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredOrders.map((o: any) => (
                <tr key={o.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-3">
                    <div className="font-mono font-bold text-purple-300">{o.orderNumber}</div>
                    <div className="text-[11px] text-zinc-500">
                      {new Date(o.receivedAt || o.createdAt).toLocaleString("es-PY")}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-white">{o.tableLabel || "Barra"}</div>
                    <div className="text-[11px] text-zinc-400">
                      {o.sectorName || "General"} • {o.customerName || "Cliente"}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <ul className="space-y-0.5 text-[11px] text-zinc-300">
                      {(o.items || []).map((item: any) => (
                        <li key={item.id}>
                          <span className="font-bold text-white">{item.quantity}x</span>{" "}
                          {item.productName}
                          {item.observations && (
                            <span className="text-amber-300"> ({item.observations})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-zinc-200">
                      {DELIVERY_MODE_LABELS[o.deliveryMode] || o.deliveryMode}
                    </div>
                    {o.assignedWaiterName && (
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3" />
                        Mozo: {o.assignedWaiterName}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        o.paymentStatus === "APPROVED"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {PAYMENT_STATUS_LABELS[o.paymentStatus] || o.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-white">
                    {formatGuaranies(o.totalCents)}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-semibold ${
                        o.status === "DELIVERED"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : o.status === "CANCELLED"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-purple-500/20 text-purple-300"
                      }`}
                    >
                      {ORDER_STATUS_LABELS[o.status] || o.status}
                    </span>
                    {o.cancelReason && (
                      <div className="text-[10px] text-red-400 mt-1">
                        Motivo: {o.cancelReason}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
