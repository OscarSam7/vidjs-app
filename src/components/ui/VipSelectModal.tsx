"use client";

import React, { useState } from "react";
import { ChevronDown, Check, X, Search } from "lucide-react";

export interface VipSelectOption {
  value: string;
  label: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconTone?: string;
}

export interface VipSelectModalProps {
  value: string;
  onChange: (value: string) => void;
  options: VipSelectOption[];
  title: string;
  subtitle?: string;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  showSearch?: boolean;
}

export function VipSelectModal({
  value,
  onChange,
  options,
  title,
  subtitle,
  placeholder = "Seleccionar...",
  icon: HeaderIcon,
  disabled = false,
  className = "",
  buttonClassName = "",
  showSearch = false,
}: VipSelectModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = options.find((o) => o.value === value) || options[0];
  const SelectedIcon = selectedOption?.icon;

  const filteredOptions = showSearch && search.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        (o.subtitle && o.subtitle.toLowerCase().includes(search.toLowerCase())) ||
        (o.badge && o.badge.toLowerCase().includes(search.toLowerCase()))
      )
    : options;

  return (
    <div className={`relative ${className}`}>
      {/* Botón Trigger Estilo VIP */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setSearch("");
          setIsOpen(true);
        }}
        className={`w-full min-w-0 px-3 py-2 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-800/90 hover:from-purple-950/60 hover:to-zinc-900 border border-purple-500/35 hover:border-purple-400 text-xs font-semibold text-white flex items-center justify-between gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {SelectedIcon && (
            <div
              className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                selectedOption?.iconTone || "bg-purple-500/20 text-purple-300 border-purple-500/40"
              }`}
            >
              <SelectedIcon className="w-3 h-3" />
            </div>
          )}
          <span className="truncate block font-bold text-slate-100">
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-purple-300 shrink-0" />
      </button>

      {/* Modal Oscuro VIP Centrado / Bottom Sheet Móvil */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-gradient-to-b from-[#0F172A] via-[#0B1120] to-zinc-950 border-t sm:border border-purple-500/35 shadow-[0_-10px_50px_rgba(139,92,246,0.25)] max-h-[85dvh] flex flex-col overflow-hidden"
          >
            {/* Header del Modal */}
            <div className="pt-2.5 sm:pt-4 px-5 pb-3.5 border-b border-white/10 bg-zinc-950/60 shrink-0 space-y-3">
              <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto sm:hidden" />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30 shrink-0">
                    {HeaderIcon ? (
                      <HeaderIcon className="w-5 h-5 text-white" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-white truncate">{title}</h3>
                    {subtitle && (
                      <p className="text-[11px] text-purple-300/90 font-semibold truncate">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  aria-label="Cerrar selector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Buscador opcional */}
              {showSearch && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-400"
                  />
                </div>
              )}
            </div>

            {/* Grid Elegante de Opciones */}
            <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredOptions.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-zinc-500">
                  No se encontraron resultados
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = value === opt.value;
                  const IconComp = opt.icon;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] ${
                        isSelected
                          ? "bg-gradient-to-r from-purple-950/90 via-indigo-950/70 to-zinc-900 border-2 border-purple-400 shadow-lg shadow-purple-500/25"
                          : "bg-zinc-900/80 hover:bg-zinc-800/90 border-white/10 hover:border-purple-400/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {IconComp && (
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? "bg-purple-600 text-white border-purple-300"
                                : opt.iconTone || "bg-zinc-800 text-zinc-300 border-zinc-700"
                            }`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-extrabold text-white truncate">
                            {opt.label}
                          </div>
                          {opt.subtitle && (
                            <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                              {opt.subtitle}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {opt.badge && (
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                              opt.badgeTone || "bg-purple-500/20 text-purple-300 border-purple-500/40"
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] font-bold text-purple-300 inline-flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Actual
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
