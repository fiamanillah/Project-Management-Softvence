import { Readable } from "stream";

export interface StorageCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface StorageConfig {
  endpoint?: string;
  region?: string;
  credentials?: StorageCredentials;
  forcePathStyle?: boolean;
  sslEnabled?: boolean;
  publicBucket?: string;
  privateBucket?: string;
  publicUrlPrefix?: string;
  maxFileSize?: number;
  retryCount?: number;
  retryDelayMs?: number;
  requestTimeoutMs?: number;
}

export interface UploadInput {
  bucket?: string;
  key?: string;
  body: Buffer | Uint8Array | Blob | string | Readable;
  contentType?: string;
  fileName?: string;
  entityType?: string;
  entityId?: string;
  isPublic?: boolean;
  metadata?: Record<string, string>;
  cacheControl?: string;
}

export interface UploadResult {
  key: string;
  bucket: string;
  url: string;
  publicUrl?: string;
  contentType: string;
  size: number;
  eTag?: string;
  isPublic: boolean;
  metadata?: Record<string, string>;
}

export interface StreamUploadOptions {
  bucket?: string;
  key: string;
  contentType?: string;
  isPublic?: boolean;
  metadata?: Record<string, string>;
  cacheControl?: string;
}

export interface PresignedUploadOptions {
  bucket?: string;
  key?: string;
  fileName?: string;
  entityType?: string;
  entityId?: string;
  contentType: string;
  isPublic?: boolean;
  expiresInSeconds?: number;
  maxSizeBytes?: number;
  metadata?: Record<string, string>;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  bucket: string;
  publicUrl?: string;
  contentType: string;
  expiresAt: string;
  isPublic: boolean;
}

export interface PresignedDownloadOptions {
  bucket?: string;
  key: string;
  expiresInSeconds?: number;
  downloadFilename?: string;
  isPublic?: boolean;
}

export interface FileMetadata {
  key: string;
  bucket: string;
  size: number;
  contentType: string;
  eTag?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
  isPublic: boolean;
}

export interface FileStreamResult {
  stream: Readable;
  contentType?: string;
  contentLength?: number;
  eTag?: string;
  lastModified?: Date;
  contentRange?: string;
  acceptRanges?: string;
}

export interface ListFilesOptions {
  prefix?: string;
  delimiter?: string;
  maxKeys?: number;
  continuationToken?: string;
  isPublic?: boolean;
}

export interface StoredFileSummary {
  key: string;
  size: number;
  lastModified?: Date;
  eTag?: string;
  isPublic: boolean;
  url?: string;
}

export interface PaginatedFilesResult {
  files: StoredFileSummary[];
  commonPrefixes: string[];
  nextContinuationToken?: string;
  isTruncated: boolean;
  keyCount: number;
}

export interface DeleteMultipleResult {
  deleted: string[];
  errors: Array<{ key: string; code?: string; message?: string }>;
}

export interface StorageHealthResult {
  healthy: boolean;
  endpoint?: string;
  region?: string;
  buckets: {
    publicBucket: { name: string; exists: boolean };
    privateBucket: { name: string; exists: boolean };
  };
  latencyMs: number;
  error?: string;
}

export interface IStorageService {
  initializeBuckets(): Promise<void>;
  ensureBucketExists(bucket: string, isPublic?: boolean): Promise<void>;
  uploadFile(input: UploadInput): Promise<UploadResult>;
  getPresignedUploadUrl(options: PresignedUploadOptions): Promise<PresignedUploadResult>;
  getPresignedDownloadUrl(options: PresignedDownloadOptions): Promise<string>;
  getFileStream(bucket: string, key: string, range?: string): Promise<FileStreamResult>;
  getFileBuffer(bucket: string, key: string): Promise<Buffer>;
  getFileMetadata(bucket: string, key: string): Promise<FileMetadata>;
  deleteFile(bucket: string, key: string): Promise<void>;
  deleteFiles(bucket: string, keys: string[]): Promise<DeleteMultipleResult>;
  copyFile(
    source: { bucket: string; key: string },
    destination: { bucket: string; key: string },
  ): Promise<void>;
  moveFile(
    source: { bucket: string; key: string },
    destination: { bucket: string; key: string },
  ): Promise<void>;
  listFiles(bucket: string, options?: ListFilesOptions): Promise<PaginatedFilesResult>;
  getPublicUrl(bucket: string, key: string): string;
  healthCheck(): Promise<StorageHealthResult>;
}
