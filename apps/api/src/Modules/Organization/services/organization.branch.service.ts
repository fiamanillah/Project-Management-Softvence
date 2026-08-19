// src/Modules/Organization/services/organization.branch.service.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError, ConflictError, BadRequestError } from "@/core/errors/AppError";
import { AuditLogService } from "@/core/audit/audit.service";
import { AuthorizationEngine, can } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type { Request } from "express";
import type {
  CreateBranchDTO,
  UpdateBranchDTO,
  AssignBranchManagerDTO,
} from "../OrganizationDTO";

export class OrganizationBranchService {
  private logger = new AppLogger("OrganizationBranchService");

  constructor(private readonly prisma: PrismaClient) {}

  public async getBranchDescendantIds(branchId: string): Promise<string[]> {
    const children = await this.prisma.branch.findMany({
      where: { parentId: branchId, deletedAt: null },
      select: { id: true },
    });

    if (children.length === 0) return [];

    const childIds = children.map((c) => c.id);
    const subChildIds = await Promise.all(
      childIds.map((id) => this.getBranchDescendantIds(id)),
    );

    return [...childIds, ...subChildIds.flat()];
  }

  public async isBranchDescendant(ancestorId: string, candidateDescendantId: string): Promise<boolean> {
    const descendantIds = await this.getBranchDescendantIds(ancestorId);
    return descendantIds.includes(candidateDescendantId);
  }

  public async getBranches(
    actor?: AuthenticatedUser,
    query?: { search?: string; status?: string },
  ): Promise<any[]>;
  public async getBranches(
    actor?: AuthenticatedUser,
    query?: {
      search?: string;
      status?: string;
      page?: number | string;
      limit?: number | string;
    },
  ): Promise<any>;
  public async getBranches(
    actor?: AuthenticatedUser,
    query?: {
      search?: string;
      status?: string;
      page?: number | string;
      limit?: number | string;
    },
  ): Promise<any> {
    const whereClause: any = {
      deletedAt: null,
    };

    if (query?.status === "active") {
      whereClause.isActive = true;
    } else if (query?.status === "inactive") {
      whereClause.isActive = false;
    }

    if (query?.search) {
      whereClause.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { code: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const isPaginated = query?.page !== undefined || query?.limit !== undefined;
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, branches] = await Promise.all([
      isPaginated ? this.prisma.branch.count({ where: whereClause }) : Promise.resolve(0),
      this.prisma.branch.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
        ...(isPaginated ? { skip, take: limit } : {}),
        include: {
          parent: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          managers: {
            where: { unassignedAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              departments: true,
              subBranches: true,
              users: true,
              projects: true,
            },
          },
        },
      }),
    ]);

    const items = await Promise.all(
      branches.map(async (branch) => {
        const canManage = actor
          ? await can(actor, "organization.branch.manage", { branchId: branch.id })
          : false;
        const canDelete = actor
          ? await can(actor, "organization.branch.delete", { branchId: branch.id })
          : false;
        return {
          ...branch,
          _capabilities: {
            canEdit: canManage,
            canDelete: canDelete || canManage,
            canAssignManager: canManage,
            canCreateSubBranch: canManage,
          },
        };
      }),
    );

