// apps/api/src/Modules/Projects/services/projects.capability.helper.ts

import type { PrismaClient } from "@workspace/db";
import { BadRequestError } from "@/core/errors/AppError";
import { can, getUserPermissions } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type {
  ProjectItem,
  ProjectCapabilities,
  ProjectWorkspaceItem,
  ProjectMessageItem,
  ProjectMessageCapabilities,
} from "../ProjectDTO";

/**
 * Extracts authorization resource context from a project model.
 */
export function getProjectResourceContext(project: any) {
  const primaryTeamAssignment =
    project.teamAssignments?.find((ta: any) => !ta.unassignedAt) ||
    project.teamAssignments?.[0];
  return {
    projectId: project.id,
    teamId: primaryTeamAssignment?.teamId || primaryTeamAssignment?.team?.id,
    departmentId:
      primaryTeamAssignment?.team?.departmentId ||
      primaryTeamAssignment?.team?.department?.id,
    profileId: project.profileId,
  };
}

/**
 * Validates whether a string matches standard UUID v4 format.
 */
export function isUuid(value?: string | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Safely finds a project by UUID or code/slug without throwing PostgreSQL UUID syntax errors.
 */
export async function findProjectByIdOrCode<T = any>(
  prisma: PrismaClient,
  idOrCode: string,
  include?: any,
  select?: any,
): Promise<T | null> {
  if (!idOrCode) return null;
  if (isUuid(idOrCode)) {
    return prisma.project.findFirst({
      where: { id: idOrCode, deletedAt: null },
      ...(include ? { include } : {}),
      ...(select ? { select } : {}),
    }) as Promise<T | null>;
  }
  return prisma.project.findFirst({
    where: {
      OR: [
        { code: { equals: idOrCode, mode: "insensitive" } },
        { projectName: { equals: idOrCode, mode: "insensitive" } },
      ],
      deletedAt: null,
    },
    ...(include ? { include } : {}),
    ...(select ? { select } : {}),
  }) as Promise<T | null>;
}

/**
 * Generates a unique structured project code/identifier (e.g. PRJ-202608-4821).
 */
export async function generateProjectCode(prisma: PrismaClient): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `PRJ-${year}${month}-`;

  for (let attempt = 0; attempt < 20; attempt++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidateCode = `${prefix}${randomSuffix}`;
    const existing = await prisma.project.findFirst({
      where: { projectName: candidateCode },
      select: { id: true },
    });
    if (!existing) {
      return candidateCode;
    }
  }
  return `${prefix}${Date.now().toString().slice(-4)}`;
}

/**
 * Validates that setting targetParentId does not create a circular dependency in project hierarchy.
 */
export async function validateHierarchyNoCycles(
  prisma: PrismaClient,
  projectId: string,
  targetParentId: string,
): Promise<void> {
  if (projectId === targetParentId) {
    throw new BadRequestError("A project cannot be its own parent");
  }

  let currentParentId: string | null = targetParentId;
  const visited = new Set<string>([projectId]);

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      throw new BadRequestError("Circular hierarchy reference detected in project parent hierarchy");
    }
    visited.add(currentParentId);

    const parent: { parentId: string | null } | null = await prisma.project.findUnique({
      where: { id: currentParentId },
      select: { parentId: true },
    });
    currentParentId = parent?.parentId || null;
  }
}

/**
 * Builds the scoped WHERE filter for project queries based on the actor's permissions and scope (Rules BE-1, BE-17).
 * Returns null if user has Global/Override scope or is SuperAdmin, or an array of Prisma OR conditions.
 */
export async function buildProjectScopedWhereConditions(
  prisma: PrismaClient,
  actor: AuthenticatedUser,
): Promise<any[] | null> {
  if (actor.systemRole === "SuperAdmin") {
    return null;
  }

  const userPerms = await getUserPermissions(actor);
  const viewPerm = userPerms["project.view"];
  const isGlobal = viewPerm?.scope === "Global" || viewPerm?.scope === "Override";

  if (isGlobal) {
    return null;
  }

  // Collect user's assigned teams
  const userTeams = await prisma.teamMember.findMany({
    where: { userId: actor.id, leftAt: null },
    select: { teamId: true, team: { select: { departmentId: true } } },
  });

  const userTeamIds = userTeams.map((t) => t.teamId);
  const userDeptIds = Array.from(
    new Set(userTeams.map((t) => t.team.departmentId).filter(Boolean)),
  );

  const scopedConditions: any[] = [
    // 1. Direct Project Assignment
    {
      userAssignments: {
        some: {
          userId: actor.id,
          unassignedAt: null,
        },
      },
    },
    // 2. Direct Component Assignment
    {
      components: {
        some: {
          userAssignments: {
            some: {
              userId: actor.id,
              unassignedAt: null,
            },
          },
        },
      },
    },
  ];

  // 3. Team Assignment (OwnTeam or higher)
  if (userTeamIds.length > 0) {
    scopedConditions.push({
      teamAssignments: {
        some: {
          teamId: { in: userTeamIds },
          unassignedAt: null,
        },
      },
    });
  }

  // 4. Department Scope (OwnDepartment)
  if (viewPerm?.scope === "OwnDepartment" && userDeptIds.length > 0) {
    scopedConditions.push({
      teamAssignments: {
        some: {
          team: { departmentId: { in: userDeptIds } },
          unassignedAt: null,
        },
      },
    });
  }

  return scopedConditions;
}

