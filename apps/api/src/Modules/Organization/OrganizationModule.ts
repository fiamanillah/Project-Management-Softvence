// src/Modules/Organization/OrganizationModule.ts

import { BaseModule } from "@/core/BaseModule";
import { OrganizationService } from "./organization.service";
import { OrganizationController } from "./organization.controller";
import { validateRequest } from "@/middleware/validation";
import { authenticate } from "@/middleware/auth.middleware";
import { requirePermission } from "@/middleware/requirePermission";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  assignDepartmentManagerSchema,
  createRoleSchema,
  updateRoleSchema,
  saveRolePermissionsSchema,
  createDesignationSchema,
  updateDesignationSchema,
} from "./OrganizationDTO";

export class OrganizationModule extends BaseModule {
  public name: string = "OrganizationModule";
  public version: string = "1.0.0";
  public apiVersion: string = "v1";
  public basePath: string = "/organization";
  public dependencies?: string[] = [];

  protected async setupUseCases(): Promise<void> {
    const prisma = this.context.getService("prisma");
    this.registerService("OrganizationService", new OrganizationService(prisma));
  }

  protected async setupControllers(): Promise<void> {
    const orgService = this.getService<OrganizationService>("OrganizationService");
    this.registerController("OrganizationController", new OrganizationController(orgService));
  }

  protected async setupRoutes(): Promise<void> {
    const controller = this.getController<OrganizationController>("OrganizationController");

    this.router.use(authenticate);

    // Departments
    this.router.get(
      "/departments",
      requirePermission("auth.user.view"),
      controller.getDepartments.bind(controller),
    );
    this.router.get(
      "/departments/:id",
      requirePermission("auth.user.view"),
      controller.getDepartmentById.bind(controller),
    );
    this.router.post(
      "/departments",
      requirePermission("auth.user.manage"),
      validateRequest({ body: createDepartmentSchema }),
      controller.createDepartment.bind(controller),
    );
    this.router.patch(
      "/departments/:id",
      requirePermission("auth.user.manage"),
      validateRequest({ body: updateDepartmentSchema }),
      controller.updateDepartment.bind(controller),
    );
    this.router.delete(
      "/departments/:id",
      requirePermission("auth.user.manage"),
      controller.deleteDepartment.bind(controller),
    );
    this.router.post(
      "/departments/:id/managers",
      requirePermission("auth.user.manage"),
      validateRequest({ body: assignDepartmentManagerSchema }),
      controller.assignDepartmentManager.bind(controller),
    );
    this.router.delete(
      "/departments/:id/managers/:managerId",
      requirePermission("auth.user.manage"),
      controller.removeDepartmentManager.bind(controller),
    );

    // Roles & Permission Matrix (Authorization)
    this.router.get(
      "/roles",
      requirePermission("auth.user.view"),
      controller.getRoles.bind(controller),
    );
    this.router.get(
      "/roles/:id",
      requirePermission("auth.user.view"),
      controller.getRoleById.bind(controller),
    );
    this.router.post(
      "/roles",
      requirePermission("auth.user.manage"),
      validateRequest({ body: createRoleSchema }),
      controller.createRole.bind(controller),
    );
    this.router.put(
      "/roles/:id",
      requirePermission("auth.user.manage"),
      validateRequest({ body: updateRoleSchema }),
      controller.updateRole.bind(controller),
    );
    this.router.delete(
      "/roles/:id",
      requirePermission("auth.user.manage"),
      controller.deleteRole.bind(controller),
    );
    this.router.get(
      "/roles/:id/permissions",
      requirePermission("auth.user.view"),
      controller.getRolePermissions.bind(controller),
    );
    this.router.put(
      "/roles/:id/permissions",
      requirePermission("auth.user.manage"),
      validateRequest({ body: saveRolePermissionsSchema }),
      controller.saveRolePermissions.bind(controller),
    );

    // Designations (Pure HR Job Titles)
    this.router.get(
      "/designations",
      requirePermission("auth.user.view"),
      controller.getDesignations.bind(controller),
    );
    this.router.get(
      "/designations/:id",
      requirePermission("auth.user.view"),
      controller.getDesignationById.bind(controller),
    );
    this.router.post(
      "/designations",
      requirePermission("auth.user.manage"),
      validateRequest({ body: createDesignationSchema }),
      controller.createDesignation.bind(controller),
    );
    this.router.put(
      "/designations/:id",
      requirePermission("auth.user.manage"),
      validateRequest({ body: updateDesignationSchema }),
      controller.updateDesignation.bind(controller),
    );
    this.router.delete(
      "/designations/:id",
      requirePermission("auth.user.manage"),
      controller.deleteDesignation.bind(controller),
    );
  }
}
