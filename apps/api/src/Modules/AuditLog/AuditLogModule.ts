import { BaseModule } from "@/core/BaseModule";
import { AuditLogQueryService } from "./audit-log.service";
import { AuditLogController } from "./audit-log.controller";

export class AuditLogModule extends BaseModule {
  public name: string = "AuditLogModule";
  public version: string = "1.0.0";
  public basePath: string = "/audit-logs";
  public dependencies: string[] = [];


  protected async setupUseCases(): Promise<void> {
    this.registerService("AuditLogQueryService", new AuditLogQueryService());
  }

  protected async setupControllers(): Promise<void> {
    const auditService = this.getService<AuditLogQueryService>("AuditLogQueryService");
    this.registerController("AuditLogController", new AuditLogController(auditService));
  }

  protected async setupRoutes(): Promise<void> {
    const controller = this.getController<AuditLogController>("AuditLogController");

    // GET /audit-logs/v1/
    this.router.get("/", controller.getAuditLogs.bind(controller));

    // GET /audit-logs/v1/stats
    this.router.get("/stats", controller.getAuditStats.bind(controller));

    // GET /audit-logs/v1/:id
    this.router.get("/:id", controller.getAuditLogById.bind(controller));
  }
}
