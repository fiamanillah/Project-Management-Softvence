import { PrismaClient } from "@workspace/db";
import type { CacheManager } from "@workspace/cache";
import type { Request } from "express";
import { AppLogger } from "@/core/logging/logger";
import { AuthenticationError, BadRequestError, ConflictError } from "@/core/errors/AppError";
import { AuditLogService } from "@/core/audit/audit.service";
import { getUserPermissions as fetchUserPermissions } from "@/core/authorization/AuthorizationEngine";
import { publishNotification } from "@workspace/message-broker";
import { env } from "@/env";
import {
  hashPassword,
  verifyPassword,
  generateOpaqueToken,
  hashToken,
  signAccessToken,
} from "@/utils/crypto";

export class AuthServices {
  private logger = new AppLogger("AuthServices");

  constructor(
    private readonly prisma: PrismaClient,
    private readonly cache?: CacheManager,
  ) {}

  /**
   * Register a new user with Argon2id password hashing
   */
  public async register(
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    designationId?: string,
    req?: Request,
  ) {
    this.logger.info("Attempting to register user", { email });

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      this.logger.warn("Registration failed: User already exists", { email });
      throw new ConflictError("A user with this email already exists");
    }

    const hashedPassword = await hashPassword(password);

    // Fallback default designation if not provided
    let finalDesignationId = designationId;
    if (!finalDesignationId) {
      const defaultDesignation = await this.prisma.designation.findFirst();
      if (!defaultDesignation) {
        throw new BadRequestError("No default designation configured in system");
      }
      finalDesignationId = defaultDesignation.id;
    }

    const newUser = await this.prisma.user.create({
      data: {
        email,
        employeeId: `EMP-${Date.now().toString().slice(-6)}`,
        firstName,
        lastName,
        passwordHash: hashedPassword,
        systemRole: "Staff",
        designationId: finalDesignationId,
        isActive: true,
      },
    });

    this.logger.info("User registered successfully", { userId: newUser.id });

    try {
      await AuditLogService.log({
        module: "AUTH",
        action: "USER_REGISTERED",
        entityTable: "users",
        entityId: newUser.id,
        actor: {
          id: newUser.id,
          email: newUser.email,
        },
        newPayload: {
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        },
        req,
      });

      await publishNotification({
        recipientId: newUser.id,
        type: "Mention",
        title: "Welcome to Project Management Softvence!",
        body: `Hello ${newUser.firstName}, your account has been successfully created.`,
        entityType: "User",
        entityId: newUser.id,
      });
    } catch (brokerError) {
      this.logger.error("Failed to publish notification/audit events", { error: brokerError });
    }

