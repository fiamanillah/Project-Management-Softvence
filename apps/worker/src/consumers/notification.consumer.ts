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

        await prisma.notification.create({
          data: {
            recipient_id: payload.recipientId,
            type: (payload.type as NotificationType) || "Mention",
            title: payload.title,
            body: payload.body || null,
            entity_type: payload.entityType || null,
            entity_id: payload.entityId || null,
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
