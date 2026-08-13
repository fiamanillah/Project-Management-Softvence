export interface AuditLogPayload {
  auditId?: string;
  module: string;
  action: string;
  entityTable: string;
  entityId: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  onBehalfOfId?: string;
  ipAddress?: string;
  userAgent?: string;
  httpContext?: {
    method?: string;
    path?: string;
    statusCode?: number;
    durationMs?: number;
    requestId?: string;
    query?: Record<string, any>;
    params?: Record<string, any>;
    requestBody?: Record<string, any>;
  };
  oldPayload?: Record<string, any>;
  newPayload?: Record<string, any>;
  diff?: Record<string, any>;
  metadata?: Record<string, any>;
  status?: "SUCCESS" | "FAILED";
  errorMessage?: string;
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
