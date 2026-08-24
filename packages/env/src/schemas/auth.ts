import { z } from "zod";

export const authSchema = z.object({
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().default(30),
  JWT_ISSUER: z.string().default("ignitor-app"),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  ARGON_MEMORY_COST: z.coerce.number().default(65536),
  ARGON_TIME_COST: z.coerce.number().default(3),
  ARGON_PARALLELISM: z.coerce.number().default(4),
});

export type AuthEnv = z.infer<typeof authSchema>;
