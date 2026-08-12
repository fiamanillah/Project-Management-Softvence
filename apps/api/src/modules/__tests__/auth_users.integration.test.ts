import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import express, { Express } from "express";
import cookieParser from "cookie-parser";
import { Department, SystemRole } from "@workspace/db";
import { prisma } from "@/lib/prisma";
import { AuthModule } from "../auth/AuthModule";
import { UsersModule } from "../users/UsersModule";
import { Context } from "@/core/Context";
import { hashPassword } from "@/infra/password";
import { Server } from "http";

describe("Auth & Users Integration Tests", () => {
  let app: Express;
  let server: Server;
  let baseUrl: string;

  const testSuperAdminEmail = "integration_superadmin@agency.local";
  const testStaffEmail = "integration_staff@agency.local";
  const defaultPassword = "TestPassword123!";

  let superAdminId: string;
  let staffUserId: string;
  let gmDesignationId: string;
  let memberDesignationId: string;
  let userManagePermId: string;

  beforeAll(async () => {
    // 1. Setup DB prerequisites
    let gmDesig = await prisma.designation.findUnique({ where: { code: "GM" } });
    if (!gmDesig) {
      gmDesig = await prisma.designation.create({
        data: {
          code: "GM",
          name: "General Manager",
          department: Department.Operations,
          hierarchy_level: 1,
          is_leadership: true,
        },
      });
    }
    gmDesignationId = gmDesig.id;

    let memberDesig = await prisma.designation.findUnique({ where: { code: "MEMBER" } });
    if (!memberDesig) {
      memberDesig = await prisma.designation.create({
        data: {
          code: "MEMBER",
          name: "Member",
          department: Department.Operations,
          hierarchy_level: 7,
          is_leadership: false,
        },
      });
    }
    memberDesignationId = memberDesig.id;

    let perm = await prisma.permission.findUnique({ where: { code: "user.manage" } });
    if (!perm) {
      perm = await prisma.permission.create({
        data: {
          code: "user.manage",
          description: "Manage users",
        },
      });
    }
    userManagePermId = perm.id;

    // Grant user.manage permission to GM designation
    await prisma.designationPermission.upsert({
      where: {
        designation_id_permission_id: {
          designation_id: gmDesignationId,
          permission_id: userManagePermId,
        },
      },
      update: {},
      create: {
        designation_id: gmDesignationId,
        permission_id: userManagePermId,
      },
    });

    const hashedPassword = await hashPassword(defaultPassword);

    // Create SuperAdmin user
    let superAdmin = await prisma.user.findFirst({ where: { email: testSuperAdminEmail, deleted_at: null } });
    if (superAdmin) {
      superAdmin = await prisma.user.update({
        where: { id: superAdmin.id },
        data: { password_hash: hashedPassword, is_active: true },
      });
    } else {
      superAdmin = await prisma.user.create({
        data: {
          employee_id: "INT-EMP-001",
          email: testSuperAdminEmail,
          first_name: "Integration",
          last_name: "SuperAdmin",
          system_role: SystemRole.SuperAdmin,
          designation_id: gmDesignationId,
          is_active: true,
          password_hash: hashedPassword,
        },
      });
    }
    superAdminId = superAdmin.id;

    // Create Staff user
    let staffUser = await prisma.user.findFirst({ where: { email: testStaffEmail, deleted_at: null } });
    if (staffUser) {
      staffUser = await prisma.user.update({
        where: { id: staffUser.id },
        data: { password_hash: hashedPassword, is_active: true },
      });
    } else {
      staffUser = await prisma.user.create({
        data: {
          employee_id: "INT-EMP-002",
          email: testStaffEmail,
          first_name: "Integration",
          last_name: "Staff",
          system_role: SystemRole.Staff,
          designation_id: memberDesignationId,
          is_active: true,
          password_hash: hashedPassword,
        },
      });
    }
    staffUserId = staffUser.id;
    // Clean up any lingering permission overrides for test staff user
    await prisma.userPermissionOverride.deleteMany({
      where: { user_id: staffUserId },
    });

    // 2. Setup Express App
    app = express();
    app.use(cookieParser());
    app.use(express.json());

    const context = new Context();
    const authModule = new AuthModule();
    const usersModule = new UsersModule();

    await authModule.initialize(context);
    await usersModule.initialize(context);

    app.use("/auth", authModule.getRouter());
    app.use("/users", usersModule.getRouter());

    // Start server on ephemeral port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  // Helper to extract cookies from Set-Cookie header
  const parseCookies = (res: Response) => {
    const setCookieHeaders = res.headers.getSetCookie();
    const cookies: Record<string, string> = {};
    for (const header of setCookieHeaders) {
      const parts = header.split(";")[0].split("=");
      cookies[parts[0].trim()] = parts[1].trim();
    }
    return cookies;
  };

  it("1. Successful login sets cookies", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testSuperAdminEmail,
        password: defaultPassword,
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.user.email).toBe(testSuperAdminEmail);

    const cookies = parseCookies(res);
    expect(cookies["access_token"]).toBeDefined();
    expect(cookies["refresh_token"]).toBeDefined();
  });

  it("2. Wrong password returns generic error", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testSuperAdminEmail,
        password: "WrongPassword123!",
      }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.message).toBe("Invalid email or password");
  });

  it("3. Expired/missing access token on protected route returns 401", async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      method: "GET",
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("4. Insufficient permission on a permission-gated route returns 403", async () => {
    // Login as Staff user (who lacks user.manage permission)
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testStaffEmail,
        password: defaultPassword,
      }),
    });

    const cookies = parseCookies(loginRes);

    const res = await fetch(`${baseUrl}/users`, {
      method: "GET",
      headers: {
        Cookie: `access_token=${cookies["access_token"]}`,
      },
    });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("5. SuperAdmin passes any permission-gated route", async () => {
    // Login as SuperAdmin
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testSuperAdminEmail,
        password: defaultPassword,
      }),
    });

    const cookies = parseCookies(loginRes);

    const res = await fetch(`${baseUrl}/users`, {
      method: "GET",
      headers: {
        Cookie: `access_token=${cookies["access_token"]}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("6. Full invite -> accept -> login loop succeeds", async () => {
    // SuperAdmin logs in
    const saLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testSuperAdminEmail,
        password: defaultPassword,
      }),
    });
    const saCookies = parseCookies(saLogin);

    // Invite new user
    const inviteEmail = `invited_${Date.now()}@agency.local`;
    const inviteEmpId = `EMP-INV-${Date.now()}`;

    const inviteRes = await fetch(`${baseUrl}/users/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `access_token=${saCookies["access_token"]}`,
      },
      body: JSON.stringify({
        email: inviteEmail,
        first_name: "Invited",
        last_name: "User",
        employee_id: inviteEmpId,
        designation_id: memberDesignationId,
      }),
    });

    expect(inviteRes.status).toBe(201);
    const inviteJson = await inviteRes.json();
    const inviteToken = inviteJson.data.inviteToken;
    expect(inviteToken).toBeDefined();

    // Accept invite
    const newPassword = "NewInvitedPassword123!";
    const acceptRes = await fetch(`${baseUrl}/auth/accept-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: inviteToken,
        password: newPassword,
      }),
    });

    expect(acceptRes.status).toBe(200);

    // Login with new user
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: inviteEmail,
        password: newPassword,
      }),
    });

    expect(loginRes.status).toBe(200);
    const loginJson = await loginRes.json();
    expect(loginJson.data.user.email).toBe(inviteEmail);
  });

  it("7. Deactivated user cannot log in", async () => {
    // Create temporary user to deactivate
    const tempEmail = `deactive_${Date.now()}@agency.local`;
    const tempEmpId = `EMP-DEA-${Date.now()}`;
    const tempPassword = "DeactivatePass123!";

    const saLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testSuperAdminEmail,
        password: defaultPassword,
      }),
    });
    const saCookies = parseCookies(saLogin);

    // Invite & accept
    const inviteRes = await fetch(`${baseUrl}/users/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `access_token=${saCookies["access_token"]}`,
      },
      body: JSON.stringify({
        email: tempEmail,
        first_name: "Temp",
        last_name: "Deactive",
        employee_id: tempEmpId,
        designation_id: memberDesignationId,
      }),
    });
    const inviteToken = (await inviteRes.json()).data.inviteToken;

    await fetch(`${baseUrl}/auth/accept-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: inviteToken, password: tempPassword }),
    });

    // Get temp user id from list
    const listRes = await fetch(`${baseUrl}/users`, {
      headers: { Cookie: `access_token=${saCookies["access_token"]}` },
    });
    const users = (await listRes.json()).data;
    const tempUser = users.find((u: any) => u.email === tempEmail);

    // Deactivate temp user
    const deactRes = await fetch(`${baseUrl}/users/${tempUser.id}/deactivate`, {
      method: "PATCH",
      headers: { Cookie: `access_token=${saCookies["access_token"]}` },
    });
    expect(deactRes.status).toBe(200);

    // Try login
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: tempEmail, password: tempPassword }),
    });

    expect(loginRes.status).toBe(401);
  });

  it("8. Password reset invalidates prior sessions", async () => {
    // 1. User logs in & gets refresh token
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testStaffEmail,
        password: defaultPassword,
      }),
    });

    const cookies = parseCookies(loginRes);
    const priorRefreshToken = cookies["refresh_token"];
    expect(priorRefreshToken).toBeDefined();

    // 2. Request forgot password
    await fetch(`${baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testStaffEmail }),
    });

    // Retrieve reset token directly from DB notification for test verification
    const notification = await prisma.notification.findFirst({
      where: { recipient_id: staffUserId, title: "Password Reset Request" },
      orderBy: { created_at: "desc" },
    });
    const resetToken = notification?.body?.split("Your password reset token is: ")[1];
    expect(resetToken).toBeDefined();

    // 3. Reset password
    const brandNewPassword = "BrandNewPassword123!";
    const resetRes = await fetch(`${baseUrl}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: resetToken,
        newPassword: brandNewPassword,
      }),
    });
    expect(resetRes.status).toBe(200);

    // 4. Attempt to use prior refresh token -> must fail with 401
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: `refresh_token=${priorRefreshToken}`,
      },
    });

    expect(refreshRes.status).toBe(401);

    // Restore staff user password for remaining tests
    const restoredHash = await hashPassword(defaultPassword);
    await prisma.user.update({
      where: { id: staffUserId },
      data: { password_hash: restoredHash, is_active: true, deleted_at: null },
    });
  });

  it("9. Non-SuperAdmin attempting to invite with systemRole 'Admin' gets 403", async () => {
    // Grant user.manage override to Staff user so they can attempt invite
    await prisma.userPermissionOverride.upsert({
      where: {
        user_id_permission_id: {
          user_id: staffUserId,
          permission_id: userManagePermId,
        },
      },
      update: { effect: "GRANT" },
      create: {
        user_id: staffUserId,
        permission_id: userManagePermId,
        effect: "GRANT",
      },
    });

    const staffLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testStaffEmail, password: defaultPassword }),
    });
    const staffCookies = parseCookies(staffLogin);

    const inviteRes = await fetch(`${baseUrl}/users/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `access_token=${staffCookies["access_token"]}`,
      },
      body: JSON.stringify({
        email: `failed_admin_${Date.now()}@agency.local`,
        firstName: "StaffInviter",
        lastName: "Test",
        designationId: memberDesignationId,
        systemRole: "Admin",
      }),
    });

    // Clean up override after test
    await prisma.userPermissionOverride.deleteMany({
      where: { user_id: staffUserId },
    });

    expect(inviteRes.status).toBe(403);
    const json = await inviteRes.json();
    expect(json.success).toBe(false);
  });

  it("10. Regenerating an invite link invalidates the previous token", async () => {
    const saLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testSuperAdminEmail, password: defaultPassword }),
    });
    const saCookies = parseCookies(saLogin);

    const email = `regen_test_${Date.now()}@agency.local`;
    const inviteRes = await fetch(`${baseUrl}/users/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `access_token=${saCookies["access_token"]}`,
      },
      body: JSON.stringify({
        email,
        firstName: "Regen",
        lastName: "User",
        designationId: memberDesignationId,
      }),
    });

    const inviteData = await inviteRes.json();
    const oldToken = inviteData.data.inviteToken;
    const userId = inviteData.data.user.id;

    // Regenerate invite link
    const regenRes = await fetch(`${baseUrl}/users/${userId}/invite-link`, {
      method: "POST",
      headers: { Cookie: `access_token=${saCookies["access_token"]}` },
    });

    expect(regenRes.status).toBe(200);
    const regenJson = await regenRes.json();
    const newToken = regenJson.data.inviteToken;
    expect(newToken).toBeDefined();
    expect(newToken).not.toBe(oldToken);

    // Old token fails
    const oldAcceptRes = await fetch(`${baseUrl}/auth/accept-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: oldToken, password: "NewPassword123!" }),
    });
    expect(oldAcceptRes.status).toBe(400);

    // New token succeeds
    const newAcceptRes = await fetch(`${baseUrl}/auth/accept-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: newToken, password: "NewPassword123!" }),
    });
    expect(newAcceptRes.status).toBe(200);
  });

  it("11. Revoking a pending invite soft-deletes user & same email can be re-invited", async () => {
    const saLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testSuperAdminEmail, password: defaultPassword }),
    });
    const saCookies = parseCookies(saLogin);

    const email = `revoke_me_${Date.now()}@agency.local`;
    const inviteRes = await fetch(`${baseUrl}/users/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `access_token=${saCookies["access_token"]}`,
      },
      body: JSON.stringify({
        email,
        firstName: "Revoke",
        lastName: "User",
        designationId: memberDesignationId,
      }),
    });

    const userId = (await inviteRes.json()).data.user.id;

    // Revoke pending invite
    const revokeRes = await fetch(`${baseUrl}/users/${userId}/revoke-invite`, {
      method: "POST",
      headers: { Cookie: `access_token=${saCookies["access_token"]}` },
    });
    expect(revokeRes.status).toBe(200);

    // Re-invite same email
    const reInviteRes = await fetch(`${baseUrl}/users/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `access_token=${saCookies["access_token"]}`,
      },
      body: JSON.stringify({
        email,
        firstName: "Reinvited",
        lastName: "User",
        designationId: memberDesignationId,
      }),
    });

    expect(reInviteRes.status).toBe(201);
  });

  it("12. Revoking an active user is rejected with 400", async () => {
    const saLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testSuperAdminEmail, password: defaultPassword }),
    });
    const saCookies = parseCookies(saLogin);

    const revokeRes = await fetch(`${baseUrl}/users/${superAdminId}/revoke-invite`, {
      method: "POST",
      headers: { Cookie: `access_token=${saCookies["access_token"]}` },
    });

    expect(revokeRes.status).toBe(400);
  });

  it("13. Reactivating a deactivated user allows them to log in again", async () => {
    const saLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testSuperAdminEmail, password: defaultPassword }),
    });
    const saCookies = parseCookies(saLogin);

    // Reactivate staffUser (who was deactivated in test #7 or can be deactivated then reactivated)
    await fetch(`${baseUrl}/users/${staffUserId}/deactivate`, {
      method: "PATCH",
      headers: { Cookie: `access_token=${saCookies["access_token"]}` },
    });

    const reactRes = await fetch(`${baseUrl}/users/${staffUserId}/reactivate`, {
      method: "POST",
      headers: { Cookie: `access_token=${saCookies["access_token"]}` },
    });

    expect(reactRes.status).toBe(200);

    // Verify login succeeds
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testStaffEmail, password: defaultPassword }),
    });

    expect(loginRes.status).toBe(200);
  });

  it("14. GET /users returns correct computed status for all four states & supports filtering", async () => {
    const saLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testSuperAdminEmail, password: defaultPassword }),
    });
    const saCookies = parseCookies(saLogin);

    const res = await fetch(`${baseUrl}/users?status=active`, {
      headers: { Cookie: `access_token=${saCookies["access_token"]}` },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    for (const u of json.data) {
      expect(u.status).toBe("active");
    }
  });
});

