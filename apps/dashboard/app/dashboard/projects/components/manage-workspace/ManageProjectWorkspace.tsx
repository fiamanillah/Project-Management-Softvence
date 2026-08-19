"use client";

import * as React from "react";
import { Sheet, SheetContent } from "@workspace/ui/components/sheet";
import { ProjectListSidebar } from "./left-sidebar/ProjectListSidebar";
import { ProjectChatPanel } from "./chat-panel/ProjectChatPanel";
import { ProjectDetailsSidebar } from "./right-sidebar/ProjectDetailsSidebar";
import {
  mockProjects,
  mockMessagesByProjectId,
  mockCurrentUser,
  project1,
  memberSarah,
  memberMarcus,
} from "./mock-data";
import type {
  ProjectWorkspaceItem,
  ChatMessage,
  ChatAttachment,
  MessagePurpose,
  ClientMessageDirection,
  ClientMessageType,
  OutboundMessageType,
  ApprovalWorkflow,
  ApprovalStageAudit,
  ClientInboundRelay,
} from "./types";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";

interface ManageProjectWorkspaceProps {
  initialProjectId?: string | null;
  onNewProject?: () => void;
}

export function ManageProjectWorkspace({
  initialProjectId,
  onNewProject,
}: ManageProjectWorkspaceProps) {
  const [projects, setProjects] = React.useState<ProjectWorkspaceItem[]>(mockProjects);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(() => {
    if (initialProjectId) {
      const match = mockProjects.find((p) => p.id === initialProjectId);
      if (match) return match.id;
    }
    return project1.id;
  });

  const [messagesByProject, setMessagesByProject] =
    React.useState<Record<string, ChatMessage[]>>(mockMessagesByProjectId);

  // Desktop left sidebar collapsed state
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = React.useState(false);

  // Desktop right sidebar open/closed
  const [isRightSidebarOpen, setIsRightSidebarOpen] = React.useState(true);

  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);

  // Mobile active screen: "list" | "chat"
  const [mobileActiveScreen, setMobileActiveScreen] = React.useState<"list" | "chat">("list");

  // Scroll to target message ID
  const [targetScrollMessageId, setTargetScrollMessageId] = React.useState<string | null>(null);

  // Selected project object
  const selectedProject: ProjectWorkspaceItem =
    projects.find((p) => p.id === selectedProjectId) ?? project1;

  const currentMessages = messagesByProject[selectedProject.id] ?? [];

  // Handle selecting a project
  const handleSelectProject = (project: ProjectWorkspaceItem) => {
    setSelectedProjectId(project.id);
    setMobileActiveScreen("chat");

    // Clear unread count on select
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, unreadCount: 0 } : p))
    );
  };

  // Handle sending a message with purpose & approval
  const handleSendMessage = (payload: {
    text: string;
    purpose: MessagePurpose;
    clientDirection?: ClientMessageDirection;
    clientMessageType?: ClientMessageType;
    outboundType?: OutboundMessageType;
    replyTo?: { id: string; senderName: string; text: string };
    attachments?: ChatAttachment[];
  }) => {
    const newMsgId = `msg-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const isClientOutbound =
      payload.purpose === "CLIENT_COMMUNICATION" && payload.clientDirection === "OUTBOUND";
    const isClientInbound =
      payload.purpose === "CLIENT_COMMUNICATION" && payload.clientDirection === "INBOUND";

    // 1. If Client Outbound (to client) -> requires lead approval & sales dispatch
    let approvalWorkflow: ApprovalWorkflow | undefined = undefined;
    if (isClientOutbound) {
      const initialAudit: ApprovalStageAudit = {
        id: `aud-${Date.now()}`,
        stageName: "Draft Created",
        stageKey: "DRAFTED",
        actorName: mockCurrentUser.name,
        actorRole: mockCurrentUser.designation || "Author",
        timestamp,
        durationMinutes: 0,
        notes: `Drafted client communication (${payload.clientMessageType || "General"}) for ${selectedProject.client.name}.`,
      };

      approvalWorkflow = {
        id: `appr-${Date.now()}`,
        status: "PENDING_LEAD",
        clientMessageType: payload.clientMessageType || payload.outboundType || "GENERAL_NOTICE",
        outboundType: payload.outboundType || payload.clientMessageType || "GENERAL_NOTICE",
        requestedBy: mockCurrentUser.name,
        requestedAt: timestamp,
        targetClient: selectedProject.client.name,
        currentStageDwellMinutes: 1,
        slaTargetMinutes: 30,
        slaStatus: "ON_TRACK",
        auditTrail: [initialAudit],
      };
    }

    // 2. If Client Inbound (relayed from external client channel by sales)
    let inboundRelay: ClientInboundRelay | undefined = undefined;
    if (isClientInbound) {
      inboundRelay = {
        clientName: selectedProject.client.name,
        clientAvatar: selectedProject.client.avatar,
        clientCompany: selectedProject.client.company,
        platform: selectedProject.client.platform === "Fiverr Pro" ? "Fiverr" : selectedProject.client.platform === "Upwork Enterprise" ? "Upwork" : "Direct Portal",
        relayedBySalesName: mockCurrentUser.name,
        relayedAt: timestamp,
      };
    }

    const newMsg: ChatMessage = {
      id: newMsgId,
      projectId: selectedProject.id,
      projectCode: selectedProject.code,
      senderId: isClientInbound ? "client-inbound" : mockCurrentUser.id,
      senderName: isClientInbound ? selectedProject.client.name : mockCurrentUser.name,
      senderAvatar: isClientInbound ? (selectedProject.client.avatar || "") : mockCurrentUser.avatar,
      senderDesignation: isClientInbound ? "Client Account" : mockCurrentUser.designation,
      senderRole: isClientInbound ? "Member" : mockCurrentUser.role,
      isCurrentUser: !isClientInbound,
      isFromClient: isClientInbound,
      text: payload.text,
      timestamp,
      dateGroup: "Today",
      purpose: payload.purpose,
      clientDirection: payload.clientDirection,
      clientMessageType: payload.clientMessageType,
      outboundType: payload.outboundType || payload.clientMessageType,
      variant: isClientInbound ? "tinted" : isClientOutbound ? "outline" : "default",
      approval: approvalWorkflow,
      clientInboundRelay: inboundRelay,
      seenBy: [
        {
          userId: mockCurrentUser.id,
          userName: mockCurrentUser.name,
          userAvatar: mockCurrentUser.avatar,
          userDesignation: mockCurrentUser.designation,
          seenAt: timestamp,
        },
      ],
      replyTo: payload.replyTo,
      attachments: payload.attachments,
    };

    setMessagesByProject((prev) => ({
      ...prev,
      [selectedProject.id]: [...(prev[selectedProject.id] || []), newMsg],
    }));

    // Update project last message snippet & pending approvals
    setProjects((prev) =>
      prev.map((p) =>
        p.id === selectedProject.id
          ? {
              ...p,
              pendingApprovalsCount:
                isClientOutbound
                  ? (p.pendingApprovalsCount || 0) + 1
                  : p.pendingApprovalsCount,
              lastMessage: {
                id: newMsgId,
                senderName: isClientInbound ? selectedProject.client.name : mockCurrentUser.name,
                text: payload.text || "Sent an attachment",
                timestamp,
                isRead: true,
                purpose: payload.purpose,
              },
            }
          : p
      )
    );

    // Simulated acknowledgement reply from team member if it's an internal note
    if (payload.purpose === "INTERNAL_DISCUSSION") {
      setTimeout(() => {
        const responder =
          selectedProject.members.find((m) => m.isOnline && m.id !== mockCurrentUser.id) ??
          memberSarah;
        const replyMsgId = `msg-reply-${Date.now()}`;
        const replyTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        const autoReply: ChatMessage = {
          id: replyMsgId,
          projectId: selectedProject.id,
          projectCode: selectedProject.code,
          senderId: responder.id,
          senderName: responder.name,
          senderAvatar: responder.avatar,
          senderDesignation: responder.designation,
          senderRole: responder.role,
          isCurrentUser: false,
          text: `Acknowledged for #${selectedProject.code}. Testing team is syncing now. 👍`,
          timestamp: replyTimestamp,
          dateGroup: "Today",
          purpose: "INTERNAL_DISCUSSION",
          variant: "secondary",
          seenBy: [
            {
              userId: responder.id,
              userName: responder.name,
              userAvatar: responder.avatar,
              userDesignation: responder.designation,
              seenAt: replyTimestamp,
            },
            {
              userId: mockCurrentUser.id,
              userName: mockCurrentUser.name,
              userAvatar: mockCurrentUser.avatar,
              userDesignation: mockCurrentUser.designation,
              seenAt: replyTimestamp,
            },
          ],
          replyTo: {
            id: newMsgId,
            senderName: mockCurrentUser.name,
            text: payload.text.slice(0, 45) + "...",
          },
          reactions: [{ emoji: "👍", count: 1, reactedByMe: false }],
        };

        setMessagesByProject((prev) => ({
          ...prev,
          [selectedProject.id]: [...(prev[selectedProject.id] || []), autoReply],
        }));

        setProjects((prev) =>
          prev.map((p) =>
            p.id === selectedProject.id
              ? {
                  ...p,
                  lastMessage: {
                    id: replyMsgId,
                    senderName: responder.name,
                    text: autoReply.text,
                    timestamp: replyTimestamp,
                    isRead: false,
                    purpose: "INTERNAL_DISCUSSION",
                  },
                }
              : p
          )
        );
      }, 1600);
    }
  };

  // Handle updating an approval workflow state
  const handleUpdateApproval = (messageId: string, workflow: ApprovalWorkflow) => {
    setMessagesByProject((prev) => {
      const list = prev[selectedProject.id] || [];
      const updated = list.map((msg) =>
        msg.id === messageId ? { ...msg, approval: workflow } : msg
      );
      return { ...prev, [selectedProject.id]: updated };
    });

    // Update pending approvals counter on project
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== selectedProject.id) return p;
        const currentList = messagesByProject[p.id] || [];
        const count = currentList.filter(
          (m) =>
            m.approval &&
            (m.id === messageId
              ? workflow.status === "PENDING_LEAD" || workflow.status === "PENDING_SALES"
              : m.approval.status === "PENDING_LEAD" || m.approval.status === "PENDING_SALES")
        ).length;
        return { ...p, pendingApprovalsCount: count };
      })
    );
  };

  // Handle scrolling to message
  const handleScrollToMessage = (msgId: string) => {
    setTargetScrollMessageId(msgId);
    if (mobileActiveScreen === "list") {
      setMobileActiveScreen("chat");
    }
  };

  // Handle adding or toggling an emoji reaction
  const handleReact = (messageId: string, emoji: string) => {
    setMessagesByProject((prev) => {
      const list = prev[selectedProject.id] || [];
      const updated = list.map((msg) => {
        if (msg.id !== messageId) return msg;

        const existingReactions = msg.reactions || [];
        const found = existingReactions.find((r) => r.emoji === emoji);

        let newReactions;
        if (found) {
          if (found.reactedByMe) {
            newReactions = existingReactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count - 1, reactedByMe: false }
                  : r
              )
              .filter((r) => r.count > 0);
          } else {
            newReactions = existingReactions.map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count + 1, reactedByMe: true }
                : r
            );
          }
        } else {
          newReactions = [...existingReactions, { emoji, count: 1, reactedByMe: true }];
        }

        return { ...msg, reactions: newReactions };
      });

      return {
        ...prev,
        [selectedProject.id]: updated,
      };
    });
  };

  // Responsive sidebar toggling
  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileDrawerOpen(true);
    } else {
      setIsRightSidebarOpen((prev) => !prev);
    }
  };

  return (
    <div className="relative h-[calc(100vh-8.5rem)] min-h-[600px] w-full overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-sm backdrop-blur-xs flex">
      {/* 1. Left Project List Sidebar */}
      <div
        className={cn(
          "shrink-0 h-full transition-all duration-300",
          mobileActiveScreen === "list" ? "w-full block" : "hidden md:block",
          isLeftSidebarCollapsed ? "w-16 xl:w-[68px]" : "w-full md:w-80 lg:w-84 xl:w-88"
        )}
      >
        <ProjectListSidebar
          projects={projects}
          selectedProjectId={selectedProject.id}
          onSelectProject={handleSelectProject}
          onNewProject={onNewProject}
          isCollapsed={isLeftSidebarCollapsed}
          onToggleCollapse={() => setIsLeftSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* 2. Middle Centralized Communication & Approval Chat Panel */}
      <div
        className={`flex-1 min-w-0 max-w-full h-full flex flex-col overflow-hidden ${
          mobileActiveScreen === "chat" ? "flex" : "hidden md:flex"
        }`}
      >
        {selectedProject ? (
          <ProjectChatPanel
            project={selectedProject}
            messages={currentMessages}
            onSendMessage={handleSendMessage}
            onReact={handleReact}
            onUpdateApproval={handleUpdateApproval}
            onBackMobile={() => setMobileActiveScreen("list")}
            isRightSidebarOpen={isRightSidebarOpen}
            onToggleRightSidebar={handleToggleSidebar}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
            Select a project to view conversations and approvals
          </div>
        )}
      </div>

      {/* 3. Right Project Details Sidebar (Desktop) */}
      {isRightSidebarOpen && (
        <div className="hidden lg:block w-84 xl:w-92 shrink-0 h-full transition-all">
          <ProjectDetailsSidebar
            project={selectedProject}
            messages={currentMessages}
            onUpdateApproval={handleUpdateApproval}
            onScrollToMessage={handleScrollToMessage}
            onClose={() => setIsRightSidebarOpen(false)}
          />
        </div>
      )}

      {/* 4. Right Project Details Drawer (Mobile & Tablet) */}
      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent side="right" className="p-0 w-full sm:max-w-md bg-card">
          <ProjectDetailsSidebar
            project={selectedProject}
            messages={currentMessages}
            onUpdateApproval={handleUpdateApproval}
            onScrollToMessage={(msgId) => {
              handleScrollToMessage(msgId);
              setMobileDrawerOpen(false);
            }}
            onClose={() => setMobileDrawerOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
