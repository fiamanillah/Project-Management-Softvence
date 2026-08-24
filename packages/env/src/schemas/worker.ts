import { z } from "zod";
import { nodeEnvSchema, logLevelSchema } from "./common";
import { databaseSchema } from "./database";
import { rabbitmqSchema } from "./rabbitmq";

export const workerEnvSchema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    LOG_LEVEL: logLevelSchema,
    LOG_FILE_PATH: z.string().default("logs/worker.log"),
  })
  .merge(databaseSchema)
  .merge(rabbitmqSchema);

export type WorkerEnv = z.infer<typeof workerEnvSchema>;
