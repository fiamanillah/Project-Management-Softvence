// apps/dashboard/app/dashboard/projects/components/manage-workspace/chat-panel/ProjectChatPanel.tsx
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
  isLoadingMessages?: boolean;
  hasMoreOlder?: boolean;
  isLoadingOlder?: boolean;
  onLoadEarlierMessages?: () => void;
  onSendMessage: (payload: {
    text: string;
    purpose: MessagePurpose;
    clientDirection?: ClientMessageDirection;
    clientMessageType?: ClientMessageType;
    outboundType?: OutboundMessageType;
    replyTo?: { id: string; senderName: string; text: string };
    attachments?: ChatAttachment[];
  }) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, text: string, reason?: string) => Promise<void> | void;
  onUpdateApproval?: (messageId: string, workflow: ApprovalWorkflow) => void;
  onMarkSeen?: (messageIds: string[]) => void;
  onTogglePinMessage?: (messageId: string) => void;
  onBackMobile?: () => void;
  onMobileBack?: () => void;
  onOpenMobileDetails?: () => void;
  targetScrollMessageId?: string | null;
  onClearScrollTarget?: () => void;
  isRightSidebarOpen: boolean;
  onToggleRightSidebar: () => void;
  className?: string;
}

export function ProjectChatPanel({
  project,
  messages,
  isLoadingMessages = false,
  hasMoreOlder = false,
  isLoadingOlder = false,
  onLoadEarlierMessages,
  onSendMessage,
  onReact,
  onToggleReaction,
  onEditMessage,
  onUpdateApproval,
  onMarkSeen,
  onTogglePinMessage,
  onBackMobile,
  onMobileBack,
  onOpenMobileDetails,
  targetScrollMessageId: externalTargetScrollMessageId,
  onClearScrollTarget,
  isRightSidebarOpen,
  onToggleRightSidebar,
  className,
}: ProjectChatPanelProps) {
  const [replyingTo, setReplyingTo] = React.useState<ChatMessage | null>(null);
  const [isSearchActive, setIsSearchActive] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeChannel, setActiveChannel] = React.useState<ChannelFilterMode>("all");
  const [internalTargetScrollMessageId, setInternalTargetScrollMessageId] = React.useState<string | null>(null);

  const effectiveTargetScrollMessageId = externalTargetScrollMessageId || internalTargetScrollMessageId;

  // React handler fallback
  const handleReact = onToggleReaction || onReact || (() => {});
  const handleMobileBack = onMobileBack || onBackMobile;

  // Compute pending approvals count
  const pendingApprovalsCount = React.useMemo(() => {
    return messages.filter(
      (m) =>
        m.approval &&
        (m.approval.status === "IN_REVIEW" ||
          m.approval.status === "PENDING_LEAD" ||
          m.approval.status === "PENDING_SALES"),
    ).length;
  }, [messages]);

  const handleReply = (message: ChatMessage) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleScrollToMessage = (messageId: string) => {
    if (messageId) {
      setInternalTargetScrollMessageId(messageId);
    }
  };

  return (
    <div className={`flex h-full flex-col bg-background/50 relative overflow-hidden ${className || ""}`}>
      {/* 1. Chat Header with Project Code & Consolidated Channel Filter + Pinned Dropdown Sub-bar */}
      <ProjectChatHeader
        project={project}
        onBackMobile={handleMobileBack}
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
        projectCreatedAt={project.deadline ? `Due: ${project.deadline}` : "Active"}
        isLoadingMessages={isLoadingMessages}
        hasMoreOlder={hasMoreOlder}
        isLoadingOlder={isLoadingOlder}
        onLoadEarlierMessages={onLoadEarlierMessages}
        onReply={handleReply}
        onReact={handleReact}
        onEdit={onEditMessage}
        onUpdateApproval={onUpdateApproval}
        onMarkSeen={onMarkSeen}
        searchFilterQuery={searchQuery}
        channelFilter={activeChannel}
        targetScrollMessageId={effectiveTargetScrollMessageId}
        onTargetScrolled={() => {
          setInternalTargetScrollMessageId(null);
          onClearScrollTarget?.();
        }}
      />

      {/* 4. Message Composer with Purpose & Client Workflow */}
      <MessageComposer
        projectId={project.id}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
        onSendMessage={onSendMessage}
        targetClientName={project.client.name}
        projectCapabilities={project._capabilities}
      />
    </div>
  );
}
