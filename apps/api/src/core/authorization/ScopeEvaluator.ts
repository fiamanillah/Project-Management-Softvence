// src/core/authorization/ScopeEvaluator.ts

import type { PrismaClient } from "@workspace/db";
import type {
  AuthenticatedUser,
  AuthorizationResourceContext,
  ResolvedRoleGrant,
} from "./authorization.types";

export class ScopeEvaluator {
  /**
   * Recursively collect all descendant branch IDs of a given branch
   */
  public static async getBranchDescendants(
    branchId: string,
    prisma: PrismaClient,
  ): Promise<string[]> {
    const children = await prisma.branch.findMany({
      where: { parentId: branchId, deletedAt: null },
      select: { id: true },
    });

    if (children.length === 0) return [];

    const childIds = children.map((c) => c.id);
    const subChildIds = await Promise.all(
      childIds.map((id) => this.getBranchDescendants(id, prisma)),
    );

    return [...childIds, ...subChildIds.flat()];
  }

  /**
   * Recursively collect all descendant department IDs of a given department
   */
  public static async getDepartmentDescendants(
    departmentId: string,
    prisma: PrismaClient,
  ): Promise<string[]> {
    const children = await prisma.department.findMany({
      where: { parentId: departmentId, deletedAt: null },
      select: { id: true },
    });

    if (children.length === 0) return [];

    const childIds = children.map((c) => c.id);
    const subChildIds = await Promise.all(
      childIds.map((id) => this.getDepartmentDescendants(id, prisma)),
    );

    return [...childIds, ...subChildIds.flat()];
  }

  /**
   * Evaluate a resolved role grant strategy against a resource context for a given user
   */
  public static async evaluate(
    user: AuthenticatedUser,
    grant: ResolvedRoleGrant,
    resource: AuthorizationResourceContext | undefined,
    prisma: PrismaClient,
  ): Promise<boolean> {
    const strategy = grant.resolutionStrategy;

    // Coarse permission check (route / list level where resource is not yet bound)
    if (!resource) {
      return true;
    }

    switch (strategy) {
      case "Global":
        return true;

      case "OwnBranch": {
        let targetBranchId = resource?.branchId;

        // If branchId is not directly on resource, resolve it from departmentId or projectId
        if (!targetBranchId && resource?.departmentId) {
          const dept = await prisma.department.findUnique({
            where: { id: resource.departmentId },
            select: { branchId: true },
          });
          targetBranchId = dept?.branchId || undefined;
        }

        if (!targetBranchId && resource?.projectId) {
          const proj = await prisma.project.findUnique({
            where: { id: resource.projectId },
            select: { branchId: true },
          });
          targetBranchId = proj?.branchId || undefined;
        }

        if (!targetBranchId) return false;

        // 1. Check user's direct branch affiliation
        let userBranchId = user.branchId;
        if (!userBranchId && user.id) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { branchId: true },
          });
          userBranchId = dbUser?.branchId;
        }

        if (userBranchId) {
          if (userBranchId === targetBranchId) return true;
          const descendantBranchIds = await this.getBranchDescendants(userBranchId, prisma);
          if (descendantBranchIds.includes(targetBranchId)) return true;
        }

        // 2. Check if user is an active Branch Manager of this branch or an ancestor branch
        const managedBranches = await prisma.branchManager.findMany({
          where: {
            userId: user.id,
            unassignedAt: null,
          },
          select: { branchId: true },
        });

        for (const mb of managedBranches) {
          if (mb.branchId === targetBranchId) return true;
          const descendantBranchIds = await this.getBranchDescendants(mb.branchId, prisma);
          if (descendantBranchIds.includes(targetBranchId)) return true;
        }

