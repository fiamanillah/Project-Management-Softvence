// src/Modules/Admin/AdminModule.ts

import { BaseModule } from "@/core/BaseModule";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { validateRequest } from "@/middleware/validation";
import { authenticate } from "@/middleware/auth.middleware";
import { requirePermission } from "@/middleware/requirePermission";
import {
  createAdminUserSchema,
  updateAdminUserSchema,
  createDesignationSchema,
  savePermissionAssignmentsSchema,
  createOverrideSchema,
  createDelegationSchema,
} from "./AdminDTO";

export class AdminModule extends BaseModule {
  public name: string = "AdminModule";
  public version: string = "1.0.0";
  public basePath: string = "/admin";
  public dependencies?: string[] | undefined;

  protected async setupUseCases(): Promise<void> {
    const prisma = this.context.getService("prisma");
    this.registerService("AdminService", new AdminService(prisma));
  }

  protected async setupControllers(): Promise<void> {
    const adminService = this.getService<AdminService>("AdminService");
    this.registerController("AdminController", new AdminController(adminService));
  }

  protected async setupRoutes(): Promise<void> {
    const controller = this.getController<AdminController>("AdminController");

    // Protect all admin routes with authentication
    this.router.use(authenticate);

    // Users
    this.router.get(
      "/users",
      requirePermission("auth.user.view"),
      controller.getUsers.bind(controller),
    );
    this.router.post(
      "/users",
      requirePermission("auth.user.create"),
      validateRequest({ body: createAdminUserSchema }),
      controller.createUser.bind(controller),
    );
    this.router.patch(
      "/users/:id",
      requirePermission("auth.user.manage"),
      validateRequest({ body: updateAdminUserSchema }),
      controller.updateUser.bind(controller),
    );

    // Designations & Permission Matrix
    this.router.get(
      "/designations",
      requirePermission("auth.user.view"),
      controller.getDesignations.bind(controller),
    );
    this.router.post(
      "/designations",
      requirePermission("auth.user.manage"),
      validateRequest({ body: createDesignationSchema }),
      controller.createDesignation.bind(controller),
    );
    this.router.get(
      "/designations/:id/permissions",
      requirePermission("auth.user.view"),
      controller.getDesignationPermissions.bind(controller),
    );
    this.router.put(
      "/designations/:id/permissions",
      requirePermission("auth.user.manage"),
      validateRequest({ body: savePermissionAssignmentsSchema }),
      controller.saveDesignationPermissions.bind(controller),
    );

    // Permissions & Scope Types
    this.router.get(
      "/permissions",
      requirePermission("auth.user.view"),
      controller.getAllPermissions.bind(controller),
    );
    this.router.get(
      "/scope-types",
      requirePermission("auth.user.view"),
      controller.getScopeTypes.bind(controller),
    );

    // Overrides
    this.router.get(
      "/overrides",
      requirePermission("auth.user.view"),
      controller.getOverrides.bind(controller),
    );
    this.router.post(
      "/overrides",
      requirePermission("auth.user.manage"),
      validateRequest({ body: createOverrideSchema }),
      controller.createOverride.bind(controller),
    );
    this.router.delete(
      "/overrides/:id",
      requirePermission("auth.user.manage"),
      controller.revokeOverride.bind(controller),
    );

    // Delegations
    this.router.get(
      "/delegations",
      requirePermission("auth.user.view"),
      controller.getDelegations.bind(controller),
    );
    this.router.post(
      "/delegations",
      requirePermission("auth.user.manage"),
      validateRequest({ body: createDelegationSchema }),
      controller.createDelegation.bind(controller),
    );
    this.router.delete(
      "/delegations/:id",
      requirePermission("auth.user.manage"),
      controller.revokeDelegation.bind(controller),
    );
  }
}
