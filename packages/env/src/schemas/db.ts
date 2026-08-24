import { z } from "zod";
import { databaseSchema } from "./database";

export const dbEnvSchema = databaseSchema.pick({
  DATABASE_URL: true,
  DB_LOGGING: true,
  POSTGRES_USER: true,
  POSTGRES_PASSWORD: true,
  POSTGRES_DB: true,
  POSTGRES_PORT: true,
});

export type DbEnv = z.infer<typeof dbEnvSchema>;
