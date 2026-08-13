import { describe, it, expect, beforeEach } from "bun:test";
import { prisma } from "@/lib/prisma";
import { OrganizationService } from "./organization.service";

describe("OrganizationService (Department & Designation Management)", () => {
  let orgService: OrganizationService;

  beforeEach(async () => {
    orgService = new OrganizationService(prisma);

    // Clean tables
    await prisma.departmentManager.deleteMany({});
    await prisma.designationPermissionScopeTarget.deleteMany({});
    await prisma.designationPermission.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.designation.deleteMany({});
    await prisma.department.deleteMany({});
  });

  it("should create a department successfully", async () => {
    const dept = await orgService.createDepartment({
      code: "ENG",
      name: "Engineering",
      isActive: true,
    });

    expect(dept).toBeDefined();
    expect(dept.code).toBe("ENG");
    expect(dept.name).toBe("Engineering");
    expect(dept.isActive).toBe(true);
  });

  it("should list departments with designations and active managers count", async () => {
    const dept = await orgService.createDepartment({
      code: "HR",
      name: "Human Resources",
      isActive: true,
    });

    const list = await orgService.getDepartments();
    expect(list.length).toBe(1);
    expect(list[0].code).toBe("HR");
    expect(list[0]._count.designations).toBe(0);
    expect(list[0].managers).toEqual([]);
  });

  it("should assign a department manager and automatically unassign the previous active manager", async () => {
    const dept = await orgService.createDepartment({
      code: "OPS",
      name: "Operations",
    });

    const desig = await prisma.designation.create({
      data: {
        code: "OPS_MGR",
        name: "Ops Manager",
        departmentId: dept.id,
        hierarchyLevel: 2,
        isLeadership: true,
      },
    });

    const user1 = await prisma.user.create({
      data: {
        employeeId: "EMP-001",
        email: "mgr1@example.com",
        passwordHash: "hash",
        firstName: "Manager",
        lastName: "One",
        systemRole: "Admin",
        designationId: desig.id,
      },
    });

    const user2 = await prisma.user.create({
      data: {
        employeeId: "EMP-002",
        email: "mgr2@example.com",
        passwordHash: "hash",
        firstName: "Manager",
        lastName: "Two",
        systemRole: "Admin",
        designationId: desig.id,
      },
    });

    // Assign Manager 1
    const mgr1Record = await orgService.assignDepartmentManager(dept.id, { userId: user1.id });
    expect(mgr1Record.userId).toBe(user1.id);
    expect(mgr1Record.unassignedAt).toBeNull();

    // Assign Manager 2 -> should unassign Manager 1
    const mgr2Record = await orgService.assignDepartmentManager(dept.id, { userId: user2.id });
    expect(mgr2Record.userId).toBe(user2.id);

    const updatedDept = await orgService.getDepartmentById(dept.id);
    expect(updatedDept.managers.length).toBe(2);
    
    // Check active manager
    const activeManagers = updatedDept.managers.filter((m) => m.unassignedAt === null);
    expect(activeManagers.length).toBe(1);
    expect(activeManagers[0].userId).toBe(user2.id);
  });

  it("should prevent deleting a department if it contains designations", async () => {
    const dept = await orgService.createDepartment({
      code: "SALES",
      name: "Sales Department",
    });

    await prisma.designation.create({
      data: {
        code: "SALES_REP",
        name: "Sales Representative",
        departmentId: dept.id,
        hierarchyLevel: 3,
      },
    });

    expect(orgService.deleteDepartment(dept.id)).rejects.toThrow("Cannot delete department");
  });

  it("should create a designation with initial permission assignments", async () => {
    const dept = await orgService.createDepartment({
      code: "FIN",
      name: "Finance",
    });

    // Create seed permission & scope type if needed
    const perm = await prisma.permission.upsert({
      where: { code: "finance.view" },
      update: {},
      create: {
        code: "finance.view",
        description: "View financial records",
        module: "Finance",
      },
    });

    const scopeType = await prisma.permissionScopeType.upsert({
      where: { code: "DEPARTMENT" },
      update: {},
      create: {
        code: "DEPARTMENT",
        name: "Department Scope",
        resolutionStrategy: "OwnDepartment",
      },
    });

    const desig = await orgService.createDesignation({
      code: "FIN_ANALYST",
      name: "Financial Analyst",
      departmentId: dept.id,
      hierarchyLevel: 3,
      isLeadership: false,
      assignments: [
        {
          permissionId: perm.id,
          scopeTypeId: scopeType.id,
        },
      ],
    });

    expect(desig).toBeDefined();
    expect(desig.code).toBe("FIN_ANALYST");

    const desigPerms = await orgService.getDesignationPermissions(desig.id);
    expect(desigPerms.permissions.length).toBe(1);
    expect(desigPerms.permissions[0].permissionId).toBe(perm.id);
    expect(desigPerms.permissions[0].scopeTypeId).toBe(scopeType.id);
  });
});
