"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Pin, PinOff, ArrowRight, MessageSquare, Loader2 } from "lucide-react";
import { FormattedMessageText } from "./FormattedMessageText";
import { formatMessageRelativeTime, formatMessageFullDateTime } from "./date-utils";
import type { ProjectPinnedAnnouncement } from "../types";

interface PinnedMessagesModalProps {
  projectCode: string;
  pinnedList: ProjectPinnedAnnouncement[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
}

export function PinnedMessagesModal({
  projectCode,
  pinnedList,
  open,
  onOpenChange,
  onSelectMessage,
  onUnpinMessage,
}: PinnedMessagesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border/60">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <Pin className="size-4 text-primary fill-primary" />
              Pinned Announcements ({pinnedList.length})
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] font-mono">
              {projectCode}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Important messages, deadlines, and project announcements pinned for team visibility.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4 max-h-[60vh]">
          {pinnedList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
              <Pin className="size-8 stroke-1 text-muted-foreground/40" />
              <p className="text-xs font-medium text-foreground">No pinned messages</p>
              <p className="text-[11px]">Pin important messages from their action menu to keep them here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pinnedList.map((item) => {
                const initials = (item.author || "User")
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0] ?? "")
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 p-3.5 rounded-xl border border-primary/20 bg-primary/5 hover:border-primary/40 transition-all shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="size-5.5 border border-primary/30">
                          <AvatarImage src={item.authorAvatar || undefined} />
                          <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold text-foreground truncate">
                          {item.author}
                        </span>
                        {item.authorDesignation && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            • {item.authorDesignation}
                          </span>
                        )}
                      </div>

                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-medium shrink-0">
                        {item.category || "ANNOUNCEMENT"}
                      </Badge>
                    </div>

                    <div className="text-xs text-foreground/90 leading-relaxed break-words">
                      <FormattedMessageText text={item.message} />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                      <span
                        title={formatMessageFullDateTime(item.timestamp)}
                        className="cursor-default"
                      >
                        {formatMessageRelativeTime(item.timestamp)}
                      </span>

                      <div className="flex items-center gap-1">
                        {onUnpinMessage && item.messageId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive gap-1"
                            onClick={() => onUnpinMessage(item.messageId!)}
                          >
                            <PinOff className="size-3" />
                            Unpin
                          </Button>
                        )}

                        {onSelectMessage && item.messageId && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-6 text-[10px] px-2 gap-1 text-primary hover:bg-primary/15"
                            onClick={() => {
                              onSelectMessage(item.messageId!);
                              onOpenChange(false);
                            }}
                          >
                            Jump to <ArrowRight className="size-2.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
