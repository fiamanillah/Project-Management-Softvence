import { publishAuditLog, type AuditLogPayload } from "@workspace/message-broker";
import { AppLogger } from "@/core/logging/logger";
import type { Request } from "express";
import { randomUUID } from "node:crypto";

const logger = new AppLogger("AuditLogService");

export interface LogAuditEventOptions {
  module: string;
  action: string;
  entityTable: string;
  entityId: string;
  actor?: {
    id?: string;
    email?: string;
    role?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  onBehalfOfId?: string;
  oldPayload?: Record<string, any>;
  newPayload?: Record<string, any>;
  diff?: Record<string, any>;
  metadata?: Record<string, any>;
  status?: "SUCCESS" | "FAILED";
  errorMessage?: string;
  req?: Request;
}

export class AuditLogService {
  /**
   * Publish audit log asynchronously to RabbitMQ without blocking HTTP response time.
   */
  public static async log(options: LogAuditEventOptions): Promise<boolean> {
    try {
      const req = options.req;
      const user = (req as any)?.user;

      const actorId = options.actor?.id || user?.id || user?.sub || undefined;
      const actorEmail = options.actor?.email || user?.email || undefined;
      const actorRole = options.actor?.role || user?.role || undefined;

      const ipAddress =
        options.actor?.ipAddress ||
        (req
          ? ((req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || undefined)
          : undefined);

      const userAgent =
        options.actor?.userAgent || (req ? req.headers["user-agent"] : undefined);

      const httpContext = req
        ? {
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode: (req as any).res?.statusCode,
            requestId: (req.headers["x-request-id"] as string) || undefined,
          }
        : undefined;

      const payload: AuditLogPayload = {
        auditId: randomUUID(),
        module: options.module,
        action: options.action,
        entityTable: options.entityTable,
        entityId: options.entityId,
        actorId,
        actorEmail,
        actorRole,
        onBehalfOfId: options.onBehalfOfId,
        ipAddress,
        userAgent,
        httpContext,
        oldPayload: options.oldPayload,
        newPayload: options.newPayload,
        diff: options.diff,
        metadata: options.metadata,
        status: options.status || "SUCCESS",
        errorMessage: options.errorMessage,
        createdAt: new Date().toISOString(),
      };

      // Non-blocking asynchronous dispatch
      publishAuditLog(payload).catch((err) => {
        logger.error("Failed to publish audit log event to RabbitMQ queue", {
          error: err,
          module: options.module,
          action: options.action,
        });
      });

      return true;
    } catch (err) {
      logger.error("Error constructing audit log payload", { error: err });
      return false;
    }
  }
}
