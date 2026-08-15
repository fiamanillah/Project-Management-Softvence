"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { KeyRound, Plus, RefreshCw, UserCheck, ShieldAlert } from "lucide-react";
import { PermissionGate } from "@/components/permission-gate/PermissionGate";

interface OverrideHeaderProps {
  isLoading: boolean;
  onRefresh: () => void;
  onOpenCreateOverride: () => void;
  onOpenCreateDelegation: () => void;
}

export function OverrideHeader({
  isLoading,
  onRefresh,
  onOpenCreateOverride,
  onOpenCreateDelegation,
}: OverrideHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <KeyRound className="size-6 text-primary" /> User Overrides & Delegations
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage granular hand-grants, explicit deny overrides, and active user delegation windows.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="gap-1.5"
        >
          <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>

        <PermissionGate code="auth.user.manage">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCreateDelegation}
            className="gap-1.5 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
          >
            <UserCheck className="size-4 text-blue-500" />
            <span>New Delegation</span>
          </Button>

          <Button
            size="sm"
            onClick={onOpenCreateOverride}
            className="gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            <span>New Override</span>
          </Button>
        </PermissionGate>
      </div>
    </div>
  );
}
