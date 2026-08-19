"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import {
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  History,
  Building2,
  Eye,
  FileText,
  Copy,
  ExternalLink,
  ShieldCheck,
  Timer,
  FileCheck,
  ChevronRight,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import { MessageAttachmentPreview } from "./MessageAttachmentPreview";
import type { ApprovalWorkflow, ApprovalStageAudit, ChatAttachment, MessageReadReceipt } from "../types";

interface ClientDispatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: ApprovalWorkflow;
  messageText: string;
  attachments?: ChatAttachment[];
  seenBy?: MessageReadReceipt[];
  onUpdateApproval: (updated: ApprovalWorkflow) => void;
  projectCode?: string;
}

export function ClientDispatchModal({
  open,
  onOpenChange,
  workflow,
  messageText,
  attachments,
  seenBy,
  onUpdateApproval,
  projectCode = "PRJ-1048",
}: ClientDispatchModalProps) {
  const [activeTab, setActiveTab] = React.useState<"content" | "audit">("content");
  const [dispatchPlatform, setDispatchPlatform] = React.useState<ApprovalWorkflow["dispatchPlatform"]>("Direct Portal");
  const [dispatchReferenceId, setDispatchReferenceId] = React.useState(
    workflow.dispatchReferenceId || `APEX-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [isDispatching, setIsDispatching] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState("");

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    toast.success("Message copied to clipboard");
  };

  const handleLeadApprove = () => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newAudit: ApprovalStageAudit = {
      id: `aud-${Date.now()}`,
      stageName: "Tech Lead Approval",
      stageKey: "LEAD_REVIEW",
      actorName: "Fiamanillah",
      actorRole: "Principal Tech Lead",
      timestamp,
      durationMinutes: workflow.currentStageDwellMinutes || 8,
      notes: "Code quality, compliance schemas, and deliverable packages approved for client release.",
    };

    onUpdateApproval({
      ...workflow,
      status: "PENDING_SALES",
      leadApprovedBy: "Fiamanillah (Tech Lead)",
      leadApprovedAt: timestamp,
      currentStageDwellMinutes: 0,
      totalTurnaroundMinutes: (workflow.totalTurnaroundMinutes || 0) + (workflow.currentStageDwellMinutes || 8),
      auditTrail: [...(workflow.auditTrail || []), newAudit],
    });
    toast.success("Approved internally! Forwarded to Sales Lead for dispatch.");
    onOpenChange(false);
  };

  const handleConfirmDispatch = () => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newAudit: ApprovalStageAudit = {
      id: `aud-${Date.now()}`,
      stageName: "Client Dispatch",
      stageKey: "DISPATCHED",
      actorName: "Marcus Vance",
      actorRole: "Key Account & Sales Manager",
      timestamp,
      durationMinutes: workflow.currentStageDwellMinutes || 4,
      notes: `Dispatched to ${workflow.targetClient} via ${dispatchPlatform} (${dispatchReferenceId}).`,
    };

    onUpdateApproval({
      ...workflow,
      status: "DISPATCHED",
      salesDispatchedBy: "Marcus Vance (Sales Lead)",
      salesDispatchedAt: timestamp,
      dispatchPlatform,
      dispatchReferenceId,
      currentStageDwellMinutes: 0,
      totalTurnaroundMinutes: (workflow.totalTurnaroundMinutes || 0) + (workflow.currentStageDwellMinutes || 4),
      auditTrail: [...(workflow.auditTrail || []), newAudit],
    });
    setIsDispatching(false);
    toast.success(`Confirmed dispatched to ${workflow.targetClient}!`);
    onOpenChange(false);
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error("Please enter revision feedback");
      return;
    }
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newAudit: ApprovalStageAudit = {
      id: `aud-${Date.now()}`,
      stageName: "Revision Requested",
      stageKey: "REVISION_REQUESTED",
      actorName: "Fiamanillah",
      actorRole: "Principal Tech Lead",
      timestamp,
      notes: rejectionReason,
    };

    onUpdateApproval({
      ...workflow,
      status: "REVISION_REQUESTED",
      rejectedBy: "Fiamanillah (Tech Lead)",
      rejectedAt: timestamp,
      rejectionReason,
      auditTrail: [...(workflow.auditTrail || []), newAudit],
    });
    setIsRejecting(false);
    toast.info("Revision feedback submitted to author");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 max-h-[90vh] flex flex-col overflow-hidden bg-card text-card-foreground border-border/80 shadow-2xl rounded-2xl">
        {/* 1. Header with Gradient Accent */}
        <DialogHeader className="p-4 bg-gradient-to-r from-primary/10 via-sky-500/10 to-background border-b border-border/60 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs font-bold text-xs shrink-0">
                <Send className="size-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20 shrink-0">
                    {projectCode}
                  </span>
                  <DialogTitle className="text-sm font-bold text-foreground truncate">
                    Client Outbound Dispatch
                  </DialogTitle>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  Target Client: <strong className="text-foreground">{workflow.targetClient}</strong> • Author: {workflow.requestedBy}
                </p>
              </div>
            </div>

            {/* Status Pill */}
            <div className="shrink-0">
              {workflow.status === "PENDING_LEAD" && (
                <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 text-xs font-semibold py-1 gap-1">
                  <Clock className="size-3 animate-spin" /> Pending Lead Review ({workflow.currentStageDwellMinutes}m)
                </Badge>
              )}
              {workflow.status === "PENDING_SALES" && (
                <Badge variant="outline" className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40 text-xs font-semibold py-1 gap-1">
                  <Clock className="size-3 animate-spin" /> Awaiting Sales Dispatch ({workflow.currentStageDwellMinutes}m)
                </Badge>
              )}
              {workflow.status === "DISPATCHED" && (
                <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-xs font-semibold py-1 gap-1">
                  <CheckCircle2 className="size-3" /> Dispatched to Client
                </Badge>
              )}
              {workflow.status === "REVISION_REQUESTED" && (
                <Badge variant="outline" className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 text-xs font-semibold py-1 gap-1">
                  <AlertTriangle className="size-3" /> Revision Requested
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* 2. Stepper Progress Bar (Visual Lifecycle) */}
        <div className="bg-muted/30 px-4 py-3 border-b border-border/50 shrink-0">
          <div className="grid grid-cols-3 gap-2">
            {/* Step 1 */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-background/80 border border-border/50">
              <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold shrink-0">
                ✓
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-foreground truncate">1. Drafted</p>
                <p className="text-[10px] text-muted-foreground truncate">{workflow.requestedBy} • {workflow.requestedAt}</p>
              </div>
            </div>

            {/* Step 2 */}
            <div
              className={cn(
                "flex items-center gap-2 p-2 rounded-xl border transition-colors",
                workflow.leadApprovedBy
                  ? "bg-background/80 border-border/50"
                  : workflow.status === "PENDING_LEAD"
                  ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30"
                  : "bg-muted/20 border-border/30 opacity-60"
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-bold shrink-0",
                  workflow.leadApprovedBy
                    ? "bg-emerald-500 text-white"
                    : workflow.status === "PENDING_LEAD"
                    ? "bg-amber-500 text-white animate-pulse"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {workflow.leadApprovedBy ? "✓" : "2"}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-foreground truncate">2. Lead Review</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {workflow.leadApprovedBy ? `Approved • ${workflow.leadApprovedAt}` : "Pending Tech Lead"}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div
              className={cn(
                "flex items-center gap-2 p-2 rounded-xl border transition-colors",
                workflow.status === "DISPATCHED"
                  ? "bg-background/80 border-border/50"
                  : workflow.status === "PENDING_SALES"
                  ? "bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/30"
                  : "bg-muted/20 border-border/30 opacity-60"
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-bold shrink-0",
                  workflow.status === "DISPATCHED"
                    ? "bg-emerald-500 text-white"
                    : workflow.status === "PENDING_SALES"
                    ? "bg-blue-500 text-white animate-pulse"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {workflow.status === "DISPATCHED" ? "✓" : "3"}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-foreground truncate">3. Client Dispatch</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {workflow.salesDispatchedBy ? `Sent • ${workflow.salesDispatchedAt}` : "Pending Sales Lead"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Tab Switcher (Content vs Audit Trail) */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-2 border-b border-border/50 bg-muted/10 shrink-0">
            <TabsList className="grid grid-cols-2 h-8 w-64 bg-muted/60 p-0.5 rounded-lg">
              <TabsTrigger value="content" className="text-xs font-semibold gap-1.5">
                <FileText className="size-3" /> Communication
              </TabsTrigger>
              <TabsTrigger value="audit" className="text-xs font-semibold gap-1.5">
                <History className="size-3" /> Action Audit ({workflow.auditTrail?.length || 1})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 4. Tab Content with Shadcn ScrollArea */}
          <ScrollArea className="flex-1 overflow-hidden">
            {/* Tab 1: Content */}
            <TabsContent value="content" className="p-4 space-y-4 text-xs mt-0">
              {/* Message Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Message Body
                  </span>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={handleCopyMessage}
                    className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Copy className="size-2.5" /> Copy Text
                  </Button>
                </div>
                <div className="rounded-xl border border-border/80 bg-background/90 p-3.5 text-foreground leading-relaxed whitespace-pre-wrap font-sans text-xs shadow-2xs">
                  {messageText}
                </div>
              </div>

              {/* Handover Attachments */}
              {attachments && attachments.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Attached Media & Documents ({attachments.length})
                  </span>
                  <MessageAttachmentPreview attachments={attachments} />
                </div>
              )}

              {/* Revision feedback note if rejected */}
              {workflow.status === "REVISION_REQUESTED" && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-rose-700 dark:text-rose-300 text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <span>Revision Requested by {workflow.rejectedBy} ({workflow.rejectedAt}):</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed break-words">{workflow.rejectionReason}</p>
                </div>
              )}

              {/* Verified Dispatch Badge if sent */}
              {workflow.status === "DISPATCHED" && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      Dispatched via <strong>{workflow.dispatchPlatform}</strong> • Reference: <code className="font-mono font-bold bg-background/80 px-1.5 py-0.5 rounded">{workflow.dispatchReferenceId}</code>
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    By {workflow.salesDispatchedBy} at {workflow.salesDispatchedAt}
                  </span>
                </div>
              )}

              {/* Team Read Receipts */}
              {seenBy && seenBy.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-muted/20 p-2.5 space-y-2">
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                    <Eye className="size-3 text-primary" /> Seen by {seenBy.length} team members
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {seenBy.map((r) => (
                      <div key={r.userId} className="flex items-center gap-1.5 bg-background/90 border border-border/50 rounded-lg px-2 py-1 text-[11px]">
                        <Avatar className="size-4.5 rounded-full ring-1 ring-border/40 shrink-0">
                          <AvatarImage src={r.userAvatar} alt={r.userName} />
                          <AvatarFallback className="text-[8px] font-bold">
                            {r.userName.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-foreground">{r.userName}</span>
                        <span className="font-mono text-[9px] text-muted-foreground">• {r.seenAt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab 2: Action Audit Trail */}
            <TabsContent value="audit" className="p-4 space-y-3 text-xs mt-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Lifecycle Action Logs & Stage Dwell Time
                </span>
                {workflow.totalTurnaroundMinutes ? (
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-mono font-bold">
                    Total Dwell Time: {workflow.totalTurnaroundMinutes} mins
                  </span>
                ) : null}
              </div>

              <div className="space-y-3 pt-1">
                {workflow.auditTrail && workflow.auditTrail.length > 0 ? (
                  workflow.auditTrail.map((audit, i) => (
                    <div key={audit.id || i} className="flex items-start gap-3 p-2.5 rounded-xl bg-background/90 border border-border/60 shadow-2xs">
                      <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px] shrink-0 mt-0.5 font-mono">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="font-bold text-foreground text-xs">
                            {audit.stageName} — {audit.actorName}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {audit.timestamp} {audit.durationMinutes ? `(+${audit.durationMinutes}m)` : ""}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium">{audit.actorRole}</p>
                        {audit.notes && (
                          <p className="text-[11px] text-foreground/80 mt-1 leading-relaxed bg-muted/40 p-2 rounded-lg border border-border/40">
                            {audit.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">
                    Draft created by {workflow.requestedBy} at {workflow.requestedAt}.
                  </p>
                )}
              </div>
            </TabsContent>
          </ScrollArea>

          {/* Form for revision reason if rejecting */}
          {isRejecting && (
            <div className="p-3 bg-rose-500/10 border-t border-rose-500/30 space-y-2">
              <label className="text-xs font-bold text-rose-700 dark:text-rose-300">
                Enter Revision Feedback for {workflow.requestedBy}:
              </label>
              <Input
                autoFocus
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Please verify test coverage and attach swagger spec before sending."
                className="h-8 text-xs bg-background"
              />
              <div className="flex justify-end gap-2">
                <Button size="xs" variant="ghost" onClick={() => setIsRejecting(false)} className="h-7 text-xs">
                  Cancel
                </Button>
                <Button size="xs" variant="destructive" onClick={handleReject} className="h-7 text-xs font-bold">
                  Submit Feedback
                </Button>
              </div>
            </div>
          )}

          {/* Form for dispatching if confirmed */}
          {isDispatching && (
            <div className="p-3 bg-primary/5 border-t border-primary/30 space-y-2.5">
              <label className="text-xs font-bold text-foreground">
                Dispatch Confirmation & External Channel:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-1">Platform</span>
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
                  <span className="text-[10px] text-muted-foreground block mb-1">Dispatch Reference / ID</span>
                  <Input
                    value={dispatchReferenceId}
                    onChange={(e) => setDispatchReferenceId(e.target.value)}
                    placeholder="e.g. MSG-9912"
                    className="h-8 text-xs bg-background font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button size="xs" variant="ghost" onClick={() => setIsDispatching(false)} className="h-7 text-xs">
                  Cancel
                </Button>
                <Button size="xs" onClick={handleConfirmDispatch} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1">
                  <CheckCircle2 className="size-3" /> Confirm Dispatched
                </Button>
              </div>
            </div>
          )}
        </Tabs>

        {/* 5. Modal Action Footer */}
        <div className="p-3.5 border-t border-border/60 bg-muted/20 shrink-0 flex items-center justify-between w-full">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs cursor-pointer"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            {workflow.status === "PENDING_LEAD" && !isRejecting && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsRejecting(true)}
                  className="h-8 text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
                >
                  <X className="size-3.5 mr-1" /> Request Revision
                </Button>
                <Button
                  size="sm"
                  onClick={handleLeadApprove}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs gap-1"
                >
                  <Check className="size-3.5" /> Approve for Client
                </Button>
              </>
            )}

            {workflow.status === "PENDING_SALES" && !isDispatching && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsRejecting(true)}
                  className="h-8 text-xs text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  <RotateCcw className="size-3.5 mr-1" /> Return for Edits
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsDispatching(true)}
                  className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer shadow-xs gap-1.5"
                >
                  <Send className="size-3.5" /> Dispatch to Client
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
