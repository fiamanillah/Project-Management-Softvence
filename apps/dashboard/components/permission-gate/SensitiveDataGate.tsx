"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { usePermissions, hasPermission } from "@/lib/permissions/PermissionContext";
import { cn } from "@workspace/ui/lib/utils";

export interface SensitiveDataGateProps {
  /**
   * Permission code required to view this data (e.g. "project.financials.view").
   * Optional if `isPermitted` or `capability` is provided directly.
   */
  code?: string;
  /**
   * Direct capability or custom boolean permission flag.
   */
  capability?: boolean;
  /**
   * Display mode when access is not permitted.
   * - "hide": Renders nothing (or fallback).
   * - "mask": Renders a styled lock badge with fallback label (e.g. "Protected Financials").
   * - "blur": Renders children with CSS blur and a lock icon overlay.
   */
  mode?: "hide" | "mask" | "blur";
  /**
   * Label for the masked badge (e.g. "Protected Financials", "Protected Client").
   */
  maskLabel?: string;
  /**
   * Custom fallback node.
   */
  fallback?: React.ReactNode;
  /**
   * Custom className for mask wrapper.
   */
  className?: string;
  children: React.ReactNode;
}

/**
 * SensitiveDataGate: Protects commercial and confidential data points (client names, margins, budgets).
 * Guarantees zero DOM leaks of sensitive information when unauthorized.
 */
export function SensitiveDataGate({
  code,
  capability,
  mode = "mask",
  maskLabel = "Protected Data",
  fallback = null,
  className,
  children,
}: SensitiveDataGateProps) {
  const permissions = usePermissions();

  let isAllowed = true;
  if (code) {
    isAllowed = hasPermission(permissions, code);
  }
  if (capability !== undefined) {
    isAllowed = isAllowed && Boolean(capability);
  }

  if (isAllowed) {
    return <>{children}</>;
  }

  if (mode === "hide") {
    return <>{fallback}</>;
  }

  if (mode === "mask") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-medium text-xs border border-border/40 select-none",
          className
        )}
        title="You do not have permission to view this sensitive information"
      >
        <Lock className="size-3 text-muted-foreground/70 shrink-0" />
        <span className="text-[11px]">{maskLabel}</span>
      </div>
    );
  }

  // mode === "blur"
  return (
    <div className={cn("relative inline-block select-none overflow-hidden rounded", className)}>
      <div className="filter blur-sm pointer-events-none opacity-40 select-none aria-hidden">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-2xs gap-1 text-[11px] font-semibold text-muted-foreground">
        <Lock className="size-3 text-muted-foreground" />
        <span>{maskLabel}</span>
      </div>
    </div>
  );
}
