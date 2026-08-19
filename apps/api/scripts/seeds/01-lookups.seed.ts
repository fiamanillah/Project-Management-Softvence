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

  // 4. Platforms
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

  // 5. Service Lines
  const SERVICE_LINES = [
    { name: "Web Application Development", slug: "web-app-dev" },
    { name: "Mobile App Development", slug: "mobile-app-dev" },
    { name: "UI/UX & Product Design", slug: "ui-ux-design" },
    { name: "AI & Machine Learning Engineering", slug: "ai-ml-engineering" },
    { name: "DevOps & Cloud Infrastructure", slug: "devops-cloud" },
  ];

  for (const sl of SERVICE_LINES) {
    const record = await prisma.serviceLine.upsert({
      where: { slug: sl.slug },
      update: { name: sl.name, isActive: true },
      create: { name: sl.name, slug: sl.slug, isActive: true },
    });
    ctx.serviceLines.set(sl.slug, record.id);
  }

  // 6. Priorities
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

  // 7. Issue Types
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

  // 8. Support Ticket Statuses
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

  // 9. Message Types
  const MESSAGE_TYPES = [
    { code: "CLIENT_UPDATE", name: "Client Status Update" },
    { code: "INTERNAL_NOTE", name: "Internal Team Note" },
    { code: "DELIVERY_NOTICE", name: "Milestone Delivery Notice" },
    { code: "REQUIREMENT_CLARIFICATION", name: "Requirement Clarification" },
    { code: "ESCALATION", name: "Escalation & Blocking Issue" },
  ];

  for (const mt of MESSAGE_TYPES) {
    const record = await prisma.messageType.upsert({
      where: { code: mt.code },
      update: { name: mt.name, isActive: true },
      create: { code: mt.code, name: mt.name, isActive: true },
    });
    ctx.messageTypes.set(mt.code, record.id);
  }

  // 10. Notification Types
  const NOTIFICATION_TYPES = [
    { code: "PROJECT_ASSIGNED", name: "Project Assigned", defaultTitleTemplate: "You have been assigned to project: {{projectName}}" },
    { code: "ISSUE_CREATED", name: "Issue Created", defaultTitleTemplate: "New issue #{{issueId}} created on {{projectName}}" },
    { code: "MESSAGE_APPROVAL_REQUIRED", name: "Message Approval Required", defaultTitleTemplate: "Pending message approval for project {{projectName}}" },
    { code: "TASK_DUE_SOON", name: "Milestone Due Soon", defaultTitleTemplate: "Milestone is due within 24 hours" },
    { code: "SYSTEM_ALERT", name: "System Alert", defaultTitleTemplate: "System notice: {{alertMessage}}" },
  ];

  for (const nt of NOTIFICATION_TYPES) {
    const record = await prisma.notificationType.upsert({
      where: { code: nt.code },
      update: { name: nt.name, defaultTitleTemplate: nt.defaultTitleTemplate, isActive: true },
      create: { code: nt.code, name: nt.name, defaultTitleTemplate: nt.defaultTitleTemplate, isActive: true },
    });
    ctx.notificationTypes.set(nt.code, record.id);
  }

  // 11. Order Sources
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

  // 12. BD Order Types
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
}
