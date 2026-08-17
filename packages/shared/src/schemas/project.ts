import { z } from "zod";

// ============================================================================
// REQUEST VALIDATION SCHEMAS (ZOD)
// ============================================================================

export const createProjectComponentInputSchema = z.object({
  name: z.string().min(1, "Component name is required").max(100, "Component name cannot exceed 100 characters"),
  statusId: z.string().uuid("Invalid status ID format"),
});

export const initialMemberInputSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  roleId: z.string().uuid("Invalid assignment role ID format"),
  note: z.string().max(255).optional().nullable(),
});

export const createProjectSchema = z.object({
  projectName: z
    .string()
    .min(2, "Project name must be at least 2 characters")
    .max(150, "Project name cannot exceed 150 characters"),
  orderId: z
    .string()
    .min(1, "Order ID is required")
    .max(100, "Order ID cannot exceed 100 characters"),
  clientId: z.string().uuid("Invalid client ID format"),
  profileId: z.string().uuid("Invalid profile ID format"),
  serviceLineId: z.string().uuid("Invalid service line ID format").optional().nullable(),
  statusId: z.string().uuid("Invalid status ID format"),
  value: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Project value must be a non-negative number")
    .optional()
    .default(0),
  orderSheetUrl: z
    .string()
    .url("Order sheet URL must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  startDate: z.string().datetime().optional().nullable().or(z.literal("")),
  deliveryDate: z.string().datetime().optional().nullable().or(z.literal("")),
  assignedTeamIds: z.array(z.string().uuid("Invalid team ID format")).optional(),
  initialMembers: z.array(initialMemberInputSchema).optional(),
  initialComponents: z.array(createProjectComponentInputSchema).optional(),
});

export const updateProjectSchema = z.object({
  projectName: z.string().min(2).max(150).optional(),
  orderId: z.string().min(1).max(100).optional(),
  clientId: z.string().uuid().optional(),
  profileId: z.string().uuid().optional(),
  serviceLineId: z.string().uuid().optional().nullable(),
  statusId: z.string().uuid().optional(),
  value: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Project value must be a non-negative number")
    .optional(),
  orderSheetUrl: z
    .string()
    .url("Order sheet URL must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  startDate: z.string().datetime().optional().nullable().or(z.literal("")),
  deliveryDate: z.string().datetime().optional().nullable().or(z.literal("")),
});

export const assignProjectTeamSchema = z.object({
  teamId: z.string().uuid("Invalid team ID format"),
  note: z.string().max(255).optional().nullable(),
});

export const assignProjectMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  roleId: z.string().uuid("Invalid assignment role ID format"),
  note: z.string().max(255).optional().nullable(),
});

export const updateProjectMemberSchema = z.object({
  roleId: z.string().uuid("Invalid assignment role ID format").optional(),
  note: z.string().max(255).optional().nullable(),
});

export const createProjectComponentSchema = z.object({
  name: z.string().min(1, "Component name is required").max(100),
  statusId: z.string().uuid("Invalid status ID format"),
  teamIds: z.array(z.string().uuid()).optional(),
  memberAssignments: z.array(initialMemberInputSchema).optional(),
});

export const updateProjectComponentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  statusId: z.string().uuid().optional(),
});

export const assignComponentMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  roleId: z.string().uuid("Invalid assignment role ID format"),
  note: z.string().max(255).optional().nullable(),
});

// Quick Creation Schemas (for dynamic modals)
export const createQuickClientSchema = z.object({
  name: z.string().min(1, "Client name is required").max(150, "Client name is too long"),
  platformId: z.string().uuid("Invalid platform ID format"),
  contactNotes: z.string().max(1000).optional().nullable(),
});

export const createQuickProfileSchema = z.object({
  platformId: z.string().uuid("Invalid platform ID format"),
  username: z.string().min(1, "Profile username is required").max(100, "Username is too long"),
  isActive: z.boolean().optional().default(true),
});

export const createQuickPlatformSchema = z.object({
  name: z.string().min(1, "Platform name is required").max(100, "Platform name is too long"),
  code: z.string().min(1).max(50).optional(),
});

export const createQuickServiceLineSchema = z.object({
  name: z.string().min(1, "Service line name is required").max(150, "Service line name is too long"),
  slug: z.string().max(100).optional(),
  parentServiceLineId: z.string().uuid().optional().nullable(),
});

export const createQuickStatusSchema = z.object({
  name: z.string().min(1, "Status name is required").max(100, "Status name is too long"),
  code: z.string().min(1).max(50).optional(),
  color: z.string().max(30).optional().nullable(),
  requiresAction: z.boolean().optional().default(false),
  isTerminal: z.boolean().optional().default(false),
});

