// apps/dashboard/lib/socket/useProjectSocket.ts
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSocket } from "./SocketProvider";
import type {
  ProjectMessageItem,
  ApprovalWorkflowItem,
  MessageReactionItem,
  MessageReadReceiptItem,
  CreateProjectMessageDTO,
  EditProjectMessageDTO,
} from "@workspace/shared";

interface UseProjectSocketOptions {
  projectId: string | null;
  onNewMessage?: (message: ProjectMessageItem) => void;
  onMessageUpdated?: (message: ProjectMessageItem) => void;
  onMessageDeleted?: (data: { projectId: string; messageId: string }) => void;
  onReactionUpdated?: (data: { messageId: string; reactions: MessageReactionItem[] }) => void;
  onSeenReceiptsUpdated?: (data: { messageId: string; seenBy: MessageReadReceiptItem[] }) => void;
  onApprovalUpdated?: (data: { projectId: string; messageId: string; workflow: ApprovalWorkflowItem }) => void;
  onProjectActivityBump?: (data: {
    projectId: string;
    lastActivityAt: string;
    lastMessage?: any;
    attentionType?: any;
    pendingApprovalsCount?: number;
  }) => void;
  onPresenceSync?: (data: { onlineUserIds: string[] }) => void;
}

export function useProjectSocket({
  projectId,
  onNewMessage,
  onMessageUpdated,
  onMessageDeleted,
  onReactionUpdated,
  onSeenReceiptsUpdated,
  onApprovalUpdated,
  onProjectActivityBump,
  onPresenceSync,
}: UseProjectSocketOptions) {
  const { socket, isConnected } = useSocket();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // OPT-04: Stable ref for callback props to avoid tearing down listeners on parent re-renders
  const callbacksRef = useRef({
    onNewMessage,
    onMessageUpdated,
    onMessageDeleted,
    onReactionUpdated,
    onSeenReceiptsUpdated,
    onApprovalUpdated,
    onProjectActivityBump,
    onPresenceSync,
  });

  useEffect(() => {
    callbacksRef.current = {
      onNewMessage,
      onMessageUpdated,
      onMessageDeleted,
      onReactionUpdated,
      onSeenReceiptsUpdated,
      onApprovalUpdated,
      onProjectActivityBump,
      onPresenceSync,
    };
  });

  // FEAT-18: Periodic presence heartbeat emission (every 2.5 minutes while connected)
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Send initial heartbeat
    socket.emit("presence:heartbeat");

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        socket.emit("presence:heartbeat");
      }
    }, 150000); // 2.5 minutes (well within 5-min TTL)

    return () => clearInterval(interval);
  }, [socket, isConnected]);

  // Join ONLY the active selected project room (zero over-subscription)
  useEffect(() => {
    if (!socket || !isConnected || !projectId) return;

    const room = `project:${projectId}`;
    socket.emit("room:join", { room });

    return () => {
      socket.emit("room:leave", { room });
    };
  }, [socket, projectId, isConnected]);

  // Event Subscriptions
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: ProjectMessageItem) => {
      callbacksRef.current.onNewMessage?.(msg);
    };

    const handleMessageUpdated = (msg: ProjectMessageItem) => {
      callbacksRef.current.onMessageUpdated?.(msg);
    };

    const handleMessageDeleted = (data: { projectId: string; messageId: string }) => {
      callbacksRef.current.onMessageDeleted?.(data);
    };

    const handleReactionUpdated = (data: { messageId: string; reactions: MessageReactionItem[] }) => {
      callbacksRef.current.onReactionUpdated?.(data);
    };

    const handleSeenReceiptsUpdated = (data: { messageId: string; seenBy: MessageReadReceiptItem[] }) => {
      callbacksRef.current.onSeenReceiptsUpdated?.(data);
    };

    const handleApprovalUpdated = (data: { projectId: string; messageId: string; workflow: ApprovalWorkflowItem }) => {
      callbacksRef.current.onApprovalUpdated?.(data);
    };

    const handleProjectActivityBump = (data: {
      projectId: string;
      lastActivityAt: string;
      lastMessage?: any;
      attentionType?: any;
      pendingApprovalsCount?: number;
    }) => {
      callbacksRef.current.onProjectActivityBump?.(data);
    };

    const handleUserTyping = (data: { projectId: string; userId: string; userName: string }) => {
      if (data.projectId === projectId) {
        setTypingUsers((prev) => (prev.includes(data.userName) ? prev : [...prev, data.userName]));

        // Auto-clear after 3.5s of no typing event
        if (typingTimeoutsRef.current.has(data.userName)) {
          clearTimeout(typingTimeoutsRef.current.get(data.userName));
        }
        const timeout = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u !== data.userName));
          typingTimeoutsRef.current.delete(data.userName);
        }, 3500);
        typingTimeoutsRef.current.set(data.userName, timeout);
      }
    };

    const handleUserStoppedTyping = (data: { projectId: string; userId: string }) => {
      if (data.projectId === projectId) {
        // Will clear automatically upon timeout
      }
    };

    const handlePresenceSync = (data: { onlineUserIds: string[] }) => {
      callbacksRef.current.onPresenceSync?.(data);
    };

    socket.on("chat:new_message", handleNewMessage);
    socket.on("chat:message_updated", handleMessageUpdated);
    socket.on("chat:message_deleted", handleMessageDeleted);
    socket.on("chat:reaction_updated", handleReactionUpdated);
    socket.on("chat:seen_receipts_updated", handleSeenReceiptsUpdated);
    socket.on("approval:updated", handleApprovalUpdated);
    socket.on("project:activity_bump", handleProjectActivityBump);
    socket.on("chat:user_typing", handleUserTyping);
    socket.on("chat:user_stopped_typing", handleUserStoppedTyping);
    socket.on("presence:sync", handlePresenceSync);

    return () => {
      socket.off("chat:new_message", handleNewMessage);
      socket.off("chat:message_updated", handleMessageUpdated);
      socket.off("chat:message_deleted", handleMessageDeleted);
      socket.off("chat:reaction_updated", handleReactionUpdated);
      socket.off("chat:seen_receipts_updated", handleSeenReceiptsUpdated);
      socket.off("approval:updated", handleApprovalUpdated);
      socket.off("project:activity_bump", handleProjectActivityBump);
      socket.off("chat:user_typing", handleUserTyping);
      socket.off("chat:user_stopped_typing", handleUserStoppedTyping);
      socket.off("presence:sync", handlePresenceSync);
    };
  }, [socket, projectId]);

  // Actions
  const sendMessage = useCallback(
    (dto: CreateProjectMessageDTO): Promise<ProjectMessageItem> => {
      return new Promise((resolve, reject) => {
        if (!socket || !projectId) {
          return reject(new Error("Socket not connected or no project selected"));
        }

        const idempotencyKey =
          dto.idempotencyKey ||
          (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

        const timer = setTimeout(() => {
          reject(new Error("Socket message send timeout"));
        }, 8000);

        socket.emit(
          "chat:send_message",
          { projectId, ...dto, idempotencyKey },
          (res: { success: boolean; data?: ProjectMessageItem; error?: string; retryAfterMs?: number }) => {
            clearTimeout(timer);
            if (res?.success && res.data) {
              resolve(res.data);
            } else {
              reject(new Error(res?.error || "Failed to send message"));
            }
          },
        );
      });
    },
    [socket, projectId],
  );

  const sendReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!socket || !projectId) return;
      socket.emit("chat:react", { projectId, messageId, emoji });
    },
    [socket, projectId],
  );

  const markSeen = useCallback(
    (messageIds: string[]) => {
      if (!socket || !projectId || messageIds.length === 0) return;
      socket.emit("chat:mark_seen", { projectId, messageIds });
    },
    [socket, projectId],
  );

  const startTyping = useCallback(() => {
    if (!socket || !projectId) return;
    socket.emit("chat:typing_start", { projectId });
  }, [socket, projectId]);

  const stopTyping = useCallback(() => {
    if (!socket || !projectId) return;
    socket.emit("chat:typing_stop", { projectId });
  }, [socket, projectId]);

  const dispatchApprovalAction = useCallback(
    (payload: {
      messageId: string;
      action: "LEAD_APPROVE" | "SALES_DISPATCH" | "REVISION_REQUESTED";
      dispatchPlatform?: string;
      dispatchReferenceId?: string;
      rejectionReason?: string;
      notes?: string;
    }): Promise<ApprovalWorkflowItem> => {
      return new Promise((resolve, reject) => {
        if (!socket || !projectId) {
          return reject(new Error("Socket not connected or no project selected"));
        }

        const timer = setTimeout(() => {
          reject(new Error("Socket approval action timeout"));
        }, 5000);

        socket.emit(
          "approval:action",
          { projectId, ...payload },
          (res: { success: boolean; data?: ApprovalWorkflowItem; error?: string }) => {
            clearTimeout(timer);
            if (res?.success && res.data) {
              resolve(res.data);
            } else {
              reject(new Error(res?.error || "Failed to process approval action"));
            }
          },
        );
      });
    },
    [socket, projectId],
  );

  const editMessage = useCallback(
    (messageId: string, dto: EditProjectMessageDTO): Promise<ProjectMessageItem> => {
      return new Promise((resolve, reject) => {
        if (!socket || !projectId) {
          return reject(new Error("Socket not connected or no project selected"));
        }

        const timer = setTimeout(() => {
          reject(new Error("Socket message edit timeout"));
        }, 5000);

        socket.emit(
          "chat:edit_message",
          { projectId, messageId, ...dto },
          (res: { success: boolean; data?: ProjectMessageItem; error?: string }) => {
            clearTimeout(timer);
            if (res?.success && res.data) {
              resolve(res.data);
            } else {
              reject(new Error(res?.error || "Failed to edit message"));
            }
          },
        );
      });
    },
    [socket, projectId],
  );

  const deleteMessage = useCallback(
    (messageId: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!socket || !projectId) {
          return reject(new Error("Socket not connected or no project selected"));
        }

        const timer = setTimeout(() => {
          reject(new Error("Socket message delete timeout"));
        }, 5000);

        socket.emit(
          "chat:delete_message",
          { projectId, messageId },
          (res: { success: boolean; error?: string }) => {
            clearTimeout(timer);
            if (res?.success) {
              resolve();
            } else {
              reject(new Error(res?.error || "Failed to delete message"));
            }
          },
        );
      });
    },
    [socket, projectId],
  );

  return {
    isConnected,
    typingUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    sendReaction,
    markSeen,
    startTyping,
    stopTyping,
    dispatchApprovalAction,
  };
}
