// middleware/requestId.ts - Proper request ID middleware
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function requestId() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any)._startTime) {
      (req as any)._startTime = Date.now();
    }

    // Check if request ID already exists (maybe from load balancer)
    const existingId =
      req.headers["x-request-id"] || req.headers["x-correlation-id"];

    const id = typeof existingId === "string" ? existingId : crypto.randomUUID();
    (req as any).id = id;
    req.headers["x-request-id"] = id;

    // Add request ID to response headers for debugging
    res.setHeader("x-request-id", id);

    next();
  };
}
