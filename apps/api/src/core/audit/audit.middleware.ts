import type { Request, Response, NextFunction } from "express";
import { AuditLogService, type LogAuditEventOptions } from "./audit.service";

declare global {
  namespace Express {
    interface Request {
      auditLog?: (options: Omit<LogAuditEventOptions, "req">) => Promise<boolean>;
    }
  }
}

export function auditMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.auditLog = (options: Omit<LogAuditEventOptions, "req">) => {
    return AuditLogService.log({
      ...options,
      req,
    });
  };
  next();
}
