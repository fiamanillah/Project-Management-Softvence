"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Reply,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import { MessageReplyPreview } from "./MessageReplyPreview";
import { MessageAttachmentPreview } from "./MessageAttachmentPreview";
import { MessageReactionPicker } from "./MessageReactionPicker";
import { MessageSeenReceipts } from "./MessageSeenReceipts";
import { getMessageTheme } from "../message-theme";
import type { ChatMessage } from "../types";

interface ClientInboundMessageBubbleProps {
  message: ChatMessage;
  onReply: (message: ChatMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onScrollToMessage?: (messageId: string) => void;
  isHighlighted?: boolean;
}

export function ClientInboundMessageBubble({
  message,
  onReply,
  onReact,
  onScrollToMessage,
  isHighlighted = false,
}: ClientInboundMessageBubbleProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const relay = message.clientInboundRelay;
  const isLongMessage = message.text.length > 200 || message.text.split("\n").length > 3;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    toast.success("Client message copied to clipboard");
  };

  const clientName = relay?.clientName || message.senderName || "Client";
  const clientCompany = relay?.clientCompany;
  const clientAvatar = relay?.clientAvatar || message.senderAvatar;
  const platformName = relay?.platform || "Direct Portal";

  const clientInitials = clientName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  const theme = getMessageTheme(message.clientMessageType, "INBOUND");
  const hasReactions = message.reactions && message.reactions.length > 0;

  return (
    <div
      id={`msg-${message.id}`}
      className={cn(
        "w-full flex justify-start my-2 min-w-0 transition-all duration-300 rounded-2xl p-0.5 items-start gap-2.5",
        isHighlighted ? "ring-2 ring-primary ring-offset-2 bg-primary/10" : ""
      )}
    >
      {/* 1. Sender Avatar (Aligned with top of sender header) */}
      <Avatar className="size-8 sm:size-9 rounded-xl ring-2 ring-sky-500/30 border border-sky-500/20 shrink-0 shadow-2xs mt-0.5">
        <AvatarImage src={clientAvatar} alt={clientName} />
        <AvatarFallback className="text-[10px] sm:text-[11px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 font-mono">
          {clientInitials}
        </AvatarFallback>
      </Avatar>

      {/* 2. Message Column */}
      <div className="relative flex flex-col items-start w-full max-w-[92%] sm:max-w-[85%] md:max-w-[78%] min-w-0">
        {/* Sender Header Row (Sender Name + Company + Platform Badge) */}
        <div className="flex items-center gap-1.5 px-1 mb-1 text-xs min-w-0 max-w-full justify-start flex-wrap">
          <span className="font-semibold text-foreground tracking-tight text-[11px] truncate">
            {clientName}
            {clientCompany && (
              <span className="text-[10px] text-muted-foreground font-normal ml-1 hidden xs:inline">
                • {clientCompany}
              </span>
            )}
          </span>
          <Badge
            variant="outline"
            className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[9px] font-bold px-1.5 py-0 rounded"
          >
            {platformName}
          </Badge>
        </div>

        {/* Inbound Card Wrapper (Anchors Floating Action Bar and Reactions directly to the Card) */}
        <div className={cn("group/inbound-card relative w-full rounded-2xl min-w-0", hasReactions ? "mb-2" : "")}>
          {/* Floating Action Bar on Hover (Reaction, Reply, Copy) */}
          <div className="absolute -top-3 right-3 z-30 opacity-0 group-hover/inbound-card:opacity-100 transition-opacity duration-150 pointer-events-none group-hover/inbound-card:pointer-events-auto flex items-center gap-0.5 rounded-full border border-border/80 bg-background/95 px-1.5 py-0.5 shadow-md backdrop-blur-md">
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

          {/* Inbound Card Surface with One-Side Border (Identical to Outbound Structure) */}
          <div
            className={cn(
              "w-full rounded-2xl border bg-card/95 shadow-2xs text-card-foreground overflow-hidden border-l-4",
              theme.cardBorderClass,
              theme.borderAccentClass,
              theme.ambientBgClass
            )}
          >
            {/* Card Header Strip: Client Name + Intent Badge */}
            <div
              className={cn(
                "flex items-center justify-between gap-2 px-3 py-2 border-b transition-colors min-w-0",
                theme.headerBgClass,
                theme.headerBorderClass
              )}
            >
              <span className="text-[11px] font-bold text-foreground truncate">
                From: {clientName}
              </span>

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
            </div>

            {/* Card Message Body */}
            <div className="p-3.5 space-y-2 text-foreground">
              {/* Quoted Reply Banner if any */}
              {message.replyTo && (
                <button
                  type="button"
                  onClick={() => onScrollToMessage?.(message.replyTo?.id || "")}
                  className="text-left w-full cursor-pointer hover:opacity-90 transition-opacity min-w-0"
                >
                  <MessageReplyPreview replyTo={message.replyTo} />
                </button>
              )}

              {/* Message Text with Read More */}
              <div className="text-xs sm:text-[13px] leading-relaxed text-foreground break-words [overflow-wrap:anywhere] font-normal">
                {isLongMessage && !isExpanded ? (
                  <>
                    <p className="line-clamp-3 whitespace-pre-wrap">{message.text}</p>
                    <button
                      type="button"
                      onClick={() => setIsExpanded(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline mt-1 cursor-pointer"
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
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline mt-1 cursor-pointer"
                    >
                      <span>Show less</span>
                      <ChevronUp className="size-3" />
                    </button>
                  </>
                ) : (
                  <p className="whitespace-pre-wrap">{message.text}</p>
                )}
              </div>

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="pt-1">
                  <MessageAttachmentPreview attachments={message.attachments} />
                </div>
              )}
            </div>

            {/* Card Footer: Timestamp & Seen Receipts */}
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-muted/20 border-t border-border/40 text-[10px] text-muted-foreground">
              <span>{message.timestamp}</span>

              {message.seenBy && message.seenBy.length > 0 && (
                <MessageSeenReceipts seenBy={message.seenBy} align="start" />
              )}
            </div>
          </div>

          {/* Reaction Badges Row */}
          {hasReactions && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {message.reactions?.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => onReact(message.id, r.emoji)}
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
              <MessageReactionPicker onSelectEmoji={(emoji) => onReact(message.id, emoji)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
