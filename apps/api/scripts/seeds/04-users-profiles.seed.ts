import { hashPassword } from "../../src/utils/crypto";
import type { SeedContext, SeedUserRef } from "./types";

export async function seedUsersAndProfiles(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  const defaultPassword = "Password123!";
  const passwordHash = await hashPassword(defaultPassword);

  const USERS_DATA: {
    email: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    systemRole: "SuperAdmin" | "Admin" | "Staff";
    roleCode: string;
    desigCode: string;
  }[] = [
    { email: "superadmin@softvence.com", employeeId: "ADM-000001", firstName: "Super", lastName: "Admin", systemRole: "SuperAdmin", roleCode: "SUPER_ADMIN", desigCode: "SUPER_ADMIN" },
    { email: "admin@example.com", employeeId: "ADM-000002", firstName: "System", lastName: "Administrator", systemRole: "SuperAdmin", roleCode: "SUPER_ADMIN", desigCode: "SUPER_ADMIN" },
    { email: "director.tech@softvence.com", employeeId: "ENG-000001", firstName: "Arthur", lastName: "Pendleton", systemRole: "Admin", roleCode: "ENG_DIRECTOR", desigCode: "ENG_DIRECTOR" },
    { email: "pm.sarah@softvence.com", employeeId: "PM-000001", firstName: "Sarah", lastName: "Jenkins", systemRole: "Staff", roleCode: "PROJECT_MANAGER", desigCode: "PROJECT_MANAGER" },
    { email: "pm.david@softvence.com", employeeId: "PM-000002", firstName: "David", lastName: "Miller", systemRole: "Staff", roleCode: "PROJECT_MANAGER", desigCode: "PROJECT_MANAGER" },
    { email: "lead.alex@softvence.com", employeeId: "ENG-000002", firstName: "Alex", lastName: "Vance", systemRole: "Staff", roleCode: "TECH_LEAD", desigCode: "TECH_LEAD" },
    { email: "lead.elena@softvence.com", employeeId: "DES-000001", firstName: "Elena", lastName: "Rostova", systemRole: "Staff", roleCode: "LEAD_DESIGNER", desigCode: "LEAD_DESIGNER" },
    { email: "dev.james@softvence.com", employeeId: "ENG-000003", firstName: "James", lastName: "Wilson", systemRole: "Staff", roleCode: "SR_DEVELOPER", desigCode: "SR_DEVELOPER" },
    { email: "dev.priya@softvence.com", employeeId: "ENG-000004", firstName: "Priya", lastName: "Sharma", systemRole: "Staff", roleCode: "DEVELOPER", desigCode: "DEVELOPER" },
    { email: "dev.marcus@softvence.com", employeeId: "ENG-000005", firstName: "Marcus", lastName: "Chen", systemRole: "Staff", roleCode: "DEVELOPER", desigCode: "DEVELOPER" },
    { email: "designer.lisa@softvence.com", employeeId: "DES-000002", firstName: "Lisa", lastName: "Tanaka", systemRole: "Staff", roleCode: "DESIGNER", desigCode: "DESIGNER" },
    { email: "qa.tom@softvence.com", employeeId: "QA-000001", firstName: "Tom", lastName: "Bradley", systemRole: "Staff", roleCode: "QA_LEAD", desigCode: "QA_LEAD" },
    { email: "qa.emily@softvence.com", employeeId: "QA-000002", firstName: "Emily", lastName: "Watson", systemRole: "Staff", roleCode: "QA_ENGINEER", desigCode: "QA_ENGINEER" },
    { email: "bd.rachel@softvence.com", employeeId: "BD-000001", firstName: "Rachel", lastName: "Green", systemRole: "Staff", roleCode: "BD_MANAGER", desigCode: "BD_MANAGER" },
    { email: "bd.kevin@softvence.com", employeeId: "BD-000002", firstName: "Kevin", lastName: "Patel", systemRole: "Staff", roleCode: "BD_EXECUTIVE", desigCode: "BD_EXECUTIVE" },
    { email: "support.anna@softvence.com", employeeId: "CS-000001", firstName: "Anna", lastName: "Bell", systemRole: "Staff", roleCode: "SUPPORT_SPECIALIST", desigCode: "SUPPORT_SPECIALIST" },
  ];

  for (const u of USERS_DATA) {
    const roleId = ctx.roles.get(u.roleCode);
    const designationId = ctx.designations.get(u.desigCode);

    let userRecord = await prisma.user.findUnique({
      where: { email: u.email },
    });

    if (userRecord) {
      userRecord = await prisma.user.update({
        where: { email: u.email },
        data: {
          firstName: u.firstName,
          lastName: u.lastName,
          passwordHash,
          systemRole: u.systemRole,
          roleId,
          designationId,
          status: "ACTIVE",
          isActive: true,
          mustChangePassword: false,
        },
      });
    } else {
      userRecord = await prisma.user.create({
        data: {
          email: u.email,
          employeeId: u.employeeId,
          firstName: u.firstName,
          lastName: u.lastName,
          passwordHash,
          systemRole: u.systemRole,
          roleId,
          designationId,
          status: "ACTIVE",
          isActive: true,
          mustChangePassword: false,
        },
      });
    }

    const ref: SeedUserRef = {
      id: userRecord.id,
      email: userRecord.email,
      firstName: userRecord.firstName,
      lastName: userRecord.lastName,
      systemRole: userRecord.systemRole as any,
      roleId: userRecord.roleId || undefined,
      designationId: userRecord.designationId || undefined,
    };

    ctx.users.set(u.email, ref);
  }

  // 2. Assign Scoped Permissions to Roles
  const superAdminUser = ctx.users.get("superadmin@softvence.com")!;
  const globalScopeId = ctx.scopeTypes.get("GLOBAL")!;
  const ownDeptScopeId = ctx.scopeTypes.get("OWN_DEPARTMENT")!;
  const ownTeamScopeId = ctx.scopeTypes.get("OWN_TEAM")!;
  const ownProjScopeId = ctx.scopeTypes.get("OWN_PROJECT")!;

  const allPermissions = await prisma.permission.findMany({ where: { isActive: true } });

  // Map of permissions by code
  const permMap = new Map<string, string>();
  for (const p of allPermissions) {
    permMap.set(p.code, p.id);
  }

  // Helper to grant permissions
  const grantRolePerms = async (roleCode: string, scopeTypeId: string, filterFn?: (code: string) => boolean) => {
    const roleId = ctx.roles.get(roleCode);
    if (!roleId) return;

    for (const p of allPermissions) {
      if (filterFn && !filterFn(p.code)) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId: p.id,
          },
        },
        update: {
          scopeTypeId,
          isActive: true,
          grantedBy: superAdminUser.id,
        },
        create: {
          roleId,
          permissionId: p.id,
          scopeTypeId,
          isActive: true,
          grantedBy: superAdminUser.id,
        },
      });
    }
  };

  // SUPER_ADMIN gets everything GLOBAL
  await grantRolePerms("SUPER_ADMIN", globalScopeId);

  // ENG_DIRECTOR gets everything OWN_DEPARTMENT
  await grantRolePerms("ENG_DIRECTOR", ownDeptScopeId);

  // PROJECT_MANAGER gets project, task, chat, message, issue with OWN_TEAM / OWN_PROJECT
  await grantRolePerms("PROJECT_MANAGER", ownTeamScopeId, (code) =>
    code.startsWith("projects:") || code.startsWith("issues:") || code.startsWith("messages:") || code.startsWith("chat:") || code.startsWith("clients:") || code.startsWith("storage:")
  );

  // TECH_LEAD gets project, issue, chat, message with OWN_TEAM
  await grantRolePerms("TECH_LEAD", ownTeamScopeId, (code) =>
    code.startsWith("projects:") || code.startsWith("issues:") || code.startsWith("messages:") || code.startsWith("chat:") || code.startsWith("storage:")
  );

  // DEVELOPER, DESIGNER, QA get project read, issue create/resolve, chat with OWN_PROJECT
  for (const roleCode of ["SR_DEVELOPER", "DEVELOPER", "LEAD_DESIGNER", "DESIGNER", "QA_LEAD", "QA_ENGINEER"]) {
    await grantRolePerms(roleCode, ownProjScopeId, (code) =>
      code.includes("read") || code.startsWith("issues:") || code.startsWith("chat:") || code.startsWith("messages:") || code.startsWith("storage:")
    );
  }

  // BD_MANAGER gets bd_orders, clients, projects with OWN_DEPARTMENT
  await grantRolePerms("BD_MANAGER", ownDeptScopeId, (code) =>
    code.startsWith("bd:") || code.startsWith("clients:") || code.startsWith("projects:") || code.startsWith("messages:")
  );
  await grantRolePerms("BD_EXECUTIVE", ownDeptScopeId, (code) =>
    code.startsWith("bd:") || code.startsWith("clients:") || code.startsWith("projects:read") || code.startsWith("messages:")
  );

  // SUPPORT_SPECIALIST gets tickets, clients, issues with GLOBAL
  await grantRolePerms("SUPPORT_SPECIALIST", globalScopeId, (code) =>
    code.startsWith("support:") || code.startsWith("clients:read") || code.startsWith("issues:")
  );

  // 3. Department Managers
  const engDeptId = ctx.departments.get("ENG")!;
  const desDeptId = ctx.departments.get("DES")!;
  const bdDeptId = ctx.departments.get("BD")!;
  const qaDeptId = ctx.departments.get("QA")!;

  const DEPT_MANAGERS = [
    { departmentId: engDeptId, userEmail: "director.tech@softvence.com" },
    { departmentId: desDeptId, userEmail: "lead.elena@softvence.com" },
    { departmentId: bdDeptId, userEmail: "bd.rachel@softvence.com" },
    { departmentId: qaDeptId, userEmail: "qa.tom@softvence.com" },
  ];

  for (const dm of DEPT_MANAGERS) {
    const user = ctx.users.get(dm.userEmail);
    if (!user) continue;

    const existing = await prisma.departmentManager.findFirst({
      where: { departmentId: dm.departmentId, userId: user.id, unassignedAt: null },
    });

    if (!existing) {
      await prisma.departmentManager.create({
        data: {
          departmentId: dm.departmentId,
          userId: user.id,
        },
      });
    }
  }

  // 4. Team Memberships
  const teamLeadRoleId = ctx.assignmentRoles.get("TEAM_LEAD")!;
  const srDevRoleId = ctx.assignmentRoles.get("SR_DEV")!;
  const devRoleId = ctx.assignmentRoles.get("DEV")!;
  const designerRoleId = ctx.assignmentRoles.get("DESIGNER")!;
  const qaRoleId = ctx.assignmentRoles.get("QA")!;
  const memberRoleId = ctx.assignmentRoles.get("MEMBER")!;

  const TEAM_MEMBERSHIPS: { teamSlug: string; userEmail: string; roleId: string; note?: string }[] = [
    // Web Team
    { teamSlug: "web-team", userEmail: "lead.alex@softvence.com", roleId: teamLeadRoleId, note: "Squad Tech Lead" },
    { teamSlug: "web-team", userEmail: "dev.james@softvence.com", roleId: srDevRoleId, note: "Backend architecture & API lead" },
    { teamSlug: "web-team", userEmail: "dev.priya@softvence.com", roleId: devRoleId, note: "Frontend React/Next.js engineer" },
    { teamSlug: "web-team", userEmail: "designer.lisa@softvence.com", roleId: designerRoleId, note: "Embedded UI Designer" },
    { teamSlug: "web-team", userEmail: "qa.tom@softvence.com", roleId: qaRoleId, note: "QA & testing coordinator" },

    // Mobile Team
    { teamSlug: "mobile-team", userEmail: "dev.marcus@softvence.com", roleId: teamLeadRoleId, note: "Mobile Team Lead (Flutter/React Native)" },
    { teamSlug: "mobile-team", userEmail: "dev.priya@softvence.com", roleId: devRoleId, note: "Cross-platform mobile dev" },

    // Design Team
    { teamSlug: "design-team", userEmail: "lead.elena@softvence.com", roleId: teamLeadRoleId, note: "Head of Design" },
    { teamSlug: "design-team", userEmail: "designer.lisa@softvence.com", roleId: designerRoleId, note: "Senior UI Designer" },

    // BD Growth Team
    { teamSlug: "bd-growth-team", userEmail: "bd.rachel@softvence.com", roleId: teamLeadRoleId, note: "Growth Manager & Closer" },
    { teamSlug: "bd-growth-team", userEmail: "bd.kevin@softvence.com", roleId: memberRoleId, note: "Upwork & Fiverr Bidder" },

    // QA Team
    { teamSlug: "qa-team", userEmail: "qa.tom@softvence.com", roleId: teamLeadRoleId, note: "QA Lead" },
    { teamSlug: "qa-team", userEmail: "qa.emily@softvence.com", roleId: qaRoleId, note: "Test Automation Engineer" },
  ];

  for (const tm of TEAM_MEMBERSHIPS) {
    const teamId = ctx.teams.get(tm.teamSlug);
    const user = ctx.users.get(tm.userEmail);
    if (!teamId || !user) continue;

    const existing = await prisma.teamMember.findFirst({
      where: { teamId, userId: user.id, leftAt: null },
    });

    if (existing) {
      await prisma.teamMember.update({
        where: { id: existing.id },
        data: { roleId: tm.roleId, note: tm.note },
      });
    } else {
      await prisma.teamMember.create({
        data: {
          teamId,
          userId: user.id,
          roleId: tm.roleId,
          note: tm.note,
        },
      });
    }
  }

  // 5. Agency Platform Profiles & Profile Sellers
  const upworkPlatId = ctx.platforms.get("UPWORK")!;
  const fiverrPlatId = ctx.platforms.get("FIVERR")!;
  const directPlatId = ctx.platforms.get("DIRECT")!;

  const PROFILES = [
    { username: "Softvence Agency", platformId: upworkPlatId },
    { username: "Softvence Enterprise", platformId: upworkPlatId },
    { username: "softvence_pro", platformId: fiverrPlatId },
    { username: "Softvence Direct Portal", platformId: directPlatId },
  ];

  for (const prof of PROFILES) {
    let record = await prisma.profile.findFirst({
      where: { platformId: prof.platformId, username: prof.username },
    });

    if (record) {
      record = await prisma.profile.update({
        where: { id: record.id },
        data: { isActive: true },
      });
    } else {
      record = await prisma.profile.create({
        data: {
          platformId: prof.platformId,
          username: prof.username,
          isActive: true,
        },
      });
    }

    ctx.profiles.set(prof.username, record.id);
  }

  // Profile Sellers
  const agencyProfId = ctx.profiles.get("Softvence Agency")!;
  const rachelUser = ctx.users.get("bd.rachel@softvence.com")!;
  const kevinUser = ctx.users.get("bd.kevin@softvence.com")!;

  if (agencyProfId && rachelUser) {
    const existingSeller = await prisma.profileSeller.findFirst({
      where: { profileId: agencyProfId, userId: rachelUser.id, unassignedAt: null },
    });
    if (!existingSeller) {
      await prisma.profileSeller.create({
        data: {
          profileId: agencyProfId,
          userId: rachelUser.id,
          isPrimary: true,
          shift: "General",
        },
      });
    }
  }

  if (agencyProfId && kevinUser) {
    const existingSeller = await prisma.profileSeller.findFirst({
      where: { profileId: agencyProfId, userId: kevinUser.id, unassignedAt: null },
    });
    if (!existingSeller) {
      await prisma.profileSeller.create({
        data: {
          profileId: agencyProfId,
          userId: kevinUser.id,
          isPrimary: false,
          shift: "Evening",
        },
      });
    }
  }
}
