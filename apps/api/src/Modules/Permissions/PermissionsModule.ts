// src/Modules/Permissions/PermissionsModule.ts

import { BaseModule } from "@/core/BaseModule";
import { PermissionsService } from "./permissions.service";
import { PermissionsController } from "./permissions.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { requirePermission } from "@/middleware/requirePermission";

export class PermissionsModule extends BaseModule {
  public name: string = "PermissionsModule";
  public version: string = "1.0.0";
  public apiVersion: string = "v1";
  public basePath: string = "/permissions";
  public dependencies?: string[] = [];

  protected async setupUseCases(): Promise<void> {
    const prisma = this.context.getService("prisma");
    this.registerService("PermissionsService", new PermissionsService(prisma));
  }

  protected async setupControllers(): Promise<void> {
    const permissionsService = this.getService<PermissionsService>("PermissionsService");
    this.registerController("PermissionsController", new PermissionsController(permissionsService));
  }

  protected async setupRoutes(): Promise<void> {
    const controller = this.getController<PermissionsController>("PermissionsController");

    this.router.use(authenticate);

    this.router.get(
      "/",
      requirePermission("auth.user.view"),
      controller.getAllPermissions.bind(controller),
    );
    this.router.get(
      "/scope-types",
      requirePermission("auth.user.view"),
      controller.getScopeTypes.bind(controller),
    );
  }
}
