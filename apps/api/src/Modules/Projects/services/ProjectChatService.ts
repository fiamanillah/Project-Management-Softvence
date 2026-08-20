// src/Modules/Projects/services/ProjectChatService.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError, ForbiddenError, BadRequestError } from "@/core/errors/AppError";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import { can } from "@/core/authorization/AuthorizationEngine";
import { RealtimeServer } from "@/core/realtime/RealtimeServer";
import type {
  CreateProjectMessageDTO,
  ProjectMessageItem,
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
    const hasViewPermission =
      (await can(actor, "project.chat.view", resourceContext)) ||
      (await can(actor, "project.view", resourceContext));
    if (!hasViewPermission) {
      throw new ForbiddenError("You do not have permission to view this project conversation");
    }

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
      const nextItem = messages.pop();
      nextCursor = nextItem?.createdAt.toISOString();
      resultItems = messages;
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
      const msg = await tx.projectMessage.create({
        data: {
          projectId,
          senderId: actor.id,
          messageTypeId: messageTypeId || null,
          purpose: dto.purpose,
          clientDirection: dto.clientDirection || null,
          text: dto.text,
          variant: dto.variant || (isClientInbound ? "tinted" : isClientOutbound ? "outline" : "default"),
          replyToMessageId: dto.replyToMessageId || null,
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

    // Broadcast to project room via WebSocket
    this.realtimeServer.toProject(projectId, "chat:new_message", decorated as any);

    this.logger.info(`Message sent in project ${projectId} by user ${actor.id} (msgId=${created.id})`);
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
    const message = await this.prisma.projectMessage.findFirst({
      where: { id: messageId, projectId, deletedAt: null },
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
    this.realtimeServer.toProject(projectId, "chat:reaction_updated", {
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

      this.realtimeServer.toProject(projectId, "chat:seen_receipts_updated", {
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
    const message = await this.prisma.projectMessage.findFirst({
      where: { id: messageId, projectId, deletedAt: null },
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
}
