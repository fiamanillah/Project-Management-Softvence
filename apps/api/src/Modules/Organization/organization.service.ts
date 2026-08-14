import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError, ConflictError, BadRequestError } from "@/core/errors/AppError";
import { AuditLogService } from "@/core/audit/audit.service";
import { can } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type { Request } from "express";
import type {
  CreateDepartmentDTO,
  UpdateDepartmentDTO,
  AssignDepartmentManagerDTO,
  CreateDesignationDTO,
  UpdateDesignationDTO,
  SavePermissionAssignmentsDTO,
} from "./OrganizationDTO";

export class OrganizationService {
  private logger = new AppLogger("OrganizationService");

  constructor(private readonly prisma: PrismaClient) {}

  // ==========================================
  // DEPARTMENTS MANAGEMENT
  // ==========================================

  /**
   * Recursively collect all descendant department IDs of a given department
   */
  public async getDepartmentDescendantIds(departmentId: string): Promise<string[]> {
    const children = await this.prisma.department.findMany({
      where: { parentId: departmentId },
      select: { id: true },
    });

    if (children.length === 0) return [];

    const childIds = children.map((c) => c.id);
    const subChildIds = await Promise.all(
      childIds.map((id) => this.getDepartmentDescendantIds(id)),
    );

    return [...childIds, ...subChildIds.flat()];
  }

  /**
   * Check if a candidate department is a descendant of an ancestor department
   */
  public async isDescendant(ancestorId: string, candidateDescendantId: string): Promise<boolean> {
    const descendantIds = await this.getDepartmentDescendantIds(ancestorId);
    return descendantIds.includes(candidateDescendantId);
  }

