import type {
  Branch,
  Department,
  Team,
  TaskWorkflow,
  TaskStatusConfig,
  TaskTypeConfig,
  TaskPriorityConfig,
  TaskAssignee,
  Sprint,
  AgileEpicComponent,
  AgileTask,
} from "../types";

// ==========================================
// 1. ORGANIZATIONAL HIERARCHY
// ==========================================

export const MOCK_BRANCHES: Branch[] = [
  { id: "branch-dhaka", name: "Dhaka Head Office (HQ)", code: "DHK" },
  { id: "branch-london", name: "London Operations Branch", code: "LDN" },
];

export const MOCK_DEPARTMENTS: Department[] = [
  {
    id: "dept-eng",
    name: "Software Engineering",
    code: "ENG",
    color: "#3b82f6",
    branchId: "branch-dhaka",
  },
  {
    id: "dept-design",
    name: "UI/UX & Product Design",
    code: "DSGN",
    color: "#ec4899",
    branchId: "branch-dhaka",
  },
  {
    id: "dept-cms",
    name: "CMS & Web Development",
    code: "CMS",
    color: "#8b5cf6",
    branchId: "branch-dhaka",
  },
  {
    id: "dept-infra",
    name: "DevOps & Infrastructure",
    code: "OPS",
    color: "#f59e0b",
    branchId: "branch-dhaka",
  },
];

export const MOCK_TEAMS: Team[] = [
  {
    id: "team-web",
    departmentId: "dept-eng",
    name: "Core Web Squad",
    code: "WEB",
    memberCount: 8,
  },
  {
    id: "team-mobile",
    departmentId: "dept-eng",
    name: "Mobile Banking Squad",
    code: "MOB",
    memberCount: 6,
  },
  {
    id: "team-design",
    departmentId: "dept-design",
    name: "Design & UX Labs",
    code: "UX",
    memberCount: 5,
  },
  {
    id: "team-cms",
    departmentId: "dept-cms",
    name: "Headless CMS Squad",
    code: "CMS",
    memberCount: 4,
  },
  {
    id: "team-infra",
    departmentId: "dept-infra",
    name: "Platform & Cloud Infra",
    code: "INF",
    memberCount: 4,
  },
];

// ==========================================
// 2. DYNAMIC WORKFLOW SCHEMES & STATUSES
// ==========================================

