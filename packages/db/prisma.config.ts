import { defineConfig } from "prisma/config";
import dotenv from "dotenv";
import path from "node:path";

// Load environment variables from local .env or fallback to apps/api/.env
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../apps/api/.env") });

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
