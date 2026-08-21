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
  CreateProjectMessageDTO,
  EditProjectMessageDTO,
  ToggleReactionDTO,
  MarkMessagesSeenDTO,
  LeadApproveDTO,
  SalesDispatchDTO,
  RequestRevisionDTO,
  CreateMessageTypeDTO,
  UpdateMessageTypeDTO,
  CreateProjectMilestoneDTO,
  UpdateProjectMilestoneDTO,
  CreateProjectLinkDTO,
} from "./ProjectDTO";

function getActor(req: Request): AuthenticatedUser {
  return {
    id: req.user?.sub || "",
    email: (req.user as any)?.email || "",
    systemRole: req.user?.systemRole || "Staff",
    roleId: (req.user as any)?.roleId || "",
    branchId: (req.user as any)?.branchId || null,
    designationId: req.user?.designationId,
    ipAddress: req.ip || (req.headers["x-forwarded-for"] as string),
    userAgent: req.headers["user-agent"],
  };
}

export class ProjectsController extends BaseController {
  constructor(private readonly projectsService: ProjectsService) {
    super();
  }

  // --- Workspace Command Center ---
  public async getWorkspaceProjects(req: Request, res: Response) {
    const actor = getActor(req);
    const result = await this.projectsService.getWorkspaceProjects(req.query as any, actor);
    if (result && typeof result === "object" && "items" in result && "pagination" in result) {
      return this.sendPaginatedResponse(
        req,
        res,
        (result as any).pagination,
        "Workspace projects retrieved successfully",
        (result as any).items,
      );
    }
    return this.sendResponse(req, res, "Workspace projects retrieved successfully", 200, result);
  }

  // --- Real-time Chat & Messages ---
  public async getProjectMessages(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const result = await this.projectsService.getProjectMessages(projectId, req.query as any, actor);
    return this.sendResponse(req, res, "Project messages retrieved successfully", 200, result);
  }

  public async sendMessage(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const dto = req.validatedBody as CreateProjectMessageDTO;
    const message = await this.projectsService.sendMessage(projectId, dto, actor);
    return this.sendCreatedResponse(req, res, message, "Message sent successfully");
  }

  public async toggleReaction(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const messageId = req.params.messageId as string;
    const dto = req.validatedBody as ToggleReactionDTO;
    const result = await this.projectsService.toggleReaction(projectId, messageId, dto, actor);
    return this.sendResponse(req, res, "Reaction updated successfully", 200, result);
  }

  public async markMessagesSeen(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const dto = req.validatedBody as MarkMessagesSeenDTO;
    const result = await this.projectsService.markMessagesSeen(projectId, dto, actor);
    return this.sendResponse(req, res, "Read receipts recorded successfully", 200, result);
  }

  public async togglePinMessage(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const messageId = req.params.messageId as string;
    const updated = await this.projectsService.togglePinMessage(projectId, messageId, actor);
    return this.sendResponse(req, res, "Message pin status updated", 200, updated);
  }

  public async editMessage(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const messageId = req.params.messageId as string;
    const dto = req.validatedBody as EditProjectMessageDTO;
    const message = await this.projectsService.editMessage(projectId, messageId, dto, actor);
    return this.sendResponse(req, res, "Message updated successfully", 200, message);
  }

  public async getMessageRevisions(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const messageId = req.params.messageId as string;
    const revisions = await this.projectsService.getMessageRevisions(projectId, messageId, actor);
    return this.sendResponse(req, res, "Message revision history retrieved successfully", 200, revisions);
  }

  // --- Approval State Machine ---
  public async leadApprove(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const messageId = req.params.messageId as string;
    const dto = req.validatedBody as LeadApproveDTO;
    const workflow = await this.projectsService.leadApprove(projectId, messageId, dto, actor);
    return this.sendResponse(req, res, "Message approved internally by Tech Lead", 200, workflow);
  }

  public async salesDispatch(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const messageId = req.params.messageId as string;
    const dto = req.validatedBody as SalesDispatchDTO;
    const workflow = await this.projectsService.salesDispatch(projectId, messageId, dto, actor);
    return this.sendResponse(req, res, "Message confirmed dispatched to client", 200, workflow);
  }

  public async requestRevision(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const messageId = req.params.messageId as string;
    const dto = req.validatedBody as RequestRevisionDTO;
    const workflow = await this.projectsService.requestRevision(projectId, messageId, dto, actor);
    return this.sendResponse(req, res, "Revision requested from message author", 200, workflow);
  }

