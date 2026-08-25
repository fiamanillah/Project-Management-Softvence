import { z } from "zod";

// ==========================================
// MAC & IP VALIDATION & NORMALIZATION HELPERS
// ==========================================

export function normalizeMacAddress(mac: string): string {
  const cleaned = mac.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  if (cleaned.length !== 12) return mac.trim().toUpperCase();
  return cleaned.match(/.{1,2}/g)?.join(":") || cleaned;
}

export function isValidMacAddress(mac: string): boolean {
  if (!mac || typeof mac !== "string") return false;
  const cleaned = mac.replace(/[^0-9A-Fa-f]/g, "");
  return cleaned.length === 12;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return null;
  }
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

export function isIpInCidr(clientIp: string, pattern: string): boolean {
  if (!clientIp || !pattern) return false;
  const cIp = clientIp.trim();
  const pat = pattern.trim();

  if (pat === "*" || pat === cIp) return true;

  // Wildcard pattern: e.g. 192.168.1.* or 10.0.*
  if (pat.endsWith(".*")) {
    const prefix = pat.slice(0, -1); // "192.168.1."
    return cIp.startsWith(prefix);
  }
  if (pat.endsWith("*")) {
    const prefix = pat.slice(0, -1);
    return cIp.startsWith(prefix);
  }

  // CIDR matching e.g. 192.168.1.0/24 or 10.0.0.0/8
  if (pat.includes("/")) {
    const [networkPart, prefixStr] = pat.split("/");
    const prefixLen = Number(prefixStr);
    if (networkPart && !isNaN(prefixLen) && prefixLen >= 0 && prefixLen <= 32) {
      const clientInt = ipv4ToInt(cIp);
      const networkInt = ipv4ToInt(networkPart);
      if (clientInt !== null && networkInt !== null) {
        if (prefixLen === 0) return true;
        const mask = ((0xffffffff << (32 - prefixLen)) >>> 0);
        return (clientInt & mask) === (networkInt & mask);
      }
    }
  }

  return false;
}

