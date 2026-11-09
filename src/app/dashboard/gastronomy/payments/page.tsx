"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { formatGuaranies, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/gastronomy/format";

export default function GastronomyDigitalPaymentsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [qrProvider, setQrProvider] = useState("BANCARD_QR_PY");
  const [generatedQr, setGeneratedQr] = useState<any>(null);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/gastronomy/bootstrap", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const es = new EventSource("/api/v1/realtime");
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload.type?.startsWith("GASTRO_")) loadData();
      } catch {
        // ignore
      }
    };
    return () => es.close();
  }, [loadData]);

  const handleGenerateQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    setSubmitting(true);
    setWebhookStatus(null);
    try {
      const res = await fetch("/api/v1/gastronomy/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GENERATE_QR_PAYMENT",
          orderId: selectedOrderId,
          paymentMethod: qrProvider === "PIX_BRASIL_GATEWAY" ? "PIX" : "QR_PAYMENT",
          provider: qrProvider,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setGeneratedQr(json);
        await loadData();
      } else {
        setWebhookStatus(json.error?.message || "Error al generar QR");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulateSignedWebhook = async (payment: any) => {
    setSubmitting(true);
    setWebhookStatus(null);
    try {
      const res = await fetch("/api/v1/gastronomy/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "WEBHOOK_QR_CONFIRMATION",
          paymentId: payment.id,
          webhookSignature: payment.webhookSignature,
          providerReference: `HOOK-${Date.now().toString().slice(-6)}`,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setWebhookStatus(
          `Webhook firmado HMAC-SHA256 validado exitosamente para ${payment.transactionCode}`
        );
        await loadData();
      } else {
        setWebhookStatus(json.error?.message || "Firma rechazada");
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

  const orders = data?.orders || [];
  const unpaidOrders = orders.filter(
    (o: any) => o.paymentStatus !== "APPROVED" && o.status !== "CANCELLED"
  );
  const allPayments = data?.payments || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <QrCode className="w-6 h-6 text-purple-400" />
            Pagos Digitales, QR Interoperable, Transferencias y PIX
          </h1>
          <p className="text-sm text-zinc-400">
            Generación de QR dinámico por pedido y validación estricta por Webhook firmado (HMAC-SHA256). Nunca se confirma por captura de pantalla.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-300"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </button>
      </div>

      {webhookStatus && (
        <div className="p-3.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-sm text-purple-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            {webhookStatus}
          </span>
          <button onClick={() => setWebhookStatus(null)} className="text-xs underline">
            Cerrar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generator Card */}
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-purple-400" />
            Generar QR Asociado a Pedido
          </h2>
          <form onSubmit={handleGenerateQr} className="space-y-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Seleccionar Pedido Pendiente</label>
              <select
                required
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
              >
                <option value="">-- Elegir pedido --</option>
                {unpaidOrders.map((o: any) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} — {o.tableLabel || "Barra"} (
                    {formatGuaranies(Math.max(0, (o.totalCents || 0) - (o.paidAmountCents || 0)))}
                    )
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Proveedor / Red Interoperable</label>
              <select
                value={qrProvider}
                onChange={(e) => setQrProvider(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
              >
                <option value="BANCARD_QR_PY">QR Interoperable Local (Bancard / Infonet PY)</option>
                <option value="SIPAP_SPI_TRANSFER">Transferencia Bancaria SIPAP / SPI</option>
                <option value="PIX_BRASIL_GATEWAY">PIX Instantáneo (Turistas / Frontera)</option>
                <option value="PAGOPAR_GATEWAY">Pasarela Pagopar / Dinelco</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting || !selectedOrderId}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Generar Payload QR Único
            </button>
          </form>

          {generatedQr?.payment && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-purple-500/30 space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-purple-300">
                  {generatedQr.payment.transactionCode}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                  ESPERANDO WEBHOOK
                </span>
              </div>
              {generatedQr.qrDataUrl && (
                <div className="flex justify-center p-2 bg-white rounded-xl">
                  <img src={generatedQr.qrDataUrl} alt="QR Pago" className="w-36 h-36" />
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Importe:</span>
                <span className="font-bold text-white">
                  {formatGuaranies(generatedQr.payment.amountCents)}
                </span>
              </div>
              <button
                onClick={() => handleSimulateSignedWebhook(generatedQr.payment)}
                className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                Confirmar vía Webhook Firmado (HMAC)
              </button>
            </div>
          )}
        </div>

        {/* Transactions Table */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              Registro de Transacciones y Estado de Webhooks ({allPayments.length})
            </h2>
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              PCI-DSS Safe (Sin PAN ni CVV)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase text-zinc-400">
                  <th className="py-2.5 px-3">ID Único</th>
                  <th className="py-2.5 px-3">Pedido</th>
                  <th className="py-2.5 px-3">Método / Proveedor</th>
                  <th className="py-2.5 px-3">Importe</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Verificación</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {allPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500">
                      No hay transacciones registradas todavía.
                    </td>
                  </tr>
                ) : (
                  allPayments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-mono text-zinc-300">{p.transactionCode}</td>
                      <td className="py-2.5 px-3 font-semibold text-white">{p.orderNumber}</td>
                      <td className="py-2.5 px-3">
                        <div className="text-zinc-200">
                          {PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                        </div>
                        <div className="text-[10px] text-zinc-500">{p.provider || "CAJA_LOCAL"}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-400">
                        {formatGuaranies(p.amountCents)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            p.status === "APPROVED"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : p.status === "REJECTED" || p.status === "REFUNDED"
                              ? "bg-red-500/15 text-red-400 border border-red-500/30"
                              : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {PAYMENT_STATUS_LABELS[p.status] || p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {p.webhookVerified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Webhook HMAC OK
                          </span>
                        ) : p.status === "APPROVED" ? (
                          <span className="text-zinc-400 text-[11px]">Cajero Autorizado</span>
                        ) : (
                          <span className="text-amber-400 text-[11px]">Pendiente Firma</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {p.status !== "APPROVED" && p.webhookSignature && (
                          <button
                            onClick={() => handleSimulateSignedWebhook(p)}
                            className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 text-[11px]"
                          >
                            Validar Webhook
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
