// src/Modules/Permissions/permissions.controller.ts

import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { PermissionsService } from "./permissions.service";

export class PermissionsController extends BaseController {
  constructor(private readonly permissionsService: PermissionsService) {
    super();
  }

  public async getAllPermissions(req: Request, res: Response) {
    const permissions = await this.permissionsService.getAllPermissions();
    return this.sendResponse(req, res, "Permissions retrieved successfully", 200, permissions);
  }

  public async getScopeTypes(req: Request, res: Response) {
    const scopeTypes = await this.permissionsService.getScopeTypes();
    return this.sendResponse(req, res, "Scope types retrieved successfully", 200, scopeTypes);
  }
}
