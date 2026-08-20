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
  canChatView?: boolean;
  canChatSend?: boolean;
  canSendClientMessage?: boolean;
  canPinMessage?: boolean;
  canManageTypes?: boolean;
  canLeadApprove?: boolean;
  canSalesDispatch?: boolean;
  canRequestRevision?: boolean;
  canManageCollateral?: boolean;
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

// ============================================================================
// REAL-TIME MESSAGING, APPROVAL & WORKSPACE SCHEMAS
// ============================================================================

export const createProjectMessageSchema = z.object({
  text: z.string().default(""),
  purpose: z.enum(["INTERNAL_DISCUSSION", "CLIENT_COMMUNICATION"]).default("INTERNAL_DISCUSSION"),
  clientDirection: z.enum(["INBOUND", "OUTBOUND"]).optional().nullable(),
  clientMessageType: z.string().optional().nullable(),
  messageTypeId: z.string().uuid().optional().nullable(),
  variant: z.string().optional().nullable(),
  replyToMessageId: z.string().optional().nullable(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        url: z.string(),
        thumbnailUrl: z.string().optional().nullable(),
        fileSizeBytes: z.number().optional().nullable(),
        extension: z.string().optional().nullable(),
        mimeType: z.string().optional().nullable(),
      }),
    )
    .optional(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export const toggleReactionSchema = z.object({
  emoji: z.string().min(1, "Emoji is required"),
});

export const markMessagesSeenSchema = z.object({
  messageIds: z.array(z.string().uuid("Invalid message ID format")).min(1),
});

export const leadApproveSchema = z.object({
  notes: z.string().max(1000).optional().nullable(),
});

export const salesDispatchSchema = z.object({
  dispatchPlatform: z.string().min(1, "Dispatch platform is required"),
  dispatchReferenceId: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const requestRevisionSchema = z.object({
  rejectionReason: z.string().min(1, "Revision feedback is required").max(1000),
});

export const createMessageTypeSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  label: z.string().min(1, "Label is required").max(100),
  direction: z.enum(["INTERNAL", "OUTBOUND", "INBOUND"]).default("OUTBOUND"),
  colorHex: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/, "Must be a valid hex color code").default("#10b981"),
  description: z.string().max(255).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  requiresApproval: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

export const updateMessageTypeSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  colorHex: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/).optional(),
  description: z.string().max(255).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  requiresApproval: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const createProjectMilestoneSchema = z.object({
  title: z.string().min(1, "Milestone title is required").max(200),
  dueDate: z.string().datetime("Must be a valid ISO date-time"),
  assignedToUserId: z.string().uuid().optional().nullable(),
  deliverableCount: z.number().min(0).default(0),
});

export const updateProjectMilestoneSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  dueDate: z.string().datetime().optional(),
  isCompleted: z.boolean().optional(),
  assignedToUserId: z.string().uuid().optional().nullable(),
  deliverableCount: z.number().min(0).optional(),
});

export const createProjectLinkSchema = z.object({
  title: z.string().min(1, "Link title is required").max(150),
  url: z.string().url("Must be a valid URL"),
  category: z.string().default("Other"),
  description: z.string().max(500).optional().nullable(),
});

// ============================================================================
// REAL-TIME MESSAGING, APPROVAL & WORKSPACE TYPES
// ============================================================================

export type CreateProjectMessageDTO = z.infer<typeof createProjectMessageSchema>;
export type ToggleReactionDTO = z.infer<typeof toggleReactionSchema>;
export type MarkMessagesSeenDTO = z.infer<typeof markMessagesSeenSchema>;
export type LeadApproveDTO = z.infer<typeof leadApproveSchema>;
export type SalesDispatchDTO = z.infer<typeof salesDispatchSchema>;
export type RequestRevisionDTO = z.infer<typeof requestRevisionSchema>;
export type CreateMessageTypeDTO = z.infer<typeof createMessageTypeSchema>;
export type UpdateMessageTypeDTO = z.infer<typeof updateMessageTypeSchema>;
export type CreateProjectMilestoneDTO = z.infer<typeof createProjectMilestoneSchema>;
export type UpdateProjectMilestoneDTO = z.infer<typeof updateProjectMilestoneSchema>;
export type CreateProjectLinkDTO = z.infer<typeof createProjectLinkSchema>;

export interface MessageReactionItem {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
}

export interface MessageReadReceiptItem {
  userId: string;
  userName: string;
  userAvatar?: string | null;
  userDesignation?: string | null;
  seenAt: string;
}

export interface ApprovalStageAuditItem {
  id: string;
  stageName: string;
  stageKey: "DRAFTED" | "LEAD_REVIEW" | "SALES_DISPATCH" | "DISPATCHED" | "REVISION_REQUESTED";
  actorName: string;
  actorAvatar?: string | null;
  actorRole: string;
  timestamp: string;
  durationMinutes?: number | null;
  notes?: string | null;
}

