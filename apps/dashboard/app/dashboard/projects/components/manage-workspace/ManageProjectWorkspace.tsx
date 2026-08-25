// apps/dashboard/app/dashboard/projects/components/manage-workspace/ManageProjectWorkspace.tsx
"use client";

import * as React from "react";
import { Sheet, SheetContent } from "@workspace/ui/components/sheet";
import { ProjectListSidebar, sortProjectsByActivity } from "./left-sidebar/ProjectListSidebar";
import { ProjectChatPanel } from "./chat-panel/ProjectChatPanel";
import { ProjectDetailsSidebar } from "./right-sidebar/ProjectDetailsSidebar";
import {
  FolderKanban,
  Loader2,
  Plus,
  ShieldAlert,
  Radio,
  Layers,
  Briefcase,
  Globe,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
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
import {
  useStationSession,
  formatSessionDuration,
  formatSessionStartTime,
} from "@/lib/station/StationContext";
import { SelectStationModal } from "@/app/dashboard/stations/components/SelectStationModal";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import { PermissionGate } from "@/components/permission-gate";

interface ManageProjectWorkspaceProps {
  initialProjectId?: string | null;
  onNewProject?: () => void;
}

export function ManageProjectWorkspace({
  initialProjectId,
  onNewProject,
}: ManageProjectWorkspaceProps) {
  const {
    activeSessions,
    currentStationId,
    activeContext,
    myStations,
    switchStation,
    selectModalOpen,
    setSelectModalOpen,
  } = useStationSession();

  // Initialize stationFilter from URL query param if present, or default to focused station
  const [stationFilter, setStationFilter] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const paramStation = params.get("stationId");
      if (paramStation) return paramStation;
    }
    return currentStationId || "all";
  });

  const [projects, setProjects] = React.useState<ProjectWorkspaceItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("projectId") || initialProjectId || null;
    }
    return initialProjectId || null;
  });
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
  const fetchWorkspaceProjects = React.useCallback(
    async (filterStationId?: string) => {
      setIsLoadingProjects(true);

      try {
        const activeFilter = filterStationId !== undefined ? filterStationId : stationFilter;
        const queryParam =
          activeFilter && activeFilter !== "all"
            ? `?stationId=${encodeURIComponent(activeFilter)}`
            : "";

        const res = await api.get<any>(`/projects/workspace${queryParam}`);
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
              // 1. If currently selected project exists in loaded projects, maintain it!
              if (current && sorted.some((p) => p.id === current)) {
                return current;
              }
              // 2. If URL or initialProjectId matches a project, select it
              const targetId =
                (typeof window !== "undefined"
                  ? new URLSearchParams(window.location.search).get("projectId")
                  : null) || initialProjectId;
              if (targetId && sorted.some((p) => p.id === targetId)) {
                return targetId;
              }
              // 3. Fallback to first available project
              return sorted[0]?.id ?? null;
            });
          } else {
            setSelectedProjectId(null);
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
    },
    [initialProjectId, stationFilter]
  );

  // Handler when user changes workstation scope filter
  const handleStationFilterChange = React.useCallback(
    (newStationId: string) => {
      setStationFilter(newStationId);
      if (typeof window !== "undefined") {
        const currentUrl = new URL(window.location.href);
        if (newStationId && newStationId !== "all") {
          currentUrl.searchParams.set("stationId", newStationId);
        } else {
          currentUrl.searchParams.delete("stationId");
        }
        window.history.replaceState(null, "", currentUrl.toString());
      }
      // If user selected an active station, also switch active focus in context
      if (newStationId && newStationId !== "all" && activeSessions.some((s) => s.station.id === newStationId)) {
        switchStation(newStationId);
      }
      fetchWorkspaceProjects(newStationId);
    },
    [activeSessions, switchStation, fetchWorkspaceProjects]
  );

  // Synchronize when focused station changes in top dashboard header widget
  const prevFocusedStationRef = React.useRef<string | null | undefined>(currentStationId);
  React.useEffect(() => {
    if (
      currentStationId &&
      currentStationId !== prevFocusedStationRef.current
    ) {
      prevFocusedStationRef.current = currentStationId;
      setStationFilter(currentStationId);
      if (typeof window !== "undefined") {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set("stationId", currentStationId);
        window.history.replaceState(null, "", currentUrl.toString());
      }
      fetchWorkspaceProjects(currentStationId);
    }
  }, [currentStationId, fetchWorkspaceProjects]);

  React.useEffect(() => {
    fetchWorkspaceProjects();
  }, [fetchWorkspaceProjects]);

  // Keep URL bar synced with active project UUID for direct linking & sharing
  React.useEffect(() => {
    if (selectedProjectId && typeof window !== "undefined") {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get("projectId") !== selectedProjectId) {
        currentUrl.searchParams.set("projectId", selectedProjectId);
        window.history.replaceState(null, "", currentUrl.toString());
      }
    }
  }, [selectedProjectId]);

  // Support browser back/forward history navigation
  React.useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const pId = params.get("projectId");
        if (pId) {
          setSelectedProjectId((current) => (current !== pId ? pId : current));
        }
        const sId = params.get("stationId");
        if (sId) {
          setStationFilter(sId);
          fetchWorkspaceProjects(sId);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
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
  const fetchProjectMessages = React.useCallback(async (projectId: string) => {
    if (!projectId) return;
    setIsLoadingMessages(true);
    try {
      const res = await api.get<any>(`/projects/${projectId}/messages?limit=30`);
      const data = res?.data || res;
      if (data && Array.isArray(data.messages)) {
        setMessagesByProject((prev) => ({
          ...prev,
          [projectId]: data.messages,
        }));
        setNextCursorByProject((prev) => ({
          ...prev,
          [projectId]: data.nextCursor || null,
        }));
        setHasMoreByProject((prev) => ({
          ...prev,
          [projectId]: Boolean(data.nextCursor),
        }));
      }
    } catch (err: any) {
      console.error("Failed to load project messages:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedProjectId) {
      fetchProjectMessages(selectedProjectId);
    }
  }, [selectedProjectId, fetchProjectMessages]);

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
    onMessageDeleted: ({ projectId, messageId }: any) => {
      setMessagesByProject((prev) => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter((m) => m.id !== messageId),
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
    onProjectActivityBump: (data: any) => {
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

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("projectId", project.id);
      window.history.replaceState(null, "", url.toString());
    }

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
    replyToMessageId?: string;
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
      replyToMessageId: payload.replyTo?.id || payload.replyToMessageId,
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
      setMessagesByProject((prev) => {
        const current = prev[selectedProjectId] || [];
        return {
          ...prev,
          [selectedProjectId]: current.map((m) =>
            m.id === messageId ? { ...m, approval: updatedWorkflow } : m
          ),
        };
      });
    }
  };

  // Handle reaction on a message
  const handleToggleReaction = (messageId: string, emoji: string) => {
    socketClient.sendReaction(messageId, emoji);
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

  // Handle deleting a message (WebSocket with REST fallback)
  const handleDeleteMessage = React.useCallback(
    async (messageId: string) => {
      if (!selectedProjectId) return;

      // Optimistic local state update
      setMessagesByProject((prev) => ({
        ...prev,
        [selectedProjectId]: (prev[selectedProjectId] || []).filter((m) => m.id !== messageId),
      }));

      try {
        // 1. Attempt WebSocket delete
        await socketClient.deleteMessage(messageId);
        toast.success("Message deleted");
      } catch {
        // 2. Fallback to REST API if socket fails
        try {
          await api.delete(`/projects/${selectedProjectId}/messages/${messageId}`);
          toast.success("Message deleted");
        } catch (restErr: any) {
          console.error("Failed to delete message via REST fallback:", restErr);
          toast.error(restErr.message || "Failed to delete message");
          // Re-fetch project messages to recover state
          fetchProjectMessages(selectedProjectId);
        }
      }
    },
    [selectedProjectId, socketClient, fetchProjectMessages]
  );

  // Handle message pin toggle
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

  // Handle toggling pin status of a project
  const handleTogglePinProject = async (projectId: string) => {
    // 1. Optimistic UI update and re-sort
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id === projectId) {
          return { ...p, isPinned: !p.isPinned };
        }
        return p;
      });
      return sortProjectsByActivity(updated);
    });

    try {
      // 2. Call backend pin toggle endpoint
      const res = await api.post<any>(`/projects/${projectId}/pin`);
      const isPinned = res?.data?.isPinned ?? res?.isPinned;
      toast.success(isPinned ? "Project pinned to top" : "Project unpinned");
    } catch (err: any) {
      // 3. Revert optimistic state on error
      setProjects((prev) => {
        const reverted = prev.map((p) => {
          if (p.id === projectId) {
            return { ...p, isPinned: !p.isPinned };
          }
          return p;
        });
        return sortProjectsByActivity(reverted);
      });
      console.error("Failed to toggle project pin status:", err);
      toast.error(err?.message || "Failed to toggle pin status");
    }
  };

  // Helper station details for empty state
  const activeStationInfo = React.useMemo(() => {
    if (!stationFilter || stationFilter === "all") return null;
    const sessionMatch = activeSessions.find((s) => s.station.id === stationFilter);
    if (sessionMatch) {
      return {
        id: sessionMatch.station.id,
        name: sessionMatch.station.name,
        code: sessionMatch.station.code,
        department: sessionMatch.station.department?.name,
        isJoined: true,
        session: sessionMatch.session,
        profiles: sessionMatch.activeProfiles || [],
      };
    }
    const myMatch = myStations.find((s) => s.id === stationFilter);
    if (myMatch) {
      return {
        id: myMatch.id,
        name: myMatch.name,
        code: myMatch.code,
        department: myMatch.department?.name,
        isJoined: false,
        session: null,
        profiles: myMatch.activeProfiles || [],
      };
    }
    return null;
  }, [stationFilter, activeSessions, myStations]);

  // Other active sessions to switch to
  const otherActiveSessions = React.useMemo(() => {
    return activeSessions.filter((s) => s.station.id !== stationFilter);
  }, [activeSessions, stationFilter]);

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
          onTogglePinProject={handleTogglePinProject}
          isCollapsed={isLeftSidebarCollapsed}
          onToggleCollapse={() => setIsLeftSidebarCollapsed((prev) => !prev)}
          onNewProject={onNewProject}
          recentlyUpdatedId={recentlyUpdatedId}
          hasMoreProjects={hasMoreProjects}
          isLoadingMoreProjects={isLoadingMoreProjects}
          onLoadMoreProjects={handleLoadMoreProjects}
          stationFilter={stationFilter}
          onStationFilterChange={handleStationFilterChange}
          activeSessions={activeSessions}
          currentStationId={currentStationId}
          activeStation={activeContext?.station}
          myStations={myStations}
          onOpenStationModal={() => setSelectModalOpen(true)}
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
          onTogglePinProject={handleTogglePinProject}
          isCollapsed={false}
          onToggleCollapse={() => {}}
          onNewProject={onNewProject}
          recentlyUpdatedId={recentlyUpdatedId}
          hasMoreProjects={hasMoreProjects}
          isLoadingMoreProjects={isLoadingMoreProjects}
          onLoadMoreProjects={handleLoadMoreProjects}
          stationFilter={stationFilter}
          onStationFilterChange={handleStationFilterChange}
          activeSessions={activeSessions}
          currentStationId={currentStationId}
          activeStation={activeContext?.station}
          myStations={myStations}
          onOpenStationModal={() => setSelectModalOpen(true)}
        />
      </div>

      {/* 3. Center Chat Panel (or Workstation Empty State) */}
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
            onDeleteMessage={handleDeleteMessage}
            onTogglePinMessage={handleTogglePinMessage}
            onTogglePinProject={handleTogglePinProject}
            onMarkSeen={handleMarkMessagesSeen}
            onToggleRightSidebar={() => setIsRightSidebarOpen((prev) => !prev)}
            isRightSidebarOpen={isRightSidebarOpen}
            targetScrollMessageId={targetScrollMessageId}
            onClearScrollTarget={() => setTargetScrollMessageId(null)}
            onMobileBack={() => setMobileActiveScreen("list")}
            onOpenMobileDetails={() => setMobileDrawerOpen(true)}
          />
        ) : projects.length === 0 ? (
          /* Rich Workstation Context & Corner Case Empty State */
          <div className="flex h-full flex-col items-center justify-center p-6 text-center max-w-xl mx-auto space-y-6">
            <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
              {activeStationInfo ? (
                <Radio className="size-7 text-emerald-500 animate-pulse" />
              ) : (
                <FolderKanban className="size-7 text-primary" />
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                {activeStationInfo
                  ? `No Projects on ${activeStationInfo.name}`
                  : "No Accessible Projects in Scope"}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activeStationInfo ? (
                  activeStationInfo.profiles.length === 0 ? (
                    <>
                      Workstation <strong>{activeStationInfo.name}</strong> ({activeStationInfo.code}) has no platform profiles allocated. Projects are linked via platform profiles.
                    </>
                  ) : (
                    <>
                      Workstation <strong>{activeStationInfo.name}</strong> ({activeStationInfo.code}) currently has {activeStationInfo.profiles.length} connected profile(s), but no active projects yet.
                    </>
                  )
                ) : (
                  "You do not currently have any active projects in your selected filter scope, or no projects have been assigned yet."
                )}
              </p>

              {activeStationInfo?.isJoined && activeStationInfo.session && (
                <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3 text-emerald-600 dark:text-emerald-400" />
                    Shift active: <strong className="text-foreground font-semibold">{formatSessionDuration(activeStationInfo.session.joinedAt)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Started: {formatSessionStartTime(activeStationInfo.session.joinedAt)}
                  </span>
                  {activeStationInfo.session.ipAddress && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-[11px]">IP: {activeStationInfo.session.ipAddress}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Profile badges if station has profiles */}
            {activeStationInfo && activeStationInfo.profiles.length > 0 && (
              <div className="p-3 rounded-xl border bg-card/60 w-full text-left space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Hosted Platform Profiles:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeStationInfo.profiles.map((p) => (
                    <Badge key={p.id} variant="secondary" className="text-xs gap-1 py-0.5 px-2">
                      <Briefcase className="size-3 text-primary" />
                      <span className="font-semibold">{p.profile?.username}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        ({p.profile?.platform?.name || "Platform"})
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Other Active Workstations Switcher */}
            {otherActiveSessions.length > 0 && (
              <div className="p-4 rounded-xl border bg-emerald-500/[0.04] border-emerald-500/20 w-full space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    Your Other Active Shifts ({otherActiveSessions.length})
                  </span>
                  <span className="text-[10px] text-muted-foreground">Click to switch</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {otherActiveSessions.map((s) => {
                    const dur = formatSessionDuration(s.session?.joinedAt);
                    return (
                      <div
                        key={s.station.id}
                        onClick={() => handleStationFilterChange(s.station.id)}
                        className="group p-2.5 rounded-lg border bg-background hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer flex items-center justify-between gap-2 text-left"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-foreground group-hover:text-emerald-600 truncate">
                              {s.station.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono block">
                            {s.station.code} • {dur} • {s.activeProfiles.length}p
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-emerald-600 group-hover:bg-emerald-500/10"
                        >
                          Switch <ArrowRight className="size-2.5 ml-1" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
              {stationFilter !== "all" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5"
                  onClick={() => handleStationFilterChange("all")}
                >
                  <Globe className="size-3.5" />
                  Show All Projects
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5"
                onClick={() => setSelectModalOpen(true)}
              >
                <Radio className="size-3.5 text-primary" />
                Join / Switch Station
              </Button>

              {onNewProject && (
                <PermissionGate code="project.create">
                  <Button
                    size="sm"
                    onClick={onNewProject}
                    className="text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Create New Project</span>
                  </Button>
                </PermissionGate>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center p-8 text-muted-foreground">
            <FolderKanban className="size-8 text-muted-foreground/50 mb-2" />
            <p className="text-xs font-semibold text-foreground">Select a project from the sidebar to view conversation</p>
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
            onTogglePin={handleTogglePinProject}
            onScrollToMessage={(msgId) => setTargetScrollMessageId(msgId)}
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
              onTogglePin={handleTogglePinProject}
              onScrollToMessage={(msgId) => {
                setMobileDrawerOpen(false);
                setTargetScrollMessageId(msgId);
              }}
              onClose={() => setMobileDrawerOpen(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Station Join / Switch Modal */}
      <SelectStationModal
        open={selectModalOpen}
        onOpenChange={setSelectModalOpen}
      />
    </div>
  );
}
