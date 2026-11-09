"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Boxes,
  Plus,
  RefreshCw,
  AlertTriangle,
  ArrowUpCircle,
  Utensils,
  Layers,
} from "lucide-react";
import { formatGuaranies } from "@/lib/gastronomy/format";
import { useRealtime } from "@/hooks/use-realtime";

export default function GastronomyInventoryPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New item state
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newUnit, setNewUnit] = useState("UN");
  const [newStock, setNewStock] = useState("50");
  const [newMinStock, setNewMinStock] = useState("10");
  const [newCost, setNewCost] = useState("5000");

  // Restock state
  const [restockItemId, setRestockItemId] = useState("");
  const [restockQty, setRestockQty] = useState("25");
  const [restockReason, setRestockReason] = useState("Compra / Reposición de turno");

  // Recipe link state
  const [recipeProductId, setRecipeProductId] = useState("");
  const [recipeItemId, setRecipeItemId] = useState("");
  const [recipeQty, setRecipeQty] = useState("1");

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

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/gastronomy/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_INVENTORY_ITEM",
          name: newName,
          code: newCode || `INS-${Date.now().toString().slice(-4)}`,
          unit: newUnit,
          currentStock: Number(newStock),
          minStock: Number(newMinStock),
          costPerUnitCents: Number(newCost),
        }),
      });
      if (res.ok) {
        setNewName("");
        setNewCode("");
        setFeedback("Insumo creado correctamente.");
        await loadData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItemId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/gastronomy/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESTOCK_INVENTORY_ITEM",
          inventoryItemId: restockItemId,
          quantityDelta: Number(restockQty),
          reason: restockReason,
        }),
      });
      if (res.ok) {
        setFeedback("Reposición registrada y productos con receta verificados.");
        await loadData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLinkRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeProductId || !recipeItemId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/gastronomy/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_RECIPE_ITEM",
          productId: recipeProductId,
          inventoryItemId: recipeItemId,
          quantityRequired: Number(recipeQty),
        }),
      });
      if (res.ok) {
        setFeedback("Ingrediente vinculado a la receta del producto.");
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

  const inventoryItems = data?.inventoryItems || [];
  const products = data?.products || [];
  const lowStockItems = inventoryItems.filter((i: any) => i.currentStock <= i.minStock);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-emerald-400" />
            Control de Inventario, Insumos y Recetas
          </h1>
          <p className="text-sm text-zinc-400">
            Descuento automático por unidad o por receta (ej. Hamburguesa descuenta Pan, Carne, Queso, Panceta y Verduras).
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-300"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sincronizar
        </button>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="underline">
            Cerrar
          </button>
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-amber-300">
                Alerta de Stock Mínimo ({lowStockItems.length} insumos críticos)
              </h3>
              <p className="text-xs text-amber-200/80">
                {lowStockItems.map((i: any) => `${i.name} (${i.currentStock} ${i.unit})`).join(" • ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Forms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Create Insumo */}
        <form
          onSubmit={handleCreateItem}
          className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-3"
        >
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            Registrar Nuevo Insumo
          </h2>
          <input
            required
            placeholder="Nombre (ej. Pan Brioche, Carne 180g)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Código SKU (opcional)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
            />
            <select
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
            >
              <option value="UN">Unidad</option>
              <option value="PORCION">Porción</option>
              <option value="FETA">Feta</option>
              <option value="ML">Mililitros (ml)</option>
              <option value="GR">Gramos (gr)</option>
              <option value="BOTELLA">Botella</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-zinc-400">Stock Inicial</label>
              <input
                type="number"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-white/10 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400">Mínimo Alerta</label>
              <input
                type="number"
                value={newMinStock}
                onChange={(e) => setNewMinStock(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-white/10 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400">Costo Gs.</label>
              <input
                type="number"
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-white/10 text-xs text-white"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
          >
            Guardar Insumo
          </button>
        </form>

        {/* Restock */}
        <form
          onSubmit={handleRestock}
          className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-3"
        >
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-blue-400" />
            Reposición de Stock (Kardex Entrada)
          </h2>
          <select
            required
            value={restockItemId}
            onChange={(e) => setRestockItemId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
          >
            <option value="">-- Seleccionar insumo --</option>
            {inventoryItems.map((item: any) => (
              <option key={item.id} value={item.id}>
                {item.name} (Actual: {item.currentStock} {item.unit})
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              required
              min="1"
              placeholder="Cantidad a sumar"
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
            />
            <input
              placeholder="Motivo / Factura compra"
              value={restockReason}
              onChange={(e) => setRestockReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !restockItemId}
            className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold"
          >
            Registrar Entrada y Reactivar Menú
          </button>
        </form>

        {/* Link Recipe */}
        <form
          onSubmit={handleLinkRecipe}
          className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-3"
        >
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Utensils className="w-4 h-4 text-purple-400" />
            Vincular Ingrediente a Receta
          </h2>
          <select
            required
            value={recipeProductId}
            onChange={(e) => setRecipeProductId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
          >
            <option value="">-- Producto del Menú --</option>
            {products.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <select
              required
              value={recipeItemId}
              onChange={(e) => setRecipeItemId(e.target.value)}
              className="col-span-2 w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
            >
              <option value="">-- Insumo --</option>
              {inventoryItems.map((i: any) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.unit})
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={recipeQty}
              onChange={(e) => setRecipeQty(e.target.value)}
              placeholder="Cant."
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !recipeProductId || !recipeItemId}
            className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold"
          >
            Asociar a Receta
          </button>
        </form>
      </div>

      {/* Inventory Table */}
      <div className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-4">
        <h2 className="text-base font-semibold text-white">
          Existencias de Insumos ({inventoryItems.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase text-zinc-400">
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Insumo</th>
                <th className="py-2.5 px-3">Stock Actual</th>
                <th className="py-2.5 px-3">Stock Mínimo</th>
                <th className="py-2.5 px-3">Costo Unitario</th>
                <th className="py-2.5 px-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {inventoryItems.map((item: any) => {
                const isExhausted = item.currentStock <= 0;
                const isLow = item.currentStock <= item.minStock;
                return (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-mono text-zinc-400">{item.code}</td>
                    <td className="py-2.5 px-3 font-medium text-white">{item.name}</td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      {item.currentStock} <span className="text-zinc-400 font-normal">{item.unit}</span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400">
                      {item.minStock} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300">
                      {formatGuaranies(item.costPerUnitCents || 0)}
                    </td>
                    <td className="py-2.5 px-3">
                      {isExhausted ? (
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-semibold">
                          AGOTADO
                        </span>
                      ) : isLow ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
                          STOCK CRÍTICO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">
                          ÓPTIMO
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Products with Recipes */}
      <div className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          Recetas Configuradas por Producto
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products
            .filter((p: any) => p.recipeItems && p.recipeItems.length > 0)
            .map((p: any) => (
              <div key={p.id} className="p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white">{p.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-300">
                    {p.recipeItems.length} ingredientes
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-zinc-400">
                  {p.recipeItems.map((ri: any) => (
                    <li key={ri.id} className="flex items-center justify-between">
                      <span>• {ri.inventoryItem?.name}</span>
                      <span className="font-mono text-zinc-200">
                        -{ri.quantityRequired} {ri.inventoryItem?.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
