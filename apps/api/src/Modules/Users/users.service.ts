// src/Modules/Users/users.service.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError, ConflictError } from "@/core/errors/AppError";
import { hashPassword } from "@/utils/crypto";
import { AuthorizationEngine } from "@/core/authorization/AuthorizationEngine";
import type {
  CreateAdminUserDTO,
  UpdateAdminUserDTO,
  CreateOverrideDTO,
  CreateDelegationDTO,
} from "./UserDTO";

export class UsersService {
  private logger = new AppLogger("UsersService");

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
