export interface AuditLogPayload {
  entityTable: string;
  entityId: string;
  action: string;
  actorId: string;
  onBehalfOfId?: string;
  oldPayload?: Record<string, any>;
  newPayload?: Record<string, any>;
  createdAt?: string;
}

export interface NotificationPayload {
  recipientId: string;
  type: "USER_REGISTERED" | "TASK_ASSIGNED" | "SYSTEM_ALERT" | (string & {});
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  createdAt?: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  template?: string;
  body: string;
  metadata?: Record<string, any>;
}
