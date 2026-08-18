// src/Modules/Projects/projects.service.ts

import type { PrismaClient } from "@workspace/db";
import { Prisma } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError, ConflictError, AuthorizationError, BadRequestError } from "@/core/errors/AppError";
import { AuditLogService } from "@/core/audit/audit.service";
import { can, getUserPermissions } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type {
  CreateProjectDTO,
  UpdateProjectDTO,
  AssignProjectTeamDTO,
  AssignProjectMemberDTO,
  CreateProjectComponentDTO,
  UpdateProjectComponentDTO,
  CreateQuickClientDTO,
  CreateQuickProfileDTO,
  CreateQuickPlatformDTO,
  CreateQuickServiceLineDTO,
  CreateQuickStatusDTO,
  ProjectItem,
  ProjectDetailItem,
  ProjectCapabilities,
  ProjectStats,
  ProjectLookups,
} from "./ProjectDTO";

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

export class ProjectsService {
  private logger = new AppLogger("ProjectsService");

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Helper to evaluate and construct resource context from a project
   */
  private getProjectResourceContext(project: any) {
    const primaryTeamAssignment = project.teamAssignments?.find((ta: any) => !ta.unassignedAt) || project.teamAssignments?.[0];
    return {
      projectId: project.id,
      teamId: primaryTeamAssignment?.teamId || primaryTeamAssignment?.team?.id,
      departmentId: primaryTeamAssignment?.team?.departmentId || primaryTeamAssignment?.team?.department?.id,
      profileId: project.profileId,
    };
  }