/**
 * Evaluates scoped permissions for a project and generates its _capabilities map.
 */
export async function computeProjectCapabilities(
  project: any,
  actor: AuthenticatedUser,
): Promise<ProjectCapabilities> {
  const resourceContext = getProjectResourceContext(project);

  const [
    canEdit,
    canDelete,
    canReassign,
    canManageMembers,
    canManageComponents,
    canViewClient,
    canViewFinancials,
    canEditFinancials,
    canChatView,
    canChatSend,
    canSendClientMessage,
    canPinMessage,
    canManageTypes,
    canLeadApprove,
    canSalesDispatch,
    canManageCollateral,
  ] = await Promise.all([
    can(actor, "project.edit", resourceContext),
    can(actor, "project.delete", resourceContext),
    can(actor, "project.reassign", resourceContext),
    can(actor, "project.manage_members", resourceContext),
    can(actor, "project.component.manage", resourceContext),
    can(actor, "project.client.view", resourceContext),
    can(actor, "project.financial.view", resourceContext),
    can(actor, "project.financial.edit", resourceContext),
    can(actor, "project.chat.view", resourceContext),
    can(actor, "project.chat.send", resourceContext),
    can(actor, "project.chat.send_client", resourceContext),
    can(actor, "project.chat.pin", resourceContext),
    can(actor, "project.chat.manage_types", resourceContext),
    can(actor, "project.approval.lead_review", resourceContext),
    can(actor, "project.approval.sales_dispatch", resourceContext),
    can(actor, "project.collateral.manage", resourceContext),
  ]);

  return {
    canEdit,
    canDelete,
    canReassign,
    canManageMembers,
    canManageComponents,
    canViewClient,
    canViewFinancials,
    canEditFinancials,
    canChatView,
    canChatSend,
    canSendClientMessage,
    canPinMessage,
    canManageTypes,
    canLeadApprove,
    canSalesDispatch,
    canRequestRevision: canLeadApprove || canSalesDispatch,
    canManageCollateral,
  };
}

/**
 * Sanitizes sensitive fields and decorates projects with server-side _capabilities.
 */
export async function sanitizeAndDecorateProject(
  project: any,
  actor: AuthenticatedUser,
): Promise<ProjectItem> {
  const capabilities = await computeProjectCapabilities(project, actor);
  const { canViewClient, canViewFinancials } = capabilities;

  const sanitized: any = {
    ...project,
    value: canViewFinancials ? (project.value !== null ? Number(project.value) : 0) : null,
    amount: canViewFinancials
      ? project.amount !== null && project.amount !== undefined
        ? Number(project.amount)
        : null
      : null,
    percentage: canViewFinancials
      ? project.percentage !== null && project.percentage !== undefined
        ? Number(project.percentage)
        : null
      : null,
    orderSheetUrl: canViewFinancials ? project.orderSheetUrl : null,
    email: canViewClient ? project.email : null,
    clientId: canViewClient ? project.clientId : null,
    client: canViewClient ? project.client : null,
    profileId: canViewClient ? project.profileId : null,
    profile: canViewClient
      ? project.profile
      : project.profile
        ? {
            ...project.profile,
            username: "Confidential Profile",
            platform: project.profile.platform ? { name: project.profile.platform.name } : undefined,
          }
        : null,
    _capabilities: capabilities,
  };

  if (Array.isArray(project.subProjects)) {
    sanitized.subProjects = await Promise.all(
      project.subProjects.map((sp: any) => sanitizeAndDecorateProject(sp, actor)),
    );
  }

  return sanitized as ProjectItem;
}

