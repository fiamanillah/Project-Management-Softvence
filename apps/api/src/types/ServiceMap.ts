import { PrismaClient } from "@workspace/db";
import { CacheManager } from "@workspace/cache";
import { MessageBroker } from "@workspace/message-broker";
import { StorageManager } from "@workspace/storage";

export interface ServiceMap {
  prisma: PrismaClient;
  redis: CacheManager;
  cache?: CacheManager;
  messageBroker: MessageBroker;
  storage: StorageManager;
}

