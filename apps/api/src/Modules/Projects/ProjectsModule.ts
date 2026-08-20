// src/Modules/Projects/ProjectsModule.ts

import { BaseModule } from "@/core/BaseModule";
import { ProjectsService } from "./projects.service";
import { ProjectsController } from "./projects.controller";
import { ProjectChatGateway } from "./gateways/ProjectChatGateway";
import { RealtimeServer } from "@/core/realtime/RealtimeServer";
import { validateRequest } from "@/middleware/validation";
import { authenticate } from "@/middleware/auth.middleware";
import { requirePermission } from "@/middleware/requirePermission";
import type { PrismaClient } from "@workspace/db";
import {
  createProjectSchema,
  updateProjectSchema,
  createProjectComponentSchema,
  updateProjectComponentSchema,
  createQuickClientSchema,
  createQuickProfileSchema,
  createQuickPlatformSchema,
  createQuickServiceLineSchema,
  createQuickStatusSchema,
  createQuickOrderSourceSchema,
  createProjectMessageSchema,
  toggleReactionSchema,
  markMessagesSeenSchema,
  leadApproveSchema,
  salesDispatchSchema,
  requestRevisionSchema,
  createMessageTypeSchema,
  updateMessageTypeSchema,
  createProjectMilestoneSchema,
  updateProjectMilestoneSchema,
  createProjectLinkSchema,
} from "./ProjectDTO";
import { findProjectByIdOrCode } from "./services/projects.capability.helper";

export class ProjectsModule extends BaseModule {
  public name: string = "ProjectsModule";
  public version: string = "1.0.0";
  public apiVersion: string = "v1";
  public basePath: string = "/projects";
  public dependencies?: string[] = [];

  protected async setupUseCases(): Promise<void> {
    const prisma = this.context.getService("prisma") as PrismaClient;
    const projectsService = new ProjectsService(prisma);
    this.registerService("ProjectsService", projectsService);

    // Register WebSocket Gateway
    const chatGateway = new ProjectChatGateway(projectsService.chat, projectsService.approval);
    RealtimeServer.getInstance().registerGateway(chatGateway);
  }

  protected async setupControllers(): Promise<void> {
    const projectsService = this.getService<ProjectsService>("ProjectsService");
    this.registerController("ProjectsController", new ProjectsController(projectsService));
  }

