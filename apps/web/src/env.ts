import { parseWebEnv, webEnvSchema, type WebEnv } from "@workspace/env/web";

export const env: WebEnv = parseWebEnv({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  MODE: import.meta.env.MODE,
});

export { webEnvSchema as envSchema, type WebEnv as Env };
