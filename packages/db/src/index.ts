import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client/client.js";

export interface DbConfig {
  databaseUrl: string;
  isProduction?: boolean;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function createPrismaClient(config: DbConfig): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const adapter = new PrismaPg({ connectionString: config.databaseUrl });
  const client = new PrismaClient({ adapter });

  if (!config.isProduction) {
    globalForPrisma.prisma = client;
  }

  return client;
}

export * from "./generated/client/client.js";
export {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
} from "@prisma/client/runtime/client";

export * from "./mongo/audit-log.model";
export * from "./mongo/connection";

