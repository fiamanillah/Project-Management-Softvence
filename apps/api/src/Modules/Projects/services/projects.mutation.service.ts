// apps/api/src/Modules/Projects/services/projects.mutation.service.ts

import type { PrismaClient } from "@workspace/db";
import { Prisma } from "@workspace/db";
import {
  NotFoundError,
  ConflictError,
  AuthorizationError,
} from "@/core/errors/AppError";
import { AuditLogService } from "@/core/audit/audit.service";
import { can } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type {
  CreateProjectDTO,
  UpdateProjectDTO,
  ProjectItem,
  ProjectDetailItem,
} from "../ProjectDTO";
import {
  getProjectResourceContext,
  generateProjectCode,
  validateHierarchyNoCycles,
} from "./projects.capability.helper";
import type { ProjectsQueryService } from "./projects.query.service";

export class ProjectsMutationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly queryService: ProjectsQueryService,
  ) {}

  /**
   * Create a new project with initial team allocation, member assignments, and components.
   */
  public async createProject(
    dto: CreateProjectDTO,
    actor: AuthenticatedUser,
  ): Promise<ProjectDetailItem | ProjectItem> {
    // 1. Verify general create permission
    const hasCreatePermission = await can(actor, "project.create", undefined);
    if (!hasCreatePermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    // 2. Check financial edit permission if custom value, amount, or percentage is provided
    const valNum = dto.value !== undefined && dto.value !== null ? Number(dto.value) : 0;
    const amtNum = dto.amount !== undefined && dto.amount !== null ? Number(dto.amount) : 0;
    const pctNum = dto.percentage !== undefined && dto.percentage !== null ? Number(dto.percentage) : 0;
    if (valNum > 0 || amtNum > 0 || pctNum > 0) {
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
    const generatedProjectName =
      dto.projectName?.trim() || (await generateProjectCode(this.prisma));

    // 7. Execute creation within a transaction
    const newProject = await this.prisma.$transaction(async (tx) => {
      let calculatedValue = Number(dto.value || 0);
      const grossAmount =
        dto.amount !== null && dto.amount !== undefined ? Number(dto.amount) : null;
      const platformChargePct =
        dto.percentage !== null && dto.percentage !== undefined
          ? Number(dto.percentage)
          : null;
      if (grossAmount !== null) {
        const deduction = platformChargePct ? (grossAmount * platformChargePct) / 100 : 0;
        calculatedValue = Math.max(0, grossAmount - deduction);
      }

      const project = await tx.project.create({
        data: {
          parentId: dto.parentId || null,
          parentOrderId,
          branchId: dto.branchId || null,
          projectName: generatedProjectName,
          orderId: dto.orderId,
          service: dto.service?.trim() || null,
          email: dto.email?.trim() || null,
          orderLink: dto.orderLink?.trim() || null,
          clientId: dto.clientId,
          profileId: dto.profileId,
          serviceLineId: dto.serviceLineId || null,
          orderSourceId: dto.orderSourceId || null,
          statusId: dto.statusId,
          value: new Prisma.Decimal(calculatedValue),
          amount: grossAmount !== null ? new Prisma.Decimal(grossAmount) : null,
          percentage: platformChargePct !== null ? new Prisma.Decimal(platformChargePct) : null,
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

    return this.queryService.getProjectById(newProject.id, actor);
  }

  /**
   * Update an existing project's metadata, status, dates, and optional financial figures.
   */
  public async updateProject(
    id: string,
    dto: UpdateProjectDTO,
    actor: AuthenticatedUser,
  ): Promise<ProjectDetailItem | ProjectItem> {
    const existing = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        teamAssignments: { where: { unassignedAt: null }, include: { team: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError("Project not found");
    }

    const resourceContext = getProjectResourceContext(existing);
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
    if (dto.branchId !== undefined) updateData.branchId = dto.branchId || null;
    if (dto.orderId !== undefined) updateData.orderId = dto.orderId;
    if (dto.service !== undefined) updateData.service = dto.service?.trim() || null;
    if (dto.email !== undefined) updateData.email = dto.email?.trim() || null;
    if (dto.orderLink !== undefined) updateData.orderLink = dto.orderLink?.trim() || null;
    if (dto.clientId !== undefined) updateData.clientId = dto.clientId;
    if (dto.profileId !== undefined) updateData.profileId = dto.profileId;
    if (dto.serviceLineId !== undefined) updateData.serviceLineId = dto.serviceLineId;
    if (dto.orderSourceId !== undefined) updateData.orderSourceId = dto.orderSourceId || null;
    if (dto.statusId !== undefined) updateData.statusId = dto.statusId;

    if (dto.amount !== undefined || dto.percentage !== undefined || dto.value !== undefined) {
      const grossAmount =
        dto.amount !== undefined
          ? dto.amount !== null
            ? Number(dto.amount)
            : null
          : existing.amount
            ? Number(existing.amount)
            : null;
      const platformChargePct =
        dto.percentage !== undefined
          ? dto.percentage !== null
            ? Number(dto.percentage)
            : null
          : existing.percentage
            ? Number(existing.percentage)
            : null;

      if (dto.amount !== undefined) {
        updateData.amount = grossAmount !== null ? new Prisma.Decimal(grossAmount) : null;
      }
      if (dto.percentage !== undefined) {
        updateData.percentage =
          platformChargePct !== null ? new Prisma.Decimal(platformChargePct) : null;
      }

      if (grossAmount !== null) {
        const deduction = platformChargePct ? (grossAmount * platformChargePct) / 100 : 0;
        updateData.value = new Prisma.Decimal(Math.max(0, grossAmount - deduction));
      } else if (dto.value !== undefined) {
        updateData.value = new Prisma.Decimal(dto.value);
      }
    }

    if (dto.remarks !== undefined) updateData.remarks = dto.remarks?.trim() || null;
    if (dto.orderSheetUrl !== undefined) updateData.orderSheetUrl = dto.orderSheetUrl || null;
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.deliveryDate !== undefined)
      updateData.deliveryDate = dto.deliveryDate ? new Date(dto.deliveryDate) : null;

    if (dto.parentId !== undefined) {
      if (dto.parentId) {
        await validateHierarchyNoCycles(this.prisma, id, dto.parentId);
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

    return this.queryService.getProjectById(updated.id, actor);
  }

  /**
   * Soft-delete a project (Rule BE-14).
   */
  public async deleteProject(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<{ id: string; success: boolean }> {
    const existing = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        teamAssignments: { where: { unassignedAt: null }, include: { team: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError("Project not found");
    }

    const resourceContext = getProjectResourceContext(existing);
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
}
