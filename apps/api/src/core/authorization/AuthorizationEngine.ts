// src/core/authorization/AuthorizationEngine.ts

import type { PrismaClient } from "@workspace/db";
import { CacheManager } from "@workspace/cache";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { AppLogger } from "@/core/logging/logger";
import { config } from "@/core/config";
import { AuditLogService } from "@/core/audit/audit.service";
import { ScopeEvaluator } from "./ScopeEvaluator";
import type {
  AuthenticatedUser,
  AuthorizationResourceContext,
  ResolvedDesignationGrant,
} from "./authorization.types";

export class AuthorizationEngine {
  private static instance: AuthorizationEngine;
  private logger = new AppLogger("AuthorizationEngine");
  private cacheManager: CacheManager;

  private constructor() {
    this.cacheManager = new CacheManager(config.redis);
  }

  public static getInstance(): AuthorizationEngine {
    if (!AuthorizationEngine.instance) {
      AuthorizationEngine.instance = new AuthorizationEngine();
    }
    return AuthorizationEngine.instance;
  }

  /**
   * Primary Authorization Entry Point
   * Evaluates if a user has permission to perform an action on a resource context.
   */
  public async can(
    user: AuthenticatedUser,
    permissionCode: string,
    resource?: AuthorizationResourceContext,
    prisma: PrismaClient = defaultPrisma,
  ): Promise<boolean> {
    // -----------------------------------------------------------------
    // Step 1: SuperAdmin Bypass (with async RabbitMQ audit log)
    // -----------------------------------------------------------------
    if (user.systemRole === "SuperAdmin") {
      AuditLogService.log({
        module: "Authorization",
        action: "SUPER_ADMIN_BYPASS",
        entityTable: "permissions",
        entityId: permissionCode,
        actor: {
          id: user.id,
          email: user.email,
          role: user.systemRole,
          ipAddress: user.ipAddress,
          userAgent: user.userAgent,
        },
        metadata: {
          permissionCode,
          resource,
          isBypass: true,
        },
        status: "SUCCESS",
      });

      return true;
    }

    // Resolve permission record in DB to get its ID
    const permission = await prisma.permission.findUnique({
      where: { code: permissionCode },
    });

    if (!permission || !permission.isActive) {
      this.logger.warn(`Permission '${permissionCode}' is inactive or non-existent`);
      return false;
    }

    // -----------------------------------------------------------------
    // Step 2: Explicit Overrides (user_permission_overrides)
    // Deny override always short-circuits and wins over grant override.
    // -----------------------------------------------------------------
    const now = new Date();
    const overrides = await prisma.userPermissionOverride.findMany({
      where: {
        userId: user.id,
        permissionId: permission.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    if (overrides.length > 0) {
      const matchingOverrides = overrides.filter((o) => {
        // Global override (all resource scope fields null)
        const isGlobal = !o.departmentId && !o.teamId && !o.projectId;
        if (isGlobal) return true;

        if (resource?.departmentId && o.departmentId === resource.departmentId) return true;
        if (resource?.teamId && o.teamId === resource.teamId) return true;
        if (resource?.projectId && o.projectId === resource.projectId) return true;

        return false;
      });

      if (matchingOverrides.length > 0) {
        const denyOverride = matchingOverrides.find((o) => o.isDeny);
        if (denyOverride) {
          // Deny short-circuit
          return false;
        }
        // Grant override
        return true;
      }
    }

    // -----------------------------------------------------------------
    // Step 3: Designation Grants & Scope Evaluation
    // -----------------------------------------------------------------
    const grants = await this.getDesignationGrants(user.designationId, prisma);
    const matchingGrants = grants.filter((g) => g.permissionCode === permissionCode);

    for (const grant of matchingGrants) {
      const allowed = await ScopeEvaluator.evaluate(user, grant, resource, prisma);
      if (allowed) {
        return true;
      }
    }

    // -----------------------------------------------------------------
    // Step 4: Active Delegations
    // -----------------------------------------------------------------
    const activeDelegations = await prisma.delegation.findMany({
      where: {
        delegateeId: user.id,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      include: {
        delegator: {
          select: {
            id: true,
            systemRole: true,
            designationId: true,
            email: true,
          },
        },
      },
    });

    for (const delegation of activeDelegations) {
      // Check if delegation scope covers permissionCode
      const scopeMatches =
        delegation.scope === "*" ||
        permissionCode.startsWith(delegation.scope) ||
        delegation.scope.includes(permissionCode);

      if (scopeMatches && delegation.delegator) {
        const delegatorUser: AuthenticatedUser = {
          id: delegation.delegator.id,
          systemRole: delegation.delegator.systemRole,
          designationId: delegation.delegator.designationId,
          email: delegation.delegator.email,
        };

        // Re-evaluate steps 2-3 as delegator
        const delegatorAllowed = await this.evaluateDelegator(
          delegatorUser,
          permission.id,
          permissionCode,
          resource,
          prisma,
        );

        if (delegatorAllowed) {
          AuditLogService.log({
            module: "Authorization",
            action: "DELEGATED_ACCESS_GRANTED",
            entityTable: "delegations",
            entityId: delegation.id,
            actor: {
              id: user.id,
              email: user.email,
              role: user.systemRole,
            },
            onBehalfOfId: delegatorUser.id,
            metadata: {
              permissionCode,
              resource,
              delegationId: delegation.id,
            },
            status: "SUCCESS",
          });

          return true;
        }
      }
    }

    // -----------------------------------------------------------------
    // Step 5: Fallback Deny
    // -----------------------------------------------------------------
    return false;
  }

  /**
   * Helper to re-evaluate permission for a delegator
   */
  private async evaluateDelegator(
    delegator: AuthenticatedUser,
    permissionId: string,
    permissionCode: string,
    resource: AuthorizationResourceContext | undefined,
    prisma: PrismaClient,
  ): Promise<boolean> {
    // Check delegator overrides
    const now = new Date();
    const overrides = await prisma.userPermissionOverride.findMany({
      where: {
        userId: delegator.id,
        permissionId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    if (overrides.length > 0) {
      const matchingOverrides = overrides.filter((o) => {
        const isGlobal = !o.departmentId && !o.teamId && !o.projectId;
        if (isGlobal) return true;
        if (resource?.departmentId && o.departmentId === resource.departmentId) return true;
        if (resource?.teamId && o.teamId === resource.teamId) return true;
        if (resource?.projectId && o.projectId === resource.projectId) return true;
        return false;
      });

      if (matchingOverrides.length > 0) {
        if (matchingOverrides.some((o) => o.isDeny)) return false;
        return true;
      }
    }

    // Check delegator designation grants
    const grants = await this.getDesignationGrants(delegator.designationId, prisma);
    const matchingGrants = grants.filter((g) => g.permissionCode === permissionCode);

    for (const grant of matchingGrants) {
      const allowed = await ScopeEvaluator.evaluate(delegator, grant, resource, prisma);
      if (allowed) return true;
    }

    return false;
  }

  /**
   * Fetch and cache resolved designation grants
   */
  public async getDesignationGrants(
    designationId: string,
    prisma: PrismaClient = defaultPrisma,
  ): Promise<ResolvedDesignationGrant[]> {
    const version = await this.getPermissionVersion();
    const cacheKey = `permission:designation:${designationId}:v${version}`;

    try {
      const cached = await this.cacheManager.get<ResolvedDesignationGrant[]>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch {
      // Ignore cache fetch failures
    }

    // Fetch from database
    const dbGrants = await prisma.designationPermission.findMany({
      where: {
        designationId,
        isActive: true,
        permission: { isActive: true },
      },
      include: {
        permission: true,
        scopeType: true,
        scopeTargets: true,
      },
    });

    const resolvedGrants: ResolvedDesignationGrant[] = dbGrants.map((dg) => {
      const departmentIds: string[] = [];
      const teamIds: string[] = [];
      const projectIds: string[] = [];

      for (const target of dg.scopeTargets) {
        if (target.departmentId) departmentIds.push(target.departmentId);
        if (target.teamId) teamIds.push(target.teamId);
        if (target.projectId) projectIds.push(target.projectId);
      }

      return {
        permissionCode: dg.permission.code,
        permissionId: dg.permissionId,
        resolutionStrategy: dg.scopeType.resolutionStrategy,
        scopeTargets: {
          departmentIds,
          teamIds,
          projectIds,
        },
      };
    });

    try {
      // Cache for 1 hour (invalidated on permission_version bump)
      await this.cacheManager.set(cacheKey, resolvedGrants, { ttlSeconds: 3600 });
    } catch {
      // Ignore cache write failures
    }

    return resolvedGrants;
  }

  /**
   * Invalidate cached designation grants by bumping system permission version counter
   */
  public async invalidateCache(): Promise<number> {
    try {
      const currentVersion = (await this.cacheManager.get<number>("permission_version")) || 1;
      const nextVersion = currentVersion + 1;
      await this.cacheManager.set("permission_version", nextVersion, { ttlSeconds: 86400 * 30 });
      this.logger.info(`Bumped permission_version counter to v${nextVersion}`);
      return nextVersion;
    } catch (err) {
      this.logger.error("Failed to bump permission_version counter", { error: err });
      return Date.now();
    }
  }

  private async getPermissionVersion(): Promise<number> {
    try {
      const version = await this.cacheManager.get<number>("permission_version");
      if (version) return version;
      await this.cacheManager.set("permission_version", 1, { ttlSeconds: 86400 * 30 });
      return 1;
    } catch {
      return 1;
    }
  }
}

export async function can(
  user: AuthenticatedUser,
  permissionCode: string,
  resource?: AuthorizationResourceContext,
): Promise<boolean> {
  return AuthorizationEngine.getInstance().can(user, permissionCode, resource);
}