export const MOCK_WORKFLOWS: TaskWorkflow[] = [
  {
    id: "wf-software",
    name: "Software Engineering Scrum",
    description: "Standard agile workflow for software development with code review and QA stages.",
    domain: "SOFTWARE",
    isDefault: true,
    statuses: [
      {
        key: "BACKLOG",
        label: "Backlog",
        color: "#64748b",
        category: "BACKLOG",
        isBacklog: true,
        orderIndex: 0,
      },
      {
        key: "TODO",
        label: "To Do",
        color: "#3b82f6",
        category: "UNSTARTED",
        orderIndex: 1,
      },
      {
        key: "IN_PROGRESS",
        label: "In Progress",
        color: "#f59e0b",
        category: "IN_PROGRESS",
        isInProgress: true,
        orderIndex: 2,
        wipLimit: 6,
      },
      {
        key: "CODE_REVIEW",
        label: "Code Review / PR",
        color: "#8b5cf6",
        category: "REVIEW_QA",
        isReview: true,
        orderIndex: 3,
      },
      {
        key: "QA_TESTING",
        label: "QA Testing",
        color: "#ec4899",
        category: "REVIEW_QA",
        isReview: true,
        orderIndex: 4,
      },
      {
        key: "DONE",
        label: "Done / Shipped",
        color: "#10b981",
        category: "COMPLETED",
        isTerminal: true,
        isSuccess: true,
        orderIndex: 5,
      },
    ],
  },
  {
    id: "wf-design",
    name: "UI/UX Design Lifecycle",
    description: "Lifecycle tailored for design sprints, wireframing, high-fidelity prototypes and design review.",
    domain: "DESIGN",
    isDefault: false,
    statuses: [
      {
        key: "DESIGN_BACKLOG",
        label: "Design Backlog",
        color: "#64748b",
        category: "BACKLOG",
        isBacklog: true,
        orderIndex: 0,
      },
      {
        key: "WIREFRAMING",
        label: "Wireframing",
        color: "#3b82f6",
        category: "IN_PROGRESS",
        isInProgress: true,
        orderIndex: 1,
      },
      {
        key: "HIFI_DESIGN",
        label: "High-Fidelity UI",
        color: "#ec4899",
        category: "IN_PROGRESS",
        isInProgress: true,
        orderIndex: 2,
      },
      {
        key: "DESIGN_REVIEW",
        label: "Design Review",
        color: "#8b5cf6",
        category: "REVIEW_QA",
        isReview: true,
        orderIndex: 3,
      },
      {
        key: "ASSET_HANDOFF",
        label: "Asset Handoff",
        color: "#10b981",
        category: "COMPLETED",
        isTerminal: true,
        isSuccess: true,
        orderIndex: 4,
      },
    ],
  },
  {
    id: "wf-cms",
    name: "CMS & Content Pipeline",
    description: "Publishing and website build pipeline for content management projects.",
    domain: "CMS",
    isDefault: false,
    statuses: [
      {
        key: "CONTENT_BRIEF",
        label: "Brief & Outline",
        color: "#64748b",
        category: "BACKLOG",
        isBacklog: true,
        orderIndex: 0,
      },
      {
        key: "DRAFTING",
        label: "Draft in Progress",
        color: "#3b82f6",
        category: "IN_PROGRESS",
        isInProgress: true,
        orderIndex: 1,
      },
      {
        key: "STAGING_UPLOAD",
        label: "Staging Upload",
        color: "#f59e0b",
        category: "IN_PROGRESS",
        isInProgress: true,
        orderIndex: 2,
      },
      {
        key: "PROOFREADING",
        label: "QA & Client Sign-off",
        color: "#8b5cf6",
        category: "REVIEW_QA",
        isReview: true,
        orderIndex: 3,
      },
      {
        key: "PUBLISHED",
        label: "Live Published",
        color: "#10b981",
        category: "COMPLETED",
        isTerminal: true,
        isSuccess: true,
        orderIndex: 4,
      },
    ],
  },
  {
    id: "wf-ops",
    name: "General Operations / Tasks",
    description: "Simple agile workflow for internal operations, IT, and maintenance.",
    domain: "OPERATIONS",
    isDefault: false,
    statuses: [
      {
        key: "TODO",
        label: "To Do",
        color: "#3b82f6",
        category: "UNSTARTED",
        orderIndex: 0,
      },
      {
        key: "IN_PROGRESS",
        label: "In Progress",
        color: "#f59e0b",
        category: "IN_PROGRESS",
        isInProgress: true,
        orderIndex: 1,
      },
      {
        key: "DONE",
        label: "Completed",
        color: "#10b981",
        category: "COMPLETED",
        isTerminal: true,
        isSuccess: true,
        orderIndex: 2,
      },
    ],
  },
];

// Helper fallback
export const TASK_STATUSES = MOCK_WORKFLOWS[0]!.statuses;

// ==========================================
// 3. TASK TYPES & PRIORITIES
// ==========================================

export const TASK_TYPES: Record<string, TaskTypeConfig> = {
  STORY: {
    key: "STORY",
    label: "User Story",
    color: "#10b981",
    icon: "BookmarkCheck",
  },
  BUG: {
    key: "BUG",
    label: "Bug Defect",
    color: "#ef4444",
    icon: "Bug",
  },
  TASK: {
    key: "TASK",
    label: "Engineering Task",
    color: "#3b82f6",
    icon: "CheckSquare",
  },
  SPIKE: {
    key: "SPIKE",
    label: "Spike / Research",
    color: "#f59e0b",
    icon: "Zap",
  },
  IMPROVEMENT: {
    key: "IMPROVEMENT",
    label: "Improvement",
    color: "#8b5cf6",
    icon: "Sparkles",
  },
  DESIGN_ASSET: {
    key: "DESIGN_ASSET",
    label: "Design Asset",
    color: "#ec4899",
    icon: "Palette",
  },
  CONTENT: {
    key: "CONTENT",
    label: "Content Piece",
    color: "#06b6d4",
    icon: "FileText",
  },
};

