import type { PrismaClient } from "@workspace/db"
import type { CacheManager } from "@workspace/cache"
import { NotFoundError } from "@/core/errors/AppError"
import type { AuthenticatedUser } from "@/core/authorization/authorization.types"
import type { GetStationsQuery, StationItem, StationStats } from "../StationDTO"
import {
  sanitizeAndDecorateStation,
  batchSanitizeAndDecorateStations,
  buildStationScopedWhereConditions,
} from "./stations.capability.helper"

export class StationsQueryService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cacheManager?: CacheManager
  ) {}

  /**
   * List stations with pagination, multi-attribute filtering, scoped authorization,
   * and capability decoration (Rules BE-1, BE-11, BE-17).
   */
  public async getStations(
    query: GetStationsQuery,
    actor: AuthenticatedUser
  ): Promise<{
    items: StationItem[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNext: boolean
      hasPrevious: boolean
    }
  }> {
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
    const skip = (page - 1) * limit

    const andConditions: any[] = [{ deletedAt: null }]

    // Scoped query restriction for non-SuperAdmin users
    if (actor.systemRole !== "SuperAdmin") {
      const scopedConditions = await buildStationScopedWhereConditions(
        this.prisma,
        actor
      )
      if (scopedConditions && scopedConditions.length > 0) {
        andConditions.push({ OR: scopedConditions })
      }
    }

    // Search query
    if (query.search && query.search.trim() !== "") {
      const search = query.search.trim()
      andConditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      })
    }

    // Additional filters
    if (query.stationTypeId && query.stationTypeId !== "all") {
      andConditions.push({ stationTypeId: query.stationTypeId })
    }

    if (query.statusId && query.statusId !== "all") {
      andConditions.push({ statusId: query.statusId })
    }

    if (query.branchId && query.branchId !== "all") {
      andConditions.push({ branchId: query.branchId })
    }

    if (query.departmentId && query.departmentId !== "all") {
      andConditions.push({ departmentId: query.departmentId })
    }

    if (query.isSales !== undefined && query.isSales !== "all") {
      andConditions.push({
        stationType: { isSales: String(query.isSales) === "true" },
      })
    }

    if (query.isOperational !== undefined && query.isOperational !== "all") {
      andConditions.push({
        status: { isOperational: String(query.isOperational) === "true" },
      })
    }

    if (query.isActive !== undefined && query.isActive !== "all") {
      andConditions.push({ isActive: String(query.isActive) === "true" })
    }

    const where: any = { AND: andConditions }

    const [total, records] = await Promise.all([
      this.prisma.station.count({ where }),
      this.prisma.station.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }],
        include: {
          stationType: true,
          status: true,
          branch: true,
          department: true,
          stationProfiles: {
            where: { unassignedAt: null },
            include: {
              profile: {
                include: {
                  platform: true,
                  _count: {
                    select: { projects: { where: { deletedAt: null } } },
                  },
                },
              },
              assignedBy: true,
            },
          },
          assignedUsers: {
            where: { unassignedAt: null },
            include: {
              user: true,
              role: true,
            },
          },
          sessions: {
            where: { isCurrent: true, leftAt: null },
            include: { user: true },
          },
        },
      }),
    ])

    const items = await batchSanitizeAndDecorateStations(records, actor)

    const totalPages = Math.ceil(total / limit) || 1

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    }
  }

  /**
   * Get single station by ID or code with full relations and capability decoration.
   * Cached in Redis (station:raw:{id}) with automatic capability decoration per actor.
   */
  public async getStationById(
    id: string,
    actor: AuthenticatedUser
  ): Promise<StationItem> {
    const cacheKey = `station:raw:${id.toLowerCase()}`

    // 1. Check Redis Cache
    if (this.cacheManager) {
      try {
        const cachedRaw = await this.cacheManager.get<any>(cacheKey)
        if (cachedRaw) {
          return sanitizeAndDecorateStation(cachedRaw, actor)
        }
      } catch {
        // Fallback to database on cache error
      }
    }

    // 2. Query Database
    const station = await this.prisma.station.findFirst({
      where: {
        OR: [{ id }, { code: id.toUpperCase() }],
        deletedAt: null,
      },
      include: {
        stationType: true,
        status: true,
        branch: true,
        department: true,
        stationProfiles: {
          where: { unassignedAt: null },
          include: {
            profile: {
              include: {
                platform: true,
                _count: {
                  select: { projects: { where: { deletedAt: null } } },
                },
              },
            },
            assignedBy: true,
          },
        },
        assignedUsers: {
          where: { unassignedAt: null },
          include: {
            user: true,
            role: true,
          },
        },
        sessions: {
          where: { isCurrent: true, leftAt: null },
          include: { user: true },
        },
      },
    })

    if (!station) {
      throw new NotFoundError("Station not found")
    }

    // 3. Cache raw record in Redis for 1 hour (3600 seconds)
    if (this.cacheManager) {
      try {
        await Promise.all([
          this.cacheManager.set(
            `station:raw:${station.id.toLowerCase()}`,
            station,
            { ttlSeconds: 3600 }
          ),
          this.cacheManager.set(
            `station:raw:${station.code.toLowerCase()}`,
            station,
            { ttlSeconds: 3600 }
          ),
        ])
      } catch {
        // Non-blocking
      }
    }

    return sanitizeAndDecorateStation(station, actor)
  }

  /**
   * Get stations assigned to the current requesting user.
   * Cached in Redis for high-frequency workspace and header queries.
   */
  public async getMyStations(actor: AuthenticatedUser): Promise<StationItem[]> {
    const cacheKey = `station:user_assigned:raw:${actor.id}`

    if (this.cacheManager) {
      try {
        const cachedRaw = await this.cacheManager.get<any[]>(cacheKey)
        if (cachedRaw && Array.isArray(cachedRaw)) {
          return batchSanitizeAndDecorateStations(cachedRaw, actor)
        }
      } catch {
        // Fallback to database on cache error
      }
    }

    const records = await this.prisma.station.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        assignedUsers: {
          some: {
            userId: actor.id,
            unassignedAt: null,
          },
        },
      },
      orderBy: { name: "asc" },
      include: {
        stationType: true,
        status: true,
        branch: true,
        department: true,
        stationProfiles: {
          where: { unassignedAt: null },
          include: {
            profile: {
              include: {
                platform: true,
                _count: {
                  select: { projects: { where: { deletedAt: null } } },
                },
              },
            },
            assignedBy: true,
          },
        },
        assignedUsers: {
          where: { unassignedAt: null },
          include: {
            user: true,
            role: true,
          },
        },
        sessions: {
          where: { isCurrent: true, leftAt: null },
          include: { user: true },
        },
      },
    })

    if (this.cacheManager) {
      try {
        await this.cacheManager.set(cacheKey, records, { ttlSeconds: 3600 })
      } catch {
        // Non-blocking
      }
    }

    return batchSanitizeAndDecorateStations(records, actor)
  }

  /**
   * Invalidate cached station raw records.
   */
  public async invalidateStation(id: string, code?: string): Promise<void> {
    if (!this.cacheManager) return
    const keys = [
      `station:raw:${id.toLowerCase()}`,
      `station:detail:${id.toLowerCase()}`,
    ]
    if (code) {
      keys.push(
        `station:raw:${code.toLowerCase()}`,
        `station:detail:${code.toLowerCase()}`
      )
    }
    keys.push("station:stats")
    await this.cacheManager.del(keys).catch(() => {})
  }

  /**
   * Invalidate cached assigned stations for a user.
   */
  public async invalidateUserAssigned(userId: string): Promise<void> {
    if (!this.cacheManager) return
    await this.cacheManager
      .del(`station:user_assigned:raw:${userId}`)
      .catch(() => {})
  }

  /**
   * Get operational station statistics.
   * Cached in Redis for 30s to handle high-traffic dashboard polling.
   */
  public async getStationStats(
    _actor: AuthenticatedUser
  ): Promise<StationStats> {
    const cacheKey = "station:stats"
    if (this.cacheManager) {
      try {
        const cached = await this.cacheManager.get<StationStats>(cacheKey)
        if (cached) return cached
      } catch {
        // Non-blocking
      }
    }

    const [
      totalStations,
      activeStations,
      salesStations,
      maintenanceStations,
      totalActiveSessions,
      totalProfilesAssigned,
    ] = await Promise.all([
      this.prisma.station.count({ where: { deletedAt: null } }),
      this.prisma.station.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.station.count({
        where: { deletedAt: null, stationType: { isSales: true } },
      }),
      this.prisma.station.count({
        where: { deletedAt: null, status: { isMaintenance: true } },
      }),
      this.prisma.stationSession.count({
        where: { isCurrent: true, leftAt: null },
      }),
      this.prisma.stationProfileAssignment.count({
        where: { unassignedAt: null },
      }),
    ])

    const stats: StationStats = {
      totalStations,
      activeStations,
      salesStations,
      maintenanceStations,
      totalActiveSessions,
      totalProfilesAssigned,
    }

    if (this.cacheManager) {
      try {
        await this.cacheManager.set(cacheKey, stats, { ttlSeconds: 30 })
      } catch {
        // Non-blocking
      }
    }

    return stats
  }
}
