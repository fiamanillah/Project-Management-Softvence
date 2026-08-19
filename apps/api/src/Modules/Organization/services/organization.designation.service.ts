// src/Modules/Organization/services/organization.designation.service.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError, ConflictError, BadRequestError } from "@/core/errors/AppError";
import { AuditLogService } from "@/core/audit/audit.service";
import { can } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type { Request } from "express";
import type {
  CreateDesignationDTO,
  UpdateDesignationDTO,
} from "../OrganizationDTO";

export class OrganizationDesignationService {
  private logger = new AppLogger("OrganizationDesignationService");

  constructor(private readonly prisma: PrismaClient) {}

  public async getDesignations(actor?: AuthenticatedUser) {
    const designations = await this.prisma.designation.findMany({
      orderBy: { hierarchyLevel: "asc" },
      include: {
        department: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return Promise.all(
      designations.map(async (desig) => {
        const canManage = actor
          ? await can(actor, "organization.designation.manage", { departmentId: desig.departmentId ?? undefined })
          : false;
        return {
          ...desig,
          _capabilities: {
            canEdit: canManage,
            canDelete: canManage,
          },
        };
      }),
    );
  }

  public async getDesignationById(id: string, actor?: AuthenticatedUser) {
    const designation = await this.prisma.designation.findUnique({
      where: { id },
      include: {
        department: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
    if (!designation) throw new NotFoundError("Designation");

    const canManage = actor
      ? await can(actor, "organization.designation.manage", { departmentId: designation.departmentId ?? undefined })
      : false;

    return {
      ...designation,
      _capabilities: {
        canEdit: canManage,
        canDelete: canManage,
      },
    };
  }

  public async createDesignation(data: CreateDesignationDTO, req?: Request) {
    const existing = await this.prisma.designation.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new ConflictError(`Designation code '${data.code}' already exists`);
    }

    if (data.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!dept) throw new NotFoundError("Department");
    }

    const desig = await this.prisma.designation.create({
      data: {
        code: data.code,
        name: data.name,
        departmentId: data.departmentId ?? null,
        hierarchyLevel: data.hierarchyLevel ?? 1,
        isLeadership: data.isLeadership ?? false,
        isActive: data.isActive ?? true,
      },
      include: {
        department: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "DESIGNATION_CREATE",
      entityTable: "Designation",
      entityId: desig.id,
      oldPayload: undefined,
      newPayload: desig,
      req,
    });

    return desig;
  }

  public async updateDesignation(
    designationId: string,
    data: UpdateDesignationDTO,
    req?: Request,
  ) {
    const existing = await this.prisma.designation.findUnique({
      where: { id: designationId },
    });
    if (!existing) throw new NotFoundError("Designation");

    if (data.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!dept) throw new NotFoundError("Department");
    }

    const updated = await this.prisma.designation.update({
      where: { id: designationId },
      data: {
        name: data.name ?? undefined,
        departmentId: data.departmentId !== undefined ? data.departmentId : undefined,
        hierarchyLevel: data.hierarchyLevel ?? undefined,
        isLeadership: data.isLeadership !== undefined ? data.isLeadership : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
      include: {
        department: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "DESIGNATION_UPDATE",
      entityTable: "Designation",
      entityId: designationId,
      oldPayload: existing,
      newPayload: updated,
      req,
    });

    return updated;
  }

  public async deleteDesignation(designationId: string, req?: Request) {
    const existing = await this.prisma.designation.findUnique({
      where: { id: designationId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
    if (!existing) throw new NotFoundError("Designation");

    if (existing._count.users > 0) {
      throw new BadRequestError(
        `Cannot delete designation assigned to ${existing._count.users} active user(s). Reassign them first.`,
      );
    }

    await this.prisma.designation.delete({
      where: { id: designationId },
    });

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "DESIGNATION_DELETE",
      entityTable: "Designation",
      entityId: designationId,
      oldPayload: existing,
      newPayload: undefined,
      req,
    });

    return { message: "Designation deleted successfully" };
  }
}
