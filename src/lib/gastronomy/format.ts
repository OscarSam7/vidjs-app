export function formatGuaranies(amount: number, currency = "PYG"): string {
  if (currency === "USD") {
    return `$ ${(amount / 100).toLocaleString("es-PY", { minimumFractionDigits: 2 })}`;
  }
  return `Gs. ${Math.round(amount).toLocaleString("es-PY")}`;
}

export const GASTRO_ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: "Pedido recibido", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  PENDING_PAYMENT: { label: "Pendiente de pago", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  PAYMENT_CONFIRMED: { label: "Pago confirmado", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  PREPARING: { label: "En preparación", color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  READY: { label: "Preparado", color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  WAITING_PICKUP: { label: "Esperando retiro", color: "bg-teal-500/15 text-teal-300 border-teal-500/30" },
  WAITING_WAITER: { label: "Esperando mozo", color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  REQUESTING_WAITER: { label: "Solicitando mozo", color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  DELIVERED: { label: "Entregado", color: "bg-emerald-600/20 text-emerald-200 border-emerald-500/40" },
  CANCELLED: { label: "Cancelado", color: "bg-red-500/15 text-red-300 border-red-500/30" },
};

export const GASTRO_AVAILABILITY_LABELS: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: "Disponible", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  MANUAL_DISABLED: { label: "Desactivado manualmente", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  AUTO_EXHAUSTED: { label: "Agotado automáticamente", color: "bg-red-500/15 text-red-300 border-red-500/30" },
  MISSING_INGREDIENTS: { label: "Sin ingredientes suficientes", color: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  TEMPORARILY_UNAVAILABLE: { label: "Temporalmente no disponible", color: "bg-zinc-700/40 text-zinc-300 border-zinc-600" },
};

export const GASTRO_PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  PROCESSING: { label: "En proceso", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  APPROVED: { label: "Aprobado", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  REJECTED: { label: "Rechazado", color: "bg-red-500/15 text-red-300 border-red-500/30" },
  EXPIRED: { label: "Vencido", color: "bg-zinc-700/40 text-zinc-400 border-zinc-600" },
  REFUNDED: { label: "Reembolsado", color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  PARTIALLY_PAID: { label: "Parcialmente pagado", color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
};

export const GASTRO_PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  DEBIT_CARD: "Tarjeta de débito",
  CREDIT_CARD: "Tarjeta de crédito",
  BANK_TRANSFER: "Transferencia bancaria",
  QR_PAYMENT: "QR de pago",
  PIX: "PIX",
  DEPOSIT_APPLICATION: "Pago mediante seña",
  PARTIAL: "Pago parcial",
  FULL: "Pago total",
};

export const GASTRO_INVOICING_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING_INVOICING: { label: "Pendiente de facturación", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  SENT_TO_MAIN_SYSTEM: { label: "Enviado al sistema principal", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  INVOICED: { label: "Facturado", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  INTEGRATION_ERROR: { label: "Error de integración", color: "bg-red-500/15 text-red-300 border-red-500/30" },
  VOIDED: { label: "Anulado", color: "bg-zinc-700/40 text-zinc-400 border-zinc-600" },
};

export const GASTRO_TABLE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: "Disponible", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  OCCUPIED: { label: "Ocupada", color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  RESERVED: { label: "Reservada", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  PENDING_PAYMENT: { label: "Pendiente de pago", color: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  CLEANING: { label: "En limpieza", color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  BLOCKED: { label: "Bloqueada", color: "bg-zinc-700/40 text-zinc-400 border-zinc-600" },
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Pedido recibido",
  PENDING_PAYMENT: "Pendiente de pago",
  PAYMENT_CONFIRMED: "Pago confirmado",
  PREPARING: "En preparación",
  READY: "Preparado",
  WAITING_PICKUP: "Esperando retiro",
  WAITING_WAITER: "Esperando mozo",
  REQUESTING_WAITER: "Solicitando mozo",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PROCESSING: "En proceso",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  EXPIRED: "Vencido",
  REFUNDED: "Reembolsado",
  PARTIALLY_PAID: "Parcialmente pagado",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = GASTRO_PAYMENT_METHOD_LABELS;

export const DELIVERY_MODE_LABELS: Record<string, string> = {
  BAR_PICKUP: "Retiro en barra",
  WAITER_DELIVERY: "Entrega por mozo",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  PENDING_INVOICE: "Pendiente de facturación",
  PENDING_INVOICING: "Pendiente de facturación",
  SENT_TO_INVOICING: "Enviado al sistema principal",
  SENT_TO_MAIN_SYSTEM: "Enviado al sistema principal",
  INVOICED: "Facturado",
  INTEGRATION_ERROR: "Error de integración",
  VOIDED: "Anulado",
};

