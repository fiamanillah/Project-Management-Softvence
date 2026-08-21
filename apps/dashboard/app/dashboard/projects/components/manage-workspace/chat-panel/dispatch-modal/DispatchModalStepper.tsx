// apps/dashboard/app/dashboard/projects/components/manage-workspace/chat-panel/dispatch-modal/DispatchModalStepper.tsx
"use client";

import * as React from "react";
import { cn } from "@workspace/ui/lib/utils";
import type { ApprovalWorkflow } from "../../types";

interface DispatchModalStepperProps {
  workflow: ApprovalWorkflow;
  elapsedFormatted: string;
}

export function DispatchModalStepper({
  workflow,
  elapsedFormatted,
}: DispatchModalStepperProps) {
  return (
    <div className="bg-muted/20 px-4 py-2.5 border-b border-border/60 shrink-0">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Step 1: Drafted */}
        <div className="flex items-center gap-2 p-2 rounded-xl bg-background/90 border border-border/60 shadow-2xs min-w-0">
          <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold shrink-0 shadow-2xs">
            ✓
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-foreground truncate">1. Draft Created</p>
            <p className="text-[10px] text-muted-foreground truncate">{workflow.requestedBy} • {workflow.requestedAt}</p>
          </div>
        </div>

        {/* Step 2: In Review */}
        <div
          className={cn(
            "flex items-center gap-2 p-2 rounded-xl border transition-all min-w-0",
            workflow.leadApprovedBy
              ? "bg-background/90 border-border/60 shadow-2xs"
              : workflow.status === "IN_REVIEW" || workflow.status === "PENDING_LEAD"
              ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30 shadow-xs"
              : workflow.status === "REVISION_REQUESTED"
              ? "bg-rose-500/10 border-rose-500/40"
              : "bg-muted/30 border-border/30 opacity-60"
          )}
        >
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-xs font-bold shrink-0 shadow-2xs",
              workflow.leadApprovedBy
                ? "bg-emerald-500 text-white"
                : workflow.status === "IN_REVIEW" || workflow.status === "PENDING_LEAD"
                ? "bg-amber-500 text-white animate-pulse"
                : workflow.status === "REVISION_REQUESTED"
                ? "bg-rose-500 text-white"
                : "bg-muted text-muted-foreground"
            )}
          >
            {workflow.leadApprovedBy ? "✓" : workflow.status === "REVISION_REQUESTED" ? "!" : "2"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-foreground truncate">
              2. In Review {(workflow.status === "IN_REVIEW" || workflow.status === "PENDING_LEAD") ? `(${elapsedFormatted})` : ""}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {workflow.leadApprovedBy
                ? `Approved by ${workflow.leadApprovedBy}`
                : workflow.status === "REVISION_REQUESTED"
                ? "Revision Requested"
                : "Awaiting Review"}
            </p>
          </div>
        </div>

        {/* Step 3: Sales Dispatch */}
        <div
          className={cn(
            "flex items-center gap-2 p-2 rounded-xl border transition-all min-w-0",
            workflow.status === "DISPATCHED"
              ? "bg-background/90 border-border/60 shadow-2xs"
              : workflow.status === "PENDING_SALES"
              ? "bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30 shadow-xs"
              : "bg-muted/30 border-border/30 opacity-60"
          )}
        >
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-xs font-bold shrink-0 shadow-2xs",
              workflow.status === "DISPATCHED"
                ? "bg-emerald-500 text-white"
                : workflow.status === "PENDING_SALES"
                ? "bg-blue-500 text-white animate-pulse"
                : "bg-muted text-muted-foreground"
            )}
          >
            {workflow.status === "DISPATCHED" ? "✓" : "3"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-foreground truncate">
              3. Client Dispatch {workflow.status === "PENDING_SALES" ? `(${elapsedFormatted})` : ""}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {workflow.salesDispatchedBy
                ? `Sent via ${workflow.dispatchPlatform || "Channel"}`
                : "Awaiting Sales Lead"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
