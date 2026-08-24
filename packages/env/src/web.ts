import { webEnvSchema, type WebEnv } from "./schemas/web";

export function parseWebEnv(raw: Record<string, unknown> = {}): WebEnv {
  const parsed = webEnvSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      "❌ [Invalid Environment] apps/web environment validation failed:\n",
      JSON.stringify(parsed.error.format(), null, 2),
    );
    throw new Error("Invalid environment variables in apps/web");
  }
  return parsed.data;
}

export { webEnvSchema, type WebEnv };
