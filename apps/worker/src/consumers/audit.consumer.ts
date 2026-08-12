import type { Channel, ConsumeMessage } from "amqplib";
import { AuditLogModel } from "@workspace/db";
import { Queues, type AuditLogPayload } from "@workspace/message-broker";
import { AppLogger } from "@workspace/logger";
import { randomUUID } from "node:crypto";

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
          `Processing audit log [${payload.module || "SYSTEM"}] ${payload.action} for ${payload.entityTable}:${payload.entityId}`,
        );

        await AuditLogModel.create({
          auditId: payload.auditId || randomUUID(),
          module: payload.module || "SYSTEM",
          action: payload.action,
          entityTable: payload.entityTable,
          entityId: payload.entityId,
          actor: {
            id: payload.actorId,
            email: payload.actorEmail,
            role: payload.actorRole,
            ipAddress: payload.ipAddress,
            userAgent: payload.userAgent,
          },
          onBehalfOfId: payload.onBehalfOfId || undefined,
          httpContext: payload.httpContext,
          changes: {
            before: payload.oldPayload,
            after: payload.newPayload,
            diff: payload.diff,
          },
          metadata: payload.metadata,
          status: payload.status || "SUCCESS",
          errorMessage: payload.errorMessage,
          createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
        });

        logger.info("Successfully recorded audit log in MongoDB");
        channel.ack(msg);
      } catch (error) {
        logger.error("Error processing audit message in MongoDB consumer", { error });
        channel.nack(msg, false, false);
      }
    },
    { noAck: false },
  );
}

