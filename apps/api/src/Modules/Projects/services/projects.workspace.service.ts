// src/Modules/Projects/services/projects.workspace.service.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import { PresenceService } from "@/core/realtime/PresenceService";
import type { ProjectWorkspaceItem } from "../ProjectDTO";
import { sanitizeAndDecorateWorkspaceProject } from "./projects.capability.helper";

export class ProjectsWorkspaceService {
  private logger = new AppLogger("ProjectsWorkspaceService");
  private presenceService = PresenceService.getInstance();

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Fetches all active projects formatted as workspace items for the command center.
   */
  public async getWorkspaceProjects(
    query: { search?: string; statusId?: string; priorityId?: string },
    actor: AuthenticatedUser,
  ): Promise<ProjectWorkspaceItem[]> {
    const where: any = {
      deletedAt: null,
    };

    if (query.statusId) {
      where.statusId = query.statusId;
    }

    if (query.search) {
      where.OR = [
        { projectName: { contains: query.search, mode: "insensitive" } },
        { orderId: { contains: query.search, mode: "insensitive" } },
        { client: { name: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    const projects = await this.prisma.project.findMany({
      where,
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
    });

    const workspaceItems: ProjectWorkspaceItem[] = await Promise.all(
      projects.map(async (p: any) => {
        // Compute unread count for current actor
        const unreadCount = (p.projectMessages || []).filter(
          (m: any) => m.senderId !== actor.id && !m.reads?.some((rd: any) => rd.userId === actor.id),
        ).length;

        // Compute pending approvals count
        const pendingApprovalsCount = (p.projectMessages || []).filter(
          (m: any) =>
            m.approvalWorkflow &&
            (m.approvalWorkflow.status?.code === "PENDING_LEAD" ||
              m.approvalWorkflow.status?.code === "PENDING_SALES"),
        ).length;

        // Calculate online members
        const memberUserIds = (p.userAssignments || [])
          .filter((ua: any) => !ua.unassignedAt && ua.userId)
          .map((ua: any) => ua.userId);

        const onlineIds = await this.presenceService.getOnlineUsers(memberUserIds);

        const decorated = await sanitizeAndDecorateWorkspaceProject(p, actor, {
          unreadCount,
          pendingApprovalsCount,
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

    return workspaceItems;
  }
}
