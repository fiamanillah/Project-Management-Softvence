import type { PrismaClient } from "@workspace/db";
import { publishNotification } from "@workspace/message-broker";
import { AppLogger } from "@/core/logging/logger";
import { AuditLogService } from "@/core/audit/audit.service";
import { NotFoundError, ForbiddenError, BadRequestError } from "@/core/errors/AppError";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import { can } from "@/core/authorization/AuthorizationEngine";
import { RealtimeServer } from "@/core/realtime/RealtimeServer";
import type {
  CreateProjectMessageDTO,
  EditProjectMessageDTO,
  ProjectMessageItem,
  ProjectMessageRevisionItem,
  ToggleReactionDTO,
  MarkMessagesSeenDTO,
  SearchProjectMessagesDTO,
} from "../ProjectDTO";
import {
  getProjectResourceContext,
  sanitizeAndDecorateMessage,
  findProjectByIdOrCode,
} from "./projects.capability.helper";
import { sanitizeMessageText, isSafeAttachmentUrl } from "@/utils/sanitize";

export class ProjectChatService {
  private logger = new AppLogger("ProjectChatService");
  private realtimeServer = RealtimeServer.getInstance();

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Fetches paginated project messages decorated with capabilities, reactions, and receipts.
   */
  public async getProjectMessages(
    projectId: string,
    query: { limit?: number; cursor?: string; search?: string; purpose?: string },
    actor: AuthenticatedUser,
  ): Promise<{ messages: ProjectMessageItem[]; nextCursor?: string }> {
    const project = await findProjectByIdOrCode(this.prisma, projectId, {
      teamAssignments: {
        where: { unassignedAt: null },
        include: { team: { include: { department: true } } },
      },
    });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const resolvedProjectId = project.id;

    const resourceContext = getProjectResourceContext(project);
    const [hasViewPermission, canLead, canSales, canEdit] = await Promise.all([
      can(actor, "project.chat.view", resourceContext),
      can(actor, "project.approval.lead_review", resourceContext),
      can(actor, "project.approval.sales_dispatch", resourceContext),
      can(actor, "project.edit", resourceContext),
    ]);

    if (!hasViewPermission) {
      throw new ForbiddenError("You do not have permission to view this project conversation");
    }

    const isPrivilegedApprover = canLead || canSales || canEdit;

    const limit = Math.min(Number(query.limit) || 50, 100);
    const where: any = {
      projectId: resolvedProjectId,
      deletedAt: null,
    };

    if (query.purpose) {
      where.purpose = query.purpose;
    }

    if (query.search) {
      where.text = { contains: query.search, mode: "insensitive" };
    }

    if (query.cursor) {
      where.createdAt = { lt: new Date(query.cursor) };
    }

    // Scoped visibility: Non-approvers can only view their own drafts, non-outbound messages, or dispatched communications
    if (!isPrivilegedApprover) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { purpose: { not: "CLIENT_COMMUNICATION" } },
            { clientDirection: "INBOUND" },
            { approvalWorkflow: null },
            { approvalWorkflow: { status: { isTerminal: true } } },
            { senderId: actor.id },
            { approvalWorkflow: { requestedById: actor.id } },
          ],
        },
      ];
    }

    const messages = await this.prisma.projectMessage.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          include: {
            role: { include: { department: true } },
            designation: true,
          },
        },
        messageType: true,
        replyTo: {
          include: { sender: true },
        },
        attachments: true,
        reactions: true,
        reads: {
          include: {
            user: { include: { designation: true } },
          },
        },
        revisions: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            editor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                designation: { select: { name: true } },
              },
            },
          },
        },
        approvalWorkflow: {
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
        },
      },
    });

    let nextCursor: string | undefined = undefined;
    let resultItems = messages;
    if (messages.length > limit) {
      resultItems = messages.slice(0, limit);
      nextCursor = resultItems[resultItems.length - 1]?.createdAt.toISOString();
    }

    // Reverse to chronological order (oldest -> newest for chat stream)
    const chronological = [...resultItems].reverse();

    const decorated = await Promise.all(
      chronological.map((m) => sanitizeAndDecorateMessage(m, actor, project)),
    );

    return {
      messages: decorated,
      nextCursor,
    };
  }

  /**
   * Sends a new message in the project conversation.
   */
  public async sendMessage(
    projectId: string,
    dto: CreateProjectMessageDTO,
    actor: AuthenticatedUser,
  ): Promise<ProjectMessageItem> {
    const project = await findProjectByIdOrCode(this.prisma, projectId, {
      client: true,
      userAssignments: {
        where: { unassignedAt: null },
        select: { userId: true },
      },
      teamAssignments: {
        where: { unassignedAt: null },
        include: {
          team: {
            include: {
              department: true,
              members: { where: { leftAt: null }, select: { userId: true } },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const resolvedProjectId = project.id;

    const resourceContext = getProjectResourceContext(project);

    // Permission validation
    const isClientComm = dto.purpose === "CLIENT_COMMUNICATION";
    const hasPermission = isClientComm
      ? await can(actor, "project.chat.send_client", resourceContext)
      : await can(actor, "project.chat.send", resourceContext);

    if (!hasPermission) {
      throw new ForbiddenError(
        isClientComm
          ? "You do not have permission to initiate client communications"
          : "You do not have permission to send messages in this project",
      );
    }

    const isClientOutbound = dto.purpose === "CLIENT_COMMUNICATION" && dto.clientDirection === "OUTBOUND";
    const isClientInbound = dto.purpose === "CLIENT_COMMUNICATION" && dto.clientDirection === "INBOUND";

    // Resolve MessageType if code or ID passed
    let messageTypeId = dto.messageTypeId;
    if (!messageTypeId && dto.clientMessageType) {
      const foundType = await this.prisma.messageType.findFirst({
        where: { code: dto.clientMessageType },
        select: { id: true },
      });
      messageTypeId = foundType?.id;
    }

    // Resolve approval status lookup for new outbound draft
    let initialApprovalStatusId: string | undefined = undefined;
    let isAutoApproved = false;

    if (isClientOutbound) {
      const [canLeadReview, canAutoApprove, canEditProject] = await Promise.all([
        can(actor, "project.approval.lead_review", resourceContext),
        can(actor, "project.approval.auto_approve", resourceContext),
        can(actor, "project.edit", resourceContext),
      ]);

      isAutoApproved = canLeadReview || canAutoApprove || canEditProject;

      if (isAutoApproved) {
        // Auto-approve: bypass In Review and transition directly to Awaiting Dispatch (Rule BE-11: flag lookup)
        const awaitingDispatchStatus = await this.prisma.approvalStatusLookup.findFirst({
          where: { requiresSalesAction: true, isTerminal: false },
          select: { id: true },
        });
        initialApprovalStatusId = awaitingDispatchStatus?.id;
      } else {
        // Standard review: route to In Review stage (Rule BE-11: flag lookup)
        const inReviewStatus = await this.prisma.approvalStatusLookup.findFirst({
          where: { requiresLeadAction: true, isTerminal: false },
          select: { id: true },
        });
        initialApprovalStatusId = inReviewStatus?.id;
      }
    }

    // ENT-04: Message Idempotency deduplication check
    if (dto.idempotencyKey) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const existingMessage = await this.prisma.projectMessage.findFirst({
        where: {
          projectId: resolvedProjectId,
          senderId: actor.id,
          createdAt: { gte: fiveMinutesAgo },
          deletedAt: null,
          metadata: { path: ["idempotencyKey"], equals: dto.idempotencyKey },
        },
        include: {
          sender: {
            include: {
              role: { include: { department: true } },
              designation: true,
            },
          },
          messageType: true,
          replyTo: {
            include: { sender: true },
          },
          attachments: true,
          reactions: true,
          reads: {
            include: {
              user: { include: { designation: true } },
            },
          },
          approvalWorkflow: {
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
          },
        },
      });

      if (existingMessage) {
        return sanitizeAndDecorateMessage(existingMessage, actor, project);
      }
    }

    // Database transaction to create message and approval workflow
    const created = await this.prisma.$transaction(async (tx) => {
      let validReplyToId: string | null = null;
      if (dto.replyToMessageId) {
        const existingReply = await tx.projectMessage.findFirst({
          where: { id: dto.replyToMessageId, projectId: resolvedProjectId, deletedAt: null },
          select: { id: true },
        });
        validReplyToId = existingReply?.id || null;
      }

      const rawText = sanitizeMessageText(dto.text);
      const messageText = rawText || (dto.attachments && dto.attachments.length > 0 ? "Shared attachments" : "");

      const safeAttachments = (dto.attachments || []).filter((att) => isSafeAttachmentUrl(att.url));

      const messageMetadata: Record<string, any> = {
        ...(dto.metadata || {}),
        ...(dto.idempotencyKey ? { idempotencyKey: dto.idempotencyKey } : {}),
      };

      const msg = await tx.projectMessage.create({
        data: {
          projectId: resolvedProjectId,
          senderId: actor.id,
          messageTypeId: messageTypeId || null,
          purpose: dto.purpose,
          clientDirection: dto.clientDirection || null,
          text: messageText,
          variant: dto.variant || (isClientInbound ? "tinted" : isClientOutbound ? "outline" : "default"),
          replyToMessageId: validReplyToId,
          isFromClient: Boolean(isClientInbound),
          metadata: Object.keys(messageMetadata).length > 0 ? messageMetadata : undefined,
          attachments: safeAttachments.length > 0
            ? {
                create: safeAttachments.map((att) => ({
                  name: att.name,
                  type: att.type,
                  url: att.url,
                  thumbnailUrl: att.thumbnailUrl || null,
                  fileSizeBytes: att.fileSizeBytes || null,
                  extension: att.extension || null,
                  mimeType: att.mimeType || null,
                })),
              }
            : undefined,
          reads: {
            create: {
              userId: actor.id,
            },
          },
        },
        include: {
          sender: {
            include: {
              role: { include: { department: true } },
              designation: true,
            },
          },
          messageType: true,
          replyTo: {
            include: { sender: true },
          },
          attachments: true,
          reactions: true,
          reads: {
            include: {
              user: { include: { designation: true } },
            },
          },
        },
      });

      // If client outbound, create initial approval workflow
      let approvalWorkflow: any = null;
      if (isClientOutbound && initialApprovalStatusId) {
        const now = new Date();
        const initialAuditTrail = isAutoApproved
          ? [
              {
                stageKey: "DRAFTED",
                stageName: "Draft Created",
                actorId: actor.id,
                actorRole: "Author",
                notes: `Drafted client communication (${dto.clientMessageType || "General"})`,
              },
              {
                stageKey: "LEAD_REVIEW",
                stageName: "Auto-Approved (In Review Bypassed)",
                actorId: actor.id,
                actorRole: "Reviewer",
                durationMinutes: 0,
                notes: "Auto-approved based on author review permissions",
              },
            ]
          : [
              {
                stageKey: "DRAFTED",
                stageName: "Draft Created",
                actorId: actor.id,
                actorRole: "Author",
                notes: `Drafted client communication (${dto.clientMessageType || "General"})`,
              },
            ];

        const wf = await tx.messageApprovalWorkflow.create({
          data: {
            messageId: msg.id,
            statusId: initialApprovalStatusId,
            requestedById: actor.id,
            leadApprovedById: isAutoApproved ? actor.id : null,
            leadApprovedAt: isAutoApproved ? now : null,
            targetClientName: (project as any).client?.name || "Client",
            slaTargetMinutes: 30,
            slaStatus: "ON_TRACK",
            auditTrail: {
              create: initialAuditTrail,
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
        approvalWorkflow = wf;
      }

      return {
        ...msg,
        approvalWorkflow,
      };
    });

    const decorated = await sanitizeAndDecorateMessage(created, actor, project);

    // 1. Broadcast to active project room via WebSocket
    this.realtimeServer.toProject(resolvedProjectId, "chat:new_message", decorated as any);
    if (projectId !== resolvedProjectId) {
      this.realtimeServer.toProject(projectId, "chat:new_message", decorated as any);
    }

    // 2. Broadcast lightweight activity bump to all assigned project members (zero over-subscription)
    try {
      const teamMemberUserIds = ((project as any).teamAssignments || []).flatMap((ta: any) =>
        (ta.team?.members || []).map((m: any) => m.userId)
      );
      const userAssignmentIds = ((project as any).userAssignments || []).map((ua: any) => ua.userId);
      const allRecipientUserIds = Array.from(new Set([...teamMemberUserIds, ...userAssignmentIds, actor.id]));

      const isClient = created.isFromClient || created.purpose === "CLIENT_COMMUNICATION";
      const approvalObj = created.approvalWorkflow;
      const hasApproval =
        approvalObj &&
        (approvalObj.status?.requiresLeadAction ||
          approvalObj.status?.requiresSalesAction ||
          (decorated as any).approval?.status === "IN_REVIEW" ||
          (decorated as any).approval?.status === "PENDING_SALES");
      const isRevision = Boolean(
        approvalObj?.status &&
          !approvalObj.status.isTerminal &&
          !approvalObj.status.requiresLeadAction &&
          !approvalObj.status.requiresSalesAction,
      );

      const attentionType = hasApproval
        ? "PENDING_APPROVAL"
        : isRevision
        ? "REVISION_REQUESTED"
        : isClient
        ? "CLIENT_MESSAGE"
        : "NEW_MESSAGE";

      const bumpPayload = {
        projectId: resolvedProjectId,
        lastActivityAt: new Date().toISOString(),
        lastMessage: {
          id: created.id,
          senderName: (decorated as any).senderName || "User",
          text: created.text,
          timestamp: (decorated as any).timestamp || "Just now",
          purpose: created.purpose,
          createdAt: created.createdAt.toISOString(),
        },
        attentionType,
      };

      // INC-05: Broadcast activity bump to targeted project member user rooms
      for (const userId of allRecipientUserIds) {
        this.realtimeServer.toUser(userId, "project:activity_bump", bumpPayload as any);
      }
    } catch (bumpErr) {
      this.logger.warn("Failed to broadcast project activity bump:", { error: bumpErr });
    }

    // FEAT-08: Extract @mentions and notify mentioned users
    try {
      const mentionRegex = /@\[([a-f0-9\-]{36})\]|@([a-zA-Z0-9_\.\-]+)/g;
      let match: RegExpExecArray | null;
      const mentionedIdentifiers: string[] = [];
      while ((match = mentionRegex.exec(created.text || "")) !== null) {
        const identifier = match[1] || match[2];
        if (identifier && !mentionedIdentifiers.includes(identifier)) {
          mentionedIdentifiers.push(identifier);
        }
      }

      if (mentionedIdentifiers.length > 0) {
        const mentionedUsers = await this.prisma.user.findMany({
          where: {
            OR: [
              { id: { in: mentionedIdentifiers } },
              { email: { in: mentionedIdentifiers } },
              { employeeId: { in: mentionedIdentifiers } },
            ],
            isActive: true,
          },
          select: { id: true, email: true },
        });

        for (const u of mentionedUsers) {
          if (u.id !== actor.id) {
            publishNotification({
              recipientId: u.id,
              type: "CHAT_MENTION",
              title: `Mentioned in ${project.orderId || project.projectName || "Project"}`,
              body: `${actor.email?.split("@")[0] || "A team member"} mentioned you: "${created.text.slice(0, 100)}"`,
              entityType: "PROJECT_MESSAGE",
              entityId: created.id,
            }).catch(() => {});
          }
        }
      }
    } catch (mentionErr) {
      this.logger.warn("Failed to process @mentions for message:", { error: mentionErr });
    }

    // FEAT-07: When client outbound message requires approval review, notify reviewers
    if (isClientOutbound && !isAutoApproved && initialApprovalStatusId) {
      try {
        const reviewers = ((project as any).teamAssignments || []).flatMap((ta: any) =>
          (ta.team?.members || []).map((m: any) => m.userId)
        );
        for (const reviewerId of reviewers) {
          if (reviewerId !== actor.id) {
            publishNotification({
              recipientId: reviewerId,
              type: "MESSAGE_APPROVAL_REQUIRED",
              title: `Review Required: ${project.orderId || "Client Draft"}`,
              body: `New client communication draft requires your review before dispatch.`,
              entityType: "PROJECT_MESSAGE",
              entityId: created.id,
            }).catch(() => {});
          }
        }
      } catch (reviewNotifErr) {
        this.logger.warn("Failed to dispatch approval review notification:", { error: reviewNotifErr });
      }
    }

    this.logger.info(`Message sent in project ${resolvedProjectId} by user ${actor.id} (msgId=${created.id})`);
    return decorated;
  }

  /**
   * Toggles an emoji reaction on a message.
   */
  public async toggleReaction(
    projectId: string,
    messageId: string,
    dto: ToggleReactionDTO,
    actor: AuthenticatedUser,
  ): Promise<{ reactions: any[] }> {
    const project = await findProjectByIdOrCode(this.prisma, projectId);
    const resolvedProjectId = project?.id || projectId;

    const message = await this.prisma.projectMessage.findFirst({
      where: { id: messageId, projectId: resolvedProjectId, deletedAt: null },
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
    });

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    const resourceContext = getProjectResourceContext(message.project);
    const hasPermission = await can(actor, "project.chat.send", resourceContext);
    if (!hasPermission) {
      throw new ForbiddenError("You do not have permission to react to messages in this project");
    }

    const existingReaction = await this.prisma.projectMessageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: actor.id,
          emoji: dto.emoji,
        },
      },
    });

    if (existingReaction) {
      await this.prisma.projectMessageReaction.delete({
        where: { id: existingReaction.id },
      });
    } else {
      await this.prisma.projectMessageReaction.create({
        data: {
          messageId,
          userId: actor.id,
          emoji: dto.emoji,
        },
      });
    }

    const updatedReactions = await this.prisma.projectMessageReaction.findMany({
      where: { messageId },
    });

    // Aggregate counts
    const reactionsMap = new Map<string, number>();
    for (const r of updatedReactions) {
      reactionsMap.set(r.emoji, (reactionsMap.get(r.emoji) || 0) + 1);
    }

    const reactionItems = Array.from(reactionsMap.entries()).map(([emoji, count]) => ({
      emoji,
      count,
      reactedByMe: updatedReactions.some((r) => r.emoji === emoji && r.userId === actor.id),
    }));

    // Broadcast reaction update
    this.realtimeServer.toProject(resolvedProjectId, "chat:reaction_updated", {
      messageId,
      reactions: reactionItems,
    } as any);

    return { reactions: reactionItems };
  }

  /**
   * Submits read receipts for a list of messages.
   */
  public async markMessagesSeen(
    projectId: string,
    dto: MarkMessagesSeenDTO,
    actor: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    const project = await findProjectByIdOrCode(this.prisma, projectId);
    const resolvedProjectId = project?.id || projectId;

    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      include: { designation: true },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const now = new Date();

    // INC-04: Batch upsert all read receipts in parallel
    await Promise.all(
      dto.messageIds.map((messageId) =>
        this.prisma.projectMessageReadReceipt.upsert({
          where: {
            messageId_userId: {
              messageId,
              userId: actor.id,
            },
          },
          create: {
            messageId,
            userId: actor.id,
            seenAt: now,
          },
          update: {
            seenAt: now,
          },
        }),
      ),
    );

    // Fetch and broadcast updated seen receipts per message
    const allReceipts = await this.prisma.projectMessageReadReceipt.findMany({
      where: { messageId: { in: dto.messageIds } },
      include: { user: { include: { designation: true } } },
    });

    const receiptsByMessage = new Map<string, typeof allReceipts>();
    for (const r of allReceipts) {
      const list = receiptsByMessage.get(r.messageId) || [];
      list.push(r);
      receiptsByMessage.set(r.messageId, list);
    }

    for (const messageId of dto.messageIds) {
      const messageReceipts = receiptsByMessage.get(messageId) || [];
      const seenBy = messageReceipts.map((r) => ({
        userId: r.userId,
        userName: r.user ? `${r.user.firstName} ${r.user.lastName}` : "User",
        userAvatar: r.user?.avatarUrl || null,
        userDesignation: r.user?.designation?.name || null,
        seenAt: new Date(r.seenAt).toISOString(),
      }));

      this.realtimeServer.toProject(resolvedProjectId, "chat:seen_receipts_updated", {
        messageId,
        seenBy,
      });
    }

    return { success: true };
  }

  /**
   * Toggles the pinned status of a message.
   */
  public async togglePinMessage(
    projectId: string,
    messageId: string,
    actor: AuthenticatedUser,
  ): Promise<ProjectMessageItem> {
    const project = await findProjectByIdOrCode(this.prisma, projectId);
    const resolvedProjectId = project?.id || projectId;

    const message = await this.prisma.projectMessage.findFirst({
      where: { id: messageId, projectId: resolvedProjectId, deletedAt: null },
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
    });

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    const resourceContext = getProjectResourceContext(message.project);
    const hasPermission = await can(actor, "project.chat.pin", resourceContext);
    if (!hasPermission) {
      throw new ForbiddenError("You do not have permission to pin messages in this project");
    }

    const newPinnedState = !message.isPinned;
    const updated = await this.prisma.projectMessage.update({
      where: { id: messageId },
      data: {
        isPinned: newPinnedState,
        pinnedAt: newPinnedState ? new Date() : null,
        pinnedById: newPinnedState ? actor.id : null,
      },
      include: {
        sender: {
          include: {
            role: { include: { department: true } },
            designation: true,
          },
        },
        messageType: true,
        replyTo: { include: { sender: true } },
        attachments: true,
        reactions: true,
        reads: { include: { user: { include: { designation: true } } } },
        approvalWorkflow: {
          include: {
            status: true,
            requestedBy: true,
            leadApprover: true,
            salesDispatcher: true,
            rejector: true,
            auditTrail: { include: { actor: true }, orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    const decorated = await sanitizeAndDecorateMessage(updated, actor, message.project);

    // ENT-03: Audit log pin/unpin action
    AuditLogService.log({
      module: "PROJECT_CHAT",
      action: newPinnedState ? "MESSAGE_PIN" : "MESSAGE_UNPIN",
      entityTable: "project_messages",
      entityId: messageId,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      metadata: { projectId: resolvedProjectId, isPinned: newPinnedState },
    }).catch(() => {});

    // Broadcast updated message to room
    this.realtimeServer.toProject(projectId, "chat:message_updated", decorated as any);

    return decorated;
  }

  /**
   * Edits a message, preserves revision history, and handles workflow transitions (e.g. resubmission or leader edits).
   */
  public async editMessage(
    projectId: string,
    messageId: string,
    dto: EditProjectMessageDTO,
    actor: AuthenticatedUser,
  ): Promise<ProjectMessageItem> {
    const project = await findProjectByIdOrCode(this.prisma, projectId, {
      teamAssignments: {
        where: { unassignedAt: null },
        include: { team: { include: { department: true } } },
      },
    });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const resolvedProjectId = project.id;
    const resourceContext = getProjectResourceContext(project);

    const message = await this.prisma.projectMessage.findFirst({
      where: { id: messageId, projectId: resolvedProjectId, deletedAt: null },
      include: {
        approvalWorkflow: {
          include: { status: true },
        },
        attachments: true,
      },
    });

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    const isAuthor = message.senderId === actor.id;
    const createdAtTime = new Date(message.createdAt).getTime();
    const nowTime = Date.now();
    const elapsedMs = Math.max(0, nowTime - createdAtTime);
    const internalEditWindowMs = 10 * 60 * 1000; // 10 minutes window (Rule BE-1)
    const isWithinEditWindow = elapsedMs <= internalEditWindowMs;

    const [canLeadApprove, canSalesDispatch, canEditGlobal, canSendClient] = await Promise.all([
      can(actor, "project.approval.lead_review", resourceContext),
      can(actor, "project.approval.sales_dispatch", resourceContext),
      can(actor, "project.edit", resourceContext),
      can(actor, "project.chat.send_client", resourceContext),
    ]);

    const isClientOutbound = message.purpose === "CLIENT_COMMUNICATION" && message.clientDirection === "OUTBOUND";
    const isClientInbound = message.purpose === "CLIENT_COMMUNICATION" && message.clientDirection === "INBOUND";

    if (isClientOutbound && message.approvalWorkflow) {
      const statusObj = message.approvalWorkflow.status;
      const isRevisionOrReview =
        statusObj && !statusObj.isTerminal && !statusObj.requiresSalesAction;

      if (statusObj?.requiresLeadAction || isRevisionOrReview) {
        if (!isAuthor && !canLeadApprove && !canEditGlobal) {
          throw new ForbiddenError("You do not have permission to edit this message draft");
        }
        if (isAuthor && !isWithinEditWindow && !canLeadApprove && !canEditGlobal) {
          throw new ForbiddenError("Edit window expired (message drafts can only be edited within 10 minutes).");
        }
      } else if (statusObj?.requiresSalesAction || statusObj?.isTerminal) {
        // Once approved, ordinary senders cannot edit. Only leaders or users with approval permissions can edit.
        if (!canLeadApprove && !canSalesDispatch && !canEditGlobal) {
          throw new ForbiddenError("Approved or dispatched client messages can only be edited by Reviewers or Sales managers.");
        }
      }
    } else if (isClientInbound) {
      if (!isWithinEditWindow && !canSendClient && !canEditGlobal) {
        throw new ForbiddenError("Edit window expired (client relays can only be edited within 10 minutes).");
      }
      if (!isAuthor && !canSendClient && !canEditGlobal) {
        throw new ForbiddenError("You do not have permission to edit this relayed client message");
      }
    } else {
      // Internal Discussion
      if (!isWithinEditWindow && !canEditGlobal) {
        throw new ForbiddenError("Edit window expired (internal messages can only be edited within 10 minutes of sending).");
      }
      if (!isAuthor && !canEditGlobal) {
        throw new ForbiddenError("You can only edit your own messages");
      }
    }

    const newText = sanitizeMessageText(dto.text);
    if (!newText) {
      throw new BadRequestError("Message text cannot be empty");
    }

    // Database transaction to record revision history and update message
    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Record original content in revision history
      await tx.projectMessageRevision.create({
        data: {
          messageId: message.id,
          content: message.text,
          editedById: actor.id,
          reason: dto.reason || null,
        },
      });

      // 2. Update message content and timestamps
      await tx.projectMessage.update({
        where: { id: message.id },
        data: {
          text: newText,
          isEdited: true,
          editedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 3. Handle Workflow state changes
      if (isClientOutbound && message.approvalWorkflow) {
        const currentStatus = message.approvalWorkflow.status;
        const isRevisionState =
          currentStatus &&
          !currentStatus.isTerminal &&
          !currentStatus.requiresLeadAction &&
          !currentStatus.requiresSalesAction;

        // If author resubmitted a rejected / revision requested message
        if (isRevisionState) {
          const [canAutoApprove, canLead] = await Promise.all([
            can(actor, "project.approval.auto_approve", resourceContext),
            can(actor, "project.approval.lead_review", resourceContext),
          ]);

          const isEligibleForAutoApprove = canAutoApprove || canLead || canEditGlobal;

          const targetStatus = await tx.approvalStatusLookup.findFirst({
            where: isEligibleForAutoApprove
              ? { requiresSalesAction: true, isTerminal: false }
              : { requiresLeadAction: true, isTerminal: false },
            select: { id: true },
          });

          if (targetStatus) {
            await tx.messageApprovalWorkflow.update({
              where: { id: message.approvalWorkflow.id },
              data: {
                statusId: targetStatus.id,
                rejectedById: null,
                rejectionReason: null,
                rejectedAt: null,
                leadApprovedById: isEligibleForAutoApprove ? actor.id : null,
                leadApprovedAt: isEligibleForAutoApprove ? new Date() : null,
                auditTrail: {
                  create: {
                    stageKey: "REVISION_RESUBMITTED",
                    stageName: isEligibleForAutoApprove
                      ? "Revision Resubmitted (Auto-Approved)"
                      : "Revision Resubmitted for Review",
                    actorId: actor.id,
                    actorRole: isAuthor ? "Author" : "Reviewer",
                    notes: dto.reason || "Author addressed feedback and resubmitted draft",
                  },
                },
              },
            });
          }
        } else if (currentStatus?.requiresLeadAction) {
          // If draft modified while in review stage
          await tx.approvalStageAudit.create({
            data: {
              workflowId: message.approvalWorkflow.id,
              stageKey: isAuthor ? "DRAFT_EDITED" : "LEAD_EDIT",
              stageName: isAuthor ? "Draft Modified" : "Reviewer Edited Draft",
              actorId: actor.id,
              actorRole: isAuthor ? "Author" : "Reviewer",
              notes: dto.reason || (isAuthor ? "Author updated draft content" : "Reviewer adjusted draft content"),
            },
          });
        } else if (currentStatus?.requiresSalesAction) {
          // If sales reviewer modified message
          await tx.approvalStageAudit.create({
            data: {
              workflowId: message.approvalWorkflow.id,
              stageKey: "SALES_EDIT",
              stageName: "Sales Modified Dispatch",
              actorId: actor.id,
              actorRole: "Dispatcher",
              notes: dto.reason || "Sales reviewer modified message prior to external dispatch",
            },
          });
        } else if (currentStatus?.isTerminal) {
          // If modified post-dispatch
          await tx.approvalStageAudit.create({
            data: {
              workflowId: message.approvalWorkflow.id,
              stageKey: "POST_DISPATCH_EDIT",
              stageName: "Post-Dispatch Revision",
              actorId: actor.id,
              actorRole: "Reviewer",
              notes: dto.reason || "Content edited post-dispatch by reviewer",
            },
          });
        }
      }

      // 4. Fetch full updated message with all relations
      return tx.projectMessage.findUniqueOrThrow({
        where: { id: message.id },
        include: {
          sender: {
            include: {
              role: { include: { department: true } },
              designation: true,
            },
          },
          messageType: true,
          replyTo: { include: { sender: true } },
          attachments: true,
          reactions: true,
          reads: { include: { user: { include: { designation: true } } } },
          revisions: {
            take: 5,
            orderBy: { createdAt: "desc" },
          },
          approvalWorkflow: {
            include: {
              status: true,
              requestedBy: true,
              leadApprover: true,
              salesDispatcher: true,
              rejector: true,
              auditTrail: { include: { actor: true }, orderBy: { createdAt: "asc" } },
            },
          },
        },
      });
    });

    const decorated = await sanitizeAndDecorateMessage(updated, actor, project);

    // Broadcast updated message to room
    this.realtimeServer.toProject(resolvedProjectId, "chat:message_updated", decorated as any);
    if (projectId !== resolvedProjectId) {
      this.realtimeServer.toProject(projectId, "chat:message_updated", decorated as any);
    }

    // If workflow was updated, also broadcast approval update
    if (decorated.approval) {
      this.realtimeServer.toProject(resolvedProjectId, "approval:updated", {
        projectId: resolvedProjectId,
        messageId: message.id,
        workflow: decorated.approval,
      } as any);
    }

    // ENT-03: Audit log message edit
    AuditLogService.log({
      module: "PROJECT_CHAT",
      action: "MESSAGE_EDIT",
      entityTable: "project_messages",
      entityId: messageId,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      metadata: { projectId: resolvedProjectId, reason: dto.reason },
    }).catch(() => {});

    this.logger.info(`Message ${messageId} in project ${resolvedProjectId} edited by user ${actor.id}`);
    return decorated;
  }

  /**
   * Fetches the complete revision history for a message.
   */
  public async getMessageRevisions(
    projectId: string,
    messageId: string,
    actor: AuthenticatedUser,
  ): Promise<ProjectMessageRevisionItem[]> {
    const project = await findProjectByIdOrCode(this.prisma, projectId, {
      teamAssignments: {
        where: { unassignedAt: null },
        include: { team: { include: { department: true } } },
      },
    });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const resourceContext = getProjectResourceContext(project);
    const hasViewPermission = await can(actor, "project.chat.view", resourceContext);
    if (!hasViewPermission) {
      throw new ForbiddenError("You do not have permission to view this project conversation");
    }

    const revisions = await this.prisma.projectMessageRevision.findMany({
      where: { messageId },
      orderBy: { createdAt: "desc" },
      include: {
        editor: {
          include: {
            designation: true,
          },
        },
      },
    });

    return revisions.map((rev) => ({
      id: rev.id,
      messageId: rev.messageId,
      content: rev.content,
      editedById: rev.editedById,
      editorName: rev.editor ? `${rev.editor.firstName} ${rev.editor.lastName}` : "User",
      editorAvatar: rev.editor?.avatarUrl || null,
      editorDesignation: rev.editor?.designation?.name || null,
      reason: rev.reason || null,
      createdAt: rev.createdAt.toISOString(),
    }));
  }

  /**
   * Soft deletes a message from the project conversation (FEAT-01).
   */
  public async deleteMessage(
    projectId: string,
    messageId: string,
    actor: AuthenticatedUser,
  ): Promise<{ success: boolean; messageId: string }> {
    const project = await findProjectByIdOrCode(this.prisma, projectId, {
      teamAssignments: {
        where: { unassignedAt: null },
        include: { team: { include: { department: true } } },
      },
    });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const resolvedProjectId = project.id;
    const resourceContext = getProjectResourceContext(project);

    const message = await this.prisma.projectMessage.findFirst({
      where: { id: messageId, projectId: resolvedProjectId, deletedAt: null },
    });

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    const isAuthor = message.senderId === actor.id;
    const [canDeleteChat, canDeleteGlobal, canEditGlobal] = await Promise.all([
      can(actor, "project.chat.delete", resourceContext),
      can(actor, "project.delete", resourceContext),
      can(actor, "project.edit", resourceContext),
    ]);

    const hasElevatedDeleteScope = canDeleteChat || canDeleteGlobal || canEditGlobal;

    if (!hasElevatedDeleteScope) {
      if (!isAuthor) {
        throw new ForbiddenError("You do not have permission to delete this message");
      }

      // Check author delete window (10 minutes = 600 seconds)
      const createdAtTime = new Date(message.createdAt).getTime();
      const elapsedMs = Date.now() - createdAtTime;
      const internalDeleteWindowMs = 10 * 60 * 1000; // 10 minutes (Rule BE-1)

      if (elapsedMs > internalDeleteWindowMs) {
        throw new ForbiddenError(
          "The deletion window for this message has expired (10 minutes). Contact a team lead or project manager to delete older messages."
        );
      }
    }

    const now = new Date();
    await this.prisma.projectMessage.update({
      where: { id: messageId },
      data: {
        deletedAt: now,
        updatedAt: now,
      },
    });

    // ENT-03: Audit log message deletion
    AuditLogService.log({
      module: "PROJECT_CHAT",
      action: "MESSAGE_DELETE",
      entityTable: "project_messages",
      entityId: messageId,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      metadata: { projectId: resolvedProjectId },
    }).catch(() => {});

    // Broadcast deletion event to active project rooms
    this.realtimeServer.toProject(resolvedProjectId, "chat:message_deleted", {
      projectId: resolvedProjectId,
      messageId,
    });
    if (projectId !== resolvedProjectId) {
      this.realtimeServer.toProject(projectId, "chat:message_deleted", {
        projectId: resolvedProjectId,
        messageId,
      });
    }

    this.logger.info(`Message ${messageId} soft-deleted in project ${resolvedProjectId} by user ${actor.id}`);
    return { success: true, messageId };
  }

  /**
   * Retrieves full nested message thread for a given parent or reply message (FEAT-03).
   */
  public async getMessageThread(
    projectId: string,
    messageId: string,
    actor: AuthenticatedUser,
  ): Promise<{
    parentMessage: ProjectMessageItem;
    replies: ProjectMessageItem[];
    replyCount: number;
  }> {
    const project = await findProjectByIdOrCode(this.prisma, projectId, {
      teamAssignments: {
        where: { unassignedAt: null },
        include: { team: { include: { department: true } } },
      },
    });

    if (!project) throw new NotFoundError("Project not found");
    const resolvedProjectId = project.id;

    const resourceContext = getProjectResourceContext(project);
    const hasViewPermission = await can(actor, "project.chat.view", resourceContext);
    if (!hasViewPermission) {
      throw new ForbiddenError("You do not have permission to view this project conversation");
    }

    const targetMessage = await this.prisma.projectMessage.findFirst({
      where: { id: messageId, projectId: resolvedProjectId, deletedAt: null },
      include: {
        sender: { include: { role: { include: { department: true } }, designation: true } },
        messageType: true,
        replyTo: { include: { sender: true } },
        attachments: true,
        reactions: true,
        reads: { include: { user: { include: { designation: true } } } },
        approvalWorkflow: {
          include: {
            status: true,
            requestedBy: true,
            leadApprover: true,
            salesDispatcher: true,
            rejector: true,
            auditTrail: { include: { actor: true }, orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    if (!targetMessage) throw new NotFoundError("Message not found");

    // Find root parent if target is a reply
    let rootParent = targetMessage;
    if (targetMessage.replyToMessageId) {
      const root = await this.prisma.projectMessage.findFirst({
        where: { id: targetMessage.replyToMessageId, projectId: resolvedProjectId, deletedAt: null },
        include: {
          sender: { include: { role: { include: { department: true } }, designation: true } },
          messageType: true,
          replyTo: { include: { sender: true } },
          attachments: true,
          reactions: true,
          reads: { include: { user: { include: { designation: true } } } },
          approvalWorkflow: {
            include: {
              status: true,
              requestedBy: true,
              leadApprover: true,
              salesDispatcher: true,
              rejector: true,
              auditTrail: { include: { actor: true }, orderBy: { createdAt: "asc" } },
            },
          },
        },
      });
      if (root) rootParent = root;
    }

    // Fetch all active replies to root parent
    const replyRows = await this.prisma.projectMessage.findMany({
      where: {
        replyToMessageId: rootParent.id,
        projectId: resolvedProjectId,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { include: { role: { include: { department: true } }, designation: true } },
        messageType: true,
        replyTo: { include: { sender: true } },
        attachments: true,
        reactions: true,
        reads: { include: { user: { include: { designation: true } } } },
        approvalWorkflow: {
          include: {
            status: true,
            requestedBy: true,
            leadApprover: true,
            salesDispatcher: true,
            rejector: true,
            auditTrail: { include: { actor: true }, orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    const [parentDecorated, repliesDecorated] = await Promise.all([
      sanitizeAndDecorateMessage(rootParent, actor, project),
      Promise.all(replyRows.map((r) => sanitizeAndDecorateMessage(r, actor, project))),
    ]);

    return {
      parentMessage: parentDecorated,
      replies: repliesDecorated,
      replyCount: repliesDecorated.length,
    };
  }

  /**
   * Searches messages in a project conversation (FEAT-02).
   */
  public async searchMessages(
    projectId: string,
    query: SearchProjectMessagesDTO,
    actor: AuthenticatedUser,
  ): Promise<{ messages: ProjectMessageItem[]; total: number }> {
    const project = await findProjectByIdOrCode(this.prisma, projectId, {
      teamAssignments: {
        where: { unassignedAt: null },
        include: { team: { include: { department: true } } },
      },
    });

    if (!project) throw new NotFoundError("Project not found");
    const resolvedProjectId = project.id;

    const resourceContext = getProjectResourceContext(project);
    const hasViewPermission = await can(actor, "project.chat.view", resourceContext);
    if (!hasViewPermission) {
      throw new ForbiddenError("You do not have permission to search this project conversation");
    }

    const sanitizedQ = sanitizeMessageText(query.q);
    const whereClause: any = {
      projectId: resolvedProjectId,
      deletedAt: null,
      text: { contains: sanitizedQ, mode: "insensitive" },
      ...(query.purpose ? { purpose: query.purpose } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.projectMessage.findMany({
        where: whereClause,
        take: query.limit || 20,
        orderBy: { createdAt: "desc" },
        include: {
          sender: { include: { role: { include: { department: true } }, designation: true } },
          messageType: true,
          replyTo: { include: { sender: true } },
          attachments: true,
          reactions: true,
          reads: { include: { user: { include: { designation: true } } } },
          approvalWorkflow: {
            include: {
              status: true,
              requestedBy: true,
              leadApprover: true,
              salesDispatcher: true,
              rejector: true,
              auditTrail: { include: { actor: true }, orderBy: { createdAt: "asc" } },
            },
          },
        },
      }),
      this.prisma.projectMessage.count({ where: whereClause }),
    ]);

    const messages = await Promise.all(
      rows.map((row) => sanitizeAndDecorateMessage(row, actor, project)),
    );

    return { messages, total };
  }

  /**
   * Exports project messages to JSON, CSV, or formatted TXT (FEAT-12).
   */
  public async exportMessages(
    projectId: string,
    format: "json" | "csv" | "txt" = "json",
    actor: AuthenticatedUser,
  ): Promise<{ content: string; contentType: string; filename: string }> {
    const project = await findProjectByIdOrCode(this.prisma, projectId, {
      teamAssignments: {
        where: { unassignedAt: null },
        include: { team: { include: { department: true } } },
      },
    });

    if (!project) throw new NotFoundError("Project not found");
    const resolvedProjectId = project.id;

    const resourceContext = getProjectResourceContext(project);
    const hasExportPermission = await can(actor, "project.chat.view", resourceContext);
    if (!hasExportPermission) {
      throw new ForbiddenError("You do not have permission to export project messages");
    }

    const messages = await this.prisma.projectMessage.findMany({
      where: { projectId: resolvedProjectId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        sender: true,
        messageType: true,
        attachments: true,
      },
    });

    const code = project.orderId || project.projectName || "project";
    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const header = "Timestamp,Sender,Role,Purpose,Type,Message,Attachments\n";
      const rows = messages.map((m) => {
        const timestamp = `"${m.createdAt.toISOString()}"`;
        const sender = `"${m.sender ? `${m.sender.firstName} ${m.sender.lastName}` : "User"}"`;
        const role = `"${m.isFromClient ? "Client" : "Team"}"`;
        const purpose = `"${m.purpose}"`;
        const type = `"${(m.messageType as any)?.label || (m.messageType as any)?.name || (m.purpose === "CLIENT_COMMUNICATION" ? "Client" : "Standard")}"`;
        const text = `"${m.text.replace(/"/g, '""')}"`;
        const atts = `"${(m.attachments || []).map((a) => a.name).join("; ")}"`;
        return [timestamp, sender, role, purpose, type, text, atts].join(",");
      });
      return {
        content: header + rows.join("\n"),
        contentType: "text/csv; charset=utf-8",
        filename: `${code}-chat-${dateStr}.csv`,
      };
    } else if (format === "txt") {
      const lines = messages.map((m) => {
        const sender = m.sender ? `${m.sender.firstName} ${m.sender.lastName}` : "User";
        const attStr = m.attachments?.length ? ` [Attachments: ${m.attachments.map((a) => a.name).join(", ")}]` : "";
        return `[${m.createdAt.toISOString()}] ${sender} (${m.purpose}): ${m.text}${attStr}`;
      });
      return {
        content: lines.join("\n"),
        contentType: "text/plain; charset=utf-8",
        filename: `${code}-chat-${dateStr}.txt`,
      };
    } else {
      const exportData = messages.map((m) => ({
        id: m.id,
        createdAt: m.createdAt.toISOString(),
        sender: m.sender ? { id: m.sender.id, name: `${m.sender.firstName} ${m.sender.lastName}`, email: m.sender.email } : null,
        purpose: m.purpose,
        direction: m.clientDirection,
        text: m.text,
        attachments: m.attachments.map((a) => ({ name: a.name, url: a.url, type: a.type })),
      }));
      return {
        content: JSON.stringify(exportData, null, 2),
        contentType: "application/json; charset=utf-8",
        filename: `${code}-chat-${dateStr}.json`,
      };
    }
  }

  /**
   * Deletes an individual attachment from a message (FEAT-16).
   */
  public async deleteAttachment(
    projectId: string,
    messageId: string,
    attachmentId: string,
    actor: AuthenticatedUser,
  ): Promise<{ success: boolean; attachmentId: string }> {
    const project = await findProjectByIdOrCode(this.prisma, projectId, {
      teamAssignments: {
        where: { unassignedAt: null },
        include: { team: { include: { department: true } } },
      },
    });
    if (!project) throw new NotFoundError("Project not found");
    const resolvedProjectId = project.id;

    const message = await this.prisma.projectMessage.findFirst({
      where: { id: messageId, projectId: resolvedProjectId, deletedAt: null },
      include: { attachments: true },
    });
    if (!message) throw new NotFoundError("Message not found");

    const attachment = message.attachments.find((a) => a.id === attachmentId);
    if (!attachment) throw new NotFoundError("Attachment not found");

    const isAuthor = message.senderId === actor.id;
    const resourceContext = getProjectResourceContext(project);
    const canDeleteGlobal = await can(actor, "project.delete", resourceContext);

    if (!isAuthor && !canDeleteGlobal) {
      throw new ForbiddenError("You do not have permission to delete this attachment");
    }

    await this.prisma.projectMessageAttachment.delete({
      where: { id: attachmentId },
    });

    AuditLogService.log({
      module: "PROJECT_CHAT",
      action: "ATTACHMENT_DELETE",
      entityTable: "project_message_attachments",
      entityId: attachmentId,
      actor: { id: actor.id, email: actor.email, role: actor.systemRole },
      metadata: { messageId, projectId: resolvedProjectId, fileName: attachment.name },
    }).catch(() => {});

    const updatedMessage = await this.prisma.projectMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: { include: { role: { include: { department: true } }, designation: true } },
        messageType: true,
        replyTo: { include: { sender: true } },
        attachments: true,
        reactions: true,
        reads: { include: { user: { include: { designation: true } } } },
        approvalWorkflow: {
          include: {
            status: true,
            requestedBy: true,
            leadApprover: true,
            salesDispatcher: true,
            rejector: true,
            auditTrail: { include: { actor: true }, orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    if (updatedMessage) {
      const decorated = await sanitizeAndDecorateMessage(updatedMessage, actor, project);
      this.realtimeServer.toProject(resolvedProjectId, "chat:message_updated", decorated as any);
    }

    return { success: true, attachmentId };
  }

  /**
   * Retrieves all pinned messages in the project conversation (FEAT-15).
   */
  public async getPinnedMessages(
    projectId: string,
    actor: AuthenticatedUser,
  ): Promise<ProjectMessageItem[]> {
    const project = await findProjectByIdOrCode(this.prisma, projectId, {
      teamAssignments: {
        where: { unassignedAt: null },
        include: { team: { include: { department: true } } },
      },
    });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const resourceContext = getProjectResourceContext(project);
    const hasViewPermission = await can(actor, "project.chat.view", resourceContext);
    if (!hasViewPermission) {
      throw new ForbiddenError("You do not have permission to view this project conversation");
    }

    const messages = await this.prisma.projectMessage.findMany({
      where: {
        projectId: project.id,
        isPinned: true,
        deletedAt: null,
      },
      orderBy: { pinnedAt: "desc" },
      include: {
        sender: {
          include: {
            role: { include: { department: true } },
            designation: true,
          },
        },
        messageType: true,
        replyTo: { include: { sender: true } },
        attachments: true,
        reactions: true,
        reads: { include: { user: { include: { designation: true } } } },
        approvalWorkflow: {
          include: {
            status: true,
            requestedBy: true,
            leadApprover: true,
            salesDispatcher: true,
            rejector: true,
            auditTrail: { include: { actor: true }, orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    return Promise.all(messages.map((m) => sanitizeAndDecorateMessage(m, actor, project)));
  }

  /**
   * Retrieves unread message count for a project for the requesting user (FEAT-04).
   */
  public async getUnreadCount(
    projectId: string,
    actor: AuthenticatedUser,
  ): Promise<{ unreadCount: number }> {
    const project = await findProjectByIdOrCode(this.prisma, projectId);
    if (!project) {
      return { unreadCount: 0 };
    }

    const latestRead = await this.prisma.projectMessageReadReceipt.findFirst({
      where: {
        userId: actor.id,
        message: { projectId: project.id, deletedAt: null },
      },
      orderBy: { seenAt: "desc" },
      select: { seenAt: true },
    });

    const where: any = {
      projectId: project.id,
      senderId: { not: actor.id },
      deletedAt: null,
    };

    if (latestRead?.seenAt) {
      where.createdAt = { gt: latestRead.seenAt };
    }

    const count = await this.prisma.projectMessage.count({ where });
    return { unreadCount: count };
  }

  /**
   * Retrieves user display name with caching (INC-07).
   */
  public async getUserDisplayName(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (user && (user.firstName || user.lastName)) {
        return `${user.firstName || ""} ${user.lastName || ""}`.trim();
      }
    } catch {
      // Fallback
    }
    return "Team Member";
  }
}
