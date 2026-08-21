// 1. Two primary message stream purposes
export type MessagePurpose =
  | "INTERNAL_DISCUSSION"   // Internal team conversations, standups, technical notes
  | "CLIENT_COMMUNICATION"; // Client communication (inbound relays & outbound dispatches)

// 2. Direction for client communications
export type ClientMessageDirection = "INBOUND" | "OUTBOUND";

// 3. Dynamic client message sub-types / intent (extensible string union)
export type ClientMessageType =
  | "DELIVERY"            // Official deliverable submission / milestone handover
  | "EXTENSION_REQUEST"   // Timeline / deadline extension request
  | "STATUS_UPDATE"       // Milestone / sprint progress update
  | "GENERAL_NOTICE"      // General client communication / notice
  | "CLIENT_REPLY"        // Reply to client queries & feedback
  | "PAYMENT_ESCROW"      // Escrow / invoice milestone request
  | "SCOPE_REVISION"      // Scope / requirement clarification
  | "MEETING_SUMMARY"     // Client meeting notes & action items
  | "CLIENT_FEEDBACK"     // Inbound: Client feedback & comments
  | "INQUIRY"             // Inbound: Client questions & inquiry
  | "CHANGE_REQUEST"      // Inbound: Scope change / revision request
  | "APPROVAL_CONFIRM"    // Inbound: Milestone approval sign-off
  | "ASSET_SUBMISSION"    // Inbound: Client shared assets/brief
  | "ESCROW_CONFIRM"      // Inbound: Escrow funding confirmed
  | "BUG_REPORT"          // Inbound: Bug report from client
  | string;

// Backwards-compatible alias
export type OutboundMessageType = ClientMessageType;

export type ApprovalStatus =
  | "NOT_REQUIRED"        // Internal team chats or inbound client notes
  | "IN_REVIEW"           // Step 1: In Review stage
  | "PENDING_LEAD"        // Legacy alias for IN_REVIEW
  | "PENDING_SALES"       // Step 2: Approved internally, awaiting Sales / AM dispatch to client
  | "DISPATCHED"          // Step 3: Successfully sent to client
  | "REVISION_REQUESTED"; // Rejected / Needs revision

export interface MessageReadReceipt {
  userId: string;
  userName: string;
  userAvatar: string;
  userDesignation?: string;
  seenAt: string;
}

export interface ApprovalStageAudit {
  id: string;
  stageName: string;
  stageKey:
    | "DRAFTED"
    | "DRAFT_EDITED"
    | "LEAD_REVIEW"
    | "LEAD_EDIT"
    | "SALES_DISPATCH"
    | "SALES_EDIT"
    | "DISPATCHED"
    | "REVISION_REQUESTED"
    | "REVISION_RESUBMITTED"
    | "POST_DISPATCH_EDIT"
    | "CANCELLED"
    | string;
  actorName: string;
  actorAvatar?: string;
  actorRole: string;
  timestamp: string;
  durationMinutes?: number;
  notes?: string;
}

