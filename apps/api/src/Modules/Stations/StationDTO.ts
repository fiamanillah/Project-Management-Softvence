// src/Modules/Stations/StationDTO.ts

export {
  createStationSchema,
  updateStationSchema,
  assignStationUserSchema,
  assignStationProfileSchema,
  reassignProfileSchema,
  selectStationSchema,
  createStationTypeSchema,
  updateStationTypeSchema,
  createStationStatusSchema,
  updateStationStatusSchema,
  createStationRoleSchema,
  updateStationRoleSchema,
  type CreateStationDTO,
  type UpdateStationDTO,
  type AssignStationUserDTO,
  type AssignStationProfileDTO,
  type ReassignProfileDTO,
  type SelectStationDTO,
  type CreateStationTypeDTO,
  type UpdateStationTypeDTO,
  type CreateStationStatusDTO,
  type UpdateStationStatusDTO,
  type CreateStationRoleDTO,
  type UpdateStationRoleDTO,
  type StationCapabilities,
  type StationProfileAssignmentItem,
  type StationUserAssignmentItem,
  type StationSessionItem,
  type StationItem,
  type ActiveStationContext,
} from "@workspace/shared";

export interface GetStationsQuery {
  page?: number | string;
  limit?: number | string;
  search?: string;
  stationTypeId?: string;
  statusId?: string;
  branchId?: string;
  departmentId?: string;
  isSales?: boolean | string;
  isOperational?: boolean | string;
  isActive?: boolean | string;
}

export interface StationStats {
  totalStations: number;
  activeStations: number;
  salesStations: number;
  maintenanceStations: number;
  totalActiveSessions: number;
  totalProfilesAssigned: number;
}