  // --- Dynamic Message Types ---
  public async getMessageTypes(req: Request, res: Response) {
    const actor = getActor(req);
    const direction = req.query.direction as string | undefined;
    const types = await this.projectsService.getMessageTypes(direction, actor);
    return this.sendResponse(req, res, "Message types retrieved successfully", 200, types);
  }

  public async createMessageType(req: Request, res: Response) {
    const actor = getActor(req);
    const dto = req.validatedBody as CreateMessageTypeDTO;
    const created = await this.projectsService.createMessageType(dto, actor);
    return this.sendCreatedResponse(req, res, created, "Message type created successfully");
  }

  public async updateMessageType(req: Request, res: Response) {
    const actor = getActor(req);
    const id = req.params.id as string;
    const dto = req.validatedBody as UpdateMessageTypeDTO;
    const updated = await this.projectsService.updateMessageType(id, dto, actor);
    return this.sendResponse(req, res, "Message type updated successfully", 200, updated);
  }

  public async deleteMessageType(req: Request, res: Response) {
    const actor = getActor(req);
    const id = req.params.id as string;
    const result = await this.projectsService.deleteMessageType(id, actor);
    return this.sendResponse(req, res, "Message type deactivated successfully", 200, result);
  }

  // --- Milestones ---
  public async getMilestones(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const milestones = await this.projectsService.getMilestones(projectId, actor);
    return this.sendResponse(req, res, "Project milestones retrieved successfully", 200, milestones);
  }

  public async createMilestone(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const dto = req.validatedBody as CreateProjectMilestoneDTO;
    const created = await this.projectsService.createMilestone(projectId, dto, actor);
    return this.sendCreatedResponse(req, res, created, "Milestone created successfully");
  }

  public async updateMilestone(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const milestoneId = req.params.milestoneId as string;
    const dto = req.validatedBody as UpdateProjectMilestoneDTO;
    const updated = await this.projectsService.updateMilestone(projectId, milestoneId, dto, actor);
    return this.sendResponse(req, res, "Milestone updated successfully", 200, updated);
  }

  // --- Collateral Links ---
  public async getLinks(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const links = await this.projectsService.getLinks(projectId, actor);
    return this.sendResponse(req, res, "Project links retrieved successfully", 200, links);
  }

  public async createLink(req: Request, res: Response) {
    const actor = getActor(req);
    const projectId = req.params.id as string;
    const dto = req.validatedBody as CreateProjectLinkDTO;
    const created = await this.projectsService.createLink(projectId, dto, actor);
    return this.sendCreatedResponse(req, res, created, "Link added successfully");
  }

  // --- Project CRUD ---
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

  public async getClients(req: Request, res: Response) {
    const actor = getActor(req);
    const result = await this.projectsService.getClients(req.query as any, actor);
    return this.sendResponse(req, res, "Clients retrieved successfully", 200, result);
  }

  public async createClient(req: Request, res: Response) {
    const actor = getActor(req);
    const result = await this.projectsService.createClient(req.body, actor);
    return this.sendCreatedResponse(req, res, result, "Client created successfully");
  }

  public async createProfile(req: Request, res: Response) {
    const actor = getActor(req);
    const result = await this.projectsService.createProfile(req.body, actor);
    return this.sendCreatedResponse(req, res, result, "Profile created successfully");
  }

  public async createPlatform(req: Request, res: Response) {
    const actor = getActor(req);
    const result = await this.projectsService.createPlatform(req.body, actor);
    return this.sendCreatedResponse(req, res, result, "Platform created successfully");
  }

  public async createServiceLine(req: Request, res: Response) {
    const actor = getActor(req);
    const result = await this.projectsService.createServiceLine(req.body, actor);
    return this.sendCreatedResponse(req, res, result, "Service line created successfully");
  }

  public async createStatus(req: Request, res: Response) {
    const actor = getActor(req);
    const result = await this.projectsService.createStatus(req.body, actor);
    return this.sendCreatedResponse(req, res, result, "Status created successfully");
  }

  public async createOrderSource(req: Request, res: Response) {
    const actor = getActor(req);
    const result = await this.projectsService.createOrderSource(req.body, actor);
    return this.sendCreatedResponse(req, res, result, "Order source created successfully");
  }
}
