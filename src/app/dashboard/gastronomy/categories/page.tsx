"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Layers, Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";

export default function GastronomyCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [destination, setDestination] = useState<"BAR" | "KITCHEN" | "BOTH">("BAR");
  const [orderIndex, setOrderIndex] = useState(13);
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/v1/gastronomy/categories");
    if (res.ok) {
      const json = await res.json();
      setCategories(json.categories || []);
      setOrderIndex((json.categories?.length || 12) + 1);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/gastronomy/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          destination,
          orderIndex,
          active: true,
        }),
      });
      if (res.ok) {
        setName("");
        setDescription("");
        await loadCategories();
      } else {
        const err = await res.json();
        alert(err.error?.message || "No se pudo crear la categoría");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cat: any) => {
    await fetch("/api/v1/gastronomy/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id, active: !cat.active }),
    });
    await loadCategories();
  };

  const handleDelete = async (cat: any) => {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
    await fetch(`/api/v1/gastronomy/categories?id=${cat.id}`, { method: "DELETE" });
    await loadCategories();
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-[#0D1930] border border-[#263858]">
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-400" />
          <span>Categorías del Menú Gastronómico</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Administra las categorías oficiales (Cervezas, Bebidas, Tragos, Cócteles, Vinos, Comidas, Hamburguesas, Pizzas, Picadas, Postres, Promociones, Productos especiales) y agrega nuevas categorías.
        </p>
      </div>

      {/* Formulario Nueva Categoría */}
      <form
        onSubmit={handleCreate}
        className="p-5 rounded-3xl bg-[#0D1930] border border-[#263858] grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs"
      >
        <div className="sm:col-span-2">
          <label className="text-slate-300 font-semibold block mb-1">Nombre de la Categoría</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Destilados Premium / Sushi"
            className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
          />
        </div>
        <div>
          <label className="text-slate-300 font-semibold block mb-1">Destino Operativo</label>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value as any)}
            className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
          >
            <option value="BAR">Barra (Bebidas)</option>
            <option value="KITCHEN">Cocina (Comidas)</option>
            <option value="BOTH">Ambos (Promos / Combos)</option>
          </select>
        </div>
        <div>
          <label className="text-slate-300 font-semibold block mb-1">Orden Visual</label>
          <input
            type="number"
            value={orderIndex}
            onChange={(e) => setOrderIndex(Number(e.target.value))}
            className="w-full p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Categoría</span>
        </button>
      </form>

      {/* Listado de Categorías */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="p-5 rounded-3xl bg-[#0D1930] border border-[#263858] flex items-center justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-purple-400">#{cat.orderIndex}</span>
                <h3 className="text-sm font-bold text-white">{cat.name}</h3>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-[#080F1F] border border-[#263858] text-slate-300">
                  Destino: {cat.destination === "BAR" ? "Barra" : cat.destination === "KITCHEN" ? "Cocina" : "Ambos"}
                </span>
                <span className="text-slate-400">
                  {cat._count?.products ?? 0} productos
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleToggleActive(cat)}
                className={`p-2 rounded-xl border text-xs font-bold ${
                  cat.active
                    ? "bg-emerald-950/60 border-emerald-600/40 text-emerald-300"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400"
                }`}
                title={cat.active ? "Activa (Clic para desactivar)" : "Inactiva (Clic para activar)"}
              >
                {cat.active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handleDelete(cat)}
                className="p-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-800/40 text-red-300"
                title="Eliminar categoría"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