    if (isPaginated) {
      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrevious: page > 1,
        },
      };
    }

    return items;
  }

  public async getBranchById(id: string, actor?: AuthenticatedUser) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, deletedAt: null },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        subBranches: {
          where: { deletedAt: null },
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
        departments: {
          where: { deletedAt: null },
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
        managers: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { assignedAt: "desc" },
        },
        _count: {
          select: {
            departments: true,
            subBranches: true,
            users: true,
            projects: true,
          },
        },
      },
    });

    if (!branch) throw new NotFoundError("Branch");

    const canManage = actor
      ? await can(actor, "organization.branch.manage", { branchId: branch.id })
      : false;
    const canDelete = actor
      ? await can(actor, "organization.branch.delete", { branchId: branch.id })
      : false;

    return {
      ...branch,
      _capabilities: {
        canEdit: canManage,
        canDelete: canDelete || canManage,
        canAssignManager: canManage,
        canCreateSubBranch: canManage,
      },
    };
  }

  public async createBranch(data: CreateBranchDTO, req?: Request) {
    const existing = await this.prisma.branch.findUnique({
      where: { code: data.code },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictError(`Branch code '${data.code}' already exists`);
    }

    if (data.parentId) {
      const parent = await this.prisma.branch.findFirst({
        where: { id: data.parentId, deletedAt: null },
      });
      if (!parent) throw new NotFoundError("Parent Branch");
    }

    const branch = await this.prisma.branch.create({
      data: {
        code: data.code,
        name: data.name,
        parentId: data.parentId || null,
        description: data.description || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        logoUrl: data.logoUrl || null,
        isActive: data.isActive ?? true,
      },
      include: {
        parent: true,
      },
    });

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "BRANCH_CREATE",
      entityTable: "Branch",
      entityId: branch.id,
      oldPayload: undefined,
      newPayload: branch,
      req,
    });

    await AuthorizationEngine.getInstance().invalidateCache();

    return branch;
  }

  public async updateBranch(id: string, data: UpdateBranchDTO, req?: Request) {
    const existing = await this.prisma.branch.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundError("Branch");

    if (data.parentId !== undefined && data.parentId !== null) {
      if (data.parentId === id) {
        throw new BadRequestError("A branch cannot be its own parent.");
      }
      const isLoop = await this.isBranchDescendant(id, data.parentId);
      if (isLoop) {
        throw new BadRequestError(
          "Cannot set a descendant branch as the parent (circular hierarchy detected).",
        );
      }
      const parent = await this.prisma.branch.findFirst({
        where: { id: data.parentId, deletedAt: null },
      });
      if (!parent) throw new NotFoundError("Parent Branch");
    }

    const updated = await this.prisma.branch.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        parentId: data.parentId !== undefined ? data.parentId : undefined,
        description: data.description !== undefined ? data.description : undefined,
        email: data.email !== undefined ? data.email : undefined,
        phone: data.phone !== undefined ? data.phone : undefined,
        address: data.address !== undefined ? data.address : undefined,
        logoUrl: data.logoUrl !== undefined ? data.logoUrl : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
      include: {
        parent: true,
      },
    });

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "BRANCH_UPDATE",
      entityTable: "Branch",
      entityId: id,
      oldPayload: existing,
      newPayload: updated,
      req,
    });

    await AuthorizationEngine.getInstance().invalidateCache();

    return updated;
  }

  public async deleteBranch(id: string, req?: Request) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            subBranches: true,
            departments: true,
            users: true,
          },
        },
      },
    });
    if (!branch) throw new NotFoundError("Branch");

    if (branch._count.subBranches > 0) {
      throw new BadRequestError(
        `Cannot delete branch with ${branch._count.subBranches} active sub-branch(es). Reassign or delete them first.`,
      );
    }

    if (branch._count.departments > 0) {
      throw new BadRequestError(
        `Cannot delete branch with ${branch._count.departments} assigned department(s). Reassign or delete them first.`,
      );
    }

    // Soft delete branch
    const deleted = await this.prisma.branch.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "BRANCH_DELETE",
      entityTable: "Branch",
      entityId: id,
      oldPayload: branch,
      newPayload: deleted,
      req,
    });

    await AuthorizationEngine.getInstance().invalidateCache();

    return { message: "Branch deleted successfully" };
  }

  public async assignBranchManager(branchId: string, dto: AssignBranchManagerDTO, req?: Request) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
    });
    if (!branch) throw new NotFoundError("Branch");

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundError("User");

    // Check if user is already an active manager
    const existing = await this.prisma.branchManager.findFirst({
      where: {
        branchId,
        userId: dto.userId,
        unassignedAt: null,
      },
    });
    if (existing) {
      throw new ConflictError("User is already an active manager of this branch.");
    }

    const manager = await this.prisma.branchManager.create({
      data: {
        branchId,
        userId: dto.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "BRANCH_MANAGER_ASSIGN",
      entityTable: "BranchManager",
      entityId: manager.id,
      oldPayload: undefined,
      newPayload: manager,
      req,
    });

    await AuthorizationEngine.getInstance().invalidateCache();

    return manager;
  }

  public async removeBranchManager(branchId: string, managerId: string, req?: Request) {
    const manager = await this.prisma.branchManager.findFirst({
      where: { id: managerId, branchId },
      include: { user: true },
    });
    if (!manager) throw new NotFoundError("Branch Manager");

    if (manager.unassignedAt) {
      throw new BadRequestError("Manager is already unassigned.");
    }

    const updated = await this.prisma.branchManager.update({
      where: { id: managerId },
      data: { unassignedAt: new Date() },
    });

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "BRANCH_MANAGER_REMOVE",
      entityTable: "BranchManager",
      entityId: managerId,
      oldPayload: manager,
      newPayload: updated,
      req,
    });

    await AuthorizationEngine.getInstance().invalidateCache();

    return { message: "Branch manager removed successfully" };
  }
}