export const TASK_PRIORITIES: Record<string, TaskPriorityConfig> = {
  URGENT: {
    key: "URGENT",
    label: "Urgent",
    level: 4,
    color: "#ef4444",
    bg: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
    icon: "Flame",
  },
  HIGH: {
    key: "HIGH",
    label: "High",
    level: 3,
    color: "#f97316",
    bg: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    icon: "ChevronUp",
  },
  MEDIUM: {
    key: "MEDIUM",
    label: "Medium",
    level: 2,
    color: "#eab308",
    bg: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    icon: "Equal",
  },
  LOW: {
    key: "LOW",
    label: "Low",
    level: 1,
    color: "#3b82f6",
    bg: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    icon: "ChevronDown",
  },
};

// ==========================================
// 4. TEAM MEMBERS & CURRENT USER
// ==========================================

export const userSarah: TaskAssignee = {
  id: "usr-sarah",
  name: "Sarah Jenkins",
  email: "sarah.j@softvence.io",
  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  designation: "Lead Frontend Architect",
  departmentId: "dept-eng",
  teamName: "Core Web Squad",
};

export const userMarcus: TaskAssignee = {
  id: "usr-marcus",
  name: "Marcus Vance",
  email: "marcus.v@softvence.io",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  designation: "Principal Backend Engineer",
  departmentId: "dept-eng",
  teamName: "Core Web Squad",
};

export const userAmina: TaskAssignee = {
  id: "usr-amina",
  name: "Amina Diallo",
  email: "amina.d@softvence.io",
  avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
  designation: "Lead Product Designer",
  departmentId: "dept-design",
  teamName: "Design & UX Labs",
};

export const userKenji: TaskAssignee = {
  id: "usr-kenji",
  name: "Kenji Sato",
  email: "kenji.s@softvence.io",
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  designation: "QA & Test Automation Lead",
  departmentId: "dept-eng",
  teamName: "Mobile Banking Squad",
};

export const userElena: TaskAssignee = {
  id: "usr-elena",
  name: "Elena Rostova",
  email: "elena.r@softvence.io",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  designation: "DevOps & Cloud Architect",
  departmentId: "dept-infra",
  teamName: "Platform & Cloud Infra",
};

export const MOCK_ASSIGNEES: TaskAssignee[] = [
  userSarah,
  userMarcus,
  userAmina,
  userKenji,
  userElena,
];

export const CURRENT_USER: TaskAssignee = userSarah;

// ==========================================
// 5. PROJECTS & EPICS
// ==========================================

export const MOCK_PROJECTS = [
  {
    id: "proj-1",
    name: "Fintech Mobile & Web Banking",
    code: "FIN",
    departmentId: "dept-eng",
    teamId: "team-web",
    workflowId: "wf-software",
  },
  {
    id: "proj-2",
    name: "AI Customer Intelligence Suite",
    code: "AICRM",
    departmentId: "dept-eng",
    teamId: "team-web",
    workflowId: "wf-software",
  },
  {
    id: "proj-3",
    name: "E-Commerce Multi-Vendor Engine",
    code: "ECOM",
    departmentId: "dept-cms",
    teamId: "team-cms",
    workflowId: "wf-cms",
  },
  {
    id: "proj-4",
    name: "NextGen Brand Design System",
    code: "DSGN",
    departmentId: "dept-design",
    teamId: "team-design",
    workflowId: "wf-design",
  },
];

export const MOCK_EPICS: AgileEpicComponent[] = [
  {
    id: "epic-auth",
    projectId: "proj-1",
    departmentId: "dept-eng",
    name: "Auth & Biometric Security",
    description: "OAuth2, JWT tokens, WebAuthn biometric login, and multi-tenant RBAC",
    color: "#8b5cf6",
  },
  {
    id: "epic-payment",
    projectId: "proj-1",
    departmentId: "dept-eng",
    name: "Payment Gateway & Stripe Connect",
    description: "Multi-currency checkout, webhooks, auto-invoicing and split payouts",
    color: "#10b981",
  },
  {
    id: "epic-design-tokens",
    projectId: "proj-4",
    departmentId: "dept-design",
    name: "Design Tokens & Figma Library",
    description: "Typography, color variables, shadows, and responsive primitives",
    color: "#ec4899",
  },
  {
    id: "epic-cms-builder",
    projectId: "proj-3",
    departmentId: "dept-cms",
    name: "Headless CMS Page Builder",
    description: "Drag-and-drop block builder with Next.js SSG preview",
    color: "#f59e0b",
  },
];

