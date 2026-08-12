import { AuditLogger, AuditLogParams } from "./audit-logger.interface";
import { AuditLogService } from "@/core/audit/audit.service";

export class RabbitMQAuditLogger implements AuditLogger {
  async log(params: AuditLogParams): Promise<void> {
    await AuditLogService.log({
      module: params.entityType ? params.entityType.toUpperCase() : "SYSTEM",
      action: params.action,
      entityTable: params.entityType,
      entityId: params.entityId || params.actorId || "N/A",
      actor: {
        id: params.actorId || undefined,
        ipAddress: params.ipAddress || undefined,
        userAgent: params.userAgent || undefined,
      },
      metadata: params.details || undefined,
    });
  }
}
