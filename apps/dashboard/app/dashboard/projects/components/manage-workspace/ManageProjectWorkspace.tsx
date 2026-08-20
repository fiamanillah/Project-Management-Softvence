// apps/dashboard/app/dashboard/projects/components/manage-workspace/ManageProjectWorkspace.tsx
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
} from "./types";
import { api } from "@/lib/api";
import { useProjectSocket } from "@/lib/socket/useProjectSocket";
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
  const [isLoadingMessages, setIsLoadingMessages] = React.useState<boolean>(false);

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
    projects.find((p) => p.id === selectedProjectId) ?? projects[0] ?? project1;

  const currentMessages = messagesByProject[selectedProject.id] ?? [];

  // 1. Fetch live projects from backend API
  React.useEffect(() => {
    let isMounted = true;
    async function loadWorkspaceProjects() {
      try {
        const liveProjects = await api.get<ProjectWorkspaceItem[]>("/projects/workspace");
        if (isMounted && Array.isArray(liveProjects) && liveProjects.length > 0) {
          setProjects(liveProjects);
          if (initialProjectId && liveProjects.some((p) => p.id === initialProjectId)) {
            setSelectedProjectId(initialProjectId);
          } else if (liveProjects[0] && (!selectedProjectId || selectedProjectId.startsWith("prj-") || !liveProjects.some((p) => p.id === selectedProjectId))) {
            setSelectedProjectId(liveProjects[0].id);
          }
        }
      } catch {
        // Graceful fallback to mock projects in offline / mock dev mode
      }
    }
    loadWorkspaceProjects();
    return () => {
      isMounted = false;
    };
  }, [initialProjectId]);

  // 2. Fetch live messages when selectedProjectId changes
  React.useEffect(() => {
    let isMounted = true;
    async function loadProjectMessages() {
      if (!selectedProjectId || selectedProjectId.startsWith("prj-")) return;
      setIsLoadingMessages(true);
      try {
        const res = await api.get<{ messages: any[] }>(`/projects/${selectedProjectId}/messages`);
        if (isMounted && res && Array.isArray(res.messages)) {
          setMessagesByProject((prev) => ({
            ...prev,
            [selectedProjectId]: res.messages as any,
          }));
        }
      } catch {
        // Fallback to existing memory messages
      } finally {
        if (isMounted) setIsLoadingMessages(false);
      }
    }
    loadProjectMessages();
    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  // 3. Real-Time WebSocket Hook Integration
  const socketClient = useProjectSocket({
    projectId: selectedProjectId,
    onNewMessage: (newMsg: any) => {
      setMessagesByProject((prev) => {
        const existing = prev[newMsg.projectId] || [];
        if (existing.some((m) => m.id === newMsg.id)) return prev;
        return {
          ...prev,
          [newMsg.projectId]: [...existing, newMsg],
        };
      });

      // Update snippet in projects list
      setProjects((prev) =>
        prev.map((p) =>
          p.id === newMsg.projectId
            ? {
                ...p,
                lastMessage: {
                  id: newMsg.id,
                  senderName: newMsg.senderName,
                  text: newMsg.text,
                  timestamp: newMsg.timestamp,
                  isRead: true,
                  purpose: newMsg.purpose,
                },
              }
            : p
        )
      );
    },
    onMessageUpdated: (updatedMsg: any) => {
      setMessagesByProject((prev) => ({
        ...prev,
        [updatedMsg.projectId]: (prev[updatedMsg.projectId] || []).map((m) =>
          m.id === updatedMsg.id ? updatedMsg : m
        ),
      }));
    },
    onReactionUpdated: ({ messageId, reactions }: any) => {
      setMessagesByProject((prev) => ({
        ...prev,
        [selectedProjectId]: (prev[selectedProjectId] || []).map((m) =>
          m.id === messageId ? { ...m, reactions } : m
        ),
      }));
    },
    onSeenReceiptsUpdated: ({ messageId, seenBy }: any) => {
      setMessagesByProject((prev) => ({
        ...prev,
        [selectedProjectId]: (prev[selectedProjectId] || []).map((m) =>
          m.id === messageId ? { ...m, seenBy } : m
        ),
      }));
    },
    onApprovalUpdated: ({ projectId, messageId, workflow }: any) => {
      setMessagesByProject((prev) => ({
        ...prev,
        [projectId]: (prev[projectId] || []).map((m) =>
          m.id === messageId ? { ...m, approval: workflow } : m
        ),
      }));
    },
  });

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
  const handleSendMessage = async (payload: {
    text: string;
    purpose: MessagePurpose;
    clientDirection?: ClientMessageDirection;
    clientMessageType?: ClientMessageType;
    outboundType?: OutboundMessageType;
    replyTo?: { id: string; senderName: string; text: string };
    attachments?: ChatAttachment[];
  }) => {
    try {
      // Attempt WebSocket emission
      await socketClient.sendMessage({
        text: payload.text,
        purpose: payload.purpose,
        clientDirection: payload.clientDirection,
        clientMessageType: payload.clientMessageType || payload.outboundType,
        replyToMessageId: payload.replyTo?.id,
        attachments: payload.attachments?.map((att) => ({
          name: att.name,
          type: att.type,
          url: att.url || "",
          thumbnailUrl: att.thumbnailUrl || null,
          fileSizeBytes: att.fileSizeBytes || null,
          extension: att.extension || null,
          mimeType: att.mimeType || null,
        })),
      });
    } catch {
      // Fallback to REST API if socket is temporarily offline
      try {
        const res = await api.post(`/projects/${selectedProjectId}/messages`, {
          text: payload.text,
          purpose: payload.purpose,
          clientDirection: payload.clientDirection,
          clientMessageType: payload.clientMessageType || payload.outboundType,
          replyToMessageId: payload.replyTo?.id,
          attachments: payload.attachments,
        });
        if (res) {
          setMessagesByProject((prev) => ({
            ...prev,
            [selectedProjectId]: [...(prev[selectedProjectId] || []), res],
          }));
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to send message");
      }
    }
  };

  // Handle updating an approval workflow state
  const handleUpdateApproval = async (messageId: string, updatedWorkflow: ApprovalWorkflow) => {
    try {
      if (updatedWorkflow.status === "PENDING_SALES") {
        await socketClient.dispatchApprovalAction({
          messageId,
          action: "LEAD_APPROVE",
          notes: "Approved internally by Tech Lead",
        });
      } else if (updatedWorkflow.status === "DISPATCHED") {
        await socketClient.dispatchApprovalAction({
          messageId,
          action: "SALES_DISPATCH",
          dispatchPlatform: updatedWorkflow.dispatchPlatform || "Direct Portal",
          dispatchReferenceId: updatedWorkflow.dispatchReferenceId,
        });
      } else if (updatedWorkflow.status === "REVISION_REQUESTED") {
        await socketClient.dispatchApprovalAction({
          messageId,
          action: "REVISION_REQUESTED",
          rejectionReason: updatedWorkflow.rejectionReason || "Revision requested",
        });
      }
    } catch {
      // Local optimistic update fallback
      setMessagesByProject((prev) => ({
        ...prev,
        [selectedProject.id]: (prev[selectedProject.id] || []).map((m) =>
          m.id === messageId ? { ...m, approval: updatedWorkflow } : m
        ),
      }));
    }
  };

  // Handle toggling reaction
  const handleToggleReaction = (messageId: string, emoji: string) => {
    socketClient.sendReaction(messageId, emoji);
  };

  // Handle scrolling to a pinned message or announcement
  const handleScrollToMessage = (messageId: string) => {
    setTargetScrollMessageId(messageId);
  };

  // Handle pinning/unpinning a message
  const handleTogglePinMessage = async (messageId: string) => {
    try {
      const updated = await api.post(`/projects/${selectedProjectId}/messages/${messageId}/pin`);
      if (updated) {
        setMessagesByProject((prev) => ({
          ...prev,
          [selectedProjectId]: (prev[selectedProjectId] || []).map((m) =>
            m.id === messageId ? updated : m
          ),
        }));
        toast.success(updated.isPinned ? "Message pinned to banner!" : "Message unpinned");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle pin status");
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background text-foreground select-none">
      {/* 1. Desktop Left Sidebar: Projects List */}
      <div
        className={cn(
          "hidden md:flex flex-col border-r border-border/80 bg-card transition-all duration-300 ease-in-out shrink-0",
          isLeftSidebarCollapsed ? "w-[68px]" : "w-80 lg:w-88"
        )}
      >
        <ProjectListSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          isCollapsed={isLeftSidebarCollapsed}
          onToggleCollapse={() => setIsLeftSidebarCollapsed((prev) => !prev)}
          onNewProject={onNewProject}
        />
      </div>

      {/* 2. Mobile Left Sidebar (Full screen when in "list" mode) */}
      <div
        className={cn(
          "flex md:hidden flex-col w-full bg-card shrink-0",
          mobileActiveScreen === "list" ? "flex" : "hidden"
        )}
      >
        <ProjectListSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          isCollapsed={false}
          onToggleCollapse={() => {}}
          onNewProject={onNewProject}
        />
      </div>

      {/* 3. Center Chat Panel (or Mobile Chat Screen) */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 bg-muted/20 relative h-full",
          mobileActiveScreen === "chat" ? "flex" : "hidden md:flex"
        )}
      >
        <ProjectChatPanel
          project={selectedProject}
          messages={currentMessages}
          onSendMessage={handleSendMessage}
          onUpdateApproval={handleUpdateApproval}
          onToggleReaction={handleToggleReaction}
          onTogglePinMessage={handleTogglePinMessage}
          onToggleRightSidebar={() => setIsRightSidebarOpen((prev) => !prev)}
          isRightSidebarOpen={isRightSidebarOpen}
          targetScrollMessageId={targetScrollMessageId}
          onClearScrollTarget={() => setTargetScrollMessageId(null)}
          onMobileBack={() => setMobileActiveScreen("list")}
          onOpenMobileDetails={() => setMobileDrawerOpen(true)}
        />
      </div>

      {/* 4. Desktop Right Sidebar: Project Meta, Milestones & Dispatch Hub */}
      {isRightSidebarOpen && (
        <div className="hidden xl:flex flex-col w-84 2xl:w-96 border-l border-border/80 bg-card shrink-0 transition-all duration-200">
          <ProjectDetailsSidebar
            project={selectedProject}
            messages={currentMessages}
            onUpdateApproval={handleUpdateApproval}
            onScrollToMessage={handleScrollToMessage}
            onClose={() => setIsRightSidebarOpen(false)}
          />
        </div>
      )}

      {/* 5. Mobile / Tablet Drawer for Right Sidebar */}
      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-card">
          <ProjectDetailsSidebar
            project={selectedProject}
            messages={currentMessages}
            onUpdateApproval={handleUpdateApproval}
            onScrollToMessage={(msgId) => {
              setMobileDrawerOpen(false);
              handleScrollToMessage(msgId);
            }}
            onClose={() => setMobileDrawerOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
