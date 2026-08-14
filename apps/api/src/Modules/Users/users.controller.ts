// src/Modules/Users/users.controller.ts

import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { UsersService } from "./users.service";
import type {
  CreateAdminUserDTO,
  ResendInviteDTO,
  UpdateAdminUserDTO,
  CreateOverrideDTO,
  CreateDelegationDTO,
} from "./UserDTO";

export class UsersController extends BaseController {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  // Users
  public async getUsers(req: Request, res: Response) {
    const actor = req.user
      ? {
          id: req.user.sub,
          systemRole: req.user.systemRole,
          designationId: req.user.designationId,
          email: (req.user as any).email,
        }
      : undefined;
    const result = await this.usersService.getUsers(req.query as any, actor);
    return this.sendResponse(req, res, "Users retrieved successfully", 200, result);
  }

  public async createUser(req: Request, res: Response) {
    const dto = req.validatedBody as CreateAdminUserDTO;
    const user = await this.usersService.createAdminUser(dto, req);
    return this.sendCreatedResponse(req, res, user, "Admin user created successfully");
  }

  public async updateUser(req: Request, res: Response) {
    const userId = req.params.id as string;
    const dto = req.validatedBody as UpdateAdminUserDTO;
    const updated = await this.usersService.updateAdminUser(userId, dto, req);
    return this.sendResponse(req, res, "User updated successfully", 200, updated);
  }

  public async resendInvite(req: Request, res: Response) {
    const userId = req.params.id as string;
    const { temporaryPassword } = (req.validatedBody || {}) as ResendInviteDTO;
    const result = await this.usersService.resendInvite(userId, temporaryPassword, req);
    return this.sendResponse(req, res, result.message, 200, result);
  }

  // Overrides & Delegations
  public async getOverrides(req: Request, res: Response) {
    const overrides = await this.usersService.getOverrides();
    return this.sendResponse(req, res, "User permission overrides retrieved successfully", 200, overrides);
  }

  public async createOverride(req: Request, res: Response) {
    const dto = req.validatedBody as CreateOverrideDTO;
    const granterId = (req as any).user?.sub || (req as any).user?.id;
    const override = await this.usersService.createOverride(dto, granterId, req);
    return this.sendCreatedResponse(req, res, override, "User permission override created successfully");
  }

  public async revokeOverride(req: Request, res: Response) {
    const overrideId = req.params.id as string;
    const result = await this.usersService.revokeOverride(overrideId, req);
    return this.sendResponse(req, res, result.message, 200);
  }

  public async getDelegations(req: Request, res: Response) {
    const delegations = await this.usersService.getDelegations();
    return this.sendResponse(req, res, "Delegations retrieved successfully", 200, delegations);
  }

  public async createDelegation(req: Request, res: Response) {
    const dto = req.validatedBody as CreateDelegationDTO;
    const creatorId = (req as any).user?.sub || (req as any).user?.id;
    const delegation = await this.usersService.createDelegation(dto, creatorId, req);
    return this.sendCreatedResponse(req, res, delegation, "Delegation created successfully");
  }

  public async revokeDelegation(req: Request, res: Response) {
    const delegationId = req.params.id as string;
    const result = await this.usersService.revokeDelegation(delegationId, req);
    return this.sendResponse(req, res, result.message, 200);
  }
}
