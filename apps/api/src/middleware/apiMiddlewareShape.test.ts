import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "./requirePermission";
import { getUserPermissions } from "@/core/authorization/AuthorizationEngine";
import type { Request, Response } from "express";

describe("API & Middleware Shape (Section 5)", () => {
  let testDepartmentId: string;
  let testDesignationId: string;
  let testPermissionId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Clean database tables
    await prisma.userPermissionOverride.deleteMany({});
    await prisma.designationPermissionScopeTarget.deleteMany({});
    await prisma.designationPermission.deleteMany({});
    await prisma.permission.deleteMany({});
    await prisma.permissionScopeType.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.designation.deleteMany({});
    await prisma.department.deleteMany({});

    const dept = await prisma.department.create({
      data: { code: "FINANCE", name: "Finance Dept" },
    });
    testDepartmentId = dept.id;

    const desig = await prisma.designation.create({
      data: {
        code: "FINANCE_ANALYST",
        name: "Financial Analyst",
        departmentId: testDepartmentId,
        hierarchyLevel: 2,
      },
    });
    testDesignationId = desig.id;

    const user = await prisma.user.create({
      data: {
        employeeId: `FIN-${Date.now()}`,
        email: `analyst-${Date.now()}@example.com`,
        passwordHash: "hash",
        firstName: "Financial",
        lastName: "User",
        systemRole: "Staff",
        designationId: testDesignationId,
      },
    });
    testUserId = user.id;

    const perm = await prisma.permission.create({
      data: {
        code: "billing.view",
        module: "Billing",
        description: "View financial billing invoices",
        isActive: true,
      },
    });
    testPermissionId = perm.id;
  });

  afterAll(async () => {
    await prisma.userPermissionOverride.deleteMany({});
    await prisma.designationPermissionScopeTarget.deleteMany({});
    await prisma.designationPermission.deleteMany({});
    await prisma.permission.deleteMany({});
    await prisma.permissionScopeType.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.designation.deleteMany({});
    await prisma.department.deleteMany({});
  });

  it("requirePermission should return fixed generic 403 message without information disclosure", async () => {
    const req: any = {
      user: {
        sub: testUserId,
        systemRole: "Staff",
        designationId: testDesignationId,
      },
      headers: {},
      socket: {},
    };

    let errPassed: any = null;
    const middleware = requirePermission("billing.view");

    await middleware(req, {} as Response, (err?: any) => {
      errPassed = err;
    });

    expect(errPassed).toBeDefined();
    expect(errPassed?.statusCode).toBe(403);
    expect(errPassed?.message).toBe("You don't have access to this resource");
    // Ensure no internal scope details are leaked in message
    expect(errPassed?.message).not.toContain("Billing");
    expect(errPassed?.message).not.toContain("OwnTeam");
  });

  it("getUserPermissions should return user permission map for frontend UI rendering", async () => {
    // Add active global scope type & grant
    const scopeGlobal = await prisma.permissionScopeType.create({
      data: {
        code: "GLOBAL",
        name: "Global Scope",
        resolutionStrategy: "Global",
      },
    });

    await prisma.designationPermission.create({
      data: {
        designationId: testDesignationId,
        permissionId: testPermissionId,
        scopeTypeId: scopeGlobal.id,
        grantedBy: testUserId,
      },
    });

    const userObj = {
      id: testUserId,
      systemRole: "Staff",
      designationId: testDesignationId,
    };

    const permMap = await getUserPermissions(userObj);

    expect(permMap["billing.view"]).toBeDefined();
    expect(permMap["billing.view"].allowed).toBe(true);
    expect(permMap["billing.view"].scope).toBe("Global");
    expect(permMap["billing.view"].module).toBe("Billing");
  });
});
