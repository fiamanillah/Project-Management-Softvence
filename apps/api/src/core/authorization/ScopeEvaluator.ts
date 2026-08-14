// src/core/authorization/ScopeEvaluator.ts

import type { PrismaClient } from "@workspace/db";
import type {
  AuthenticatedUser,
  AuthorizationResourceContext,
  ResolvedDesignationGrant,
} from "./authorization.types";

export class ScopeEvaluator {
  /**
   * Recursively collect all descendant department IDs of a given department
   */
  public static async getDepartmentDescendants(
    departmentId: string,
    prisma: PrismaClient,
  ): Promise<string[]> {
    const children = await prisma.department.findMany({
      where: { parentId: departmentId },
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
   * Evaluate a resolved designation grant strategy against a resource context for a given user
   */
  public static async evaluate(
    user: AuthenticatedUser,
    grant: ResolvedDesignationGrant,
    resource: AuthorizationResourceContext | undefined,
    prisma: PrismaClient,
  ): Promise<boolean> {
    const strategy = grant.resolutionStrategy;

    switch (strategy) {
      case "Global":
        return true;

      case "OwnDepartment": {
        if (!resource?.departmentId) return false;

        // Check if resource.departmentId matches user's designation department or its descendants
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

        // Or if user belongs to an active team under this department or its ancestors
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

        // Direct project assignment check
        const directAssignment = await prisma.projectAssignment.findFirst({
          where: {
            userId: user.id,
            projectId: resource.projectId,
          },
        });
        if (directAssignment) return true;

        // Component assignment check
        const componentAssignment = await prisma.componentAssignment.findFirst({
          where: {
            userId: user.id,
            component: { projectId: resource.projectId },
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

      case "ExplicitDepartments": {
        if (!resource?.departmentId) return false;
        return grant.scopeTargets.departmentIds.includes(resource.departmentId);
      }

      case "ExplicitTeams": {
        if (!resource?.teamId) return false;
        return grant.scopeTargets.teamIds.includes(resource.teamId);
      }

      case "ExplicitProjects": {
        if (!resource?.projectId) return false;
        return grant.scopeTargets.projectIds.includes(resource.projectId);
      }

      default:
        return false;
    }
  }
}
