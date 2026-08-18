// apps/api/src/Modules/Projects/services/projects.query.service.ts

import type { PrismaClient } from "@workspace/db";
import { NotFoundError, AuthorizationError } from "@/core/errors/AppError";
import { can, getUserPermissions } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type {
  ProjectItem,
  ProjectDetailItem,
  ProjectStats,
} from "../ProjectDTO";
import {
  getProjectResourceContext,
  sanitizeAndDecorateProject,
} from "./projects.capability.helper";

export interface GetProjectsQuery {
  page?: number;
  limit?: number;
  search?: string;
  parentId?: string;
  statusId?: string;
  serviceLineId?: string;
  platformId?: string;
  profileId?: string;
  teamId?: string;
  clientId?: string;
  isTerminal?: boolean | string;
  requiresAction?: boolean | string;
  startDate?: string;
  deliveryDate?: string;
}

export class ProjectsQueryService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * List projects with pagination, multi-attribute filtering, scoped authorization,
   * sensitive field masking, and capabilities decoration (Rules BE-1, BE-11, BE-17).
   */
  public async getProjects(query: GetProjectsQuery, actor: AuthenticatedUser) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    // Scoped query restriction for non-SuperAdmin users
    if (actor.systemRole !== "SuperAdmin") {
      const userPerms = await getUserPermissions(actor);
      const viewPerm = userPerms["project.view"];
      const isGlobal = viewPerm?.scope === "Global" || viewPerm?.scope === "Override";

      if (!isGlobal) {
        // Collect user's assigned teams
        const userTeams = await this.prisma.teamMember.findMany({
          where: { userId: actor.id, leftAt: null },
          select: { teamId: true, team: { select: { departmentId: true } } },
        });

        const userTeamIds = userTeams.map((t) => t.teamId);
        const userDeptIds = Array.from(
          new Set(userTeams.map((t) => t.team.departmentId).filter(Boolean)),
        );

        const scopedConditions: any[] = [
          // 1. Direct Project Assignment
          {
            userAssignments: {
              some: {
                userId: actor.id,
                unassignedAt: null,
              },
            },
          },
          // 2. Direct Component Assignment
          {
            components: {
              some: {
                userAssignments: {
                  some: {
                    userId: actor.id,
                    unassignedAt: null,
                  },
                },
              },
            },
          },
        ];

        // 3. Team Assignment (OwnTeam or higher)
        if (userTeamIds.length > 0) {
          scopedConditions.push({
            teamAssignments: {
              some: {
                teamId: { in: userTeamIds },
                unassignedAt: null,
              },
            },
          });
        }

        // 4. Department Scope (OwnDepartment)
        if (viewPerm?.scope === "OwnDepartment" && userDeptIds.length > 0) {
          scopedConditions.push({
            teamAssignments: {
              some: {
                team: { departmentId: { in: userDeptIds } },
                unassignedAt: null,
              },
            },
          });
        }

        where.OR = scopedConditions;
      }
    }

    // Dynamic Search Filter
    if (query.search && query.search.trim() !== "") {
      const search = query.search.trim();
      const searchConditions: any[] = [
        { projectName: { contains: search, mode: "insensitive" } },
        { orderId: { contains: search, mode: "insensitive" } },
        { serviceLine: { name: { contains: search, mode: "insensitive" } } },
      ];

      // If actor can view clients globally, allow searching by client name
      const canViewClientGlobal = await can(actor, "project.client.view", undefined);
      if (canViewClientGlobal) {
        searchConditions.push({
          client: { name: { contains: search, mode: "insensitive" } },
        });
      }

      if (where.OR) {
        where.AND = [{ OR: searchConditions }];
      } else {
        where.OR = searchConditions;
      }
    }

    // Additional filters
    if (query.statusId && query.statusId !== "all") {
      where.statusId = query.statusId;
    }

    if (query.serviceLineId && query.serviceLineId !== "all") {
      where.serviceLineId = query.serviceLineId;
    }

    if (query.platformId && query.platformId !== "all") {
      where.profile = { platformId: query.platformId };
    }

    if (query.profileId && query.profileId !== "all") {
      where.profileId = query.profileId;
    }

    if (query.clientId && query.clientId !== "all") {
      where.clientId = query.clientId;
    }

    if (query.teamId && query.teamId !== "all") {
      where.teamAssignments = {
        some: {
          teamId: query.teamId,
          unassignedAt: null,
        },
      };
    }

    if (query.parentId !== undefined) {
      if (query.parentId === "root" || query.parentId === "null") {
        where.parentId = null;
      } else if (query.parentId !== "all") {
        where.parentId = query.parentId;
      }
    }

    if (query.isTerminal !== undefined && query.isTerminal !== "all") {
      const isTerminalBool = query.isTerminal === true || query.isTerminal === "true";
      where.status = { isTerminal: isTerminalBool };
    }

    if (query.requiresAction !== undefined && query.requiresAction !== "all") {
      const requiresActionBool =
        query.requiresAction === true || query.requiresAction === "true";
      where.status = { ...where.status, requiresAction: requiresActionBool };
    }

    const [total, projects] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }],
        include: {
          parentProject: {
            select: {
              id: true,
              orderId: true,
              projectName: true,
              status: true,
            },
          },
          status: true,
          profile: {
            include: {
              platform: true,
            },
          },
          serviceLine: true,
          orderSource: true,
          client: true,
          teamAssignments: {
            where: { unassignedAt: null },
            include: {
              team: {
                include: {
                  department: true,
                },
              },
            },
          },
          userAssignments: {
            where: { unassignedAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  employeeId: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  systemRole: true,
                  avatarUrl: true,
                  isActive: true,
                },
              },
              role: true,
            },
          },
          components: {
            include: {
              status: true,
              teamAssignments: {
                where: { unassignedAt: null },
                include: { team: true },
              },
              userAssignments: {
                where: { unassignedAt: null },
                include: { user: true, role: true },
              },
            },
          },
          _count: {
            select: {
              components: true,
              userAssignments: { where: { unassignedAt: null } },
              teamAssignments: { where: { unassignedAt: null } },
              issues: true,
              subProjects: { where: { deletedAt: null } },
            },
          },
        },
      }),
    ]);

    // Sanitize sensitive fields & decorate server-side _capabilities
    const items = await Promise.all(
      projects.map((project) => sanitizeAndDecorateProject(project, actor)),
    );

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Get single project detail by ID with active & past rosters, components, and sanitized fields.
   */
  public async getProjectById(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<ProjectDetailItem> {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        parentProject: {
          include: {
            status: true,
          },
        },
        subProjects: {
          where: { deletedAt: null },
          include: {
            status: true,
            teamAssignments: {
              where: { unassignedAt: null },
              include: { team: true },
            },
            userAssignments: {
              where: { unassignedAt: null },
              include: { user: true, role: true },
            },
          },
          orderBy: [{ createdAt: "asc" }],
        },
        status: true,
        profile: {
          include: {
            platform: true,
          },
        },
        serviceLine: true,
        orderSource: true,
        client: true,
        teamAssignments: {
          include: {
            team: {
              include: {
                department: true,
              },
            },
          },
          orderBy: [{ assignedAt: "desc" }],
        },
        userAssignments: {
          include: {
            user: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                email: true,
                systemRole: true,
                avatarUrl: true,
                isActive: true,
              },
            },
            role: true,
          },
          orderBy: [{ assignedAt: "desc" }],
        },
        components: {
          include: {
            status: true,
            teamAssignments: {
              where: { unassignedAt: null },
              include: { team: true },
            },
            userAssignments: {
              where: { unassignedAt: null },
              include: { user: true, role: true },
            },
          },
          orderBy: [{ createdAt: "asc" }],
        },
        _count: {
          select: {
            components: true,
            userAssignments: { where: { unassignedAt: null } },
            teamAssignments: { where: { unassignedAt: null } },
            issues: true,
            subProjects: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const resourceContext = getProjectResourceContext(project);
    const hasViewAccess = await can(actor, "project.view", resourceContext);

    if (!hasViewAccess) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const baseSanitized = await sanitizeAndDecorateProject(project, actor);

    const activeTeams = project.teamAssignments.filter((ta) => !ta.unassignedAt);
    const pastTeams = project.teamAssignments.filter((ta) => ta.unassignedAt !== null);

    const activeMembers = project.userAssignments.filter((ua) => !ua.unassignedAt);
    const pastMembers = project.userAssignments.filter((ua) => ua.unassignedAt !== null);

    return {
      ...baseSanitized,
      activeTeams: activeTeams as any,
      pastTeams: pastTeams as any,
      activeMembers: activeMembers as any,
      pastMembers: pastMembers as any,
    } as ProjectDetailItem;
  }

  /**
   * Get project KPI statistics with pipeline value authorization masking.
   */
  public async getProjectStats(actor: AuthenticatedUser): Promise<ProjectStats> {
    const userPerms = await getUserPermissions(actor);
    const viewPerm = userPerms["project.view"];
    const isGlobal =
      actor.systemRole === "SuperAdmin" ||
      viewPerm?.scope === "Global" ||
      viewPerm?.scope === "Override";

    const baseWhere: any = { deletedAt: null };

    if (!isGlobal) {
      const userTeams = await this.prisma.teamMember.findMany({
        where: { userId: actor.id, leftAt: null },
        select: { teamId: true, team: { select: { departmentId: true } } },
      });

      const userTeamIds = userTeams.map((t) => t.teamId);
      const userDeptIds = Array.from(
        new Set(userTeams.map((t) => t.team.departmentId).filter(Boolean)),
      );

      const scopedConditions: any[] = [
        {
          userAssignments: {
            some: {
              userId: actor.id,
              unassignedAt: null,
            },
          },
        },
        {
          components: {
            some: {
              userAssignments: {
                some: {
                  userId: actor.id,
                  unassignedAt: null,
                },
              },
            },
          },
        },
      ];

      if (userTeamIds.length > 0) {
        scopedConditions.push({
          teamAssignments: {
            some: {
              teamId: { in: userTeamIds },
              unassignedAt: null,
            },
          },
        });
      }

      if (viewPerm?.scope === "OwnDepartment" && userDeptIds.length > 0) {
        scopedConditions.push({
          teamAssignments: {
            some: {
              team: { departmentId: { in: userDeptIds } },
              unassignedAt: null,
            },
          },
        });
      }

      baseWhere.OR = scopedConditions;
    }

    const [
      totalProjects,
      activeProjects,
      inProgressProjects,
      inReviewProjects,
      deliveredProjects,
      activeProjectsWithValues,
    ] = await Promise.all([
      this.prisma.project.count({ where: baseWhere }),
      this.prisma.project.count({
        where: {
          ...baseWhere,
          status: { isTerminal: false },
        },
      }),
      this.prisma.project.count({
        where: {
          ...baseWhere,
          status: { code: "IN_PROGRESS" },
        },
      }),
      this.prisma.project.count({
        where: {
          ...baseWhere,
          status: { code: "IN_REVIEW" },
        },
      }),
      this.prisma.project.count({
        where: {
          ...baseWhere,
          status: { isTerminal: true },
        },
      }),
      this.prisma.project.findMany({
        where: {
          ...baseWhere,
          status: { isTerminal: false },
        },
        select: { id: true, value: true, profileId: true },
      }),
    ]);

    const canViewFinancials = await can(actor, "project.financial.view", undefined);

    let totalPipelineValue: number | null = null;
    if (canViewFinancials) {
      totalPipelineValue = activeProjectsWithValues.reduce((sum, p) => {
        return sum + (p.value ? Number(p.value) : 0);
      }, 0);
    }

    return {
      totalProjects,
      activeProjects,
      inProgressProjects,
      inReviewProjects,
      deliveredProjects,
      totalPipelineValue,
    };
  }
}
