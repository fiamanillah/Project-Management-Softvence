// src/Modules/Projects/gateways/ProjectChatGateway.ts

import { BaseSocketGateway } from "@/core/realtime/BaseSocketGateway";
import type { AuthenticatedSocket, RealtimeIoServer } from "@/core/realtime/realtime.types";
import type { ProjectChatService } from "../services/ProjectChatService";
import type { ProjectApprovalService } from "../services/ProjectApprovalService";
import { canSocket } from "@/core/realtime/socketPermission";
import { SocketRateLimiter } from "@/core/realtime/SocketRateLimiter";
import type {
  CreateProjectMessageDTO,
  EditProjectMessageDTO,
  ToggleReactionDTO,
  MarkMessagesSeenDTO,
} from "../ProjectDTO";

export class ProjectChatGateway extends BaseSocketGateway {
  public readonly name = "ProjectChatGateway";
  private rateLimiter = SocketRateLimiter.getInstance();

  constructor(
    private readonly chatService: ProjectChatService,
    private readonly approvalService: ProjectApprovalService,
  ) {
    super("ProjectChatGateway");
  }

  public register(io: RealtimeIoServer, socket: AuthenticatedSocket): void {
    const user = socket.data.user;

    // 1. Send Project Message (SEC-02: Rate limited, SEC-03: Perm pre-checked)
    socket.on("chat:send_message", async (payload: { projectId: string } & CreateProjectMessageDTO, callback) => {
      try {
        if (!user || !user.id) {
          return callback?.({ success: false, error: "Unauthenticated socket session" });
        }

        // SEC-02: Rate limit message send (max 5 messages / 2 seconds)
        const rateCheck = await this.rateLimiter.consume(`socket:${user.id}:send_msg`, 5, 2);
        if (!rateCheck.allowed) {
          return callback?.({
            success: false,
            error: "Too many messages sent. Please wait a moment.",
            retryAfterMs: rateCheck.retryAfterMs,
          });
        }

        if (!payload.projectId || (!payload.text?.trim() && (!payload.attachments || payload.attachments.length === 0))) {
          return callback?.({ success: false, error: "Project ID and message text or attachments are required" });
        }

        // SEC-03: Gateway permission pre-check
        const hasAccess = await canSocket(socket, "project.view", { projectId: payload.projectId });
        if (!hasAccess) {
          return callback?.({ success: false, error: "You do not have access to this project conversation" });
        }

        const message = await this.chatService.sendMessage(payload.projectId, payload, user);
        callback?.({ success: true, data: message });
      } catch (error: any) {
        this.logger.error("Error in chat:send_message:", { error: error.message || error });
        callback?.({ success: false, error: error.message || "Failed to send message" });
      }
    });

    // 1b. Edit Project Message (SEC-02: Rate limited)
    socket.on("chat:edit_message", async (payload: { projectId: string; messageId: string } & EditProjectMessageDTO, callback) => {
      try {
        if (!user || !user.id) {
          return callback?.({ success: false, error: "Unauthenticated socket session" });
        }

        const rateCheck = await this.rateLimiter.consume(`socket:${user.id}:edit_msg`, 10, 10);
        if (!rateCheck.allowed) {
          return callback?.({ success: false, error: "Too many edit attempts. Please slow down." });
        }

        if (!payload.projectId || !payload.messageId || !payload.text?.trim()) {
          return callback?.({ success: false, error: "Project ID, message ID, and message text are required" });
        }

        const updated = await this.chatService.editMessage(payload.projectId, payload.messageId, payload, user);
        callback?.({ success: true, data: updated });
      } catch (error: any) {
        this.logger.error("Error in chat:edit_message:", { error: error.message || error });
        callback?.({ success: false, error: error.message || "Failed to edit message" });
      }
    });

    // 1c. Delete Project Message (FEAT-01: Soft-deletion handler)
    socket.on("chat:delete_message", async (payload: { projectId: string; messageId: string }, callback) => {
      try {
        if (!user || !user.id) {
          return callback?.({ success: false, error: "Unauthenticated socket session" });
        }

        const rateCheck = await this.rateLimiter.consume(`socket:${user.id}:delete_msg`, 10, 10);
        if (!rateCheck.allowed) {
          return callback?.({ success: false, error: "Too many delete attempts. Please slow down." });
        }

        if (!payload.projectId || !payload.messageId) {
          return callback?.({ success: false, error: "Project ID and message ID are required" });
        }

        const result = await this.chatService.deleteMessage(payload.projectId, payload.messageId, user);
        callback?.({ success: true });
      } catch (error: any) {
        this.logger.error("Error in chat:delete_message:", { error: error.message || error });
        callback?.({ success: false, error: error.message || "Failed to delete message" });
      }
    });

    // 2. Typing Indicators (INC-07: Display name resolution)
    socket.on("chat:typing_start", async ({ projectId }) => {
      if (projectId && user?.id) {
        const rateCheck = await this.rateLimiter.consume(`socket:${user.id}:typing`, 3, 1);
        if (!rateCheck.allowed) return;

        const displayName = await this.chatService.getUserDisplayName(user.id);
        socket.to(`project:${projectId}`).emit("chat:user_typing", {
          projectId,
          userId: user.id,
          userName: displayName,
        });
      }
    });

    socket.on("chat:typing_stop", ({ projectId }) => {
      if (projectId && user?.id) {
        socket.to(`project:${projectId}`).emit("chat:user_stopped_typing", {
          projectId,
          userId: user.id,
        });
      }
    });

    // 3. Emoji Reactions (SEC-02: Rate limited)
    socket.on("chat:react", async (data: { projectId: string; messageId: string; emoji: string }) => {
      try {
        if (data.projectId && data.messageId && data.emoji && user?.id) {
          const rateCheck = await this.rateLimiter.consume(`socket:${user.id}:react`, 10, 2);
          if (!rateCheck.allowed) return;

          await this.chatService.toggleReaction(data.projectId, data.messageId, { emoji: data.emoji }, user);
        }
      } catch (error) {
        this.logger.error("Error in chat:react:", { error });
      }
    });

    // 4. Mark Messages Seen (Read Receipts)
    socket.on("chat:mark_seen", async (data: { projectId: string; messageIds: string[] }) => {
      try {
        if (data.projectId && data.messageIds?.length > 0 && user?.id) {
          const rateCheck = await this.rateLimiter.consume(`socket:${user.id}:mark_seen`, 20, 2);
          if (!rateCheck.allowed) return;

          await this.chatService.markMessagesSeen(data.projectId, { messageIds: data.messageIds }, user);
        }
      } catch (error) {
        this.logger.error("Error in chat:mark_seen:", { error });
      }
    });

    // 5. Approval Workflow Actions
    socket.on("approval:action", async (payload: {
      projectId: string;
      messageId: string;
      action: "LEAD_APPROVE" | "SALES_DISPATCH" | "REVISION_REQUESTED";
      dispatchPlatform?: string;
      dispatchReferenceId?: string;
      rejectionReason?: string;
      notes?: string;
    }, callback) => {
      try {
        if (!user || !user.id) {
          return callback?.({ success: false, error: "Unauthenticated socket session" });
        }

        const rateCheck = await this.rateLimiter.consume(`socket:${user.id}:approval_action`, 10, 5);
        if (!rateCheck.allowed) {
          return callback?.({ success: false, error: "Too many approval actions in short time. Please slow down." });
        }

        const { projectId, messageId, action } = payload;
        let result: any = null;

        if (action === "LEAD_APPROVE") {
          result = await this.approvalService.leadApprove(
            projectId,
            messageId,
            { notes: payload.notes },
            user,
          );
        } else if (action === "SALES_DISPATCH") {
          result = await this.approvalService.salesDispatch(
            projectId,
            messageId,
            {
              dispatchPlatform: payload.dispatchPlatform || "Direct Portal",
              dispatchReferenceId: payload.dispatchReferenceId,
              notes: payload.notes,
            },
            user,
          );
        } else if (action === "REVISION_REQUESTED") {
          result = await this.approvalService.requestRevision(
            projectId,
            messageId,
            { rejectionReason: payload.rejectionReason || "Revision requested" },
            user,
          );
        }

        callback?.({ success: true, data: result });
      } catch (error: any) {
        this.logger.error("Error in approval:action:", { error });
        callback?.({ success: false, error: error.message || "Failed to process approval action" });
      }
    });
  }
}
