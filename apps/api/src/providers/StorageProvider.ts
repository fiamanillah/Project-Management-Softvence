import { InfrastructureProvider } from "@/core/InfrastructureProvider";
import { StorageManager } from "@workspace/storage";
import { AppLogger } from "@/core/logging/logger";

const logger = new AppLogger("StorageProvider");

export class StorageProvider implements InfrastructureProvider<StorageManager> {
  public name = "S3 Storage";

  constructor(private readonly storageManager: StorageManager) {}

  public getClient(): StorageManager {
    return this.storageManager;
  }

  public async connect(): Promise<void> {
    logger.info("Initializing S3 storage and buckets...");
    try {
      await this.storageManager.initializeBuckets();
      const health = await this.storageManager.healthCheck();
      if (health.healthy) {
        logger.info(`S3 storage connected successfully (Latency: ${health.latencyMs}ms)`);
      } else {
        logger.warn("S3 storage connection check warning", { error: health.error });
      }
    } catch (error) {
      logger.error("Failed to initialize S3 storage buckets on startup:", { error });
      // Non-fatal or allow app to continue if local S3 container is still starting
    }
  }

  public async disconnect(): Promise<void> {
    // S3 client uses HTTP connection pool; no explicit shutdown required
    logger.info("Storage provider disconnected");
  }
}
