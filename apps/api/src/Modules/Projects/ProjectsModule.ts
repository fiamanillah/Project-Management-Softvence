// src/Modules/Projects/ProjectsModule.ts

import { BaseModule } from "@/core/BaseModule";
import { ProjectsService } from "./projects.service";
import { ProjectsController } from "./projects.controller";
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
} from "./ProjectDTO";

export class ProjectsModule extends BaseModule {
  public name: string = "ProjectsModule";
  public version: string = "1.0.0";
  public apiVersion: string = "v1";
  public basePath: string = "/projects";
  public dependencies?: string[] = [];

  protected async setupUseCases(): Promise<void> {
    const prisma = this.context.getService("prisma") as PrismaClient;
    this.registerService("ProjectsService", new ProjectsService(prisma));
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
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
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
      });

      if (!project) return undefined;
      const primaryAssignment = project.teamAssignments?.[0];
      return {
        projectId: project.id,
        teamId: primaryAssignment?.teamId,
        departmentId: primaryAssignment?.team?.departmentId,
        profileId: project.profileId,
      };
    };

    this.router.use(authenticate);

    // Overview Stats & Lookups
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

    // Project CRUD
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
