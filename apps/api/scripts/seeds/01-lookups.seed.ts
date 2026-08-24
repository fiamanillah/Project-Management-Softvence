import type { ScopeResolutionStrategy } from "@workspace/db";
import type { SeedContext } from "./types";

export async function seedLookups(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  // 1. Permission Scope Types
  const SCOPE_TYPES: { code: string; name: string; description: string; resolutionStrategy: ScopeResolutionStrategy }[] = [
    { code: "GLOBAL", name: "Global Access", description: "Applies system-wide with no resource boundary constraints", resolutionStrategy: "Global" },
    { code: "OWN_BRANCH", name: "Own Branch", description: "Restricted to resources belonging to the user's branch or its sub-branches", resolutionStrategy: "OwnBranch" },
    { code: "OWN_DEPARTMENT", name: "Own Department", description: "Restricted to resources belonging to the user's department", resolutionStrategy: "OwnDepartment" },
    { code: "OWN_TEAM", name: "Own Team", description: "Restricted to resources belonging to teams the user actively belongs to", resolutionStrategy: "OwnTeam" },
    { code: "OWN_PROJECT", name: "Own Project", description: "Restricted to projects where the user is directly assigned", resolutionStrategy: "OwnProject" },
    { code: "OWN_PROFILE", name: "Own Profile", description: "Restricted to profiles assigned to the user", resolutionStrategy: "OwnProfile" },
    { code: "EXPLICIT_BRANCHES", name: "Explicit Branches", description: "Restricted to specifically selected branch scope targets", resolutionStrategy: "ExplicitBranches" },
    { code: "EXPLICIT_DEPARTMENTS", name: "Explicit Departments", description: "Restricted to specifically selected department scope targets", resolutionStrategy: "ExplicitDepartments" },
    { code: "EXPLICIT_TEAMS", name: "Explicit Teams", description: "Restricted to specifically selected team scope targets", resolutionStrategy: "ExplicitTeams" },
    { code: "EXPLICIT_PROJECTS", name: "Explicit Projects", description: "Restricted to specifically selected project scope targets", resolutionStrategy: "ExplicitProjects" },
  ];

  for (const item of SCOPE_TYPES) {
    const record = await prisma.permissionScopeType.upsert({
      where: { code: item.code },
      update: { name: item.name, description: item.description, resolutionStrategy: item.resolutionStrategy, isActive: true },
      create: { code: item.code, name: item.name, description: item.description, resolutionStrategy: item.resolutionStrategy, isActive: true },
    });
    ctx.scopeTypes.set(item.code, record.id);
  }

  // 2. Assignment Roles
  const ASSIGNMENT_ROLES = [
    { code: "TEAM_LEAD", name: "Team Lead", qualifiesForTeamScope: true },
    { code: "SR_DEV", name: "Senior Developer", qualifiesForTeamScope: false },
    { code: "DEV", name: "Developer", qualifiesForTeamScope: false },
    { code: "DESIGNER", name: "UI/UX Designer", qualifiesForTeamScope: false },
    { code: "QA", name: "QA Engineer", qualifiesForTeamScope: false },
    { code: "MEMBER", name: "Team Member", qualifiesForTeamScope: false },
  ];

  for (const role of ASSIGNMENT_ROLES) {
    const record = await prisma.assignmentRole.upsert({
      where: { code: role.code },
      update: { name: role.name, qualifiesForTeamScope: role.qualifiesForTeamScope, isActive: true },
      create: { code: role.code, name: role.name, qualifiesForTeamScope: role.qualifiesForTeamScope, isActive: true },
    });
    ctx.assignmentRoles.set(role.code, record.id);
  }

  // 3. Project Statuses
  const PROJECT_STATUSES = [
    { code: "NOT_STARTED", name: "Not Started", requiresAction: false, isTerminal: false, sortOrder: 1, color: "#64748b" },
    { code: "IN_PROGRESS", name: "In Progress", requiresAction: true, isTerminal: false, sortOrder: 2, color: "#3b82f6" },
    { code: "IN_REVIEW", name: "In Review", requiresAction: true, isTerminal: false, sortOrder: 3, color: "#8b5cf6" },
    { code: "ON_HOLD", name: "On Hold", requiresAction: false, isTerminal: false, sortOrder: 4, color: "#f59e0b" },
    { code: "DELIVERED", name: "Delivered", requiresAction: false, isTerminal: true, sortOrder: 5, color: "#10b981" },
    { code: "CANCELLED", name: "Cancelled", requiresAction: false, isTerminal: true, sortOrder: 6, color: "#ef4444" },
  ];

  for (const status of PROJECT_STATUSES) {
    const record = await prisma.projectStatus.upsert({
      where: { code: status.code },
      update: { name: status.name, requiresAction: status.requiresAction, isTerminal: status.isTerminal, sortOrder: status.sortOrder, color: status.color, isActive: true },
      create: { code: status.code, name: status.name, requiresAction: status.requiresAction, isTerminal: status.isTerminal, sortOrder: status.sortOrder, color: status.color, isActive: true },
    });
    ctx.projectStatuses.set(status.code, record.id);
  }

  // 4. Approval Status Lookups (Approval State Machine)
  const APPROVAL_STATUSES = [
    {
      code: "IN_REVIEW",
      name: "In Review",
      requiresLeadAction: true,
      requiresSalesAction: false,
      requiresAutoApproveCheck: false,
      isTerminal: false,
      sortOrder: 1,
      color: "#f59e0b",
    },
    {
      code: "PENDING_SALES",
      name: "Awaiting Dispatch",
      requiresLeadAction: false,
      requiresSalesAction: true,
      requiresAutoApproveCheck: false,
      isTerminal: false,
      sortOrder: 2,
      color: "#3b82f6",
    },
    {
      code: "DISPATCHED",
      name: "Dispatched",
      requiresLeadAction: false,
      requiresSalesAction: false,
      requiresAutoApproveCheck: false,
      isTerminal: true,
      sortOrder: 3,
      color: "#10b981",
    },
    {
      code: "REVISION_REQUESTED",
      name: "Revision Requested",
      requiresLeadAction: false,
      requiresSalesAction: false,
      requiresAutoApproveCheck: false,
      isTerminal: false,
      sortOrder: 4,
      color: "#ef4444",
    },
  ];

  for (const as of APPROVAL_STATUSES) {
    const record = await prisma.approvalStatusLookup.upsert({
      where: { code: as.code },
      update: {
        name: as.name,
        requiresLeadAction: as.requiresLeadAction,
        requiresSalesAction: as.requiresSalesAction,
        requiresAutoApproveCheck: as.requiresAutoApproveCheck,
        isTerminal: as.isTerminal,
        sortOrder: as.sortOrder,
        color: as.color,
        isActive: true,
      },
      create: {
        code: as.code,
        name: as.name,
        requiresLeadAction: as.requiresLeadAction,
        requiresSalesAction: as.requiresSalesAction,
        requiresAutoApproveCheck: as.requiresAutoApproveCheck,
        isTerminal: as.isTerminal,
        sortOrder: as.sortOrder,
        color: as.color,
        isActive: true,
      },
    });
    ctx.approvalStatuses.set(as.code, record.id);
  }

  // 5. Platforms
  const PLATFORMS = [
    { code: "UPWORK", name: "Upwork" },
    { code: "FIVERR", name: "Fiverr" },
    { code: "DIRECT", name: "Direct Client" },
    { code: "FREELANCER", name: "Freelancer.com" },
  ];

  for (const plat of PLATFORMS) {
    const record = await prisma.platform.upsert({
      where: { code: plat.code },
      update: { name: plat.name, isActive: true },
      create: { code: plat.code, name: plat.name, isActive: true },
    });
    ctx.platforms.set(plat.code, record.id);
  }

  // 6. Service Lines
  const SERVICE_LINES = [
    { name: "Web Application Development", slug: "web-app-dev" },
    { name: "Mobile App Development", slug: "mobile-app-dev" },
    { name: "UI/UX & Product Design", slug: "ui-ux-design" },
    { name: "AI & Machine Learning Engineering", slug: "ai-ml-engineering" },
    { name: "DevOps & Cloud Infrastructure", slug: "devops-cloud" },
    { name: "Enterprise ERP & Solutions", slug: "enterprise-erp" },
  ];

  for (const sl of SERVICE_LINES) {
    const record = await prisma.serviceLine.upsert({
      where: { slug: sl.slug },
      update: { name: sl.name, isActive: true },
      create: { name: sl.name, slug: sl.slug, isActive: true },
    });
    ctx.serviceLines.set(sl.slug, record.id);
  }

  // 7. Priorities
  const PRIORITIES = [
    { code: "LOW", name: "Low", level: 1, color: "#64748b" },
    { code: "MEDIUM", name: "Medium", level: 2, color: "#3b82f6" },
    { code: "HIGH", name: "High", level: 3, color: "#f59e0b" },
    { code: "URGENT", name: "Urgent", level: 4, color: "#f97316" },
    { code: "CRITICAL", name: "Critical", level: 5, color: "#ef4444" },
  ];

  for (const prio of PRIORITIES) {
    const record = await prisma.priority.upsert({
      where: { code: prio.code },
      update: { name: prio.name, level: prio.level, color: prio.color, isActive: true },
      create: { code: prio.code, name: prio.name, level: prio.level, color: prio.color, isActive: true },
    });
    ctx.priorities.set(prio.code, record.id);
  }

  // 8. Issue Types
  const ISSUE_TYPES = [
    { code: "BUG", name: "Bug / Defect" },
    { code: "FEATURE", name: "Feature Request" },
    { code: "TECH_DEBT", name: "Technical Debt" },
    { code: "SECURITY", name: "Security Vulnerability" },
    { code: "UI_GLITCH", name: "UI/Visual Glitch" },
    { code: "PERFORMANCE", name: "Performance Optimization" },
  ];

  for (const it of ISSUE_TYPES) {
    const record = await prisma.issueType.upsert({
      where: { code: it.code },
      update: { name: it.name, isActive: true },
      create: { code: it.code, name: it.name, isActive: true },
    });
    ctx.issueTypes.set(it.code, record.id);
  }

  // 9. Support Ticket Statuses
  const TICKET_STATUSES = [
    { code: "OPEN", name: "Open", isTerminal: false, sortOrder: 1 },
    { code: "IN_PROGRESS", name: "In Progress", isTerminal: false, sortOrder: 2 },
    { code: "WAITING_CLIENT", name: "Waiting for Client", isTerminal: false, sortOrder: 3 },
    { code: "RESOLVED", name: "Resolved", isTerminal: true, sortOrder: 4 },
    { code: "CLOSED", name: "Closed", isTerminal: true, sortOrder: 5 },
  ];

  for (const ts of TICKET_STATUSES) {
    const record = await prisma.supportTicketStatus.upsert({
      where: { code: ts.code },
      update: { name: ts.name, isTerminal: ts.isTerminal, sortOrder: ts.sortOrder, isActive: true },
      create: { code: ts.code, name: ts.name, isTerminal: ts.isTerminal, sortOrder: ts.sortOrder, isActive: true },
    });
    ctx.ticketStatuses.set(ts.code, record.id);
  }

  // 10. Modern Dynamic Message Types (Unified Conversation & Approval Pipeline)
  const MESSAGE_TYPES = [
    {
      code: "INTERNAL_NOTE",
      name: "Internal Discussion Note",
      label: "Internal Note",
      direction: "INTERNAL",
      colorHex: "#64748b",
      description: "Squad engineering discussion, standup note, or internal technical query",
      requiresApproval: false,
      isSystem: true,
      sortOrder: 1,
    },
    {
      code: "TECH_UPDATE",
      name: "Technical Standup & Architecture",
      label: "Tech Standup",
      direction: "INTERNAL",
      colorHex: "#0ea5e9",
      description: "Technical architectural decision, PR deployment note, or test report",
      requiresApproval: false,
      isSystem: false,
      sortOrder: 2,
    },
    {
      code: "STATUS_UPDATE",
      name: "Client Milestone Status Update",
      label: "Status Update",
      direction: "OUTBOUND",
      colorHex: "#3b82f6",
      description: "Sprint / milestone progress update for the client",
      requiresApproval: true,
      isSystem: false,
      sortOrder: 3,
    },
    {
      code: "DELIVERY",
      name: "Milestone Deliverable Handover",
      label: "Delivery Notice",
      direction: "OUTBOUND",
      colorHex: "#10b981",
      description: "Official completed milestone submission and deliverables handover",
      requiresApproval: true,
      isSystem: false,
      sortOrder: 4,
    },
    {
      code: "EXTENSION_REQUEST",
      name: "Timeline Extension Request",
      label: "Extension Request",
      direction: "OUTBOUND",
      colorHex: "#f59e0b",
      description: "Formal request for deadline extension or milestone rescheduling",
      requiresApproval: true,
      isSystem: false,
      sortOrder: 5,
    },
    {
      code: "SCOPE_REVISION",
      name: "Scope Clarification & Revision",
      label: "Scope Revision",
      direction: "OUTBOUND",
      colorHex: "#8b5cf6",
      description: "Scope change proposal or requirement clarification notice",
      requiresApproval: true,
      isSystem: false,
      sortOrder: 6,
    },
    {
      code: "GENERAL_NOTICE",
      name: "General Client Notice",
      label: "General Notice",
      direction: "OUTBOUND",
      colorHex: "#6366f1",
      description: "General outbound communication or query to client",
      requiresApproval: true,
      isSystem: true,
      sortOrder: 7,
    },
    {
      code: "CLIENT_REPLY",
      name: "Client Inquiry Response",
      label: "Client Reply",
      direction: "OUTBOUND",
      colorHex: "#14b8a6",
      description: "Response to client feedback, comments, or inquiries",
      requiresApproval: true,
      isSystem: false,
      sortOrder: 8,
    },
    {
      code: "PAYMENT_ESCROW",
      name: "Escrow Milestone Activation",
      label: "Escrow Request",
      direction: "OUTBOUND",
      colorHex: "#84cc16",
      description: "Request to activate or fund next project escrow milestone",
      requiresApproval: true,
      isSystem: false,
      sortOrder: 9,
    },
    {
      code: "MEETING_SUMMARY",
      name: "Client Meeting Summary & Action Items",
      label: "Meeting Summary",
      direction: "OUTBOUND",
      colorHex: "#a855f7",
      description: "Post-call meeting notes, agreed scope, and next steps",
      requiresApproval: true,
      isSystem: false,
      sortOrder: 10,
    },
    {
      code: "CLIENT_INBOUND",
      name: "Inbound Client Message Relay",
      label: "Client Inbound",
      direction: "INBOUND",
      colorHex: "#ec4899",
      description: "Relayed message received from external client platform (Upwork, Fiverr, etc.)",
      requiresApproval: false,
      isSystem: true,
      sortOrder: 11,
    },
    {
      code: "BUG_REPORT",
      name: "Inbound Client Defect / Bug Report",
      label: "Bug Report",
      direction: "INBOUND",
      colorHex: "#ef4444",
      description: "Defect or issue reported by client during testing or UAT",
      requiresApproval: false,
      isSystem: false,
      sortOrder: 12,
    },
    // Legacy aliases for backwards compatibility
    {
      code: "CLIENT_UPDATE",
      name: "Client Status Update (Legacy)",
      label: "Status Update",
      direction: "OUTBOUND",
      colorHex: "#3b82f6",
      description: "Legacy status update code",
      requiresApproval: true,
      isSystem: false,
      sortOrder: 13,
    },
    {
      code: "DELIVERY_NOTICE",
      name: "Milestone Delivery Notice (Legacy)",
      label: "Delivery Notice",
      direction: "OUTBOUND",
      colorHex: "#10b981",
      description: "Legacy milestone delivery notice",
      requiresApproval: true,
      isSystem: false,
      sortOrder: 14,
    },
  ];

  for (const mt of MESSAGE_TYPES) {
    const record = await prisma.messageType.upsert({
      where: { code: mt.code },
      update: {
        name: mt.name,
        label: mt.label,
        direction: mt.direction,
        colorHex: mt.colorHex,
        description: mt.description,
        requiresApproval: mt.requiresApproval,
        isSystem: mt.isSystem,
        sortOrder: mt.sortOrder,
        isActive: true,
      },
      create: {
        code: mt.code,
        name: mt.name,
        label: mt.label,
        direction: mt.direction,
        colorHex: mt.colorHex,
        description: mt.description,
        requiresApproval: mt.requiresApproval,
        isSystem: mt.isSystem,
        sortOrder: mt.sortOrder,
        isActive: true,
      },
    });
    ctx.messageTypes.set(mt.code, record.id);
  }

  // 11. Notification Types
  const NOTIFICATION_TYPES = [
    { code: "PROJECT_ASSIGNED", name: "Project Assigned", defaultTitleTemplate: "You have been assigned to project: {{projectName}}" },
    { code: "ISSUE_CREATED", name: "Issue Created", defaultTitleTemplate: "New issue #{{issueId}} created on {{projectName}}" },
    { code: "MESSAGE_APPROVAL_REQUIRED", name: "Message Approval Required", defaultTitleTemplate: "Pending message approval for project {{projectName}}" },
    { code: "TASK_DUE_SOON", name: "Milestone Due Soon", defaultTitleTemplate: "Milestone is due within 24 hours" },
    { code: "SYSTEM_ALERT", name: "System Alert", defaultTitleTemplate: "System notice: {{alertMessage}}" },
    { code: "DISPATCH_CONFIRMED", name: "Message Dispatched", defaultTitleTemplate: "Outbound message dispatched to {{clientName}}" },
    { code: "REVISION_REQUIRED", name: "Revision Requested", defaultTitleTemplate: "Revision requested on your message draft" },
  ];

  for (const nt of NOTIFICATION_TYPES) {
    const record = await prisma.notificationType.upsert({
      where: { code: nt.code },
      update: { name: nt.name, defaultTitleTemplate: nt.defaultTitleTemplate, isActive: true },
      create: { code: nt.code, name: nt.name, defaultTitleTemplate: nt.defaultTitleTemplate, isActive: true },
    });
    ctx.notificationTypes.set(nt.code, record.id);
  }

  // 12. Order Sources
  const ORDER_SOURCES = [
    { code: "BID_PROPOSAL_ORDER", name: "Bid/Proposal Order", description: "Direct competitive bid on platform" },
    { code: "BRIEF_INVITATION", name: "Brief/Invitation", description: "Direct client invite or private brief" },
    { code: "CONVERSION_QUERY", name: "Conversion/Query", description: "Inquiry converted to contract" },
    { code: "FIXED_CLIENT", name: "Fixed Client", description: "Long-term retainer client" },
    { code: "REPEAT_ORDER", name: "Repeat Order", description: "Follow-up project from existing client" },
    { code: "SPECIAL_ORDER", name: "Special Order", description: "Custom scoped bespoke project" },
    { code: "SVA_DIRECT_PROJECT", name: "SVA Direct Project", description: "Direct agency contract" },
    { code: "B2B", name: "B2B Partnership", description: "Enterprise white-label or agency partner" },
    { code: "CONSULTATION", name: "Consultation", description: "Discovery & technical architecture advisory" },
  ];

  for (const os of ORDER_SOURCES) {
    const record = await prisma.orderSource.upsert({
      where: { code: os.code },
      update: { name: os.name, description: os.description, isActive: true },
      create: { code: os.code, name: os.name, description: os.description, isActive: true },
    });
    ctx.orderSources.set(os.code, record.id);
  }

  // 13. BD Order Types
  const BD_ORDER_TYPES = [
    { code: "DIRECT_LEAD", name: "Direct Client Inbound" },
    { code: "UPWORK_PROPOSAL", name: "Upwork Custom Proposal" },
    { code: "FIVERR_GIG", name: "Fiverr Pro Custom Offer" },
    { code: "ENTERPRISE_RFP", name: "Enterprise RFP" },
    { code: "CONSULTATION_INQUIRY", name: "Paid Consultation Booking" },
  ];

  for (const bot of BD_ORDER_TYPES) {
    const record = await prisma.bdOrderType.upsert({
      where: { code: bot.code },
      update: { name: bot.name, isActive: true },
      create: { code: bot.code, name: bot.name, isActive: true },
    });
    ctx.bdOrderTypes.set(bot.code, record.id);
  }

  // 14. Station Types
  const STATION_TYPES = [
    { code: "SALES_PRIMARY", name: "Sales Primary Workstation", description: "Dedicated desk for active inbound/outbound client communications and deal closing", isSales: true, sortOrder: 1 },
    { code: "SALES_OUTBOUND", name: "Outbound Bidding Desk", description: "High-frequency proposal submission and lead generation station", isSales: true, sortOrder: 2 },
    { code: "SALES_ROTATIONAL", name: "Rotational Shift Desk", description: "Shared workstation utilized across rotational Day/Night shifts", isSales: true, sortOrder: 3 },
    { code: "DEV_GENERAL", name: "Engineering Workstation", description: "Technical implementation, sprint execution, and code delivery desk", isSales: false, sortOrder: 4 },
    { code: "SUPPORT_DESK", name: "Client Operations & Support", description: "Client relationship management and production support desk", isSales: false, sortOrder: 5 },
  ];

  for (const st of STATION_TYPES) {
    const record = await prisma.stationType.upsert({
      where: { code: st.code },
      update: { name: st.name, description: st.description, isSales: st.isSales, sortOrder: st.sortOrder, isActive: true },
      create: { code: st.code, name: st.name, description: st.description, isSales: st.isSales, sortOrder: st.sortOrder, isActive: true },
    });
    ctx.stationTypes.set(st.code, record.id);
  }

  // 15. Station Status Lookups
  const STATION_STATUSES = [
    { code: "OPERATIONAL", name: "Operational", isOperational: true, isMaintenance: false, color: "#10b981", sortOrder: 1 },
    { code: "OCCUPIED", name: "In Active Shift", isOperational: true, isMaintenance: false, color: "#3b82f6", sortOrder: 2 },
    { code: "MAINTENANCE", name: "Under Maintenance", isOperational: false, isMaintenance: true, color: "#f59e0b", sortOrder: 3 },
    { code: "OFFLINE", name: "Decommissioned / Offline", isOperational: false, isMaintenance: false, color: "#ef4444", sortOrder: 4 },
  ];

  for (const ss of STATION_STATUSES) {
    const record = await prisma.stationStatusLookup.upsert({
      where: { code: ss.code },
      update: { name: ss.name, isOperational: ss.isOperational, isMaintenance: ss.isMaintenance, color: ss.color, sortOrder: ss.sortOrder, isActive: true },
      create: { code: ss.code, name: ss.name, isOperational: ss.isOperational, isMaintenance: ss.isMaintenance, color: ss.color, sortOrder: ss.sortOrder, isActive: true },
    });
    ctx.stationStatuses.set(ss.code, record.id);
  }

  // 16. Station Assignment Roles
  const STATION_ROLES = [
    { code: "STATION_LEAD", name: "Station Shift Lead", canManageProfiles: true, canOperate: true },
    { code: "SALES_OPERATOR", name: "Sales Account Operator", canManageProfiles: false, canOperate: true },
    { code: "DEV_OPERATOR", name: "Developer Operator", canManageProfiles: false, canOperate: true },
    { code: "MONITOR_ONLY", name: "Shift Observer / Trainee", canManageProfiles: false, canOperate: false },
  ];

  for (const sr of STATION_ROLES) {
    const record = await prisma.stationAssignmentRole.upsert({
      where: { code: sr.code },
      update: { name: sr.name, canManageProfiles: sr.canManageProfiles, canOperate: sr.canOperate, isActive: true },
      create: { code: sr.code, name: sr.name, canManageProfiles: sr.canManageProfiles, canOperate: sr.canOperate, isActive: true },
    });
    ctx.stationRoles.set(sr.code, record.id);
  }
}
