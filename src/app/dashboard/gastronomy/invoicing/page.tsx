"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  FileSpreadsheet,
  RefreshCw,
  CheckSquare,
  Square,
  CheckCircle2,
  RotateCcw,
  Ban,
  Receipt,
} from "lucide-react";
import {
  formatGuaranies,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/gastronomy/format";
import { useRealtime } from "@/hooks/use-realtime";

export default function GastronomyPendingInvoicingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [groupedMode, setGroupedMode] = useState(false);
  const [customerRuc, setCustomerRuc] = useState("44444401-7");
  const [customerName, setCustomerName] = useState("Consumidor Final / Evento");
  const [simulateErpError, setSimulateErpError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

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

  const sales: any[] = data?.pendingSales || [];
  const filteredSales = sales.filter((s) =>
    statusFilter === "ALL" ? true : s.invoicingStatus === statusFilter
  );

  const selectableSales = filteredSales.filter(
    (s) =>
      s.invoicingStatus === "PENDING_INVOICING" ||
      s.invoicingStatus === "INTEGRATION_ERROR" ||
      s.invoicingStatus === "SENT_TO_MAIN_SYSTEM"
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === selectableSales.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableSales.map((s) => s.id));
    }
  };

  const handleInvoiceSales = async () => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/v1/gastronomy/invoicing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: simulateErpError ? "SIMULATE_SYNC_ERROR" : "INVOICE_SALES",
          saleIds: selectedIds,
          groupedMode,
          customerTaxId: customerRuc,
          customerName,
          errorReason: simulateErpError
            ? "Timeout de conexión con el servidor fiscal principal"
            : undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setFeedback({
          type: simulateErpError ? "err" : "ok",
          msg: simulateErpError
            ? `Fallo simulado de conexión ERP registrado en ${selectedIds.length} venta(s). Puede usar Reintentar Sincronización.`
            : `Facturación exitosa. Comprobante(s) emitido(s) y sincronizado(s) con el sistema administrativo.`,
        });
        setSelectedIds([]);
        await loadData();
      } else {
        setFeedback({ type: "err", msg: json.error?.message || "Error al facturar ventas" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetrySync = async (saleId: string) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/v1/gastronomy/invoicing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RETRY_SYNC",
          saleIds: [saleId],
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setFeedback({
          type: "ok",
          msg: "Reintento de sincronización con sistema de facturación exitoso.",
        });
        await loadData();
      } else {
        setFeedback({ type: "err", msg: json.error?.message || "Error al reintentar" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidSale = async (saleId: string) => {
    const reason = window.prompt("Motivo de anulación fiscal / administrativa:");
    if (!reason) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/gastronomy/invoicing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VOID_SALE",
          saleIds: [saleId],
          voidReason: reason,
        }),
      });
      if (res.ok) {
        setFeedback({
          type: "ok",
          msg: "Registro marcado como ANULADO preservando historial de auditoría.",
        });
        await loadData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const selectedTotalCents = sales
    .filter((s) => selectedIds.includes(s.id))
    .reduce((acc, s) => acc + (s.totalCents || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-purple-400" />
            Ventas Pendientes de Facturación (Integración ERP / Fiscal)
          </h1>
          <p className="text-sm text-zinc-400">
            Bandeja centralizada de operaciones cobradas listas para facturación individual o agrupada con control de idempotencia (`sourceUniqueId`).
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-300"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar Bandeja
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === "ok"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/15 border-red-500/30 text-red-300"
          }`}
        >
          <span>{feedback.msg}</span>
          <button onClick={() => setFeedback(null)} className="underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="p-5 rounded-2xl bg-zinc-900/80 border border-purple-500/30 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">RUC / Documento Fiscal</label>
            <input
              value={customerRuc}
              onChange={(e) => setCustomerRuc(e.target.value)}
              placeholder="Ej. 80012345-6"
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Razón Social / Cliente</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Razón Social"
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={groupedMode}
                onChange={(e) => setGroupedMode(e.target.checked)}
                className="rounded border-white/20 bg-zinc-950 text-purple-600"
              />
              Facturación Agrupada (1 factura única)
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-amber-300 cursor-pointer">
              <input
                type="checkbox"
                checked={simulateErpError}
                onChange={(e) => setSimulateErpError(e.target.checked)}
                className="rounded border-white/20 bg-zinc-950 text-amber-500"
              />
              Simular Error de Red ERP (Test Retry)
            </label>
          </div>
          <div>
            <button
              onClick={handleInvoiceSales}
              disabled={submitting || selectedIds.length === 0}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
            >
              <Receipt className="w-4 h-4" />
              FACTURAR VENTAS ({selectedIds.length}) — {formatGuaranies(selectedTotalCents)}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            "ALL",
            "PENDING_INVOICING",
            "SENT_TO_MAIN_SYSTEM",
            "INVOICED",
            "INTEGRATION_ERROR",
            "VOIDED",
          ].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                statusFilter === st
                  ? "bg-purple-600/25 border-purple-500 text-white"
                  : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              {st === "ALL" ? "Todas" : INVOICE_STATUS_LABELS[st] || st}
            </button>
          ))}
        </div>

        <button
          onClick={toggleSelectAll}
          className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1.5"
        >
          <CheckSquare className="w-4 h-4" />
          Seleccionar pendientes ({selectableSales.length})
        </button>
      </div>

      {/* Table */}
      <div className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase text-zinc-400">
              <th className="py-2.5 px-3">Sel.</th>
              <th className="py-2.5 px-3">ID Único Origen</th>
              <th className="py-2.5 px-3">Pedido / Mesa</th>
              <th className="py-2.5 px-3">Cliente / RUC</th>
              <th className="py-2.5 px-3">Subtotal / Desc / Serv</th>
              <th className="py-2.5 px-3">Total Gs.</th>
              <th className="py-2.5 px-3">Método Pago</th>
              <th className="py-2.5 px-3">Estado Fiscal</th>
              <th className="py-2.5 px-3">N° Factura / Sync</th>
              <th className="py-2.5 px-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-10 text-center text-zinc-500">
                  No hay registros en esta vista. Cuando se aprueba un pago en Caja o QR se genera automáticamente el registro aquí.
                </td>
              </tr>
            ) : (
              filteredSales.map((sale: any) => {
                const canSelect =
                  sale.invoicingStatus === "PENDING_INVOICING" ||
                  sale.invoicingStatus === "INTEGRATION_ERROR" ||
                  sale.invoicingStatus === "SENT_TO_MAIN_SYSTEM";
                const isSelected = selectedIds.includes(sale.id);
                return (
                  <tr key={sale.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3">
                      {canSelect ? (
                        <button
                          onClick={() => toggleSelect(sale.id)}
                          className="text-purple-400 hover:text-purple-300"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-500" />
                          )}
                        </button>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-zinc-300">
                      {sale.sourceUniqueId}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{sale.orderNumber}</div>
                      <div className="text-[11px] text-zinc-400">
                        {sale.tableLabel || "Barra"} • {sale.sectorName || "General"}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-zinc-200">{sale.customerName || "Consumidor Final"}</div>
                      <div className="text-[11px] font-mono text-zinc-500">
                        RUC: {sale.customerTaxId || "S/N"}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-zinc-400">
                      <div>Sub: {formatGuaranies(sale.subtotalCents)}</div>
                      {sale.discountCents > 0 && (
                        <div className="text-amber-400">
                          Desc: -{formatGuaranies(sale.discountCents)}
                        </div>
                      )}
                      {sale.serviceFeeCents > 0 && (
                        <div>Serv: +{formatGuaranies(sale.serviceFeeCents)}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-400">
                      {formatGuaranies(sale.totalCents)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-zinc-300">
                        {PAYMENT_METHOD_LABELS[sale.paymentMethod] || sale.paymentMethod}
                      </span>
                      <div className="text-[10px] font-mono text-zinc-500">
                        {sale.paymentReference}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          sale.invoicingStatus === "INVOICED"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : sale.invoicingStatus === "INTEGRATION_ERROR"
                            ? "bg-red-500/15 text-red-400 border border-red-500/30"
                            : sale.invoicingStatus === "VOIDED"
                            ? "bg-zinc-700/40 text-zinc-400"
                            : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {INVOICE_STATUS_LABELS[sale.invoicingStatus] || sale.invoicingStatus}
                      </span>
                      {sale.integrationError && (
                        <div className="text-[10px] text-red-400 mt-1 max-w-[180px]">
                          {sale.integrationError}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      {sale.externalInvoiceNumber ? (
                        <span className="text-emerald-300">{sale.externalInvoiceNumber}</span>
                      ) : (
                        <span className="text-zinc-500">Pendiente</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5">
                      {sale.invoicingStatus === "INTEGRATION_ERROR" && (
                        <button
                          onClick={() => handleRetrySync(sale.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reintentar
                        </button>
                      )}
                      {sale.invoicingStatus !== "VOIDED" && (
                        <button
                          onClick={() => handleVoidSale(sale.id)}
                          className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 text-[11px] inline-flex items-center gap-1"
                          title="Anular sin borrar historial"
                        >
                          <Ban className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
