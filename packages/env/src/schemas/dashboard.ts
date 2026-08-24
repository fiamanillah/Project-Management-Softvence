import { z } from "zod";
import { nodeEnvSchema } from "./common";

export const dashboardEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema.optional(),
  PORT: z.coerce.number().default(3000),
  NEXT_PUBLIC_API_URL: z.string().default("http://localhost:3030/api/v1"),
  NEXT_PUBLIC_WS_URL: z.string().optional(),
});

export type DashboardEnv = z.infer<typeof dashboardEnvSchema>;
