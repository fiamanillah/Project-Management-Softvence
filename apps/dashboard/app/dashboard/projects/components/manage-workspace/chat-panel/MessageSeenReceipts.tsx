"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { CheckCheck, Eye, Users } from "lucide-react";
import type { MessageReadReceipt } from "../types";

interface MessageSeenReceiptsProps {
  seenBy?: MessageReadReceipt[];
  align?: "start" | "end";
}

export function MessageSeenReceipts({ seenBy = [], align = "end" }: MessageSeenReceiptsProps) {
  if (!seenBy || seenBy.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/80 hover:text-foreground cursor-pointer transition-colors select-none"
            title={`Seen by ${seenBy.length} member${seenBy.length > 1 ? "s" : ""}`}
          >
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              {seenBy.slice(0, 3).map((r) => (
                <Avatar key={r.userId} className="size-4.5 rounded-full ring-1 ring-background border border-border/40">
                  <AvatarImage src={r.userAvatar} alt={r.userName} />
                  <AvatarFallback className="text-[7px] font-bold">
                    {r.userName.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="font-medium text-[9px] ml-0.5">
              {seenBy.length} seen
            </span>
          </button>
        }
      />
      <PopoverContent align={align === "end" ? "end" : "start"} side="top" className="w-56 p-2.5 text-xs shadow-lg">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 pb-1 border-b border-border/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <Eye className="size-3 text-primary" />
            <span>Read Receipts ({seenBy.length})</span>
          </div>

          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {seenBy.map((r) => (
              <div key={r.userId} className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Avatar className="size-5 rounded-full ring-1 ring-border/50 shrink-0">
                    <AvatarImage src={r.userAvatar} alt={r.userName} />
                    <AvatarFallback className="text-[8px] font-bold">
                      {r.userName.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate leading-tight">
                      {r.userName}
                    </p>
                    {r.userDesignation && (
                      <p className="text-[9px] text-muted-foreground truncate">
                        {r.userDesignation}
                      </p>
                    )}
                  </div>
                </div>
                <span className="font-mono text-[9px] text-muted-foreground shrink-0">
                  {r.seenAt}
                </span>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
