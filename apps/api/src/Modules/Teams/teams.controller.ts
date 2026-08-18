// src/Modules/Teams/teams.controller.ts

import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { TeamsService } from "./teams.service";
import type {
  CreateTeamDTO,
  UpdateTeamDTO,
  AddTeamMemberDTO,
  UpdateTeamMemberDTO,
} from "./TeamDTO";

function getActor(req: Request) {
  if (!req.user) return undefined;
  return {
    id: req.user.sub,
    systemRole: req.user.systemRole,
    roleId: req.user.roleId,
    designationId: req.user.designationId,
    email: (req.user as any).email,
  };
}

export class TeamsController extends BaseController {
  constructor(private readonly teamsService: TeamsService) {
    super();
  }

  public async getTeams(req: Request, res: Response) {
    const actor = getActor(req);
    const result = await this.teamsService.getTeams(req.query as any, actor);
    return this.sendPaginatedResponse(
      req,
      res,
      result.pagination,
      "Teams retrieved successfully",
      result.items,
    );
  }

  public async getTeamStats(req: Request, res: Response) {
    const actor = getActor(req);
    const stats = await this.teamsService.getTeamStats(actor);
    return this.sendResponse(req, res, "Team stats retrieved successfully", 200, stats);
  }

  public async getAssignmentRoles(req: Request, res: Response) {
    const roles = await this.teamsService.getAssignmentRoles();
    return this.sendResponse(req, res, "Assignment roles retrieved successfully", 200, roles);
  }

  public async getTeamById(req: Request, res: Response) {
    const actor = getActor(req);
    const teamId = req.params.id as string;
    const team = await this.teamsService.getTeamById(teamId, actor);
    return this.sendResponse(req, res, "Team details retrieved successfully", 200, team);
  }

  public async createTeam(req: Request, res: Response) {
    const actor = getActor(req);
    const dto = req.validatedBody as CreateTeamDTO;
    const team = await this.teamsService.createTeam(dto, actor, req);
    return this.sendCreatedResponse(req, res, team, "Team created successfully");
  }

  public async updateTeam(req: Request, res: Response) {
    const actor = getActor(req);
    const teamId = req.params.id as string;
    const dto = req.validatedBody as UpdateTeamDTO;
    const updated = await this.teamsService.updateTeam(teamId, dto, actor, req);
    return this.sendResponse(req, res, "Team updated successfully", 200, updated);
  }

  public async deleteTeam(req: Request, res: Response) {
    const actor = getActor(req);
    const teamId = req.params.id as string;
    const result = await this.teamsService.deleteTeam(teamId, actor, req);
    return this.sendResponse(req, res, result.message, 200, result);
  }

  public async uploadTeamAvatar(req: Request, res: Response) {
    const actor = getActor(req);
    const teamId = req.params.id as string;
    const file = req.file as Express.Multer.File;
    const result = await this.teamsService.uploadAvatar(teamId, file, actor, req);
    return this.sendResponse(req, res, result.message, 200, result);
  }

  public async removeTeamAvatar(req: Request, res: Response) {
    const actor = getActor(req);
    const teamId = req.params.id as string;
    const result = await this.teamsService.removeAvatar(teamId, actor, req);
    return this.sendResponse(req, res, result.message, 200, result.team);
  }

  public async getTeamMembers(req: Request, res: Response) {
    const teamId = req.params.id as string;
    const members = await this.teamsService.getTeamMembers(teamId);
    return this.sendResponse(req, res, "Team members retrieved successfully", 200, members);
  }

  public async addTeamMember(req: Request, res: Response) {
    const actor = getActor(req);
    const teamId = req.params.id as string;
    const dto = req.validatedBody as AddTeamMemberDTO;
    const member = await this.teamsService.addTeamMember(teamId, dto, actor, req);
    return this.sendCreatedResponse(req, res, member, "Team member added successfully");
  }

  public async updateTeamMember(req: Request, res: Response) {
    const actor = getActor(req);
    const teamId = req.params.id as string;
    const memberId = req.params.memberId as string;
    const dto = req.validatedBody as UpdateTeamMemberDTO;
    const updated = await this.teamsService.updateTeamMember(teamId, memberId, dto, actor, req);
    return this.sendResponse(req, res, "Team member updated successfully", 200, updated);
  }

  public async removeTeamMember(req: Request, res: Response) {
    const actor = getActor(req);
    const teamId = req.params.id as string;
    const memberId = req.params.memberId as string;
    const result = await this.teamsService.removeTeamMember(teamId, memberId, actor, req);
    return this.sendResponse(req, res, result.message, 200, result);
  }
}
