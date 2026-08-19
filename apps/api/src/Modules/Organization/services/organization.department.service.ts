// src/Modules/Organization/services/organization.department.service.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError, ConflictError, BadRequestError } from "@/core/errors/AppError";
import { AuditLogService } from "@/core/audit/audit.service";
import { AuthorizationEngine, can } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type { Request } from "express";
import type {
  CreateDepartmentDTO,
  UpdateDepartmentDTO,
  AssignDepartmentManagerDTO,
} from "../OrganizationDTO";

export class OrganizationDepartmentService {
  private logger = new AppLogger("OrganizationDepartmentService");

  constructor(private readonly prisma: PrismaClient) {}

  public async getDepartmentDescendantIds(departmentId: string): Promise<string[]> {
    const children = await this.prisma.department.findMany({
      where: { parentId: departmentId, deletedAt: null },
      select: { id: true },
    });

    if (children.length === 0) return [];

    const childIds = children.map((c) => c.id);
    const subChildIds = await Promise.all(
      childIds.map((id) => this.getDepartmentDescendantIds(id)),
    );

    return [...childIds, ...subChildIds.flat()];
  }

  public async isDescendant(ancestorId: string, candidateDescendantId: string): Promise<boolean> {
    const descendantIds = await this.getDepartmentDescendantIds(ancestorId);
    return descendantIds.includes(candidateDescendantId);
  }

