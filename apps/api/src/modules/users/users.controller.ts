import { Request, Response, NextFunction } from "express";
import { UsersService } from "./users.service";

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  public async inviteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = req.user!.id;
      const body = req.body || {};
      const email = body.email;
      const firstName = body.firstName || body.first_name;
      const lastName = body.lastName || body.last_name;
      const designationId = body.designationId || body.designation_id;
      const employeeId = body.employeeId || body.employee_id;
      const systemRole = body.systemRole || body.system_role;

      if (!email || !firstName || !lastName || !designationId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Missing required user invitation fields (email, firstName, lastName, designationId)",
          },
        });
      }

      const result = await this.usersService.inviteUser(
        actorId,
        {
          email,
          first_name: firstName,
          last_name: lastName,
          employee_id: employeeId,
          designation_id: designationId,
          system_role: systemRole,
        },
        {
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        }
      );

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error.statusCode === 403 || error.message?.includes("Only SuperAdmin")) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: error.message || "Forbidden",
          },
        });
      }
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: error.message || "Failed to invite user",
        },
      });
    }
  }

  public async regenerateInviteLink(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = req.user!.id;
      const targetUserId = req.params.id as string;

      const result = await this.usersService.regenerateInviteLink(actorId, targetUserId, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: error.message || "Failed to regenerate invite link",
        },
      });
    }
  }

  public async revokeInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = req.user!.id;
      const targetUserId = req.params.id as string;

      const result = await this.usersService.revokeInvite(actorId, targetUserId, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: error.message || "Failed to revoke invitation",
        },
      });
    }
  }

  public async reactivateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = req.user!.id;
      const targetUserId = req.params.id as string;

      const result = await this.usersService.reactivateUser(actorId, targetUserId, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: error.message || "Failed to reactivate user",
        },
      });
    }
  }

  public async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await this.usersService.listUsers(page, limit, { status, search });

      return res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error: any) {
      return next(error);
    }
  }

  public async deactivateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = req.user!.id;
      const targetUserId = req.params.id as string;

      const result = await this.usersService.deactivateUser(actorId, targetUserId, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: error.message || "Failed to deactivate user",
        },
      });
    }
  }

  public async listDesignations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.usersService.listDesignations();
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return next(error);
    }
  }
}
