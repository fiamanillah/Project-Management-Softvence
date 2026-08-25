import { Readable } from "stream";
import { type PrismaClient, type AttachmentEntity } from "@workspace/db";
import { StorageManager, type UploadResult } from "@workspace/storage";
import { can } from "@/core/authorization/AuthorizationEngine";
import { AuditLogService } from "@/core/audit/audit.service";
import { AppLogger } from "@/core/logging/logger";
import { AppError } from "@/core/errors/AppError";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";
import type {
  PresignedUploadRequest,
  PresignedDownloadRequest,
  ConfirmUploadRequest,
  ListFilesQuery,
  StorageCapabilities,
} from "./StorageDTO";

const logger = new AppLogger("StorageService");

export interface UploadFileOptions {
  fileName: string;
  buffer: Buffer;
  mimeType?: string;
  entityType?: string;
  entityId?: string;
  isPublic?: boolean;
}

export class StorageService {
  constructor(
    private readonly storageManager: StorageManager,
    private readonly prisma: PrismaClient,
  ) {}

  public getStorageManager(): StorageManager {
    return this.storageManager;
  }

  /**
   * Compute server-resolved capability flags for storage files (Rules BE-1 & FE-3)
   */
  public async computeCapabilities(
    user: any,
    resourceContext?: {
      projectId?: string;
      teamId?: string;
      departmentId?: string;
      profileId?: string;
    },
  ): Promise<StorageCapabilities> {
    const [canView, canDownload, canDelete, canManage] = await Promise.all([
      can(user, "storage.view", resourceContext),
      can(user, "storage.view", resourceContext),
      can(user, "storage.delete", resourceContext),
      can(user, "storage.manage"),
    ]);

    return {
      canView,
      canDownload,
      canDelete,
      canManage,
    };
  }

  /**
   * Upload file directly to S3 and optionally create Attachment record.
   */
  public async uploadFile(
    user: any,
    options: UploadFileOptions,
  ): Promise<{
    file: UploadResult;
    attachmentId?: string;
    _capabilities: StorageCapabilities;
  }> {
    const isPublic = options.isPublic ?? false;

    // S3 upload
    const uploadResult = await this.storageManager.uploadFile({
      body: options.buffer,
      fileName: options.fileName,
      contentType: options.mimeType,
      entityType: options.entityType,
      entityId: options.entityId,
      isPublic,
    });

    let attachmentId: string | undefined;

    // If valid AttachmentEntity, record in database
    if (options.entityType && options.entityId) {
      try {
        const validEntityTypes = [
          "project",
          "message",
          "issue",
          "support_ticket",
          "chat_message",
          "platform_thread_message",
          "bd_order",
        ];

        if (validEntityTypes.includes(options.entityType)) {
          const attachment = await this.prisma.attachment.create({
            data: {
              entityType: options.entityType as AttachmentEntity,
              entityId: options.entityId,
              fileUrl: uploadResult.key,
              fileName: options.fileName,
              mimeType: uploadResult.contentType,
              uploadedBy: user.id,
            },
          });
          attachmentId = attachment.id;
        }
      } catch (dbErr) {
        logger.warn("Could not create DB attachment record for uploaded file", {
          error: dbErr,
          key: uploadResult.key,
        });
      }
    }

    const capabilities = await this.computeCapabilities(user, {
      projectId: options.entityType === "project" ? options.entityId : undefined,
    });

    AuditLogService.log({
      module: "STORAGE",
      action: "FILE_UPLOADED",
      entityTable: "attachments",
      entityId: attachmentId || uploadResult.key,
      actor: {
        id: user?.id,
        email: user?.email,
        role: user?.systemRole,
        ipAddress: user?.ipAddress,
        userAgent: user?.userAgent,
      },
      newPayload: {
        key: uploadResult.key,
        fileName: options.fileName,
        mimeType: uploadResult.contentType,
        entityType: options.entityType,
        entityId: options.entityId,
        isPublic,
      },
      metadata: {
        key: uploadResult.key,
        bucket: uploadResult.bucket,
        size: uploadResult.size,
      },
      status: "SUCCESS",
    }).catch(() => {});

    return {
      file: uploadResult,
      attachmentId,
      _capabilities: capabilities,
    };
  }

  /**
   * Generates presigned URL for direct frontend upload to S3.
   */
  public async getPresignedUploadUrl(
    user: any,
    dto: PresignedUploadRequest,
  ) {
    const result = await this.storageManager.getPresignedUploadUrl({
      fileName: dto.fileName,
      contentType: dto.mimeType || "application/octet-stream",
      entityType: dto.entityType,
      entityId: dto.entityId,
      isPublic: dto.isPublic,
      maxSizeBytes: dto.maxSizeBytes,
      metadata: dto.metadata,
    });

    return result;
  }

