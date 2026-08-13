// src/Modules/Organization/organization.controller.ts

import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { OrganizationService } from "./organization.service";
import type {
  CreateDepartmentDTO,
  UpdateDepartmentDTO,
  AssignDepartmentManagerDTO,
  CreateDesignationDTO,
  SavePermissionAssignmentsDTO,
} from "./OrganizationDTO";

export class OrganizationController extends BaseController {
  constructor(private readonly organizationService: OrganizationService) {
    super();
  }

  // Departments
  public async getDepartments(req: Request, res: Response) {
    const departments = await this.organizationService.getDepartments();
    return this.sendResponse(req, res, "Departments retrieved successfully", 200, departments);
  }

  public async getDepartmentById(req: Request, res: Response) {
    const id = req.params.id as string;
    const department = await this.organizationService.getDepartmentById(id);
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

  // Designations
  public async getDesignations(req: Request, res: Response) {
    const designations = await this.organizationService.getDesignations();
    return this.sendResponse(req, res, "Designations retrieved successfully", 200, designations);
  }

  public async createDesignation(req: Request, res: Response) {
    const dto = req.validatedBody as CreateDesignationDTO;
    const designation = await this.organizationService.createDesignation(dto, req.user?.sub, req);
    return this.sendCreatedResponse(req, res, designation, "Designation created successfully");
  }

  public async getDesignationPermissions(req: Request, res: Response) {
    const designationId = req.params.id as string;
    const data = await this.organizationService.getDesignationPermissions(designationId);
    return this.sendResponse(req, res, "Designation permissions retrieved successfully", 200, data);
  }

  public async saveDesignationPermissions(req: Request, res: Response) {
    const designationId = req.params.id as string;
    const dto = req.validatedBody as SavePermissionAssignmentsDTO;
    const result = await this.organizationService.saveDesignationPermissions(
      designationId,
      dto,
      req.user?.sub,
      req,
    );
    return this.sendResponse(req, res, result.message, 200);
  }
}
