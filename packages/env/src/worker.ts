import { loadEnv } from "./loader";
import { workerEnvSchema, type WorkerEnv } from "./schemas/worker";

loadEnv();

const parsed = workerEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ [Invalid Environment] apps/worker failed to start due to invalid or missing environment variables:\n",
    JSON.stringify(parsed.error.format(), null, 2),
  );
  if (process.env.NODE_ENV !== "test") {
    process.exit(1);
  }
}

export const env: WorkerEnv = parsed.success
  ? parsed.data
  : (workerEnvSchema.parse({}) as WorkerEnv);

export { workerEnvSchema, type WorkerEnv };
