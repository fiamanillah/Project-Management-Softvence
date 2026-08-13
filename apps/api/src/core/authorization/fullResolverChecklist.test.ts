import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { prisma } from "@/lib/prisma";
import { AuthorizationEngine, can, getUserPermissions } from "./AuthorizationEngine";

describe("Section 8 Resolver Verification Checklist", () => {
  let testDepartmentId1: string;
  let testDepartmentId2: string;
  let testDesignationId: string;
  let testPermissionId: string;
  let testUserId: string;
  let granterUserId: string;
  let scopeTypeIdGlobal: string;
  let scopeTypeIdOwnTeam: string;
  let scopeTypeIdExplicitDepts: string;

  beforeEach(async () => {
    // Clean tables
    await prisma.userPermissionOverride.deleteMany({});
    await prisma.designationPermissionScopeTarget.deleteMany({});
    await prisma.designationPermission.deleteMany({});
    await prisma.delegation.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.assignmentRole.deleteMany({});
    await prisma.projectTeamAssignment.deleteMany({});
    await prisma.projectAssignment.deleteMany({});
    await prisma.componentAssignment.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.permission.deleteMany({});
    await prisma.permissionScopeType.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.designation.deleteMany({});
    await prisma.department.deleteMany({});

    const dept1 = await prisma.department.create({
      data: { code: "DEPT_ALPHA", name: "Alpha Department" },
    });
    testDepartmentId1 = dept1.id;

    const dept2 = await prisma.department.create({
      data: { code: "DEPT_BETA", name: "Beta Department" },
    });
    testDepartmentId2 = dept2.id;

    const desig = await prisma.designation.create({
      data: {
        code: "TEST_DESIGNATION",
        name: "Test Designation",
        departmentId: testDepartmentId1,
        hierarchyLevel: 2,
      },
    });
    testDesignationId = desig.id;

    const user = await prisma.user.create({
      data: {
        employeeId: `EMP-${Date.now()}-1`,
        email: `user1-${Date.now()}@example.com`,
        passwordHash: "hash",
        firstName: "Member",
        lastName: "One",
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
        firstName: "Super",
        lastName: "Granter",
        systemRole: "SuperAdmin",
        designationId: testDesignationId,
      },
    });
    granterUserId = granter.id;

    const scopeGlobal = await prisma.permissionScopeType.create({
      data: {
        code: "GLOBAL",
        name: "Global Scope",
        resolutionStrategy: "Global",
      },
    });
    scopeTypeIdGlobal = scopeGlobal.id;

    const scopeOwnTeam = await prisma.permissionScopeType.create({
      data: {
        code: "OWN_TEAM",
        name: "Own Team Scope",
        resolutionStrategy: "OwnTeam",
      },
    });
    scopeTypeIdOwnTeam = scopeOwnTeam.id;

    const scopeExpDepts = await prisma.permissionScopeType.create({
      data: {
        code: "EXPLICIT_DEPTS",
        name: "Explicit Departments Scope",
        resolutionStrategy: "ExplicitDepartments",
      },
    });
    scopeTypeIdExplicitDepts = scopeExpDepts.id;

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
    await prisma.userPermissionOverride.deleteMany({});
    await prisma.designationPermissionScopeTarget.deleteMany({});
    await prisma.designationPermission.deleteMany({});
    await prisma.delegation.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.assignmentRole.deleteMany({});
    await prisma.projectTeamAssignment.deleteMany({});
    await prisma.projectAssignment.deleteMany({});
    await prisma.componentAssignment.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.permission.deleteMany({});
    await prisma.permissionScopeType.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.designation.deleteMany({});
    await prisma.department.deleteMany({});
  });

  it("Rule 1: SuperAdmin sees everything", async () => {
    const superAdminUser = {
      id: granterUserId,
      systemRole: "SuperAdmin",
      designationId: testDesignationId,
    };
    const allowed = await can(superAdminUser, "project.view");
    expect(allowed).toBe(true);
  });

  it("Rule 2: Member with OwnTeam scope loses access immediately when leftAt is set on team membership", async () => {
    const team = await prisma.team.create({
      data: {
        name: "Alpha Team",
        slug: "alpha-team",
        departmentId: testDepartmentId1,
      },
    });

    const role = await prisma.assignmentRole.create({
      data: {
        code: "DEV",
        name: "Developer",
      },
    });

    const member = await prisma.teamMember.create({
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

    // Active membership -> allow
    let allowed = await can(staffUser, "project.view", { teamId: team.id });
    expect(allowed).toBe(true);

    // Set leftAt on team membership (user rotated off team)
    await prisma.teamMember.update({
      where: { id: member.id },
      data: { leftAt: new Date() },
    });

    // Access must be immediately revoked -> deny
    allowed = await can(staffUser, "project.view", { teamId: team.id });
    expect(allowed).toBe(false);
  });

  it("Rule 3: ExplicitDepartments grant with target rows allows matching target departments and nothing else", async () => {
    const dg = await prisma.designationPermission.create({
      data: {
        designationId: testDesignationId,
        permissionId: testPermissionId,
        scopeTypeId: scopeTypeIdExplicitDepts,
        grantedBy: granterUserId,
      },
    });

    // Add target for testDepartmentId1 only
    await prisma.designationPermissionScopeTarget.create({
      data: {
        designationPermissionId: dg.id,
        departmentId: testDepartmentId1,
      },
    });

    const staffUser = {
      id: testUserId,
      systemRole: "Staff",
      designationId: testDesignationId,
    };

    const allowed1 = await can(staffUser, "project.view", { departmentId: testDepartmentId1 });
    expect(allowed1).toBe(true);

    const allowed2 = await can(staffUser, "project.view", { departmentId: testDepartmentId2 });
    expect(allowed2).toBe(false);
  });

  it("Rule 4: user_permission_overrides deny row (isDeny: true) blocks access even when designation grants it", async () => {
    await prisma.designationPermission.create({
      data: {
        designationId: testDesignationId,
        permissionId: testPermissionId,
        scopeTypeId: scopeTypeIdGlobal,
        grantedBy: granterUserId,
      },
    });

    await prisma.userPermissionOverride.create({
      data: {
        userId: testUserId,
        permissionId: testPermissionId,
        isDeny: true,
        grantedBy: granterUserId,
        reason: "Block user",
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

  it("Rule 5: Delegation expires at valid_until and is not usable after expiry", async () => {
    await prisma.designationPermission.create({
      data: {
        designationId: testDesignationId,
        permissionId: testPermissionId,
        scopeTypeId: scopeTypeIdGlobal,
        grantedBy: granterUserId,
      },
    });

    // Create an expired delegation (validUntil was 1 second ago)
    const now = Date.now();
    await prisma.delegation.create({
      data: {
        delegatorId: granterUserId,
        delegateeId: testUserId,
        scope: "*",
        validFrom: new Date(now - 10000),
        validUntil: new Date(now - 1000),
        createdBy: granterUserId,
      },
    });

    const delegateeUser = {
      id: testUserId,
      systemRole: "Staff",
      designationId: "00000000-0000-0000-0000-000000000000",
    };

    const allowed = await can(delegateeUser, "project.view");
    expect(allowed).toBe(false);
  });

  it("Rule 6: Changing designation permission set invalidates cache via invalidateCache()", async () => {
    const engine = AuthorizationEngine.getInstance();
    const nextVer = await engine.invalidateCache();
    expect(nextVer).toBeGreaterThan(1);
  });

  it("Rule 7: Deactivated permission (isActive: false) returns false in can() regardless of existing grants", async () => {
    await prisma.permission.update({
      where: { id: testPermissionId },
      data: { isActive: false },
    });

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
    expect(allowed).toBe(false);
  });

  it("Rule 8: getUserPermissions should return accurate permission map", async () => {
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

    const permMap = await getUserPermissions(staffUser);
    expect(permMap["project.view"]).toBeDefined();
    expect(permMap["project.view"].allowed).toBe(true);
    expect(permMap["project.view"].scope).toBe("Global");
  });
});
