// apps/dashboard/app/dashboard/projects/components/manage-workspace/chat-panel/dispatch-modal/DispatchActionConsole.tsx
"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Check,
  X,
  Send,
  Loader2,
  Pencil,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { ApprovalWorkflow, ProjectMessageCapabilities } from "../../types";

interface DispatchActionConsoleProps {
  workflow: ApprovalWorkflow;
  capabilities?: ProjectMessageCapabilities;
  isRejecting: boolean;
  setIsRejecting: (val: boolean) => void;
  rejectionReason: string;
  setRejectionReason: (val: string) => void;
  approvalNotes: string;
  setApprovalNotes: (val: string) => void;
  dispatchPlatform: string;
  setDispatchPlatform: (val: string) => void;
  dispatchReferenceId: string;
  setDispatchReferenceId: (val: string) => void;
  isSubmitting: boolean;
  onLeadApprove: () => void;
  onConfirmDispatch: () => void;
  onReject: () => void;
  canEdit: boolean;
  isEditingContent: boolean;
  setIsEditingContent: (val: boolean) => void;
}

export function DispatchActionConsole({
  workflow,
  capabilities,
  isRejecting,
  setIsRejecting,
  rejectionReason,
  setRejectionReason,
  approvalNotes,
  setApprovalNotes,
  dispatchPlatform,
  setDispatchPlatform,
  dispatchReferenceId,
  setDispatchReferenceId,
  isSubmitting,
  onLeadApprove,
  onConfirmDispatch,
  onReject,
  canEdit,
  isEditingContent,
  setIsEditingContent,
}: DispatchActionConsoleProps) {
  const canLeadApprove = Boolean(capabilities?.canLeadApprove);
  const canSalesDispatch = Boolean(capabilities?.canSalesDispatch);
  const canRequestRevision = Boolean(capabilities?.canRequestRevision);

  return (
    <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-border/50">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-primary" /> Review & Dispatch Console
        </span>
        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-muted/60">
          {workflow.status.replace("_", " ")}
        </Badge>
      </div>

      {/* A: In Review State */}
      {(workflow.status === "IN_REVIEW" || workflow.status === "PENDING_LEAD") && (
        <div className="space-y-3">
          {!isRejecting ? (
            <>
              {canLeadApprove && (
                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    Internal Review Notes (Optional):
                  </label>
                  <Input
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="e.g. Verified deliverables, test coverage, and documentation"
                    className="h-8 text-xs bg-background"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                {canRequestRevision && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsRejecting(true)}
                    disabled={isSubmitting}
                    className="h-8 text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer font-semibold"
                  >
                    <X className="size-3.5 mr-1" /> Request Revision
                  </Button>
                )}
                {canLeadApprove && (
                  <Button
                    size="sm"
                    onClick={onLeadApprove}
                    disabled={isSubmitting}
                    className={cn(
                      "h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs gap-1",
                      !canRequestRevision && "col-span-2"
                    )}
                  >
                    {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    Approve for Client
                  </Button>
                )}
                {!canLeadApprove && !canRequestRevision && (
                  <p className="col-span-2 text-[11px] text-muted-foreground text-center py-2 bg-muted/30 rounded-lg">
                    Awaiting review. You do not have approval permissions on this project.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2 bg-rose-500/10 p-3 rounded-xl border border-rose-500/30">
              <label className="text-[11px] font-bold text-rose-700 dark:text-rose-300 block">
                Revision Feedback for {workflow.requestedBy}:
              </label>
              <Textarea
                autoFocus
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Specify exact changes needed before this message can be approved..."
                className="text-xs bg-background text-foreground"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setIsRejecting(false)}
                  disabled={isSubmitting}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={onReject}
                  disabled={isSubmitting}
                  className="h-7 text-xs font-bold gap-1 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="size-3 animate-spin" /> : null}
                  Submit Revision Request
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* B: Sales Dispatch State */}
      {workflow.status === "PENDING_SALES" && (
        <div className="space-y-3">
          {!isRejecting ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block mb-1">External Channel</span>
                  <Select
                    value={dispatchPlatform}
                    onValueChange={(val: any) => setDispatchPlatform(val)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Direct Portal">Direct Client Portal</SelectItem>
                      <SelectItem value="Fiverr">Fiverr Order Inbox</SelectItem>
                      <SelectItem value="Upwork">Upwork Enterprise Room</SelectItem>
                      <SelectItem value="Email">Official Client Email</SelectItem>
                      <SelectItem value="Slack">Shared Slack Channel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block mb-1">Dispatch Reference / ID</span>
                  <Input
                    value={dispatchReferenceId}
                    onChange={(e) => setDispatchReferenceId(e.target.value)}
                    placeholder="e.g. MSG-9912 or Order #1048"
                    className="h-8 text-xs bg-background font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {canRequestRevision && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsRejecting(true)}
                    disabled={isSubmitting}
                    className="h-8 text-xs text-muted-foreground hover:bg-muted cursor-pointer"
                  >
                    <RotateCcw className="size-3.5 mr-1" /> Return for Edits
                  </Button>
                )}
                {canSalesDispatch && (
                  <Button
                    size="sm"
                    onClick={onConfirmDispatch}
                    disabled={isSubmitting}
                    className={cn(
                      "h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer shadow-xs gap-1.5",
                      !canRequestRevision && "col-span-2"
                    )}
                  >
                    {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    Confirm Dispatched
                  </Button>
                )}
                {!canSalesDispatch && !canRequestRevision && (
                  <p className="col-span-2 text-[11px] text-muted-foreground text-center py-2 bg-muted/30 rounded-lg">
                    Approved internally. Awaiting Sales Dispatch to external client platform.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2 bg-rose-500/10 p-3 rounded-xl border border-rose-500/30">
              <label className="text-[11px] font-bold text-rose-700 dark:text-rose-300 block">
                Return Note / Edit Request:
              </label>
              <Textarea
                autoFocus
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Describe reasons why this draft is being returned for edits..."
                className="text-xs bg-background text-foreground"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setIsRejecting(false)}
                  disabled={isSubmitting}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={onReject}
                  disabled={isSubmitting}
                  className="h-7 text-xs font-bold gap-1 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="size-3 animate-spin" /> : null}
                  Return Draft
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* C: Revision Requested State */}
      {workflow.status === "REVISION_REQUESTED" && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-300 space-y-2">
          <p className="font-semibold">Draft is currently awaiting author revisions.</p>
          <p className="text-[11px] opacity-90">The author can modify the content on the left panel and click "Save & Resubmit" to re-enter review.</p>
          {canEdit && !isEditingContent && (
            <Button
              size="xs"
              onClick={() => setIsEditingContent(true)}
              className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold w-full gap-1 cursor-pointer"
            >
              <Pencil className="size-3" /> Edit & Resubmit Now
            </Button>
          )}
        </div>
      )}

      {/* D: Dispatched State */}
      {workflow.status === "DISPATCHED" && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" /> Lifecycle Completed
          </p>
          <p className="text-[11px] text-muted-foreground">Message was successfully dispatched to {workflow.targetClient}.</p>
        </div>
      )}
    </div>
  );
}
