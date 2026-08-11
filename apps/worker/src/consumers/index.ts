import type { Channel } from "amqplib";
import { startAuditConsumer } from "./audit.consumer";
import { startNotificationConsumer } from "./notification.consumer";
import { startEmailConsumer } from "./email.consumer";
import { AppLogger } from "@workspace/logger";

const logger = new AppLogger("WorkerConsumers");

export async function registerConsumers(channel: Channel): Promise<void> {
  logger.info("Registering all queue consumers...");
  await Promise.all([
    startAuditConsumer(channel),
    startNotificationConsumer(channel),
    startEmailConsumer(channel),
  ]);
  logger.info("All consumers registered and listening.");
}
