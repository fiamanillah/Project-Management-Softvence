import { z } from "zod";
import { nodeEnvSchema, logLevelSchema } from "./common";
import { databaseSchema } from "./database";
import { redisSchema } from "./redis";
import { rabbitmqSchema } from "./rabbitmq";
import { storageSchema } from "./storage";
import { authSchema } from "./auth";
import { adminSchema } from "./admin";

export const apiEnvSchema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    PORT: z.coerce.number().default(3030),
    REQUEST_TIMEOUT: z.coerce.number().default(30000),
    ALLOWED_ORIGINS: z
      .string()
      .default("http://localhost:3000,http://localhost:5173,http://localhost:3001"),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
    RATE_LIMIT_MAX: z.coerce.number().default(100),
    LOG_LEVEL: logLevelSchema,
    LOG_FILE_PATH: z.string().default("logs/app.log"),
  })
  .merge(databaseSchema)
  .merge(redisSchema)
  .merge(rabbitmqSchema)
  .merge(storageSchema)
  .merge(authSchema)
  .merge(adminSchema);

export type ApiEnv = z.infer<typeof apiEnvSchema>;
