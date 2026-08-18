// apps/api/src/Modules/Projects/services/projects.assignment.service.ts

import type { PrismaClient } from "@workspace/db";
import { NotFoundError, AuthorizationError } from "@/core/errors/AppError";
import { AuditLogService } from "@/core/audit/audit.service";
import { can } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type { ProjectDetailItem } from "../ProjectDTO";
import { getProjectResourceContext } from "./projects.capability.helper";
import type { ProjectsQueryService } from "./projects.query.service";

export class ProjectsAssignmentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly queryService: ProjectsQueryService,
  ) {}

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

    const resourceContext = getProjectResourceContext(project);
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

    return this.queryService.getProjectById(id, actor);
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

    const resourceContext = getProjectResourceContext(project);
    const hasManageMembersPermission = await can(
      actor,
      "project.manage_members",
      resourceContext,
    );
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
          if (
            existing.roleId !== member.roleId ||
            existing.note !== (member.note || null)
          ) {
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

    return this.queryService.getProjectById(id, actor);
  }
}
