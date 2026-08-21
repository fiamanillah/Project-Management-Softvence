// apps/dashboard/app/dashboard/projects/components/manage-workspace/ManageProjectWorkspace.tsx
"use client";

import * as React from "react";
import { Sheet, SheetContent } from "@workspace/ui/components/sheet";
import { ProjectListSidebar, sortProjectsByActivity } from "./left-sidebar/ProjectListSidebar";
import { ProjectChatPanel } from "./chat-panel/ProjectChatPanel";
import { ProjectDetailsSidebar } from "./right-sidebar/ProjectDetailsSidebar";
import { FolderKanban, Loader2, Plus, ShieldAlert } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
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
  const [projects, setProjects] = React.useState<ProjectWorkspaceItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(initialProjectId || null);
  const [isLoadingProjects, setIsLoadingProjects] = React.useState<boolean>(true);
  const [isLoadingMoreProjects, setIsLoadingMoreProjects] = React.useState<boolean>(false);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [hasMoreProjects, setHasMoreProjects] = React.useState<boolean>(false);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = React.useState<string | null>(null);
  const highlightTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const triggerProjectHighlight = React.useCallback((id: string) => {
    setRecentlyUpdatedId(id);
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => {
      setRecentlyUpdatedId(null);
    }, 3500);
  }, []);

  const [messagesByProject, setMessagesByProject] = React.useState<Record<string, ChatMessage[]>>({});
  const [nextCursorByProject, setNextCursorByProject] = React.useState<Record<string, string | null>>({});
  const [hasMoreByProject, setHasMoreByProject] = React.useState<Record<string, boolean>>({});
  const [isLoadingMessages, setIsLoadingMessages] = React.useState<boolean>(false);
  const [isLoadingOlder, setIsLoadingOlder] = React.useState<boolean>(false);

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

  // 1. Fetch live projects from backend API for command center
  const fetchWorkspaceProjects = React.useCallback(async () => {
    setIsLoadingProjects(true);

    try {
      const res = await api.get<any>("/projects/workspace");
      const data = res?.data || res;
      const liveProjects: ProjectWorkspaceItem[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];

      setProjects(() => {
        const sorted = sortProjectsByActivity(liveProjects);

        if (sorted.length > 0) {
          setSelectedProjectId((current) => {
            if (initialProjectId && sorted.some((p) => p.id === initialProjectId)) {
              return initialProjectId;
            }
            if (current && sorted.some((p) => p.id === current)) {
              return current;
            }
            return sorted[0]?.id ?? null;
          });
        }
        return sorted;
      });
    } catch (err: any) {
      console.error("Failed to load workspace projects:", err);
      toast.error(err.message || "Failed to load projects");
      setProjects([]);
      setSelectedProjectId(null);
    } finally {
      setIsLoadingProjects(false);
      setIsLoadingMoreProjects(false);
    }
  }, [initialProjectId]);

  React.useEffect(() => {
    fetchWorkspaceProjects();
  }, [fetchWorkspaceProjects]);

  const handleLoadMoreProjects = React.useCallback(() => {
    // All active projects loaded in workspace mode
  }, []);

  // Selected project object
  const selectedProject: ProjectWorkspaceItem | null = React.useMemo(() => {
    if (!selectedProjectId) return projects[0] || null;
    return projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  const currentMessages = (selectedProject && messagesByProject[selectedProject.id]) || [];

  // 2. Fetch live initial messages when selectedProjectId changes
  React.useEffect(() => {
    let isMounted = true;
    async function loadProjectMessages() {
      if (!selectedProjectId) return;
      setIsLoadingMessages(true);
      try {
        const res = await api.get<any>(`/projects/${selectedProjectId}/messages?limit=30`);
        const data = res?.data || res;
        if (isMounted && data && Array.isArray(data.messages)) {
          setMessagesByProject((prev) => ({
            ...prev,
            [selectedProjectId]: data.messages,
          }));
          setNextCursorByProject((prev) => ({
            ...prev,
            [selectedProjectId]: data.nextCursor || null,
          }));
          setHasMoreByProject((prev) => ({
            ...prev,
            [selectedProjectId]: Boolean(data.nextCursor),
          }));
        }
      } catch (err: any) {
        console.error("Failed to load project messages:", err);
      } finally {
        if (isMounted) setIsLoadingMessages(false);
      }
    }

    loadProjectMessages();
    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  // 3. Real-Time WebSocket Hook Integration with Zero Over-Subscription
  const socketClient = useProjectSocket({
    projectId: selectedProjectId || null,
    onNewMessage: (newMsg: any) => {
      // 1. If message belongs to active chat, append to messages
      if (selectedProjectId && newMsg.projectId === selectedProjectId) {
        setMessagesByProject((prev) => {
          const existing = prev[newMsg.projectId] || [];
          if (existing.some((m) => m.id === newMsg.id)) return prev;
          return {
            ...prev,
            [newMsg.projectId]: [...existing, newMsg],
          };
        });
      }

      // 2. Compute attention type
      const isClient = newMsg.isFromClient || newMsg.purpose === "CLIENT_COMMUNICATION";
      const hasApproval =
        newMsg.approval &&
        (newMsg.approval.status === "IN_REVIEW" ||
          newMsg.approval.status === "PENDING_LEAD" ||
          newMsg.approval.status === "PENDING_SALES");
      const isRevision = newMsg.approval?.status === "REVISION_REQUESTED";

      let msgAttention: "CLIENT_MESSAGE" | "PENDING_APPROVAL" | "REVISION_REQUESTED" | "NEW_MESSAGE" | null = null;
      if (hasApproval) msgAttention = "PENDING_APPROVAL";
      else if (isRevision) msgAttention = "REVISION_REQUESTED";
      else if (isClient) msgAttention = "CLIENT_MESSAGE";
      else msgAttention = "NEW_MESSAGE";

      // 3. Update project in list, bump timestamp, update unread count & attention, and RE-SORT dynamically!
      setProjects((prev) => {
        const updated = prev.map((p) => {
          if (p.id !== newMsg.projectId) return p;

          const isCurrentlySelected = p.id === selectedProjectId;
          const newUnread = isCurrentlySelected ? 0 : (p.unreadCount || 0) + 1;
          const newApprovals = hasApproval ? (p.pendingApprovalsCount || 0) + 1 : p.pendingApprovalsCount;
          const newRevisions = isRevision ? (p.pendingRevisionsCount || 0) + 1 : p.pendingRevisionsCount;
          const newInbound = isClient && !isCurrentlySelected ? (p.pendingInboundCount || 0) + 1 : (p.pendingInboundCount || 0);

          return {
            ...p,
            lastActivityAt: new Date().toISOString(),
            attentionType: isCurrentlySelected
              ? isRevision
                ? "REVISION_REQUESTED"
                : hasApproval
                ? "PENDING_APPROVAL"
                : null
              : msgAttention,
            unreadCount: newUnread,
            pendingApprovalsCount: newApprovals,
            pendingRevisionsCount: newRevisions,
            pendingInboundCount: newInbound,
            lastMessage: {
              id: newMsg.id,
              senderName: newMsg.senderName,
              text: newMsg.text,
              timestamp: newMsg.timestamp || "Just now",
              isRead: isCurrentlySelected,
              purpose: newMsg.purpose,
              createdAt: new Date().toISOString(),
            },
          };
        });

        return sortProjectsByActivity(updated);
      });

      triggerProjectHighlight(newMsg.projectId);
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
      if (!selectedProjectId) return;
      setMessagesByProject((prev) => ({
        ...prev,
        [selectedProjectId]: (prev[selectedProjectId] || []).map((m) =>
          m.id === messageId ? { ...m, reactions } : m
        ),
      }));
    },
    onSeenReceiptsUpdated: ({ messageId, seenBy }: any) => {
      if (!selectedProjectId) return;
      setMessagesByProject((prev) => ({
        ...prev,
        [selectedProjectId]: (prev[selectedProjectId] || []).map((m) =>
          m.id === messageId ? { ...m, seenBy } : m
        ),
      }));
    },
    onApprovalUpdated: ({ projectId, messageId, workflow }: any) => {
      if (selectedProjectId && projectId === selectedProjectId) {
        setMessagesByProject((prev) => ({
          ...prev,
          [projectId]: (prev[projectId] || []).map((m) =>
            m.id === messageId ? { ...m, approval: workflow } : m
          ),
        }));
      }

      setProjects((prev) => {
        const updated = prev.map((p) => {
          if (p.id !== projectId) return p;

          let attentionType = p.attentionType;
          let pendingApprovalsCount = p.pendingApprovalsCount || 0;

          if (workflow.status === "REVISION_REQUESTED") {
            attentionType = "REVISION_REQUESTED";
          } else if (
            workflow.status === "PENDING_SALES" ||
            workflow.status === "IN_REVIEW" ||
            workflow.status === "PENDING_LEAD"
          ) {
            attentionType = "PENDING_APPROVAL";
          } else if (workflow.status === "DISPATCHED") {
            pendingApprovalsCount = Math.max(0, pendingApprovalsCount - 1);
            attentionType = pendingApprovalsCount > 0 ? "PENDING_APPROVAL" : null;
          }

          return {
            ...p,
            lastActivityAt: new Date().toISOString(),
            attentionType,
            pendingApprovalsCount,
          };
        });

return sortProjectsByActivity(updated);
      });

      triggerProjectHighlight(projectId);
    },
    onProjectActivityBump: (data) => {
      setProjects((prev) => {
        const targetIndex = prev.findIndex((p) => p.id === data.projectId);
        if (targetIndex === -1) return prev;

        const isCurrentlySelected = data.projectId === selectedProjectId;
        const currentProject = prev[targetIndex]!;

        const updatedProject: ProjectWorkspaceItem = {
          ...currentProject,
          lastActivityAt: data.lastActivityAt || new Date().toISOString(),
          attentionType: isCurrentlySelected
            ? currentProject.attentionType
            : (data.attentionType || currentProject.attentionType),
          unreadCount: isCurrentlySelected
            ? 0
            : (currentProject.unreadCount || 0) + 1,
          lastMessage: data.lastMessage || currentProject.lastMessage,
        };

        const updatedList = [
          ...prev.slice(0, targetIndex),
          updatedProject,
          ...prev.slice(targetIndex + 1),
        ];

        return sortProjectsByActivity(updatedList);
      });

      triggerProjectHighlight(data.projectId);
    },
  });

  // Handle reporting seen messages
  const handleMarkMessagesSeen = React.useCallback(
    (messageIds: string[]) => {
      if (!selectedProjectId || messageIds.length === 0) return;
      socketClient.markSeen(messageIds);
      api.post(`/projects/${selectedProjectId}/messages/seen`, { messageIds }).catch(() => {});
    },
    [selectedProjectId, socketClient]
  );

  // 4. Handle loading earlier messages (pagination)
  const handleLoadEarlierMessages = React.useCallback(async () => {
    if (!selectedProjectId) return;
    const cursor = nextCursorByProject[selectedProjectId];
    if (!cursor || isLoadingOlder) return;

    setIsLoadingOlder(true);
    try {
      const res = await api.get<any>(
        `/projects/${selectedProjectId}/messages?cursor=${encodeURIComponent(cursor)}&limit=30`
      );
      const data = res?.data || res;
      if (data && Array.isArray(data.messages)) {
        setMessagesByProject((prev) => {
          const current = prev[selectedProjectId] || [];
          const existingIds = new Set(current.map((m) => m.id));
          const newUnique = data.messages.filter((m: any) => !existingIds.has(m.id));
          return {
            ...prev,
            [selectedProjectId]: [...newUnique, ...current],
          };
        });
        setNextCursorByProject((prev) => ({
          ...prev,
          [selectedProjectId]: data.nextCursor || null,
        }));
        setHasMoreByProject((prev) => ({
          ...prev,
          [selectedProjectId]: Boolean(data.nextCursor),
        }));
      }
    } catch (err: any) {
      console.error("Failed to load earlier messages:", err);
      toast.error(err.message || "Failed to load earlier messages");
    } finally {
      setIsLoadingOlder(false);
    }
  }, [selectedProjectId, nextCursorByProject, isLoadingOlder]);

  // Handle selecting a project
  const handleSelectProject = (project: ProjectWorkspaceItem) => {
    setSelectedProjectId(project.id);
    setMobileActiveScreen("chat");

    // Clear unread count & reset non-approval attention for selected project
    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? {
              ...p,
              unreadCount: 0,
              attentionType:
                (p.pendingRevisionsCount || 0) > 0
                  ? "REVISION_REQUESTED"
                  : (p.pendingApprovalsCount || 0) > 0
                  ? "PENDING_APPROVAL"
                  : null,
            }
          : p
      )
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
    if (!selectedProjectId) return;

    const formattedAttachments = payload.attachments?.map((att) => ({
      name: att.name,
      type: att.type,
      url: att.url || "",
      thumbnailUrl: att.thumbnailUrl || null,
      fileSizeBytes: att.fileSizeBytes || null,
      extension: att.extension || null,
      mimeType: att.mimeType || null,
    }));

    const messagePayload = {
      text: payload.text,
      purpose: payload.purpose,
      clientDirection: payload.clientDirection,
      clientMessageType: payload.clientMessageType || payload.outboundType,
      replyToMessageId: payload.replyTo?.id,
      attachments: formattedAttachments,
    };

    try {
      // 1. Attempt WebSocket emission
      const sentMsg = await socketClient.sendMessage(messagePayload as any);

      if (sentMsg) {
        setMessagesByProject((prev) => {
          const current = prev[selectedProjectId] || [];
          if (current.some((m) => m.id === sentMsg.id)) return prev;
          return {
            ...prev,
            [selectedProjectId]: [...current, sentMsg as any],
          };
        });

        setProjects((prev) => {
          const updated = prev.map((p) =>
            p.id === selectedProjectId
              ? {
                  ...p,
                  lastActivityAt: new Date().toISOString(),
                  lastMessage: {
                    id: sentMsg.id,
                    senderName: sentMsg.senderName,
                    text: sentMsg.text,
                    timestamp: sentMsg.timestamp || "Just now",
                    isRead: true,
                    purpose: sentMsg.purpose,
                    createdAt: new Date().toISOString(),
                  },
                }
              : p
          );
          return sortProjectsByActivity(updated);
        });
        triggerProjectHighlight(selectedProjectId);
      }
    } catch {
      // 2. Fallback to REST API if socket is temporarily degraded or offline
      try {
        const res = await api.post(`/projects/${selectedProjectId}/messages`, messagePayload);
        const createdMsg = (res as any)?.data || res;
        if (createdMsg) {
          setMessagesByProject((prev) => {
            const current = prev[selectedProjectId] || [];
            if (current.some((m) => m.id === createdMsg.id)) return prev;
            return {
              ...prev,
              [selectedProjectId]: [...current, createdMsg],
            };
          });

          setProjects((prev) => {
            const updated = prev.map((p) =>
              p.id === selectedProjectId
                ? {
                    ...p,
                    lastActivityAt: new Date().toISOString(),
                    lastMessage: {
                      id: createdMsg.id,
                      senderName: createdMsg.senderName,
                      text: createdMsg.text,
                      timestamp: createdMsg.timestamp || "Just now",
                      isRead: true,
                      purpose: createdMsg.purpose,
                      createdAt: new Date().toISOString(),
                    },
                  }
                : p
            );
            return sortProjectsByActivity(updated);
          });
          triggerProjectHighlight(selectedProjectId);
        }
      } catch (restErr: any) {
        console.error("Failed to send message via REST fallback:", restErr);
        toast.error(restErr.message || "Failed to send message");
      }
    }
  };

  // Handle updating an approval workflow state
  const handleUpdateApproval = async (messageId: string, updatedWorkflow: ApprovalWorkflow) => {
    if (!selectedProjectId) return;
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
        [selectedProjectId]: (prev[selectedProjectId] || []).map((m) =>
          m.id === messageId ? { ...m, approval: updatedWorkflow } : m
        ),
      }));
    }
  };

  // Handle editing a message (WebSocket with REST fallback)
  const handleEditMessage = React.useCallback(
    async (messageId: string, text: string, reason?: string) => {
      if (!selectedProjectId) return;

      try {
        // 1. Attempt WebSocket edit
        const updated = await socketClient.editMessage(messageId, { text, reason });
        if (updated) {
          setMessagesByProject((prev) => ({
            ...prev,
            [selectedProjectId]: (prev[selectedProjectId] || []).map((m) =>
              m.id === messageId ? (updated as any) : m
            ),
          }));
        }
      } catch {
        // 2. Fallback to REST API if socket fails
        try {
          const res = await api.patch<any>(`/projects/${selectedProjectId}/messages/${messageId}`, {
            text,
            reason,
          });
          const data = (res as any)?.data || res;
          if (data) {
            setMessagesByProject((prev) => ({
              ...prev,
              [selectedProjectId]: (prev[selectedProjectId] || []).map((m) =>
                m.id === messageId ? data : m
              ),
            }));
          }
        } catch (restErr: any) {
          console.error("Failed to edit message via REST fallback:", restErr);
          throw restErr;
        }
      }
    },
    [selectedProjectId, socketClient]
  );

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
    if (!selectedProjectId) return;
    try {
      const res = await api.post(`/projects/${selectedProjectId}/messages/${messageId}/pin`);
      const updated = (res as any)?.data || res;
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

  // Loading state skeleton
  if (isLoadingProjects && projects.length === 0) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-foreground">Loading workspace projects...</p>
          <p className="text-xs text-muted-foreground">Evaluating your scoped permissions</p>
        </div>
      </div>
    );
  }

  // Zero accessible projects empty state
  if (!isLoadingProjects && projects.length === 0) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-background text-foreground p-6">
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground shadow-2xs">
            <ShieldAlert className="size-6 text-muted-foreground/80" />
          </div>
          <h2 className="text-base font-bold text-foreground">No Accessible Projects</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You do not currently have permission to access or view any active projects in this workspace, or no projects have been assigned to your scope yet.
          </p>
          {onNewProject && (
            <Button
              size="sm"
              onClick={onNewProject}
              className="mt-2 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Create New Project</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

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
          recentlyUpdatedId={recentlyUpdatedId}
          hasMoreProjects={hasMoreProjects}
          isLoadingMoreProjects={isLoadingMoreProjects}
          onLoadMoreProjects={handleLoadMoreProjects}
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
          recentlyUpdatedId={recentlyUpdatedId}
          hasMoreProjects={hasMoreProjects}
          isLoadingMoreProjects={isLoadingMoreProjects}
          onLoadMoreProjects={handleLoadMoreProjects}
        />
      </div>

      {/* 3. Center Chat Panel (or Mobile Chat Screen) */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 bg-muted/20 relative h-full",
          mobileActiveScreen === "chat" ? "flex" : "hidden md:flex"
        )}
      >
        {selectedProject ? (
          <ProjectChatPanel
            project={selectedProject}
            messages={currentMessages}
            isLoadingMessages={isLoadingMessages}
            hasMoreOlder={hasMoreByProject[selectedProject.id] ?? false}
            isLoadingOlder={isLoadingOlder}
            onLoadEarlierMessages={handleLoadEarlierMessages}
            onSendMessage={handleSendMessage}
            onUpdateApproval={handleUpdateApproval}
            onToggleReaction={handleToggleReaction}
            onEditMessage={handleEditMessage}
            onTogglePinMessage={handleTogglePinMessage}
            onMarkSeen={handleMarkMessagesSeen}
            onToggleRightSidebar={() => setIsRightSidebarOpen((prev) => !prev)}
            isRightSidebarOpen={isRightSidebarOpen}
            targetScrollMessageId={targetScrollMessageId}
            onClearScrollTarget={() => setTargetScrollMessageId(null)}
            onMobileBack={() => setMobileActiveScreen("list")}
            onOpenMobileDetails={() => setMobileDrawerOpen(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center p-8 text-muted-foreground">
            <FolderKanban className="size-8 text-muted-foreground/50 mb-2" />
            <p className="text-xs font-semibold text-foreground">Select a project to view conversation</p>
          </div>
        )}
      </div>

      {/* 4. Desktop Right Sidebar: Project Meta, Milestones & Dispatch Hub */}
      {isRightSidebarOpen && selectedProject && (
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
      {selectedProject && (
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
      )}
    </div>
  );
}
