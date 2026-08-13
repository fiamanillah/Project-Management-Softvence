// middleware/apiVersion.ts - API Version Resolution Middleware
import { Request, Response, NextFunction } from "express";

export const DEFAULT_API_VERSION = "v1";
export const SUPPORTED_API_VERSIONS = ["v1", "v2"];

/**
 * Middleware that extracts and normalizes the requested API version from
 * URL path prefix, custom HTTP header, Accept-Version header, or query parameters.
 */
export function apiVersionResolver(defaultVersion: string = DEFAULT_API_VERSION) {
  return (req: Request, res: Response, next: NextFunction) => {
    let resolvedVersion = defaultVersion;

    // 1. Resolve from URL path prefix (e.g. /api/v1/... or /api/v2/...)
    const urlMatch = req.originalUrl.match(/^\/api\/(v\d+)(\/|$)/i);
    if (urlMatch && urlMatch[1]) {
      resolvedVersion = urlMatch[1].toLowerCase();
    } else {
      // 2. Resolve from Header (X-API-Version or Accept-Version)
      const headerVersion =
        (req.headers["x-api-version"] as string) ||
        (req.headers["accept-version"] as string);

      if (headerVersion) {
        const cleanedHeader = headerVersion.trim().toLowerCase();
        resolvedVersion = cleanedHeader.startsWith("v")
          ? cleanedHeader
          : `v${cleanedHeader}`;
      } else {
        // 3. Resolve from Query Param (?apiVersion=v1 or ?v=1)
        const queryVersion =
          (req.query.apiVersion as string) || (req.query.v as string);
        if (queryVersion) {
          const cleanedQuery = queryVersion.trim().toLowerCase();
          resolvedVersion = cleanedQuery.startsWith("v")
            ? cleanedQuery
            : `v${cleanedQuery}`;
        }
      }
    }

    req.apiVersion = resolvedVersion;
    res.setHeader("X-API-Version", resolvedVersion);

    next();
  };
}
