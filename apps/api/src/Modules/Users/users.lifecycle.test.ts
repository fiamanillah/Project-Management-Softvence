import { describe, it, expect, beforeEach } from "bun:test";
import { prisma } from "@/lib/prisma";
import { UsersService } from "./users.service";
import { AuthServices } from "../Auth/auth.service";
import { OrganizationService } from "../Organization/organization.service";

describe("User Invitation Lifecycle & Multi-Status Management", () => {
  let usersService: UsersService;
  let authService: AuthServices;
  let orgService: OrganizationService;
  let testDepartment: any;
  let testRole: any;
  let testDesignation: any;

  beforeEach(async () => {
    usersService = new UsersService(prisma);
    authService = new AuthServices(prisma);
    orgService = new OrganizationService(prisma);

    // Clean tables
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
    await prisma.team.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.designation.deleteMany({});
    await prisma.department.deleteMany({});

    testDepartment = await orgService.createDepartment({
      code: "ENG",
      name: "Engineering",
      isActive: true,
    });

    testRole = await orgService.createRole({
      code: "SE_ROLE",
      name: "Software Engineer Role",
      departmentId: testDepartment.id,
      hierarchyLevel: 1,
      isLeadership: false,
    });

    testDesignation = await orgService.createDesignation({
      code: "SE",
      name: "Software Engineer",
      departmentId: testDepartment.id,
      hierarchyLevel: 1,
      isLeadership: false,
    });
  });

  it("1. should create user in INVITED status with mustChangePassword = true and isActive = true", async () => {
    const user = await usersService.createAdminUser({
      email: "newhire@example.com",
      firstName: "Jane",
      lastName: "Doe",
      systemRole: "Staff",
      roleId: testRole.id,
      designationId: testDesignation.id,
    });

    expect(user).toBeDefined();
    expect(user.status).toBe("INVITED");
    expect(user.mustChangePassword).toBe(true);
    expect(user.isActive).toBe(true);
    expect(user.temporaryPassword).toBeDefined();
    expect(user.temporaryPassword.length).toBeGreaterThanOrEqual(8);
  });

  it("2. should allow an INVITED user to log in with temporary credentials", async () => {
    const created = await usersService.createAdminUser({
      email: "invited_login@example.com",
      firstName: "Alex",
      lastName: "Smith",
      systemRole: "Staff",
      roleId: testRole.id,
      designationId: testDesignation.id,
    });

    const loginResult = await authService.login(created.email, created.temporaryPassword!);
    expect(loginResult).toBeDefined();
    expect(loginResult.accessToken).toBeDefined();
    expect(loginResult.user.status).toBe("INVITED");
    expect(loginResult.user.mustChangePassword).toBe(true);
  });

  it("3. should transition status from INVITED to ACTIVE when user changes password on first login", async () => {
    const created = await usersService.createAdminUser({
      email: "activation_test@example.com",
      firstName: "Bob",
      lastName: "Williams",
      systemRole: "Staff",
      roleId: testRole.id,
      designationId: testDesignation.id,
    });

    expect(created.status).toBe("INVITED");
    expect(created.mustChangePassword).toBe(true);

    const changeResult = await authService.changePassword(
      created.id,
      created.temporaryPassword!,
      "NewPermanentPassword123#!"
    );

    expect(changeResult.user.status).toBe("ACTIVE");
    expect(changeResult.user.mustChangePassword).toBe(false);

    // Verify persisted state in database
    const dbUser = await prisma.user.findUnique({ where: { id: created.id } });
    expect(dbUser?.status).toBe("ACTIVE");
    expect(dbUser?.mustChangePassword).toBe(false);
    expect(dbUser?.isActive).toBe(true);
  });

  it("4. should allow admins to assign INVITED users to departments and operations without restriction", async () => {
    const invitedUser = await usersService.createAdminUser({
      email: "dept_manager@example.com",
      firstName: "Sarah",
      lastName: "Connor",
      systemRole: "Staff",
      roleId: testRole.id,
      designationId: testDesignation.id,
    });

    expect(invitedUser.status).toBe("INVITED");

    // Assign invited user as department manager
    const managerRecord = await orgService.assignDepartmentManager(testDepartment.id, {
      userId: invitedUser.id,
    });

    expect(managerRecord).toBeDefined();
    expect(managerRecord.userId).toBe(invitedUser.id);
    expect(managerRecord.departmentId).toBe(testDepartment.id);

    // List departments and verify manager shows up
    const depts = await orgService.getDepartments();
    expect(depts[0].managers.length).toBe(1);
    expect(depts[0].managers[0].user.email).toBe("dept_manager@example.com");
  });

  it("5. should block login for users with INACTIVE, SUSPENDED, LOCKED, and ARCHIVED status", async () => {
    const user = await usersService.createAdminUser({
      email: "blocked_user@example.com",
      firstName: "Test",
      lastName: "Blocked",
      systemRole: "Staff",
      roleId: testRole.id,
      designationId: testDesignation.id,
    });

    const statuses = ["INACTIVE", "SUSPENDED", "LOCKED", "ARCHIVED"] as const;

    for (const status of statuses) {
      await usersService.updateAdminUser(user.id, { status });

      let errorThrown = false;
      try {
        await authService.login(user.email, user.temporaryPassword!);
      } catch (err: any) {
        errorThrown = true;
        expect(err.message).toContain("Invalid email or password");
      }
      expect(errorThrown).toBe(true);
    }
  });

  it("6. should allow SuperAdmin to update user status to any valid UserStatus and revoke active sessions on deactivation", async () => {
    const user = await usersService.createAdminUser({
      email: "superadmin_manage@example.com",
      firstName: "Charlie",
      lastName: "Brown",
      systemRole: "Staff",
      roleId: testRole.id,
      designationId: testDesignation.id,
    });

    // Log in to create a session
    await authService.login(user.email, user.temporaryPassword!);
    let sessions = await authService.getSessions(user.id);
    expect(sessions.length).toBe(1);

    // Super Admin suspends the user
    const updated = await usersService.updateAdminUser(user.id, {
      status: "SUSPENDED",
    });

    expect(updated.status).toBe("SUSPENDED");
    expect(updated.isActive).toBe(false);

    // Verify active refresh sessions were revoked
    sessions = await authService.getSessions(user.id);
    expect(sessions.length).toBe(0);

    // Super Admin reactivates the user
    const reactivated = await usersService.updateAdminUser(user.id, {
      status: "ACTIVE",
    });

    expect(reactivated.status).toBe("ACTIVE");
    expect(reactivated.isActive).toBe(true);
  });

  it("7. should reset credentials and keep status INVITED when resending invite", async () => {
    const user = await usersService.createAdminUser({
      email: "resend_test@example.com",
      firstName: "David",
      lastName: "Miller",
      systemRole: "Staff",
      roleId: testRole.id,
      designationId: testDesignation.id,
    });

    const resendResult = await usersService.resendInvite(user.id);
    expect(resendResult.temporaryPassword).toBeDefined();
    expect(resendResult.user.status).toBe("INVITED");
    expect(resendResult.user.mustChangePassword).toBe(true);

    // User can log in with the new temporary password
    const login = await authService.login(user.email, resendResult.temporaryPassword);
    expect(login.accessToken).toBeDefined();
    expect(login.user.status).toBe("INVITED");
  });

  it("8. should filter users by status in getUsers", async () => {
    const u1 = await usersService.createAdminUser({
      email: "filter1@example.com",
      firstName: "U1",
      lastName: "Invited",
      systemRole: "Staff",
      roleId: testRole.id,
      designationId: testDesignation.id,
    });

    const u2 = await usersService.createAdminUser({
      email: "filter2@example.com",
      firstName: "U2",
      lastName: "Active",
      systemRole: "Staff",
      roleId: testRole.id,
      designationId: testDesignation.id,
    });
    await authService.changePassword(u2.id, u2.temporaryPassword!, "PermanentPass123#!");

    const u3 = await usersService.createAdminUser({
      email: "filter3@example.com",
      firstName: "U3",
      lastName: "Suspended",
      systemRole: "Staff",
      roleId: testRole.id,
      designationId: testDesignation.id,
    });
    await usersService.updateAdminUser(u3.id, { status: "SUSPENDED" });

    // Filter by INVITED
    const invitedUsers = await usersService.getUsers({ status: "INVITED" });
    expect(invitedUsers.data.some((u) => u.email === "filter1@example.com")).toBe(true);
    expect(invitedUsers.data.some((u) => u.email === "filter2@example.com")).toBe(false);

    // Filter by ACTIVE
    const activeUsers = await usersService.getUsers({ status: "ACTIVE" });
    expect(activeUsers.data.some((u) => u.email === "filter2@example.com")).toBe(true);
    expect(activeUsers.data.some((u) => u.email === "filter1@example.com")).toBe(false);

    // Filter by SUSPENDED
    const suspendedUsers = await usersService.getUsers({ status: "SUSPENDED" });
    expect(suspendedUsers.data.some((u) => u.email === "filter3@example.com")).toBe(true);
    expect(suspendedUsers.data.some((u) => u.email === "filter1@example.com")).toBe(false);
  });
});
