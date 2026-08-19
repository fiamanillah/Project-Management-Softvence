"use client";

import * as React from "react";
import { Reply, X, Image as ImageIcon, FileText } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { ChatAttachment } from "../types";

interface MessageReplyPreviewProps {
  replyTo: {
    id: string;
    senderName: string;
    text: string;
    attachments?: ChatAttachment[];
  };
  isComposer?: boolean;
  onCancel?: () => void;
  isInCurrentUserBubble?: boolean;
  className?: string;
}

export function MessageReplyPreview({
  replyTo,
  isComposer = false,
  onCancel,
  isInCurrentUserBubble = false,
  className,
}: MessageReplyPreviewProps) {
  const hasAttachments = replyTo.attachments && replyTo.attachments.length > 0;
  const firstAttachment = hasAttachments ? replyTo.attachments![0] : null;

  // 1. Composer Reply Banner (Above Composer Input)
  if (isComposer) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2.5 rounded-xl border border-primary/25 border-l-4 border-l-primary bg-primary/10 dark:bg-primary/15 px-3 py-2 text-xs shadow-2xs backdrop-blur-xs transition-all",
          className
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary/20 text-primary shrink-0">
            <Reply className="size-3.5 rotate-180" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 leading-tight flex-wrap">
              <span className="text-[11px] font-bold text-primary truncate">
                Replying to {replyTo.senderName}
              </span>
              {hasAttachments && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-background/80 px-1.5 py-0.2 rounded border border-border/50 font-medium">
                  {firstAttachment?.type === "image" ? (
                    <ImageIcon className="size-2.5 text-sky-500 shrink-0" />
                  ) : (
                    <FileText className="size-2.5 text-amber-500 shrink-0" />
                  )}
                  <span className="truncate max-w-[140px]">
                    {replyTo.attachments!.length > 1
                      ? `${replyTo.attachments!.length} files`
                      : firstAttachment?.name}
                  </span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-foreground/85 truncate mt-0.5 max-w-full">
              {replyTo.text || (hasAttachments ? "[Attachment]" : "")}
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="size-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors cursor-pointer shrink-0"
            title="Cancel reply"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    );
  }

  // 2. Chat Bubble Quoted Reply Banner (Telegram/WhatsApp Style)
  return (
    <div
      className={cn(
        "group/reply-quote relative flex items-center gap-2 rounded-r-lg rounded-l-none px-2.5 py-1.5 text-xs transition-all border-l-[3px] min-w-0 max-w-full overflow-hidden select-none mb-1.5",
        isInCurrentUserBubble
          ? "bg-black/20 hover:bg-black/25 border-l-white text-white"
          : "bg-background/60 hover:bg-background/80 dark:bg-background/40 dark:hover:bg-background/60 border-l-primary text-foreground shadow-2xs",
        className
      )}
    >
      <div className="min-w-0 flex-1 leading-none py-0.5">
        {/* Author + Attachment Indicator */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span
            className={cn(
              "text-[11px] font-bold truncate leading-none",
              isInCurrentUserBubble
                ? "text-white"
                : "text-primary dark:text-emerald-400 font-semibold"
            )}
          >
            {replyTo.senderName}
          </span>

          {hasAttachments && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[9px] px-1 py-0.2 rounded font-medium truncate max-w-[130px] leading-none",
                isInCurrentUserBubble
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground border border-border/50"
              )}
            >
              {firstAttachment?.type === "image" ? (
                <ImageIcon className="size-2.5 shrink-0" />
              ) : (
                <FileText className="size-2.5 shrink-0" />
              )}
              <span className="truncate">
                {replyTo.attachments!.length > 1
                  ? `${replyTo.attachments!.length} files`
                  : firstAttachment?.name}
              </span>
            </span>
          )}
        </div>

        {/* Quoted Text Preview */}
        <p
          className={cn(
            "text-[11px] truncate leading-tight line-clamp-1",
            isInCurrentUserBubble ? "text-white/85" : "text-muted-foreground"
          )}
        >
          {replyTo.text || (hasAttachments ? "[Attachment]" : "")}
        </p>
      </div>
    </div>
  );
}
