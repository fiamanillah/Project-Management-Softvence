// src/Modules/Stations/stations.service.ts

import type { PrismaClient } from "@workspace/db";
import type { CacheManager } from "@workspace/cache";
import { AppLogger } from "@/core/logging/logger";
import { StationsQueryService } from "./services/stations.query.service";
import { StationsMutationService } from "./services/stations.mutation.service";
import { StationsAssignmentService } from "./services/stations.assignment.service";
import { StationsSessionService } from "./services/stations.session.service";
import { StationsLookupService } from "./services/stations.lookup.service";

export class StationsService {
  private logger = new AppLogger("StationsService");

  public readonly query: StationsQueryService;
  public readonly mutation: StationsMutationService;
  public readonly assignment: StationsAssignmentService;
  public readonly session: StationsSessionService;
  public readonly lookup: StationsLookupService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly cacheManager?: CacheManager,
  ) {
    this.query = new StationsQueryService(prisma);
    this.mutation = new StationsMutationService(prisma, this.query);
    this.assignment = new StationsAssignmentService(prisma, cacheManager);
    this.session = new StationsSessionService(prisma, cacheManager);
    this.lookup = new StationsLookupService(prisma);
  }
}
