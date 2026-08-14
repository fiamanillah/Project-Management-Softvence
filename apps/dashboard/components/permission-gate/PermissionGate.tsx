"use client";

import * as React from "react";
import { usePermissions, hasPermission } from "@/lib/permissions/PermissionContext";

interface PermissionGateProps {
  code?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * PermissionGate: Coarse level-1 permission gating component.
 * Conditionally renders children if the current user possesses the required permission code.
 */
export function PermissionGate({
  code,
  children,
  fallback = null,
}: PermissionGateProps) {
  const permissions = usePermissions();

  if (!code) {
    return <>{children}</>;
  }

  return hasPermission(permissions, code) ? <>{children}</> : <>{fallback}</>;
}
