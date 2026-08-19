"use client";

import * as React from "react";
import { Reply, X } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface MessageReplyPreviewProps {
  replyTo: {
    id: string;
    senderName: string;
    text: string;
  };
  isComposer?: boolean;
  onCancel?: () => void;
  className?: string;
}

export function MessageReplyPreview({
  replyTo,
  isComposer = false,
  onCancel,
  className,
}: MessageReplyPreviewProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border-l-3 border-primary bg-muted/40 p-2 text-xs",
        isComposer ? "mb-2 bg-muted/70 shadow-2xs" : "mb-1.5 opacity-90",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Reply className="size-3.5 text-primary shrink-0 rotate-180" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-primary truncate leading-none">
            {replyTo.senderName}
          </p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5 max-w-[280px]">
            {replyTo.text}
          </p>
        </div>
      </div>

      {isComposer && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="size-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0"
          title="Cancel reply"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
