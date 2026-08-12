import { prisma } from "@/lib/prisma";
import { RabbitMQAuditLogger } from "./audit/rabbitmq-audit-logger";
import { PostgresNotificationDispatcher } from "./notification/postgres-notification-dispatcher";
import { RbacService } from "@/modules/rbac/rbac.service";
import { AuditLogger } from "./audit/audit-logger.interface";
import { NotificationDispatcher } from "./notification/notification-dispatcher.interface";

export interface Container {
  prisma: typeof prisma;
  auditLogger: AuditLogger;
  notificationDispatcher: NotificationDispatcher;
  rbacService: RbacService;
}

export const auditLogger: AuditLogger = new RabbitMQAuditLogger();
export const notificationDispatcher: NotificationDispatcher = new PostgresNotificationDispatcher(prisma);
export const rbacService = new RbacService(prisma);

export const container: Container = {
  prisma,
  auditLogger,
  notificationDispatcher,
  rbacService,
};
