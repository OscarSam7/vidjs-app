"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  ExternalLink,
  QrCode,
  Sparkles,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
} from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import { formatGuaranies, GASTRO_AVAILABILITY_LABELS } from "@/lib/gastronomy/format";

export default function GastronomyDigitalMenuPage() {
  const [data, setData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/v1/gastronomy/bootstrap", { cache: "no-store" });
    if (res.ok) {
      setData(await res.json());
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

  const categories: any[] = data?.categories || [];
  const products: any[] = data?.products || [];
  const deliveryConfig = data?.deliveryConfig;

  const filteredProducts = products.filter(
    (p) => selectedCategory === "ALL" || p.categoryId === selectedCategory
  );

  const handleToggleAvailability = async (product: any) => {
    const nextStatus =
      product.availabilityStatus === "AVAILABLE" ? "MANUAL_DISABLED" : "AVAILABLE";
    await fetch("/api/v1/gastronomy/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: product.id,
        availabilityStatus: nextStatus,
        active: nextStatus === "AVAILABLE",
      }),
    });
    await loadData();
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-[#0D1930] border border-[#263858] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <span>Menú Digital & Sincronización QR</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Vista previa en tiempo real del menú digital que ven los clientes en sus celulares y tablets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                navigator.clipboard.writeText(`${window.location.origin}/menu`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-xs font-bold text-slate-200 flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Enlace Copiado" : "Copiar Link Menú"}</span>
          </button>

          <Link
            href="/menu"
            target="_blank"
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
          >
            <QrCode className="w-4 h-4" />
            <span>Abrir PWA del Cliente</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Estado de Modalidades de Entrega */}
      {deliveryConfig && (
        <div className="p-4 rounded-2xl bg-[#0D1930] border border-[#263858] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <span className="font-bold text-slate-300">Modalidades habilitadas para el cliente:</span>
            <span
              className={`px-2.5 py-1 rounded-full font-bold border ${
                deliveryConfig.barPickupEnabled
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-zinc-800 text-zinc-500 border-zinc-700"
              }`}
            >
              Retiro en Barra: {deliveryConfig.barPickupEnabled ? "ACTIVO" : "DESACTIVADO"}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full font-bold border ${
                deliveryConfig.waiterDeliveryEnabled
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-zinc-800 text-zinc-500 border-zinc-700"
              }`}
            >
              Entrega por Mozo: {deliveryConfig.waiterDeliveryEnabled ? "ACTIVO" : "DESACTIVADO"}
            </span>
          </div>
          <Link
            href="/dashboard/gastronomy/settings"
            className="text-purple-400 hover:text-purple-300 font-bold"
          >
            Configurar Entrega →
          </Link>
        </div>
      )}

      {/* Pestañas de Categorías */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory("ALL")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
            selectedCategory === "ALL"
              ? "bg-purple-600 text-white"
              : "bg-[#0D1930] text-slate-300 border border-[#263858]"
          }`}
        >
          Todas las categorías ({products.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
              selectedCategory === cat.id
                ? "bg-purple-600 text-white"
                : "bg-[#0D1930] text-slate-300 border border-[#263858]"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grilla Visual del Menú */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((p) => {
          const av = GASTRO_AVAILABILITY_LABELS[p.availabilityStatus] || {
            label: p.availabilityStatus,
            color: "bg-zinc-800 text-zinc-300",
          };
          const isVisibleToClient =
            p.active && p.availabilityStatus === "AVAILABLE" && (!p.trackInventory || p.stockQuantity > 0);
          const opts = p.optionsJson ? JSON.parse(p.optionsJson) : [];

          return (
            <div
              key={p.id}
              className={`rounded-3xl bg-[#0D1930] border overflow-hidden flex flex-col justify-between transition-all ${
                isVisibleToClient
                  ? "border-[#263858] hover:border-purple-500/40"
                  : "border-red-900/40 opacity-75"
              }`}
            >
              <div>
                {p.imageUrl && (
                  <div className="h-40 w-full bg-[#080F1F] relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/80 text-purple-300 border border-purple-500/30">
                        {p.code}
                      </span>
                      {p.isFeatured && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-black flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Destacado
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white leading-snug">{p.name}</h3>
                    <span className="font-mono text-sm font-black text-emerald-300 shrink-0">
                      {formatGuaranies(p.priceCents)}
                    </span>
                  </div>

                  {p.presentation && (
                    <span className="text-[11px] text-purple-300 font-semibold block">
                      Presentación: {p.presentation}
                    </span>
                  )}

                  {p.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">{p.description}</p>
                  )}

                  {opts.length > 0 && (
                    <div className="text-[10px] text-cyan-300 bg-[#080F1F] p-2 rounded-xl border border-[#1E2E4A]">
                      Adicionales: {opts.map((o: any) => `${o.name} (+${formatGuaranies(o.priceCents)})`).join(", ")}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`px-2 py-0.5 rounded-full border font-bold ${av.color}`}>
                    {av.label}
                  </span>
                  <span className="text-slate-400 font-mono">
                    Stock: {p.stockQuantity} {p.unit}
                  </span>
                </div>

                <button
                  onClick={() => handleToggleAvailability(p)}
                  className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isVisibleToClient
                      ? "bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/50"
                      : "bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-700/50"
                  }`}
                >
                  {isVisibleToClient ? (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Ocultar del Menú Digital</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Habilitar en Menú Digital</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
