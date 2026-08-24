// src/Modules/Stations/services/stations.session.service.ts

import type { PrismaClient } from "@workspace/db";
import type { CacheManager } from "@workspace/cache";
import type { Request } from "express";
import {
  BadRequestError,
  NotFoundError,
  AuthorizationError,
} from "@/core/errors/AppError";
import { AuditLogService } from "@/core/audit/audit.service";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type {
  SelectStationDTO,
  ActiveStationContext,
  StationSessionItem,
} from "../StationDTO";
import { sanitizeAndDecorateStation } from "./stations.capability.helper";

export class StationsSessionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cacheManager?: CacheManager,
  ) {}

  /**
   * Select and join an authorized station for the active work shift.
   */
  public async selectStation(
    dto: SelectStationDTO,
    actor: AuthenticatedUser,
    req?: Request,
  ): Promise<ActiveStationContext> {
    const station = await this.prisma.station.findFirst({
      where: { id: dto.stationId, deletedAt: null },
      include: {
        stationType: true,
        status: true,
        branch: true,
        department: true,
        stationProfiles: {
          where: { unassignedAt: null },
          include: {
            profile: {
              include: {
                platform: true,
                _count: { select: { projects: { where: { deletedAt: null } } } },
              },
            },
            assignedBy: true,
          },
        },
        assignedUsers: {
          where: { unassignedAt: null },
          include: { user: true, role: true },
        },
        sessions: {
          where: { isCurrent: true, leftAt: null },
          include: { user: true },
        },
      },
    });

    if (!station) {
      throw new NotFoundError("Station not found");
    }

    if (!station.isActive) {
      throw new BadRequestError("This station is currently disabled");
    }

    if (station.status && !station.status.isOperational) {
      throw new BadRequestError(
        `Station is currently not operational (Status: ${station.status.name})`,
      );
    }

    // Verify user authorization: must have active assignment (unless SuperAdmin)
    if (actor.systemRole !== "SuperAdmin") {
      const isAssigned = station.assignedUsers.some((au) => au.userId === actor.id);
      if (!isAssigned) {
        throw new AuthorizationError(
          "You are not authorized or assigned to operate this station",
        );
      }
    }

    // Check IP whitelist if configured
    if (station.ipWhitelist && station.ipWhitelist.length > 0) {
      const clientIp =
        (req?.headers["x-forwarded-for"] as string) || req?.socket?.remoteAddress || "";
      const isWhitelisted = station.ipWhitelist.some((ip) => clientIp.includes(ip));
      if (!isWhitelisted && actor.systemRole !== "SuperAdmin") {
        throw new AuthorizationError(
          "Access denied: Your IP is not in the station's allowed network whitelist",
        );
      }
    }

    // Check concurrent users limit
    const currentActiveCount = station.sessions.filter(
      (s) => s.userId !== actor.id,
    ).length;

    if (currentActiveCount >= station.maxConcurrentUsers) {
      throw new BadRequestError(
        `Station is at maximum concurrent capacity (${station.maxConcurrentUsers} active operator[s])`,
      );
    }

    const now = new Date();
    const ipAddress =
      (req?.headers["x-forwarded-for"] as string) || req?.socket?.remoteAddress || undefined;

    // Database transaction: Close any previous active sessions for this user & create new one
    const newSession = await this.prisma.$transaction(async (tx) => {
      await tx.stationSession.updateMany({
        where: { userId: actor.id, isCurrent: true },
        data: { isCurrent: false, leftAt: now },
      });

      return tx.stationSession.create({
        data: {
          stationId: station.id,
          userId: actor.id,
          ipAddress: ipAddress || null,
          deviceInfo: dto.deviceInfo || req?.headers["user-agent"] || null,
          joinedAt: now,
          lastActiveAt: now,
          isCurrent: true,
        },
        include: {
          user: true,
          station: true,
        },
      });
    });

    const sanitizedStation = await sanitizeAndDecorateStation(station, actor);
    const activeProfiles = sanitizedStation.activeProfiles || [];
    const activeProfileIds = activeProfiles.map((p) => p.profileId);

    const sessionItem: StationSessionItem = {
      id: newSession.id,
      stationId: newSession.stationId,
      userId: newSession.userId,
      ipAddress: newSession.ipAddress,
      deviceInfo: newSession.deviceInfo,
      joinedAt: newSession.joinedAt,
      lastActiveAt: newSession.lastActiveAt,
      isCurrent: true,
      user: {
        id: actor.id,
        firstName: (actor as any).firstName || "",
        lastName: (actor as any).lastName || "",
        email: actor.email || "",
      },
      station: {
        id: station.id,
        code: station.code,
        name: station.name,
      },
    };

    const context: ActiveStationContext = {
      session: sessionItem,
      station: sanitizedStation,
      activeProfiles,
      activeProfileIds,
    };

    // Cache active station in Redis
    if (this.cacheManager) {
      await this.cacheManager.set(
        `station:user_active:${actor.id}`,
        context,
        { ttlSeconds: 86400 },
      );
    }

    await AuditLogService.log({
      module: "STATIONS",
      action: "STATION_SESSION_JOINED",
      entityTable: "station_sessions",
      entityId: newSession.id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      metadata: { stationId: station.id, stationName: station.name, activeProfilesCount: activeProfiles.length },
      req,
    });

    return context;
  }

  /**
   * Leave the currently active station and clear session context.
   */
  public async leaveStation(
    actor: AuthenticatedUser,
    req?: Request,
  ): Promise<{ message: string }> {
    const now = new Date();

    const activeSession = await this.prisma.stationSession.findFirst({
      where: { userId: actor.id, isCurrent: true, leftAt: null },
      include: { station: true },
    });

    if (activeSession) {
      await this.prisma.stationSession.update({
        where: { id: activeSession.id },
        data: { isCurrent: false, leftAt: now },
      });

      await AuditLogService.log({
        module: "STATIONS",
        action: "STATION_SESSION_LEFT",
        entityTable: "station_sessions",
        entityId: activeSession.id,
        actor: { id: actor.id, email: actor.email, role: actor.systemRole },
        metadata: { stationId: activeSession.stationId, stationName: activeSession.station.name },
        req,
      });
    }

    if (this.cacheManager) {
      await this.cacheManager.del(`station:user_active:${actor.id}`);
    }

    return { message: "Left station successfully" };
  }

  /**
   * Get the current user's active station session context.
   */
  public async getActiveSession(
    actor: AuthenticatedUser,
  ): Promise<ActiveStationContext | null> {
    if (this.cacheManager) {
      const cached = await this.cacheManager.get<ActiveStationContext>(
        `station:user_active:${actor.id}`,
      );
      if (cached) return cached;
    }

    const activeSession = await this.prisma.stationSession.findFirst({
      where: { userId: actor.id, isCurrent: true, leftAt: null },
      include: {
        user: true,
        station: {
          include: {
            stationType: true,
            status: true,
            branch: true,
            department: true,
            stationProfiles: {
              where: { unassignedAt: null },
              include: {
                profile: {
                  include: {
                    platform: true,
                    _count: { select: { projects: { where: { deletedAt: null } } } },
                  },
                },
                assignedBy: true,
              },
            },
            assignedUsers: {
              where: { unassignedAt: null },
              include: { user: true, role: true },
            },
            sessions: {
              where: { isCurrent: true, leftAt: null },
              include: { user: true },
            },
          },
        },
      },
    });

    if (!activeSession || !activeSession.station) {
      return null;
    }

    const sanitizedStation = await sanitizeAndDecorateStation(
      activeSession.station,
      actor,
    );
    const activeProfiles = sanitizedStation.activeProfiles || [];
    const activeProfileIds = activeProfiles.map((p) => p.profileId);

    const sessionItem: StationSessionItem = {
      id: activeSession.id,
      stationId: activeSession.stationId,
      userId: activeSession.userId,
      ipAddress: activeSession.ipAddress,
      deviceInfo: activeSession.deviceInfo,
      joinedAt: activeSession.joinedAt,
      lastActiveAt: activeSession.lastActiveAt,
      isCurrent: true,
      user: {
        id: activeSession.user.id,
        firstName: activeSession.user.firstName,
        lastName: activeSession.user.lastName,
        email: activeSession.user.email,
        avatarUrl: activeSession.user.avatarUrl,
      },
      station: {
        id: activeSession.station.id,
        code: activeSession.station.code,
        name: activeSession.station.name,
      },
    };

    const context: ActiveStationContext = {
      session: sessionItem,
      station: sanitizedStation,
      activeProfiles,
      activeProfileIds,
    };

    if (this.cacheManager) {
      await this.cacheManager.set(
        `station:user_active:${actor.id}`,
        context,
        { ttlSeconds: 3600 },
      );
    }

    return context;
  }

  /**
   * Helper called during logout or session invalidation to clear station session.
   */
  public async cleanupUserSessions(userId: string) {
    const now = new Date();
    await this.prisma.stationSession.updateMany({
      where: { userId, isCurrent: true },
      data: { isCurrent: false, leftAt: now },
    });

    if (this.cacheManager) {
      await this.cacheManager.del(`station:user_active:${userId}`);
    }
  }
}
