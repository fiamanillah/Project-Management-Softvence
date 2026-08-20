// src/core/realtime/PresenceService.ts

import type Redis from "ioredis";
import { AppLogger } from "@/core/logging/logger";

const PRESENCE_TTL_SECONDS = 60 * 5; // 5 minutes heartbeat TTL

export class PresenceService {
  private static instance: PresenceService;
  private logger = new AppLogger("PresenceService");
  private redisClient: Redis | null = null;
  private memoryUserSockets = new Map<string, Set<string>>();
  private memoryRoomUsers = new Map<string, Set<string>>();

  private constructor() {}

  public static getInstance(): PresenceService {
    if (!PresenceService.instance) {
      PresenceService.instance = new PresenceService();
    }
    return PresenceService.instance;
  }

  public setRedisClient(client: Redis): void {
    this.redisClient = client;
    this.logger.info("PresenceService configured with Redis client");
  }

  /**
   * Tracks a new socket connection for a user.
   * Returns `true` if this is the user's first active connection (online transition).
   */
  public async trackConnection(userId: string, socketId: string): Promise<boolean> {
    // 1. In-memory local tracking
    let sockets = this.memoryUserSockets.get(userId);
    if (!sockets) {
      sockets = new Set();
      this.memoryUserSockets.set(userId, sockets);
    }
    const wasLocallyOnline = sockets.size > 0;
    sockets.add(socketId);

    // 2. Redis distributed tracking
    if (this.redisClient) {
      try {
        const userKey = `presence:user:${userId}`;
        const countBefore = await this.redisClient.scard(userKey);
        await this.redisClient.sadd(userKey, socketId);
        await this.redisClient.expire(userKey, PRESENCE_TTL_SECONDS);
        return countBefore === 0;
      } catch (error) {
        this.logger.error(`Redis presence error for user ${userId}:`, { error });
        return !wasLocallyOnline;
      }
    }

    return !wasLocallyOnline;
  }

  /**
   * Tracks a socket disconnection for a user.
   * Returns `true` if the user has NO remaining active connections (offline transition).
   */
  public async trackDisconnection(userId: string, socketId: string): Promise<boolean> {
    // 1. In-memory local tracking
    const sockets = this.memoryUserSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.memoryUserSockets.delete(userId);
      }
    }

    // 2. Redis distributed tracking
    if (this.redisClient) {
      try {
        const userKey = `presence:user:${userId}`;
        await this.redisClient.srem(userKey, socketId);
        const countAfter = await this.redisClient.scard(userKey);
        if (countAfter === 0) {
          await this.redisClient.del(userKey);
          return true;
        }
        return false;
      } catch (error) {
        this.logger.error(`Redis presence disconnect error for user ${userId}:`, { error });
        return !sockets || sockets.size === 0;
      }
    }

    return !sockets || sockets.size === 0;
  }

  /**
   * Refreshes user presence heartbeat TTL.
   */
  public async heartbeat(userId: string): Promise<void> {
    if (this.redisClient) {
      try {
        const userKey = `presence:user:${userId}`;
        await this.redisClient.expire(userKey, PRESENCE_TTL_SECONDS);
      } catch (error) {
        this.logger.error(`Heartbeat refresh error for user ${userId}:`, { error });
      }
    }
  }

  /**
   * Checks if a user is currently online.
   */
  public async isUserOnline(userId: string): Promise<boolean> {
    if (this.redisClient) {
      try {
        const count = await this.redisClient.scard(`presence:user:${userId}`);
        return count > 0;
      } catch (error) {
        this.logger.error(`isUserOnline error for user ${userId}:`, { error });
      }
    }

    const sockets = this.memoryUserSockets.get(userId);
    return Boolean(sockets && sockets.size > 0);
  }

  /**
   * Filters a list of user IDs to return only those currently online.
   */
  public async getOnlineUsers(userIds: string[]): Promise<string[]> {
    if (!userIds || userIds.length === 0) return [];

    if (this.redisClient) {
      try {
        const pipeline = this.redisClient.pipeline();
        userIds.forEach((id) => pipeline.scard(`presence:user:${id}`));
        const results = await pipeline.exec();

        const onlineIds: string[] = [];
        results?.forEach(([err, count], index) => {
          if (!err && typeof count === "number" && count > 0) {
            onlineIds.push(userIds[index]);
          }
        });
        return onlineIds;
      } catch (error) {
        this.logger.error("getOnlineUsers pipeline error:", { error });
      }
    }

    return userIds.filter((id) => {
      const sockets = this.memoryUserSockets.get(id);
      return sockets && sockets.size > 0;
    });
  }

  /**
   * Tracks a user joining a room.
   */
  public async trackRoomJoin(room: string, userId: string): Promise<void> {
    let users = this.memoryRoomUsers.get(room);
    if (!users) {
      users = new Set();
      this.memoryRoomUsers.set(room, users);
    }
    users.add(userId);

    if (this.redisClient) {
      try {
        await this.redisClient.sadd(`presence:room:${room}`, userId);
        await this.redisClient.expire(`presence:room:${room}`, PRESENCE_TTL_SECONDS * 2);
      } catch (error) {
        this.logger.error(`trackRoomJoin error for room ${room}:`, { error });
      }
    }
  }

  /**
   * Tracks a user leaving a room.
   */
  public async trackRoomLeave(room: string, userId: string): Promise<void> {
    const users = this.memoryRoomUsers.get(room);
    if (users) {
      users.delete(userId);
      if (users.size === 0) {
        this.memoryRoomUsers.delete(room);
      }
    }

    if (this.redisClient) {
      try {
        await this.redisClient.srem(`presence:room:${room}`, userId);
      } catch (error) {
        this.logger.error(`trackRoomLeave error for room ${room}:`, { error });
      }
    }
  }

  /**
   * Gets all active online users in a specific room.
   */
  public async getRoomOnlineUsers(room: string): Promise<string[]> {
    let roomUserIds: string[] = [];

    if (this.redisClient) {
      try {
        roomUserIds = await this.redisClient.smembers(`presence:room:${room}`);
      } catch (error) {
        this.logger.error(`getRoomOnlineUsers error for room ${room}:`, { error });
      }
    }

    if (roomUserIds.length === 0) {
      const localUsers = this.memoryRoomUsers.get(room);
      if (localUsers) {
        roomUserIds = Array.from(localUsers);
      }
    }

    return this.getOnlineUsers(roomUserIds);
  }
}
