"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string | number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  accent?: "primary" | "dj" | "karaoke" | "success" | "neutral";
  badge?: string;
  isLoading?: boolean;
  className?: string;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtext,
  icon,
  trend,
  accent = "neutral",
  badge,
  isLoading = false,
  className,
  onClick,
}) => {
  const accentBorders = {
    neutral: "border-saas-border hover:border-navy-600",
    primary: "border-saas-border hover:border-purple-600/50",
    dj: "border-saas-border hover:border-amber-600/50",
    karaoke: "border-saas-border hover:border-cyan-600/50",
    success: "border-saas-border hover:border-emerald-600/50",
  };

  const accentIcons = {
    neutral: "text-slate-400 bg-navy-800/80 border-navy-700",
    primary: "text-purple-400 bg-purple-950/40 border-purple-800/50",
    dj: "text-amber-400 bg-amber-950/40 border-amber-800/50",
    karaoke: "text-cyan-400 bg-cyan-950/40 border-cyan-800/50",
    success: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-2xl bg-saas-card border p-4 sm:p-5 transition-all duration-150 flex flex-col justify-between overflow-hidden group",
        accentBorders[accent],
        onClick && "cursor-pointer hover:bg-saas-card-hover",
        className
      )}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs sm:text-[13px] font-medium text-saas-text-secondary truncate">
          {title}
        </span>
        {badge ? (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-navy-800 text-slate-300 border border-navy-700 shrink-0">
            {badge}
          </span>
        ) : icon ? (
          <div
            className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
              accentIcons[accent]
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>

      {/* Main Metric */}
      <div className="mt-3 mb-1">
        {isLoading ? (
          <div className="h-8 w-24 bg-navy-800 rounded animate-pulse" />
        ) : (
          <div className="text-2xl sm:text-3xl font-bold text-saas-text-primary tracking-tight font-mono">
            {value}
          </div>
        )}
      </div>

      {/* Footer / Trend / Subtext */}
      <div className="flex items-center justify-between text-xs text-saas-text-muted mt-2 pt-2 border-t border-saas-border-subtle">
        {trend ? (
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-semibold",
                trend.direction === "up" && "text-emerald-400",
                trend.direction === "down" && "text-red-400",
                trend.direction === "neutral" && "text-slate-400"
              )}
            >
              {trend.direction === "up" && <ArrowUpRight className="w-3.5 h-3.5" />}
              {trend.direction === "down" && <ArrowDownRight className="w-3.5 h-3.5" />}
              {trend.direction === "neutral" && <Minus className="w-3 h-3" />}
              {trend.value}
            </span>
            {trend.label && <span className="text-slate-500 truncate">{trend.label}</span>}
          </div>
        ) : (
          <span className="truncate">{subtext || "Datos en vivo"}</span>
        )}
      </div>
    </div>
  );
};
