"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import {
  formatGuaranies,
  PAYMENT_METHOD_LABELS,
  INVOICE_STATUS_LABELS,
} from "@/lib/gastronomy/format";

type ReportType =
  | "BY_DAY"
  | "BY_SHIFT"
  | "BY_SECTOR"
  | "BY_TABLE"
  | "BY_WAITER"
  | "BY_CASHIER"
  | "BY_BAR"
  | "BY_KITCHEN"
  | "TOP_PRODUCTS"
  | "EXHAUSTED_PRODUCTS"
  | "CANCELLATIONS"
  | "DISCOUNTS"
  | "REFUNDS"
  | "PAYMENT_METHODS"
  | "DEPOSITS"
  | "PENDING_INVOICING";

const REPORT_TABS: { id: ReportType; label: string }[] = [
  { id: "BY_DAY", label: "1. Ventas por Día" },
  { id: "BY_SHIFT", label: "2. Ventas por Turno" },
  { id: "BY_SECTOR", label: "3. Ventas por Sector" },
  { id: "BY_TABLE", label: "4. Ventas por Mesa" },
  { id: "BY_WAITER", label: "5. Ventas por Mozo" },
  { id: "BY_CASHIER", label: "6. Ventas por Cajero" },
  { id: "BY_BAR", label: "7. Ventas de Barra" },
  { id: "BY_KITCHEN", label: "8. Ventas de Cocina" },
  { id: "TOP_PRODUCTS", label: "9. Más Vendidos" },
  { id: "EXHAUSTED_PRODUCTS", label: "10. Productos Agotados" },
  { id: "CANCELLATIONS", label: "11. Cancelaciones" },
  { id: "DISCOUNTS", label: "12. Descuentos" },
  { id: "REFUNDS", label: "13. Devoluciones" },
  { id: "PAYMENT_METHODS", label: "14. Medios de Pago" },
  { id: "DEPOSITS", label: "15. Señas Cobradas" },
  { id: "PENDING_INVOICING", label: "16. Pendientes Facturación" },
];

