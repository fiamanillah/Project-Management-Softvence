// src/Modules/Stations/services/stations.profile.service.ts

import type { PrismaClient } from "@workspace/db";
import type { CacheManager } from "@workspace/cache";
import type { Request } from "express";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/core/errors/AppError";
import { AuditLogService } from "@/core/audit/audit.service";
import { AuthorizationEngine } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type {
  CreateProfileWithStationsDTO,
  UpdateProfileWithStationsDTO,
  AssignProfileToStationsDTO,
  ProfileManagementItem,
  ProfileAssignedStation,
} from "../StationDTO";
import { realtimeServer } from "@/core/realtime/RealtimeServer";

export interface GetProfilesQuery {
  page?: number | string;
  limit?: number | string;
  search?: string;
  platformId?: string;
  stationId?: string;
  isActive?: boolean | string;
}

export class StationsProfileService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cacheManager?: CacheManager,
  ) {}

  /**
   * List platform profiles with associated workstations and metadata.
   */
  public async getProfiles(query: GetProfilesQuery): Promise<{
    items: ProfileManagementItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { username: { contains: s, mode: "insensitive" } },
        { platform: { name: { contains: s, mode: "insensitive" } } },
      ];
    }

    if (query.platformId && query.platformId !== "all") {
      where.platformId = query.platformId;
    }

    if (query.isActive !== undefined && query.isActive !== "all") {
      where.isActive = String(query.isActive) === "true";
    }

    if (query.stationId && query.stationId !== "all") {
      where.stationAssignments = {
        some: {
          stationId: query.stationId,
          unassignedAt: null,
        },
      };
    }

    const [total, profiles] = await Promise.all([
      this.prisma.profile.count({ where }),
      this.prisma.profile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          platform: true,
          stationAssignments: {
            where: { unassignedAt: null },
            include: {
              station: {
                include: {
                  branch: true,
                  department: true,
                },
              },
            },
          },
          _count: {
            select: {
              projects: { where: { deletedAt: null } },
              stationAssignments: { where: { unassignedAt: null } },
              sellers: { where: { unassignedAt: null } },
            },
          },
        },
      }),
    ]);

    const items: ProfileManagementItem[] = profiles.map((p) => {
      const assignedStations: ProfileAssignedStation[] = (p.stationAssignments || []).map((sa) => ({
        id: sa.id,
        stationId: sa.stationId,
        station: {
          id: sa.station.id,
          code: sa.station.code,
          name: sa.station.name,
          isActive: sa.station.isActive,
          branch: sa.station.branch ? { id: sa.station.branch.id, name: sa.station.branch.name } : null,
          department: sa.station.department ? { id: sa.station.department.id, name: sa.station.department.name } : null,
        },
        shift: sa.shift,
        isPrimary: sa.isPrimary,
        note: sa.note,
        assignedAt: sa.assignedAt,
      }));

      return {
        id: p.id,
        username: p.username,
        platformId: p.platformId,
        isActive: p.isActive,
        createdAt: p.createdAt,
        platform: {
          id: p.platform.id,
          code: p.platform.code,
          name: p.platform.name,
        },
        assignedStations,
        stationIds: assignedStations.map((as) => as.stationId),
        _count: p._count,
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Get single profile by ID.
   */
  public async getProfileById(id: string): Promise<ProfileManagementItem> {
    const p = await this.prisma.profile.findUnique({
      where: { id },
      include: {
        platform: true,
        stationAssignments: {
          where: { unassignedAt: null },
          include: {
            station: {
              include: {
                branch: true,
                department: true,
              },
            },
          },
        },
        _count: {
          select: {
            projects: { where: { deletedAt: null } },
            stationAssignments: { where: { unassignedAt: null } },
            sellers: { where: { unassignedAt: null } },
          },
        },
      },
    });

    if (!p) throw new NotFoundError("Profile not found");

    const assignedStations: ProfileAssignedStation[] = (p.stationAssignments || []).map((sa) => ({
      id: sa.id,
      stationId: sa.stationId,
      station: {
        id: sa.station.id,
        code: sa.station.code,
        name: sa.station.name,
        isActive: sa.station.isActive,
        branch: sa.station.branch ? { id: sa.station.branch.id, name: sa.station.branch.name } : null,
        department: sa.station.department ? { id: sa.station.department.id, name: sa.station.department.name } : null,
      },
      shift: sa.shift,
      isPrimary: sa.isPrimary,
      note: sa.note,
      assignedAt: sa.assignedAt,
    }));

    return {
      id: p.id,
      username: p.username,
      platformId: p.platformId,
      isActive: p.isActive,
      createdAt: p.createdAt,
      platform: {
        id: p.platform.id,
        code: p.platform.code,
        name: p.platform.name,
      },
      assignedStations,
      stationIds: assignedStations.map((as) => as.stationId),
      _count: p._count,
    };
  }

  /**
   * Create a new platform profile and optionally link to multiple stations.
   */
  public async createProfile(
    dto: CreateProfileWithStationsDTO,
    actor: AuthenticatedUser,
    req?: Request,
  ): Promise<ProfileManagementItem> {
    const platform = await this.prisma.platform.findUnique({
      where: { id: dto.platformId },
    });
    if (!platform) throw new NotFoundError("Selected platform not found");

    const formattedUsername = dto.username.trim();

    const existing = await this.prisma.profile.findUnique({
      where: {
        platformId_username: {
          platformId: dto.platformId,
          username: formattedUsername,
        },
      },
    });

    if (existing) {
      throw new ConflictError(`Profile '${formattedUsername}' already exists on this platform`);
    }

    const now = new Date();

    const profile = await this.prisma.$transaction(async (tx) => {
      const created = await tx.profile.create({
        data: {
          platformId: dto.platformId,
          username: formattedUsername,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
        },
      });

      // If stationIds provided, assign to each station
      if (dto.stationIds && dto.stationIds.length > 0) {
        for (const stnId of dto.stationIds) {
          await tx.stationProfileAssignment.create({
            data: {
              stationId: stnId,
              profileId: created.id,
              assignedById: actor.id,
              assignedAt: now,
            },
          });
        }
      }

      return created;
    });

    // Invalidate station caches
    if (dto.stationIds && dto.stationIds.length > 0) {
      for (const stnId of dto.stationIds) {
        await this.invalidateStationCaches(stnId);
      }
    }

    await AuditLogService.log({
      module: "STATIONS",
      action: "STATION_PROFILE_CREATED",
      entityTable: "profiles",
      entityId: profile.id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      newPayload: profile,
      metadata: { username: formattedUsername, platformId: dto.platformId, stationIds: dto.stationIds },
      req,
    });

    return this.getProfileById(profile.id);
  }

  /**
   * Update an existing profile and sync station assignments.
   */
  public async updateProfile(
    id: string,
    dto: UpdateProfileWithStationsDTO,
    actor: AuthenticatedUser,
    req?: Request,
  ): Promise<ProfileManagementItem> {
    const existing = await this.prisma.profile.findUnique({
      where: { id },
      include: {
        stationAssignments: {
          where: { unassignedAt: null },
        },
      },
    });

    if (!existing) throw new NotFoundError("Profile not found");

    const data: any = {};
    if (dto.username !== undefined) data.username = dto.username.trim();
    if (dto.platformId !== undefined) data.platformId = dto.platformId;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    // Uniqueness check if updating name or platform
    if (data.username || data.platformId) {
      const checkPlatformId = data.platformId || existing.platformId;
      const checkUsername = data.username || existing.username;

      const duplicate = await this.prisma.profile.findFirst({
        where: {
          id: { not: id },
          platformId: checkPlatformId,
          username: checkUsername,
        },
      });

      if (duplicate) {
        throw new ConflictError(`Profile '${checkUsername}' already exists on this platform`);
      }
    }

    const now = new Date();
    const affectedStationIds: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id },
        data,
      });

      // Sync station assignments if stationIds explicitly provided
      if (dto.stationIds !== undefined) {
        const currentAssignedStationIds = existing.stationAssignments.map((sa) => sa.stationId);
        const targetStationIds = dto.stationIds;

        // Unassign stations not in target
        const toRemove = currentAssignedStationIds.filter((sid) => !targetStationIds.includes(sid));
        if (toRemove.length > 0) {
          await tx.stationProfileAssignment.updateMany({
            where: {
              profileId: id,
              stationId: { in: toRemove },
              unassignedAt: null,
            },
            data: {
              unassignedAt: now,
              unassignedById: actor.id,
            },
          });
          affectedStationIds.push(...toRemove);
        }

        // Add new stations in target
        const toAdd = targetStationIds.filter((sid) => !currentAssignedStationIds.includes(sid));
        for (const sid of toAdd) {
          await tx.stationProfileAssignment.create({
            data: {
              stationId: sid,
              profileId: id,
              assignedById: actor.id,
              assignedAt: now,
            },
          });
          affectedStationIds.push(sid);
        }
      }
    });

    for (const sid of affectedStationIds) {
      await this.invalidateStationCaches(sid);
    }

    await AuditLogService.log({
      module: "STATIONS",
      action: "STATION_PROFILE_UPDATED",
      entityTable: "profiles",
      entityId: id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      metadata: { profileId: id, changes: dto },
      req,
    });

    return this.getProfileById(id);
  }

  /**
   * Delete or deactivate profile.
   */
  public async deleteProfile(
    id: string,
    actor: AuthenticatedUser,
    req?: Request,
  ): Promise<{ message: string }> {
    const existing = await this.prisma.profile.findUnique({
      where: { id },
      include: {
        stationAssignments: { where: { unassignedAt: null } },
      },
    });

    if (!existing) throw new NotFoundError("Profile not found");

    const now = new Date();
    const stationIds = existing.stationAssignments.map((sa) => sa.stationId);

    await this.prisma.$transaction([
      this.prisma.profile.update({
        where: { id },
        data: { isActive: false },
      }),
      this.prisma.stationProfileAssignment.updateMany({
        where: { profileId: id, unassignedAt: null },
        data: { unassignedAt: now, unassignedById: actor.id },
      }),
    ]);

    for (const sid of stationIds) {
      await this.invalidateStationCaches(sid);
    }

    await AuditLogService.log({
      module: "STATIONS",
      action: "STATION_PROFILE_DEACTIVATED",
      entityTable: "profiles",
      entityId: id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      req,
    });

    return { message: `Profile '${existing.username}' deactivated and unassigned from all workstations.` };
  }

  /**
   * Assign profile to multiple stations.
   */
  public async assignToStations(
    profileId: string,
    dto: AssignProfileToStationsDTO,
    actor: AuthenticatedUser,
    req?: Request,
  ): Promise<ProfileManagementItem> {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundError("Profile not found");

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      for (const stationId of dto.stationIds) {
        // Unassign duplicate active on same station
        await tx.stationProfileAssignment.updateMany({
          where: { stationId, profileId, unassignedAt: null },
          data: { unassignedAt: now, unassignedById: actor.id },
        });

        await tx.stationProfileAssignment.create({
          data: {
            stationId,
            profileId,
            assignedById: actor.id,
            assignedAt: now,
            shift: dto.shift || null,
            isPrimary: dto.isPrimary || false,
            note: dto.note || null,
          },
        });
      }
    });

    for (const stationId of dto.stationIds) {
      await this.invalidateStationCaches(stationId);
    }

    await AuditLogService.log({
      module: "STATIONS",
      action: "STATION_PROFILE_ASSIGNED_MULTIPLE",
      entityTable: "profiles",
      entityId: profileId,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      metadata: { profileId, stationIds: dto.stationIds },
      req,
    });

    return this.getProfileById(profileId);
  }

  /**
   * Remove profile from a specific station.
   */
  public async removeFromStation(
    profileId: string,
    stationId: string,
    actor: AuthenticatedUser,
    req?: Request,
  ): Promise<{ message: string }> {
    const active = await this.prisma.stationProfileAssignment.findFirst({
      where: { profileId, stationId, unassignedAt: null },
    });

    if (!active) {
      throw new NotFoundError("Active assignment between this profile and workstation was not found");
    }

    const now = new Date();

    await this.prisma.stationProfileAssignment.update({
      where: { id: active.id },
      data: { unassignedAt: now, unassignedById: actor.id },
    });

    await this.invalidateStationCaches(stationId);

    await AuditLogService.log({
      module: "STATIONS",
      action: "STATION_PROFILE_REMOVED_FROM_STATION",
      entityTable: "station_profile_assignments",
      entityId: active.id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      metadata: { profileId, stationId },
      req,
    });

    return { message: "Profile unassigned from workstation successfully" };
  }

  private async invalidateStationCaches(stationId: string) {
    if (this.cacheManager) {
      await Promise.all([
        this.cacheManager.del(`station:active_profiles:${stationId}`),
        this.cacheManager.del(`station:raw:${stationId.toLowerCase()}`),
        this.cacheManager.del(`station:detail:${stationId.toLowerCase()}`),
      ]).catch(() => {});

      // Invalidate active session caches for users on this station
      const sessions = await this.prisma.stationSession.findMany({
        where: { stationId, isCurrent: true },
        select: { userId: true },
      });
      for (const s of sessions) {
        await Promise.all([
          this.cacheManager.del(`station:user_active:${s.userId}`),
          this.cacheManager.del(`station:user_active_sessions:${s.userId}`),
        ]).catch(() => {});
      }
    }

    // Broadcast updated active profiles
    try {
      const updatedAssignments = await this.prisma.stationProfileAssignment.findMany({
        where: { stationId, unassignedAt: null },
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

      realtimeServer.toRoom(`station:${stationId}`, "station:profiles_updated", {
        stationId,
        activeProfiles: updatedAssignments as any,
      });
      realtimeServer.toRoom("stations:overview", "station:profiles_updated", {
        stationId,
        activeProfiles: updatedAssignments as any,
      });
    } catch {
      // Non-blocking
    }

    await AuthorizationEngine.getInstance().invalidateCache();
  }
}
