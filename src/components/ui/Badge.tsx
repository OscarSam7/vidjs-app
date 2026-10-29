"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "dj"
    | "karaoke"
    | "neutral"
    | "outline";
  size?: "xs" | "sm" | "md";
  pulse?: boolean;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  size = "sm",
  pulse = false,
  icon,
  children,
  ...props
}) => {
  const variants = {
    primary:
      "bg-purple-950/70 text-purple-200 border-purple-800/60 shadow-sm shadow-purple-950/20",
    secondary:
      "bg-navy-800 text-slate-300 border-navy-700",
    success:
      "bg-emerald-950/70 text-emerald-200 border-emerald-800/60 shadow-sm shadow-emerald-950/20",
    warning:
      "bg-amber-950/70 text-amber-200 border-amber-800/60 shadow-sm shadow-amber-950/20",
    danger:
      "bg-red-950/70 text-red-200 border-red-800/60 shadow-sm shadow-red-950/20",
    dj:
      "bg-amber-950/80 text-amber-300 border-amber-700/70 shadow-sm shadow-amber-950/30",
    karaoke:
      "bg-cyan-950/80 text-cyan-300 border-cyan-700/70 shadow-sm shadow-cyan-950/30",
    neutral:
      "bg-navy-850 text-slate-300 border-navy-700",
    outline:
      "bg-transparent text-slate-300 border-navy-650",
  };

  const pulseColors = {
    primary: "bg-purple-400",
    secondary: "bg-slate-400",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    danger: "bg-red-400",
    dj: "bg-amber-400",
    karaoke: "bg-cyan-400",
    neutral: "bg-slate-400",
    outline: "bg-slate-400",
  };

  const sizes = {
    xs: "text-[10px] px-2 py-0.5 gap-1 font-medium",
    sm: "text-xs px-2.5 py-0.5 gap-1.5 font-medium",
    md: "text-xs sm:text-sm px-3 py-1 gap-2 font-medium",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border transition-colors select-none font-mono tracking-tight",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              pulseColors[variant]
            )}
          />
          <span
            className={cn("relative inline-flex rounded-full h-1.5 w-1.5", pulseColors[variant])}
          />
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
