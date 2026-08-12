import { AuditLogModel, connectMongo } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { env } from "@/env";

export interface AuditLogQueryFilters {
  module?: string;
  action?: string;
  entityTable?: string;
  entityId?: string;
  actorId?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export class AuditLogQueryService {
  private logger = new AppLogger("AuditLogQueryService");

  private async ensureConnection() {
    await connectMongo(env.MONGO_URI);
  }

  public async getAuditLogs(filters: AuditLogQueryFilters) {
    await this.ensureConnection();

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (filters.module) query.module = filters.module;
    if (filters.action) query.action = filters.action;
    if (filters.entityTable) query.entityTable = filters.entityTable;
    if (filters.entityId) query.entityId = filters.entityId;
    if (filters.actorId) query["actor.id"] = filters.actorId;
    if (filters.status) query.status = filters.status;

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    const [logs, total] = await Promise.all([
      AuditLogModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLogModel.countDocuments(query),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public async getAuditLogById(id: string) {
    await this.ensureConnection();
    const log = await AuditLogModel.findOne({
      $or: [{ _id: id }, { auditId: id }],
    }).lean();
    return log;
  }

  public async getAuditStats() {
    await this.ensureConnection();

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalLogs, logsLast24h, moduleStats, topActions] = await Promise.all([
      AuditLogModel.countDocuments({}),
      AuditLogModel.countDocuments({ createdAt: { $gte: last24Hours } }),
      AuditLogModel.aggregate([
        { $group: { _id: "$module", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLogModel.aggregate([
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return {
      totalLogs,
      logsLast24h,
      moduleStats,
      topActions,
    };
  }
}
