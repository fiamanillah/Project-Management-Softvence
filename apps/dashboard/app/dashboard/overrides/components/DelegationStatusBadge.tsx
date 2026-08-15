"use client";

import * as React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Clock, CheckCircle2, History } from "lucide-react";
import type { DelegationStatus } from "../types";

export function getDelegationStatus(validFrom: string, validUntil: string): DelegationStatus {
  const now = new Date().getTime();
  const from = new Date(validFrom).getTime();
  const until = new Date(validUntil).getTime();

  if (now > until) return "EXPIRED";
  if (now < from) return "UPCOMING";
  return "ACTIVE";
}

interface DelegationStatusBadgeProps {
  validFrom: string;
  validUntil: string;
}

export function DelegationStatusBadge({ validFrom, validUntil }: DelegationStatusBadgeProps) {
  const status = getDelegationStatus(validFrom, validUntil);

  if (status === "ACTIVE") {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5 font-medium"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Active
      </Badge>
    );
  }

  if (status === "UPCOMING") {
    return (
      <Badge
        variant="outline"
        className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 gap-1.5 font-medium"
      >
        <Clock className="size-3" />
        Scheduled
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-muted/50 text-muted-foreground border-border gap-1.5 font-medium"
    >
      <History className="size-3" />
      Expired
    </Badge>
  );
}
