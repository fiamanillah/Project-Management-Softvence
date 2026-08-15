import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError, ConflictError, BadRequestError } from "@/core/errors/AppError";
import { hashPassword } from "@/utils/crypto";
import { AuthorizationEngine, can } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import { AuditLogService } from "@/core/audit/audit.service";
import type { Request } from "express";
import { publishEmail, publishNotification } from "@workspace/message-broker";
import type {
  CreateAdminUserDTO,
  UpdateAdminUserDTO,
  CreateOverrideDTO,
  CreateDelegationDTO,
} from "./UserDTO";

function generateTemporaryPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pass = "Temp#" + Math.floor(100 + Math.random() * 900);
  for (let i = 0; i < 4; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export class UsersService {
  private logger = new AppLogger("UsersService");

  constructor(private readonly prisma: PrismaClient) {}

  // ==========================================
  // USERS MANAGEMENT
  // ==========================================

  public async getUsers(
    query: { search?: string; role?: string; status?: string; designationId?: string; page?: number; limit?: number },
    actor?: AuthenticatedUser,
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.role) where.systemRole = query.role;
    if (query.status && query.status !== "all") where.status = query.status;
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

    const sanitized = await Promise.all(
      users.map(async (u) => {
        const { passwordHash, ...userWithoutPassword } = u;
        const canManage = actor ? await can(actor, "auth.user.manage") : false;
        return {
          ...userWithoutPassword,
          _capabilities: {
            canEdit: canManage,
            canToggleActive: canManage && u.id !== actor?.id,
            canManageOverrides: canManage,
          },
        };
      }),
    );

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

  public async createAdminUser(data: CreateAdminUserDTO, req?: Request) {
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

    const rawTemporaryPassword =
      data.password && data.password.trim().length >= 8
        ? data.password
        : generateTemporaryPassword();

    const hashedPassword = await hashPassword(rawTemporaryPassword);

    let employeeId = data.employeeId?.trim();
    if (employeeId) {
      const existingEmployee = await this.prisma.user.findUnique({
        where: { employeeId },
      });
      if (existingEmployee) {
        throw new ConflictError("A user with this employee ID already exists");
      }
    } else {
      employeeId = `EMP-${Date.now().toString().slice(-6)}`;
    }

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        employeeId,
        passwordHash: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        systemRole: data.systemRole as any,
        designationId: data.designationId,
        status: "INVITED",
        isActive: true,
        mustChangePassword: true,
      },
      include: {
        designation: {
          include: { department: true },
        },
      },
    });

    const { passwordHash, ...result } = user;

    await AuditLogService.log({
      module: "USERS",
      action: "USER_CREATE",
      entityTable: "users",
      entityId: result.id,
      oldPayload: undefined,
      newPayload: result,
      req,
    });

    // Send invitation email and notification if requested
    try {
      await publishEmail({
        to: user.email,
        subject: "Welcome to Softvence - Account Invitation & Login Details",
        body: `Hello ${user.firstName},\n\nYou have been invited to join Softvence Project Management.\n\nYour temporary login credentials are:\nEmail: ${user.email}\nTemporary Password: ${rawTemporaryPassword}\n\nPlease sign in at your organization portal and change your temporary password upon your first login.\n\nBest regards,\nSoftvence Team`,
        metadata: {
          userId: user.id,
          email: user.email,
          role: user.systemRole,
        },
      });

      await publishNotification({
        recipientId: user.id,
        type: "USER_REGISTERED",
        title: "Account Invitation Created",
        body: `Welcome ${user.firstName}! Please login with your temporary credentials and update your password.`,
        entityType: "User",
        entityId: user.id,
      });
    } catch (msgErr) {
      this.logger.error("Failed to publish invitation email/notification", { error: msgErr });
    }

    return {
      ...result,
      temporaryPassword: rawTemporaryPassword,
    };
  }

  public async resendInvite(userId: string, customTemporaryPassword?: string, req?: Request) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { designation: { include: { department: true } } },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundError("User");
    }

    const rawTemporaryPassword =
      customTemporaryPassword && customTemporaryPassword.trim().length >= 8
        ? customTemporaryPassword
        : generateTemporaryPassword();

    const hashedPassword = await hashPassword(rawTemporaryPassword);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
        status: "INVITED",
        mustChangePassword: true,
        isActive: true,
        updatedAt: new Date(),
      },
      include: {
        designation: {
          include: { department: true },
        },
      },
    });

    const { passwordHash, ...result } = updated;

    await AuditLogService.log({
      module: "USERS",
      action: "USER_INVITE_RESENT",
      entityTable: "users",
      entityId: userId,
      oldPayload: { mustChangePassword: user.mustChangePassword, status: user.status },
      newPayload: { mustChangePassword: true, status: "INVITED" },
      req,
    });

    try {
      await publishEmail({
        to: user.email,
        subject: "Softvence - New Temporary Credentials & Login Instructions",
        body: `Hello ${user.firstName},\n\nA new temporary password has been generated for your Softvence account.\n\nYour login details are:\nEmail: ${user.email}\nTemporary Password: ${rawTemporaryPassword}\n\nPlease sign in and set your new permanent password.\n\nBest regards,\nSoftvence Team`,
        metadata: {
          userId: user.id,
          email: user.email,
        },
      });

      await publishNotification({
        recipientId: user.id,
        type: "USER_REGISTERED",
        title: "Account Invitation Resent",
        body: "A new temporary password has been issued for your account.",
        entityType: "User",
        entityId: user.id,
      });
    } catch (msgErr) {
      this.logger.error("Failed to publish resend invitation email/notification", { error: msgErr });
    }

    return {
      message: "Invitation resent successfully",
      temporaryPassword: rawTemporaryPassword,
      user: result,
    };
  }

  public async updateAdminUser(userId: string, data: UpdateAdminUserDTO, req?: Request) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    const { passwordHash: _, ...oldUserSanitized } = user;

    if (data.designationId) {
      const desig = await this.prisma.designation.findUnique({
        where: { id: data.designationId },
      });
      if (!desig) throw new NotFoundError("Designation");
    }

    if (data.employeeId && data.employeeId.trim() !== user.employeeId) {
      const existingEmployee = await this.prisma.user.findUnique({
        where: { employeeId: data.employeeId.trim() },
      });
      if (existingEmployee) {
        throw new ConflictError("A user with this employee ID already exists");
      }
    }

    let targetIsActive = data.isActive;
    if (data.status) {
      if (["INACTIVE", "SUSPENDED", "LOCKED", "ARCHIVED"].includes(data.status)) {
        targetIsActive = false;
      } else if (["ACTIVE", "INVITED"].includes(data.status) && targetIsActive === undefined) {
        targetIsActive = true;
      }
    }

    const updateData: any = {
      ...(data.firstName && { firstName: data.firstName.trim() }),
      ...(data.lastName && { lastName: data.lastName.trim() }),
      ...(data.employeeId && { employeeId: data.employeeId.trim() }),
      ...(data.systemRole && { systemRole: data.systemRole as any }),
      ...(data.designationId && { designationId: data.designationId }),
      ...(data.status && { status: data.status as any }),
      ...(targetIsActive !== undefined && { isActive: targetIsActive }),
      updatedAt: new Date(),
    };

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        designation: {
          include: { department: true },
        },
      },
    });

    // If status deactivated/suspended or isActive set to false, invalidate all user sessions
    if (
      targetIsActive === false ||
      (data.status && ["INACTIVE", "SUSPENDED", "LOCKED", "ARCHIVED"].includes(data.status))
    ) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }

    const { passwordHash, ...result } = updated;

    await AuditLogService.log({
      module: "USERS",
      action: "USER_UPDATE",
      entityTable: "users",
      entityId: result.id,
      oldPayload: oldUserSanitized,
      newPayload: result,
      req,
    });

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

  public async createOverride(data: CreateOverrideDTO, granterId: string, req?: Request) {
    const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) throw new NotFoundError("User");

    const perm = await this.prisma.permission.findUnique({ where: { id: data.permissionId } });
    if (!perm) throw new NotFoundError("Permission");

    const existing = await this.prisma.userPermissionOverride.findFirst({
      where: {
        userId: data.userId,
        permissionId: data.permissionId,
        departmentId: data.departmentId || null,
        teamId: data.teamId || null,
        projectId: data.projectId || null,
      },
    });

    let override;
    if (existing) {
      override = await this.prisma.userPermissionOverride.update({
        where: { id: existing.id },
        data: {
          isDeny: data.isDeny,
          grantedBy: granterId,
          reason: data.reason || null,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        },
        include: {
          user: true,
          permission: true,
        },
      });
    } else {
      override = await this.prisma.userPermissionOverride.create({
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
    }

    await AuthorizationEngine.getInstance().invalidateCache();

    await AuditLogService.log({
      module: "PERMISSIONS",
      action: existing ? "PERMISSION_OVERRIDE_UPDATE" : "PERMISSION_OVERRIDE_CREATE",
      entityTable: "user_permission_overrides",
      entityId: override.id,
      oldPayload: existing || undefined,
      newPayload: override,
      req,
    });

    return override;
  }

  public async revokeOverride(overrideId: string, req?: Request) {
    const override = await this.prisma.userPermissionOverride.findUnique({
      where: { id: overrideId },
    });
    if (!override) throw new NotFoundError("Permission Override");

    await this.prisma.userPermissionOverride.delete({
      where: { id: overrideId },
    });

    await AuthorizationEngine.getInstance().invalidateCache();

    await AuditLogService.log({
      module: "PERMISSIONS",
      action: "PERMISSION_OVERRIDE_REVOKE",
      entityTable: "user_permission_overrides",
      entityId: overrideId,
      oldPayload: override,
      newPayload: undefined,
      req,
    });

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

  public async createDelegation(data: CreateDelegationDTO, creatorId: string, req?: Request) {
    if (data.delegatorId === data.delegateeId) {
      throw new BadRequestError("Delegator and delegatee cannot be the same user");
    }

    const validFrom = new Date(data.validFrom);
    const validUntil = new Date(data.validUntil);

    if (isNaN(validFrom.getTime()) || isNaN(validUntil.getTime())) {
      throw new BadRequestError("Invalid delegation date format");
    }

    if (validUntil < validFrom) {
      throw new BadRequestError("Delegation end date must be on or after start date");
    }

    const delegator = await this.prisma.user.findUnique({ where: { id: data.delegatorId } });
    if (!delegator) throw new NotFoundError("Delegator User");

    const delegatee = await this.prisma.user.findUnique({ where: { id: data.delegateeId } });
    if (!delegatee) throw new NotFoundError("Delegatee User");

    const delegation = await this.prisma.delegation.create({
      data: {
        delegatorId: data.delegatorId,
        delegateeId: data.delegateeId,
        scope: data.scope || "*",
        validFrom,
        validUntil,
        createdBy: creatorId,
      },
      include: {
        delegator: true,
        delegatee: true,
      },
    });

    await AuthorizationEngine.getInstance().invalidateCache();

    await AuditLogService.log({
      module: "PERMISSIONS",
      action: "DELEGATION_CREATE",
      entityTable: "delegations",
      entityId: delegation.id,
      oldPayload: undefined,
      newPayload: delegation,
      req,
    });

    return delegation;
  }

  public async revokeDelegation(delegationId: string, req?: Request) {
    const del = await this.prisma.delegation.findUnique({
      where: { id: delegationId },
    });
    if (!del) throw new NotFoundError("Delegation");

    await this.prisma.delegation.delete({
      where: { id: delegationId },
    });

    await AuthorizationEngine.getInstance().invalidateCache();

    await AuditLogService.log({
      module: "PERMISSIONS",
      action: "DELEGATION_REVOKE",
      entityTable: "delegations",
      entityId: delegationId,
      oldPayload: del,
      newPayload: undefined,
      req,
    });

    return { message: "Delegation revoked successfully" };
  }
}
