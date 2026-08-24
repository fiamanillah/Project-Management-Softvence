import { dashboardEnvSchema, type DashboardEnv } from "./schemas/dashboard";

const parsed = dashboardEnvSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
});

if (!parsed.success && typeof window !== "undefined") {
  console.warn(
    "⚠️ [Environment Warning] apps/dashboard client environment validation warning:\n",
    JSON.stringify(parsed.error.format(), null, 2),
  );
}

export const env: DashboardEnv = parsed.success
  ? parsed.data
  : (dashboardEnvSchema.parse({}) as DashboardEnv);

export { dashboardEnvSchema, type DashboardEnv };
