// src/Modules/Stations/StationDTO.ts

export {
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
  type CreateStationDTO,
  type UpdateStationDTO,
  type AssignStationUserDTO,
  type AssignStationProfileDTO,
  type ReassignProfileDTO,
  type SelectStationDTO,
  type LeaveStationDTO,
  type CreateStationTypeDTO,
  type UpdateStationTypeDTO,
  type CreateStationStatusDTO,
  type UpdateStationStatusDTO,
  type CreateStationRoleDTO,
  type UpdateStationRoleDTO,
  type CreateProfileWithStationsDTO,
  type UpdateProfileWithStationsDTO,
  type AssignProfileToStationsDTO,
  type StationCapabilities,
  type StationProfileAssignmentItem,
  type StationUserAssignmentItem,
  type StationSessionItem,
  type StationItem,
  type ProfileAssignedStation,
  type ProfileManagementItem,
  type ActiveStationContext,
  type UserStationSessionsState,
  normalizeMacAddress,
  isValidMacAddress,
  isValidIpOrSubnet,
  isIpInCidr,
  normalizeIpAddress,
} from "@workspace/shared"

export interface GetStationsQuery {
  page?: number | string
  limit?: number | string
  search?: string
  stationTypeId?: string
  statusId?: string
  branchId?: string
  departmentId?: string
  isSales?: boolean | string
  isOperational?: boolean | string
  isActive?: boolean | string
}

export interface StationStats {
  totalStations: number
  activeStations: number
  salesStations: number
  maintenanceStations: number
  totalActiveSessions: number
  totalProfilesAssigned: number
}
