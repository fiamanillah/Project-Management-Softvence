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
} from "@workspace/shared";

interface UseProjectSocketOptions {
  projectId: string | null;
  onNewMessage?: (message: ProjectMessageItem) => void;
  onMessageUpdated?: (message: ProjectMessageItem) => void;
  onReactionUpdated?: (data: { messageId: string; reactions: MessageReactionItem[] }) => void;
  onSeenReceiptsUpdated?: (data: { messageId: string; seenBy: MessageReadReceiptItem[] }) => void;
  onApprovalUpdated?: (data: { projectId: string; messageId: string; workflow: ApprovalWorkflowItem }) => void;
  onPresenceSync?: (data: { onlineUserIds: string[] }) => void;
}

export function useProjectSocket({
  projectId,
  onNewMessage,
  onMessageUpdated,
  onReactionUpdated,
  onSeenReceiptsUpdated,
  onApprovalUpdated,
  onPresenceSync,
}: UseProjectSocketOptions) {
  const { socket, isConnected } = useSocket();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Join/Leave project room
  useEffect(() => {
    if (!socket || !projectId || !isConnected) return;

    socket.emit("room:join", { room: `project:${projectId}` });

    return () => {
      socket.emit("room:leave", { room: `project:${projectId}` });
    };
  }, [socket, projectId, isConnected]);

  // Event Subscriptions
  useEffect(() => {
    if (!socket || !projectId) return;

    const handleNewMessage = (msg: ProjectMessageItem) => {
      if (msg.projectId === projectId) {
        onNewMessage?.(msg);
      }
    };

    const handleMessageUpdated = (msg: ProjectMessageItem) => {
      if (msg.projectId === projectId) {
        onMessageUpdated?.(msg);
      }
    };

    const handleReactionUpdated = (data: { messageId: string; reactions: MessageReactionItem[] }) => {
      onReactionUpdated?.(data);
    };

    const handleSeenReceiptsUpdated = (data: { messageId: string; seenBy: MessageReadReceiptItem[] }) => {
      onSeenReceiptsUpdated?.(data);
    };

    const handleApprovalUpdated = (data: { projectId: string; messageId: string; workflow: ApprovalWorkflowItem }) => {
      if (data.projectId === projectId) {
        onApprovalUpdated?.(data);
      }
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
        // Will clear upon timeout or immediate
      }
    };

    const handlePresenceSync = (data: { onlineUserIds: string[] }) => {
      onPresenceSync?.(data);
    };

    socket.on("chat:new_message" as any, handleNewMessage);
    socket.on("chat:message_updated" as any, handleMessageUpdated);
    socket.on("chat:reaction_updated" as any, handleReactionUpdated);
    socket.on("chat:seen_receipts_updated" as any, handleSeenReceiptsUpdated);
    socket.on("approval:updated" as any, handleApprovalUpdated);
    socket.on("chat:user_typing" as any, handleUserTyping);
    socket.on("chat:user_stopped_typing" as any, handleUserStoppedTyping);
    socket.on("presence:sync" as any, handlePresenceSync);

    return () => {
      socket.off("chat:new_message" as any, handleNewMessage);
      socket.off("chat:message_updated" as any, handleMessageUpdated);
      socket.off("chat:reaction_updated" as any, handleReactionUpdated);
      socket.off("chat:seen_receipts_updated" as any, handleSeenReceiptsUpdated);
      socket.off("approval:updated" as any, handleApprovalUpdated);
      socket.off("chat:user_typing" as any, handleUserTyping);
      socket.off("chat:user_stopped_typing" as any, handleUserStoppedTyping);
      socket.off("presence:sync" as any, handlePresenceSync);
    };
  }, [
    socket,
    projectId,
    onNewMessage,
    onMessageUpdated,
    onReactionUpdated,
    onSeenReceiptsUpdated,
    onApprovalUpdated,
    onPresenceSync,
  ]);

  // Actions
  const sendMessage = useCallback(
    (dto: CreateProjectMessageDTO): Promise<ProjectMessageItem> => {
      return new Promise((resolve, reject) => {
        if (!socket || !projectId) {
          return reject(new Error("Socket not connected or no project selected"));
        }
        socket.emit(
          "chat:send_message",
          { projectId, ...dto },
          (res: { success: boolean; data?: ProjectMessageItem; error?: string }) => {
            if (res.success && res.data) {
              resolve(res.data);
            } else {
              reject(new Error(res.error || "Failed to send message"));
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
        socket.emit(
          "approval:action",
          { projectId, ...payload },
          (res: { success: boolean; data?: ApprovalWorkflowItem; error?: string }) => {
            if (res.success && res.data) {
              resolve(res.data);
            } else {
              reject(new Error(res.error || "Failed to process approval action"));
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
    sendReaction,
    markSeen,
    startTyping,
    stopTyping,
    dispatchApprovalAction,
  };
}
