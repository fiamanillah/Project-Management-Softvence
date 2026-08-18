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
  ProjectItem,
  ProjectDetailItem,
  ProjectCapabilities,
  ProjectStats,
  ProjectLookups,
} from "./ProjectDTO";
import {
  ProjectsQueryService,
  type GetProjectsQuery,
} from "./services/projects.query.service";
import { ProjectsMutationService } from "./services/projects.mutation.service";
import { ProjectsAssignmentService } from "./services/projects.assignment.service";
import { ProjectsComponentService } from "./services/projects.component.service";
import { ProjectsLookupService } from "./services/projects.lookup.service";
import {
  getProjectResourceContext,
  generateProjectCode,
  validateHierarchyNoCycles,
  computeProjectCapabilities,
  sanitizeAndDecorateProject,
} from "./services/projects.capability.helper";

export type { GetProjectsQuery };
export {
  ProjectsQueryService,
  ProjectsMutationService,
  ProjectsAssignmentService,
  ProjectsComponentService,
  ProjectsLookupService,
  getProjectResourceContext,
  generateProjectCode,
  validateHierarchyNoCycles,
  computeProjectCapabilities,
  sanitizeAndDecorateProject,
};

/**
 * ProjectsService Facade Orchestrator
 * Composes specialized query, mutation, assignment, component, and lookup sub-services.
 */
export class ProjectsService {
  private logger = new AppLogger("ProjectsService");

  public readonly query: ProjectsQueryService;
  public readonly mutation: ProjectsMutationService;
  public readonly assignment: ProjectsAssignmentService;
  public readonly component: ProjectsComponentService;
  public readonly lookup: ProjectsLookupService;

  constructor(private readonly prisma: PrismaClient) {
    this.query = new ProjectsQueryService(prisma);
    this.mutation = new ProjectsMutationService(prisma, this.query);
    this.assignment = new ProjectsAssignmentService(prisma, this.query);
    this.component = new ProjectsComponentService(prisma, this.query);
    this.lookup = new ProjectsLookupService(prisma);
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
