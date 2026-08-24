import { z } from "zod";
import { booleanString } from "./common";

export const databaseSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DB_LOGGING: booleanString.default(false),
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_DB: z.string().optional(),
  POSTGRES_PORT: z.coerce.number().optional(),
  MONGO_URI: z
    .string()
    .default(
      "mongodb://root:rootpassword@localhost:27017/audit_db?authSource=admin",
    ),
});

export type DatabaseEnv = z.infer<typeof databaseSchema>;
