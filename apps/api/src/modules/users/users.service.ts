import { PrismaClient, AuthTokenType, SystemRole } from "@workspace/db";
import { generateOpaqueToken, hashToken } from "@/infra/token.utils";
import { AuditLogger } from "@/infra/audit/audit-logger.interface";
import { NotificationDispatcher } from "@/infra/notification/notification-dispatcher.interface";

export type UserComputedStatus = "active" | "pending" | "expired" | "deactivated";

export interface InviteUserParams {
  email: string;
  first_name: string;
  last_name: string;
  employee_id?: string;
  designation_id: string;
  system_role?: SystemRole;
}

export interface UserContextParams {
  ipAddress?: string;
  userAgent?: string;
}

export function computeUserStatus(user: {
  is_active: boolean;
  password_hash: string | null;
  auth_tokens?: Array<{ used_at: Date | null; expires_at: Date }>;
}): UserComputedStatus {
  if (user.is_active) {
    return "active";
  }

  const isPasswordSet =
    user.password_hash !== null && !user.password_hash.startsWith("LOCKED_INVITE_");
  if (isPasswordSet) {
    return "deactivated";
  }

  const latestInvite = user.auth_tokens?.[0];
  if (latestInvite && !latestInvite.used_at && new Date(latestInvite.expires_at) > new Date()) {
    return "pending";
  }

  return "expired";
}

