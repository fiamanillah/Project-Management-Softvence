export class StorageError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: string = "STORAGE_ERROR",
    statusCode: number = 500,
    details?: unknown,
  ) {
    super(message);
    this.name = "StorageError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class StorageConnectionError extends StorageError {
  constructor(message: string = "Failed to connect to storage service", details?: unknown) {
    super(message, "STORAGE_CONNECTION_ERROR", 503, details);
    this.name = "StorageConnectionError";
  }
}

export class BucketNotFoundError extends StorageError {
  constructor(bucketName: string, details?: unknown) {
    super(`Storage bucket '${bucketName}' does not exist`, "BUCKET_NOT_FOUND", 404, details);
    this.name = "BucketNotFoundError";
  }
}

export class FileNotFoundError extends StorageError {
  constructor(bucketName: string, key: string, details?: unknown) {
    super(
      `File with key '${key}' not found in bucket '${bucketName}'`,
      "FILE_NOT_FOUND",
      404,
      details,
    );
    this.name = "FileNotFoundError";
  }
}

export class StorageUploadError extends StorageError {
  constructor(message: string = "Failed to upload file to storage", details?: unknown) {
    super(message, "STORAGE_UPLOAD_ERROR", 502, details);
    this.name = "StorageUploadError";
  }
}

export class StoragePresignedUrlError extends StorageError {
  constructor(message: string = "Failed to generate presigned URL", details?: unknown) {
    super(message, "STORAGE_PRESIGNED_URL_ERROR", 500, details);
    this.name = "StoragePresignedUrlError";
  }
}

export class StoragePayloadTooLargeError extends StorageError {
  constructor(maxSize: number, actualSize?: number) {
    const msg = actualSize
      ? `File size (${actualSize} bytes) exceeds the maximum allowed limit (${maxSize} bytes)`
      : `File size exceeds the maximum allowed limit of ${maxSize} bytes`;
    super(msg, "STORAGE_PAYLOAD_TOO_LARGE", 413, { maxSize, actualSize });
    this.name = "StoragePayloadTooLargeError";
  }
}

export class InvalidStorageConfigError extends StorageError {
  constructor(message: string, details?: unknown) {
    super(message, "INVALID_STORAGE_CONFIG", 500, details);
    this.name = "InvalidStorageConfigError";
  }
}