  public async getDepartments(
    actor?: AuthenticatedUser,
    query?: { branchId?: string; status?: string; search?: string },
  ): Promise<any[]>;
  public async getDepartments(
    actor?: AuthenticatedUser,
    query?: {
      branchId?: string;
      status?: string;
      search?: string;
      page?: number | string;
      limit?: number | string;
    },
  ): Promise<any>;
  public async getDepartments(
    actor?: AuthenticatedUser,
    query?: {
      branchId?: string;
      status?: string;
      search?: string;
      page?: number | string;
      limit?: number | string;
    },
  ): Promise<any> {
    const whereClause: any = {
      deletedAt: null,
    };

    if (query?.branchId) {
      whereClause.branchId = query.branchId;
    }

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

    const [total, departments] = await Promise.all([
      isPaginated ? this.prisma.department.count({ where: whereClause }) : Promise.resolve(0),
      this.prisma.department.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
        ...(isPaginated ? { skip, take: limit } : {}),
        include: {
          branch: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
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
              roles: true,
              designations: true,
              teams: true,
              subDepartments: true,
            },
          },
        },
      }),
    ]);

    const items = await Promise.all(
      departments.map(async (dept) => {
        const canManage = actor
          ? await can(actor, "organization.department.manage", { departmentId: dept.id })
          : false;
        return {
          ...dept,
          _capabilities: {
            canEdit: canManage,
            canDelete: canManage,
            canAssignManager: canManage,
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

  public async getDepartmentById(id: string, actor?: AuthenticatedUser) {
    const department = await this.prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: {
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        subDepartments: {
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
        roles: true,
        designations: true,
        teams: true,
        _count: {
          select: {
            roles: true,
            designations: true,
            teams: true,
            subDepartments: true,
          },
        },
      },
    });
    if (!department) throw new NotFoundError("Department");

    const canManage = actor
      ? await can(actor, "organization.department.manage", { departmentId: department.id })
      : false;

    return {
      ...department,
      _capabilities: {
        canEdit: canManage,
        canDelete: canManage,
        canAssignManager: canManage,
      },
    };
  }

  public async createDepartment(dto: CreateDepartmentDTO, req?: Request) {
    // Check if code is unique
    const existing = await this.prisma.department.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictError("A department with this code already exists.");
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, deletedAt: null },
      });
      if (!branch) throw new NotFoundError("Branch");
    }

    if (dto.parentId) {
      const parent = await this.prisma.department.findFirst({
        where: { id: dto.parentId, deletedAt: null },
      });
      if (!parent) throw new NotFoundError("Parent Department");
    }

    const department = await this.prisma.department.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        branchId: dto.branchId || null,
        parentId: dto.parentId || null,
        isActive: dto.isActive ?? true,
      },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        parent: { select: { id: true, code: true, name: true } },
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
      action: "DEPARTMENT_CREATE",
      entityTable: "Department",
      entityId: department.id,
      oldPayload: undefined,
      newPayload: department,
      req,
    });

    await AuthorizationEngine.getInstance().invalidateCache();

    return department;
  }

  public async updateDepartment(id: string, dto: UpdateDepartmentDTO, req?: Request) {
    const department = await this.prisma.department.findFirst({
      where: { id, deletedAt: null },
    });
    if (!department) throw new NotFoundError("Department");

    if (dto.branchId !== undefined && dto.branchId !== null) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, deletedAt: null },
      });
      if (!branch) throw new NotFoundError("Branch");
    }

    if (dto.parentId !== undefined && dto.parentId !== department.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestError("A department cannot be its own parent.");
      }

      if (dto.parentId) {
        const parent = await this.prisma.department.findFirst({
          where: { id: dto.parentId, deletedAt: null },
        });
        if (!parent) throw new NotFoundError("Parent Department");

        const descendants = await this.getDepartmentDescendantIds(id);
        if (descendants.includes(dto.parentId)) {
          throw new BadRequestError(
            "Cannot assign a descendant department as parent (circular hierarchy detected).",
          );
        }
      }
    }

    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.branchId !== undefined ? { branchId: dto.branchId } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        parent: { select: { id: true, code: true, name: true } },
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
      action: "DEPARTMENT_UPDATE",
      entityTable: "Department",
      entityId: id,
      oldPayload: department,
      newPayload: updated,
      req,
    });

    await AuthorizationEngine.getInstance().invalidateCache();

    return updated;
  }

  public async deleteDepartment(id: string, req?: Request) {
    const dept = await this.prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            subDepartments: { where: { deletedAt: null } },
            teams: true,
            designations: { where: { isActive: true } },
            roles: { where: { isActive: true } },
          },
        },
      },
    });
    if (!dept) throw new NotFoundError("Department");

    if (dept._count.subDepartments > 0) {
      throw new BadRequestError(
        `Cannot delete department with ${dept._count.subDepartments} sub-department(s). Reassign or delete them first.`,
      );
    }

    if (dept._count.teams > 0) {
      throw new BadRequestError(
        `Cannot delete department with ${dept._count.teams} assigned team(s). Reassign or delete them first.`,
      );
    }

    if (dept._count.designations > 0 || dept._count.roles > 0) {
      throw new BadRequestError(
        "Cannot delete department with active designations or roles. Reassign or remove them first.",
      );
    }

    const deleted = await this.prisma.department.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "DEPARTMENT_DELETE",
      entityTable: "Department",
      entityId: id,
      oldPayload: dept,
      newPayload: deleted,
      req,
    });

    await AuthorizationEngine.getInstance().invalidateCache();

    return { message: "Department deleted successfully" };
  }

  public async assignDepartmentManager(departmentId: string, dto: AssignDepartmentManagerDTO, req?: Request) {
    const dept = await this.prisma.department.findFirst({
      where: { id: departmentId, deletedAt: null },
    });
    if (!dept) throw new NotFoundError("Department");

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundError("User");

    // Check if user is already an active manager
    const existing = await this.prisma.departmentManager.findFirst({
      where: {
        departmentId,
        userId: dto.userId,
        unassignedAt: null,
      },
    });
    if (existing) {
      throw new ConflictError("User is already an active manager of this department.");
    }

    // If marked as primary, demote other active managers of this department
    if (dto.isPrimary) {
      await this.prisma.departmentManager.updateMany({
        where: {
          departmentId,
          unassignedAt: null,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const managerRecord = await this.prisma.departmentManager.create({
      data: {
        departmentId,
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
      action: "DEPARTMENT_MANAGER_ASSIGN",
      entityTable: "DepartmentManager",
      entityId: managerRecord.id,
      oldPayload: undefined,
      newPayload: managerRecord,
      req,
    });

    await AuthorizationEngine.getInstance().invalidateCache();

    return managerRecord;
  }

  public async removeDepartmentManager(departmentId: string, managerId: string, req?: Request) {
    const record = await this.prisma.departmentManager.findFirst({
      where: {
        id: managerId,
        departmentId,
      },
    });
    if (!record) throw new NotFoundError("Department Manager");

    if (record.unassignedAt) {
      throw new BadRequestError("Manager is already unassigned.");
    }

    const updated = await this.prisma.departmentManager.update({
      where: { id: managerId },
      data: { unassignedAt: new Date() },
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
      action: "DEPARTMENT_MANAGER_REMOVE",
      entityTable: "DepartmentManager",
      entityId: managerId,
      oldPayload: record,
      newPayload: updated,
      req,
    });

    await AuthorizationEngine.getInstance().invalidateCache();

    return { message: "Department manager unassigned successfully" };
  }
}
