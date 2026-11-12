"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  Wine,
  ChefHat,
  Image as ImageIcon,
} from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import { formatGuaranies, GASTRO_AVAILABILITY_LABELS } from "@/lib/gastronomy/format";
import { ProductEditorModal } from "@/components/gastronomy/ProductEditorModal";
import { DeleteProductModal } from "@/components/gastronomy/DeleteProductModal";

export default function GastronomyDigitalMenuPage() {
  const [data, setData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  // Estados de modales
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);

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

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat =
        selectedCategory === "ALL" || p.categoryId === selectedCategory;
      const matchesSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, search]);

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
      {/* Header Principal con Acciones Rápidas */}
      <div className="p-6 rounded-3xl bg-[#0D1930] border border-[#263858] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <span>Gestión del Menú Digital & Carta QR</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Vista visual interactiva: sube fotos, edita precios, agrega productos, retira ítems y controla la disponibilidad en vivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openNewProduct}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>

          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                navigator.clipboard.writeText(`${window.location.origin}/menu`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
            <span>{copied ? "Link Copiado" : "Copiar Link"}</span>
          </button>

          <Link
            href="/menu"
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/70 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <QrCode className="w-4 h-4 text-purple-300" />
            <span>PWA Cliente</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Estado de Modalidades de Entrega */}
      {deliveryConfig && (
        <div className="p-4 rounded-2xl bg-[#0D1930] border border-[#263858] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300">Modalidades para clientes:</span>
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
            Configuración Avanzada →
          </Link>
        </div>
      )}

      {/* Barra de Filtros, Categorías y Búsqueda */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en el menú por nombre, código o ingrediente..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0D1930] border border-[#263858] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
            />
          </div>

          <button
            onClick={() => loadData()}
            className="p-2 rounded-xl bg-[#0D1930] hover:bg-[#132342] border border-[#263858] text-slate-300 hover:text-white cursor-pointer"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas de Categorías */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
              selectedCategory === "ALL"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30"
                : "bg-[#0D1930] text-slate-300 border border-[#263858] hover:border-purple-400/50"
            }`}
          >
            Todas las categorías ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                selectedCategory === cat.id
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30"
                  : "bg-[#0D1930] text-slate-300 border border-[#263858] hover:border-purple-400/50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grilla Visual del Menú Digital con Controles Completos */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#0D1930] border border-[#263858] text-slate-400 text-xs">
          No se encontraron productos en esta categoría o búsqueda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            const av = GASTRO_AVAILABILITY_LABELS[p.availabilityStatus] || {
              label: p.availabilityStatus,
              color: "bg-zinc-800 text-zinc-300",
            };
            const isVisibleToClient =
              p.active &&
              p.availabilityStatus === "AVAILABLE" &&
              (!p.trackInventory || p.stockQuantity > 0);
            const opts = p.optionsJson ? JSON.parse(p.optionsJson) : [];

            return (
              <div
                key={p.id}
                className={`rounded-3xl bg-[#0D1930] border overflow-hidden flex flex-col justify-between transition-all group ${
                  isVisibleToClient
                    ? "border-[#263858] hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/20"
                    : "border-red-900/40 opacity-75 bg-[#0a1224]"
                }`}
              >
                <div>
                  {/* Foto del Producto con Badges y Destino */}
                  <div className="h-44 w-full bg-[#080F1F] relative overflow-hidden flex items-center justify-center">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-center p-3 text-slate-600">
                        <ImageIcon className="w-10 h-10 mx-auto mb-1 opacity-40" />
                        <span className="text-[10px] block">Sin foto cargada</span>
                      </div>
                    )}

                    {/* Badges Superiores */}
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/85 text-purple-300 border border-purple-500/40 backdrop-blur-sm">
                        {p.code}
                      </span>
                      {p.isFeatured && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-black flex items-center gap-1 shadow-sm">
                          <Sparkles className="w-3 h-3" /> Destacado
                        </span>
                      )}
                    </div>

                    {/* Destino Operativo Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/85 text-slate-200 border border-white/20 backdrop-blur-sm inline-flex items-center gap-1">
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
                    </div>

                    {/* Botón flotante de edición rápida de foto sobre la imagen */}
                    <button
                      type="button"
                      onClick={() => openEditProduct(p)}
                      className="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-black/80 hover:bg-purple-600 text-white text-[10px] font-bold border border-white/20 backdrop-blur-sm flex items-center gap-1 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Editar Foto</span>
                    </button>
                  </div>

                  {/* Cuerpo Informativo */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-white leading-snug">
                        {p.name}
                      </h3>
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
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}

                    {opts.length > 0 && (
                      <div className="text-[10px] text-cyan-300 bg-[#080F1F] p-2 rounded-xl border border-[#1E2E4A]">
                        Extras:{" "}
                        {opts
                          .map(
                            (o: any) =>
                              `${o.name} (+${formatGuaranies(o.priceCents)})`
                          )
                          .join(", ")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pie de Tarjeta con Controles Completos */}
                <div className="p-4 pt-0 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
                    <span className={`px-2 py-0.5 rounded-full border font-bold ${av.color}`}>
                      {av.label}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      Stock: {p.stockQuantity} {p.unit}
                    </span>
                  </div>

                  {/* Fila de Acciones: Editar, Eliminar y Visibilidad */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditProduct(p)}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-[#080F1F] hover:bg-purple-950/70 border border-[#263858] hover:border-purple-400 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-purple-400" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingProduct(p)}
                      className="p-1.5 rounded-xl bg-[#080F1F] hover:bg-red-950/70 border border-[#263858] hover:border-red-500 text-red-400 transition-colors cursor-pointer"
                      title="Eliminar producto del menú"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Toggle Habilitar/Ocultar del Menú Digital */}
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(p)}
                    className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isVisibleToClient
                        ? "bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40"
                        : "bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-700/50"
                    }`}
                  >
                    {isVisibleToClient ? (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Ocultar del Menú</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Habilitar en Menú</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Creación / Edición Completo con Foto */}
      <ProductEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSaved={loadData}
        product={editingProduct}
        categories={categories}
        defaultCategoryId={selectedCategory !== "ALL" ? selectedCategory : undefined}
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
