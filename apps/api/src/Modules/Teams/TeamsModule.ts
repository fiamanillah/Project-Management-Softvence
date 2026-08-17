// src/Modules/Teams/TeamsModule.ts

import { BaseModule } from "@/core/BaseModule";
import { TeamsService } from "./teams.service";
import { TeamsController } from "./teams.controller";
import { validateRequest } from "@/middleware/validation";
import { authenticate } from "@/middleware/auth.middleware";
import { requirePermission } from "@/middleware/requirePermission";
import type { PrismaClient } from "@workspace/db";
import {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
  updateTeamMemberSchema,
} from "./TeamDTO";

export class TeamsModule extends BaseModule {
  public name: string = "TeamsModule";
  public version: string = "1.0.0";
  public apiVersion: string = "v1";
  public basePath: string = "/teams";
  public dependencies?: string[] = [];

  protected async setupUseCases(): Promise<void> {
    const prisma = this.context.getService("prisma") as PrismaClient;
    this.registerService("TeamsService", new TeamsService(prisma));
  }

  protected async setupControllers(): Promise<void> {
    const teamsService = this.getService<TeamsService>("TeamsService");
    this.registerController("TeamsController", new TeamsController(teamsService));
  }

  protected async setupRoutes(): Promise<void> {
    const controller = this.getController<TeamsController>("TeamsController");
    const prisma = this.context.getService("prisma") as PrismaClient;

    // Helper resource loader for team-scoped endpoints (Rule BE-16)
    const loadTeamResource = async (req: any) => {
      const teamId = req.params?.id;
      if (!teamId) return undefined;
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { departmentId: true, id: true },
      });
      return team ? { departmentId: team.departmentId, teamId: team.id } : undefined;
    };

    this.router.use(authenticate);

    // Overview Stats & Lookups
    this.router.get(
      "/stats",
      requirePermission("organization.team.view"),
      controller.getTeamStats.bind(controller),
    );

    this.router.get(
      "/roles",
      requirePermission("organization.team.view"),
      controller.getAssignmentRoles.bind(controller),
    );

    // Team CRUD
    this.router.get(
      "/",
      requirePermission("organization.team.view"),
      controller.getTeams.bind(controller),
    );

    this.router.get(
      "/:id",
      requirePermission("organization.team.view", loadTeamResource),
      controller.getTeamById.bind(controller),
    );

    this.router.post(
      "/",
      validateRequest({ body: createTeamSchema }),
      requirePermission("organization.team.create", (req) =>
        req.body?.departmentId ? { departmentId: req.body.departmentId } : undefined,
      ),
      controller.createTeam.bind(controller),
    );

    this.router.patch(
      "/:id",
      validateRequest({ body: updateTeamSchema }),
      requirePermission("organization.team.edit", loadTeamResource),
      controller.updateTeam.bind(controller),
    );

    this.router.delete(
      "/:id",
      requirePermission("organization.team.delete", loadTeamResource),
      controller.deleteTeam.bind(controller),
    );

    // Team Member Roster & Assignment Management
    this.router.get(
      "/:id/members",
      requirePermission("organization.team.view", loadTeamResource),
      controller.getTeamMembers.bind(controller),
    );

    this.router.post(
      "/:id/members",
      validateRequest({ body: addTeamMemberSchema }),
      requirePermission("organization.team.manage_members", loadTeamResource),
      controller.addTeamMember.bind(controller),
    );

    this.router.patch(
      "/:id/members/:memberId",
      validateRequest({ body: updateTeamMemberSchema }),
      requirePermission("organization.team.manage_members", loadTeamResource),
      controller.updateTeamMember.bind(controller),
    );

    this.router.delete(
      "/:id/members/:memberId",
      requirePermission("organization.team.manage_members", loadTeamResource),
      controller.removeTeamMember.bind(controller),
    );
  }
}