/**
 * Sanitizes and decorates a workspace project item for the Manage Projects command center.
 */
export async function sanitizeAndDecorateWorkspaceProject(
  project: any,
  actor: AuthenticatedUser,
  counts?: { unreadCount?: number; pendingApprovalsCount?: number; onlineCount?: number },
): Promise<ProjectWorkspaceItem> {
  const capabilities = await computeProjectCapabilities(project, actor);
  const { canViewClient, canViewFinancials } = capabilities;

  // Format client info with sensitivity masking
  const clientData = {
    name: canViewClient ? project.client?.name || "Client" : "Protected Client",
    email: canViewClient ? project.client?.email || project.email || null : null,
    company: canViewClient ? project.client?.company || project.profile?.username || null : null,
    avatar: project.client?.avatarUrl || null,
    platform: project.client?.platform?.name || project.orderSource?.name || null,
  };

  // Format lead info
  const leadAssignment = project.userAssignments?.find(
    (ua: any) =>
      !ua.unassignedAt &&
      (ua.role?.code?.toLowerCase().includes("lead") ||
        ua.role?.code?.toLowerCase().includes("pm") ||
        ua.role?.name?.toLowerCase().includes("lead") ||
        ua.role?.name?.toLowerCase().includes("manager")),
  );

  const leadMember = leadAssignment
    ? {
        id: leadAssignment.user.id,
        name: `${leadAssignment.user.firstName} ${leadAssignment.user.lastName}`,
        email: leadAssignment.user.email,
        avatar: leadAssignment.user.avatarUrl || null,
        designation: leadAssignment.user.designation?.name || leadAssignment.role?.name || "Lead",
        role: leadAssignment.role?.name || "Lead",
        isOnline: false,
        department: leadAssignment.user.role?.department?.name || null,
      }
    : null;

  // Format teams summary
  const teams: any[] = (project.teamAssignments || [])
    .filter((ta: any) => !ta.unassignedAt && ta.team)
    .map((ta: any) => ({
      id: ta.team.id,
      name: ta.team.name,
      departmentName: ta.team.department?.name || null,
      memberCount: ta.team.members?.filter((m: any) => !m.leftAt).length || 0,
    }));

  // Format assigned members
  const members: any[] = (project.userAssignments || [])
    .filter((ua: any) => !ua.unassignedAt && ua.user)
    .map((ua: any) => ({
      id: ua.user.id,
      name: `${ua.user.firstName} ${ua.user.lastName}`,
      email: ua.user.email,
      avatar: ua.user.avatarUrl || null,
      designation: ua.user.designation?.name || ua.role?.name || "Member",
      role: ua.role?.name || "Member",
      isOnline: false,
      department: ua.user.role?.department?.name || null,
    }));

  // Format milestones
  const milestones: any[] = (project.milestones || []).map((m: any) => ({
    id: m.id,
    projectId: m.projectId,
    title: m.title,
    dueDate: m.dueDate ? new Date(m.dueDate).toISOString() : "",
    isCompleted: m.isCompleted,
    assignedTo: m.assignedTo ? `${m.assignedTo.firstName} ${m.assignedTo.lastName}` : null,
    assignedToUser: m.assignedTo
      ? {
          id: m.assignedTo.id,
          name: `${m.assignedTo.firstName} ${m.assignedTo.lastName}`,
          avatar: m.assignedTo.avatarUrl || null,
        }
      : null,
    deliverableCount: m.deliverableCount || 0,
    completedAt: m.completedAt ? new Date(m.completedAt).toISOString() : null,
  }));

  // Format links
  const links: any[] = (project.links || []).map((l: any) => ({
    id: l.id,
    projectId: l.projectId,
    title: l.title,
    url: l.url,
    category: l.category || "Other",
    description: l.description || null,
    addedAt: new Date(l.createdAt).toISOString(),
    addedBy: l.addedBy
      ? {
          id: l.addedBy.id,
          name: `${l.addedBy.firstName} ${l.addedBy.lastName}`,
        }
      : null,
  }));

  // Format pinned messages
  const pinnedAnnouncements: any[] = (project.projectMessages || [])
    .filter((m: any) => m.isPinned && !m.deletedAt)
    .map((m: any) => ({
      id: m.id,
      messageId: m.id,
      message: m.text,
      author: m.sender ? `${m.sender.firstName} ${m.sender.lastName}` : "Team Member",
      authorAvatar: m.sender?.avatarUrl || null,
      authorDesignation: m.sender?.designation?.name || null,
      timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }));

  // Format last message
  const lastMsg = project.projectMessages?.[0];
  const lastMessage = lastMsg
    ? {
        id: lastMsg.id,
        senderName: lastMsg.sender ? `${lastMsg.sender.firstName} ${lastMsg.sender.lastName}` : "Team",
        text: lastMsg.text,
        timestamp: new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isRead: true,
        purpose: lastMsg.purpose,
        createdAt: new Date(lastMsg.createdAt).toISOString(),
      }
    : null;

  const lastActivityAt = lastMsg?.createdAt
    ? new Date(lastMsg.createdAt).toISOString()
    : new Date(project.updatedAt || project.createdAt).toISOString();

  // Compute attention type
  let attentionType: "CLIENT_MESSAGE" | "PENDING_APPROVAL" | "REVISION_REQUESTED" | "NEW_MESSAGE" | null = null;
  if ((counts?.pendingApprovalsCount || 0) > 0) {
    attentionType = "PENDING_APPROVAL";
  } else if (lastMsg && (lastMsg.purpose === "CLIENT_COMMUNICATION" || lastMsg.isFromClient)) {
    attentionType = "CLIENT_MESSAGE";
  } else if ((counts?.unreadCount || 0) > 0) {
    attentionType = "NEW_MESSAGE";
  }

  return {
    id: project.id,
    code: project.orderId || project.projectName || "PRJ-0000",
    name: project.projectName || "Unnamed Project",
    description: project.remarks || null,
    client: clientData,
    status: {
      id: project.status?.id || "",
      name: project.status?.name || "Active",
      color: project.status?.color || "#3b82f6",
      isTerminal: project.status?.isTerminal || false,
    },
    priority: {
      id: project.priority?.id || "priority-default",
      name: project.priority?.name || "Medium",
      level: project.priority?.level || 2,
      color: project.priority?.color || "#f59e0b",
    },
    serviceLine: project.serviceLine?.name || project.service || "Engineering",
    orderSource: project.orderSource?.name || project.client?.platform?.name || "Direct Contract",
    budget: canViewFinancials
      ? project.budget !== null && project.budget !== undefined
        ? Number(project.budget)
        : Number(project.value || 0)
      : null,
    deadline: project.deadline
      ? new Date(project.deadline).toLocaleDateString()
      : project.deliveryDate
        ? new Date(project.deliveryDate).toLocaleDateString()
        : "TBD",
    progress: project.progress || 0,
    isPinned: project.isPinned || false,
    unreadCount: counts?.unreadCount || 0,
    pendingApprovalsCount: counts?.pendingApprovalsCount || 0,
    onlineCount: counts?.onlineCount || 0,
    pinnedAnnouncements,
    lead: leadMember,
    teams,
    members,
    links,
    milestones,
    lastMessage,
    lastActivityAt,
    createdAt: project.createdAt ? new Date(project.createdAt).toISOString() : null,
    attentionType,
    _capabilities: capabilities,
  };
}

