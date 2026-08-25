// ==========================================
// AGILE TASK & WORKSPACE MANAGEMENT TYPES
// Softvence Organizational Architecture
// ==========================================

export interface Branch {
  id: string;
  name: string;
  code: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  color: string;
  icon?: string;
  branchId: string;
}

export interface Team {
  id: string;
  departmentId: string;
  name: string;
  code: string;
  memberCount?: number;
}

export type StatusCategory =
  | "BACKLOG"
  | "UNSTARTED"
  | "IN_PROGRESS"
  | "REVIEW_QA"
  | "COMPLETED"
  | "ABANDONED";

export interface TaskStatusConfig {
  key: string;
  label: string;
  color: string;
  category: StatusCategory;
  isBacklog?: boolean;
  isInProgress?: boolean;
  isReview?: boolean;
  isTerminal?: boolean;
  isSuccess?: boolean;
  orderIndex: number;
  wipLimit?: number;
}

export type WorkflowDomain = "SOFTWARE" | "DESIGN" | "CMS" | "OPERATIONS" | "GENERAL";

export interface TaskWorkflow {
  id: string;
  name: string;
  description: string;
  domain: WorkflowDomain;
  isDefault: boolean;
  statuses: TaskStatusConfig[];
}

export type TaskTypeKey = "STORY" | "BUG" | "TASK" | "SPIKE" | "IMPROVEMENT" | "DESIGN_ASSET" | "CONTENT";

export interface TaskTypeConfig {
  key: TaskTypeKey;
  label: string;
  color: string;
  icon: string;
}

export type TaskPriorityKey = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

export interface TaskPriorityConfig {
  key: TaskPriorityKey;
  label: string;
  level: number;
  color: string;
  bg: string;
  icon: string;
}

export type CustomFieldType = "TEXT" | "URL" | "NUMBER" | "DROPDOWN" | "DATE" | "CHECKBOX";

export interface TaskCustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  value?: string | number | boolean;
  options?: string[];
  placeholder?: string;
}

export interface TaskChecklistItem {
  id: string;
  title: string;
  isCompleted: boolean;
  assigneeId?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    designation?: string;
  };
  content: string;
  createdAt: string;
}

export interface WorkLog {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  hoursSpent: number;
  description: string;
  date: string;
  createdAt: string;
}

export interface TaskDependency {
  id: string;
  type: "BLOCKS" | "IS_BLOCKED_BY" | "RELATES_TO";
  targetTaskId: string;
  targetTaskKey: string;
  targetTaskTitle: string;
  targetTaskStatus: string;
}

export interface TaskAssignee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  designation?: string;
  departmentId?: string;
  teamName?: string;
}

export interface Sprint {
  id: string;
  projectId?: string | null;
  teamId?: string | null;
  departmentId?: string | null;
  name: string;
  goal?: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
  startDate: string;
  endDate: string;
  totalStoryPoints?: number;
  completedStoryPoints?: number;
  createdAt: string;
}

export interface AgileEpicComponent {
  id: string;
  projectId?: string;
  departmentId?: string;
  name: string;
  description?: string;
  color: string;
}

export type TaskAnchorType = "PROJECT" | "DEPARTMENT_TEAM" | "PERSONAL";

export interface AgileTask {
  id: string;
  key: string; // e.g. "FIN-101", "ENG-204", "DSGN-15", "OPS-08"
  
  // Dual-Anchor Containment (Company Hierarchy)
  anchorType: TaskAnchorType;
  departmentId: string;
  departmentName: string;
  teamId?: string | null;
  teamName?: string;
  projectId?: string | null;
  projectName?: string;
  componentId?: string | null;
  componentName?: string;
  componentColor?: string;
  sprintId?: string | null;
  
  workflowId: string;
  status: string; // references TaskStatusConfig.key
  
  title: string;
  description: string;
  taskType: TaskTypeKey;
  priority: TaskPriorityKey;
  
  storyPoints?: number;
  estimatedHours?: number;
  loggedHours?: number;
  
  isPrivate?: boolean;
  
  assignee?: TaskAssignee | null;
  reporter: TaskAssignee;
  reviewer?: TaskAssignee | null;
  qaTester?: TaskAssignee | null;
  
  checklist: TaskChecklistItem[];
  comments: TaskComment[];
  workLogs: WorkLog[];
  dependencies: TaskDependency[];
  customFields: TaskCustomField[];
  tags: string[];
  
  startDate?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  
  // Scoped capabilities resolved server-side
  _capabilities: {
    canEdit: boolean;
    canDelete: boolean;
    canMove: boolean;
    canAssign: boolean;
    canEstimate: boolean;
    canLogWork: boolean;
  };
}

export type SwimlaneMode = "NONE" | "ASSIGNEE" | "DEPARTMENT" | "PROJECT" | "EPIC" | "PRIORITY";
export type AgileViewMode = "BOARD" | "BACKLOG" | "TABLE" | "TIMELINE" | "MY_TASKS" | "WORKFLOWS";

export interface TaskFilterState {
  search: string;
  scopeType: "ALL" | "PROJECT" | "DEPARTMENT_TEAM" | "PERSONAL";
  departmentId: string; // 'ALL' or department id
  teamId: string; // 'ALL' or team id
  projectId: string; // 'ALL', 'STANDALONE', or specific project id
  sprintId: string; // 'ALL', 'ACTIVE', 'BACKLOG', or specific sprint id
  workflowId: string; // 'ALL' or workflow id
  epicId: string; // 'ALL' or specific component id
  assigneeId: string; // 'ALL', 'UNASSIGNED', 'MY_TASKS', or specific user id
  priority: string; // 'ALL' or specific
  taskType: string; // 'ALL' or specific
  status: string; // 'ALL' or specific
  tag: string; // 'ALL' or specific
  swimlane: SwimlaneMode;
  cardDensity: "STANDARD" | "COMPACT";
  hideEmptyGroups?: boolean;
}

