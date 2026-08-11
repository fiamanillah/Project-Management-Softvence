import type { RedisOptions } from "ioredis";

export interface CacheConfig extends RedisOptions {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  defaultTTLSeconds?: number;
}

export interface SetCacheOptions {
  /**
   * Time-to-live in seconds for the cached item.
   * If omitted or undefined, default TTL is used (if specified in CacheConfig).
   */
  ttlSeconds?: number;
}

export interface ICacheManager {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: SetCacheOptions): Promise<boolean>;
  del(key: string | string[]): Promise<number>;
  delByPattern(pattern: string): Promise<number>;
  exists(key: string): Promise<boolean>;
  getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: SetCacheOptions,
  ): Promise<T>;
  flushDb(): Promise<void>;
}
