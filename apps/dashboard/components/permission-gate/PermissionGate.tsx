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
 *
 * Relies exclusively on the server-populated PermissionContext map (Rule FE-1, FE-3, FE-4).
 * SuperAdmin users receive a full permission map from the backend engine fast-path,
 * so no client-side role checks are required or permitted here.
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
