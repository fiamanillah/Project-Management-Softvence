// src/core/permissions/PermissionRegistry.ts

import fs from "fs";
import path from "path";
import { type PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { prisma as defaultPrisma } from "@/lib/prisma";
import {
  PermissionManifestItem,
  PermissionSyncDiff,
  PermissionSyncResult,
} from "./permission.types";

export class PermissionRegistry {
  private static instance: PermissionRegistry;
  private logger = new AppLogger("PermissionRegistry");
  private registeredManifests: PermissionManifestItem[] = [];

  private constructor() {}

  public static getInstance(): PermissionRegistry {
    if (!PermissionRegistry.instance) {
      PermissionRegistry.instance = new PermissionRegistry();
    }
    return PermissionRegistry.instance;
  }

  /**
   * Manually register an array of permission items
   */
  public registerManifest(items: PermissionManifestItem[]): void {
    for (const item of items) {
      if (item && item.code && item.module) {
        this.registeredManifests.push(item);
      }
    }
  }

  /**
   * Scan directory recursively to discover and dynamically import permission manifest files
   * e.g. permissions.manifest.ts
   */
  public async discoverManifests(
    modulesDir: string = path.resolve(__dirname, "../../Modules"),
  ): Promise<PermissionManifestItem[]> {
    const discoveredItems: PermissionManifestItem[] = [];

    if (!fs.existsSync(modulesDir)) {
      this.logger.warn(`Modules directory not found at: ${modulesDir}`);
      return discoveredItems;
    }

    const findManifestFiles = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(findManifestFiles(filePath));
        } else if (
          file.endsWith(".manifest.ts") ||
          file.endsWith(".manifest.js") ||
          file.endsWith("permissions.ts")
        ) {
          results.push(filePath);
        }
      }
      return results;
    };

    const manifestFiles = findManifestFiles(modulesDir);
    this.logger.info(`Discovered ${manifestFiles.length} manifest file(s)`);

    for (const filePath of manifestFiles) {
      try {
        const fileUrl = path.isAbsolute(filePath)
          ? filePath
          : path.resolve(filePath);
        const moduleExports = await import(fileUrl);

        for (const exportKey of Object.keys(moduleExports)) {
          const exportValue = moduleExports[exportKey];
          if (Array.isArray(exportValue)) {
            for (const item of exportValue) {
              if (
                item &&
                typeof item === "object" &&
                typeof item.code === "string" &&
                typeof item.module === "string"
              ) {
                discoveredItems.push({
                  code: item.code,
                  module: item.module,
                  description: item.description || undefined,
                  supportedScopes: item.supportedScopes
                    ? Array.from(item.supportedScopes)
                    : undefined,
                  implies: item.implies ? Array.from(item.implies) : undefined,
                  dependsOn: item.dependsOn ? Array.from(item.dependsOn) : undefined,
                });
              }
            }
          }
        }
      } catch (err) {
        this.logger.error(`Failed to import manifest file: ${filePath}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return discoveredItems;
  }

  /**
   * Collect all permissions from discovery and explicit registrations
   */
  public async collectAllPermissions(
    modulesDir?: string,
  ): Promise<PermissionManifestItem[]> {
    const discovered = await this.discoverManifests(modulesDir);
    const combined = [...this.registeredManifests, ...discovered];

    // Deduplicate by code (last declared wins, but warn on conflicts if modules differ)
    const map = new Map<string, PermissionManifestItem>();
    for (const item of combined) {
      if (map.has(item.code)) {
        const existing = map.get(item.code)!;
        if (existing.module !== item.module) {
          this.logger.warn(
            `Permission code collision for '${item.code}': '${existing.module}' vs '${item.module}'`,
          );
        }
      }
      map.set(item.code, item);
    }

    return Array.from(map.values());
  }

  /**
   * Get list of permission codes that imply the target code (e.g. project.edit implies project.view)
   */
  public async getImpliedByCodes(
    targetCode: string,
    modulesDir?: string,
  ): Promise<string[]> {
    const all = await this.collectAllPermissions(modulesDir);
    const impliedBy: string[] = [];

    for (const item of all) {
      if (item.implies && item.implies.includes(targetCode)) {
        impliedBy.push(item.code);
      }
    }

    return impliedBy;
  }

  /**
   * Get full transitive closure of prerequisite permissions (implies + dependsOn) required by a code
   */
  public async getPrerequisiteCodes(
    code: string,
    modulesDir?: string,
  ): Promise<string[]> {
    const all = await this.collectAllPermissions(modulesDir);
    const map = new Map<string, PermissionManifestItem>();
    for (const p of all) {
      map.set(p.code, p);
    }

    const visited = new Set<string>();
    const queue = [code];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const item = map.get(curr);
      if (!item) continue;

      const directPrereqs = [
        ...(item.implies ? Array.from(item.implies) : []),
        ...(item.dependsOn ? Array.from(item.dependsOn) : []),
      ];

      for (const p of directPrereqs) {
        if (!visited.has(p) && p !== code) {
          visited.add(p);
          queue.push(p);
        }
      }
    }

    return Array.from(visited);
  }

  /**
   * Execute permission sync against database
   */
  public async sync(
    prismaClient: PrismaClient = defaultPrisma,
    modulesDir?: string,
  ): Promise<PermissionSyncResult> {
    this.logger.info("Starting permission sync process...");

    const declaredPermissions = await this.collectAllPermissions(modulesDir);
    const declaredMap = new Map<string, PermissionManifestItem>();
    for (const p of declaredPermissions) {
      declaredMap.set(p.code, p);
    }

    // Fetch existing permissions in DB
    const existingPermissions = await prismaClient.permission.findMany();
    const existingMap = new Map<string, (typeof existingPermissions)[0]>();
    for (const ep of existingPermissions) {
      existingMap.set(ep.code, ep);
    }

    const toInsert: PermissionManifestItem[] = [];
    const toUpdate: PermissionManifestItem[] = [];
    let unchangedCount = 0;

    // Check declared against DB
    for (const [code, declared] of declaredMap.entries()) {
      const existing = existingMap.get(code);
      if (!existing) {
        toInsert.push(declared);
      } else {
        const declaredScopes = declared.supportedScopes
          ? Array.from(declared.supportedScopes)
          : [];
        const existingScopes = existing.supportedScopes || [];
        const scopesChanged =
          JSON.stringify([...declaredScopes].sort()) !==
          JSON.stringify([...existingScopes].sort());

        const declaredImplies = declared.implies
          ? Array.from(declared.implies)
          : [];
        const existingImplies = existing.implies || [];
        const impliesChanged =
          JSON.stringify([...declaredImplies].sort()) !==
          JSON.stringify([...existingImplies].sort());

        const declaredDependsOn = declared.dependsOn
          ? Array.from(declared.dependsOn)
          : [];
        const existingDependsOn = existing.dependsOn || [];
        const dependsOnChanged =
          JSON.stringify([...declaredDependsOn].sort()) !==
          JSON.stringify([...existingDependsOn].sort());

        const needsUpdate =
          existing.description !== (declared.description || null) ||
          existing.module !== declared.module ||
          existing.isActive !== true ||
          existing.deprecatedAt !== null ||
          scopesChanged ||
          impliesChanged ||
          dependsOnChanged;

        if (needsUpdate) {
          toUpdate.push(declared);
        } else {
          unchangedCount++;
        }
      }
    }

    // Check DB permissions missing from declared (mark as inactive/deprecated)
    const toDeprecate: { code: string; module: string | null; description: string | null }[] = [];
    for (const [code, existing] of existingMap.entries()) {
      if (!declaredMap.has(code) && existing.isActive) {
        toDeprecate.push({
          code: existing.code,
          module: existing.module,
          description: existing.description,
        });
      }
    }

    // Perform Database Operations
    for (const item of toInsert) {
      await prismaClient.permission.create({
        data: {
          code: item.code,
          module: item.module,
          description: item.description || null,
          supportedScopes: item.supportedScopes ? Array.from(item.supportedScopes) : [],
          implies: item.implies ? Array.from(item.implies) : [],
          dependsOn: item.dependsOn ? Array.from(item.dependsOn) : [],
          isActive: true,
          deprecatedAt: null,
        },
      });
    }

    for (const item of toUpdate) {
      await prismaClient.permission.update({
        where: { code: item.code },
        data: {
          module: item.module,
          description: item.description || null,
          supportedScopes: item.supportedScopes ? Array.from(item.supportedScopes) : [],
          implies: item.implies ? Array.from(item.implies) : [],
          dependsOn: item.dependsOn ? Array.from(item.dependsOn) : [],
          isActive: true,
          deprecatedAt: null,
        },
      });
    }

    for (const item of toDeprecate) {
      await prismaClient.permission.update({
        where: { code: item.code },
        data: {
          isActive: false,
          deprecatedAt: new Date(),
        },
      });
    }

    const diff: PermissionSyncDiff = {
      inserted: toInsert,
      updated: toUpdate,
      deprecated: toDeprecate,
      unchanged: unchangedCount,
    };

    const result: PermissionSyncResult = {
      totalDeclared: declaredPermissions.length,
      insertedCount: toInsert.length,
      updatedCount: toUpdate.length,
      deprecatedCount: toDeprecate.length,
      unchangedCount,
      diff,
    };

    // Log diff metrics
    this.logger.info(
      `Permission sync completed: +${toInsert.length} new, ~${toUpdate.length} changed, -${toDeprecate.length} deprecated (total declared: ${declaredPermissions.length})`,
    );

    if (toInsert.length > 0) {
      this.logger.info(`+ Added permissions: ${toInsert.map((i) => i.code).join(", ")}`);
    }
    if (toUpdate.length > 0) {
      this.logger.info(`~ Updated permissions: ${toUpdate.map((u) => u.code).join(", ")}`);
    }
    if (toDeprecate.length > 0) {
      this.logger.info(`- Deprecated permissions: ${toDeprecate.map((d) => d.code).join(", ")}`);
    }

    return result;
  }
}
