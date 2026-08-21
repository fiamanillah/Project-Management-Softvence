"use client";

import * as React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@workspace/ui/components/tooltip";
import {
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ExternalLink,
} from "lucide-react";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { ClientDispatchModal } from "../chat-panel/ClientDispatchModal";
import type { ChatMessage, ApprovalWorkflow } from "../types";

interface ProjectClientDispatchTabProps {
  messages: ChatMessage[];
  onUpdateApproval?: (messageId: string, workflow: ApprovalWorkflow) => void;
  onScrollToMessage?: (messageId: string) => void;
}

export function ProjectClientDispatchTab({
  messages,
  onUpdateApproval,
  onScrollToMessage,
}: ProjectClientDispatchTabProps) {
  const [selectedMessage, setSelectedMessage] = React.useState<ChatMessage | null>(null);

  // Filter all messages that have an approval workflow (Client Outbound messages)
  const clientMessages = React.useMemo(() => {
    return messages.filter((m) => m.approval && m.approval.status !== "NOT_REQUIRED");
  }, [messages]);

  const pendingLeadCount = clientMessages.filter((m) => m.approval?.status === "PENDING_LEAD").length;
  const pendingSalesCount = clientMessages.filter((m) => m.approval?.status === "PENDING_SALES").length;
  const dispatchedCount = clientMessages.filter((m) => m.approval?.status === "DISPATCHED").length;

  if (clientMessages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 mb-2">
          <Send className="size-6 text-muted-foreground/60" />
        </div>
        <p className="text-xs font-semibold text-foreground">No Client Dispatch Messages</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[220px]">
          Messages drafted with the "Client Outbound" purpose will appear here for review and dispatch tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-3 space-y-3">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-3 gap-1.5 shrink-0">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-center">
          <span className="text-[9px] uppercase font-bold text-amber-700 dark:text-amber-400">
            Lead Review
          </span>
          <p className="text-base font-extrabold text-foreground font-mono">{pendingLeadCount}</p>
        </div>

        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-2 text-center">
          <span className="text-[9px] uppercase font-bold text-blue-700 dark:text-blue-400">
            Sales Dispatch
          </span>
          <p className="text-base font-extrabold text-foreground font-mono">{pendingSalesCount}</p>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-center">
          <span className="text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
            Dispatched
          </span>
          <p className="text-base font-extrabold text-foreground font-mono">{dispatchedCount}</p>
        </div>
      </div>

      {/* List of Client Outbound Communications with ScrollArea */}
      <ScrollArea className="flex-1 -mr-2 pr-2">
        <div className="space-y-2.5">
          {clientMessages.map((msg) => {
            const workflow = msg.approval!;
            return (
              <div
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className="rounded-xl border border-border/80 bg-card/80 p-3 shadow-2xs space-y-2 text-xs cursor-pointer hover:border-primary/40 hover:bg-muted/40 transition-all group"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Avatar className="size-5 rounded-full ring-1 ring-border/50 shrink-0">
                      <AvatarImage src={msg.senderAvatar} alt={msg.senderName} />
                      <AvatarFallback className="text-[8px] font-bold">
                        {msg.senderName.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-foreground truncate text-[11px]">
                      {msg.senderName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">• {msg.timestamp}</span>
                  </div>

                  <div>
                    {workflow.status === "PENDING_LEAD" && (
                      <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] gap-1 py-0.5">
                        <Clock className="size-2.5 animate-spin" /> Pending Lead ({workflow.currentStageDwellMinutes}m)
                      </Badge>
                    )}
                    {workflow.status === "PENDING_SALES" && (
                      <Badge variant="outline" className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[9px] gap-1 py-0.5">
                        <Clock className="size-2.5 animate-spin" /> Pending Sales ({workflow.currentStageDwellMinutes}m)
                      </Badge>
                    )}
                    {workflow.status === "DISPATCHED" && (
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] gap-1 py-0.5">
                        <CheckCircle2 className="size-2.5" /> Dispatched
                      </Badge>
                    )}
                    {workflow.status === "REVISION_REQUESTED" && (
                      <Badge variant="outline" className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[9px] gap-1 py-0.5">
                        <AlertTriangle className="size-2.5" /> Revision Req.
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Message Snippet */}
                <div className="rounded-lg bg-muted/40 p-2 text-foreground/90 text-[11px] leading-relaxed whitespace-pre-wrap max-h-20 overflow-hidden text-ellipsis font-sans">
                  {msg.text}
                </div>

                {/* Who viewed / Read Receipts */}
                {msg.seenBy && msg.seenBy.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-0.5">
                    <Eye className="size-3 text-primary shrink-0" />
                    <span>Seen by {msg.seenBy.length} team members</span>
                    <div className="flex items-center -space-x-1 ml-auto">
                      {msg.seenBy.slice(0, 3).map((r) => (
                        <Avatar key={r.userId} className="size-4 rounded-full ring-1 ring-card border border-border/40">
                          <AvatarImage src={r.userAvatar} alt={r.userName} />
                          <AvatarFallback className="text-[7px]">
                            {r.userName.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit Summary & Jump to Message */}
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {workflow.auditTrail?.length || 1} logged action(s)
                  </span>

                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onScrollToMessage?.(msg.id);
                            }}
                            className="h-6 text-[10px] gap-1 text-primary hover:text-primary/90 cursor-pointer hover:bg-primary/10"
                          >
                            Jump to Chat <ExternalLink className="size-2.5" />
                          </Button>
                        }
                      />
                      <TooltipContent side="left" className="text-xs">
                        Scroll to message in chat
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Detail Dialog */}
      {selectedMessage && selectedMessage.approval && (
        <ClientDispatchModal
          open={!!selectedMessage}
          onOpenChange={(open) => !open && setSelectedMessage(null)}
          workflow={selectedMessage.approval}
          messageText={selectedMessage.text}
          attachments={selectedMessage.attachments}
          seenBy={selectedMessage.seenBy}
          onUpdateApproval={(updated) => {
            onUpdateApproval?.(selectedMessage.id, updated);
            setSelectedMessage(null);
          }}
          messageId={selectedMessage.id}
          projectId={selectedMessage.projectId}
          projectCode={selectedMessage.projectCode}
          capabilities={selectedMessage._capabilities}
          isCurrentUser={selectedMessage.isCurrentUser}
          revisions={selectedMessage.revisions}
        />
      )}
    </div>
  );
}
