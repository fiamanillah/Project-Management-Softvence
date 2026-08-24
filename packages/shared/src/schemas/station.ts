import { z } from "zod";

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
  ipWhitelist: z.array(z.string()).optional().default([]),
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
  ipWhitelist: z.array(z.string()).optional(),
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
  deviceInfo: z.string().optional().nullable(),
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

export interface StationItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  stationTypeId: string;
  statusId: string;
  branchId?: string | null;
  departmentId?: string | null;
  ipWhitelist: string[];
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

export interface ActiveStationContext {
  session: StationSessionItem;
  station: StationItem;
  activeProfiles: StationProfileAssignmentItem[];
  activeProfileIds: string[];
}
