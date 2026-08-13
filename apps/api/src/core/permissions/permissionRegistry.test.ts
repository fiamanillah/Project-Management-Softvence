import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { PermissionRegistry } from "./PermissionRegistry";
import { prisma } from "@/lib/prisma";

describe("PermissionRegistry", () => {
  beforeEach(async () => {
    // Clean up permissions table before test runs
    await prisma.permission.deleteMany({});
  });

  afterAll(async () => {
    // Clean up permissions table after test runs
    await prisma.permission.deleteMany({});
  });

  it("should discover permission manifests from module directory", async () => {
    const registry = PermissionRegistry.getInstance();
    const manifestItems = await registry.collectAllPermissions();

    expect(manifestItems.length).toBeGreaterThan(0);
    const codes = manifestItems.map((p) => p.code);
    expect(codes).toContain("auth.user.view");
    expect(codes).toContain("project.view");
    expect(codes).toContain("bd_order.view");
  });

  it("should sync permissions and insert new records into DB (+N inserted)", async () => {
    const registry = PermissionRegistry.getInstance();
    const result = await registry.sync(prisma);

    expect(result.insertedCount).toBeGreaterThan(0);
    expect(result.updatedCount).toBe(0);
    expect(result.deprecatedCount).toBe(0);

    const dbPermissions = await prisma.permission.findMany();
    expect(dbPermissions.length).toBe(result.totalDeclared);

    const projectView = dbPermissions.find((p) => p.code === "project.view");
    expect(projectView).toBeDefined();
    expect(projectView?.module).toBe("Projects");
    expect(projectView?.isActive).toBe(true);
    expect(projectView?.deprecatedAt).toBeNull();
  });

  it("should be idempotent when running sync consecutive times", async () => {
    const registry = PermissionRegistry.getInstance();
    await registry.sync(prisma);

    // Second sync run
    const result2 = await registry.sync(prisma);
    expect(result2.insertedCount).toBe(0);
    expect(result2.updatedCount).toBe(0);
    expect(result2.deprecatedCount).toBe(0);
    expect(result2.unchangedCount).toBe(result2.totalDeclared);
  });

  it("should update permissions when description or module changes (~M updated)", async () => {
    const registry = PermissionRegistry.getInstance();
    await registry.sync(prisma);

    // Manually modify description of project.view in DB
    await prisma.permission.update({
      where: { code: "project.view" },
      data: { description: "Old description" },
    });

    const result = await registry.sync(prisma);
    expect(result.updatedCount).toBe(1);
    expect(result.diff.updated[0].code).toBe("project.view");

    const updated = await prisma.permission.findUnique({
      where: { code: "project.view" },
    });
    expect(updated?.description).toBe("View project details");
  });

  it("should soft-deprecate permissions missing from manifests (-K deprecated)", async () => {
    // Manually create an orphaned permission in DB
    await prisma.permission.create({
      data: {
        code: "legacy.retired_permission",
        module: "LegacyModule",
        description: "Retired feature",
        isActive: true,
      },
    });

    const registry = PermissionRegistry.getInstance();
    const result = await registry.sync(prisma);

    expect(result.deprecatedCount).toBe(1);
    expect(result.diff.deprecated[0].code).toBe("legacy.retired_permission");

    const retired = await prisma.permission.findUnique({
      where: { code: "legacy.retired_permission" },
    });
    expect(retired?.isActive).toBe(false);
    expect(retired?.deprecatedAt).not.toBeNull();
  });
});
