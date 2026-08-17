// src/Modules/Organization/departmentHierarchy.test.ts

import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { prisma } from "@/lib/prisma";
import { OrganizationService } from "./organization.service";
import { ScopeEvaluator } from "@/core/authorization/ScopeEvaluator";
import type { AuthenticatedUser, ResolvedRoleGrant } from "@/core/authorization/authorization.types";

describe("Department Hierarchy & Sub-Departments", () => {
  let orgService: OrganizationService;

  const cleanDatabase = async () => {
    await prisma.notification.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.departmentManager.deleteMany({});
    await prisma.userPermissionOverride.deleteMany({});
    await prisma.rolePermissionScopeTarget.deleteMany({});
    await prisma.rolePermission.deleteMany({});
    await prisma.projectAssignment.deleteMany({});
    await prisma.componentAssignment.deleteMany({});
    await prisma.projectComponent.deleteMany({});
    await prisma.projectTeamAssignment.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.assignmentRole.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.designation.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.department.deleteMany({});
  };

  beforeEach(async () => {
    orgService = new OrganizationService(prisma);
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  it("should create a root department and nested sub-department", async () => {
    const root = await orgService.createDepartment({
      code: "ENG",
      name: "Engineering",
      isActive: true,
    });

    expect(root.id).toBeDefined();
    expect(root.parentId).toBeNull();

    const subDept = await orgService.createDepartment({
      code: "ENG_FE",
      name: "Frontend Infrastructure",
      parentId: root.id,
      isActive: true,
    });

    expect(subDept.id).toBeDefined();
    expect(subDept.parentId).toBe(root.id);
    expect(subDept.parent?.code).toBe("ENG");

    const allDepts = await orgService.getDepartments();
    expect(allDepts.length).toBe(2);

    const rootInList = allDepts.find((d) => d.code === "ENG");
    expect(rootInList?._count.subDepartments).toBe(1);
  });

  it("should reject self-parenting (setting parentId to self)", async () => {
    const dept = await orgService.createDepartment({
      code: "OPS",
      name: "Operations",
    });

    expect(
      orgService.updateDepartment(dept.id, {
        parentId: dept.id,
      }),
    ).rejects.toThrow("A department cannot be its own parent");
  });

  it("should reject circular department hierarchy (A -> B -> A)", async () => {
    const deptA = await orgService.createDepartment({
      code: "DEPT_A",
      name: "Department A",
    });

    const deptB = await orgService.createDepartment({
      code: "DEPT_B",
      name: "Department B",
      parentId: deptA.id,
    });

    const deptC = await orgService.createDepartment({
      code: "DEPT_C",
      name: "Department C",
      parentId: deptB.id,
    });

    // Attempting to set Dept A's parent to Dept C should fail because C is under B which is under A
    expect(
      orgService.updateDepartment(deptA.id, {
        parentId: deptC.id,
      }),
    ).rejects.toThrow("circular hierarchy detected");
  });

  it("should prevent deleting a department that contains sub-departments", async () => {
    const parent = await orgService.createDepartment({
      code: "HQ",
      name: "Headquarters",
    });

    await orgService.createDepartment({
      code: "BRANCH_1",
      name: "Branch 1",
      parentId: parent.id,
    });

    expect(orgService.deleteDepartment(parent.id)).rejects.toThrow(
      "Cannot delete department with 1 sub-department(s)",
    );
  });

  it("ScopeEvaluator should grant OwnDepartment access downward to nested sub-departments", async () => {
    const rootDept = await orgService.createDepartment({
      code: "TECH",
      name: "Technology",
    });

    const subDept = await orgService.createDepartment({
      code: "TECH_AI",
      name: "AI Research",
      parentId: rootDept.id,
    });

    const role = await prisma.role.create({
      data: {
        code: "TECH_LEAD",
        name: "Tech Director",
        departmentId: rootDept.id,
        hierarchyLevel: 1,
        isLeadership: true,
      },
    });

    const dbUser = await prisma.user.create({
      data: {
        employeeId: "EMP-TECH-1",
        email: "lead@example.com",
        passwordHash: "hash",
        firstName: "Tech",
        lastName: "Lead",
        systemRole: "Staff",
        roleId: role.id,
      },
    });

    const user: AuthenticatedUser = {
      id: dbUser.id,
      systemRole: "Staff",
      roleId: role.id,
      email: dbUser.email,
    };

    const grant: ResolvedRoleGrant = {
      permissionId: "perm-dept-view",
      permissionCode: "organization.department.view",
      resolutionStrategy: "OwnDepartment",
      scopeTargets: { departmentIds: [], teamIds: [], projectIds: [] },
    };

    // User is in rootDept (TECH). Should have access to subDept (TECH_AI).
    const canAccessSubDept = await ScopeEvaluator.evaluate(
      user,
      grant,
      { departmentId: subDept.id },
      prisma,
    );

    expect(canAccessSubDept).toBe(true);

    // Another unrelated department
    const otherDept = await orgService.createDepartment({
      code: "LEGAL",
      name: "Legal",
    });

    const canAccessOtherDept = await ScopeEvaluator.evaluate(
      user,
      grant,
      { departmentId: otherDept.id },
      prisma,
    );

    expect(canAccessOtherDept).toBe(false);
  });
});
