"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Package, Plus, RefreshCw, Pencil, Wine, ChefHat, Sparkles, CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import { formatGuaranies, GASTRO_AVAILABILITY_LABELS } from "@/lib/gastronomy/format";
import { useRealtime } from "@/hooks/use-realtime";
import { VipSelectModal } from "@/components/ui/VipSelectModal";

export default function GastronomyProductsPage() {
  const [data, setData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Campos del formulario
  const [categoryId, setCategoryId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [presentation, setPresentation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [priceCents, setPriceCents] = useState(25000);
  const [costCents, setCostCents] = useState(10000);
  const [stockQuantity, setStockQuantity] = useState(50);
  const [minStockQuantity, setMinStockQuantity] = useState(10);
  const [unit, setUnit] = useState("UN");
  const [destination, setDestination] = useState<"BAR" | "KITCHEN" | "BOTH">("BAR");
  const [availabilityStatus, setAvailabilityStatus] = useState("AVAILABLE");
  const [optionsText, setOptionsText] = useState(""); // ej: Queso:5000, Panceta:8000
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/v1/gastronomy/bootstrap", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      setData(json);
      if (!categoryId && json.categories?.length > 0) {
        setCategoryId(json.categories[0].id);
      }
    }
  }, [categoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtime({
    eventId: "global",
    onEvent: (type) => {
      if (type.startsWith("GASTRO_")) loadData();
    },
  });

  const openNewProduct = () => {
    setEditingProduct(null);
    setCode(`PRD-0${(data?.products?.length || 14) + 1}`);
    setName("");
    setDescription("");
    setPresentation("Unidad");
    setImageUrl("");
    setPriceCents(25000);
    setCostCents(10000);
    setStockQuantity(50);
    setMinStockQuantity(10);
    setUnit("UN");
    setDestination("BAR");
    setAvailabilityStatus("AVAILABLE");
    setOptionsText("");
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditProduct = (prod: any) => {
    setEditingProduct(prod);
    setCategoryId(prod.categoryId);
    setCode(prod.code);
    setName(prod.name);
    setDescription(prod.description || "");
    setPresentation(prod.presentation || "");
    setImageUrl(prod.imageUrl || "");
    setPriceCents(prod.priceCents);
    setCostCents(prod.costCents);
    setStockQuantity(prod.stockQuantity);
    setMinStockQuantity(prod.minStockQuantity);
    setUnit(prod.unit);
    setDestination(prod.destination);
    setAvailabilityStatus(prod.availabilityStatus);
    try {
      const parsed = prod.optionsJson ? JSON.parse(prod.optionsJson) : [];
      setOptionsText(parsed.map((o: any) => `${o.name}:${o.priceCents}`).join(", "));
    } catch {
      setOptionsText("");
    }
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedOptions = optionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((pair, idx) => {
        const [optName, optPrice] = pair.split(":");
        return {
          id: `opt_${idx}_${optName.toLowerCase().replace(/\s+/g, "_")}`,
          name: optName.trim(),
          priceCents: Number(optPrice) || 0,
        };
      });

    const payload = {
      ...(editingProduct ? { id: editingProduct.id } : {}),
      categoryId,
      code,
      name,
      description,
      presentation,
      imageUrl: imageUrl || undefined,
      priceCents: Number(priceCents),
      costCents: Number(costCents),
      stockQuantity: Number(stockQuantity),
      minStockQuantity: Number(minStockQuantity),
      unit,
      destination,
      availabilityStatus,
      optionsJson: parsedOptions.length > 0 ? JSON.stringify(parsedOptions) : null,
    };

    const res = await fetch("/api/v1/gastronomy/products", {
      method: editingProduct ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      setErrorMsg(json.error?.message || "Error al guardar el producto");
      return;
    }

    setIsModalOpen(false);
    await loadData();
  };

  const products: any[] = data?.products || [];
  const categories: any[] = data?.categories || [];

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-[#0D1930] border border-[#263858] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" />
            <span>Catálogo de Productos Gastronómicos</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Administra productos, precios, costos, presentaciones, opciones adicionales, destino (Barra/Cocina) y disponibilidad.
          </p>
        </div>

        <button
          onClick={openNewProduct}
          className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Tabla de Productos */}
      <div className="p-5 rounded-3xl bg-[#0D1930] border border-[#263858] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#263858] text-slate-400 uppercase text-[10px]">
              <th className="py-2.5 px-3">Código</th>
              <th className="py-2.5 px-3">Producto / Presentación</th>
              <th className="py-2.5 px-3">Categoría</th>
              <th className="py-2.5 px-3">Destino</th>
              <th className="py-2.5 px-3">Precio Venta</th>
              <th className="py-2.5 px-3">Costo</th>
              <th className="py-2.5 px-3">Existencia</th>
              <th className="py-2.5 px-3">Disponibilidad</th>
              <th className="py-2.5 px-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2E4A]">
            {products.map((p) => {
              const av = GASTRO_AVAILABILITY_LABELS[p.availabilityStatus] || {
                label: p.availabilityStatus,
                color: "bg-zinc-800 text-zinc-300",
              };
              return (
                <tr key={p.id} className="hover:bg-[#132342]/60">
                  <td className="py-2.5 px-3 font-mono font-bold text-purple-300">{p.code}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-white block">{p.name}</span>
                    {p.presentation && (
                      <span className="text-[10px] text-slate-400">{p.presentation}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">{p.category?.name}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#080F1F] border border-[#263858] text-slate-300">
                      {p.destination === "BAR"
                        ? "Barra"
                        : p.destination === "KITCHEN"
                        ? "Cocina"
                        : "Ambos"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-300">
                    {formatGuaranies(p.priceCents)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {formatGuaranies(p.costCents)}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <span
                      className={
                        p.stockQuantity <= p.minStockQuantity
                          ? "text-amber-300 font-bold"
                          : "text-white"
                      }
                    >
                      {p.stockQuantity} {p.unit}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Mín: {p.minStockQuantity}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${av.color}`}>
                      {av.label}
                    </span>
                    {p.disabledByName && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Por: {p.disabledByName}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => openEditProduct(p)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#080F1F] hover:bg-purple-950/60 border border-[#263858] text-slate-200 inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Crear / Editar Producto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1930] border border-[#263858] rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">
                {editingProduct ? `Editar Producto: ${editingProduct.name}` : "Nuevo Producto Gastronómico"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Código SKU</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-300 font-semibold block mb-1">Nombre del Producto</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Categoría *</label>
                  <VipSelectModal
                    value={categoryId}
                    onChange={(val) => setCategoryId(val)}
                    options={categories.map((c) => ({
                      value: c.id,
                      label: c.name,
                      badge: c.destination === "BAR" ? "BARRA" : c.destination === "KITCHEN" ? "COCINA" : "MIXTO",
                      icon: Layers,
                    }))}
                    title="Selecciona la Categoría"
                    subtitle="Clasificación del producto en la carta"
                    placeholder="Categoría..."
                    icon={Layers}
                    showSearch={categories.length > 5}
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Presentación</label>
                  <input
                    type="text"
                    value={presentation}
                    onChange={(e) => setPresentation(e.target.value)}
                    placeholder="Ej: 500 ml / Porción"
                    className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Destino Operativo *</label>
                  <VipSelectModal
                    value={destination}
                    onChange={(val) => setDestination(val as any)}
                    options={[
                      {
                        value: "BAR",
                        label: "Barra (Bebidas)",
                        subtitle: "Despacho a monitor de barra",
                        badge: "BARRA",
                        badgeTone: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
                        icon: Wine,
                      },
                      {
                        value: "KITCHEN",
                        label: "Cocina (Comidas)",
                        subtitle: "Despacho a comandas de cocina",
                        badge: "COCINA",
                        badgeTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
                        icon: ChefHat,
                      },
                      {
                        value: "BOTH",
                        label: "Ambos (Mixto)",
                        subtitle: "Requiere parte barra y cocina",
                        badge: "MIXTO",
                        badgeTone: "bg-purple-500/20 text-purple-300 border-purple-500/40",
                        icon: Sparkles,
                      },
                    ]}
                    title="Destino Operativo del Producto"
                    subtitle="Estación KDS donde sonará y se preparará el ítem"
                    placeholder="Destino..."
                    icon={Wine}
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Descripción</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Precio Venta (Gs.)</label>
                  <input
                    type="number"
                    required
                    value={priceCents}
                    onChange={(e) => setPriceCents(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Costo (Gs.)</label>
                  <input
                    type="number"
                    value={costCents}
                    onChange={(e) => setCostCents(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Existencia</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={minStockQuantity}
                    onChange={(e) => setMinStockQuantity(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Estado Disponibilidad *</label>
                  <VipSelectModal
                    value={availabilityStatus}
                    onChange={(val) => setAvailabilityStatus(val)}
                    options={[
                      {
                        value: "AVAILABLE",
                        label: "Disponible",
                        subtitle: "Activo para pedidos de clientes y mozos",
                        badge: "DISPONIBLE",
                        badgeTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
                        icon: CheckCircle2,
                      },
                      {
                        value: "MANUAL_DISABLED",
                        label: "Desactivado manualmente",
                        subtitle: "Oculto deliberadamente por administración",
                        badge: "PAUSADO",
                        badgeTone: "bg-zinc-800 text-zinc-300 border-zinc-700",
                        icon: AlertTriangle,
                      },
                      {
                        value: "AUTO_EXHAUSTED",
                        label: "Agotado automáticamente",
                        subtitle: "Stock llegó a 0 en inventario",
                        badge: "AGOTADO",
                        badgeTone: "bg-rose-500/20 text-rose-300 border-rose-500/40",
                        icon: AlertTriangle,
                      },
                      {
                        value: "MISSING_INGREDIENTS",
                        label: "Sin ingredientes suficientes",
                        subtitle: "Falta insumo crítico en cocina/barra",
                        badge: "SIN INSUMO",
                        badgeTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
                        icon: AlertTriangle,
                      },
                      {
                        value: "TEMPORARILY_UNAVAILABLE",
                        label: "Temporalmente no disponible",
                        subtitle: "Pausa operativa transitoria",
                        badge: "NO DISPONIBLE",
                        badgeTone: "bg-blue-500/20 text-blue-300 border-blue-500/40",
                        icon: AlertTriangle,
                      },
                    ]}
                    title="Estado de Disponibilidad del Producto"
                    subtitle="Controla la visibilidad y venta del producto en tiempo real"
                    placeholder="Disponibilidad..."
                    icon={CheckCircle2}
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Opciones Adicionales (Nombre:Precio, ...)
                  </label>
                  <input
                    type="text"
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                    placeholder="Ej: Queso extra:5000, Panceta:8000"
                    className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
