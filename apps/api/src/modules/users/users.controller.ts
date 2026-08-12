import { Request, Response, NextFunction } from "express";
import { UsersService } from "./users.service";

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  public async inviteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = req.user!.id;
      const { email, first_name, last_name, employee_id, designation_id, system_role } =
        req.body || {};

      if (!email || !first_name || !last_name || !employee_id || !designation_id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Missing required user invitation fields",
          },
        });
      }

      const result = await this.usersService.inviteUser(
        actorId,
        {
          email,
          first_name,
          last_name,
          employee_id,
          designation_id,
          system_role,
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
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: error.message || "Failed to invite user",
        },
      });
    }
  }

  public async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.usersService.listUsers(page, limit);

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
