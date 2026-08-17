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
  ResolvedRoleGrant,
} from "./authorization.types";

/**
 * Determine if an authorization check represents a sensitive administrative action (Rule BE-6)
 */
export function isSensitivePermission(permissionCode: string): boolean {
  if (!permissionCode) return false;
  const code = permissionCode.toLowerCase();
  return (
    code.startsWith("billing.") ||
    code.startsWith("billing_") ||
    code.includes(".manage") ||
    code.includes(".delete") ||
    code.includes(".revoke") ||
    code.includes(".reassign") ||
    code === "auth.user.create" ||
    code === "auth.user.manage" ||
    code === "auth.session.revoke" ||
    code === "organization.department.manage" ||
    code === "organization.role.manage" ||
    code === "organization.designation.manage"
  );
}

export interface PermissionCatalogueItem {
  id: string;
  code: string;
  module: string | null;
  description: string | null;
  isActive: boolean;
}

export type UserPermissionMap = Record<
  string,
  {
    allowed: boolean;
    scope: string;
    module: string | null;
    description: string | null;
  }
>;

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
   * Rule BE-6: SuperAdmin bypass is logged for sensitive actions, while read evaluations remain fast and noise-free.
   */
  public async can(
    user: AuthenticatedUser,
    permissionCode: string,
    resource?: AuthorizationResourceContext,
    prisma: PrismaClient = defaultPrisma,
  ): Promise<boolean> {
    // -----------------------------------------------------------------
    // Step 1: SuperAdmin Bypass (BE-6: Logged for sensitive permissions)
    // -----------------------------------------------------------------
    if (user.systemRole === "SuperAdmin") {
      if (isSensitivePermission(permissionCode)) {
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
            isSensitive: true,
          },
          status: "SUCCESS",
        });
      }

      return true;
    }

    const version = await this.getPermissionVersion();

    // Resolve permission record via cache/DB
    const permission = await this.getPermissionByCode(permissionCode, prisma, version);

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
    // Step 3: Role Grants & Scope Evaluation
    // -----------------------------------------------------------------
    let roleId = user.roleId;
    if (!roleId && user.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { roleId: true },
      });
      roleId = dbUser?.roleId || "";
    }

    if (roleId) {
      const grants = await this.getRoleGrants(roleId, prisma);
      const matchingGrants = grants.filter((g) => g.permissionCode === permissionCode);

      for (const grant of matchingGrants) {
        const allowed = await ScopeEvaluator.evaluate(user, grant, resource, prisma);
        if (allowed) {
          return true;
        }
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
            roleId: true,
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
        if (delegation.delegator.systemRole === "SuperAdmin") {
          return true;
        }

        const delegatorUser: AuthenticatedUser = {
          id: delegation.delegator.id,
          systemRole: delegation.delegator.systemRole,
          roleId: delegation.delegator.roleId || "",
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
    if (delegator.systemRole === "SuperAdmin") return true;

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

    // Check delegator role grants
    if (delegator.roleId) {
      const grants = await this.getRoleGrants(delegator.roleId, prisma);
      const matchingGrants = grants.filter((g) => g.permissionCode === permissionCode);

      for (const grant of matchingGrants) {
        const allowed = await ScopeEvaluator.evaluate(delegator, grant, resource, prisma);
        if (allowed) return true;
      }
    }

    return false;
  }

  /**
   * Fetch active permission definition by code with versioned Redis caching
   */
  public async getPermissionByCode(
    code: string,
    prisma: PrismaClient = defaultPrisma,
    version?: number,
  ): Promise<{ id: string; code: string; isActive: boolean } | null> {
    const v = version ?? (await this.getPermissionVersion());
    const cacheKey = `permission:code:${code}:v${v}`;

    try {
      const cached = await this.cacheManager.get<{ id: string; code: string; isActive: boolean }>(cacheKey);
      if (cached) return cached;
    } catch {
      // Ignore cache fetch failures
    }

    const permission = await prisma.permission.findUnique({
      where: { code },
      select: { id: true, code: true, isActive: true },
    });

    if (permission) {
      try {
        await this.cacheManager.set(cacheKey, permission, { ttlSeconds: 3600 });
      } catch {
        // Ignore cache write failures
      }
    }

    return permission;
  }

  /**
   * Fetch all active permissions catalogue with versioned Redis caching
   */
  public async getAllActivePermissions(
    prisma: PrismaClient = defaultPrisma,
    version?: number,
  ): Promise<PermissionCatalogueItem[]> {
    const v = version ?? (await this.getPermissionVersion());
    const cacheKey = `permission:catalogue:active:v${v}`;

    try {
      const cached = await this.cacheManager.get<PermissionCatalogueItem[]>(cacheKey);
      if (cached && Array.isArray(cached)) {
        return cached;
      }
    } catch {
      // Ignore cache fetch failures
    }

    const permissions = await prisma.permission.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        module: true,
        description: true,
        isActive: true,
      },
    });

    try {
      await this.cacheManager.set(cacheKey, permissions, { ttlSeconds: 3600 });
    } catch {
      // Ignore cache write failures
    }

    return permissions;
  }

  /**
   * Fetch and cache resolved role grants
   */
  public async getRoleGrants(
    roleId: string,
    prisma: PrismaClient = defaultPrisma,
  ): Promise<ResolvedRoleGrant[]> {
    if (!roleId) return [];

    const version = await this.getPermissionVersion();
    const cacheKey = `permission:role:${roleId}:v${version}`;

    try {
      const cached = await this.cacheManager.get<ResolvedRoleGrant[]>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch {
      // Ignore cache fetch failures
    }

    // Fetch from database
    const dbGrants = await prisma.rolePermission.findMany({
      where: {
        roleId,
        isActive: true,
        permission: { isActive: true },
      },
      include: {
        permission: true,
        scopeType: true,
        scopeTargets: true,
      },
    });

    const resolvedGrants: ResolvedRoleGrant[] = dbGrants.map((dg) => {
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
   * Invalidate cached user permissions for a specific user
   */
  public async invalidateUserCache(userId: string): Promise<void> {
    try {
      const version = await this.getPermissionVersion();
      const cacheKey = `permission:user:${userId}:v${version}`;
      await this.cacheManager.del(cacheKey);
      this.logger.info(`Invalidated permission cache for user ${userId}`);
    } catch (err) {
      this.logger.warn(`Failed to invalidate user permission cache for ${userId}`, { error: err });
    }
  }

  /**
   * Invalidate cached role grants & all user permissions by bumping system permission version counter
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

  /**
   * Compute full permission map for a user (for frontend UI element visibility rendering).
   * Highly optimized:
   * 1. Checks Redis cache first (sub-millisecond return).
   * 2. SuperAdmin fast-path (O(1) memory mapping, 0 DB queries, 0 audit logs).
   * 3. Non-SuperAdmin batch query resolver (reduces 300+ sequential queries to 2-3 batch queries).
   */
  public async getUserPermissions(
    user: AuthenticatedUser,
    prisma: PrismaClient = defaultPrisma,
  ): Promise<UserPermissionMap> {
    const version = await this.getPermissionVersion();
    const cacheKey = `permission:user:${user.id}:v${version}`;

    // 1. Check Redis Cache
    try {
      const cached = await this.cacheManager.get<UserPermissionMap>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch {
      // Ignore cache read failures
    }

    // 2. Fetch active permissions catalogue (cached in Redis)
    const allPermissions = await this.getAllActivePermissions(prisma, version);
    const resultMap: UserPermissionMap = {};

    // 3. SuperAdmin Fast-Path: All permissions granted with Global scope
    if (user.systemRole === "SuperAdmin") {
      for (const perm of allPermissions) {
        resultMap[perm.code] = {
          allowed: true,
          scope: "Global",
          module: perm.module,
          description: perm.description,
        };
      }

      // Cache computed map in Redis (30 mins TTL)
      try {
        await this.cacheManager.set(cacheKey, resultMap, { ttlSeconds: 1800 });
      } catch {}

      return resultMap;
    }

    // 4. Non-SuperAdmin Batch Fast-Path (Single round-trip batch queries)
    let roleId = user.roleId;
    if (!roleId && user.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { roleId: true },
      });
      roleId = dbUser?.roleId || "";
    }

    const now = new Date();
    const [userGrants, userOverrides, activeDelegations] = await Promise.all([
      roleId ? this.getRoleGrants(roleId, prisma) : Promise.resolve([]),
      prisma.userPermissionOverride.findMany({
        where: {
          userId: user.id,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      prisma.delegation.findMany({
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
              roleId: true,
              designationId: true,
              email: true,
            },
          },
        },
      }),
    ]);

    // Preload delegator grants & overrides if active delegations exist
    const delegatorGrantsMap = new Map<string, ResolvedRoleGrant[]>();
    const delegatorOverridesMap = new Map<string, typeof userOverrides>();
    if (activeDelegations.length > 0) {
      for (const del of activeDelegations) {
        if (del.delegator && del.delegator.systemRole !== "SuperAdmin" && del.delegator.roleId) {
          const [dGrants, dOverrides] = await Promise.all([
            this.getRoleGrants(del.delegator.roleId, prisma),
            prisma.userPermissionOverride.findMany({
              where: {
                userId: del.delegator.id,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              },
            }),
          ]);
          delegatorGrantsMap.set(del.delegator.id, dGrants);
          delegatorOverridesMap.set(del.delegator.id, dOverrides);
        }
      }
    }

    // Index overrides by permissionId
    const overridesByPermId = new Map<string, typeof userOverrides>();
    for (const ov of userOverrides) {
      const list = overridesByPermId.get(ov.permissionId) || [];
      list.push(ov);
      overridesByPermId.set(ov.permissionId, list);
    }

    // Index role grants by permissionCode
    const grantsByPermCode = new Map<string, ResolvedRoleGrant>();
    for (const g of userGrants) {
      grantsByPermCode.set(g.permissionCode, g);
    }

    // 5. Evaluate all permissions in-memory in O(N)
    for (const perm of allPermissions) {
      let allowed = false;
      let scope = "None";

      // Step A: Check User Overrides
      const matchingOverrides = overridesByPermId.get(perm.id);
      let overrideDetermined = false;

      if (matchingOverrides && matchingOverrides.length > 0) {
        const globalOverrides = matchingOverrides.filter(
          (o) => !o.departmentId && !o.teamId && !o.projectId,
        );
        if (globalOverrides.length > 0) {
          const denyOverride = globalOverrides.find((o) => o.isDeny);
          if (denyOverride) {
            allowed = false;
            scope = "None";
            overrideDetermined = true;
          } else {
            allowed = true;
            scope = "Override";
            overrideDetermined = true;
          }
        }
      }

      // Step B: Check Role Grants
      if (!overrideDetermined) {
        const grant = grantsByPermCode.get(perm.code);
        if (grant) {
          allowed = true;
          scope = grant.resolutionStrategy;
        } else if (activeDelegations.length > 0) {
          // Step C: Check Active Delegations
          for (const del of activeDelegations) {
            const scopeMatches =
              del.scope === "*" ||
              perm.code.startsWith(del.scope) ||
              del.scope.includes(perm.code);

            if (scopeMatches && del.delegator) {
              if (del.delegator.systemRole === "SuperAdmin") {
                allowed = true;
                scope = "Global";
                break;
              }

              const dOverrides = delegatorOverridesMap.get(del.delegator.id) || [];
              const dGlobalOverrides = dOverrides.filter(
                (o) =>
                  o.permissionId === perm.id &&
                  !o.departmentId &&
                  !o.teamId &&
                  !o.projectId,
              );

              if (dGlobalOverrides.some((o) => o.isDeny)) {
                continue;
              }

              if (dGlobalOverrides.some((o) => !o.isDeny)) {
                allowed = true;
                scope = "Override";
                break;
              }

              const dGrants = delegatorGrantsMap.get(del.delegator.id) || [];
              const dGrant = dGrants.find((g) => g.permissionCode === perm.code);
              if (dGrant) {
                allowed = true;
                scope = dGrant.resolutionStrategy;
                break;
              }
            }
          }
        }
      }

      resultMap[perm.code] = {
        allowed,
        scope,
        module: perm.module,
        description: perm.description,
      };
    }

    // 6. Cache resolved permission map in Redis (30 mins TTL)
    try {
      await this.cacheManager.set(cacheKey, resultMap, { ttlSeconds: 1800 });
    } catch {}

    return resultMap;
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

export async function getUserPermissions(
  user: AuthenticatedUser,
) {
  return AuthorizationEngine.getInstance().getUserPermissions(user);
}
