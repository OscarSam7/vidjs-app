"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circular" | "card";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = "default",
  ...props
}) => {
  return (
    <div
      className={cn(
        "animate-pulse bg-navy-800/80 border border-navy-700/50",
        variant === "default" && "rounded-lg",
        variant === "circular" && "rounded-full",
        variant === "card" && "rounded-2xl h-32",
        className
      )}
      {...props}
    />
  );
};
