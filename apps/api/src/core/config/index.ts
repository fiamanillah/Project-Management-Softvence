import { env } from "@/env";
import { AppLogger } from "@workspace/logger";

// Configure shared logger with validated env
AppLogger.configure({
  isProduction: env.NODE_ENV === "production",
  logFilePath: env.LOG_FILE_PATH,
  logLevel: env.LOG_LEVEL,
});

export const config = {
  server: {
    port: env.PORT,
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === "production",
    isDevelopment: env.NODE_ENV === "development",
    isTest: env.NODE_ENV === "test",
    requestTimeout: env.REQUEST_TIMEOUT,
  },
  database: {
    url: env.DATABASE_URL,
    logging: env.DB_LOGGING,
  },
  security: {
    cors: {
      allowedOrigins: env.ALLOWED_ORIGINS,
    },
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
    },
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
      issuer: env.JWT_ISSUER,
    },
  },
  defaultAdmin: {
    email: env.DEFAULT_ADMIN_EMAIL,
    password: env.DEFAULT_ADMIN_PASSWORD,
  },
  logging: {
    level: env.LOG_LEVEL,
    path: env.LOG_FILE_PATH,
  },
  rabbitmq: {
    url: env.RABBITMQ_URL,
  },
};

export default config;
