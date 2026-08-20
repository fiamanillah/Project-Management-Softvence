// src/Modules/Projects/projects.service.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type {
  CreateProjectDTO,
  UpdateProjectDTO,
  AssignProjectTeamDTO,
  AssignProjectMemberDTO,
  CreateProjectComponentDTO,
  UpdateProjectComponentDTO,
  CreateQuickClientDTO,
  CreateQuickProfileDTO,
  CreateQuickPlatformDTO,
  CreateQuickServiceLineDTO,
  CreateQuickStatusDTO,
  CreateQuickOrderSourceDTO,
  CreateProjectMessageDTO,
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
  ProjectItem,
  ProjectDetailItem,
  ProjectCapabilities,
  ProjectStats,
  ProjectLookups,
  ProjectWorkspaceItem,
  ProjectMessageItem,
  MessageTypeItem,
  ProjectMilestoneItem,
  ProjectLinkItem,
  ApprovalWorkflowItem,
} from "./ProjectDTO";
import {
  ProjectsQueryService,
  type GetProjectsQuery,
} from "./services/projects.query.service";
import { ProjectsMutationService } from "./services/projects.mutation.service";
import { ProjectsAssignmentService } from "./services/projects.assignment.service";
import { ProjectsComponentService } from "./services/projects.component.service";
import { ProjectsLookupService } from "./services/projects.lookup.service";
import { ProjectChatService } from "./services/ProjectChatService";
import { ProjectApprovalService } from "./services/ProjectApprovalService";
import { ProjectMessageTypeService } from "./services/ProjectMessageTypeService";
import { ProjectCollateralService } from "./services/ProjectCollateralService";
import { ProjectsWorkspaceService } from "./services/projects.workspace.service";
import {
  getProjectResourceContext,
  generateProjectCode,
  validateHierarchyNoCycles,
  computeProjectCapabilities,
  sanitizeAndDecorateProject,
  sanitizeAndDecorateWorkspaceProject,
  sanitizeAndDecorateMessage,
} from "./services/projects.capability.helper";

export type { GetProjectsQuery };
export {
  ProjectsQueryService,
  ProjectsMutationService,
  ProjectsAssignmentService,
  ProjectsComponentService,
  ProjectsLookupService,
  ProjectChatService,
  ProjectApprovalService,
  ProjectMessageTypeService,
  ProjectCollateralService,
  ProjectsWorkspaceService,
  getProjectResourceContext,
  generateProjectCode,
  validateHierarchyNoCycles,
  computeProjectCapabilities,
  sanitizeAndDecorateProject,
  sanitizeAndDecorateWorkspaceProject,
  sanitizeAndDecorateMessage,
};

/**
 * ProjectsService Facade Orchestrator
 * Composes specialized query, mutation, assignment, component, lookup, chat, approval, and workspace sub-services.
 */
export class ProjectsService {
  private logger = new AppLogger("ProjectsService");

  public readonly query: ProjectsQueryService;
  public readonly mutation: ProjectsMutationService;
  public readonly assignment: ProjectsAssignmentService;
  public readonly component: ProjectsComponentService;
  public readonly lookup: ProjectsLookupService;
  public readonly chat: ProjectChatService;
  public readonly approval: ProjectApprovalService;
  public readonly messageType: ProjectMessageTypeService;
  public readonly collateral: ProjectCollateralService;
  public readonly workspace: ProjectsWorkspaceService;

  constructor(private readonly prisma: PrismaClient) {
    this.query = new ProjectsQueryService(prisma);
    this.mutation = new ProjectsMutationService(prisma, this.query);
    this.assignment = new ProjectsAssignmentService(prisma, this.query);
    this.component = new ProjectsComponentService(prisma, this.query);
    this.lookup = new ProjectsLookupService(prisma);
    this.chat = new ProjectChatService(prisma);
    this.approval = new ProjectApprovalService(prisma);
    this.messageType = new ProjectMessageTypeService(prisma);
    this.collateral = new ProjectCollateralService(prisma);
    this.workspace = new ProjectsWorkspaceService(prisma);
  }

  // --- Capability & Helpers ---
  public async generateProjectCode(): Promise<string> {
    return generateProjectCode(this.prisma);
  }

