// src/Modules/Projects/services/ProjectMessageTypeService.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError, ConflictError, ForbiddenError } from "@/core/errors/AppError";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import { can } from "@/core/authorization/AuthorizationEngine";
import { RealtimeServer } from "@/core/realtime/RealtimeServer";
import type {
  CreateMessageTypeDTO,
  UpdateMessageTypeDTO,
  MessageTypeItem,
} from "../ProjectDTO";

export class ProjectMessageTypeService {
  private logger = new AppLogger("ProjectMessageTypeService");
  private realtimeServer = RealtimeServer.getInstance();

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Retrieves active message types (filterable by direction: INTERNAL, OUTBOUND, INBOUND).
   */
  public async getMessageTypes(
    direction?: string,
    actor?: AuthenticatedUser,
  ): Promise<MessageTypeItem[]> {
    const where: any = { isActive: true };
    if (direction) {
      where.direction = direction;
    }

    const types = await this.prisma.messageType.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return types.map((t) => ({
      id: t.id,
      code: t.code,
      label: t.label || t.name,
      direction: t.direction as any,
      colorHex: t.colorHex,
      description: t.description || null,
      icon: t.icon || null,
      requiresApproval: t.requiresApproval,
      isSystem: t.isSystem,
      isActive: t.isActive,
      sortOrder: t.sortOrder,
    }));
  }

  /**
   * Creates a new custom message type.
   */
  public async createMessageType(
    dto: CreateMessageTypeDTO,
    actor: AuthenticatedUser,
  ): Promise<MessageTypeItem> {
    const hasPermission = await can(actor, "project.chat.manage_types");
    if (!hasPermission) {
      throw new ForbiddenError("You do not have permission to manage message types");
    }

    const existing = await this.prisma.messageType.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictError(`Message type with code '${dto.code}' already exists`);
    }

    const created = await this.prisma.messageType.create({
      data: {
        code: dto.code,
        name: dto.label,
        label: dto.label,
        direction: dto.direction,
        colorHex: dto.colorHex,
        description: dto.description || null,
        icon: dto.icon || null,
        requiresApproval: dto.requiresApproval,
        isSystem: false,
        sortOrder: dto.sortOrder,
      },
    });

    const item: MessageTypeItem = {
      id: created.id,
      code: created.code,
      label: created.label || created.name,
      direction: created.direction as any,
      colorHex: created.colorHex,
      description: created.description || null,
      icon: created.icon || null,
      requiresApproval: created.requiresApproval,
      isSystem: created.isSystem,
      isActive: created.isActive,
      sortOrder: created.sortOrder,
    };

    // Broadcast new message type to all connected clients
    this.realtimeServer.broadcast("system:event", {
      event: "message_type:created",
      payload: item,
    });

    this.logger.info(`Created message type '${item.code}' (${item.label}) by user ${actor.id}`);
    return item;
  }

  /**
   * Updates an existing message type.
   */
  public async updateMessageType(
    id: string,
    dto: UpdateMessageTypeDTO,
    actor: AuthenticatedUser,
  ): Promise<MessageTypeItem> {
    const hasPermission = await can(actor, "project.chat.manage_types");
    if (!hasPermission) {
      throw new ForbiddenError("You do not have permission to manage message types");
    }

    const existing = await this.prisma.messageType.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError("Message type not found");
    }

    const updated = await this.prisma.messageType.update({
      where: { id },
      data: {
        label: dto.label ?? existing.label,
        name: dto.label ?? existing.name,
        colorHex: dto.colorHex ?? existing.colorHex,
        description: dto.description !== undefined ? dto.description : existing.description,
        icon: dto.icon !== undefined ? dto.icon : existing.icon,
        requiresApproval: dto.requiresApproval !== undefined ? dto.requiresApproval : existing.requiresApproval,
        isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : existing.sortOrder,
      },
    });

    const item: MessageTypeItem = {
      id: updated.id,
      code: updated.code,
      label: updated.label || updated.name,
      direction: updated.direction as any,
      colorHex: updated.colorHex,
      description: updated.description || null,
      icon: updated.icon || null,
      requiresApproval: updated.requiresApproval,
      isSystem: updated.isSystem,
      isActive: updated.isActive,
      sortOrder: updated.sortOrder,
    };

    this.realtimeServer.broadcast("system:event", {
      event: "message_type:updated",
      payload: item,
    });

    return item;
  }

  /**
   * Deactivates / soft-deletes a message type.
   */
  public async deleteMessageType(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    const hasPermission = await can(actor, "project.chat.manage_types");
    if (!hasPermission) {
      throw new ForbiddenError("You do not have permission to manage message types");
    }

    await this.prisma.messageType.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }
}
