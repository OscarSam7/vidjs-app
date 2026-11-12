"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  UtensilsCrossed,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  Sparkles,
  MapPin,
  RefreshCw,
  AlertCircle,
  Search,
  ChevronDown,
  Users,
  X,
  Check,
} from "lucide-react";
import {
  formatGuaranies,
  ORDER_STATUS_LABELS,
  DELIVERY_MODE_LABELS,
} from "@/lib/gastronomy/format";
import { useRealtime } from "@/hooks/use-realtime";

interface ExtraOption {
  id: string;
  name: string;
  priceCents: number;
}

interface CartItem {
  cartItemId: string;
  product: any;
  quantity: number;
  selectedExtras: ExtraOption[];
  observations: string;
}

function parseOptions(optionsJson: any): ExtraOption[] {
  if (!optionsJson) return [];
  try {
    const parsed = typeof optionsJson === "string" ? JSON.parse(optionsJson) : optionsJson;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((o: any, idx: number) => ({
      id: o.id || `opt-${idx}`,
      name: o.name || "Adicional",
      priceCents: Number(o.priceCents ?? o.priceGs ?? 0),
    }));
  } catch {
    return [];
  }
}

function CustomerMenuPwaContent() {
  const searchParams = useSearchParams();
  const [menuData, setMenuData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Session Identification (A. QR Mesa or B. Código / Enlace del establecimiento)
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [tableNumberText, setTableNumberText] = useState<string>("Mesa 1");
  const [sectorName, setSectorName] = useState<string>("Salón Principal");
  const [sessionCode, setSessionCode] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [selectedDepositId, setSelectedDepositId] = useState<string>("");

  // Product Customization Modal
  const [customizingProduct, setCustomizingProduct] = useState<any>(null);
  const [customQty, setCustomQty] = useState<number>(1);
  const [customObservations, setCustomObservations] = useState<string>("");
  const [customExtras, setCustomExtras] = useState<ExtraOption[]>([]);

  // Cart & Checkout
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<string>("WAITER_DELIVERY");
  const [paymentMethodSelected, setPaymentMethodSelected] = useState<string>("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Tracked Orders in this session
  const [trackedOrders, setTrackedOrders] = useState<any[]>([]);

  // VIP Table Picker Modal (replaces native mobile <select>)
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [tableSectorFilter, setTableSectorFilter] = useState<string>("ALL");

  const loadPublicMenu = useCallback(
    async (currentQrToken?: string, currentTableParam?: string, explicitTableId?: string) => {
      try {
        const qs = new URLSearchParams();
        const qrT = currentQrToken || searchParams.get("qrToken") || "";
        const tblId = explicitTableId || selectedTableId || searchParams.get("tableId") || "";
        const tbl = currentTableParam || searchParams.get("table") || "";
        const slug = searchParams.get("slug") || "";
        if (qrT) qs.set("qrToken", qrT);
        if (tblId) qs.set("tableId", tblId);
        if (tbl) qs.set("table", tbl);
        if (slug) qs.set("slug", slug);

        const res = await fetch(`/api/v1/gastronomy/public/menu?${qs.toString()}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          setMenuData(json);

          if (json.sessionInfo?.table) {
            setSelectedTableId((prev) => explicitTableId || prev || json.sessionInfo.table.id);
            setTableNumberText(
              json.sessionInfo.table.label || `Mesa ${json.sessionInfo.table.number}`
            );
            setSectorName(json.sessionInfo.table.sectorName || "Salón principal");
          }
          if (json.sessionInfo?.sessionCode) {
            setSessionCode((prev) => prev || json.sessionInfo.sessionCode);
          }

          const cfg = json.deliveryConfig || {};
          const modes: string[] = [];
          if (cfg.barPickupEnabled !== false) modes.push("BAR_PICKUP");
          if (cfg.waiterDeliveryEnabled !== false) modes.push("WAITER_DELIVERY");

          if (modes.length > 0 && !modes.includes(deliveryMode)) {
            setDeliveryMode(cfg.defaultDeliveryMode || modes[0]);
          }

          if (json.activeOrders) {
            setTrackedOrders(json.activeOrders);
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [searchParams, deliveryMode, selectedTableId]
  );

  useEffect(() => {
    const qrTable = searchParams.get("table") || searchParams.get("mesa");
    const qrSector = searchParams.get("sector") || searchParams.get("zone");
    const qrTableId = searchParams.get("tableId");

    if (qrTable) setTableNumberText(qrTable.startsWith("Mesa") ? qrTable : `Mesa ${qrTable}`);
    if (qrSector && qrSector !== "DJ" && qrSector !== "KARAOKE") setSectorName(qrSector);
    if (qrTableId) setSelectedTableId(qrTableId);

    loadPublicMenu(undefined, undefined, qrTableId || undefined);
  }, [searchParams, loadPublicMenu]);

  useRealtime({
    eventId: "global",
    onEvent: (type) => {
      if (type.startsWith("GASTRO_")) {
        loadPublicMenu();
      }
    },
  });

  const openProductModal = (product: any) => {
    setCustomizingProduct(product);
    setCustomQty(1);
    setCustomObservations("");
    setCustomExtras([]);
  };

  const toggleExtra = (extra: ExtraOption) => {
    setCustomExtras((prev) =>
      prev.some((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const addToCart = () => {
    if (!customizingProduct) return;
    const newItem: CartItem = {
      cartItemId: `${customizingProduct.id}-${Date.now()}-${Math.random()}`,
      product: customizingProduct,
      quantity: customQty,
      selectedExtras: customExtras,
      observations: customObservations.trim(),
    };
    setCart((prev) => [...prev, newItem]);
    setCustomizingProduct(null);
  };

  const updateCartQty = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleTableSelectChange = (tableId: string) => {
    setSelectedTableId(tableId);
    const found = (menuData?.tables || []).find((t: any) => t.id === tableId);
    if (found) {
      setTableNumberText(found.label || `Mesa ${found.number}`);
      setSectorName(found.sectorName || "Salón principal");
      loadPublicMenu(found.qrToken, undefined, tableId);
    }
  };

  const cfg = menuData?.deliveryConfig || {
    barPickupEnabled: true,
    waiterDeliveryEnabled: true,
    serviceFeeCents: 0,
  };
  const availableModes: string[] = [];
  if (cfg.barPickupEnabled !== false) availableModes.push("BAR_PICKUP");
  if (cfg.waiterDeliveryEnabled !== false) availableModes.push("WAITER_DELIVERY");

  const serviceFeeCents =
    deliveryMode === "WAITER_DELIVERY" ? Number(cfg.serviceFeeCents || 0) : 0;

  const cartSubtotalCents = cart.reduce((acc, item) => {
    const extrasSum = item.selectedExtras.reduce((s, e) => s + (e.priceCents || 0), 0);
    return acc + ((item.product.priceCents || 0) + extrasSum) * item.quantity;
  }, 0);

  const cartTotalCents = Math.max(0, cartSubtotalCents + serviceFeeCents);

  const handleConfirmOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/gastronomy/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: menuData?.establishment?.tenantId,
          venueId: menuData?.establishment?.venueId,
          tableId: selectedTableId || undefined,
          tableLabel: tableNumberText,
          sectorName,
          sessionCode,
          customerName: customerName.trim() || "Cliente QR",
          deliveryMode,
          paymentMethodSelected,
          depositIdToApply: selectedDepositId || undefined,
          items: cart.map((c) => ({
            productId: c.product.id,
            quantity: c.quantity,
            selectedOptions: c.selectedExtras,
            observations: c.observations,
          })),
        }),
      });
      const json = await res.json();
      if (res.ok && json.order) {
        setCart([]);
        setCartOpen(false);
        setTrackedOrders((prev) => [json.order, ...prev]);
        await loadPublicMenu();
      } else {
        setErrorMsg(json.error?.message || "No se pudo confirmar el pedido");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !menuData) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mb-3" />
        <p className="text-sm text-zinc-400">Cargando Menú Digital VIDJSPRO...</p>
      </div>
    );
  }

  const categories: any[] = menuData?.categories || [];
  const allProducts: any[] = (menuData?.products || []).map((p: any) => ({
    ...p,
    categoryName: p.category?.name || "General",
  }));

  const visibleProducts = allProducts.filter((p) => {
    const matchesCat = activeCategoryId === "ALL" || p.categoryId === activeCategoryId;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.categoryName || "").toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const customizingOptions = customizingProduct
    ? parseOptions(customizingProduct.optionsJson)
    : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-28">
      {/* Header Identification Banner (Establishment, Sector, Table, Session Code) */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/25">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">
                  {menuData?.establishment?.name || "VIDJSPRO Gastronomía"}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
                  Menú en Vivo
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-0.5">
                <span className="inline-flex items-center gap-1 text-purple-300 font-medium">
                  <MapPin className="w-3 h-3" />
                  {sectorName}
                </span>
                <span>•</span>
                <span className="font-semibold text-white">{tableNumberText}</span>
                <span>•</span>
                <span className="font-mono text-[11px] text-zinc-400">
                  Sesión: {sessionCode}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {menuData?.tables?.length > 0 && (
              <button
                type="button"
                onClick={() => setTablePickerOpen(true)}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-800/90 hover:from-purple-950/60 hover:to-zinc-900 border border-purple-500/40 hover:border-purple-400 text-xs font-bold text-white flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 max-w-[180px] sm:max-w-[230px]"
                title="Cambiar de mesa o sector"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">{tableNumberText}</span>
                <ChevronDown className="w-3.5 h-3.5 text-purple-300 shrink-0" />
              </button>
            )}

            <button
              onClick={() => setCartOpen(true)}
              className="relative px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/20"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Carrito</span>
              {cart.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-white text-purple-900 text-[10px] font-extrabold">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Navegación Principal: "Mi Noche" y "Menú" uno al lado del otro */}
      <div className="border-b border-zinc-800/90 bg-zinc-950/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto grid grid-cols-2 gap-2.5 px-4 py-2.5">
          <a
            href="/guest"
            className="relative group py-3 px-3.5 rounded-2xl border-2 border-purple-500/60 bg-gradient-to-br from-purple-950/70 via-indigo-950/50 to-zinc-950 text-white hover:border-purple-400 transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/30 shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <span className="text-sm sm:text-base font-black tracking-tight text-white block truncate">
                Mi Noche
              </span>
              <span className="text-[10px] font-bold text-purple-300/90 block truncate">
                Catálogo y Mis Pedidos
              </span>
            </div>
          </a>

          <div className="relative py-3 px-3.5 rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-950/90 via-teal-950/80 to-zinc-950 text-white shadow-[0_0_24px_rgba(16,185,129,0.35)] flex items-center justify-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/40 shrink-0">
              <UtensilsCrossed className="w-6 h-6 text-zinc-950 stroke-[2.5]" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-sm sm:text-base font-black tracking-tight text-emerald-300 truncate">
                  Menú
                </span>
                <span className="text-sm leading-none">🍹🍔</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400/90 block truncate">
                Carta Digital Activa
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 pt-4 space-y-6">
        {/* Live Order Tracker Banner */}
        {trackedOrders.length > 0 && (
          <section className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/60 to-zinc-900 border border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Seguimiento de tus Pedidos en Tiempo Real ({trackedOrders.length})
              </h2>
              <button
                onClick={() => loadPublicMenu()}
                className="text-xs text-purple-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Actualizar
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {trackedOrders.map((ord: any) => (
                <div
                  key={ord.id}
                  className="p-3.5 rounded-xl bg-zinc-950/90 border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-purple-300">
                      {ord.orderNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          ord.paymentStatus === "APPROVED"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        }`}
                      >
                        {ord.paymentStatus === "APPROVED" ? "Pago Confirmado" : "Pend. Pago en Caja"}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 text-[11px] font-semibold border border-purple-500/30">
                        {ORDER_STATUS_LABELS[ord.status] || ord.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>
                      {ord.tableLabel} ({ord.sectorName}) •{" "}
                      {DELIVERY_MODE_LABELS[ord.deliveryMode] || ord.deliveryMode}
                    </span>
                    <span className="font-bold text-emerald-400">
                      {formatGuaranies(ord.totalCents)}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-300">
                    {(ord.items || [])
                      .map((it: any) => `${it.quantity}x ${it.productName}`)
                      .join(" • ")}
                  </div>
                  {ord.status === "WAITING_PICKUP" && (
                    <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center animate-pulse">
                      ¡Tu pedido está listo para retirar en Barra!
                    </div>
                  )}
                  {ord.assignedWaiterName && (
                    <div className="text-[11px] text-emerald-400">
                      Atendido por mozo: {ord.assignedWaiterName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Search & Category Horizontal Scroll */}
        <section className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cervezas, tragos, hamburguesas, pizzas, picadas..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-900 border border-white/10 text-sm text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setActiveCategoryId("ALL")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition ${
                activeCategoryId === "ALL"
                  ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20"
                  : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              Todo el Menú ({allProducts.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition flex items-center gap-1.5 ${
                  activeCategoryId === cat.id
                    ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20"
                    : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Product Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-2xl bg-zinc-900/80 border border-white/10 overflow-hidden flex flex-col justify-between hover:border-purple-500/40 transition"
            >
              <div>
                <div className="relative h-44 bg-zinc-950 overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      🍹
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-zinc-950/80 backdrop-blur-md text-[10px] font-semibold text-zinc-200 border border-white/10">
                    {product.presentation || "Unidad"}
                  </div>
                  <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-emerald-500/90 text-zinc-950 text-[10px] font-extrabold">
                    Disponible
                  </div>
                </div>

                <div className="p-4 space-y-1.5">
                  <div className="text-[11px] text-purple-400 font-medium">
                    {product.categoryName}
                  </div>
                  <h3 className="text-base font-bold text-white">{product.name}</h3>
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {product.description || "Preparado al momento con ingredientes seleccionados."}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0 flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-zinc-400 block">Precio</span>
                  <span className="text-lg font-extrabold text-emerald-400">
                    {formatGuaranies(product.priceCents)}
                  </span>
                </div>
                <button
                  onClick={() => openProductModal(product)}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* Product Customization Modal */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-zinc-900 border border-white/15 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs text-purple-400 font-semibold">
                  {customizingProduct.presentation || "Presentación Estándar"}
                </span>
                <h3 className="text-lg font-bold text-white">{customizingProduct.name}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">{customizingProduct.description}</p>
              </div>
              <button
                onClick={() => setCustomizingProduct(null)}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 text-xs"
              >
                Cerrar
              </button>
            </div>

            {customizingOptions.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Opciones Adicionales:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {customizingOptions.map((opt) => {
                    const checked = customExtras.some((e) => e.id === opt.id);
                    return (
                      <label
                        key={opt.id}
                        onClick={() => toggleExtra(opt)}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition ${
                          checked
                            ? "bg-purple-600/20 border-purple-500 text-white"
                            : "bg-zinc-950 border-white/10 text-zinc-300"
                        }`}
                      >
                        <span>{opt.name}</span>
                        <span className="font-bold text-emerald-400">
                          +{formatGuaranies(opt.priceCents)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Observaciones especiales (opcional):
              </label>
              <input
                value={customObservations}
                onChange={(e) => setCustomObservations(e.target.value)}
                placeholder="Ej: bien fría, sin hielo, punto medio, sin cebolla..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-white/10">
              <span className="text-xs font-semibold text-zinc-300">Cantidad</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCustomQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-base font-bold text-white w-6 text-center">{customQty}</span>
                <button
                  type="button"
                  onClick={() => setCustomQty((q) => q + 1)}
                  className="w-8 h-8 rounded-lg bg-purple-600 hover:bg-purple-500 flex items-center justify-center text-white"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={addToCart}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
            >
              <ShoppingCart className="w-4 h-4" />
              Agregar al Pedido —{" "}
              {formatGuaranies(
                ((customizingProduct.priceCents || 0) +
                  customExtras.reduce((s, e) => s + (e.priceCents || 0), 0)) *
                  customQty
              )}
            </button>
          </div>
        </div>
      )}

      {/* Cart & Checkout Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-zinc-900 border-l border-white/10 h-full flex flex-col justify-between p-5 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-purple-400" />
                    Tu Carrito ({tableNumberText})
                  </h2>
                  <p className="text-xs text-zinc-400">{sectorName}</p>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="px-3 py-1 rounded-lg bg-zinc-800 text-xs text-zinc-300"
                >
                  Seguir viendo
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  Tu carrito está vacío. Agregá bebidas o platos desde el menú.
                </div>
              ) : (
                <>
                  <div className="space-y-2.5">
                    {cart.map((item) => {
                      const extrasSum = item.selectedExtras.reduce(
                        (s, e) => s + (e.priceCents || 0),
                        0
                      );
                      const lineTotal = ((item.product.priceCents || 0) + extrasSum) * item.quantity;
                      return (
                        <div
                          key={item.cartItemId}
                          className="p-3 rounded-xl bg-zinc-950 border border-white/10 space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-white">
                                {item.product.name}
                              </div>
                              {item.selectedExtras.length > 0 && (
                                <div className="text-[11px] text-purple-300">
                                  Adicionales:{" "}
                                  {item.selectedExtras.map((e) => e.name).join(", ")}
                                </div>
                              )}
                              {item.observations && (
                                <div className="text-[11px] text-amber-300">
                                  Obs: {item.observations}
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-bold text-emerald-400">
                              {formatGuaranies(lineTotal)}
                            </span>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => updateCartQty(item.cartItemId, -1)}
                              className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQty(item.cartItemId, 1)}
                              className="w-6 h-6 rounded bg-purple-600 flex items-center justify-center text-xs"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Customer Info & Deposit */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Tu nombre (opcional)"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
                    />
                    {menuData?.availableDeposits?.length > 0 && (
                      <select
                        value={selectedDepositId}
                        onChange={(e) => setSelectedDepositId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-emerald-500/30 text-xs text-emerald-300"
                      >
                        <option value="">-- Aplicar Seña Disponible (Opcional) --</option>
                        {menuData.availableDeposits.map((d: any) => (
                          <option key={d.id} value={d.id}>
                            {d.depositCode} ({formatGuaranies(d.remainingCreditCents)} disponible)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Delivery Mode Selector (Only displays enabled modes from Fase 3) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      Modalidad de Entrega:
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {availableModes.includes("WAITER_DELIVERY") && (
                        <button
                          type="button"
                          onClick={() => setDeliveryMode("WAITER_DELIVERY")}
                          className={`p-3 rounded-xl border text-left text-xs flex items-center justify-between ${
                            deliveryMode === "WAITER_DELIVERY"
                              ? "bg-purple-600/25 border-purple-500 text-white"
                              : "bg-zinc-950 border-white/10 text-zinc-400"
                          }`}
                        >
                          <span>🤵 Entrega por Mozo en {tableNumberText}</span>
                          <span className="font-semibold">
                            {cfg.serviceFeeCents > 0
                              ? `+${formatGuaranies(cfg.serviceFeeCents)}`
                              : "Sin cargo"}
                          </span>
                        </button>
                      )}
                      {availableModes.includes("BAR_PICKUP") && (
                        <button
                          type="button"
                          onClick={() => setDeliveryMode("BAR_PICKUP")}
                          className={`p-3 rounded-xl border text-left text-xs flex items-center justify-between ${
                            deliveryMode === "BAR_PICKUP"
                              ? "bg-purple-600/25 border-purple-500 text-white"
                              : "bg-zinc-950 border-white/10 text-zinc-400"
                          }`}
                        >
                          <span>🍸 Retiro en Barra (Notificación en pantalla)</span>
                          <span className="font-semibold text-emerald-400">Gratis</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      Medio de Pago Preferido:
                    </label>
                    <select
                      value={paymentMethodSelected}
                      onChange={(e) => setPaymentMethodSelected(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
                    >
                      <option value="CASH">Efectivo (Pagar en Caja / Mozo)</option>
                      <option value="QR_PAYMENT">QR de Pago Interoperable</option>
                      <option value="DEBIT_CARD">Tarjeta de Débito (POS)</option>
                      <option value="CREDIT_CARD">Tarjeta de Crédito (POS)</option>
                      <option value="BANK_TRANSFER">Transferencia Bancaria SIPAP</option>
                      <option value="PIX">PIX Instantáneo</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Cart Totals & CONFIRMAR PEDIDO Button */}
            {cart.length > 0 && (
              <div className="pt-4 border-t border-white/10 space-y-3 mt-4">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal productos</span>
                    <span>{formatGuaranies(cartSubtotalCents)}</span>
                  </div>
                  {serviceFeeCents > 0 && (
                    <div className="flex justify-between text-zinc-400">
                      <span>Servicio de entrega en mesa</span>
                      <span>{formatGuaranies(serviceFeeCents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-extrabold text-white pt-1">
                    <span>Total del Pedido</span>
                    <span className="text-emerald-400">{formatGuaranies(cartTotalCents)}</span>
                  </div>
                </div>

                <button
                  onClick={handleConfirmOrder}
                  disabled={submitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-zinc-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {submitting ? "Confirmando..." : "CONFIRMAR PEDIDO"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Elegante VIP de Selección de Mesa y Sector */}
      {tablePickerOpen && menuData?.tables?.length > 0 && (() => {
        const tablesList: any[] = menuData.tables || [];
        const uniqueSectors = Array.from(
          new Set(tablesList.map((t: any) => t.sectorName || "Salón principal"))
        );
        const filteredTables = tablesList.filter(
          (t: any) => tableSectorFilter === "ALL" || (t.sectorName || "Salón principal") === tableSectorFilter
        );
        const availableCount = tablesList.filter((t: any) => t.tableStatus === "AVAILABLE").length;

        return (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setTablePickerOpen(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-gradient-to-b from-[#0F172A] via-[#0B1120] to-zinc-950 border-t sm:border border-purple-500/35 shadow-[0_-10px_50px_rgba(139,92,246,0.25)] max-h-[86dvh] flex flex-col overflow-hidden"
            >
              {/* Drag indicator mobile + Header */}
              <div className="pt-2.5 sm:pt-4 px-5 pb-3.5 border-b border-white/10 bg-zinc-950/60 shrink-0 space-y-3">
                <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto sm:hidden" />
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30 shrink-0">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-white truncate">
                        Elige tu Mesa y Sector
                      </h3>
                      <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>
                          {availableCount} mesas disponibles de {tablesList.length}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTablePickerOpen(false)}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    aria-label="Cerrar selector de mesas"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Filtros por Sector */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => setTableSectorFilter("ALL")}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 border transition-all cursor-pointer ${
                      tableSectorFilter === "ALL"
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400/50 shadow-md shadow-purple-600/25"
                        : "bg-zinc-900/90 text-zinc-400 border-white/10 hover:text-white"
                    }`}
                  >
                    Todos ({tablesList.length})
                  </button>
                  {uniqueSectors.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setTableSectorFilter(sec)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 border transition-all cursor-pointer ${
                        tableSectorFilter === sec
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400/50 shadow-md shadow-purple-600/25"
                          : "bg-zinc-900/90 text-zinc-400 border-white/10 hover:text-white"
                      }`}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid elegante de tarjetas de mesas */}
              <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[...filteredTables]
                  .sort((a: any, b: any) => {
                    const aAv = a.tableStatus === "AVAILABLE" ? 0 : 1;
                    const bAv = b.tableStatus === "AVAILABLE" ? 0 : 1;
                    if (aAv !== bAv) return aAv - bAv;
                    return (a.number || 0) - (b.number || 0);
                  })
                  .map((t: any) => {
                    const isSelected = selectedTableId === t.id;
                    const isAvailable = t.tableStatus === "AVAILABLE";

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          handleTableSelectChange(t.id);
                          setTablePickerOpen(false);
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] ${
                          isSelected
                            ? "bg-gradient-to-r from-purple-950/90 via-indigo-950/70 to-zinc-900 border-2 border-purple-400 shadow-lg shadow-purple-500/25"
                            : isAvailable
                            ? "bg-zinc-900/80 hover:bg-zinc-800/90 border-emerald-500/30 hover:border-emerald-400/60"
                            : "bg-zinc-950/70 hover:bg-zinc-900/80 border-white/10 opacity-80"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 border ${
                              isSelected
                                ? "bg-purple-600 text-white border-purple-300"
                                : isAvailable
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                                : "bg-zinc-900 text-zinc-400 border-zinc-800"
                            }`}
                          >
                            #{t.number}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-extrabold text-white truncate">
                              {t.label || `Mesa ${t.number}`}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                              <span className="inline-flex items-center gap-1 text-purple-300 font-medium truncate">
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{t.sectorName || "Salón principal"}</span>
                              </span>
                              {t.capacity && (
                                <span className="inline-flex items-center gap-0.5 text-zinc-500 shrink-0">
                                  <Users className="w-2.5 h-2.5" />
                                  {t.capacity}p
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                              isAvailable
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            }`}
                          >
                            {isAvailable ? "Disponible" : "Ocupada"}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-purple-300 inline-flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Actual
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Bottom Cart Bar on Mobile */}
      {cart.length > 0 && !cartOpen && (
        <div className="fixed bottom-4 inset-x-4 z-40 max-w-lg mx-auto">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-2xl shadow-purple-900/50 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-xl bg-white/20 text-xs font-extrabold">
                {cart.reduce((s, i) => s + i.quantity, 0)} ítems
              </span>
              <span className="text-sm font-bold">Ver Carrito y Confirmar Pedido</span>
            </div>
            <span className="text-sm font-extrabold">{formatGuaranies(cartTotalCents)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function CustomerMenuPwaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
          Cargando Menú Digital...
        </div>
      }
    >
      <CustomerMenuPwaContent />
    </Suspense>
  );
}
