import { Request, Response, NextFunction } from "express";
import { AuthenticationError } from "@/core/errors/AppError";
import { verifyAccessToken, JWTCustomPayload } from "@/utils/crypto";

declare global {
  namespace Express {
    interface Request {
      user?: JWTCustomPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AuthenticationError("Authentication required: Bearer token missing"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return next(new AuthenticationError("Unauthorized: Invalid or expired access token"));
  }
}
