"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { BubbleGroup } from "@workspace/ui/components/bubble";
import { Crown, Send } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { MessageBubble } from "./MessageBubble";
import { formatMessageTime, formatMessageFullDateTime } from "./date-utils";
import type { ChatMessage, ApprovalWorkflow } from "../types";

interface MessageGroupItemProps {
  messages: ChatMessage[];
  onReply: (message: ChatMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string, text: string, reason?: string) => Promise<void> | void;
  onDeleteMessage?: (messageId: string) => Promise<void> | void;
  onUpdateApproval?: (messageId: string, workflow: ApprovalWorkflow) => void;
  onScrollToMessage?: (messageId: string) => void;
  onOpenThread?: (messageId: string) => void;
  onDeleteAttachment?: (messageId: string, attachmentId: string) => void;
  highlightedMessageId?: string | null;
}

export function MessageGroupItem({
  messages,
  onReply,
  onReact,
  onEdit,
  onDeleteMessage,
  onUpdateApproval,
  onScrollToMessage,
  onOpenThread,
  onDeleteAttachment,
  highlightedMessageId,
}: MessageGroupItemProps) {
  const { user } = useAuth();
  const firstMsg = messages[0];
  if (!firstMsg) return null;

  const isCurrentUser = Boolean(user?.id && firstMsg.senderId === user.id);
  const isClientOutbound =
    (firstMsg.purpose === "CLIENT_COMMUNICATION" && firstMsg.clientDirection === "OUTBOUND") ||
    !!firstMsg.approval;
  const isClientInbound =
    (firstMsg.purpose === "CLIENT_COMMUNICATION" && firstMsg.clientDirection === "INBOUND") ||
    !!firstMsg.isFromClient ||
    !!firstMsg.clientInboundRelay;

  // 1. Client Inbound or Client Outbound messages render self-contained first-class bubbles
  if (isClientInbound || isClientOutbound) {
    return (
      <div className="w-full my-1 min-w-0">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onReply={onReply}
            onReact={onReact}
            onEdit={onEdit}
            onDeleteMessage={onDeleteMessage}
            onUpdateApproval={onUpdateApproval}
            onScrollToMessage={onScrollToMessage}
            onOpenThread={onOpenThread}
            onDeleteAttachment={onDeleteAttachment}
            isHighlighted={highlightedMessageId === msg.id}
          />
        ))}
      </div>
    );
  }

  // 2. Standard internal messages (team members or current user)
  const initials = firstMsg.senderName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  const getRoleIcon = () => {
    if (firstMsg.senderRole === "Tech Lead" || firstMsg.senderRole === "Admin") {
      return (
        <span title={firstMsg.senderRole} className="inline-flex">
          <Crown className="size-2.5 text-amber-500 shrink-0" />
        </span>
      );
    }
    if (firstMsg.senderRole === "Sales Lead") {
      return (
        <span title="Sales Lead" className="inline-flex">
          <Send className="size-2.5 text-blue-500 shrink-0" />
        </span>
      );
    }
    return null;
  };

  return (
    <div
      className={cn(
        "flex w-full gap-2 my-2 min-w-0",
        isCurrentUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Sender Avatar (For other internal members) */}
      {!isCurrentUser && (
        <Avatar className="size-7 sm:size-8 rounded-full ring-1 ring-border/50 shrink-0 mt-1">
          <AvatarImage src={firstMsg.senderAvatar} alt={firstMsg.senderName} />
          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Content Stack */}
      <div
        className={cn(
          "flex flex-col min-w-0",
          isCurrentUser
            ? "items-end max-w-[90%] sm:max-w-[85%] md:max-w-[80%]"
            : "items-start max-w-[90%] sm:max-w-[85%] md:max-w-[80%]"
        )}
      >
        {/* Sender Name & Designation header */}
        {!isCurrentUser && (
          <div className="flex items-center gap-1.5 px-1 mb-1 text-xs min-w-0 max-w-full">
            <span className="font-semibold text-foreground tracking-tight text-[11px] flex items-center gap-1 truncate">
              {firstMsg.senderName}
              {getRoleIcon()}
            </span>
            {firstMsg.senderDesignation && (
              <span className="text-[10px] font-medium text-muted-foreground/80 bg-muted/60 px-1.5 py-0.2 rounded-md truncate hidden xs:inline">
                {firstMsg.senderDesignation}
              </span>
            )}
            <span
              title={formatMessageFullDateTime(firstMsg.createdAt || firstMsg.timestamp)}
              className="text-[10px] text-muted-foreground/60 ml-0.5 font-normal select-none cursor-default"
            >
              {formatMessageTime(firstMsg.createdAt || firstMsg.timestamp)}
            </span>
          </div>
        )}

        {/* Bubble Group */}
        <BubbleGroup className={cn("space-y-1.5 w-full min-w-0", isCurrentUser ? "items-end" : "items-start")}>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onReply={onReply}
              onReact={onReact}
              onEdit={onEdit}
              onDeleteMessage={onDeleteMessage}
              onUpdateApproval={onUpdateApproval}
              onScrollToMessage={onScrollToMessage}
              onOpenThread={onOpenThread}
              onDeleteAttachment={onDeleteAttachment}
              isHighlighted={highlightedMessageId === msg.id}
            />
          ))}
        </BubbleGroup>
      </div>
    </div>
  );
}
