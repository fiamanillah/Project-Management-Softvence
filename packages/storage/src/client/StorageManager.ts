import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";
import { AppLogger } from "@workspace/logger";
import type {
  StorageConfig,
  IStorageService,
  UploadInput,
  UploadResult,
  PresignedUploadOptions,
  PresignedUploadResult,
  PresignedDownloadOptions,
  FileMetadata,
  FileStreamResult,
  ListFilesOptions,
  PaginatedFilesResult,
  DeleteMultipleResult,
  StorageHealthResult,
} from "../types";
import {
  validateStorageConfig,
  type ValidatedStorageConfig,
} from "../config/StorageConfig";
import { S3ClientFactory, withRetry } from "./S3ClientFactory";
import { BucketManager } from "./BucketManager";
import {
  StorageError,
  FileNotFoundError,
  BucketNotFoundError,
  StorageUploadError,
  StoragePresignedUrlError,
  StoragePayloadTooLargeError,
} from "../errors/StorageErrors";
import { lookupMimeType } from "../utils/mimeHelper";
import { generateStorageKey, normalizeKey } from "../utils/keySanitizer";

const logger = new AppLogger("StorageManager");

export class StorageManager implements IStorageService {
  private readonly config: ValidatedStorageConfig;
  private readonly client: S3Client;
  private readonly bucketManager: BucketManager;
  private isInitialized = false;

  constructor(config: StorageConfig = {}) {
    this.config = validateStorageConfig(config);
    this.client = S3ClientFactory.create(this.config);
    this.bucketManager = new BucketManager(this.client, this.config.retryCount);
  }

  public getClient(): S3Client {
    return this.client;
  }

  public getConfig(): ValidatedStorageConfig {
    return this.config;
  }

  /**
   * Initializes public and private default buckets on application bootstrap.
   */
  public async initializeBuckets(): Promise<void> {
    if (this.isInitialized) return;

    logger.info("Initializing storage buckets...", {
      publicBucket: this.config.publicBucket,
      privateBucket: this.config.privateBucket,
    });

    try {
      await Promise.all([
        this.bucketManager.ensureBucketExists(this.config.publicBucket, true),
        this.bucketManager.ensureBucketExists(this.config.privateBucket, false),
      ]);
      this.isInitialized = true;
      logger.info("Storage buckets initialized successfully");
    } catch (error: any) {
      logger.error("Failed to initialize storage buckets", { error });
      throw error;
    }
  }

  public async ensureBucketExists(bucket: string, isPublic: boolean = false): Promise<void> {
    await this.bucketManager.ensureBucketExists(bucket, isPublic);
  }

  /**
   * Uploads a file (buffer, string, or stream) to storage.
   */
  public async uploadFile(input: UploadInput): Promise<UploadResult> {
    const isPublic = input.isPublic ?? false;
    const bucket = input.bucket || (isPublic ? this.config.publicBucket : this.config.privateBucket);

    const contentType =
      input.contentType ||
      (input.fileName ? lookupMimeType(input.fileName) : "application/octet-stream");

    const key = normalizeKey(
      input.key ||
        generateStorageKey({
          fileName: input.fileName,
          entityType: input.entityType,
          entityId: input.entityId,
          isPublic,
        }),
    );

    let body = input.body;
    let size = 0;

    if (typeof body === "string") {
      body = Buffer.from(body, "utf-8");
      size = (body as Buffer).length;
    } else if (body instanceof Uint8Array && !(body instanceof Buffer)) {
      body = Buffer.from(body);
      size = (body as Buffer).length;
    } else if (Buffer.isBuffer(body)) {
      size = body.length;
    }

    if (size > 0 && size > this.config.maxFileSize) {
      throw new StoragePayloadTooLargeError(this.config.maxFileSize, size);
    }

    try {
      let eTag: string | undefined;

      if (body instanceof Readable) {
        // Use multipart upload stream for streaming inputs
        const parallelUpload = new Upload({
          client: this.client,
          params: {
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
            Metadata: input.metadata,
            CacheControl: input.cacheControl || (isPublic ? "public, max-age=31536000" : undefined),
          },
          queueSize: 4,
          partSize: 5 * 1024 * 1024, // 5MB chunk parts
          leavePartsOnError: false,
        });

        const uploadOutput = await parallelUpload.done();
        eTag = uploadOutput.ETag;
      } else {
        // Standard PutObject for buffer/in-memory data
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body as Buffer,
          ContentType: contentType,
          ContentLength: size > 0 ? size : undefined,
          Metadata: input.metadata,
          CacheControl: input.cacheControl || (isPublic ? "public, max-age=31536000" : undefined),
        });

        const response = await withRetry(() => this.client.send(command), {
          maxRetries: this.config.retryCount,
          operationName: `PutObject(${bucket}/${key})`,
        });

        eTag = response.ETag;
      }

