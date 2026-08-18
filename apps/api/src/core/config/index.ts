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
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
    keyPrefix: env.REDIS_KEY_PREFIX,
    defaultTTLSeconds: env.REDIS_DEFAULT_TTL,
  },
  storage: {
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    publicBucket: env.S3_PUBLIC_BUCKET,
    privateBucket: env.S3_PRIVATE_BUCKET,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    sslEnabled: env.S3_SSL_ENABLED,
    publicUrlPrefix: env.S3_PUBLIC_URL_PREFIX,
  },
};


export default config;
