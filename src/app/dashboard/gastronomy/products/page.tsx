"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Package,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Wine,
  ChefHat,
  Sparkles,
  Search,
  Filter,
  Image as ImageIcon,
} from "lucide-react";
import { formatGuaranies, GASTRO_AVAILABILITY_LABELS } from "@/lib/gastronomy/format";
import { useRealtime } from "@/hooks/use-realtime";
import { ProductEditorModal } from "@/components/gastronomy/ProductEditorModal";
import { DeleteProductModal } from "@/components/gastronomy/DeleteProductModal";

export default function GastronomyProductsPage() {
  const [data, setData] = useState<any>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);

  // Filtros y Búsqueda
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterDestination, setFilterDestination] = useState("ALL");

  const loadData = useCallback(async () => {
    const res = await fetch("/api/v1/gastronomy/bootstrap", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      setData(json);
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

  const products: any[] = data?.products || [];
  const categories: any[] = data?.categories || [];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        (p.presentation && p.presentation.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory =
        filterCategory === "ALL" || p.categoryId === filterCategory;

      const matchesDestination =
        filterDestination === "ALL" ||
        p.destination === filterDestination ||
        p.destination === "BOTH";

      return matchesSearch && matchesCategory && matchesDestination;
    });
  }, [products, search, filterCategory, filterDestination]);

  const openNewProduct = () => {
    setEditingProduct(null);
    setIsEditorOpen(true);
  };

  const openEditProduct = (prod: any) => {
    setEditingProduct(prod);
    setIsEditorOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="p-6 rounded-3xl bg-[#0D1930] border border-[#263858] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" />
            <span>Catálogo Unificado de Productos</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Administra precios, fotos, costos, recetas, categorías, opciones y disponibilidad en tiempo real.
          </p>
        </div>

        <button
          onClick={openNewProduct}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="p-4 rounded-3xl bg-[#0D1930] border border-[#263858] flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, nombre o presentación..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
          />
        </div>

        {/* Filtro Categoría */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-slate-400 text-[11px] font-bold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-purple-400" /> Categoría:
          </span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-white text-xs font-semibold focus:outline-none focus:border-purple-400"
          >
            <option value="ALL">Todas las categorías ({products.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Destino */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 text-[11px] font-bold">Destino:</span>
          <select
            value={filterDestination}
            onChange={(e) => setFilterDestination(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-white text-xs font-semibold focus:outline-none focus:border-purple-400"
          >
            <option value="ALL">Todos los destinos</option>
            <option value="BAR">Barra</option>
            <option value="KITCHEN">Cocina</option>
          </select>
        </div>

        <button
          onClick={() => loadData()}
          className="p-2 rounded-xl bg-[#080F1F] hover:bg-[#132342] border border-[#263858] text-slate-300 hover:text-white cursor-pointer ml-auto"
          title="Recargar datos"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabla de Productos con Fotos */}
      <div className="p-5 rounded-3xl bg-[#0D1930] border border-[#263858] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#263858] text-slate-400 uppercase text-[10px]">
              <th className="py-2.5 px-3">Foto</th>
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
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500">
                  No se encontraron productos que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const av = GASTRO_AVAILABILITY_LABELS[p.availabilityStatus] || {
                  label: p.availabilityStatus,
                  color: "bg-zinc-800 text-zinc-300",
                };
                return (
                  <tr key={p.id} className="hover:bg-[#132342]/60 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="w-11 h-11 rounded-xl bg-[#080F1F] border border-[#263858] overflow-hidden flex items-center justify-center shrink-0">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono font-bold text-purple-300">
                      {p.code}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="font-bold text-white block">{p.name}</span>
                      {p.presentation && (
                        <span className="text-[10px] text-slate-400 block">{p.presentation}</span>
                      )}
                      {p.isFeatured && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 mt-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> Destacado
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-200">{p.category?.name}</td>

                    <td className="py-2.5 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#080F1F] border border-[#263858] text-slate-300 font-semibold inline-flex items-center gap-1">
                        {p.destination === "BAR" ? (
                          <>
                            <Wine className="w-3 h-3 text-purple-400" /> Barra
                          </>
                        ) : p.destination === "KITCHEN" ? (
                          <>
                            <ChefHat className="w-3 h-3 text-amber-400" /> Cocina
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-emerald-400" /> Mixto
                          </>
                        )}
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditProduct(p)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#080F1F] hover:bg-purple-950/60 border border-[#263858] hover:border-purple-400/50 text-slate-200 inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Editar producto y foto"
                        >
                          <Pencil className="w-3.5 h-3.5 text-purple-300" />
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => setDeletingProduct(p)}
                          className="p-1.5 rounded-xl bg-[#080F1F] hover:bg-red-950/60 border border-[#263858] hover:border-red-500/50 text-red-400 cursor-pointer transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Creación / Edición con Subida de Fotos */}
      <ProductEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSaved={loadData}
        product={editingProduct}
        categories={categories}
      />

      {/* Modal de Eliminación de Producto */}
      <DeleteProductModal
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        onDeleted={loadData}
        product={deletingProduct}
      />
    </div>
  );
}
