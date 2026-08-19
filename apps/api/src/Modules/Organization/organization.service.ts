// src/Modules/Organization/organization.service.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type { Request } from "express";
import type {
  CreateBranchDTO,
  UpdateBranchDTO,
  AssignBranchManagerDTO,
  CreateDepartmentDTO,
  UpdateDepartmentDTO,
  AssignDepartmentManagerDTO,
  CreateRoleDTO,
  UpdateRoleDTO,
  SaveRolePermissionsDTO,
  CreateDesignationDTO,
  UpdateDesignationDTO,
  OrganizationStructureResponse,
} from "./OrganizationDTO";

import { OrganizationBranchService } from "./services/organization.branch.service";
import { OrganizationDepartmentService } from "./services/organization.department.service";
import { OrganizationRoleService } from "./services/organization.role.service";
import { OrganizationDesignationService } from "./services/organization.designation.service";
import { OrganizationStructureService } from "./services/organization.structure.service";

export {
  OrganizationBranchService,
  OrganizationDepartmentService,
  OrganizationRoleService,
  OrganizationDesignationService,
  OrganizationStructureService,
};

/**
 * OrganizationService Facade Orchestrator
 * Composes specialized branch, department, role, designation, and structure sub-services.
 */
export class OrganizationService {
  private logger = new AppLogger("OrganizationService");

  public readonly branches: OrganizationBranchService;
  public readonly departments: OrganizationDepartmentService;
  public readonly roles: OrganizationRoleService;
  public readonly designations: OrganizationDesignationService;
  public readonly structure: OrganizationStructureService;

  constructor(private readonly prisma: PrismaClient) {
    this.branches = new OrganizationBranchService(prisma);
    this.departments = new OrganizationDepartmentService(prisma);
    this.roles = new OrganizationRoleService(prisma);
    this.designations = new OrganizationDesignationService(prisma);
    this.structure = new OrganizationStructureService(prisma);
  }

  // ==========================================
  // BRANCHES MANAGEMENT
  // ==========================================

  public async getBranchDescendantIds(branchId: string): Promise<string[]> {
    return this.branches.getBranchDescendantIds(branchId);
  }

  public async isBranchDescendant(ancestorId: string, candidateDescendantId: string): Promise<boolean> {
    return this.branches.isBranchDescendant(ancestorId, candidateDescendantId);
  }

  public async getBranches(
    actor?: AuthenticatedUser,
    query?: { search?: string; status?: string },
  ): Promise<any[]>;
  public async getBranches(
    actor?: AuthenticatedUser,
    query?: {
      search?: string;
      status?: string;
      page?: number | string;
      limit?: number | string;
    },
  ): Promise<any>;
  public async getBranches(
    actor?: AuthenticatedUser,
    query?: {
      search?: string;
      status?: string;
      page?: number | string;
      limit?: number | string;
    },
  ): Promise<any> {
    return this.branches.getBranches(actor, query);
  }

  public async getBranchById(id: string, actor?: AuthenticatedUser) {
    return this.branches.getBranchById(id, actor);
  }

  public async createBranch(data: CreateBranchDTO, req?: Request) {
    return this.branches.createBranch(data, req);
  }

  public async updateBranch(id: string, data: UpdateBranchDTO, req?: Request) {
    return this.branches.updateBranch(id, data, req);
  }

  public async deleteBranch(id: string, req?: Request) {
    return this.branches.deleteBranch(id, req);
  }

  public async assignBranchManager(branchId: string, dto: AssignBranchManagerDTO, req?: Request) {
    return this.branches.assignBranchManager(branchId, dto, req);
  }

  public async removeBranchManager(branchId: string, managerId: string, req?: Request) {
    return this.branches.removeBranchManager(branchId, managerId, req);
  }

  // ==========================================
  // DEPARTMENTS MANAGEMENT
  // ==========================================

  public async getDepartmentDescendantIds(departmentId: string): Promise<string[]> {
    return this.departments.getDepartmentDescendantIds(departmentId);
  }

