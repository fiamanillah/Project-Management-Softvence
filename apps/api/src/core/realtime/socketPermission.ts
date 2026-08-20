// src/core/realtime/socketPermission.ts

import type { AuthenticatedSocket } from "./realtime.types";
import { AuthorizationEngine } from "@/core/authorization/AuthorizationEngine";
import type { AuthorizationResourceContext } from "@/core/authorization/authorization.types";
import { AppLogger } from "@/core/logging/logger";

const logger = new AppLogger("SocketPermission");

/**
 * Validates whether the authenticated socket user possesses the required permission.
 * Strictly routes through AuthorizationEngine.getInstance().can() (Rule BE-1).
 */
export async function canSocket(
  socket: AuthenticatedSocket,
  permissionCode: string,
  resourceContext?: AuthorizationResourceContext,
): Promise<boolean> {
  const user = socket.data.user;
  if (!user || !user.id) {
    logger.warn(`Unauthorized socket evaluation: missing socket.data.user on socketId=${socket.id}`);
    return false;
  }

  try {
    return await AuthorizationEngine.getInstance().can(user, permissionCode, resourceContext);
  } catch (error) {
    logger.error(`Error evaluating permission '${permissionCode}' for socket user ${user.id}:`, {
      error,
    });
    return false;
  }
}