        // 3. Check if user belongs to a department whose branch matches targetBranchId
        let effectiveRoleId = user.roleId;
        if (!effectiveRoleId && user.id) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { roleId: true },
          });
          effectiveRoleId = dbUser?.roleId || "";
        }

        if (effectiveRoleId) {
          const role = await prisma.role.findUnique({
            where: { id: effectiveRoleId },
            select: { department: { select: { branchId: true } } },
          });
          if (role?.department?.branchId) {
            if (role.department.branchId === targetBranchId) return true;
            const descendantBranchIds = await this.getBranchDescendants(
              role.department.branchId,
              prisma,
            );
            if (descendantBranchIds.includes(targetBranchId)) return true;
          }
        }

        return false;
      }

      case "OwnDepartment": {
        if (!resource?.departmentId) return false;

        // 1. Check if resource.departmentId matches user's role department or descendants
        let effectiveRoleId = user.roleId;
        if (!effectiveRoleId && user.id) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { roleId: true },
          });
          effectiveRoleId = dbUser?.roleId || "";
        }

        if (effectiveRoleId) {
          const role = await prisma.role.findUnique({
            where: { id: effectiveRoleId },
            select: { departmentId: true },
          });

          if (role?.departmentId) {
            if (role.departmentId === resource.departmentId) {
              return true;
            }

            const descendantIds = await this.getDepartmentDescendants(
              role.departmentId,
              prisma,
            );
            if (descendantIds.includes(resource.departmentId)) {
              return true;
            }
          }
        }

        // 2. Check if resource.departmentId matches user's designation department or descendants
        if (user.designationId) {
          const designation = await prisma.designation.findUnique({
            where: { id: user.designationId },
            select: { departmentId: true },
          });

          if (designation?.departmentId) {
            if (designation.departmentId === resource.departmentId) {
              return true;
            }

            const descendantIds = await this.getDepartmentDescendants(
              designation.departmentId,
              prisma,
            );
            if (descendantIds.includes(resource.departmentId)) {
              return true;
            }
          }
        }

        // 3. Or if user belongs to an active team under this department or its ancestors
        const userTeams = await prisma.teamMember.findMany({
          where: {
            userId: user.id,
            leftAt: null,
          },
          select: {
            team: {
              select: { departmentId: true },
            },
          },
        });

        for (const tm of userTeams) {
          const teamDeptId = tm.team.departmentId;
          if (teamDeptId === resource.departmentId) {
            return true;
          }
          const descendantIds = await this.getDepartmentDescendants(teamDeptId, prisma);
          if (descendantIds.includes(resource.departmentId)) {
            return true;
          }
        }

        return false;
      }

      case "OwnTeam": {
        if (!resource?.teamId && !resource?.projectId) return false;

        if (resource.teamId) {
          const membership = await prisma.teamMember.findFirst({
            where: {
              userId: user.id,
              teamId: resource.teamId,
              leftAt: null,
            },
          });
          if (membership) return true;
        }

        if (resource.projectId) {
          const projectAssignment = await prisma.projectTeamAssignment.findFirst({
            where: {
              projectId: resource.projectId,
              unassignedAt: null,
              team: {
                members: {
                  some: {
                    userId: user.id,
                    leftAt: null,
                  },
                },
              },
            },
          });
          if (projectAssignment) return true;
        }

        return false;
      }

      case "OwnProject": {
        if (!resource?.projectId) return false;

        // Direct project assignment check (active only)
        const directAssignment = await prisma.projectAssignment.findFirst({
          where: {
            userId: user.id,
            projectId: resource.projectId,
            unassignedAt: null,
          },
        });
        if (directAssignment) return true;

        // Component assignment check (active only)
        const componentAssignment = await prisma.componentAssignment.findFirst({
          where: {
            userId: user.id,
            component: { projectId: resource.projectId },
            unassignedAt: null,
          },
        });
        return Boolean(componentAssignment);
      }

      case "OwnProfile": {
        if (!resource?.profileId) return false;

        const profileAssignment = await prisma.profileSeller.findFirst({
          where: {
            userId: user.id,
            profileId: resource.profileId,
          },
        });

        return Boolean(profileAssignment);
      }

      case "ExplicitBranches": {
        let targetBranchId = resource?.branchId;
        if (!targetBranchId && resource?.departmentId) {
          const dept = await prisma.department.findUnique({
            where: { id: resource.departmentId },
            select: { branchId: true },
          });
          targetBranchId = dept?.branchId || undefined;
        }
        if (!targetBranchId) return false;
        return (grant.scopeTargets.branchIds ?? []).includes(targetBranchId);
      }

      case "ExplicitDepartments": {
        if (!resource?.departmentId) return false;
        return (grant.scopeTargets.departmentIds ?? []).includes(resource.departmentId);
      }

      case "ExplicitTeams": {
        if (!resource?.teamId) return false;
        return (grant.scopeTargets.teamIds ?? []).includes(resource.teamId);
      }

      case "ExplicitProjects": {
        if (!resource?.projectId) return false;
        return (grant.scopeTargets.projectIds ?? []).includes(resource.projectId);
      }

      default:
        return false;
    }
  }
}
