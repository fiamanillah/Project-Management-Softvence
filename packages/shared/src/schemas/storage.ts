import { z } from "zod";

export const presignedUploadRequestSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  mimeType: z.string().optional(),
  isPublic: z.boolean().default(false),
  entityType: z.string().optional(),
  entityId: z.string().uuid("Entity ID must be a valid UUID").optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  maxSizeBytes: z.number().positive().optional(),
});

export type PresignedUploadRequest = z.infer<typeof presignedUploadRequestSchema>;

export const presignedDownloadRequestSchema = z.object({
  key: z.string().min(1, "Storage key is required"),
  isPublic: z.boolean().default(false),
  downloadFilename: z.string().optional(),
  expiresInSeconds: z.number().int().min(60).max(86400).default(3600),
});

export type PresignedDownloadRequest = z.infer<typeof presignedDownloadRequestSchema>;

export const confirmUploadRequestSchema = z.object({
  key: z.string().min(1, "Storage key is required"),
  bucket: z.string().optional(),
  fileName: z.string().min(1, "File name is required"),
  mimeType: z.string().optional(),
  entityType: z.enum([
    "project",
    "message",
    "issue",
    "support_ticket",
    "chat_message",
    "platform_thread_message",
    "bd_order",
    "user_avatar",
    "client_logo",
  ]).optional(),
  entityId: z.string().uuid("Entity ID must be a valid UUID").optional(),
  size: z.number().nonnegative().optional(),
  isPublic: z.boolean().default(false),
});

export type ConfirmUploadRequest = z.infer<typeof confirmUploadRequestSchema>;

export const deleteFileRequestSchema = z.object({
  key: z.string().min(1, "Storage key is required"),
  isPublic: z.boolean().default(false),
});

export type DeleteFileRequest = z.infer<typeof deleteFileRequestSchema>;

export const listFilesQuerySchema = z.object({
  prefix: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  continuationToken: z.string().optional(),
  isPublic: z.coerce.boolean().default(false),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
});

export type ListFilesQuery = z.infer<typeof listFilesQuerySchema>;

export const storageCapabilitiesSchema = z.object({
  canView: z.boolean(),
  canDownload: z.boolean(),
  canDelete: z.boolean(),
  canManage: z.boolean(),
});

export type StorageCapabilities = z.infer<typeof storageCapabilitiesSchema>;