// Types inferred from Zod schemas
export type CreateProjectDTO = z.infer<typeof createProjectSchema>;
export type UpdateProjectDTO = z.infer<typeof updateProjectSchema>;
export type AssignProjectTeamDTO = z.infer<typeof assignProjectTeamSchema>;
export type AssignProjectMemberDTO = z.infer<typeof assignProjectMemberSchema>;
export type UpdateProjectMemberDTO = z.infer<typeof updateProjectMemberSchema>;
export type CreateProjectComponentDTO = z.infer<typeof createProjectComponentSchema>;
export type UpdateProjectComponentDTO = z.infer<typeof updateProjectComponentSchema>;
export type AssignComponentMemberDTO = z.infer<typeof assignComponentMemberSchema>;
export type CreateQuickClientDTO = z.infer<typeof createQuickClientSchema>;
export type CreateQuickProfileDTO = z.infer<typeof createQuickProfileSchema>;
export type CreateQuickPlatformDTO = z.infer<typeof createQuickPlatformSchema>;
export type CreateQuickServiceLineDTO = z.infer<typeof createQuickServiceLineSchema>;
export type CreateQuickStatusDTO = z.infer<typeof createQuickStatusSchema>;

// ============================================================================
// DOMAIN ENTITIES & VIEW MODELS
// ============================================================================

export interface ProjectCapabilities {
  canEdit: boolean;
  canDelete: boolean;
  canReassign: boolean;
  canManageMembers: boolean;
  canManageComponents: boolean;
  canViewClient: boolean;
  canViewFinancials: boolean;
  canEditFinancials: boolean;
}

export interface ProjectStatusItem {
  id: string;
  code: string;
  name: string;
  requiresAction: boolean;
  isTerminal: boolean;
  sortOrder: number;
  color: string | null;
  isActive: boolean;
}

export interface PlatformItem {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface ProfileItem {
  id: string;
  platformId: string;
  username: string;
  isActive: boolean;
  platform?: PlatformItem;
}

export interface ClientItem {
  id: string;
  name: string;
  platformId: string;
  contactNotes?: string | null;
  platform?: PlatformItem;
}

export interface ServiceLineItem {
  id: string;
  parentServiceLineId?: string | null;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface ProjectTeamAssignmentItem {
  id: string;
  projectId: string;
  teamId: string;
  assignedAt: string | Date;
  unassignedAt?: string | Date | null;
  note?: string | null;
  team: {
    id: string;
    name: string;
    slug: string;
    shift?: string | null;
    department: {
      id: string;
      code: string;
      name: string;
    };
  };
}

export interface ProjectUserAssignmentItem {
  id: string;
  projectId: string;
  userId: string;
  roleId: string;
  assignedAt: string | Date;
  unassignedAt?: string | Date | null;
  note?: string | null;
  user: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    systemRole: string;
    isActive: boolean;
  };
  role: {
    id: string;
    code: string;
    name: string;
    qualifiesForTeamScope: boolean;
  };
}

export interface ComponentTeamAssignmentItem {
  id: string;
  componentId: string;
  teamId: string;
  assignedAt: string | Date;
  unassignedAt?: string | Date | null;
  note?: string | null;
  team: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface ComponentUserAssignmentItem {
  id: string;
  componentId: string;
  userId: string;
  roleId: string;
  assignedAt: string | Date;
  unassignedAt?: string | Date | null;
  note?: string | null;
  user: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  role: {
    id: string;
    code: string;
    name: string;
  };
}

export interface ProjectComponentItem {
  id: string;
  projectId: string;
  name: string;
  statusId: string;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  status: ProjectStatusItem;
  teamAssignments?: ComponentTeamAssignmentItem[];
  userAssignments?: ComponentUserAssignmentItem[];
}

export interface ProjectItem {
  id: string;
  orderId: string;
  projectName: string;
  statusId: string;
  clientId: string | null;
  profileId: string;
  serviceLineId: string | null;
  value: number | string | null;
  orderSheetUrl: string | null;
  startDate: string | Date | null;
  deliveryDate: string | Date | null;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  deletedAt?: string | Date | null;

  // Relations
  status: ProjectStatusItem;
  profile: ProfileItem;
  serviceLine?: ServiceLineItem | null;
  client?: ClientItem | null;
  teamAssignments: ProjectTeamAssignmentItem[];
  userAssignments: ProjectUserAssignmentItem[];
  components: ProjectComponentItem[];

  _count?: {
    components: number;
    userAssignments: number;
    teamAssignments: number;
    issues: number;
  };

  _capabilities?: ProjectCapabilities;
}

export interface ProjectDetailItem extends ProjectItem {
  activeTeams: ProjectTeamAssignmentItem[];
  pastTeams: ProjectTeamAssignmentItem[];
  activeMembers: ProjectUserAssignmentItem[];
  pastMembers: ProjectUserAssignmentItem[];
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  inProgressProjects: number;
  inReviewProjects: number;
  deliveredProjects: number;
  totalPipelineValue: number | null; // null if unauthorized to view financials
}

export interface ProjectLookups {
  statuses: ProjectStatusItem[];
  platforms: PlatformItem[];
  profiles: ProfileItem[];
  serviceLines: ServiceLineItem[];
  clients: ClientItem[];
  assignmentRoles: {
    id: string;
    code: string;
    name: string;
    qualifiesForTeamScope: boolean;
  }[];
  teams: {
    id: string;
    name: string;
    slug: string;
    departmentId: string;
    department: {
      id: string;
      code: string;
      name: string;
    };
  }[];
}
