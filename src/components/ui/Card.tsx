"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive" | "dj" | "karaoke" | "danger";
  compact?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", compact = false, children, ...props }, ref) => {
    const variants = {
      default: "bg-saas-card border-saas-border text-saas-text-primary shadow-sm",
      elevated: "bg-saas-elevated border-saas-border text-saas-text-primary shadow-md",
      interactive:
        "bg-saas-card hover:bg-saas-card-hover border-saas-border hover:border-navy-600 transition-all duration-150 cursor-pointer text-saas-text-primary shadow-sm hover:shadow-md",
      dj: "bg-saas-card border-amber-900/40 hover:border-amber-700/60 shadow-sm shadow-amber-950/20 text-saas-text-primary",
      karaoke:
        "bg-saas-card border-cyan-900/40 hover:border-cyan-700/60 shadow-sm shadow-cyan-950/20 text-saas-text-primary",
      danger:
        "bg-saas-card border-red-900/40 hover:border-red-700/60 shadow-sm shadow-red-950/20 text-saas-text-primary",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border transition-colors",
          compact ? "p-3.5 sm:p-4" : "p-4 sm:p-6",
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-between gap-3 mb-3 sm:mb-4", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-sm sm:text-base font-semibold text-saas-text-primary tracking-tight flex items-center gap-2",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs sm:text-sm text-saas-text-secondary leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-3", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between gap-2 pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-saas-border-subtle",
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";
