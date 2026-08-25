// src/Modules/Stations/stations.controller.ts

import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { StationsService } from "./stations.service";
import type {
  CreateStationDTO,
  UpdateStationDTO,
  AssignStationUserDTO,
  AssignStationProfileDTO,
  ReassignProfileDTO,
  SelectStationDTO,
  CreateStationTypeDTO,
  UpdateStationTypeDTO,
  CreateStationStatusDTO,
  UpdateStationStatusDTO,
  CreateStationRoleDTO,
  UpdateStationRoleDTO,
} from "./StationDTO";

function getActor(req: Request) {
  if (!req.user) return undefined;
  return {
    id: req.user.sub,
    systemRole: req.user.systemRole,
    roleId: req.user.roleId,
    designationId: req.user.designationId,
    branchId: req.user.branchId,
    email: (req.user as any).email,
    ipAddress:
      (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || undefined,
    userAgent: req.headers["user-agent"] || undefined,
  };
}

export class StationsController extends BaseController {
  constructor(private readonly stationsService: StationsService) {
    super();
  }

  // ==========================================
  // STATION QUERY HANDLERS
  // ==========================================

  public async getStations(req: Request, res: Response) {
    const actor = getActor(req);
    const result = await this.stationsService.query.getStations(req.query as any, actor!);
    return this.sendPaginatedResponse(
      req,
      res,
      result.pagination,
      "Stations retrieved successfully",
      result.items,
    );
  }

  public async getStationStats(req: Request, res: Response) {
    const actor = getActor(req);
    const stats = await this.stationsService.query.getStationStats(actor!);
    return this.sendResponse(req, res, "Station statistics retrieved successfully", 200, stats);
  }

  public async getMyStations(req: Request, res: Response) {
    const actor = getActor(req);
    const stations = await this.stationsService.query.getMyStations(actor!);
    return this.sendResponse(req, res, "My eligible stations retrieved successfully", 200, stations);
  }

  public async getActiveSession(req: Request, res: Response) {
    const actor = getActor(req);
    const session = await this.stationsService.session.getActiveSession(actor!);
    return this.sendResponse(
      req,
      res,
      session ? "Active station session retrieved" : "No active station session",
      200,
      session,
    );
  }

  public async getActiveSessions(req: Request, res: Response) {
    const actor = getActor(req);
    const sessionsState = await this.stationsService.session.getActiveSessions(actor!);
    return this.sendResponse(
      req,
      res,
      "Active station sessions retrieved successfully",
      200,
      sessionsState,
    );
  }

  public async getStationById(req: Request, res: Response) {
    const actor = getActor(req);
    const stationId = req.params.id as string;
    const station = await this.stationsService.query.getStationById(stationId, actor!);
    return this.sendResponse(req, res, "Station details retrieved successfully", 200, station);
  }

  // ==========================================
  // STATION MUTATION HANDLERS
  // ==========================================

  public async createStation(req: Request, res: Response) {
    const actor = getActor(req);
    const dto = req.validatedBody as CreateStationDTO;
    const station = await this.stationsService.mutation.createStation(dto, actor!, req);
    return this.sendCreatedResponse(req, res, station, "Station created successfully");
  }

  public async updateStation(req: Request, res: Response) {
    const actor = getActor(req);
    const stationId = req.params.id as string;
    const dto = req.validatedBody as UpdateStationDTO;
    const updated = await this.stationsService.mutation.updateStation(stationId, dto, actor!, req);
    return this.sendResponse(req, res, "Station updated successfully", 200, updated);
  }

  public async deleteStation(req: Request, res: Response) {
    const actor = getActor(req);
    const stationId = req.params.id as string;
    const result = await this.stationsService.mutation.deleteStation(stationId, actor!, req);
    return this.sendResponse(req, res, result.message, 200, result);
  }

  // ==========================================
  // SESSION LIFECYCLE HANDLERS
  // ==========================================

  public async selectStation(req: Request, res: Response) {
    const actor = getActor(req);
    const dto = (req.validatedBody || { stationId: req.params.id }) as SelectStationDTO;
    const context = await this.stationsService.session.selectStation(dto, actor!, req);
    return this.sendResponse(req, res, "Station selected successfully", 200, context);
  }

  public async leaveStation(req: Request, res: Response) {
    const actor = getActor(req);
    const stationId =
      (req.params.id as string) ||
      (req.validatedBody as any)?.stationId ||
      (req.body?.stationId as string) ||
      (req.query?.stationId as string) ||
      undefined;
    const result = await this.stationsService.session.leaveStation(actor!, stationId, req);
    return this.sendResponse(req, res, result.message, 200, result);
  }

  // ==========================================
  // ASSIGNMENTS & PROFILE REASSIGNMENTS
  // ==========================================

  public async assignUser(req: Request, res: Response) {
    const actor = getActor(req);
    const stationId = req.params.id as string;
    const dto = req.validatedBody as AssignStationUserDTO;
    const assignment = await this.stationsService.assignment.assignUser(stationId, dto, actor!, req);
    return this.sendCreatedResponse(req, res, assignment, "User assigned to station successfully");
  }

  public async unassignUser(req: Request, res: Response) {
    const actor = getActor(req);
    const stationId = req.params.id as string;
    const userId = req.params.userId as string;
    const result = await this.stationsService.assignment.unassignUser(stationId, userId, actor!, req);
    return this.sendResponse(req, res, result.message, 200, result);
  }

  public async assignProfile(req: Request, res: Response) {
    const actor = getActor(req);
    const stationId = req.params.id as string;
    const dto = req.validatedBody as AssignStationProfileDTO;
    const assignment = await this.stationsService.assignment.assignProfile(stationId, dto, actor!, req);
    return this.sendCreatedResponse(req, res, assignment, "Profile assigned to station successfully");
  }

  public async unassignProfile(req: Request, res: Response) {
    const actor = getActor(req);
    const stationId = req.params.id as string;
    const profileId = req.params.profileId as string;
    const result = await this.stationsService.assignment.unassignProfile(stationId, profileId, actor!, req);
    return this.sendResponse(req, res, result.message, 200, result);
  }

  public async reassignProfile(req: Request, res: Response) {
    const actor = getActor(req);
    const dto = req.validatedBody as ReassignProfileDTO;
    const result = await this.stationsService.assignment.reassignProfile(dto, actor!, req);
    return this.sendResponse(req, res, result.message, 200, result.assignment);
  }

  // ==========================================
  // LOOKUPS HANDLERS
  // ==========================================

  public async getStationTypes(req: Request, res: Response) {
    const types = await this.stationsService.lookup.getStationTypes();
    return this.sendResponse(req, res, "Station types retrieved successfully", 200, types);
  }

  public async createStationType(req: Request, res: Response) {
    const dto = req.validatedBody as CreateStationTypeDTO;
    const created = await this.stationsService.lookup.createStationType(dto);
    return this.sendCreatedResponse(req, res, created, "Station type created successfully");
  }

  public async updateStationType(req: Request, res: Response) {
    const id = req.params.id as string;
    const dto = req.validatedBody as UpdateStationTypeDTO;
    const updated = await this.stationsService.lookup.updateStationType(id, dto);
    return this.sendResponse(req, res, "Station type updated successfully", 200, updated);
  }

  public async getStationStatuses(req: Request, res: Response) {
    const statuses = await this.stationsService.lookup.getStationStatuses();
    return this.sendResponse(req, res, "Station statuses retrieved successfully", 200, statuses);
  }

  public async createStationStatus(req: Request, res: Response) {
    const dto = req.validatedBody as CreateStationStatusDTO;
    const created = await this.stationsService.lookup.createStationStatus(dto);
    return this.sendCreatedResponse(req, res, created, "Station status created successfully");
  }

  public async updateStationStatus(req: Request, res: Response) {
    const id = req.params.id as string;
    const dto = req.validatedBody as UpdateStationStatusDTO;
    const updated = await this.stationsService.lookup.updateStationStatus(id, dto);
    return this.sendResponse(req, res, "Station status updated successfully", 200, updated);
  }

  public async getStationRoles(req: Request, res: Response) {
    const roles = await this.stationsService.lookup.getStationRoles();
    return this.sendResponse(req, res, "Station roles retrieved successfully", 200, roles);
  }

  public async createStationRole(req: Request, res: Response) {
    const dto = req.validatedBody as CreateStationRoleDTO;
    const created = await this.stationsService.lookup.createStationRole(dto);
    return this.sendCreatedResponse(req, res, created, "Station role created successfully");
  }

  public async updateStationRole(req: Request, res: Response) {
    const idParam = req.params.id as string;
    const dtoBody = req.validatedBody as UpdateStationRoleDTO;
    const updated = await this.stationsService.lookup.updateStationRole(idParam, dtoBody);
    return this.sendResponse(req, res, "Station role updated successfully", 200, updated);
  }

  public async getStationScopeContext(req: Request, res: Response) {
    const actor = getActor(req);
    const scopeContext = await this.stationsService.lookup.getStationScopeContext(actor!);
    return this.sendResponse(
      req,
      res,
      "Station scope context retrieved successfully",
      200,
      scopeContext,
    );
  }

  // ==========================================
  // PLATFORM PROFILES MANAGEMENT HANDLERS
  // ==========================================

  public async getProfiles(req: Request, res: Response) {
    const result = await this.stationsService.profile.getProfiles(req.query as any);
    return this.sendPaginatedResponse(
      req,
      res,
      result.pagination,
      "Platform profiles retrieved successfully",
      result.items,
    );
  }

  public async getProfileById(req: Request, res: Response) {
    const id = req.params.id as string;
    const profile = await this.stationsService.profile.getProfileById(id);
    return this.sendResponse(req, res, "Profile retrieved successfully", 200, profile);
  }

  public async createProfile(req: Request, res: Response) {
    const actor = getActor(req);
    const dto = req.validatedBody;
    const profile = await this.stationsService.profile.createProfile(dto, actor!, req);
    return this.sendCreatedResponse(req, res, profile, "Profile created successfully");
  }

  public async updateProfile(req: Request, res: Response) {
    const actor = getActor(req);
    const id = req.params.id as string;
    const dto = req.validatedBody;
    const updated = await this.stationsService.profile.updateProfile(id, dto, actor!, req);
    return this.sendResponse(req, res, "Profile updated successfully", 200, updated);
  }

  public async deleteProfile(req: Request, res: Response) {
    const actor = getActor(req);
    const id = req.params.id as string;
    const result = await this.stationsService.profile.deleteProfile(id, actor!, req);
    return this.sendResponse(req, res, result.message, 200, result);
  }

  public async assignProfileToStations(req: Request, res: Response) {
    const actor = getActor(req);
    const id = req.params.id as string;
    const dto = req.validatedBody;
    const result = await this.stationsService.profile.assignToStations(id, dto, actor!, req);
    return this.sendResponse(req, res, "Profile assigned to workstation(s) successfully", 200, result);
  }

  public async removeProfileFromStation(req: Request, res: Response) {
    const actor = getActor(req);
    const id = req.params.id as string;
    const stationId = req.params.stationId as string;
    const result = await this.stationsService.profile.removeFromStation(id, stationId, actor!, req);
    return this.sendResponse(req, res, result.message, 200, result);
  }
}
