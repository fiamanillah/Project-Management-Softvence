import { messageBroker } from "../connection";
import { Queues } from "../constants/queues";
import type {
  AuditLogPayload,
  NotificationPayload,
  EmailPayload,
} from "../types/messages";

export async function publishAuditLog(
  payload: AuditLogPayload,
): Promise<boolean> {
  return messageBroker.publishToQueue(Queues.AUDIT_LOGS, payload);
}

export async function publishNotification(
  payload: NotificationPayload,
): Promise<boolean> {
  return messageBroker.publishToQueue(Queues.NOTIFICATIONS, payload);
}

export async function publishEmail(
  payload: EmailPayload,
): Promise<boolean> {
  return messageBroker.publishToQueue(Queues.EMAIL, payload);
}