export default function GastronomyReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState<ReportType>("BY_DAY");

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

  const computeRows = (): { columns: string[]; rows: (string | number)[][] } => {
    if (!data) return { columns: [], rows: [] };
    const orders: any[] = data.orders || [];
    const products: any[] = data.products || [];
    const payments: any[] = data.payments || [];
    const deposits: any[] = data.deposits || [];
    const pendingSales: any[] = data.pendingSales || [];
    const activeShift = data.activeShift;
    const activeOrders = orders.filter((o) => o.status !== "CANCELLED");

    switch (activeReport) {
      case "BY_DAY": {
        const map = new Map<string, { count: number; total: number }>();
        activeOrders.forEach((o) => {
          const day = new Date(o.receivedAt || o.createdAt).toLocaleDateString("es-PY");
          const cur = map.get(day) || { count: 0, total: 0 };
          cur.count += 1;
          cur.total += o.totalCents || 0;
          map.set(day, cur);
        });
        return {
          columns: ["Fecha", "Cantidad de Pedidos", "Total Ventas (Gs.)"],
          rows: Array.from(map.entries()).map(([k, v]) => [k, v.count, formatGuaranies(v.total)]),
        };
      }
      case "BY_SHIFT": {
        if (!activeShift) return { columns: ["Turno", "Estado"], rows: [] };
        return {
          columns: ["Turno", "Cajero", "Estado", "Apertura (Gs.)", "Efectivo Esperado (Gs.)"],
          rows: [
            [
              activeShift.shiftName,
              activeShift.openedByName,
              activeShift.status,
              formatGuaranies(activeShift.openingCashCents || 0),
              formatGuaranies(activeShift.expectedCashCents || 0),
            ],
          ],
        };
      }
      case "BY_SECTOR": {
        const map = new Map<string, { count: number; total: number }>();
        activeOrders.forEach((o) => {
          const k = o.sectorName || "General";
          const cur = map.get(k) || { count: 0, total: 0 };
          cur.count += 1;
          cur.total += o.totalCents || 0;
          map.set(k, cur);
        });
        return {
          columns: ["Sector", "Pedidos", "Facturación (Gs.)"],
          rows: Array.from(map.entries()).map(([k, v]) => [k, v.count, formatGuaranies(v.total)]),
        };
      }
      case "BY_TABLE": {
        const map = new Map<string, { count: number; total: number }>();
        activeOrders.forEach((o) => {
          const k = o.tableLabel || "Retiro en Barra";
          const cur = map.get(k) || { count: 0, total: 0 };
          cur.count += 1;
          cur.total += o.totalCents || 0;
          map.set(k, cur);
        });
        return {
          columns: ["Mesa", "Pedidos", "Consumo Total (Gs.)"],
          rows: Array.from(map.entries()).map(([k, v]) => [k, v.count, formatGuaranies(v.total)]),
        };
      }
      case "BY_WAITER": {
        const map = new Map<string, { count: number; total: number }>();
        activeOrders.forEach((o) => {
          const k = o.assignedWaiterName || "Sin Mozo / Retiro en Barra";
          const cur = map.get(k) || { count: 0, total: 0 };
          cur.count += 1;
          cur.total += o.totalCents || 0;
          map.set(k, cur);
        });
        return {
          columns: ["Mozo", "Pedidos Atendidos", "Monto Gestionado (Gs.)"],
          rows: Array.from(map.entries()).map(([k, v]) => [k, v.count, formatGuaranies(v.total)]),
        };
      }
      case "BY_CASHIER": {
        const map = new Map<string, { count: number; total: number }>();
        payments.forEach((p: any) => {
          if (p.status === "APPROVED") {
            const k = p.confirmedByName || "Pasarela Automática QR";
            const cur = map.get(k) || { count: 0, total: 0 };
            cur.count += 1;
            cur.total += p.amountCents || 0;
            map.set(k, cur);
          }
        });
        return {
          columns: ["Cajero / Operador", "Transacciones Aprobadas", "Total Cobrado (Gs.)"],
          rows: Array.from(map.entries()).map(([k, v]) => [k, v.count, formatGuaranies(v.total)]),
        };
      }
      case "BY_BAR": {
        const barItems = activeOrders.flatMap((o) =>
          (o.items || []).filter((i: any) => i.destination === "BAR" || i.destination === "BOTH")
        );
        return {
          columns: ["Producto de Barra", "Cantidad", "Subtotal (Gs.)", "Estado"],
          rows: barItems.map((i: any) => [
            i.productName,
            i.quantity,
            formatGuaranies(i.subtotalCents),
            i.itemStatus,
          ]),
        };
      }
      case "BY_KITCHEN": {
        const kitchenItems = activeOrders.flatMap((o) =>
          (o.items || []).filter(
            (i: any) => i.destination === "KITCHEN" || i.destination === "BOTH"
          )
        );
        return {
          columns: ["Plato de Cocina", "Cantidad", "Subtotal (Gs.)", "Estado"],
          rows: kitchenItems.map((i: any) => [
            i.productName,
            i.quantity,
            formatGuaranies(i.subtotalCents),
            i.itemStatus,
          ]),
        };
      }
      case "TOP_PRODUCTS": {
        const map = new Map<string, { qty: number; rev: number }>();
        activeOrders.forEach((o) => {
          (o.items || []).forEach((i: any) => {
            const cur = map.get(i.productName) || { qty: 0, rev: 0 };
            cur.qty += i.quantity;
            cur.rev += i.subtotalCents || 0;
            map.set(i.productName, cur);
          });
        });
        const sorted = Array.from(map.entries()).sort((a, b) => b[1].qty - a[1].qty);
        return {
          columns: ["Producto", "Unidades Vendidas", "Ingresos Generados (Gs.)"],
          rows: sorted.map(([name, st]) => [name, st.qty, formatGuaranies(st.rev)]),
        };
      }
      case "EXHAUSTED_PRODUCTS": {
        const exhausted = products.filter(
          (p) => p.availabilityStatus !== "AVAILABLE" || !p.active || p.stockQuantity <= 0
        );
        return {
          columns: ["Producto", "Área", "Stock Actual", "Estado"],
          rows: exhausted.map((p) => [
            p.name,
            p.destination,
            p.stockQuantity,
            p.availabilityStatus,
          ]),
        };
      }
      case "CANCELLATIONS": {
        const cancelled = orders.filter((o) => o.status === "CANCELLED");
        return {
          columns: ["N° Pedido", "Mesa", "Importe (Gs.)", "Motivo de Cancelación"],
          rows: cancelled.map((o) => [
            o.orderNumber,
            o.tableLabel || "Barra",
            formatGuaranies(o.totalCents),
            o.cancelReason || "Cancelado por supervisión",
          ]),
        };
      }
      case "DISCOUNTS": {
        const discounted = orders.filter((o) => (o.discountCents || 0) > 0);
        return {
          columns: ["N° Pedido", "Cliente / Mesa", "Descuento Aplicado (Gs.)"],
          rows: discounted.map((o) => [
            o.orderNumber,
            o.tableLabel || o.customerName || "General",
            formatGuaranies(o.discountCents),
          ]),
        };
      }
      case "REFUNDS": {
        const refunded = payments.filter((p: any) => p.status === "REFUNDED");
        return {
          columns: ["ID Transacción", "Pedido", "Importe Reembolsado", "Fecha"],
          rows: refunded.map((r: any) => [
            r.transactionCode,
            r.orderNumber,
            formatGuaranies(r.amountCents),
            new Date(r.createdAt).toLocaleString("es-PY"),
          ]),
        };
      }
      case "PAYMENT_METHODS": {
        const map = new Map<string, { count: number; total: number }>();
        payments.forEach((p: any) => {
          if (p.status === "APPROVED") {
            const label = PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod;
            const cur = map.get(label) || { count: 0, total: 0 };
            cur.count += 1;
            cur.total += p.amountCents || 0;
            map.set(label, cur);
          }
        });
        return {
          columns: ["Medio de Pago", "Operaciones", "Total Recaudado (Gs.)"],
          rows: Array.from(map.entries()).map(([k, v]) => [k, v.count, formatGuaranies(v.total)]),
        };
      }
      case "DEPOSITS": {
        return {
          columns: [
            "Recibo Seña",
            "Cliente",
            "Consumo Estimado",
            "Seña Cobrada",
            "Crédito Disponible",
            "Estado",
          ],
          rows: deposits.map((d) => [
            d.depositCode,
            d.customerName,
            formatGuaranies(d.estimatedConsumptionCents),
            formatGuaranies(d.depositAmountCents),
            formatGuaranies(d.remainingCreditCents),
            d.status,
          ]),
        };
      }
      case "PENDING_INVOICING": {
        return {
          columns: ["ID Único", "Pedido", "Cliente / RUC", "Total (Gs.)", "Estado Fiscal", "Comprobante"],
          rows: pendingSales.map((s) => [
            s.sourceUniqueId,
            s.orderNumber,
            `${s.customerName || "Consumidor Final"} (${s.customerTaxId || "S/N"})`,
            formatGuaranies(s.totalCents),
            INVOICE_STATUS_LABELS[s.invoicingStatus] || s.invoicingStatus,
            s.externalInvoiceNumber || "Pendiente",
          ]),
        };
      }
    }
  };

  const { columns, rows } = computeRows();

  const exportCsv = (extension: "csv" | "xls") => {
    const header = columns.join(extension === "csv" ? "," : "\t");
    const body = rows
      .map((r) =>
        r
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(extension === "csv" ? "," : "\t")
      )
      .join("\n");
    const content = "\uFEFF" + header + "\n" + body;
    const blob = new Blob([content], {
      type:
        extension === "csv"
          ? "text/csv;charset=utf-8;"
          : "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_gastronomico_${activeReport.toLowerCase()}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
            <BarChart3 className="w-6 h-6 text-purple-400" />
            Reportes Gerenciales y Auditoría Gastronómica (16 Vistas)
          </h1>
          <p className="text-sm text-zinc-400">
            Exportación directa en CSV, Excel (.xls) y PDF Imprimible sin duplicar ingresos entre señas y pagos finales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportCsv("csv")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-200"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Exportar CSV
          </button>
          <button
            onClick={() => exportCsv("xls")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-200"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
            Exportar Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs text-white font-semibold"
          >
            <Printer className="w-3.5 h-3.5" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* 16 Report Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={`p-2.5 rounded-xl text-left text-[11px] font-medium border transition ${
              activeReport === tab.id
                ? "bg-purple-600/25 border-purple-500 text-white shadow"
                : "bg-zinc-900/70 border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Data Table */}
      <div className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            {REPORT_TABS.find((t) => t.id === activeReport)?.label}
          </h2>
          <span className="text-xs text-zinc-400">{rows.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase text-zinc-400">
                {columns.map((c, idx) => (
                  <th key={idx} className="py-2.5 px-3">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length || 1} className="py-10 text-center text-zinc-500">
                    Sin movimientos para este reporte en el período seleccionado.
                  </td>
                </tr>
              ) : (
                rows.map((r, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.02]">
                    {r.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-3 text-zinc-200">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
