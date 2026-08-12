import { BaseModule } from "@/core/BaseModule";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { authenticate } from "./auth.middleware";
import { authRateLimiter } from "./auth.rate-limiter";
import { container } from "@/infra/container";

export class AuthModule extends BaseModule {
  public name: string = "AuthModule";
  public version: string = "1.0.0";
  public basePath: string = "/auth";
  public dependencies: string[] = [];

  protected async setupUseCases(): Promise<void> {
    const authService = new AuthService(
      container.prisma,
      container.auditLogger,
      container.notificationDispatcher,
      container.rbacService
    );
    this.registerService("AuthService", authService);
  }

  protected async setupControllers(): Promise<void> {
    const authService = this.getService<AuthService>("AuthService");
    this.registerController("AuthController", new AuthController(authService));
  }

  protected async setupRoutes(): Promise<void> {
    const controller = this.getController<AuthController>("AuthController");

    this.router.post("/login", authRateLimiter, controller.login.bind(controller));
    this.router.post("/refresh", controller.refresh.bind(controller));
    this.router.post("/logout", controller.logout.bind(controller));
    this.router.get("/me", authenticate, controller.getMe.bind(controller));
    this.router.post("/change-password", authenticate, controller.changePassword.bind(controller));
    this.router.post("/forgot-password", authRateLimiter, controller.forgotPassword.bind(controller));
    this.router.post("/reset-password", controller.resetPassword.bind(controller));
    this.router.post("/accept-invite", controller.acceptInvite.bind(controller));
  }
}
