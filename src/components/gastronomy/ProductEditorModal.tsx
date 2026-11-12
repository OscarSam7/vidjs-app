"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  Image as ImageIcon,
  Wine,
  ChefHat,
  Sparkles,
  Loader2,
  Trash2,
  DollarSign,
  Package,
  Layers,
  Check,
} from "lucide-react";
import { VipSelectModal, VipSelectOption } from "@/components/ui/VipSelectModal";
import { GASTRO_AVAILABILITY_LABELS } from "@/lib/gastronomy/format";

export interface ProductEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  product?: any | null;
  categories: { id: string; name: string }[];
  defaultCategoryId?: string;
}

export function ProductEditorModal({
  isOpen,
  onClose,
  onSaved,
  product,
  categories,
  defaultCategoryId,
}: ProductEditorModalProps) {
  const isEditing = Boolean(product);

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
  const [isFeatured, setIsFeatured] = useState(false);
  const [optionsText, setOptionsText] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (product) {
      setCategoryId(product.categoryId || (categories[0]?.id ?? ""));
      setCode(product.code || "");
      setName(product.name || "");
      setDescription(product.description || "");
      setPresentation(product.presentation || "");
      setImageUrl(product.imageUrl || "");
      setPriceCents(product.priceCents ?? 25000);
      setCostCents(product.costCents ?? 10000);
      setStockQuantity(product.stockQuantity ?? 50);
      setMinStockQuantity(product.minStockQuantity ?? 10);
      setUnit(product.unit || "UN");
      setDestination(product.destination || "BAR");
      setAvailabilityStatus(product.availabilityStatus || "AVAILABLE");
      setIsFeatured(Boolean(product.isFeatured));

      try {
        const parsed = product.optionsJson ? JSON.parse(product.optionsJson) : [];
        setOptionsText(
          parsed.map((o: any) => `${o.name}:${o.priceCents}`).join(", ")
        );
      } catch {
        setOptionsText("");
      }
    } else {
      setCategoryId(defaultCategoryId || categories[0]?.id || "");
      setCode(`PRD-${Math.floor(100 + Math.random() * 900)}`);
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
      setIsFeatured(false);
      setOptionsText("");
    }
    setErrorMsg(null);
  }, [isOpen, product, categories, defaultCategoryId]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/v1/gastronomy/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Error al subir la imagen");
      }

      setImageUrl(json.url);
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo subir la foto seleccionada");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("El nombre del producto es obligatorio.");
      return;
    }
    if (!categoryId) {
      setErrorMsg("Debes seleccionar una categoría válida.");
      return;
    }

    setIsSaving(true);

    try {
      const parsedOptions = optionsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((pair, idx) => {
          const [optName, optPrice] = pair.split(":");
          return {
            id: `opt_${idx}_${(optName || "").toLowerCase().replace(/\s+/g, "_")}`,
            name: (optName || "").trim(),
            priceCents: Number(optPrice) || 0,
          };
        });

      const payload = {
        ...(isEditing ? { id: product.id } : {}),
        categoryId,
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
        presentation: presentation.trim() || null,
        imageUrl: imageUrl.trim() || null,
        priceCents: Number(priceCents),
        costCents: Number(costCents),
        stockQuantity: Number(stockQuantity),
        minStockQuantity: Number(minStockQuantity),
        unit,
        destination,
        availabilityStatus,
        isFeatured,
        optionsJson: parsedOptions.length > 0 ? JSON.stringify(parsedOptions) : null,
      };

      const res = await fetch("/api/v1/gastronomy/products", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Error al guardar el producto");
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error al guardar el producto");
    } finally {
      setIsSaving(false);
    }
  };

  // Opciones para VipSelectModal
  const categoryOptions: VipSelectOption[] = categories.map((c) => ({
    value: c.id,
    label: c.name,
    subtitle: "Categoría de la carta",
    icon: Layers,
  }));

  const destinationOptions: VipSelectOption[] = [
    {
      value: "BAR",
      label: "Barra de Tragos & Bebidas",
      subtitle: "Los pedidos van a la comanda de Barra",
      icon: Wine,
      iconTone: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    },
    {
      value: "KITCHEN",
      label: "Cocina & Gastronomía",
      subtitle: "Los pedidos van a la pantalla KDS de Cocina",
      icon: ChefHat,
      iconTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    },
    {
      value: "BOTH",
      label: "Mixto / Ambos Destinos",
      subtitle: "Requiere despacho coordinado de Barra y Cocina",
      icon: Sparkles,
      iconTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    },
  ];

  const availabilityOptions: VipSelectOption[] = Object.entries(GASTRO_AVAILABILITY_LABELS).map(
    ([val, cfg]) => ({
      value: val,
      label: cfg.label,
      subtitle:
        val === "AVAILABLE"
          ? "Visible y disponible para compra inmediata"
          : val === "MANUAL_DISABLED"
          ? "Oculto o bloqueado por decisión administrativa"
          : val === "AUTO_EXHAUSTED"
          ? "Sin existencias en inventario"
          : "Estado operacional transitorio",
      badge: val === "AVAILABLE" ? "Activo" : "Pausado",
      badgeTone: cfg.color,
    })
  );

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0B132B] border border-purple-500/35 rounded-3xl max-w-3xl w-full p-5 sm:p-7 space-y-5 my-auto max-h-[92vh] overflow-y-auto shadow-2xl shadow-purple-950/40">
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {isEditing ? `Editar Producto: ${product.name}` : "Nuevo Producto Gastronómico"}
              </h2>
              <p className="text-xs text-purple-300/80">
                Configura foto, detalles, precios, stock y visibilidad en el menú digital.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 font-bold text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5 text-xs">
          {/* SECCIÓN 1: FOTO DEL PRODUCTO */}
          <div className="p-4 rounded-2xl bg-[#080F1F] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-purple-300 tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>Foto del Producto</span>
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="text-[11px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Quitar foto
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* Preview */}
              <div className="w-28 h-28 rounded-2xl bg-zinc-900 border border-purple-500/30 overflow-hidden relative flex items-center justify-center shrink-0 shadow-inner">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-2 text-zinc-500">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <span className="text-[10px] block">Sin foto</span>
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  </div>
                )}
              </div>

              {/* Botones de subida y URL */}
              <div className="flex-1 w-full space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold flex items-center gap-2 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>Subir Foto del Dispositivo</span>
                  </button>

                  <span className="text-[11px] text-zinc-400">o pegar enlace:</span>
                </div>

                <input
                  type="url"
                  placeholder="https://ejemplo.com/foto-producto.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: INFORMACIÓN BÁSICA Y SELECTORES VIP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Código SKU / Interno *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                placeholder="BEB-001"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-purple-300 font-mono font-bold focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Nombre del Producto *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ej: Gin Tonic Clásico, Hamburguesa Smash..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-bold focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Categoría del Menú *
              </label>
              <VipSelectModal
                value={categoryId}
                onChange={setCategoryId}
                options={categoryOptions}
                title="Selecciona la Categoría"
                subtitle="Organización del Menú Digital y Despacho"
                icon={Layers}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Destino Operativo *
              </label>
              <VipSelectModal
                value={destination}
                onChange={(val) => setDestination(val as any)}
                options={destinationOptions}
                title="Destino Operativo del Producto"
                subtitle="Lugar de preparación y despacho"
                icon={Wine}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Presentación / Medida
              </label>
              <input
                type="text"
                value={presentation}
                onChange={(e) => setPresentation(e.target.value)}
                placeholder="Ej: Vaso 500ml, Porción 350g, Botella 750ml"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Estado de Disponibilidad
              </label>
              <VipSelectModal
                value={availabilityStatus}
                onChange={setAvailabilityStatus}
                options={availabilityOptions}
                title="Estado de Disponibilidad del Producto"
                subtitle="Control de habilitación en el Menú Digital"
                icon={Sparkles}
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Descripción para el Cliente (Visible en Menú Digital)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ingredientes, preparación especial, notas de cata..."
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* SECCIÓN 3: PRECIOS, COSTOS Y STOCK */}
          <div className="p-4 rounded-2xl bg-[#080F1F] border border-white/10 space-y-3">
            <div className="text-xs font-black uppercase text-emerald-300 tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Precios, Costos y Stock</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Precio de Venta (Gs.) *
                </label>
                <input
                  type="number"
                  value={priceCents}
                  onChange={(e) => setPriceCents(Number(e.target.value))}
                  required
                  step={500}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-emerald-300 font-mono font-black focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Costo de Compra (Gs.)
                </label>
                <input
                  type="number"
                  value={costCents}
                  onChange={(e) => setCostCents(Number(e.target.value))}
                  step={500}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-slate-300 font-mono focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Existencia Actual
                </label>
                <input
                  type="number"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  value={minStockQuantity}
                  onChange={(e) => setMinStockQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-amber-300 font-mono focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: ADICIONALES Y DESTACADO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Opciones Adicionales / Extras
              </label>
              <input
                type="text"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Ej: Extra Queso:5000, Bacon:8000, Salsa Especial:3000"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-purple-400"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Formato: Nombre:Precio, Nombre:Precio (separados por coma)
              </span>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-2xl bg-zinc-900 border border-white/10 hover:border-amber-400/50 transition-colors">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Producto Destacado
                </span>
              </label>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 font-bold cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEditing ? "Actualizar Producto" : "Crear Producto"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
