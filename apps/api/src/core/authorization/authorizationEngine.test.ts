import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { prisma } from "@/lib/prisma";
import { AuthorizationEngine, can } from "./AuthorizationEngine";
import { requirePermission } from "@/middleware/requirePermission";
import type { Request, Response } from "express";

describe("AuthorizationEngine", () => {
  let testDepartmentId: string;
  let testDesignationId: string;
  let testPermissionId: string;
  let testUserId: string;
  let granterUserId: string;
  let scopeTypeIdGlobal: string;
  let scopeTypeIdOwnTeam: string;

  beforeEach(async () => {
    // Clean up test records
    await prisma.userPermissionOverride.deleteMany({});
    await prisma.designationPermissionScopeTarget.deleteMany({});
    await prisma.designationPermission.deleteMany({});
    await prisma.delegation.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.assignmentRole.deleteMany({});
    await prisma.projectAssignment.deleteMany({});
    await prisma.componentAssignment.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.permission.deleteMany({});
    await prisma.permissionScopeType.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.designation.deleteMany({});
    await prisma.department.deleteMany({});

    // 1. Seed base Department & Designation
    const dept = await prisma.department.create({
      data: { code: "ENGINEERING", name: "Engineering Dept" },
    });
    testDepartmentId = dept.id;

    const desig = await prisma.designation.create({
      data: {
        code: "SOFTWARE_DEV",
        name: "Software Developer",
        departmentId: testDepartmentId,
        hierarchyLevel: 3,
      },
    });
    testDesignationId = desig.id;

    // 2. Seed Users
    const user = await prisma.user.create({
      data: {
        employeeId: `DEV-${Date.now()}-1`,
        email: `dev1-${Date.now()}@example.com`,
        passwordHash: "hash",
        firstName: "Jane",
        lastName: "Doe",
        systemRole: "Staff",
        designationId: testDesignationId,
      },
    });
    testUserId = user.id;

    const granter = await prisma.user.create({
      data: {
        employeeId: `ADM-${Date.now()}-2`,
        email: `granter-${Date.now()}@example.com`,
        passwordHash: "hash",
        firstName: "Admin",
        lastName: "Granter",
        systemRole: "Admin",
        designationId: testDesignationId,
      },
    });
    granterUserId = granter.id;

    // 3. Seed Permission Scope Types
    const scopeGlobal = await prisma.permissionScopeType.create({
      data: {
        code: "GLOBAL",
        name: "Global Scope",
        resolutionStrategy: "Global",
      },
    });
    scopeTypeIdGlobal = scopeGlobal.id;

    const scopeTeam = await prisma.permissionScopeType.create({
      data: {
        code: "OWN_TEAM",
        name: "Own Team Scope",
        resolutionStrategy: "OwnTeam",
      },
    });
    scopeTypeIdOwnTeam = scopeTeam.id;

    // 4. Seed Permission Code
    const perm = await prisma.permission.create({
      data: {
        code: "project.view",
        module: "Projects",
        description: "View project details",
        isActive: true,
      },
    });
    testPermissionId = perm.id;
  });

  afterAll(async () => {
    // Cleanup after test suite completes
    await prisma.userPermissionOverride.deleteMany({});
    await prisma.designationPermissionScopeTarget.deleteMany({});
    await prisma.designationPermission.deleteMany({});
    await prisma.delegation.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.assignmentRole.deleteMany({});
    await prisma.permission.deleteMany({});
    await prisma.permissionScopeType.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.designation.deleteMany({});
    await prisma.department.deleteMany({});
  });

  it("Step 1: SuperAdmin bypass should return true", async () => {
    const superAdminUser = {
      id: testUserId,
      systemRole: "SuperAdmin",
      designationId: testDesignationId,
      email: "superadmin@example.com",
    };

    const allowed = await can(superAdminUser, "project.view");
    expect(allowed).toBe(true);
  });

  it("Step 2: Explicit DENY override should short-circuit and win over grant", async () => {
    // Grant designation permission (Global)
    await prisma.designationPermission.create({
      data: {
        designationId: testDesignationId,
        permissionId: testPermissionId,
        scopeTypeId: scopeTypeIdGlobal,
        grantedBy: granterUserId,
      },
    });

    // Create explicit DENY override for this specific user
    await prisma.userPermissionOverride.create({
      data: {
        userId: testUserId,
        permissionId: testPermissionId,
        isDeny: true,
        grantedBy: granterUserId,
        reason: "Revoked for security audit",
      },
    });

    const staffUser = {
      id: testUserId,
      systemRole: "Staff",
      designationId: testDesignationId,
    };

    const allowed = await can(staffUser, "project.view");
    expect(allowed).toBe(false);
  });

  it("Step 2: Explicit GRANT override should grant access when no deny override exists", async () => {
    await prisma.userPermissionOverride.create({
      data: {
        userId: testUserId,
        permissionId: testPermissionId,
        isDeny: false,
        grantedBy: granterUserId,
      },
    });

    const staffUser = {
      id: testUserId,
      systemRole: "Staff",
      designationId: testDesignationId,
    };

    const allowed = await can(staffUser, "project.view");
    expect(allowed).toBe(true);
  });

  it("Step 3: Designation grant with Global scope should return true", async () => {
    await prisma.designationPermission.create({
      data: {
        designationId: testDesignationId,
        permissionId: testPermissionId,
        scopeTypeId: scopeTypeIdGlobal,
        grantedBy: granterUserId,
      },
    });

    const staffUser = {
      id: testUserId,
      systemRole: "Staff",
      designationId: testDesignationId,
    };

    const allowed = await can(staffUser, "project.view");
    expect(allowed).toBe(true);
  });

  it("Step 3: Designation grant with OwnTeam scope should allow team members", async () => {
    // Create team and membership
    const team = await prisma.team.create({
      data: {
        name: "Alpha Team",
        slug: "dev-alpha",
        departmentId: testDepartmentId,
      },
    });

    const role = await prisma.assignmentRole.create({
      data: {
        code: "DEVELOPER",
        name: "Developer",
        qualifiesForTeamScope: true,
      },
    });

    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: testUserId,
        roleId: role.id,
        leftAt: null,
      },
    });

    await prisma.designationPermission.create({
      data: {
        designationId: testDesignationId,
        permissionId: testPermissionId,
        scopeTypeId: scopeTypeIdOwnTeam,
        grantedBy: granterUserId,
      },
    });

    const staffUser = {
      id: testUserId,
      systemRole: "Staff",
      designationId: testDesignationId,
    };

    // Correct team -> true
    const allowedTeam = await can(staffUser, "project.view", { teamId: team.id });
    expect(allowedTeam).toBe(true);

    // Other team -> false
    const allowedOther = await can(staffUser, "project.view", { teamId: "00000000-0000-0000-0000-000000000000" });
    expect(allowedOther).toBe(false);
  });

  it("Step 4: Active Delegation should allow delegatee to inherit delegator permissions", async () => {
    // Delegator user has Global designation permission
    const delegatorUser = await prisma.user.create({
      data: {
        employeeId: `DLG-${Date.now()}`,
        email: `delegator-${Date.now()}@example.com`,
        passwordHash: "hash",
        firstName: "Lead",
        lastName: "Delegator",
        systemRole: "Staff",
        designationId: testDesignationId,
      },
    });

    await prisma.designationPermission.create({
      data: {
        designationId: testDesignationId,
        permissionId: testPermissionId,
        scopeTypeId: scopeTypeIdGlobal,
        grantedBy: granterUserId,
      },
    });

    // Create active delegation from delegator to testUser
    const now = new Date();
    await prisma.delegation.create({
      data: {
        delegatorId: delegatorUser.id,
        delegateeId: testUserId,
        scope: "*",
        validFrom: new Date(now.getTime() - 60000),
        validUntil: new Date(now.getTime() + 60000),
        createdBy: granterUserId,
      },
    });

    const delegateeUser = {
      id: testUserId,
      systemRole: "Staff",
      designationId: "00000000-0000-0000-0000-000000000000", // Empty designation
    };

    const allowed = await can(delegateeUser, "project.view");
    expect(allowed).toBe(true);
  });

  it("Step 5: Fallback should deny when no rules match", async () => {
    const staffUser = {
      id: testUserId,
      systemRole: "Staff",
      designationId: testDesignationId,
    };

    const allowed = await can(staffUser, "project.view");
    expect(allowed).toBe(false);
  });

  it("Middleware: requirePermission should pass when can() is true and throw 403 when false", async () => {
    // Grant permission
    await prisma.designationPermission.create({
      data: {
        designationId: testDesignationId,
        permissionId: testPermissionId,
        scopeTypeId: scopeTypeIdGlobal,
        grantedBy: granterUserId,
      },
    });

    const req: any = {
      user: {
        sub: testUserId,
        systemRole: "Staff",
        designationId: testDesignationId,
      },
      headers: {},
      socket: {},
    };

    let nextCalled = false;
    let errPassed: any = null;

    const middleware = requirePermission("project.view");
    await middleware(req, {} as Response, (err?: any) => {
      if (err) errPassed = err;
      else nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(errPassed).toBeNull();

    // Test denied permission
    nextCalled = false;
    errPassed = null;
    const middlewareDenied = requirePermission("project.delete");
    await middlewareDenied(req, {} as Response, (err?: any) => {
      if (err) errPassed = err;
      else nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(errPassed).toBeDefined();
    expect(errPassed?.statusCode).toBe(403);
  });
});
