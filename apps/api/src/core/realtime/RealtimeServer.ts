// src/core/realtime/RealtimeServer.ts

import { Server as HttpServer } from "http";
import { Server as SocketIoServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { config } from "@/core/config";
import { AppLogger } from "@/core/logging/logger";
import { socketAuthMiddleware } from "./socketAuthMiddleware";
import { PresenceService } from "./PresenceService";
import { SocketRateLimiter } from "./SocketRateLimiter";
import { CoreRealtimeGateway } from "./CoreRealtimeGateway";
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  InterServerEvents,
  RealtimeIoServer,
  ServerToClientEvents,
  SocketData,
} from "./realtime.types";
import type { ISocketGateway } from "./BaseSocketGateway";

export class RealtimeServer {
  private static instance: RealtimeServer;
  private logger = new AppLogger("RealtimeServer");
  private io: RealtimeIoServer | null = null;
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private presenceRedisClient: Redis | null = null;
  private gateways: Map<string, ISocketGateway> = new Map();
  private presenceService = PresenceService.getInstance();
  private isInitialized = false;

  private constructor() {
    // Register default core gateway
    this.registerGateway(new CoreRealtimeGateway());
  }

  public static getInstance(): RealtimeServer {
    if (!RealtimeServer.instance) {
      RealtimeServer.instance = new RealtimeServer();
    }
    return RealtimeServer.instance;
  }

  /**
   * Registers a modular socket gateway into the real-time server.
   */
  public registerGateway(gateway: ISocketGateway): void {
    if (this.gateways.has(gateway.name)) {
      this.logger.warn(`Gateway '${gateway.name}' already registered, overriding.`);
    }
    this.gateways.set(gateway.name, gateway);
    this.logger.info(`✔ Registered socket gateway: ${gateway.name}`);
  }

  /**
   * Attaches Socket.IO to the native HTTP server with Redis adapter and authentication.
   */
  public async attach(httpServer: HttpServer): Promise<void> {
    if (this.isInitialized && this.io) {
      this.logger.warn("RealtimeServer already attached to HTTP server");
      return;
    }

    try {
      this.logger.info("⚙ Initializing Realtime Socket.IO Engine...");

      // 1. Initialize Redis Adapter for cluster broadcast
      await this.initializeRedisAdapter();

      // 2. Instantiate Socket.IO Server with enterprise CORS & transport options
      this.io = new SocketIoServer<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
      >(httpServer, {
        cors: {
          origin: config.security.cors.allowedOrigins || "*",
          methods: ["GET", "POST"],
          credentials: true,
        },
        pingTimeout: 30000,
        pingInterval: 25000,
        transports: ["websocket", "polling"],
        allowUpgrades: true,
      });

      // 3. Attach Redis Pub/Sub adapter if Redis clients are available
      if (this.pubClient && this.subClient) {
        this.io.adapter(createAdapter(this.pubClient, this.subClient));
        this.logger.info("✔ Socket.IO Redis adapter attached successfully");
      }

      // 4. Setup Authentication Middleware
      this.io.use((socket, next) => {
        socketAuthMiddleware(socket as AuthenticatedSocket, next);
      });

      // 5. Setup Connection Lifecycle Handlers
      this.setupConnectionHandlers();

      this.isInitialized = true;
      this.logger.info("✔ Realtime Engine sparked and listening for connections");
    } catch (error) {
      this.logger.error("Failed to initialize RealtimeServer:", { error });
      throw error;
    }
  }

