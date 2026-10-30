"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (tabId: string) => void;
  variant?: "pills" | "deckA" | "deckB" | "underline";
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
  fullWidth?: boolean;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  value,
  onChange,
  variant = "pills",
  size = "md",
  className,
  ariaLabel = "Pestañas de navegación",
  fullWidth = false,
}) => {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Manejador accesible de navegación por teclado (WAI-ARIA Tablist Pattern)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const enabledItems = items.filter((item) => !item.disabled);
    const enabledCurrentIndex = enabledItems.findIndex((item) => item.id === items[currentIndex].id);

    let nextTab: TabItem | undefined;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        nextTab = enabledItems[(enabledCurrentIndex + 1) % enabledItems.length];
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        nextTab = enabledItems[(enabledCurrentIndex - 1 + enabledItems.length) % enabledItems.length];
        break;
      case "Home":
        e.preventDefault();
        nextTab = enabledItems[0];
        break;
      case "End":
        e.preventDefault();
        nextTab = enabledItems[enabledItems.length - 1];
        break;
      default:
        return;
    }

    if (nextTab) {
      onChange(nextTab.id);
      const buttonEl = tabRefs.current.get(nextTab.id);
      buttonEl?.focus();
    }
  };

  const sizeClasses = {
    sm: "text-xs py-1.5 px-3 gap-1.5",
    md: "text-xs sm:text-sm py-2 px-3.5 gap-2",
  };

  if (variant === "underline") {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          "flex items-center gap-1 border-b border-navy-700 overflow-x-auto no-scrollbar",
          fullWidth && "w-full justify-between",
          className
        )}
      >
        {items.map((tab, idx) => {
          const isSelected = tab.id === value;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
                else tabRefs.current.delete(tab.id);
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`tabpanel-${tab.id}`}
              aria-disabled={tab.disabled}
              disabled={tab.disabled}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => !tab.disabled && onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={cn(
                "relative flex items-center font-medium transition-all duration-150 select-none cursor-pointer border-b-2 -mb-px outline-none",
                sizeClasses[size],
                isSelected
                  ? "border-saas-primary text-white font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-navy-600",
                tab.disabled && "opacity-40 cursor-not-allowed pointer-events-none",
                "focus-visible:ring-2 focus-visible:ring-saas-primary focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950 rounded-t-lg"
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span className="truncate">{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-mono",
                    isSelected
                      ? "bg-purple-900/60 text-purple-200 border border-purple-700/50"
                      : "bg-navy-800 text-slate-400 border border-navy-700"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Estilos según la variante activa
  const getActiveTabClasses = () => {
    switch (variant) {
      case "deckA":
        return "bg-purple-950/70 text-purple-200 border-purple-600/50 shadow-sm shadow-purple-950/40";
      case "deckB":
        return "bg-cyan-950/70 text-cyan-200 border-cyan-600/50 shadow-sm shadow-cyan-950/40";
      case "pills":
      default:
        return "bg-navy-750 text-white border-navy-600/70 shadow-sm shadow-black/40";
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 p-1 rounded-xl bg-navy-900 border border-navy-700 overflow-x-auto max-w-full",
        fullWidth && "w-full justify-between",
        className
      )}
    >
      {items.map((tab, idx) => {
        const isSelected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
              else tabRefs.current.delete(tab.id);
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isSelected}
            aria-controls={`tabpanel-${tab.id}`}
            aria-disabled={tab.disabled}
            disabled={tab.disabled}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => !tab.disabled && onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              "relative flex items-center justify-center font-medium rounded-lg transition-all duration-150 select-none cursor-pointer border outline-none",
              sizeClasses[size],
              fullWidth && "flex-1",
              isSelected
                ? getActiveTabClasses()
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-navy-800/60",
              tab.disabled && "opacity-40 cursor-not-allowed pointer-events-none",
              "focus-visible:ring-2 focus-visible:ring-saas-primary focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span className="truncate">{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none",
                  isSelected
                    ? "bg-navy-950/80 text-white border border-white/10"
                    : "bg-navy-800 text-slate-400 border border-navy-700"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
