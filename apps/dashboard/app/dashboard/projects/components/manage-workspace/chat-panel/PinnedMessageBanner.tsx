"use client";

import * as React from "react";
import { Pin, X, ChevronRight } from "lucide-react";
import type { ProjectPinnedAnnouncement } from "../types";

interface PinnedMessageBannerProps {
  pinnedAnnouncement?: ProjectPinnedAnnouncement;
  onDismiss?: () => void;
  onClick?: () => void;
}

export function PinnedMessageBanner({
  pinnedAnnouncement,
  onDismiss,
  onClick,
}: PinnedMessageBannerProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  if (!pinnedAnnouncement || !isVisible) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-primary/20 bg-primary/5 px-4 py-1.5 text-xs backdrop-blur-xs transition-all shrink-0">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
      >
        <div className="flex size-5.5 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
          <Pin className="size-3 rotate-45" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[10px] text-primary">Pinned Message</span>
            <span className="text-[10px] text-muted-foreground">• {pinnedAnnouncement.author}</span>
          </div>
          <p className="truncate text-xs text-foreground/90 font-medium group-hover:text-primary transition-colors">
            {pinnedAnnouncement.message}
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => {
          setIsVisible(false);
          onDismiss?.();
        }}
        className="size-5.5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer shrink-0"
        title="Hide banner"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
