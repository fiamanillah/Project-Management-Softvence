import { z } from "zod";

export const metaSchema = z.object({
  requestId: z.string().optional(),
  timestamp: z.string(),
  path: z.string().optional(),
  method: z.string().optional(),
  version: z.string().optional(),
});

export type ApiMeta = z.infer<typeof metaSchema>;

export const errorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  rule: z.string().optional(),
});

export type ErrorDetail = z.infer<typeof errorDetailSchema>;

export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  code: z.string(),
  statusCode: z.number(),
  meta: metaSchema,
  errors: z.array(errorDetailSchema).optional(),
  details: z.unknown().optional(),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    message: z.string().optional(),
    statusCode: z.number(),
    meta: metaSchema,
    data: dataSchema,
  });
}

export type ApiResponse<T> = {
  success: true;
  message?: string;
  statusCode: number;
  meta: ApiMeta;
  data: T;
};
