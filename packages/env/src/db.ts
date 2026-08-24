import { loadEnv } from "./loader";
import { dbEnvSchema, type DbEnv } from "./schemas/db";

loadEnv();

const parsed = dbEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ [Invalid Environment] packages/db failed due to missing required database variables:\n",
    JSON.stringify(parsed.error.format(), null, 2),
  );
  if (process.env.NODE_ENV !== "test") {
    process.exit(1);
  }
}

export const env: DbEnv = parsed.success
  ? parsed.data
  : (dbEnvSchema.parse({
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgresql://fiamanillah:fiamanillah@localhost:5439/manage_project?schema=public",
    }) as DbEnv);

export { dbEnvSchema, type DbEnv };
