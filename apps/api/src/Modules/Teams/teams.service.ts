// src/Modules/Teams/teams.service.ts

import type { PrismaClient } from "@workspace/db";
import { StorageManager } from "@workspace/storage";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError, ConflictError, BadRequestError } from "@/core/errors/AppError";
import { AuditLogService } from "@/core/audit/audit.service";
import { AuthorizationEngine, can } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type { Request } from "express";
import type {
  CreateTeamDTO,
  UpdateTeamDTO,
  AddTeamMemberDTO,
  UpdateTeamMemberDTO,
} from "./TeamDTO";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

export interface GetTeamsQuery {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  shift?: string;
  isActive?: boolean | string;
}

export class TeamsService {
  private logger = new AppLogger("TeamsService");

  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage?: StorageManager,
  ) {}

  /**
   * List teams with filters, pagination, member summaries, and computed _capabilities
   */
  public async getTeams(query: GetTeamsQuery, actor?: AuthenticatedUser) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search && query.search.trim() !== "") {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { department: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.shift && query.shift !== "all") {
      where.shift = query.shift;
    }

    if (query.isActive !== undefined && query.isActive !== "all") {
      where.isActive = query.isActive === true || query.isActive === "true";
    }

    const [total, teams] = await Promise.all([
      this.prisma.team.count({ where }),
      this.prisma.team.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        include: {
          department: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          members: {
            where: { leftAt: null },
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
                  designation: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      hierarchyLevel: true,
                      department: {
                        select: {
                          id: true,
                          code: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
              role: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  qualifiesForTeamScope: true,
                },
              },
            },
          },
          _count: {
            select: {
              members: { where: { leftAt: null } },
              projectAssignments: { where: { unassignedAt: null } },
              bdOrders: true,
            },
          },
        },
      }),
    ]);

    // Compute server-authoritative capabilities for each team (Rule BE-17)
    const items = await Promise.all(
      teams.map(async (team) => {
        const context = { departmentId: team.departmentId, teamId: team.id };
        const [canEdit, canDelete, canManageMembers] = actor
          ? await Promise.all([
              can(actor, "organization.team.edit", context),
              can(actor, "organization.team.delete", context),
              can(actor, "organization.team.manage_members", context),
            ])
          : [false, false, false];

        const leads = team.members.filter((m) => m.role.qualifiesForTeamScope);

        return {
          ...team,
          leads,
          _capabilities: {
            canEdit,
            canDelete,
            canManageMembers,
          },
        };
      }),
    );

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Get single team details including full active roster, past member history, and _capabilities
   */
  public async getTeamById(id: string, actor?: AuthenticatedUser) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        members: {
          orderBy: { joinedAt: "desc" },
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
                designation: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    hierarchyLevel: true,
                    department: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                qualifiesForTeamScope: true,
              },
            },
          },
        },
        projectAssignments: {
          where: { unassignedAt: null },
          include: {
            project: {
              select: {
                id: true,
                projectName: true,
                orderId: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: { where: { leftAt: null } },
            projectAssignments: { where: { unassignedAt: null } },
            bdOrders: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundError("Team");
    }

    const activeMembers = team.members.filter((m) => m.leftAt === null);
    const pastMembers = team.members.filter((m) => m.leftAt !== null);
    const leads = activeMembers.filter((m) => m.role.qualifiesForTeamScope);

    const context = { departmentId: team.departmentId, teamId: team.id };
    const [canEdit, canDelete, canManageMembers] = actor
      ? await Promise.all([
          can(actor, "organization.team.edit", context),
          can(actor, "organization.team.delete", context),
          can(actor, "organization.team.manage_members", context),
        ])
      : [false, false, false];

    return {
      ...team,
      activeMembers,
      pastMembers,
      leads,
      _capabilities: {
        canEdit,
        canDelete,
        canManageMembers,
      },
    };
  }

  /**
   * Get overview statistics for the Teams module
   */
  public async getTeamStats(_actor?: AuthenticatedUser) {
    const [totalTeams, activeTeams, totalMembersCount, distinctDepartments] = await Promise.all([
      this.prisma.team.count(),
      this.prisma.team.count({ where: { isActive: true } }),
      this.prisma.teamMember.count({
        where: {
          leftAt: null,
          team: { isActive: true },
        },
      }),
      this.prisma.team.findMany({
        where: { isActive: true },
        select: { departmentId: true },
        distinct: ["departmentId"],
      }),
    ]);

    return {
      totalTeams,
      activeTeams,
      totalMembers: totalMembersCount,
      totalDepartmentsRepresented: distinctDepartments.length,
    };
  }

  /**
   * Create a new team with optional initial members
   */
  public async createTeam(data: CreateTeamDTO, actor?: AuthenticatedUser, req?: Request) {
    const slug = data.slug ? slugify(data.slug) : slugify(data.name);

    if (!slug) {
      throw new BadRequestError("Valid team slug could not be generated from team name");
    }

    // Check slug uniqueness
    const existing = await this.prisma.team.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictError(`Team with slug '${slug}' already exists`);
    }

    // Check department existence and active status
    const department = await this.prisma.department.findUnique({
      where: { id: data.departmentId },
    });
    if (!department) {
      throw new NotFoundError("Department");
    }
    if (!department.isActive) {
      throw new BadRequestError("Cannot create a team under an inactive department");
    }

    // Validate initial members if provided
    if (data.initialMembers && data.initialMembers.length > 0) {
      const userIds = data.initialMembers.map((m) => m.userId);
      const roleIds = data.initialMembers.map((m) => m.roleId);

      const [users, roles] = await Promise.all([
        this.prisma.user.findMany({
          where: { id: { in: userIds }, isActive: true, deletedAt: null },
          select: { id: true },
        }),
        this.prisma.assignmentRole.findMany({
          where: { id: { in: roleIds }, isActive: true },
          select: { id: true },
        }),
      ]);

      if (users.length !== new Set(userIds).size) {
        throw new BadRequestError("One or more initial members are invalid or inactive users");
      }
      if (roles.length !== new Set(roleIds).size) {
        throw new BadRequestError("One or more initial assignment roles are invalid or inactive");
      }
    }

    // Execute in transaction
    const team = await this.prisma.$transaction(async (tx) => {
      const createdTeam = await tx.team.create({
        data: {
          name: data.name,
          slug,
          departmentId: data.departmentId,
          shift: data.shift || null,
          avatarUrl: data.avatarUrl || null,
          isActive: data.isActive ?? true,
        },
      });

      if (data.initialMembers && data.initialMembers.length > 0) {
        await tx.teamMember.createMany({
          data: data.initialMembers.map((m) => ({
            teamId: createdTeam.id,
            userId: m.userId,
            roleId: m.roleId,
            note: m.note || null,
            joinedAt: new Date(),
          })),
        });
      }

      return createdTeam;
    });

    // Invalidate permission cache if members were added (Rule BE-10)
    if (data.initialMembers && data.initialMembers.length > 0) {
      await AuthorizationEngine.getInstance().invalidateCache();
      for (const m of data.initialMembers) {
        await AuthorizationEngine.getInstance().invalidateUserCache(m.userId);
      }
    }

    this.logger.info(`Team created: ${team.name} (${team.id})`);

    // Audit log
    AuditLogService.log({
      module: "Teams",
      action: "TEAM_CREATED",
      entityTable: "teams",
      entityId: team.id,
      actor: actor
        ? {
            id: actor.id,
            email: actor.email || "unknown",
            role: actor.systemRole,
          }
        : undefined,
      req,
      metadata: {
        teamId: team.id,
        name: team.name,
        slug: team.slug,
        departmentId: team.departmentId,
        memberCount: data.initialMembers?.length || 0,
      },
      status: "SUCCESS",
    });

    return this.getTeamById(team.id, actor);
  }

  /**
   * Update team metadata (name, slug, shift, department, active status)
   */
  public async updateTeam(
    id: string,
    data: UpdateTeamDTO,
    actor?: AuthenticatedUser,
    req?: Request,
  ) {
    const existing = await this.prisma.team.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundError("Team");
    }

    let nextSlug: string | undefined = undefined;
    if (data.slug) {
      nextSlug = slugify(data.slug);
      if (nextSlug !== existing.slug) {
        const slugExists = await this.prisma.team.findUnique({
          where: { slug: nextSlug },
        });
        if (slugExists) {
          throw new ConflictError(`Team slug '${nextSlug}' already exists`);
        }
      }
    } else if (data.name && data.name !== existing.name && !data.slug) {
      // Auto update slug if name changed and custom slug not explicitly provided
      const autoSlug = slugify(data.name);
      if (autoSlug !== existing.slug) {
        const slugExists = await this.prisma.team.findUnique({
          where: { slug: autoSlug },
        });
        if (!slugExists) {
          nextSlug = autoSlug;
        }
      }
    }

    if (data.departmentId && data.departmentId !== existing.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!dept) {
        throw new NotFoundError("Department");
      }
      if (!dept.isActive) {
        throw new BadRequestError("Cannot move team to an inactive department");
      }
    }

    const updated = await this.prisma.team.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        slug: nextSlug ?? existing.slug,
        departmentId: data.departmentId ?? existing.departmentId,
        shift: data.shift !== undefined ? data.shift : existing.shift,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : existing.avatarUrl,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
        updatedAt: new Date(),
      },
    });

    this.logger.info(`Team updated: ${updated.name} (${updated.id})`);

    // Audit log
    AuditLogService.log({
      module: "Teams",
      action: "TEAM_UPDATED",
      entityTable: "teams",
      entityId: updated.id,
      actor: actor
        ? {
            id: actor.id,
            email: actor.email || "unknown",
            role: actor.systemRole,
          }
        : undefined,
      req,
      metadata: {
        teamId: updated.id,
        changes: data,
      },
      status: "SUCCESS",
    });

    return this.getTeamById(updated.id, actor);
  }

  /**
   * Soft-delete/deactivate a team (Rule BE-14)
   */
  public async deleteTeam(id: string, actor?: AuthenticatedUser, req?: Request) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: { where: { leftAt: null } },
            projectAssignments: { where: { unassignedAt: null } },
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundError("Team");
    }

    // Soft-deactivate the team
    await this.prisma.team.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    this.logger.info(`Team deactivated: ${team.name} (${team.id})`);

    // Audit log
    AuditLogService.log({
      module: "Teams",
      action: "TEAM_DEACTIVATED",
      entityTable: "teams",
      entityId: team.id,
      actor: actor
        ? {
            id: actor.id,
            email: actor.email || "unknown",
            role: actor.systemRole,
          }
        : undefined,
      req,
      metadata: {
        teamId: team.id,
        name: team.name,
      },
      status: "SUCCESS",
    });

    return { message: "Team deactivated successfully", id: team.id };
  }

  /**
   * Get active and historical members of a team
   */
  public async getTeamMembers(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });
    if (!team) {
      throw new NotFoundError("Team");
    }

    return this.prisma.teamMember.findMany({
      where: { teamId },
      orderBy: [{ leftAt: "asc" }, { joinedAt: "desc" }],
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
            designation: {
              select: {
                id: true,
                code: true,
                name: true,
                hierarchyLevel: true,
                department: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        role: {
          select: {
            id: true,
            code: true,
            name: true,
            qualifiesForTeamScope: true,
          },
        },
      },
    });
  }

  /**
   * Add a member to a team with an assignment role
   * Enforces Rule BE-10 (cache invalidation) & Rule BE-14 (soft deletion history)
   */
  public async addTeamMember(
    teamId: string,
    data: AddTeamMemberDTO,
    actor?: AuthenticatedUser,
    req?: Request,
  ) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });
    if (!team) {
      throw new NotFoundError("Team");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!user || !user.isActive || user.deletedAt) {
      throw new NotFoundError("Active user");
    }

    const role = await this.prisma.assignmentRole.findUnique({
      where: { id: data.roleId },
    });
    if (!role || !role.isActive) {
      throw new NotFoundError("Active assignment role");
    }

    // Check if already an active member of this team
    const activeMembership = await this.prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: data.userId,
        leftAt: null,
      },
    });
    if (activeMembership) {
      throw new ConflictError("User is already an active member of this team");
    }

    // Create new membership record (preserves audit history of previous assignments)
    const newMember = await this.prisma.teamMember.create({
      data: {
        teamId,
        userId: data.userId,
        roleId: data.roleId,
        note: data.note || null,
        joinedAt: new Date(),
      },
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
            designation: {
              select: {
                id: true,
                code: true,
                name: true,
                hierarchyLevel: true,
                department: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        role: {
          select: {
            id: true,
            code: true,
            name: true,
            qualifiesForTeamScope: true,
          },
        },
      },
    });

    // Rule BE-10: Invalidate permission version & user cache so OwnTeam scope takes immediate effect
    await AuthorizationEngine.getInstance().invalidateCache();
    await AuthorizationEngine.getInstance().invalidateUserCache(data.userId);

    this.logger.info(`User ${user.email} added to team ${team.name} as ${role.name}`);

    // Audit log
    AuditLogService.log({
      module: "Teams",
      action: "TEAM_MEMBER_ADDED",
      entityTable: "team_members",
      entityId: newMember.id,
      actor: actor
        ? {
            id: actor.id,
            email: actor.email || "unknown",
            role: actor.systemRole,
          }
        : undefined,
      req,
      metadata: {
        teamId,
        userId: data.userId,
        roleId: data.roleId,
        roleCode: role.code,
      },
      status: "SUCCESS",
    });

    return newMember;
  }

  /**
   * Update team member assignment role or note
   */
  public async updateTeamMember(
    teamId: string,
    memberId: string,
    data: UpdateTeamMemberDTO,
    actor?: AuthenticatedUser,
    req?: Request,
  ) {
    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, teamId, leftAt: null },
      include: { role: true },
    });
    if (!member) {
      throw new NotFoundError("Active team member");
    }

    let nextRoleId = member.roleId;
    if (data.roleId && data.roleId !== member.roleId) {
      const role = await this.prisma.assignmentRole.findUnique({
        where: { id: data.roleId },
      });
      if (!role || !role.isActive) {
        throw new NotFoundError("Active assignment role");
      }
      nextRoleId = role.id;
    }

    const updated = await this.prisma.teamMember.update({
      where: { id: memberId },
      data: {
        roleId: nextRoleId,
        note: data.note !== undefined ? data.note : member.note,
      },
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
            designation: {
              select: {
                id: true,
                code: true,
                name: true,
                hierarchyLevel: true,
                department: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        role: {
          select: {
            id: true,
            code: true,
            name: true,
            qualifiesForTeamScope: true,
          },
        },
      },
    });

    // Invalidate cache if role changed
    if (data.roleId && data.roleId !== member.roleId) {
      await AuthorizationEngine.getInstance().invalidateCache();
      await AuthorizationEngine.getInstance().invalidateUserCache(member.userId);
    }

    // Audit log
    AuditLogService.log({
      module: "Teams",
      action: "TEAM_MEMBER_ROLE_UPDATED",
      entityTable: "team_members",
      entityId: updated.id,
      actor: actor
        ? {
            id: actor.id,
            email: actor.email || "unknown",
            role: actor.systemRole,
          }
        : undefined,
      req,
      metadata: {
        teamId,
        memberId,
        previousRoleId: member.roleId,
        newRoleId: nextRoleId,
      },
      status: "SUCCESS",
    });

    return updated;
  }

  /**
   * Soft-remove member from team via leftAt = new Date() (Rule BE-14 & BE-10)
   */
  public async removeTeamMember(
    teamId: string,
    memberId: string,
    actor?: AuthenticatedUser,
    req?: Request,
  ) {
    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, teamId },
      include: { user: true, team: true },
    });
    if (!member) {
      throw new NotFoundError("Team member");
    }
    if (member.leftAt !== null) {
      throw new BadRequestError("Member has already been removed from this team");
    }

    const removed = await this.prisma.teamMember.update({
      where: { id: memberId },
      data: {
        leftAt: new Date(),
      },
    });

    // Rule BE-10: Invalidate permission version & user cache so OwnTeam scope is instantly revoked
    await AuthorizationEngine.getInstance().invalidateCache();
    await AuthorizationEngine.getInstance().invalidateUserCache(member.userId);

    this.logger.info(`User ${member.user.email} removed from team ${member.team.name}`);

    // Audit log
    AuditLogService.log({
      module: "Teams",
      action: "TEAM_MEMBER_REMOVED",
      entityTable: "team_members",
      entityId: memberId,
      actor: actor
        ? {
            id: actor.id,
            email: actor.email || "unknown",
            role: actor.systemRole,
          }
        : undefined,
      req,
      metadata: {
        teamId,
        memberId,
        userId: member.userId,
        leftAt: removed.leftAt,
      },
      status: "SUCCESS",
    });

    return { message: "Member removed from team successfully", id: memberId };
  }

  /**
   * Fetch active assignment roles for member role assignment
   */
  public async getAssignmentRoles() {
    return this.prisma.assignmentRole.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Upload and set a public team avatar
   */
  public async uploadAvatar(
    teamId: string,
    file: Express.Multer.File,
    actor?: AuthenticatedUser,
    req?: Request,
  ) {
    const ALLOWED_MIMETYPES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundError("Team");
    }

    if (!file) {
      throw new BadRequestError("No image file provided");
    }

    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestError(
        "Invalid file type. Only JPEG, PNG, WEBP, GIF, and SVG images are allowed.",
      );
    }

    if (file.size > MAX_SIZE) {
      throw new BadRequestError("Image file size exceeds the 5MB limit");
    }

    let avatarUrl: string;

    if (this.storage) {
      const uploadResult = await this.storage.uploadFile({
        body: file.buffer,
        fileName: file.originalname || `avatar-${teamId}.png`,
        contentType: file.mimetype,
        entityType: "team_avatar",
        entityId: teamId,
        isPublic: true,
      });
      avatarUrl = uploadResult.publicUrl || uploadResult.url;
    } else {
      avatarUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    }

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        avatarUrl,
        updatedAt: new Date(),
      },
    });

    this.logger.info(`Team avatar updated: ${updated.name} (${updated.id})`);

    AuditLogService.log({
      module: "Teams",
      action: "TEAM_AVATAR_UPDATED",
      entityTable: "teams",
      entityId: teamId,
      actor: actor
        ? {
            id: actor.id,
            email: actor.email || "unknown",
            role: actor.systemRole,
          }
        : undefined,
      req,
      metadata: {
        teamId,
        avatarUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
      status: "SUCCESS",
    });

    return {
      message: "Team avatar uploaded successfully",
      avatarUrl,
      team: updated,
    };
  }

  /**
   * Remove team avatar
   */
  public async removeAvatar(
    teamId: string,
    actor?: AuthenticatedUser,
    req?: Request,
  ) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundError("Team");
    }

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        avatarUrl: null,
        updatedAt: new Date(),
      },
    });

    this.logger.info(`Team avatar removed: ${updated.name} (${updated.id})`);

    AuditLogService.log({
      module: "Teams",
      action: "TEAM_AVATAR_REMOVED",
      entityTable: "teams",
      entityId: teamId,
      actor: actor
        ? {
            id: actor.id,
            email: actor.email || "unknown",
            role: actor.systemRole,
          }
        : undefined,
      req,
      metadata: {
        teamId,
      },
      status: "SUCCESS",
    });

    return {
      message: "Team avatar removed successfully",
      team: updated,
    };
  }
}
