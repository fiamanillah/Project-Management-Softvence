// apps/dashboard/app/dashboard/projects/components/manage-workspace/chat-panel/ClientDispatchModal.tsx
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Copy, Loader2, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useElapsedTimer } from "./useElapsedTimer";
import {
  DispatchModalHeader,
  DispatchModalStepper,
  DispatchMessageCanvas,
  DispatchActionConsole,
  DispatchAuditTimeline,
} from "./dispatch-modal";
import type {
  ApprovalWorkflow,
  ApprovalStageAudit,
  ChatAttachment,
  MessageReadReceipt,
  ProjectMessageCapabilities,
  ProjectMessageRevision,
} from "../types";

interface ClientDispatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: ApprovalWorkflow;
  messageText: string;
  attachments?: ChatAttachment[];
  seenBy?: MessageReadReceipt[];
  onUpdateApproval?: (updated: ApprovalWorkflow) => void;
  onEdit?: (messageId: string, text: string, reason?: string) => Promise<void> | void;
  messageId?: string;
  projectId?: string;
  projectCode?: string;
  capabilities?: ProjectMessageCapabilities;
  isCurrentUser?: boolean;
  revisions?: ProjectMessageRevision[];
}

export function ClientDispatchModal({
  open,
  onOpenChange,
  workflow,
  messageText,
  attachments,
  seenBy,
  onUpdateApproval,
  onEdit,
  messageId,
  projectId,
  projectCode = "PRJ-1048",
  capabilities,
  isCurrentUser = false,
  revisions: propRevisions,
}: ClientDispatchModalProps) {
  const [dispatchPlatform, setDispatchPlatform] = React.useState<string>(
    workflow.dispatchPlatform || "Direct Portal"
  );
  const [dispatchReferenceId, setDispatchReferenceId] = React.useState(
    workflow.dispatchReferenceId || `APEX-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [isDispatching, setIsDispatching] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [approvalNotes, setApprovalNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // In-modal editing state for Revision Requested or Lead Edits
  const [isEditingContent, setIsEditingContent] = React.useState(false);
  const [editText, setEditText] = React.useState(messageText);
  const [editReason, setEditReason] = React.useState("");

  // Message Revisions list
  const [revisions, setRevisions] = React.useState<ProjectMessageRevision[]>(propRevisions || []);

  React.useEffect(() => {
    setEditText(messageText);
  }, [messageText]);

  React.useEffect(() => {
    if (propRevisions && propRevisions.length > 0) {
      setRevisions(propRevisions);
    }
  }, [propRevisions]);

  // Fetch full revisions on open if available
  React.useEffect(() => {
    if (!open || !messageId || !projectId) return;

    let isMounted = true;
    async function fetchRevisions() {
      try {
        const res = await api.get<any>(`/projects/${projectId}/messages/${messageId}/revisions`);
        const data = (res as any)?.data || res;
        if (isMounted && Array.isArray(data)) {
          setRevisions(data);
        }
      } catch {
        // silently fallback to propRevisions
      }
    }

    fetchRevisions();
    return () => {
      isMounted = false;
    };
  }, [open, messageId, projectId]);

  // Live Timer for Stage Dwell Time
  const isTerminal = workflow.status === "DISPATCHED";
  const { elapsedMinutes, elapsedFormatted, slaStatus } = useElapsedTimer({
    startTimeISO: workflow.stageStartedAt || workflow.requestedAt,
    slaTargetMinutes: workflow.slaTargetMinutes || 30,
    isTerminal,
  });

  const canEdit = Boolean(capabilities?.canEdit ?? isCurrentUser);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(editText || messageText);
    toast.success("Message copied to clipboard");
  };

  const handleLeadApprove = async () => {
    setIsSubmitting(true);
    try {
      if (projectId && messageId) {
        const res = await api.post<any>(
          `/projects/${projectId}/messages/${messageId}/approval/lead-approve`,
          { notes: approvalNotes.trim() || undefined }
        );
        const data = (res as any)?.data || res;
        if (data && onUpdateApproval) {
          onUpdateApproval(data);
        }
      } else {
        const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const newAudit: ApprovalStageAudit = {
          id: `aud-${Date.now()}`,
          stageName: "Tech Lead Approved",
          stageKey: "LEAD_REVIEW",
          actorName: "Tech Lead",
          actorRole: "Project Lead",
          timestamp,
          durationMinutes: elapsedMinutes || 1,
          notes: approvalNotes.trim() || "Code quality, compliance schemas, and deliverable packages approved for client release.",
        };
        onUpdateApproval?.({
          ...workflow,
          status: "PENDING_SALES",
          leadApprovedBy: "Tech Lead",
          leadApprovedAt: timestamp,
          currentStageDwellMinutes: 0,
          totalTurnaroundMinutes: (workflow.totalTurnaroundMinutes || 0) + (elapsedMinutes || 1),
          auditTrail: [...(workflow.auditTrail || []), newAudit],
        });
      }
      toast.success("Approved internally! Forwarded to Sales Lead for dispatch.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve message");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDispatch = async () => {
    setIsSubmitting(true);
    try {
      if (projectId && messageId) {
        const res = await api.post<any>(
          `/projects/${projectId}/messages/${messageId}/approval/sales-dispatch`,
          {
            dispatchPlatform,
            dispatchReferenceId: dispatchReferenceId.trim() || undefined,
          }
        );
        const data = (res as any)?.data || res;
        if (data && onUpdateApproval) {
          onUpdateApproval(data);
        }
      } else {
        const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const newAudit: ApprovalStageAudit = {
          id: `aud-${Date.now()}`,
          stageName: "Dispatched to Client",
          stageKey: "DISPATCHED",
          actorName: "Account Manager",
          actorRole: "Sales & Client Dispatch",
          timestamp,
          durationMinutes: elapsedMinutes || 1,
          notes: `Dispatched to ${workflow.targetClient} via ${dispatchPlatform} (${dispatchReferenceId}).`,
        };
        onUpdateApproval?.({
          ...workflow,
          status: "DISPATCHED",
          salesDispatchedBy: "Account Manager",
          salesDispatchedAt: timestamp,
          dispatchPlatform,
          dispatchReferenceId,
          currentStageDwellMinutes: 0,
          totalTurnaroundMinutes: (workflow.totalTurnaroundMinutes || 0) + (elapsedMinutes || 1),
          auditTrail: [...(workflow.auditTrail || []), newAudit],
        });
      }
      setIsDispatching(false);
      toast.success(`Confirmed dispatched to ${workflow.targetClient}!`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to confirm dispatch");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for the revision request");
      return;
    }
    setIsSubmitting(true);
    try {
      if (projectId && messageId) {
        const res = await api.post<any>(
          `/projects/${projectId}/messages/${messageId}/approval/reject`,
          { rejectionReason: rejectionReason.trim() }
        );
        const data = (res as any)?.data || res;
        if (data && onUpdateApproval) {
          onUpdateApproval(data);
        }
      } else {
        const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const newAudit: ApprovalStageAudit = {
          id: `aud-${Date.now()}`,
          stageName: "Revision Requested",
          stageKey: "REVISION_REQUESTED",
          actorName: "Reviewer",
          actorRole: "Project Lead",
          timestamp,
          durationMinutes: elapsedMinutes || 1,
          notes: rejectionReason.trim(),
        };
        onUpdateApproval?.({
          ...workflow,
          status: "REVISION_REQUESTED",
          rejectedBy: "Reviewer",
          rejectedAt: timestamp,
          rejectionReason: rejectionReason.trim(),
          currentStageDwellMinutes: 0,
          auditTrail: [...(workflow.auditTrail || []), newAudit],
        });
      }
      setIsRejecting(false);
      setRejectionReason("");
      toast.success("Revision requested from author");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to request revision");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndResubmit = async () => {
    if (!editText.trim()) {
      toast.error("Message text cannot be empty");
      return;
    }
    setIsSubmitting(true);
    try {
      if (messageId && onEdit) {
        await onEdit(messageId, editText.trim(), editReason.trim() || "Author addressed feedback and resubmitted draft");
      }
      setIsEditingContent(false);
      setEditReason("");
      toast.success("Draft updated and resubmitted");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update draft");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[340px] sm:min-w-[640px] md:min-w-[860px] lg:min-w-[1020px] xl:min-w-[1140px] max-w-6xl w-[95vw] p-0 h-[88vh] max-h-[880px] flex flex-col overflow-hidden bg-card text-card-foreground border-border/80 shadow-2xl rounded-2xl">
        {/* 1. Header Bar */}
        <DispatchModalHeader
          projectCode={projectCode}
          targetClient={workflow.targetClient}
          requestedBy={workflow.requestedBy}
          requestedAt={workflow.requestedAt}
          status={workflow.status}
          elapsedFormatted={elapsedFormatted}
        />

        {/* 2. Visual Progression Stepper */}
        <DispatchModalStepper
          workflow={workflow}
          elapsedFormatted={elapsedFormatted}
        />

        {/* 3. Main Dual-Pane Command Center Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-border/60 bg-muted/10">
          {/* Left Column: Message Content & Deliverables */}
          <DispatchMessageCanvas
            workflow={workflow}
            messageText={messageText}
            editText={editText}
            setEditText={setEditText}
            editReason={editReason}
            setEditReason={setEditReason}
            isEditingContent={isEditingContent}
            setIsEditingContent={setIsEditingContent}
            canEdit={canEdit}
            isSubmitting={isSubmitting}
            onSaveAndResubmit={handleSaveAndResubmit}
            onCopyMessage={handleCopyMessage}
            attachments={attachments}
            seenBy={seenBy}
            revisionCount={revisions.length}
          />

          {/* Right Column: Review Console & Audit Timeline */}
          <div className="lg:col-span-6 flex flex-col min-h-0 overflow-hidden bg-muted/20 p-4 gap-3">
            {/* Contextual Action Console */}
            <div className="shrink-0">
              <DispatchActionConsole
                workflow={workflow}
                capabilities={capabilities}
                isRejecting={isRejecting}
                setIsRejecting={setIsRejecting}
                rejectionReason={rejectionReason}
                setRejectionReason={setRejectionReason}
                approvalNotes={approvalNotes}
                setApprovalNotes={setApprovalNotes}
                dispatchPlatform={dispatchPlatform}
                setDispatchPlatform={setDispatchPlatform}
                dispatchReferenceId={dispatchReferenceId}
                setDispatchReferenceId={setDispatchReferenceId}
                isSubmitting={isSubmitting}
                onLeadApprove={handleLeadApprove}
                onConfirmDispatch={handleConfirmDispatch}
                onReject={handleReject}
                canEdit={canEdit}
                isEditingContent={isEditingContent}
                setIsEditingContent={setIsEditingContent}
              />
            </div>

            {/* Comprehensive Action Audit & Revision Timeline */}
            <DispatchAuditTimeline
              workflow={workflow}
              revisions={revisions}
              elapsedFormatted={elapsedFormatted}
              isTerminal={isTerminal}
              currentContent={editText || messageText}
            />
          </div>
        </div>

        {/* 4. Modal Action Footer */}
        <div className="p-3.5 border-t border-border/60 bg-muted/20 shrink-0 flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button
              size="xs"
              variant="ghost"
              onClick={handleCopyMessage}
              className="h-7 text-xs gap-1 cursor-pointer"
            >
              <Copy className="size-3" /> Copy Message Text
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs cursor-pointer"
            >
              Close
            </Button>

            {(workflow.status === "IN_REVIEW" || workflow.status === "PENDING_LEAD") && !isRejecting && (capabilities?.canLeadApprove ?? true) && (
              <Button
                size="sm"
                onClick={handleLeadApprove}
                disabled={isSubmitting}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs gap-1"
              >
                {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Approve for Client
              </Button>
            )}

            {workflow.status === "PENDING_SALES" && !isDispatching && (capabilities?.canSalesDispatch ?? true) && (
              <Button
                size="sm"
                onClick={handleConfirmDispatch}
                disabled={isSubmitting}
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer shadow-xs gap-1.5"
              >
                {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Dispatch to Client
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