export const MOCK_SPRINTS: Sprint[] = [
  {
    id: "sprint-14",
    projectId: "proj-1",
    departmentId: "dept-eng",
    teamId: "team-web",
    name: "Sprint 14: Payment Engine & Stripe Webhooks",
    goal: "Finalize high-concurrency Stripe webhook processing, checkout modal, and automated refunds.",
    status: "ACTIVE",
    startDate: "2026-08-10",
    endDate: "2026-08-24",
    totalStoryPoints: 34,
    completedStoryPoints: 13,
    createdAt: "2026-08-01",
  },
  {
    id: "sprint-15",
    projectId: "proj-1",
    departmentId: "dept-eng",
    teamId: "team-web",
    name: "Sprint 15: Analytics & Realtime Notification Hub",
    goal: "Build streaming data analytics charts and WebSocket transaction alerts for enterprise tier.",
    status: "PLANNED",
    startDate: "2026-08-25",
    endDate: "2026-09-08",
    totalStoryPoints: 26,
    completedStoryPoints: 0,
    createdAt: "2026-08-05",
  },
  {
    id: "sprint-13",
    projectId: "proj-1",
    departmentId: "dept-eng",
    teamId: "team-web",
    name: "Sprint 13: Core Auth & Biometrics Onboarding",
    goal: "Deploy WebAuthn FaceID integration and session revocation architecture.",
    status: "COMPLETED",
    startDate: "2026-07-27",
    endDate: "2026-08-09",
    totalStoryPoints: 30,
    completedStoryPoints: 30,
    createdAt: "2026-07-20",
  },
];

// ==========================================
// 6. INITIAL MOCK TASKS (PROJECT & STANDALONE)
// ==========================================

