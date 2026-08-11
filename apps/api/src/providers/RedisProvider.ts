import { InfrastructureProvider } from "@/core/InfrastructureProvider";
import { CacheManager } from "@workspace/cache";

export class RedisProvider implements InfrastructureProvider<CacheManager> {
  public name = "Redis Cache";

  constructor(private readonly cacheManager: CacheManager) {}

  public getClient(): CacheManager {
    return this.cacheManager;
  }

  public async connect(): Promise<void> {
    await this.cacheManager.connect();
  }

  public async disconnect(): Promise<void> {
    await this.cacheManager.disconnect();
  }
}
