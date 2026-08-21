// src/Modules/Projects/services/projects.workspace.service.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import { PresenceService } from "@/core/realtime/PresenceService";
import type { ProjectWorkspaceItem } from "../ProjectDTO";
import { can } from "@/core/authorization/AuthorizationEngine";
import {
  sanitizeAndDecorateWorkspaceProject,
  buildProjectScopedWhereConditions,
  getProjectResourceContext,
} from "./projects.capability.helper";

export class ProjectsWorkspaceService {
  private logger = new AppLogger("ProjectsWorkspaceService");
  private presenceService = PresenceService.getInstance();

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Fetches all active projects formatted as workspace items for the command center.
   * Strictly enforces scoped permissions (Rules BE-1, BE-17).
   */
  public async getWorkspaceProjects(
    query: { search?: string; statusId?: string; priorityId?: string; page?: number | string; limit?: number | string },
    actor: AuthenticatedUser,
  ): Promise<{ items: ProjectWorkspaceItem[]; pagination?: { total: number; page: number; limit: number; totalPages: number; hasMore: boolean } } | ProjectWorkspaceItem[]> {
    const where: any = {
      deletedAt: null,
    };

    // Scoped query restriction based on actor permissions
    const scopedConditions = await buildProjectScopedWhereConditions(this.prisma, actor);
    if (scopedConditions && scopedConditions.length > 0) {
      where.OR = scopedConditions;
    }

    if (query.statusId && query.statusId !== "all") {
      where.statusId = query.statusId;
    } else if ((query as any).category === "delivered") {
      where.status = { isTerminal: true };
    } else if ((query as any).includeTerminal !== "true" && (query as any).includeTerminal !== true) {
      where.status = { isTerminal: false };
    }

    if (query.search && query.search.trim() !== "") {
      const search = query.search.trim();
      const searchConditions = [
        { projectName: { contains: search, mode: "insensitive" } },
        { orderId: { contains: search, mode: "insensitive" } },
        { client: { name: { contains: search, mode: "insensitive" } } },
        { serviceLine: { name: { contains: search, mode: "insensitive" } } },
      ];

      if (where.OR) {
        where.AND = [{ OR: searchConditions }];
      } else {
        where.OR = searchConditions;
      }
    }

    const hasPagination = Boolean(query.page || query.limit);
    const pageNumber = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.limit) || 15));
    const skip = hasPagination ? (pageNumber - 1) * pageSize : undefined;
    const take = hasPagination ? pageSize : undefined;

    const [totalCount, projects] = await Promise.all([
      hasPagination ? this.prisma.project.count({ where }) : Promise.resolve(0),
      this.prisma.project.findMany({
        where,
        skip,
        take,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: {
        client: {
          include: { platform: true },
        },
        profile: {
          include: { platform: true },
        },
        status: true,
        serviceLine: true,
        orderSource: true,
        teamAssignments: {
          where: { unassignedAt: null },
          include: {
            team: {
              include: {
                department: true,
                members: { where: { leftAt: null } },
              },
            },
          },
        },
        userAssignments: {
          where: { unassignedAt: null },
          include: {
            role: true,
            user: {
              include: {
                designation: true,
                role: { include: { department: true } },
              },
            },
          },
        },
        milestones: {
          include: { assignedTo: true },
          orderBy: { dueDate: "asc" },
        },
        links: {
          include: { addedBy: true },
          orderBy: { createdAt: "desc" },
        },
        projectMessages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            sender: { include: { designation: true } },
            reads: true,
            approvalWorkflow: {
              include: { status: true },
            },
          },
        },
      },
    }),
  ]);

    const workspaceItems: ProjectWorkspaceItem[] = await Promise.all(
      projects.map(async (p: any) => {
        // Compute unread count for current actor
        const unreadCount = (p.projectMessages || []).filter(
          (m: any) => m.senderId !== actor.id && !m.reads?.some((rd: any) => rd.userId === actor.id),
        ).length;

        // Evaluate permissions for attention counts
        const resourceContext = getProjectResourceContext(p);
        const [canLead, canSales, canEdit] = await Promise.all([
          can(actor, "project.approval.lead_review", resourceContext),
          can(actor, "project.approval.sales_dispatch", resourceContext),
          can(actor, "project.edit", resourceContext),
        ]);

        const hasLeadAuthority = canLead || canEdit;
        const hasSalesAuthority = canSales || canEdit;

        // Compute granular pending counts
        const pendingLeadApprovalsCount = hasLeadAuthority
          ? (p.projectMessages || []).filter(
              (m: any) =>
                m.approvalWorkflow &&
                (m.approvalWorkflow.status?.requiresLeadAction ||
                  m.approvalWorkflow.status?.code === "IN_REVIEW" ||
                  m.approvalWorkflow.status?.code === "PENDING_LEAD"),
            ).length
          : 0;

        const pendingSalesDispatchesCount = hasSalesAuthority
          ? (p.projectMessages || []).filter(
              (m: any) =>
                m.approvalWorkflow &&
                (m.approvalWorkflow.status?.requiresSalesAction ||
                  m.approvalWorkflow.status?.code === "PENDING_SALES"),
            ).length
          : 0;

        const pendingRevisionsCount = (p.projectMessages || []).filter((m: any) => {
          if (!m.approvalWorkflow) return false;
          const status = m.approvalWorkflow.status;
          const isRev =
            status?.code === "REVISION_REQUESTED" ||
            (status && !status.isTerminal && !status.requiresLeadAction && !status.requiresSalesAction);
          if (!isRev) return false;
          // If author, always count; if approver, also count
          return (
            m.senderId === actor.id ||
            m.approvalWorkflow.requestedById === actor.id ||
            hasLeadAuthority ||
            hasSalesAuthority
          );
        }).length;

        const pendingApprovalsCount = pendingLeadApprovalsCount + pendingSalesDispatchesCount;

        const pendingInboundCount = (p.projectMessages || []).filter(
          (m: any) =>
            (m.isFromClient || (m.purpose === "CLIENT_COMMUNICATION" && m.clientDirection === "INBOUND")) &&
            m.senderId !== actor.id &&
            !m.reads?.some((rd: any) => rd.userId === actor.id),
        ).length;

        // Calculate online members
        const memberUserIds = (p.userAssignments || [])
          .filter((ua: any) => !ua.unassignedAt && ua.userId)
          .map((ua: any) => ua.userId);

        const onlineIds = await this.presenceService.getOnlineUsers(memberUserIds);

        const decorated = await sanitizeAndDecorateWorkspaceProject(p, actor, {
          unreadCount,
          pendingApprovalsCount,
          pendingLeadApprovalsCount,
          pendingSalesDispatchesCount,
          pendingRevisionsCount,
          pendingInboundCount,
          onlineCount: onlineIds.length,
        });

        // Mark online status on members
        decorated.members = decorated.members.map((m) => ({
          ...m,
          isOnline: onlineIds.includes(m.id),
        }));

        if (decorated.lead) {
          decorated.lead.isOnline = onlineIds.includes(decorated.lead.id);
        }

        return decorated;
      }),
    );

    if (hasPagination) {
      const totalPages = Math.ceil(totalCount / pageSize);
      return {
        items: workspaceItems,
        pagination: {
          total: totalCount,
          page: pageNumber,
          limit: pageSize,
          totalPages,
          hasMore: pageNumber < totalPages,
        },
      };
    }

    return workspaceItems;
  }
}
