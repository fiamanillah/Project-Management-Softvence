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
    .min(1)
    .max(150)
    .optional(),
  service: z.string().max(200).optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  orderLink: z
    .string()
    .url("Order link must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  orderId: z
    .string()
    .min(1, "Order ID is required")
    .max(100, "Order ID cannot exceed 100 characters"),
  branchId: z.string().uuid("Invalid branch ID format").optional().nullable(),
  parentId: z.string().uuid("Invalid parent project ID format").optional().nullable(),
  parentOrderId: z.string().max(100).optional().nullable(),
  clientId: z.string().uuid("Invalid client ID format"),
  profileId: z.string().uuid("Invalid profile ID format"),
  serviceLineId: z.string().uuid("Invalid service line ID format").optional().nullable(),
  statusId: z.string().uuid("Invalid status ID format"),
  orderSourceId: z.string().uuid("Invalid order source ID format").optional().nullable(),
  value: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Project value must be a non-negative number")
    .optional()
    .default(0),
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => (val === "" || val === null || val === undefined ? null : Number(val)))
    .refine((val) => val === null || (!isNaN(val) && val >= 0), "Amount must be a non-negative number")
    .optional()
    .nullable(),
  percentage: z
    .union([z.number(), z.string()])
    .transform((val) => (val === "" || val === null || val === undefined ? null : Number(val)))
    .refine((val) => val === null || (!isNaN(val) && val >= 0 && val <= 100), "Percentage must be between 0 and 100")
    .optional()
    .nullable(),
  remarks: z.string().max(5000).optional().nullable(),
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
  projectName: z.string().min(1).max(150).optional(),
  service: z.string().max(200).optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  orderLink: z
    .string()
    .url("Order link must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  orderId: z.string().min(1).max(100).optional(),
  branchId: z.string().uuid("Invalid branch ID format").optional().nullable(),
  parentId: z.string().uuid("Invalid parent project ID format").optional().nullable(),
  parentOrderId: z.string().max(100).optional().nullable(),
  clientId: z.string().uuid().optional(),
  profileId: z.string().uuid().optional(),
  serviceLineId: z.string().uuid().optional().nullable(),
  statusId: z.string().uuid().optional(),
  orderSourceId: z.string().uuid().optional().nullable(),
  value: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Project value must be a non-negative number")
    .optional(),
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => (val === "" || val === null || val === undefined ? null : Number(val)))
    .refine((val) => val === null || (!isNaN(val) && val >= 0), "Amount must be a non-negative number")
    .optional()
    .nullable(),
  percentage: z
    .union([z.number(), z.string()])
    .transform((val) => (val === "" || val === null || val === undefined ? null : Number(val)))
    .refine((val) => val === null || (!isNaN(val) && val >= 0 && val <= 100), "Percentage must be between 0 and 100")
    .optional()
    .nullable(),
  remarks: z.string().max(5000).optional().nullable(),
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
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  company: z.string().max(150).optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable().or(z.literal("")),
  country: z.string().max(100).optional().nullable().or(z.literal("")),
  website: z.string().url("Invalid website URL").optional().nullable().or(z.literal("")),
  contactNotes: z.string().max(2000).optional().nullable().or(z.literal("")),
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

export const createQuickOrderSourceSchema = z.object({
  name: z.string().min(1, "Order source name is required").max(100, "Order source name is too long"),
  code: z.string().min(1).max(50).optional(),
  description: z.string().max(255).optional().nullable(),
});

