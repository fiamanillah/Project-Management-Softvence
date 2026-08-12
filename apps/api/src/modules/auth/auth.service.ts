import { PrismaClient, AuthTokenType } from "@workspace/db";
import jwt from "jsonwebtoken";
import { config } from "@/core/config";
import { hashPassword, verifyPassword } from "@/infra/password";
import { generateOpaqueToken, hashToken } from "@/infra/token.utils";
import { AuditLogger } from "@/infra/audit/audit-logger.interface";
import { NotificationDispatcher } from "@/infra/notification/notification-dispatcher.interface";
import { RbacService } from "@/modules/rbac/rbac.service";

export interface LoginParams {
  email?: string;
  password?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthContextParams {
  ipAddress?: string;
  userAgent?: string;
}

export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogger: AuditLogger,
    private readonly notificationDispatcher: NotificationDispatcher,
    private readonly rbacService: RbacService
  ) {}

  public async login(params: LoginParams) {
    const genericErrorMessage = "Invalid email or password";

    if (!params.email || !params.password) {
      throw new Error(genericErrorMessage);
    }

    const user = await this.prisma.user.findUnique({
      where: { email: params.email.toLowerCase().trim() },
      include: { designation: true },
    });

    if (!user || !user.is_active || user.deleted_at !== null || !user.password_hash) {
      throw new Error(genericErrorMessage);
    }

    const isPasswordValid = await verifyPassword(params.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error(genericErrorMessage);
    }

    // 1. Issue Access Token JWT (expires in 15 minutes)
    const accessToken = jwt.sign({ sub: user.id }, config.security.jwt.secret, {
      expiresIn: "15m",
      issuer: config.security.jwt.issuer,
    });

    // 2. Issue Refresh Token (opaque hex, stored as sha256 hash)
    const rawRefreshToken = generateOpaqueToken();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: refreshTokenHash,
        expires_at: refreshTokenExpiresAt,
        device_info: params.userAgent ?? null,
      },
    });

    // 3. Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    // 4. Audit Log
    await this.auditLogger.log({
      actorId: user.id,
      action: "USER_LOGIN",
      entityType: "user",
      entityId: user.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        employee_id: user.employee_id,
        system_role: user.system_role,
        designation: user.designation,
      },
    };
  }

  public async refresh(rawRefreshToken?: string, ctx?: AuthContextParams) {
    if (!rawRefreshToken) {
      throw new Error("Refresh token required");
    }

    const tokenHash = hashToken(rawRefreshToken);
    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });

    if (
      !existingToken ||
      existingToken.revoked_at !== null ||
      existingToken.expires_at < new Date()
    ) {
      throw new Error("Invalid or expired refresh token");
    }

    // Must rotate on every use — revoke presented refresh token
    await this.prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { revoked_at: new Date() },
    });

    const user = existingToken.user;
    if (!user || !user.is_active || user.deleted_at !== null) {
      throw new Error("User account is inactive");
    }

    // Generate new access token
    const newAccessToken = jwt.sign({ sub: user.id }, config.security.jwt.secret, {
      expiresIn: "15m",
      issuer: config.security.jwt.issuer,
    });

    // Generate new rotated refresh token
    const newRawRefreshToken = generateOpaqueToken();
    const newRefreshTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: newRefreshTokenHash,
        expires_at: newExpiresAt,
        device_info: ctx?.userAgent ?? existingToken.device_info,
      },
    });

    await this.auditLogger.log({
      actorId: user.id,
      action: "TOKEN_REFRESH",
      entityType: "user",
      entityId: user.id,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  public async logout(rawRefreshToken?: string, userId?: string, ctx?: AuthContextParams) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { token_hash: tokenHash, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    }

    if (userId) {
      await this.auditLogger.log({
        actorId: userId,
        action: "USER_LOGOUT",
        entityType: "user",
        entityId: userId,
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
      });
    }
  }

  public async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { designation: true },
    });

    if (!user || !user.is_active || user.deleted_at !== null) {
      throw new Error("User not found or inactive");
    }

    // Resolve user permissions list for UI rendering
    // Note: This permission list is returned for UI-only conditional rendering and is not a security boundary.
    const permissions = await this.rbacService.getUserPermissions(userId);

    return {
      id: user.id,
      email: user.email,
      employee_id: user.employee_id,
      first_name: user.first_name,
      last_name: user.last_name,
      system_role: user.system_role,
      designation: user.designation,
      permissions,
    };
  }

  public async changePassword(
    userId: string,
    currentPassword?: string,
    newPassword?: string,
    ctx?: AuthContextParams
  ) {
    if (!currentPassword || !newPassword) {
      throw new Error("Current password and new password are required");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.is_active || user.deleted_at !== null || !user.password_hash) {
      throw new Error("User not found or inactive");
    }

    const isCurrentValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      throw new Error("Current password is incorrect");
    }

    const newHash = await hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash: newHash },
    });

    await this.auditLogger.log({
      actorId: userId,
      action: "USER_CHANGE_PASSWORD",
      entityType: "user",
      entityId: userId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });
  }

  public async forgotPassword(email?: string, ctx?: AuthContextParams) {
    const responseMessage =
      "If an account exists with this email address, password reset instructions have been sent.";

    if (!email) {
      return { message: responseMessage };
    }

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.is_active || user.deleted_at !== null) {
      return { message: responseMessage };
    }

    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.authToken.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        type: AuthTokenType.PASSWORD_RESET,
        expires_at: expiresAt,
      },
    });

    await this.notificationDispatcher.dispatch({
      recipientId: user.id,
      type: "PASSWORD_RESET",
      title: "Password Reset Request",
      body: `Your password reset token is: ${rawToken}`,
      entityType: "user",
      entityId: user.id,
    });

    await this.auditLogger.log({
      actorId: user.id,
      action: "USER_FORGOT_PASSWORD_REQUEST",
      entityType: "user",
      entityId: user.id,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    return { message: responseMessage };
  }

  public async resetPassword(
    token?: string,
    newPassword?: string,
    ctx?: AuthContextParams
  ) {
    if (!token || !newPassword) {
      throw new Error("Token and new password are required");
    }

    const tokenHash = hashToken(token);
    const authToken = await this.prisma.authToken.findUnique({
      where: { token_hash: tokenHash },
    });

    if (
      !authToken ||
      authToken.type !== AuthTokenType.PASSWORD_RESET ||
      authToken.used_at !== null ||
      authToken.expires_at < new Date()
    ) {
      throw new Error("Invalid or expired reset token");
    }

    const newHash = await hashPassword(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: authToken.user_id },
        data: { password_hash: newHash },
      }),
      this.prisma.authToken.update({
        where: { id: authToken.id },
        data: { used_at: new Date() },
      }),
      // Revoke all refresh tokens for that user
      this.prisma.refreshToken.updateMany({
        where: { user_id: authToken.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      }),
    ]);

    await this.auditLogger.log({
      actorId: authToken.user_id,
      action: "USER_RESET_PASSWORD",
      entityType: "user",
      entityId: authToken.user_id,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });
  }

  public async acceptInvite(
    token?: string,
    password?: string,
    ctx?: AuthContextParams
  ) {
    if (!token || !password) {
      throw new Error("Token and password are required");
    }

    const tokenHash = hashToken(token);
    const authToken = await this.prisma.authToken.findUnique({
      where: { token_hash: tokenHash },
    });

    if (
      !authToken ||
      authToken.type !== AuthTokenType.INVITE ||
      authToken.used_at !== null ||
      authToken.expires_at < new Date()
    ) {
      throw new Error("Invalid or expired invite token");
    }

    const newHash = await hashPassword(password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: authToken.user_id },
        data: {
          password_hash: newHash,
          is_active: true,
        },
      }),
      this.prisma.authToken.update({
        where: { id: authToken.id },
        data: { used_at: new Date() },
      }),
    ]);

    await this.auditLogger.log({
      actorId: authToken.user_id,
      action: "USER_ACCEPT_INVITE",
      entityType: "user",
      entityId: authToken.user_id,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });
  }
}
