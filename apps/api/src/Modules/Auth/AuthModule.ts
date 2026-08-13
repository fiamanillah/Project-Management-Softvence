import { BaseModule } from "@/core/BaseModule";
import { AuthServices } from "./auth.service";
import { AuthController } from "./auth.controller";
import { validateRequest } from "@/middleware/validation";
import { authenticate } from "@/middleware/auth.middleware";
import {
  createUserSchema,
  loginUserSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./AuthDTO";

export class AuthModule extends BaseModule {
  public name: string = "AuthModule";
  public version: string = "1.0.0";
  public basePath: string = "/auth";
  public dependencies?: string[] | undefined;

  protected async setupUseCases(): Promise<void> {
    const prisma = this.context.getService("prisma");
    let cache: any = undefined;
    try {
      cache = this.context.getService("redis");
    } catch {
      // Ignore if redis/cache provider is not registered
    }
    this.registerService("AuthService", new AuthServices(prisma, cache));
  }

  protected async setupControllers(): Promise<void> {
    const authService = this.getService<AuthServices>("AuthService");
    this.registerController("AuthController", new AuthController(authService));
  }

  protected async setupRoutes(): Promise<void> {
    const controller = this.getController<AuthController>("AuthController");

    // POST /auth/register & /auth/v1/register
    this.router.post(
      "/register",
      validateRequest(createUserSchema),
      controller.createUser.bind(controller),
    );
    this.router.post(
      "/v1/register",
      validateRequest(createUserSchema),
      controller.createUser.bind(controller),
    );

    // POST /auth/login & /auth/v1/login
    this.router.post(
      "/login",
      validateRequest(loginUserSchema),
      controller.login.bind(controller),
    );
    this.router.post(
      "/v1/login",
      validateRequest(loginUserSchema),
      controller.login.bind(controller),
    );

    // POST /auth/refresh & /auth/v1/refresh
    this.router.post(
      "/refresh",
      validateRequest(refreshSchema),
      controller.refresh.bind(controller),
    );
    this.router.post(
      "/v1/refresh",
      validateRequest(refreshSchema),
      controller.refresh.bind(controller),
    );

    // GET /auth/sessions
    this.router.get(
      "/sessions",
      authenticate,
      controller.getSessions.bind(controller),
    );

    // DELETE /auth/sessions/:id
    this.router.delete(
      "/sessions/:id",
      authenticate,
      controller.revokeSession.bind(controller),
    );

    // POST /auth/logout
    this.router.post(
      "/logout",
      controller.logout.bind(controller),
    );

    // POST /auth/forgot-password
    this.router.post(
      "/forgot-password",
      validateRequest(forgotPasswordSchema),
      controller.forgotPassword.bind(controller),
    );

    // GET /auth/permissions & /auth/v1/permissions (Frontend permission map for UI rendering)
    this.router.get(
      "/permissions",
      authenticate,
      controller.getUserPermissions.bind(controller),
    );
    this.router.get(
      "/v1/permissions",
      authenticate,
      controller.getUserPermissions.bind(controller),
    );

    // POST /auth/reset-password
    this.router.post(
      "/reset-password",
      validateRequest(resetPasswordSchema),
      controller.resetPassword.bind(controller),
    );
  }
}
