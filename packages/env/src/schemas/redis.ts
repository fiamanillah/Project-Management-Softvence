import { z } from "zod";

export const redisSchema = z.object({
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_KEY_PREFIX: z.string().default("ignitor:"),
  REDIS_DEFAULT_TTL: z.coerce.number().default(3600),
});

export type RedisEnv = z.infer<typeof redisSchema>;
