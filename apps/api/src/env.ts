import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3030),
  REQUEST_TIMEOUT: z.coerce.number().default(30000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DB_LOGGING: z
    .preprocess((val) => val === "true" || val === true, z.boolean())
    .default(false),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  JWT_ISSUER: z.string().default("ignitor-app"),
  DEFAULT_ADMIN_EMAIL: z.string().email().optional(),
  DEFAULT_ADMIN_PASSWORD: z.string().optional(),
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
    .default("info"),
  LOG_FILE_PATH: z.string().default("logs/app.log"),
  RABBITMQ_URL: z.string().default("amqp://guest:guest@localhost:5672"),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_KEY_PREFIX: z.string().default("ignitor:"),
  REDIS_DEFAULT_TTL: z.coerce.number().default(3600),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables in apps/api:",
    JSON.stringify(parsed.error.format(), null, 2),
  );
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
