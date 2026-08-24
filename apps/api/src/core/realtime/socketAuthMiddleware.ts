// src/core/realtime/socketAuthMiddleware.ts

import type { AuthenticatedSocket } from "./realtime.types";
import { verifyAccessToken } from "@/utils/crypto";
import { AppLogger } from "@/core/logging/logger";

const logger = new AppLogger("SocketAuthMiddleware");

/**
 * Socket.IO Handshake Authentication Middleware
 * Validates JWT access token from auth.token, headers.authorization, or handshake query.
 */
export function socketAuthMiddleware(
  socket: AuthenticatedSocket,
  next: (err?: Error) => void,
): void {
  try {
    let token: string | undefined = undefined;

    // 1. Auth payload (standard Socket.io v4 client auth)
    if (socket.handshake.auth && typeof socket.handshake.auth.token === "string") {
      token = socket.handshake.auth.token;
    }

    // 2. Authorization header fallback
    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7).trim();
      } else {
        token = authHeader.trim();
      }
    }

    // 3. SEC-04: Reject query string tokens to prevent token leakage in proxy/CDN access logs
    if (!token && socket.handshake.query?.token) {
      logger.warn(`Rejected insecure socket connection with query-string token: ${socket.id}`);
      return next(
        new Error(
          "Authentication error: Passing auth tokens in query parameters is disallowed. Use auth.token instead.",
        ),
      );
    }

    if (!token) {
      logger.warn(`Unauthenticated socket connection rejected: ${socket.id}`);
      return next(new Error("Authentication error: Access token required"));
    }

    // Remove any accidental 'Bearer ' prefix if passed inside token field
    if (token.startsWith("Bearer ")) {
      token = token.slice(7).trim();
    }

    const payload = verifyAccessToken(token);

    socket.data.user = {
      id: payload.sub,
      systemRole: payload.systemRole,
      roleId: payload.roleId || null,
      branchId: payload.branchId || null,
      designationId: payload.designationId || null,
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers["user-agent"],
    };

    socket.data.connectedAt = new Date();
    socket.data.sessionId = socket.id;
    socket.data.rooms = new Set<string>();

    logger.info(
      `✔ Authenticated socket connection: user=${payload.sub} (role=${payload.systemRole}, socketId=${socket.id})`,
    );

    next();
  } catch (error) {
    logger.warn(`Socket authentication failed for socketId=${socket.id}:`, {
      error: error instanceof Error ? error.message : String(error),
    });
    next(new Error("Authentication error: Invalid or expired token"));
  }
}
