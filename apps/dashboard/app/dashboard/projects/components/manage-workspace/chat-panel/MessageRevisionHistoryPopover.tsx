// apps/dashboard/app/dashboard/projects/components/manage-workspace/chat-panel/MessageRevisionHistoryPopover.tsx
"use client";

import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { History, Copy, Clock, Loader2, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import { api } from "@/lib/api";
import { FormattedMessageText } from "./FormattedMessageText";
import type { ChatMessage, ProjectMessageRevision } from "../types";

interface MessageRevisionHistoryPopoverProps {
  message: ChatMessage;
  children?: React.ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MessageRevisionHistoryPopover({
  message,
  children,
  align = "end",
  side = "top",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: MessageRevisionHistoryPopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange || (() => {}) : setInternalOpen;

  const [revisions, setRevisions] = React.useState<ProjectMessageRevision[]>(message.revisions || []);
  const [isLoading, setIsLoading] = React.useState(false);
  const [copiedIndex, setCopiedIndex] = React.useState<number | "current" | null>(null);

  // Sync initial revisions from message if available
  React.useEffect(() => {
    if (message.revisions && message.revisions.length > 0) {
      setRevisions(message.revisions);
    }
  }, [message.revisions]);

  // Fetch full history when popover is opened
  React.useEffect(() => {
    if (!open || !message.id || !message.projectId) return;

    let isMounted = true;
    async function fetchRevisions() {
      setIsLoading(true);
      try {
        const res = await api.get<any>(`/projects/${message.projectId}/messages/${message.id}/revisions`);
        const data = (res as any)?.data || res;
        if (isMounted && Array.isArray(data)) {
          setRevisions(data);
        }
      } catch (err: any) {
        console.error("Failed to load message revisions:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchRevisions();
    return () => {
      isMounted = false;
    };
  }, [open, message.id, message.projectId]);

  const handleCopy = (text: string, key: number | "current", label = "Text") => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(key);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => {
      setCopiedIndex((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const totalVersions = revisions.length + 1;

  const triggerNode = children ? (
    (children as any)
  ) : (
    <button
      type="button"
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold underline underline-offset-2 hover:text-foreground cursor-pointer transition-opacity text-muted-foreground"
      title="Click to view edit history"
    >
      <span>(edited)</span>
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={triggerNode} />

      <PopoverContent
        align={align}
        side={side}
        sideOffset={6}
        className="w-80 sm:w-92 p-0 flex flex-col overflow-hidden rounded-xl border border-border/80 bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95"
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 bg-muted/30 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <History className="size-3.5 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground truncate">
              Edit History
            </span>
          </div>

          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-5 bg-background/80">
            {revisions.length} edit{revisions.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {/* Scrollable Content Container with shadcn ScrollArea */}
        <ScrollArea className="h-72 max-h-80 w-full">
          <div className="p-3 space-y-3">
            {/* 1. Current Active Message */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    Current Version (v{totalVersions})
                  </span>
                </div>

                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => handleCopy(message.text, "current", "Current message")}
                  className="size-5 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
                  title="Copy current message"
                >
                  {copiedIndex === "current" ? (
                    <Check className="size-2.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-2.5" />
                  )}
                </Button>
              </div>

              <div className="rounded bg-background/90 border border-border/60 p-2 text-[11px] leading-relaxed text-foreground whitespace-pre-wrap break-words font-sans">
                <FormattedMessageText text={message.text} isCurrentUser={false} />
              </div>

              {message.editedAt && (
                <p className="text-[9px] text-muted-foreground font-mono text-right">
                  Edited {new Date(message.editedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center justify-center p-4 text-muted-foreground gap-1.5 text-xs">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                <span className="text-[11px]">Loading revisions...</span>
              </div>
            )}

            {/* 2. Previous Versions List */}
            {!isLoading && revisions.length > 0 && (
              <div className="space-y-2.5 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                    Previous Revisions
                  </span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>

                {revisions.map((rev, index) => {
                  const revNumber = revisions.length - index;
                  const formattedDate = new Date(rev.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={rev.id || index}
                      className="rounded-lg border border-border/70 bg-card/70 p-2.5 space-y-1.5 text-xs shadow-2xs hover:border-border transition-colors"
                    >
                      {/* Revision Meta Header */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="flex size-4.5 items-center justify-center rounded-full bg-muted text-muted-foreground font-mono text-[9px] font-bold shrink-0">
                            v{revNumber}
                          </span>

                          {rev.editorAvatar && (
                            <Avatar className="size-4 rounded-full ring-1 ring-border/50 shrink-0">
                              <AvatarImage src={rev.editorAvatar} alt={rev.editorName} />
                              <AvatarFallback className="text-[7px] font-bold">
                                {rev.editorName.slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          <span className="font-semibold text-foreground truncate text-[10px]">
                            {rev.editorName}
                          </span>

                          <span className="text-[9px] text-muted-foreground font-mono truncate">
                            • {formattedDate}
                          </span>
                        </div>

                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => handleCopy(rev.content, index, `Version ${revNumber}`)}
                          className="size-5 text-muted-foreground hover:text-foreground cursor-pointer rounded-md shrink-0"
                          title={`Copy v${revNumber}`}
                        >
                          {copiedIndex === index ? (
                            <Check className="size-2.5 text-emerald-600" />
                          ) : (
                            <Copy className="size-2.5" />
                          )}
                        </Button>
                      </div>

                      {/* Change Note */}
                      {rev.reason && (
                        <div className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-amber-800 dark:text-amber-300 text-[10px] leading-tight break-words">
                          <strong className="font-semibold">Note:</strong> {rev.reason}
                        </div>
                      )}

                      {/* Content Box */}
                      <div className="rounded bg-muted/40 border border-border/50 p-2 text-[11px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words font-sans">
                        {rev.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!isLoading && revisions.length === 0 && (
              <div className="p-3 text-center text-muted-foreground text-[11px] italic">
                No previous revisions recorded.
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
