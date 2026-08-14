"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { usePermissions, hasPermission } from "@/lib/permissions/PermissionContext";

interface RouteGuardProps {
  code: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RouteGuard({
  code,
  children,
  fallback,
}: RouteGuardProps) {
  const permissions = usePermissions();

  const isAllowed = hasPermission(permissions, code);

  if (isAllowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4 shadow-sm">
        <ShieldAlert className="size-8" />
      </div>
      <h2 className="text-xl font-bold tracking-tight">Access Restricted</h2>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
        You do not have the required permission (<code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">{code}</code>) to view this page or perform operations here.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button variant="outline" size="sm" render={<Link href="/dashboard" className="flex items-center gap-2" />}>
          <ArrowLeft className="size-4" /> Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
