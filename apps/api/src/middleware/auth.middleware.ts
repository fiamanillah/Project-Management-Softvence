import { Request, Response, NextFunction } from "express";
import { AuthenticationError } from "@/core/errors/AppError";
import { verifyAccessToken, JWTCustomPayload } from "@/utils/crypto";
import { AuditLogService } from "@/core/audit/audit.service";

declare global {
  namespace Express {
    interface Request {
      user?: JWTCustomPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    AuditLogService.log({
      module: "AUTH",
      action: "AUTHENTICATION_FAILED",
      entityTable: "users",
      entityId: "UNAUTHENTICATED",
      status: "FAILED",
      errorMessage: "Authentication required: Bearer token missing",
      req,
    });
    return next(new AuthenticationError("Authentication required: Bearer token missing"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    AuditLogService.log({
      module: "AUTH",
      action: "AUTHENTICATION_FAILED",
      entityTable: "users",
      entityId: "UNAUTHENTICATED",
      status: "FAILED",
      errorMessage: "Unauthorized: Invalid or expired access token",
      req,
    });
    return next(new AuthenticationError("Unauthorized: Invalid or expired access token"));
  }
}
