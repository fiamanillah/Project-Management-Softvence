import { z } from "zod";
import { booleanString } from "./common";

export const storageSchema = z.object({
  S3_ENDPOINT: z.string().default("http://127.0.0.1:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().default("rustfsadmin"),
  S3_SECRET_ACCESS_KEY: z.string().default("rustfsadmin"),
  S3_PUBLIC_BUCKET: z.string().default("manage-project-public"),
  S3_PRIVATE_BUCKET: z.string().default("manage-project-private"),
  S3_FORCE_PATH_STYLE: booleanString.default(true),
  S3_SSL_ENABLED: booleanString.default(false),
  S3_PUBLIC_URL_PREFIX: z.string().optional(),
});

export type StorageEnv = z.infer<typeof storageSchema>;
