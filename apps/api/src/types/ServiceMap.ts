import { PrismaClient } from "@workspace/db";
import { CacheManager } from "@workspace/cache";
import { MessageBroker } from "@workspace/message-broker";

export interface ServiceMap {
  prisma: PrismaClient;
  redis: CacheManager;
  messageBroker: MessageBroker;
}
