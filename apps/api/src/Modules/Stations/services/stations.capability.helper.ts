// src/Modules/Stations/services/stations.capability.helper.ts

import type { PrismaClient } from "@workspace/db";
import { can, getUserPermissions } from "@/core/authorization/AuthorizationEngine";
import type {
  AuthenticatedUser,
  AuthorizationResourceContext,
} from "@/core/authorization/authorization.types";
import type {
  StationItem,
  StationCapabilities,
  StationProfileAssignmentItem,
  StationUserAssignmentItem,
  StationSessionItem,
} from "../StationDTO";

/**
 * Extracts authorization resource context from a station entity.
 */
export function getStationResourceContext(station: any): AuthorizationResourceContext {
  return {
    stationId: station.id,
    branchId: station.branchId || undefined,
    departmentId: station.departmentId || undefined,
  };
}

/**
 * Evaluates scoped permissions for a station and generates its _capabilities map (Rule BE-17).
 */
export async function computeStationCapabilities(
  station: any,
  actor: AuthenticatedUser,
): Promise<StationCapabilities> {
  const resourceContext = getStationResourceContext(station);

  const [
    canEdit,
    canDelete,
    canAssignUser,
    canAssignProfile,
    canJoin,
  ] = await Promise.all([
    can(actor, "station.manage", resourceContext),
    can(actor, "station.delete", resourceContext),
    can(actor, "station.assign_user", resourceContext),
    can(actor, "station.assign_profile", resourceContext),
    can(actor, "station.join", resourceContext),
  ]);

  return {
    canEdit,
    canDelete,
    canAssignUser,
    canAssignProfile,
    canReassignProfile: canAssignProfile,
    canJoin,
  };
}

/**
 * Sanitizes and decorates a station object with computed capabilities.
 */
