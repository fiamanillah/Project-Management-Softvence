// apps/api/src/Modules/Projects/services/projects.component.service.ts

import type { PrismaClient } from "@workspace/db";
import { NotFoundError, AuthorizationError } from "@/core/errors/AppError";
import { can } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type {
  CreateProjectComponentDTO,
  UpdateProjectComponentDTO,
  ProjectDetailItem,
} from "../ProjectDTO";
import { getProjectResourceContext } from "./projects.capability.helper";
import type { ProjectsQueryService } from "./projects.query.service";

export class ProjectsComponentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly queryService: ProjectsQueryService,
  ) {}

  /**
   * Add a component to a project.
   */
  public async addComponent(
    projectId: string,
    dto: CreateProjectComponentDTO,
    actor: AuthenticatedUser,
  ): Promise<ProjectDetailItem> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        teamAssignments: { where: { unassignedAt: null }, include: { team: true } },
      },
    });

    if (!project) throw new NotFoundError("Project not found");

    const resourceContext = getProjectResourceContext(project);
    const hasComponentPermission = await can(
      actor,
      "project.component.manage",
      resourceContext,
    );
    if (!hasComponentPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    await this.prisma.$transaction(async (tx) => {
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

    return this.queryService.getProjectById(projectId, actor);
  }

  /**
   * Update a project component.
   */
  public async updateComponent(
    projectId: string,
    componentId: string,
    dto: UpdateProjectComponentDTO,
    actor: AuthenticatedUser,
  ): Promise<ProjectDetailItem> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        teamAssignments: { where: { unassignedAt: null }, include: { team: true } },
      },
    });

    if (!project) throw new NotFoundError("Project not found");

    const resourceContext = getProjectResourceContext(project);
    const hasComponentPermission = await can(
      actor,
      "project.component.manage",
      resourceContext,
    );
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

    return this.queryService.getProjectById(projectId, actor);
  }

  /**
   * Delete a project component.
   */
  public async deleteComponent(
    projectId: string,
    componentId: string,
    actor: AuthenticatedUser,
  ): Promise<ProjectDetailItem> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        teamAssignments: { where: { unassignedAt: null }, include: { team: true } },
      },
    });

    if (!project) throw new NotFoundError("Project not found");

    const resourceContext = getProjectResourceContext(project);
    const hasComponentPermission = await can(
      actor,
      "project.component.manage",
      resourceContext,
    );
    if (!hasComponentPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    await this.prisma.projectComponent.delete({
      where: { id: componentId },
    });

    return this.queryService.getProjectById(projectId, actor);
  }
}