  public async getDepartments(actor?: AuthenticatedUser) {
    const departments = await this.prisma.department.findMany({
      orderBy: { name: "asc" },
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
            designations: true,
            teams: true,
            subDepartments: true,
          },
        },
      },
    });

    return Promise.all(
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
  }

  public async getDepartmentById(id: string, actor?: AuthenticatedUser) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        subDepartments: {
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
        designations: true,
        teams: true,
        _count: {
          select: {
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

  public async createDepartment(data: CreateDepartmentDTO, req?: Request) {
    const existing = await this.prisma.department.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new ConflictError(`Department code '${data.code}' already exists`);
    }

    if (data.parentId) {
      const parent = await this.prisma.department.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw new NotFoundError("Parent department");
      }
      if (!parent.isActive) {
        throw new BadRequestError("Cannot assign an inactive department as parent");
      }
    }

    const dept = await this.prisma.department.create({
      data: {
        code: data.code,
        name: data.name,
        parentId: data.parentId || null,
        isActive: data.isActive ?? true,
      },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
    this.logger.info(`Department created: ${dept.code} (${dept.id})`);

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "DEPARTMENT_CREATE",
      entityTable: "Department",
      entityId: dept.id,
      oldPayload: undefined,
      newPayload: dept,
      req,
    });

    return dept;
  }

  public async updateDepartment(id: string, data: UpdateDepartmentDTO, req?: Request) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundError("Department");

    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new BadRequestError("A department cannot be its own parent");
      }

      if (data.parentId !== null) {
        const parent = await this.prisma.department.findUnique({
          where: { id: data.parentId },
        });
        if (!parent) {
          throw new NotFoundError("Parent department");
        }
        if (!parent.isActive) {
          throw new BadRequestError("Cannot assign an inactive department as parent");
        }

        // Circular hierarchy check
        const isCycle = await this.isDescendant(id, data.parentId);
        if (isCycle) {
          throw new BadRequestError(
            "Circular department hierarchy detected. Cannot set a descendant as parent.",
          );
        }
      }
    }

    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "DEPARTMENT_UPDATE",
      entityTable: "Department",
      entityId: updated.id,
      oldPayload: dept,
      newPayload: updated,
      req,
    });

    return updated;
  }

  public async deleteDepartment(id: string, req?: Request) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            designations: true,
            teams: true,
            subDepartments: true,
          },
        },
      },
    });
    if (!dept) throw new NotFoundError("Department");

    if (dept._count.subDepartments > 0) {
      throw new BadRequestError(
        `Cannot delete department containing ${dept._count.subDepartments} sub-department(s). Delete or reassign sub-departments first.`,
      );
    }

    if (dept._count.designations > 0 || dept._count.teams > 0) {
      throw new BadRequestError(
        `Cannot delete department containing ${dept._count.designations} designations and ${dept._count.teams} teams. Deactivate it instead.`,
      );
    }

    await this.prisma.department.delete({ where: { id } });

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "DEPARTMENT_DELETE",
      entityTable: "Department",
      entityId: id,
      oldPayload: dept,
      newPayload: undefined,
      req,
    });

    return { message: "Department deleted successfully" };
  }

  public async assignDepartmentManager(departmentId: string, dto: AssignDepartmentManagerDTO, req?: Request) {
    const dept = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw new NotFoundError("Department");

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundError("User");

    const previousManagers = await this.prisma.departmentManager.findMany({
      where: { departmentId, unassignedAt: null },
    });

    // Unassign currently active manager(s) for this department
    await this.prisma.departmentManager.updateMany({
      where: {
        departmentId,
        unassignedAt: null,
      },
      data: {
        unassignedAt: new Date(),
      },
    });

    const managerRecord = await this.prisma.departmentManager.create({
      data: {
        departmentId,
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
      action: "DEPARTMENT_MANAGER_ASSIGN",
      entityTable: "DepartmentManager",
      entityId: managerRecord.id,
      oldPayload: { previousManagers },
      newPayload: managerRecord,
      req,
    });

    return managerRecord;
  }

  public async removeDepartmentManager(departmentId: string, managerId: string, req?: Request) {
    const record = await this.prisma.departmentManager.findFirst({
      where: {
        id: managerId,
        departmentId,
      },
    });
    if (!record) throw new NotFoundError("Department manager assignment");

    const updated = await this.prisma.departmentManager.update({
      where: { id: managerId },
      data: { unassignedAt: new Date() },
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

    return { message: "Department manager unassigned successfully" };
  }

  // ==========================================
  // DESIGNATIONS & PERMISSION MATRIX
  // ==========================================

  public async getDesignations(actor?: AuthenticatedUser) {
    const designations = await this.prisma.designation.findMany({
      orderBy: { hierarchyLevel: "asc" },
      include: {
        department: true,
        _count: {
          select: {
            permissions: true,
            users: true,
          },
        },
      },
    });

    return Promise.all(
      designations.map(async (desig) => {
        const canManage = actor
          ? await can(actor, "organization.designation.manage", { departmentId: desig.departmentId })
          : false;
        return {
          ...desig,
          _capabilities: {
            canEdit: canManage,
            canDelete: canManage,
            canManageMatrix: canManage,
          },
        };
      }),
    );
  }

  private async getGranterUserId(providedUserId?: string, designationIdForFallback?: string): Promise<string> {
    if (providedUserId) {
      const userExists = await this.prisma.user.findUnique({
        where: { id: providedUserId },
        select: { id: true },
      });
      if (userExists) return providedUserId;
    }
    const fallbackUser = await this.prisma.user.findFirst({
      select: { id: true },
    });
    if (fallbackUser) return fallbackUser.id;

    if (designationIdForFallback) {
      const sysUser = await this.prisma.user.create({
        data: {
          employeeId: `SYS-${Date.now()}`,
          email: `system-${Date.now()}@internal.app`,
          passwordHash: "system",
          firstName: "System",
          lastName: "Granter",
          systemRole: "SuperAdmin",
          designationId: designationIdForFallback,
        },
      });
      return sysUser.id;
    }

    throw new BadRequestError("No valid granter user found to assign permissions.");
  }

  public async createDesignation(data: CreateDesignationDTO, grantedByUserId?: string, req?: Request) {
    const existing = await this.prisma.designation.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new ConflictError(`Designation code '${data.code}' already exists`);
    }

    const dept = await this.prisma.department.findUnique({
      where: { id: data.departmentId },
    });
    if (!dept) throw new NotFoundError("Department");

    const desig = await this.prisma.$transaction(async (tx) => {
      const createdDesig = await tx.designation.create({
        data: {
          code: data.code,
          name: data.name,
          departmentId: data.departmentId,
          hierarchyLevel: data.hierarchyLevel,
          isLeadership: data.isLeadership,
        },
        include: {
          department: true,
          _count: {
            select: {
              permissions: true,
              users: true,
            },
          },
        },
      });

      if (data.assignments && data.assignments.length > 0) {
        let granterId: string | undefined;
        if (grantedByUserId) {
          const userExists = await tx.user.findUnique({
            where: { id: grantedByUserId },
            select: { id: true },
          });
          if (userExists) granterId = grantedByUserId;
        }
        if (!granterId) {
          const firstUser = await tx.user.findFirst({ select: { id: true } });
          if (firstUser) granterId = firstUser.id;
        }
        if (!granterId) {
          const sysUser = await tx.user.create({
            data: {
              employeeId: `SYS-${Date.now()}`,
              email: `system-${Date.now()}@internal.app`,
              passwordHash: "system",
              firstName: "System",
              lastName: "Granter",
              systemRole: "SuperAdmin",
              designationId: createdDesig.id,
            },
          });
          granterId = sysUser.id;
        }

        for (const item of data.assignments) {
          const grant = await tx.designationPermission.create({
            data: {
              designationId: createdDesig.id,
              permissionId: item.permissionId,
              scopeTypeId: item.scopeTypeId,
              grantedBy: granterId,
            },
          });

          if (item.targetDepartmentIds && item.targetDepartmentIds.length > 0) {
            for (const deptId of item.targetDepartmentIds) {
              await tx.designationPermissionScopeTarget.create({
                data: {
                  designationPermissionId: grant.id,
                  departmentId: deptId,
                },
              });
            }
          }

          if (item.targetTeamIds && item.targetTeamIds.length > 0) {
            for (const teamId of item.targetTeamIds) {
              await tx.designationPermissionScopeTarget.create({
                data: {
                  designationPermissionId: grant.id,
                  teamId: teamId,
                },
              });
            }
          }

          if (item.targetProjectIds && item.targetProjectIds.length > 0) {
            for (const projId of item.targetProjectIds) {
              await tx.designationPermissionScopeTarget.create({
                data: {
                  designationPermissionId: grant.id,
                  projectId: projId,
                },
              });
            }
          }
        }
      }

      return createdDesig;
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
    grantedByUserId?: string,
    req?: Request,
  ) {
    const existing = await this.prisma.designation.findUnique({
      where: { id: designationId },
      include: {
        department: true,
        permissions: { include: { scopeTargets: true } },
      },
    });
    if (!existing) throw new NotFoundError("Designation");

    if (data.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!dept) throw new NotFoundError("Department");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedDesig = await tx.designation.update({
        where: { id: designationId },
        data: {
          name: data.name ?? undefined,
          departmentId: data.departmentId ?? undefined,
          hierarchyLevel: data.hierarchyLevel ?? undefined,
          isLeadership: data.isLeadership !== undefined ? data.isLeadership : undefined,
        },
        include: {
          department: true,
          _count: {
            select: {
              permissions: true,
              users: true,
            },
          },
        },
      });

      if (data.assignments !== undefined) {
        let granterId: string | undefined;
        if (grantedByUserId) {
          const userExists = await tx.user.findUnique({
            where: { id: grantedByUserId },
            select: { id: true },
          });
          if (userExists) granterId = grantedByUserId;
        }
        if (!granterId) {
          const firstUser = await tx.user.findFirst({ select: { id: true } });
          if (firstUser) granterId = firstUser.id;
        }
        if (!granterId) {
          const sysUser = await tx.user.create({
            data: {
              employeeId: `SYS-${Date.now()}`,
              email: `system-${Date.now()}@internal.app`,
              passwordHash: "system",
              firstName: "System",
              lastName: "Granter",
              systemRole: "SuperAdmin",
              designationId: updatedDesig.id,
            },
          });
          granterId = sysUser.id;
        }

        const existingGrants = await tx.designationPermission.findMany({
          where: { designationId },
          select: { id: true },
        });
        const grantIds = existingGrants.map((g) => g.id);

        if (grantIds.length > 0) {
          await tx.designationPermissionScopeTarget.deleteMany({
            where: { designationPermissionId: { in: grantIds } },
          });
          await tx.designationPermission.deleteMany({
            where: { designationId },
          });
        }

        for (const item of data.assignments) {
          const grant = await tx.designationPermission.create({
            data: {
              designationId,
              permissionId: item.permissionId,
              scopeTypeId: item.scopeTypeId,
              grantedBy: granterId,
            },
          });

          if (item.targetDepartmentIds && item.targetDepartmentIds.length > 0) {
            for (const deptId of item.targetDepartmentIds) {
              await tx.designationPermissionScopeTarget.create({
                data: {
                  designationPermissionId: grant.id,
                  departmentId: deptId,
                },
              });
            }
          }

          if (item.targetTeamIds && item.targetTeamIds.length > 0) {
            for (const teamId of item.targetTeamIds) {
              await tx.designationPermissionScopeTarget.create({
                data: {
                  designationPermissionId: grant.id,
                  teamId: teamId,
                },
              });
            }
          }

          if (item.targetProjectIds && item.targetProjectIds.length > 0) {
            for (const projId of item.targetProjectIds) {
              await tx.designationPermissionScopeTarget.create({
                data: {
                  designationPermissionId: grant.id,
                  projectId: projId,
                },
              });
            }
          }
        }
      }

      return updatedDesig;
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

    await this.prisma.$transaction(async (tx) => {
      const existingGrants = await tx.designationPermission.findMany({
        where: { designationId },
        select: { id: true },
      });
      const grantIds = existingGrants.map((g) => g.id);

      if (grantIds.length > 0) {
        await tx.designationPermissionScopeTarget.deleteMany({
          where: { designationPermissionId: { in: grantIds } },
        });
        await tx.designationPermission.deleteMany({
          where: { designationId },
        });
      }

      await tx.designation.delete({
        where: { id: designationId },
      });
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

  public async getDesignationPermissions(designationId: string) {
    const designation = await this.prisma.designation.findUnique({
      where: { id: designationId },
      include: { department: true },
    });
    if (!designation) throw new NotFoundError("Designation");

    const permissions = await this.prisma.designationPermission.findMany({
      where: { designationId, isActive: true },
      include: {
        permission: true,
        scopeType: true,
        scopeTargets: {
          include: {
            department: true,
            team: true,
            project: true,
          },
        },
      },
    });

    return {
      designation,
      permissions,
    };
  }

  public async saveDesignationPermissions(
    designationId: string,
    dto: SavePermissionAssignmentsDTO,
    grantedByUserId?: string,
    req?: Request,
  ) {
    const designation = await this.prisma.designation.findUnique({
      where: { id: designationId },
    });
    if (!designation) throw new NotFoundError("Designation");

    const granterId = await this.getGranterUserId(grantedByUserId);

    const existingGrantsBefore = await this.prisma.designationPermission.findMany({
      where: { designationId },
      include: { scopeTargets: true },
    });

    await this.prisma.$transaction(async (tx) => {
      const existingGrants = await tx.designationPermission.findMany({
        where: { designationId },
        select: { id: true },
      });
      const grantIds = existingGrants.map((g) => g.id);

      if (grantIds.length > 0) {
        await tx.designationPermissionScopeTarget.deleteMany({
          where: { designationPermissionId: { in: grantIds } },
        });
        await tx.designationPermission.deleteMany({
          where: { designationId },
        });
      }

      for (const item of dto.assignments) {
        const grant = await tx.designationPermission.create({
          data: {
            designationId,
            permissionId: item.permissionId,
            scopeTypeId: item.scopeTypeId,
            grantedBy: granterId,
          },
        });

        if (item.targetDepartmentIds && item.targetDepartmentIds.length > 0) {
          for (const deptId of item.targetDepartmentIds) {
            await tx.designationPermissionScopeTarget.create({
              data: {
                designationPermissionId: grant.id,
                departmentId: deptId,
              },
            });
          }
        }

        if (item.targetTeamIds && item.targetTeamIds.length > 0) {
          for (const teamId of item.targetTeamIds) {
            await tx.designationPermissionScopeTarget.create({
              data: {
                designationPermissionId: grant.id,
                teamId: teamId,
              },
            });
          }
        }

        if (item.targetProjectIds && item.targetProjectIds.length > 0) {
          for (const projId of item.targetProjectIds) {
            await tx.designationPermissionScopeTarget.create({
              data: {
                designationPermissionId: grant.id,
                projectId: projId,
              },
            });
          }
        }
      }
    });

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "DESIGNATION_PERMISSIONS_UPDATE",
      entityTable: "DesignationPermission",
      entityId: designationId,
      oldPayload: { permissions: existingGrantsBefore },
      newPayload: { assignments: dto.assignments },
      req,
    });

    return { message: "Designation permissions updated successfully" };
  }
}