  public async sanitizeAndDecorateProject(
    project: any,
    actor: AuthenticatedUser,
  ): Promise<ProjectItem> {
    return sanitizeAndDecorateProject(project, actor);
  }

  // --- Workspace Command Center ---
  public async getWorkspaceProjects(
    query: { search?: string; statusId?: string; priorityId?: string },
    actor: AuthenticatedUser,
  ): Promise<ProjectWorkspaceItem[]> {
    return this.workspace.getWorkspaceProjects(query, actor);
  }

  // --- Query & Reporting ---
  public async getProjects(query: GetProjectsQuery, actor: AuthenticatedUser) {
    return this.query.getProjects(query, actor);
  }

  public async getProjectById(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<ProjectDetailItem> {
    return this.query.getProjectById(id, actor);
  }

  public async getProjectStats(actor: AuthenticatedUser): Promise<ProjectStats> {
    return this.query.getProjectStats(actor);
  }

  // --- Project CRUD Mutations ---
  public async createProject(
    dto: CreateProjectDTO,
    actor: AuthenticatedUser,
  ): Promise<ProjectDetailItem | ProjectItem> {
    return this.mutation.createProject(dto, actor);
  }

  public async updateProject(
    id: string,
    dto: UpdateProjectDTO,
    actor: AuthenticatedUser,
  ): Promise<ProjectDetailItem | ProjectItem> {
    return this.mutation.updateProject(id, dto, actor);
  }

  public async deleteProject(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<{ id: string; success: boolean }> {
    return this.mutation.deleteProject(id, actor);
  }

  // --- Roster & Assignments ---
  public async reassignTeams(
    id: string,
    teamIds: string[],
    actor: AuthenticatedUser,
  ): Promise<ProjectDetailItem> {
    return this.assignment.reassignTeams(id, teamIds, actor);
  }

  public async manageMembers(
    id: string,
    members: { userId: string; roleId: string; note?: string | null }[],
    actor: AuthenticatedUser,
  ): Promise<ProjectDetailItem> {
    return this.assignment.manageMembers(id, members, actor);
  }

  // --- Components / Sub-deliverables ---
  public async addComponent(
    projectId: string,
    dto: CreateProjectComponentDTO,
    actor: AuthenticatedUser,
  ): Promise<ProjectDetailItem> {
    return this.component.addComponent(projectId, dto, actor);
  }

  public async updateComponent(
    projectId: string,
    componentId: string,
    dto: UpdateProjectComponentDTO,
    actor: AuthenticatedUser,
  ): Promise<ProjectDetailItem> {
    return this.component.updateComponent(projectId, componentId, dto, actor);
  }

  public async deleteComponent(
    projectId: string,
    componentId: string,
    actor: AuthenticatedUser,
  ): Promise<ProjectDetailItem> {
    return this.component.deleteComponent(projectId, componentId, actor);
  }

  // --- Real-time Chat & Messages ---
  public async getProjectMessages(
    projectId: string,
    query: { limit?: number; cursor?: string; search?: string; purpose?: string },
    actor: AuthenticatedUser,
  ): Promise<{ messages: ProjectMessageItem[]; nextCursor?: string }> {
    return this.chat.getProjectMessages(projectId, query, actor);
  }

  public async sendMessage(
    projectId: string,
    dto: CreateProjectMessageDTO,
    actor: AuthenticatedUser,
  ): Promise<ProjectMessageItem> {
    return this.chat.sendMessage(projectId, dto, actor);
  }

  public async toggleReaction(
    projectId: string,
    messageId: string,
    dto: ToggleReactionDTO,
    actor: AuthenticatedUser,
  ) {
    return this.chat.toggleReaction(projectId, messageId, dto, actor);
  }

  public async markMessagesSeen(
    projectId: string,
    dto: MarkMessagesSeenDTO,
    actor: AuthenticatedUser,
  ) {
    return this.chat.markMessagesSeen(projectId, dto, actor);
  }

  public async togglePinMessage(
    projectId: string,
    messageId: string,
    actor: AuthenticatedUser,
  ): Promise<ProjectMessageItem> {
    return this.chat.togglePinMessage(projectId, messageId, actor);
  }

  // --- Approval Workflows ---
  public async leadApprove(
    projectId: string,
    messageId: string,
    dto: LeadApproveDTO,
    actor: AuthenticatedUser,
  ): Promise<ApprovalWorkflowItem> {
    return this.approval.leadApprove(projectId, messageId, dto, actor);
  }

  public async salesDispatch(
    projectId: string,
    messageId: string,
    dto: SalesDispatchDTO,
    actor: AuthenticatedUser,
  ): Promise<ApprovalWorkflowItem> {
    return this.approval.salesDispatch(projectId, messageId, dto, actor);
  }

  public async requestRevision(
    projectId: string,
    messageId: string,
    dto: RequestRevisionDTO,
    actor: AuthenticatedUser,
  ): Promise<ApprovalWorkflowItem> {
    return this.approval.requestRevision(projectId, messageId, dto, actor);
  }

  // --- Dynamic Message Types ---
  public async getMessageTypes(direction?: string, actor?: AuthenticatedUser): Promise<MessageTypeItem[]> {
    return this.messageType.getMessageTypes(direction, actor);
  }

  public async createMessageType(dto: CreateMessageTypeDTO, actor: AuthenticatedUser): Promise<MessageTypeItem> {
    return this.messageType.createMessageType(dto, actor);
  }

  public async updateMessageType(id: string, dto: UpdateMessageTypeDTO, actor: AuthenticatedUser): Promise<MessageTypeItem> {
    return this.messageType.updateMessageType(id, dto, actor);
  }

  public async deleteMessageType(id: string, actor: AuthenticatedUser) {
    return this.messageType.deleteMessageType(id, actor);
  }

  // --- Milestones & Collateral Links ---
  public async getMilestones(projectId: string, actor: AuthenticatedUser): Promise<ProjectMilestoneItem[]> {
    return this.collateral.getMilestones(projectId, actor);
  }

  public async createMilestone(projectId: string, dto: CreateProjectMilestoneDTO, actor: AuthenticatedUser): Promise<ProjectMilestoneItem> {
    return this.collateral.createMilestone(projectId, dto, actor);
  }

  public async updateMilestone(projectId: string, milestoneId: string, dto: UpdateProjectMilestoneDTO, actor: AuthenticatedUser): Promise<ProjectMilestoneItem> {
    return this.collateral.updateMilestone(projectId, milestoneId, dto, actor);
  }

  public async getLinks(projectId: string, actor: AuthenticatedUser): Promise<ProjectLinkItem[]> {
    return this.collateral.getLinks(projectId, actor);
  }

  public async createLink(projectId: string, dto: CreateProjectLinkDTO, actor: AuthenticatedUser): Promise<ProjectLinkItem> {
    return this.collateral.createLink(projectId, dto, actor);
  }

  // --- Lookups & Dynamic Lookups Creation ---
  public async getLookups(actor: AuthenticatedUser): Promise<ProjectLookups> {
    return this.lookup.getLookups(actor);
  }

  public async getClients(
    query: { page?: number; limit?: number; search?: string; platformId?: string },
    actor: AuthenticatedUser,
  ) {
    return this.lookup.getClients(query, actor);
  }

  public async createClient(dto: CreateQuickClientDTO, actor: AuthenticatedUser) {
    return this.lookup.createClient(dto, actor);
  }

  public async createProfile(dto: CreateQuickProfileDTO, actor: AuthenticatedUser) {
    return this.lookup.createProfile(dto, actor);
  }

  public async createPlatform(dto: CreateQuickPlatformDTO, actor: AuthenticatedUser) {
    return this.lookup.createPlatform(dto, actor);
  }

  public async createServiceLine(
    dto: CreateQuickServiceLineDTO,
    actor: AuthenticatedUser,
  ) {
    return this.lookup.createServiceLine(dto, actor);
  }

  public async createStatus(dto: CreateQuickStatusDTO, actor: AuthenticatedUser) {
    return this.lookup.createStatus(dto, actor);
  }

  public async createOrderSource(
    dto: CreateQuickOrderSourceDTO,
    actor: AuthenticatedUser,
  ) {
    return this.lookup.createOrderSource(dto, actor);
  }
}
