// ==========================================
// ISSUE TRACKING & QA DEFECT MANAGEMENT TYPES
// Softvence Enterprise Agile Engine
// ==========================================

export interface IssueItem {
  id: string;
  key: string; // e.g. "BUG-101", "ISS-304", "SEC-12"
  projectId: string;
  projectName: string;
  projectCode?: string;
  componentId?: string | null;
  componentName?: string | null;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorDesignation?: string;
  
  title: string;
  content?: string;
  
  statusId: string;
  statusName: string;
  statusCategory: "OPEN" | "TRIAGE" | "IN_PROGRESS" | "QA_TESTING" | "RESOLVED" | "CLOSED";
  statusColor: string;
  isResolved: boolean;
  
  priorityId: string;
  priorityName: "P0 - Blocker" | "P1 - Critical" | "P2 - Major" | "P3 - Minor" | "P4 - Low";
  priorityLevel: number; // 0 (Blocker) to 4 (Low)
  priorityColor: string;
  
  issueTypeId: string;
  issueTypeName: "Bug / Defect" | "Security Flaw" | "Performance" | "UI / UX Glitch" | "Client Feedback" | "Infrastructure";
  issueTypeIcon: string;
  
  assigneeId?: string | null;
  assigneeName?: string | null;
  assigneeAvatar?: string | null;
  
  resolvedBy?: string | null;
  resolverName?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  
  slaHours?: number;
  slaDueAt?: string;
  isSlaBreached?: boolean;
  
  reproductionSteps?: {
    id: string;
    step: string;
    isChecked: boolean;
  }[];
  
  environment?: {
    browser?: string;
    os?: string;
    device?: string;
    version?: string;
  };
  
  linkedTaskId?: string | null;
  linkedTaskKey?: string | null;
  linkedTaskTitle?: string | null;
  
  commentsCount: number;
  attachmentsCount: number;
  
  createdAt: string;
  updatedAt?: string;
  
  _capabilities: {
    canEdit: boolean;
    canDelete: boolean;
    canResolve: boolean;
    canAssign: boolean;
    canConvertToTask: boolean;
  };
}

export interface IssueComment {
  id: string;
  issueId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorDesignation?: string;
  content: string;
  isInternalOnly: boolean;
  createdAt: string;
}

export interface SupportTicketItem {
  id: string;
  ticketRef: string; // e.g. "TCK-8841"
  projectId: string;
  projectName: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "WAITING_ON_CLIENT" | "RESOLVED" | "CLOSED";
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  slaStatus: "ON_TRACK" | "AT_RISK" | "BREACHED";
  assigneeName?: string;
  createdAt: string;
  updatedAt?: string;
  _capabilities: {
    canReply: boolean;
    canResolve: boolean;
    canReassign: boolean;
  };
}

export interface IssueFilterState {
  search: string;
  projectId: string; // 'ALL' or specific
  componentId: string; // 'ALL' or specific
  statusCategory: string; // 'ALL' or category
  priorityLevel: string; // 'ALL' or '0'..'4'
  issueTypeId: string; // 'ALL' or specific
  assigneeId: string; // 'ALL', 'UNASSIGNED', 'MY_ISSUES' or user id
  severity: "ALL" | "BLOCKERS" | "CRITICAL" | "RESOLVED";
  viewMode: "TABLE" | "KANBAN";
}