export class UsersService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogger: AuditLogger,
    private readonly notificationDispatcher: NotificationDispatcher
  ) {}

  public async inviteUser(
    actorId: string,
    data: InviteUserParams,
    ctx?: UserContextParams
  ) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { system_role: true },
    });
    const actorRole = actor?.system_role ?? SystemRole.Staff;
    const requestedSystemRole = data.system_role ?? SystemRole.Staff;

    if (
      (requestedSystemRole === SystemRole.Admin || requestedSystemRole === SystemRole.SuperAdmin) &&
      actorRole !== SystemRole.SuperAdmin
    ) {
      const err: any = new Error("Only SuperAdmin can assign Admin or SuperAdmin system roles");
      err.statusCode = 403;
      throw err;
    }

    const email = data.email.toLowerCase().trim();
    const employeeId = data.employee_id || `EMP-${Date.now()}`;

    const existing = await this.prisma.user.findFirst({
      where: {
        deleted_at: null,
        OR: [{ email }, { employee_id: employeeId }],
      },
    });

    if (existing) {
      throw new Error("User with this email or employee ID already exists");
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        first_name: data.first_name,
        last_name: data.last_name,
        employee_id: employeeId,
        designation_id: data.designation_id,
        system_role: requestedSystemRole,
        is_active: false,
        password_hash: null,
      },
      include: { designation: true },
    });

    const rawInviteToken = generateOpaqueToken();
    const tokenHash = hashToken(rawInviteToken);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    await this.prisma.authToken.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        type: AuthTokenType.INVITE,
        expires_at: expiresAt,
      },
    });

    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/accept-invite?token=${rawInviteToken}`;

    await this.notificationDispatcher.dispatch({
      recipientId: user.id,
      type: "INVITE",
      title: "Agency Account Invitation",
      body: `You have been invited to join the agency. Use invite URL: ${inviteUrl}`,
      entityType: "user",
      entityId: user.id,
    });

    await this.auditLogger.log({
      actorId,
      action: "USER_INVITED",
      entityType: "user",
      entityId: user.id,
      details: {
        email: user.email,
        designation_id: user.designation_id,
        designation: user.designation.code,
        system_role: user.system_role,
      },
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        employee_id: user.employee_id,
        system_role: user.system_role,
        designation: user.designation,
        is_active: user.is_active,
        status: "pending" as UserComputedStatus,
      },
      inviteToken: rawInviteToken,
      inviteUrl,
    };
  }

  public async regenerateInviteLink(
    actorId: string,
    targetUserId: string,
    ctx?: UserContextParams
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, deleted_at: null },
      include: {
        auth_tokens: {
          where: { type: AuthTokenType.INVITE },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const currentStatus = computeUserStatus(user);
    if (currentStatus !== "pending" && currentStatus !== "expired") {
      throw new Error("Invite links can only be generated for pending or expired invitations");
    }

    // Invalidate existing unused invite tokens for that user
    await this.prisma.authToken.updateMany({
      where: {
        user_id: targetUserId,
        type: AuthTokenType.INVITE,
        used_at: null,
      },
      data: { used_at: new Date() },
    });

    const rawInviteToken = generateOpaqueToken();
    const tokenHash = hashToken(rawInviteToken);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

    await this.prisma.authToken.create({
      data: {
        user_id: targetUserId,
        token_hash: tokenHash,
        type: AuthTokenType.INVITE,
        expires_at: expiresAt,
      },
    });

    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/accept-invite?token=${rawInviteToken}`;

    await this.auditLogger.log({
      actorId,
      action: "INVITE_LINK_REGENERATED",
      entityType: "user",
      entityId: targetUserId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    return { inviteUrl, inviteToken: rawInviteToken };
  }

  public async revokeInvite(actorId: string, targetUserId: string, ctx?: UserContextParams) {
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, deleted_at: null },
      include: {
        auth_tokens: {
          where: { type: AuthTokenType.INVITE },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const currentStatus = computeUserStatus(user);
    if (currentStatus !== "pending" && currentStatus !== "expired") {
      throw new Error("Only pending or expired invitations can be revoked");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetUserId },
        data: { deleted_at: new Date(), is_active: false },
      }),
      this.prisma.authToken.updateMany({
        where: { user_id: targetUserId, type: AuthTokenType.INVITE, used_at: null },
        data: { used_at: new Date() },
      }),
    ]);

    await this.auditLogger.log({
      actorId,
      action: "INVITE_REVOKED",
      entityType: "user",
      entityId: targetUserId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    return { success: true, message: "Invitation revoked successfully" };
  }

  public async reactivateUser(actorId: string, targetUserId: string, ctx?: UserContextParams) {
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, deleted_at: null },
      include: {
        auth_tokens: {
          where: { type: AuthTokenType.INVITE },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const currentStatus = computeUserStatus(user);
    if (currentStatus !== "deactivated") {
      throw new Error("Only deactivated users can be reactivated");
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { is_active: true },
    });

    await this.auditLogger.log({
      actorId,
      action: "USER_REACTIVATED",
      entityType: "user",
      entityId: targetUserId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    return { success: true, message: "User reactivated successfully" };
  }

  public async listUsers(
    page = 1,
    limit = 20,
    options?: { status?: string; search?: string }
  ) {
    const where: any = { deleted_at: null };

    if (options?.search && options.search.trim()) {
      const searchTerm = options.search.trim();
      where.OR = [
        { first_name: { contains: searchTerm, mode: "insensitive" } },
        { last_name: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        employee_id: true,
        system_role: true,
        is_active: true,
        password_hash: true,
        last_login_at: true,
        created_at: true,
        designation: true,
        auth_tokens: {
          where: { type: AuthTokenType.INVITE },
          orderBy: { created_at: "desc" },
          take: 1,
          select: { used_at: true, expires_at: true },
        },
      },
    });

    const allComputedUsers = users.map((u) => {
      const computedStatus = computeUserStatus(u);
      const { password_hash, auth_tokens, ...rest } = u;
      return {
        ...rest,
        status: computedStatus,
      };
    });

    let filteredUsers = allComputedUsers;
    if (options?.status) {
      const filterStatus = options.status.toLowerCase().trim();
      filteredUsers = allComputedUsers.filter((u) => u.status === filterStatus);
    }

    const total = filteredUsers.length;
    const skip = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(skip, skip + limit);

    return {
      data: paginatedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  public async deactivateUser(
    actorId: string,
    targetUserId: string,
    ctx?: UserContextParams
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user || user.deleted_at !== null) {
      throw new Error("User not found");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetUserId },
        data: { is_active: false },
      }),
      this.prisma.refreshToken.updateMany({
        where: { user_id: targetUserId, revoked_at: null },
        data: { revoked_at: new Date() },
      }),
    ]);

    await this.auditLogger.log({
      actorId,
      action: "USER_DEACTIVATED",
      entityType: "user",
      entityId: targetUserId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    return { success: true, message: "User deactivated successfully" };
  }

  public async listDesignations() {
    const designations = await this.prisma.designation.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        department: true,
      },
    });

    return designations;
  }
}
