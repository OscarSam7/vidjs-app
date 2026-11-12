"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Boxes,
  Plus,
  RefreshCw,
  AlertTriangle,
  ArrowUpCircle,
  Utensils,
  Layers,
  GlassWater,
  Flame,
  Package,
  Search,
  Trash2,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Wine,
  Sparkles,
  Info,
  DollarSign,
  ShoppingCart,
  FileText,
} from "lucide-react";
import { formatGuaranies } from "@/lib/gastronomy/format";
import { useRealtime } from "@/hooks/use-realtime";
import { VipSelectModal } from "@/components/ui/VipSelectModal";

export default function GastronomyInventoryPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Pestaña principal activa
  const [activeTab, setActiveTab] = useState<"INVENTORY" | "PURCHASES" | "RECIPES" | "KARDEX">("INVENTORY");

  // Filtros de existencias
  const [filterType, setFilterType] = useState<"ALL" | "ARTICLE" | "SUPPLY">("ALL");
  const [filterDestination, setFilterDestination] = useState<"ALL" | "BAR" | "KITCHEN" | "BOTH">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Formulario: Crear Nuevo Artículo / Insumo
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newItemType, setNewItemType] = useState<"SUPPLY" | "ARTICLE">("SUPPLY");
  const [newDestination, setNewDestination] = useState<"BAR" | "KITCHEN" | "BOTH">("BAR");
  const [newUnit, setNewUnit] = useState("ML");
  const [newStock, setNewStock] = useState("1000");
  const [newMinStock, setNewMinStock] = useState("200");
  const [newCost, setNewCost] = useState("50");

  // Formulario: Sector de Compras / Reposición (Kardex Entrada)
  const [purchaseMode, setPurchaseMode] = useState<"EXISTING" | "NEW">("EXISTING");
  const [purchaseItemId, setPurchaseItemId] = useState("");
  const [purchaseQty, setPurchaseQty] = useState("50");
  const [purchaseReason, setPurchaseReason] = useState("Compra de reposición semanal");
  
  // Compra directa de nuevo ítem que no existía
  const [purchNewName, setPurchNewName] = useState("");
  const [purchNewCode, setPurchNewCode] = useState("");
  const [purchNewType, setPurchNewType] = useState<"SUPPLY" | "ARTICLE">("SUPPLY");
  const [purchNewDest, setPurchNewDest] = useState<"BAR" | "KITCHEN" | "BOTH">("BAR");
  const [purchNewUnit, setPurchNewUnit] = useState("ML");
  const [purchNewQty, setPurchNewQty] = useState("1000");
  const [purchNewMinStock, setPurchNewMinStock] = useState("200");
  const [purchNewCost, setPurchNewCost] = useState("80");
  const [purchNewReason, setPurchNewReason] = useState("Factura N° 001-002 Compra inicial");

  // Formulario: Configuración de Recetas (Escandallo)
  const [recipeFilter, setRecipeFilter] = useState<"ALL" | "BAR" | "KITCHEN" | "COMBO">("ALL");
  const [recipeProductId, setRecipeProductId] = useState("");
  const [recipeItemId, setRecipeItemId] = useState("");
  const [recipeQty, setRecipeQty] = useState("50");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/gastronomy/inventory", { cache: "no-store" });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error("Error al cargar inventario:", err);
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

  // Guardar nuevo ítem (Artículo o Insumo)
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/gastronomy/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_INVENTORY_ITEM",
          name: newName.trim(),
          code: newCode.trim() || undefined,
          itemType: newItemType,
          destination: newDestination,
          unit: newUnit,
          currentStock: Number(newStock) || 0,
          minStock: Number(newMinStock) || 10,
          costPerUnitCents: Number(newCost) || 0,
        }),
      });
      if (res.ok) {
        setNewName("");
        setNewCode("");
        setFeedback(`✓ ${newItemType === "ARTICLE" ? "Artículo" : "Insumo"} registrado exitosamente.`);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Error al crear ítem");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Registrar compra o reposición
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (purchaseMode === "EXISTING") {
        if (!purchaseItemId) return;
        const res = await fetch("/api/v1/gastronomy/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "RESTOCK_INVENTORY_ITEM",
            inventoryItemId: purchaseItemId,
            quantityDelta: Number(purchaseQty),
            reason: purchaseReason,
          }),
        });
        if (res.ok) {
          setFeedback("✓ Entrada de stock registrada en Kardex.");
          await loadData();
        } else {
          const err = await res.json();
          alert(err.error?.message || "Error al reponer stock");
        }
      } else {
        // Crear nuevo y reponer al vuelo
        if (!purchNewName.trim()) return;
        const res = await fetch("/api/v1/gastronomy/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "RESTOCK_OR_CREATE_ITEM",
            createNewIfNotExists: true,
            name: purchNewName.trim(),
            code: purchNewCode.trim() || undefined,
            itemType: purchNewType,
            destination: purchNewDest,
            unit: purchNewUnit,
            quantityDelta: Number(purchNewQty),
            minStock: Number(purchNewMinStock),
            costPerUnitCents: Number(purchNewCost),
            reason: purchNewReason,
          }),
        });
        if (res.ok) {
          setPurchNewName("");
          setPurchNewCode("");
          setFeedback("✓ Nuevo ítem generado e ingresado a Kardex exitosamente.");
          await loadData();
          setPurchaseMode("EXISTING");
        } else {
          const err = await res.json();
          alert(err.error?.message || "Error al registrar compra de nuevo ítem");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Vincular ingrediente a receta
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
        setFeedback("✓ Insumo vinculado a la receta técnica del menú.");
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Error al vincular receta");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Desvincular ingrediente de receta
  const handleRemoveRecipeItem = async (productId: string, inventoryItemId: string) => {
    if (!window.confirm("¿Seguro que deseas quitar este insumo de la receta?")) return;
    try {
      const res = await fetch("/api/v1/gastronomy/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REMOVE_RECIPE_ITEM",
          productId,
          inventoryItemId,
        }),
      });
      if (res.ok) {
        setFeedback("✓ Ingrediente removido de la receta.");
        await loadData();
      }
    } catch (err) {
      console.error("Error al desvincular:", err);
    }
  };

  // Eliminar ítem de inventario
  const handleDeleteInventoryItem = async (id: string, name: string) => {
    if (!window.confirm(`¿Confirmás eliminar "${name}" del inventario?`)) return;
    try {
      const res = await fetch("/api/v1/gastronomy/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_INVENTORY_ITEM",
          inventoryItemId: id,
        }),
      });
      if (res.ok) {
        setFeedback(`✓ "${name}" eliminado del inventario.`);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error?.message || "No se puede eliminar el ítem porque está vinculado a recetas o movimientos.");
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const inventoryItems: any[] = data?.inventoryItems || [];
  const products: any[] = data?.products || [];
  const movements: any[] = data?.movements || [];

  // Métricas calculadas
  const totalArticles = inventoryItems.filter((i) => i.itemType === "ARTICLE").length;
  const totalSupplies = inventoryItems.filter((i) => i.itemType !== "ARTICLE").length;
  const totalBar = inventoryItems.filter((i) => i.destination === "BAR").length;
  const totalKitchen = inventoryItems.filter((i) => i.destination === "KITCHEN").length;
  const criticalStockItems = inventoryItems.filter((i) => i.currentStock <= i.minStock);
  const productsWithRecipe = products.filter((p) => p.recipeItems && p.recipeItems.length > 0);

  // Filtrado reactivo de inventario
  const filteredItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      // Filtro de tipo
      if (filterType === "ARTICLE" && item.itemType !== "ARTICLE") return false;
      if (filterType === "SUPPLY" && item.itemType === "ARTICLE") return false;
      // Filtro de destino
      if (filterDestination !== "ALL" && item.destination !== filterDestination && item.destination !== "BOTH") {
        return false;
      }
      // Búsqueda por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCode = item.code.toLowerCase().includes(q);
        return matchesName || matchesCode;
      }
      return true;
    });
  }, [inventoryItems, filterType, filterDestination, searchQuery]);

  // Producto seleccionado para ver su receta en el configurador
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === recipeProductId) || null;
  }, [products, recipeProductId]);

  // Insumo seleccionado en la receta para inferir sugerencia de unidad
  const selectedRecipeItem = useMemo(() => {
    return inventoryItems.find((i) => i.id === recipeItemId) || null;
  }, [inventoryItems, recipeItemId]);

  // Productos filtrados para el configurador de recetas
  const filteredProductsForRecipes = useMemo(() => {
    return products.filter((p) => {
      if (recipeFilter === "BAR") return p.destination === "BAR" && !p.isPromotion;
      if (recipeFilter === "KITCHEN") return p.destination === "KITCHEN" && !p.isPromotion;
      if (recipeFilter === "COMBO") return p.isPromotion || p.name.toLowerCase().includes("combo");
      return true;
    });
  }, [products, recipeFilter]);

  if (loading && !data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <span className="text-xs text-zinc-400 font-medium">Cargando inventario, artículos y recetas...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado y Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <Boxes className="w-7 h-7 text-emerald-400" />
              <span>Control de Inventario: Artículos, Insumos y Recetas</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
              Kardex Gastronómico
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
            Control integral de mercaderías de reventa (artículos en unidades) e insumos fraccionables (bebidas en ml, carnes y quesos en cocina). Descuento automático por trago servido y combos multiproducto.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-300 font-semibold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sincronizar</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between shadow-lg">
          <span className="font-semibold">{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-emerald-400 hover:text-white font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-1">
          <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-blue-400" />
            <span>Artículos</span>
          </div>
          <div className="text-xl font-black text-white">{totalArticles}</div>
          <div className="text-[10px] text-zinc-500">Unidades de reventa</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-1">
          <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
            <Boxes className="w-3.5 h-3.5 text-purple-400" />
            <span>Insumos</span>
          </div>
          <div className="text-xl font-black text-white">{totalSupplies}</div>
          <div className="text-[10px] text-zinc-500">Materia fraccionable</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-1">
          <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
            <GlassWater className="w-3.5 h-3.5 text-cyan-400" />
            <span>Barra / Bar</span>
          </div>
          <div className="text-xl font-black text-white">{totalBar}</div>
          <div className="text-[10px] text-zinc-500">Tragos y bebidas ml</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-1">
          <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Cocina</span>
          </div>
          <div className="text-xl font-black text-white">{totalKitchen}</div>
          <div className="text-[10px] text-zinc-500">Ingredientes platos</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-1">
          <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-pink-400" />
            <span>Recetas Activas</span>
          </div>
          <div className="text-xl font-black text-purple-300">{productsWithRecipe.length}</div>
          <div className="text-[10px] text-zinc-500">Con escandallo</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-1">
          <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Stock Crítico</span>
          </div>
          <div className="text-xl font-black text-rose-300">{criticalStockItems.length}</div>
          <div className="text-[10px] text-zinc-500">Por debajo del mínimo</div>
        </div>
      </div>

      {criticalStockItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wide">
                Alerta de Stock Crítico ({criticalStockItems.length} ítems agotándose)
              </h3>
              <p className="text-xs text-rose-200/90 mt-0.5">
                {criticalStockItems.map((i: any) => `${i.name}: ${i.currentStock} ${i.unit}`).join(" • ")}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("PURCHASES")}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold whitespace-nowrap"
          >
            Ir a Compras →
          </button>
        </div>
      )}

      {/* Navegación por Pestañas Principales */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("INVENTORY")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "INVENTORY"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
              : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/10"
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Existencias (Artículos & Insumos)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
            {inventoryItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("PURCHASES")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "PURCHASES"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
              : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/10"
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />
          <span>Sector de Compras / Kardex Entrada</span>
        </button>

        <button
          onClick={() => setActiveTab("RECIPES")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "RECIPES"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
              : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/10"
          }`}
        >
          <Utensils className="w-3.5 h-3.5 text-purple-400" />
          <span>Configurar Recetas (Bar, Cocina y Combos)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
            {productsWithRecipe.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("KARDEX")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "KARDEX"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
              : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/10"
          }`}
        >
          <History className="w-3.5 h-3.5 text-amber-400" />
          <span>Kardex / Historial de Movimientos</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
            {movements.length}
          </span>
        </button>
      </div>

      {/* PESTAÑA 1: EXISTENCIAS (ARTÍCULOS E INSUMOS) */}
      {activeTab === "INVENTORY" && (
        <div className="space-y-6">
          {/* Formulario de Alta Rápida de Nuevo Ítem */}
          <div className="p-5 rounded-3xl bg-zinc-900/70 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Dar de Alta Nuevo Ítem en el Catálogo</span>
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Definí si es un Artículo (mercadería / producto terminado en unidades) o un Insumo (materia prima fraccionable en ml/gr para bar y cocina).
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateItem} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">Nombre del Ítem *</label>
                <input
                  required
                  placeholder="ej: Vodka Absolut 750ml, Pan Brioche, Speed"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white font-medium focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">Tipo de Clasificación *</label>
                <VipSelectModal
                  value={newItemType}
                  onChange={(val) => {
                    const t = val as "SUPPLY" | "ARTICLE";
                    setNewItemType(t);
                    if (t === "ARTICLE") {
                      setNewUnit("UN");
                      setNewStock("24");
                    } else {
                      setNewUnit("ML");
                      setNewStock("1000");
                    }
                  }}
                  options={[
                    {
                      value: "SUPPLY",
                      label: "🧪 Insumo (Materia Prima Fraccionable)",
                      subtitle: "Se descuenta en ml, gramos o porciones en recetas",
                      badge: "INSUMO",
                      badgeTone: "bg-purple-500/20 text-purple-300 border-purple-500/40",
                      icon: Boxes,
                    },
                    {
                      value: "ARTICLE",
                      label: "📦 Artículo (Mercadería / Reventa Directa)",
                      subtitle: "Se controla por unidades cerradas, latas o botellas",
                      badge: "ARTÍCULO",
                      badgeTone: "bg-blue-500/20 text-blue-300 border-blue-500/40",
                      icon: Package,
                    },
                  ]}
                  title="Tipo de Clasificación"
                  subtitle="Define la naturaleza del ítem en el inventario"
                  placeholder="Seleccionar tipo..."
                  icon={Package}
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">Área / Destino Operativo *</label>
                <VipSelectModal
                  value={newDestination}
                  onChange={(val) => setNewDestination(val as any)}
                  options={[
                    {
                      value: "BAR",
                      label: "🍸 Barra / Bar (Bebidas y Tragos)",
                      subtitle: "Materia prima o mercadería utilizada en la barra",
                      badge: "BAR",
                      badgeTone: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
                      icon: GlassWater,
                    },
                    {
                      value: "KITCHEN",
                      label: "🍳 Cocina (Platos y Comidas)",
                      subtitle: "Ingredientes utilizados en la preparación de cocina",
                      badge: "COCINA",
                      badgeTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
                      icon: Flame,
                    },
                    {
                      value: "BOTH",
                      label: "🏢 General / Ambos (Hielo, Insumos Generales)",
                      subtitle: "Compartido por barra, cocina y camareros",
                      badge: "GENERAL",
                      badgeTone: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
                      icon: Boxes,
                    },
                  ]}
                  title="Destino Operativo"
                  subtitle="Sector donde se consume este ítem"
                  placeholder="Área de destino..."
                  icon={GlassWater}
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">Unidad de Medida *</label>
                <VipSelectModal
                  value={newUnit}
                  onChange={(val) => setNewUnit(val)}
                  options={[
                    { value: "ML", label: "Mililitros (ml)", subtitle: "Bebidas alcohólicas, licores y jugos", badge: "ML" },
                    { value: "LT", label: "Litros (L)", subtitle: "Líquidos en volumen mayor", badge: "LT" },
                    { value: "UN", label: "Unidad (UN)", subtitle: "Ítems individuales, combos o latas", badge: "UN" },
                    { value: "BOTELLA", label: "Botella Cerrada", subtitle: "Botellas enteras de vino o destilados", badge: "BOT" },
                    { value: "LATA", label: "Lata", subtitle: "Cervezas, energizantes o gaseosas", badge: "LATA" },
                    { value: "GR", label: "Gramos (gr)", subtitle: "Carnes, quesos, especias sólidas", badge: "GR" },
                    { value: "KG", label: "Kilogramos (kg)", subtitle: "Cortes de carne enteros o verduras", badge: "KG" },
                    { value: "FETA", label: "Feta", subtitle: "Láminas de queso o fiambres", badge: "FETA" },
                    { value: "PORCION", label: "Porción", subtitle: "Raciones estandarizadas", badge: "PORC" },
                  ]}
                  title="Unidad de Medida"
                  subtitle="Cómo se fracciona o cuenta en el stock"
                  placeholder="Unidad..."
                  icon={Boxes}
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Código SKU (Opcional)</label>
                <input
                  placeholder="ej: INS-VODKA-01"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Stock Inicial ({newUnit})</label>
                <input
                  type="number"
                  step="any"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Alerta Stock Mínimo ({newUnit})</label>
                <input
                  type="number"
                  step="any"
                  value={newMinStock}
                  onChange={(e) => setNewMinStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Costo Unitario Gs. (por {newUnit})</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white font-mono"
                />
              </div>

              <div className="lg:col-span-4 flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting || !newName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Guardar en Inventario</span>
                </button>
              </div>
            </form>
          </div>

          {/* Filtros de la Tabla de Existencias */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {/* Filtro Tipo: Todos | Artículos | Insumos */}
              <button
                onClick={() => setFilterType("ALL")}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                  filterType === "ALL"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "bg-zinc-900 text-zinc-400 border border-white/10 hover:text-white"
                }`}
              >
                Todos ({inventoryItems.length})
              </button>

              <button
                onClick={() => setFilterType("ARTICLE")}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  filterType === "ARTICLE"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-zinc-900 text-zinc-400 border border-white/10 hover:text-white"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Artículos ({totalArticles})</span>
              </button>

              <button
                onClick={() => setFilterType("SUPPLY")}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  filterType === "SUPPLY"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "bg-zinc-900 text-zinc-400 border border-white/10 hover:text-white"
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Insumos ({totalSupplies})</span>
              </button>

              <span className="text-zinc-600 font-bold px-1">|</span>

              {/* Filtro Destino: Todos | Bar | Cocina */}
              <button
                onClick={() => setFilterDestination("ALL")}
                className={`px-2.5 py-1.5 rounded-xl font-semibold transition ${
                  filterDestination === "ALL" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white"
                }`}
              >
                Todas las Áreas
              </button>
              <button
                onClick={() => setFilterDestination("BAR")}
                className={`px-2.5 py-1.5 rounded-xl font-semibold transition flex items-center gap-1 ${
                  filterDestination === "BAR" ? "bg-cyan-950 text-cyan-300 border border-cyan-500/40" : "text-zinc-500 hover:text-white"
                }`}
              >
                <GlassWater className="w-3 h-3 text-cyan-400" />
                <span>Barra ({totalBar})</span>
              </button>
              <button
                onClick={() => setFilterDestination("KITCHEN")}
                className={`px-2.5 py-1.5 rounded-xl font-semibold transition flex items-center gap-1 ${
                  filterDestination === "KITCHEN" ? "bg-amber-950 text-amber-300 border border-amber-500/40" : "text-zinc-500 hover:text-white"
                }`}
              >
                <Flame className="w-3 h-3 text-amber-400" />
                <span>Cocina ({totalKitchen})</span>
              </button>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o código SKU..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white"
              />
            </div>
          </div>

          {/* Tabla de Existencias */}
          <div className="p-5 rounded-3xl bg-zinc-900/70 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-emerald-400" />
                <span>Catálogo de Existencias ({filteredItems.length} ítems listados)</span>
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] uppercase text-zinc-400">
                    <th className="py-2.5 px-3">Código SKU</th>
                    <th className="py-2.5 px-3">Clasificación</th>
                    <th className="py-2.5 px-3">Área</th>
                    <th className="py-2.5 px-3">Nombre</th>
                    <th className="py-2.5 px-3">Stock Actual</th>
                    <th className="py-2.5 px-3">Stock Mínimo</th>
                    <th className="py-2.5 px-3">Costo Unit. Gs.</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-zinc-500">
                        No se encontraron ítems con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item: any) => {
                      const isExhausted = item.currentStock <= 0;
                      const isLow = item.currentStock <= item.minStock;
                      const isArticle = item.itemType === "ARTICLE";
                      return (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3 px-3 font-mono font-bold text-zinc-400">{item.code}</td>
                          <td className="py-3 px-3">
                            {isArticle ? (
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                                <Package className="w-2.5 h-2.5" />
                                <span>ARTÍCULO</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                                <Boxes className="w-2.5 h-2.5" />
                                <span>INSUMO</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {item.destination === "BAR" ? (
                              <span className="text-cyan-300 text-[11px] font-bold flex items-center gap-1">
                                <GlassWater className="w-3 h-3 text-cyan-400" />
                                <span>Bar</span>
                              </span>
                            ) : item.destination === "KITCHEN" ? (
                              <span className="text-amber-300 text-[11px] font-bold flex items-center gap-1">
                                <Flame className="w-3 h-3 text-amber-400" />
                                <span>Cocina</span>
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[11px]">General</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-white">{item.name}</div>
                            {item.recipeUsages && item.recipeUsages.length > 0 && (
                              <div className="text-[10px] text-purple-300 mt-0.5">
                                Utilizado en {item.recipeUsages.length} receta{item.recipeUsages.length > 1 ? "s" : ""}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-bold text-white">
                            <span className={isExhausted ? "text-rose-400" : isLow ? "text-amber-300" : "text-emerald-300"}>
                              {item.currentStock.toLocaleString("es-PY")}
                            </span>{" "}
                            <span className="text-zinc-400 font-normal text-[11px]">{item.unit}</span>
                          </td>
                          <td className="py-3 px-3 text-zinc-400">
                            {item.minStock.toLocaleString("es-PY")} {item.unit}
                          </td>
                          <td className="py-3 px-3 font-mono text-zinc-300">
                            {formatGuaranies(item.costPerUnitCents || 0)}
                          </td>
                          <td className="py-3 px-3">
                            {isExhausted ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold">
                                AGOTADO
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                                STOCK CRÍTICO
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                                ÓPTIMO
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setPurchaseItemId(item.id);
                                  setPurchaseMode("EXISTING");
                                  setActiveTab("PURCHASES");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-bold flex items-center gap-1"
                                title="Registrar compra / reposición de este ítem"
                              >
                                <ArrowUpCircle className="w-3 h-3" />
                                <span>Reponer</span>
                              </button>
                              <button
                                onClick={() => handleDeleteInventoryItem(item.id, item.name)}
                                className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-500/30"
                                title="Eliminar ítem"
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
          </div>
        </div>
      )}

      {/* PESTAÑA 2: SECTOR DE COMPRAS / REPOSICIÓN DE STOCK (KARDEX ENTRADA) */}
      {activeTab === "PURCHASES" && (
        <div className="p-6 rounded-3xl bg-zinc-900/70 border border-white/10 space-y-6 max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-400" />
                <span>Sector de Compras y Reposición de Stock</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Registrá la entrada de mercaderías e insumos a Kardex. Si el producto o insumo es nuevo y aún no existe en el catálogo, podés crearlo y cargarlo directamente aquí.
              </p>
            </div>

            {/* Toggle: Reponer existente vs Crear nuevo */}
            <div className="flex rounded-xl bg-zinc-950 p-1 border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPurchaseMode("EXISTING")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  purchaseMode === "EXISTING" ? "bg-blue-600 text-white shadow" : "text-zinc-400 hover:text-white"
                }`}
              >
                Reponer Existente
              </button>
              <button
                type="button"
                onClick={() => setPurchaseMode("NEW")}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  purchaseMode === "NEW" ? "bg-emerald-600 text-white shadow" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Generar Nuevo Ítem</span>
              </button>
            </div>
          </div>

          <form onSubmit={handlePurchaseSubmit} className="space-y-4">
            {purchaseMode === "EXISTING" ? (
              /* CASO 1: Reponer ítem existente */
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1">
                    Seleccionar Artículo o Insumo a Reponer *
                  </label>
                  <VipSelectModal
                    value={purchaseItemId}
                    onChange={(val) => setPurchaseItemId(val)}
                    options={[
                      { value: "", label: "-- Seleccionar del catálogo --", subtitle: "Elegí el producto o insumo que ingresa" },
                      ...inventoryItems.map((item: any) => ({
                        value: item.id,
                        label: `${item.name} (${item.code})`,
                        subtitle: `Stock actual: ${item.currentStock} ${item.unit} • Mín: ${item.minStock} ${item.unit} • ${item.destination === "BAR" ? "Barra" : item.destination === "KITCHEN" ? "Cocina" : "General"}`,
                        badge: item.itemType === "ARTICLE" ? "ARTÍCULO" : "INSUMO",
                        badgeTone: item.itemType === "ARTICLE" ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-purple-500/20 text-purple-300 border-purple-500/40",
                        icon: item.itemType === "ARTICLE" ? Package : Boxes,
                      })),
                    ]}
                    title="Seleccionar Ítem a Reponer"
                    subtitle="Insumo o artículo al que se sumará la compra"
                    placeholder="Buscar y seleccionar del catálogo..."
                    icon={ShoppingCart}
                    showSearch={inventoryItems.length > 5}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-300 font-semibold block mb-1">
                      Cantidad a Ingresar / Sumar *
                    </label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="any"
                      placeholder="ej: 1000 ml, 24 unidades, 10 kg"
                      value={purchaseQty}
                      onChange={(e) => setPurchaseQty(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-300 font-semibold block mb-1">
                      N° Factura de Compra / Proveedor / Motivo
                    </label>
                    <input
                      required
                      placeholder="ej: Factura 001-002 Distribuidora Asunción"
                      value={purchaseReason}
                      onChange={(e) => setPurchaseReason(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !purchaseItemId}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>Registrar Entrada a Kardex y Reactivar Menú</span>
                </button>
              </div>
            ) : (
              /* CASO 2: Generar y Comprar al Vuelo nuevo ítem que no existía */
              <div className="p-5 rounded-2xl bg-zinc-950/80 border border-emerald-500/30 space-y-4">
                <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold border-b border-white/10 pb-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Alta y Compra Inmediata de Nuevo Ítem</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-zinc-300 font-semibold block mb-1">Nombre del Nuevo Ítem *</label>
                    <input
                      required
                      placeholder="ej: Whisky Chivas 12 Años 750ml, Pan de Lomito"
                      value={purchNewName}
                      onChange={(e) => setPurchNewName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-300 font-semibold block mb-1">Tipo de Clasificación *</label>
                    <VipSelectModal
                      value={purchNewType}
                      onChange={(val) => {
                        const t = val as "SUPPLY" | "ARTICLE";
                        setPurchNewType(t);
                        if (t === "ARTICLE") {
                          setPurchNewUnit("UN");
                          setPurchNewQty("24");
                        } else {
                          setPurchNewUnit("ML");
                          setPurchNewQty("1000");
                        }
                      }}
                      options={[
                        {
                          value: "SUPPLY",
                          label: "🧪 Insumo Fraccionable (Bebidas ml, Cocina gr)",
                          subtitle: "Se utiliza en recetas de barra y cocina",
                          badge: "INSUMO",
                          badgeTone: "bg-purple-500/20 text-purple-300 border-purple-500/40",
                          icon: Boxes,
                        },
                        {
                          value: "ARTICLE",
                          label: "📦 Artículo de Reventa (Unidades cerradas)",
                          subtitle: "Se vende por unidades cerradas, latas o combos",
                          badge: "ARTÍCULO",
                          badgeTone: "bg-blue-500/20 text-blue-300 border-blue-500/40",
                          icon: Package,
                        },
                      ]}
                      title="Tipo de Clasificación"
                      subtitle="Selecciona si es un insumo o artículo terminado"
                      placeholder="Tipo..."
                      icon={Package}
                    />
                  </div>

                  <div>
                    <label className="text-zinc-300 font-semibold block mb-1">Área de Destino *</label>
                    <VipSelectModal
                      value={purchNewDest}
                      onChange={(val) => setPurchNewDest(val as any)}
                      options={[
                        { value: "BAR", label: "🍸 Barra / Bar", subtitle: "Bebidas y tragos", badge: "BAR" },
                        { value: "KITCHEN", label: "🍳 Cocina", subtitle: "Platos y comidas", badge: "COCINA" },
                        { value: "BOTH", label: "🏢 General / Ambos", subtitle: "Uso general del club", badge: "GENERAL" },
                      ]}
                      title="Área de Destino"
                      subtitle="Dónde se utilizará este ítem"
                      placeholder="Área..."
                      icon={GlassWater}
                    />
                  </div>

                  <div>
                    <label className="text-zinc-300 font-semibold block mb-1">Unidad de Medida *</label>
                    <VipSelectModal
                      value={purchNewUnit}
                      onChange={(val) => setPurchNewUnit(val)}
                      options={[
                        { value: "ML", label: "Mililitros (ml)", subtitle: "Líquidos y bebidas de bar" },
                        { value: "UN", label: "Unidad (UN)", subtitle: "Unidades, latas, combos" },
                        { value: "BOTELLA", label: "Botella Cerrada", subtitle: "Botellas selladas" },
                        { value: "LATA", label: "Lata", subtitle: "Latas de bebidas" },
                        { value: "GR", label: "Gramos (gr)", subtitle: "Sólidos e ingredientes" },
                        { value: "KG", label: "Kilos (kg)", subtitle: "Grandes volúmenes" },
                        { value: "FETA", label: "Feta", subtitle: "Láminas de queso/fiambre" },
                        { value: "PORCION", label: "Porción", subtitle: "Raciones" },
                      ]}
                      title="Unidad de Medida"
                      subtitle="Unidad de conteo del nuevo ítem"
                      placeholder="Unidad..."
                      icon={Boxes}
                    />
                  </div>

                  <div>
                    <label className="text-zinc-300 font-semibold block mb-1">
                      Cantidad Comprada ({purchNewUnit}) *
                    </label>
                    <input
                      type="number"
                      required
                      step="any"
                      min="0.1"
                      value={purchNewQty}
                      onChange={(e) => setPurchNewQty(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-300 font-semibold block mb-1">
                      Costo Unitario Gs. (por {purchNewUnit})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={purchNewCost}
                      onChange={(e) => setPurchNewCost(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-300 font-semibold block mb-1">Alerta Stock Mínimo ({purchNewUnit})</label>
                    <input
                      type="number"
                      step="any"
                      value={purchNewMinStock}
                      onChange={(e) => setPurchNewMinStock(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-300 font-semibold block mb-1">N° Factura / Proveedor / Motivo</label>
                    <input
                      required
                      placeholder="ej: Factura 001-003 Cervepar"
                      value={purchNewReason}
                      onChange={(e) => setPurchNewReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !purchNewName.trim()}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Nuevo Ítem e Ingresar Compra a Kardex</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* PESTAÑA 3: CONFIGURACIÓN DE RECETAS (BAR, COCINA Y COMBOS) */}
      {activeTab === "RECIPES" && (
        <div className="space-y-6">
          <div className="p-5 rounded-3xl bg-zinc-900/70 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-purple-400" />
                  <span>Configuración Técnica de Recetas y Fichas de Escandallo</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Asociá qué insumos o artículos descuenta cada producto del menú al venderse (tragos descuentan mililitros, combos descuentan unidades de artículos e insumos).
                </p>
              </div>

              {/* Filtro de tipos de receta */}
              <div className="flex rounded-xl bg-zinc-950 p-1 border border-white/10 text-xs font-bold">
                <button
                  onClick={() => setRecipeFilter("ALL")}
                  className={`px-3 py-1 rounded-lg ${recipeFilter === "ALL" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setRecipeFilter("BAR")}
                  className={`px-3 py-1 rounded-lg flex items-center gap-1 ${recipeFilter === "BAR" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"}`}
                >
                  <GlassWater className="w-3 h-3" />
                  <span>Barra / Tragos</span>
                </button>
                <button
                  onClick={() => setRecipeFilter("KITCHEN")}
                  className={`px-3 py-1 rounded-lg flex items-center gap-1 ${recipeFilter === "KITCHEN" ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-white"}`}
                >
                  <Flame className="w-3 h-3" />
                  <span>Cocina</span>
                </button>
                <button
                  onClick={() => setRecipeFilter("COMBO")}
                  className={`px-3 py-1 rounded-lg flex items-center gap-1 ${recipeFilter === "COMBO" ? "bg-pink-600 text-white" : "text-zinc-400 hover:text-white"}`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Combos</span>
                </button>
              </div>
            </div>

            {/* Formulario de Asociación de Receta */}
            <form onSubmit={handleLinkRecipe} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">
                  1. Producto del Menú a Configurar *
                </label>
                <VipSelectModal
                  value={recipeProductId}
                  onChange={(val) => setRecipeProductId(val)}
                  options={[
                    { value: "", label: "-- Seleccionar Producto --", subtitle: "Elegí el trago, plato o combo a configurar" },
                    ...filteredProductsForRecipes.map((p: any) => ({
                      value: p.id,
                      label: p.name,
                      subtitle: `${p.category?.name || "Menú"} • ${p.destination === "BAR" ? "Barra" : "Cocina"} • ${p.hasRecipe ? `${p.recipeItems?.length || 0} ingredientes` : "Sin receta"}`,
                      badge: p.destination === "BAR" ? "BARRA" : "COCINA",
                      badgeTone: p.destination === "BAR" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-amber-500/20 text-amber-300 border-amber-500/40",
                      icon: p.destination === "BAR" ? GlassWater : Utensils,
                    })),
                  ]}
                  title="Producto del Menú"
                  subtitle="Plato, bebida o combo de la carta"
                  placeholder="Elegir producto..."
                  icon={Utensils}
                  showSearch={filteredProductsForRecipes.length > 5}
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">
                  2. Insumo o Artículo que consume *
                </label>
                <VipSelectModal
                  value={recipeItemId}
                  onChange={(val) => {
                    setRecipeItemId(val);
                    const it = inventoryItems.find((i) => i.id === val);
                    if (it?.unit === "ML") setRecipeQty("50");
                    else if (it?.unit === "UN" || it?.unit === "LATA" || it?.unit === "BOTELLA") setRecipeQty("1");
                    else if (it?.unit === "GR") setRecipeQty("150");
                    else setRecipeQty("1");
                  }}
                  options={[
                    { value: "", label: "-- Insumo o Artículo --", subtitle: "Materia prima que se descontará" },
                    ...inventoryItems.map((i: any) => ({
                      value: i.id,
                      label: `${i.name} (${i.code})`,
                      subtitle: `Unidad: ${i.unit} • Stock: ${i.currentStock} • ${i.itemType === "ARTICLE" ? "Artículo" : "Insumo"}`,
                      badge: i.unit,
                      badgeTone: i.itemType === "ARTICLE" ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-purple-500/20 text-purple-300 border-purple-500/40",
                      icon: i.itemType === "ARTICLE" ? Package : Boxes,
                    })),
                  ]}
                  title="Insumo o Artículo para Receta"
                  subtitle="Materia prima que se descuenta al vender"
                  placeholder="Elegir insumo o artículo..."
                  icon={Boxes}
                  showSearch={inventoryItems.length > 5}
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">
                  3. Cantidad a Descontar {selectedRecipeItem ? `(${selectedRecipeItem.unit})` : ""} *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    step="any"
                    min="0.1"
                    value={recipeQty}
                    onChange={(e) => setRecipeQty(e.target.value)}
                    placeholder="ej: 50 (ml), 1 (un)"
                    className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white font-bold"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !recipeProductId || !recipeItemId}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold whitespace-nowrap shadow-md shadow-purple-600/30"
                  >
                    Asociar a Receta
                  </button>
                </div>
              </div>
            </form>

            {/* Helper explicativo contextual */}
            {selectedRecipeItem && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  {selectedRecipeItem.unit === "ML" ? (
                    <>
                      💡 <strong>Bebida fraccionada de bar:</strong> Al vender 1 unidad de este producto, se descontarán exactamente <strong>{recipeQty} mililitros (ml)</strong> del stock de <strong>{selectedRecipeItem.name}</strong>.
                    </>
                  ) : selectedRecipeItem.unit === "UN" || selectedRecipeItem.unit === "LATA" || selectedRecipeItem.unit === "BOTELLA" ? (
                    <>
                      💡 <strong>Artículo en unidades / combo:</strong> Al vender 1 unidad del combo o producto, se descontarán <strong>{recipeQty} unidad(es)</strong> del artículo <strong>{selectedRecipeItem.name}</strong>.
                    </>
                  ) : (
                    <>
                      💡 <strong>Ingrediente de cocina:</strong> Se descontarán <strong>{recipeQty} {selectedRecipeItem.unit}</strong> de <strong>{selectedRecipeItem.name}</strong> por cada plato preparado.
                    </>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Grilla de Recetas Configuradas */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Fichas Técnicas Configuradas ({productsWithRecipe.length} productos con receta)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productsWithRecipe.map((p: any) => {
                const isBar = p.destination === "BAR";
                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border space-y-3 transition ${
                      recipeProductId === p.id
                        ? "bg-purple-950/30 border-purple-400 ring-2 ring-purple-500/30"
                        : "bg-zinc-900/70 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {isBar ? (
                            <GlassWater className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <Flame className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span className="text-[10px] font-bold uppercase text-zinc-400">
                            {p.destination === "BAR" ? "Barra / Bebidas" : "Cocina"}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-white mt-0.5">{p.name}</h4>
                        <span className="text-[10px] font-mono text-zinc-500">{p.code} • {p.presentation || "Estándar"}</span>
                      </div>

                      <button
                        onClick={() => setRecipeProductId(p.id)}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300"
                        title="Seleccionar para agregar más insumos"
                      >
                        + Agregar
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Ingredientes & Artículos que descuenta por venta:
                      </span>
                      <ul className="space-y-1 text-xs">
                        {p.recipeItems.map((ri: any) => (
                          <li
                            key={ri.id}
                            className="p-1.5 rounded-lg bg-zinc-950/70 border border-white/5 flex items-center justify-between group hover:border-purple-500/30 transition"
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="text-zinc-300 font-medium truncate">• {ri.inventoryItem?.name}</span>
                              <span className="px-1.5 py-0.2 rounded bg-white/5 text-[9px] text-zinc-400 font-mono">
                                {ri.inventoryItem?.itemType === "ARTICLE" ? "ART" : "INS"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-bold text-emerald-400">
                                -{ri.quantityRequired} {ri.inventoryItem?.unit}
                              </span>
                              <button
                                onClick={() => handleRemoveRecipeItem(p.id, ri.inventoryItemId)}
                                className="text-zinc-500 hover:text-rose-400 p-0.5"
                                title="Quitar de la receta"
                              >
                                ✕
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: KARDEX / HISTORIAL DE MOVIMIENTOS */}
      {activeTab === "KARDEX" && (
        <div className="p-5 rounded-3xl bg-zinc-900/70 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>Kardex Oficial de Movimientos de Inventario</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Auditoría en tiempo real de todas las ventas de tragos (descuento en ml), ventas de combos (descuento en unidades), compras de reposición y ajustes manuales.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase text-zinc-400">
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">Tipo Movimiento</th>
                  <th className="py-2.5 px-3">Ítem / Insumo</th>
                  <th className="py-2.5 px-3">Variación (Delta)</th>
                  <th className="py-2.5 px-3">Stock Resultante</th>
                  <th className="py-2.5 px-3">Motivo / Pedido</th>
                  <th className="py-2.5 px-3">Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500">
                      No hay movimientos registrados todavía en el Kardex.
                    </td>
                  </tr>
                ) : (
                  movements.map((m: any) => {
                    const isPositive = m.quantityDelta > 0;
                    return (
                      <tr key={m.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-2.5 px-3 text-zinc-400 font-mono text-[11px]">
                          {new Date(m.createdAt).toLocaleString("es-PY")}
                        </td>
                        <td className="py-2.5 px-3">
                          {m.movementType === "SALE_DEDUCTION" ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                              <ArrowDownRight className="w-3 h-3 text-rose-400" />
                              <span>VENTA</span>
                            </span>
                          ) : m.movementType === "RESTOCK" ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                              <span>COMPRA / ENTRADA</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-300 text-[10px] font-bold">
                              {m.movementType}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-white">
                            {m.inventoryItem?.name || m.product?.name || "Ítem de stock"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                            {isPositive ? `+${m.quantityDelta}` : m.quantityDelta}{" "}
                            {m.inventoryItem?.unit || ""}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-300">
                          {m.newStock} {m.inventoryItem?.unit || ""}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300">
                          {m.reason || "Sin detalle"}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                          {m.performedByName || "Sistema Automático"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
