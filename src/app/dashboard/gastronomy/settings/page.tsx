"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Settings,
  Save,
  Truck,
  ShieldCheck,
  Users,
  CheckCircle2,
} from "lucide-react";
import { VipSelectModal } from "@/components/ui/VipSelectModal";

const ROLE_MATRIX = [
  {
    role: "ADMINISTRADOR",
    desc: "Control total de precios, descuentos, configuración, facturación ERP y excepciones.",
  },
  {
    role: "GERENTE",
    desc: "Gestión de catálogo, mesas, inventario, reportes, señas y supervisión de salón.",
  },
  {
    role: "CAJERO",
    desc: "Apertura/cierre de caja, cobro en efectivo/tarjeta/QR, señas y bandeja de facturación.",
  },
  {
    role: "ENCARGADO_BARRA",
    desc: "Panel de barra, cambio de modalidad (Retiro en Barra / Entrega por Mozo) y control de stock.",
  },
  {
    role: "OPERADOR_BARRA",
    desc: "Preparación de bebidas y actualización de disponibilidad sin modificar precios.",
  },
  {
    role: "ENCARGADO_COCINA",
    desc: "Panel KDS de cocina, control de ingredientes/recetas y solicitud obligatoria de mozo.",
  },
  {
    role: "COCINERO",
    desc: "Preparación de comandas gastronómicas y aviso de plato listo.",
  },
  {
    role: "MOZO",
    desc: "Aceptación atómica de pedidos listos de barra/cocina y confirmación de entrega en mesa.",
  },
  {
    role: "AUDITOR",
    desc: "Acceso de solo lectura a reportes gerenciales, kardex, historial y trazabilidad fiscal.",
  },
];

export default function GastronomySettingsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [barPickupEnabled, setBarPickupEnabled] = useState(true);
  const [waiterDeliveryEnabled, setWaiterDeliveryEnabled] = useState(true);
  const [defaultDeliveryMode, setDefaultDeliveryMode] = useState("WAITER_DELIVERY");
  const [serviceFeeCents, setServiceFeeCents] = useState("0");
  const [allowKitchenDirectDeliveryException, setAllowKitchenDirectDeliveryException] =
    useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/gastronomy/bootstrap", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.deliveryConfig) {
          setBarPickupEnabled(Boolean(json.deliveryConfig.barPickupEnabled));
          setWaiterDeliveryEnabled(Boolean(json.deliveryConfig.waiterDeliveryEnabled));
          setDefaultDeliveryMode(
            json.deliveryConfig.defaultDeliveryMode || "WAITER_DELIVERY"
          );
          setServiceFeeCents(String(json.deliveryConfig.serviceFeeCents || 0));
          setAllowKitchenDirectDeliveryException(
            Boolean(json.deliveryConfig.allowKitchenDirectDeliveryException)
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveDeliveryConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSavedMsg(null);
    try {
      const res = await fetch("/api/v1/gastronomy/delivery-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barPickupEnabled,
          waiterDeliveryEnabled,
          defaultDeliveryMode,
          serviceFeeCents: Number(serviceFeeCents) || 0,
          allowKitchenDirectDeliveryException,
        }),
      });
      if (res.ok) {
        setSavedMsg(
          "Configuración operativa guardada y sincronizada en tiempo real con la PWA del cliente."
        );
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-purple-400" />
          Configuración General del Sistema Gastronómico
        </h1>
        <p className="text-sm text-zinc-400">
          Modalidades de entrega (Fase 3), reglas de cocina (Fase 5), integración fiscal ERP (Fase 12) y matriz RBAC (Fase 15).
        </p>
      </div>

      {savedMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {savedMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery & Operational Rules */}
        <form
          onSubmit={handleSaveDeliveryConfig}
          className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-4"
        >
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-purple-400" />
            Modalidades de Entrega y Reglas Operativas
          </h2>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-white/10 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-white">Opción 1: Retiro en Barra</div>
                <div className="text-[11px] text-zinc-400">
                  El cliente recibe notificación en su celular cuando la bebida está lista para retirar.
                </div>
              </div>
              <input
                type="checkbox"
                checked={barPickupEnabled}
                onChange={(e) => setBarPickupEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-white/10 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-white">Opción 2: Entrega por Mozo en Mesa</div>
                <div className="text-[11px] text-zinc-400">
                  Barra y Cocina notifican al Panel de Mozos para llevar el pedido a la mesa.
                </div>
              </div>
              <input
                type="checkbox"
                checked={waiterDeliveryEnabled}
                onChange={(e) => setWaiterDeliveryEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Modalidad Predeterminada</label>
                <VipSelectModal
                  value={defaultDeliveryMode}
                  onChange={(val) => setDefaultDeliveryMode(val)}
                  options={[
                    {
                      value: "WAITER_DELIVERY",
                      label: "Entrega por Mozo en Mesa",
                      subtitle: "El mozo recoge la comanda de barra/cocina y la sirve en la mesa",
                      badge: "MOZO",
                      badgeTone: "bg-purple-500/20 text-purple-300 border-purple-500/40",
                      icon: Truck,
                    },
                    {
                      value: "BAR_PICKUP",
                      label: "Retiro en Barra por el Cliente",
                      subtitle: "El cliente se acerca al mostrador de barra para retirar su pedido",
                      badge: "RETIRO",
                      badgeTone: "bg-blue-500/20 text-blue-300 border-blue-500/40",
                      icon: Truck,
                    },
                  ]}
                  title="Modalidad Predeterminada"
                  subtitle="Configura cómo se entregan los pedidos gastronómicos por defecto"
                  placeholder="Modalidad predeterminada..."
                  icon={Truck}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">
                  Costo de Servicio / Entrega a Mesa (Gs.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={serviceFeeCents}
                  onChange={(e) => setServiceFeeCents(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
                />
              </div>
            </div>

            <label className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-amber-300">
                  Excepción de Administrador: Permitir a Cocina cerrar entrega sin Mozo
                </div>
                <div className="text-[11px] text-amber-200/70">
                  Por defecto desactivado (Fase 5): Cocina siempre requiere intervención de un mozo registrado.
                </div>
              </div>
              <input
                type="checkbox"
                checked={allowKitchenDirectDeliveryException}
                onChange={(e) => setAllowKitchenDirectDeliveryException(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar Configuración Operativa
          </button>
        </form>

        {/* RBAC Matrix */}
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Perfiles y Permisos RBAC Habilitados (Fase 15)
          </h2>
          <div className="space-y-2">
            {ROLE_MATRIX.map((r) => (
              <div
                key={r.role}
                className="p-2.5 rounded-xl bg-zinc-950 border border-white/5 flex items-start justify-between gap-3"
              >
                <div>
                  <span className="text-xs font-mono font-bold text-purple-300">{r.role}</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{r.desc}</p>
                </div>
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
