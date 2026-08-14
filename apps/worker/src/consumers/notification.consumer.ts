import type { Channel, ConsumeMessage } from "amqplib";
import { prisma, type NotificationType } from "../lib/prisma";
import { Queues, type NotificationPayload } from "@workspace/message-broker";
import { AppLogger } from "@workspace/logger";

const logger = new AppLogger("NotificationConsumer");

export async function startNotificationConsumer(
  channel: Channel,
): Promise<void> {
  logger.info(`Starting consumer for queue: ${Queues.NOTIFICATIONS}`);

  await channel.consume(
    Queues.NOTIFICATIONS,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const payload: NotificationPayload = JSON.parse(
          msg.content.toString(),
        );
        logger.info(
          `Processing notification for user: ${payload.recipientId}`,
        );

        const typeCode = payload.type || "Mention";
        let notifType = await prisma.notificationType.findUnique({
          where: { code: typeCode },
        });

        if (!notifType) {
          notifType = await prisma.notificationType.create({
            data: {
              code: typeCode,
              name: typeCode,
            },
          });
        }

        await prisma.notification.create({
          data: {
            recipientId: payload.recipientId,
            notificationTypeId: notifType.id,
            title: payload.title,
            body: payload.body || null,
            entityType: payload.entityType || null,
            entityId: payload.entityId || null,
          },
        });

        logger.info("Successfully saved notification");
        channel.ack(msg);
      } catch (error) {
        logger.error("Error processing notification message", { error });
        channel.nack(msg, false, false);
      }
    },
    { noAck: false },
  );
}
