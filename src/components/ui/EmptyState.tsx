"use client";

import React from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-navy-700 bg-navy-900/30",
        compact ? "p-6" : "p-10 sm:p-14",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-navy-800/80 border border-navy-700 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
        {icon || <FolderOpen className="w-6 h-6" />}
      </div>
      <h3 className="text-sm sm:text-base font-semibold text-saas-text-primary mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-saas-text-secondary max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
