"use client";

import * as React from "react";
import { ProjectChatHeader, type ChannelFilterMode } from "./ProjectChatHeader";
import { PinnedMessageBanner } from "./PinnedMessageBanner";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { Input } from "@workspace/ui/components/input";
import { Search, X } from "lucide-react";
import type {
  ProjectWorkspaceItem,
  ChatMessage,
  ChatAttachment,
  MessagePurpose,
  ClientMessageDirection,
  ClientMessageType,
  OutboundMessageType,
  ApprovalWorkflow,
} from "../types";

interface ProjectChatPanelProps {
  project: ProjectWorkspaceItem;
  messages: ChatMessage[];
  onSendMessage: (payload: {
    text: string;
    purpose: MessagePurpose;
    clientDirection?: ClientMessageDirection;
    clientMessageType?: ClientMessageType;
    outboundType?: OutboundMessageType;
    replyTo?: { id: string; senderName: string; text: string };
    attachments?: ChatAttachment[];
  }) => void;
  onReact: (messageId: string, emoji: string) => void;
  onUpdateApproval?: (messageId: string, workflow: ApprovalWorkflow) => void;
  onBackMobile?: () => void;
  isRightSidebarOpen: boolean;
  onToggleRightSidebar: () => void;
  className?: string;
}

export function ProjectChatPanel({
  project,
  messages,
  onSendMessage,
  onReact,
  onUpdateApproval,
  onBackMobile,
  isRightSidebarOpen,
  onToggleRightSidebar,
  className,
}: ProjectChatPanelProps) {
  const [replyingTo, setReplyingTo] = React.useState<ChatMessage | null>(null);
  const [isSearchActive, setIsSearchActive] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeChannel, setActiveChannel] = React.useState<ChannelFilterMode>("all");
  const [targetScrollMessageId, setTargetScrollMessageId] = React.useState<string | null>(null);

  // Compute pending approvals count
  const pendingApprovalsCount = React.useMemo(() => {
    return messages.filter((m) => m.approval && (m.approval.status === "PENDING_LEAD" || m.approval.status === "PENDING_SALES")).length;
  }, [messages]);

  const handleReply = (message: ChatMessage) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleScrollToMessage = (messageId: string) => {
    if (messageId) {
      setTargetScrollMessageId(messageId);
    }
  };

  return (
    <div className={`flex h-full flex-col bg-background/50 relative overflow-hidden ${className || ""}`}>
      {/* 1. Chat Header with Project Code & Consolidated Channel Filter + Pinned Dropdown Sub-bar */}
      <ProjectChatHeader
        project={project}
        onBackMobile={onBackMobile}
        isRightSidebarOpen={isRightSidebarOpen}
        onToggleRightSidebar={onToggleRightSidebar}
        onSearchClick={() => setIsSearchActive((prev) => !prev)}
        activeChannel={activeChannel}
        onChannelChange={setActiveChannel}
        pendingApprovalsCount={pendingApprovalsCount}
        onScrollToMessage={handleScrollToMessage}
      />

      {/* 2. In-Chat Search Overlay */}
      {isSearchActive && (
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2 backdrop-blur-xs shrink-0">
          <Search className="size-3.5 text-muted-foreground" />
          <Input
            autoFocus
            placeholder={`Search messages in ${project.code}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs bg-background/80"
          />
          <button
            type="button"
            onClick={() => {
              setIsSearchActive(false);
              setSearchQuery("");
            }}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* 3. Message List Stream with Infinite Scrolling & Preserved Scroll */}
      <MessageList
        messages={messages}
        projectCode={project.code}
        projectCreatedAt="Oct 01, 2026"
        onReply={handleReply}
        onReact={onReact}
        onUpdateApproval={onUpdateApproval}
        searchFilterQuery={searchQuery}
        channelFilter={activeChannel}
        targetScrollMessageId={targetScrollMessageId}
        onTargetScrolled={() => setTargetScrollMessageId(null)}
      />

      {/* 5. Message Composer with Purpose & Client Workflow */}
      <MessageComposer
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
        onSendMessage={onSendMessage}
        targetClientName={project.client.name}
      />
    </div>
  );
}
