"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { CheckCheck, Eye } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import {
  formatMessageRelativeTime,
  formatMessageFullDateTime,
} from "./date-utils";
import type { MessageReadReceipt } from "../types";

interface MessageSeenReceiptsProps {
  seenBy?: MessageReadReceipt[];
  maxVisible?: number;
  align?: "start" | "end";
  className?: string;
}

function getUserInitials(name?: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const second = parts[1]?.[0] || "";
  if (first && second) {
    return `${first}${second}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function MessageSeenReceipts({
  seenBy = [],
  maxVisible = 3,
  align = "end",
  className = "",
}: MessageSeenReceiptsProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!seenBy || seenBy.length === 0) return null;

  const visibleSeen = seenBy.slice(0, maxVisible);
  const remainingSeen = seenBy.slice(maxVisible);
  const remainingCount = remainingSeen.length;

  return (
    <div
      className={cn("flex items-center gap-1 overflow-visible select-none", className)}
      role="group"
      aria-label="Seen by recipients"
    >
      {/* 1. Stacked Avatars with Individual Tooltips */}
      <div className="flex items-center -space-x-1.5 overflow-visible">
        {visibleSeen.map((r) => {
          const initials = getUserInitials(r.userName);
          const relativeSeenTime = formatMessageRelativeTime(r.seenAt) || r.seenAt;
          const fullSeenDateTime = formatMessageFullDateTime(r.seenAt) || r.seenAt;

          return (
            <Tooltip key={r.userId}>
              <TooltipTrigger
                type="button"
                aria-label={`Seen by ${r.userName} at ${relativeSeenTime}`}
                className="relative group/avatar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-full cursor-help hover:z-20 transition-transform hover:scale-125"
              >
                <Avatar className="size-5 rounded-full border-2 border-background ring-1 ring-border/80 shadow-2xs">
                  {r.userAvatar && (
                    <AvatarImage
                      src={r.userAvatar}
                      alt={r.userName}
                      className="rounded-full object-cover"
                    />
                  )}
                  <AvatarFallback className="rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[8px] font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="center"
                variant="card"
                className="w-56 p-0 shadow-xl overflow-hidden border border-border/70 z-50"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-transparent p-2.5 border-b border-border/60 flex items-center gap-2">
                  <Avatar className="size-7 rounded-full border border-background shadow-2xs shrink-0">
                    {r.userAvatar && (
                      <AvatarImage src={r.userAvatar} alt={r.userName} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-foreground truncate">{r.userName}</p>
                    {r.userDesignation && (
                      <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                        {r.userDesignation}
                      </p>
                    )}
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-2 bg-card/60 flex items-center justify-between text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCheck className="size-3" />
                    <span>Seen</span>
                  </div>
                  <span
                    className="font-mono text-[9px] text-muted-foreground"
                    title={fullSeenDateTime}
                  >
                    {relativeSeenTime}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* 2. Overflow Pill (+N) with Rich Popover */}
        {remainingCount > 0 && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <div
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="relative inline-flex items-center"
            >
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    onClick={() => setIsOpen((prev) => !prev)}
                    aria-label={`+${remainingCount} more recipients seen`}
                    className="relative group/more flex size-5 items-center justify-center rounded-full border-2 border-background bg-muted/90 text-muted-foreground text-[8px] font-bold ring-1 ring-border/80 shadow-2xs hover:bg-accent hover:text-foreground hover:scale-115 hover:z-20 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    +{remainingCount}
                  </button>
                }
              />
              <PopoverContent
                side="top"
                align={align === "end" ? "end" : "start"}
                className="w-72 p-0 shadow-2xl overflow-hidden border border-border/70 z-50 rounded-xl"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-transparent p-2.5 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="size-5 rounded-md bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Eye className="size-3" />
                    </div>
                    <span className="font-bold text-xs text-foreground">Seen By</span>
                  </div>
                  <Badge variant="secondary" className="text-[9px] font-mono font-semibold px-1.5 py-0.2">
                    {seenBy.length} total
                  </Badge>
                </div>

                {/* Scrollable Recipients List with shadcn ScrollArea */}
                <ScrollArea className={cn("w-full", seenBy.length > 3 ? "h-44" : "h-auto max-h-44")}>
                  <div className="p-2 pr-3 space-y-1.5">
                    {seenBy.map((r) => {
                      const initials = getUserInitials(r.userName);
                      const relativeSeenTime = formatMessageRelativeTime(r.seenAt) || r.seenAt;
                      const fullSeenDateTime = formatMessageFullDateTime(r.seenAt) || r.seenAt;

                      return (
                        <div
                          key={r.userId}
                          className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-card/60 hover:bg-muted/60 border border-border/40 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="size-6 rounded-full border border-primary/20 shrink-0">
                              {r.userAvatar && (
                                <AvatarImage src={r.userAvatar} alt={r.userName} className="object-cover" />
                              )}
                              <AvatarFallback className="bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[9px] font-bold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-foreground truncate">{r.userName}</p>
                              {r.userDesignation && (
                                <p className="text-[9px] text-muted-foreground truncate leading-tight">
                                  {r.userDesignation}
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className="font-mono text-[9px] text-muted-foreground shrink-0"
                            title={fullSeenDateTime}
                          >
                            {relativeSeenTime}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </div>
          </Popover>
        )}
      </div>
    </div>
  );
}
