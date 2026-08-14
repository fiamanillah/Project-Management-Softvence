// src/Modules/Users/UsersModule.ts

import { BaseModule } from "@/core/BaseModule";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { validateRequest } from "@/middleware/validation";
import { authenticate } from "@/middleware/auth.middleware";
import { requirePermission } from "@/middleware/requirePermission";
import {
  createAdminUserSchema,
  updateAdminUserSchema,
  createOverrideSchema,
  createDelegationSchema,
} from "./UserDTO";

export class UsersModule extends BaseModule {
  public name: string = "UsersModule";
  public version: string = "1.0.0";
  public apiVersion: string = "v1";
  public basePath: string = "/users";
  public dependencies?: string[] = [];

  protected async setupUseCases(): Promise<void> {
    const prisma = this.context.getService("prisma");
    this.registerService("UsersService", new UsersService(prisma));
  }

  protected async setupControllers(): Promise<void> {
    const usersService = this.getService<UsersService>("UsersService");
    this.registerController("UsersController", new UsersController(usersService));
  }

  protected async setupRoutes(): Promise<void> {
    const controller = this.getController<UsersController>("UsersController");

    this.router.use(authenticate);

    // Users
    this.router.get(
      "/",
      requirePermission("auth.user.view"),
      controller.getUsers.bind(controller),
    );
    this.router.post(
      "/",
      requirePermission("auth.user.create"),
      validateRequest({ body: createAdminUserSchema }),
      controller.createUser.bind(controller),
    );
    this.router.patch(
      "/:id",
      requirePermission("auth.user.manage"),
      validateRequest({ body: updateAdminUserSchema }),
      controller.updateUser.bind(controller),
    );
    this.router.post(
      "/:id/resend-invite",
      requirePermission("auth.user.manage"),
      controller.resendInvite.bind(controller),
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
