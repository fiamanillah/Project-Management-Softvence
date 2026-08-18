import multer from "multer";
import { BaseModule } from "@/core/BaseModule";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { validateRequest } from "@/middleware/validation";
import { authenticate } from "@/middleware/auth.middleware";
import { requirePermission } from "@/middleware/requirePermission";
import type { PrismaClient } from "@workspace/db";
import type { StorageManager } from "@workspace/storage";
import {
  createAdminUserSchema,
  updateAdminUserSchema,
  updateProfileSchema,
  createOverrideSchema,
  createDelegationSchema,
} from "./UserDTO";

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, WEBP, GIF, SVG) are allowed"));
    }
  },
});

export class UsersModule extends BaseModule {
  public name: string = "UsersModule";
  public version: string = "1.0.0";
  public apiVersion: string = "v1";
  public basePath: string = "/users";
  public dependencies?: string[] = [];

  protected async setupUseCases(): Promise<void> {
    const prisma = this.context.getService("prisma") as PrismaClient;
    let storageManager: StorageManager | undefined;
    try {
      storageManager = this.context.getService("storage") as StorageManager;
    } catch {
      // Storage service optional in isolated test environments
    }
    this.registerService("UsersService", new UsersService(prisma, storageManager));
  }

  protected async setupControllers(): Promise<void> {
    const usersService = this.getService<UsersService>("UsersService");
    this.registerController("UsersController", new UsersController(usersService));
  }

  protected async setupRoutes(): Promise<void> {
    const controller = this.getController<UsersController>("UsersController");

    this.router.use(authenticate);

    // Current User Profile & Avatar (Must precede parameterized /:id routes)
    this.router.get(
      "/me",
      controller.getProfile.bind(controller),
    );
    this.router.patch(
      "/me",
      validateRequest({ body: updateProfileSchema }),
      controller.updateProfile.bind(controller),
    );
    this.router.post(
      "/me/avatar",
      avatarUpload.single("avatar"),
      controller.uploadMyAvatar.bind(controller),
    );
    this.router.delete(
      "/me/avatar",
      controller.removeMyAvatar.bind(controller),
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

    // User Directory & Admin Management
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
    this.router.post(
      "/:id/avatar",
      requirePermission("auth.user.manage"),
      avatarUpload.single("avatar"),
      controller.uploadUserAvatar.bind(controller),
    );
    this.router.delete(
      "/:id/avatar",
      requirePermission("auth.user.manage"),
      controller.removeUserAvatar.bind(controller),
    );
  }
}