  public async isDescendant(ancestorId: string, candidateDescendantId: string): Promise<boolean> {
    return this.departments.isDescendant(ancestorId, candidateDescendantId);
  }

  public async getDepartments(
    actor?: AuthenticatedUser,
    query?: { branchId?: string; status?: string; search?: string },
  ): Promise<any[]>;
  public async getDepartments(
    actor?: AuthenticatedUser,
    query?: {
      branchId?: string;
      status?: string;
      search?: string;
      page?: number | string;
      limit?: number | string;
    },
  ): Promise<any>;
  public async getDepartments(
    actor?: AuthenticatedUser,
    query?: {
      branchId?: string;
      status?: string;
      search?: string;
      page?: number | string;
      limit?: number | string;
    },
  ): Promise<any> {
    return this.departments.getDepartments(actor, query);
  }

  public async getDepartmentById(id: string, actor?: AuthenticatedUser) {
    return this.departments.getDepartmentById(id, actor);
  }

  public async createDepartment(data: CreateDepartmentDTO, req?: Request) {
    return this.departments.createDepartment(data, req);
  }

  public async updateDepartment(id: string, data: UpdateDepartmentDTO, req?: Request) {
    return this.departments.updateDepartment(id, data, req);
  }

  public async deleteDepartment(id: string, req?: Request) {
    return this.departments.deleteDepartment(id, req);
  }

  public async assignDepartmentManager(departmentId: string, dto: AssignDepartmentManagerDTO, req?: Request) {
    return this.departments.assignDepartmentManager(departmentId, dto, req);
  }

  public async removeDepartmentManager(departmentId: string, managerId: string, req?: Request) {
    return this.departments.removeDepartmentManager(departmentId, managerId, req);
  }

  // ==========================================
  // ROLES & PERMISSION MATRIX
  // ==========================================

  public async getRoles(actor?: AuthenticatedUser) {
    return this.roles.getRoles(actor);
  }

  public async getRoleById(roleId: string, actor?: AuthenticatedUser) {
    return this.roles.getRoleById(roleId, actor);
  }

  public async createRole(data: CreateRoleDTO, grantedByUserId?: string, req?: Request) {
    return this.roles.createRole(data, grantedByUserId, req);
  }

  public async updateRole(
    roleId: string,
    data: UpdateRoleDTO,
    grantedByUserId?: string,
    req?: Request,
  ) {
    return this.roles.updateRole(roleId, data, grantedByUserId, req);
  }

  public async deleteRole(roleId: string, req?: Request) {
    return this.roles.deleteRole(roleId, req);
  }

  public async getRolePermissions(roleId: string) {
    return this.roles.getRolePermissions(roleId);
  }

  public async saveRolePermissions(
    roleId: string,
    dto: SaveRolePermissionsDTO,
    grantedByUserId?: string,
    req?: Request,
  ) {
    return this.roles.saveRolePermissions(roleId, dto, grantedByUserId, req);
  }

  // ==========================================
  // DESIGNATIONS
  // ==========================================

  public async getDesignations(actor?: AuthenticatedUser) {
    return this.designations.getDesignations(actor);
  }

  public async getDesignationById(id: string, actor?: AuthenticatedUser) {
    return this.designations.getDesignationById(id, actor);
  }

  public async createDesignation(data: CreateDesignationDTO, req?: Request) {
    return this.designations.createDesignation(data, req);
  }

  public async updateDesignation(
    designationId: string,
    data: UpdateDesignationDTO,
    req?: Request,
  ) {
    return this.designations.updateDesignation(designationId, data, req);
  }

  public async deleteDesignation(designationId: string, req?: Request) {
    return this.designations.deleteDesignation(designationId, req);
  }

  // ==========================================
  // UNIFIED ENTERPRISE ORGANIZATION STRUCTURE
  // ==========================================

  public async getOrganizationStructure(actor?: AuthenticatedUser): Promise<OrganizationStructureResponse> {
    return this.structure.getOrganizationStructure(actor);
  }
}
