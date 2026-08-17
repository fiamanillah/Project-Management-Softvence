// src/Modules/Organization/organization.controller.ts

import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { OrganizationService } from "./organization.service";
import type {
  CreateDepartmentDTO,
  UpdateDepartmentDTO,
  AssignDepartmentManagerDTO,
  CreateRoleDTO,
  UpdateRoleDTO,
  SaveRolePermissionsDTO,
  CreateDesignationDTO,
  UpdateDesignationDTO,
} from "./OrganizationDTO";

export class OrganizationController extends BaseController {
  constructor(private readonly organizationService: OrganizationService) {
    super();
  }

  // Departments
  public async getDepartments(req: Request, res: Response) {
    const actor = req.user
      ? {
          id: req.user.sub,
          systemRole: req.user.systemRole,
          roleId: req.user.roleId,
          designationId: req.user.designationId,
          email: (req.user as any).email,
        }
      : undefined;
    const departments = await this.organizationService.getDepartments(actor);
    return this.sendResponse(req, res, "Departments retrieved successfully", 200, departments);
  }

  public async getDepartmentById(req: Request, res: Response) {
    const id = req.params.id as string;
    const actor = req.user
      ? {
          id: req.user.sub,
          systemRole: req.user.systemRole,
          roleId: req.user.roleId,
          designationId: req.user.designationId,
          email: (req.user as any).email,
        }
      : undefined;
    const department = await this.organizationService.getDepartmentById(id, actor);
    return this.sendResponse(req, res, "Department retrieved successfully", 200, department);
  }

  public async createDepartment(req: Request, res: Response) {
    const dto = req.validatedBody as CreateDepartmentDTO;
    const department = await this.organizationService.createDepartment(dto, req);
    return this.sendCreatedResponse(req, res, department, "Department created successfully");
  }

  public async updateDepartment(req: Request, res: Response) {
    const id = req.params.id as string;
    const dto = req.validatedBody as UpdateDepartmentDTO;
    const updated = await this.organizationService.updateDepartment(id, dto, req);
    return this.sendResponse(req, res, "Department updated successfully", 200, updated);
  }

  public async deleteDepartment(req: Request, res: Response) {
    const id = req.params.id as string;
    const result = await this.organizationService.deleteDepartment(id, req);
    return this.sendResponse(req, res, result.message, 200);
  }

  public async assignDepartmentManager(req: Request, res: Response) {
    const departmentId = req.params.id as string;
    const dto = req.validatedBody as AssignDepartmentManagerDTO;
    const manager = await this.organizationService.assignDepartmentManager(departmentId, dto, req);
    return this.sendCreatedResponse(req, res, manager, "Department manager assigned successfully");
  }

  public async removeDepartmentManager(req: Request, res: Response) {
    const departmentId = req.params.id as string;
    const managerId = req.params.managerId as string;
    const result = await this.organizationService.removeDepartmentManager(departmentId, managerId, req);
    return this.sendResponse(req, res, result.message, 200);
  }

  // Roles & Permission Matrix (Authorization)
  public async getRoles(req: Request, res: Response) {
    const actor = req.user
      ? {
          id: req.user.sub,
          systemRole: req.user.systemRole,
          roleId: req.user.roleId,
          designationId: req.user.designationId,
          email: (req.user as any).email,
        }
      : undefined;
    const roles = await this.organizationService.getRoles(actor);
    return this.sendResponse(req, res, "Roles retrieved successfully", 200, roles);
  }

  public async getRoleById(req: Request, res: Response) {
    const id = req.params.id as string;
    const actor = req.user
      ? {
          id: req.user.sub,
          systemRole: req.user.systemRole,
          roleId: req.user.roleId,
          designationId: req.user.designationId,
          email: (req.user as any).email,
        }
      : undefined;
    const role = await this.organizationService.getRoleById(id, actor);
    return this.sendResponse(req, res, "Role retrieved successfully", 200, role);
  }

  public async createRole(req: Request, res: Response) {
    const dto = req.validatedBody as CreateRoleDTO;
    const role = await this.organizationService.createRole(dto, req.user?.sub, req);
    return this.sendCreatedResponse(req, res, role, "Role created successfully");
  }

  public async updateRole(req: Request, res: Response) {
    const roleId = req.params.id as string;
    const dto = req.validatedBody as UpdateRoleDTO;
    const role = await this.organizationService.updateRole(
      roleId,
      dto,
      req.user?.sub,
      req,
    );
    return this.sendResponse(req, res, "Role updated successfully", 200, role);
  }

  public async deleteRole(req: Request, res: Response) {
    const roleId = req.params.id as string;
    const result = await this.organizationService.deleteRole(roleId, req);
    return this.sendResponse(req, res, result.message, 200);
  }

  public async getRolePermissions(req: Request, res: Response) {
    const roleId = req.params.id as string;
    const data = await this.organizationService.getRolePermissions(roleId);
    return this.sendResponse(req, res, "Role permissions retrieved successfully", 200, data);
  }

  public async saveRolePermissions(req: Request, res: Response) {
    const roleId = req.params.id as string;
    const dto = req.validatedBody as SaveRolePermissionsDTO;
    const result = await this.organizationService.saveRolePermissions(
      roleId,
      dto,
      req.user?.sub,
      req,
    );
    return this.sendResponse(req, res, result.message, 200);
  }

  // Designations (Pure HR Job Titles)
  public async getDesignations(req: Request, res: Response) {
    const actor = req.user
      ? {
          id: req.user.sub,
          systemRole: req.user.systemRole,
          roleId: req.user.roleId,
          designationId: req.user.designationId,
          email: (req.user as any).email,
        }
      : undefined;
    const designations = await this.organizationService.getDesignations(actor);
    return this.sendResponse(req, res, "Designations retrieved successfully", 200, designations);
  }

  public async getDesignationById(req: Request, res: Response) {
    const id = req.params.id as string;
    const actor = req.user
      ? {
          id: req.user.sub,
          systemRole: req.user.systemRole,
          roleId: req.user.roleId,
          designationId: req.user.designationId,
          email: (req.user as any).email,
        }
      : undefined;
    const designation = await this.organizationService.getDesignationById(id, actor);
    return this.sendResponse(req, res, "Designation retrieved successfully", 200, designation);
  }

  public async createDesignation(req: Request, res: Response) {
    const dto = req.validatedBody as CreateDesignationDTO;
    const designation = await this.organizationService.createDesignation(dto, req);
    return this.sendCreatedResponse(req, res, designation, "Designation created successfully");
  }

  public async updateDesignation(req: Request, res: Response) {
    const designationId = req.params.id as string;
    const dto = req.validatedBody as UpdateDesignationDTO;
    const designation = await this.organizationService.updateDesignation(
      designationId,
      dto,
      req,
    );
    return this.sendResponse(req, res, "Designation updated successfully", 200, designation);
  }

  public async deleteDesignation(req: Request, res: Response) {
    const designationId = req.params.id as string;
    const result = await this.organizationService.deleteDesignation(designationId, req);
    return this.sendResponse(req, res, result.message, 200);
  }
}
