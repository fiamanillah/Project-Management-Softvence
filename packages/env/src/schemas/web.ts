import { z } from "zod";

export const webEnvSchema = z.object({
  VITE_API_URL: z.string().default("http://localhost:3030/api/v1"),
  MODE: z.string().optional(),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
