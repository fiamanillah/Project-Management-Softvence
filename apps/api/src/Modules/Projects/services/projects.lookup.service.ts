// apps/api/src/Modules/Projects/services/projects.lookup.service.ts

import type { PrismaClient } from "@workspace/db";
import {
  NotFoundError,
  ConflictError,
  AuthorizationError,
} from "@/core/errors/AppError";
import { AuditLogService } from "@/core/audit/audit.service";
import { can } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type {
  CreateQuickClientDTO,
  CreateQuickProfileDTO,
  CreateQuickPlatformDTO,
  CreateQuickServiceLineDTO,
  CreateQuickStatusDTO,
  CreateQuickOrderSourceDTO,
  ProjectLookups,
} from "../ProjectDTO";

export class ProjectsLookupService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Fetch lookups for project creation & filtering forms.
   */
  public async getLookups(actor: AuthenticatedUser): Promise<ProjectLookups> {
    const canViewClient = await can(actor, "project.client.view", undefined);

    const [
      statuses,
      platforms,
      profiles,
      serviceLines,
      orderSources,
      assignmentRoles,
      teams,
      clients,
      parentCandidates,
    ] = await Promise.all([
      this.prisma.projectStatus.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      this.prisma.platform.findMany({
        where: { isActive: true },
        orderBy: [{ name: "asc" }],
      }),
      this.prisma.profile.findMany({
        where: { isActive: true },
        include: { platform: true },
        orderBy: [{ username: "asc" }],
      }),
      this.prisma.serviceLine.findMany({
        where: { isActive: true },
        orderBy: [{ name: "asc" }],
      }),
      this.prisma.orderSource.findMany({
        where: { isActive: true },
        orderBy: [{ name: "asc" }],
      }),
      this.prisma.assignmentRole.findMany({
        where: { isActive: true },
        orderBy: [{ name: "asc" }],
      }),
      this.prisma.team.findMany({
        where: { isActive: true },
        include: { department: true },
        orderBy: [{ name: "asc" }],
      }),
      canViewClient
        ? this.prisma.client.findMany({
            include: { platform: true },
            orderBy: [{ name: "asc" }],
          })
        : Promise.resolve([]),
      this.prisma.project.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          projectName: true,
          orderId: true,
          status: {
            select: {
              name: true,
              color: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        take: 100,
      }),
    ]);

    return {
      statuses,
      platforms,
      profiles,
      serviceLines,
      orderSources,
      assignmentRoles,
      teams,
      clients,
      parentCandidates,
    };
  }

  /**
   * Search and list clients with server-side pagination, search, and platform filtering.
   */
  public async getClients(
    query: { page?: number; limit?: number; search?: string; platformId?: string },
    actor: AuthenticatedUser,
  ) {
    const hasViewAccess = await can(actor, "project.client.view", undefined);
    if (!hasViewAccess) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.platformId) {
      where.platformId = query.platformId;
    }
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { company: { contains: s, mode: "insensitive" } },
        { email: { contains: s, mode: "insensitive" } },
        { country: { contains: s, mode: "insensitive" } },
      ];
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        include: { platform: true },
        orderBy: [{ name: "asc" }],
      }),
      this.prisma.client.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: clients,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Quick-create a new Client on the fly.
   */
  public async createClient(dto: CreateQuickClientDTO, actor: AuthenticatedUser) {
    const hasPermission = await can(actor, "project.create", undefined);
    if (!hasPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const platform = await this.prisma.platform.findUnique({
      where: { id: dto.platformId },
    });
    if (!platform) throw new NotFoundError("Selected platform does not exist");

    const client = await this.prisma.client.create({
      data: {
        name: dto.name.trim(),
        platformId: dto.platformId,
        email: dto.email?.trim() || null,
        company: dto.company?.trim() || null,
        phone: dto.phone?.trim() || null,
        country: dto.country?.trim() || null,
        website: dto.website?.trim() || null,
        contactNotes: dto.contactNotes?.trim() || null,
      },
      include: {
        platform: true,
      },
    });

    AuditLogService.log({
      module: "Projects",
      action: "CREATE_CLIENT",
      entityTable: "clients",
      entityId: client.id,
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.systemRole,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      metadata: { name: client.name, platformId: client.platformId, email: client.email },
      status: "SUCCESS",
    });

    return client;
  }

  /**
   * Quick-create a new Profile on the fly.
   */
  public async createProfile(dto: CreateQuickProfileDTO, actor: AuthenticatedUser) {
    const hasPermission = await can(actor, "project.create", undefined);
    if (!hasPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const platform = await this.prisma.platform.findUnique({
      where: { id: dto.platformId },
    });
    if (!platform) throw new NotFoundError("Selected platform does not exist");

    const existing = await this.prisma.profile.findUnique({
      where: {
        platformId_username: {
          platformId: dto.platformId,
          username: dto.username.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictError(`Profile '${dto.username}' already exists on this platform`);
    }

    const profile = await this.prisma.profile.create({
      data: {
        platformId: dto.platformId,
        username: dto.username.trim(),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        platform: true,
      },
    });

    AuditLogService.log({
      module: "Projects",
      action: "CREATE_PROFILE",
      entityTable: "profiles",
      entityId: profile.id,
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.systemRole,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      metadata: { username: profile.username, platformId: profile.platformId },
      status: "SUCCESS",
    });

    return profile;
  }

  /**
   * Quick-create a new Platform on the fly.
   */
  public async createPlatform(dto: CreateQuickPlatformDTO, actor: AuthenticatedUser) {
    const hasPermission = await can(actor, "project.create", undefined);
    if (!hasPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const code = (dto.code || dto.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")).trim();
    const existing = await this.prisma.platform.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictError(`Platform with code '${code}' already exists`);
    }

    const platform = await this.prisma.platform.create({
      data: {
        name: dto.name.trim(),
        code,
        isActive: true,
      },
    });

    AuditLogService.log({
      module: "Projects",
      action: "CREATE_PLATFORM",
      entityTable: "platforms",
      entityId: platform.id,
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.systemRole,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      metadata: { name: platform.name, code: platform.code },
      status: "SUCCESS",
    });

    return platform;
  }

  /**
   * Quick-create a new ServiceLine on the fly.
   */
  public async createServiceLine(
    dto: CreateQuickServiceLineDTO,
    actor: AuthenticatedUser,
  ) {
    const hasPermission = await can(actor, "project.create", undefined);
    if (!hasPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const slug = (
      dto.slug ||
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    ).trim();
    const existing = await this.prisma.serviceLine.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictError(`Service Line with slug '${slug}' already exists`);
    }

    const serviceLine = await this.prisma.serviceLine.create({
      data: {
        name: dto.name.trim(),
        slug,
        parentServiceLineId: dto.parentServiceLineId || null,
        isActive: true,
      },
    });

    AuditLogService.log({
      module: "Projects",
      action: "CREATE_SERVICE_LINE",
      entityTable: "service_lines",
      entityId: serviceLine.id,
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.systemRole,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      metadata: { name: serviceLine.name, slug: serviceLine.slug },
      status: "SUCCESS",
    });

    return serviceLine;
  }

  /**
   * Quick-create a new ProjectStatus on the fly.
   */
  public async createStatus(dto: CreateQuickStatusDTO, actor: AuthenticatedUser) {
    const hasPermission = await can(actor, "project.create", undefined);
    if (!hasPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const code = (dto.code || dto.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")).trim();
    const existing = await this.prisma.projectStatus.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictError(`Project Status with code '${code}' already exists`);
    }

    const highestSort = await this.prisma.projectStatus.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const status = await this.prisma.projectStatus.create({
      data: {
        name: dto.name.trim(),
        code,
        color: dto.color?.trim() || null,
        requiresAction: dto.requiresAction || false,
        isTerminal: dto.isTerminal || false,
        sortOrder: (highestSort?.sortOrder || 0) + 1,
        isActive: true,
      },
    });

    AuditLogService.log({
      module: "Projects",
      action: "CREATE_STATUS",
      entityTable: "project_statuses",
      entityId: status.id,
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.systemRole,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      metadata: { name: status.name, code: status.code },
      status: "SUCCESS",
    });

    return status;
  }

  /**
   * Quick-create a new OrderSource on the fly.
   */
  public async createOrderSource(
    dto: CreateQuickOrderSourceDTO,
    actor: AuthenticatedUser,
  ) {
    const hasPermission = await can(actor, "project.create", undefined);
    if (!hasPermission) {
      throw new AuthorizationError("You don't have access to this resource");
    }

    const code = (dto.code || dto.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")).trim();
    const existing = await this.prisma.orderSource.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictError(`Order Source with code '${code}' already exists`);
    }

    const orderSource = await this.prisma.orderSource.create({
      data: {
        name: dto.name.trim(),
        code,
        description: dto.description?.trim() || null,
        isActive: true,
      },
    });

    AuditLogService.log({
      module: "Projects",
      action: "CREATE_ORDER_SOURCE",
      entityTable: "order_sources",
      entityId: orderSource.id,
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.systemRole,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      metadata: { name: orderSource.name, code: orderSource.code },
      status: "SUCCESS",
    });

    return orderSource;
  }
}
