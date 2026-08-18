import { z } from "zod";
import type { StorageConfig } from "../types";
import { InvalidStorageConfigError } from "../errors/StorageErrors";

export const storageConfigSchema = z.object({
  endpoint: z.string().url().optional(),
  region: z.string().default("us-east-1"),
  credentials: z
    .object({
      accessKeyId: z.string().min(1, "Access Key ID must not be empty"),
      secretAccessKey: z.string().min(1, "Secret Access Key must not be empty"),
      sessionToken: z.string().optional(),
    })
    .optional(),
  forcePathStyle: z.boolean().default(true),
  sslEnabled: z.boolean().default(false),
  publicBucket: z.string().default("manage-project-public"),
  privateBucket: z.string().default("manage-project-private"),
  publicUrlPrefix: z.string().optional(),
  maxFileSize: z.number().positive().default(50 * 1024 * 1024), // 50MB default
  retryCount: z.number().int().min(0).default(3),
  retryDelayMs: z.number().int().min(50).default(500),
  requestTimeoutMs: z.number().int().min(1000).default(30000),
});

export type ValidatedStorageConfig = z.infer<typeof storageConfigSchema>;

export function validateStorageConfig(config: StorageConfig = {}): ValidatedStorageConfig {
  const result = storageConfigSchema.safeParse(config);
  if (!result.success) {
    throw new InvalidStorageConfigError(
      `Invalid storage configuration: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`,
      result.error.format(),
    );
  }
  return result.data;
}