/**
 * Sanitizes and decorates a project chat message with permissions and capabilities.
 */
export async function sanitizeAndDecorateMessage(
  message: any,
  actor: AuthenticatedUser,
  projectContext: any,
): Promise<ProjectMessageItem> {
  const resourceContext = getProjectResourceContext(projectContext);
  const isAuthor = message.senderId === actor.id;

  const [canLeadApprove, canSalesDispatch, canPin, canDeleteGlobal] = await Promise.all([
    can(actor, "project.approval.lead_review", resourceContext),
    can(actor, "project.approval.sales_dispatch", resourceContext),
    can(actor, "project.chat.pin", resourceContext),
    can(actor, "project.edit", resourceContext),
  ]);

  const capabilities: ProjectMessageCapabilities = {
    canLeadApprove,
    canSalesDispatch,
    canRequestRevision: canLeadApprove || canSalesDispatch,
    canPin,
    canDelete: isAuthor || canDeleteGlobal,
    canEdit: isAuthor,
  };

  // Format reactions with reactedByMe flag
  const reactionsMap = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const r of message.reactions || []) {
    const entry = reactionsMap.get(r.emoji) || { count: 0, reactedByMe: false };
    entry.count += 1;
    if (r.userId === actor.id) {
      entry.reactedByMe = true;
    }
    reactionsMap.set(r.emoji, entry);
  }

  const reactions = Array.from(reactionsMap.entries()).map(([emoji, val]) => ({
    emoji,
    count: val.count,
    reactedByMe: val.reactedByMe,
  }));

  // Format read receipts
  const seenBy = (message.reads || []).map((rd: any) => ({
    userId: rd.userId,
    userName: rd.user ? `${rd.user.firstName} ${rd.user.lastName}` : "User",
    userAvatar: rd.user?.avatarUrl || null,
    userDesignation: rd.user?.designation?.name || null,
    seenAt: new Date(rd.seenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }));

  // Format approval workflow
  let approval: any = null;
  if (message.approvalWorkflow) {
    const wf = message.approvalWorkflow;
    approval = {
      id: wf.id,
      status: wf.status?.code || "PENDING_LEAD",
      clientMessageType: message.messageType?.code || wf.clientMessageType || "GENERAL_NOTICE",
      requestedBy: wf.requestedBy ? `${wf.requestedBy.firstName} ${wf.requestedBy.lastName}` : "Author",
      requestedAt: new Date(wf.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      targetClient: wf.targetClientName,
      slaTargetMinutes: wf.slaTargetMinutes || 30,
      slaStatus: wf.slaStatus || "ON_TRACK",
      leadApprovedBy: wf.leadApprover ? `${wf.leadApprover.firstName} ${wf.leadApprover.lastName}` : null,
      leadApprovedAt: wf.leadApprovedAt ? new Date(wf.leadApprovedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null,
      salesDispatchedBy: wf.salesDispatcher ? `${wf.salesDispatcher.firstName} ${wf.salesDispatcher.lastName}` : null,
      salesDispatchedAt: wf.salesDispatchedAt ? new Date(wf.salesDispatchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null,
      dispatchPlatform: wf.dispatchPlatform || null,
      dispatchReferenceId: wf.dispatchReferenceId || null,
      rejectionReason: wf.rejectionReason || null,
      rejectedBy: wf.rejector ? `${wf.rejector.firstName} ${wf.rejector.lastName}` : null,
      rejectedAt: wf.rejectedAt ? new Date(wf.rejectedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null,
      auditTrail: (wf.auditTrail || []).map((aud: any) => ({
        id: aud.id,
        stageName: aud.stageName,
        stageKey: aud.stageKey,
        actorName: aud.actor ? `${aud.actor.firstName} ${aud.actor.lastName}` : "User",
        actorAvatar: aud.actor?.avatarUrl || null,
        actorRole: aud.actorRole,
        timestamp: new Date(aud.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        durationMinutes: aud.durationMinutes || null,
        notes: aud.notes || null,
      })),
    };
  }

  // Format attachments
  const attachments = (message.attachments || []).map((att: any) => ({
    id: att.id,
    name: att.name,
    type: att.type,
    url: att.url,
    thumbnailUrl: att.thumbnailUrl || null,
    fileSizeBytes: att.fileSizeBytes || null,
    extension: att.extension || null,
    mimeType: att.mimeType || null,
  }));

  // Date group calculation (e.g. "Today", "Yesterday", "Oct 18, 2026")
  const createdDate = new Date(message.createdAt);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let dateGroup = createdDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (createdDate.toDateString() === today.toDateString()) {
    dateGroup = "Today";
  } else if (createdDate.toDateString() === yesterday.toDateString()) {
    dateGroup = "Yesterday";
  }

  return {
    id: message.id,
    projectId: message.projectId,
    projectCode: projectContext.orderId || projectContext.projectName || "PRJ",
    senderId: message.senderId,
    senderName: message.sender ? `${message.sender.firstName} ${message.sender.lastName}` : "Member",
    senderAvatar: message.sender?.avatarUrl || null,
    senderDesignation: message.sender?.designation?.name || null,
    senderRole: message.sender?.role?.name || "Member",
    isCurrentUser: isAuthor,
    isFromClient: message.isFromClient || false,
    text: message.text,
    timestamp: createdDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    dateGroup,
    purpose: message.purpose as any,
    clientDirection: message.clientDirection as any,
    clientMessageType: message.messageType?.code || message.clientMessageType || null,
    variant: message.variant || "default",
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          senderName: message.replyTo.sender ? `${message.replyTo.sender.firstName} ${message.replyTo.sender.lastName}` : "Member",
          text: message.replyTo.text,
        }
      : null,
    attachments: attachments.length > 0 ? attachments : undefined,
    reactions: reactions.length > 0 ? reactions : undefined,
    seenBy: seenBy.length > 0 ? seenBy : undefined,
    approval,
    metadata: message.metadata || null,
    isPinned: message.isPinned || false,
    _capabilities: capabilities,
  };
}