    return this.sanitizeUser(newUser);
  }

  /**
   * POST /auth/login: Verify Argon2id password, issue 15-min JWT & 30-day opaque refresh token
   */
  public async login(email: string, password: string, deviceInfo?: string, req?: Request) {
    this.logger.info("Login attempt", { email });

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive || user.deletedAt) {
      this.logger.warn("Login failed: Invalid credentials or inactive user", { email });
      await AuditLogService.log({
        module: "AUTH",
        action: "USER_LOGIN_FAILED",
        entityTable: "users",
        entityId: email,
        status: "FAILED",
        errorMessage: "Invalid credentials or inactive user",
        metadata: { email, deviceInfo },
        req,
      });
      throw new AuthenticationError("Invalid email or password");
    }

    const isPasswordValid = await verifyPassword(user.passwordHash, password);
    if (!isPasswordValid) {
      this.logger.warn("Login failed: Password mismatch", { email });
      await AuditLogService.log({
        module: "AUTH",
        action: "USER_LOGIN_FAILED",
        entityTable: "users",
        entityId: user.id,
        actor: { id: user.id, email: user.email, role: user.systemRole },
        status: "FAILED",
        errorMessage: "Password mismatch",
        metadata: { email, deviceInfo },
        req,
      });
      throw new AuthenticationError("Invalid email or password");
    }

    // 1. Sign Access Token with strict identity claims
    const accessToken = signAccessToken({
      sub: user.id,
      systemRole: user.systemRole,
      designationId: user.designationId,
    });

    // 2. Generate opaque 64-byte refresh token and hash with SHA-256
    const rawRefreshToken = generateOpaqueToken();
    const tokenHash = hashToken(rawRefreshToken);

    const refreshDays = env.REFRESH_TOKEN_EXPIRES_DAYS || 30;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    // Save hashed refresh token to DB
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        deviceInfo: deviceInfo || "Unknown Device",
        expiresAt,
      },
    });

    // Cache in Redis for performance
    if (this.cache) {
      const cacheKey = `auth:refresh:${tokenHash}`;
      const userRefreshPatternKey = `auth:refresh:user:${user.id}:${tokenHash}`;
      const cacheData = { userId: user.id, expiresAt: expiresAt.toISOString() };
      const ttlSeconds = refreshDays * 86400;

      await this.cache.set(cacheKey, cacheData, { ttlSeconds });
      await this.cache.set(userRefreshPatternKey, cacheData, { ttlSeconds });
      await this.cache.del(`auth:sessions:${user.id}`);
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.info("User logged in successfully", { userId: user.id });

    await AuditLogService.log({
      module: "AUTH",
      action: "USER_LOGIN_SUCCESS",
      entityTable: "users",
      entityId: user.id,
      actor: { id: user.id, email: user.email, role: user.systemRole },
      metadata: { deviceInfo },
      req,
    });

    return {
      accessToken,
      rawRefreshToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * POST /auth/refresh: Rotation & Theft Detection
   */
  public async refresh(rawRefreshToken: string, deviceInfo?: string, req?: Request) {
    if (!rawRefreshToken) {
      throw new AuthenticationError("Refresh token required");
    }

    const tokenHash = hashToken(rawRefreshToken);
    let userId: string | null = null;

    // Check Redis cache first
    let cachedSession: { userId: string; expiresAt: string } | null = null;
    if (this.cache) {
      cachedSession = await this.cache.get<{ userId: string; expiresAt: string }>(`auth:refresh:${tokenHash}`);
    }

    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    // --- TOKEN THEFT DETECTION ---
    // If incoming refresh token hash is NOT found or revoked, assume token was stolen and reused!
    if (!existingToken || existingToken.revokedAt) {
      this.logger.error("🚨 REFRESH TOKEN THEFT DETECTED! Token reuse or non-existent token presented", { tokenHash });

      if (cachedSession) {
        userId = cachedSession.userId;
      } else if (existingToken) {
        userId = existingToken.userId;
      }

      if (userId) {
        // Revoke ALL active sessions for this user immediately across DB & Redis
        await this.invalidateAllUserSessions(userId);
      }

      await AuditLogService.log({
        module: "AUTH",
        action: "TOKEN_THEFT_DETECTED",
        entityTable: "refresh_tokens",
        entityId: userId || "UNKNOWN",
        status: "FAILED",
        errorMessage: "Security alert: Stolen or invalid refresh token presented. Revoked all sessions.",
        metadata: { deviceInfo },
        req,
      });

      throw new AuthenticationError("Security alert: Stolen or invalid refresh token. All active sessions invalidated.");
    }

    userId = existingToken.userId;
    const user = existingToken.user;

    // Check expiration
    if (existingToken.expiresAt < new Date() || !user.isActive || user.deletedAt) {
      await this.invalidateAllUserSessions(userId);
      throw new AuthenticationError("Refresh token expired or account disabled. Please log in again.");
    }

    // --- ROTATION ---
    // 1. Instantly delete consumed refresh token from DB & Redis
    await this.prisma.refreshToken.delete({
      where: { id: existingToken.id },
    });

    if (this.cache) {
      await this.cache.del(`auth:refresh:${tokenHash}`);
      await this.cache.del(`auth:refresh:user:${userId}:${tokenHash}`);
    }

    // 2. Generate new Access Token & new Refresh Token
    const newAccessToken = signAccessToken({
      sub: user.id,
      systemRole: user.systemRole,
      designationId: user.designationId,
    });

    const newRawRefreshToken = generateOpaqueToken();
    const newTokenHash = hashToken(newRawRefreshToken);

    const refreshDays = env.REFRESH_TOKEN_EXPIRES_DAYS || 30;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    // 3. Save new refresh token
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        deviceInfo: deviceInfo || existingToken.deviceInfo || "Unknown Device",
        expiresAt,
      },
    });

    if (this.cache) {
      const ttlSeconds = refreshDays * 86400;
      const cacheData = { userId: user.id, expiresAt: expiresAt.toISOString() };
      await this.cache.set(`auth:refresh:${newTokenHash}`, cacheData, { ttlSeconds });
      await this.cache.set(`auth:refresh:user:${user.id}:${newTokenHash}`, cacheData, { ttlSeconds });
      await this.cache.del(`auth:sessions:${user.id}`);
    }

    await AuditLogService.log({
      module: "AUTH",
      action: "TOKEN_REFRESH",
      entityTable: "refresh_tokens",
      entityId: user.id,
      actor: { id: user.id, email: user.email, role: user.systemRole },
      metadata: { deviceInfo },
      req,
    });

    return {
      accessToken: newAccessToken,
      rawRefreshToken: newRawRefreshToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * GET /auth/sessions: Return active user sessions (NEVER returning tokenHash)
   */
  public async getSessions(userId: string) {
    const cacheKey = `auth:sessions:${userId}`;

    if (this.cache) {
      const cachedSessions = await this.cache.get<any[]>(cacheKey);
      if (cachedSessions) return cachedSessions;
    }

    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
      select: {
        id: true,
        deviceInfo: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (this.cache) {
      await this.cache.set(cacheKey, sessions, { ttlSeconds: 300 });
    }

    return sessions;
  }

  /**
   * DELETE /auth/sessions/:id: Remotely revoke a specific session
   */
  public async revokeSession(userId: string, sessionId: string, req?: Request) {
    const session = await this.prisma.refreshToken.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new BadRequestError("Session not found or does not belong to user");
    }

    await this.prisma.refreshToken.delete({
      where: { id: sessionId },
    });

    if (this.cache) {
      await this.cache.del(`auth:refresh:${session.tokenHash}`);
      await this.cache.del(`auth:refresh:user:${userId}:${session.tokenHash}`);
      await this.cache.del(`auth:sessions:${userId}`);
    }

    await AuditLogService.log({
      module: "AUTH",
      action: "SESSION_REVOKE",
      entityTable: "refresh_tokens",
      entityId: sessionId,
      oldPayload: session,
      newPayload: undefined,
      req,
    });

    return { message: "Session revoked successfully" };
  }

  /**
   * POST /auth/logout: Revoke current session
   */
  public async logout(rawRefreshToken?: string, userId?: string, req?: Request) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (tokenRecord) {
        await this.prisma.refreshToken.delete({
          where: { id: tokenRecord.id },
        });

        if (this.cache) {
          await this.cache.del(`auth:refresh:${tokenHash}`);
          await this.cache.del(`auth:refresh:user:${tokenRecord.userId}:${tokenHash}`);
          await this.cache.del(`auth:sessions:${tokenRecord.userId}`);
        }
      }
    } else if (userId) {
      await this.invalidateAllUserSessions(userId);
    }

    await AuditLogService.log({
      module: "AUTH",
      action: "USER_LOGOUT",
      entityTable: "users",
      entityId: userId || "UNKNOWN",
      req,
    });

    return { message: "Logged out successfully" };
  }

  /**
   * POST /auth/forgot-password: Issue single-use password reset token
   */
  public async forgotPassword(email: string, req?: Request) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive || user.deletedAt) {
      // Do not reveal email absence for security
      return { message: "If that email is registered, password reset instructions have been sent." };
    }

    const rawResetToken = generateOpaqueToken();
    const tokenHash = hashToken(rawResetToken);
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes

    // Delete previous reset tokens for user
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new reset token record
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    if (this.cache) {
      await this.cache.set(
        `auth:reset:${tokenHash}`,
        { userId: user.id, expiresAt: expiresAt.toISOString() },
        { ttlSeconds: 1200 },
      );
    }

    this.logger.info("Password reset token generated", { userId: user.id });

    await AuditLogService.log({
      module: "AUTH",
      action: "PASSWORD_RESET_REQUEST",
      entityTable: "users",
      entityId: user.id,
      actor: { id: user.id, email: user.email, role: user.systemRole },
      req,
    });

    // Send email / broker notification
    try {
      await publishNotification({
        recipientId: user.id,
        type: "Mention",
        title: "Password Reset Request",
        body: `Use this single-use reset token: ${rawResetToken}`,
        entityType: "User",
        entityId: user.id,
      });
    } catch (e) {
      this.logger.error("Failed to publish password reset notification", { error: e });
    }

    return {
      message: "If that email is registered, password reset instructions have been sent.",
      resetToken: env.NODE_ENV === "development" || env.NODE_ENV === "test" ? rawResetToken : undefined,
    };
  }

  /**
   * POST /auth/reset-password: Accept single-use token and update password
   */
  public async resetPassword(rawToken: string, newPassword: string, req?: Request) {
    const tokenHash = hashToken(rawToken);

    const resetTokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetTokenRecord || resetTokenRecord.expiresAt < new Date()) {
      throw new BadRequestError("Invalid or expired password reset token.");
    }

    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await this.prisma.user.update({
      where: { id: resetTokenRecord.userId },
      data: { passwordHash: hashedPassword },
    });

    // Delete used reset token
    await this.prisma.passwordResetToken.delete({
      where: { id: resetTokenRecord.id },
    });

    if (this.cache) {
      await this.cache.del(`auth:reset:${tokenHash}`);
    }

    // Force logout on all active devices
    await this.invalidateAllUserSessions(resetTokenRecord.userId);

    this.logger.info("Password reset successfully. Cleared all user sessions.", {
      userId: resetTokenRecord.userId,
    });

    await AuditLogService.log({
      module: "AUTH",
      action: "PASSWORD_RESET_SUCCESS",
      entityTable: "users",
      entityId: resetTokenRecord.userId,
      req,
    });

    return { message: "Password reset successful. Please log in with your new password." };
  }

  /**
   * Fetch permission map for the authenticated user (for UI visibility rendering)
   */
  public async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new AuthenticationError("User account disabled or non-existent");
    }

    const authenticatedUser = {
      id: user.id,
      systemRole: user.systemRole,
      designationId: user.designationId,
      email: user.email,
    };

    return fetchUserPermissions(authenticatedUser);
  }

  /**
   * Helper to invalidate all active refresh tokens and caches for a user
   */
  private async invalidateAllUserSessions(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    if (this.cache) {
      await this.cache.delByPattern(`auth:refresh:user:${userId}:*`);
      await this.cache.del(`auth:sessions:${userId}`);
    }
  }

  /**
   * Helper to remove passwordHash and sensitive attributes from User model
   */
  private sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}
