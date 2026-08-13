// src/middleware/requirePermission.ts

import { Request, Response, NextFunction } from "express";
import { AuthenticationError, AuthorizationError } from "@/core/errors/AppError";
import { can } from "@/core/authorization/AuthorizationEngine";
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
        designationId: req.user.designationId,
        email: (req.user as any).email || undefined,
        ipAddress,
        userAgent,
      };

      const isAllowed = await can(user, permissionCode, resource);

      if (!isAllowed) {
        return next(
          new AuthorizationError(
            `Access denied: Missing required permission '${permissionCode}'`,
          ),
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
