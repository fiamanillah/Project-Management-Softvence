// apps/dashboard/app/dashboard/projects/components/manage-workspace/chat-panel/ProjectChatPanel.tsx
"use client";

import * as React from "react";
import { ProjectChatHeader, type ChannelFilterMode } from "./ProjectChatHeader";
import { PinnedMessageBanner } from "./PinnedMessageBanner";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { ProjectChatSearchDrawer } from "./ProjectChatSearchDrawer";
import { MessageThreadDrawer } from "./MessageThreadDrawer";
import { api } from "@/lib/api";
import { toast } from "sonner";
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
    replyToMessageId?: string;
    attachments?: ChatAttachment[];
  }) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, text: string, reason?: string) => Promise<void> | void;
  onDeleteMessage?: (messageId: string) => Promise<void> | void;
  onUpdateApproval?: (messageId: string, workflow: ApprovalWorkflow) => void;
  onMarkSeen?: (messageIds: string[]) => void;
  onTogglePinMessage?: (messageId: string) => void;
  onTogglePinProject?: (projectId: string) => void;
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
  onDeleteMessage,
  onUpdateApproval,
  onMarkSeen,
  onTogglePinMessage,
  onTogglePinProject,
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
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = React.useState(false);
  const [activeThreadMessageId, setActiveThreadMessageId] = React.useState<string | null>(null);
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

  const handleOpenThread = (messageId: string) => {
    setActiveThreadMessageId(messageId);
  };

  const handleDeleteAttachment = async (messageId: string, attachmentId: string) => {
    try {
      await api.delete(`/projects/${project.id}/messages/${messageId}/attachments/${attachmentId}`);
      toast.success("Attachment removed successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove attachment");
    }
  };

  const handleSendThreadReply = async (payload: {
    text: string;
    replyToMessageId: string;
    purpose: MessagePurpose;
  }) => {
    await onSendMessage({
      text: payload.text,
      purpose: payload.purpose,
      replyToMessageId: payload.replyToMessageId,
    });
  };

  return (
    <div className={`flex h-full flex-col bg-background/50 relative overflow-hidden ${className || ""}`}>
      {/* 1. Chat Header with Project Code & Consolidated Channel Filter + Pinned Dropdown Sub-bar */}
      <ProjectChatHeader
        project={project}
        onBackMobile={handleMobileBack}
        isRightSidebarOpen={isRightSidebarOpen}
        onToggleRightSidebar={onToggleRightSidebar}
        onSearchClick={() => setIsSearchDrawerOpen(true)}
        activeChannel={activeChannel}
        onChannelChange={setActiveChannel}
        pendingApprovalsCount={pendingApprovalsCount}
        onScrollToMessage={handleScrollToMessage}
        onTogglePinMessage={onTogglePinMessage}
        onTogglePinProject={onTogglePinProject}
      />

      {/* 2. Message List Stream with Infinite Scrolling & Preserved Scroll */}
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
        onDeleteMessage={onDeleteMessage}
        onUpdateApproval={onUpdateApproval}
        onMarkSeen={onMarkSeen}
        onOpenThread={handleOpenThread}
        onDeleteAttachment={handleDeleteAttachment}
        channelFilter={activeChannel}
        targetScrollMessageId={effectiveTargetScrollMessageId}
        onTargetScrolled={() => {
          setInternalTargetScrollMessageId(null);
          onClearScrollTarget?.();
        }}
      />

      {/* 3. Message Composer with Purpose & Client Workflow */}
      <MessageComposer
        projectId={project.id}
        members={project.members}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
        onSendMessage={onSendMessage}
        targetClientName={project.client.name}
        projectCapabilities={project._capabilities}
      />

      {/* 4. Full-Text In-Chat Search Drawer (FEAT-02-UI) */}
      <ProjectChatSearchDrawer
        projectId={project.id}
        projectCode={project.code}
        open={isSearchDrawerOpen}
        onOpenChange={setIsSearchDrawerOpen}
        onSelectMessage={handleScrollToMessage}
      />

      {/* 5. Nested Message Thread Drawer (FEAT-03-UI) */}
      <MessageThreadDrawer
        projectId={project.id}
        projectCode={project.code}
        rootMessageId={activeThreadMessageId}
        open={Boolean(activeThreadMessageId)}
        onOpenChange={(open) => {
          if (!open) setActiveThreadMessageId(null);
        }}
        onSendReply={handleSendThreadReply}
      />
    </div>
  );
}
