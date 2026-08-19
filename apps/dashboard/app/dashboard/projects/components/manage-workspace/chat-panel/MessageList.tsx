"use client";

import * as React from "react";
import { MessageGroupItem } from "./MessageGroupItem";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Button } from "@workspace/ui/components/button";
import { ArrowDown, Sparkles, Loader2, History } from "lucide-react";
import { mockHistoricalOlderMessages } from "../mock-data";
import type { ChatMessage, ApprovalWorkflow } from "../types";

interface MessageListProps {
  messages: ChatMessage[];
  projectCode?: string;
  projectCreatedAt?: string;
  onReply: (message: ChatMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onUpdateApproval?: (messageId: string, workflow: ApprovalWorkflow) => void;
  searchFilterQuery?: string;
  channelFilter?: "all" | "internal" | "client" | "approvals";
  targetScrollMessageId?: string | null;
  onTargetScrolled?: () => void;
}

export function MessageList({
  messages,
  projectCode,
  projectCreatedAt = "Oct 01, 2026",
  onReply,
  onReact,
  onUpdateApproval,
  searchFilterQuery = "",
  channelFilter = "all",
  targetScrollMessageId,
  onTargetScrolled,
}: MessageListProps) {
  const [highlightedId, setHighlightedId] = React.useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = React.useState(false);
  const [olderMessages, setOlderMessages] = React.useState<ChatMessage[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = React.useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = React.useState(false);

  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const isLoadingRef = React.useRef(false);

  // All combined messages (older prepended)
  const allMessages = React.useMemo(() => {
    return [...olderMessages, ...messages];
  }, [olderMessages, messages]);

  // Smooth scroll to target message when requested (e.g. from pinned pill, approvals tab, or quote)
  const scrollToMessage = React.useCallback(
    (msgId: string) => {
      const el = document.getElementById(`msg-${msgId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedId(msgId);
        setTimeout(() => {
          setHighlightedId(null);
        }, 2500);
        onTargetScrolled?.();
      }
    },
    [onTargetScrolled]
  );

  React.useEffect(() => {
    if (targetScrollMessageId) {
      scrollToMessage(targetScrollMessageId);
    }
  }, [targetScrollMessageId, scrollToMessage]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    const viewport = scrollAreaRef.current?.querySelector("[data-slot='scroll-area-viewport']");
    if (viewport) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Load older messages function (with scroll position preservation)
  const loadOlderMessages = React.useCallback(() => {
    if (!hasMoreOlder || isLoadingRef.current) return;

    isLoadingRef.current = true;
    setIsLoadingOlder(true);

    const viewport = scrollAreaRef.current?.querySelector(
      "[data-slot='scroll-area-viewport']"
    ) as HTMLElement | null;
    const prevScrollHeight = viewport?.scrollHeight || 0;

    setTimeout(() => {
      setOlderMessages((prev) => [...mockHistoricalOlderMessages, ...prev]);
      setHasMoreOlder(false);
      setIsLoadingOlder(false);
      isLoadingRef.current = false;

      // Preserve scroll position so content doesn't jump
      requestAnimationFrame(() => {
        if (viewport) {
          const newScrollHeight = viewport.scrollHeight;
          viewport.scrollTop = newScrollHeight - prevScrollHeight;
        }
      });
    }, 650);
  }, [hasMoreOlder]);

  // Scroll listener for infinite scroll at top and showing scroll-to-bottom button
  React.useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      "[data-slot='scroll-area-viewport']"
    ) as HTMLElement | null;
    if (!viewport) return;

    const handleScroll = () => {
      // 1. Infinite scroll trigger when user scrolls near top
      if (viewport.scrollTop < 60 && hasMoreOlder && !isLoadingRef.current) {
        loadOlderMessages();
      }

      // 2. Show scroll to bottom button if user scrolled up
      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      setShowScrollBottom(distanceFromBottom > 180);
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [hasMoreOlder, loadOlderMessages]);

  // Filter messages by channel & search query
  const filteredMessages = React.useMemo(() => {
    return allMessages.filter((m) => {
      // Channel Filter
      if (channelFilter === "internal") {
        if (m.purpose === "CLIENT_COMMUNICATION" || m.isFromClient || !!m.approval) return false;
      }
      if (channelFilter === "client") {
        if (m.purpose !== "CLIENT_COMMUNICATION" && !m.isFromClient && !m.approval) {
          return false;
        }
      }
      if (channelFilter === "approvals") {
        if (!m.approval || m.approval.status === "NOT_REQUIRED") return false;
      }

      // Search Filter
      if (searchFilterQuery.trim()) {
        const q = searchFilterQuery.toLowerCase().trim();
        const matchesText = m.text.toLowerCase().includes(q);
        const matchesSender = m.senderName.toLowerCase().includes(q);
        const matchesDeliverable = m.deliverableUpdate?.title.toLowerCase().includes(q);
        const matchesMeeting = m.meetingSummary?.meetingTitle.toLowerCase().includes(q);
        if (!matchesText && !matchesSender && !matchesDeliverable && !matchesMeeting) {
          return false;
        }
      }

      return true;
    });
  }, [allMessages, channelFilter, searchFilterQuery]);

  // Group consecutive messages by dateGroup and senderId
  const groupedByDate = React.useMemo(() => {
    const dates: Record<string, ChatMessage[][]> = {};

    filteredMessages.forEach((msg) => {
      const date = msg.dateGroup || "Today";
      if (!dates[date]) {
        dates[date] = [];
      }

      const dateArray = dates[date];
      if (!dateArray) return;

      const lastCluster = dateArray[dateArray.length - 1];
      const isClientComms = msg.purpose === "CLIENT_COMMUNICATION" || msg.isFromClient || !!msg.approval;

      if (
        lastCluster &&
        lastCluster.length > 0 &&
        lastCluster[0]?.senderId === msg.senderId &&
        !isClientComms
      ) {
        lastCluster.push(msg);
      } else {
        dateArray.push([msg]);
      }
    });

    return dates;
  }, [filteredMessages]);

  return (
    <div ref={scrollAreaRef} className="relative flex-1 min-h-0 overflow-hidden bg-background/30">
      {/* Shadcn ScrollArea Primitive */}
      <ScrollArea className="h-full w-full">
        <div className="p-2.5 sm:p-4 space-y-3 sm:space-y-4 select-text w-full max-w-full min-w-0">
          {/* Top Infinite Scroll Indicator / Beginning of Project History */}
          {isLoadingOlder ? (
            <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span className="text-[11px] font-medium">Loading earlier project messages...</span>
            </div>
          ) : hasMoreOlder ? (
            <div className="flex items-center justify-center py-2">
              <button
                type="button"
                onClick={loadOlderMessages}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/90 px-3 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 shadow-2xs backdrop-blur-md transition-all cursor-pointer"
              >
                <History className="size-3 text-primary" />
                <span>Load earlier sprint messages</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-5 text-center text-muted-foreground select-none border-b border-border/30 mb-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary mb-1.5 shadow-2xs">
                <Sparkles className="size-4" />
              </div>
              <span className="text-xs font-bold text-foreground">
                Beginning of {projectCode || "Project"} Stream
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                Project initiated on {projectCreatedAt} • All historical messages loaded
              </span>
            </div>
          )}

          {/* Grouped Messages Stream */}
          {Object.entries(groupedByDate).map(([dateLabel, clusters]) => (
            <div key={dateLabel} className="space-y-3">
              {/* Date Divider Pill */}
              <div className="flex items-center justify-center my-3 sticky top-1 z-10">
                <span className="rounded-full border border-border/60 bg-background/90 px-3 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-2xs backdrop-blur-md select-none">
                  {dateLabel}
                </span>
              </div>

              {/* Sender Clusters */}
              {clusters.map((cluster, idx) => {
                const firstMsg = cluster[0];
                const clusterKey = firstMsg ? `${firstMsg.id}-${idx}` : `cluster-${idx}`;
                return (
                  <MessageGroupItem
                    key={clusterKey}
                    messages={cluster}
                    onReply={onReply}
                    onReact={onReact}
                    onUpdateApproval={onUpdateApproval}
                    onScrollToMessage={scrollToMessage}
                    highlightedMessageId={highlightedId}
                  />
                );
              })}
            </div>
          ))}

          {filteredMessages.length === 0 && (
            <div className="flex h-64 flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <Sparkles className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-semibold text-foreground">
                {channelFilter === "approvals"
                  ? "No pending approvals in this project"
                  : "No messages match your active filter"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {channelFilter === "approvals"
                  ? "All client communications and deliverables have been approved or dispatched."
                  : "Try selecting 'All Stream' or adjusting your search term."}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <Button
          size="icon-xs"
          onClick={scrollToBottom}
          className="absolute bottom-3 right-3 z-30 size-8 rounded-full bg-background/95 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80 shadow-md backdrop-blur-md cursor-pointer transition-all animate-in fade-in zoom-in-95"
          title="Jump to latest messages"
        >
          <ArrowDown className="size-4" />
        </Button>
      )}
    </div>
  );
}
