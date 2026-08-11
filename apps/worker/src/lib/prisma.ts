import { createPrismaClient, type PrismaClient } from "@workspace/db";
import { env } from "../env";

export const prisma: PrismaClient = createPrismaClient({
  databaseUrl: env.DATABASE_URL,
  isProduction: env.NODE_ENV === "production",
});

export { type PrismaClient, type NotificationType } from "@workspace/db";
