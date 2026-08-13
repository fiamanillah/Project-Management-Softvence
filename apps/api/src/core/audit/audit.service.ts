import { publishAuditLog, type AuditLogPayload } from "@workspace/message-broker";
import { AuditLogModel, connectMongo } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { env } from "@/env";
import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { calculateDiff, sanitizePayload } from "./diffCalculator";

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
   * Publish audit log asynchronously to RabbitMQ without blocking HTTP response time,
   * falling back to direct Mongo write if message broker is unavailable.
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

      const cleanQuery = req?.query && Object.keys(req.query).length > 0 ? sanitizePayload(req.query) : undefined;
      const cleanParams = req?.params && Object.keys(req.params).length > 0 ? sanitizePayload(req.params) : undefined;
      const rawBody = (req as any)?.validatedBody || req?.body;
      const cleanBody = rawBody && typeof rawBody === "object" && Object.keys(rawBody).length > 0 ? sanitizePayload(rawBody) : undefined;

      const reqId =
        (req as any)?.id ||
        (req as any)?.requestId ||
        (req?.headers ? (req.headers["x-request-id"] || req.headers["x-correlation-id"]) : undefined) ||
        ((req as any)?.res?.getHeader ? (req as any).res.getHeader("x-request-id") : undefined);

      const startTime = (req as any)?._startTime;
      const durationMs = startTime ? Date.now() - startTime : undefined;
      const statusCode = (req as any)?.res?.statusCode || 200;

      const httpContext = req
        ? {
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode,
            durationMs,
            requestId: typeof reqId === "string" ? reqId : undefined,
            query: cleanQuery,
            params: cleanParams,
            requestBody: cleanBody,
          }
        : undefined;

      const cleanOldPayload = options.oldPayload ? sanitizePayload(options.oldPayload) : undefined;
      const cleanNewPayload = options.newPayload ? sanitizePayload(options.newPayload) : undefined;
      const computedDiff = options.diff || calculateDiff(cleanOldPayload, cleanNewPayload) || undefined;
      const cleanMetadata = options.metadata ? sanitizePayload(options.metadata) : undefined;

      const status: "SUCCESS" | "FAILED" =
        options.status ||
        (options.errorMessage || ((req as any)?.res?.statusCode && (req as any).res.statusCode >= 400)
          ? "FAILED"
          : "SUCCESS");

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
        oldPayload: cleanOldPayload,
        newPayload: cleanNewPayload,
        diff: computedDiff,
        metadata: cleanMetadata,
        status,
        errorMessage: options.errorMessage,
        createdAt: new Date().toISOString(),
      };

      // Non-blocking asynchronous dispatch with direct Mongo fallback
      publishAuditLog(payload).catch(async (err) => {
        logger.warn("RabbitMQ publish unavailable, writing audit log to MongoDB fallback", {
          module: options.module,
          action: options.action,
          reason: err?.message || String(err),
        });

        try {
          await connectMongo(env.MONGO_URI);
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
        } catch (dbErr) {
          logger.error("Failed to write fallback audit log to MongoDB", { error: dbErr });
        }
      });

      return true;
    } catch (err) {
      logger.error("Error constructing audit log payload", { error: err });
      return false;
    }
  }
}


