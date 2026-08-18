import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  PutBucketCorsCommand,
} from "@aws-sdk/client-s3";
import { AppLogger } from "@workspace/logger";
import { StorageError } from "../errors/StorageErrors";
import { withRetry } from "./S3ClientFactory";

const logger = new AppLogger("BucketManager");

export class BucketManager {
  constructor(
    private readonly client: S3Client,
    private readonly maxRetries: number = 3,
  ) {}

  public async bucketExists(bucketName: string): Promise<boolean> {
    try {
      await withRetry(
        () => this.client.send(new HeadBucketCommand({ Bucket: bucketName })),
        { maxRetries: this.maxRetries, operationName: `HeadBucket(${bucketName})` },
      );
      return true;
    } catch (error: any) {
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404 ||
        error.name === "NoSuchBucket" ||
        error.Code === "NoSuchBucket"
      ) {
        return false;
      }
      // If 403, bucket might exist but not owned or limited permission
      if (error.$metadata?.httpStatusCode === 403) {
        logger.warn(`Bucket ${bucketName} exists but access is forbidden`, { error });
        return true;
      }
      throw error;
    }
  }

  public async ensureBucketExists(bucketName: string, isPublic: boolean = false): Promise<void> {
    try {
      const exists = await this.bucketExists(bucketName);
      if (!exists) {
        logger.info(`Bucket '${bucketName}' does not exist. Creating...`);
        await withRetry(
          () => this.client.send(new CreateBucketCommand({ Bucket: bucketName })),
          { maxRetries: this.maxRetries, operationName: `CreateBucket(${bucketName})` },
        );
        logger.info(`Bucket '${bucketName}' created successfully`);
      }

      // Configure CORS
      await this.setBucketCors(bucketName);

      // If public bucket, apply public read policy
      if (isPublic) {
        await this.setPublicBucketPolicy(bucketName);
      }
    } catch (error: any) {
      // Ignore if bucket was already owned/created concurrently
      if (
        error.name === "BucketAlreadyOwnedByYou" ||
        error.name === "BucketAlreadyExists" ||
        error.Code === "BucketAlreadyOwnedByYou"
      ) {
        return;
      }
      logger.error(`Failed to ensure bucket '${bucketName}' exists`, { error });
      throw new StorageError(
        `Failed to provision bucket '${bucketName}': ${error?.message || error}`,
        "BUCKET_PROVISION_ERROR",
        500,
        error,
      );
    }
  }

  public async setBucketCors(bucketName: string): Promise<void> {
    try {
      const corsParams = {
        Bucket: bucketName,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["*"],
              AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
              AllowedOrigins: ["*"],
              ExposeHeaders: ["ETag", "Content-Length", "Content-Type", "Content-Disposition"],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      };

      await withRetry(
        () => this.client.send(new PutBucketCorsCommand(corsParams)),
        { maxRetries: this.maxRetries, operationName: `PutBucketCors(${bucketName})` },
      );
      logger.info(`Configured CORS policy for bucket '${bucketName}'`);
    } catch (error: any) {
      // Some S3-compatible backends don't support or need CORS configuration commands, log as debug/warn
      logger.warn(`Could not set CORS for bucket '${bucketName}' (may not be supported by S3 engine)`, {
        error: error?.message || error,
      });
    }
  }

  public async setPublicBucketPolicy(bucketName: string): Promise<void> {
    try {
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "PublicReadGetObject",
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };

      await withRetry(
        () =>
          this.client.send(
            new PutBucketPolicyCommand({
              Bucket: bucketName,
              Policy: JSON.stringify(policy),
            }),
          ),
        { maxRetries: this.maxRetries, operationName: `PutBucketPolicy(${bucketName})` },
      );
      logger.info(`Applied public-read policy to bucket '${bucketName}'`);
    } catch (error: any) {
      logger.warn(`Could not apply public policy to bucket '${bucketName}' (may use bucket-level ACL)`, {
        error: error?.message || error,
      });
    }
  }
}
