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
  CreateRoleDTO,
  UpdateRoleDTO,
  SaveRolePermissionsDTO,
  CreateDesignationDTO,
  UpdateDesignationDTO,
} from "./OrganizationDTO";

export class OrganizationService {
  private logger = new AppLogger("OrganizationService");

  constructor(private readonly prisma: PrismaClient) {}

  // ==========================================
  // DEPARTMENTS MANAGEMENT
  // ==========================================

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
            roles: true,
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
      if (!parent) throw new NotFoundError("Parent Department");
    }

    const dept = await this.prisma.department.create({
      data: {
        code: data.code,
        name: data.name,
        parentId: data.parentId || null,
        isActive: data.isActive ?? true,
      },
      include: {
        parent: true,
      },
    });

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
    const existing = await this.prisma.department.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Department");

    if (data.parentId !== undefined && data.parentId !== null) {
      if (data.parentId === id) {
        throw new BadRequestError("A department cannot be its own parent.");
      }
      const isLoop = await this.isDescendant(id, data.parentId);
      if (isLoop) {
        throw new BadRequestError(
          "Cannot set a descendant department as the parent (circular hierarchy detected).",
        );
      }
      const parent = await this.prisma.department.findUnique({ where: { id: data.parentId } });
      if (!parent) throw new NotFoundError("Parent Department");
    }

    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        parentId: data.parentId !== undefined ? data.parentId : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
      include: {
        parent: true,
      },
    });

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "DEPARTMENT_UPDATE",
      entityTable: "Department",
      entityId: id,
      oldPayload: existing,
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
            roles: true,
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
        `Cannot delete department with ${dept._count.subDepartments} sub-department(s). Reassign or delete them first.`,
      );
    }

    if (dept._count.roles > 0) {
      throw new BadRequestError(
        `Cannot delete department with ${dept._count.roles} assigned role(s). Reassign or delete them first.`,
      );
    }

    if (dept._count.designations > 0) {
      throw new BadRequestError(
        `Cannot delete department with ${dept._count.designations} assigned designation(s). Reassign or delete them first.`,
      );
    }

    if (dept._count.teams > 0) {
      throw new BadRequestError(
        `Cannot delete department with ${dept._count.teams} assigned team(s). Reassign or delete them first.`,
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
  // ROLES & PERMISSION MATRIX (Security Access)
  // ==========================================

  public async getRoles(actor?: AuthenticatedUser) {
    const roles = await this.prisma.role.findMany({
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
      roles.map(async (role) => {
        const canManage = actor
          ? await can(actor, "organization.role.manage", { departmentId: role.departmentId ?? undefined })
          : false;
        return {
          ...role,
          _capabilities: {
            canEdit: canManage,
            canDelete: canManage,
            canManageMatrix: canManage,
          },
        };
      }),
    );
  }

  public async getRoleById(roleId: string, actor?: AuthenticatedUser) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
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
    if (!role) throw new NotFoundError("Role");

    const canManage = actor
      ? await can(actor, "organization.role.manage", { departmentId: role.departmentId ?? undefined })
      : false;

    return {
      ...role,
      _capabilities: {
        canEdit: canManage,
        canDelete: canManage,
        canManageMatrix: canManage,
      },
    };
  }

  private async getGranterUserId(providedUserId?: string, roleIdForFallback?: string): Promise<string> {
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

    if (roleIdForFallback) {
      const sysUser = await this.prisma.user.create({
        data: {
          employeeId: `SYS-${Date.now()}`,
          email: `system-${Date.now()}@internal.app`,
          passwordHash: "system",
          firstName: "System",
          lastName: "Granter",
          systemRole: "SuperAdmin",
          roleId: roleIdForFallback,
        },
      });
      return sysUser.id;
    }

    throw new BadRequestError("No valid granter user found to assign permissions.");
  }

  public async createRole(data: CreateRoleDTO, grantedByUserId?: string, req?: Request) {
    const existing = await this.prisma.role.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new ConflictError(`Role code '${data.code}' already exists`);
    }

    if (data.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!dept) throw new NotFoundError("Department");
    }

    const role = await this.prisma.$transaction(async (tx) => {
      const createdRole = await tx.role.create({
        data: {
          code: data.code,
          name: data.name,
          description: data.description ?? null,
          departmentId: data.departmentId ?? null,
          hierarchyLevel: data.hierarchyLevel ?? 1,
          isLeadership: data.isLeadership ?? false,
          isActive: data.isActive ?? true,
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
              roleId: createdRole.id,
            },
          });
          granterId = sysUser.id;
        }

        for (const item of data.assignments) {
            const grant = await tx.rolePermission.create({
              data: {
                roleId: createdRole.id,
                permissionId: item.permissionId,
                scopeTypeId: item.scopeTypeId,
                grantedBy: granterId,
              },
            });

            if (item.targetDepartmentIds && item.targetDepartmentIds.length > 0) {
              for (const deptId of item.targetDepartmentIds) {
                await tx.rolePermissionScopeTarget.create({
                  data: {
                    rolePermissionId: grant.id,
                    departmentId: deptId,
                  },
                });
              }
            }

            if (item.targetTeamIds && item.targetTeamIds.length > 0) {
              for (const teamId of item.targetTeamIds) {
                await tx.rolePermissionScopeTarget.create({
                  data: {
                    rolePermissionId: grant.id,
                    teamId: teamId,
                  },
                });
              }
            }

            if (item.targetProjectIds && item.targetProjectIds.length > 0) {
              for (const projId of item.targetProjectIds) {
                await tx.rolePermissionScopeTarget.create({
                  data: {
                    rolePermissionId: grant.id,
                    projectId: projId,
                  },
                });
              }
            }
          }
        }

      return createdRole;
    });

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "ROLE_CREATE",
      entityTable: "Role",
      entityId: role.id,
      oldPayload: undefined,
      newPayload: role,
      req,
    });

    return role;
  }

  public async updateRole(
    roleId: string,
    data: UpdateRoleDTO,
    grantedByUserId?: string,
    req?: Request,
  ) {
    const existing = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        department: true,
        permissions: { include: { scopeTargets: true } },
      },
    });
    if (!existing) throw new NotFoundError("Role");

    if (data.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!dept) throw new NotFoundError("Department");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedRole = await tx.role.update({
        where: { id: roleId },
        data: {
          name: data.name ?? undefined,
          description: data.description !== undefined ? data.description : undefined,
          departmentId: data.departmentId !== undefined ? data.departmentId : undefined,
          hierarchyLevel: data.hierarchyLevel ?? undefined,
          isLeadership: data.isLeadership !== undefined ? data.isLeadership : undefined,
          isActive: data.isActive !== undefined ? data.isActive : undefined,
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

        const existingGrants = await tx.rolePermission.findMany({
          where: { roleId },
          select: { id: true },
        });
        const grantIds = existingGrants.map((g) => g.id);

        if (grantIds.length > 0) {
          await tx.rolePermissionScopeTarget.deleteMany({
            where: { rolePermissionId: { in: grantIds } },
          });
          await tx.rolePermission.deleteMany({
            where: { roleId },
          });
        }

        if (granterId) {
          for (const item of data.assignments) {
            const grant = await tx.rolePermission.create({
              data: {
                roleId,
                permissionId: item.permissionId,
                scopeTypeId: item.scopeTypeId,
                grantedBy: granterId,
              },
            });

            if (item.targetDepartmentIds && item.targetDepartmentIds.length > 0) {
              for (const deptId of item.targetDepartmentIds) {
                await tx.rolePermissionScopeTarget.create({
                  data: {
                    rolePermissionId: grant.id,
                    departmentId: deptId,
                  },
                });
              }
            }

            if (item.targetTeamIds && item.targetTeamIds.length > 0) {
              for (const teamId of item.targetTeamIds) {
                await tx.rolePermissionScopeTarget.create({
                  data: {
                    rolePermissionId: grant.id,
                    teamId: teamId,
                  },
                });
              }
            }

            if (item.targetProjectIds && item.targetProjectIds.length > 0) {
              for (const projId of item.targetProjectIds) {
                await tx.rolePermissionScopeTarget.create({
                  data: {
                    rolePermissionId: grant.id,
                    projectId: projId,
                  },
                });
              }
            }
          }
        }
      }

      return updatedRole;
    });

    await AuthorizationEngine.getInstance().invalidateCache();

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "ROLE_UPDATE",
      entityTable: "Role",
      entityId: roleId,
      oldPayload: existing,
      newPayload: updated,
      req,
    });

    return updated;
  }

  public async deleteRole(roleId: string, req?: Request) {
    const existing = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
    if (!existing) throw new NotFoundError("Role");

    if (existing._count.users > 0) {
      throw new BadRequestError(
        `Cannot delete role assigned to ${existing._count.users} active user(s). Reassign them first.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const existingGrants = await tx.rolePermission.findMany({
        where: { roleId },
        select: { id: true },
      });
      const grantIds = existingGrants.map((g) => g.id);

      if (grantIds.length > 0) {
        await tx.rolePermissionScopeTarget.deleteMany({
          where: { rolePermissionId: { in: grantIds } },
        });
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });
      }

      await tx.role.delete({
        where: { id: roleId },
      });
    });

    await AuthorizationEngine.getInstance().invalidateCache();

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "ROLE_DELETE",
      entityTable: "Role",
      entityId: roleId,
      oldPayload: existing,
      newPayload: undefined,
      req,
    });

    return { message: "Role deleted successfully" };
  }

  public async getRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { department: true },
    });
    if (!role) throw new NotFoundError("Role");

    const permissions = await this.prisma.rolePermission.findMany({
      where: { roleId, isActive: true },
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
      role,
      permissions,
    };
  }

  public async saveRolePermissions(
    roleId: string,
    dto: SaveRolePermissionsDTO,
    grantedByUserId?: string,
    req?: Request,
  ) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) throw new NotFoundError("Role");

    const granterId = await this.getGranterUserId(grantedByUserId, roleId);

    const existingGrantsBefore = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { scopeTargets: true },
    });

    await this.prisma.$transaction(async (tx) => {
      const existingGrants = await tx.rolePermission.findMany({
        where: { roleId },
        select: { id: true },
      });
      const grantIds = existingGrants.map((g) => g.id);

      if (grantIds.length > 0) {
        await tx.rolePermissionScopeTarget.deleteMany({
          where: { rolePermissionId: { in: grantIds } },
        });
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });
      }

      for (const item of dto.assignments) {
        const grant = await tx.rolePermission.create({
          data: {
            roleId,
            permissionId: item.permissionId,
            scopeTypeId: item.scopeTypeId,
            grantedBy: granterId,
          },
        });

        if (item.targetDepartmentIds && item.targetDepartmentIds.length > 0) {
          for (const deptId of item.targetDepartmentIds) {
            await tx.rolePermissionScopeTarget.create({
              data: {
                rolePermissionId: grant.id,
                departmentId: deptId,
              },
            });
          }
        }

        if (item.targetTeamIds && item.targetTeamIds.length > 0) {
          for (const teamId of item.targetTeamIds) {
            await tx.rolePermissionScopeTarget.create({
              data: {
                rolePermissionId: grant.id,
                teamId: teamId,
              },
            });
          }
        }

        if (item.targetProjectIds && item.targetProjectIds.length > 0) {
          for (const projId of item.targetProjectIds) {
            await tx.rolePermissionScopeTarget.create({
              data: {
                rolePermissionId: grant.id,
                projectId: projId,
              },
            });
          }
        }
      }
    });

    await AuthorizationEngine.getInstance().invalidateCache();

    await AuditLogService.log({
      module: "ORGANIZATION",
      action: "ROLE_PERMISSIONS_UPDATE",
      entityTable: "RolePermission",
      entityId: roleId,
      oldPayload: { permissions: existingGrantsBefore },
      newPayload: { assignments: dto.assignments },
      req,
    });

    return { message: "Role permissions updated successfully" };
  }

  // ==========================================
  // DESIGNATIONS (Pure HR Job Titles / Tags)
  // ==========================================

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
