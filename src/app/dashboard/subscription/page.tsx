"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Building2,
  QrCode,
  CalendarCheck2,
  Sparkles,
  ArrowRight,
  Download,
  ShieldCheck,
  RefreshCw,
  Zap,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PlanItem {
  id: string;
  name: string;
  code: "PERSONAL" | "STARTER" | "PRO" | "ENTERPRISE";
  priceCents: number;
  currency: string;
  interval: string;
  maxVenues: number;
  maxTables: number;
  maxEvents: number;
  features: string[];
  isCurrent: boolean;
}

interface QuotaItem {
  allowed: boolean;
  resource: string;
  current: number;
  max: number;
  planName: string;
  planCode: string;
}

interface BillingData {
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    plan: {
      id: string;
      name: string;
      code: string;
      priceCents: number;
      currency: string;
      interval: string;
      features: string[];
    };
  } | null;
  quotas: {
    venues: QuotaItem;
    tables: QuotaItem;
    events: QuotaItem;
  };
  availablePlans: PlanItem[];
  invoices: Array<{
    id: string;
    date: string;
    amountCents: number;
    currency: string;
    status: string;
    planName: string;
  }>;
}

export default function SubscriptionPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchBilling = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/billing");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error("Error al cargar facturación:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const handleChangePlan = async (planCode: string) => {
    if (!confirm(`¿Confirmas el cambio al plan ${planCode}? Se actualizarán los límites de tu establecimiento de inmediato.`)) {
      return;
    }

    setChangingPlan(planCode);
    try {
      const res = await fetch("/api/v1/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Error al cambiar de plan");
      }

      setFeedback({ type: "success", text: json.message });
      setTimeout(() => setFeedback(null), 4000);
      await fetchBilling();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: "error", text: err.message });
      } else {
        setFeedback({ type: "error", text: "Error inesperado al cambiar de plan" });
      }
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setChangingPlan(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-16 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
        <span className="text-xs">Cargando estado de suscripción y límites de cuota...</span>
      </div>
    );
  }

  if (!data) return null;

  const currentPlan = data.subscription?.plan;
  const quotas = data.quotas;

  const calculatePercent = (current: number, max: number) => {
    if (!max || max === 0) return 0;
    return Math.min(Math.round((current / max) * 100), 100);
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-amber-500";
    return "bg-gradient-to-r from-purple-500 to-indigo-500";
  };

  return (
    <div className="space-y-8">
      {/* 1. Header & Feedback */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SUSCRIPCIÓN ACTIVA
            </span>
            <span className="text-xs text-zinc-400">
              Próxima renovación:{" "}
              <strong className="text-zinc-300">
                {data.subscription?.currentPeriodEnd
                  ? formatDate(data.subscription.currentPeriodEnd)
                  : "N/A"}
              </strong>
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Suscripción, Planes y Límites de Cuota
          </h1>
          <p className="text-xs text-zinc-400">
            Administra el plan de tu establecimiento, monitorea el consumo de cuotas y actualiza tu cobertura.
          </p>
        </div>

        {feedback && (
          <div
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-950/90 text-emerald-200 border-emerald-700"
                : "bg-red-950/90 text-red-200 border-red-700"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}
      </div>

      {/* 2. Medidores de Capacidad y Cuotas de Recursos */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
          Consumo de Cuotas del Plan Actual ({currentPlan?.name})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cuota: Locales */}
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-300 font-bold">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>Locales Físicos (Venues)</span>
              </div>
              <span className="font-mono text-zinc-400 font-bold">
                {quotas.venues.current} / {quotas.venues.max}
              </span>
            </div>

            <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(
                  calculatePercent(quotas.venues.current, quotas.venues.max)
                )}`}
                style={{
                  width: `${calculatePercent(quotas.venues.current, quotas.venues.max)}%`,
                }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>Capacidad utilizada</span>
              <span>{calculatePercent(quotas.venues.current, quotas.venues.max)}%</span>
            </div>
          </div>

          {/* Cuota: Mesas con QR */}
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-300 font-bold">
                <QrCode className="w-4 h-4 text-cyan-400" />
                <span>Mesas con Código QR</span>
              </div>
              <span className="font-mono text-zinc-400 font-bold">
                {quotas.tables.current} / {quotas.tables.max}
              </span>
            </div>

            <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(
                  calculatePercent(quotas.tables.current, quotas.tables.max)
                )}`}
                style={{
                  width: `${calculatePercent(quotas.tables.current, quotas.tables.max)}%`,
                }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>Capacidad utilizada</span>
              <span>{calculatePercent(quotas.tables.current, quotas.tables.max)}%</span>
            </div>
          </div>

          {/* Cuota: Eventos Mensuales */}
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-300 font-bold">
                <CalendarCheck2 className="w-4 h-4 text-indigo-400" />
                <span>Eventos Activos del Mes</span>
              </div>
              <span className="font-mono text-zinc-400 font-bold">
                {quotas.events.current} / {quotas.events.max}
              </span>
            </div>

            <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(
                  calculatePercent(quotas.events.current, quotas.events.max)
                )}`}
                style={{
                  width: `${calculatePercent(quotas.events.current, quotas.events.max)}%`,
                }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>Capacidad utilizada</span>
              <span>{calculatePercent(quotas.events.current, quotas.events.max)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Comparador y Selector de Planes Comerciales */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Planes Comerciales Disponibles</h2>
            <p className="text-xs text-zinc-400">
              Mejora o ajusta tu plan según la escala de tu establecimiento.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
            Facturación Mensual
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {data.availablePlans.map((plan) => {
            const isCurrent = plan.isCurrent;
            const isPopular = plan.code === "PRO";
            const isPersonal = plan.code === "PERSONAL";
            const isLoading = changingPlan === plan.code;

            return (
              <div
                key={plan.id}
                className={`p-5 rounded-2xl flex flex-col justify-between space-y-5 transition-all relative ${
                  isCurrent
                    ? "bg-gradient-to-b from-purple-950/40 via-zinc-900 to-zinc-900 border-2 border-purple-500 shadow-xl"
                    : isPersonal
                    ? "bg-zinc-900/90 border-2 border-pink-500/40 hover:border-pink-500/70 shadow-lg"
                    : isPopular
                    ? "bg-zinc-900/90 border-2 border-purple-500/30 hover:border-purple-500/60 shadow-lg"
                    : "bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700"
                }`}
              >
                {/* Badge de Plan Actual, Personal o Popular */}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md whitespace-nowrap">
                    Tu Plan Actual
                  </div>
                )}
                {!isCurrent && isPersonal && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-pink-600 to-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md whitespace-nowrap">
                    🎉 Fiestas & Amigos
                  </div>
                )}
                {!isCurrent && isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md whitespace-nowrap">
                    Más Popular
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-black text-white">
                        {formatCurrency(plan.priceCents, plan.currency)}
                      </span>
                      <span className="text-xs text-zinc-400 font-medium">/ mes</span>
                    </div>
                  </div>

                  {/* Resumen de Límites Clave */}
                  <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1.5 text-xs">
                    <div className="flex justify-between text-zinc-300">
                      <span className="text-zinc-400">Sedes físicas:</span>
                      <strong className="text-white">Hasta {plan.maxVenues} local(es)</strong>
                    </div>
                    <div className="flex justify-between text-zinc-300">
                      <span className="text-zinc-400">Mesas con QR:</span>
                      <strong className="text-white">Hasta {plan.maxTables} mesas</strong>
                    </div>
                    <div className="flex justify-between text-zinc-300">
                      <span className="text-zinc-400">Eventos mensuales:</span>
                      <strong className="text-white">Hasta {plan.maxEvents} eventos</strong>
                    </div>
                  </div>

                  {/* Lista de Características */}
                  <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Incluye:
                    </span>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botón de Acción */}
                <div className="pt-4 border-t border-zinc-800">
                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 text-xs font-bold text-center">
                      Plan Vigente
                    </div>
                  ) : (
                    <button
                      onClick={() => handleChangePlan(plan.code)}
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Actualizando...</span>
                        </>
                      ) : (
                        <>
                          <span>Cambiar a {plan.name}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Historial de Pagos y Recibos */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Historial de Facturación y Recibos</h2>
          </div>
          <span className="text-xs text-zinc-400">Comprobantes descargables</span>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {data.invoices.map((inv) => (
            <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-white">{inv.id}</span>
                <span className="text-zinc-400">{inv.planName}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {inv.status === "PAID" ? "Pagado" : inv.status}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-zinc-400">{formatDate(inv.date)}</span>
                <span className="font-mono font-bold text-white">
                  {formatCurrency(inv.amountCents, inv.currency)}
                </span>
                <button
                  onClick={() => alert(`Descargando comprobante oficial ${inv.id}...`)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Descargar PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