      const url = this.getPublicUrl(bucket, key);

      logger.info(`File uploaded successfully: ${bucket}/${key}`, {
        size,
        contentType,
        isPublic,
      });

      return {
        key,
        bucket,
        url,
        publicUrl: isPublic ? url : undefined,
        contentType,
        size,
        eTag: eTag?.replace(/"/g, ""),
        isPublic,
        metadata: input.metadata,
      };
    } catch (error: any) {
      if (error instanceof StorageError) throw error;
      logger.error(`Error uploading file to ${bucket}/${key}`, { error });
      throw new StorageUploadError(`Failed to upload file: ${error?.message || error}`, error);
    }
  }

  /**
   * Generates a presigned URL for direct client-side PUT upload.
   */
  public async getPresignedUploadUrl(
    options: PresignedUploadOptions,
  ): Promise<PresignedUploadResult> {
    const isPublic = options.isPublic ?? false;
    const bucket = options.bucket || (isPublic ? this.config.publicBucket : this.config.privateBucket);
    const expiresIn = options.expiresInSeconds || 900; // Default 15 mins

    const key = normalizeKey(
      options.key ||
        generateStorageKey({
          fileName: options.fileName,
          entityType: options.entityType,
          entityId: options.entityId,
          isPublic,
        }),
    );

    const contentType = options.contentType || "application/octet-stream";

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        Metadata: options.metadata,
      });

      const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      const publicUrl = isPublic ? this.getPublicUrl(bucket, key) : undefined;

      logger.info(`Generated presigned upload URL for ${bucket}/${key}`, {
        expiresIn,
        contentType,
        isPublic,
      });

      return {
        uploadUrl,
        key,
        bucket,
        publicUrl,
        contentType,
        expiresAt,
        isPublic,
      };
    } catch (error: any) {
      logger.error(`Failed to generate presigned upload URL for ${bucket}/${key}`, { error });
      throw new StoragePresignedUrlError(
        `Failed to generate presigned upload URL: ${error?.message || error}`,
        error,
      );
    }
  }

  /**
   * Generates a presigned URL for secure download/access of private files.
   */
  public async getPresignedDownloadUrl(
    options: PresignedDownloadOptions,
  ): Promise<string> {
    const isPublic = options.isPublic ?? false;
    const bucket = options.bucket || (isPublic ? this.config.publicBucket : this.config.privateBucket);
    const key = normalizeKey(options.key);
    const expiresIn = options.expiresInSeconds || 3600; // Default 1 hour

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: options.downloadFilename
          ? `attachment; filename="${encodeURIComponent(options.downloadFilename)}"`
          : undefined,
      });

      const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
      return signedUrl;
    } catch (error: any) {
      logger.error(`Failed to generate presigned download URL for ${bucket}/${key}`, { error });
      throw new StoragePresignedUrlError(
        `Failed to generate presigned download URL: ${error?.message || error}`,
        error,
      );
    }
  }

  /**
   * Streams a file from storage, supporting HTTP Range requests for video/audio.
   */
  public async getFileStream(
    bucket: string,
    key: string,
    range?: string,
  ): Promise<FileStreamResult> {
    const normalized = normalizeKey(key);

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: normalized,
        Range: range,
      });

      const response = await withRetry(() => this.client.send(command), {
        maxRetries: this.config.retryCount,
        operationName: `GetObject(${bucket}/${normalized})`,
      });

      if (!response.Body) {
        throw new FileNotFoundError(bucket, normalized);
      }

      return {
        stream: response.Body as Readable,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        eTag: response.ETag?.replace(/"/g, ""),
        lastModified: response.LastModified,
        contentRange: response.ContentRange,
        acceptRanges: response.AcceptRanges,
      };
    } catch (error: any) {
      if (
        error.name === "NoSuchKey" ||
        error.Code === "NoSuchKey" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        throw new FileNotFoundError(bucket, normalized, error);
      }
      if (
        error.name === "NoSuchBucket" ||
        error.Code === "NoSuchBucket"
      ) {
        throw new BucketNotFoundError(bucket, error);
      }
      logger.error(`Failed to get file stream for ${bucket}/${normalized}`, { error });
      throw new StorageError(
        `Failed to retrieve file stream: ${error?.message || error}`,
        "STORAGE_GET_ERROR",
        500,
        error,
      );
    }
  }

  /**
   * Retrieves the complete file content as a Buffer.
   */
  public async getFileBuffer(bucket: string, key: string): Promise<Buffer> {
    const { stream } = await this.getFileStream(bucket, key);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", (err: any) => reject(err));
    });
  }

  /**
   * Retrieves metadata (size, content type, ETag, last modified) of a file.
   */
  public async getFileMetadata(bucket: string, key: string): Promise<FileMetadata> {
    const normalized = normalizeKey(key);

    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: normalized,
      });

      const response = await withRetry(() => this.client.send(command), {
        maxRetries: this.config.retryCount,
        operationName: `HeadObject(${bucket}/${normalized})`,
      });

      const isPublic = bucket === this.config.publicBucket;

      return {
        key: normalized,
        bucket,
        size: response.ContentLength || 0,
        contentType: response.ContentType || "application/octet-stream",
        eTag: response.ETag?.replace(/"/g, ""),
        lastModified: response.LastModified,
        metadata: response.Metadata,
        isPublic,
      };
    } catch (error: any) {
      if (
        error.name === "NotFound" ||
        error.name === "NoSuchKey" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        throw new FileNotFoundError(bucket, normalized, error);
      }
      logger.error(`Failed to get metadata for ${bucket}/${normalized}`, { error });
      throw new StorageError(
        `Failed to get metadata: ${error?.message || error}`,
        "METADATA_GET_ERROR",
        500,
        error,
      );
    }
  }

  /**
   * Deletes a single file from storage.
   */
  public async deleteFile(bucket: string, key: string): Promise<void> {
    const normalized = normalizeKey(key);

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: normalized,
      });

      await withRetry(() => this.client.send(command), {
        maxRetries: this.config.retryCount,
        operationName: `DeleteObject(${bucket}/${normalized})`,
      });

      logger.info(`Deleted file: ${bucket}/${normalized}`);
    } catch (error: any) {
      logger.error(`Failed to delete file ${bucket}/${normalized}`, { error });
      throw new StorageError(
        `Failed to delete file: ${error?.message || error}`,
        "STORAGE_DELETE_ERROR",
        500,
        error,
      );
    }
  }

  /**
   * Batch deletes multiple files from storage in a single S3 request.
   */
  public async deleteFiles(bucket: string, keys: string[]): Promise<DeleteMultipleResult> {
    if (keys.length === 0) return { deleted: [], errors: [] };

    const normalizedObjects = keys.map((k) => ({ Key: normalizeKey(k) }));

    try {
      const command = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: normalizedObjects,
          Quiet: false,
        },
      });

      const response = await withRetry(() => this.client.send(command), {
        maxRetries: this.config.retryCount,
        operationName: `DeleteObjects(${bucket}, ${keys.length} items)`,
      });

      const deleted = (response.Deleted || []).map((d) => d.Key!).filter(Boolean);
      const errors = (response.Errors || []).map((e) => ({
        key: e.Key || "",
        code: e.Code,
        message: e.Message,
      }));

      logger.info(`Deleted ${deleted.length} files from bucket '${bucket}'`);
      return { deleted, errors };
    } catch (error: any) {
      logger.error(`Failed to batch delete files from ${bucket}`, { error });
      throw new StorageError(
        `Failed to batch delete files: ${error?.message || error}`,
        "BATCH_DELETE_ERROR",
        500,
        error,
      );
    }
  }

  /**
   * Copies a file from source to destination within or between buckets.
   */
  public async copyFile(
    source: { bucket: string; key: string },
    destination: { bucket: string; key: string },
  ): Promise<void> {
    const srcKey = normalizeKey(source.key);
    const destKey = normalizeKey(destination.key);
    const copySource = `${source.bucket}/${encodeURIComponent(srcKey)}`;

    try {
      const command = new CopyObjectCommand({
        CopySource: copySource,
        Bucket: destination.bucket,
        Key: destKey,
      });

      await withRetry(() => this.client.send(command), {
        maxRetries: this.config.retryCount,
        operationName: `CopyObject(${copySource} -> ${destination.bucket}/${destKey})`,
      });

      logger.info(`Copied file from ${source.bucket}/${srcKey} to ${destination.bucket}/${destKey}`);
    } catch (error: any) {
      logger.error(`Failed to copy file from ${source.bucket}/${srcKey}`, { error });
      throw new StorageError(
        `Failed to copy file: ${error?.message || error}`,
        "STORAGE_COPY_ERROR",
        500,
        error,
      );
    }
  }

  /**
   * Moves a file by copying to destination and deleting source.
   */
  public async moveFile(
    source: { bucket: string; key: string },
    destination: { bucket: string; key: string },
  ): Promise<void> {
    await this.copyFile(source, destination);
    await this.deleteFile(source.bucket, source.key);
  }

  /**
   * Lists files in a bucket with pagination and prefix filtering.
   */
  public async listFiles(bucket: string, options: ListFilesOptions = {}): Promise<PaginatedFilesResult> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: options.prefix,
        Delimiter: options.delimiter,
        MaxKeys: options.maxKeys || 50,
        ContinuationToken: options.continuationToken,
      });

      const response = await withRetry(() => this.client.send(command), {
        maxRetries: this.config.retryCount,
        operationName: `ListObjectsV2(${bucket})`,
      });

      const isPublic = bucket === this.config.publicBucket;

      const files = (response.Contents || []).map((item) => ({
        key: item.Key || "",
        size: item.Size || 0,
        lastModified: item.LastModified,
        eTag: item.ETag?.replace(/"/g, ""),
        isPublic,
        url: this.getPublicUrl(bucket, item.Key || ""),
      }));

      const commonPrefixes = (response.CommonPrefixes || [])
        .map((p) => p.Prefix!)
        .filter(Boolean);

      return {
        files,
        commonPrefixes,
        nextContinuationToken: response.NextContinuationToken,
        isTruncated: response.IsTruncated ?? false,
        keyCount: response.KeyCount || 0,
      };
    } catch (error: any) {
      logger.error(`Failed to list files in bucket ${bucket}`, { error });
      throw new StorageError(
        `Failed to list files: ${error?.message || error}`,
        "LIST_FILES_ERROR",
        500,
        error,
      );
    }
  }

  /**
   * Generates public URL for a file.
   */
  public getPublicUrl(bucket: string, key: string): string {
    const cleanKey = normalizeKey(key);

    if (this.config.publicUrlPrefix) {
      const prefix = this.config.publicUrlPrefix.replace(/\/+$/, "");
      return `${prefix}/${cleanKey}`;
    }

    if (this.config.endpoint) {
      const endpoint = this.config.endpoint.replace(/\/+$/, "");
      if (this.config.forcePathStyle) {
        return `${endpoint}/${bucket}/${cleanKey}`;
      } else {
        const url = new URL(endpoint);
        return `${url.protocol}//${bucket}.${url.host}/${cleanKey}`;
      }
    }

    return `https://${bucket}.s3.${this.config.region}.amazonaws.com/${cleanKey}`;
  }

  /**
   * Checks health and latency of the storage connection and default buckets.
   */
  public async healthCheck(): Promise<StorageHealthResult> {
    const start = Date.now();
    try {
      const [pubExists, privExists] = await Promise.all([
        this.bucketManager.bucketExists(this.config.publicBucket),
        this.bucketManager.bucketExists(this.config.privateBucket),
      ]);

      const latencyMs = Date.now() - start;

      return {
        healthy: pubExists && privExists,
        endpoint: this.config.endpoint,
        region: this.config.region,
        buckets: {
          publicBucket: { name: this.config.publicBucket, exists: pubExists },
          privateBucket: { name: this.config.privateBucket, exists: privExists },
        },
        latencyMs,
      };
    } catch (error: any) {
      return {
        healthy: false,
        endpoint: this.config.endpoint,
        region: this.config.region,
        buckets: {
          publicBucket: { name: this.config.publicBucket, exists: false },
          privateBucket: { name: this.config.privateBucket, exists: false },
        },
        latencyMs: Date.now() - start,
        error: error?.message || String(error),
      };
    }
  }
}
