import crypto from "crypto";
import { sanitizeFileName } from "./mimeHelper";

export interface KeyGenerationOptions {
  entityType?: string;
  entityId?: string;
  fileName?: string;
  isPublic?: boolean;
  prefix?: string;
}

export function generateStorageKey(options: KeyGenerationOptions = {}): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const uniqueId = crypto.randomUUID();

  const safeFileName = options.fileName
    ? sanitizeFileName(options.fileName)
    : `${uniqueId}.bin`;

  const parts: string[] = [];

  if (options.prefix) {
    parts.push(options.prefix.replace(/^\/+|\/+$/g, ""));
  }

  const category = options.isPublic ? "public" : "private";
  parts.push(category);

  if (options.entityType) {
    const cleanEntityType = options.entityType.toLowerCase().replace(/[^\w-]/g, "");
    parts.push(cleanEntityType);

    if (options.entityId) {
      const cleanEntityId = options.entityId.toLowerCase().replace(/[^\w-]/g, "");
      parts.push(cleanEntityId);
    }
  }

  parts.push(String(year), month, `${uniqueId}-${safeFileName}`);

  return parts.join("/");
}

export function normalizeKey(key: string): string {
  return key.replace(/^\/+/, "").replace(/\/+/g, "/");
}
