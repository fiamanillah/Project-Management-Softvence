// src/Modules/Permissions/permissions.service.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";

export class PermissionsService {
  private logger = new AppLogger("PermissionsService");

  constructor(private readonly prisma: PrismaClient) {}

  public async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [{ module: "asc" }, { code: "asc" }],
    });
    return permissions;
  }

  public async getScopeTypes() {
    const scopeTypes = await this.prisma.permissionScopeType.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
    return scopeTypes;
  }
}
