"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import {
  CheckCircle2,
  Clock,
  Send,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  ExternalLink,
  Building2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import type { ApprovalWorkflow, ApprovalStatus } from "../types";

interface MessageApprovalCardProps {
  workflow: ApprovalWorkflow;
  onUpdateApproval: (updated: ApprovalWorkflow) => void;
  isCurrentUser: boolean;
  canLeadApprove?: boolean;
  canSalesDispatch?: boolean;
  canRequestRevision?: boolean;
}

export function MessageApprovalCard({
  workflow,
  onUpdateApproval,
  isCurrentUser,
  canLeadApprove = true,
  canSalesDispatch = true,
  canRequestRevision = true,
}: MessageApprovalCardProps) {
  const [dispatchDialogOpen, setDispatchDialogOpen] = React.useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [dispatchPlatform, setDispatchPlatform] = React.useState<ApprovalWorkflow["dispatchPlatform"]>("Direct Portal");
  const [dispatchReferenceId, setDispatchReferenceId] = React.useState(`DISPATCH-${Math.floor(1000 + Math.random() * 9000)}`);
  const [rejectionReason, setRejectionReason] = React.useState("");

  // Step 1: Lead approves
  const handleLeadApprove = () => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    onUpdateApproval({
      ...workflow,
      status: "PENDING_SALES",
      leadApprovedBy: "Fiamanillah (Tech Lead)",
      leadApprovedAt: timestamp,
    });
    toast.success("Message approved internally! Now forwarded to Sales for client dispatch.");
  };

  // Step 2: Sales dispatches to client
  const handleConfirmDispatch = () => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    onUpdateApproval({
      ...workflow,
      status: "DISPATCHED",
      salesDispatchedBy: "Marcus Vance (Sales Lead)",
      salesDispatchedAt: timestamp,
      dispatchPlatform,
      dispatchReferenceId,
    });
    setDispatchDialogOpen(false);
    toast.success(`Message confirmed dispatched to ${workflow.targetClient} via ${dispatchPlatform}!`);
  };

  // Reject / Request changes
  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error("Please enter revision feedback");
      return;
    }
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    onUpdateApproval({
      ...workflow,
      status: "REVISION_REQUESTED",
      rejectedBy: "Fiamanillah (Tech Lead)",
      rejectedAt: timestamp,
      rejectionReason,
    });
    setRejectDialogOpen(false);
    toast.info("Revision requested from author");
  };

  return (
    <div className="mt-2.5 rounded-xl border border-border/80 bg-card/90 p-3 shadow-2xs text-card-foreground">
      {/* Top Banner: Client Header & Current Status */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Building2 className="size-3.5 text-primary shrink-0" />
          <span className="text-[11px] font-bold text-foreground truncate">
            Client Outbound • {workflow.targetClient}
          </span>
        </div>

        <div>
          {(workflow.status === "IN_REVIEW" || workflow.status === "PENDING_LEAD") && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 font-semibold">
              <Clock className="size-3" /> In Review
            </Badge>
          )}
          {workflow.status === "PENDING_SALES" && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] gap-1 font-semibold">
              <Clock className="size-3" /> Awaiting Sales Dispatch
            </Badge>
          )}
          {workflow.status === "DISPATCHED" && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1 font-semibold">
              <CheckCircle2 className="size-3" /> Dispatched to Client
            </Badge>
          )}
          {workflow.status === "REVISION_REQUESTED" && (
            <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] gap-1 font-semibold">
              <AlertTriangle className="size-3" /> Revision Requested
            </Badge>
          )}
        </div>
      </div>

      {/* 3-Step Approval Pipeline Progress */}
      <div className="grid grid-cols-3 gap-1.5 my-2">
        {/* Step 1: Drafted */}
        <div className="flex flex-col items-center rounded-lg bg-muted/40 p-1.5 text-center">
          <span className="size-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] mb-1">
            ✓
          </span>
          <span className="text-[10px] font-semibold text-foreground">1. Drafted</span>
          <span className="text-[9px] text-muted-foreground truncate max-w-full">
            {workflow.requestedBy}
          </span>
        </div>

        {/* Step 2: In Review */}
        <div
          className={cn(
            "flex flex-col items-center rounded-lg p-1.5 text-center transition-colors",
            workflow.status === "IN_REVIEW" || workflow.status === "PENDING_LEAD"
              ? "bg-amber-500/10 border border-amber-500/30"
              : workflow.leadApprovedBy
              ? "bg-muted/40"
              : "bg-muted/20 opacity-60"
          )}
        >
          <span
            className={cn(
              "size-4 rounded-full flex items-center justify-center text-[9px] mb-1",
              workflow.leadApprovedBy
                ? "bg-emerald-500 text-white"
                : workflow.status === "IN_REVIEW" || workflow.status === "PENDING_LEAD"
                ? "bg-amber-500 text-white animate-pulse"
                : "bg-muted text-muted-foreground"
            )}
          >
            {workflow.leadApprovedBy ? "✓" : "2"}
          </span>
          <span className="text-[10px] font-semibold text-foreground">2. In Review</span>
          <span className="text-[9px] text-muted-foreground truncate max-w-full">
            {workflow.leadApprovedBy ? "Approved" : "Pending"}
          </span>
        </div>

        {/* Step 3: Sales Dispatch */}
        <div
          className={cn(
            "flex flex-col items-center rounded-lg p-1.5 text-center transition-colors",
            workflow.status === "PENDING_SALES"
              ? "bg-blue-500/10 border border-blue-500/30"
              : workflow.status === "DISPATCHED"
              ? "bg-muted/40"
              : "bg-muted/20 opacity-60"
          )}
        >
          <span
            className={cn(
              "size-4 rounded-full flex items-center justify-center text-[9px] mb-1",
              workflow.status === "DISPATCHED"
                ? "bg-emerald-500 text-white"
                : workflow.status === "PENDING_SALES"
                ? "bg-blue-500 text-white animate-pulse"
                : "bg-muted text-muted-foreground"
            )}
          >
            {workflow.status === "DISPATCHED" ? "✓" : "3"}
          </span>
          <span className="text-[10px] font-semibold text-foreground">3. Client Dispatch</span>
          <span className="text-[9px] text-muted-foreground truncate max-w-full">
            {workflow.status === "DISPATCHED" ? "Sent" : "Pending"}
          </span>
        </div>
      </div>

      {/* Rejection Feedback Note if any */}
      {workflow.status === "REVISION_REQUESTED" && (
        <div className="mt-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-2 text-rose-700 dark:text-rose-300 text-[11px]">
          <span className="font-bold">Feedback from {workflow.rejectedBy}:</span>
          <p className="mt-0.5">{workflow.rejectionReason}</p>
        </div>
      )}

      {/* Dispatched Info Footer */}
      {workflow.status === "DISPATCHED" && (
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
          <span>
            Sent via <strong className="text-foreground">{workflow.dispatchPlatform}</strong> • {workflow.dispatchReferenceId}
          </span>
          <span>{workflow.salesDispatchedAt}</span>
        </div>
      )}

      {/* Interactive Action Buttons */}
      {(((workflow.status === "IN_REVIEW" || workflow.status === "PENDING_LEAD") && (canLeadApprove || canRequestRevision)) ||
        (workflow.status === "PENDING_SALES" && (canSalesDispatch || canRequestRevision))) && (
        <div className="flex items-center justify-end gap-2 mt-2.5 pt-2 border-t border-border/50">
          {(workflow.status === "IN_REVIEW" || workflow.status === "PENDING_LEAD") && (
            <>
              {canRequestRevision && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setRejectDialogOpen(true)}
                  className="text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer h-7"
                >
                  <X className="size-3 mr-1" /> Request Revision
                </Button>
              )}
              {canLeadApprove && (
                <Button
                  size="xs"
                  variant="default"
                  onClick={handleLeadApprove}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer h-7 shadow-xs"
                >
                  <Check className="size-3 mr-1" /> Approve for Client
                </Button>
              )}
            </>
          )}

          {workflow.status === "PENDING_SALES" && (
            <>
              {canRequestRevision && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setRejectDialogOpen(true)}
                  className="text-xs text-muted-foreground hover:bg-muted cursor-pointer h-7"
                >
                  <RotateCcw className="size-3 mr-1" /> Return for Edits
                </Button>
              )}
              {canSalesDispatch && (
                <Button
                  size="xs"
                  variant="default"
                  onClick={() => setDispatchDialogOpen(true)}
                  className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer h-7 shadow-xs gap-1"
                >
                  <Send className="size-3" /> Confirm Dispatched to Client
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Dispatch Confirmation Dialog */}
      <Dialog open={dispatchDialogOpen} onOpenChange={setDispatchDialogOpen}>
        <DialogContent className="max-w-md p-4 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Send className="size-4 text-primary" /> Confirm Client Dispatch
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Record that this approved message and its attachments have been communicated to the client via their external workspace or portal.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground">Communication Channel</label>
              <Select
                value={dispatchPlatform}
                onValueChange={(val: any) => setDispatchPlatform(val)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fiverr" className="text-xs">Fiverr Order Inbox</SelectItem>
                  <SelectItem value="Upwork" className="text-xs">Upwork Enterprise Room</SelectItem>
                  <SelectItem value="Direct Portal" className="text-xs">Direct Client Portal</SelectItem>
                  <SelectItem value="Email" className="text-xs">Official Client Email</SelectItem>
                  <SelectItem value="Slack" className="text-xs">Client Shared Slack Channel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground">Dispatch Reference ID / Link</label>
              <Input
                value={dispatchReferenceId}
                onChange={(e) => setDispatchReferenceId(e.target.value)}
                placeholder="e.g. MSG-FVR-9021 or email thread ID"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDispatchDialogOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDispatch}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
            >
              <CheckCircle2 className="size-3.5" /> Mark Dispatched
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision Request Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md p-4 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-4" /> Request Message Revision
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Explain what adjustments or corrections are needed before this message can be approved for client delivery.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground">Feedback for Author</label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Please clarify deployment timeline and attach API swagger docs."
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              className="text-xs h-8 font-semibold gap-1.5"
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
