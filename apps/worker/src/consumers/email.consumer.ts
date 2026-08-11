import type { Channel, ConsumeMessage } from "amqplib";
import { Queues, type EmailPayload } from "@workspace/message-broker";
import { AppLogger } from "@workspace/logger";

const logger = new AppLogger("EmailConsumer");

export async function startEmailConsumer(channel: Channel): Promise<void> {
  logger.info(`Starting consumer for queue: ${Queues.EMAIL}`);

  await channel.consume(
    Queues.EMAIL,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const payload: EmailPayload = JSON.parse(msg.content.toString());
        logger.info(
          `Delivering email to: ${payload.to} | Subject: "${payload.subject}"`,
        );

        logger.info(`Email processed successfully for ${payload.to}`);
        channel.ack(msg);
      } catch (error) {
        logger.error("Error processing email message", { error });
        channel.nack(msg, false, false);
      }
    },
    { noAck: false },
  );
}
