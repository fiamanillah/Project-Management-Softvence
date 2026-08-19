"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Building2,
  Reply,
  Copy,
  Package,
  Sparkles,
  Hourglass,
  CreditCard,
  FileEdit,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import { ClientDispatchModal } from "./ClientDispatchModal";
import { MessageAttachmentPreview } from "./MessageAttachmentPreview";
import { MessageSeenReceipts } from "./MessageSeenReceipts";
import { MessageReactionPicker } from "./MessageReactionPicker";
import { getMessageTheme } from "../message-theme";
import type { ApprovalWorkflow, ChatAttachment, MessageReadReceipt, ChatReaction, OutboundMessageType } from "../types";

interface ClientDispatchCardProps {
  id?: string;
  workflow: ApprovalWorkflow;
  onUpdateApproval: (updated: ApprovalWorkflow) => void;
  isCurrentUser: boolean;
  messageText: string;
  attachments?: ChatAttachment[];
  seenBy?: MessageReadReceipt[];
  timestamp: string;
  senderName?: string;
  senderAvatar?: string;
  senderDesignation?: string;
  reactions?: ChatReaction[];
  onReact?: (messageId: string, emoji: string) => void;
  onReply: () => void;
  isHighlighted?: boolean;
}

export function ClientDispatchCard({
  id,
  workflow,
  onUpdateApproval,
  isCurrentUser,
  messageText,
  attachments,
  seenBy,
  timestamp,
  senderName,
  senderAvatar,
  senderDesignation,
  reactions,
  onReact,
  onReply,
  isHighlighted = false,
}: ClientDispatchCardProps) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const outboundType = workflow.outboundType || workflow.clientMessageType || "GENERAL_NOTICE";
  const theme = getMessageTheme(outboundType, "OUTBOUND");
  const isLongMessage = messageText.length > 180 || messageText.split("\n").length > 3;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    toast.success("Outbound message copied to clipboard");
  };

  const hasReactions = reactions && reactions.length > 0;

  // Render tag indicating what kind of outbound message this is (using fixed theme color)
  const renderOutboundTypeTag = () => {
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full gap-1.5 shrink-0 shadow-2xs",
          theme.badgeClass
        )}
      >
        <span className={cn("size-2 rounded-full shrink-0 shadow-xs", theme.dotColorClass)} />
        <span>{theme.label}</span>
      </Badge>
    );
  };

  return (
    <>
      <div
        id={id ? `msg-${id}` : undefined}
        className={cn(
          "w-full flex justify-end my-2 min-w-0 transition-all duration-300 rounded-2xl p-0.5",
          isHighlighted ? "ring-2 ring-primary ring-offset-2 bg-primary/10" : ""
        )}
      >
        {/* Right-aligned container with left gap simulating real conversation */}
        <div className="relative flex flex-col items-end w-full max-w-[92%] sm:max-w-[85%] md:max-w-[78%] min-w-0">
          {/* Sender Header + Client Dispatch Info */}
          <div className="flex items-center gap-1.5 px-1 mb-1 text-xs min-w-0 max-w-full justify-end flex-wrap">
            {senderName && (
              <span className="font-semibold text-foreground tracking-tight text-[11px] truncate">
                {senderName}
                {senderDesignation && (
                  <span className="text-[10px] text-muted-foreground font-normal ml-1 hidden xs:inline">
                    ({senderDesignation})
                  </span>
                )}
              </span>
            )}
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/30 text-[9px] font-bold px-1.5 py-0 rounded gap-1"
            >
              <Send className="size-2.5" /> Outbound Dispatch
            </Badge>
          </div>

          {/* Outbound Card Wrapper (Anchors Floating Action Bar and Reactions directly to the Card) */}
          <div className={cn("group/outbound-card relative w-full rounded-2xl min-w-0", hasReactions ? "mb-2" : "")}>
            {/* Floating Action Bar on Hover (Reaction, Reply, Copy) - Directly attached to top edge of the Card */}
            <div className="absolute -top-3 right-3 z-30 opacity-0 group-hover/outbound-card:opacity-100 transition-opacity duration-150 pointer-events-none group-hover/outbound-card:pointer-events-auto flex items-center gap-0.5 rounded-full border border-border/80 bg-background/95 px-1.5 py-0.5 shadow-md backdrop-blur-md">
              {id && onReact && (
                <MessageReactionPicker onSelectEmoji={(emoji) => onReact(id, emoji)} />
              )}
              <Button
                size="icon-xs"
                variant="ghost"
                className="size-6 text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
                title="Reply"
                onClick={onReply}
              >
                <Reply className="size-3 rotate-180" />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                className="size-6 text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
                title="Copy text"
                onClick={handleCopy}
              >
                <Copy className="size-3" />
              </Button>
            </div>

            {/* Outbound Card Surface with One-Side Theme Border and Header Tint */}
            <div
              className={cn(
                "w-full rounded-2xl border bg-card/95 shadow-2xs text-card-foreground overflow-hidden border-l-4",
                theme.cardBorderClass,
                theme.borderAccentClass,
                theme.ambientBgClass
              )}
            >
              {/* 1. Card Header: Target Client & Outbound Type Tag on Left, Status Badge on Right */}
              <div
                onClick={() => setModalOpen(true)}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2 border-b cursor-pointer transition-colors min-w-0",
                  theme.headerBgClass,
                  theme.headerBorderClass
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap flex-1">
                  <span className="text-[11px] font-bold text-foreground truncate">
                    To: {workflow.targetClient}
                  </span>
                  {renderOutboundTypeTag()}
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-auto">
                  {workflow.status === "PENDING_LEAD" && (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] sm:text-[10px] gap-1 font-semibold py-0.5 px-1.5 truncate max-w-[130px] sm:max-w-none"
                    >
                      <Clock className="size-2.5 animate-spin shrink-0" />
                      <span className="truncate">Lead Review ({workflow.currentStageDwellMinutes}m)</span>
                    </Badge>
                  )}

                  {workflow.status === "PENDING_SALES" && (
                    <Badge
                      variant="outline"
                      className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[9px] sm:text-[10px] gap-1 font-semibold py-0.5 px-1.5 truncate max-w-[130px] sm:max-w-none"
                    >
                      <Clock className="size-2.5 animate-spin shrink-0" />
                      <span className="truncate">Sales Dispatch ({workflow.currentStageDwellMinutes}m)</span>
                    </Badge>
                  )}

                  {workflow.status === "DISPATCHED" && (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] sm:text-[10px] gap-1 font-semibold py-0.5 px-1.5 truncate"
                    >
                      <CheckCircle2 className="size-2.5 shrink-0" />
                      <span>Dispatched</span>
                    </Badge>
                  )}

                  {workflow.status === "REVISION_REQUESTED" && (
                    <Badge
                      variant="outline"
                      className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[9px] sm:text-[10px] gap-1 font-semibold py-0.5 px-1.5 truncate"
                    >
                      <AlertTriangle className="size-2.5 shrink-0" />
                      <span>Revision Req.</span>
                    </Badge>
                  )}

                  <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                </div>
              </div>

              {/* 2. Message Body & Attachments */}
              <div className="p-3 space-y-2 min-w-0">
                <div className="text-xs leading-relaxed text-foreground font-sans break-words [overflow-wrap:anywhere]">
                  {isLongMessage && !isExpanded ? (
                    <>
                      <p className="line-clamp-3 whitespace-pre-wrap">{messageText}</p>
                      <button
                        type="button"
                        onClick={() => setIsExpanded(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline mt-1 cursor-pointer"
                      >
                        Show full message <ChevronDown className="size-3" />
                      </button>
                    </>
                  ) : isLongMessage && isExpanded ? (
                    <>
                      <p className="whitespace-pre-wrap">{messageText}</p>
                      <button
                        type="button"
                        onClick={() => setIsExpanded(false)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline mt-1 cursor-pointer"
                      >
                        Show less <ChevronUp className="size-3" />
                      </button>
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap">{messageText}</p>
                  )}
                </div>

                {attachments && attachments.length > 0 && (
                  <div className="pt-1">
                    <MessageAttachmentPreview attachments={attachments} />
                  </div>
                )}

                {/* Revision Note Banner if Rejected */}
                {workflow.status === "REVISION_REQUESTED" && (
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="flex w-full items-center justify-between gap-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 p-2 text-rose-700 dark:text-rose-300 text-[11px] text-left cursor-pointer hover:bg-rose-500/15 transition-colors min-w-0"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <AlertTriangle className="size-3.5 shrink-0 text-rose-500" />
                      <span className="truncate">
                        <strong>Revision Note:</strong> {workflow.rejectionReason}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 shrink-0">
                      Details →
                    </span>
                  </button>
                )}

                {/* Dispatched Snippet if Sent */}
                {workflow.status === "DISPATCHED" && (
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="flex w-full items-center justify-between gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2 text-emerald-800 dark:text-emerald-300 text-[11px] text-left cursor-pointer hover:bg-emerald-500/15 transition-colors min-w-0"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                      <span className="truncate">
                        Dispatched via <strong>{workflow.dispatchPlatform}</strong> • {workflow.dispatchReferenceId}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      Audit →
                    </span>
                  </button>
                )}
              </div>

              {/* 3. Interactive Footer Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/25 px-3 py-2 border-t border-border/40 text-[10px] text-muted-foreground rounded-b-2xl min-w-0">
                {/* Left: Timestamp + Seen By + Timeline Trigger */}
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="shrink-0 font-medium">{timestamp}</span>

                  {seenBy && seenBy.length > 0 && (
                    <MessageSeenReceipts seenBy={seenBy} align="end" />
                  )}

                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline cursor-pointer shrink-0"
                  >
                    <History className="size-3" />
                    <span>Timeline ({workflow.auditTrail?.length || 1})</span>
                  </button>
                </div>

                {/* Right: Quick Action Trigger */}
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  {workflow.status === "PENDING_LEAD" && (
                    <Button
                      size="xs"
                      onClick={() => setModalOpen(true)}
                      className="h-6.5 text-[10px] sm:text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-2xs gap-1 px-2.5 shrink-0"
                    >
                      <Check className="size-3" /> Review & Approve
                    </Button>
                  )}

                  {workflow.status === "PENDING_SALES" && (
                    <Button
                      size="xs"
                      onClick={() => setModalOpen(true)}
                      className="h-6.5 text-[10px] sm:text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer shadow-2xs gap-1 px-2.5 shrink-0"
                    >
                      <Send className="size-3" /> Dispatch to Client
                    </Button>
                  )}

                  {(workflow.status === "DISPATCHED" || workflow.status === "REVISION_REQUESTED") && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setModalOpen(true)}
                      className="h-6.5 text-[10px] font-medium cursor-pointer shrink-0"
                    >
                      View Audit Details
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Reaction Badges Row (Positioned below card to avoid overlapping action buttons) */}
            {hasReactions && id && onReact && (
              <div className="flex items-center justify-end gap-1 mt-1.5 flex-wrap">
                {reactions.map((r) => (
                  <button
                    key={r.emoji}
                    type="button"
                    onClick={() => onReact(id, r.emoji)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-transform hover:scale-110 active:scale-95 cursor-pointer border shadow-2xs",
                      r.reactedByMe
                        ? "bg-primary/20 text-primary border-primary/40 font-bold"
                        : "bg-background/90 text-muted-foreground hover:text-foreground border-border/70"
                    )}
                    title={`${r.count} reactions`}
                  >
                    <span>{r.emoji}</span>
                    <span className="text-[10px] font-semibold">{r.count}</span>
                  </button>
                ))}
                <MessageReactionPicker onSelectEmoji={(emoji) => onReact(id, emoji)} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Detail & Action Modal */}
      <ClientDispatchModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        workflow={workflow}
        messageText={messageText}
        attachments={attachments}
        seenBy={seenBy}
        onUpdateApproval={onUpdateApproval}
      />
    </>
  );
}
