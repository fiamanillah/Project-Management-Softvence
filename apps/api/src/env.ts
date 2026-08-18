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
  MONGO_URI: z
    .string()
    .default(
      "mongodb://root:rootpassword@localhost:27017/audit_db?authSource=admin",
    ),
  DB_LOGGING: z

    .preprocess((val) => val === "true" || val === true, z.boolean())
    .default(false),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
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
  DEFAULT_ADMIN_EMAIL: z.string().email().optional(),
  DEFAULT_ADMIN_PASSWORD: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
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
  S3_ENDPOINT: z.string().default("http://127.0.0.1:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().default("rustfsadmin"),
  S3_SECRET_ACCESS_KEY: z.string().default("rustfsadmin"),
  S3_PUBLIC_BUCKET: z.string().default("manage-project-public"),
  S3_PRIVATE_BUCKET: z.string().default("manage-project-private"),
  S3_FORCE_PATH_STYLE: z
    .preprocess((val) => val === "true" || val === true || val === "1" || val === 1, z.boolean())
    .default(true),
  S3_SSL_ENABLED: z
    .preprocess((val) => val === "true" || val === true, z.boolean())
    .default(false),
  S3_PUBLIC_URL_PREFIX: z.string().optional(),
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