  /**
   * Setup Redis connections for adapter and presence tracking.
   */
  private async initializeRedisAdapter(): Promise<void> {
    try {
      const redisConfig = {
        host: config.redis.host || "127.0.0.1",
        port: config.redis.port || 6379,
        password: config.redis.password || undefined,
        db: config.redis.db || 0,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 100, 3000),
      };

      this.pubClient = new Redis(redisConfig);
      this.subClient = new Redis(redisConfig);
      this.presenceRedisClient = new Redis(redisConfig);

      // Error handlers
      this.pubClient.on("error", (err) => this.logger.error("Redis PubClient error:", { error: err }));
      this.subClient.on("error", (err) => this.logger.error("Redis SubClient error:", { error: err }));
      this.presenceRedisClient.on("error", (err) =>
        this.logger.error("Redis PresenceClient error:", { error: err }),
      );

      await Promise.all([
        this.pubClient.connect().catch((e) => this.logger.warn("Redis PubClient failed to connect", { e })),
        this.subClient.connect().catch((e) => this.logger.warn("Redis SubClient failed to connect", { e })),
        this.presenceRedisClient.connect().catch((e) => this.logger.warn("Redis PresenceClient failed to connect", { e })),
      ]);

      if (this.presenceRedisClient) {
        this.presenceService.setRedisClient(this.presenceRedisClient);
        SocketRateLimiter.getInstance().setRedisClient(this.presenceRedisClient);
      }
    } catch (error) {
      this.logger.warn("Redis adapter initialization encountered error, running in single-node mode:", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Bind event listeners for socket connections, gateways, and disconnections.
   */
  private setupConnectionHandlers(): void {
    if (!this.io) return;

    this.io.on("connection", async (rawSocket) => {
      const socket = rawSocket as AuthenticatedSocket;
      const user = socket.data.user;

      if (!user || !user.id) {
        this.logger.warn(`Rejecting connection without identity on socket ${socket.id}`);
        socket.disconnect(true);
        return;
      }

      // 1. Auto-join user personal room for direct events & notifications
      const userRoom = `user:${user.id}`;
      await socket.join(userRoom);
      socket.data.rooms.add(userRoom);

      // 2. Track connection & check if user just came online
      const justCameOnline = await this.presenceService.trackConnection(user.id, socket.id);
      if (justCameOnline) {
        this.io?.emit("presence:online", { userId: user.id });
      }

      // 3. Register all modular gateways on this socket
      for (const gateway of this.gateways.values()) {
        try {
          gateway.register(this.io!, socket);
        } catch (err) {
          this.logger.error(`Error registering gateway '${gateway.name}' on socket ${socket.id}:`, {
            error: err,
          });
        }
      }

      // 4. Handle Disconnection
      socket.on("disconnect", async (reason) => {
        this.logger.info(`Socket disconnected: ${socket.id} (user=${user.id}, reason=${reason})`);

        // Notify gateways of disconnection
        for (const gateway of this.gateways.values()) {
          try {
            await gateway.onDisconnect?.(socket);
          } catch (err) {
            this.logger.error(`Error in onDisconnect for gateway '${gateway.name}':`, { error: err });
          }
        }

        // Track disconnection in presence engine
        const justWentOffline = await this.presenceService.trackDisconnection(user.id, socket.id);
        if (justWentOffline) {
          this.io?.emit("presence:offline", { userId: user.id });
        }
      });
    });
  }

  // ==========================================
  // CONVENIENCE EMITTERS FOR SERVICES
  // ==========================================

  /**
   * Emits an event to a specific user's private room.
   */
  public toUser<E extends keyof ServerToClientEvents>(
    userId: string,
    event: E,
    payload: Parameters<ServerToClientEvents[E]>[0],
  ): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event as any, payload);
  }

  /**
   * Emits an event to a project-scoped room.
   */
  public toProject<E extends keyof ServerToClientEvents>(
    projectId: string,
    event: E,
    payload: Parameters<ServerToClientEvents[E]>[0],
  ): void {
    if (!this.io) return;
    this.io.to(`project:${projectId}`).emit(event as any, payload);
  }

  /**
   * Emits an event to any arbitrary room (e.g. branch, department, custom channel).
   */
  public toRoom<E extends keyof ServerToClientEvents>(
    room: string,
    event: E,
    payload: Parameters<ServerToClientEvents[E]>[0],
  ): void {
    if (!this.io) return;
    this.io.to(room).emit(event as any, payload);
  }

  /**
   * Broadcasts an event to all connected sockets across the entire cluster.
   */
  public broadcast<E extends keyof ServerToClientEvents>(
    event: E,
    payload: Parameters<ServerToClientEvents[E]>[0],
  ): void {
    if (!this.io) return;
    this.io.emit(event as any, payload);
  }

  /**
   * Direct access to underlying Socket.IO server.
   */
  public getIo(): RealtimeIoServer | null {
    return this.io;
  }

  /**
   * Graceful Shutdown
   */
  public async shutdown(): Promise<void> {
    this.logger.info("Shutting down RealtimeServer...");

    if (this.io) {
      this.io.disconnectSockets(true);
      await new Promise<void>((resolve) => {
        this.io?.close(() => resolve());
      });
      this.io = null;
    }

    if (this.pubClient) {
      await this.pubClient.quit().catch(() => {});
      this.pubClient = null;
    }

    if (this.subClient) {
      await this.subClient.quit().catch(() => {});
      this.subClient = null;
    }

    if (this.presenceRedisClient) {
      await this.presenceRedisClient.quit().catch(() => {});
      this.presenceRedisClient = null;
    }

    this.isInitialized = false;
    this.logger.info("✔ RealtimeServer shutdown complete");
  }
}

export const realtimeServer = RealtimeServer.getInstance();
