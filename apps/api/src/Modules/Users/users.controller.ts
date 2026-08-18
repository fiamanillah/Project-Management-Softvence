import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { UsersService } from "./users.service";
import { AuthenticationError, BadRequestError } from "@/core/errors/AppError";
import type {
  CreateAdminUserDTO,
  ResendInviteDTO,
  UpdateAdminUserDTO,
  UpdateProfileDTO,
  CreateOverrideDTO,
  CreateDelegationDTO,
} from "./UserDTO";

export class UsersController extends BaseController {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  // Current User Profile & Avatar
  public async getProfile(req: Request, res: Response) {
    const userId = req.user?.sub || (req.user as any)?.id;
    if (!userId) throw new AuthenticationError("User not authenticated");

    const profile = await this.usersService.getProfile(userId);
    return this.sendResponse(req, res, "User profile retrieved successfully", 200, profile);
  }

  public async updateProfile(req: Request, res: Response) {
    const userId = req.user?.sub || (req.user as any)?.id;
    if (!userId) throw new AuthenticationError("User not authenticated");

    const dto = req.validatedBody as UpdateProfileDTO;
    const updated = await this.usersService.updateProfile(userId, dto, req);
    return this.sendResponse(req, res, "Profile updated successfully", 200, updated);
  }

  public async uploadMyAvatar(req: Request, res: Response) {
    const userId = req.user?.sub || (req.user as any)?.id;
    if (!userId) throw new AuthenticationError("User not authenticated");

    const file = req.file;
    if (!file) throw new BadRequestError("Please provide an image file in the 'avatar' or 'file' field");

    const result = await this.usersService.uploadAvatar(userId, file, req);
    return this.sendResponse(req, res, "Profile picture uploaded successfully", 200, result);
  }

  public async removeMyAvatar(req: Request, res: Response) {
    const userId = req.user?.sub || (req.user as any)?.id;
    if (!userId) throw new AuthenticationError("User not authenticated");

    const result = await this.usersService.removeAvatar(userId, req);
    return this.sendResponse(req, res, result.message, 200, result.user);
  }

  // Admin User Avatar Management
  public async uploadUserAvatar(req: Request, res: Response) {
    const userId = req.params.id as string;
    const file = req.file;
    if (!file) throw new BadRequestError("Please provide an image file in the 'avatar' or 'file' field");

    const result = await this.usersService.uploadAvatar(userId, file, req);
    return this.sendResponse(req, res, "User avatar uploaded successfully", 200, result);
  }

  public async removeUserAvatar(req: Request, res: Response) {
    const userId = req.params.id as string;
    const result = await this.usersService.removeAvatar(userId, req);
    return this.sendResponse(req, res, result.message, 200, result.user);
  }

  // Users
  public async getUsers(req: Request, res: Response) {
    const actor = req.user
      ? {
          id: req.user.sub,
          systemRole: req.user.systemRole,
          roleId: req.user.roleId,
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
