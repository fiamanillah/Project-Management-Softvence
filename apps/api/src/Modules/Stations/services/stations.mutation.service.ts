import type { PrismaClient } from "@workspace/db";
import type { CacheManager } from "@workspace/cache";
import type { Request } from "express";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  AuthorizationError,
} from "@/core/errors/AppError";
import { AuditLogService } from "@/core/audit/audit.service";
import { AuthorizationEngine, can } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import {
  CreateStationDTO,
  UpdateStationDTO,
  StationItem,
  normalizeMacAddress,
} from "../StationDTO";
import { StationsQueryService } from "./stations.query.service";
import { sanitizeAndDecorateStation } from "./stations.capability.helper";
import { realtimeServer } from "@/core/realtime/RealtimeServer";

export class StationsMutationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly queryService: StationsQueryService,
    private readonly cacheManager?: CacheManager,
  ) {}

  /**
   * Create a new sales station (Rules BE-11, BE-13).
   */
  public async createStation(
    dto: CreateStationDTO,
    actor: AuthenticatedUser,
    req?: Request,
  ): Promise<StationItem> {
    const formattedCode = dto.code.toUpperCase().trim();

    // Check code uniqueness
    const existing = await this.prisma.station.findFirst({
      where: { code: formattedCode, deletedAt: null },
    });

    if (existing) {
      throw new ConflictError(`A station with code '${formattedCode}' already exists`);
    }

    // Verify lookup references
    const [stationType, status] = await Promise.all([
      this.prisma.stationType.findUnique({ where: { id: dto.stationTypeId } }),
      this.prisma.stationStatusLookup.findUnique({ where: { id: dto.statusId } }),
    ]);

    if (!stationType || !stationType.isActive) {
      throw new BadRequestError("Invalid or inactive station type selected");
    }

    if (!status || !status.isActive) {
      throw new BadRequestError("Invalid or inactive station status selected");
    }

    let effectiveBranchId = dto.branchId || null;
    let effectiveDepartmentId = dto.departmentId || null;

    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, deletedAt: null, isActive: true },
      });
      if (!department) {
        throw new BadRequestError("Invalid or inactive department selected");
      }
      if (department.branchId) {
        if (effectiveBranchId && effectiveBranchId !== department.branchId) {
          throw new BadRequestError("Selected department does not belong to the specified branch");
        }
        effectiveBranchId = department.branchId;
      }
    }

    if (effectiveBranchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: effectiveBranchId, deletedAt: null, isActive: true },
      });
      if (!branch) {
        throw new BadRequestError("Invalid or inactive branch selected");
      }
    }

    // Evaluate scoped authorization (Rule BE-1)
    const isAllowed = await can(actor, "station.manage", {
      branchId: effectiveBranchId || undefined,
      departmentId: effectiveDepartmentId || undefined,
    });
    if (!isAllowed) {
      throw new AuthorizationError(
        "You do not have permission to manage workstations in the specified branch or department",
      );
    }

    const newStation = await this.prisma.station.create({
      data: {
        code: formattedCode,
        name: dto.name.trim(),
        description: dto.description || null,
        stationTypeId: dto.stationTypeId,
        statusId: dto.statusId,
        branchId: effectiveBranchId,
        departmentId: effectiveDepartmentId,
        isIpRestricted: dto.isIpRestricted !== undefined ? dto.isIpRestricted : false,
        ipWhitelist: (dto.ipWhitelist || []).map((ip) => ip.trim()).filter(Boolean),
        isMacRestricted: dto.isMacRestricted !== undefined ? dto.isMacRestricted : false,
        macWhitelist: (dto.macWhitelist || [])
          .map((m) => normalizeMacAddress(m.trim()))
          .filter(Boolean),
        macAddress: dto.macAddress || null,
        maxConcurrentUsers: dto.maxConcurrentUsers || 1,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        stationType: true,
        status: true,
        branch: true,
        department: true,
      },
    });

    await AuditLogService.log({
      module: "STATIONS",
      action: "STATION_CREATED",
      entityTable: "stations",
      entityId: newStation.id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      newPayload: newStation,
      req,
    });

    return sanitizeAndDecorateStation(newStation, actor);
  }

  /**
   * Update an existing station.
   */
  public async updateStation(
    id: string,
    dto: UpdateStationDTO,
    actor: AuthenticatedUser,
    req?: Request,
  ): Promise<StationItem> {
    const existing = await this.prisma.station.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError("Station not found");
    }

    // Scoped check for existing station
    const canManageExisting = await can(actor, "station.manage", {
      stationId: existing.id,
      branchId: existing.branchId || undefined,
      departmentId: existing.departmentId || undefined,
    });
    if (!canManageExisting) {
      throw new AuthorizationError("You do not have permission to modify this workstation");
    }

    // Scoped check for target branch/department if changing
    if (dto.branchId !== undefined || dto.departmentId !== undefined) {
      const targetBranchId = dto.branchId !== undefined ? dto.branchId : existing.branchId;
      const targetDeptId = dto.departmentId !== undefined ? dto.departmentId : existing.departmentId;

      if (targetDeptId) {
        const dept = await this.prisma.department.findFirst({
          where: { id: targetDeptId, deletedAt: null, isActive: true },
        });
        if (!dept) throw new BadRequestError("Invalid department selected");
        if (targetBranchId && dept.branchId && dept.branchId !== targetBranchId) {
          throw new BadRequestError("Selected department does not belong to the specified branch");
        }
      }

      const canManageTarget = await can(actor, "station.manage", {
        branchId: targetBranchId || undefined,
        departmentId: targetDeptId || undefined,
      });
      if (!canManageTarget) {
        throw new AuthorizationError(
          "You do not have permission to move this workstation to the specified branch or department",
        );
      }
    }

    const data: any = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.stationTypeId !== undefined) data.stationTypeId = dto.stationTypeId;
    if (dto.statusId !== undefined) data.statusId = dto.statusId;
    if (dto.branchId !== undefined) data.branchId = dto.branchId;
    if (dto.departmentId !== undefined) data.departmentId = dto.departmentId;
    if (dto.isIpRestricted !== undefined) data.isIpRestricted = dto.isIpRestricted;
    if (dto.ipWhitelist !== undefined) {
      data.ipWhitelist = dto.ipWhitelist.map((ip) => ip.trim()).filter(Boolean);
    }
    if (dto.isMacRestricted !== undefined) data.isMacRestricted = dto.isMacRestricted;
    if (dto.macWhitelist !== undefined) {
      data.macWhitelist = dto.macWhitelist
        .map((m) => normalizeMacAddress(m.trim()))
        .filter(Boolean);
    }
    if (dto.macAddress !== undefined) data.macAddress = dto.macAddress;
    if (dto.maxConcurrentUsers !== undefined) data.maxConcurrentUsers = dto.maxConcurrentUsers;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (dto.code !== undefined) {
      const formattedCode = dto.code.toUpperCase().trim();
      if (formattedCode !== existing.code) {
        const duplicate = await this.prisma.station.findFirst({
          where: { code: formattedCode, deletedAt: null, id: { not: id } },
        });
        if (duplicate) {
          throw new ConflictError(`A station with code '${formattedCode}' already exists`);
        }
        data.code = formattedCode;
      }
    }

    const updated = await this.prisma.station.update({
      where: { id },
      data,
      include: {
        stationType: true,
        status: true,
        branch: true,
        department: true,
        stationProfiles: {
          where: { unassignedAt: null },
          include: { profile: { include: { platform: true } }, assignedBy: true },
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

    // Invalidate Redis session cache & bump auth cache when active status or security restrictions change
    const isSecurityChanged =
      dto.isActive !== undefined ||
      dto.isIpRestricted !== undefined ||
      dto.ipWhitelist !== undefined ||
      dto.isMacRestricted !== undefined ||
      dto.macWhitelist !== undefined;

    if (isSecurityChanged) {
      if (dto.isActive === false) {
        await this.prisma.stationSession.updateMany({
          where: { stationId: id, isCurrent: true },
          data: { isCurrent: false, leftAt: new Date() },
        });
      }

      if (this.cacheManager && updated.sessions.length > 0) {
        for (const session of updated.sessions) {
          await this.cacheManager.del(`station:user_active:${session.userId}`);
          await this.cacheManager.del(`station:user_active_sessions:${session.userId}`);
        }
      }

      await AuthorizationEngine.getInstance().invalidateCache();
    }

    // Invalidate station cache
    await this.queryService.invalidateStation(id, existing.code);
    if (dto.code && dto.code !== existing.code) {
      await this.queryService.invalidateStation(id, dto.code);
    }
    if (updated.assignedUsers) {
      for (const u of updated.assignedUsers) {
        await this.queryService.invalidateUserAssigned(u.userId);
      }
    }

    const decorated = await sanitizeAndDecorateStation(updated, actor);

    // Broadcast real-time station update
    try {
      realtimeServer.toRoom(`station:${id}`, "station:updated", {
        stationId: id,
        station: decorated,
      });
      realtimeServer.toRoom("stations:overview", "station:updated", {
        stationId: id,
        station: decorated,
      });
    } catch {
      // Non-blocking
    }

    await AuditLogService.log({
      module: "STATIONS",
      action: "STATION_UPDATED",
      entityTable: "stations",
      entityId: id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      oldPayload: existing,
      newPayload: updated,
      req,
    });

    return decorated;
  }

  /**
   * Soft-delete a station (Rule BE-13: No hard deletes).
   */
  public async deleteStation(
    id: string,
    actor: AuthenticatedUser,
    req?: Request,
  ): Promise<{ message: string }> {
    const existing = await this.prisma.station.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError("Station not found");
    }

    const now = new Date();

    // Query active sessions before termination
    const activeSessions = await this.prisma.stationSession.findMany({
      where: { stationId: id, isCurrent: true },
      select: { userId: true },
    });

    await this.prisma.$transaction([
      // Soft-delete station
      this.prisma.station.update({
        where: { id },
        data: { deletedAt: now, isActive: false },
      }),
      // Terminate any active sessions on this station
      this.prisma.stationSession.updateMany({
        where: { stationId: id, isCurrent: true },
        data: { isCurrent: false, leftAt: now },
      }),
    ]);

    if (this.cacheManager && activeSessions.length > 0) {
      for (const s of activeSessions) {
        await this.cacheManager.del(`station:user_active:${s.userId}`);
        await this.cacheManager.del(`station:user_active_sessions:${s.userId}`);
      }
    }

    await this.queryService.invalidateStation(id, existing.code);
    await AuthorizationEngine.getInstance().invalidateCache();

    // Broadcast station deletion / deactivation
    try {
      realtimeServer.toRoom(`station:${id}`, "station:updated", {
        stationId: id,
        station: { ...existing, isActive: false, deletedAt: now } as any,
      });
      realtimeServer.toRoom("stations:overview", "station:updated", {
        stationId: id,
        station: { ...existing, isActive: false, deletedAt: now } as any,
      });
      realtimeServer.toRoom("stations:overview", "station:occupancy_updated", {
        stationId: id,
        currentOccupancy: 0,
        maxConcurrentUsers: existing.maxConcurrentUsers,
      });
    } catch {
      // Non-blocking
    }

    await AuditLogService.log({
      module: "STATIONS",
      action: "STATION_DELETED",
      entityTable: "stations",
      entityId: id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      oldPayload: existing,
      req,
    });

    return { message: "Station deleted successfully" };
  }
}