export interface ApprovalWorkflowItem {
  id: string;
  status: "PENDING_LEAD" | "PENDING_SALES" | "DISPATCHED" | "REVISION_REQUESTED" | "NOT_REQUIRED";
  clientMessageType?: string | null;
  requestedBy: string;
  requestedAt: string;
  targetClient: string;
  slaTargetMinutes: number;
  slaStatus: "ON_TRACK" | "AT_RISK" | "BREACHED";
  auditTrail: ApprovalStageAuditItem[];
  leadApprovedBy?: string | null;
  leadApprovedAt?: string | null;
  salesDispatchedBy?: string | null;
  salesDispatchedAt?: string | null;
  dispatchPlatform?: string | null;
  dispatchReferenceId?: string | null;
  rejectionReason?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
}

export interface ProjectMessageAttachmentItem {
  id: string;
  name: string;
  type: string;
  url: string;
  thumbnailUrl?: string | null;
  fileSizeBytes?: number | null;
  extension?: string | null;
  mimeType?: string | null;
}

export interface ProjectMessageCapabilities {
  canLeadApprove?: boolean;
  canSalesDispatch?: boolean;
  canRequestRevision?: boolean;
  canPin?: boolean;
  canDelete?: boolean;
  canEdit?: boolean;
}

export interface ProjectMessageItem {
  id: string;
  projectId: string;
  projectCode: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  senderDesignation?: string | null;
  senderRole?: string | null;
  isCurrentUser: boolean;
  isFromClient: boolean;
  text: string;
  timestamp: string;
  dateGroup: string;
  purpose: "INTERNAL_DISCUSSION" | "CLIENT_COMMUNICATION";
  clientDirection?: "INBOUND" | "OUTBOUND" | null;
  clientMessageType?: string | null;
  variant?: string | null;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  } | null;
  attachments?: ProjectMessageAttachmentItem[];
  reactions?: MessageReactionItem[];
  seenBy?: MessageReadReceiptItem[];
  approval?: ApprovalWorkflowItem | null;
  metadata?: Record<string, any> | null;
  isPinned?: boolean;
  _capabilities?: ProjectMessageCapabilities;
}

export interface MessageTypeItem {
  id: string;
  code: string;
  label: string;
  direction: "INTERNAL" | "OUTBOUND" | "INBOUND";
  colorHex: string;
  description?: string | null;
  icon?: string | null;
  requiresApproval: boolean;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface ProjectMilestoneItem {
  id: string;
  projectId: string;
  title: string;
  dueDate: string;
  isCompleted: boolean;
  assignedTo?: string | null;
  assignedToUser?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
  deliverableCount?: number;
  completedAt?: string | null;
}

export interface ProjectLinkItem {
  id: string;
  projectId: string;
  title: string;
  url: string;
  category: "Figma" | "GitHub" | "Jira" | "Docs" | "Staging" | "Other" | string;
  description?: string | null;
  addedAt: string;
  addedBy?: {
    id: string;
    name: string;
  } | null;
}

export interface WorkspaceMemberItem {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  designation?: string | null;
  role: string;
  isOnline: boolean;
  department?: string | null;
  shift?: string | null;
  lastSeen?: string | null;
}

export interface ProjectTeamSummaryItem {
  id: string;
  name: string;
  departmentName?: string | null;
  leadName?: string | null;
  memberCount: number;
}

export interface ProjectWorkspaceItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  client: {
    name: string;
    email?: string | null;
    company?: string | null;
    avatar?: string | null;
    platform?: string | null;
  };
  status: {
    id: string;
    name: string;
    color?: string | null;
    isTerminal?: boolean;
  };
  priority: {
    id: string;
    name: string;
    level: number;
    color?: string | null;
  };
  serviceLine?: string | null;
  orderSource?: string | null;
  budget?: string | number | null;
  deadline?: string | null;
  progress: number;
  isPinned?: boolean;
  unreadCount?: number;
  pendingApprovalsCount?: number;
  onlineCount?: number;
  pinnedAnnouncements?: {
    id: string;
    messageId: string;
    message: string;
    author: string;
    authorAvatar?: string | null;
    authorDesignation?: string | null;
    timestamp: string;
  }[];
  lead?: WorkspaceMemberItem | null;
  teams: ProjectTeamSummaryItem[];
  members: WorkspaceMemberItem[];
  links: ProjectLinkItem[];
  milestones: ProjectMilestoneItem[];
  lastMessage?: {
    id: string;
    senderName: string;
    text: string;
    timestamp: string;
    isRead: boolean;
    purpose?: string;
  } | null;
  lastActivityAt?: string | null;
  createdAt?: string | null;
  attentionType?: "CLIENT_MESSAGE" | "PENDING_APPROVAL" | "REVISION_REQUESTED" | "NEW_MESSAGE" | null;
  _capabilities?: ProjectCapabilities;
}

