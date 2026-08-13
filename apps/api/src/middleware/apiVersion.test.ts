import { describe, it, expect } from "bun:test";
import { apiVersionResolver, DEFAULT_API_VERSION } from "./apiVersion";
import type { Request, Response } from "express";

describe("apiVersionResolver Middleware", () => {
  it("should extract API version from URL path prefix /api/v1/...", () => {
    const req: any = {
      originalUrl: "/api/v1/users",
      headers: {},
      query: {},
    };
    const res: any = {
      setHeader: (key: string, val: string) => {
        res[key] = val;
      },
    };

    let nextCalled = false;
    apiVersionResolver()(req as Request, res as Response, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(req.apiVersion).toBe("v1");
    expect(res["X-API-Version"]).toBe("v1");
  });

  it("should extract API version from URL path prefix /api/v2/...", () => {
    const req: any = {
      originalUrl: "/api/v2/users",
      headers: {},
      query: {},
    };
    const res: any = {
      setHeader: (key: string, val: string) => {
        res[key] = val;
      },
    };

    apiVersionResolver()(req as Request, res as Response, () => {});

    expect(req.apiVersion).toBe("v2");
    expect(res["X-API-Version"]).toBe("v2");
  });

  it("should extract API version from X-API-Version header when URL is unversioned", () => {
    const req: any = {
      originalUrl: "/users",
      headers: {
        "x-api-version": "v2",
      },
      query: {},
    };
    const res: any = {
      setHeader: (key: string, val: string) => {
        res[key] = val;
      },
    };

    apiVersionResolver()(req as Request, res as Response, () => {});

    expect(req.apiVersion).toBe("v2");
    expect(res["X-API-Version"]).toBe("v2");
  });

  it("should fallback to default version (v1) when no version specified", () => {
    const req: any = {
      originalUrl: "/users",
      headers: {},
      query: {},
    };
    const res: any = {
      setHeader: (key: string, val: string) => {
        res[key] = val;
      },
    };

    apiVersionResolver()(req as Request, res as Response, () => {});

    expect(req.apiVersion).toBe(DEFAULT_API_VERSION);
    expect(res["X-API-Version"]).toBe(DEFAULT_API_VERSION);
  });
});
