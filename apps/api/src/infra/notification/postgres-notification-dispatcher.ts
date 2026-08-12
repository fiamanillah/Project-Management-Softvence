import { PrismaClient, NotificationType } from "@workspace/db";
import { NotificationDispatcher, DispatchNotificationParams } from "./notification-dispatcher.interface";
import { AppLogger } from "@/core/logging/logger";

export class PostgresNotificationDispatcher implements NotificationDispatcher {
  private logger = new AppLogger("PostgresNotificationDispatcher");

  constructor(private readonly prisma: PrismaClient) {}

  async dispatch(params: DispatchNotificationParams): Promise<void> {
    try {
      // Map string or enum to NotificationType
      const notificationType = (Object.values(NotificationType).includes(params.type as any)
        ? params.type
        : NotificationType.Mention) as NotificationType;

      await this.prisma.notification.create({
        data: {
          recipient_id: params.recipientId,
          type: notificationType,
          title: params.title,
          body: params.body ?? null,
          entity_type: params.entityType ?? null,
          entity_id: params.entityId ?? null,
          is_read: false,
        },
      });
    } catch (error) {
      this.logger.error("Failed to dispatch notification", { error, params });
    }
  }
}
