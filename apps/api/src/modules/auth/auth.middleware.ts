import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "@/core/config";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined = req.cookies?.access_token;

  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  }

  try {
    const payload = jwt.verify(token, config.security.jwt.secret) as { sub?: string };

    if (!payload || typeof payload.sub !== "string") {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid token payload",
        },
      });
    }

    req.user = { id: payload.sub };
    return next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: err.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
      },
    });
  }
}
