import { env } from "./env";
import { messageBroker } from "@workspace/message-broker";
import { prisma } from "./lib/prisma";
import { AppLogger } from "@workspace/logger";
import { registerConsumers } from "./consumers";

AppLogger.configure({
  isProduction: env.NODE_ENV === "production",
  logFilePath: env.LOG_FILE_PATH,
  logLevel: env.LOG_LEVEL,
});

const logger = new AppLogger("WorkerDaemon");

async function bootstrap() {
  logger.info("⚙ Starting Worker Microservice Daemon...");

  try {
    logger.info("Connecting to database...");
    await prisma.$connect();
    logger.info("Database connection established.");

    logger.info("Connecting to RabbitMQ...");
    const channel = await messageBroker.connect(env.RABBITMQ_URL);

    await registerConsumers(channel);

    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Initiating graceful shutdown...`);
      try {
        await messageBroker.close();
        await prisma.$disconnect();
        logger.info("Clean shutdown complete.");
        process.exit(0);
      } catch (err) {
        logger.error("Shutdown error", { error: err });
        process.exit(1);
      }
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  } catch (error) {
    logger.error("Fatal bootstrap error", { error });
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  logger.error("Unhandled bootstrap error", { error: err });
  process.exit(1);
});
