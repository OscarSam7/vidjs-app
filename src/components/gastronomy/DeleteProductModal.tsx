"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";

export interface DeleteProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
  product: { id: string; name: string; code: string } | null;
}

export function DeleteProductModal({
  isOpen,
  onClose,
  onDeleted,
  product,
}: DeleteProductModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/gastronomy/products?id=${product.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Error al eliminar el producto");
      }

      onDeleted();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo eliminar el producto");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0B132B] border border-red-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl shadow-red-950/50">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-black text-white">¿Eliminar producto del menú?</h3>
          <p className="text-xs text-slate-300">
            Estás a punto de eliminar <span className="font-bold text-white">"{product.name}"</span> ({product.code}).
          </p>
          <p className="text-[11px] text-slate-400">
            Si el producto posee ventas o pedidos históricos registrados, se archivará y desactivará automáticamente sin corromper la contabilidad histórica. Si no tiene pedidos, se borrará definitivamente.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 text-xs font-bold"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-red-600/30 disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Confirmar Eliminación</span>
          </button>
        </div>
      </div>
    </div>
  );
}
