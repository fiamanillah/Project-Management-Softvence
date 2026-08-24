"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@workspace/ui/components/sheet";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Textarea } from "@workspace/ui/components/textarea";
import { MessageSquare, Send, Loader2, CornerDownRight, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FormattedMessageText } from "./FormattedMessageText";
import { MessageAttachmentPreview } from "./MessageAttachmentPreview";
import { formatMessageTime, formatMessageFullDateTime, formatMessageRelativeTime } from "./date-utils";
import type { ProjectMessageItem, CreateProjectMessageDTO } from "@workspace/shared";

interface MessageThreadDrawerProps {
  projectId: string;
  projectCode: string;
  rootMessageId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendReply: (payload: {
    text: string;
    replyToMessageId: string;
    purpose: any;
  }) => Promise<void> | void;
}

export function MessageThreadDrawer({
  projectId,
  projectCode,
  rootMessageId,
  open,
  onOpenChange,
  onSendReply,
}: MessageThreadDrawerProps) {
  const { user } = useAuth();
  const [parentMessage, setParentMessage] = React.useState<ProjectMessageItem | null>(null);
  const [replies, setReplies] = React.useState<ProjectMessageItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const fetchThread = React.useCallback(async (msgId: string) => {
    setIsLoading(true);
    try {
      const res = await api.get<{
        parentMessage: ProjectMessageItem;
        replies: ProjectMessageItem[];
        replyCount: number;
      }>(`/projects/${projectId}/messages/${msgId}/thread`);

      if (res && "parentMessage" in res) {
        setParentMessage(res.parentMessage);
        setReplies(res.replies || []);
      } else if (res && "data" in (res as any)) {
        setParentMessage((res as any).data.parentMessage);
        setReplies((res as any).data.replies || []);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load message thread");
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, onOpenChange]);

  React.useEffect(() => {
    if (open && rootMessageId) {
      fetchThread(rootMessageId);
    } else {
      setParentMessage(null);
      setReplies([]);
      setReplyText("");
    }
  }, [open, rootMessageId, fetchThread]);

  const handleSend = async () => {
    if (!replyText.trim() || !parentMessage) return;

    setIsSending(true);
    try {
      await onSendReply({
        text: replyText.trim(),
        replyToMessageId: parentMessage.id,
        purpose: parentMessage.purpose || "INTERNAL_DISCUSSION",
      });

      setReplyText("");
      // Refresh thread
      if (rootMessageId) {
        await fetchThread(rootMessageId);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send thread reply");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col gap-0 bg-background">
        <SheetHeader className="p-4 border-b border-border/60">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="size-4 text-primary" />
              Thread Conversation
            </SheetTitle>
            <Badge variant="outline" className="text-[10px] font-mono">
              {projectCode}
            </Badge>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            Focused discussion topic and replies.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin text-primary" />
            <p className="text-xs">Loading thread messages...</p>
          </div>
        ) : parentMessage ? (
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 space-y-4">
            {/* Root Topic Card */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 shadow-xs mb-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="size-6 border border-primary/30">
                    <AvatarImage src={parentMessage.senderAvatar || undefined} />
                    <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                      {(parentMessage.senderName || "U")
                        .split(" ")
                        .slice(0, 2)
                        .map((w) => w[0] ?? "")
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-bold text-foreground truncate">
                    {parentMessage.senderName || "User"}
                  </span>
                  {parentMessage.senderDesignation && (
                    <span className="text-[10px] text-muted-foreground truncate">
                      • {parentMessage.senderDesignation}
                    </span>
                  )}
                </div>

                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-medium">
                  Thread Root
                </Badge>
              </div>

              <div className="text-xs text-foreground/90 leading-relaxed break-words">
                <FormattedMessageText text={parentMessage.text} />
              </div>

              {parentMessage.attachments && parentMessage.attachments.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-border/40">
                  <MessageAttachmentPreview attachments={parentMessage.attachments as any} />
                </div>
              )}

              <div className="text-[10px] text-muted-foreground mt-2">
                <span
                  title={formatMessageFullDateTime(parentMessage.createdAt || parentMessage.timestamp)}
                  className="cursor-default"
                >
                  {formatMessageRelativeTime(parentMessage.createdAt || parentMessage.timestamp)}
                </span>
              </div>
            </div>

            {/* Replies Header */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground my-3 px-1">
              <CornerDownRight className="size-3.5" />
              <span>
                {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </span>
              <div className="h-px flex-1 bg-border/60" />
            </div>

            {/* Replies Stream */}
            <div className="space-y-3">
              {replies.map((reply) => {
                const isMe = reply.senderId === user?.id;

                return (
                  <div
                    key={reply.id}
                    className={`flex flex-col gap-1.5 p-3 rounded-lg border transition-all ${
                      isMe
                        ? "border-primary/30 bg-primary/5 ml-4"
                        : "border-border/60 bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="size-5 border border-border/40">
                          <AvatarImage src={reply.senderAvatar || undefined} />
                          <AvatarFallback className="text-[9px] font-semibold">
                            {(reply.senderName || "U")
                              .split(" ")
                              .slice(0, 2)
                              .map((w) => w[0] ?? "")
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-semibold text-foreground truncate">
                          {reply.senderName || "User"} {isMe && "(You)"}
                        </span>
                      </div>

                      <span
                        title={formatMessageFullDateTime(reply.createdAt || reply.timestamp)}
                        className="text-[10px] text-muted-foreground cursor-default"
                      >
                        {formatMessageTime(reply.createdAt || reply.timestamp)}
                      </span>
                    </div>

                    <div className="text-xs text-foreground/90 leading-relaxed break-words pl-7">
                      <FormattedMessageText text={reply.text} />
                    </div>

                    {reply.attachments && reply.attachments.length > 0 && (
                      <div className="pl-7 mt-1.5">
                        <MessageAttachmentPreview attachments={reply.attachments as any} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : null}

        {/* Mini Composer Footer */}
        <div className="p-3 border-t border-border/60 bg-card/80 backdrop-blur-xs">
          <div className="relative flex flex-col rounded-lg border border-border/60 bg-background focus-within:border-primary transition-colors">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Reply in thread... (Enter to send)`}
              className="min-h-[60px] max-h-[140px] resize-none border-0 shadow-none text-xs p-2.5 focus-visible:ring-0"
              disabled={isSending || isLoading}
            />
            <div className="flex items-center justify-between p-2 border-t border-border/30 bg-muted/20">
              <span className="text-[10px] text-muted-foreground">
                Shift + Enter for new line
              </span>
              <Button
                type="button"
                size="sm"
                onClick={handleSend}
                disabled={!replyText.trim() || isSending}
                className="h-7 px-3 text-xs gap-1.5"
              >
                {isSending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <>
                    <span>Reply</span>
                    <Send className="size-3" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
