import type { Request, Response, NextFunction } from "express";
import type { AuditLogQueryService } from "./audit-log.service";
import { NotFoundError } from "@/core/errors/AppError";

export class AuditLogController {
  constructor(private readonly auditLogQueryService: AuditLogQueryService) {}

  public async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        module: req.query.module as string,
        action: req.query.action as string,
        entityTable: req.query.entityTable as string,
        entityId: req.query.entityId as string,
        actorId: req.query.actorId as string,
        status: req.query.status as string,
        search: req.query.search as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };

      const result = await this.auditLogQueryService.getAuditLogs(filters);

      res.status(200).json({
        success: true,
        message: "Audit logs retrieved successfully",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getAuditLogById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const log = await this.auditLogQueryService.getAuditLogById(id);


      if (!log) {
        throw new NotFoundError(`Audit log with ID ${id} not found`);
      }

      res.status(200).json({
        success: true,
        message: "Audit log retrieved successfully",
        data: log,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getAuditStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await this.auditLogQueryService.getAuditStats();

      res.status(200).json({
        success: true,
        message: "Audit statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
