import { Request, Response, NextFunction } from "express";
import { RbacService, ResourceScope } from "./rbac.service";
import { container } from "@/infra/container";

export type ScopeResolver = (req: Request) => ResourceScope | undefined;

export function authorize(
  permissionCode: string,
  scopeResolver?: ScopeResolver,
  rbacServiceGetter?: (req: Request) => RbacService
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    try {
      // Resolve rbac service from container/req or fallback
      const rbacService: RbacService = rbacServiceGetter
        ? rbacServiceGetter(req)
        : (req.app.get("rbacService") as RbacService) || container.rbacService;

      if (!rbacService) {
        throw new Error("RbacService not found in container");
      }

      const scope = scopeResolver ? scopeResolver(req) : undefined;
      const allowed = await rbacService.can(req.user.id, permissionCode, scope);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Insufficient permissions to perform this action",
          },
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
