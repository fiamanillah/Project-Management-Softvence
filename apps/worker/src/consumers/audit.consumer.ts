import type { Channel, ConsumeMessage } from "amqplib";
import { prisma } from "../lib/prisma";
import { Queues, type AuditLogPayload } from "@workspace/message-broker";
import { AppLogger } from "@workspace/logger";

const logger = new AppLogger("AuditConsumer");

export async function startAuditConsumer(channel: Channel): Promise<void> {
  logger.info(`Starting consumer for queue: ${Queues.AUDIT_LOGS}`);

  await channel.consume(
    Queues.AUDIT_LOGS,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const payload: AuditLogPayload = JSON.parse(msg.content.toString());
        logger.info(
          `Processing audit log for ${payload.entityTable}:${payload.entityId}`,
        );

        await prisma.auditLog.create({
          data: {
            entity_table: payload.entityTable,
            entity_id: payload.entityId,
            action: payload.action,
            actor_id: payload.actorId,
            on_behalf_of_id: payload.onBehalfOfId || null,
            old_payload: payload.oldPayload
              ? JSON.parse(JSON.stringify(payload.oldPayload))
              : undefined,
            new_payload: payload.newPayload
              ? JSON.parse(JSON.stringify(payload.newPayload))
              : undefined,
          },
        });

        logger.info("Successfully recorded audit log");
        channel.ack(msg);
      } catch (error) {
        logger.error("Error processing audit message", { error });
        channel.nack(msg, false, false);
      }
    },
    { noAck: false },
  );
}
