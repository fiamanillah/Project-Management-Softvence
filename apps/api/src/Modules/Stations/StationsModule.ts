// src/Modules/Stations/StationsModule.ts

import { BaseModule } from "@/core/BaseModule";
import { StationsService } from "./stations.service";
import { StationsController } from "./stations.controller";
import { validateRequest } from "@/middleware/validation";
import { authenticate } from "@/middleware/auth.middleware";
import { requirePermission } from "@/middleware/requirePermission";
import type { PrismaClient } from "@workspace/db";
import type { CacheManager } from "@workspace/cache";
import {
  createStationSchema,
  updateStationSchema,
  assignStationUserSchema,
  assignStationProfileSchema,
  reassignProfileSchema,
  selectStationSchema,
  leaveStationSchema,
  createStationTypeSchema,
  updateStationTypeSchema,
  createStationStatusSchema,
  updateStationStatusSchema,
  createStationRoleSchema,
  updateStationRoleSchema,
  createProfileWithStationsSchema,
  updateProfileWithStationsSchema,
  assignProfileToStationsSchema,
} from "./StationDTO";

export class StationsModule extends BaseModule {
  public name: string = "StationsModule";
  public version: string = "1.0.0";
  public apiVersion: string = "v1";
  public basePath: string = "/stations";
  public dependencies?: string[] = [];

  protected async setupUseCases(): Promise<void> {
    const prisma = this.context.getService("prisma") as PrismaClient;
    const cacheManager = this.context.getService("redis") as CacheManager | undefined;
    this.registerService("StationsService", new StationsService(prisma, cacheManager));
  }

  protected async setupControllers(): Promise<void> {
    const stationsService = this.getService<StationsService>("StationsService");
    this.registerController("StationsController", new StationsController(stationsService));
  }

