export interface AuditLogParams {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogger {
  log(params: AuditLogParams): Promise<void>;
}
