import { BaseModule } from "@/core/BaseModule";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { authenticate } from "@/modules/auth/auth.middleware";
import { authorize } from "@/modules/rbac/rbac.middleware";
import { container } from "@/infra/container";

export class UsersModule extends BaseModule {
  public name: string = "UsersModule";
  public version: string = "1.0.0";
  public basePath: string = "/users";
  public dependencies: string[] = [];

  protected async setupUseCases(): Promise<void> {
    const usersService = new UsersService(
      container.prisma,
      container.auditLogger,
      container.notificationDispatcher
    );
    this.registerService("UsersService", usersService);
  }

  protected async setupControllers(): Promise<void> {
    const usersService = this.getService<UsersService>("UsersService");
    this.registerController("UsersController", new UsersController(usersService));
  }

  protected async setupRoutes(): Promise<void> {
    const controller = this.getController<UsersController>("UsersController");

    this.router.post(
      "/invite",
      authenticate,
      authorize("user.manage"),
      controller.inviteUser.bind(controller)
    );

    this.router.get(
      "/",
      authenticate,
      authorize("user.manage"),
      controller.listUsers.bind(controller)
    );

    this.router.patch(
      "/:id/deactivate",
      authenticate,
      authorize("user.deactivate"),
      controller.deactivateUser.bind(controller)
    );

    this.router.get(
      "/designations",
      authenticate,
      controller.listDesignations.bind(controller)
    );
  }
}
