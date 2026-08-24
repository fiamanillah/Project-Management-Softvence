import type { PrismaClient } from "@workspace/db";
import { publishNotification } from "@workspace/message-broker";
import { AppLogger } from "@/core/logging/logger";
import { AuditLogService } from "@/core/audit/audit.service";
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
import {
  getProjectResourceContext,
  findProjectByIdOrCode,
  formatApprovalWorkflowItem,
} from "./projects.capability.helper";

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
      where: { requiresSalesAction: true, isTerminal: false },
      select: { id: true },
    });

    if (!pendingSalesStatus) {
      throw new BadRequestError("Awaiting dispatch approval status not configured in system");
    }

    const now = new Date();
    const stageStartTime = workflow.createdAt;
    const durationMinutes = Math.max(1, Math.round((now.getTime() - stageStartTime.getTime()) / (60 * 1000)));

    const updated = await this.prisma.messageApprovalWorkflow.update({
      where: { id: workflow.id },
      data: {
        statusId: pendingSalesStatus.id,
        leadApprovedById: actor.id,
        leadApprovedAt: now,
        auditTrail: {
          create: {
            stageKey: "LEAD_REVIEW",
            stageName: "Review Approved",
            actorId: actor.id,
            actorRole: "Reviewer",
            durationMinutes,
            notes: dto.notes || "Approved internally by reviewer",
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

    const workflowItem = formatApprovalWorkflowItem(updated);

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

    // ENT-03: Audit log entry for Lead Review approval
    AuditLogService.log({
      module: "PROJECT_APPROVAL",
      action: "LEAD_APPROVE",
      entityTable: "message_approval_workflows",
      entityId: workflow.id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      metadata: { messageId, projectId: resolvedProjectId, notes: dto.notes },
    }).catch(() => {});

    // FEAT-07: Notify the author of lead approval
    if (workflow.requestedById && workflow.requestedById !== actor.id) {
      publishNotification({
        recipientId: workflow.requestedById,
        type: "MESSAGE_APPROVED_LEAD",
        title: "Draft Approved by Reviewer",
        body: `Your message draft for project ${project?.orderId || "project"} was approved and queued for sales dispatch.`,
        entityType: "PROJECT_MESSAGE",
        entityId: messageId,
      }).catch(() => {});
    }

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
      where: { isTerminal: true },
      select: { id: true },
    });

    if (!dispatchedStatus) {
      throw new BadRequestError("Dispatched approval status not configured in system");
    }

    const now = new Date();
    const stageStartTime = workflow.leadApprovedAt || workflow.createdAt;
    const durationMinutes = Math.max(1, Math.round((now.getTime() - stageStartTime.getTime()) / (60 * 1000)));

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
            actorRole: "Dispatcher",
            durationMinutes,
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

    const workflowItem = formatApprovalWorkflowItem(updated);

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

    // ENT-03: Audit log entry for Sales Dispatch
    AuditLogService.log({
      module: "PROJECT_APPROVAL",
      action: "SALES_DISPATCH",
      entityTable: "message_approval_workflows",
      entityId: workflow.id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      metadata: {
        messageId,
        projectId: resolvedProjectId,
        dispatchPlatform: dto.dispatchPlatform,
        dispatchReferenceId: dto.dispatchReferenceId,
      },
    }).catch(() => {});

    // FEAT-07: Notify the author of successful dispatch
    if (workflow.requestedById && workflow.requestedById !== actor.id) {
      publishNotification({
        recipientId: workflow.requestedById,
        type: "DISPATCH_CONFIRMED",
        title: "Communication Dispatched to Client",
        body: `Your message for project ${project?.orderId || "project"} was dispatched via ${dto.dispatchPlatform}.`,
        entityType: "PROJECT_MESSAGE",
        entityId: messageId,
      }).catch(() => {});
    }

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
      where: {
        isTerminal: false,
        requiresLeadAction: false,
        requiresSalesAction: false,
      },
      select: { id: true },
    });

    if (!revisionStatus) {
      throw new BadRequestError("Revision requested approval status not configured in system");
    }

    const now = new Date();
    const stageStartTime = workflow.leadApprovedAt || workflow.createdAt;
    const durationMinutes = Math.max(1, Math.round((now.getTime() - stageStartTime.getTime()) / (60 * 1000)));

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
            actorRole: "Reviewer",
            durationMinutes,
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

    const workflowItem = formatApprovalWorkflowItem(updated);

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

    // ENT-03: Audit log entry for Request Revision
    AuditLogService.log({
      module: "PROJECT_APPROVAL",
      action: "REQUEST_REVISION",
      entityTable: "message_approval_workflows",
      entityId: workflow.id,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      metadata: { messageId, projectId: resolvedProjectId, reason: dto.rejectionReason },
    }).catch(() => {});

    // FEAT-07: Notify the author of revision request
    if (workflow.requestedById) {
      publishNotification({
        recipientId: workflow.requestedById,
        type: "REVISION_REQUESTED",
        title: "Revision Requested for Client Draft",
        body: `Revision feedback: "${dto.rejectionReason.slice(0, 120)}"`,
        entityType: "PROJECT_MESSAGE",
        entityId: messageId,
      }).catch(() => {});
    }

    this.logger.info(`Revision requested for message ${messageId} by user ${actor.id}`);
    return workflowItem;
  }

  /**
   * ENT-05: SLA monitoring & automated escalation engine.
   * Identifies pending workflows that are AT_RISK or BREACHED and triggers escalations.
   */
  public async checkAndEscalateSLA(projectId?: string): Promise<{
    checked: number;
    atRisk: number;
    breached: number;
    escalated: number;
  }> {
    let resolvedProjectId: string | undefined;
    if (projectId) {
      const project = await findProjectByIdOrCode(this.prisma, projectId);
      resolvedProjectId = project?.id || projectId;
    }

    const pendingWorkflows = await this.prisma.messageApprovalWorkflow.findMany({
      where: {
        status: { isTerminal: false },
        ...(resolvedProjectId ? { message: { projectId: resolvedProjectId } } : {}),
      },
      include: {
        status: true,
        message: {
          include: {
            project: {
              include: {
                teamAssignments: {
                  where: { unassignedAt: null },
                  include: { team: { include: { members: { where: { leftAt: null } } } } },
                },
              },
            },
          },
        },
        requestedBy: true,
        auditTrail: true,
      },
    });

    let atRisk = 0;
    let breached = 0;
    let escalated = 0;

    for (const wf of pendingWorkflows) {
      const formatted = formatApprovalWorkflowItem(wf);
      if (formatted.slaStatus === "AT_RISK") {
        atRisk += 1;
      } else if (formatted.slaStatus === "BREACHED") {
        breached += 1;

        // Check if SLA breach was already recorded in audit trail
        const alreadyNotified = (wf.auditTrail || []).some((a: any) => a.stageKey === "SLA_BREACH_ESCALATION");
        if (!alreadyNotified) {
          escalated += 1;

          // Record escalation event in workflow audit trail
          await this.prisma.approvalStageAudit.create({
            data: {
              workflowId: wf.id,
              stageKey: "SLA_BREACH_ESCALATION",
              stageName: "SLA Breached Escalation",
              actorId: wf.requestedById,
              actorRole: "SystemSLAEngine",
              durationMinutes: formatted.currentStageDwellMinutes,
              notes: `Communication draft exceeded target SLA of ${formatted.slaTargetMinutes}m (dwell: ${formatted.currentStageDwellMinutes}m)`,
            },
          }).catch(() => {});

          // Broadcast SLA breach alert to project room
          this.realtimeServer.toProject(wf.message.projectId, "approval:sla_breached" as any, {
            projectId: wf.message.projectId,
            messageId: wf.messageId,
            dwellMinutes: formatted.currentStageDwellMinutes,
            slaTargetMinutes: formatted.slaTargetMinutes,
          } as any);

          // Audit log the breach
          AuditLogService.log({
            module: "PROJECT_APPROVAL",
            action: "SLA_BREACHED",
            entityTable: "message_approval_workflows",
            entityId: wf.id,
            metadata: {
              messageId: wf.messageId,
              projectId: wf.message.projectId,
              dwellMinutes: formatted.currentStageDwellMinutes,
              slaTargetMinutes: formatted.slaTargetMinutes,
            },
          }).catch(() => {});
        }
      }
    }

    return {
      checked: pendingWorkflows.length,
      atRisk,
      breached,
      escalated,
    };
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
        workflow.status === "IN_REVIEW" || (workflow.status as string) === "PENDING_LEAD" || workflow.status === "PENDING_SALES"
          ? "PENDING_APPROVAL"
          : workflow.status === "REVISION_REQUESTED"
          ? "REVISION_REQUESTED"
          : null;

      const bumpPayload = {
        projectId,
        lastActivityAt: new Date().toISOString(),
        attentionType,
      };

      // INC-05: Target bump notifications to assigned project members only (zero cluster pollution)
      for (const userId of allRecipientUserIds) {
        this.realtimeServer.toUser(userId, "project:activity_bump", bumpPayload as any);
      }
    } catch (err) {
      this.logger.warn("Failed to broadcast approval activity bump:", { error: err });
    }
  }
}