// Types inferred from Zod schemas
export type CreateProjectDTO = z.input<typeof createProjectSchema>;
export type UpdateProjectDTO = z.infer<typeof updateProjectSchema>;
export type AssignProjectTeamDTO = z.infer<typeof assignProjectTeamSchema>;
export type AssignProjectMemberDTO = z.infer<typeof assignProjectMemberSchema>;
export type UpdateProjectMemberDTO = z.infer<typeof updateProjectMemberSchema>;
export type CreateProjectComponentDTO = z.infer<typeof createProjectComponentSchema>;
export type UpdateProjectComponentDTO = z.infer<typeof updateProjectComponentSchema>;
export type AssignComponentMemberDTO = z.infer<typeof assignComponentMemberSchema>;
export type CreateQuickClientDTO = z.infer<typeof createQuickClientSchema>;
export type CreateQuickProfileDTO = z.input<typeof createQuickProfileSchema>;
export type CreateQuickPlatformDTO = z.infer<typeof createQuickPlatformSchema>;
export type CreateQuickServiceLineDTO = z.infer<typeof createQuickServiceLineSchema>;
export type CreateQuickStatusDTO = z.input<typeof createQuickStatusSchema>;
export type CreateQuickOrderSourceDTO = z.infer<typeof createQuickOrderSourceSchema>;

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

export interface OrderSourceItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
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
  email?: string | null;
  company?: string | null;
  phone?: string | null;
  country?: string | null;
  website?: string | null;
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
    avatarUrl?: string | null;
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
    avatarUrl?: string | null;
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
    avatarUrl?: string | null;
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
    avatarUrl?: string | null;
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

export interface ProjectParentSummary {
  id: string;
  orderId: string;
  projectName: string;
  status?: {
    id: string;
    code: string;
    name: string;
    color?: string | null;
    isTerminal?: boolean;
    requiresAction?: boolean;
  } | null;
}

export interface ProjectItem {
  id: string;
  branchId?: string | null;
  parentId?: string | null;
  parentOrderId?: string | null;
  orderId: string;
  projectName: string;
  service?: string | null;
  email?: string | null;
  orderLink?: string | null;
  statusId: string;
  clientId: string | null;
  profileId: string | null;
  serviceLineId: string | null;
  orderSourceId?: string | null;
  value: number | string | null;
  amount?: number | string | null;
  percentage?: number | string | null;
  remarks?: string | null;
  orderSheetUrl: string | null;
  startDate: string | Date | null;
  deliveryDate: string | Date | null;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  deletedAt?: string | Date | null;

  // Relations
  branch?: {
    id: string;
    code: string;
    name: string;
  } | null;
  parentProject?: ProjectParentSummary | null;
  subProjects?: ProjectItem[];
  status: ProjectStatusItem;
  profile?: ProfileItem | null;
  serviceLine?: ServiceLineItem | null;
  orderSource?: OrderSourceItem | null;
  client?: ClientItem | null;
  teamAssignments: ProjectTeamAssignmentItem[];
  userAssignments: ProjectUserAssignmentItem[];
  components: ProjectComponentItem[];

  _count?: {
    components: number;
    userAssignments: number;
    teamAssignments: number;
    issues: number;
    subProjects?: number;
  };

  _capabilities?: ProjectCapabilities;
}

export interface ProjectDetailItem extends ProjectItem {
  activeTeams: ProjectTeamAssignmentItem[];
  pastTeams: ProjectTeamAssignmentItem[];
  activeMembers: ProjectUserAssignmentItem[];
  pastMembers: ProjectUserAssignmentItem[];
  subProjects?: ProjectItem[];
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  inProgressProjects: number;
  inReviewProjects: number;
  deliveredProjects: number;
  totalPipelineValue: number | null; // null if unauthorized to view financials
}

export interface ProjectParentCandidate {
  id: string;
  projectName: string;
  orderId: string;
  status?: {
    name: string;
    color?: string | null;
  } | null;
}

export interface ProjectLookups {
  statuses: ProjectStatusItem[];
  platforms: PlatformItem[];
  profiles: ProfileItem[];
  serviceLines: ServiceLineItem[];
  clients: ClientItem[];
  orderSources: OrderSourceItem[];
  parentCandidates?: ProjectParentCandidate[];
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
    shift?: string | null;
    avatarUrl?: string | null;
    departmentId: string;
    department: {
      id: string;
      code: string;
      name: string;
    };
  }[];
}
