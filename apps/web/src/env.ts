import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse({
  VITE_API_URL: import.meta.env.VITE_API_URL,
});

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables in apps/web:",
    JSON.stringify(parsed.error.format(), null, 2),
  );
  throw new Error("Invalid environment variables in apps/web");
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
