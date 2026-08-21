// apps/dashboard/app/dashboard/projects/components/manage-workspace/chat-panel/MessageRevisionHistoryDialog.tsx
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { History, Copy, Clock, ArrowRight, FileText, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { FormattedMessageText } from "./FormattedMessageText";
import type { ChatMessage, ProjectMessageRevision } from "../types";

interface MessageRevisionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: ChatMessage;
}

export function MessageRevisionHistoryDialog({
  open,
  onOpenChange,
  message,
}: MessageRevisionHistoryDialogProps) {
  const [revisions, setRevisions] = React.useState<ProjectMessageRevision[]>(message.revisions || []);
  const [isLoading, setIsLoading] = React.useState(false);

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

  const handleCopy = (text: string, label = "Text") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 max-h-[85vh] flex flex-col overflow-hidden bg-card text-card-foreground border-border/80 shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-4 bg-gradient-to-r from-primary/10 via-background to-background border-b border-border/60 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
                <History className="size-4.5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold text-foreground truncate">
                  Message Edit History
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  Original author: <strong className="text-foreground">{message.senderName}</strong> • {revisions.length} previous version(s)
                </p>
              </div>
            </div>

            <Badge variant="outline" className="text-xs bg-muted/60 font-mono">
              {message.projectCode}
            </Badge>
          </div>
        </DialogHeader>

        {/* Content Stream */}
        <ScrollArea className="flex-1 p-4 overflow-hidden">
          <div className="space-y-4">
            {/* 1. Current Active Version */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Current Version
                  </Badge>
                  {message.editedAt && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      (Edited {new Date(message.editedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                    </span>
                  )}
                </div>

                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => handleCopy(message.text, "Current message")}
                  className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Copy className="size-3" /> Copy
                </Button>
              </div>

              <div className="rounded-lg bg-background/90 border border-border/70 p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans">
                <FormattedMessageText text={message.text} isCurrentUser={false} />
              </div>
            </div>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center justify-center p-6 text-muted-foreground gap-2 text-xs">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span>Loading revision history...</span>
              </div>
            )}

            {/* 2. Previous Versions in Chronological Descent */}
            {!isLoading && revisions.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Previous Versions ({revisions.length})
                  </span>
                  <div className="flex-1 h-px bg-border/60" />
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
                      className="rounded-xl border border-border/70 bg-card/80 p-3 space-y-2 text-xs shadow-2xs hover:border-border transition-colors"
                    >
                      {/* Version Header */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex size-5.5 items-center justify-center rounded-full bg-muted text-muted-foreground font-mono text-[10px] font-bold shrink-0">
                            v{revNumber}
                          </span>

                          {rev.editorAvatar ? (
                            <Avatar className="size-5 rounded-full ring-1 ring-border/50 shrink-0">
                              <AvatarImage src={rev.editorAvatar} alt={rev.editorName} />
                              <AvatarFallback className="text-[8px] font-bold">
                                {rev.editorName.slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                          ) : null}

                          <span className="font-semibold text-foreground truncate text-[11px]">
                            {rev.editorName}
                            {rev.editorDesignation && (
                              <span className="text-[10px] text-muted-foreground font-normal ml-1">
                                ({rev.editorDesignation})
                              </span>
                            )}
                          </span>

                          <span className="text-[10px] text-muted-foreground font-mono">
                            • {formattedDate}
                          </span>
                        </div>

                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => handleCopy(rev.content, `Version ${revNumber}`)}
                          className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Copy className="size-3" /> Copy
                        </Button>
                      </div>

                      {/* Reason / Note if provided */}
                      {rev.reason && (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-amber-800 dark:text-amber-300 text-[11px]">
                          <strong>Change Note:</strong> {rev.reason}
                        </div>
                      )}

                      {/* Version Text Body */}
                      <div className="rounded-lg bg-muted/30 border border-border/60 p-2.5 text-[11px] leading-relaxed text-foreground/90 whitespace-pre-wrap font-sans">
                        {rev.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!isLoading && revisions.length === 0 && (
              <div className="p-4 text-center text-muted-foreground text-xs italic">
                No previous revisions recorded for this message.
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-border/60 bg-muted/20 shrink-0 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs cursor-pointer"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