export const INITIAL_MOCK_TASKS: AgileTask[] = [
  // 1. Project-Bound Task (Software)
  {
    id: "task-101",
    key: "FIN-101",
    anchorType: "PROJECT",
    departmentId: "dept-eng",
    departmentName: "Software Engineering",
    teamId: "team-web",
    teamName: "Core Web Squad",
    projectId: "proj-1",
    projectName: "Fintech Mobile & Web Banking",
    componentId: "epic-payment",
    componentName: "Payment Gateway & Stripe Connect",
    componentColor: "#10b981",
    sprintId: "sprint-14",
    workflowId: "wf-software",
    title: "Implement idempotent Stripe webhook handler for subscription renewals",
    description: `### Context
We need a robust webhook consumer that ensures events from Stripe (such as \`invoice.payment_succeeded\` and \`customer.subscription.deleted\`) are processed exactly once.

### Acceptance Criteria
- [x] Redis distributed lock on \`event.id\` to prevent duplicate executions
- [x] Idempotency key stored in Postgres audit ledger
- [ ] Retry strategy with exponential backoff on network timeouts
- [ ] RabbitMQ notification dispatched to team channel upon payment failure`,
    taskType: "STORY",
    status: "IN_PROGRESS",
    priority: "URGENT",
    storyPoints: 5,
    estimatedHours: 16,
    loggedHours: 9,
    assignee: userMarcus,
    reporter: userSarah,
    reviewer: userSarah,
    qaTester: userKenji,
    checklist: [
      { id: "chk-1", title: "Setup HMAC signature verification", isCompleted: true },
      { id: "chk-2", title: "Add Redis lock with 30s TTL", isCompleted: true },
      { id: "chk-3", title: "Implement dead-letter queue for failed events", isCompleted: false },
      { id: "chk-4", title: "Write unit tests for duplicate event replay", isCompleted: false },
    ],
    comments: [
      {
        id: "com-1",
        taskId: "task-101",
        author: {
          id: userSarah.id,
          name: userSarah.name,
          avatar: userSarah.avatar,
          designation: userSarah.designation,
        },
        content: "@Marcus please make sure we also support zero-decimal currencies like JPY when storing charge records!",
        createdAt: "2026-08-16 14:20",
      },
    ],
    workLogs: [
      {
        id: "wl-1",
        taskId: "task-101",
        userId: userMarcus.id,
        userName: userMarcus.name,
        userAvatar: userMarcus.avatar,
        hoursSpent: 5,
        description: "Implemented Stripe signature validation and Redis locking mechanism",
        date: "2026-08-15",
        createdAt: "2026-08-15 18:00",
      },
    ],
    dependencies: [],
    customFields: [
      { id: "cf-pr", name: "Pull Request URL", type: "URL", value: "https://github.com/softvence/core/pull/402" },
      { id: "cf-env", name: "Target Environment", type: "DROPDOWN", value: "Staging" },
    ],
    tags: ["backend", "stripe", "security", "p0"],
    startDate: "2026-08-14",
    dueDate: "2026-08-19",
    createdAt: "2026-08-10 09:00",
    updatedAt: "2026-08-16 17:30",
    _capabilities: {
      canEdit: true,
      canDelete: true,
      canMove: true,
      canAssign: true,
      canEstimate: true,
      canLogWork: true,
    },
  },

  // 2. Project-Bound Task (UI/UX)
  {
    id: "task-102",
    key: "DSGN-102",
    anchorType: "PROJECT",
    departmentId: "dept-design",
    departmentName: "UI/UX & Product Design",
    teamId: "team-design",
    teamName: "Design & UX Labs",
    projectId: "proj-4",
    projectName: "NextGen Brand Design System",
    componentId: "epic-design-tokens",
    componentName: "Design Tokens & Figma Library",
    componentColor: "#ec4899",
    sprintId: null,
    workflowId: "wf-design",
    title: "Dark mode color tokens & high-contrast accessibility audit",
    description: `### Goal
Audit all 48 semantic color tokens across dark and light themes to ensure WCAG 2.1 AAA contrast ratios for body and interactive components.`,
    taskType: "DESIGN_ASSET",
    status: "HIFI_DESIGN",
    priority: "HIGH",
    storyPoints: 5,
    estimatedHours: 12,
    loggedHours: 8,
    assignee: userAmina,
    reporter: userSarah,
    reviewer: userSarah,
    qaTester: userKenji,
    checklist: [
      { id: "chk-ds-1", title: "Figma Variables color matrix audit", isCompleted: true },
      { id: "chk-ds-2", title: "Contrast check against dark surface levels 1-4", isCompleted: true },
      { id: "chk-ds-3", title: "Export token JSON for frontend dev sync", isCompleted: false },
    ],
    comments: [],
    workLogs: [
      {
        id: "wl-ds-1",
        taskId: "task-102",
        userId: userAmina.id,
        userName: userAmina.name,
        userAvatar: userAmina.avatar,
        hoursSpent: 8,
        description: "Standardized dark-mode surface palette in Figma Variables",
        date: "2026-08-17",
        createdAt: "2026-08-17 16:00",
      },
    ],
    dependencies: [],
    customFields: [
      { id: "cf-figma", name: "Figma File Link", type: "URL", value: "https://www.figma.com/design/softvence-v2" },
    ],
    tags: ["design", "tokens", "figma", "a11y"],
    startDate: "2026-08-15",
    dueDate: "2026-08-22",
    createdAt: "2026-08-12 10:00",
    updatedAt: "2026-08-17 16:00",
    _capabilities: {
      canEdit: true,
      canDelete: true,
      canMove: true,
      canAssign: true,
      canEstimate: true,
      canLogWork: true,
    },
  },

  // 3. Standalone Department Task (Engineering / DevOps - No Project Required!)
  {
    id: "task-103",
    key: "ENG-201",
    anchorType: "DEPARTMENT_TEAM",
    departmentId: "dept-eng",
    departmentName: "Software Engineering",
    teamId: "team-web",
    teamName: "Core Web Squad",
    projectId: null,
    projectName: undefined,
    sprintId: null,
    workflowId: "wf-software",
    title: "Upgrade Bun monorepo workspace toolchain to v1.3.14",
    description: `### Internal Engineering Task
Ensure Turborepo caching pipelines and shared workspace packages are compatible with latest Bun compiler features and strict TypeScript 5.7 flags.`,
    taskType: "TASK",
    status: "TODO",
    priority: "MEDIUM",
    storyPoints: 2,
    estimatedHours: 6,
    loggedHours: 0,
    assignee: userMarcus,
    reporter: userSarah,
    reviewer: userElena,
    qaTester: userKenji,
    checklist: [
      { id: "chk-eng-1", title: "Bump package versions in package.json", isCompleted: false },
      { id: "chk-eng-2", title: "Run turbo typecheck across all apps", isCompleted: false },
    ],
    comments: [],
    workLogs: [],
    dependencies: [],
    customFields: [],
    tags: ["internal", "toolchain", "bun", "maintenance"],
    createdAt: "2026-08-18 11:00",
    updatedAt: "2026-08-18 11:00",
    _capabilities: {
      canEdit: true,
      canDelete: true,
      canMove: true,
      canAssign: true,
      canEstimate: true,
      canLogWork: true,
    },
  },

  // 4. Standalone DevOps Infrastructure Task (No Project Required!)
  {
    id: "task-104",
    key: "OPS-101",
    anchorType: "DEPARTMENT_TEAM",
    departmentId: "dept-infra",
    departmentName: "DevOps & Infrastructure",
    teamId: "team-infra",
    teamName: "Platform & Cloud Infra",
    projectId: null,
    sprintId: null,
    workflowId: "wf-ops",
    title: "Setup Prometheus metrics scraping for Redis cache eviction rates",
    description: `### Infrastructure Alerting
Configure Grafana dashboard panels and Slack webhook alerts if Redis cache eviction exceeds 500 keys/sec during peak traffic hours.`,
    taskType: "TASK",
    status: "IN_PROGRESS",
    priority: "HIGH",
    storyPoints: 3,
    estimatedHours: 8,
    loggedHours: 4,
    assignee: userElena,
    reporter: userMarcus,
    reviewer: userMarcus,
    qaTester: null,
    checklist: [
      { id: "chk-ops-1", title: "Deploy Redis Prometheus exporter sidecar", isCompleted: true },
      { id: "chk-ops-2", title: "Create Grafana dashboard alert rules", isCompleted: false },
    ],
    comments: [],
    workLogs: [
      {
        id: "wl-ops-1",
        taskId: "task-104",
        userId: userElena.id,
        userName: userElena.name,
        userAvatar: userElena.avatar,
        hoursSpent: 4,
        description: "Configured exporter container in docker-compose.infra.yml",
        date: "2026-08-18",
        createdAt: "2026-08-18 14:00",
      },
    ],
    dependencies: [],
    customFields: [],
    tags: ["devops", "monitoring", "grafana", "redis"],
    createdAt: "2026-08-17 09:00",
    updatedAt: "2026-08-18 14:00",
    _capabilities: {
      canEdit: true,
      canDelete: true,
      canMove: true,
      canAssign: true,
      canEstimate: true,
      canLogWork: true,
    },
  },

  // 5. Personal / Private Employee To-Do
  {
    id: "task-105",
    key: "PERS-01",
    anchorType: "PERSONAL",
    departmentId: "dept-eng",
    departmentName: "Software Engineering",
    teamId: "team-web",
    projectId: null,
    sprintId: null,
    workflowId: "wf-ops",
    title: "Prepare Sprint 14 team retrospective notes & demo agenda",
    description: `Outline key wins (Stripe webhook idempotency, dark mode token revamp) and action items for next sprint kickoff.`,
    taskType: "TASK",
    status: "TODO",
    priority: "LOW",
    isPrivate: true,
    storyPoints: 1,
    estimatedHours: 2,
    loggedHours: 0,
    assignee: userSarah,
    reporter: userSarah,
    reviewer: null,
    qaTester: null,
    checklist: [],
    comments: [],
    workLogs: [],
    dependencies: [],
    customFields: [],
    tags: ["personal", "retro", "notes"],
    createdAt: "2026-08-19 15:00",
    updatedAt: "2026-08-19 15:00",
    _capabilities: {
      canEdit: true,
      canDelete: true,
      canMove: true,
      canAssign: true,
      canEstimate: true,
      canLogWork: true,
    },
  },
];
