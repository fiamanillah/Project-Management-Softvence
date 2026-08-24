// apps/dashboard/app/dashboard/projects/components/manage-workspace/chat-panel/dispatch-modal/DispatchMessageCanvas.tsx
"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import {
  FileText,
  Copy,
  Pencil,
  Loader2,
  Check,
  Paperclip,
  Building2,
  Eye,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { FormattedMessageText } from "../FormattedMessageText";
import { MessageAttachmentPreview } from "../MessageAttachmentPreview";
import { formatMessageRelativeTime } from "../date-utils";
import type {
  ApprovalWorkflow,
  ChatAttachment,
  MessageReadReceipt,
} from "../../types";

interface DispatchMessageCanvasProps {
  workflow: ApprovalWorkflow;
  messageText: string;
  editText: string;
  setEditText: (text: string) => void;
  editReason: string;
  setEditReason: (reason: string) => void;
  isEditingContent: boolean;
  setIsEditingContent: (editing: boolean) => void;
  canEdit: boolean;
  isSubmitting: boolean;
  onSaveAndResubmit: () => void;
  onCopyMessage: () => void;
  attachments?: ChatAttachment[];
  seenBy?: MessageReadReceipt[];
  revisionCount: number;
}

export function DispatchMessageCanvas({
  workflow,
  messageText,
  editText,
  setEditText,
  editReason,
  setEditReason,
  isEditingContent,
  setIsEditingContent,
  canEdit,
  isSubmitting,
  onSaveAndResubmit,
  onCopyMessage,
  attachments,
  seenBy,
  revisionCount,
}: DispatchMessageCanvasProps) {
  const wordCount = (editText || messageText).trim().split(/\s+/).filter(Boolean).length;
  const charCount = (editText || messageText).length;

  return (
    <div className="lg:col-span-6 flex flex-col min-h-0 overflow-hidden bg-background/50">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3.5">
          {/* Revision Feedback Banner (if active) */}
          {workflow.status === "REVISION_REQUESTED" && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 space-y-2 text-xs text-rose-800 dark:text-rose-300 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="size-4 text-rose-600 shrink-0" />
                  <span>Revision Feedback from {workflow.rejectedBy}:</span>
                </div>
                {!isEditingContent && canEdit && (
                  <Button
                    size="xs"
                    variant="default"
                    onClick={() => setIsEditingContent(true)}
                    className="h-6.5 text-[11px] bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1 cursor-pointer"
                  >
                    <Pencil className="size-3" /> Edit Draft
                  </Button>
                )}
              </div>
              <p className="text-[12px] bg-background/90 p-2.5 rounded-lg border border-rose-500/20 leading-relaxed font-medium">
                {workflow.rejectionReason}
              </p>
            </div>
          )}

          {/* Verified Dispatch Banner (if Dispatched) */}
          {workflow.status === "DISPATCHED" && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-900 dark:text-emerald-300 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span className="truncate">
                  Dispatched via <strong>{workflow.dispatchPlatform}</strong> • Reference: <code className="font-mono font-bold bg-background/80 px-1.5 py-0.5 rounded text-foreground">{workflow.dispatchReferenceId}</code>
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                By {workflow.salesDispatchedBy} at {workflow.salesDispatchedAt}
              </span>
            </div>
          )}

          {/* Message Content Section */}
          <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  {isEditingContent ? "Editing Message Draft" : "Outbound Message Content"}
                </span>
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-muted/60">
                  {wordCount} words • {charCount} chars
                </Badge>
                {revisionCount > 0 && (
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                    {revisionCount} revision(s)
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {!isEditingContent && canEdit && (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setIsEditingContent(true)}
                    className="h-6.5 text-[10px] gap-1 cursor-pointer"
                  >
                    <Pencil className="size-3" /> Edit Draft
                  </Button>
                )}
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={onCopyMessage}
                  className="h-6.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Copy className="size-3" /> Copy
                </Button>
              </div>
            </div>

            {isEditingContent ? (
              <div className="space-y-3 pt-1">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={8}
                  className="w-full text-xs bg-background text-foreground resize-y border-border focus:ring-1 focus:ring-primary rounded-xl font-sans leading-relaxed"
                  placeholder="Write or refine the outbound client message..."
                  autoFocus
                />

                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    Revision Notes / Explanation of Changes:
                  </label>
                  <Input
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="e.g. Addressed lead feedback, updated deliverables timeline"
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingContent(false);
                      setEditText(messageText);
                    }}
                    disabled={isSubmitting}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    onClick={onSaveAndResubmit}
                    disabled={isSubmitting}
                    className="h-7 text-xs bg-primary text-primary-foreground font-bold gap-1 cursor-pointer"
                  >
                    {isSubmitting ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                    Save & Resubmit to Tech Lead
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans bg-muted/20 p-3.5 rounded-lg border border-border/40 min-h-[120px]">
                <FormattedMessageText text={messageText} isCurrentUser={false} />
              </div>
            )}
          </div>

          {/* Handover Media & Document Attachments */}
          {attachments && attachments.length > 0 && (
            <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between gap-1 text-xs font-bold text-foreground pb-1 border-b border-border/50">
                <span className="flex items-center gap-1.5">
                  <Paperclip className="size-3.5 text-primary" />
                  <span>Attached Deliverables & Media</span>
                </span>
                <Badge variant="outline" className="text-[10px] font-mono bg-muted/60">
                  {attachments.length} file(s)
                </Badge>
              </div>
              <MessageAttachmentPreview attachments={attachments} />
            </div>
          )}

          {/* Client Target & Communication Meta Card */}
          <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2 text-xs shadow-2xs">
            <div className="flex items-center justify-between text-muted-foreground text-[11px] pb-1 border-b border-border/40">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" /> Delivery Channel Meta
              </span>
              <span>Direct Outbound</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-muted/30 border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Client Name</span>
                <strong className="text-foreground truncate block">{workflow.targetClient}</strong>
              </div>
              <div className="p-2 rounded-lg bg-muted/30 border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Channel Platform</span>
                <strong className="text-foreground truncate block">{workflow.dispatchPlatform || "Direct Client Portal"}</strong>
              </div>
            </div>
          </div>

          {/* Team Read Receipts */}
          {seenBy && seenBy.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-card p-2.5 flex items-center justify-between gap-2 shadow-2xs">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                <Eye className="size-3.5 text-primary" /> Seen by {seenBy.length} team members
              </span>
              <div className="flex items-center -space-x-1.5">
                {seenBy.slice(0, 6).map((r) => (
                  <Avatar
                    key={r.userId}
                    className="size-5 rounded-full ring-2 ring-background border border-border/40"
                    title={`${r.userName} (${formatMessageRelativeTime(r.seenAt) || r.seenAt})`}
                  >
                    <AvatarImage src={r.userAvatar} alt={r.userName} />
                    <AvatarFallback className="text-[8px] font-bold">
                      {r.userName.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
