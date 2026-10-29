"use client";

import React from "react";
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlertProps {
  variant?: "info" | "success" | "warning" | "danger";
  title?: string;
  description: string;
  onDismiss?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  description,
  onDismiss,
  className,
}) => {
  const variantStyles = {
    info: "bg-navy-800/90 border-navy-650 text-slate-200",
    success: "bg-emerald-950/60 border-emerald-800/80 text-emerald-100",
    warning: "bg-amber-950/60 border-amber-800/80 text-amber-100",
    danger: "bg-red-950/60 border-red-800/80 text-red-100",
  };

  const icons = {
    info: <Info className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
    danger: <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />,
  };

  return (
    <div
      role="alert"
      className={cn(
        "relative flex items-start gap-3 rounded-2xl border p-4 text-xs sm:text-sm shadow-sm transition-all",
        variantStyles[variant],
        className
      )}
    >
      {icons[variant]}
      <div className="flex-1 min-w-0 pr-2">
        {title && <h5 className="font-semibold mb-0.5 leading-snug">{title}</h5>}
        <div className="text-slate-300 text-xs leading-relaxed">{description}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
