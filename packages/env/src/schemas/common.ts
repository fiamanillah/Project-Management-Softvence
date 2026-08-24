import { z } from "zod";

export const nodeEnvSchema = z
  .enum(["development", "production", "test"])
  .default("development");

export const logLevelSchema = z
  .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
  .default("info");

export const booleanString = z
  .preprocess((val) => {
    if (typeof val === "boolean") return val;
    if (typeof val === "string") {
      const lower = val.toLowerCase().trim();
      return lower === "true" || lower === "1" || lower === "yes";
    }
    if (typeof val === "number") return val === 1;
    return false;
  }, z.boolean());