  protected async setupRoutes(): Promise<void> {
    const controller = this.getController<ProjectsController>("ProjectsController");
    const prisma = this.context.getService("prisma") as PrismaClient;

    // Helper resource loader for project-scoped endpoints (Rule BE-16)
    const loadProjectResource = async (req: any) => {
      const projectId = req.params?.id;
      if (!projectId) return undefined;
      const project = await findProjectByIdOrCode(
        prisma,
        projectId,
        undefined,
        {
          id: true,
          profileId: true,
          teamAssignments: {
            where: { unassignedAt: null },
            select: {
              teamId: true,
              team: { select: { departmentId: true } },
            },
          },
        },
      );

      if (!project) return undefined;
      const primaryAssignment = (project as any).teamAssignments?.[0];
      return {
        projectId: project.id,
        teamId: primaryAssignment?.teamId,
        departmentId: primaryAssignment?.team?.departmentId,
        profileId: project.profileId,
      };
    };

    this.router.use(authenticate);

    // --- Workspace Command Center ---
    this.router.get(
      "/workspace",
      requirePermission("project.view"),
      controller.getWorkspaceProjects.bind(controller),
    );

    // --- Dynamic Message Types ---
    this.router.get(
      "/message-types",
      requirePermission("project.view"),
      controller.getMessageTypes.bind(controller),
    );

    this.router.post(
      "/message-types",
      validateRequest({ body: createMessageTypeSchema }),
      requirePermission("project.chat.manage_types"),
      controller.createMessageType.bind(controller),
    );

    this.router.patch(
      "/message-types/:id",
      validateRequest({ body: updateMessageTypeSchema }),
      requirePermission("project.chat.manage_types"),
      controller.updateMessageType.bind(controller),
    );

    this.router.delete(
      "/message-types/:id",
      requirePermission("project.chat.manage_types"),
      controller.deleteMessageType.bind(controller),
    );

    // --- Overview Stats & Lookups ---
    this.router.get(
      "/stats",
      requirePermission("project.view"),
      controller.getProjectStats.bind(controller),
    );

    this.router.get(
      "/lookups",
      requirePermission("project.view"),
      controller.getLookups.bind(controller),
    );

    this.router.get(
      "/lookups/clients",
      requirePermission("project.client.view"),
      controller.getClients.bind(controller),
    );

    // Lookup Quick-Creation
    this.router.post(
      "/lookups/clients",
      validateRequest({ body: createQuickClientSchema }),
      requirePermission("project.create"),
      controller.createClient.bind(controller),
    );

    this.router.post(
      "/lookups/profiles",
      validateRequest({ body: createQuickProfileSchema }),
      requirePermission("project.create"),
      controller.createProfile.bind(controller),
    );

    this.router.post(
      "/lookups/platforms",
      validateRequest({ body: createQuickPlatformSchema }),
      requirePermission("project.create"),
      controller.createPlatform.bind(controller),
    );

    this.router.post(
      "/lookups/service-lines",
      validateRequest({ body: createQuickServiceLineSchema }),
      requirePermission("project.create"),
      controller.createServiceLine.bind(controller),
    );

    this.router.post(
      "/lookups/statuses",
      validateRequest({ body: createQuickStatusSchema }),
      requirePermission("project.create"),
      controller.createStatus.bind(controller),
    );

    this.router.post(
      "/lookups/order-sources",
      validateRequest({ body: createQuickOrderSourceSchema }),
      requirePermission("project.create"),
      controller.createOrderSource.bind(controller),
    );

    // --- Project Real-Time Messages & Chat ---
    this.router.get(
      "/:id/messages",
      requirePermission("project.view", loadProjectResource),
      controller.getProjectMessages.bind(controller),
    );

    this.router.post(
      "/:id/messages",
      validateRequest({ body: createProjectMessageSchema }),
      requirePermission("project.view", loadProjectResource),
      controller.sendMessage.bind(controller),
    );

    this.router.post(
      "/:id/messages/:messageId/react",
      validateRequest({ body: toggleReactionSchema }),
      requirePermission("project.view", loadProjectResource),
      controller.toggleReaction.bind(controller),
    );

    this.router.post(
      "/:id/messages/seen",
      validateRequest({ body: markMessagesSeenSchema }),
      requirePermission("project.view", loadProjectResource),
      controller.markMessagesSeen.bind(controller),
    );

    this.router.post(
      "/:id/messages/:messageId/seen",
      validateRequest({ body: markMessagesSeenSchema }),
      requirePermission("project.view", loadProjectResource),
      controller.markMessagesSeen.bind(controller),
    );

    this.router.post(
      "/:id/messages/:messageId/pin",
      requirePermission("project.chat.pin", loadProjectResource),
      controller.togglePinMessage.bind(controller),
    );

    // --- Approval State Machine ---
    this.router.post(
      "/:id/messages/:messageId/approval/lead-approve",
      validateRequest({ body: leadApproveSchema }),
      requirePermission("project.approval.lead_review", loadProjectResource),
      controller.leadApprove.bind(controller),
    );

    this.router.post(
      "/:id/messages/:messageId/approval/sales-dispatch",
      validateRequest({ body: salesDispatchSchema }),
      requirePermission("project.approval.sales_dispatch", loadProjectResource),
      controller.salesDispatch.bind(controller),
    );

    this.router.post(
      "/:id/messages/:messageId/approval/reject",
      validateRequest({ body: requestRevisionSchema }),
      requirePermission("project.approval.lead_review", loadProjectResource),
      controller.requestRevision.bind(controller),
    );

    // --- Milestones & Collateral ---
    this.router.get(
      "/:id/milestones",
      requirePermission("project.view", loadProjectResource),
      controller.getMilestones.bind(controller),
    );

    this.router.post(
      "/:id/milestones",
      validateRequest({ body: createProjectMilestoneSchema }),
      requirePermission("project.collateral.manage", loadProjectResource),
      controller.createMilestone.bind(controller),
    );

    this.router.patch(
      "/:id/milestones/:milestoneId",
      validateRequest({ body: updateProjectMilestoneSchema }),
      requirePermission("project.collateral.manage", loadProjectResource),
      controller.updateMilestone.bind(controller),
    );

    this.router.get(
      "/:id/links",
      requirePermission("project.view", loadProjectResource),
      controller.getLinks.bind(controller),
    );

    this.router.post(
      "/:id/links",
      validateRequest({ body: createProjectLinkSchema }),
      requirePermission("project.collateral.manage", loadProjectResource),
      controller.createLink.bind(controller),
    );

    // --- Project CRUD ---
    this.router.get(
      "/",
      requirePermission("project.view"),
      controller.getProjects.bind(controller),
    );

    this.router.get(
      "/:id",
      requirePermission("project.view", loadProjectResource),
      controller.getProjectById.bind(controller),
    );

    this.router.post(
      "/",
      validateRequest({ body: createProjectSchema }),
      requirePermission("project.create"),
      controller.createProject.bind(controller),
    );

    this.router.patch(
      "/:id",
      validateRequest({ body: updateProjectSchema }),
      requirePermission("project.edit", loadProjectResource),
      controller.updateProject.bind(controller),
    );

    this.router.delete(
      "/:id",
      requirePermission("project.delete", loadProjectResource),
      controller.deleteProject.bind(controller),
    );

    // Team Allocation & Reassignment
    this.router.post(
      "/:id/teams",
      requirePermission("project.reassign", loadProjectResource),
      controller.reassignTeams.bind(controller),
    );

    // Member Assignment
    this.router.post(
      "/:id/members",
      requirePermission("project.manage_members", loadProjectResource),
      controller.manageMembers.bind(controller),
    );

    // Components Management
    this.router.post(
      "/:id/components",
      validateRequest({ body: createProjectComponentSchema }),
      requirePermission("project.component.manage", loadProjectResource),
      controller.addComponent.bind(controller),
    );

    this.router.patch(
      "/:id/components/:componentId",
      validateRequest({ body: updateProjectComponentSchema }),
      requirePermission("project.component.manage", loadProjectResource),
      controller.updateComponent.bind(controller),
    );

    this.router.delete(
      "/:id/components/:componentId",
      requirePermission("project.component.manage", loadProjectResource),
      controller.deleteComponent.bind(controller),
    );
  }
}
