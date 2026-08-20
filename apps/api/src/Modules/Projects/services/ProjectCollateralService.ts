// src/Modules/Projects/services/ProjectCollateralService.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError, ForbiddenError } from "@/core/errors/AppError";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import { can } from "@/core/authorization/AuthorizationEngine";
import { RealtimeServer } from "@/core/realtime/RealtimeServer";
import type {
  CreateProjectMilestoneDTO,
  UpdateProjectMilestoneDTO,
  CreateProjectLinkDTO,
  ProjectMilestoneItem,
  ProjectLinkItem,
} from "../ProjectDTO";
import { getProjectResourceContext, findProjectByIdOrCode } from "./projects.capability.helper";

export class ProjectCollateralService {
  private logger = new AppLogger("ProjectCollateralService");
  private realtimeServer = RealtimeServer.getInstance();

  constructor(private readonly prisma: PrismaClient) {}

  // ==========================================
  // MILESTONES
  // ==========================================

  public async getMilestones(
    projectId: string,
    actor: AuthenticatedUser,
  ): Promise<ProjectMilestoneItem[]> {
    const project = await findProjectByIdOrCode(this.prisma, projectId, {
      teamAssignments: {
        where: { unassignedAt: null },
        include: { team: { include: { department: true } } },
      },
    });

    if (!project) throw new NotFoundError("Project not found");

    const resolvedProjectId = project.id;

    const milestones = await this.prisma.projectMilestone.findMany({
      where: { projectId: resolvedProjectId },
      orderBy: { dueDate: "asc" },
      include: { assignedTo: true },
    });

    return milestones.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      title: m.title,
      dueDate: m.dueDate.toISOString(),
      isCompleted: m.isCompleted,
      assignedTo: m.assignedTo ? `${m.assignedTo.firstName} ${m.assignedTo.lastName}` : null,
      assignedToUser: m.assignedTo
        ? {
            id: m.assignedTo.id,
            name: `${m.assignedTo.firstName} ${m.assignedTo.lastName}`,
            avatar: m.assignedTo.avatarUrl || null,
          }
        : null,
      deliverableCount: m.deliverableCount,
      completedAt: m.completedAt ? m.completedAt.toISOString() : null,
    }));
  }

  public async createMilestone(
    projectId: string,
    dto: CreateProjectMilestoneDTO,
    actor: AuthenticatedUser,
  ): Promise<ProjectMilestoneItem> {
    const project = await findProjectByIdOrCode(this.prisma, projectId, {
      teamAssignments: {
        where: { unassignedAt: null },
        include: { team: { include: { department: true } } },
      },
    });

    if (!project) throw new NotFoundError("Project not found");

    const resolvedProjectId = project.id;

    const resourceContext = getProjectResourceContext(project);
    const hasPermission = await can(actor, "project.collateral.manage", resourceContext);
    if (!hasPermission) {
      throw new ForbiddenError("You do not have permission to manage project milestones");
    }

    const created = await this.prisma.projectMilestone.create({
      data: {
        projectId: resolvedProjectId,
        title: dto.title,
        dueDate: new Date(dto.dueDate),
        assignedToUserId: dto.assignedToUserId || null,
        deliverableCount: dto.deliverableCount || 0,
      },
      include: { assignedTo: true },
    });

    const item: ProjectMilestoneItem = {
      id: created.id,
      projectId: created.projectId,
      title: created.title,
      dueDate: created.dueDate.toISOString(),
      isCompleted: created.isCompleted,
      assignedTo: created.assignedTo ? `${created.assignedTo.firstName} ${created.assignedTo.lastName}` : null,
      assignedToUser: created.assignedTo
        ? {
            id: created.assignedTo.id,
            name: `${created.assignedTo.firstName} ${created.assignedTo.lastName}`,
            avatar: created.assignedTo.avatarUrl || null,
          }
        : null,
      deliverableCount: created.deliverableCount,
      completedAt: created.completedAt ? created.completedAt.toISOString() : null,
    };

    this.realtimeServer.toProject(projectId, "system:event", {
      event: "project:milestone_created",
      payload: item,
    });

    return item;
  }

  public async updateMilestone(
    projectId: string,
    milestoneId: string,
    dto: UpdateProjectMilestoneDTO,
    actor: AuthenticatedUser,
  ): Promise<ProjectMilestoneItem> {
    const milestone = await this.prisma.projectMilestone.findFirst({
      where: { id: milestoneId, projectId },
      include: {
        project: {
          include: {
            teamAssignments: {
              where: { unassignedAt: null },
              include: { team: { include: { department: true } } },
            },
          },
        },
      },
    });

    if (!milestone) throw new NotFoundError("Milestone not found");

    const resourceContext = getProjectResourceContext(milestone.project);
    const hasPermission = await can(actor, "project.collateral.manage", resourceContext);
    if (!hasPermission) {
      throw new ForbiddenError("You do not have permission to manage project milestones");
    }

    const isCompleting = dto.isCompleted && !milestone.isCompleted;
    const isUncompleting = dto.isCompleted === false && milestone.isCompleted;

    const updated = await this.prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        title: dto.title ?? milestone.title,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : milestone.dueDate,
        isCompleted: dto.isCompleted !== undefined ? dto.isCompleted : milestone.isCompleted,
        assignedToUserId: dto.assignedToUserId !== undefined ? dto.assignedToUserId : milestone.assignedToUserId,
        deliverableCount: dto.deliverableCount !== undefined ? dto.deliverableCount : milestone.deliverableCount,
        completedAt: isCompleting ? new Date() : isUncompleting ? null : milestone.completedAt,
      },
      include: { assignedTo: true },
    });

    const item: ProjectMilestoneItem = {
      id: updated.id,
      projectId: updated.projectId,
      title: updated.title,
      dueDate: updated.dueDate.toISOString(),
      isCompleted: updated.isCompleted,
      assignedTo: updated.assignedTo ? `${updated.assignedTo.firstName} ${updated.assignedTo.lastName}` : null,
      assignedToUser: updated.assignedTo
        ? {
            id: updated.assignedTo.id,
            name: `${updated.assignedTo.firstName} ${updated.assignedTo.lastName}`,
            avatar: updated.assignedTo.avatarUrl || null,
          }
        : null,
      deliverableCount: updated.deliverableCount,
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
    };

    this.realtimeServer.toProject(projectId, "system:event", {
      event: "project:milestone_updated",
      payload: item,
    });

    return item;
  }

  // ==========================================
  // LINKS & BOOKMARKS
  // ==========================================

  public async getLinks(
    projectId: string,
    actor: AuthenticatedUser,
  ): Promise<ProjectLinkItem[]> {
    const project = await findProjectByIdOrCode(this.prisma, projectId);
    if (!project) return [];

    const links = await this.prisma.projectLink.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      include: { addedBy: true },
    });

    return links.map((l) => ({
      id: l.id,
      projectId: l.projectId,
      title: l.title,
      url: l.url,
      category: l.category,
      description: l.description || null,
      addedAt: l.createdAt.toISOString(),
      addedBy: l.addedBy
        ? {
            id: l.addedBy.id,
            name: `${l.addedBy.firstName} ${l.addedBy.lastName}`,
          }
        : null,
    }));
  }

  public async createLink(
    projectId: string,
    dto: CreateProjectLinkDTO,
    actor: AuthenticatedUser,
  ): Promise<ProjectLinkItem> {
    const project = await findProjectByIdOrCode(this.prisma, projectId, {
      teamAssignments: {
        where: { unassignedAt: null },
        include: { team: { include: { department: true } } },
      },
    });

    if (!project) throw new NotFoundError("Project not found");

    const resolvedProjectId = project.id;

    const resourceContext = getProjectResourceContext(project);
    const hasPermission = await can(actor, "project.collateral.manage", resourceContext);
    if (!hasPermission) {
      throw new ForbiddenError("You do not have permission to add links to this project");
    }

    const created = await this.prisma.projectLink.create({
      data: {
        projectId: resolvedProjectId,
        title: dto.title,
        url: dto.url,
        category: dto.category || "Other",
        description: dto.description || null,
        addedById: actor.id,
      },
      include: { addedBy: true },
    });

    const item: ProjectLinkItem = {
      id: created.id,
      projectId: created.projectId,
      title: created.title,
      url: created.url,
      category: created.category,
      description: created.description || null,
      addedAt: created.createdAt.toISOString(),
      addedBy: created.addedBy
        ? {
            id: created.addedBy.id,
            name: `${created.addedBy.firstName} ${created.addedBy.lastName}`,
          }
        : null,
    };

    this.realtimeServer.toProject(projectId, "system:event", {
      event: "project:link_created",
      payload: item,
    });

    return item;
  }
}
