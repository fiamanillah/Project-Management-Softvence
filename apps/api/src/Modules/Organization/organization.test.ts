import { describe, it, expect, beforeEach } from "bun:test";
import { prisma } from "@/lib/prisma";
import { OrganizationService } from "./organization.service";

describe("OrganizationService (Department, Role & Designation Management)", () => {
  let orgService: OrganizationService;

  beforeEach(async () => {
    orgService = new OrganizationService(prisma);

    // Clean tables
    await prisma.notification.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.branchManager.deleteMany({});
    await prisma.departmentManager.deleteMany({});
    await prisma.userPermissionOverride.deleteMany({});
    await prisma.rolePermissionScopeTarget.deleteMany({});
    await prisma.rolePermission.deleteMany({});
    await prisma.userAbsence.deleteMany({});
    await prisma.delegation.deleteMany({});
    await prisma.chatMessageRead.deleteMany({});
    await prisma.chatMessage.deleteMany({});
    await prisma.issueComment.deleteMany({});
    await prisma.issue.deleteMany({});
    await prisma.supportTicket.deleteMany({});
    await prisma.messageApproval.deleteMany({});
    await prisma.messageRevision.deleteMany({});
    await prisma.platformThreadMessage.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.projectGroupMember.deleteMany({});
    await prisma.projectGroup.deleteMany({});
    await prisma.componentAssignment.deleteMany({});
    await prisma.componentTeamAssignment.deleteMany({});
    await prisma.projectComponent.deleteMany({});
    await prisma.projectAssignment.deleteMany({});
    await prisma.projectTeamAssignment.deleteMany({});
    await prisma.bdOrderAssignment.deleteMany({});
    await prisma.bdOrder.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.profileSeller.deleteMany({});
    await prisma.profile.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.assignmentRole.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.designation.deleteMany({});
    await prisma.department.deleteMany({});
    await prisma.branch.deleteMany({});
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

  it("should assign multiple department managers with roles and titles", async () => {
    const dept = await orgService.createDepartment({
      code: "OPS",
      name: "Operations",
    });

    const role = await prisma.role.create({
      data: {
        code: "OPS_MGR",
        name: "Operations Manager",
        departmentId: dept.id,
        hierarchyLevel: 2,
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
        roleId: role.id,
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
        roleId: role.id,
      },
    });

    // Assign Manager 1 (Primary)
    const mgr1Record = await orgService.assignDepartmentManager(dept.id, {
      userId: user1.id,
      roleTitle: "Department Head",
      isPrimary: true,
    });
    expect(mgr1Record.userId).toBe(user1.id);
    expect(mgr1Record.roleTitle).toBe("Department Head");
    expect(mgr1Record.isPrimary).toBe(true);
    expect(mgr1Record.unassignedAt).toBeNull();

    // Assign Manager 2 (Co-Manager) -> multiple managers should co-exist
    const mgr2Record = await orgService.assignDepartmentManager(dept.id, {
      userId: user2.id,
      roleTitle: "Operations Lead",
      isPrimary: false,
    });
    expect(mgr2Record.userId).toBe(user2.id);
    expect(mgr2Record.roleTitle).toBe("Operations Lead");

    const updatedDept = await orgService.getDepartmentById(dept.id);
    expect(updatedDept.managers.length).toBe(2);

    // Check both active managers co-exist
    const activeManagers = updatedDept.managers.filter((m) => m.unassignedAt === null);
    expect(activeManagers.length).toBe(2);
  });

  it("should prevent deleting a department if it contains roles", async () => {
    const dept = await orgService.createDepartment({
      code: "SALES",
      name: "Sales Department",
    });

    await prisma.role.create({
      data: {
        code: "SALES_REP",
        name: "Sales Representative",
        departmentId: dept.id,
        hierarchyLevel: 3,
      },
    });

    expect(orgService.deleteDepartment(dept.id)).rejects.toThrow("Cannot delete department");
  });

  it("should create a role with initial permission assignments", async () => {
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

    const role = await orgService.createRole({
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

    expect(role).toBeDefined();
    expect(role.code).toBe("FIN_ANALYST");

    const rolePerms = await orgService.getRolePermissions(role.id);
    expect(rolePerms.permissions.length).toBe(1);
    expect(rolePerms.permissions[0].permissionId).toBe(perm.id);
    expect(rolePerms.permissions[0].scopeTypeId).toBe(scopeType.id);
  });

  it("should create a designation purely as an HR job title", async () => {
    const dept = await orgService.createDepartment({
      code: "ENG_HR",
      name: "Engineering HR",
    });

    const desig = await orgService.createDesignation({
      code: "SR_DEV_TITLE",
      name: "Senior Software Engineer II",
      departmentId: dept.id,
      hierarchyLevel: 3,
      isLeadership: false,
    });

    expect(desig).toBeDefined();
    expect(desig.code).toBe("SR_DEV_TITLE");
    expect(desig.name).toBe("Senior Software Engineer II");
  });
});
