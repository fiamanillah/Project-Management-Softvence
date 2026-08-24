import { defineConfig } from "prisma/config";
import { env } from "@workspace/env/db";

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env.DATABASE_URL,
  },
});
