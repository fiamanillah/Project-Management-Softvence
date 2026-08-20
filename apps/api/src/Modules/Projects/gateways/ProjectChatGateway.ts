// src/Modules/Projects/gateways/ProjectChatGateway.ts

import { BaseSocketGateway } from "@/core/realtime/BaseSocketGateway";
import type { AuthenticatedSocket, RealtimeIoServer } from "@/core/realtime/realtime.types";
import type { ProjectChatService } from "../services/ProjectChatService";
import type { ProjectApprovalService } from "../services/ProjectApprovalService";
import { canSocket } from "@/core/realtime/socketPermission";
import type { CreateProjectMessageDTO, ToggleReactionDTO, MarkMessagesSeenDTO } from "../ProjectDTO";

export class ProjectChatGateway extends BaseSocketGateway {
  public readonly name = "ProjectChatGateway";

  constructor(
    private readonly chatService: ProjectChatService,
    private readonly approvalService: ProjectApprovalService,
  ) {
    super("ProjectChatGateway");
  }

  public register(io: RealtimeIoServer, socket: AuthenticatedSocket): void {
    const user = socket.data.user;

    // 1. Send Project Message
    socket.on("chat:send_message", async (payload: { projectId: string } & CreateProjectMessageDTO, callback) => {
      try {
        if (!payload.projectId || !payload.text?.trim()) {
          return callback?.({ success: false, error: "Project ID and message text are required" });
        }

        const isClientComm = payload.purpose === "CLIENT_COMMUNICATION";
        const allowed = isClientComm
          ? await canSocket(socket, "project.chat.send_client", { projectId: payload.projectId })
          : (await canSocket(socket, "project.chat.send", { projectId: payload.projectId })) ||
            (await canSocket(socket, "project.view", { projectId: payload.projectId }));

        if (!allowed) {
          return callback?.({
            success: false,
            error: isClientComm
              ? "Permission denied for client communications"
              : "Permission denied to send messages in this project",
          });
        }

        const message = await this.chatService.sendMessage(payload.projectId, payload, user);
        callback?.({ success: true, data: message });
      } catch (error: any) {
        this.logger.error("Error in chat:send_message:", { error });
        callback?.({ success: false, error: error.message || "Failed to send message" });
      }
    });

    // 2. Typing Indicators
    socket.on("chat:typing_start", ({ projectId }) => {
      if (projectId && user) {
        socket.to(`project:${projectId}`).emit("chat:user_typing" as any, {
          projectId,
          userId: user.id,
          userName: user.email?.split("@")[0] || "Team Member",
        });
      }
    });

    socket.on("chat:typing_stop", ({ projectId }) => {
      if (projectId && user) {
        socket.to(`project:${projectId}`).emit("chat:user_stopped_typing" as any, {
          projectId,
          userId: user.id,
        });
      }
    });

    // 3. Emoji Reactions
    socket.on("chat:react", async (data: { projectId: string; messageId: string; emoji: string }) => {
      try {
        if (data.projectId && data.messageId && data.emoji) {
          await this.chatService.toggleReaction(data.projectId, data.messageId, { emoji: data.emoji }, user);
        }
      } catch (error) {
        this.logger.error("Error in chat:react:", { error });
      }
    });

    // 4. Mark Messages Seen (Read Receipts)
    socket.on("chat:mark_seen", async (data: { projectId: string; messageIds: string[] }) => {
      try {
        if (data.projectId && data.messageIds?.length > 0) {
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
