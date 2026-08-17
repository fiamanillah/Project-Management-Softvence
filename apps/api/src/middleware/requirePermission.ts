// src/middleware/requirePermission.ts

import { Request, Response, NextFunction } from "express";
import { AuthenticationError, AuthorizationError } from "@/core/errors/AppError";
import { can } from "@/core/authorization/AuthorizationEngine";
import { AuditLogService } from "@/core/audit/audit.service";
import type { AuthorizationResourceContext } from "@/core/authorization/authorization.types";

export type ResourceLoader = (
  req: Request,
) => Promise<AuthorizationResourceContext | undefined> | AuthorizationResourceContext | undefined;

export function requirePermission(
  permissionCode: string,
  resourceLoader?: ResourceLoader,
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError("Authentication required: Token missing"));
    }

    try {
      let resource: AuthorizationResourceContext | undefined = undefined;
      if (resourceLoader) {
        resource = await resourceLoader(req);
      }

      const ipAddress =
        (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || undefined;
      const userAgent = req.headers["user-agent"] || undefined;

      const user = {
        id: req.user.sub,
        systemRole: req.user.systemRole,
        roleId: req.user.roleId || (req.user as any).designationId || "",
        designationId: req.user.designationId || null,
        email: (req.user as any).email || undefined,
        ipAddress,
        userAgent,
      };

      const isAllowed = await can(user, permissionCode, resource);

      if (!isAllowed) {
        // Log non-blocking 403 access denial event to RabbitMQ -> MongoDB pipeline
        AuditLogService.log({
          module: "Authorization",
          action: "ACCESS_DENIED",
          entityTable: "permissions",
          entityId: permissionCode,
          actor: {
            id: user.id,
            email: user.email,
            role: user.systemRole,
            ipAddress,
            userAgent,
          },
          req,
          metadata: {
            permissionCode,
            resource,
          },
          status: "FAILED",
          errorMessage: "You don't have access to this resource",
        });

        // Always return generic 403 error message (no information disclosure)
        return next(new AuthorizationError("You don't have access to this resource"));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