  /**
   * Helper to generate a unique structured project code/identifier (e.g. PRJ-202608-4821)
   */
  public async generateProjectCode(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `PRJ-${year}${month}-`;

    for (let attempt = 0; attempt < 20; attempt++) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const candidateCode = `${prefix}${randomSuffix}`;
      const existing = await this.prisma.project.findFirst({
        where: { projectName: candidateCode },
        select: { id: true },
      });
      if (!existing) {
        return candidateCode;
      }
    }
    return `${prefix}${Date.now().toString().slice(-4)}`;
  }

  /**
   * Ensure that setting targetParentId does not create a circular dependency
   */
  private async validateHierarchyNoCycles(projectId: string, targetParentId: string): Promise<void> {
    if (projectId === targetParentId) {
      throw new BadRequestError("A project cannot be its own parent");
    }

    let currentParentId: string | null = targetParentId;
    const visited = new Set<string>([projectId]);

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        throw new BadRequestError("Circular hierarchy reference detected in project parent hierarchy");
      }
      visited.add(currentParentId);

      const parent: { parentId: string | null } | null = await this.prisma.project.findUnique({
        where: { id: currentParentId },
        select: { parentId: true },
      });
      currentParentId = parent?.parentId || null;
    }
  }

  /**
   * Helper to sanitize sensitive fields and compute server-side _capabilities
   */
  public async sanitizeAndDecorateProject(
    project: any,
    actor: AuthenticatedUser,
  ): Promise<ProjectItem> {
    const resourceContext = this.getProjectResourceContext(project);

    const [
      canEdit,
      canDelete,
      canReassign,
      canManageMembers,
      canManageComponents,
      canViewClient,
      canViewFinancials,
      canEditFinancials,
    ] = await Promise.all([
      can(actor, "project.edit", resourceContext),
      can(actor, "project.delete", resourceContext),
      can(actor, "project.reassign", resourceContext),
      can(actor, "project.manage_members", resourceContext),
      can(actor, "project.component.manage", resourceContext),
      can(actor, "project.client.view", resourceContext),
      can(actor, "project.financial.view", resourceContext),
      can(actor, "project.financial.edit", resourceContext),
    ]);

    const capabilities: ProjectCapabilities = {
      canEdit,
      canDelete,
      canReassign,
      canManageMembers,
      canManageComponents,
      canViewClient,
      canViewFinancials,
      canEditFinancials,
    };

    const sanitized: any = {
      ...project,
      value: canViewFinancials ? (project.value !== null ? Number(project.value) : 0) : null,
      amount: canViewFinancials
        ? project.amount !== null && project.amount !== undefined
          ? Number(project.amount)
          : null
        : null,
      percentage: canViewFinancials
        ? project.percentage !== null && project.percentage !== undefined
          ? Number(project.percentage)
          : null
        : null,
      orderSheetUrl: canViewFinancials ? project.orderSheetUrl : null,
      email: canViewClient ? project.email : null,
      clientId: canViewClient ? project.clientId : null,
      client: canViewClient ? project.client : null,
      profileId: canViewClient ? project.profileId : null,
      profile: canViewClient
        ? project.profile
        : project.profile
          ? {
              ...project.profile,
              username: "Confidential Profile",
              platform: project.profile.platform ? { name: project.profile.platform.name } : undefined,
            }
          : null,
      _capabilities: capabilities,
    };

    if (Array.isArray(project.subProjects)) {
      sanitized.subProjects = await Promise.all(
        project.subProjects.map((sp: any) => this.sanitizeAndDecorateProject(sp, actor)),
      );
    }

    return sanitized as ProjectItem;
  }

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
        const userDeptIds = Array.from(new Set(userTeams.map((t) => t.team.departmentId).filter(Boolean)));

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
        searchConditions.push({ client: { name: { contains: search, mode: "insensitive" } } });
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
      const requiresActionBool = query.requiresAction === true || query.requiresAction === "true";
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
      projects.map((project) => this.sanitizeAndDecorateProject(project, actor)),
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
  public async getProjectById(id: string, actor: AuthenticatedUser): Promise<ProjectDetailItem> {
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

    const resourceContext = this.getProjectResourceContext(project);
    const hasViewAccess = await can(actor, "project.view", resourceContext);

    if (!hasViewAccess) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const baseSanitized = await this.sanitizeAndDecorateProject(project, actor);

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
    const isGlobal = actor.systemRole === "SuperAdmin" || viewPerm?.scope === "Global" || viewPerm?.scope === "Override";

    const baseWhere: any = { deletedAt: null };

    if (!isGlobal) {
      const userTeams = await this.prisma.teamMember.findMany({
        where: { userId: actor.id, leftAt: null },
        select: { teamId: true, team: { select: { departmentId: true } } },
      });

      const userTeamIds = userTeams.map((t) => t.teamId);
      const userDeptIds = Array.from(new Set(userTeams.map((t) => t.team.departmentId).filter(Boolean)));

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

    const [totalProjects, activeProjects, inProgressProjects, inReviewProjects, deliveredProjects, activeProjectsWithValues] =
      await Promise.all([
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

  /**
   * Fetch lookups for project creation & filtering forms.
   */
  public async getLookups(actor: AuthenticatedUser): Promise<ProjectLookups> {
    const canViewClient = await can(actor, "project.client.view", undefined);

    const [statuses, platforms, profiles, serviceLines, assignmentRoles, teams, clients, parentCandidates] = await Promise.all([
      this.prisma.projectStatus.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      this.prisma.platform.findMany({
        where: { isActive: true },
        orderBy: [{ name: "asc" }],
      }),
      this.prisma.profile.findMany({
        where: { isActive: true },
        include: { platform: true },
        orderBy: [{ username: "asc" }],
      }),
      this.prisma.serviceLine.findMany({
        where: { isActive: true },
        orderBy: [{ name: "asc" }],
      }),
      this.prisma.assignmentRole.findMany({
        where: { isActive: true },
        orderBy: [{ name: "asc" }],
      }),
      this.prisma.team.findMany({
        where: { isActive: true },
        include: { department: true },
        orderBy: [{ name: "asc" }],
      }),
      canViewClient
        ? this.prisma.client.findMany({
            include: { platform: true },
            orderBy: [{ name: "asc" }],
          })
        : Promise.resolve([]),
      this.prisma.project.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          projectName: true,
          orderId: true,
          status: {
            select: {
              name: true,
              color: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        take: 100,
      }),
    ]);

    return {
      statuses,
      platforms,
      profiles,
      serviceLines,
      assignmentRoles,
      teams,
      clients,
      parentCandidates,
    };
  }

  /**
   * Create a new project with initial team allocation, member assignments, and components.
   */
  public async createProject(dto: CreateProjectDTO, actor: AuthenticatedUser): Promise<ProjectItem> {
    // 1. Verify general create permission
    const hasCreatePermission = await can(actor, "project.create", undefined);
    if (!hasCreatePermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    // 2. Check financial edit permission if custom value, amount, or percentage is provided
    if (
      (dto.value && dto.value > 0) ||
      (dto.amount && dto.amount > 0) ||
      (dto.percentage && dto.percentage > 0)
    ) {
      const hasFinancialEdit = await can(actor, "project.financial.edit", undefined);
      if (!hasFinancialEdit) {
        throw new AuthorizationError("You do not have permission to set project financial values");
      }
    }

    // 3. Verify Order ID uniqueness
    const existingOrder = await this.prisma.project.findUnique({
      where: { orderId: dto.orderId },
    });
    if (existingOrder) {
      throw new ConflictError(`Project with Order ID '${dto.orderId}' already exists`);
    }

    // 4. Verify Client & Profile existence
    const [client, profile] = await Promise.all([
      this.prisma.client.findUnique({ where: { id: dto.clientId } }),
      this.prisma.profile.findUnique({ where: { id: dto.profileId } }),
    ]);

    if (!client) throw new NotFoundError("Selected client does not exist");
    if (!profile) throw new NotFoundError("Selected profile does not exist");

    // 5. Parent Project & Parent Order validation
    let parentOrderId = dto.parentOrderId || null;
    if (dto.parentId) {
      const parent = await this.prisma.project.findFirst({
        where: { id: dto.parentId, deletedAt: null },
        select: { id: true, orderId: true },
      });
      if (!parent) {
        throw new NotFoundError("Parent project not found");
      }
      if (!parentOrderId) {
        parentOrderId = parent.orderId;
      }
    }

    // 6. Auto-generate project name/code if not provided or standardize
    const generatedProjectName = dto.projectName?.trim() || (await this.generateProjectCode());

    // 7. Execute creation within a transaction
    const newProject = await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          parentId: dto.parentId || null,
          parentOrderId,
          projectName: generatedProjectName,
          orderId: dto.orderId,
          service: dto.service?.trim() || null,
          email: dto.email?.trim() || null,
          orderLink: dto.orderLink?.trim() || null,
          clientId: dto.clientId,
          profileId: dto.profileId,
          serviceLineId: dto.serviceLineId || null,
          statusId: dto.statusId,
          value: new Prisma.Decimal(dto.value || 0),
          amount:
            dto.amount !== null && dto.amount !== undefined
              ? new Prisma.Decimal(dto.amount)
              : null,
          percentage:
            dto.percentage !== null && dto.percentage !== undefined
              ? new Prisma.Decimal(dto.percentage)
              : null,
          remarks: dto.remarks?.trim() || null,
          orderSheetUrl: dto.orderSheetUrl || null,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
        },
      });

      // Initial team assignments
      if (dto.assignedTeamIds && dto.assignedTeamIds.length > 0) {
        for (const teamId of dto.assignedTeamIds) {
          await tx.projectTeamAssignment.create({
            data: {
              projectId: project.id,
              teamId,
            },
          });
        }
      }

      // Initial user member assignments
      if (dto.initialMembers && dto.initialMembers.length > 0) {
        for (const member of dto.initialMembers) {
          await tx.projectAssignment.create({
            data: {
              projectId: project.id,
              userId: member.userId,
              roleId: member.roleId,
              note: member.note || null,
            },
          });
        }
      }

      // Initial components
      if (dto.initialComponents && dto.initialComponents.length > 0) {
        for (const comp of dto.initialComponents) {
          await tx.projectComponent.create({
            data: {
              projectId: project.id,
              name: comp.name,
              statusId: comp.statusId,
            },
          });
        }
      }

      return project;
    });

    // 8. Write Audit Log
    AuditLogService.log({
      module: "Projects",
      action: "CREATE",
      entityTable: "projects",
      entityId: newProject.id,
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.systemRole,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      metadata: {
        projectName: generatedProjectName,
        orderId: dto.orderId,
        parentId: dto.parentId,
        parentOrderId,
        clientId: dto.clientId,
        assignedTeams: dto.assignedTeamIds,
      },
      status: "SUCCESS",
    });

    return this.getProjectById(newProject.id, actor);
  }

  /**
   * Update an existing project's metadata, status, dates, and optional financial figures.
   */
  public async updateProject(
    id: string,
    dto: UpdateProjectDTO,
    actor: AuthenticatedUser,
  ): Promise<ProjectItem> {
    const existing = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        teamAssignments: { where: { unassignedAt: null }, include: { team: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError("Project not found");
    }

    const resourceContext = this.getProjectResourceContext(existing);
    const hasEditPermission = await can(actor, "project.edit", resourceContext);
    if (!hasEditPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    // Check financial edit permission if updating value, amount, percentage, or orderSheetUrl
    if (
      dto.value !== undefined ||
      dto.amount !== undefined ||
      dto.percentage !== undefined ||
      dto.orderSheetUrl !== undefined
    ) {
      const hasFinancialEdit = await can(actor, "project.financial.edit", resourceContext);
      if (!hasFinancialEdit) {
        throw new AuthorizationError("You do not have permission to modify project financial values");
      }
    }

    // Check client edit permission if updating clientId
    if (dto.clientId && dto.clientId !== existing.clientId) {
      const hasClientView = await can(actor, "project.client.view", resourceContext);
      if (!hasClientView) {
        throw new AuthorizationError("You do not have permission to modify client identity");
      }
    }

    // Check Order ID uniqueness if modified
    if (dto.orderId && dto.orderId !== existing.orderId) {
      const conflict = await this.prisma.project.findUnique({
        where: { orderId: dto.orderId },
      });
      if (conflict) {
        throw new ConflictError(`Project with Order ID '${dto.orderId}' already exists`);
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (dto.projectName !== undefined) updateData.projectName = dto.projectName;
    if (dto.orderId !== undefined) updateData.orderId = dto.orderId;
    if (dto.service !== undefined) updateData.service = dto.service?.trim() || null;
    if (dto.email !== undefined) updateData.email = dto.email?.trim() || null;
    if (dto.orderLink !== undefined) updateData.orderLink = dto.orderLink?.trim() || null;
    if (dto.clientId !== undefined) updateData.clientId = dto.clientId;
    if (dto.profileId !== undefined) updateData.profileId = dto.profileId;
    if (dto.serviceLineId !== undefined) updateData.serviceLineId = dto.serviceLineId;
    if (dto.statusId !== undefined) updateData.statusId = dto.statusId;
    if (dto.value !== undefined) updateData.value = new Prisma.Decimal(dto.value);
    if (dto.amount !== undefined)
      updateData.amount =
        dto.amount !== null && dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : null;
    if (dto.percentage !== undefined)
      updateData.percentage =
        dto.percentage !== null && dto.percentage !== undefined
          ? new Prisma.Decimal(dto.percentage)
          : null;
    if (dto.remarks !== undefined) updateData.remarks = dto.remarks?.trim() || null;
    if (dto.orderSheetUrl !== undefined) updateData.orderSheetUrl = dto.orderSheetUrl || null;
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.deliveryDate !== undefined) updateData.deliveryDate = dto.deliveryDate ? new Date(dto.deliveryDate) : null;

    if (dto.parentId !== undefined) {
      if (dto.parentId) {
        await this.validateHierarchyNoCycles(id, dto.parentId);
        const parent = await this.prisma.project.findFirst({
          where: { id: dto.parentId, deletedAt: null },
          select: { id: true, orderId: true },
        });
        if (!parent) {
          throw new NotFoundError("Parent project not found");
        }
        updateData.parentId = dto.parentId;
        if (!dto.parentOrderId) {
          updateData.parentOrderId = parent.orderId;
        }
      } else {
        updateData.parentId = null;
        updateData.parentOrderId = null;
      }
    }

    if (dto.parentOrderId !== undefined && dto.parentId === undefined) {
      updateData.parentOrderId = dto.parentOrderId || null;
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: updateData,
    });

    AuditLogService.log({
      module: "Projects",
      action: "UPDATE",
      entityTable: "projects",
      entityId: id,
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.systemRole,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      metadata: {
        updatedFields: Object.keys(dto),
      },
      status: "SUCCESS",
    });

    return this.getProjectById(updated.id, actor);
  }

  /**
   * Soft-delete a project (Rule BE-14).
   */
  public async deleteProject(id: string, actor: AuthenticatedUser): Promise<{ id: string; success: boolean }> {
    const existing = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        teamAssignments: { where: { unassignedAt: null }, include: { team: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError("Project not found");
    }

    const resourceContext = this.getProjectResourceContext(existing);
    const hasDeletePermission = await can(actor, "project.delete", resourceContext);
    if (!hasDeletePermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    await this.prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    AuditLogService.log({
      module: "Projects",
      action: "DELETE",
      entityTable: "projects",
      entityId: id,
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.systemRole,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      metadata: {
        projectName: existing.projectName,
        orderId: existing.orderId,
      },
      status: "SUCCESS",
    });

    return { id, success: true };
  }

  /**
   * Reassign project team allocations (Rule BE-14 sets unassignedAt).
   */
  public async reassignTeams(
    id: string,
    teamIds: string[],
    actor: AuthenticatedUser,
  ): Promise<ProjectDetailItem> {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        teamAssignments: { where: { unassignedAt: null }, include: { team: true } },
      },
    });

    if (!project) throw new NotFoundError("Project not found");

    const resourceContext = this.getProjectResourceContext(project);
    const hasReassignPermission = await can(actor, "project.reassign", resourceContext);
    if (!hasReassignPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const currentAssignments = await this.prisma.projectTeamAssignment.findMany({
      where: { projectId: id, unassignedAt: null },
    });

    const currentTeamIds = new Set(currentAssignments.map((a) => a.teamId));
    const nextTeamIds = new Set(teamIds);

    await this.prisma.$transaction(async (tx) => {
      // Unassign removed teams
      for (const assignment of currentAssignments) {
        if (!nextTeamIds.has(assignment.teamId)) {
          await tx.projectTeamAssignment.update({
            where: { id: assignment.id },
            data: { unassignedAt: new Date() },
          });
        }
      }

      // Assign new teams
      for (const teamId of teamIds) {
        if (!currentTeamIds.has(teamId)) {
          await tx.projectTeamAssignment.create({
            data: {
              projectId: id,
              teamId,
            },
          });
        }
      }
    });

    AuditLogService.log({
      module: "Projects",
      action: "REASSIGN_TEAMS",
      entityTable: "project_team_assignments",
      entityId: id,
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.systemRole,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      metadata: {
        previousTeamIds: Array.from(currentTeamIds),
        newTeamIds: teamIds,
      },
      status: "SUCCESS",
    });

    return this.getProjectById(id, actor);
  }

  /**
   * Assign or unassign individual project members with AssignmentRole.
   */
  public async manageMembers(
    id: string,
    members: { userId: string; roleId: string; note?: string | null }[],
    actor: AuthenticatedUser,
  ): Promise<ProjectDetailItem> {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        teamAssignments: { where: { unassignedAt: null }, include: { team: true } },
      },
    });

    if (!project) throw new NotFoundError("Project not found");

    const resourceContext = this.getProjectResourceContext(project);
    const hasManageMembersPermission = await can(actor, "project.manage_members", resourceContext);
    if (!hasManageMembersPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const currentAssignments = await this.prisma.projectAssignment.findMany({
      where: { projectId: id, unassignedAt: null },
    });

    const nextUserIds = new Set(members.map((m) => m.userId));

    await this.prisma.$transaction(async (tx) => {
      // Unassign members no longer in the list
      for (const assignment of currentAssignments) {
        if (!nextUserIds.has(assignment.userId)) {
          await tx.projectAssignment.update({
            where: { id: assignment.id },
            data: { unassignedAt: new Date() },
          });
        }
      }

      // Add or update assignments
      for (const member of members) {
        const existing = currentAssignments.find((a) => a.userId === member.userId);
        if (existing) {
          if (existing.roleId !== member.roleId || existing.note !== (member.note || null)) {
            await tx.projectAssignment.update({
              where: { id: existing.id },
              data: {
                roleId: member.roleId,
                note: member.note || null,
              },
            });
          }
        } else {
          await tx.projectAssignment.create({
            data: {
              projectId: id,
              userId: member.userId,
              roleId: member.roleId,
              note: member.note || null,
            },
          });
        }
      }
    });

    AuditLogService.log({
      module: "Projects",
      action: "MANAGE_MEMBERS",
      entityTable: "project_assignments",
      entityId: id,
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.systemRole,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      metadata: {
        memberCount: members.length,
      },
      status: "SUCCESS",
    });

    return this.getProjectById(id, actor);
  }

  /**
   * Add a component to a project.
   */
  public async addComponent(
    projectId: string,
    dto: CreateProjectComponentDTO,
    actor: AuthenticatedUser,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        teamAssignments: { where: { unassignedAt: null }, include: { team: true } },
      },
    });

    if (!project) throw new NotFoundError("Project not found");

    const resourceContext = this.getProjectResourceContext(project);
    const hasComponentPermission = await can(actor, "project.component.manage", resourceContext);
    if (!hasComponentPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const component = await this.prisma.$transaction(async (tx) => {
      const createdComp = await tx.projectComponent.create({
        data: {
          projectId,
          name: dto.name,
          statusId: dto.statusId,
        },
      });

      if (dto.teamIds && dto.teamIds.length > 0) {
        for (const teamId of dto.teamIds) {
          await tx.componentTeamAssignment.create({
            data: {
              componentId: createdComp.id,
              teamId,
            },
          });
        }
      }

      if (dto.memberAssignments && dto.memberAssignments.length > 0) {
        for (const m of dto.memberAssignments) {
          await tx.componentAssignment.create({
            data: {
              componentId: createdComp.id,
              userId: m.userId,
              roleId: m.roleId,
              note: m.note || null,
            },
          });
        }
      }

      return createdComp;
    });

    return this.getProjectById(projectId, actor);
  }

  /**
   * Update or remove a project component.
   */
  public async updateComponent(
    projectId: string,
    componentId: string,
    dto: UpdateProjectComponentDTO,
    actor: AuthenticatedUser,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        teamAssignments: { where: { unassignedAt: null }, include: { team: true } },
      },
    });

    if (!project) throw new NotFoundError("Project not found");

    const resourceContext = this.getProjectResourceContext(project);
    const hasComponentPermission = await can(actor, "project.component.manage", resourceContext);
    if (!hasComponentPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    await this.prisma.projectComponent.update({
      where: { id: componentId },
      data: {
        name: dto.name,
        statusId: dto.statusId,
        updatedAt: new Date(),
      },
    });

    return this.getProjectById(projectId, actor);
  }

  public async deleteComponent(
    projectId: string,
    componentId: string,
    actor: AuthenticatedUser,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        teamAssignments: { where: { unassignedAt: null }, include: { team: true } },
      },
    });

    if (!project) throw new NotFoundError("Project not found");

    const resourceContext = this.getProjectResourceContext(project);
    const hasComponentPermission = await can(actor, "project.component.manage", resourceContext);
    if (!hasComponentPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    await this.prisma.projectComponent.delete({
      where: { id: componentId },
    });

    return this.getProjectById(projectId, actor);
  }

  /**
   * Quick-create a new Client on the fly.
   */
  public async createClient(dto: CreateQuickClientDTO, actor: AuthenticatedUser) {
    const hasPermission = await can(actor, "project.create", undefined);
    if (!hasPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const platform = await this.prisma.platform.findUnique({ where: { id: dto.platformId } });
    if (!platform) throw new NotFoundError("Selected platform does not exist");

    const client = await this.prisma.client.create({
      data: {
        name: dto.name.trim(),
        platformId: dto.platformId,
        contactNotes: dto.contactNotes?.trim() || null,
      },
      include: {
        platform: true,
      },
    });

    AuditLogService.log({
      module: "Projects",
      action: "CREATE_CLIENT",
      entityTable: "clients",
      entityId: client.id,
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.systemRole,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      metadata: { name: client.name, platformId: client.platformId },
      status: "SUCCESS",
    });

    return client;
  }

  /**
   * Quick-create a new Profile on the fly.
   */
  public async createProfile(dto: CreateQuickProfileDTO, actor: AuthenticatedUser) {
    const hasPermission = await can(actor, "project.create", undefined);
    if (!hasPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const platform = await this.prisma.platform.findUnique({ where: { id: dto.platformId } });
    if (!platform) throw new NotFoundError("Selected platform does not exist");

    const existing = await this.prisma.profile.findUnique({
      where: {
        platformId_username: {
          platformId: dto.platformId,
          username: dto.username.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictError(`Profile '${dto.username}' already exists on this platform`);
    }

    const profile = await this.prisma.profile.create({
      data: {
        platformId: dto.platformId,
        username: dto.username.trim(),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        platform: true,
      },
    });

    AuditLogService.log({
      module: "Projects",
      action: "CREATE_PROFILE",
      entityTable: "profiles",
      entityId: profile.id,
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.systemRole,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      metadata: { username: profile.username, platformId: profile.platformId },
      status: "SUCCESS",
    });

    return profile;
  }

  /**
   * Quick-create a new Platform on the fly.
   */
  public async createPlatform(dto: CreateQuickPlatformDTO, actor: AuthenticatedUser) {
    const hasPermission = await can(actor, "project.create", undefined);
    if (!hasPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const code = (dto.code || dto.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")).trim();
    const existing = await this.prisma.platform.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictError(`Platform with code '${code}' already exists`);
    }

    const platform = await this.prisma.platform.create({
      data: {
        name: dto.name.trim(),
        code,
        isActive: true,
      },
    });

    AuditLogService.log({
      module: "Projects",
      action: "CREATE_PLATFORM",
      entityTable: "platforms",
      entityId: platform.id,
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.systemRole,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      metadata: { name: platform.name, code: platform.code },
      status: "SUCCESS",
    });

    return platform;
  }

  /**
   * Quick-create a new ServiceLine on the fly.
   */
  public async createServiceLine(dto: CreateQuickServiceLineDTO, actor: AuthenticatedUser) {
    const hasPermission = await can(actor, "project.create", undefined);
    if (!hasPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const slug = (dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).trim();
    const existing = await this.prisma.serviceLine.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictError(`Service Line with slug '${slug}' already exists`);
    }

    const serviceLine = await this.prisma.serviceLine.create({
      data: {
        name: dto.name.trim(),
        slug,
        parentServiceLineId: dto.parentServiceLineId || null,
        isActive: true,
      },
    });

    AuditLogService.log({
      module: "Projects",
      action: "CREATE_SERVICE_LINE",
      entityTable: "service_lines",
      entityId: serviceLine.id,
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.systemRole,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      metadata: { name: serviceLine.name, slug: serviceLine.slug },
      status: "SUCCESS",
    });

    return serviceLine;
  }

  /**
   * Quick-create a new ProjectStatus on the fly.
   */
  public async createStatus(dto: CreateQuickStatusDTO, actor: AuthenticatedUser) {
    const hasPermission = await can(actor, "project.create", undefined);
    if (!hasPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const code = (dto.code || dto.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")).trim();
    const existing = await this.prisma.projectStatus.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictError(`Project Status with code '${code}' already exists`);
    }

    const highestSort = await this.prisma.projectStatus.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const status = await this.prisma.projectStatus.create({
      data: {
        name: dto.name.trim(),
        code,
        color: dto.color?.trim() || null,
        requiresAction: dto.requiresAction || false,
        isTerminal: dto.isTerminal || false,
        sortOrder: (highestSort?.sortOrder || 0) + 1,
        isActive: true,
      },
    });

    AuditLogService.log({
      module: "Projects",
      action: "CREATE_STATUS",
      entityTable: "project_statuses",
      entityId: status.id,
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.systemRole,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      metadata: { name: status.name, code: status.code },
      status: "SUCCESS",
    });

    return status;
  }
}
