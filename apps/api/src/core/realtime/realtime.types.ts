// src/core/realtime/realtime.types.ts

import type { Socket, Server as SocketIoServer } from "socket.io";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";

import type {
  ProjectMessageItem,
  ApprovalWorkflowItem,
  MessageReactionItem,
  MessageReadReceiptItem,
  CreateProjectMessageDTO,
  EditProjectMessageDTO,
} from "@workspace/shared";

/**
 * Standard Events sent from Client to Server
 */
export interface ClientToServerEvents {
  ping: () => void;
  "presence:heartbeat": (callback?: (res: { success: boolean }) => void) => void;
  "room:join": (
    data: { room: string },
    callback?: (res: { success: boolean; error?: string }) => void,
  ) => void;
  "room:leave": (
    data: { room: string },
    callback?: (res: { success: boolean }) => void,
  ) => void;
  "chat:send_message": (
    payload: { projectId: string } & CreateProjectMessageDTO,
    callback?: (res: { success: boolean; data?: ProjectMessageItem; error?: string; retryAfterMs?: number }) => void,
  ) => void;
  "chat:edit_message": (
    payload: { projectId: string; messageId: string } & EditProjectMessageDTO,
    callback?: (res: { success: boolean; data?: ProjectMessageItem; error?: string }) => void,
  ) => void;
  "chat:delete_message": (
    payload: { projectId: string; messageId: string },
    callback?: (res: { success: boolean; error?: string }) => void,
  ) => void;
  "chat:typing_start": (payload: { projectId: string }) => void;
  "chat:typing_stop": (payload: { projectId: string }) => void;
  "chat:react": (payload: { projectId: string; messageId: string; emoji: string }) => void;
  "chat:mark_seen": (payload: { projectId: string; messageIds: string[] }) => void;
  "approval:action": (
    payload: {
      projectId: string;
      messageId: string;
      action: "LEAD_APPROVE" | "SALES_DISPATCH" | "REVISION_REQUESTED";
      dispatchPlatform?: string;
      dispatchReferenceId?: string;
      rejectionReason?: string;
      notes?: string;
    },
    callback?: (res: { success: boolean; data?: ApprovalWorkflowItem; error?: string }) => void,
  ) => void;
  [event: string]: (...args: any[]) => void;
}

/**
 * Standard Events sent from Server to Client
 */
export interface ServerToClientEvents {
  pong: (data: { timestamp: number }) => void;
  error: (data: { message: string; code?: string }) => void;
  "presence:online": (data: { userId: string }) => void;
  "presence:offline": (data: { userId: string }) => void;
  "presence:sync": (data: { room: string; onlineUserIds: string[] }) => void;
  "notification:received": (notification: any) => void;
  "system:event": (data: { event: string; payload: any }) => void;
  "chat:new_message": (message: ProjectMessageItem) => void;
  "chat:message_updated": (message: ProjectMessageItem) => void;
  "chat:message_deleted": (data: { projectId: string; messageId: string }) => void;
  "chat:reaction_updated": (data: { messageId: string; reactions: MessageReactionItem[] }) => void;
  "chat:seen_receipts_updated": (data: { messageId: string; seenBy: MessageReadReceiptItem[] }) => void;
  "approval:updated": (data: { projectId: string; messageId: string; workflow: ApprovalWorkflowItem }) => void;
  "project:activity_bump": (data: {
    projectId: string;
    lastActivityAt: string;
    lastMessage?: any;
    attentionType?: any;
    pendingApprovalsCount?: number;
  }) => void;
  "chat:user_typing": (data: { projectId: string; userId: string; userName: string }) => void;
  "chat:user_stopped_typing": (data: { projectId: string; userId: string }) => void;
  [event: string]: (...args: any[]) => void;
}

/**
 * Events passed between horizontally scaled Socket.IO server instances
 */
export interface InterServerEvents {
  ping: () => void;
}

/**
 * Custom metadata attached to each connected socket
 */
export interface SocketData {
  user: AuthenticatedUser;
  connectedAt: Date;
  sessionId: string;
  rooms: Set<string>;
}

/**
 * Fully-typed Authenticated Socket instance
 */
export type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Fully-typed Realtime IO Server instance
 */
export type RealtimeIoServer = SocketIoServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