  protected async setupRoutes(): Promise<void> {
    const controller = this.getController<StationsController>("StationsController");
    const prisma = this.context.getService("prisma") as PrismaClient;

    // Helper resource loader for station-scoped endpoints
    const loadStationResource = async (req: any) => {
      const stationId = req.params?.id;
      if (!stationId) return undefined;
      const station = await prisma.station.findUnique({
        where: { id: stationId },
        select: { id: true, branchId: true, departmentId: true },
      });
      return station
        ? {
            stationId: station.id,
            branchId: station.branchId || undefined,
            departmentId: station.departmentId || undefined,
          }
        : undefined;
    };

    this.router.use(authenticate);

    // ==========================================
    // LOOKUPS (Dynamic Types, Statuses, Roles, Scope Context)
    // ==========================================
    this.router.get(
      "/lookups/scope-context",
      requirePermission("station.view"),
      controller.getStationScopeContext.bind(controller),
    );

    this.router.get(
      "/lookups/types",
      requirePermission("station.view"),
      controller.getStationTypes.bind(controller),
    );
    this.router.post(
      "/lookups/types",
      requirePermission("station.manage_lookups"),
      validateRequest({ body: createStationTypeSchema }),
      controller.createStationType.bind(controller),
    );
    this.router.patch(
      "/lookups/types/:id",
      requirePermission("station.manage_lookups"),
      validateRequest({ body: updateStationTypeSchema }),
      controller.updateStationType.bind(controller),
    );

    this.router.get(
      "/lookups/statuses",
      requirePermission("station.view"),
      controller.getStationStatuses.bind(controller),
    );
    this.router.post(
      "/lookups/statuses",
      requirePermission("station.manage_lookups"),
      validateRequest({ body: createStationStatusSchema }),
      controller.createStationStatus.bind(controller),
    );
    this.router.patch(
      "/lookups/statuses/:id",
      requirePermission("station.manage_lookups"),
      validateRequest({ body: updateStationStatusSchema }),
      controller.updateStationStatus.bind(controller),
    );

    this.router.get(
      "/lookups/roles",
      requirePermission("station.view"),
      controller.getStationRoles.bind(controller),
    );
    this.router.post(
      "/lookups/roles",
      requirePermission("station.manage_lookups"),
      validateRequest({ body: createStationRoleSchema }),
      controller.createStationRole.bind(controller),
    );
    this.router.patch(
      "/lookups/roles/:id",
      requirePermission("station.manage_lookups"),
      validateRequest({ body: updateStationRoleSchema }),
      controller.updateStationRole.bind(controller),
    );

    // ==========================================
    // OVERVIEW & SESSION CONTEXT
    // ==========================================
    this.router.get(
      "/stats",
      requirePermission("station.view"),
      controller.getStationStats.bind(controller),
    );

    this.router.get(
      "/my-stations",
      requirePermission("station.join"),
      controller.getMyStations.bind(controller),
    );

    this.router.get(
      "/active-session",
      requirePermission("station.join"),
      controller.getActiveSession.bind(controller),
    );

    this.router.get(
      "/active-sessions",
      requirePermission("station.join"),
      controller.getActiveSessions.bind(controller),
    );

    this.router.post(
      "/leave",
      requirePermission("station.join"),
      validateRequest({ body: leaveStationSchema.optional() }),
      controller.leaveStation.bind(controller),
    );

    this.router.post(
      "/reassign-profile",
      requirePermission("station.assign_profile"),
      validateRequest({ body: reassignProfileSchema }),
      controller.reassignProfile.bind(controller),
    );

    this.router.post(
      "/select-station",
      requirePermission("station.join"),
      validateRequest({ body: selectStationSchema }),
      controller.selectStation.bind(controller),
    );

    // ==========================================
    // PLATFORM PROFILES MANAGEMENT (Rule BE-1)
    // ==========================================
    this.router.get(
      "/profiles",
      requirePermission("station.view"),
      controller.getProfiles.bind(controller),
    );

    this.router.post(
      "/profiles",
      requirePermission("station.assign_profile"),
      validateRequest({ body: createProfileWithStationsSchema }),
      controller.createProfile.bind(controller),
    );

    this.router.get(
      "/profiles/:id",
      requirePermission("station.view"),
      controller.getProfileById.bind(controller),
    );

    this.router.patch(
      "/profiles/:id",
      requirePermission("station.assign_profile"),
      validateRequest({ body: updateProfileWithStationsSchema }),
      controller.updateProfile.bind(controller),
    );

    this.router.delete(
      "/profiles/:id",
      requirePermission("station.manage"),
      controller.deleteProfile.bind(controller),
    );

    this.router.post(
      "/profiles/:id/stations",
      requirePermission("station.assign_profile"),
      validateRequest({ body: assignProfileToStationsSchema }),
      controller.assignProfileToStations.bind(controller),
    );

    this.router.delete(
      "/profiles/:id/stations/:stationId",
      requirePermission("station.assign_profile"),
      controller.removeProfileFromStation.bind(controller),
    );

    // ==========================================
    // STATION CRUD & SUB-RESOURCES
    // ==========================================
    this.router.get(
      "/",
      requirePermission("station.view"),
      controller.getStations.bind(controller),
    );

    this.router.get(
      "/:id",
      requirePermission("station.view", loadStationResource),
      controller.getStationById.bind(controller),
    );

    this.router.post(
      "/",
      requirePermission("station.manage"),
      validateRequest({ body: createStationSchema }),
      controller.createStation.bind(controller),
    );

    this.router.patch(
      "/:id",
      requirePermission("station.manage", loadStationResource),
      validateRequest({ body: updateStationSchema }),
      controller.updateStation.bind(controller),
    );

    this.router.delete(
      "/:id",
      requirePermission("station.delete", loadStationResource),
      controller.deleteStation.bind(controller),
    );

    // Join specific station by ID
    this.router.post(
      "/:id/join",
      requirePermission("station.join", loadStationResource),
      controller.selectStation.bind(controller),
    );

    // Leave specific station by ID
    this.router.post(
      "/:id/leave",
      requirePermission("station.join", loadStationResource),
      controller.leaveStation.bind(controller),
    );

    // User Operator Assignments
    this.router.post(
      "/:id/users",
      requirePermission("station.assign_user", loadStationResource),
      validateRequest({ body: assignStationUserSchema }),
      controller.assignUser.bind(controller),
    );

    this.router.delete(
      "/:id/users/:userId",
      requirePermission("station.assign_user", loadStationResource),
      controller.unassignUser.bind(controller),
    );

    // Platform Profile Assignments
    this.router.post(
      "/:id/profiles",
      requirePermission("station.assign_profile", loadStationResource),
      validateRequest({ body: assignStationProfileSchema }),
      controller.assignProfile.bind(controller),
    );

    this.router.delete(
      "/:id/profiles/:profileId",
      requirePermission("station.assign_profile", loadStationResource),
      controller.unassignProfile.bind(controller),
    );
  }
}
