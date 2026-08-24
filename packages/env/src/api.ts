import { loadEnv } from "./loader";
import { apiEnvSchema, type ApiEnv } from "./schemas/api";

loadEnv();

const parsed = apiEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ [Invalid Environment] apps/api failed to start due to invalid or missing environment variables:\n",
    JSON.stringify(parsed.error.format(), null, 2),
  );
  if (process.env.NODE_ENV !== "test") {
    process.exit(1);
  }
}

export const env: ApiEnv = parsed.success
  ? parsed.data
  : (apiEnvSchema.parse({}) as ApiEnv);

export { apiEnvSchema, type ApiEnv };
