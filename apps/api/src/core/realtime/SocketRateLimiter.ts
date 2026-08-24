// src/core/realtime/SocketRateLimiter.ts

import type Redis from "ioredis";
import { AppLogger } from "@/core/logging/logger";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export class SocketRateLimiter {
  private static instance: SocketRateLimiter;
  private logger = new AppLogger("SocketRateLimiter");
  private redisClient: Redis | null = null;
  private memoryBuckets = new Map<string, { count: number; resetAt: number }>();

  private constructor() {
    // Cleanup memory buckets every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, val] of this.memoryBuckets.entries()) {
        if (now > val.resetAt) {
          this.memoryBuckets.delete(key);
        }
      }
    }, 60000).unref();
  }

  public static getInstance(): SocketRateLimiter {
    if (!SocketRateLimiter.instance) {
      SocketRateLimiter.instance = new SocketRateLimiter();
    }
    return SocketRateLimiter.instance;
  }

  public setRedisClient(client: Redis): void {
    this.redisClient = client;
    this.logger.info("SocketRateLimiter configured with Redis client");
  }

  /**
   * Evaluates if an action by an identifier is within the rate limit.
   * @param key Unique rate limit key (e.g. `ratelimit:socket:${userId}:chat_send`)
   * @param maxHits Maximum allowed actions in the window
   * @param windowSeconds Window length in seconds
   */
  public async consume(
    key: string,
    maxHits: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    // 1. Redis-based sliding window / atomic counter
    if (this.redisClient) {
      try {
        const fullKey = `ratelimit:ws:${key}`;
        const currentHits = await this.redisClient.incr(fullKey);

        if (currentHits === 1) {
          await this.redisClient.expire(fullKey, windowSeconds);
        }

        if (currentHits > maxHits) {
          const ttl = await this.redisClient.ttl(fullKey);
          return {
            allowed: false,
            remaining: 0,
            retryAfterMs: Math.max(100, ttl * 1000),
          };
        }

        return {
          allowed: true,
          remaining: Math.max(0, maxHits - currentHits),
        };
      } catch (redisError) {
        this.logger.warn(`Redis rate limiter error for key '${key}', falling back to in-memory:`, {
          error: redisError instanceof Error ? redisError.message : String(redisError),
        });
      }
    }

    // 2. In-Memory fallback
    let bucket = this.memoryBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 1, resetAt: now + windowMs };
      this.memoryBuckets.set(key, bucket);
      return { allowed: true, remaining: maxHits - 1 };
    }

    bucket.count += 1;
    if (bucket.count > maxHits) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(100, bucket.resetAt - now),
      };
    }

    return {
      allowed: true,
      remaining: maxHits - bucket.count,
    };
  }
}
