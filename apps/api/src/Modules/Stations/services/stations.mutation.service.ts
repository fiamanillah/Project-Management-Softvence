// src/Modules/Stations/services/stations.mutation.service.ts

import type { PrismaClient } from "@workspace/db";
import type { Request } from "express";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/core/errors/AppError";
import { AuditLogService } from "@/core/audit/audit.service";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type {
  CreateStationDTO,
  UpdateStationDTO,
  StationItem,
} from "../StationDTO";
import { StationsQueryService } from "./stations.query.service";
import { sanitizeAndDecorateStation } from "./stations.capability.helper";

export class StationsMutationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly queryService: StationsQueryService,
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

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, deletedAt: null, isActive: true },
      });
      if (!branch) {
        throw new BadRequestError("Invalid or inactive branch selected");
      }
    }

    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, deletedAt: null, isActive: true },
      });
      if (!department) {
        throw new BadRequestError("Invalid or inactive department selected");
      }
    }

    const newStation = await this.prisma.station.create({
      data: {
        code: formattedCode,
        name: dto.name.trim(),
        description: dto.description || null,
        stationTypeId: dto.stationTypeId,
        statusId: dto.statusId,
        branchId: dto.branchId || null,
        departmentId: dto.departmentId || null,
        ipWhitelist: dto.ipWhitelist || [],
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

    const data: any = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.stationTypeId !== undefined) data.stationTypeId = dto.stationTypeId;
    if (dto.statusId !== undefined) data.statusId = dto.statusId;
    if (dto.branchId !== undefined) data.branchId = dto.branchId;
    if (dto.departmentId !== undefined) data.departmentId = dto.departmentId;
    if (dto.ipWhitelist !== undefined) data.ipWhitelist = dto.ipWhitelist;
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

    return sanitizeAndDecorateStation(updated, actor);
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
