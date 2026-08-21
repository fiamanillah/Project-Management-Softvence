// apps/dashboard/app/dashboard/projects/components/manage-workspace/chat-panel/dispatch-modal/DispatchModalHeader.tsx
"use client";

import * as React from "react";
import { DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface DispatchModalHeaderProps {
  projectCode?: string;
  targetClient: string;
  requestedBy: string;
  requestedAt?: string;
  status: string;
  elapsedFormatted: string;
}

export function DispatchModalHeader({
  projectCode = "PRJ-1048",
  targetClient,
  requestedBy,
  requestedAt,
  status,
  elapsedFormatted,
}: DispatchModalHeaderProps) {
  return (
    <DialogHeader className="p-4 bg-gradient-to-r from-primary/10 via-background/95 to-background border-b border-border/60 shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Project & Client Target Meta */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md font-bold text-sm shrink-0">
            <Send className="size-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 shrink-0">
                {projectCode}
              </span>
              <DialogTitle className="text-sm sm:text-base font-bold text-foreground truncate">
                Outbound Client Dispatch & Approval Hub
              </DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-2">
              <span>Target: <strong className="text-foreground">{targetClient}</strong></span>
              <span>•</span>
              <span>Author: <strong className="text-foreground font-medium">{requestedBy}</strong></span>
              {requestedAt && <span>({requestedAt})</span>}
            </p>
          </div>
        </div>

        {/* Right: Live Stage Status Badge */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">

          {/* Status Badge with Live Dwell Time */}
          {status === "PENDING_LEAD" && (
            <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 text-xs font-semibold py-1 px-2.5 gap-1.5 shadow-2xs">
              <span className="size-2 rounded-full bg-amber-500 animate-ping shrink-0" />
              <span>Lead Review ({elapsedFormatted})</span>
            </Badge>
          )}
          {status === "PENDING_SALES" && (
            <Badge variant="outline" className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40 text-xs font-semibold py-1 px-2.5 gap-1.5 shadow-2xs">
              <span className="size-2 rounded-full bg-blue-500 animate-ping shrink-0" />
              <span>Sales Dispatch ({elapsedFormatted})</span>
            </Badge>
          )}
          {status === "DISPATCHED" && (
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-xs font-semibold py-1 px-2.5 gap-1.5 shadow-2xs">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              <span>Dispatched to Client</span>
            </Badge>
          )}
          {status === "REVISION_REQUESTED" && (
            <Badge variant="outline" className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 text-xs font-semibold py-1 px-2.5 gap-1.5 shadow-2xs">
              <AlertTriangle className="size-3.5 text-rose-600" />
              <span>Revision Requested ({elapsedFormatted})</span>
            </Badge>
          )}
        </div>
      </div>
    </DialogHeader>
  );
}
