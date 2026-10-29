"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "dj" | "karaoke" | "success";
  size?: "xs" | "sm" | "md" | "lg";
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-saas-primary focus-visible:ring-offset-saas-bg active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";

    const variants = {
      primary:
        "bg-saas-primary hover:bg-saas-primary-hover text-white shadow-sm shadow-purple-950/50 border border-purple-400/30",
      secondary:
        "bg-navy-800 hover:bg-navy-750 text-slate-200 hover:text-white border border-navy-700 shadow-sm",
      outline:
        "bg-transparent hover:bg-navy-800/60 text-slate-300 hover:text-white border border-navy-700 hover:border-navy-600",
      ghost:
        "bg-transparent hover:bg-navy-800/60 text-slate-400 hover:text-white border border-transparent",
      danger:
        "bg-red-950/70 hover:bg-red-900 border border-red-800/80 text-red-200 hover:text-white shadow-sm shadow-red-950/40",
      success:
        "bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-200 hover:text-white shadow-sm",
      dj:
        "bg-amber-950/70 hover:bg-amber-900 border border-amber-700/80 text-amber-200 hover:text-white shadow-sm shadow-amber-950/40",
      karaoke:
        "bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-700/80 text-cyan-200 hover:text-white shadow-sm shadow-cyan-950/40",
    };

    const sizes = {
      xs: "text-[11px] px-2.5 py-1 gap-1",
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-xs sm:text-sm px-4 py-2 gap-2",
      lg: "text-sm sm:text-base px-5 py-2.5 gap-2.5 font-semibold",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-current" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
