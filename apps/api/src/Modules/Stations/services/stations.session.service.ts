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
import {
  SelectStationDTO,
  ActiveStationContext,
  UserStationSessionsState,
  StationSessionItem,
  StationProfileAssignmentItem,
  normalizeMacAddress,
  isIpInCidr,
} from "../StationDTO";
import { sanitizeAndDecorateStation } from "./stations.capability.helper";
import { realtimeServer } from "@/core/realtime/RealtimeServer";

export class StationsSessionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cacheManager?: CacheManager,
  ) {}

  /**
   * Select and join an authorized station for the active work shift.
   * Supports multi-station concurrency: does NOT close active sessions on other stations.
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

    // Check IP restriction if enabled (with full CIDR & subnet bitwise matching)
    if (station.isIpRestricted) {
      const rawForwarded = (req?.headers["x-forwarded-for"] as string) || "";
      const socketIp = req?.socket?.remoteAddress || "";
      const reqIp = (req as any)?.ip || "";

      // Gather all candidate client IPs (handling reverse proxies & load balancers)
      const candidateIps = [
        ...rawForwarded.split(",").map((ip) => ip.trim()),
        socketIp.trim(),
        reqIp.trim(),
      ].filter(Boolean);

      // Normalize IPv6-mapped IPv4 e.g. ::ffff:192.168.1.1 -> 192.168.1.1
      const normalizedCandidateIps = candidateIps.map((ip) =>
        ip.startsWith("::ffff:") ? ip.replace("::ffff:", "") : ip,
      );

      const whitelist = (station.ipWhitelist || [])
        .map((ip) => ip.trim())
        .filter(Boolean);

      const isWhitelisted =
        actor.systemRole === "SuperAdmin" ||
        (whitelist.length > 0 &&
          normalizedCandidateIps.some((clientIp) =>
            whitelist.some((allowedPattern) => isIpInCidr(clientIp, allowedPattern)),
          ));

      if (!isWhitelisted) {
        throw new AuthorizationError(
          "Access denied: Your IP address is not authorized for this workstation.",
        );
      }
    }

    // Check MAC address restriction if enabled
    if (station.isMacRestricted) {
      const candidateMacs = [
        dto.macAddress,
        (req?.headers["x-client-mac"] as string) || undefined,
        (req?.headers["x-mac-address"] as string) || undefined,
        (req?.headers["mac-address"] as string) || undefined,
      ]
        .filter((m): m is string => Boolean(m && typeof m === "string" && m.trim()))
        .map((m) => normalizeMacAddress(m.trim()));

      const macWhitelist = (station.macWhitelist || [])
        .map((m) => normalizeMacAddress(m.trim()))
        .filter(Boolean);

      const isMacWhitelisted =
        actor.systemRole === "SuperAdmin" ||
        (macWhitelist.length > 0 &&
          candidateMacs.some((clientMac) =>
            macWhitelist.some((allowedMac) => allowedMac === clientMac || allowedMac === "*"),
          ));

      if (!isMacWhitelisted) {
        throw new AuthorizationError(
          "Access denied: Your MAC address is not authorized for this workstation.",
        );
      }
    }

    const now = new Date();
    const ipAddress =
      (req?.headers["x-forwarded-for"] as string) || req?.socket?.remoteAddress || undefined;

    // Database transaction: Atomically verify capacity limit and handle station session
    const sessionRecord = await this.prisma.$transaction(async (tx) => {
      // Check if user already has an active session on THIS specific station
      const existingSession = await tx.stationSession.findFirst({
        where: {
          stationId: station.id,
          userId: actor.id,
          isCurrent: true,
          leftAt: null,
        },
        include: {
          user: true,
          station: true,
        },
      });

      if (existingSession) {
        // Update lastActiveAt and return existing active session
        return tx.stationSession.update({
          where: { id: existingSession.id },
          data: { lastActiveAt: now },
          include: {
            user: true,
            station: true,
          },
        });
      }

      // Check active concurrent operators on this station (excluding actor)
      const activeConcurrentCount = await tx.stationSession.count({
        where: {
          stationId: station.id,
          isCurrent: true,
          leftAt: null,
          userId: { not: actor.id },
        },
      });

      if (activeConcurrentCount >= station.maxConcurrentUsers) {
        throw new BadRequestError(
          `Station is at maximum concurrent capacity (${station.maxConcurrentUsers} active operator[s])`,
        );
      }

      // Create new active session for this station (do not close other station sessions)
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
      id: sessionRecord.id,
      stationId: sessionRecord.stationId,
      userId: sessionRecord.userId,
      ipAddress: sessionRecord.ipAddress,
      deviceInfo: sessionRecord.deviceInfo,
      joinedAt: sessionRecord.joinedAt,
      lastActiveAt: sessionRecord.lastActiveAt,
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

    // Invalidate user active sessions and station raw cache in Redis
    if (this.cacheManager) {
      await Promise.all([
        this.cacheManager.del(`station:user_active:${actor.id}`),
        this.cacheManager.del(`station:user_active_sessions:${actor.id}`),
        this.cacheManager.del(`station:raw:${station.id.toLowerCase()}`),
        this.cacheManager.del(`station:raw:${station.code.toLowerCase()}`),
        this.cacheManager.del(`station:detail:${station.id.toLowerCase()}`),
      ]).catch(() => {});
    }

    // Broadcast real-time session join and occupancy events via WebSocket
    try {
      const activeConcurrentCount = await this.prisma.stationSession.count({
        where: { stationId: station.id, isCurrent: true, leftAt: null },
      });

      realtimeServer.toRoom(`station:${station.id}`, "station:session_joined", {
        stationId: station.id,
        session: sessionItem,
        currentOccupancy: activeConcurrentCount,
        maxConcurrentUsers: station.maxConcurrentUsers,
      });

      realtimeServer.toRoom("stations:overview", "station:occupancy_updated", {
        stationId: station.id,
        currentOccupancy: activeConcurrentCount,
        maxConcurrentUsers: station.maxConcurrentUsers,
      });

      realtimeServer.toRoom(`user:${actor.id}`, "station:session_joined", {
        stationId: station.id,
        session: sessionItem,
        currentOccupancy: activeConcurrentCount,
        maxConcurrentUsers: station.maxConcurrentUsers,
      });
    } catch {
      // Non-blocking for real-time broadcast
    }

    await AuditLogService.log({
      module: "STATIONS",
      action: "STATION_SESSION_JOINED",
      entityTable: "station_sessions",
      entityId: sessionRecord.id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      metadata: { stationId: station.id, stationName: station.name, activeProfilesCount: activeProfiles.length },
      req,
    });

    return context;
  }

  /**
   * Leave a specific station (if stationId provided) or all active stations.
   */
  public async leaveStation(
    actor: AuthenticatedUser,
    stationId?: string,
    req?: Request,
  ): Promise<{ message: string; remainingActiveStationIds?: string[] }> {
    const now = new Date();
    const affectedStations: { id: string; code: string; maxConcurrentUsers: number; sessionId: string }[] = [];

    if (stationId) {
      const activeSession = await this.prisma.stationSession.findFirst({
        where: { userId: actor.id, stationId, isCurrent: true, leftAt: null },
        include: { station: true },
      });

      if (activeSession) {
        await this.prisma.stationSession.update({
          where: { id: activeSession.id },
          data: { isCurrent: false, leftAt: now },
        });

        affectedStations.push({
          id: activeSession.stationId,
          code: activeSession.station.code,
          maxConcurrentUsers: activeSession.station.maxConcurrentUsers,
          sessionId: activeSession.id,
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
    } else {
      const activeSessions = await this.prisma.stationSession.findMany({
        where: { userId: actor.id, isCurrent: true, leftAt: null },
        include: { station: true },
      });

      if (activeSessions.length > 0) {
        await this.prisma.stationSession.updateMany({
          where: { userId: actor.id, isCurrent: true },
          data: { isCurrent: false, leftAt: now },
        });

        for (const sess of activeSessions) {
          affectedStations.push({
            id: sess.stationId,
            code: sess.station.code,
            maxConcurrentUsers: sess.station.maxConcurrentUsers,
            sessionId: sess.id,
          });

          await AuditLogService.log({
            module: "STATIONS",
            action: "STATION_SESSION_LEFT",
            entityTable: "station_sessions",
            entityId: sess.id,
            actor: { id: actor.id, email: actor.email, role: actor.systemRole },
            metadata: { stationId: sess.stationId, stationName: sess.station?.name },
            req,
          });
        }
      }
    }

    if (this.cacheManager) {
      const keysToDelete = [
        `station:user_active:${actor.id}`,
        `station:user_active_sessions:${actor.id}`,
      ];
      for (const stn of affectedStations) {
        keysToDelete.push(
          `station:raw:${stn.id.toLowerCase()}`,
          `station:raw:${stn.code.toLowerCase()}`,
          `station:detail:${stn.id.toLowerCase()}`,
        );
      }
      await this.cacheManager.del(keysToDelete).catch(() => {});
    }

    // Broadcast real-time session leave and occupancy update events
    for (const stn of affectedStations) {
      try {
        const remainingCount = await this.prisma.stationSession.count({
          where: { stationId: stn.id, isCurrent: true, leftAt: null },
        });

        realtimeServer.toRoom(`station:${stn.id}`, "station:session_left", {
          stationId: stn.id,
          sessionId: stn.sessionId,
          userId: actor.id,
          remainingOccupancy: remainingCount,
        });

        realtimeServer.toRoom("stations:overview", "station:occupancy_updated", {
          stationId: stn.id,
          currentOccupancy: remainingCount,
          maxConcurrentUsers: stn.maxConcurrentUsers,
        });

        realtimeServer.toRoom(`user:${actor.id}`, "station:session_left", {
          stationId: stn.id,
          sessionId: stn.sessionId,
          userId: actor.id,
          remainingOccupancy: remainingCount,
        });
      } catch {
        // Non-blocking
      }
    }

    const remainingSessions = await this.prisma.stationSession.findMany({
      where: { userId: actor.id, isCurrent: true, leftAt: null },
      select: { stationId: true },
    });

    return {
      message: "Left station successfully",
      remainingActiveStationIds: remainingSessions.map((s) => s.stationId),
    };
  }

  /**
   * Get all active workstation sessions for the requesting user (multi-station state).
   */
  public async getActiveSessions(
    actor: AuthenticatedUser,
  ): Promise<UserStationSessionsState> {
    if (this.cacheManager) {
      const cached = await this.cacheManager.get<UserStationSessionsState>(
        `station:user_active_sessions:${actor.id}`,
      );
      if (cached) return cached;
    }

    const activeSessions = await this.prisma.stationSession.findMany({
      where: { userId: actor.id, isCurrent: true, leftAt: null },
      orderBy: { lastActiveAt: "desc" },
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

    const contexts: ActiveStationContext[] = await Promise.all(
      activeSessions
        .filter((s) => s.station && s.station.isActive && !s.station.deletedAt)
        .map(async (sess) => {
          const sanitizedStation = await sanitizeAndDecorateStation(sess.station, actor);
          const activeProfiles = sanitizedStation.activeProfiles || [];
          const activeProfileIds = activeProfiles.map((p) => p.profileId);

          const sessionItem: StationSessionItem = {
            id: sess.id,
            stationId: sess.stationId,
            userId: sess.userId,
            ipAddress: sess.ipAddress,
            deviceInfo: sess.deviceInfo,
            joinedAt: sess.joinedAt,
            lastActiveAt: sess.lastActiveAt,
            isCurrent: true,
            user: {
              id: sess.user.id,
              firstName: sess.user.firstName,
              lastName: sess.user.lastName,
              email: sess.user.email,
              avatarUrl: sess.user.avatarUrl,
            },
            station: {
              id: sess.station.id,
              code: sess.station.code,
              name: sess.station.name,
            },
          };

          return {
            session: sessionItem,
            station: sanitizedStation,
            activeProfiles,
            activeProfileIds,
          };
        }),
    );

    const activeStationIds = contexts.map((c) => c.station.id);

    // Merge and deduplicate active profiles across all joined stations
    const profileMap = new Map<string, StationProfileAssignmentItem>();
    for (const ctx of contexts) {
      for (const prof of ctx.activeProfiles) {
        if (!profileMap.has(prof.profileId)) {
          profileMap.set(prof.profileId, prof);
        }
      }
    }
    const allActiveProfiles = Array.from(profileMap.values());
    const allActiveProfileIds = allActiveProfiles.map((p) => p.profileId);

    const state: UserStationSessionsState = {
      activeSessions: contexts,
      activeStationIds,
      currentStationId: contexts[0]?.station.id || null,
      currentStation: contexts[0]?.station || null,
      allActiveProfiles,
      allActiveProfileIds,
    };

    if (this.cacheManager) {
      await this.cacheManager.set(
        `station:user_active_sessions:${actor.id}`,
        state,
        { ttlSeconds: 3600 },
      );
      if (contexts[0]) {
        await this.cacheManager.set(
          `station:user_active:${actor.id}`,
          contexts[0],
          { ttlSeconds: 3600 },
        );
      }
    }

    return state;
  }

  /**
   * Get the primary / first active station session context (for backward compatibility).
   */
  public async getActiveSession(
    actor: AuthenticatedUser,
  ): Promise<ActiveStationContext | null> {
    const state = await this.getActiveSessions(actor);
    return state.activeSessions[0] || null;
  }

  /**
   * Helper called during logout or session invalidation to clear all station sessions for a user.
   */
  public async cleanupUserSessions(userId: string) {
    const now = new Date();
    await this.prisma.stationSession.updateMany({
      where: { userId, isCurrent: true },
      data: { isCurrent: false, leftAt: now },
    });

    if (this.cacheManager) {
      await Promise.all([
        this.cacheManager.del(`station:user_active:${userId}`),
        this.cacheManager.del(`station:user_active_sessions:${userId}`),
      ]);
    }
  }
}
