// src/Modules/Stations/services/stations.lookup.service.ts

import type { PrismaClient } from "@workspace/db";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/core/errors/AppError";
import type {
  CreateStationTypeDTO,
  UpdateStationTypeDTO,
  CreateStationStatusDTO,
  UpdateStationStatusDTO,
  CreateStationRoleDTO,
  UpdateStationRoleDTO,
} from "../StationDTO";

export class StationsLookupService {
  constructor(private readonly prisma: PrismaClient) {}

  // ==========================================
  // STATION TYPES
  // ==========================================

  public async getStationTypes() {
    return this.prisma.stationType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { stations: { where: { deletedAt: null } } } },
      },
    });
  }

  public async createStationType(dto: CreateStationTypeDTO) {
    const formattedCode = dto.code.toUpperCase().trim();
    const existing = await this.prisma.stationType.findUnique({
      where: { code: formattedCode },
    });
    if (existing) {
      throw new ConflictError(`Station type with code '${formattedCode}' already exists`);
    }

    return this.prisma.stationType.create({
      data: {
        code: formattedCode,
        name: dto.name.trim(),
        description: dto.description || null,
        isSales: dto.isSales !== undefined ? dto.isSales : true,
        sortOrder: dto.sortOrder || 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  public async updateStationType(id: string, dto: UpdateStationTypeDTO) {
    const existing = await this.prisma.stationType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Station type not found");

    return this.prisma.stationType.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description : undefined,
        isSales: dto.isSales !== undefined ? dto.isSales : undefined,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
    });
  }

  // ==========================================
  // STATION STATUS LOOKUPS
  // ==========================================

  public async getStationStatuses() {
    return this.prisma.stationStatusLookup.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { stations: { where: { deletedAt: null } } } },
      },
    });
  }

  public async createStationStatus(dto: CreateStationStatusDTO) {
    const formattedCode = dto.code.toUpperCase().trim();
    const existing = await this.prisma.stationStatusLookup.findUnique({
      where: { code: formattedCode },
    });
    if (existing) {
      throw new ConflictError(`Station status with code '${formattedCode}' already exists`);
    }

    return this.prisma.stationStatusLookup.create({
      data: {
        code: formattedCode,
        name: dto.name.trim(),
        isOperational: dto.isOperational !== undefined ? dto.isOperational : true,
        isMaintenance: dto.isMaintenance !== undefined ? dto.isMaintenance : false,
        color: dto.color || null,
        sortOrder: dto.sortOrder || 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  public async updateStationStatus(id: string, dto: UpdateStationStatusDTO) {
    const existing = await this.prisma.stationStatusLookup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Station status lookup not found");

    return this.prisma.stationStatusLookup.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        isOperational: dto.isOperational !== undefined ? dto.isOperational : undefined,
        isMaintenance: dto.isMaintenance !== undefined ? dto.isMaintenance : undefined,
        color: dto.color !== undefined ? dto.color : undefined,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
    });
  }

  // ==========================================
  // STATION ASSIGNMENT ROLES
  // ==========================================

  public async getStationRoles() {
    return this.prisma.stationAssignmentRole.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { assignments: { where: { unassignedAt: null } } } },
      },
    });
  }

  public async createStationRole(dto: CreateStationRoleDTO) {
    const formattedCode = dto.code.toUpperCase().trim();
    const existing = await this.prisma.stationAssignmentRole.findUnique({
      where: { code: formattedCode },
    });
    if (existing) {
      throw new ConflictError(`Station role with code '${formattedCode}' already exists`);
    }

    return this.prisma.stationAssignmentRole.create({
      data: {
        code: formattedCode,
        name: dto.name.trim(),
        canManageProfiles: dto.canManageProfiles !== undefined ? dto.canManageProfiles : false,
        canOperate: dto.canOperate !== undefined ? dto.canOperate : true,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  public async updateStationRole(id: string, dto: UpdateStationRoleDTO) {
    const existing = await this.prisma.stationAssignmentRole.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Station role not found");

    return this.prisma.stationAssignmentRole.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        canManageProfiles: dto.canManageProfiles !== undefined ? dto.canManageProfiles : undefined,
        canOperate: dto.canOperate !== undefined ? dto.canOperate : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
    });
  }
}
