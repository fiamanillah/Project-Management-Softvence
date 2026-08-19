"use client";

import * as React from "react";
import { Bubble, BubbleContent, BubbleReactions } from "@workspace/ui/components/bubble";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import { Badge } from "@workspace/ui/components/badge";
import {
  CheckCheck,
  Play,
  Pause,
  Reply,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  Send,
  Package,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import { MessageReplyPreview } from "./MessageReplyPreview";
import { MessageAttachmentPreview } from "./MessageAttachmentPreview";
import { MessageReactionPicker } from "./MessageReactionPicker";
import { ClientDispatchCard } from "./ClientDispatchCard";
import { ClientInboundMessageBubble } from "./ClientInboundMessageBubble";
import { MessageMeetingSummary } from "./MessageMeetingSummary";
import { MessageSeenReceipts } from "./MessageSeenReceipts";
import type { ChatMessage, ApprovalWorkflow } from "../types";

interface MessageBubbleProps {
  message: ChatMessage;
  onReply: (message: ChatMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onUpdateApproval?: (messageId: string, workflow: ApprovalWorkflow) => void;
  onScrollToMessage?: (messageId: string) => void;
  isHighlighted?: boolean;
}

export function MessageBubble({
  message,
  onReply,
  onReact,
  onUpdateApproval,
  onScrollToMessage,
  isHighlighted = false,
}: MessageBubbleProps) {
  const [isPlayingVoice, setIsPlayingVoice] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const align = message.isCurrentUser ? "end" : "start";

  const isLongMessage = message.text.length > 200 || message.text.split("\n").length > 3;
  const hasReactions = message.reactions && message.reactions.length > 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    toast.success("Message copied to clipboard");
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
      status: "PENDING_LEAD",
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
        isCurrentUser={message.isCurrentUser}
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
        "group/msg-bubble relative flex flex-col gap-1 transition-all duration-300 rounded-2xl p-0.5 max-w-full min-w-0",
        align === "end" ? "items-end" : "items-start",
        isHighlighted ? "ring-2 ring-primary ring-offset-2 bg-primary/10" : ""
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
        <Button
          size="icon-xs"
          variant="ghost"
          className="size-6 text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
          title="Reply"
          onClick={() => onReply(message)}
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

      {/* Main Bubble Surface */}
      <Bubble
        variant={message.variant || (message.isCurrentUser ? "default" : "secondary")}
        align={align}
        className={cn(
          "relative transition-all shadow-xs max-w-full min-w-0 break-words [overflow-wrap:anywhere]",
          hasReactions ? "mb-3.5" : "",
          message.deliverableUpdate ? "border-emerald-500/30 bg-card" : ""
        )}
      >
        <BubbleContent
          className={cn(
            "p-3.5 min-w-0 rounded-2xl shadow-2xs",
            align === "end" ? "rounded-tr-xs" : "rounded-tl-xs"
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
                isInCurrentUserBubble={message.isCurrentUser}
              />
            </button>
          )}

          {/* Message Text with Long Message Toggler */}
          <div className="text-xs leading-relaxed break-words [overflow-wrap:anywhere]">
            {isLongMessage && !isExpanded ? (
              <>
                <p className="line-clamp-3 whitespace-pre-wrap">{message.text}</p>
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-bold mt-1.5 cursor-pointer transition-opacity hover:opacity-85",
                    message.isCurrentUser
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
                <p className="whitespace-pre-wrap">{message.text}</p>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-bold mt-1.5 cursor-pointer transition-opacity hover:opacity-85",
                    message.isCurrentUser
                      ? "text-primary-foreground underline underline-offset-2 decoration-primary-foreground/60"
                      : "text-primary hover:underline underline-offset-2"
                  )}
                >
                  <span>Show less</span>
                  <ChevronUp className="size-3" />
                </button>
              </>
            ) : (
              <p className="whitespace-pre-wrap">{message.text}</p>
            )}
          </div>

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
            <MessageAttachmentPreview attachments={message.attachments} />
          )}

          {/* Footer: Timestamp, Read Receipts & Delivery Indicator */}
          <div
            className={cn(
              "flex items-center gap-1.5 text-[10px] mt-1.5 font-medium select-none flex-wrap",
              align === "end" && message.variant === "default"
                ? "justify-end text-primary-foreground/80"
                : "justify-end text-muted-foreground"
            )}
          >
            {message.seenBy && message.seenBy.length > 0 && (
              <MessageSeenReceipts seenBy={message.seenBy} align={align} />
            )}
            <span>{message.timestamp}</span>
            {message.isCurrentUser && (
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
    </div>
  );
}
