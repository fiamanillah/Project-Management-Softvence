// src/Modules/Admin/admin.controller.ts

import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { AdminService } from "./admin.service";
import {
  CreateAdminUserDTO,
  UpdateAdminUserDTO,
  CreateDesignationDTO,
  SavePermissionAssignmentsDTO,
  CreateOverrideDTO,
  CreateDelegationDTO,
} from "./AdminDTO";

export class AdminController extends BaseController {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  // Users
  public async getUsers(req: Request, res: Response) {
    const result = await this.adminService.getUsers(req.query as any);
    return this.sendResponse(req, res, "Users retrieved successfully", 200, result);
  }

  public async createUser(req: Request, res: Response) {
    const dto = req.validatedBody as CreateAdminUserDTO;
    const user = await this.adminService.createAdminUser(dto);
    return this.sendCreatedResponse(req, res, user, "Admin user created successfully");
  }

  public async updateUser(req: Request, res: Response) {
    const userId = req.params.id as string;
    const dto = req.validatedBody as UpdateAdminUserDTO;
    const updated = await this.adminService.updateAdminUser(userId, dto);
    return this.sendResponse(req, res, "User updated successfully", 200, updated);
  }

  // Designations & Permission Matrix
  public async getDesignations(req: Request, res: Response) {
    const designations = await this.adminService.getDesignations();
    return this.sendResponse(req, res, "Designations retrieved successfully", 200, designations);
  }

  public async createDesignation(req: Request, res: Response) {
    const dto = req.validatedBody as CreateDesignationDTO;
    const designation = await this.adminService.createDesignation(dto);
    return this.sendCreatedResponse(req, res, designation, "Designation created successfully");
  }

  public async getDesignationPermissions(req: Request, res: Response) {
    const designationId = req.params.id as string;
    const data = await this.adminService.getDesignationPermissions(designationId);
    return this.sendResponse(req, res, "Designation permissions retrieved successfully", 200, data);
  }

  public async saveDesignationPermissions(req: Request, res: Response) {
    const designationId = req.params.id as string;
    const dto = req.validatedBody as SavePermissionAssignmentsDTO;
    const result = await this.adminService.saveDesignationPermissions(designationId, dto);
    return this.sendResponse(req, res, result.message, 200);
  }

  // Permissions & Scope Types
  public async getAllPermissions(req: Request, res: Response) {
    const permissions = await this.adminService.getAllPermissions();
    return this.sendResponse(req, res, "Permissions retrieved successfully", 200, permissions);
  }

  public async getScopeTypes(req: Request, res: Response) {
    const scopeTypes = await this.adminService.getScopeTypes();
    return this.sendResponse(req, res, "Scope types retrieved successfully", 200, scopeTypes);
  }

  // Overrides & Delegations
  public async getOverrides(req: Request, res: Response) {
    const overrides = await this.adminService.getOverrides();
    return this.sendResponse(req, res, "User permission overrides retrieved successfully", 200, overrides);
  }

  public async createOverride(req: Request, res: Response) {
    const dto = req.validatedBody as CreateOverrideDTO;
    const granterId = (req as any).user?.sub || (req as any).user?.id;
    const override = await this.adminService.createOverride(dto, granterId);
    return this.sendCreatedResponse(req, res, override, "User permission override created successfully");
  }

  public async revokeOverride(req: Request, res: Response) {
    const overrideId = req.params.id as string;
    const result = await this.adminService.revokeOverride(overrideId);
    return this.sendResponse(req, res, result.message, 200);
  }

  public async getDelegations(req: Request, res: Response) {
    const delegations = await this.adminService.getDelegations();
    return this.sendResponse(req, res, "Delegations retrieved successfully", 200, delegations);
  }

  public async createDelegation(req: Request, res: Response) {
    const dto = req.validatedBody as CreateDelegationDTO;
    const creatorId = (req as any).user?.sub || (req as any).user?.id;
    const delegation = await this.adminService.createDelegation(dto, creatorId);
    return this.sendCreatedResponse(req, res, delegation, "Delegation created successfully");
  }

  public async revokeDelegation(req: Request, res: Response) {
    const delegationId = req.params.id as string;
    const result = await this.adminService.revokeDelegation(delegationId);
    return this.sendResponse(req, res, result.message, 200);
  }
}