export async function sanitizeAndDecorateStation(
  station: any,
  actor: AuthenticatedUser,
): Promise<StationItem> {
  const capabilities = await computeStationCapabilities(station, actor);

  const activeProfiles: StationProfileAssignmentItem[] = (
    station.stationProfiles || []
  ).filter((sp: any) => !sp.unassignedAt).map((sp: any) => ({
    id: sp.id,
    stationId: sp.stationId,
    profileId: sp.profileId,
    assignedById: sp.assignedById,
    unassignedById: sp.unassignedById,
    assignedAt: sp.assignedAt,
    unassignedAt: sp.unassignedAt,
    shift: sp.shift,
    isPrimary: sp.isPrimary,
    note: sp.note,
    profile: sp.profile
      ? {
          id: sp.profile.id,
          username: sp.profile.username,
          isActive: sp.profile.isActive,
          platform: sp.profile.platform
            ? {
                id: sp.profile.platform.id,
                code: sp.profile.platform.code,
                name: sp.profile.platform.name,
              }
            : null,
          _count: sp.profile._count,
        }
      : undefined,
    assignedBy: sp.assignedBy
      ? {
          id: sp.assignedBy.id,
          firstName: sp.assignedBy.firstName,
          lastName: sp.assignedBy.lastName,
          email: sp.assignedBy.email,
        }
      : undefined,
  }));

  const assignedUsers: StationUserAssignmentItem[] = (
    station.assignedUsers || []
  ).filter((au: any) => !au.unassignedAt).map((au: any) => ({
    id: au.id,
    stationId: au.stationId,
    userId: au.userId,
    roleId: au.roleId,
    assignedById: au.assignedById,
    unassignedById: au.unassignedById,
    assignedAt: au.assignedAt,
    unassignedAt: au.unassignedAt,
    shift: au.shift,
    note: au.note,
    user: au.user
      ? {
          id: au.user.id,
          firstName: au.user.firstName,
          lastName: au.user.lastName,
          email: au.user.email,
          avatarUrl: au.user.avatarUrl,
          systemRole: au.user.systemRole,
        }
      : undefined,
    role: au.role
      ? {
          id: au.role.id,
          code: au.role.code,
          name: au.role.name,
          canManageProfiles: au.role.canManageProfiles,
          canOperate: au.role.canOperate,
        }
      : undefined,
  }));

  const currentSessions: StationSessionItem[] = (
    station.sessions || []
  ).filter((s: any) => s.isCurrent && !s.leftAt).map((s: any) => ({
    id: s.id,
    stationId: s.stationId,
    userId: s.userId,
    refreshTokenId: s.refreshTokenId,
    ipAddress: s.ipAddress,
    deviceInfo: s.deviceInfo,
    joinedAt: s.joinedAt,
    leftAt: s.leftAt,
    lastActiveAt: s.lastActiveAt,
    isCurrent: s.isCurrent,
    user: s.user
      ? {
          id: s.user.id,
          firstName: s.user.firstName,
          lastName: s.user.lastName,
          email: s.user.email,
          avatarUrl: s.user.avatarUrl,
        }
      : undefined,
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
    },
  }));

  return {
    id: station.id,
    code: station.code,
    name: station.name,
    description: station.description,
    stationTypeId: station.stationTypeId,
    statusId: station.statusId,
    branchId: station.branchId,
    departmentId: station.departmentId,
    ipWhitelist: station.ipWhitelist || [],
    macAddress: station.macAddress,
    maxConcurrentUsers: station.maxConcurrentUsers,
    isActive: station.isActive,
    createdAt: station.createdAt,
    updatedAt: station.updatedAt,
    deletedAt: station.deletedAt,
    stationType: station.stationType
      ? {
          id: station.stationType.id,
          code: station.stationType.code,
          name: station.stationType.name,
          isSales: station.stationType.isSales,
        }
      : undefined,
    status: station.status
      ? {
          id: station.status.id,
          code: station.status.code,
          name: station.status.name,
          isOperational: station.status.isOperational,
          isMaintenance: station.status.isMaintenance,
          color: station.status.color,
        }
      : undefined,
    branch: station.branch
      ? {
          id: station.branch.id,
          code: station.branch.code,
          name: station.branch.name,
        }
      : null,
    department: station.department
      ? {
          id: station.department.id,
          code: station.department.code,
          name: station.department.name,
        }
      : null,
    activeProfilesCount: activeProfiles.length,
    activeUsersCount: assignedUsers.length,
    activeProfiles,
    assignedUsers,
    currentSessions,
    _capabilities: capabilities,
  };
}

/**
 * Builds scoped Prisma WHERE conditions for listing stations based on the user's scope.
 */
export async function buildStationScopedWhereConditions(
  prisma: PrismaClient,
  actor: AuthenticatedUser,
): Promise<any[] | null> {
  const userPerms = await getUserPermissions(actor);
  const viewPerm = userPerms["station.view"];
  const isGlobal =
    viewPerm?.scope === "Global" ||
    viewPerm?.scope === "Override" ||
    (viewPerm?.allowed === true && (!viewPerm.scope || viewPerm.scope === "Global"));

  if (isGlobal) {
    return null;
  }

  const scopedConditions: any[] = [
    // 1. Direct station user assignment
    {
      assignedUsers: {
        some: {
          userId: actor.id,
          unassignedAt: null,
        },
      },
    },
    // 2. Active session
    {
      sessions: {
        some: {
          userId: actor.id,
          isCurrent: true,
          leftAt: null,
        },
      },
    },
  ];

  // 3. Branch scope
  if (actor.branchId) {
    scopedConditions.push({ branchId: actor.branchId });
  }

  // 4. Department scope
  const userTeams = await prisma.teamMember.findMany({
    where: { userId: actor.id, leftAt: null },
    select: { team: { select: { departmentId: true } } },
  });
  const deptIds = Array.from(new Set(userTeams.map((t) => t.team.departmentId).filter(Boolean)));
  if (deptIds.length > 0) {
    scopedConditions.push({ departmentId: { in: deptIds } });
  }

  return scopedConditions;
}
