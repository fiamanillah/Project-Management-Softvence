// src/index.ts
import "@/env";
import { IgnitorApp } from "./core/IgnitorApp";
import { AppLogger } from "./core/logging/logger";
import { config } from "./core/config";

// Providers (Infrastructure)
import { PrismaProvider } from "./providers/PrismaProvider";
import { RedisProvider } from "./providers/RedisProvider";
import { MessageBrokerProvider } from "./providers/MessageBrokerProvider";
import { CacheManager } from "@workspace/cache";
import { prisma } from "./lib/prisma";
import { AuthModule } from "./Modules/Auth/AuthModule";
import { AuditLogModule } from "./Modules/AuditLog/AuditLogModule";
import { AdminModule } from "./Modules/Admin/AdminModule";

import { PermissionRegistry } from "./core/permissions/PermissionRegistry";

// Modules (Business Logic)

const logger = new AppLogger("Bootstrap");

async function bootstrap() {
  try {
    logger.info("🗹 Starting application bootstrap");

    // 1. Initialize the Ignitor Engine
    const app = new IgnitorApp();

    // 2. Register Infrastructure Providers
    logger.info("⚙ Registering infrastructure...");
    app.getContext().registerProvider("prisma", new PrismaProvider(prisma));
    
    const cacheManager = new CacheManager(config.redis);
    app.getContext().registerProvider("redis", new RedisProvider(cacheManager));
    app.getContext().registerProvider("messageBroker", new MessageBrokerProvider(config.rabbitmq.url));

    // 3. Register Application Modules
    logger.info("⚙ Registering modules...");
    app.registerModule(new AuthModule());
    app.registerModule(new AuditLogModule());
    app.registerModule(new AdminModule());
    logger.info("✔ All modules registered successfully");

    // 4. Permission Registry Sync Step
    logger.info("🔐 Syncing permission registry...");
    await PermissionRegistry.getInstance().sync(prisma);

    // 5. Spark the server!
    await app.spark(config.server.port);

    logger.info("✷ Ignitor sparked successfully");
  } catch (error) {
    // Centralized Bootstrap Error Handling
    logger.error("⬤ Failed to initialize application:", {
      error: error instanceof Error ? error : new Error(String(error)),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start the application
bootstrap().catch((err) => {
  logger.error("❌ Unhandled bootstrap error:", { error: err });
  process.exit(1);
});