export interface ProjectMessageRevision {
  id: string;
  messageId: string;
  content: string;
  editedById: string;
  editorName: string;
  editorAvatar?: string | null;
  editorDesignation?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface ApprovalWorkflow {
  id: string;
  status: ApprovalStatus;
  clientMessageType?: ClientMessageType;
  outboundType?: ClientMessageType; // alias
  requestedBy: string;
  requestedAt: string;
  targetClient: string;
  currentStageDwellMinutes: number;
  stageStartedAt?: string;
  totalTurnaroundMinutes?: number;
  slaTargetMinutes: number;
  slaStatus: "ON_TRACK" | "AT_RISK" | "BREACHED";
  auditTrail: ApprovalStageAudit[];
  leadApprovedBy?: string;
  leadApprovedAt?: string;
  salesDispatchedBy?: string;
  salesDispatchedAt?: string;
  dispatchPlatform?: "Fiverr" | "Upwork" | "Email" | "Direct Portal" | "Slack" | string;
  dispatchReferenceId?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
}

export interface ClientInboundRelay {
  clientName: string;
  clientAvatar?: string;
  clientCompany?: string;
  platform: "Fiverr" | "Upwork" | "Email" | "Direct Portal" | "Slack";
  externalMessageId?: string;
  relayedBySalesName: string;
  relayedBySalesAvatar?: string;
  relayedAt: string;
  channelLink?: string;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  designation: string;
  role: "Admin" | "Project Manager" | "Tech Lead" | "Sales Lead" | "Member";
  isOnline: boolean;
  department?: string;
  shift?: string;
  lastSeen?: string;
}

export interface ProjectMediaItem {
  id: string;
  title: string;
  url: string;
  type: "image" | "video";
  uploadedAt: string;
  uploaderName: string;
  dimensions?: string;
}

export interface ProjectFileItem {
  id: string;
  name: string;
  size: string;
  extension: string;
  uploadedAt: string;
  uploaderName: string;
  version?: string;
  downloadUrl?: string;
}

export interface ProjectLinkItem {
  id: string;
  title: string;
  url: string;
  category: "Figma" | "GitHub" | "Jira" | "Docs" | "Staging" | "Other";
  addedAt: string;
  description?: string;
}

export interface ProjectMilestoneItem {
  id: string;
  title: string;
  dueDate: string;
  isCompleted: boolean;
  assignedTo: string;
  deliverableCount?: number;
  completedAt?: string;
}

export interface ProjectPinnedAnnouncement {
  id: string;
  messageId: string;
  message: string;
  author: string;
  authorAvatar?: string;
  authorDesignation?: string;
  timestamp: string;
  category?: "ANNOUNCEMENT" | "DELIVERABLE" | "MEETING" | "COMPLIANCE" | "ESCROW";
}

export interface ProjectTeamItem {
  id: string;
  name: string;
  departmentName?: string;
  leadName?: string;
  memberCount: number;
}

export interface ProjectCapabilities {
  canEdit: boolean;
  canDelete: boolean;
  canReassign: boolean;
  canManageMembers: boolean;
  canChatView: boolean;
  canChatSend: boolean;
  canSendClientMessage: boolean;
  canLeadApprove: boolean;
  canSalesDispatch: boolean;
  canManageTypes: boolean;
  canPinMessage: boolean;
  canViewFinancials: boolean;
}

export interface ProjectWorkspaceItem {
  id: string;
  code: string; // e.g. PRJ-1048 (Main identifier)
  name: string;
  description: string;
  client: {
    name: string;
    email?: string;
    company?: string;
    avatar?: string;
    platform?: "Fiverr Pro" | "Upwork Enterprise" | "Direct Contract" | "Referral";
  };
  status: {
    id: string;
    name: string;
    color?: string;
    isTerminal?: boolean;
  };
  priority: {
    id: string;
    name: string;
    level: number;
    color?: string;
  };
  serviceLine: string;
  orderSource: string;
  budget: string | number;
  deadline: string;
  progress: number; // 0 - 100
  isPinned?: boolean;
  unreadCount?: number;
  pendingApprovalsCount?: number;
  pendingLeadApprovalsCount?: number;
  pendingSalesDispatchesCount?: number;
  pendingRevisionsCount?: number;
  pendingInboundCount?: number;
  onlineCount?: number;
  pinnedAnnouncement?: ProjectPinnedAnnouncement;
  pinnedAnnouncements?: ProjectPinnedAnnouncement[];
  _capabilities?: ProjectCapabilities;
  lead: WorkspaceMember;
  teams: ProjectTeamItem[];
  members: WorkspaceMember[];
  media: ProjectMediaItem[];
  files: ProjectFileItem[];
  links: ProjectLinkItem[];
  milestones: ProjectMilestoneItem[];
  lastMessage?: {
    id: string;
    senderName: string;
    text: string;
    timestamp: string;
    isRead: boolean;
    purpose?: MessagePurpose;
    createdAt?: string;
  };
  lastActivityAt?: string;
  createdAt?: string;
  attentionType?: "CLIENT_MESSAGE" | "PENDING_APPROVAL" | "REVISION_REQUESTED" | "NEW_MESSAGE" | null;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
}

export interface ChatAttachment {
  id: string;
  name: string;
  type: "file" | "image" | "link";
  url?: string;
  size?: string;
  thumbnailUrl?: string;
  version?: string;
  extension?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  status?: "uploading" | "ready" | "error";
  progress?: number;
  error?: string;
  file?: File;
  dimensions?: { width: number; height: number };
}

export interface ChatDeliverableUpdate {
  title: string;
  status: string;
  progress: number;
  version?: string;
  actionUrl?: string;
}

export interface ChatMeetingSummary {
  meetingTitle: string;
  participants: string[];
  keyDecisions: string[];
  actionItems: { task: string; owner: string; dueDate?: string }[];
}

export interface ChatVoiceNote {
  durationSeconds: number;
  waveform: number[];
}

export interface ProjectMessageCapabilities {
  canLeadApprove?: boolean;
  canSalesDispatch?: boolean;
  canRequestRevision?: boolean;
  canPin?: boolean;
  canDelete?: boolean;
  canEdit?: boolean;
  editTimeRemainingSeconds?: number;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  projectCode: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderDesignation?: string;
  senderRole?: "Admin" | "Project Manager" | "Tech Lead" | "Sales Lead" | "Member" | string;
  isCurrentUser: boolean;
  isFromClient?: boolean; // True when message is from client (inbound relayed from external platform)
  isEdited?: boolean;
  editedAt?: string | null;
  editHistoryCount?: number;
  text: string;
  timestamp: string;
  dateGroup: string; // e.g., "Today", "Yesterday", "Oct 18, 2026"
  purpose: MessagePurpose; // "INTERNAL_DISCUSSION" | "CLIENT_COMMUNICATION"
  clientDirection?: ClientMessageDirection; // "INBOUND" | "OUTBOUND"
  clientMessageType?: ClientMessageType; // e.g. "DELIVERY" | "EXTENSION_REQUEST" | "STATUS_UPDATE" | "GENERAL_NOTICE" | etc.
  outboundType?: ClientMessageType; // alias for backwards compatibility
  variant?: "default" | "secondary" | "muted" | "tinted" | "outline" | "ghost" | "destructive";
  approval?: ApprovalWorkflow;
  clientInboundRelay?: ClientInboundRelay;
  seenBy?: MessageReadReceipt[];
  revisions?: ProjectMessageRevision[];
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  attachments?: ChatAttachment[];
  deliverableUpdate?: ChatDeliverableUpdate;
  meetingSummary?: ChatMeetingSummary;
  voiceNote?: ChatVoiceNote;
  reactions?: ChatReaction[];
  isPinned?: boolean;
  isCollapsible?: boolean;
  _capabilities?: ProjectMessageCapabilities;
}
