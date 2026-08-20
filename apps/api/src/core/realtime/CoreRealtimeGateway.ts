// src/core/realtime/CoreRealtimeGateway.ts

import { BaseSocketGateway } from "./BaseSocketGateway";
import type { AuthenticatedSocket, RealtimeIoServer } from "./realtime.types";
import { PresenceService } from "./PresenceService";
import { canSocket } from "./socketPermission";

export class CoreRealtimeGateway extends BaseSocketGateway {
  public readonly name = "CoreRealtimeGateway";
  private presenceService = PresenceService.getInstance();

  public register(io: RealtimeIoServer, socket: AuthenticatedSocket): void {
    const user = socket.data.user;

    // 1. Connection Ping-Pong (Liveness check)
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });

    // 2. Presence Heartbeat
    socket.on("presence:heartbeat", async (callback) => {
      if (user?.id) {
        await this.presenceService.heartbeat(user.id);
      }
      callback?.({ success: true });
    });

    // 3. Generic Room Join with Scoped Permission Gating
    socket.on("room:join", async ({ room }, callback) => {
      if (!room || typeof room !== "string") {
        return callback?.({ success: false, error: "Invalid room identifier" });
      }

      // Room authorization policy
      const allowed = await this.evaluateRoomAccess(socket, room);
      if (!allowed) {
        this.logger.warn(`User ${user?.id} denied access to join room '${room}'`);
        return callback?.({ success: false, error: "Access to room denied" });
      }

      await socket.join(room);
      socket.data.rooms.add(room);
      if (user?.id) {
        await this.presenceService.trackRoomJoin(room, user.id);
      }

      this.logger.info(`Socket ${socket.id} (user=${user?.id}) joined room '${room}'`);

      // Optionally sync online users in this room
      const onlineUsers = await this.presenceService.getRoomOnlineUsers(room);
      socket.emit("presence:sync", { room, onlineUserIds: onlineUsers });

      callback?.({ success: true });
    });

    // 4. Room Leave
    socket.on("room:leave", async ({ room }, callback) => {
      if (room && typeof room === "string") {
        await socket.leave(room);
        socket.data.rooms.delete(room);
        if (user?.id) {
          await this.presenceService.trackRoomLeave(room, user.id);
        }
        this.logger.info(`Socket ${socket.id} (user=${user?.id}) left room '${room}'`);
      }
      callback?.({ success: true });
    });
  }

  public async onDisconnect(socket: AuthenticatedSocket): Promise<void> {
    const user = socket.data.user;
    if (user?.id && socket.data.rooms) {
      for (const room of socket.data.rooms) {
        await this.presenceService.trackRoomLeave(room, user.id);
      }
    }
  }

  /**
   * Evaluates if a socket user is authorized to join a specific room.
   */
  private async evaluateRoomAccess(socket: AuthenticatedSocket, room: string): Promise<boolean> {
    const user = socket.data.user;
    if (!user) return false;

    // SuperAdmin bypass for any room
    if (user.systemRole === "SuperAdmin") return true;

    // 1. Personal room: 'user:{id}' -> only that user
    if (room.startsWith("user:")) {
      return room === `user:${user.id}`;
    }

    // 2. Project room: 'project:{projectId}' or 'project:{projectId}:*'
    if (room.startsWith("project:")) {
      const parts = room.split(":");
      const projectId = parts[1];
      if (!projectId) return false;

      // Check project view permission
      return canSocket(socket, "project.view", { projectId });
    }

    // 3. Organization / Branch / Department rooms
    if (room.startsWith("branch:")) {
      const branchId = room.split(":")[1];
      return user.branchId === branchId || (await canSocket(socket, "organization.branch.view", { branchId }));
    }

    if (room.startsWith("dept:")) {
      const departmentId = room.split(":")[1];
      return await canSocket(socket, "organization.department.view", { departmentId });
    }

    // 4. General broadcast room 'global' or 'announcements'
    if (room === "global" || room === "announcements") {
      return true;
    }

    return true;
  }
}
