// src/Modules/Projects/services/ProjectApprovalService.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError, ForbiddenError, BadRequestError } from "@/core/errors/AppError";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import { can } from "@/core/authorization/AuthorizationEngine";
import { RealtimeServer } from "@/core/realtime/RealtimeServer";
import type {
  LeadApproveDTO,
  SalesDispatchDTO,
  RequestRevisionDTO,
  ApprovalWorkflowItem,
} from "../ProjectDTO";
import { getProjectResourceContext, findProjectByIdOrCode } from "./projects.capability.helper";

export class ProjectApprovalService {
  private logger = new AppLogger("ProjectApprovalService");
  private realtimeServer = RealtimeServer.getInstance();

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Tech Lead / PM review action: approves internal message draft, forwarding it to Sales.
   */
  public async leadApprove(
    projectId: string,
    messageId: string,
    dto: LeadApproveDTO,
    actor: AuthenticatedUser,
  ): Promise<ApprovalWorkflowItem> {
    const project = await findProjectByIdOrCode(this.prisma, projectId);
    const resolvedProjectId = project?.id || projectId;

    const workflow = await this.prisma.messageApprovalWorkflow.findFirst({
      where: { messageId, message: { projectId: resolvedProjectId } },
      include: {
        message: {
          include: {
            project: {
              include: {
                teamAssignments: {
                  where: { unassignedAt: null },
                  include: { team: { include: { department: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundError("Approval workflow not found for this message");
    }

    const resourceContext = getProjectResourceContext(workflow.message.project);
    const hasPermission = await can(actor, "project.approval.lead_review", resourceContext);
    if (!hasPermission) {
      throw new ForbiddenError("You do not have permission to perform Tech Lead reviews");
    }

    const pendingSalesStatus = await this.prisma.approvalStatusLookup.findFirst({
      where: { code: "PENDING_SALES" },
      select: { id: true },
    });

    if (!pendingSalesStatus) {
      throw new BadRequestError("Approval status lookup 'PENDING_SALES' not configured in system");
    }

    const now = new Date();
    const updated = await this.prisma.messageApprovalWorkflow.update({
      where: { id: workflow.id },
      data: {
        statusId: pendingSalesStatus.id,
        leadApprovedById: actor.id,
        leadApprovedAt: now,
        auditTrail: {
          create: {
            stageKey: "LEAD_REVIEW",
            stageName: "Tech Lead Approved",
            actorId: actor.id,
            actorRole: actor.systemRole,
            notes: dto.notes || "Approved internally by Tech Lead",
          },
        },
      },
      include: {
        status: true,
        requestedBy: true,
        leadApprover: true,
        salesDispatcher: true,
        rejector: true,
        auditTrail: {
          include: { actor: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const workflowItem = this.formatWorkflowItem(updated);

    // Broadcast updated approval workflow state to project room
    this.realtimeServer.toProject(resolvedProjectId, "approval:updated", {
      projectId: resolvedProjectId,
      messageId,
      workflow: workflowItem,
    } as any);
    if (projectId !== resolvedProjectId) {
      this.realtimeServer.toProject(projectId, "approval:updated", {
        projectId: resolvedProjectId,
        messageId,
        workflow: workflowItem,
      } as any);
    }

    // Broadcast activity bump to assigned users
    await this.broadcastActivityBump(resolvedProjectId, workflowItem, actor);

    this.logger.info(`Lead approval completed for message ${messageId} by user ${actor.id}`);
    return workflowItem;
  }

  /**
   * Sales dispatch action: confirms delivery to external client platform.
   */
  public async salesDispatch(
    projectId: string,
    messageId: string,
    dto: SalesDispatchDTO,
    actor: AuthenticatedUser,
  ): Promise<ApprovalWorkflowItem> {
    const project = await findProjectByIdOrCode(this.prisma, projectId);
    const resolvedProjectId = project?.id || projectId;

    const workflow = await this.prisma.messageApprovalWorkflow.findFirst({
      where: { messageId, message: { projectId: resolvedProjectId } },
      include: {
        message: {
          include: {
            project: {
              include: {
                teamAssignments: {
                  where: { unassignedAt: null },
                  include: { team: { include: { department: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundError("Approval workflow not found for this message");
    }

    const resourceContext = getProjectResourceContext(workflow.message.project);
    const hasPermission = await can(actor, "project.approval.sales_dispatch", resourceContext);
    if (!hasPermission) {
      throw new ForbiddenError("You do not have permission to dispatch client communications");
    }

    const dispatchedStatus = await this.prisma.approvalStatusLookup.findFirst({
      where: { code: "DISPATCHED" },
      select: { id: true },
    });

    if (!dispatchedStatus) {
      throw new BadRequestError("Approval status lookup 'DISPATCHED' not configured in system");
    }

    const now = new Date();
    const updated = await this.prisma.messageApprovalWorkflow.update({
      where: { id: workflow.id },
      data: {
        statusId: dispatchedStatus.id,
        salesDispatchedById: actor.id,
        salesDispatchedAt: now,
        dispatchPlatform: dto.dispatchPlatform,
        dispatchReferenceId: dto.dispatchReferenceId || null,
        auditTrail: {
          create: {
            stageKey: "SALES_DISPATCH",
            stageName: "Dispatched to Client",
            actorId: actor.id,
            actorRole: actor.systemRole,
            notes: dto.notes || `Dispatched via ${dto.dispatchPlatform}${dto.dispatchReferenceId ? ` (Ref: ${dto.dispatchReferenceId})` : ""}`,
          },
        },
      },
      include: {
        status: true,
        requestedBy: true,
        leadApprover: true,
        salesDispatcher: true,
        rejector: true,
        auditTrail: {
          include: { actor: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const workflowItem = this.formatWorkflowItem(updated);

    // Broadcast updated approval workflow state to project room
    this.realtimeServer.toProject(resolvedProjectId, "approval:updated", {
      projectId: resolvedProjectId,
      messageId,
      workflow: workflowItem,
    } as any);
    if (projectId !== resolvedProjectId) {
      this.realtimeServer.toProject(projectId, "approval:updated", {
        projectId: resolvedProjectId,
        messageId,
        workflow: workflowItem,
      } as any);
    }

    // Broadcast activity bump to assigned users
    await this.broadcastActivityBump(resolvedProjectId, workflowItem, actor);

    this.logger.info(`Sales dispatch completed for message ${messageId} by user ${actor.id} via ${dto.dispatchPlatform}`);
    return workflowItem;
  }

  /**
   * Rejects client communication draft or requests revision from author.
   */
  public async requestRevision(
    projectId: string,
    messageId: string,
    dto: RequestRevisionDTO,
    actor: AuthenticatedUser,
  ): Promise<ApprovalWorkflowItem> {
    const project = await findProjectByIdOrCode(this.prisma, projectId);
    const resolvedProjectId = project?.id || projectId;

    const workflow = await this.prisma.messageApprovalWorkflow.findFirst({
      where: { messageId, message: { projectId: resolvedProjectId } },
      include: {
        message: {
          include: {
            project: {
              include: {
                teamAssignments: {
                  where: { unassignedAt: null },
                  include: { team: { include: { department: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundError("Approval workflow not found for this message");
    }

    const resourceContext = getProjectResourceContext(workflow.message.project);
    const [canLead, canSales] = await Promise.all([
      can(actor, "project.approval.lead_review", resourceContext),
      can(actor, "project.approval.sales_dispatch", resourceContext),
    ]);

    if (!canLead && !canSales) {
      throw new ForbiddenError("You do not have permission to request revisions for this communication");
    }

    const revisionStatus = await this.prisma.approvalStatusLookup.findFirst({
      where: { code: "REVISION_REQUESTED" },
      select: { id: true },
    });

    if (!revisionStatus) {
      throw new BadRequestError("Approval status lookup 'REVISION_REQUESTED' not configured in system");
    }

    const now = new Date();
    const updated = await this.prisma.messageApprovalWorkflow.update({
      where: { id: workflow.id },
      data: {
        statusId: revisionStatus.id,
        rejectedById: actor.id,
        rejectedAt: now,
        rejectionReason: dto.rejectionReason,
        auditTrail: {
          create: {
            stageKey: "REVISION_REQUESTED",
            stageName: "Revision Requested",
            actorId: actor.id,
            actorRole: actor.systemRole,
            notes: dto.rejectionReason,
          },
        },
      },
      include: {
        status: true,
        requestedBy: true,
        leadApprover: true,
        salesDispatcher: true,
        rejector: true,
        auditTrail: {
          include: { actor: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const workflowItem = this.formatWorkflowItem(updated);

    // Broadcast updated approval workflow state to project room
    this.realtimeServer.toProject(resolvedProjectId, "approval:updated", {
      projectId: resolvedProjectId,
      messageId,
      workflow: workflowItem,
    } as any);
    if (projectId !== resolvedProjectId) {
      this.realtimeServer.toProject(projectId, "approval:updated", {
        projectId: resolvedProjectId,
        messageId,
        workflow: workflowItem,
      } as any);
    }

    // Broadcast activity bump to assigned users
    await this.broadcastActivityBump(resolvedProjectId, workflowItem, actor);

    this.logger.info(`Revision requested for message ${messageId} by user ${actor.id}`);
    return workflowItem;
  }

  private async broadcastActivityBump(
    projectId: string,
    workflow: ApprovalWorkflowItem,
    actor: AuthenticatedUser,
  ): Promise<void> {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: {
          userAssignments: { where: { unassignedAt: null }, select: { userId: true } },
          teamAssignments: {
            where: { unassignedAt: null },
            select: { team: { select: { members: { where: { leftAt: null }, select: { userId: true } } } } },
          },
        },
      });
      if (!project) return;

      const teamMemberUserIds = (project.teamAssignments || []).flatMap((ta: any) =>
        (ta.team?.members || []).map((m: any) => m.userId)
      );
      const userAssignmentIds = (project.userAssignments || []).map((ua: any) => ua.userId);
      const allRecipientUserIds = Array.from(new Set([...teamMemberUserIds, ...userAssignmentIds, actor.id]));

      const attentionType =
        workflow.status === "PENDING_LEAD" || workflow.status === "PENDING_SALES"
          ? "PENDING_APPROVAL"
          : workflow.status === "REVISION_REQUESTED"
          ? "REVISION_REQUESTED"
          : null;

      const bumpPayload = {
        projectId,
        lastActivityAt: new Date().toISOString(),
        attentionType,
      };

      this.realtimeServer.broadcast("project:activity_bump" as any, bumpPayload as any);
    } catch (err) {
      this.logger.warn("Failed to broadcast approval activity bump:", { error: err });
    }
  }

  private formatWorkflowItem(wf: any): ApprovalWorkflowItem {
    return {
      id: wf.id,
      status: wf.status?.code || "PENDING_LEAD",
      clientMessageType: wf.clientMessageType || "GENERAL_NOTICE",
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
}
