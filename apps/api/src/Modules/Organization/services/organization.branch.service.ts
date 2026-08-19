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
            orderBy: [{ isPrimary: "desc" }, { assignedAt: "asc" }],
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  avatarUrl: true,
                  employeeId: true,
                  systemRole: true,
                  designation: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                    },
                  },
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
          where: { unassignedAt: null },
          orderBy: [{ isPrimary: "desc" }, { assignedAt: "asc" }],
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                employeeId: true,
                systemRole: true,
                designation: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
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

  public async createBranch(dto: CreateBranchDTO, req?: Request) {
    // Check if code is unique
    const existing = await this.prisma.branch.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictError("A branch with this code already exists.");
    }

    // If parentId is specified, ensure parent branch exists
    if (dto.parentId) {
      const parent = await this.prisma.branch.findFirst({
        where: { id: dto.parentId, deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundError("Parent Branch");
      }
    }

    const branch = await this.prisma.branch.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description?.trim(),
        email: dto.email?.trim(),
        phone: dto.phone?.trim(),
        address: dto.address?.trim(),
        logoUrl: dto.logoUrl,
        parentId: dto.parentId || null,
        isActive: dto.isActive ?? true,
      },
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
          orderBy: [{ isPrimary: "desc" }, { assignedAt: "asc" }],
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

  public async updateBranch(id: string, dto: UpdateBranchDTO, req?: Request) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, deletedAt: null },
    });
    if (!branch) throw new NotFoundError("Branch");

    // Prevent cycle in hierarchy if parentId is being updated
    if (dto.parentId !== undefined && dto.parentId !== branch.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestError("A branch cannot be its own parent.");
      }

      if (dto.parentId) {
        const parent = await this.prisma.branch.findFirst({
          where: { id: dto.parentId, deletedAt: null },
        });
        if (!parent) throw new NotFoundError("Parent Branch");

        // Verify no circular reference
        const isLoop = await this.isBranchDescendant(id, dto.parentId);
        if (isLoop) {
          throw new BadRequestError(
            "Cannot assign a descendant branch as parent (circular hierarchy detected).",
          );
        }
      }
    }

    const updated = await this.prisma.branch.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() } : {}),
        ...(dto.email !== undefined ? { email: dto.email?.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() } : {}),
        ...(dto.address !== undefined ? { address: dto.address?.trim() } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
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
          orderBy: [{ isPrimary: "desc" }, { assignedAt: "asc" }],
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
      },
    });

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "BRANCH_UPDATE",
      entityTable: "Branch",
      entityId: id,
      oldPayload: branch,
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
            subBranches: { where: { deletedAt: null } },
            departments: { where: { deletedAt: null } },
            users: { where: { deletedAt: null } },
            projects: { where: { deletedAt: null } },
          },
        },
      },
    });
    if (!branch) throw new NotFoundError("Branch");

    // Enforce relational safety before deletion
    if (
      branch._count.subBranches > 0 ||
      branch._count.departments > 0 ||
      branch._count.users > 0 ||
      branch._count.projects > 0
    ) {
      throw new BadRequestError(
        "Cannot delete branch with active child sub-branches, departments, assigned users, or projects. Reassign or remove children first.",
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

    // If marked as primary, demote other active managers of this branch
    if (dto.isPrimary) {
      await this.prisma.branchManager.updateMany({
        where: {
          branchId,
          unassignedAt: null,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const manager = await this.prisma.branchManager.create({
      data: {
        branchId,
        userId: dto.userId,
        roleTitle: dto.roleTitle || null,
        isPrimary: dto.isPrimary ?? false,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            employeeId: true,
            systemRole: true,
            designation: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
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
