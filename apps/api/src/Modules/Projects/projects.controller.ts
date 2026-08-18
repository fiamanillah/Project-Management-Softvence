// src/Modules/Projects/projects.controller.ts

import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { ProjectsService } from "./projects.service";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type {
  CreateProjectDTO,
  UpdateProjectDTO,
  CreateProjectComponentDTO,
  UpdateProjectComponentDTO,
} from "./ProjectDTO";

function getActor(req: Request): AuthenticatedUser {
  return {
    id: req.user?.sub || "",
    email: (req.user as any)?.email || "",
    systemRole: req.user?.systemRole || "Staff",
    roleId: (req.user as any)?.roleId || "",
    designationId: req.user?.designationId,
    ipAddress: req.ip || (req.headers["x-forwarded-for"] as string),
    userAgent: req.headers["user-agent"],
  };
}

export class ProjectsController extends BaseController {
  constructor(private readonly projectsService: ProjectsService) {
    super();
  }

  public async getProjects(req: Request, res: Response) {
    const actor = getActor(req);
    const result = await this.projectsService.getProjects(req.query as any, actor);
    return this.sendPaginatedResponse(
      req,
      res,
      result.pagination,
      "Projects retrieved successfully",
      result.items,
    );
  }

  public async getProjectStats(req: Request, res: Response) {
    const actor = getActor(req);
    const stats = await this.projectsService.getProjectStats(actor);
    return this.sendResponse(req, res, "Project stats retrieved successfully", 200, stats);
  }

  public async getLookups(req: Request, res: Response) {
    const actor = getActor(req);
    const lookups = await this.projectsService.getLookups(actor);
    return this.sendResponse(req, res, "Project lookups retrieved successfully", 200, lookups);
  }

  public async getProjectById(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const project = await this.projectsService.getProjectById(projectId, actor);
    return this.sendResponse(req, res, "Project details retrieved successfully", 200, project);
  }

  public async createProject(req: Request, res: Response) {
    const actor = getActor(req);
    const dto = req.validatedBody as CreateProjectDTO;
    const project = await this.projectsService.createProject(dto, actor);
    return this.sendCreatedResponse(req, res, project, "Project created successfully");
  }

  public async updateProject(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const dto = req.validatedBody as UpdateProjectDTO;
    const updated = await this.projectsService.updateProject(projectId, dto, actor);
    return this.sendResponse(req, res, "Project updated successfully", 200, updated);
  }

  public async deleteProject(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const result = await this.projectsService.deleteProject(projectId, actor);
    return this.sendResponse(req, res, "Project deleted successfully", 200, result);
  }

  public async reassignTeams(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const { teamIds } = req.body as { teamIds: string[] };
    const updated = await this.projectsService.reassignTeams(projectId, teamIds || [], actor);
    return this.sendResponse(req, res, "Project teams updated successfully", 200, updated);
  }

  public async manageMembers(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const { members } = req.body as { members: { userId: string; roleId: string; note?: string | null }[] };
    const updated = await this.projectsService.manageMembers(projectId, members || [], actor);
    return this.sendResponse(req, res, "Project members updated successfully", 200, updated);
  }

  public async addComponent(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const dto = req.validatedBody as CreateProjectComponentDTO;
    const updated = await this.projectsService.addComponent(projectId, dto, actor);
    return this.sendCreatedResponse(req, res, updated, "Component added successfully");
  }

  public async updateComponent(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const componentId = req.params.componentId as string;
    const dto = req.validatedBody as UpdateProjectComponentDTO;
    const updated = await this.projectsService.updateComponent(projectId, componentId, dto, actor);
    return this.sendResponse(req, res, "Component updated successfully", 200, updated);
  }

  public async deleteComponent(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const componentId = req.params.componentId as string;
    const updated = await this.projectsService.deleteComponent(projectId, componentId, actor);
    return this.sendResponse(req, res, "Component deleted successfully", 200, updated);
  }

  // Lookup Handlers
  public async getClients(req: Request, res: Response) {
    const actor = getActor(req);
    const result = await this.projectsService.getClients(req.query as any, actor);
    return this.sendResponse(req, res, "Clients retrieved successfully", 200, result);
  }

  public async createClient(req: Request, res: Response) {
    const actor = getActor(req);
    const dto = req.validatedBody;
    const created = await this.projectsService.createClient(dto, actor);
    return this.sendCreatedResponse(req, res, created, "Client created successfully");
  }

  public async createProfile(req: Request, res: Response) {
    const actor = getActor(req);
    const dto = req.validatedBody;
    const created = await this.projectsService.createProfile(dto, actor);
    return this.sendCreatedResponse(req, res, created, "Profile created successfully");
  }

  public async createPlatform(req: Request, res: Response) {
    const actor = getActor(req);
    const dto = req.validatedBody;
    const created = await this.projectsService.createPlatform(dto, actor);
    return this.sendCreatedResponse(req, res, created, "Platform created successfully");
  }

  public async createServiceLine(req: Request, res: Response) {
    const actor = getActor(req);
    const dto = req.validatedBody;
    const created = await this.projectsService.createServiceLine(dto, actor);
    return this.sendCreatedResponse(req, res, created, "Service Line created successfully");
  }

  public async createStatus(req: Request, res: Response) {
    const actor = getActor(req);
    const dto = req.validatedBody;
    const created = await this.projectsService.createStatus(dto, actor);
    return this.sendCreatedResponse(req, res, created, "Project Status created successfully");
  }

  public async createOrderSource(req: Request, res: Response) {
    const actor = getActor(req);
    const dto = req.validatedBody;
    const created = await this.projectsService.createOrderSource(dto, actor);
    return this.sendCreatedResponse(req, res, created, "Order Source created successfully");
  }
}
