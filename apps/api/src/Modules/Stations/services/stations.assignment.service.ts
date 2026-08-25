// src/Modules/Stations/services/stations.assignment.service.ts

import type { PrismaClient } from "@workspace/db";
import type { CacheManager } from "@workspace/cache";
import type { Request } from "express";
import {
  BadRequestError,
  NotFoundError,
} from "@/core/errors/AppError";
import { AuditLogService } from "@/core/audit/audit.service";
import { AuthorizationEngine } from "@/core/authorization/AuthorizationEngine";
import { publishNotification } from "@workspace/message-broker";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type {
  AssignStationUserDTO,
  AssignStationProfileDTO,
  ReassignProfileDTO,
  StationProfileAssignmentItem,
  StationUserAssignmentItem,
} from "../StationDTO";

export class StationsAssignmentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cacheManager?: CacheManager,
  ) {}

  /**
   * Assign or update a user operator on a station.
   */
  public async assignUser(
    stationId: string,
    dto: AssignStationUserDTO,
    actor: AuthenticatedUser,
    req?: Request,
  ): Promise<StationUserAssignmentItem> {
    const [station, user, role] = await Promise.all([
      this.prisma.station.findFirst({ where: { id: stationId, deletedAt: null } }),
      this.prisma.user.findFirst({ where: { id: dto.userId, deletedAt: null, isActive: true } }),
      this.prisma.stationAssignmentRole.findFirst({ where: { id: dto.roleId, isActive: true } }),
    ]);

    if (!station) throw new NotFoundError("Station not found");
    if (!user) throw new NotFoundError("User not found or account is inactive");
    if (!role) throw new BadRequestError("Invalid station assignment role selected");

    const now = new Date();

    const assignment = await this.prisma.$transaction(async (tx) => {
      // Unassign any existing active assignment for this user on this station
      await tx.stationUserAssignment.updateMany({
        where: { stationId, userId: dto.userId, unassignedAt: null },
        data: { unassignedAt: now, unassignedById: actor.id },
      });

      return tx.stationUserAssignment.create({
        data: {
          stationId,
          userId: dto.userId,
          roleId: dto.roleId,
          assignedById: actor.id,
          assignedAt: now,
          shift: dto.shift || null,
          note: dto.note || null,
        },
        include: {
          user: true,
          role: true,
        },
      });
    });

    await this.invalidateStationCaches(stationId, dto.userId);

    await AuditLogService.log({
      module: "STATIONS",
      action: "STATION_USER_ASSIGNED",
      entityTable: "station_user_assignments",
      entityId: assignment.id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      newPayload: assignment,
      metadata: { stationId, userId: dto.userId, role: role.name },
      req,
    });

    return {
      id: assignment.id,
      stationId: assignment.stationId,
      userId: assignment.userId,
      roleId: assignment.roleId,
      assignedById: assignment.assignedById,
      assignedAt: assignment.assignedAt,
      shift: assignment.shift,
      note: assignment.note,
      user: {
        id: assignment.user.id,
        firstName: assignment.user.firstName,
        lastName: assignment.user.lastName,
        email: assignment.user.email,
        avatarUrl: assignment.user.avatarUrl,
        systemRole: assignment.user.systemRole,
      },
      role: {
        id: assignment.role.id,
        code: assignment.role.code,
        name: assignment.role.name,
        canManageProfiles: assignment.role.canManageProfiles,
        canOperate: assignment.role.canOperate,
      },
    };
  }

  /**
   * Unassign a user operator from a station.
   */
  public async unassignUser(
    stationId: string,
    userId: string,
    actor: AuthenticatedUser,
    req?: Request,
  ): Promise<{ message: string }> {
    const active = await this.prisma.stationUserAssignment.findFirst({
      where: { stationId, userId, unassignedAt: null },
    });

    if (!active) {
      throw new NotFoundError("Active user assignment not found on this station");
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.stationUserAssignment.update({
        where: { id: active.id },
        data: { unassignedAt: now, unassignedById: actor.id },
      }),
      // Terminate any active session on this station for this user
      this.prisma.stationSession.updateMany({
        where: { stationId, userId, isCurrent: true },
        data: { isCurrent: false, leftAt: now },
      }),
    ]);

    await this.invalidateStationCaches(stationId, userId);

    await AuditLogService.log({
      module: "STATIONS",
      action: "STATION_USER_UNASSIGNED",
      entityTable: "station_user_assignments",
      entityId: active.id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      metadata: { stationId, userId },
      req,
    });

    return { message: "User unassigned from station successfully" };
  }

  /**
   * Assign a platform profile to a station.
   */
  public async assignProfile(
    stationId: string,
    dto: AssignStationProfileDTO,
    actor: AuthenticatedUser,
    req?: Request,
  ): Promise<StationProfileAssignmentItem> {
    const [station, profile] = await Promise.all([
      this.prisma.station.findFirst({ where: { id: stationId, deletedAt: null } }),
      this.prisma.profile.findFirst({ where: { id: dto.profileId, isActive: true } }),
    ]);

    if (!station) throw new NotFoundError("Station not found");
    if (!profile) throw new NotFoundError("Platform profile not found or inactive");

    const now = new Date();

    const assignment = await this.prisma.$transaction(async (tx) => {
      // Unassign any existing active assignment for this profile on this station
      await tx.stationProfileAssignment.updateMany({
        where: { stationId, profileId: dto.profileId, unassignedAt: null },
        data: { unassignedAt: now, unassignedById: actor.id },
      });

      return tx.stationProfileAssignment.create({
        data: {
          stationId,
          profileId: dto.profileId,
          assignedById: actor.id,
          assignedAt: now,
          shift: dto.shift || null,
          isPrimary: dto.isPrimary || false,
          note: dto.note || null,
        },
        include: {
          profile: {
            include: {
              platform: true,
              _count: { select: { projects: { where: { deletedAt: null } } } },
            },
          },
          assignedBy: true,
        },
      });
    });

    await this.invalidateStationCaches(stationId);

    await AuditLogService.log({
      module: "STATIONS",
      action: "STATION_PROFILE_ASSIGNED",
      entityTable: "station_profile_assignments",
      entityId: assignment.id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      newPayload: assignment,
      metadata: { stationId, profileId: dto.profileId },
      req,
    });

    try {
      await publishNotification({
        recipientId: actor.id,
        type: "Mention",
        title: "Station Profile Assigned",
        body: `Profile ${profile.username} assigned to station ${station.name}`,
        entityType: "Station",
        entityId: stationId,
      });
    } catch {
      // Non-blocking notification failure
    }

    return {
      id: assignment.id,
      stationId: assignment.stationId,
      profileId: assignment.profileId,
      assignedById: assignment.assignedById,
      assignedAt: assignment.assignedAt,
      shift: assignment.shift,
      isPrimary: assignment.isPrimary,
      note: assignment.note,
      profile: {
        id: assignment.profile.id,
        username: assignment.profile.username,
        isActive: assignment.profile.isActive,
        platform: assignment.profile.platform
          ? {
              id: assignment.profile.platform.id,
              code: assignment.profile.platform.code,
              name: assignment.profile.platform.name,
            }
          : null,
        _count: assignment.profile._count,
      },
      assignedBy: {
        id: assignment.assignedBy.id,
        firstName: assignment.assignedBy.firstName,
        lastName: assignment.assignedBy.lastName,
        email: assignment.assignedBy.email,
      },
    };
  }

  /**
   * Unassign a platform profile from a station.
   */
  public async unassignProfile(
    stationId: string,
    profileId: string,
    actor: AuthenticatedUser,
    req?: Request,
  ): Promise<{ message: string }> {
    const active = await this.prisma.stationProfileAssignment.findFirst({
      where: { stationId, profileId, unassignedAt: null },
    });

    if (!active) {
      throw new NotFoundError("Active profile assignment not found on this station");
    }

    const now = new Date();

    await this.prisma.stationProfileAssignment.update({
      where: { id: active.id },
      data: { unassignedAt: now, unassignedById: actor.id },
    });

    await this.invalidateStationCaches(stationId);

    await AuditLogService.log({
      module: "STATIONS",
      action: "STATION_PROFILE_UNASSIGNED",
      entityTable: "station_profile_assignments",
      entityId: active.id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      metadata: { stationId, profileId },
      req,
    });

    return { message: "Profile unassigned from station successfully" };
  }

  /**
   * Atomically reassign/transfer a profile from Station A to Station B (Rule BE-10).
   */
  public async reassignProfile(
    dto: ReassignProfileDTO,
    actor: AuthenticatedUser,
    req?: Request,
  ): Promise<{ message: string; assignment: StationProfileAssignmentItem }> {
    if (dto.fromStationId === dto.toStationId) {
      throw new BadRequestError("Source and target stations cannot be the same");
    }

    const [fromStation, toStation, profile] = await Promise.all([
      this.prisma.station.findFirst({ where: { id: dto.fromStationId, deletedAt: null } }),
      this.prisma.station.findFirst({ where: { id: dto.toStationId, deletedAt: null } }),
      this.prisma.profile.findFirst({ where: { id: dto.profileId, isActive: true } }),
    ]);

    if (!fromStation) throw new NotFoundError("Source station not found");
    if (!toStation) throw new NotFoundError("Target station not found");
    if (!profile) throw new NotFoundError("Profile not found");

    const now = new Date();

    const newAssignment = await this.prisma.$transaction(async (tx) => {
      // 1. Unassign from old station
      await tx.stationProfileAssignment.updateMany({
        where: {
          stationId: dto.fromStationId,
          profileId: dto.profileId,
          unassignedAt: null,
        },
        data: {
          unassignedAt: now,
          unassignedById: actor.id,
        },
      });

      // 2. Also unassign if active on target station already to avoid duplicates
      await tx.stationProfileAssignment.updateMany({
        where: {
          stationId: dto.toStationId,
          profileId: dto.profileId,
          unassignedAt: null,
        },
        data: {
          unassignedAt: now,
          unassignedById: actor.id,
        },
      });

      // 3. Create new active assignment
      return tx.stationProfileAssignment.create({
        data: {
          stationId: dto.toStationId,
          profileId: dto.profileId,
          assignedById: actor.id,
          assignedAt: now,
          shift: dto.shift || null,
          isPrimary: dto.isPrimary || false,
          note: dto.note || `Reassigned from ${fromStation.name}`,
        },
        include: {
          profile: {
            include: {
              platform: true,
              _count: { select: { projects: { where: { deletedAt: null } } } },
            },
          },
          assignedBy: true,
        },
      });
    });

    // Invalidate caches for both stations
    await this.invalidateStationCaches(dto.fromStationId);
    await this.invalidateStationCaches(dto.toStationId);

    await AuditLogService.log({
      module: "STATIONS",
      action: "STATION_PROFILE_REASSIGNED",
      entityTable: "station_profile_assignments",
      entityId: newAssignment.id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      metadata: {
        profileId: dto.profileId,
        fromStationId: dto.fromStationId,
        toStationId: dto.toStationId,
        fromStationName: fromStation.name,
        toStationName: toStation.name,
      },
      req,
    });

    const item: StationProfileAssignmentItem = {
      id: newAssignment.id,
      stationId: newAssignment.stationId,
      profileId: newAssignment.profileId,
      assignedById: newAssignment.assignedById,
      assignedAt: newAssignment.assignedAt,
      shift: newAssignment.shift,
      isPrimary: newAssignment.isPrimary,
      note: newAssignment.note,
      profile: {
        id: newAssignment.profile.id,
        username: newAssignment.profile.username,
        isActive: newAssignment.profile.isActive,
        platform: newAssignment.profile.platform
          ? {
              id: newAssignment.profile.platform.id,
              code: newAssignment.profile.platform.code,
              name: newAssignment.profile.platform.name,
            }
          : null,
        _count: newAssignment.profile._count,
      },
      assignedBy: {
        id: newAssignment.assignedBy.id,
        firstName: newAssignment.assignedBy.firstName,
        lastName: newAssignment.assignedBy.lastName,
        email: newAssignment.assignedBy.email,
      },
    };

    return {
      message: `Profile '${profile.username}' reassigned to '${toStation.name}' successfully`,
      assignment: item,
    };
  }

  /**
   * Centralized cache invalidation for stations and permissions.
   */
  private async invalidateStationCaches(stationId: string, userId?: string) {
    if (this.cacheManager) {
      await Promise.all([
        this.cacheManager.del(`station:active_profiles:${stationId}`),
        this.cacheManager.del(`station:raw:${stationId.toLowerCase()}`),
        this.cacheManager.del(`station:detail:${stationId.toLowerCase()}`),
      ]).catch(() => {});

      if (userId) {
        await Promise.all([
          this.cacheManager.del(`station:user_active:${userId}`),
          this.cacheManager.del(`station:user_active_sessions:${userId}`),
          this.cacheManager.del(`station:user_assigned:raw:${userId}`),
        ]).catch(() => {});
      }
    }
    // Bump global permission version so any scoped grants refresh
    await AuthorizationEngine.getInstance().invalidateCache();
  }
}
