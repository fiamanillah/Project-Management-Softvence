import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import type { ValidatedStorageConfig } from "../config/StorageConfig";
import { AppLogger } from "@workspace/logger";

const logger = new AppLogger("S3ClientFactory");

export class S3ClientFactory {
  public static create(config: ValidatedStorageConfig): S3Client {
    const s3Config: S3ClientConfig = {
      region: config.region || "us-east-1",
      forcePathStyle: config.forcePathStyle,
      maxAttempts: config.retryCount,
    };

    if (config.endpoint) {
      s3Config.endpoint = config.endpoint;
      s3Config.tls = config.sslEnabled;
    }

    if (config.credentials && config.credentials.accessKeyId && config.credentials.secretAccessKey) {
      s3Config.credentials = {
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretAccessKey,
        sessionToken: config.credentials.sessionToken,
      };
    }

    logger.info("Initialized S3Client", {
      endpoint: config.endpoint || "AWS S3 Default",
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      sslEnabled: config.sslEnabled,
    });

    return new S3Client(s3Config);
  }
}

/**
 * Execute an asynchronous operation with exponential backoff and jitter retry mechanism.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    operationName?: string;
    shouldRetry?: (error: unknown) => boolean;
  } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 5000;
  const operationName = options.operationName ?? "Storage Operation";

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (attempt > maxRetries) {
        throw error;
      }

      // Check if error is retryable
      const isRetryable = options.shouldRetry
        ? options.shouldRetry(error)
        : isDefaultRetryableError(error);

      if (!isRetryable) {
        throw error;
      }

      // Exponential backoff with jitter: delay = min(maxDelay, baseDelay * 2^(attempt-1)) + jitter
      const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
      const jitter = Math.random() * (exponentialDelay * 0.2); // 20% jitter
      const finalDelay = Math.floor(exponentialDelay + jitter);

      logger.warn(
        `Retrying ${operationName} (attempt ${attempt}/${maxRetries}) after ${finalDelay}ms due to: ${error?.message || error}`,
      );

      await new Promise((resolve) => setTimeout(resolve, finalDelay));
    }
  }
}

function isDefaultRetryableError(error: any): boolean {
  if (!error) return false;

  // AWS SDK error codes or network codes
  const retryableCodes = [
    "NetworkingError",
    "TimeoutError",
    "RequestTimeout",
    "ThrottlingException",
    "SlowDown",
    "ServiceUnavailable",
    "InternalError",
    "ECONNRESET",
    "ECONNREFUSED",
    "EPIPE",
    "ETIMEDOUT",
  ];

  if (error.code && retryableCodes.includes(error.code)) return true;
  if (error.name && retryableCodes.includes(error.name)) return true;
  if (error.$metadata?.httpStatusCode && error.$metadata.httpStatusCode >= 500) return true;
  if (error.$metadata?.httpStatusCode === 429) return true;

  return false;
}
