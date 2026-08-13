// src/core/audit/diffCalculator.ts

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "password_hash",
  "tokenhash",
  "token_hash",
  "rawrefreshtoken",
  "refreshtoken",
  "resettoken",
  "accesstoken",
  "secret",
  "authorization",
]);

/**
 * Recursively sanitize an object by stripping sensitive keys (e.g. passwords, tokens).
 */
export function sanitizePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizePayload(item)) as unknown as T;
  }

  if (obj instanceof Date) {
    return obj as unknown as T;
  }

  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      cleaned[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      cleaned[key] = sanitizePayload(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned as T;
}

export interface FieldDiff {
  before?: any;
  after?: any;
}

export type ObjectDiff = Record<string, FieldDiff>;

/**
 * Calculates differences between two states (`before` and `after`).
 * Returns an object where each modified key contains { before, after }.
 */
export function calculateDiff(before?: Record<string, any> | null, after?: Record<string, any> | null): ObjectDiff | null {
  if (!before && !after) return null;

  const cleanBefore = before ? sanitizePayload(before) : null;
  const cleanAfter = after ? sanitizePayload(after) : null;

  if (!cleanBefore && cleanAfter) {
    const diff: ObjectDiff = {};
    for (const [key, val] of Object.entries(cleanAfter)) {
      diff[key] = { before: undefined, after: val };
    }
    return diff;
  }

  if (cleanBefore && !cleanAfter) {
    const diff: ObjectDiff = {};
    for (const [key, val] of Object.entries(cleanBefore)) {
      diff[key] = { before: val, after: undefined };
    }
    return diff;
  }

  const diff: ObjectDiff = {};
  const allKeys = new Set([...Object.keys(cleanBefore || {}), ...Object.keys(cleanAfter || {})]);

  for (const key of allKeys) {
    const valBefore = (cleanBefore as any)[key];
    const valAfter = (cleanAfter as any)[key];

    // Ignore functions, internal metadata fields if needed
    if (key === "updatedAt" || key === "createdAt") continue;

    if (JSON.stringify(valBefore) !== JSON.stringify(valAfter)) {
      diff[key] = {
        before: valBefore,
        after: valAfter,
      };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}
