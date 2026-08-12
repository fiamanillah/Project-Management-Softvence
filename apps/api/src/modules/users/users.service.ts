import { PrismaClient, AuthTokenType, SystemRole } from "@workspace/db";
import { generateOpaqueToken, hashToken } from "@/infra/token.utils";
import { AuditLogger } from "@/infra/audit/audit-logger.interface";
import { NotificationDispatcher } from "@/infra/notification/notification-dispatcher.interface";
import crypto from "crypto";

export interface InviteUserParams {
  email: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  designation_id: string;
  system_role?: SystemRole;
}

export interface UserContextParams {
  ipAddress?: string;
  userAgent?: string;
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
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email.toLowerCase().trim() },
          { employee_id: data.employee_id },
        ],
      },
    });

    if (existing) {
      throw new Error("User with this email or employee ID already exists");
    }

    const dummyPasswordHash = `LOCKED_INVITE_${crypto.randomBytes(16).toString("hex")}`;

    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        first_name: data.first_name,
        last_name: data.last_name,
        employee_id: data.employee_id,
        designation_id: data.designation_id,
        system_role: data.system_role ?? SystemRole.Staff,
        is_active: false,
        password_hash: dummyPasswordHash,
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

    await this.notificationDispatcher.dispatch({
      recipientId: user.id,
      type: "INVITE",
      title: "Agency Account Invitation",
      body: `You have been invited to join the agency. Use invite token: ${rawInviteToken}`,
      entityType: "user",
      entityId: user.id,
    });

    await this.auditLogger.log({
      actorId,
      action: "USER_INVITED",
      entityType: "user",
      entityId: user.id,
      details: { email: user.email, designation: user.designation.code },
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
      },
      inviteToken: rawInviteToken,
    };
  }

  public async listUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { deleted_at: null } }),
      this.prisma.user.findMany({
        where: { deleted_at: null },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          employee_id: true,
          system_role: true,
          is_active: true,
          last_login_at: true,
          created_at: true,
          designation: true,
        },
      }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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
      // Revoke all refresh tokens for that user
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
