// src/core/realtime/realtime.types.ts

import type { Socket, Server as SocketIoServer } from "socket.io";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";

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