  /**
   * Confirm direct client upload, verify object existence in S3, and create DB record.
   */
  public async confirmUpload(
    user: any,
    dto: ConfirmUploadRequest,
  ) {
    const isPublic = dto.isPublic ?? false;
    const bucket = dto.bucket || (isPublic ? this.storageManager.getConfig().publicBucket : this.storageManager.getConfig().privateBucket);

    // Verify file actually exists in S3
    const metadata = await this.storageManager.getFileMetadata(bucket, dto.key);

    let attachmentId: string | undefined;

    if (dto.entityType && dto.entityId) {
      const validEntityTypes = [
        "project",
        "message",
        "issue",
        "support_ticket",
        "chat_message",
        "platform_thread_message",
        "bd_order",
      ];

      if (validEntityTypes.includes(dto.entityType)) {
        const attachment = await this.prisma.attachment.create({
          data: {
            entityType: dto.entityType as AttachmentEntity,
            entityId: dto.entityId,
            fileUrl: dto.key,
            fileName: dto.fileName,
            mimeType: metadata.contentType || dto.mimeType,
            uploadedBy: user.id,
          },
        });
        attachmentId = attachment.id;
      }
    }

    const capabilities = await this.computeCapabilities(user, {
      projectId: dto.entityType === "project" ? dto.entityId : undefined,
    });

    AuditLogService.log({
      module: "STORAGE",
      action: "FILE_UPLOADED",
      entityTable: "attachments",
      entityId: attachmentId || dto.key,
      actor: {
        id: user?.id,
        email: user?.email,
        role: user?.systemRole,
        ipAddress: user?.ipAddress,
        userAgent: user?.userAgent,
      },
      newPayload: {
        key: dto.key,
        fileName: dto.fileName,
        mimeType: metadata.contentType || dto.mimeType,
        entityType: dto.entityType,
        entityId: dto.entityId,
        isPublic,
      },
      metadata: {
        key: dto.key,
        bucket,
        size: metadata.size,
      },
      status: "SUCCESS",
    }).catch(() => {});

    return {
      key: dto.key,
      bucket,
      size: metadata.size,
      contentType: metadata.contentType,
      url: this.storageManager.getPublicUrl(bucket, dto.key),
      isPublic,
      attachmentId,
      _capabilities: capabilities,
    };
  }

  /**
   * Generates a presigned download URL for private files.
   */
  public async getPresignedDownloadUrl(
    user: any,
    dto: PresignedDownloadRequest,
  ): Promise<{ downloadUrl: string; key: string; expiresInSeconds: number }> {
    const isPublic = dto.isPublic ?? false;
    const bucket = isPublic
      ? this.storageManager.getConfig().publicBucket
      : this.storageManager.getConfig().privateBucket;

    const downloadUrl = await this.storageManager.getPresignedDownloadUrl({
      bucket,
      key: dto.key,
      downloadFilename: dto.downloadFilename,
      expiresInSeconds: dto.expiresInSeconds,
      isPublic,
    });

    return {
      downloadUrl,
      key: dto.key,
      expiresInSeconds: dto.expiresInSeconds || 3600,
    };
  }

  /**
   * Stream file from storage (supporting HTTP Range requests).
   */
  public async getFileStream(
    user: any,
    key: string,
    isPublic: boolean = false,
    range?: string,
  ) {
    const bucket = isPublic
      ? this.storageManager.getConfig().publicBucket
      : this.storageManager.getConfig().privateBucket;

    return this.storageManager.getFileStream(bucket, key, range);
  }

  /**
   * Delete file from S3 and remove DB attachment record.
   */
  public async deleteFile(
    user: any,
    key: string,
    isPublic: boolean = false,
  ): Promise<{ success: boolean; key: string }> {
    const bucket = isPublic
      ? this.storageManager.getConfig().publicBucket
      : this.storageManager.getConfig().privateBucket;

    // Delete from S3
    await this.storageManager.deleteFile(bucket, key);

    // Delete from DB attachment table if exists
    try {
      await this.prisma.attachment.deleteMany({
        where: {
          fileUrl: key,
        },
      });
    } catch (dbErr) {
      logger.warn("Could not delete matching DB attachments for key", {
        key,
        error: dbErr,
      });
    }

    AuditLogService.log({
      module: "STORAGE",
      action: "FILE_DELETED",
      entityTable: "attachments",
      entityId: key,
      actor: {
        id: user?.id,
        email: user?.email,
        role: user?.systemRole,
        ipAddress: user?.ipAddress,
        userAgent: user?.userAgent,
      },
      metadata: {
        key,
        bucket,
        isPublic,
      },
      status: "SUCCESS",
    }).catch(() => {});

    return { success: true, key };
  }

  /**
   * Lists files with pagination.
   */
  public async listFiles(
    user: any,
    query: ListFilesQuery,
  ) {
    const isPublic = query.isPublic ?? false;
    const bucket = isPublic
      ? this.storageManager.getConfig().publicBucket
      : this.storageManager.getConfig().privateBucket;

    if (query.entityType || query.entityId) {
      // Query through database Attachment table
      const where: any = {};
      if (query.entityType) where.entityType = query.entityType;
      if (query.entityId) where.entityId = query.entityId;

      const [total, items] = await Promise.all([
        this.prisma.attachment.count({ where }),
        this.prisma.attachment.findMany({
          where,
          take: query.limit,
          orderBy: { createdAt: "desc" },
          include: {
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
      ]);

      const itemsWithCapabilities = await Promise.all(
        items.map(async (item) => ({
          ...item,
          url: this.storageManager.getPublicUrl(bucket, item.fileUrl),
          _capabilities: await this.computeCapabilities(user, {
            projectId: item.entityType === "project" ? item.entityId : undefined,
          }),
        })),
      );

      return {
        items: itemsWithCapabilities,
        total,
      };
    }

    // Direct S3 listing
    const s3Result = await this.storageManager.listFiles(bucket, {
      prefix: query.prefix,
      maxKeys: query.limit,
      continuationToken: query.continuationToken,
    });

    const filesWithCapabilities = await Promise.all(
      s3Result.files.map(async (file) => ({
        ...file,
        _capabilities: await this.computeCapabilities(user),
      })),
    );

    return {
      files: filesWithCapabilities,
      commonPrefixes: s3Result.commonPrefixes,
      nextContinuationToken: s3Result.nextContinuationToken,
      isTruncated: s3Result.isTruncated,
      keyCount: s3Result.keyCount,
    };
  }

  /**
   * Health check
   */
  public async getHealth() {
    return this.storageManager.healthCheck();
  }
}
