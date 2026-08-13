// src/Modules/Admin/admin.service.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError, ConflictError, BadRequestError } from "@/core/errors/AppError";
import { hashPassword } from "@/utils/crypto";
import { AuthorizationEngine } from "@/core/authorization/AuthorizationEngine";
import type {
  CreateAdminUserDTO,
  UpdateAdminUserDTO,
  CreateDesignationDTO,
  SavePermissionAssignmentsDTO,
  CreateOverrideDTO,
  CreateDelegationDTO,
} from "./AdminDTO";

export class AdminService {
  private logger = new AppLogger("AdminService");

  constructor(private readonly prisma: PrismaClient) {}

  // ==========================================
  // USERS MANAGEMENT
  // ==========================================

  public async getUsers(query: { search?: string; role?: string; designationId?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.role) where.systemRole = query.role;
    if (query.designationId) where.designationId = query.designationId;
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: "insensitive" } },
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } },
        { employeeId: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          designation: {
            include: { department: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const sanitized = users.map((u) => {
      const { passwordHash, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });

    return {
      data: sanitized,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public async createAdminUser(data: CreateAdminUserDTO) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictError("A user with this email address already exists");
    }

    const designation = await this.prisma.designation.findUnique({
      where: { id: data.designationId },
    });

    if (!designation) {
      throw new NotFoundError("Designation");
    }

    const hashedPassword = await hashPassword(data.password);
    const employeeId = `EMP-${Date.now().toString().slice(-6)}`;

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        employeeId,
        passwordHash: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        systemRole: data.systemRole as any,
        designationId: data.designationId,
        isActive: true,
      },
      include: {
        designation: {
          include: { department: true },
        },
      },
    });

    const { passwordHash, ...result } = user;
    return result;
  }

  public async updateAdminUser(userId: string, data: UpdateAdminUserDTO) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    if (data.designationId) {
      const desig = await this.prisma.designation.findUnique({
        where: { id: data.designationId },
      });
      if (!desig) throw new NotFoundError("Designation");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        systemRole: data.systemRole as any,
        designationId: data.designationId,
        isActive: data.isActive,
      },
      include: {
        designation: {
          include: { department: true },
        },
      },
    });

    const { passwordHash, ...result } = updated;
    return result;
  }

  // ==========================================
  // DESIGNATIONS & PERMISSION MATRIX
  // ==========================================

  public async getDesignations() {
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
    return designations;
  }

  public async createDesignation(data: CreateDesignationDTO) {
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

    const desig = await this.prisma.designation.create({
      data: {
        code: data.code,
        name: data.name,
        departmentId: data.departmentId,
        hierarchyLevel: data.hierarchyLevel,
        isLeadership: data.isLeadership,
      },
      include: { department: true },
    });
    return desig;
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
  ) {
    const designation = await this.prisma.designation.findUnique({
      where: { id: designationId },
    });
    if (!designation) throw new NotFoundError("Designation");

    // Perform atomic transaction: delete existing grants & insert new ones
    await this.prisma.$transaction(async (tx) => {
      // 1. Delete scope targets for existing designation permissions
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

      // 2. Create new designation permissions & scope targets
      for (const item of dto.assignments) {
        const grant = await tx.designationPermission.create({
          data: {
            designationId,
            permissionId: item.permissionId,
            scopeTypeId: item.scopeTypeId,
            grantedBy: designationId, // reference designation or granter
          },
        });

        // Insert department targets
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

        // Insert team targets
        if (item.targetTeamIds && item.targetTeamIds.length > 0) {
          for (const teamId of item.targetTeamIds) {
            await tx.designationPermissionScopeTarget.create({
              data: {
                designationPermissionId: grant.id,
                teamId,
              },
            });
          }
        }

        // Insert project targets
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

    // Invalidate Redis permission version cache instantly!
    await AuthorizationEngine.getInstance().invalidateCache();

    return { message: "Permission assignments saved successfully" };
  }

  // ==========================================
  // PERMISSIONS & SCOPE TYPES
  // ==========================================

  public async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [{ module: "asc" }, { code: "asc" }],
    });
    return permissions;
  }

  public async getScopeTypes() {
    const scopeTypes = await this.prisma.permissionScopeType.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
    return scopeTypes;
  }

  // ==========================================
  // OVERRIDES & DELEGATIONS
  // ==========================================

  public async getOverrides() {
    const overrides = await this.prisma.userPermissionOverride.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        permission: true,
        granter: { select: { id: true, email: true, firstName: true, lastName: true } },
        department: true,
        team: true,
        project: true,
      },
    });
    return overrides;
  }

  public async createOverride(data: CreateOverrideDTO, granterId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) throw new NotFoundError("User");

    const perm = await this.prisma.permission.findUnique({ where: { id: data.permissionId } });
    if (!perm) throw new NotFoundError("Permission");

    const override = await this.prisma.userPermissionOverride.create({
      data: {
        userId: data.userId,
        permissionId: data.permissionId,
        isDeny: data.isDeny,
        departmentId: data.departmentId || null,
        teamId: data.teamId || null,
        projectId: data.projectId || null,
        grantedBy: granterId,
        reason: data.reason || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
      include: {
        user: true,
        permission: true,
      },
    });

    await AuthorizationEngine.getInstance().invalidateCache();
    return override;
  }

  public async revokeOverride(overrideId: string) {
    const override = await this.prisma.userPermissionOverride.findUnique({
      where: { id: overrideId },
    });
    if (!override) throw new NotFoundError("Permission Override");

    await this.prisma.userPermissionOverride.delete({
      where: { id: overrideId },
    });

    await AuthorizationEngine.getInstance().invalidateCache();
    return { message: "Override revoked successfully" };
  }

  public async getDelegations() {
    const delegations = await this.prisma.delegation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        delegator: { select: { id: true, email: true, firstName: true, lastName: true } },
        delegatee: { select: { id: true, email: true, firstName: true, lastName: true } },
        creator: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    return delegations;
  }

  public async createDelegation(data: CreateDelegationDTO, creatorId: string) {
    const delegator = await this.prisma.user.findUnique({ where: { id: data.delegatorId } });
    if (!delegator) throw new NotFoundError("Delegator User");

    const delegatee = await this.prisma.user.findUnique({ where: { id: data.delegateeId } });
    if (!delegatee) throw new NotFoundError("Delegatee User");

    const delegation = await this.prisma.delegation.create({
      data: {
        delegatorId: data.delegatorId,
        delegateeId: data.delegateeId,
        scope: data.scope || "*",
        validFrom: new Date(data.validFrom),
        validUntil: new Date(data.validUntil),
        createdBy: creatorId,
      },
      include: {
        delegator: true,
        delegatee: true,
      },
    });

    return delegation;
  }

  public async revokeDelegation(delegationId: string) {
    const del = await this.prisma.delegation.findUnique({
      where: { id: delegationId },
    });
    if (!del) throw new NotFoundError("Delegation");

    await this.prisma.delegation.delete({
      where: { id: delegationId },
    });

    return { message: "Delegation revoked successfully" };
  }
}