export function isValidIpOrSubnet(ip: string): boolean {
  if (!ip || typeof ip !== "string") return false;
  const trimmed = ip.trim();
  if (trimmed === "*") return true;
  // Wildcard subnets e.g. 192.168.1.* or 10.0.*
  if (/^(\d{1,3}\.){1,3}\*$/.test(trimmed)) return true;
  // IPv4 with CIDR e.g. 192.168.1.0/24 or single IPv4 192.168.1.10
  if (/^(\d{1,3}\.){3}\d{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/.test(trimmed)) {
    const parts = trimmed.split("/")[0]?.split(".").map(Number) || [];
    return parts.every((p) => p >= 0 && p <= 255);
  }
  // IPv6 basic validation
  if (/^[0-9a-fA-F:]+(\/\d{1,3})?$/.test(trimmed)) return true;
  return false;
}

// ==========================================
// STATION SCHEMAS & INTERFACES
// ==========================================

export const createStationSchema = z.object({
  name: z.string().min(2, "Station name is required and must be at least 2 characters"),
  code: z
    .string()
    .min(2, "Station code is required and must be at least 2 characters")
    .transform((val) => val.toUpperCase().trim()),
  description: z.string().optional().nullable(),
  stationTypeId: z.string().uuid("Invalid station type ID"),
  statusId: z.string().uuid("Invalid station status ID"),
  branchId: z.string().uuid("Invalid branch ID").optional().nullable(),
  departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
  isIpRestricted: z.boolean().optional().default(false),
  ipWhitelist: z.array(z.string()).optional().default([]),
  isMacRestricted: z.boolean().optional().default(false),
  macWhitelist: z.array(z.string()).optional().default([]),
  macAddress: z.string().optional().nullable(),
  maxConcurrentUsers: z.number().int().min(1).optional().default(1),
  isActive: z.boolean().optional().default(true),
});

export const updateStationSchema = z.object({
  name: z.string().min(2, "Station name must be at least 2 characters").optional(),
  code: z
    .string()
    .min(2, "Station code must be at least 2 characters")
    .transform((val) => val.toUpperCase().trim())
    .optional(),
  description: z.string().optional().nullable(),
  stationTypeId: z.string().uuid("Invalid station type ID").optional(),
  statusId: z.string().uuid("Invalid station status ID").optional(),
  branchId: z.string().uuid("Invalid branch ID").optional().nullable(),
  departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
  isIpRestricted: z.boolean().optional(),
  ipWhitelist: z.array(z.string()).optional(),
  isMacRestricted: z.boolean().optional(),
  macWhitelist: z.array(z.string()).optional(),
  macAddress: z.string().optional().nullable(),
  maxConcurrentUsers: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const assignStationUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  roleId: z.string().uuid("Invalid station assignment role ID format"),
  shift: z.string().max(50).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export const assignStationProfileSchema = z.object({
  profileId: z.string().uuid("Invalid profile ID format"),
  shift: z.string().max(50).optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
  note: z.string().max(500).optional().nullable(),
});

export const reassignProfileSchema = z.object({
  profileId: z.string().uuid("Invalid profile ID format"),
  fromStationId: z.string().uuid("Invalid source station ID format"),
  toStationId: z.string().uuid("Invalid target station ID format"),
  shift: z.string().max(50).optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
  note: z.string().max(500).optional().nullable(),
});

export const selectStationSchema = z.object({
  stationId: z.string().uuid("Invalid station ID format"),
  macAddress: z.string().optional().nullable(),
  deviceInfo: z.string().optional().nullable(),
});

export const leaveStationSchema = z.object({
  stationId: z.string().uuid("Invalid station ID format").optional().nullable(),
  all: z.boolean().optional().default(false),
});

// ==========================================
// DYNAMIC LOOKUP SCHEMAS
// ==========================================

export const createStationTypeSchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .transform((val) => val.toUpperCase().trim()),
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional().nullable(),
  isSales: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateStationTypeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  description: z.string().optional().nullable(),
  isSales: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const createStationStatusSchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .transform((val) => val.toUpperCase().trim()),
  name: z.string().min(2, "Name must be at least 2 characters"),
  isOperational: z.boolean().optional().default(true),
  isMaintenance: z.boolean().optional().default(false),
  color: z.string().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateStationStatusSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  isOperational: z.boolean().optional(),
  isMaintenance: z.boolean().optional(),
  color: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const createStationRoleSchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .transform((val) => val.toUpperCase().trim()),
  name: z.string().min(2, "Name must be at least 2 characters"),
  canManageProfiles: z.boolean().optional().default(false),
  canOperate: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
});

export const updateStationRoleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  canManageProfiles: z.boolean().optional(),
  canOperate: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// ==========================================
// TYPE EXPORTS
// ==========================================

export type CreateStationDTO = z.input<typeof createStationSchema>;
export type UpdateStationDTO = z.input<typeof updateStationSchema>;
export type AssignStationUserDTO = z.input<typeof assignStationUserSchema>;
export type AssignStationProfileDTO = z.input<typeof assignStationProfileSchema>;
export type ReassignProfileDTO = z.input<typeof reassignProfileSchema>;
export type SelectStationDTO = z.input<typeof selectStationSchema>;
export type LeaveStationDTO = z.input<typeof leaveStationSchema>;

export type CreateStationTypeDTO = z.input<typeof createStationTypeSchema>;
export type UpdateStationTypeDTO = z.input<typeof updateStationTypeSchema>;
export type CreateStationStatusDTO = z.input<typeof createStationStatusSchema>;
export type UpdateStationStatusDTO = z.input<typeof updateStationStatusSchema>;
export type CreateStationRoleDTO = z.input<typeof createStationRoleSchema>;
export type UpdateStationRoleDTO = z.input<typeof updateStationRoleSchema>;

export interface StationCapabilities {
  canEdit?: boolean;
  canDelete?: boolean;
  canAssignUser?: boolean;
  canAssignProfile?: boolean;
  canReassignProfile?: boolean;
  canJoin?: boolean;
  canLeave?: boolean;
}

export interface StationProfileAssignmentItem {
  id: string;
  stationId: string;
  profileId: string;
  assignedById: string;
  unassignedById?: string | null;
  assignedAt: string | Date;
  unassignedAt?: string | Date | null;
  shift?: string | null;
  isPrimary: boolean;
  note?: string | null;
  profile?: {
    id: string;
    username: string;
    isActive: boolean;
    platform?: {
      id: string;
      code: string;
      name: string;
    } | null;
    _count?: {
      projects?: number;
    };
  };
  assignedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface StationUserAssignmentItem {
  id: string;
  stationId: string;
  userId: string;
  roleId: string;
  assignedById: string;
  unassignedById?: string | null;
  assignedAt: string | Date;
  unassignedAt?: string | Date | null;
  shift?: string | null;
  note?: string | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
    systemRole: string;
  };
  role?: {
    id: string;
    code: string;
    name: string;
    canManageProfiles: boolean;
    canOperate: boolean;
  };
}

export interface StationSessionItem {
  id: string;
  stationId: string;
  userId: string;
  refreshTokenId?: string | null;
  ipAddress?: string | null;
  deviceInfo?: string | null;
  joinedAt: string | Date;
  leftAt?: string | Date | null;
  lastActiveAt: string | Date;
  isCurrent: boolean;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  };
  station?: {
    id: string;
    code: string;
    name: string;
  };
}

