import Redis from "ioredis";
import { AppLogger } from "@workspace/logger";
import type { CacheConfig, ICacheManager, SetCacheOptions } from "../types";

const logger = new AppLogger("CacheManager");

export class CacheManager implements ICacheManager {
  private client: Redis | null = null;
  private isConnecting = false;
  private readonly config: CacheConfig;
  private readonly defaultTTLSeconds?: number;

  constructor(config: CacheConfig = {}) {
    this.config = config;
    this.defaultTTLSeconds = config.defaultTTLSeconds;
  }

  public async connect(): Promise<void> {
    if (this.client && (this.client.status === "ready" || this.client.status === "connect")) {
      return;
    }

    if (this.isConnecting) {
      while (this.isConnecting) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (this.client) return;
    }

    this.isConnecting = true;
    try {
      const redisHost = this.config.host || process.env.REDIS_HOST || "127.0.0.1";
      const redisPort = this.config.port || Number(process.env.REDIS_PORT) || 6379;
      const redisPassword = this.config.password || process.env.REDIS_PASSWORD || undefined;
      const redisDb = this.config.db ?? (process.env.REDIS_DB ? Number(process.env.REDIS_DB) : 0);

      this.client = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        db: redisDb,
        keyPrefix: this.config.keyPrefix,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        enableOfflineQueue: true,
        ...this.config,
      });

      this.client.on("error", (err) => {
        logger.error("Redis connection error", { error: err });
      });

      this.client.on("close", () => {
        logger.warn("Redis connection closed");
      });

      this.client.on("reconnecting", () => {
        logger.info("Redis reconnecting...");
      });

      await this.client.connect();
      logger.info(`Connected to Redis server successfully (${redisHost}:${redisPort})`);
    } catch (error) {
      logger.error("Failed to connect to Redis", { error });
      this.client = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  public getClient(): Redis {
    if (!this.client) {
      throw new Error("Redis client is not initialized. Call connect() first.");
    }
    return this.client;
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const client = this.getClient();
      const rawData = await client.get(key);
      if (!rawData) return null;
      return JSON.parse(rawData) as T;
    } catch (error) {
      logger.error(`Error retrieving key '${key}' from cache`, { error });
      return null;
    }
  }

  public async set<T>(
    key: string,
    value: T,
    options?: SetCacheOptions,
  ): Promise<boolean> {
    try {
      const client = this.getClient();
      const stringifiedValue = JSON.stringify(value);
      const ttl = options?.ttlSeconds ?? this.defaultTTLSeconds;

      if (ttl && ttl > 0) {
        const result = await client.set(key, stringifiedValue, "EX", ttl);
        return result === "OK";
      } else {
        const result = await client.set(key, stringifiedValue);
        return result === "OK";
      }
    } catch (error) {
      logger.error(`Error setting key '${key}' in cache`, { error });
      return false;
    }
  }

  public async del(keys: string | string[]): Promise<number> {
    try {
      const client = this.getClient();
      const keysToDelete = Array.isArray(keys) ? keys : [keys];
      if (keysToDelete.length === 0) return 0;
      return await client.del(...keysToDelete);
    } catch (error) {
      logger.error(`Error deleting keys from cache`, { keys, error });
      return 0;
    }
  }

  public async delByPattern(pattern: string): Promise<number> {
    try {
      const client = this.getClient();
      const prefix = this.config.keyPrefix || "";
      // If a keyPrefix is set in Redis client options, ioredis automatically adds it to keys,
      // but SCAN returns keys with prefix. We need to handle pattern scanning safely.
      let cursor = "0";
      let totalDeleted = 0;

      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          // If keyPrefix is active, strip prefix before calling del since del adds it back automatically
          const cleanedKeys = prefix
            ? keys.map((k) => (k.startsWith(prefix) ? k.slice(prefix.length) : k))
            : keys;
          const count = await client.del(...cleanedKeys);
          totalDeleted += count;
        }
      } while (cursor !== "0");

      return totalDeleted;
    } catch (error) {
      logger.error(`Error deleting keys by pattern '${pattern}'`, { error });
      return 0;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const count = await client.exists(key);
      return count > 0;
    } catch (error) {
      logger.error(`Error checking existence of key '${key}'`, { error });
      return false;
    }
  }

  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: SetCacheOptions,
  ): Promise<T> {
    const cachedValue = await this.get<T>(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    const freshValue = await factory();
    if (freshValue !== undefined && freshValue !== null) {
      await this.set<T>(key, freshValue, options);
    }
    return freshValue;
  }

  public async flushDb(): Promise<void> {
    try {
      const client = this.getClient();
      await client.flushdb();
      logger.info("Flushed Redis DB successfully");
    } catch (error) {
      logger.error("Error flushing Redis DB", { error });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (error) {
        logger.error("Error disconnecting Redis client", { error });
      } finally {
        this.client = null;
      }
    }
  }
}
