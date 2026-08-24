"use client";

import * as React from "react";
import { Bubble, BubbleContent, BubbleReactions } from "@workspace/ui/components/bubble";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import {
  ChevronDown,
  ChevronUp,
  Reply,
  Copy,
  CheckCheck,
  Play,
  Pause,
  Package,
  Calendar,
  Sparkles,
  ExternalLink,
  Pencil,
  Trash2,
  History,
  Clock,
  Loader2,
  Check,
  X,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { useAuth } from "@/lib/auth-context";
import { MessageReactionPicker } from "./MessageReactionPicker";
import { MessageReplyPreview } from "./MessageReplyPreview";
import { MessageAttachmentPreview } from "./MessageAttachmentPreview";
import { ClientDispatchCard } from "./ClientDispatchCard";
import { ClientInboundMessageBubble } from "./ClientInboundMessageBubble";
import { MessageMeetingSummary } from "./MessageMeetingSummary";
import { MessageSeenReceipts } from "./MessageSeenReceipts";
import { FormattedMessageText } from "./FormattedMessageText";
import { MessageRevisionHistoryPopover } from "./MessageRevisionHistoryPopover";
import { formatMessageTime, formatMessageFullDateTime } from "./date-utils";
import { useCountdownTimer } from "./useElapsedTimer";
import type { ChatMessage, ApprovalWorkflow } from "../types";

interface MessageBubbleProps {
  message: ChatMessage;
  onReply: (message: ChatMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string, text: string, reason?: string) => Promise<void> | void;
  onDeleteMessage?: (messageId: string) => Promise<void> | void;
  onUpdateApproval?: (messageId: string, workflow: ApprovalWorkflow) => void;
  onScrollToMessage?: (messageId: string) => void;
  onOpenThread?: (messageId: string) => void;
  onDeleteAttachment?: (messageId: string, attachmentId: string) => void;
  isHighlighted?: boolean;
}

export function MessageBubble({
  message,
  onReply,
  onReact,
  onEdit,
  onDeleteMessage,
  onUpdateApproval,
  onScrollToMessage,
  onOpenThread,
  onDeleteAttachment,
  isHighlighted = false,
}: MessageBubbleProps) {
  const { user } = useAuth();
  const [isPlayingVoice, setIsPlayingVoice] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(message.text);
  const [editReason, setEditReason] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    setEditText(message.text);
  }, [message.text]);

  const isCurrentUser = Boolean(user?.id && message.senderId === user.id);
  const align = isCurrentUser ? "end" : "start";

  const editTimer = useCountdownTimer(message._capabilities?.editTimeRemainingSeconds);
  const isEditExpired =
    typeof message._capabilities?.editTimeRemainingSeconds === "number" && editTimer.isExpired;

  const deleteTimer = useCountdownTimer(message._capabilities?.deleteTimeRemainingSeconds);
  const isDeleteExpired =
    typeof message._capabilities?.deleteTimeRemainingSeconds === "number" && deleteTimer.isExpired;

  const canEdit = Boolean(message._capabilities?.canEdit ?? isCurrentUser) && !isEditExpired;
  const canDelete = Boolean(message._capabilities?.canDelete ?? isCurrentUser) && !isDeleteExpired;

  const isLongMessage = message.text.length > 200 || message.text.split("\n").length > 3;
  const hasReactions = message.reactions && message.reactions.length > 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    toast.success("Message copied to clipboard");
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteMessage?.(message.id);
      setShowDeleteConfirm(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete message");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) {
      toast.error("Message cannot be empty");
      return;
    }
    if (editText.trim() === message.text.trim()) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onEdit?.(message.id, editText.trim(), editReason.trim() || undefined);
      setIsEditing(false);
      setEditReason("");
      toast.success("Message updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save message edit");
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Client Inbound Message (From Client -> Left side)
  if (
    message.isFromClient ||
    (message.purpose === "CLIENT_COMMUNICATION" && message.clientDirection === "INBOUND") ||
    !!message.clientInboundRelay
  ) {
    return (
      <ClientInboundMessageBubble
        message={message}
        onReply={onReply}
        onReact={onReact}
        onEdit={onEdit}
        onScrollToMessage={onScrollToMessage}
        isHighlighted={isHighlighted}
      />
    );
  }

  // 2. Client Outbound Message (To Client -> Right side with Approval & Dispatch workflow)
  if (
    (message.purpose === "CLIENT_COMMUNICATION" && message.clientDirection === "OUTBOUND") ||
    !!message.approval
  ) {
    const fallbackApproval: ApprovalWorkflow = {
      id: `appr-${message.id}`,
      status: "IN_REVIEW",
      clientMessageType: message.clientMessageType || message.outboundType || "GENERAL_NOTICE",
      outboundType: message.outboundType || message.clientMessageType || "GENERAL_NOTICE",
      requestedBy: message.senderName,
      requestedAt: message.timestamp,
      targetClient: "Client",
      currentStageDwellMinutes: 0,
      slaTargetMinutes: 30,
      slaStatus: "ON_TRACK",
      auditTrail: [],
    };

    return (
      <ClientDispatchCard
        id={message.id}
        workflow={message.approval || fallbackApproval}
        onUpdateApproval={(updated) => onUpdateApproval?.(message.id, updated)}
        isCurrentUser={isCurrentUser}
        messageText={message.text}
        attachments={message.attachments}
        seenBy={message.seenBy}
        timestamp={message.timestamp}
        senderName={message.senderName}
        senderAvatar={message.senderAvatar}
        senderDesignation={message.senderDesignation}
        reactions={message.reactions}
        onReact={onReact}
        onReply={() => onReply(message)}
        onEdit={onEdit}
        isEdited={message.isEdited}
        revisions={message.revisions}
        capabilities={message._capabilities}
        isHighlighted={isHighlighted}
      />
    );
  }

  // Purpose Badge Helper for internal updates / meeting notes
  const renderPurposeBadge = () => {
    if (message.deliverableUpdate) {
      return (
        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 mb-1.5 w-fit">
          <Package className="size-3" />
          <span>Deliverable Submission</span>
        </div>
      );
    }
    if (message.meetingSummary) {
      return (
        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 mb-1.5 w-fit">
          <Calendar className="size-3" />
          <span>Meeting Notes</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id={`msg-${message.id}`}
        className={cn(
          "group/msg-bubble relative flex flex-col gap-1 transition-all duration-200 max-w-full min-w-0",
          align === "end" ? "items-end" : "items-start",
          isHighlighted ? "ring-2 ring-primary ring-offset-2 bg-primary/10 rounded-2xl p-1" : ""
        )}
      >
        {/* Quick Action Floating Bar on Hover */}
        <div
          className={cn(
            "absolute -top-3.5 z-30 opacity-0 group-hover/msg-bubble:opacity-100 transition-opacity duration-150 pointer-events-none group-hover/msg-bubble:pointer-events-auto flex items-center gap-0.5 rounded-full border border-border/80 bg-background/95 px-1.5 py-0.5 shadow-md backdrop-blur-md",
            align === "end" ? "right-2" : "left-2"
          )}
        >
          <MessageReactionPicker onSelectEmoji={(emoji) => onReact(message.id, emoji)} />

          {canEdit && (
            <Button
              size="icon-xs"
              variant="ghost"
              className="size-6 text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
              title={
                editTimer.secondsRemaining > 0
                  ? `Edit message (${editTimer.formatted} left)`
                  : "Edit message"
              }
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="size-3" />
            </Button>
          )}

          <Button
            size="icon-xs"
            variant="ghost"
            className="size-6 text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
            title="Reply"
            onClick={() => onReply(message)}
          >
            <Reply className="size-3 rotate-180" />
          </Button>

          {onOpenThread && (
            <Button
              size="icon-xs"
              variant="ghost"
              className="size-6 text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
              title="Reply in thread"
              onClick={() => onOpenThread(message.id)}
            >
              <MessageSquare className="size-3" />
            </Button>
          )}

          <Button
            size="icon-xs"
            variant="ghost"
            className="size-6 text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
            title="Copy text"
            onClick={handleCopy}
          >
            <Copy className="size-3" />
          </Button>

          {canDelete && (
            <Button
              size="icon-xs"
              variant="ghost"
              className="size-6 text-muted-foreground hover:text-destructive cursor-pointer rounded-full"
              title={
                deleteTimer.secondsRemaining > 0
                  ? `Delete message (${deleteTimer.formatted} remaining)`
                  : "Delete message"
              }
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="size-3" />
            </Button>
          )}
        </div>

        {/* Main Bubble Surface */}
        <Bubble
          variant={isCurrentUser ? "default" : "secondary"}
          align={align}
          className={cn(
            "relative transition-all max-w-full min-w-0",
            hasReactions ? "mb-3.5" : ""
          )}
        >
          <BubbleContent
            className={cn(
              "p-3 sm:px-3.5 sm:py-2.5 min-w-0 max-w-full text-xs leading-relaxed shadow-2xs transition-all",
              isCurrentUser
                ? "rounded-2xl rounded-tr-xs bg-primary text-primary-foreground border-transparent shadow-xs"
                : "rounded-2xl rounded-tl-xs bg-muted/80 dark:bg-muted/50 text-foreground border border-border/70",
              message.deliverableUpdate && "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10 text-foreground"
            )}
          >
            {/* Purpose Identifier Tag */}
            {renderPurposeBadge()}

            {/* Quoted Reply Banner */}
            {message.replyTo && (
              <button
                type="button"
                onClick={() => onScrollToMessage?.(message.replyTo?.id || "")}
                className="text-left w-full cursor-pointer hover:opacity-90 transition-opacity min-w-0 mb-1.5"
              >
                <MessageReplyPreview
                  replyTo={message.replyTo}
                  isInCurrentUserBubble={isCurrentUser}
                />
              </button>
            )}

            {/* Inline Edit Form OR Message Text */}
            {isEditing ? (
              <div className="space-y-2 py-1 min-w-[240px] sm:min-w-[320px]">
                {editTimer.secondsRemaining > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 w-fit">
                    <Clock className="size-3" />
                    <span>Edit window expires in {editTimer.formatted}</span>
                  </div>
                )}
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSaveEdit();
                    } else if (e.key === "Escape") {
                      setIsEditing(false);
                      setEditText(message.text);
                    }
                  }}
                  rows={3}
                  className="w-full text-xs font-sans bg-background text-foreground resize-y border-border focus:ring-1 focus:ring-primary rounded-xl"
                  placeholder="Edit message..."
                  autoFocus
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground opacity-90">
                    Esc to cancel • ⌘+Enter to save
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        setIsEditing(false);
                        setEditText(message.text);
                      }}
                      disabled={isSaving}
                      className={cn(
                        "h-6 text-[11px] px-2 cursor-pointer",
                        isCurrentUser ? "text-primary-foreground/90 hover:text-primary-foreground hover:bg-white/10" : ""
                      )}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="xs"
                      variant="default"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className={cn(
                        "h-6 text-[11px] px-2.5 gap-1 cursor-pointer font-bold shadow-xs",
                        isCurrentUser ? "bg-background text-foreground hover:bg-background/90" : "bg-primary text-primary-foreground"
                      )}
                    >
                      {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs leading-relaxed break-words [overflow-wrap:anywhere]">
                {isLongMessage && !isExpanded ? (
                  <>
                    <div className="line-clamp-3">
                      <FormattedMessageText text={message.text} isCurrentUser={isCurrentUser} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsExpanded(true)}
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-bold mt-1.5 cursor-pointer transition-opacity hover:opacity-85",
                        isCurrentUser
                          ? "text-primary-foreground underline underline-offset-2 decoration-primary-foreground/60"
                          : "text-primary hover:underline underline-offset-2"
                      )}
                    >
                      <span>Show full message</span>
                      <ChevronDown className="size-3" />
                    </button>
                  </>
                ) : isLongMessage && isExpanded ? (
                  <>
                    <FormattedMessageText text={message.text} isCurrentUser={isCurrentUser} />
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsExpanded(false)}
                        className={cn(
                          "inline-flex items-center gap-1 text-[11px] font-bold mt-1.5 cursor-pointer transition-opacity hover:opacity-85",
                          isCurrentUser
                            ? "text-primary-foreground underline underline-offset-2 decoration-primary-foreground/60"
                            : "text-primary hover:underline underline-offset-2"
                        )}
                      >
                        <span>Show less</span>
                        <ChevronUp className="size-3" />
                      </button>
                    </div>
                  </>
                ) : (
                  <FormattedMessageText text={message.text} isCurrentUser={isCurrentUser} />
                )}
              </div>
            )}

          {/* Meeting Summary Checklist */}
          {message.meetingSummary && (
            <MessageMeetingSummary summary={message.meetingSummary} />
          )}

          {/* Deliverable Progress Card */}
          {message.deliverableUpdate && (
            <div className="mt-2.5 rounded-xl border border-primary/20 bg-background/80 p-2.5 text-foreground shadow-2xs backdrop-blur-xs min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-[11px] font-bold text-primary truncate">
                  <Sparkles className="size-3 shrink-0" />
                  Deliverable Milestone
                  {message.deliverableUpdate.version && (
                    <span className="font-mono font-normal text-[10px] text-muted-foreground ml-1">
                      ({message.deliverableUpdate.version})
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                  {message.deliverableUpdate.progress}%
                </span>
              </div>
              <p className="text-xs font-semibold text-foreground mt-1 truncate">
                {message.deliverableUpdate.title}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {message.deliverableUpdate.status}
              </p>
              <Progress value={message.deliverableUpdate.progress} className="h-1.5 mt-2" />
              {message.deliverableUpdate.actionUrl && (
                <div className="mt-2 text-right">
                  <Button
                    size="xs"
                    variant="outline"
                    className="h-6 text-[10px] gap-1 cursor-pointer"
                    onClick={() => window.open(message.deliverableUpdate?.actionUrl, "_blank")}
                  >
                    <ExternalLink className="size-2.5" /> View Branch
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Voice Note Audio Waveform Player Prototype */}
          {message.voiceNote && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded-xl bg-background/70 border border-border/50 text-foreground min-w-0">
              <Button
                size="icon-xs"
                variant="default"
                className="size-7 rounded-full bg-primary text-primary-foreground shrink-0 cursor-pointer shadow-xs"
                onClick={() => setIsPlayingVoice(!isPlayingVoice)}
              >
                {isPlayingVoice ? <Pause className="size-3.5" /> : <Play className="size-3.5 ml-0.5" />}
              </Button>

              <div className="flex items-center gap-0.5 flex-1 h-6 overflow-hidden">
                {message.voiceNote.waveform.map((height, i) => (
                  <div
                    key={i}
                    style={{ height: `${height}%` }}
                    className={cn(
                      "w-1 rounded-full transition-all duration-300 shrink-0",
                      isPlayingVoice && i < 10
                        ? "bg-primary animate-pulse"
                        : "bg-muted-foreground/40 group-hover/msg-bubble:bg-primary/70"
                    )}
                  />
                ))}
              </div>

              <span className="text-[10px] font-mono text-muted-foreground shrink-0 font-medium">
                0:{message.voiceNote.durationSeconds < 10 ? `0${message.voiceNote.durationSeconds}` : message.voiceNote.durationSeconds}
              </span>
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <MessageAttachmentPreview
              attachments={message.attachments}
              canDelete={canEdit}
              onDeleteAttachment={
                onDeleteAttachment
                  ? (attId) => onDeleteAttachment(message.id, attId)
                  : undefined
              }
            />
          )}

          {/* Thread Replies Counter Badge */}
          {Boolean(message.replyCount && message.replyCount > 0) && (
            <div className="mt-1 pt-1 border-t border-border/30">
              <button
                type="button"
                onClick={() => onOpenThread?.(message.id)}
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold underline-offset-2 hover:underline cursor-pointer transition-colors",
                  isCurrentUser ? "text-primary-foreground/90 hover:text-primary-foreground" : "text-primary hover:text-primary/80"
                )}
              >
                <MessageSquare className="size-3" />
                <span>
                  {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
                </span>
              </button>
            </div>
          )}

          {/* Footer: Timestamp, Read Receipts & Delivery Indicator */}
          <div
            className={cn(
              "flex items-center gap-1.5 text-[10px] mt-1.5 font-medium select-none flex-wrap",
              isCurrentUser
                ? "justify-end text-primary-foreground/80"
                : "justify-end text-muted-foreground"
            )}
          >
            {message.seenBy && message.seenBy.length > 0 && (
              <MessageSeenReceipts seenBy={message.seenBy} align={align} />
            )}

            {(message.isEdited || (message.revisions && message.revisions.length > 0)) && (
              <MessageRevisionHistoryPopover message={message} align={align}>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[10px] font-semibold underline underline-offset-2 hover:opacity-100 opacity-80 cursor-pointer transition-opacity",
                    isCurrentUser ? "text-primary-foreground/90" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Click to view edit history"
                >
                  <span>(edited)</span>
                </button>
              </MessageRevisionHistoryPopover>
            )}

            <span
              title={formatMessageFullDateTime(message.createdAt || message.timestamp)}
              className="cursor-default select-none transition-opacity hover:opacity-100"
            >
              {formatMessageTime(message.createdAt || message.timestamp)}
            </span>
            {isCurrentUser && (
              <span title="Delivered" className="inline-flex">
                <CheckCheck className="size-3" />
              </span>
            )}
          </div>
        </BubbleContent>

        {/* Overlapped Reactions Row */}
        {hasReactions && (
          <BubbleReactions side="bottom" align={align === "end" ? "end" : "start"} className="shadow-xs border border-border/40 bg-background/90 backdrop-blur-xs">
            {message.reactions?.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReact(message.id, r.emoji)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium transition-transform hover:scale-110 active:scale-95 cursor-pointer",
                  r.reactedByMe
                    ? "bg-primary/20 text-primary font-bold ring-1 ring-primary/40"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={`${r.count} reactions`}
              >
                <span>{r.emoji}</span>
                <span className="text-[10px] font-semibold">{r.count}</span>
              </button>
            ))}
            <MessageReactionPicker onSelectEmoji={(emoji) => onReact(message.id, emoji)} />
          </BubbleReactions>
        )}
      </Bubble>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              Delete message?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed text-muted-foreground space-y-1">
              <span>Are you sure you want to delete this message? This action will permanently remove it from the chat stream for all team members.</span>
              {deleteTimer.secondsRemaining > 0 && (
                <span className="block font-medium text-amber-600 dark:text-amber-400">
                  Author deletion window expires in: {deleteTimer.formatted}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeleting} className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" /> Deleting...
                </>
              ) : (
                "Delete message"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