export const createProfileWithStationsSchema = z.object({
  username: z.string().min(2, "Profile username is required and must be at least 2 characters"),
  platformId: z.string().uuid("Invalid platform ID"),
  isActive: z.boolean().optional().default(true),
  stationIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateProfileWithStationsSchema = z.object({
  username: z.string().min(2, "Profile username must be at least 2 characters").optional(),
  platformId: z.string().uuid("Invalid platform ID").optional(),
  isActive: z.boolean().optional(),
  stationIds: z.array(z.string().uuid()).optional(),
});

export const assignProfileToStationsSchema = z.object({
  stationIds: z.array(z.string().uuid("Invalid station ID")).min(1, "Select at least one station"),
  shift: z.string().max(50).optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
  note: z.string().max(500).optional().nullable(),
});

export type CreateProfileWithStationsDTO = z.input<typeof createProfileWithStationsSchema>;
export type UpdateProfileWithStationsDTO = z.input<typeof updateProfileWithStationsSchema>;
export type AssignProfileToStationsDTO = z.input<typeof assignProfileToStationsSchema>;

export interface StationItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  stationTypeId: string;
  statusId: string;
  branchId?: string | null;
  departmentId?: string | null;
  isIpRestricted: boolean;
  ipWhitelist: string[];
  isMacRestricted: boolean;
  macWhitelist: string[];
  macAddress?: string | null;
  maxConcurrentUsers: number;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  deletedAt?: string | Date | null;
  stationType?: {
    id: string;
    code: string;
    name: string;
    isSales: boolean;
  };
  status?: {
    id: string;
    code: string;
    name: string;
    isOperational: boolean;
    isMaintenance: boolean;
    color?: string | null;
  };
  branch?: {
    id: string;
    code: string;
    name: string;
  } | null;
  department?: {
    id: string;
    code: string;
    name: string;
  } | null;
  activeProfilesCount?: number;
  activeUsersCount?: number;
  activeProfiles?: StationProfileAssignmentItem[];
  assignedUsers?: StationUserAssignmentItem[];
  currentSessions?: StationSessionItem[];
  _capabilities?: StationCapabilities;
}

export interface ProfileAssignedStation {
  id: string;
  stationId: string;
  station: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    branch?: { id: string; name: string } | null;
    department?: { id: string; name: string } | null;
  };
  shift?: string | null;
  isPrimary: boolean;
  note?: string | null;
  assignedAt: string | Date;
}

export interface ProfileManagementItem {
  id: string;
  username: string;
  platformId: string;
  isActive: boolean;
  createdAt: string | Date;
  platform: {
    id: string;
    code: string;
    name: string;
  };
  assignedStations: ProfileAssignedStation[];
  stationIds: string[];
  _count?: {
    projects?: number;
    stationAssignments?: number;
    sellers?: number;
  };
}

export interface ActiveStationContext {
  session: StationSessionItem;
  station: StationItem;
  activeProfiles: StationProfileAssignmentItem[];
  activeProfileIds: string[];
}

export interface UserStationSessionsState {
  activeSessions: ActiveStationContext[];
  activeStationIds: string[];
  currentStationId?: string | null;
  currentStation?: StationItem | null;
  allActiveProfiles: StationProfileAssignmentItem[];
  allActiveProfileIds: string[];
}

export interface StationTypeItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSales: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface StationStatusItem {
  id: string;
  code: string;
  name: string;
  isOperational: boolean;
  isMaintenance: boolean;
  color?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface StationRoleItem {
  id: string;
  code: string;
  name: string;
  canManageProfiles: boolean;
  canOperate: boolean;
  isActive: boolean;
}

export interface StationStats {
  totalStations: number;
  activeStations: number;
  salesStations: number;
  activeUsersCount: number;
  activeProfilesCount: number;
}

export interface StationScopeContext {
  canSelectBranch: boolean;
  canSelectDepartment: boolean;
  isBranchRestricted: boolean;
  isDepartmentRestricted: boolean;
  defaultBranchId?: string | null;
  defaultDepartmentId?: string | null;
  authorizedBranches: Array<{ id: string; code: string; name: string }>;
  authorizedDepartments: Array<{ id: string; code: string; name: string; branchId?: string | null }>;
}
