// src/Modules/Projects/services/ProjectChatService.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
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
} from "../ProjectDTO";
import {
  getProjectResourceContext,
  sanitizeAndDecorateMessage,
  findProjectByIdOrCode,
} from "./projects.capability.helper";

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
      (await can(actor, "project.chat.view", resourceContext)) || (await can(actor, "project.view", resourceContext)),
      can(actor, "project.approval.lead_review", resourceContext),
      can(actor, "project.approval.sales_dispatch", resourceContext),
      can(actor, "project.edit", resourceContext),
    ]);

    if (!hasViewPermission) {
      throw new ForbiddenError("You do not have permission to view this project conversation");
    }

    const isPrivilegedApprover = actor.systemRole === "SuperAdmin" || canLead || canSales || canEdit;

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
            { approvalWorkflow: { status: { code: "DISPATCHED" } } },
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
      : (await can(actor, "project.chat.send", resourceContext)) ||
        (await can(actor, "project.view", resourceContext));

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
    if (isClientOutbound) {
      const pendingLeadStatus = await this.prisma.approvalStatusLookup.findFirst({
        where: { code: "PENDING_LEAD" },
        select: { id: true },
      });
      if (pendingLeadStatus) {
        initialApprovalStatusId = pendingLeadStatus.id;
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

      const messageText = dto.text?.trim() || (dto.attachments && dto.attachments.length > 0 ? "Shared attachments" : "");

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
          metadata: (dto.metadata ?? undefined) as any,
          attachments: dto.attachments && dto.attachments.length > 0
            ? {
                create: dto.attachments.map((att) => ({
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
        const wf = await tx.messageApprovalWorkflow.create({
          data: {
            messageId: msg.id,
            statusId: initialApprovalStatusId,
            requestedById: actor.id,
            targetClientName: (project as any).client?.name || "Client",
            slaTargetMinutes: 30,
            slaStatus: "ON_TRACK",
            auditTrail: {
              create: {
                stageKey: "DRAFTED",
                stageName: "Draft Created",
                actorId: actor.id,
                actorRole: actor.systemRole,
                notes: `Drafted client communication (${dto.clientMessageType || "General"})`,
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
      const hasApproval =
        (decorated as any).approval &&
        ((decorated as any).approval.status === "PENDING_LEAD" || (decorated as any).approval.status === "PENDING_SALES");
      const isRevision = (decorated as any).approval?.status === "REVISION_REQUESTED";

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

      // Broadcast activity bump to all active connections in workspace cluster
      this.realtimeServer.broadcast("project:activity_bump" as any, bumpPayload as any);
    } catch (bumpErr) {
      this.logger.warn("Failed to broadcast project activity bump:", { error: bumpErr });
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
    const hasPermission =
      (await can(actor, "project.chat.send", resourceContext)) ||
      (await can(actor, "project.view", resourceContext));
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

    for (const messageId of dto.messageIds) {
      await this.prisma.projectMessageReadReceipt.upsert({
        where: {
          messageId_userId: {
            messageId,
            userId: actor.id,
          },
        },
        create: {
          messageId,
          userId: actor.id,
        },
        update: {
          seenAt: new Date(),
        },
      });

      // Fetch updated seen receipts for broadcasting
      const receipts = await this.prisma.projectMessageReadReceipt.findMany({
        where: { messageId },
        include: { user: { include: { designation: true } } },
      });

      const seenBy = receipts.map((r) => ({
        userId: r.userId,
        userName: r.user ? `${r.user.firstName} ${r.user.lastName}` : "User",
        userAvatar: r.user?.avatarUrl || null,
        userDesignation: r.user?.designation?.name || null,
        seenAt: new Date(r.seenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }));

      this.realtimeServer.toProject(resolvedProjectId, "chat:seen_receipts_updated", {
        messageId,
        seenBy,
      } as any);
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
    const internalEditWindowMs = 15 * 60 * 1000; // 15 minutes window
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
      const statusCode = message.approvalWorkflow.status?.code || "PENDING_LEAD";
      if (statusCode === "PENDING_LEAD" || statusCode === "REVISION_REQUESTED") {
        if (!isAuthor && !canLeadApprove && !canEditGlobal) {
          throw new ForbiddenError("You do not have permission to edit this message draft");
        }
      } else if (statusCode === "PENDING_SALES" || statusCode === "DISPATCHED") {
        // Once approved, ordinary senders cannot edit. Only leaders or users with approval permissions can edit.
        if (!canLeadApprove && !canSalesDispatch && !canEditGlobal) {
          throw new ForbiddenError("Approved or dispatched client messages can only be edited by Tech Leads or Sales managers.");
        }
      }
    } else if (isClientInbound) {
      if (!isWithinEditWindow && !canSendClient && !canEditGlobal) {
        throw new ForbiddenError("Edit window expired (client relays can only be edited within 15 minutes).");
      }
      if (!isAuthor && !canSendClient && !canEditGlobal) {
        throw new ForbiddenError("You do not have permission to edit this relayed client message");
      }
    } else {
      // Internal Discussion
      if (!isWithinEditWindow && !canEditGlobal) {
        throw new ForbiddenError("Edit window expired (internal messages can only be edited within 15 minutes of sending).");
      }
      if (!isAuthor && !canEditGlobal) {
        throw new ForbiddenError("You can only edit your own messages");
      }
    }

    const newText = dto.text.trim();
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
        const currentStatusCode = message.approvalWorkflow.status?.code;

        // If author resubmitted a rejected / revision requested message -> Transition back to PENDING_LEAD
        if (currentStatusCode === "REVISION_REQUESTED") {
          const pendingLeadStatus = await tx.approvalStatusLookup.findFirst({
            where: { code: "PENDING_LEAD" },
            select: { id: true },
          });

          if (pendingLeadStatus) {
            await tx.messageApprovalWorkflow.update({
              where: { id: message.approvalWorkflow.id },
              data: {
                statusId: pendingLeadStatus.id,
                rejectedById: null,
                rejectionReason: null,
                rejectedAt: null,
                auditTrail: {
                  create: {
                    stageKey: "REVISION_RESUBMITTED",
                    stageName: "Revision Resubmitted",
                    actorId: actor.id,
                    actorRole: actor.systemRole,
                    notes: dto.reason || "Author addressed feedback and resubmitted draft for Tech Lead review",
                  },
                },
              },
            });
          }
        } else if (currentStatusCode === "PENDING_LEAD") {
          // If author modified draft vs if tech lead/reviewer modified draft
          if (isAuthor) {
            await tx.approvalStageAudit.create({
              data: {
                workflowId: message.approvalWorkflow.id,
                stageKey: "DRAFT_EDITED",
                stageName: "Draft Modified",
                actorId: actor.id,
                actorRole: actor.systemRole,
                notes: dto.reason || "Author updated draft content before review",
              },
            });
          } else {
            await tx.approvalStageAudit.create({
              data: {
                workflowId: message.approvalWorkflow.id,
                stageKey: "LEAD_EDIT",
                stageName: "Lead Edited Draft",
                actorId: actor.id,
                actorRole: actor.systemRole,
                notes: dto.reason || "Reviewer adjusted draft content during Lead Review",
              },
            });
          }
        } else if (currentStatusCode === "PENDING_SALES") {
          // If sales reviewer modified message
          await tx.approvalStageAudit.create({
            data: {
              workflowId: message.approvalWorkflow.id,
              stageKey: "SALES_EDIT",
              stageName: "Sales Modified Dispatch",
              actorId: actor.id,
              actorRole: actor.systemRole,
              notes: dto.reason || "Sales reviewer modified message prior to external dispatch",
            },
          });
        } else if (currentStatusCode === "DISPATCHED") {
          // If a leader modified message post-dispatch
          await tx.approvalStageAudit.create({
            data: {
              workflowId: message.approvalWorkflow.id,
              stageKey: "POST_DISPATCH_EDIT",
              stageName: "Post-Dispatch Revision",
              actorId: actor.id,
              actorRole: actor.systemRole,
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
    const hasViewPermission =
      (await can(actor, "project.chat.view", resourceContext)) ||
      (await can(actor, "project.view", resourceContext));
    if (!hasViewPermission) {
      throw new ForbiddenError("You do not have permission to view this project conversation");
    }

    const revisions = await this.prisma.projectMessageRevision.findMany({
      where: { messageId },
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
}
