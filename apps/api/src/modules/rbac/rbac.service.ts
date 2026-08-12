import { PrismaClient } from "@workspace/db";

export interface ResourceScope {
  type: "project" | "team";
  id: string;
}

export type DirectScopeChecker = (
  userId: string,
  scope: ResourceScope
) => Promise<boolean>;

export type DelegationScopeChecker = (
  userId: string,
  scope: ResourceScope
) => Promise<boolean>;

export class RbacService {
  private designationPermissionsCache = new Map<
    string,
    { permissions: Set<string>; cachedAt: number }
  >();
  private readonly CACHE_TTL_MS = 60_000; // 1 minute TTL

  constructor(
    private readonly prisma: PrismaClient,
    private readonly directScopeChecker?: DirectScopeChecker,
    private readonly delegationScopeChecker?: DelegationScopeChecker
  ) {}

  public invalidateCache(): void {
    this.designationPermissionsCache.clear();
  }

  public async can(
    userId: string,
    permissionCode: string,
    scope?: ResourceScope
  ): Promise<boolean> {
    // 1. Fetch user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        is_active: true,
        system_role: true,
        designation_id: true,
        deleted_at: true,
      },
    });

    // Inactive, missing, or deleted user -> false
    if (!user || !user.is_active || user.deleted_at !== null) {
      return false;
    }

    // 2. SuperAdmin bypass -> true
    if (user.system_role === "SuperAdmin") {
      return true;
    }

    // 3. Base designation permissions (cached)
    const basePermissions = await this.getDesignationPermissions(user.designation_id);

    // 4. Apply any user_permission_overrides (GRANT / REVOKE)
    const overrides = await this.prisma.userPermissionOverride.findMany({
      where: { user_id: userId },
      include: { permission: true },
    });

    const finalPermissions = new Set(basePermissions);
    for (const override of overrides) {
      if (override.effect === "GRANT") {
        finalPermissions.add(override.permission.code);
      } else if (override.effect === "REVOKE") {
        finalPermissions.delete(override.permission.code);
      }
    }

    // 5. If permission isn't allowed after overrides -> false
    if (!finalPermissions.has(permissionCode)) {
      return false;
    }

    // 6. If no scope was passed -> true
    if (!scope) {
      return true;
    }

    // 7. Check direct resource scope
    const isDirectlyScoped = this.directScopeChecker
      ? await this.directScopeChecker(userId, scope)
      : await this.defaultCheckDirectScope(userId, scope);

    if (isDirectlyScoped) {
      return true;
    }

    // 8. Check active delegation covering scope
    const isDelegated = this.delegationScopeChecker
      ? await this.delegationScopeChecker(userId, scope)
      : await this.defaultCheckDelegationScope(userId, scope);

    return isDelegated;
  }

  public async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        is_active: true,
        system_role: true,
        designation_id: true,
        deleted_at: true,
      },
    });

    if (!user || !user.is_active || user.deleted_at !== null) {
      return [];
    }

    if (user.system_role === "SuperAdmin") {
      const allPerms = await this.prisma.permission.findMany({
        select: { code: true },
      });
      return allPerms.map((p) => p.code);
    }

    const basePermissions = await this.getDesignationPermissions(user.designation_id);
    const overrides = await this.prisma.userPermissionOverride.findMany({
      where: { user_id: userId },
      include: { permission: true },
    });

    const finalPermissions = new Set(basePermissions);
    for (const override of overrides) {
      if (override.effect === "GRANT") {
        finalPermissions.add(override.permission.code);
      } else if (override.effect === "REVOKE") {
        finalPermissions.delete(override.permission.code);
      }
    }

    return Array.from(finalPermissions);
  }

  private async getDesignationPermissions(
    designationId: string
  ): Promise<Set<string>> {
    const cached = this.designationPermissionsCache.get(designationId);
    const now = Date.now();
    if (cached && now - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.permissions;
    }

    const desigPerms = await this.prisma.designationPermission.findMany({
      where: { designation_id: designationId },
      include: { permission: true },
    });

    const permCodes = new Set(desigPerms.map((dp) => dp.permission.code));
    this.designationPermissionsCache.set(designationId, {
      permissions: permCodes,
      cachedAt: now,
    });

    return permCodes;
  }

  private async defaultCheckDirectScope(
    userId: string,
    scope: ResourceScope
  ): Promise<boolean> {
    if (scope.type === "project") {
      const assignment = await this.prisma.projectAssignment.findFirst({
        where: {
          project_id: scope.id,
          user_id: userId,
          unassigned_at: null,
        },
      });
      return !!assignment;
    } else if (scope.type === "team") {
      const member = await this.prisma.teamMember.findFirst({
        where: {
          team_id: scope.id,
          user_id: userId,
          left_at: null,
        },
      });
      return !!member;
    }
    return false;
  }

  private async defaultCheckDelegationScope(
    userId: string,
    scope: ResourceScope
  ): Promise<boolean> {
    const now = new Date();
    const formattedScope = `${scope.type}:${scope.id}`;

    const delegation = await this.prisma.delegation.findFirst({
      where: {
        delegatee_id: userId,
        scope: { in: [formattedScope, scope.id, scope.type] },
        valid_from: { lte: now },
        valid_until: { gte: now },
      },
    });

    return !!delegation;
  }
}
