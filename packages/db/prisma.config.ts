import { defineConfig } from "prisma/config";
import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

// Load environment variables for Prisma CLI operations (migrations, studio, push)
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../apps/api/.env") });

const cliEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required for Prisma CLI commands"),
});

const parsed = cliEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables for Prisma CLI:",
    JSON.stringify(parsed.error.format(), null, 2),
  );
  process.exit(1);
}

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: parsed.data.DATABASE_URL,
  },
});
