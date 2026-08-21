// src/Modules/Organization/services/organization.role.service.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError, ConflictError, BadRequestError } from "@/core/errors/AppError";
import { AuditLogService } from "@/core/audit/audit.service";
import { AuthorizationEngine, can } from "@/core/authorization/AuthorizationEngine";
import { getScopeWeight } from "@/core/permissions/scopePresets";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type { Request } from "express";
import type {
  CreateRoleDTO,
  UpdateRoleDTO,
  SaveRolePermissionsDTO,
} from "../OrganizationDTO";

export class OrganizationRoleService {
  private logger = new AppLogger("OrganizationRoleService");

  constructor(private readonly prisma: PrismaClient) {}

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

  public async getGranterUserId(providedUserId?: string, roleIdForFallback?: string): Promise<string> {
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

  private async expandPrerequisiteAssignments(
    assignments: SaveRolePermissionsDTO["assignments"] | undefined,
    tx: any,
  ): Promise<SaveRolePermissionsDTO["assignments"]> {
    if (!assignments || assignments.length === 0) return [];

    const allPermissions = await tx.permission.findMany({
      where: { isActive: true },
    });

    const idToPerm = new Map<string, (typeof allPermissions)[0]>();
    const codeToPerm = new Map<string, (typeof allPermissions)[0]>();
    for (const p of allPermissions) {
      idToPerm.set(p.id, p);
      codeToPerm.set(p.code, p);
    }

    const assignmentMap = new Map<string, (typeof assignments)[0]>();
    for (const a of assignments) {
      assignmentMap.set(a.permissionId, { ...a });
    }

    const queue = [...assignments];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const perm = idToPerm.get(current.permissionId);
      if (!perm) continue;

      const prereqCodes = [
        ...(perm.implies || []),
        ...(perm.dependsOn || []),
      ];

      for (const pCode of prereqCodes) {
        const prereqPerm = codeToPerm.get(pCode);
        if (prereqPerm && !assignmentMap.has(prereqPerm.id)) {
          const expandedAssignment = {
            permissionId: prereqPerm.id,
            scopeTypeId: current.scopeTypeId,
            targetDepartmentIds: current.targetDepartmentIds ? [...current.targetDepartmentIds] : undefined,
            targetTeamIds: current.targetTeamIds ? [...current.targetTeamIds] : undefined,
            targetProjectIds: current.targetProjectIds ? [...current.targetProjectIds] : undefined,
          };
          assignmentMap.set(prereqPerm.id, expandedAssignment);
          queue.push(expandedAssignment);
        }
      }
    }

    // Enforce Scope Monotonicity & Container Clamping
    // A child/sub-resource permission's scope must not exceed its container root's scope.
    const allScopeTypes = await tx.permissionScopeType.findMany({
      where: { isActive: true },
    });
    const idToScopeType = new Map<string, (typeof allScopeTypes)[0]>();
    for (const st of allScopeTypes) {
      idToScopeType.set(st.id, st);
    }

    const clampContainerScope = (containerCode: string, prefix: string) => {
      const containerPerm = codeToPerm.get(containerCode);
      if (!containerPerm) return;
      const containerAssignment = assignmentMap.get(containerPerm.id);
      if (!containerAssignment) return;

      const parentScopeType = idToScopeType.get(containerAssignment.scopeTypeId);
      const parentWeight = getScopeWeight(parentScopeType?.resolutionStrategy);

      for (const [permId, assignment] of assignmentMap.entries()) {
        const p = idToPerm.get(permId);
        if (p && p.code.startsWith(prefix) && p.code !== containerCode) {
          const childScopeType = idToScopeType.get(assignment.scopeTypeId);
          const childWeight = getScopeWeight(childScopeType?.resolutionStrategy);
          if (childWeight > parentWeight) {
            assignment.scopeTypeId = containerAssignment.scopeTypeId;
            assignment.targetDepartmentIds = containerAssignment.targetDepartmentIds
              ? [...containerAssignment.targetDepartmentIds]
              : undefined;
            assignment.targetTeamIds = containerAssignment.targetTeamIds
              ? [...containerAssignment.targetTeamIds]
              : undefined;
            assignment.targetProjectIds = containerAssignment.targetProjectIds
              ? [...containerAssignment.targetProjectIds]
              : undefined;
          }
        }
      }
    };

    clampContainerScope("project.view", "project.");
    clampContainerScope("organization.department.view", "organization.department.");
    clampContainerScope("organization.branch.view", "organization.branch.");

    return Array.from(assignmentMap.values());
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

        const resolvedAssignments = await this.expandPrerequisiteAssignments(data.assignments, tx);

        for (const item of resolvedAssignments) {
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
          const resolvedAssignments = await this.expandPrerequisiteAssignments(data.assignments, tx);

          for (const item of resolvedAssignments) {
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

      const resolvedAssignments = await this.expandPrerequisiteAssignments(dto.assignments, tx);

      for (const item of resolvedAssignments) {
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
}
