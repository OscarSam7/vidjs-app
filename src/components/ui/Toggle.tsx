"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  labelPlacement?: "left" | "right";
  variant?: "primary" | "deckA" | "deckB" | "dj" | "success";
  size?: "sm" | "md";
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  id?: string;
  name?: string;
  ariaLabel?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  labelPlacement = "right",
  variant = "primary",
  size = "md",
  disabled = false,
  isLoading = false,
  className,
  id,
  name,
  ariaLabel,
}) => {
  const switchId = id || (label ? `toggle-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  // Dimensiones según tamaño
  const dimensions = {
    sm: {
      track: "w-8 h-4.5 p-0.5",
      thumb: "w-3.5 h-3.5",
      translate: "translate-x-3.5",
    },
    md: {
      track: "w-11 h-6 p-0.5",
      thumb: "w-5 h-5",
      translate: "translate-x-5",
    },
  };

  // Color de acento cuando está activo
  const variantActiveColors = {
    primary: "bg-saas-primary border-purple-500/50 shadow-sm shadow-purple-950/40",
    deckA: "bg-saas-primary border-purple-500/50 shadow-sm shadow-purple-950/40",
    deckB: "bg-saas-karaoke border-cyan-500/50 shadow-sm shadow-cyan-950/40",
    dj: "bg-saas-dj border-amber-500/50 shadow-sm shadow-amber-950/40",
    success: "bg-saas-success border-emerald-500/50 shadow-sm shadow-emerald-950/40",
  };

  const currentDim = dimensions[size];

  const switchElement = (
    <button
      type="button"
      role="switch"
      id={switchId}
      name={name}
      aria-checked={checked}
      aria-label={ariaLabel || label}
      disabled={disabled || isLoading}
      onClick={() => !disabled && !isLoading && onChange(!checked)}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full border transition-colors duration-200 ease-in-out cursor-pointer outline-none select-none",
        currentDim.track,
        checked ? variantActiveColors[variant] : "bg-navy-900 border-navy-700 hover:border-navy-600",
        (disabled || isLoading) && "opacity-40 cursor-not-allowed pointer-events-none",
        "focus-visible:ring-2 focus-visible:ring-saas-primary focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-flex items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
          currentDim.thumb,
          checked ? currentDim.translate : "translate-x-0"
        )}
      >
        {isLoading && (
          <Loader2 className="w-2.5 h-2.5 text-navy-900 animate-spin" />
        )}
      </span>
    </button>
  );

  if (!label && !description) {
    return switchElement;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 select-none",
        labelPlacement === "left" && "flex-row-reverse justify-between",
        className
      )}
    >
      {switchElement}
      <label
        htmlFor={switchId}
        onClick={() => !disabled && !isLoading && onChange(!checked)}
        className={cn(
          "cursor-pointer",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {label && (
          <span className="block text-xs sm:text-sm font-medium text-slate-200">
            {label}
          </span>
        )}
        {description && (
          <span className="block text-[11px] text-slate-400 mt-0.5 leading-tight">
            {description}
          </span>
        )}
      </label>
    </div>
  );
};
